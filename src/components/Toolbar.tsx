import { Sun, Moon, MessageSquare, BookOpen, Download, FileJson, Cloud, Search, BarChart3, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Theme, ViewMode } from "../hooks/useChatManager";

interface ToolbarProps {
  theme: Theme;
  toggleTheme: () => void;
  viewMode: ViewMode;
  toggleViewMode: () => void;
  onExport: () => void;
  onExportTavern: () => void;
  onCloudSync: () => void;
  onSearch: () => void;
  onStats: () => void;
  onSettings: () => void;
  hasMessages: boolean;
}

interface ToolButton {
  key: string;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}

export function Toolbar({
  theme,
  toggleTheme,
  viewMode,
  toggleViewMode,
  onExport,
  onExportTavern,
  onCloudSync,
  onSearch,
  onStats,
  onSettings,
  hasMessages,
}: ToolbarProps) {
  const buttons: ToolButton[] = [
    {
      key: "theme",
      icon: theme === "light" ? Moon : Sun,
      label: theme === "light" ? "切換深色模式" : "切換淺色模式",
      onClick: toggleTheme,
    },
    {
      key: "view",
      icon: viewMode === "bubble" ? BookOpen : MessageSquare,
      label: viewMode === "bubble" ? "切換經典閱讀模式" : "切換氣泡對話模式",
      onClick: toggleViewMode,
    },
    ...(hasMessages
      ? [
          { key: "search", icon: Search, label: "搜尋正文（Ctrl+F）", onClick: onSearch },
          { key: "export", icon: Download, label: "匯出為 TXT", onClick: onExport },
          { key: "tavern", icon: FileJson, label: "匯出酒館純淨檔（JSON）", onClick: onExportTavern },
          { key: "stats", icon: BarChart3, label: "閱讀統計", onClick: onStats },
        ]
      : []),
    { key: "cloud", icon: Cloud, label: "雲端同步與備份", onClick: onCloudSync },
  ];

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
  const mobileBtnClass = `
    group relative p-2.5 rounded-xl
    text-muted-foreground
    transition-all duration-200 ease-out
    focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40
    active:scale-95 active:bg-muted/60
  `;

  return (
    <>
      {/* 桌面版：右側直立功能條 */}
      <aside className="w-16 xl:w-[4.5rem] hidden lg:flex flex-col items-center py-6 border-l border-border/60 bg-surface/50 backdrop-blur-sm z-10 shrink-0">
        <div className="flex flex-col gap-3">
          {buttons.map(({ key, icon: Icon, label, onClick }) => (
            <button key={key} onClick={onClick} className={btnClass} title={label} aria-label={label}>
              <Icon className={iconClass} />
            </button>
          ))}
        </div>

        <div className="mt-auto pt-4 flex flex-col items-center">
          <button
            onClick={onSettings}
            className={btnClass}
            title="閱讀設定"
            aria-label="閱讀設定"
          >
            <Settings className={iconClass} />
          </button>
          <div className="w-8 h-px bg-border/60 mx-auto my-4" />
          <p className="text-[10px] text-muted-foreground/50 text-center leading-tight px-1 [writing-mode:vertical-rl] rotate-180">
            酒館閱讀器
          </p>
        </div>
      </aside>

      {/* 手機／平板版：底部功能條 */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-10 bg-surface/90 backdrop-blur-xl border-t border-border/60 pb-[env(safe-area-inset-bottom)]"
        aria-label="工具列"
      >
        <div className="h-14 flex items-center justify-around px-1 max-w-lg mx-auto">
          {buttons.map(({ key, icon: Icon, label, onClick }) => (
            <button key={key} onClick={onClick} className={mobileBtnClass} title={label} aria-label={label}>
              <Icon className="w-5 h-5" />
            </button>
          ))}
          <button
            onClick={onSettings}
            className={mobileBtnClass}
            title="閱讀設定"
            aria-label="閱讀設定"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </nav>
    </>
  );
}
