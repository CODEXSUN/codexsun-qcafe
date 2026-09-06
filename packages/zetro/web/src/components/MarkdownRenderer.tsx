import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
}

type Block =
  | { type: "code"; language: string; content: string }
  | { type: "heading"; level: number; text: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "unordered-list"; items: string[] }
  | { type: "ordered-list"; items: string[] }
  | { type: "blockquote"; text: string }
  | { type: "hr" }
  | { type: "paragraph"; text: string };

export function MarkdownRenderer({ content, isStreaming = false, className = "" }: MarkdownRendererProps) {
  if (!content) return null;

  const blocks = parseMarkdownBlocks(content);

  return (
    <div className={`markdown-body space-y-2.5 text-foreground ${className}`}>
      {blocks.map((block, index) => {
        const isLastBlock = index === blocks.length - 1;

        switch (block.type) {
          case "code":
            return (
              <CodeBlock
                key={index}
                language={block.language}
                content={block.content}
                showCursor={isLastBlock && isStreaming}
              />
            );

          case "heading": {
            const headingClasses = [
              "",
              "text-lg font-bold text-foreground mt-4 mb-2 pb-1 border-b border-border/70",
              "text-base font-bold text-foreground mt-3.5 mb-1.5 pb-0.5 border-b border-border/50",
              "text-sm font-semibold text-foreground mt-3 mb-1",
              "text-xs font-semibold text-foreground mt-2.5 mb-1",
              "text-xs font-semibold text-muted-foreground mt-2 mb-0.5",
              "text-[11px] font-semibold text-muted-foreground mt-2 mb-0.5",
            ][block.level] || "text-sm font-semibold text-foreground";

            const children = (
              <>
                {renderInline(block.text)}
                {isLastBlock && isStreaming && <StreamingCursor />}
              </>
            );

            if (block.level === 1) return <h1 key={index} className={headingClasses}>{children}</h1>;
            if (block.level === 2) return <h2 key={index} className={headingClasses}>{children}</h2>;
            if (block.level === 3) return <h3 key={index} className={headingClasses}>{children}</h3>;
            if (block.level === 4) return <h4 key={index} className={headingClasses}>{children}</h4>;
            if (block.level === 5) return <h5 key={index} className={headingClasses}>{children}</h5>;
            return <h6 key={index} className={headingClasses}>{children}</h6>;
          }

          case "table":
            return (
              <div key={index} className="my-3 overflow-x-auto rounded-xl border border-border bg-card shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/70 text-foreground border-b border-border font-semibold">
                    <tr>
                      {block.headers.map((header, hIdx) => (
                        <th key={hIdx} className="px-3.5 py-2.5 font-semibold text-foreground tracking-tight whitespace-nowrap">
                          {renderInline(header)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {block.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-muted/40 transition-colors even:bg-muted/20">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-3.5 py-2.5 align-top leading-relaxed text-foreground/90">
                            {renderInline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case "unordered-list":
            return (
              <ul key={index} className="my-2.5 pl-6 list-disc space-y-1.5 text-sm leading-relaxed text-foreground/90 marker:text-primary/70">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="pl-0.5">
                    {renderInline(item)}
                    {isLastBlock && isStreaming && itemIdx === block.items.length - 1 && <StreamingCursor />}
                  </li>
                ))}
              </ul>
            );

          case "ordered-list":
            return (
              <ol key={index} className="my-2.5 pl-6 list-decimal space-y-1.5 text-sm leading-relaxed text-foreground/90 marker:text-primary/80 marker:font-semibold">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="pl-0.5">
                    {renderInline(item)}
                    {isLastBlock && isStreaming && itemIdx === block.items.length - 1 && <StreamingCursor />}
                  </li>
                ))}
              </ol>
            );

          case "blockquote":
            return (
              <blockquote key={index} className="my-2.5 border-l-3 border-primary/60 bg-muted/20 px-3.5 py-2 text-sm italic text-muted-foreground rounded-r-lg">
                {renderInline(block.text)}
                {isLastBlock && isStreaming && <StreamingCursor />}
              </blockquote>
            );

          case "hr":
            return <hr key={index} className="my-3.5 border-border/80" />;

          case "paragraph":
          default:
            return (
              <p key={index} className="text-sm leading-7 text-foreground/90 break-words my-1.5">
                {renderInline(block.text)}
                {isLastBlock && isStreaming && <StreamingCursor />}
              </p>
            );
        }
      })}
    </div>
  );
}

function CodeBlock({ language, content, showCursor }: { language: string; content: string; showCursor?: boolean }) {
  const [copied, setCopied] = useState(false);

  function copyCode() {
    void navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-border bg-muted/30 font-mono text-xs shadow-2xs">
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/60 px-3.5 py-1.5 text-[11px] text-muted-foreground">
        <span className="font-semibold text-foreground/80 uppercase tracking-wider">{language || "code"}</span>
        <button
          type="button"
          onClick={copyCode}
          className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer px-1.5 py-0.5 rounded hover:bg-muted"
          title="Copy code to clipboard"
          aria-label="Copy code"
        >
          {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 text-foreground leading-relaxed">
        <code>
          {content}
          {showCursor && <StreamingCursor />}
        </code>
      </pre>
    </div>
  );
}

function StreamingCursor() {
  return <span className="inline-block w-1.5 h-4 ml-1 bg-primary animate-pulse align-middle" aria-hidden="true" />;
}

export function parseMarkdownBlocks(source: string): Block[] {
  const lines = source.replaceAll("\r\n", "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    // Blank line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Fenced Code Block
    if (line.trim().startsWith("```")) {
      const language = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !(lines[i] ?? "").trim().startsWith("```")) {
        codeLines.push(lines[i] ?? "");
        i++;
      }
      if (i < lines.length && (lines[i] ?? "").trim().startsWith("```")) {
        i++;
      }
      blocks.push({ type: "code", language, content: codeLines.join("\n") });
      continue;
    }

    // Horizontal Rule
    if (/^[ \t]*(?:---|\*\*\*|___)[ \t]*$/.test(line)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch && headingMatch[1] && headingMatch[2]) {
      blocks.push({ type: "heading", level: headingMatch[1].length, text: headingMatch[2].trim() });
      i++;
      continue;
    }

    // Blockquote
    if (/^[ \t]*>[ \t]?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^[ \t]*>[ \t]?/.test(lines[i] ?? "")) {
        quoteLines.push((lines[i] ?? "").replace(/^[ \t]*>[ \t]?/, ""));
        i++;
      }
      blocks.push({ type: "blockquote", text: quoteLines.join("\n") });
      continue;
    }

    // Table
    if (line.includes("|") && i + 1 < lines.length && /^[ \t]*\|?[\s-:]+\|[\s|:-]*$/.test(lines[i + 1] ?? "")) {
      const parseCells = (row: string) => {
        let trimmed = row.trim();
        if (trimmed.startsWith("|")) trimmed = trimmed.slice(1);
        if (trimmed.endsWith("|")) trimmed = trimmed.slice(0, -1);
        return trimmed.split("|").map((c) => c.trim());
      };

      const headers = parseCells(line);
      i += 2; // skip header and delimiter row
      const rows: string[][] = [];
      while (i < lines.length && (lines[i] ?? "").includes("|") && (lines[i] ?? "").trim()) {
        rows.push(parseCells(lines[i] ?? ""));
        i++;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    // Unordered List (- or * or +)
    if (/^[ \t]*[-*+][ \t]+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[ \t]*[-*+][ \t]+/.test(lines[i] ?? "")) {
        items.push((lines[i] ?? "").replace(/^[ \t]*[-*+][ \t]+/, ""));
        i++;
      }
      blocks.push({ type: "unordered-list", items });
      continue;
    }

    // Ordered List (1. )
    if (/^[ \t]*\d+\.[ \t]+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[ \t]*\d+\.[ \t]+/.test(lines[i] ?? "")) {
        items.push((lines[i] ?? "").replace(/^[ \t]*\d+\.[ \t]+/, ""));
        i++;
      }
      blocks.push({ type: "ordered-list", items });
      continue;
    }

    // Paragraph
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      (lines[i] ?? "").trim() &&
      !(lines[i] ?? "").trim().startsWith("```") &&
      !/^(#{1,6})\s+/.test(lines[i] ?? "") &&
      !/^[ \t]*[-*+][ \t]+/.test(lines[i] ?? "") &&
      !/^[ \t]*\d+\.[ \t]+/.test(lines[i] ?? "") &&
      !/^[ \t]*>[ \t]?/.test(lines[i] ?? "") &&
      !((lines[i] ?? "").includes("|") && i + 1 < lines.length && /^[ \t]*\|?[\s-:]+\|[\s|:-]*$/.test(lines[i + 1] ?? "")) &&
      !/^[ \t]*(?:---|\*\*\*|___)[ \t]*$/.test(lines[i] ?? "")
    ) {
      paraLines.push(lines[i] ?? "");
      i++;
    }
    if (paraLines.length) {
      blocks.push({ type: "paragraph", text: paraLines.join("\n") });
    }
  }

  return blocks;
}

export function renderInline(text: string): ReactNode[] {
  if (!text) return [];

  const nodes: ReactNode[] = [];
  const regex = /(`[^`]+`)|(\[[^\]]+\]\([^)]+\))|(\*\*\*[^*]+\*\*\*)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(~~[^~]+~~)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const segment = text.slice(lastIndex, match.index);
      nodes.push(...renderPlainTextWithLineBreaks(segment, `txt-${lastIndex}`));
    }

    const matched = match[0];
    const key = `inline-${match.index}`;

    if (matched.startsWith("`") && matched.endsWith("`")) {
      nodes.push(
        <code
          key={key}
          className="rounded bg-muted/80 px-1.5 py-0.5 font-mono text-[12.5px] text-foreground border border-border/40 inline-block align-baseline"
        >
          {matched.slice(1, -1)}
        </code>
      );
    } else if (matched.startsWith("[") && matched.includes("](") && matched.endsWith(")")) {
      const closingBracket = matched.indexOf("]");
      const linkText = matched.slice(1, closingBracket);
      const url = matched.slice(closingBracket + 2, -1);
      nodes.push(
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary font-medium underline underline-offset-2 hover:text-primary/80 transition-colors"
        >
          {renderInline(linkText)}
        </a>
      );
    } else if (matched.startsWith("***") && matched.endsWith("***")) {
      nodes.push(
        <strong key={key} className="font-semibold italic text-foreground">
          {renderInline(matched.slice(3, -3))}
        </strong>
      );
    } else if (matched.startsWith("**") && matched.endsWith("**")) {
      nodes.push(
        <strong key={key} className="font-semibold text-foreground">
          {renderInline(matched.slice(2, -2))}
        </strong>
      );
    } else if (matched.startsWith("*") && matched.endsWith("*")) {
      nodes.push(
        <em key={key} className="italic text-foreground/90">
          {renderInline(matched.slice(1, -1))}
        </em>
      );
    } else if (matched.startsWith("~~") && matched.endsWith("~~")) {
      nodes.push(
        <del key={key} className="line-through text-muted-foreground">
          {renderInline(matched.slice(2, -2))}
        </del>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    const segment = text.slice(lastIndex);
    nodes.push(...renderPlainTextWithLineBreaks(segment, `txt-${lastIndex}`));
  }

  return nodes;
}

function renderPlainTextWithLineBreaks(text: string, baseKey: string): ReactNode[] {
  const parts = text.split("\n");
  const nodes: ReactNode[] = [];
  parts.forEach((part, index) => {
    if (index > 0) {
      nodes.push(<br key={`${baseKey}-br-${index}`} />);
    }
    if (part) {
      nodes.push(part);
    }
  });
  return nodes;
}
