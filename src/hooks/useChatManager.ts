import { useState, useCallback, useEffect } from "react";
import type { ChatMessage, SillyTavernMessage } from "../types/chat";
import { cleanMessage } from "../lib/utils";

export type Theme = "light" | "dark";
export type ViewMode = "bubble" | "classic";

export function useChatManager() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [theme, setTheme] = useState<Theme>("light");
  const [viewMode, setViewMode] = useState<ViewMode>("bubble");

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === "light" ? "dark" : "light"));
  const toggleViewMode = () => setViewMode((prev) => (prev === "bubble" ? "classic" : "bubble"));

  const parseSillyTavernJson = useCallback((file: File) => {
    if (!file.name.endsWith(".json")) {
      alert("Please upload a .json file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        
        let newMessages: SillyTavernMessage[] = [];
        
        if (Array.isArray(parsed)) {
            newMessages = parsed;
        } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.mes)) {
            // Some formats might wrap the messages
            newMessages = parsed.mes;
        } else {
            console.warn("Could not find array in JSON root");
            // SillyTavern logs format could be an array of objects
            return;
        }
        
        setMessages((prevMessages) => {
          const updatedMessages = [...prevMessages];
          const existingTextSet = new Set(prevMessages.map(m => m.mes));

          newMessages.forEach((rawMsg, index) => {
            const rawText = rawMsg.mes || "";
            const cleaned = cleanMessage(rawText);
            
            // Skip empty messages after cleaning
            if (!cleaned) return;

            // Deduplication logic: Check if we already have this exact cleaned text
            // (Assuming identical text = duplicate message. Can refine if false positives happen)
            if (!existingTextSet.has(cleaned)) {
              updatedMessages.push({
                id: `msg-${Date.now()}-${index}`,
                name: rawMsg.name || "Unknown",
                mes: cleaned,
                isUser: rawMsg.is_user || rawMsg.is_name || false, // Fallback heuristic
                rawIndex: index
              });
              existingTextSet.add(cleaned);
            }
          });

          return updatedMessages;
        });
      } catch (err) {
        console.error("Failed to parse JSON", err);
        alert("Failed to parse the JSON file.");
      }
    };
    reader.readAsText(file);
  }, []);

  return {
    messages,
    theme,
    toggleTheme,
    viewMode,
    toggleViewMode,
    parseSillyTavernJson,
  };
}
