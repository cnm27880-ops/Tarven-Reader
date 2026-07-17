import { CHAPTER_SIZE } from "./utils";

/**
 * 虛擬捲動後訊息不一定存在於 DOM，跳轉改由 ReadingArea
 * 註冊的虛擬捲動函式處理；側邊欄與導覽軌道透過這裡呼叫。
 */
type JumpFn = (index: number) => void;

let jumpFn: JumpFn | null = null;

export function registerJumpToMessage(fn: JumpFn | null): void {
  jumpFn = fn;
}

export function jumpToMessage(index: number): void {
  jumpFn?.(index);
}

export function jumpToChapter(chapterIndex: number): void {
  jumpToMessage(chapterIndex * CHAPTER_SIZE);
}

// ── 目前閱讀位置（供側邊欄目錄高亮等元件訂閱） ──────────────────

let activeIndexValue = 0;
const activeIndexListeners = new Set<() => void>();

export function publishActiveIndex(index: number): void {
  if (index === activeIndexValue) return;
  activeIndexValue = index;
  for (const listener of activeIndexListeners) listener();
}

export function getActiveIndex(): number {
  return activeIndexValue;
}

export function subscribeActiveIndex(listener: () => void): () => void {
  activeIndexListeners.add(listener);
  return () => {
    activeIndexListeners.delete(listener);
  };
}

// ── 閱讀進度（每個聊天室記住上次讀到的樓層） ──────────────────

const PROGRESS_KEY = "readingProgress";
const MAX_PROGRESS_ENTRIES = 200;

export type ProgressMap = Record<string, number>;

function loadProgressMap(): ProgressMap {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) return JSON.parse(raw) as ProgressMap;
  } catch {
    /* ignore */
  }
  return {};
}

export function saveReadingProgress(roomId: string, messageIndex: number): void {
  const map = loadProgressMap();
  map[roomId] = messageIndex;

  const keys = Object.keys(map);
  if (keys.length > MAX_PROGRESS_ENTRIES) {
    for (const key of keys.slice(0, keys.length - MAX_PROGRESS_ENTRIES)) {
      delete map[key];
    }
  }

  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
  } catch {
    /* storage full — progress is best-effort */
  }
}

export function getReadingProgress(roomId: string): number {
  const value = loadProgressMap()[roomId];
  return typeof value === "number" && value > 0 ? value : 0;
}

export function clearReadingProgress(roomId: string): void {
  const map = loadProgressMap();
  if (roomId in map) {
    delete map[roomId];
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
    } catch {
      /* ignore */
    }
  }
}

/** 供備份匯出使用。 */
export function exportReadingProgress(): ProgressMap {
  return loadProgressMap();
}

/** 供備份還原使用：合併（備份覆蓋同 id）。 */
export function importReadingProgress(imported: ProgressMap | undefined): void {
  if (!imported || typeof imported !== "object") return;
  const map = loadProgressMap();
  for (const [roomId, index] of Object.entries(imported)) {
    if (typeof index === "number") map[roomId] = index;
  }
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}
