import { Converter } from "opencc-js";

export type TextLocale = "zh-TW" | "zh-CN";

let toTraditional: ((s: string) => string) | null = null;
let toSimplified: ((s: string) => string) | null = null;

function getConverters() {
  if (!toTraditional) {
    toTraditional = Converter({ from: "cn", to: "tw" });
    toSimplified = Converter({ from: "tw", to: "cn" });
  }
  return { toTraditional: toTraditional!, toSimplified: toSimplified! };
}

export function convertText(text: string, locale: TextLocale): string {
  if (!text) return text;
  const { toTraditional, toSimplified } = getConverters();
  return locale === "zh-TW" ? toTraditional(text) : toSimplified(text);
}

export const LOCALE_LABELS: Record<TextLocale, string> = {
  "zh-TW": "繁體中文",
  "zh-CN": "簡體中文",
};
