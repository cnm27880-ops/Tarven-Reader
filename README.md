# 酒館閱讀器（Tarven Reader）

將 SillyTavern 匯出的 `.json` / `.jsonl` 對話紀錄轉成舒適的小說閱讀體驗。

## 功能

- **自動擷取正文**：清除 `<thinking>`、`<bbs_start>`、狀態欄等插件雜訊，只保留 `<content>` 正文；支援記憶插件的 `<本轮用户输入>`。
- **酒館純淨檔匯出**：把匯入的酒館檔案清洗後重新匯出成 `.jsonl` / `.json`（正文以 `<content>` 包裹、保留原始結構與標頭），可直接放回 SillyTavern 使用。
- **章節導覽**：側邊欄目錄以每 50 層為一章；右側跳轉軌道只顯示目前章節的樓層，並可上下切換章節。
- **文字樣式**：`**內心話**` 顯示為強調色，`*動作描述*` 顯示為淡灰色。
- **多聊天室管理**：IndexedDB 本機儲存、繁簡轉換、氣泡／經典雙閱讀模式、自訂字型與字級。
- **閱讀進度記憶**：每個聊天室記住上次讀到的樓層，重開或切換裝置還原後自動跳回。
- **效能**：訊息列表虛擬捲動（數千層也順暢）、opencc 繁簡字典延遲載入、字型非同步載入。
- **PWA**：可安裝到手機／桌面，支援離線閱讀（含字型快取）。
- **匯出檔名自訂**：TXT 與純淨檔匯出前可自訂檔案名稱。
- **雲端同步與備份**：
  - 一鍵匯出／匯入本機備份檔（含所有聊天室與原始檔）。
  - 可選的 Google 雲端同步：備份存放在你自己 Google Drive 的應用程式專屬空間（appDataFolder），在不同裝置間還原閱讀紀錄。

## Google 雲端同步設定（一次性）

純前端網站無法內建 API 密鑰，需要自行建立免費的 OAuth Client ID：

1. 前往 [Google Cloud Console](https://console.cloud.google.com/) 建立專案，並在「API 和服務」中啟用 **Google Drive API**。
2. 設定「OAuth 同意畫面」（外部、測試模式即可，將自己的 Google 帳號加入測試使用者）。
3. 在「憑證」建立 **OAuth 用戶端 ID**（應用程式類型：網頁應用程式），並將本網站的網址（例如 `https://<你的帳號>.github.io`）加入「已授權的 JavaScript 來源」。
4. 開啟網站右側工具列的「雲端同步」，貼上產生的 Client ID 即可使用。

也可以在建置時以環境變數 `VITE_GOOGLE_CLIENT_ID` 提供預設值。

備份範圍為 Drive 的 `drive.appdata` scope——網站只能存取自己建立的備份檔，看不到你雲端裡的其他檔案。

## 開發

```bash
npm install
npm run dev     # 開發伺服器
npm run build   # 型別檢查 + 產出 dist/
npm run lint    # oxlint
```

技術棧：React 19 + TypeScript + Vite + Tailwind CSS 4，儲存使用 IndexedDB。
