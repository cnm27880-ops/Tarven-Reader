import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatRoom } from "../lib/chatStorage";
import { exportAllData, importAllData, isBackupPayload } from "../lib/chatStorage";
import type { AutoSyncState } from "../lib/driveSync";
import {
  downloadBackup,
  getAutoSyncEnabled,
  getAutoSyncState,
  getCloudBackupTime,
  getSavedClientId,
  requestAccessToken,
  setAutoSyncState,
  uploadBackup,
} from "../lib/driveSync";

const AUTO_BACKUP_INTERVAL_MS = 10 * 60 * 1000;
/** 雲端比本機新超過這個幅度才提示還原，避免時鐘誤差誤判。 */
const RESTORE_MARGIN_MS = 60 * 1000;

export type AutoSyncStatus = "idle" | "syncing" | "synced" | "error";

/**
 * 雲端自動同步（實驗性）：
 * - 啟動時比對雲端備份時間，雲端較新→提示還原，本機較新→自動上傳
 * - 之後每 10 分鐘檢查本機是否有變更，有就自動備份
 * 授權失敗（例如瀏覽器擋住授權視窗）時安靜退出，不打擾閱讀。
 */
export function useDriveAutoSync(rooms: ChatRoom[], isHydrating: boolean) {
  const [restorePromptTime, setRestorePromptTime] = useState<number | null>(null);
  const [status, setStatus] = useState<AutoSyncStatus>("idle");
  const [lastSync, setLastSync] = useState<AutoSyncState | null>(getAutoSyncState);

  const tokenRef = useRef<string | null>(null);
  const startedRef = useRef(false);
  const lastUploadedAtRef = useRef(0);
  const roomsRef = useRef(rooms);
  roomsRef.current = rooms;

  const latestLocalChange = () =>
    roomsRef.current.reduce((max, room) => Math.max(max, room.updatedAt), 0);

  const recordSync = useCallback((outcome: AutoSyncState["outcome"], message?: string) => {
    const state: AutoSyncState = { time: Date.now(), outcome, message };
    setAutoSyncState(state);
    setLastSync(state);
  }, []);

  const uploadNow = useCallback(async () => {
    const token = tokenRef.current;
    if (!token || roomsRef.current.length === 0) return;

    const payload = await exportAllData();
    await uploadBackup(token, JSON.stringify(payload));
    lastUploadedAtRef.current = latestLocalChange();
    recordSync("synced");
  }, [recordSync]);

  useEffect(() => {
    if (isHydrating || startedRef.current) return;
    if (!getAutoSyncEnabled() || !getSavedClientId()) return;
    startedRef.current = true;

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    (async () => {
      try {
        setStatus("syncing");
        const token = await requestAccessToken(getSavedClientId());
        if (cancelled) return;
        tokenRef.current = token;

        const cloudTime = await getCloudBackupTime(token);
        if (cancelled) return;

        const localTime = latestLocalChange();

        if (cloudTime && cloudTime > localTime + RESTORE_MARGIN_MS) {
          setRestorePromptTime(cloudTime);
          setStatus("idle");
        } else {
          if (localTime > 0) await uploadNow();
          setStatus("synced");
        }

        intervalId = setInterval(() => {
          if (latestLocalChange() > lastUploadedAtRef.current) {
            uploadNow().catch((err) => {
              /* token 可能過期，等下次手動同步 */
              recordSync("error", err instanceof Error ? err.message : "背景備份失敗");
            });
          }
        }, AUTO_BACKUP_INTERVAL_MS);
      } catch (err) {
        console.warn("雲端自動同步未啟動：", err);
        if (!cancelled) {
          setStatus("error");
          recordSync("error", err instanceof Error ? err.message : "自動同步未能啟動");
        }
      }
    })();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [isHydrating, uploadNow, recordSync]);

  const confirmRestore = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return;

    setStatus("syncing");
    try {
      const backup = await downloadBackup(token);
      if (!backup) throw new Error("雲端備份不存在");

      const parsed: unknown = JSON.parse(backup.content);
      if (!isBackupPayload(parsed)) throw new Error("備份格式無法辨識");

      await importAllData(parsed);
      window.location.reload();
    } catch (err) {
      console.warn("自動還原失敗：", err);
      setStatus("error");
      setRestorePromptTime(null);
    }
  }, []);

  const dismissRestore = useCallback(() => {
    setRestorePromptTime(null);
    // 使用者選擇保留本機版本 → 把本機上傳成最新
    uploadNow()
      .then(() => setStatus("synced"))
      .catch((err) => {
        setStatus("error");
        recordSync("error", err instanceof Error ? err.message : "背景備份失敗");
      });
  }, [uploadNow, recordSync]);

  return { restorePromptTime, status, lastSync, confirmRestore, dismissRestore };
}
