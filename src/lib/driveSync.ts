/**
 * Google 雲端同步（Drive appDataFolder）。
 *
 * 使用 Google Identity Services 取得授權，將完整備份（所有聊天室 +
 * 排序設定）存到使用者 Google Drive 的應用程式專屬資料夾。
 * 需要使用者自行建立 OAuth Client ID（純前端網站無法內建密鑰），
 * 設定步驟見 README 或同步面板中的說明。
 */

const GIS_SRC = "https://accounts.google.com/gsi/client";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const BACKUP_FILE_NAME = "tarven-reader-backup.json";
const CLIENT_ID_STORAGE_KEY = "googleDriveClientId";

interface TokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface TokenClient {
  requestAccessToken: (options?: { prompt?: string }) => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
            error_callback?: (error: { type?: string; message?: string }) => void;
          }) => TokenClient;
        };
      };
    };
  }
}

export function getSavedClientId(): string {
  return (
    localStorage.getItem(CLIENT_ID_STORAGE_KEY) ??
    (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ??
    ""
  );
}

export function saveClientId(clientId: string): void {
  const trimmed = clientId.trim();
  if (trimmed) {
    localStorage.setItem(CLIENT_ID_STORAGE_KEY, trimmed);
  } else {
    localStorage.removeItem(CLIENT_ID_STORAGE_KEY);
  }
}

let gisLoading: Promise<void> | null = null;

function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisLoading) return gisLoading;

  gisLoading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gisLoading = null;
      reject(new Error("無法載入 Google 登入元件，請檢查網路連線。"));
    };
    document.head.appendChild(script);
  });

  return gisLoading;
}

export async function requestAccessToken(clientId: string): Promise<string> {
  await loadGis();

  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) {
    throw new Error("Google 登入元件初始化失敗，請重新整理頁面再試。");
  }

  return new Promise<string>((resolve, reject) => {
    const tokenClient = oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (response) => {
        if (response.access_token) {
          resolve(response.access_token);
        } else {
          reject(
            new Error(response.error_description || response.error || "Google 授權失敗。"),
          );
        }
      },
      error_callback: (error) => {
        reject(new Error(error.message || "Google 授權視窗被關閉或發生錯誤。"));
      },
    });

    tokenClient.requestAccessToken();
  });
}

async function driveFetch(token: string, url: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      detail = body.error?.message ?? "";
    } catch {
      /* ignore */
    }
    throw new Error(`Google Drive 請求失敗（${response.status}）${detail ? `：${detail}` : ""}`);
  }

  return response;
}

async function findBackupFile(
  token: string,
): Promise<{ id: string; modifiedTime?: string } | null> {
  const query = encodeURIComponent(`name='${BACKUP_FILE_NAME}' and trashed=false`);
  const response = await driveFetch(
    token,
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&fields=files(id,modifiedTime)&pageSize=1`,
  );
  const body = (await response.json()) as {
    files?: { id: string; modifiedTime?: string }[];
  };
  return body.files?.[0] ?? null;
}

/** 上傳備份；已存在則覆蓋，回傳雲端檔案更新時間。 */
export async function uploadBackup(token: string, json: string): Promise<string | undefined> {
  const existing = await findBackupFile(token);

  const metadata = existing
    ? {}
    : { name: BACKUP_FILE_NAME, parents: ["appDataFolder"], mimeType: "application/json" };

  const boundary = `tarven-${Date.now().toString(36)}`;
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    json,
    `--${boundary}--`,
  ].join("\r\n");

  const url = existing
    ? `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=multipart&fields=modifiedTime`
    : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=modifiedTime";

  const response = await driveFetch(token, url, {
    method: existing ? "PATCH" : "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });

  const result = (await response.json()) as { modifiedTime?: string };
  return result.modifiedTime;
}

/** 下載備份內容；雲端沒有備份時回傳 null。 */
export async function downloadBackup(
  token: string,
): Promise<{ content: string; modifiedTime?: string } | null> {
  const existing = await findBackupFile(token);
  if (!existing) return null;

  const response = await driveFetch(
    token,
    `https://www.googleapis.com/drive/v3/files/${existing.id}?alt=media`,
  );
  return { content: await response.text(), modifiedTime: existing.modifiedTime };
}
