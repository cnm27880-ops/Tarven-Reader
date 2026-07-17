import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { CHAPTER_SIZE } from "../lib/utils";

interface MessageNavigatorProps {
  messageCount: number;
  scrollContainerRef: React.RefObject<HTMLElement | null>;
}

export function MessageNavigator({ messageCount, scrollContainerRef }: MessageNavigatorProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const chapterCount = Math.max(1, Math.ceil(messageCount / CHAPTER_SIZE));
  const activeChapter = Math.min(
    Math.floor(activeIndex / CHAPTER_SIZE),
    chapterCount - 1,
  );
  const chapterStart = activeChapter * CHAPTER_SIZE;
  const chapterLength = Math.min(CHAPTER_SIZE, messageCount - chapterStart);

  const markerIndices = Array.from({ length: chapterLength }, (_, i) => chapterStart + i);

  const updateActiveFromScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || messageCount === 0) return;

    // 捲到最底時視為在讀最後一則（短章節無法把章首捲到頂端）。
    if (container.scrollTop + container.clientHeight >= container.scrollHeight - 4) {
      setActiveIndex(messageCount - 1);
      return;
    }

    // 目前閱讀中的訊息 = 最後一則頂端仍在「閱讀行」上方的訊息；
    // 訊息依序排列，用二分搜尋避免逐則量測。
    const refLine =
      container.getBoundingClientRect().top + Math.min(200, container.clientHeight / 3);

    let lo = 0;
    let hi = messageCount - 1;
    let current = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const el = document.getElementById(`message-${mid}`);
      if (!el) return;
      if (el.getBoundingClientRect().top <= refLine) {
        current = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    setActiveIndex(current);
  }, [messageCount, scrollContainerRef]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    updateActiveFromScroll();
    container.addEventListener("scroll", updateActiveFromScroll, { passive: true });
    return () => container.removeEventListener("scroll", updateActiveFromScroll);
  }, [scrollContainerRef, updateActiveFromScroll, messageCount]);

  const jumpToMessage = (index: number, behavior: ScrollBehavior = "smooth") => {
    const el = document.getElementById(`message-${index}`);
    if (el) {
      el.scrollIntoView({ behavior, block: "start" });
      setActiveIndex(index);
    }
  };

  const jumpToChapter = (chapterIndex: number) => {
    const clamped = Math.max(0, Math.min(chapterIndex, chapterCount - 1));
    // 跨章距離長，平滑捲動途中 scroll 監聽會把章節蓋回去，改用瞬間跳轉。
    jumpToMessage(clamped * CHAPTER_SIZE, "instant");
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

      <div
        ref={trackRef}
        className="relative flex flex-col items-center flex-1 min-h-[120px] max-h-[calc(100vh-12rem)] w-full my-1"
      >
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
                onClick={() => jumpToMessage(msgIndex)}
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
