import type { ChatMessage, SillyTavernMessage } from "../types/chat";
import type { TextLocale } from "./chinese";
import { convertText } from "./chinese";

export const CHAPTER_SIZE = 50;

const STRIP_TAGS = [
  "thought",
  "thinking",
  "think_fox~",
  "recall",
  "supplement",
  "yorozuya_status",
  "Item",
] as const;

function stripBetweenMarkers(text: string, start: string, end: string): string {
  let result = "";
  let pos = 0;

  while (pos < text.length) {
    const startIdx = text.indexOf(start, pos);
    if (startIdx === -1) {
      result += text.slice(pos);
      break;
    }

    result += text.slice(pos, startIdx);
    const endIdx = text.indexOf(end, startIdx + start.length);
    if (endIdx === -1) {
      result += text.slice(startIdx);
      break;
    }

    pos = endIdx + end.length;
  }

  return result;
}

function stripPairedTag(text: string, tag: string): string {
  const tagLower = tag.toLowerCase();
  const closeLower = `</${tagLower}>`;
  let out = "";
  let pos = 0;
  const lower = text.toLowerCase();

  while (pos < text.length) {
    const openIdx = lower.indexOf(`<${tagLower}`, pos);
    if (openIdx === -1) {
      out += text.slice(pos);
      break;
    }

    out += text.slice(pos, openIdx);
    const openEnd = text.indexOf(">", openIdx);
    if (openEnd === -1) {
      out += text.slice(openIdx);
      break;
    }

    const closeIdx = lower.indexOf(closeLower, openEnd + 1);
    if (closeIdx === -1) {
      out += text.slice(openIdx);
      break;
    }

    pos = closeIdx + closeLower.length;
  }

  return out;
}

/** Extract inner text from paired tags like <content> or <本轮用户输入>. */
function extractPairedTagBlocks(text: string, tag: string): string | null {
  const parts: string[] = [];
  const tagLower = tag.toLowerCase();
  const openNeedle = `<${tagLower}`;
  const closeTag = `</${tag}>`;
  const closeLower = closeTag.toLowerCase();
  let pos = 0;
  const lower = text.toLowerCase();

  while (pos < text.length) {
    const openIdx = lower.indexOf(openNeedle, pos);
    if (openIdx === -1) break;

    const openEnd = text.indexOf(">", openIdx);
    if (openEnd === -1) break;

    const closeIdx = lower.indexOf(closeLower, openEnd + 1);
    if (closeIdx === -1) break;

    const inner = text.slice(openEnd + 1, closeIdx).trim();
    if (inner) parts.push(inner);

    pos = closeIdx + closeTag.length;
  }

  return parts.length > 0 ? parts.join("\n\n") : null;
}

function extractContentBlocks(text: string): string | null {
  return extractPairedTagBlocks(text, "content");
}

function extractUserInputBlocks(text: string): string | null {
  return extractPairedTagBlocks(text, "本轮用户输入");
}

function stripPluginNoise(text: string): string {
  let cleanText = text;
  for (const tag of STRIP_TAGS) {
    cleanText = stripPairedTag(cleanText, tag);
  }

  cleanText = cleanText.replace(/以下是用户的本轮输入：\s*/g, "");
  cleanText = stripBetweenMarkers(
    cleanText,
    "以下输入的代码为接下来剧情",
    "合理生成接下来的剧情：",
  );

  return cleanText
    .replace(/<StatusPlaceHolderImpl\/>/g, "")
    .replace(/<\/?content>/gi, "")
    .replace(/<\/?本轮用户输入>/gi, "");
}

function finalizeClean(text: string): string {
  return text
    .replace(/^\[STATUS\][^\n]*/gm, "")
    .replace(/\$\$STATUS\$\$\s*[^\n]*/g, "")
    .replace(/<StatusPlaceHolderImpl\/>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Clean a SillyTavern message.
 * - User messages: prefer <本轮用户输入> (memory plugin), else plain text.
 * - AI messages: prefer <content> body, else legacy strip.
 */
export function cleanMessage(rawText: string | undefined, isUser = false): string {
  if (!rawText) return "";

  if (isUser) {
    const userInput = extractUserInputBlocks(rawText);
    if (userInput !== null) {
      return finalizeClean(userInput);
    }

    const content = extractContentBlocks(rawText);
    if (content !== null) {
      return finalizeClean(content);
    }

    return finalizeClean(stripPluginNoise(rawText));
  }

  const content = extractContentBlocks(rawText);
  if (content !== null) {
    return finalizeClean(content);
  }

  return finalizeClean(stripPluginNoise(rawText));
}

export function getDedupeKey(rawMsg: SillyTavernMessage, index: number): string {
  if (rawMsg.id != null && rawMsg.id !== "") {
    return `id:${rawMsg.id}`;
  }
  if (rawMsg.send_date != null && rawMsg.send_date !== "") {
    return `date:${rawMsg.send_date}`;
  }
  return `idx:${index}`;
}

export function isUserMessage(rawMsg: SillyTavernMessage): boolean {
  return Boolean(rawMsg.is_user);
}

export function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  if (trimmed.length <= 2) return trimmed;
  return trimmed.slice(0, 2);
}

export function exportToTxt(messages: ChatMessage[]) {
  if (messages.length === 0) return;

  const content = messages
    .map((msg) => `${msg.name}:\n${msg.mes}`)
    .join("\n\n────────────────────────────────\n\n");

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `酒館匯出_${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function scrollToChapter(chapterIndex: number) {
  const el = document.getElementById(`chapter-${chapterIndex}`);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export function scrollToMessage(messageIndex: number) {
  const el = document.getElementById(`message-${messageIndex}`);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export function applyLocaleToMessage(
  name: string,
  mes: string,
  locale: TextLocale,
): { name: string; mes: string } {
  return {
    name: convertText(name, locale),
    mes: convertText(mes, locale),
  };
}
