export type TextLocale = "zh-TW" | "zh-CN";

let toTraditional: ((s: string) => string) | null = null;
let toSimplified: ((s: string) => string) | null = null;
let loading: Promise<void> | null = null;

/**
 * opencc-js 的字典很大，改為動態載入：只在真正需要轉換
 * （匯入檔案）之前呼叫，避免拖慢首次開啟速度。
 */
export function ensureConverters(): Promise<void> {
  if (toTraditional && toSimplified) return Promise.resolve();
  if (loading) return loading;

  loading = import("opencc-js").then(({ Converter }) => {
    toTraditional = Converter({ from: "cn", to: "tw" });
    toSimplified = Converter({ from: "tw", to: "cn" });
  });
  return loading;
}

/** 同步轉換；轉換器尚未載入時原樣返回（呼叫前先 await ensureConverters）。 */
export function convertText(text: string, locale: TextLocale): string {
  if (!text || !toTraditional || !toSimplified) return text;
  return locale === "zh-TW" ? toTraditional(text) : toSimplified(text);
}

export const LOCALE_LABELS: Record<TextLocale, string> = {
  "zh-TW": "繁體中文",
  "zh-CN": "簡體中文",
};
