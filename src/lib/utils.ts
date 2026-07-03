import type { ChatMessage } from "../types/chat";

export function cleanMessage(rawText: string | undefined): string {
  if (!rawText) return "";
  let cleanText = rawText
    .replace(/<(thought|thinking|think_fox~)>[\s\S]*?<\/\1>/gi, "")
    .replace(/以下是用户的本轮输入：\s*<本轮用户输入>[\s\S]*?<\/本轮用户输入>/g, "")
    .replace(/以下输入的代码为接下来剧情.*?合理生成接下来的剧情：/g, "")
    .replace(/<(recall|supplement)>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(yorozuya_status|Item)>[\s\S]*?<\/\1>/gi, "")
    .replace(/$$STATUS$$\s*.*\n?/g, "")
    .replace(/<StatusPlaceHolderImpl\/>/g, "")
    .replace(/<\/?content>/gi, "");
  return cleanText.replace(/\n{3,}/g, "\n\n").trim();
}

export function exportToTxt(messages: ChatMessage[]) {
  if (messages.length === 0) return;

  const content = messages
    .map((msg) => `${msg.name}:\n${msg.mes}`)
    .join("\n\n----------------------------------------\n\n");

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = `sillytavern_export_${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
