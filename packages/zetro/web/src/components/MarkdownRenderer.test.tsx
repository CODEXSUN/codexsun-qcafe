import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { MarkdownRenderer, parseMarkdownBlocks, renderInline } from "./MarkdownRenderer.js";

describe("MarkdownRenderer", () => {
  const sample = `**Q Cafe is a local-first restaurant management and point-of-sale application** within the CODEXSUN OS monorepo.

Its core features include:

- **POS and billing:** table or takeaway bills, item quantities and rates.
- **Kitchen:** tickets progress through queued → preparing → ready → served.

| Area | Technology and code structure |
|---|---|
| Web UI | React, TypeScript, Vite |
| Backend | Node.js ES modules |

Evidence: \`apps/q-cafe/README.md\`.`;

  it("parses blocks correctly from markdown text", () => {
    const blocks = parseMarkdownBlocks(sample);
    expect(blocks).toHaveLength(5);
    expect(blocks[0]?.type).toBe("paragraph");
    expect(blocks[1]?.type).toBe("paragraph");
    expect(blocks[2]?.type).toBe("unordered-list");
    expect(blocks[3]?.type).toBe("table");
    expect(blocks[4]?.type).toBe("paragraph");

    if (blocks[2]?.type === "unordered-list") {
      expect(blocks[2].items).toHaveLength(2);
      expect(blocks[2].items[0]).toContain("**POS and billing:**");
      expect(blocks[2].items[1]).toContain("**Kitchen:**");
    }

    if (blocks[3]?.type === "table") {
      expect(blocks[3].headers).toEqual(["Area", "Technology and code structure"]);
      expect(blocks[3].rows).toHaveLength(2);
      expect(blocks[3].rows[0]).toEqual(["Web UI", "React, TypeScript, Vite"]);
      expect(blocks[3].rows[1]).toEqual(["Backend", "Node.js ES modules"]);
    }
  });

  it("renders headers, bold, lists, and tables into clean HTML", () => {
    const html = renderToString(<MarkdownRenderer content={sample} />);

    // Check bold rendering
    expect(html).toContain("<strong class=\"font-semibold text-foreground\">Q Cafe is a local-first restaurant management and point-of-sale application</strong>");
    expect(html).toContain("<strong class=\"font-semibold text-foreground\">POS and billing:</strong>");
    expect(html).toContain("<strong class=\"font-semibold text-foreground\">Kitchen:</strong>");

    // Check list rendering
    expect(html).toContain("<ul class=\"my-2.5 pl-6 list-disc space-y-1.5 text-sm leading-relaxed text-foreground/90 marker:text-primary/70\">");
    expect(html).toContain("<li class=\"pl-0.5\">");

    // Check table rendering
    expect(html).toContain("<table class=\"w-full text-left text-xs border-collapse\">");
    expect(html).toContain("<th class=\"px-3.5 py-2.5 font-semibold text-foreground tracking-tight whitespace-nowrap\">Area</th>");
    expect(html).toContain("Technology and code structure</th>");
    expect(html).toContain("<td class=\"px-3.5 py-2.5 align-top leading-relaxed text-foreground/90\">Web UI</td>");
    expect(html).toContain("<td class=\"px-3.5 py-2.5 align-top leading-relaxed text-foreground/90\">React, TypeScript, Vite</td>");

    // Check inline code
    expect(html).toContain("<code class=\"rounded bg-muted/80 px-1.5 py-0.5 font-mono text-[12.5px] text-foreground border border-border/40 inline-block align-baseline\">apps/q-cafe/README.md</code>");
  });

  it("renders code blocks with copy header", () => {
    const markdown = "```typescript\nconst count: number = 42;\n```";
    const html = renderToString(<MarkdownRenderer content={markdown} />);

    expect(html).toContain("typescript");
    expect(html).toContain("const count: number = 42;");
    expect(html).toContain("<pre");
    expect(html).toContain("<code");
  });

  it("renders headings h1 through h4 properly", () => {
    const markdown = "# Title 1\n## Subtitle 2\n### Section 3\n#### Sub 4";
    const html = renderToString(<MarkdownRenderer content={markdown} />);

    expect(html).toContain("<h1 class=\"text-lg font-bold text-foreground mt-4 mb-2 pb-1 border-b border-border/70\">Title 1</h1>");
    expect(html).toContain("<h2 class=\"text-base font-bold text-foreground mt-3.5 mb-1.5 pb-0.5 border-b border-border/50\">Subtitle 2</h2>");
    expect(html).toContain("<h3 class=\"text-sm font-semibold text-foreground mt-3 mb-1\">Section 3</h3>");
    expect(html).toContain("<h4 class=\"text-xs font-semibold text-foreground mt-2.5 mb-1\">Sub 4</h4>");
  });

  it("renders streaming cursor when isStreaming is true", () => {
    const markdown = "Streaming response";
    const html = renderToString(<MarkdownRenderer content={markdown} isStreaming={true} />);

    expect(html).toContain("animate-pulse");
  });
});
