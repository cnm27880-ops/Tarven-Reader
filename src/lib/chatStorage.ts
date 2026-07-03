import type { ChatMessage } from "../types/chat";
import type { TextLocale } from "./chinese";

export interface ChatRoom {
  id: string;
  name: string;
  messages: ChatMessage[];
  locale: TextLocale;
  sourceFileName?: string;
  createdAt: number;
  updatedAt: number;
}

export interface StorageMeta {
  activeRoomId: string | null;
  roomOrder: string[];
}

const DB_NAME = "tarven-reader";
const DB_VERSION = 1;
const ROOMS_STORE = "rooms";
const META_KEY = "meta";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ROOMS_STORE)) {
        db.createObjectStore(ROOMS_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("無法開啟本地資料庫"));
  });
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(ROOMS_STORE, mode);
        const store = tx.objectStore(ROOMS_STORE);
        const request = fn(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("資料庫操作失敗"));

        tx.oncomplete = () => db.close();
        tx.onerror = () => {
          db.close();
          reject(tx.error ?? new Error("資料庫交易失敗"));
        };
      }),
  );
}

async function getMeta(): Promise<StorageMeta> {
  const raw = localStorage.getItem(META_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as StorageMeta;
    } catch {
      /* fall through */
    }
  }
  return { activeRoomId: null, roomOrder: [] };
}

async function setMeta(meta: StorageMeta): Promise<void> {
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

export async function loadAllRooms(): Promise<{
  rooms: ChatRoom[];
  meta: StorageMeta;
}> {
  const meta = await getMeta();
  const allRooms = await runTransaction<ChatRoom[]>("readonly", (store) => store.getAll());

  const roomMap = new Map(allRooms.map((r) => [r.id, r]));
  const ordered: ChatRoom[] = [];

  for (const id of meta.roomOrder) {
    const room = roomMap.get(id);
    if (room) {
      ordered.push(room);
      roomMap.delete(id);
    }
  }

  const remaining = [...roomMap.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  ordered.push(...remaining);

  const newOrder = ordered.map((r) => r.id);
  if (newOrder.length !== meta.roomOrder.length || newOrder.some((id, i) => id !== meta.roomOrder[i])) {
    await setMeta({ ...meta, roomOrder: newOrder });
  }

  return { rooms: ordered, meta: { ...meta, roomOrder: newOrder } };
}

export async function saveRoom(room: ChatRoom): Promise<void> {
  await runTransaction("readwrite", (store) => store.put(room));

  const meta = await getMeta();
  if (!meta.roomOrder.includes(room.id)) {
    meta.roomOrder = [room.id, ...meta.roomOrder];
  }
  await setMeta(meta);
}

export async function deleteRoom(id: string): Promise<StorageMeta> {
  await runTransaction("readwrite", (store) => store.delete(id));

  const meta = await getMeta();
  meta.roomOrder = meta.roomOrder.filter((rid) => rid !== id);
  if (meta.activeRoomId === id) {
    meta.activeRoomId = meta.roomOrder[0] ?? null;
  }
  await setMeta(meta);
  return meta;
}

export async function setActiveRoomId(id: string | null): Promise<void> {
  const meta = await getMeta();
  meta.activeRoomId = id;
  await setMeta(meta);
}

export function createRoomId(): string {
  return `room-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function deriveRoomName(fileName: string): string {
  const base = fileName.replace(/\.(jsonl?|txt)$/i, "").trim();
  return base || "未命名聊天室";
}
