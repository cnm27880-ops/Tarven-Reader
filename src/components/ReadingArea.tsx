import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ChatMessage } from "../types/chat";
import type { ViewMode } from "../hooks/useChatManager";
import { BookOpen, Bookmark, UploadCloud } from "lucide-react";
import { CHAPTER_SIZE, getInitials } from "../lib/utils";
import {
  getReadingProgress,
  getSearchHighlight,
  publishActiveIndex,
  registerJumpToMessage,
  saveReadingProgress,
  subscribeSearchHighlight,
} from "../lib/readerNav";
import { getBookmarks, subscribeBookmarks, toggleBookmark } from "../lib/bookmarks";
import { MessageContent } from "./MessageContent";
import { MessageNavigator } from "./MessageNavigator";

interface ReadingAreaProps {
  messages: ChatMessage[];
  viewMode: ViewMode;
  roomId: string | null;
  roomName?: string;
  onUploadClick: () => void;
}

export function ReadingArea({
  messages,
  viewMode,
  roomId,
  roomName,
  onUploadClick,
}: ReadingAreaProps) {
  const scrollRef = useRef<HTMLElement>(null);
  const restoredRoomRef = useRef<string | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 220,
    overscan: 8,
    getItemKey: (index) => messages[index]?.id ?? index,
  });

  const jumpToMessage = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, messages.length - 1));
      virtualizer.scrollToIndex(clamped, { align: "start" });
      // 動態高度下第一次捲動可能落點不準，下一幀再校正一次。
      requestAnimationFrame(() => {
        virtualizer.scrollToIndex(clamped, { align: "start" });
      });
    },
    [virtualizer, messages.length],
  );

  useEffect(() => {
    registerJumpToMessage(jumpToMessage);
    return () => registerJumpToMessage(null);
  }, [jumpToMessage]);

  const bookmarks = useSyncExternalStore(subscribeBookmarks, () => getBookmarks(roomId));
  const bookmarkedIndices = useMemo(() => new Set(bookmarks.map((b) => b.index)), [bookmarks]);

  // 搜尋跳轉後，該層命中的字句短暫高亮
  const searchHighlight = useSyncExternalStore(subscribeSearchHighlight, getSearchHighlight);

  // 目前閱讀位置：捲到最底視為最後一則，否則取「閱讀行」上方最後一則。
  const scrollEl = scrollRef.current;
  const scrollOffset = virtualizer.scrollOffset ?? 0;
  let activeIndex = 0;
  if (scrollEl && messages.length > 0) {
    if (scrollOffset + scrollEl.clientHeight >= virtualizer.getTotalSize() - 4) {
      activeIndex = messages.length - 1;
    } else {
      const refLine = scrollOffset + Math.min(200, scrollEl.clientHeight / 3);
      for (const item of virtualizer.getVirtualItems()) {
        if (item.start <= refLine) {
          activeIndex = item.index;
        } else {
          break;
        }
      }
    }
  }

  // 發布目前位置給側邊欄目錄等元件。
  useEffect(() => {
    publishActiveIndex(activeIndex);
  }, [activeIndex]);

  // 鍵盤快捷鍵：空白鍵翻頁、←→ 切章、Home/End 跳頭尾。
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (messages.length === 0) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }
      if (document.querySelector("[data-app-modal]")) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const el = scrollRef.current;
      const chapterCount = Math.ceil(messages.length / CHAPTER_SIZE);
      const currentChapter = Math.min(
        Math.floor(activeIndexRef.current / CHAPTER_SIZE),
        chapterCount - 1,
      );

      switch (e.key) {
        case " ":
        case "PageDown":
          e.preventDefault();
          el?.scrollBy({
            top: (e.shiftKey ? -0.85 : 0.85) * el.clientHeight,
            behavior: "smooth",
          });
          break;
        case "PageUp":
          e.preventDefault();
          el?.scrollBy({ top: -0.85 * el.clientHeight, behavior: "smooth" });
          break;
        case "ArrowLeft":
          e.preventDefault();
          jumpToMessage(Math.max(0, currentChapter - 1) * CHAPTER_SIZE);
          break;
        case "ArrowRight":
          e.preventDefault();
          jumpToMessage(Math.min(chapterCount - 1, currentChapter + 1) * CHAPTER_SIZE);
          break;
        case "Home":
          e.preventDefault();
          jumpToMessage(0);
          break;
        case "End":
          e.preventDefault();
          jumpToMessage(messages.length - 1);
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [messages.length, jumpToMessage]);

  // 還原上次閱讀進度（每個聊天室一次）。
  useEffect(() => {
    if (!roomId || messages.length === 0) return;
    if (restoredRoomRef.current === roomId) return;
    restoredRoomRef.current = roomId;

    // 有進度就回到上次位置，否則回到頂部（避免沿用上個聊天室的捲動位置）。
    const saved = getReadingProgress(roomId);
    requestAnimationFrame(() => {
      jumpToMessage(Math.min(saved, messages.length - 1));
    });
  }, [roomId, messages.length, jumpToMessage]);

  // 記錄閱讀進度（防抖）。
  useEffect(() => {
    if (!roomId || messages.length === 0) return;
    if (restoredRoomRef.current !== roomId) return;

    if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
    progressTimerRef.current = setTimeout(() => {
      saveReadingProgress(roomId, activeIndex);
    }, 500);

    return () => {
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
    };
  }, [roomId, activeIndex, messages.length]);

  if (messages.length === 0) {
    return (
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 min-h-0 w-full">
        <div
          onClick={onUploadClick}
          className="
            relative flex flex-col items-center justify-center
            w-full max-w-lg p-10 sm:p-14
            border border-border/60 rounded-2xl
            bg-surface/80 backdrop-blur-sm
            shadow-xl shadow-black/5
            cursor-pointer
            transition-all duration-300 ease-out
            hover:shadow-2xl hover:border-accent/30 hover:-translate-y-0.5
            group overflow-hidden
          "
        >
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <div className="relative flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-6 group-hover:bg-accent/15 transition-colors">
              <UploadCloud className="w-8 h-8 text-accent" />
            </div>
            <h3 className="text-xl sm:text-2xl font-serif text-foreground mb-2 tracking-wide">
              {roomName ? "此聊天室尚無訊息" : "匯入對話紀錄"}
            </h3>
            <p className="text-muted-foreground text-center text-sm leading-relaxed max-w-xs">
              {roomName
                ? "點擊匯入檔案，或從側邊欄切換其他聊天室。"
                : "點擊或拖放 SillyTavern 匯出的 .json / .jsonl 檔案。聊天室會自動儲存至本機。"}
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
              <BookOpen className="w-3.5 h-3.5" />
              <span>自動擷取正文 · 支援記憶插件 · 繁簡轉換</span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="flex-1 flex min-h-0 w-full min-w-0">
      <main
        ref={scrollRef}
        className="flex-1 overflow-y-auto min-h-0 reader-scroll hide-scrollbar"
      >
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-8 lg:px-10 py-4 sm:py-8 lg:py-10 reader-text">
          <div
            className="relative w-full"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const msg = messages[virtualItem.index];
              const isLast = virtualItem.index === messages.length - 1;
              const isMarked = bookmarkedIndices.has(virtualItem.index);
              const handleToggleBookmark = () => {
                if (roomId) toggleBookmark(roomId, virtualItem.index, msg.mes);
              };
              const bookmarkBtn = (
                <button
                  type="button"
                  onClick={handleToggleBookmark}
                  className={`
                    p-1 rounded-md transition-all duration-200 shrink-0
                    ${
                      isMarked
                        ? "text-accent opacity-100"
                        : "text-muted-foreground/50 opacity-40 hover:opacity-100 hover:text-accent"
                    }
                  `}
                  title={isMarked ? "移除書籤" : `為第 ${virtualItem.index + 1} 層加入書籤`}
                  aria-label={isMarked ? "移除書籤" : `為第 ${virtualItem.index + 1} 層加入書籤`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isMarked ? "fill-current" : ""}`} />
                </button>
              );

              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  className="absolute top-0 left-0 w-full"
                  style={{ transform: `translateY(${virtualItem.start}px)` }}
                >
                  <article
                    id={`message-${virtualItem.index}`}
                    className={isLast ? "pb-24 sm:pb-32" : "pb-5 sm:pb-7"}
                  >
                    {viewMode === "bubble" ? (
                      <div
                        className={`flex gap-3 sm:gap-4 ${msg.isUser ? "flex-row-reverse" : "flex-row"}`}
                      >
                        {!msg.isUser && (
                          <div
                            className="
                              shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full
                              bg-gradient-to-br from-accent to-accent/70
                              text-accent-foreground
                              flex items-center justify-center
                              text-xs font-semibold
                              shadow-md shadow-accent/20
                              ring-2 ring-background mt-6
                            "
                            title={msg.name}
                          >
                            {getInitials(msg.name)}
                          </div>
                        )}

                        <div
                          className={`flex flex-col min-w-0 flex-1 ${msg.isUser ? "items-end" : "items-start"}`}
                        >
                          <div
                            className={`flex items-center gap-1 mb-1.5 px-1 ${
                              msg.isUser ? "flex-row-reverse" : "flex-row"
                            }`}
                          >
                            <span
                              className={`text-xs font-medium ${
                                msg.isUser ? "text-muted-foreground" : "text-accent"
                              }`}
                            >
                              {msg.name}
                            </span>
                            {bookmarkBtn}
                          </div>
                          <div
                            className={`
                              px-5 py-3.5 sm:px-6 sm:py-4 rounded-2xl
                              shadow-sm
                              leading-[1.85] tracking-wide
                              whitespace-pre-wrap break-words
                              transition-shadow duration-200 hover:shadow-md
                              ${
                                msg.isUser
                                  ? "max-w-full sm:max-w-[85%] lg:max-w-[80%] xl:max-w-[75%] bg-user-bubble text-foreground rounded-tr-md border border-border/30"
                                  : "w-full max-w-full bg-gradient-to-br from-character-bubble via-character-bubble to-muted/30 border border-border/50 text-foreground rounded-tl-md"
                              }
                            `}
                          >
                            <MessageContent text={msg.mes} highlight={searchHighlight?.index === virtualItem.index ? searchHighlight.term : undefined} />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="group w-full">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent flex-1" />
                          <span className="font-medium text-foreground/90 tracking-[0.2em] text-sm shrink-0 px-2 flex items-center gap-1">
                            {msg.name}
                            {bookmarkBtn}
                          </span>
                          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent flex-1" />
                        </div>
                        <div className="w-full whitespace-pre-wrap break-words text-foreground leading-[1.9]">
                          <MessageContent text={msg.mes} highlight={searchHighlight?.index === virtualItem.index ? searchHighlight.term : undefined} />
                        </div>
                      </div>
                    )}
                  </article>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <MessageNavigator
        messageCount={messages.length}
        activeIndex={activeIndex}
        onJump={jumpToMessage}
        getPreview={(i) => ({
          name: messages[i]?.name ?? "",
          text: messages[i]?.mes.replace(/\s+/g, " ").slice(0, 60) ?? "",
        })}
      />
    </div>
  );
}
