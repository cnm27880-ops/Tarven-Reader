import { useState } from "react";
import { FileText, X } from "lucide-react";
import type { TextLocale } from "../lib/chinese";
import { LOCALE_LABELS } from "../lib/chinese";
import type { ImportMode } from "../hooks/useChatManager";

interface ImportModalProps {
  fileName: string;
  defaultLocale: TextLocale;
  currentRoomName?: string | null;
  onConfirm: (locale: TextLocale, mode: ImportMode) => void;
  onCancel: () => void;
}

export function ImportModal({
  fileName,
  defaultLocale,
  currentRoomName,
  onConfirm,
  onCancel,
}: ImportModalProps) {
  const [locale, setLocale] = useState<TextLocale>(defaultLocale);
  const [mode, setMode] = useState<ImportMode>("new");
  const canAppend = Boolean(currentRoomName);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4" data-app-modal
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />

      <div className="relative w-full max-w-md rounded-2xl border border-border/80 bg-surface shadow-2xl animate-scale-in overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-accent/70 to-accent/40" />

        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-accent" />
              </div>
              <div className="min-w-0">
                <h2
                  id="import-modal-title"
                  className="text-lg font-semibold text-foreground"
                >
                  匯入對話
                </h2>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {fileName}
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              aria-label="關閉"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
            選擇文字格式與匯入方式。
          </p>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {(["zh-TW", "zh-CN"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setLocale(option)}
                className={`
                  relative px-3 py-2.5 rounded-xl border text-sm font-medium
                  transition-all duration-200
                  ${
                    locale === option
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-muted/20 text-muted-foreground hover:border-accent/40"
                  }
                `}
              >
                {LOCALE_LABELS[option]}
              </button>
            ))}
          </div>

          <div className="space-y-2 mb-6">
            <button
              type="button"
              onClick={() => setMode("new")}
              className={`
                w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-all
                ${
                  mode === "new"
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-muted-foreground hover:bg-muted/30"
                }
              `}
            >
              <span className="font-medium">建立新聊天室</span>
              <span className="block text-xs mt-0.5 opacity-80">以檔名建立獨立聊天室</span>
            </button>
            {canAppend && (
              <button
                type="button"
                onClick={() => setMode("append")}
                className={`
                  w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-all
                  ${
                    mode === "append"
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border text-muted-foreground hover:bg-muted/30"
                  }
                `}
              >
                <span className="font-medium">追加至目前聊天室</span>
                <span className="block text-xs mt-0.5 opacity-80 truncate">
                  「{currentRoomName}」
                </span>
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted/40 transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => onConfirm(locale, mode)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
            >
              開始匯入
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
