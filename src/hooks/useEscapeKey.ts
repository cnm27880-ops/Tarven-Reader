import { useEffect } from "react";

/** 讓彈窗在按 Esc 時關閉，不需要焦點停留在特定輸入框上。 */
export function useEscapeKey(enabled: boolean, onClose: () => void) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled, onClose]);
}
