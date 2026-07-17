import type { SillyTavernMessage } from "../types/chat";

/**
 * 純文字／Markdown 小說匯入：
 * - 偵測章節標題（「第X章」等或 Markdown # 標題）作為分段依據與訊息名稱
 * - 一般段落累積到約 CHUNK_TARGET 字就切成一則訊息，避免單則過長
 */

const CHUNK_TARGET = 1200;

const CHAPTER_HEADING =
  /^(?:第\s*[0-9０-９一二三四五六七八九十百千零兩]+\s*[章回節卷部集话話]|(?:章节|章節|楔子|序章|序幕|尾声|尾聲|番外|终章|終章|后记|後記)|#{1,3}\s+\S)/;

export function isTextNovelFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith(".txt") || lower.endsWith(".md") || lower.endsWith(".markdown");
}

function stripMarkdownHeading(line: string): string {
  return line.replace(/^#{1,6}\s+/, "").trim();
}

export function parseTextNovel(content: string, fileName: string): SillyTavernMessage[] {
  const fallbackName = fileName.replace(/\.(txt|md|markdown)$/i, "").trim() || "正文";
  const lines = content.replace(/\r\n?/g, "\n").split("\n");

  const messages: SillyTavernMessage[] = [];
  let currentName = fallbackName;
  let buffer: string[] = [];
  let bufferLength = 0;

  const flush = () => {
    const text = buffer.join("\n").trim();
    if (text) {
      messages.push({
        name: currentName,
        mes: text,
        is_user: false,
        id: `txt-${messages.length}`,
      });
    }
    buffer = [];
    bufferLength = 0;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (trimmed && CHAPTER_HEADING.test(trimmed)) {
      flush();
      currentName = stripMarkdownHeading(trimmed).slice(0, 40) || fallbackName;
      continue;
    }

    buffer.push(line);
    bufferLength += line.length;

    // 段落結尾（空行）且已累積足夠字數才切段，避免拆散段落。
    if (!trimmed && bufferLength >= CHUNK_TARGET) {
      flush();
    }
  }
  flush();

  return messages;
}
