import { BookOpen, FileText, Search } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { MdiTopologyRegion, type MdiTopologyAdapter, type MdiWorkspaceAddon } from "@codexsun/ui-desk";
import { MdxDocument } from "./MdxDocument.js";

type DocumentSummary = { slug: string; title: string; summary: string; updatedAt: string };
type Document = DocumentSummary & { body: string };

export function createDocsWorkspaceAddon({ apiBaseUrl = window.location.origin }: { apiBaseUrl?: string } = {}): MdiWorkspaceAddon {
  return {
    icon: BookOpen,
    id: "docs",
    label: "Docs",
    navigation: { id: "docs", hideSearch: true, searchPlaceholder: "Search docs", groups: [{ defaultOpen: true, id: "docs", items: [{ id: "architecture", title: "Architecture" }, { id: "identity", title: "Identity" }, { id: "dcs-device-chat", title: "DCS & Device Chat" }, { id: "zetro-tasks", title: "Zetro & Tasks" }, { id: "zetro-mobile", title: "Zetro Mobile" }], title: "CODEXSUN DOCS" }] },
    placement: "secondary",
    renderPage: (pageId, topology, target) => <DocsWorkspace apiBaseUrl={apiBaseUrl} pageId={pageId || "architecture"} sideCarTarget={target} topology={topology} />,
  };
}

export const docsWorkspaceAddon = createDocsWorkspaceAddon();

export function DocsWorkspace({ apiBaseUrl, pageId, sideCarTarget, topology }: { apiBaseUrl: string; pageId: string; sideCarTarget?: HTMLElement | null; topology?: MdiTopologyAdapter }) {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [document, setDocument] = useState<Document>();
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { void loadIndex(apiBaseUrl, query).then(setDocuments).catch(() => setError("Documentation service is unavailable.")); }, [apiBaseUrl, query]);
  useEffect(() => { setError(""); void loadDocument(apiBaseUrl, pageId).then(setDocument).catch(() => setError("This document is unavailable.")); }, [apiBaseUrl, pageId]);

  const sideCar = <MdiTopologyRegion id="d2.1.1" topology={topology} className="space-y-3"><label className="relative block"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input aria-label="Search documentation" className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" onChange={event => setQuery(event.target.value)} placeholder="Search docs" value={query} /></label><nav aria-label="Documentation"><p className="mb-2 px-2 text-xs font-semibold text-muted-foreground">DOCUMENTS</p>{documents.map(item => <a aria-current={item.slug === pageId ? "page" : undefined} className={`mb-1 flex cursor-pointer items-start gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${item.slug === pageId ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`} href={`/?app=docs&addon=docs&page=${item.slug}`} key={item.slug}><FileText className="mt-0.5 size-4 shrink-0" /><span className="min-w-0"><span className="block font-medium text-foreground">{item.title}</span><span className="line-clamp-2 block text-xs">{item.summary}</span></span></a>)}</nav></MdiTopologyRegion>;

  return <MdiTopologyRegion id="d1" topology={topology} className="h-full overflow-y-auto bg-background text-foreground">
    {sideCarTarget && createPortal(sideCar, sideCarTarget)}
    <article className="mx-auto w-full max-w-4xl px-6 py-10 sm:px-10">
      {error ? <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</p> : document ? <MdxDocument source={document.body} /> : <p className="text-sm text-muted-foreground">Loading document…</p>}
    </article>
  </MdiTopologyRegion>;
}

async function loadIndex(baseUrl: string, query: string): Promise<DocumentSummary[]> {
  const url = new URL("/api/v1/docs", baseUrl);
  if (query.trim()) url.searchParams.set("q", query.trim());
  const response = await fetch(url);
  if (!response.ok) throw new Error("Docs unavailable");
  return (await response.json() as { documents: DocumentSummary[] }).documents;
}

async function loadDocument(baseUrl: string, slug: string): Promise<Document> {
  const response = await fetch(new URL(`/api/v1/docs/${slug}`, baseUrl));
  if (!response.ok) throw new Error("Document unavailable");
  return (await response.json() as { document: Document }).document;
}
