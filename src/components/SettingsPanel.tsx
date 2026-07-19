import { useRef, useState } from "react";
import { Check, Upload, X } from "lucide-react";
import type { AccentColor, FontPreset } from "../hooks/useReaderSettings";
import { ACCENT_COLORS, FONT_PRESETS } from "../hooks/useReaderSettings";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { MessageContent } from "./MessageContent";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  fontPreset: FontPreset;
  fontSize: number;
  customFontName: string | null;
  accentColor: AccentColor;
  onFontPresetChange: (preset: FontPreset) => void;
  onFontSizeChange: (size: number) => void;
  onAccentColorChange: (color: AccentColor) => void;
  onCustomFontLoad: (file: File) => Promise<string>;
}

export function SettingsPanel({
  isOpen,
  onClose,
  fontPreset,
  fontSize,
  customFontName,
  accentColor,
  onFontPresetChange,
  onFontSizeChange,
  onAccentColorChange,
  onCustomFontLoad,
}: SettingsPanelProps) {
  const [fontError, setFontError] = useState<string | null>(null);
  const [isLoadingFont, setIsLoadingFont] = useState(false);
  const fontInputRef = useRef<HTMLInputElement>(null);

  useEscapeKey(isOpen, onClose);

  const handleFontFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoadingFont(true);
    setFontError(null);
    try {
      await onCustomFontLoad(file);
      onFontPresetChange("custom");
    } catch (err) {
      setFontError(err instanceof Error ? err.message : "載入字型失敗");
    } finally {
      setIsLoadingFont(false);
      if (fontInputRef.current) fontInputRef.current.value = "";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[105] flex items-end sm:items-center justify-center p-4" data-app-modal>
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
          />

          <div className="relative w-full max-w-sm max-h-[85vh] overflow-y-auto rounded-2xl border border-border/80 bg-surface shadow-2xl animate-scale-in">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-accent/70 to-accent/40" />

            <div className="p-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-foreground">閱讀設定</h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  aria-label="關閉"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2.5 block">
                    字型
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {FONT_PRESETS.filter((p) => p.id !== "custom").map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onFontPresetChange(preset.id)}
                        className={`
                          px-3 py-2.5 rounded-xl border text-sm transition-all duration-200
                          ${
                            fontPreset === preset.id
                              ? "border-accent bg-accent/10 text-accent"
                              : "border-border text-muted-foreground hover:border-accent/30 hover:bg-muted/30"
                          }
                        `}
                        style={{ fontFamily: preset.family }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-3">
                    <input
                      ref={fontInputRef}
                      type="file"
                      accept=".ttf,.otf,.woff,.woff2"
                      className="hidden"
                      onChange={handleFontFile}
                    />
                    <button
                      type="button"
                      disabled={isLoadingFont}
                      onClick={() => fontInputRef.current?.click()}
                      className={`
                        w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm
                        transition-all duration-200
                        ${
                          fontPreset === "custom"
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border text-muted-foreground hover:border-accent/30 hover:bg-muted/30"
                        }
                        disabled:opacity-50
                      `}
                    >
                      <Upload className="w-4 h-4" />
                      {isLoadingFont
                        ? "載入中…"
                        : customFontName
                          ? "更換自訂字型"
                          : "匯入字型檔案"}
                    </button>
                    {customFontName && fontPreset === "custom" && (
                      <p className="text-xs text-muted-foreground mt-1.5 text-center truncate">
                        已載入：{customFontName.replace(/^CustomReader_\d+$/, "自訂字型")}
                      </p>
                    )}
                    {fontError && (
                      <p className="text-xs text-red-500 mt-1.5 text-center">{fontError}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2.5 block">
                    主題色
                  </label>
                  <div className="flex gap-2.5">
                    {ACCENT_COLORS.map((color) => (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => onAccentColorChange(color.id)}
                        className={`
                          w-9 h-9 rounded-full flex items-center justify-center
                          transition-all duration-200 active:scale-90
                          ${
                            accentColor === color.id
                              ? "ring-2 ring-offset-2 ring-offset-surface"
                              : "hover:scale-110"
                          }
                        `}
                        style={{
                          backgroundColor: color.swatch,
                          ...(accentColor === color.id
                            ? ({ "--tw-ring-color": color.swatch } as React.CSSProperties)
                            : {}),
                        }}
                        title={color.label}
                        aria-label={`主題色：${color.label}`}
                      >
                        {accentColor === color.id && <Check className="w-4 h-4 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <label className="text-sm font-medium text-foreground">字級</label>
                    <span className="text-sm text-muted-foreground tabular-nums">{fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={13}
                    max={28}
                    step={1}
                    value={fontSize}
                    onChange={(e) => onFontSizeChange(Number(e.target.value))}
                    className="w-full accent-accent h-1.5 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>小</span>
                    <span>大</span>
                  </div>
                </div>

                <p
                  className="text-muted-foreground leading-relaxed p-3 rounded-xl bg-muted/30 border border-border/40 reader-text"
                >
                  <MessageContent text="預覽文字：**這是內心話的樣式**，*這是星號動作描述的樣式*，一般敘述文字則維持原色。" />
                </p>

                {/* 鍵盤快捷鍵只對有實體鍵盤的裝置有意義，手機版不顯示。 */}
                <div className="hidden lg:block">
                  <label className="text-sm font-medium text-foreground mb-2.5 block">
                    鍵盤快捷鍵
                  </label>
                  <ul className="space-y-2 text-xs text-muted-foreground p-3 rounded-xl bg-muted/30 border border-border/40">
                    {[
                      { label: "翻頁（Shift 反向）", keys: ["空白鍵", "PageDown"] },
                      { label: "切換章節", keys: ["←", "→"] },
                      { label: "跳到開頭／結尾", keys: ["Home", "End"] },
                      { label: "搜尋正文", keys: ["Ctrl/⌘", "F"] },
                    ].map((row) => (
                      <li key={row.label} className="flex items-center justify-between gap-3">
                        <span>{row.label}</span>
                        <span className="flex items-center gap-1 shrink-0">
                          {row.keys.map((key, i) => (
                            <span key={i} className="flex items-center gap-1">
                              {i > 0 && <span className="text-muted-foreground/50">/</span>}
                              <kbd className="px-1.5 py-0.5 rounded border border-border bg-background text-foreground font-mono text-[10px]">
                                {key}
                              </kbd>
                            </span>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
    </div>
  );
}
