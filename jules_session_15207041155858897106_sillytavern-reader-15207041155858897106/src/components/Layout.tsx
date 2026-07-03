import type { ReactNode } from "react";
import { Menu } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
  onMenuClick: () => void;
}

export function Layout({ children, onMenuClick }: LayoutProps) {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden selection:bg-muted selection:text-foreground">
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-md border-b border-border z-20 flex items-center px-4">
        <button 
          onClick={onMenuClick}
          className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="ml-4 font-serif font-medium text-foreground tracking-wide">
          SillyTavern Reader
        </h1>
      </header>
      
      {/* Container for Sidebar, ReadingArea, Toolbar */}
      <div className="flex w-full h-full pt-16 md:pt-0">
        {children}
      </div>
    </div>
  );
}
