import { Fragment } from "react";

interface MessageContentProps {
  text: string;
  className?: string;
  /** 搜尋跳轉後要高亮的字句（大小寫不敏感）。 */
  highlight?: string;
}

/**
 * Renders message text with lightweight markup:
 * - `**inner monologue**` styled as inner-thought
 * - `*action / aside*` styled as soft grey
 * Preserves whitespace / line breaks via parent `whitespace-pre-wrap`.
 */
export function MessageContent({ text, className, highlight }: MessageContentProps) {
  const parts = splitStyledSegments(text);

  const render = (value: string, keyBase: string) =>
    highlight ? renderWithHighlight(value, highlight, keyBase) : value;

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.type === "thought" ? (
          <span key={i} className="inner-thought">
            {render(part.value, `t${i}`)}
          </span>
        ) : part.type === "aside" ? (
          <span key={i} className="soft-aside">
            {render(part.value, `a${i}`)}
          </span>
        ) : (
          <Fragment key={i}>{render(part.value, `p${i}`)}</Fragment>
        ),
      )}
    </span>
  );
}

function renderWithHighlight(value: string, term: string, keyBase: string) {
  const lowerValue = value.toLowerCase();
  const lowerTerm = term.toLowerCase();
  if (!lowerTerm || !lowerValue.includes(lowerTerm)) return value;

  const nodes: React.ReactNode[] = [];
  let pos = 0;
  let k = 0;
  while (pos < value.length) {
    const hit = lowerValue.indexOf(lowerTerm, pos);
    if (hit === -1) {
      nodes.push(value.slice(pos));
      break;
    }
    if (hit > pos) nodes.push(value.slice(pos, hit));
    nodes.push(
      <mark key={`${keyBase}-${k++}`} className="search-flash">
        {value.slice(hit, hit + term.length)}
      </mark>,
    );
    pos = hit + term.length;
  }
  return nodes;
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
