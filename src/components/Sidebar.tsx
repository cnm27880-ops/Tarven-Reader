import { useEffect, useState, useSyncExternalStore } from "react";
import type { ChatMessage } from "../types/chat";
import type { ChatRoom } from "../lib/chatStorage";
import {
  BookOpen,
  Bookmark,
  ChevronRight,
  Cloud,
  Download,
  FileJson,
  List,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { CHAPTER_SIZE } from "../lib/utils";
import {
  getActiveIndex,
  jumpToChapter,
  jumpToMessage,
  subscribeActiveIndex,
} from "../lib/readerNav";
import {
  getBookmarks,
  setBookmarkNote,
  subscribeBookmarks,
  toggleBookmark,
} from "../lib/bookmarks";

interface SidebarProps {
  rooms: ChatRoom[];
  activeRoomId: string | null;
  messages: ChatMessage[];
  isOpen: boolean;
  onClose: () => void;
  onSwitchRoom: (roomId: string) => void;
  onRenameRoom: (roomId: string, name: string) => void;
  onDeleteRoom: (roomId: string) => void;
  onImportClick: () => void;
  onExportTxt: () => void;
  onExportTavern: () => void;
  onCloudSync: () => void;
  onSearch: () => void;
}

export function Sidebar({
  rooms,
  activeRoomId,
  messages,
  isOpen,
  onClose,
  onSwitchRoom,
  onRenameRoom,
  onDeleteRoom,
  onImportClick,
  onExportTxt,
  onExportTavern,
  onCloudSync,
  onSearch,
}: SidebarProps) {
  const chapterCount = Math.ceil(messages.length / CHAPTER_SIZE);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null);
  const [noteText, setNoteText] = useState("");

  // 目錄跟隨閱讀位置自動高亮目前章節
  const activeIndex = useSyncExternalStore(subscribeActiveIndex, getActiveIndex);
  const activeChapter =
    chapterCount > 0
      ? Math.min(Math.floor(activeIndex / CHAPTER_SIZE), chapterCount - 1)
      : null;

  useEffect(() => {
    if (activeChapter === null) return;
    document
      .getElementById(`chapter-item-${activeChapter}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeChapter]);

  const bookmarks = useSyncExternalStore(subscribeBookmarks, () => getBookmarks(activeRoomId));

  const handleChapterClick = (chapterIndex: number) => {
    jumpToChapter(chapterIndex);
    onClose();
  };

  const handleBookmarkClick = (index: number) => {
    jumpToMessage(index);
    onClose();
  };

  const startRename = (room: ChatRoom) => {
    setEditingRoomId(room.id);
    setEditName(room.name);
  };

  const commitRename = (roomId: string) => {
    if (editName.trim()) {
      onRenameRoom(roomId, editName.trim());
    }
    setEditingRoomId(null);
  };

  const handleDelete = (roomId: string) => {
    onDeleteRoom(roomId);
    setDeleteConfirmId(null);
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-20 md:hidden animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-30
          w-[min(18rem,90vw)] md:w-72 shrink-0
          bg-surface/95 md:bg-surface/60 backdrop-blur-xl
          border-r border-border/60
          transform transition-transform duration-300 ease-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
          pt-14 md:pt-0
          flex flex-col
          max-h-screen md:max-h-none
          shadow-xl md:shadow-none
        `}
      >
        {/* 聊天室列表 */}
        <div className="p-4 border-b border-border/40 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-semibold text-foreground">聊天室</h2>
              <span className="text-xs text-muted-foreground">({rooms.length})</span>
            </div>
            <button
              type="button"
              onClick={onImportClick}
              className="p-1.5 rounded-lg text-accent hover:bg-accent/10 transition-colors"
              title="匯入新聊天室"
              aria-label="匯入新聊天室"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5">
            {rooms.length === 0 ? (
              <button
                type="button"
                onClick={onImportClick}
                className="w-full text-left px-3 py-2.5 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-accent/40 hover:text-foreground transition-colors"
              >
                點擊匯入第一個聊天室
              </button>
            ) : (
              rooms.map((room) => {
                const isActive = room.id === activeRoomId;
                const isEditing = editingRoomId === room.id;
                const isDeleting = deleteConfirmId === room.id;

                return (
                  <div key={room.id} className="group relative">
                    {isEditing ? (
                      <div className="flex gap-1 px-1">
                        <input
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename(room.id);
                            if (e.key === "Escape") setEditingRoomId(null);
                          }}
                          onBlur={() => commitRename(room.id)}
                          className="flex-1 min-w-0 px-2 py-1.5 text-sm rounded-lg border border-accent bg-background text-foreground"
                        />
                      </div>
                    ) : isDeleting ? (
                      <div className="px-2 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
                        <p className="text-xs text-red-600 dark:text-red-400 mb-2">確定刪除此聊天室？</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleDelete(room.id)}
                            className="flex-1 text-xs py-1 rounded-lg bg-red-500 text-white"
                          >
                            刪除
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="flex-1 text-xs py-1 rounded-lg border border-border text-muted-foreground"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSwitchRoom(room.id)}
                        className={`
                          w-full text-left rounded-xl px-3 py-2.5 pr-16
                          transition-all duration-200 border
                          ${
                            isActive
                              ? "bg-accent/10 border-accent/30 text-foreground"
                              : "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                          }
                        `}
                      >
                        <span className="block text-sm font-medium truncate">{room.name}</span>
                        <span className="block text-[11px] text-muted-foreground mt-0.5">
                          {room.messages.length} 則 · {formatDate(room.updatedAt)}
                        </span>
                      </button>
                    )}

                    {!isEditing && !isDeleting && (
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            startRename(room);
                          }}
                          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60"
                          aria-label="重新命名"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(room.id);
                          }}
                          className="p-1 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                          aria-label="刪除聊天室"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 章節目錄 / 書籤 */}
        <div className="p-4 sm:p-5 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
              {showBookmarks ? (
                <Bookmark className="w-3.5 h-3.5 text-accent" />
              ) : (
                <List className="w-3.5 h-3.5 text-accent" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-foreground">
                {showBookmarks ? "書籤" : "目錄"}
              </h2>
              {messages.length > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  {showBookmarks
                    ? `${bookmarks.length} 個書籤`
                    : `共 ${messages.length} 則訊息`}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowBookmarks((v) => !v)}
              className={`
                flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors
                ${
                  showBookmarks
                    ? "text-accent bg-accent/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }
              `}
              title={showBookmarks ? "切回目錄" : "查看書籤"}
            >
              {showBookmarks ? (
                <>
                  <List className="w-3 h-3" />
                  目錄
                </>
              ) : (
                <>
                  <Bookmark className="w-3 h-3" />
                  {bookmarks.length > 0 ? bookmarks.length : ""}
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 min-h-0">
          {showBookmarks ? (
            bookmarks.length === 0 ? (
              <p className="text-muted-foreground text-sm italic px-2 flex items-center gap-2">
                <Bookmark className="w-3.5 h-3.5" />
                點訊息名稱旁的書籤圖示即可收藏樓層
              </p>
            ) : (
              <ul className="space-y-1">
                {bookmarks.map((bookmark) => {
                  const isEditingNote = editingNoteIndex === bookmark.index;

                  return (
                    <li key={bookmark.index} className="group relative">
                      <button
                        type="button"
                        onClick={() => handleBookmarkClick(bookmark.index)}
                        className="w-full text-left rounded-xl px-3 py-2.5 pr-12 border border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-all duration-200"
                      >
                        <span className="block text-xs font-medium text-accent tabular-nums">
                          第 {bookmark.index + 1} 層
                        </span>
                        {bookmark.note && (
                          <span className="block text-xs mt-0.5 text-foreground font-medium break-words">
                            {bookmark.note}
                          </span>
                        )}
                        <span className="block text-xs mt-0.5 truncate opacity-70">
                          {bookmark.snippet}
                        </span>
                      </button>

                      {isEditingNote && activeRoomId && (
                        <div className="px-3 pb-2">
                          <input
                            autoFocus
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                setBookmarkNote(activeRoomId, bookmark.index, noteText);
                                setEditingNoteIndex(null);
                              }
                              if (e.key === "Escape") setEditingNoteIndex(null);
                            }}
                            onBlur={() => {
                              setBookmarkNote(activeRoomId, bookmark.index, noteText);
                              setEditingNoteIndex(null);
                            }}
                            placeholder="輸入備註，Enter 儲存"
                            className="w-full px-2 py-1.5 text-xs rounded-lg border border-accent bg-background text-foreground"
                          />
                        </div>
                      )}

                      {activeRoomId && !isEditingNote && (
                        <div className="absolute right-1.5 top-2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNoteIndex(bookmark.index);
                              setNoteText(bookmark.note ?? "");
                            }}
                            className="p-1 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-muted/60"
                            aria-label="編輯備註"
                            title="編輯備註"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              toggleBookmark(activeRoomId, bookmark.index, bookmark.snippet)
                            }
                            className="p-1 rounded-md text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10"
                            aria-label="移除書籤"
                            title="移除書籤"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )
          ) : chapterCount === 0 ? (
            <p className="text-muted-foreground text-sm italic px-2 flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5" />
              尚無章節內容
            </p>
          ) : (
            <ul className="space-y-1">
              {Array.from({ length: chapterCount }, (_, index) => {
                const start = index * CHAPTER_SIZE + 1;
                const end = Math.min((index + 1) * CHAPTER_SIZE, messages.length);
                const firstMsg = messages[index * CHAPTER_SIZE];
                const isChapterActive = activeChapter === index;

                return (
                  <li key={index} id={`chapter-item-${index}`}>
                    <button
                      type="button"
                      className={`
                        group text-left w-full rounded-xl px-3 py-2.5
                        transition-all duration-200 flex items-center gap-2
                        ${
                          isChapterActive
                            ? "bg-accent/10 text-accent border border-accent/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent"
                        }
                      `}
                      onClick={() => handleChapterClick(index)}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="block text-sm font-medium">第 {index + 1} 章</span>
                        <span className="block text-xs text-muted-foreground mt-0.5 truncate">
                          第 {start}–{end} 則
                          {firstMsg ? ` · ${firstMsg.name}` : ""}
                        </span>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                          isChapterActive
                            ? "text-accent"
                            : "text-muted-foreground/50 group-hover:translate-x-0.5"
                        }`}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* 小螢幕沒有右側工具列，改在側邊欄提供匯出與雲端功能 */}
        <div className="lg:hidden px-4 pb-2 shrink-0">
          <div className="flex gap-1.5">
            {messages.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={onSearch}
                  className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                  title="搜尋正文"
                >
                  <Search className="w-4 h-4" />
                  <span className="text-[10px]">搜尋</span>
                </button>
                <button
                  type="button"
                  onClick={onExportTxt}
                  className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                  title="匯出為 TXT"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-[10px]">TXT</span>
                </button>
                <button
                  type="button"
                  onClick={onExportTavern}
                  className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                  title="匯出酒館純淨檔"
                >
                  <FileJson className="w-4 h-4" />
                  <span className="text-[10px]">純淨檔</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onCloudSync}
              className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              title="雲端同步與備份"
            >
              <Cloud className="w-4 h-4" />
              <span className="text-[10px]">雲端</span>
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="md:hidden m-4 mt-0 py-2.5 rounded-xl border border-border text-sm text-muted-foreground shrink-0"
        >
          關閉側邊欄
        </button>
      </aside>
    </>
  );
}
