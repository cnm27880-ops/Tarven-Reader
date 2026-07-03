import { Sun, Moon, MessageSquare, BookOpen, Download } from "lucide-react";
import type { Theme, ViewMode } from "../hooks/useChatManager";

interface ToolbarProps {
  theme: Theme;
  toggleTheme: () => void;
  viewMode: ViewMode;
  toggleViewMode: () => void;
  onExport: () => void;
  hasMessages: boolean;
}

export function Toolbar({
  theme,
  toggleTheme,
  viewMode,
  toggleViewMode,
  onExport,
  hasMessages,
}: ToolbarProps) {
  const iconClass =
    "w-[18px] h-[18px] text-muted-foreground group-hover:text-foreground transition-colors duration-200";
  const btnClass = `
    group relative p-3 rounded-xl
    bg-muted/30 hover:bg-muted/60
    border border-transparent hover:border-border/60
    transition-all duration-200 ease-out
    focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40
    active:scale-95
  `;

  return (
    <aside className="w-16 xl:w-[4.5rem] hidden lg:flex flex-col items-center py-6 border-l border-border/60 bg-surface/50 backdrop-blur-sm z-10 shrink-0">
      <div className="flex flex-col gap-3">
        <button
          onClick={toggleTheme}
          className={btnClass}
          title={theme === "light" ? "切換深色模式" : "切換淺色模式"}
          aria-label={theme === "light" ? "切換深色模式" : "切換淺色模式"}
        >
          {theme === "light" ? (
            <Moon className={iconClass} />
          ) : (
            <Sun className={iconClass} />
          )}
        </button>

        <button
          onClick={toggleViewMode}
          className={btnClass}
          title={viewMode === "bubble" ? "切換經典閱讀模式" : "切換氣泡對話模式"}
          aria-label={viewMode === "bubble" ? "切換經典閱讀模式" : "切換氣泡對話模式"}
        >
          {viewMode === "bubble" ? (
            <BookOpen className={iconClass} />
          ) : (
            <MessageSquare className={iconClass} />
          )}
        </button>

        {hasMessages && (
          <button
            onClick={onExport}
            className={btnClass}
            title="匯出為 TXT"
            aria-label="匯出為 TXT"
          >
            <Download className={iconClass} />
          </button>
        )}
      </div>

      <div className="mt-auto pt-4">
        <div className="w-8 h-px bg-border/60 mx-auto mb-4" />
        <p className="text-[10px] text-muted-foreground/50 text-center leading-tight px-1 [writing-mode:vertical-rl] rotate-180">
          酒館閱讀器
        </p>
      </div>
    </aside>
  );
}
