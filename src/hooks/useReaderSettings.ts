import { useState, useCallback, useEffect } from "react";

export type FontPreset = "noto-sans" | "noto-serif" | "system" | "custom";

export interface ReaderSettings {
  fontPreset: FontPreset;
  customFontName: string | null;
  fontSize: number;
}

const STORAGE_KEY = "readerSettings";
const CUSTOM_FONT_STORAGE_KEY = "readerCustomFont";

export const FONT_PRESETS: { id: FontPreset; label: string; family: string }[] = [
  { id: "noto-sans", label: "思源黑體", family: '"Noto Sans TC", "Noto Sans", sans-serif' },
  { id: "noto-serif", label: "思源宋體", family: '"Noto Serif TC", "Noto Serif", serif' },
  { id: "system", label: "系統預設", family: 'system-ui, -apple-system, "Segoe UI", sans-serif' },
  { id: "custom", label: "自訂字型", family: "var(--custom-font-family)" },
];

const DEFAULT_SETTINGS: ReaderSettings = {
  fontPreset: "noto-serif",
  customFontName: null,
  fontSize: 17,
};

function loadSettings(): ReaderSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ReaderSettings>;
      return {
        fontPreset: parsed.fontPreset ?? DEFAULT_SETTINGS.fontPreset,
        customFontName: parsed.customFontName ?? null,
        fontSize: parsed.fontSize ?? DEFAULT_SETTINGS.fontSize,
      };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_SETTINGS };
}

function resolveFontFamily(settings: ReaderSettings): string {
  if (settings.fontPreset === "custom" && settings.customFontName) {
    return `"${settings.customFontName}", sans-serif`;
  }
  const preset = FONT_PRESETS.find((p) => p.id === settings.fontPreset);
  return preset?.family ?? FONT_PRESETS[1].family;
}

async function restoreCustomFont(): Promise<string | null> {
  try {
    const data = localStorage.getItem(CUSTOM_FONT_STORAGE_KEY);
    if (!data) return null;

    const { name, base64 } = JSON.parse(data) as { name: string; base64: string };
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const font = new FontFace(name, bytes);
    await font.load();
    (document.fonts as FontFaceSet & { add(face: FontFace): void }).add(font);
    return name;
  } catch {
    return null;
  }
}

function applySettingsToDOM(settings: ReaderSettings) {
  const family = resolveFontFamily(settings);
  document.documentElement.style.setProperty("--reader-font-family", family);
  document.documentElement.style.setProperty("--reader-font-size", `${settings.fontSize}px`);
}

export function useReaderSettings() {
  const [settings, setSettings] = useState<ReaderSettings>(loadSettings);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    restoreCustomFont().then((name) => {
      const current = loadSettings();
      if (name) {
        current.fontPreset = "custom";
        current.customFontName = name;
      }
      setSettings(current);
      applySettingsToDOM(current);
      setIsReady(true);
    });
  }, []);

  const persist = useCallback((next: ReaderSettings) => {
    setSettings(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    applySettingsToDOM(next);
  }, []);

  const setFontPreset = useCallback(
    (preset: FontPreset) => {
      persist({ ...settings, fontPreset: preset });
    },
    [settings, persist],
  );

  const setFontSize = useCallback(
    (size: number) => {
      persist({ ...settings, fontSize: Math.min(28, Math.max(13, size)) });
    },
    [settings, persist],
  );

  const loadCustomFont = useCallback(
    async (file: File) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !["ttf", "otf", "woff", "woff2"].includes(ext)) {
        throw new Error("請上傳 .ttf、.otf、.woff 或 .woff2 字型檔。");
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error("字型檔過大（上限 5 MB），請選擇較小的檔案。");
      }

      const buffer = await file.arrayBuffer();
      const fontName = `CustomReader_${Date.now()}`;
      const font = new FontFace(fontName, buffer);
      await font.load();
      (document.fonts as FontFaceSet & { add(face: FontFace): void }).add(font);

      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);

      localStorage.setItem(
        CUSTOM_FONT_STORAGE_KEY,
        JSON.stringify({ name: fontName, base64 }),
      );

      const next: ReaderSettings = {
        ...settings,
        fontPreset: "custom",
        customFontName: fontName,
      };
      persist(next);
      return fontName;
    },
    [settings, persist],
  );

  return {
    settings,
    isReady,
    setFontPreset,
    setFontSize,
    loadCustomFont,
  };
}
