import { useState, useRef, useEffect } from "react";
import { AlertCircle, CloudDownload, Loader2, X } from "lucide-react";
import { Layout } from "./components/Layout";
import { Sidebar } from "./components/Sidebar";
import { ReadingArea } from "./components/ReadingArea";
import { Toolbar } from "./components/Toolbar";
import { ImportModal } from "./components/ImportModal";
import { useChatManager } from "./hooks/useChatManager";
import type { ImportMode } from "./hooks/useChatManager";
import { useReaderSettings } from "./hooks/useReaderSettings";
import type { TextLocale } from "./lib/chinese";
import { exportCleanedTavernFile, exportToTxt } from "./lib/utils";
import { SettingsPanel } from "./components/SettingsPanel";
import { CloudSyncPanel } from "./components/CloudSyncPanel";
import { ExportNameModal } from "./components/ExportNameModal";
import { SearchPanel } from "./components/SearchPanel";
import { useDriveAutoSync } from "./hooks/useDriveAutoSync";
import "./index.css";

type PendingExport = { type: "txt" | "tavern"; defaultName: string };

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingExport, setPendingExport] = useState<PendingExport | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    rooms,
    activeRoom,
    activeRoomId,
    messages,
    theme,
    toggleTheme,
    viewMode,
    toggleViewMode,
    textLocale,
    parseSillyTavernJson,
    switchRoom,
    renameRoom,
    removeRoom,
    isLoading,
    isHydrating,
    error,
    clearError,
  } = useChatManager();

  const {
    settings: readerSettings,
    setFontPreset,
    setFontSize,
    loadCustomFont,
  } = useReaderSettings();

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => clearError(), 8000);
    return () => window.clearTimeout(timer);
  }, [error, clearError]);

  const autoSync = useDriveAutoSync(rooms, isHydrating);

  // Ctrl/Cmd+F 開啟站內搜尋（虛擬捲動下瀏覽器原生搜尋找不到未渲染的內容）
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f" && messages.length > 0) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [messages.length]);

  const queueFile = (file: File) => {
    setPendingFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      queueFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      queueFile(e.target.files[0]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleImportConfirm = (locale: TextLocale, mode: ImportMode) => {
    if (pendingFile) {
      parseSillyTavernJson(pendingFile, locale, mode);
    }
    setPendingFile(null);
  };

  const handleImportCancel = () => {
    setPendingFile(null);
  };

  const today = () => new Date().toISOString().slice(0, 10);

  const handleExport = () => {
    if (messages.length === 0) return;
    setPendingExport({
      type: "txt",
      defaultName: `${activeRoom?.name ?? "酒館匯出"}_${today()}`,
    });
  };

  const handleExportTavern = () => {
    if (!activeRoom) return;
    setPendingExport({
      type: "tavern",
      defaultName: `${activeRoom.name}_純淨版_${today()}`,
    });
  };

  const handleExportConfirm = (baseName: string) => {
    if (pendingExport?.type === "txt") {
      exportToTxt(messages, baseName);
    } else if (pendingExport?.type === "tavern" && activeRoom) {
      exportCleanedTavernFile(activeRoom, baseName);
    }
    setPendingExport(null);
  };

  const openCloudSync = () => {
    setIsCloudSyncOpen(true);
    setIsSidebarOpen(false);
  };

  const handleSwitchRoom = (roomId: string) => {
    void switchRoom(roomId);
    setIsSidebarOpen(false);
  };

  if (isHydrating) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
          <p className="text-sm text-muted-foreground">正在載入聊天室…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full min-h-screen"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept=".json,.jsonl,.txt,.md,.markdown,application/json,text/plain"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileInput}
      />

      {pendingFile && (
        <ImportModal
          fileName={pendingFile.name}
          defaultLocale={textLocale}
          currentRoomName={activeRoom?.name}
          onConfirm={handleImportConfirm}
          onCancel={handleImportCancel}
        />
      )}

      {isDragging && (
        <div className="absolute inset-0 z-50 bg-background/85 backdrop-blur-md border-4 border-dashed border-accent/40 m-2 sm:m-4 rounded-2xl flex items-center justify-center p-4 animate-fade-in">
          <div className="text-center">
            <h2 className="text-xl sm:text-3xl font-serif text-foreground tracking-wide">
              放開以匯入檔案
            </h2>
            <p className="text-muted-foreground text-sm mt-2">支援 .json / .jsonl / .txt / .md 格式</p>
          </div>
        </div>
      )}

      {isLoading && (
        <div
          className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center"
          role="status"
          aria-live="polite"
          aria-label="載入中"
        >
          <div className="flex flex-col items-center gap-4 px-6">
            <Loader2 className="w-10 h-10 text-accent animate-spin" />
            <p className="text-foreground font-medium">正在解析檔案…</p>
            <p className="text-muted-foreground text-sm text-center max-w-xs">
              大型對話紀錄可能需要數秒，請稍候。
            </p>
          </div>
        </div>
      )}

      {error && (
        <div
          className="
            fixed bottom-4 left-1/2 -translate-x-1/2 z-[100]
            flex items-start gap-3
            max-w-md w-[calc(100%-2rem)]
            px-4 py-3 rounded-xl
            bg-red-50 dark:bg-red-950/90
            border border-red-200 dark:border-red-800
            text-red-800 dark:text-red-200
            shadow-lg animate-toast-in
          "
          role="alert"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm flex-1 leading-relaxed">{error}</p>
          <button
            onClick={clearError}
            className="shrink-0 p-0.5 hover:opacity-70 transition-opacity"
            aria-label="關閉錯誤提示"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <Layout
        onMenuClick={() => setIsSidebarOpen(true)}
        messageCount={messages.length}
        roomName={activeRoom?.name}
      >
        <Sidebar
          rooms={rooms}
          activeRoomId={activeRoomId}
          messages={messages}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onSwitchRoom={handleSwitchRoom}
          onRenameRoom={(id, name) => void renameRoom(id, name)}
          onDeleteRoom={(id) => void removeRoom(id)}
          onImportClick={triggerFileInput}
          onExportTxt={handleExport}
          onExportTavern={handleExportTavern}
          onCloudSync={openCloudSync}
          onSearch={() => {
            setIsSearchOpen(true);
            setIsSidebarOpen(false);
          }}
        />

        <ReadingArea
          messages={messages}
          viewMode={viewMode}
          roomId={activeRoomId}
          roomName={activeRoom?.name}
          onUploadClick={triggerFileInput}
        />

        <Toolbar
          theme={theme}
          toggleTheme={toggleTheme}
          viewMode={viewMode}
          toggleViewMode={toggleViewMode}
          onExport={handleExport}
          onExportTavern={handleExportTavern}
          onCloudSync={openCloudSync}
          onSearch={() => setIsSearchOpen(true)}
          hasMessages={messages.length > 0}
        />
      </Layout>

      <SearchPanel
        messages={messages}
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {autoSync.restorePromptTime !== null && (
        <div
          className="
            fixed bottom-4 left-1/2 -translate-x-1/2 z-[100]
            flex items-start gap-3
            max-w-md w-[calc(100%-2rem)]
            px-4 py-3 rounded-xl
            bg-surface border border-accent/40
            shadow-lg animate-toast-in
          "
          role="alertdialog"
          aria-label="雲端備份較新"
        >
          <CloudDownload className="w-5 h-5 shrink-0 mt-0.5 text-accent" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground leading-relaxed">
              雲端有較新的備份（
              {new Date(autoSync.restorePromptTime).toLocaleString()}
              ），要還原到這台裝置嗎？
            </p>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => void autoSync.confirmRestore()}
                className="px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-medium hover:opacity-90"
              >
                還原雲端版本
              </button>
              <button
                type="button"
                onClick={autoSync.dismissRestore}
                className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted/40"
              >
                保留本機版本
              </button>
            </div>
          </div>
        </div>
      )}

      <CloudSyncPanel isOpen={isCloudSyncOpen} onClose={() => setIsCloudSyncOpen(false)} />

      {pendingExport && (
        <ExportNameModal
          title={pendingExport.type === "txt" ? "匯出為 TXT" : "匯出酒館純淨檔"}
          defaultName={pendingExport.defaultName}
          extHint={pendingExport.type === "txt" ? ".txt" : ".jsonl / .json"}
          onConfirm={handleExportConfirm}
          onCancel={() => setPendingExport(null)}
        />
      )}

      <SettingsPanel
        fontPreset={readerSettings.fontPreset}
        fontSize={readerSettings.fontSize}
        customFontName={readerSettings.customFontName}
        onFontPresetChange={setFontPreset}
        onFontSizeChange={setFontSize}
        onCustomFontLoad={loadCustomFont}
      />
    </div>
  );
}

export default App;
