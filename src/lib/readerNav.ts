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

// ── 閱讀進度（每個聊天室記住上次讀到的樓層） ──────────────────

const PROGRESS_KEY = "readingProgress";
const MAX_PROGRESS_ENTRIES = 200;

type ProgressMap = Record<string, number>;

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
