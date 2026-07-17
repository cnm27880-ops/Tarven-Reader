/**
 * 樓層書籤：以聊天室為單位存於 localStorage，
 * 透過簡易訂閱機制讓側邊欄與閱讀區同步更新，
 * 並隨完整備份（本機備份檔／雲端）一起匯出還原。
 */

export interface Bookmark {
  /** 訊息在聊天室中的索引（樓層）。 */
  index: number;
  /** 建立書籤當下的內容摘要。 */
  snippet: string;
  createdAt: number;
}

export type BookmarkMap = Record<string, Bookmark[]>;

const BOOKMARKS_KEY = "bookmarks";

let cache: BookmarkMap | null = null;
const listeners = new Set<() => void>();

function load(): BookmarkMap {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    cache = raw ? (JSON.parse(raw) as BookmarkMap) : {};
  } catch {
    cache = {};
  }
  return cache;
}

function persist(): void {
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(cache ?? {}));
  } catch {
    /* storage full — bookmarks are best-effort */
  }
  for (const listener of listeners) listener();
}

export function subscribeBookmarks(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const EMPTY: Bookmark[] = [];

export function getBookmarks(roomId: string | null): Bookmark[] {
  if (!roomId) return EMPTY;
  return load()[roomId] ?? EMPTY;
}

export function isBookmarked(roomId: string | null, index: number): boolean {
  return getBookmarks(roomId).some((b) => b.index === index);
}

export function toggleBookmark(roomId: string, index: number, snippet: string): void {
  const map = load();
  const list = map[roomId] ?? [];
  const existing = list.findIndex((b) => b.index === index);

  if (existing >= 0) {
    const next = list.filter((b) => b.index !== index);
    if (next.length > 0) {
      map[roomId] = next;
    } else {
      delete map[roomId];
    }
  } else {
    map[roomId] = [
      ...list,
      { index, snippet: snippet.slice(0, 60), createdAt: Date.now() },
    ].sort((a, b) => a.index - b.index);
  }

  persist();
}

export function clearBookmarks(roomId: string): void {
  const map = load();
  if (roomId in map) {
    delete map[roomId];
    persist();
  }
}

/** 供備份匯出使用。 */
export function exportBookmarks(): BookmarkMap {
  return { ...load() };
}

/** 供備份還原使用：以聊天室為單位合併（備份覆蓋同 id）。 */
export function importBookmarks(imported: BookmarkMap | undefined): void {
  if (!imported || typeof imported !== "object") return;
  const map = load();
  for (const [roomId, list] of Object.entries(imported)) {
    if (Array.isArray(list)) map[roomId] = list;
  }
  persist();
}
