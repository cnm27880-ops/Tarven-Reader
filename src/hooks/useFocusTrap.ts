import { useEffect, useRef } from "react";
import type { RefObject } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * 彈窗開啟時：把焦點移到內部第一個可聚焦元素，並讓 Tab／Shift+Tab
 * 只在彈窗內部的可聚焦元素之間循環，不會跳到背後的頁面內容。
 * 關閉時把焦點還給開啟彈窗前原本聚焦的元素。
 */
export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, enabled: boolean) {
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    if (!container) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const getFocusable = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null,
      );

    (getFocusable()[0] ?? container).focus({ preventScroll: true });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = getFocusable();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }

      const currentIndex = items.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey) {
        if (currentIndex <= 0) {
          e.preventDefault();
          items[items.length - 1].focus();
        }
      } else if (currentIndex === -1 || currentIndex === items.length - 1) {
        e.preventDefault();
        items[0].focus();
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      previouslyFocused.current?.focus?.({ preventScroll: true });
    };
  }, [enabled, containerRef]);
}
