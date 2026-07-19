import { useMemo } from "react";
import { BarChart3, X } from "lucide-react";
import type { ChatMessage } from "../types/chat";
import { CHAPTER_SIZE } from "../lib/utils";
import { getBookmarks } from "../lib/bookmarks";
import { jumpToChapter } from "../lib/readerNav";
import { useEscapeKey } from "../hooks/useEscapeKey";

interface StatsPanelProps {
  messages: ChatMessage[];
  roomId: string | null;
  roomName?: string;
  isOpen: boolean;
  onClose: () => void;
}

/** 中文閱讀速度估計（字／分鐘）。 */
const READING_SPEED = 400;

function countChars(text: string): number {
  return text.replace(/\s/g, "").length;
}

function formatDuration(minutes: number): string {
  if (minutes < 1) return "不到 1 分鐘";
  if (minutes < 60) return `約 ${Math.round(minutes)} 分鐘`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest > 0 ? `約 ${hours} 小時 ${rest} 分鐘` : `約 ${hours} 小時`;
}

export function StatsPanel({ messages, roomId, roomName, isOpen, onClose }: StatsPanelProps) {
  const stats = useMemo(() => {
    let totalChars = 0;
    let aiChars = 0;
    let userChars = 0;
    let aiCount = 0;
    let userCount = 0;

    const chapterCount = Math.ceil(messages.length / CHAPTER_SIZE);
    const chapterChars = Array.from({ length: chapterCount }, () => 0);

    messages.forEach((msg, i) => {
      const chars = countChars(msg.mes);
      totalChars += chars;
      chapterChars[Math.floor(i / CHAPTER_SIZE)] += chars;
      if (msg.isUser) {
        userChars += chars;
        userCount++;
      } else {
        aiChars += chars;
        aiCount++;
      }
    });

    return {
      totalChars,
      aiChars,
      userChars,
      aiCount,
      userCount,
      chapterChars,
      maxChapterChars: Math.max(1, ...chapterChars),
      readingMinutes: totalChars / READING_SPEED,
    };
  }, [messages]);

  useEscapeKey(isOpen, onClose);

  if (!isOpen) return null;

  const bookmarkCount = getBookmarks(roomId).length;

  const tile = (label: string, value: string, sub?: string) => (
    <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground tabular-nums leading-tight mt-0.5">
        {value}
      </p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[105] flex items-end sm:items-center justify-center p-4" data-app-modal>
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md rounded-2xl border border-border/80 bg-surface shadow-2xl animate-scale-in overflow-hidden max-h-[85vh] flex flex-col">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-accent/70 to-accent/40" />

        <div className="p-5 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <BarChart3 className="w-5 h-5 text-accent shrink-0" />
              <h2 className="text-lg font-semibold text-foreground truncate">
                {roomName ? `${roomName} · 統計` : "閱讀統計"}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
              aria-label="關閉"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {tile("總字數", stats.totalChars.toLocaleString(), `閱讀時長 ${formatDuration(stats.readingMinutes)}`)}
            {tile("總樓層", messages.length.toLocaleString(), `${stats.chapterChars.length} 章`)}
            {tile(
              "角色正文",
              stats.aiChars.toLocaleString(),
              `${stats.aiCount} 則 · 平均 ${stats.aiCount ? Math.round(stats.aiChars / stats.aiCount) : 0} 字`,
            )}
            {tile(
              "你的輸入",
              stats.userChars.toLocaleString(),
              `${stats.userCount} 輪對話`,
            )}
          </div>

          {bookmarkCount > 0 && (
            <p className="text-xs text-muted-foreground mb-4">
              已收藏 {bookmarkCount} 個書籤。
            </p>
          )}

          {stats.chapterChars.length > 1 && (
            <div>
              <p className="text-sm font-medium text-foreground mb-2">每章字數</p>
              <ul className="space-y-1.5">
                {stats.chapterChars.map((chars, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => {
                        jumpToChapter(i);
                        onClose();
                      }}
                      className="w-full group"
                      title={`跳至第 ${i + 1} 章`}
                    >
                      <span className="flex items-center justify-between text-[11px] text-muted-foreground mb-0.5">
                        <span className="group-hover:text-foreground transition-colors">
                          第 {i + 1} 章
                        </span>
                        <span className="tabular-nums">{chars.toLocaleString()} 字</span>
                      </span>
                      <span className="block h-1.5 rounded-full bg-muted/50 overflow-hidden">
                        <span
                          className="block h-full rounded-full bg-accent/60 group-hover:bg-accent transition-colors"
                          style={{ width: `${Math.max(2, (chars / stats.maxChapterChars) * 100)}%` }}
                        />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
