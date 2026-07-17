import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { CHAPTER_SIZE } from "../lib/utils";

interface MessageNavigatorProps {
  messageCount: number;
  activeIndex: number;
  onJump: (index: number) => void;
}

export function MessageNavigator({ messageCount, activeIndex, onJump }: MessageNavigatorProps) {
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
      className="hidden sm:flex flex-col items-center justify-center w-7 shrink-0 py-3 select-none"
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

      <div className="relative flex flex-col items-center flex-1 min-h-[120px] max-h-[calc(100vh-12rem)] w-full my-1">
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-border/70" />

        <div className="relative flex flex-col justify-between h-full w-full py-1">
          {markerIndices.map((msgIndex) => {
            const isActive = msgIndex === activeIndex;
            const isHovered = hoverIndex === msgIndex;
            const ratio =
              chapterLength > 1 ? (msgIndex - chapterStart) / (chapterLength - 1) : 0;

            return (
              <button
                key={msgIndex}
                type="button"
                className="absolute left-1/2 -translate-x-1/2 group"
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
                        ? "w-2.5 h-2.5 bg-foreground shadow-sm shadow-foreground/30"
                        : isHovered
                          ? "w-2 h-1 bg-muted-foreground"
                          : "w-1.5 h-0.5 bg-muted-foreground/40 group-hover:bg-muted-foreground/70"
                    }
                  `}
                />
                {isHovered && (
                  <span
                    className="
                      absolute right-full mr-2 top-1/2 -translate-y-1/2
                      whitespace-nowrap text-[10px] px-1.5 py-0.5 rounded
                      bg-surface border border-border/60 text-muted-foreground
                      shadow-sm pointer-events-none
                    "
                  >
                    #{msgIndex + 1}
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
