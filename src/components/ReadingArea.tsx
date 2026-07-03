import { useRef } from "react";
import type { ChatMessage } from "../types/chat";
import type { ViewMode } from "../hooks/useChatManager";
import { BookOpen, UploadCloud } from "lucide-react";
import { CHAPTER_SIZE, getInitials } from "../lib/utils";
import { MessageContent } from "./MessageContent";
import { MessageNavigator } from "./MessageNavigator";

interface ReadingAreaProps {
  messages: ChatMessage[];
  viewMode: ViewMode;
  roomName?: string;
  onUploadClick: () => void;
}

export function ReadingArea({ messages, viewMode, roomName, onUploadClick }: ReadingAreaProps) {
  const scrollRef = useRef<HTMLElement>(null);

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
        className="flex-1 overflow-y-auto min-h-0 scroll-smooth reader-scroll hide-scrollbar"
      >
        <div
          className="w-full px-4 sm:px-8 lg:px-10 xl:px-14 2xl:px-20 py-4 sm:py-8 lg:py-10 reader-text"
        >
          <div className="w-full space-y-5 sm:space-y-7 pb-24 sm:pb-32">
            {messages.map((msg, index) => {
              const isChapterStart = index % CHAPTER_SIZE === 0;
              const chapterIndex = Math.floor(index / CHAPTER_SIZE);

              return (
                <article
                  key={msg.id}
                  id={`message-${index}`}
                  data-chapter={isChapterStart ? `chapter-${chapterIndex}` : undefined}
                  className="scroll-mt-20 md:scroll-mt-6 animate-message-in"
                  style={{ animationDelay: `${Math.min(index % 10, 5) * 40}ms` }}
                >
                  {isChapterStart && (
                    <div id={`chapter-${chapterIndex}`} className="sr-only" aria-hidden />
                  )}

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
                        <span
                          className={`text-xs font-medium mb-1.5 px-1 ${
                            msg.isUser ? "text-muted-foreground" : "text-accent"
                          }`}
                        >
                          {msg.name}
                        </span>
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
                          <MessageContent text={msg.mes} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="group w-full">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent flex-1" />
                        <span className="font-medium text-foreground/90 tracking-[0.2em] text-sm shrink-0 px-2">
                          {msg.name}
                        </span>
                        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent flex-1" />
                      </div>
                      <div className="w-full whitespace-pre-wrap break-words text-foreground leading-[1.9]">
                        <MessageContent text={msg.mes} />
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </main>

      <MessageNavigator messageCount={messages.length} scrollContainerRef={scrollRef} />
    </div>
  );
}
