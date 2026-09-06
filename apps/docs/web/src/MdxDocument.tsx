import mermaid from "mermaid";
import { Fragment, useEffect, useId, useRef, useState, type ReactElement } from "react";

export function MdxDocument({ source }: { source: string }) {
  return <div className="docs-prose">{parseMdx(source).map((block, index) => <Fragment key={index}>{block}</Fragment>)}</div>;
}

function parseMdx(source: string) {
  const lines = source.replaceAll("\r\n", "\n").split("\n");
  const blocks: ReactElement[] = [];
  for (let index = 0; index < lines.length;) {
    const line = lines[index] ?? "";
    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !(lines[index] ?? "").startsWith("```")) code.push(lines[index++] ?? "");
      index += 1;
      const source = code.join("\n");
      blocks.push(language === "mermaid" ? <MermaidDiagram source={source} /> : <pre><code>{source}</code></pre>);
      continue;
    }
    if (line.startsWith("# ")) { blocks.push(<h1>{line.slice(2)}</h1>); index += 1; continue; }
    if (line.startsWith("## ")) { blocks.push(<h2>{line.slice(3)}</h2>); index += 1; continue; }
    if (line.startsWith("### ")) { blocks.push(<h3>{line.slice(4)}</h3>); index += 1; continue; }
    const image = parseImage(line);
    if (image) { blocks.push(<figure className="docs-image"><img alt={image.alt} src={image.source} /><figcaption>{image.alt}</figcaption></figure>); index += 1; continue; }
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while ((lines[index] ?? "").startsWith("- ")) items.push((lines[index++] ?? "").slice(2));
      blocks.push(<ul>{items.map(item => <li key={item}>{inline(item)}</li>)}</ul>);
      continue;
    }
    if (!line.trim()) { index += 1; continue; }
    const paragraph: string[] = [];
    while (index < lines.length && (lines[index] ?? "").trim() && !/^(#|```|- )/.test(lines[index] ?? "")) paragraph.push(lines[index++] ?? "");
    blocks.push(<p>{inline(paragraph.join(" "))}</p>);
  }
  return blocks;
}

function parseImage(line: string) {
  const match = /^!\[([^\]]*)\]\((\/docs-assets\/[a-zA-Z0-9._/-]+)\)$/u.exec(line);
  return match ? { alt: match[1] ?? "Documentation image", source: match[2] ?? "" } : null;
}

function MermaidDiagram({ source }: { source: string }) {
  const target = useRef<HTMLDivElement>(null);
  const diagramId = `docs-diagram-${useId().replace(/[^a-z0-9]/gi, "")}`;
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral" });
    void mermaid.render(diagramId, source)
      .then(({ svg }) => { if (active && target.current) target.current.innerHTML = svg; })
      .catch(() => { if (active) setError("This Mermaid diagram could not be rendered."); });
    return () => { active = false; };
  }, [diagramId, source]);

  return <div aria-label="Architecture diagram" className="docs-diagram" ref={target} role="img">{error && <p>{error}</p>}</div>;
}

function inline(value: string) {
  const parts = value.split(/(`[^`]+`)/g);
  return parts.map((part, index) => part.startsWith("`") ? <code key={index}>{part.slice(1, -1)}</code> : part);
}
