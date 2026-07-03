import type { ReactNode } from "react";
import { Menu } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
  onMenuClick: () => void;
  messageCount: number;
  roomName?: string;
}

export function Layout({ children, onMenuClick, messageCount, roomName }: LayoutProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden selection:bg-accent/20 selection:text-foreground">
      <div className="fixed inset-0 -z-10 bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--gradient-start)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--gradient-end)_0%,_transparent_50%)]" />
      </div>

      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-surface/80 backdrop-blur-xl border-b border-border/60 z-20 flex items-center px-4">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label="開啟目錄"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="ml-3 font-serif font-medium text-foreground tracking-wide text-sm">
          酒館閱讀器
        </h1>
        {messageCount > 0 && (
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {messageCount} 則
          </span>
        )}
      </header>

      <div className="hidden md:flex fixed top-0 left-72 right-20 h-12 items-center px-8 z-10 pointer-events-none gap-3 min-w-0">
        {roomName ? (
          <span className="text-sm text-foreground/80 font-medium truncate">{roomName}</span>
        ) : (
          <span className="text-xs text-muted-foreground/60 tracking-widest">酒館閱讀器</span>
        )}
        {messageCount > 0 && (
          <span className="text-xs text-muted-foreground/50 tabular-nums shrink-0">
            {messageCount} 則
          </span>
        )}
      </div>

      <div className="flex w-full h-full pt-14 md:pt-0">{children}</div>
    </div>
  );
}
