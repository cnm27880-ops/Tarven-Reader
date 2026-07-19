import { useRef, useState } from "react";
import {
  Cloud,
  CloudDownload,
  CloudUpload,
  FileDown,
  FileUp,
  HelpCircle,
  Loader2,
  X,
} from "lucide-react";
import {
  exportAllData,
  importAllData,
  isBackupPayload,
} from "../lib/chatStorage";
import {
  downloadBackup,
  getAutoSyncEnabled,
  getSavedClientId,
  requestAccessToken,
  saveClientId,
  setAutoSyncEnabled,
  uploadBackup,
} from "../lib/driveSync";
import { useEscapeKey } from "../hooks/useEscapeKey";

interface CloudSyncPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type Status = { kind: "info" | "success" | "error"; text: string } | null;

export function CloudSyncPanel({ isOpen, onClose }: CloudSyncPanelProps) {
  const [clientId, setClientId] = useState(getSavedClientId);
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState<"upload" | "download" | "file" | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [autoSync, setAutoSync] = useState(getAutoSyncEnabled);
  const backupInputRef = useRef<HTMLInputElement>(null);

  useEscapeKey(isOpen, onClose);

  if (!isOpen) return null;

  const commitClientId = () => {
    saveClientId(clientId);
  };

  const finishRestore = () => {
    setStatus({ kind: "success", text: "還原完成，正在重新載入頁面…" });
    window.setTimeout(() => window.location.reload(), 900);
  };

  const handleDriveBackup = async () => {
    commitClientId();
    if (!clientId.trim()) {
      setStatus({ kind: "error", text: "請先填入 Google OAuth Client ID（見下方說明）。" });
      return;
    }

    setBusy("upload");
    setStatus({ kind: "info", text: "正在連線 Google 雲端…" });
    try {
      const token = await requestAccessToken(clientId.trim());
      setStatus({ kind: "info", text: "正在上傳備份…" });
      const payload = await exportAllData();
      await uploadBackup(token, JSON.stringify(payload));
      setStatus({
        kind: "success",
        text: `備份完成！共 ${payload.rooms.length} 個聊天室已存到你的 Google 雲端。`,
      });
    } catch (err) {
      setStatus({
        kind: "error",
        text: err instanceof Error ? err.message : "備份失敗，請稍後再試。",
      });
    } finally {
      setBusy(null);
    }
  };

  const handleDriveRestore = async () => {
    commitClientId();
    if (!clientId.trim()) {
      setStatus({ kind: "error", text: "請先填入 Google OAuth Client ID（見下方說明）。" });
      return;
    }

    setBusy("download");
    setStatus({ kind: "info", text: "正在連線 Google 雲端…" });
    try {
      const token = await requestAccessToken(clientId.trim());
      setStatus({ kind: "info", text: "正在下載備份…" });
      const backup = await downloadBackup(token);
      if (!backup) {
        setStatus({ kind: "error", text: "雲端上還沒有備份，請先在另一台裝置上傳備份。" });
        return;
      }

      const parsed: unknown = JSON.parse(backup.content);
      if (!isBackupPayload(parsed)) {
        setStatus({ kind: "error", text: "雲端備份格式無法辨識。" });
        return;
      }

      await importAllData(parsed);
      finishRestore();
    } catch (err) {
      setStatus({
        kind: "error",
        text: err instanceof Error ? err.message : "還原失敗，請稍後再試。",
      });
    } finally {
      setBusy(null);
    }
  };

  const handleExportFile = async () => {
    setBusy("file");
    try {
      const payload = await exportAllData();
      const blob = new Blob([JSON.stringify(payload)], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `酒館閱讀器備份_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setStatus({
        kind: "success",
        text: "備份檔已下載，可放到任何雲端硬碟（如 Google Drive App）供其他裝置匯入。",
      });
    } catch (err) {
      setStatus({
        kind: "error",
        text: err instanceof Error ? err.message : "匯出備份檔失敗。",
      });
    } finally {
      setBusy(null);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (backupInputRef.current) backupInputRef.current.value = "";
    if (!file) return;

    setBusy("file");
    setStatus({ kind: "info", text: "正在匯入備份檔…" });
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      if (!isBackupPayload(parsed)) {
        setStatus({ kind: "error", text: "這不是酒館閱讀器的備份檔。" });
        return;
      }
      await importAllData(parsed);
      finishRestore();
    } catch (err) {
      setStatus({
        kind: "error",
        text: err instanceof Error ? err.message : "匯入備份檔失敗。",
      });
    } finally {
      setBusy(null);
    }
  };

  const actionBtnClass = `
    flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm
    border-border text-muted-foreground
    hover:border-accent/40 hover:text-foreground hover:bg-muted/30
    disabled:opacity-50 disabled:pointer-events-none
    transition-all duration-200
  `;

  return (
    <div className="fixed inset-0 z-[105] flex items-end sm:items-center justify-center p-4" data-app-modal>
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md rounded-2xl border border-border/80 bg-surface shadow-2xl animate-scale-in overflow-hidden max-h-[85vh] flex flex-col">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-accent/70 to-accent/40" />

        <div className="p-5 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-semibold text-foreground">雲端同步與備份</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              aria-label="關閉"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-5">
            {/* Google Drive 同步 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">
                  Google 雲端同步
                </label>
                <button
                  type="button"
                  onClick={() => setShowHelp((v) => !v)}
                  className="flex items-center gap-1 text-xs text-accent hover:opacity-80"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  如何設定？
                </button>
              </div>

              {showHelp && (
                <div className="mb-3 p-3 rounded-xl bg-muted/30 border border-border/40 text-xs text-muted-foreground leading-relaxed space-y-1.5">
                  <p>雲端同步需要一個免費的 Google OAuth Client ID（一次性設定）：</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>
                      前往 <span className="text-foreground">console.cloud.google.com</span>{" "}
                      建立專案，啟用「Google Drive API」。
                    </li>
                    <li>
                      在「憑證」建立「OAuth 用戶端 ID」（類型：網頁應用程式），
                      並把本網站網址加入「已授權的 JavaScript 來源」。
                    </li>
                    <li>
                      <span className="text-foreground font-medium">重要：</span>
                      在「OAuth 同意畫面」→「目標對象／測試使用者」把
                      <span className="text-foreground">自己的 Gmail</span> 加入測試使用者名單，
                      否則授權時會出現「已封鎖存取權：403 access_denied」。
                    </li>
                    <li>把產生的 Client ID 貼到下方欄位即可。</li>
                  </ol>
                  <p>
                    看到「未完成 Google 驗證程序 / 403 access_denied」＝你的帳號還沒在
                    測試使用者名單裡，回到同意畫面設定加入即可，不需要真的送 Google 驗證。
                  </p>
                  <p>
                    備份只會存在你自己 Google Drive 的應用程式專屬空間，
                    網站與其他人都看不到你雲端裡的其他檔案。
                  </p>
                </div>
              )}

              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                onBlur={commitClientId}
                placeholder="貼上 Google OAuth Client ID（xxx.apps.googleusercontent.com）"
                className="
                  w-full px-3 py-2.5 mb-2.5 rounded-xl border border-border bg-background
                  text-sm text-foreground placeholder:text-muted-foreground/60
                  focus:outline-none focus:border-accent/60
                "
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDriveBackup}
                  disabled={busy !== null}
                  className={actionBtnClass}
                >
                  {busy === "upload" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CloudUpload className="w-4 h-4" />
                  )}
                  備份到雲端
                </button>
                <button
                  type="button"
                  onClick={handleDriveRestore}
                  disabled={busy !== null}
                  className={actionBtnClass}
                >
                  {busy === "download" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CloudDownload className="w-4 h-4" />
                  )}
                  從雲端還原
                </button>
              </div>

              <label className="flex items-start gap-2.5 mt-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => {
                    setAutoSync(e.target.checked);
                    setAutoSyncEnabled(e.target.checked);
                    setStatus({
                      kind: "info",
                      text: e.target.checked
                        ? "已開啟自動同步，下次進入網站時生效。"
                        : "已關閉自動同步。",
                    });
                  }}
                  className="mt-0.5 accent-accent"
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  <span className="text-foreground font-medium">自動同步（實驗性）</span>
                  ：每次開啟網站時自動比對雲端備份——雲端較新會詢問是否還原，
                  本機較新則自動上傳，之後每 10 分鐘背景備份一次。
                  開啟網站時瀏覽器可能會短暫顯示 Google 授權視窗。
                </span>
              </label>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px bg-border/60 flex-1" />
              <span className="text-[11px] text-muted-foreground">或使用本機備份檔</span>
              <div className="h-px bg-border/60 flex-1" />
            </div>

            {/* 本機備份檔 */}
            <div>
              <input
                ref={backupInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleImportFile}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleExportFile}
                  disabled={busy !== null}
                  className={actionBtnClass}
                >
                  {busy === "file" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileDown className="w-4 h-4" />
                  )}
                  匯出備份檔
                </button>
                <button
                  type="button"
                  onClick={() => backupInputRef.current?.click()}
                  disabled={busy !== null}
                  className={actionBtnClass}
                >
                  <FileUp className="w-4 h-4" />
                  匯入備份檔
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                備份檔包含所有聊天室與原始檔內容。不想設定 Google API 的話，
                可以手動把備份檔放進任何雲端硬碟，再到其他裝置匯入。
              </p>
            </div>

            {status && (
              <p
                className={`text-xs leading-relaxed p-2.5 rounded-lg border ${
                  status.kind === "error"
                    ? "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20"
                    : status.kind === "success"
                      ? "text-green-700 dark:text-green-400 bg-green-500/10 border-green-500/20"
                      : "text-muted-foreground bg-muted/30 border-border/40"
                }`}
                role="status"
              >
                {status.text}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
