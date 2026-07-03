import { useCallback, useEffect, useRef, useState } from "react";

interface MessageNavigatorProps {
  messageCount: number;
  scrollContainerRef: React.RefObject<HTMLElement | null>;
}

const MAX_MARKERS = 120;

export function MessageNavigator({ messageCount, scrollContainerRef }: MessageNavigatorProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const markerCount = Math.min(messageCount, MAX_MARKERS);
  const step = messageCount > MAX_MARKERS ? Math.ceil(messageCount / MAX_MARKERS) : 1;

  const markerIndices = Array.from({ length: markerCount }, (_, i) =>
    messageCount > MAX_MARKERS ? Math.min(i * step, messageCount - 1) : i,
  );

  const updateActiveFromScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || messageCount === 0) return;

    const containerTop = container.getBoundingClientRect().top;
    let closest = 0;
    let closestDist = Infinity;

    for (let i = 0; i < messageCount; i++) {
      const el = document.getElementById(`message-${i}`);
      if (!el) continue;
      const dist = Math.abs(el.getBoundingClientRect().top - containerTop - 80);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    }

    setActiveIndex(closest);
  }, [messageCount, scrollContainerRef]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    updateActiveFromScroll();
    container.addEventListener("scroll", updateActiveFromScroll, { passive: true });
    return () => container.removeEventListener("scroll", updateActiveFromScroll);
  }, [scrollContainerRef, updateActiveFromScroll, messageCount]);

  const jumpToMessage = (index: number) => {
    const el = document.getElementById(`message-${index}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveIndex(index);
    }
  };

  if (messageCount < 2) return null;

  return (
    <div
      className="hidden sm:flex flex-col items-center justify-center w-5 shrink-0 py-4 select-none"
      aria-label="訊息導覽"
    >
      <div
        ref={trackRef}
        className="relative flex flex-col items-center h-full min-h-[120px] max-h-[calc(100vh-8rem)] w-full"
      >
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-border/70" />

        <div className="relative flex flex-col justify-between h-full w-full py-1">
          {markerIndices.map((msgIndex) => {
            const isActive = msgIndex === activeIndex;
            const isHovered = hoverIndex === msgIndex;
            const ratio = messageCount > 1 ? msgIndex / (messageCount - 1) : 0;

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
    </div>
  );
}
