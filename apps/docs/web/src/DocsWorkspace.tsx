import { BookOpen, FilePlus, FileText, Pencil, Search, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@codexsun/ui";
import { Button } from "@codexsun/ui/components/button";
import { platformFetch } from "@codexsun/platform-host-contracts";
import { MdiTopologyRegion, type MdiTopologyAdapter, type MdiWorkspaceAddon } from "@codexsun/ui-desk";
import { MdxDocument } from "./MdxDocument.js";

type DocumentSummary = { group: string; slug: string; summary: string; title: string; updatedAt: string };
type Document = DocumentSummary & { body: string };
type Draft = { body: string; group: string; slug: string; summary: string; title: string };

export function createDocsWorkspaceAddon({ apiBaseUrl = window.location.origin }: { apiBaseUrl?: string } = {}): MdiWorkspaceAddon {
  return { icon: BookOpen, id: "docs", label: "Docs", navigation: { id: "docs", hideSearch: true, searchPlaceholder: "Search docs", groups: [{ defaultOpen: true, id: "docs", items: [{ id: "architecture", title: "Architecture" }], title: "CODEXSUN DOCS" }] }, placement: "secondary", renderPage: (pageId, topology, target) => <DocsWorkspace apiBaseUrl={apiBaseUrl} pageId={pageId || "architecture"} sideCarTarget={target} topology={topology} /> };
}
export const docsWorkspaceAddon = createDocsWorkspaceAddon();

export function DocsWorkspace({ apiBaseUrl, pageId, sideCarTarget, topology }: { apiBaseUrl: string; pageId: string; sideCarTarget?: HTMLElement | null; topology?: MdiTopologyAdapter }) {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [document, setDocument] = useState<Document>();
  const [draft, setDraft] = useState<Draft>();
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => { void request(apiBaseUrl, "/api/v1/docs").then(readDocuments).then(setDocuments).catch(() => setError("Documentation service is unavailable.")); }, [apiBaseUrl, reloadKey]);
  useEffect(() => { setError(""); void request(apiBaseUrl, `/api/v1/docs/${pageId}`).then(readDocument).then(setDocument).catch(() => setError("This document is unavailable.")); }, [apiBaseUrl, pageId, reloadKey]);
  const groups = [...new Set(documents.map((item) => item.group))];
  const visible = documents.filter((item) => `${item.title} ${item.summary}`.toLowerCase().includes(query.trim().toLowerCase()));
  const sideCar = <MdiTopologyRegion id="d2.1.1" topology={topology} className="space-y-3"><label className="relative block"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input aria-label="Search documentation" className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" onChange={(event) => setQuery(event.target.value)} placeholder="Search docs" value={query} /></label><Button className="w-full cursor-pointer" onClick={() => setDraft(emptyDraft())} size="sm" type="button"><FilePlus />New document</Button><nav aria-label="Documentation"><p className="px-2 text-xs font-semibold tracking-wide text-muted-foreground">DOCUMENTS</p><Accordion className="space-y-1" defaultValue={groups} type="multiple">{groups.map((group) => <AccordionItem className="rounded-lg border border-border bg-card px-1" key={group} value={group}><AccordionTrigger className="cursor-pointer rounded-md px-2 py-2 text-xs font-semibold tracking-wide text-muted-foreground no-underline hover:bg-accent hover:no-underline hover:text-accent-foreground">{group}</AccordionTrigger><AccordionContent className="px-1 pb-1">{visible.filter((item) => item.group === group).map((item) => <a aria-current={item.slug === pageId ? "page" : undefined} className={`mb-1 flex cursor-pointer items-start gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${item.slug === pageId ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`} href={`/?app=docs&addon=docs&page=${item.slug}`} key={item.slug}><FileText className="mt-0.5 size-4 shrink-0" /><span className="min-w-0"><span className="block truncate font-medium text-foreground">{item.title}</span><span className="block truncate text-xs">{item.summary}</span></span></a>)}</AccordionContent></AccordionItem>)}</Accordion></nav></MdiTopologyRegion>;
  return <MdiTopologyRegion id="d1" topology={topology} className="h-full overflow-y-auto bg-background text-foreground">{sideCarTarget && createPortal(sideCar, sideCarTarget)}<article className="mx-auto w-full max-w-4xl px-6 py-10 sm:px-10">{draft ? <DocumentEditor apiBaseUrl={apiBaseUrl} draft={draft} onCancel={() => setDraft(undefined)} onSave={() => { setDraft(undefined); setReloadKey((value) => value + 1); }} setDraft={setDraft} /> : <><div className="mb-6 flex justify-end"><Button className="cursor-pointer" disabled={!document} onClick={() => document && setDraft(document)} size="sm" type="button" variant="outline"><Pencil />Edit document</Button></div>{error ? <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</p> : document ? <MdxDocument source={document.body} /> : <p className="text-sm text-muted-foreground">Loading document…</p>}</>}</article></MdiTopologyRegion>;
}

function DocumentEditor({ apiBaseUrl, draft, onCancel, onSave, setDraft }: { apiBaseUrl: string; draft: Draft; onCancel(): void; onSave(): void; setDraft(value: Draft): void }) {
  const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  async function save(event: React.FormEvent) { event.preventDefault(); setSaving(true); setError(""); try { const response = await request(apiBaseUrl, draft.slug ? `/api/v1/docs/${draft.slug}` : "/api/v1/docs", { body: JSON.stringify(draft), headers: { "content-type": "application/json" }, method: draft.slug ? "PUT" : "POST" }); if (!response.ok) throw new Error((await response.json() as { error?: string }).error || "Unable to save document."); onSave(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save document."); } finally { setSaving(false); } }
  return <form className="space-y-5" onSubmit={save}><div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">{draft.slug ? "Edit document" : "New document"}</h1><Button className="cursor-pointer" onClick={onCancel} size="icon" type="button" variant="ghost"><X /><span className="sr-only">Close editor</span></Button></div><EditorField label="Title" value={draft.title} onChange={(title) => setDraft({ ...draft, title })} /><EditorField label="One-line description" value={draft.summary} onChange={(summary) => setDraft({ ...draft, summary })} /><EditorField label="Group" value={draft.group} onChange={(group) => setDraft({ ...draft, group })} /><EditorField label="Slug" value={draft.slug} onChange={(slug) => setDraft({ ...draft, slug })} /><label className="grid gap-2 text-sm font-medium">Document body<textarea className="min-h-80 rounded-lg border border-input bg-background p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-ring" onChange={(event) => setDraft({ ...draft, body: event.target.value })} required value={draft.body} /></label>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button className="cursor-pointer" disabled={saving} type="submit">{saving ? "Saving…" : "Save document"}</Button></form>;
}
function EditorField({ label, onChange, value }: { label: string; onChange(value: string): void; value: string }) { return <label className="grid gap-2 text-sm font-medium">{label}<input className="rounded-lg border border-input bg-background p-3 outline-none focus:ring-2 focus:ring-ring" onChange={(event) => onChange(event.target.value)} required value={value} /></label>; }
function emptyDraft(): Draft { return { body: "# New document\n", group: "Applications and operations", slug: "", summary: "", title: "" }; }
async function request(baseUrl: string, path: string, options: RequestInit = {}) { return baseUrl === window.location.origin ? platformFetch(path, options) : fetch(new URL(path, baseUrl), options); }
async function readDocuments(response: Response) { if (!response.ok) throw new Error(); return (await response.json() as { documents: DocumentSummary[] }).documents; }
async function readDocument(response: Response) { if (!response.ok) throw new Error(); return (await response.json() as { document: Document }).document; }
