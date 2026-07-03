import type { ChatMessage } from "../types/chat";
import type { ViewMode } from "../hooks/useChatManager";
import { UploadCloud } from "lucide-react";

interface ReadingAreaProps {
  messages: ChatMessage[];
  viewMode: ViewMode;
  onUploadClick: () => void;
}

export function ReadingArea({ messages, viewMode, onUploadClick }: ReadingAreaProps) {
  if (messages.length === 0) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <div 
          onClick={onUploadClick}
          className="
            flex flex-col items-center justify-center
            max-w-md w-full p-12 
            border-2 border-dashed border-border rounded-xl
            bg-muted/10 hover:bg-muted/30
            cursor-pointer
            transition-all duration-300 ease-in-out
            group
          "
        >
          <UploadCloud className="w-12 h-12 text-muted-foreground mb-4 group-hover:text-foreground transition-colors duration-300" />
          <h3 className="text-xl font-serif text-foreground mb-2">Upload Story</h3>
          <p className="text-muted-foreground text-center text-sm">
            Click or drag and drop your SillyTavern .json file here to begin reading.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex justify-center p-4 sm:p-8 lg:p-12 overflow-y-auto w-full">
      <div className="max-w-3xl w-full">
        <div className="space-y-8 pb-32">
          {messages.map((msg) => (
            <div key={msg.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
              {viewMode === "bubble" ? (
                <div className={`flex flex-col ${msg.isUser ? "items-end" : "items-start"}`}>
                  <span className="text-xs text-muted-foreground mb-1 ml-1 mr-1">
                    {msg.name}
                  </span>
                  <div 
                    className={`
                      px-6 py-4 rounded-2xl max-w-[85%] sm:max-w-[75%]
                      shadow-sm
                      leading-relaxed tracking-wide text-[15px]
                      whitespace-pre-wrap
                      ${msg.isUser 
                        ? "bg-muted/80 text-foreground rounded-tr-sm" 
                        : "bg-background border border-border text-foreground rounded-tl-sm"
                      }
                    `}
                  >
                    {msg.mes}
                  </div>
                </div>
              ) : (
                <div className="group">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="h-px bg-border flex-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <span className="font-serif font-medium text-foreground tracking-widest uppercase text-sm">
                      {msg.name}
                    </span>
                    <div className="h-px bg-border flex-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </div>
                  <div className="px-2 whitespace-pre-wrap font-serif text-foreground leading-[1.8] text-base md:text-lg">
                    {msg.mes}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
