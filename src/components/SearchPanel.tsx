import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { ChatMessage } from "../types/chat";
import { CHAPTER_SIZE } from "../lib/utils";
import { jumpToMessage } from "../lib/readerNav";

interface SearchPanelProps {
  messages: ChatMessage[];
  isOpen: boolean;
  onClose: () => void;
}

interface SearchHit {
  index: number;
  before: string;
  match: string;
  after: string;
}

const MAX_RESULTS = 100;
const SNIPPET_RADIUS = 24;

function findMatches(messages: ChatMessage[], query: string): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];

  const hits: SearchHit[] = [];
  for (let i = 0; i < messages.length && hits.length < MAX_RESULTS; i++) {
    const text = messages[i].mes;
    const pos = text.toLowerCase().indexOf(q);
    if (pos === -1) continue;

    hits.push({
      index: i,
      before:
        (pos > SNIPPET_RADIUS ? "…" : "") +
        text.slice(Math.max(0, pos - SNIPPET_RADIUS), pos).replace(/\n/g, " "),
      match: text.slice(pos, pos + q.length).replace(/\n/g, " "),
      after:
        text.slice(pos + q.length, pos + q.length + SNIPPET_RADIUS * 2).replace(/\n/g, " ") +
        (pos + q.length + SNIPPET_RADIUS * 2 < text.length ? "…" : ""),
    });
  }
  return hits;
}

export function SearchPanel({ messages, isOpen, onClose }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 200);
    return () => clearTimeout(timer);
  }, [query]);

  const hits = useMemo(() => findMatches(messages, debounced), [messages, debounced]);

  useEffect(() => {
    setSelected(0);
  }, [debounced]);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery("");
      setDebounced("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const jumpTo = (index: number) => {
    jumpToMessage(index);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((prev) => Math.min(prev + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && hits[selected]) {
      jumpTo(hits[selected].index);
    }
  };

  return (
    <div className="fixed inset-0 z-[105] flex items-start justify-center p-4 pt-[12vh]" data-app-modal>
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg rounded-2xl border border-border/80 bg-surface shadow-2xl animate-scale-in overflow-hidden flex flex-col max-h-[70vh]">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜尋正文內容…"
            className="flex-1 min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
          />
          {debounced && (
            <span className="text-xs text-muted-foreground tabular-nums shrink-0">
              {hits.length >= MAX_RESULTS ? `${MAX_RESULTS}+` : hits.length} 筆
            </span>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
            aria-label="關閉搜尋"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <ul ref={listRef} className="flex-1 overflow-y-auto p-2 min-h-0">
          {debounced && hits.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              找不到「{debounced}」
            </li>
          )}
          {hits.map((hit, i) => (
            <li key={hit.index}>
              <button
                type="button"
                onClick={() => jumpTo(hit.index)}
                onMouseEnter={() => setSelected(i)}
                className={`
                  w-full text-left px-3 py-2.5 rounded-xl transition-colors
                  ${i === selected ? "bg-accent/10" : "hover:bg-muted/40"}
                `}
              >
                <span className="block text-[11px] text-muted-foreground mb-0.5 tabular-nums">
                  第 {hit.index + 1} 層 · 第 {Math.floor(hit.index / CHAPTER_SIZE) + 1} 章 ·{" "}
                  {messages[hit.index].name}
                </span>
                <span className="block text-sm text-foreground/90 leading-relaxed break-all">
                  {hit.before}
                  <mark className="bg-accent/25 text-accent rounded px-0.5">{hit.match}</mark>
                  {hit.after}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="px-4 py-2 border-t border-border/50 text-[10px] text-muted-foreground flex gap-3">
          <span>↑↓ 選擇</span>
          <span>Enter 跳轉</span>
          <span>Esc 關閉</span>
        </div>
      </div>
    </div>
  );
}
