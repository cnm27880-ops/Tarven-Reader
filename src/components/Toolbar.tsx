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
  const iconClass = "w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors duration-300";
  const btnClass = `
    group p-3 rounded-full bg-muted/50 hover:bg-muted 
    transition-all duration-300 ease-in-out
    focus:outline-none focus:ring-2 focus:ring-border
    active:scale-95 shadow-sm
  `;

  return (
    <aside className="w-20 hidden lg:flex flex-col items-center py-8 border-l border-border bg-background z-10 sticky top-0 h-screen">
      <div className="flex flex-col gap-6">
        <button
          onClick={toggleTheme}
          className={btnClass}
          title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
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
          title={viewMode === "bubble" ? "Switch to Classic Mode" : "Switch to Bubble Mode"}
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
            title="Export to TXT"
          >
            <Download className={iconClass} />
          </button>
        )}
      </div>
    </aside>
  );
}
