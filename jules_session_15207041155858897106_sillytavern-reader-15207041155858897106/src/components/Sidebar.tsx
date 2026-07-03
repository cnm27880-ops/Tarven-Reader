import type { ChatMessage } from "../types/chat";

interface SidebarProps {
  messages: ChatMessage[];
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ messages, isOpen, onClose }: SidebarProps) {
  // Group messages into chapters (e.g., every 50 messages)
  const chunkSize = 50;
  const chapters = [];
  for (let i = 0; i < messages.length; i += chunkSize) {
    chapters.push(`Chapter ${Math.floor(i / chunkSize) + 1}`);
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-20 md:hidden" 
          onClick={onClose}
        />
      )}
      
      <aside 
        className={`
          fixed md:static inset-y-0 left-0 z-30 w-64
          bg-muted/30 md:bg-transparent
          border-r border-border
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
          p-6 overflow-y-auto
        `}
      >
        <h2 className="text-xl font-serif font-semibold mb-6 text-foreground tracking-wider">
          Contents
        </h2>
        
        {chapters.length === 0 ? (
          <p className="text-muted-foreground text-sm italic">No contents yet.</p>
        ) : (
          <ul className="space-y-4">
            {chapters.map((chapter, index) => (
              <li key={index}>
                <button
                  className="
                    text-left w-full text-muted-foreground hover:text-foreground
                    transition-colors duration-300 ease-in-out
                    text-sm tracking-wide
                  "
                  onClick={() => {
                     // In a full app, you might scroll to the specific chapter index here
                     onClose();
                  }}
                >
                  {chapter}
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </>
  );
}
