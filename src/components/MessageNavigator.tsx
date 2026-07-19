import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { CHAPTER_SIZE } from "../lib/utils";

interface MessageNavigatorProps {
  messageCount: number;
  activeIndex: number;
  onJump: (index: number) => void;
  /** 取得某一層的預覽（名稱與內容開頭），供 hover 提示。 */
  getPreview: (index: number) => { name: string; text: string };
}

export function MessageNavigator({
  messageCount,
  activeIndex,
  onJump,
  getPreview,
}: MessageNavigatorProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const chapterCount = Math.max(1, Math.ceil(messageCount / CHAPTER_SIZE));
  const activeChapter = Math.min(
    Math.floor(activeIndex / CHAPTER_SIZE),
    chapterCount - 1,
  );
  const chapterStart = activeChapter * CHAPTER_SIZE;
  const chapterLength = Math.min(CHAPTER_SIZE, messageCount - chapterStart);

  const markerIndices = Array.from({ length: chapterLength }, (_, i) => chapterStart + i);

  const jumpToChapter = (chapterIndex: number) => {
    const clamped = Math.max(0, Math.min(chapterIndex, chapterCount - 1));
    onJump(clamped * CHAPTER_SIZE);
  };

  if (messageCount < 2) return null;

  const chapterBtnClass = `
    p-1 rounded-md text-muted-foreground/70
    hover:text-foreground hover:bg-muted/50
    disabled:opacity-25 disabled:pointer-events-none
    transition-colors
  `;

  return (
    <div
      className="flex flex-col items-center w-7 sm:w-8 shrink-0 py-2 select-none h-full"
      aria-label="訊息導覽"
    >
      <button
        type="button"
        className={chapterBtnClass}
        onClick={() => jumpToChapter(activeChapter - 1)}
        disabled={activeChapter === 0}
        title="上一章"
        aria-label="上一章"
      >
        <ChevronUp className="w-4 h-4" />
      </button>

      <span
        className="my-1 text-[10px] text-muted-foreground/70 tabular-nums leading-tight text-center"
        title={`第 ${activeChapter + 1} 章 / 共 ${chapterCount} 章`}
      >
        {activeChapter + 1}
        <span className="block text-muted-foreground/40">/{chapterCount}</span>
      </span>

      {/* 逐則標記軌：手機觸控下命中率太低（每點僅數 px 高），只在桌面（lg 以上）顯示，手機保留上/下章按鈕即可。 */}
      <div className="hidden lg:flex relative flex-col items-center flex-1 min-h-[160px] w-full my-1">
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-border/70" />

        <div className="relative flex flex-col justify-between h-full w-full py-1">
          {markerIndices.map((msgIndex) => {
            const isActive = msgIndex === activeIndex;
            const isHovered = hoverIndex === msgIndex;
            const ratio =
              chapterLength > 1 ? (msgIndex - chapterStart) / (chapterLength - 1) : 0;
            const preview = isHovered ? getPreview(msgIndex) : null;

            return (
              <button
                key={msgIndex}
                type="button"
                className="absolute left-1/2 -translate-x-1/2 group flex items-center justify-center w-8 py-1"
                style={{ top: `${ratio * 100}%`, transform: "translate(-50%, -50%)" }}
                onClick={() => onJump(msgIndex)}
                onMouseEnter={() => setHoverIndex(msgIndex)}
                onMouseLeave={() => setHoverIndex(null)}
                aria-label={`跳至第 ${msgIndex + 1} 則訊息`}
              >
                <span
                  className={`
                    block rounded-full transition-all duration-200
                    ${
                      isActive
                        ? "w-3 h-3 bg-foreground shadow-sm shadow-foreground/30"
                        : isHovered
                          ? "w-2.5 h-1.5 bg-muted-foreground"
                          : "w-2 h-1 bg-muted-foreground/40 group-hover:bg-muted-foreground/70"
                    }
                  `}
                />
                {preview && (
                  <span
                    className="
                      absolute right-full mr-2 top-1/2 -translate-y-1/2
                      w-56 max-w-[60vw] text-left
                      px-2.5 py-1.5 rounded-lg
                      bg-surface border border-border/70 text-muted-foreground
                      shadow-lg pointer-events-none z-10
                    "
                  >
                    <span className="block text-[10px] font-medium text-accent tabular-nums mb-0.5">
                      #{msgIndex + 1} · {preview.name}
                    </span>
                    <span className="block text-[11px] leading-snug text-foreground/85 line-clamp-2 break-all">
                      {preview.text}
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        className={chapterBtnClass}
        onClick={() => jumpToChapter(activeChapter + 1)}
        disabled={activeChapter >= chapterCount - 1}
        title="下一章"
        aria-label="下一章"
      >
        <ChevronDown className="w-4 h-4" />
      </button>
    </div>
  );
}
