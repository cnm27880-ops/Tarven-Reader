import type { ChatMessage, SillyTavernMessage } from "../types/chat";
import type { TextLocale } from "./chinese";
import { convertText } from "./chinese";

export const CHAPTER_SIZE = 50;

const STRIP_TAGS = [
  "thought",
  "thinking",
  "think_fox~",
  "think",
  "recall",
  "supplement",
  "yorozuya_status",
  "Item",
  "bbs_start",
] as const;

/** Tags whose content is reasoning noise; an orphan closing tag means everything before it is noise too. */
const THOUGHT_TAGS = ["thinking", "thought", "think"] as const;

function stripBetweenMarkers(text: string, start: string, end: string): string {
  let result = "";
  let pos = 0;

  while (pos < text.length) {
    const startIdx = text.indexOf(start, pos);
    if (startIdx === -1) {
      result += text.slice(pos);
      break;
    }

    result += text.slice(pos, startIdx);
    const endIdx = text.indexOf(end, startIdx + start.length);
    if (endIdx === -1) {
      result += text.slice(startIdx);
      break;
    }

    pos = endIdx + end.length;
  }

  return result;
}

function stripPairedTag(text: string, tag: string): string {
  const tagLower = tag.toLowerCase();
  const closeLower = `</${tagLower}>`;
  let out = "";
  let pos = 0;
  const lower = text.toLowerCase();

  while (pos < text.length) {
    const openIdx = lower.indexOf(`<${tagLower}`, pos);
    if (openIdx === -1) {
      out += text.slice(pos);
      break;
    }

    out += text.slice(pos, openIdx);
    const openEnd = text.indexOf(">", openIdx);
    if (openEnd === -1) {
      out += text.slice(openIdx);
      break;
    }

    const closeIdx = lower.indexOf(closeLower, openEnd + 1);
    if (closeIdx === -1) {
      out += text.slice(openIdx);
      break;
    }

    pos = closeIdx + closeLower.length;
  }

  return out;
}

/** Drop a leading orphan closing tag (e.g. text starting mid-thought before `</thinking>`). */
function stripLeadingOrphanClose(text: string, tag: string): string {
  const lower = text.toLowerCase();
  const close = `</${tag}>`;
  const closeIdx = lower.indexOf(close);
  if (closeIdx === -1) return text;

  const openIdx = lower.indexOf(`<${tag}`);
  if (openIdx !== -1 && openIdx < closeIdx) return text;

  return text.slice(closeIdx + close.length);
}

/** Extract inner text from paired tags like <content> or <本轮用户输入>. */
function extractPairedTagBlocks(text: string, tag: string): string | null {
  const parts: string[] = [];
  const tagLower = tag.toLowerCase();
  const openNeedle = `<${tagLower}`;
  const closeTag = `</${tag}>`;
  const closeLower = closeTag.toLowerCase();
  let pos = 0;
  const lower = text.toLowerCase();

  while (pos < text.length) {
    const openIdx = lower.indexOf(openNeedle, pos);
    if (openIdx === -1) break;

    const openEnd = text.indexOf(">", openIdx);
    if (openEnd === -1) break;

    const closeIdx = lower.indexOf(closeLower, openEnd + 1);
    if (closeIdx === -1) {
      // 未閉合（訊息被截斷等）：取開始標籤之後的全部內容，避免標籤與雜訊外洩。
      const inner = text.slice(openEnd + 1).trim();
      if (inner) parts.push(inner);
      break;
    }

    const inner = text.slice(openEnd + 1, closeIdx).trim();
    if (inner) parts.push(inner);

    pos = closeIdx + closeTag.length;
  }

  return parts.length > 0 ? parts.join("\n\n") : null;
}

function extractContentBlocks(text: string): string | null {
  return extractPairedTagBlocks(text, "content");
}

function extractUserInputBlocks(text: string): string | null {
  return extractPairedTagBlocks(text, "本轮用户输入");
}

function stripPluginNoise(text: string): string {
  let cleanText = text;
  for (const tag of THOUGHT_TAGS) {
    cleanText = stripLeadingOrphanClose(cleanText, tag);
  }
  for (const tag of STRIP_TAGS) {
    cleanText = stripPairedTag(cleanText, tag);
  }

  cleanText = cleanText.replace(/以下是用户的本轮输入：\s*/g, "");
  cleanText = stripBetweenMarkers(
    cleanText,
    "以下输入的代码为接下来剧情",
    "合理生成接下来的剧情：",
  );

  return cleanText
    .replace(/<StatusPlaceHolderImpl\/>/g, "")
    .replace(/<\/?content>/gi, "")
    .replace(/<\/?本轮用户输入>/gi, "");
}

function finalizeClean(text: string): string {
  return text
    .replace(/^\[STATUS\][^\n]*/gm, "")
    .replace(/\$\$STATUS\$\$\s*[^\n]*/g, "")
    .replace(/<StatusPlaceHolderImpl\/>/g, "")
    .replace(/<bbs_start>[\s\S]*?<\/bbs_start>/gi, "")
    .replace(/<\/?(?:thinking|thought|think|content|bbs_start|本轮用户输入|本輪用戶輸入)(?:\s[^>]*)?>/gi, "")
    .replace(/(^|\n)\s*正文[：:]\s*(?=\n|$)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Clean a SillyTavern message.
 * - User messages: prefer <本轮用户输入> (memory plugin), else plain text.
 * - AI messages: prefer <content> body, else legacy strip.
 */
export function cleanMessage(rawText: string | undefined, isUser = false): string {
  if (!rawText) return "";

  if (isUser) {
    const userInput = extractUserInputBlocks(rawText);
    if (userInput !== null) {
      return finalizeClean(userInput);
    }

    const content = extractContentBlocks(rawText);
    if (content !== null) {
      return finalizeClean(content);
    }

    return finalizeClean(stripPluginNoise(rawText));
  }

  const content = extractContentBlocks(rawText);
  if (content !== null) {
    return finalizeClean(content);
  }

  return finalizeClean(stripPluginNoise(rawText));
}

export function getDedupeKey(rawMsg: SillyTavernMessage, index: number): string {
  if (rawMsg.id != null && rawMsg.id !== "") {
    return `id:${rawMsg.id}`;
  }
  if (rawMsg.send_date != null && rawMsg.send_date !== "") {
    return `date:${rawMsg.send_date}`;
  }
  return `idx:${index}`;
}

export function isUserMessage(rawMsg: SillyTavernMessage): boolean {
  return Boolean(rawMsg.is_user);
}

export function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  if (trimmed.length <= 2) return trimmed;
  return trimmed.slice(0, 2);
}

export function exportToTxt(messages: ChatMessage[]) {
  if (messages.length === 0) return;

  const content = messages
    .map((msg) => `${msg.name}:\n${msg.mes}`)
    .join("\n\n────────────────────────────────\n\n");

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `酒館匯出_${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadBlob(content: string, fileName: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function isMessageLike(value: unknown): value is SillyTavernMessage {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.mes === "string" || "is_user" in record;
}

function wrapCleanedContent(cleaned: string, isUser: boolean): string {
  if (!cleaned) return "";
  return isUser ? cleaned : `<content>\n${cleaned}\n</content>`;
}

/** Replace a raw message's text (and swipes) with the cleaned body wrapped in <content>. */
function toCleanedRawMessage(rawMsg: SillyTavernMessage): SillyTavernMessage {
  const isUser = isUserMessage(rawMsg);
  const next: SillyTavernMessage = {
    ...rawMsg,
    mes: wrapCleanedContent(cleanMessage(rawMsg.mes, isUser), isUser),
  };

  if (Array.isArray(rawMsg.swipes)) {
    next.swipes = (rawMsg.swipes as unknown[]).map((swipe) =>
      typeof swipe === "string"
        ? wrapCleanedContent(cleanMessage(swipe, isUser), isUser)
        : swipe,
    );
  }

  return next;
}

/**
 * 純淨器：將酒館原始檔清洗後匯出。
 * 保留原始結構（jsonl 標頭、訊息欄位），僅將 mes / swipes 換成
 * 以 <content> 包裹的乾淨正文，可直接放回 SillyTavern 使用。
 */
export function exportCleanedTavernFile(
  room: { name: string; rawContent?: string; messages: ChatMessage[] },
) {
  const date = new Date().toISOString().slice(0, 10);

  if (room.rawContent) {
    const trimmed = room.rawContent.trim();

    let wholeParsed: unknown = null;
    let isWholeJson = false;
    try {
      wholeParsed = JSON.parse(trimmed);
      isWholeJson = true;
    } catch {
      /* jsonl，逐行處理 */
    }

    if (isWholeJson) {
      let output: unknown = wholeParsed;
      if (Array.isArray(wholeParsed)) {
        output = wholeParsed.map((item) => (isMessageLike(item) ? toCleanedRawMessage(item) : item));
      } else if (wholeParsed && typeof wholeParsed === "object") {
        const record = { ...(wholeParsed as Record<string, unknown>) };
        for (const key of ["mes", "messages", "chat"] as const) {
          if (Array.isArray(record[key])) {
            record[key] = (record[key] as unknown[]).map((item) =>
              isMessageLike(item) ? toCleanedRawMessage(item) : item,
            );
          }
        }
        output = record;
      }
      downloadBlob(
        JSON.stringify(output, null, 2),
        `${room.name}_純淨版_${date}.json`,
        "application/json;charset=utf-8",
      );
      return;
    }

    const lines = trimmed
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        try {
          const parsed = JSON.parse(line);
          if (isMessageLike(parsed)) {
            return JSON.stringify(toCleanedRawMessage(parsed));
          }
          return line; // 標頭或其他 metadata 原樣保留
        } catch {
          return line;
        }
      });

    downloadBlob(
      lines.join("\n"),
      `${room.name}_純淨版_${date}.jsonl`,
      "application/jsonl;charset=utf-8",
    );
    return;
  }

  // 舊聊天室沒有保存原始檔：用已清洗的訊息重建最簡 jsonl。
  const lines = room.messages.map((msg) =>
    JSON.stringify({
      name: msg.name,
      is_user: msg.isUser,
      send_date: msg.sendDate,
      mes: wrapCleanedContent(msg.mes, msg.isUser),
    }),
  );

  downloadBlob(
    lines.join("\n"),
    `${room.name}_純淨版_${date}.jsonl`,
    "application/jsonl;charset=utf-8",
  );
}

export function scrollToChapter(chapterIndex: number) {
  const el = document.getElementById(`chapter-${chapterIndex}`);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export function scrollToMessage(messageIndex: number) {
  const el = document.getElementById(`message-${messageIndex}`);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export function applyLocaleToMessage(
  name: string,
  mes: string,
  locale: TextLocale,
): { name: string; mes: string } {
  return {
    name: convertText(name, locale),
    mes: convertText(mes, locale),
  };
}
