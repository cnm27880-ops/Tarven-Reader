import { useState, useCallback, useEffect, useRef } from "react";
import type { ChatMessage, SillyTavernMessage } from "../types/chat";
import type { TextLocale } from "../lib/chinese";
import type { ChatRoom } from "../lib/chatStorage";
import {
  createRoomId,
  deriveRoomName,
  deleteRoom as deleteRoomFromDB,
  loadAllRooms,
  saveRoom,
  setActiveRoomId as persistActiveRoomId,
} from "../lib/chatStorage";
import {
  applyLocaleToMessage,
  cleanMessage,
  getDedupeKey,
  isUserMessage,
} from "../lib/utils";

export type Theme = "light" | "dark";
export type ViewMode = "bubble" | "classic";
export type ImportMode = "new" | "append";

const LOCALE_STORAGE_KEY = "textLocale";
const SAVE_DEBOUNCE_MS = 600;

function extractMessages(parsed: unknown): SillyTavernMessage[] {
  if (Array.isArray(parsed)) {
    if (parsed.length > 0 && parsed[0] && typeof parsed[0] === "object") {
      const first = parsed[0] as SillyTavernMessage;
      if (Array.isArray((first as { mes?: unknown }).mes)) {
        return parsed.flatMap((item) => {
          const record = item as { mes?: SillyTavernMessage[] };
          return Array.isArray(record.mes) ? record.mes : [];
        });
      }
      if ("mes" in first || "name" in first) {
        return parsed as SillyTavernMessage[];
      }
    }
    return parsed as SillyTavernMessage[];
  }

  if (parsed && typeof parsed === "object") {
    const record = parsed as Record<string, unknown>;
    if (Array.isArray(record.mes)) {
      return record.mes as SillyTavernMessage[];
    }
    if (Array.isArray(record.messages)) {
      return record.messages as SillyTavernMessage[];
    }
    if (Array.isArray(record.chat)) {
      return record.chat as SillyTavernMessage[];
    }
  }

  throw new Error("無法辨識的 SillyTavern 匯出格式。");
}

function parseJsonContent(content: string): unknown {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("檔案為空。");
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const lines = trimmed.split("\n");
    const collected: SillyTavernMessage[] = [];
    let parsedLineCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const lineParsed = JSON.parse(line);
        parsedLineCount++;

        if (Array.isArray(lineParsed)) {
          collected.push(...(lineParsed as SillyTavernMessage[]));
        } else if (lineParsed && typeof lineParsed === "object") {
          const record = lineParsed as Record<string, unknown>;
          if (Array.isArray(record.mes)) {
            collected.push(...(record.mes as SillyTavernMessage[]));
          } else if (record.mes || record.name) {
            collected.push(lineParsed as SillyTavernMessage);
          }
        }
      } catch {
        throw new Error(
          `第 ${i + 1} 行 JSON 格式錯誤，請上傳有效的 SillyTavern .json 或 .jsonl 檔案。`,
        );
      }
    }

    if (parsedLineCount === 0) {
      throw new Error("檔案中找不到有效的 JSON 內容。");
    }

    if (collected.length > 0) {
      return collected;
    }

    throw new Error("JSONL 已解析，但未找到任何訊息。");
  }
}

function processRawMessages(
  rawMessages: SillyTavernMessage[],
  prevMessages: ChatMessage[],
  locale: TextLocale,
): ChatMessage[] {
  const updatedMessages = [...prevMessages];
  const existingKeys = new Set(prevMessages.map((m) => m.dedupeKey));

  rawMessages.forEach((rawMsg, index) => {
    const isUser = isUserMessage(rawMsg);
    const cleaned = cleanMessage(rawMsg.mes, isUser);
    if (!cleaned) return;

    const dedupeKey = getDedupeKey(rawMsg, index);
    if (existingKeys.has(dedupeKey)) return;

    const rawName = rawMsg.name || "未知";
    const localized = applyLocaleToMessage(rawName, cleaned, locale);

    updatedMessages.push({
      id: `msg-${dedupeKey}-${index}`,
      dedupeKey,
      name: localized.name,
      mes: localized.mes,
      isUser: isUserMessage(rawMsg),
      rawIndex: index,
      sendDate: rawMsg.send_date,
    });
    existingKeys.add(dedupeKey);
  });

  return updatedMessages;
}

export function useChatManager() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [theme, setTheme] = useState<Theme>("light");
  const [viewMode, setViewMode] = useState<ViewMode>("bubble");
  const [textLocale, setTextLocale] = useState<TextLocale>("zh-TW");
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrating, setIsHydrating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roomsRef = useRef(rooms);
  const activeRoomIdRef = useRef(activeRoomId);
  const messagesRef = useRef(messages);
  const isHydratingRef = useRef(isHydrating);

  roomsRef.current = rooms;
  activeRoomIdRef.current = activeRoomId;
  messagesRef.current = messages;
  isHydratingRef.current = isHydrating;

  const activeRoom = rooms.find((r) => r.id === activeRoomId) ?? null;

  const flushSave = useCallback(async () => {
    const roomId = activeRoomIdRef.current;
    const msgs = messagesRef.current;
    if (!roomId || isHydratingRef.current) return;

    const existing = roomsRef.current.find((r) => r.id === roomId);
    if (!existing) return;

    const updated: ChatRoom = {
      ...existing,
      messages: msgs,
      updatedAt: Date.now(),
    };

    await saveRoom(updated);
    setRooms((prev) => prev.map((r) => (r.id === roomId ? updated : r)));
  }, []);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void flushSave();
    }, SAVE_DEBOUNCE_MS);
  }, [flushSave]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }

    const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY) as TextLocale | null;
    if (savedLocale === "zh-TW" || savedLocale === "zh-CN") {
      setTextLocale(savedLocale);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadAllRooms()
      .then(({ rooms: loaded, meta }) => {
        if (cancelled) return;

        setRooms(loaded);
        const activeId = meta.activeRoomId ?? loaded[0]?.id ?? null;
        setActiveRoomId(activeId);

        const active = loaded.find((r) => r.id === activeId);
        setMessages(active?.messages ?? []);
        if (active?.locale) setTextLocale(active.locale);
      })
      .catch((err) => {
        console.error("Failed to load chat rooms", err);
        if (!cancelled) {
          setError("無法載入已儲存的聊天室，請重新整理頁面。");
        }
      })
      .finally(() => {
        if (!cancelled) setIsHydrating(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  useEffect(() => {
    if (isHydrating || !activeRoomId) return;
    scheduleSave();
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [messages, activeRoomId, isHydrating, scheduleSave]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      void flushSave();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [flushSave]);

  const toggleTheme = () => setTheme((prev) => (prev === "light" ? "dark" : "light"));
  const toggleViewMode = () => setViewMode((prev) => (prev === "bubble" ? "classic" : "bubble"));
  const clearError = useCallback(() => setError(null), []);

  const switchRoom = useCallback(
    async (roomId: string) => {
      if (roomId === activeRoomIdRef.current) return;

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        await flushSave();
      }

      const room = roomsRef.current.find((r) => r.id === roomId);
      if (!room) return;

      setActiveRoomId(roomId);
      setMessages(room.messages);
      setTextLocale(room.locale);
      await persistActiveRoomId(roomId);
    },
    [flushSave],
  );

  const renameRoom = useCallback(
    async (roomId: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;

      const room = roomsRef.current.find((r) => r.id === roomId);
      if (!room) return;

      const updated: ChatRoom = { ...room, name: trimmed, updatedAt: Date.now() };
      await saveRoom(updated);
      setRooms((prev) => prev.map((r) => (r.id === roomId ? updated : r)));
    },
    [],
  );

  const removeRoom = useCallback(
    async (roomId: string) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      const meta = await deleteRoomFromDB(roomId);
      const remaining = roomsRef.current.filter((r) => r.id !== roomId);
      setRooms(remaining);

      if (activeRoomIdRef.current === roomId) {
        const nextId = meta.activeRoomId ?? remaining[0]?.id ?? null;
        setActiveRoomId(nextId);
        const nextRoom = remaining.find((r) => r.id === nextId);
        setMessages(nextRoom?.messages ?? []);
        if (nextRoom?.locale) setTextLocale(nextRoom.locale);
      }
    },
    [],
  );

  const parseSillyTavernJson = useCallback(
    (file: File, locale: TextLocale, mode: ImportMode = "new") => {
      const lowerName = file.name.toLowerCase();
      if (!lowerName.endsWith(".json") && !lowerName.endsWith(".jsonl")) {
        setError("請上傳 SillyTavern 匯出的 .json 或 .jsonl 檔案。");
        return;
      }

      setTextLocale(locale);
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      setIsLoading(true);
      setError(null);

      const reader = new FileReader();
      reader.onload = (e) => {
        setTimeout(async () => {
          try {
            const content = e.target?.result as string;
            const parsed = parseJsonContent(content);
            const rawMessages = extractMessages(parsed);

            if (rawMessages.length === 0) {
              throw new Error("上傳的檔案中沒有找到任何訊息。");
            }

            if (mode === "append" && activeRoomIdRef.current) {
              const roomId = activeRoomIdRef.current;
              const prev = messagesRef.current;
              const merged = processRawMessages(rawMessages, prev, locale);
              setMessages(merged);

              const existing = roomsRef.current.find((r) => r.id === roomId);
              if (existing) {
                // 已有原始檔時只追加訊息行，維持單一標頭的有效 jsonl。
                const appendedRaw = existing.rawContent
                  ? existing.rawContent.trimEnd() +
                    "\n" +
                    rawMessages.map((m) => JSON.stringify(m)).join("\n")
                  : content;
                const updated: ChatRoom = {
                  ...existing,
                  messages: merged,
                  locale,
                  rawContent: appendedRaw,
                  updatedAt: Date.now(),
                };
                await saveRoom(updated);
                setRooms((prevRooms) =>
                  prevRooms.map((r) => (r.id === roomId ? updated : r)),
                );
              }
            } else {
              const processed = processRawMessages(rawMessages, [], locale);
              const now = Date.now();
              const newRoom: ChatRoom = {
                id: createRoomId(),
                name: deriveRoomName(file.name),
                messages: processed,
                locale,
                sourceFileName: file.name,
                rawContent: content,
                createdAt: now,
                updatedAt: now,
              };

              await saveRoom(newRoom);
              await persistActiveRoomId(newRoom.id);

              setRooms((prev) => [newRoom, ...prev.filter((r) => r.id !== newRoom.id)]);
              setActiveRoomId(newRoom.id);
              setMessages(processed);
            }
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "無法解析上傳的檔案，請確認格式是否正確。";
            setError(message);
            console.error("Failed to parse file", err);
          } finally {
            setIsLoading(false);
          }
        }, 0);
      };

      reader.onerror = () => {
        setError("讀取檔案失敗，請重試。");
        setIsLoading(false);
      };

      reader.readAsText(file);
    },
    [],
  );

  return {
    rooms,
    activeRoom,
    activeRoomId,
    messages,
    theme,
    toggleTheme,
    viewMode,
    toggleViewMode,
    textLocale,
    parseSillyTavernJson,
    switchRoom,
    renameRoom,
    removeRoom,
    isLoading,
    isHydrating,
    error,
    clearError,
  };
}
