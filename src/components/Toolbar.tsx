import { useEffect, useRef, useState } from "react";
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

interface ExportMenuButtonProps {
  buttonClassName: string;
  iconClassName: string;
  /** "left"：桌面直立工具條，選單往左展開；"top"：手機底部工具列，選單往上展開。 */
  placement: "left" | "top";
  onExportTxt: () => void;
  onExportTavern: () => void;
}

function ExportMenuButton({
  buttonClassName,
  iconClassName,
  placement,
  onExportTxt,
  onExportTavern,
}: ExportMenuButtonProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const menuItemClass =
    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors whitespace-nowrap";

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={buttonClassName}
        title="匯出"
        aria-label="匯出"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Download className={iconClassName} />
      </button>

      {open && (
        <div
          role="menu"
          className={`
            absolute z-20 flex flex-col gap-0.5 p-1.5 rounded-xl
            bg-surface border border-border/70 shadow-lg
            ${
              placement === "left"
                ? "right-full top-1/2 -translate-y-1/2 mr-2"
                : "bottom-full left-1/2 -translate-x-1/2 mb-2"
            }
          `}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onExportTxt();
              setOpen(false);
            }}
            className={menuItemClass}
          >
            <Download className="w-4 h-4" />
            匯出為 TXT
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onExportTavern();
              setOpen(false);
            }}
            className={menuItemClass}
          >
            <FileJson className="w-4 h-4" />
            匯出酒館純淨檔
          </button>
        </div>
      )}
    </div>
  );
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
  const leadingButtons: ToolButton[] = [
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
      ? [{ key: "search", icon: Search, label: "搜尋正文（Ctrl+F）", onClick: onSearch }]
      : []),
  ];

  const trailingButtons: ToolButton[] = [
    ...(hasMessages
      ? [{ key: "stats", icon: BarChart3, label: "閱讀統計", onClick: onStats }]
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
          {leadingButtons.map(({ key, icon: Icon, label, onClick }) => (
            <button key={key} onClick={onClick} className={btnClass} title={label} aria-label={label}>
              <Icon className={iconClass} />
            </button>
          ))}
          {hasMessages && (
            <ExportMenuButton
              buttonClassName={btnClass}
              iconClassName={iconClass}
              placement="left"
              onExportTxt={onExport}
              onExportTavern={onExportTavern}
            />
          )}
          {trailingButtons.map(({ key, icon: Icon, label, onClick }) => (
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
          {leadingButtons.map(({ key, icon: Icon, label, onClick }) => (
            <button key={key} onClick={onClick} className={mobileBtnClass} title={label} aria-label={label}>
              <Icon className="w-5 h-5" />
            </button>
          ))}
          {hasMessages && (
            <ExportMenuButton
              buttonClassName={mobileBtnClass}
              iconClassName="w-5 h-5"
              placement="top"
              onExportTxt={onExport}
              onExportTavern={onExportTavern}
            />
          )}
          {trailingButtons.map(({ key, icon: Icon, label, onClick }) => (
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
