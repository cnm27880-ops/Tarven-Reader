import { useState, useRef, useEffect } from "react";
import { AlertCircle, Loader2, X } from "lucide-react";
import { Layout } from "./components/Layout";
import { Sidebar } from "./components/Sidebar";
import { ReadingArea } from "./components/ReadingArea";
import { Toolbar } from "./components/Toolbar";
import { ImportModal } from "./components/ImportModal";
import { useChatManager } from "./hooks/useChatManager";
import type { ImportMode } from "./hooks/useChatManager";
import { useReaderSettings } from "./hooks/useReaderSettings";
import type { TextLocale } from "./lib/chinese";
import { exportToTxt } from "./lib/utils";
import { SettingsPanel } from "./components/SettingsPanel";
import "./index.css";

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
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

  const handleExport = () => {
    exportToTxt(messages);
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
        accept=".json,.jsonl,application/json"
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
            <p className="text-muted-foreground text-sm mt-2">支援 .json / .jsonl 格式</p>
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
        />

        <ReadingArea
          messages={messages}
          viewMode={viewMode}
          roomName={activeRoom?.name}
          onUploadClick={triggerFileInput}
        />

        <Toolbar
          theme={theme}
          toggleTheme={toggleTheme}
          viewMode={viewMode}
          toggleViewMode={toggleViewMode}
          onExport={handleExport}
          hasMessages={messages.length > 0}
        />
      </Layout>

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
