import { Fragment } from "react";

interface MessageContentProps {
  text: string;
  className?: string;
}

/**
 * Renders message text with **inner monologue** styled distinctly.
 * Preserves whitespace / line breaks via parent `whitespace-pre-wrap`.
 */
export function MessageContent({ text, className }: MessageContentProps) {
  const parts = splitInnerThoughts(text);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.type === "thought" ? (
          <span key={i} className="inner-thought">
            {part.value}
          </span>
        ) : (
          <Fragment key={i}>{part.value}</Fragment>
        ),
      )}
    </span>
  );
}

type TextPart = { type: "plain" | "thought"; value: string };

function splitInnerThoughts(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let pos = 0;

  while (pos < text.length) {
    const open = text.indexOf("**", pos);
    if (open === -1) {
      parts.push({ type: "plain", value: text.slice(pos) });
      break;
    }

    if (open > pos) {
      parts.push({ type: "plain", value: text.slice(pos, open) });
    }

    const close = text.indexOf("**", open + 2);
    if (close === -1) {
      parts.push({ type: "plain", value: text.slice(open) });
      break;
    }

    const inner = text.slice(open + 2, close);
    if (inner) {
      parts.push({ type: "thought", value: inner });
    }

    pos = close + 2;
  }

  return parts.length > 0 ? parts : [{ type: "plain", value: text }];
}
