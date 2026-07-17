import { Fragment } from "react";

interface MessageContentProps {
  text: string;
  className?: string;
}

/**
 * Renders message text with lightweight markup:
 * - `**inner monologue**` styled as inner-thought
 * - `*action / aside*` styled as soft grey
 * Preserves whitespace / line breaks via parent `whitespace-pre-wrap`.
 */
export function MessageContent({ text, className }: MessageContentProps) {
  const parts = splitStyledSegments(text);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.type === "thought" ? (
          <span key={i} className="inner-thought">
            {part.value}
          </span>
        ) : part.type === "aside" ? (
          <span key={i} className="soft-aside">
            {part.value}
          </span>
        ) : (
          <Fragment key={i}>{part.value}</Fragment>
        ),
      )}
    </span>
  );
}

type TextPart = { type: "plain" | "thought" | "aside"; value: string };

function splitStyledSegments(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let pos = 0;

  while (pos < text.length) {
    const open = text.indexOf("*", pos);
    if (open === -1) {
      parts.push({ type: "plain", value: text.slice(pos) });
      break;
    }

    if (open > pos) {
      parts.push({ type: "plain", value: text.slice(pos, open) });
    }

    if (text[open + 1] === "*") {
      // **內心話**
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
    } else {
      // *動作 / 旁白*
      const close = text.indexOf("*", open + 1);
      if (close === -1) {
        parts.push({ type: "plain", value: text.slice(open) });
        break;
      }

      const inner = text.slice(open + 1, close);
      if (inner) {
        parts.push({ type: "aside", value: inner });
      }
      pos = close + 1;
    }
  }

  return parts.length > 0 ? parts : [{ type: "plain", value: text }];
}
