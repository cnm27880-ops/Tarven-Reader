import { useState } from "react";
import { Download, X } from "lucide-react";

interface ExportNameModalProps {
  title: string;
  defaultName: string;
  /** 顯示在輸入框後的副檔名提示，例如 ".txt" 或 ".jsonl / .json"。 */
  extHint: string;
  onConfirm: (baseName: string) => void;
  onCancel: () => void;
}

export function ExportNameModal({
  title,
  defaultName,
  extHint,
  onConfirm,
  onCancel,
}: ExportNameModalProps) {
  const [name, setName] = useState(defaultName);

  const confirm = () => {
    onConfirm(name.trim() || defaultName);
  };

  return (
    <div className="fixed inset-0 z-[105] flex items-end sm:items-center justify-center p-4" data-app-modal>
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />

      <div className="relative w-full max-w-sm rounded-2xl border border-border/80 bg-surface shadow-2xl animate-scale-in overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-accent/70 to-accent/40" />

        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <button
              onClick={onCancel}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              aria-label="關閉"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <label className="text-sm font-medium text-foreground mb-2 block">檔案名稱</label>
          <div className="flex items-center gap-2 mb-4">
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirm();
                if (e.key === "Escape") onCancel();
              }}
              className="
                flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-border bg-background
                text-sm text-foreground
                focus:outline-none focus:border-accent/60
              "
            />
            <span className="text-xs text-muted-foreground shrink-0">{extHint}</span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted/30 transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={confirm}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Download className="w-4 h-4" />
              匯出
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
