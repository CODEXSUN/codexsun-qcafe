import { AlertTriangle, CheckCircle2, Clock3, GitCommitHorizontal, History, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@codexsun/ui/components/button";
import { Input } from "@codexsun/ui/components/ui/input";
import type { MdiTopologyAdapter } from "@codexsun/ui-desk";
import type { ReleaseHistoryEntry, ReleaseReviewStatus } from "@codexsun/orship-contracts";
import { listReleaseHistory, saveReleaseReview } from "./release-history-api.js";

export function ReleaseHistoryWorkspace({ apiBase, topology }: { apiBase: string; topology?: MdiTopologyAdapter }) {
  const [entries, setEntries] = useState<ReleaseHistoryEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState("");
  const [status, setStatus] = useState("Loading release history…");
  const [reviewStatus, setReviewStatus] = useState<ReleaseReviewStatus>("pending");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const selected = useMemo(() => entries.find(entry => entry.operation.id === selectedId) ?? entries[0], [entries, selectedId]);

  async function refresh() {
    try {
      const history = await listReleaseHistory(apiBase, { query, phase });
      setEntries(history);
      setSelectedId(current => history.some(entry => entry.operation.id === current) ? current : history[0]?.operation.id);
      setStatus(`${history.length} completed release${history.length === 1 ? "" : "s"} · refreshed ${new Date().toLocaleTimeString()}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Release history is unavailable.");
    }
  }

  useEffect(() => { void refresh(); }, [phase]);
  useEffect(() => {
    setReviewStatus(selected?.review?.status ?? "pending");
    setNotes(selected?.review?.notes ?? "");
  }, [selected?.operation.id, selected?.review?.reviewedAt]);

  async function saveReview() {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await saveReleaseReview(apiBase, selected.operation.id, { status: reviewStatus, notes });
      setEntries(current => current.map(entry => entry.operation.id === updated.operation.id ? updated : entry));
      setStatus(`Review saved ${new Date().toLocaleTimeString()}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save the review.");
    } finally {
      setSaving(false);
    }
  }

  return <main className="flex h-full min-h-0 w-full flex-col bg-background text-foreground" {...topology?.regionProps("o1")}>
    {topology?.marker("o1")}
    <header className="flex flex-col gap-4 border-b border-border px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-8">
      <div><p className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">Release archive</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">Operation history</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Review completed deployments, failures, source references, event evidence, and follow-up decisions.</p></div>
      <Button className="cursor-pointer" onClick={() => void refresh()} variant="outline"><RefreshCw className="size-4" />Refresh</Button>
    </header>

    <section className="grid min-h-0 flex-1 md:grid-cols-3" {...topology?.regionProps("o2")}>
      {topology?.marker("o2")}
      <aside className="flex min-h-0 flex-col border-b border-border bg-card md:border-b-0 md:border-r">
        <div className="grid gap-3 border-b border-border p-4">
          <label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search release history" className="pl-9" onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void refresh(); }} placeholder="Search title, version, revision…" value={query} /></label>
          <select aria-label="Filter release outcome" className="h-10 cursor-pointer rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" onChange={event => setPhase(event.target.value)} value={phase}><option value="">All outcomes</option><option value="running">Completed</option><option value="failed">Failed</option><option value="cancelled">Cancelled</option></select>
          <p className="text-xs text-muted-foreground">{status}</p>
        </div>
        <div className="min-h-0 overflow-y-auto p-2">
          {entries.map(entry => <button className={`mb-1 w-full cursor-pointer rounded-lg border px-3 py-3 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected?.operation.id === entry.operation.id ? "border-ring bg-accent" : "border-transparent"}`} key={entry.operation.id} onClick={() => setSelectedId(entry.operation.id)} type="button">
            <span className="flex items-start justify-between gap-3"><strong className="line-clamp-2 text-sm">{entry.operation.title}</strong><OutcomeBadge outcome={entry.summary.outcome} /></span>
            <span className="mt-2 block text-xs text-muted-foreground">{entry.operation.target.projectKey} · {entry.operation.version ?? "No version"}</span>
            <span className="mt-1 block text-xs text-muted-foreground">{new Date(entry.summary.completedAt).toLocaleString()} · {reviewLabel(entry.review?.status)}</span>
          </button>)}
          {!entries.length && <div className="px-4 py-12 text-center"><History className="mx-auto size-6 text-muted-foreground" /><p className="mt-3 text-sm text-muted-foreground">No completed release operations match this filter.</p></div>}
        </div>
      </aside>

      <section className="min-h-0 overflow-y-auto p-5 sm:p-8 md:col-span-2" {...topology?.regionProps("o3")}>
        {topology?.marker("o3")}
        {selected ? <div className="mx-auto grid max-w-4xl gap-5">
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><GitCommitHorizontal className="size-5" /><h2 className="text-lg font-semibold">{selected.operation.title}</h2></div><p className="mt-2 text-sm text-muted-foreground">{selected.operation.target.projectKey} · {selected.operation.target.environment}</p></div><OutcomeBadge outcome={selected.summary.outcome} /></div>
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4"><Fact label="Version" value={selected.operation.version ?? "Not recorded"} /><Fact label="Source revision" value={selected.operation.sourceRevision ?? "Not recorded"} mono /><Fact label="Duration" value={formatDuration(selected.summary.durationMs)} /><Fact label="Evidence events" value={String(selected.summary.eventCount)} /></dl>
            {selected.operation.failure && <div className="mt-5 flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><p>{selected.operation.failure}</p></div>}
          </section>

          <section className="rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-4"><h2 className="font-semibold">Evidence timeline</h2><p className="mt-1 text-xs text-muted-foreground">All recorded state transitions for this operation.</p></div>
            <div className="divide-y divide-border">{selected.events.map(event => <article className="flex gap-3 px-5 py-4 text-sm" key={event.id}><Clock3 className="mt-0.5 size-4 shrink-0 text-muted-foreground" /><div className="min-w-0"><p className="font-medium">{event.type.replace("release.", "").replaceAll("_", " ")}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(event.occurredAt).toLocaleString()}</p>{Object.keys(event.details).length > 0 && <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(event.details, null, 2)}</pre>}</div></article>)}</div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm" {...topology?.regionProps("o4")}>
            {topology?.marker("o4")}
            <div className="flex items-center gap-2"><CheckCircle2 className="size-5" /><h2 className="font-semibold">Review decision</h2></div>
            <p className="mt-2 text-sm text-muted-foreground">Record whether the evidence is accepted or needs follow-up. Reviews remain attached to this operation.</p>
            <div className="mt-5 grid gap-3"><label className="grid gap-2 text-sm font-medium">Status<select className="h-10 cursor-pointer rounded-md border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring" onChange={event => setReviewStatus(event.target.value as ReleaseReviewStatus)} value={reviewStatus}><option value="pending">Pending review</option><option value="reviewed">Reviewed</option><option value="action_required">Action required</option></select></label><label className="grid gap-2 text-sm font-medium">Review notes<textarea className="min-h-28 resize-y rounded-md border border-input bg-background p-3 font-normal outline-none focus:ring-2 focus:ring-ring" maxLength={4000} onChange={event => setNotes(event.target.value)} placeholder="Record evidence checked, decision, risks, and follow-up…" value={notes} /></label><div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{selected.review ? `Last reviewed ${new Date(selected.review.reviewedAt).toLocaleString()} · ${selected.reviews.length} saved decision${selected.reviews.length === 1 ? "" : "s"}` : "Not reviewed yet"}</span><Button className="cursor-pointer" disabled={saving} onClick={() => void saveReview()}>{saving ? "Saving…" : "Save review"}</Button></div></div>
          </section>
        </div> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Select a completed operation to review its evidence.</div>}
      </section>
    </section>
  </main>;
}

function Fact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) { return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className={`mt-1 break-all font-medium ${mono ? "font-mono text-xs" : ""}`}>{value}</dd></div>; }
function OutcomeBadge({ outcome }: { outcome: ReleaseHistoryEntry["summary"]["outcome"] }) { const tone = outcome === "completed" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : outcome === "failed" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"; return <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium capitalize ${tone}`}>{outcome}</span>; }
function reviewLabel(status?: ReleaseReviewStatus) { return status ? status.replaceAll("_", " ") : "pending review"; }
function formatDuration(milliseconds: number) { if (milliseconds < 1_000) return `${milliseconds} ms`; const seconds = Math.round(milliseconds / 1_000); if (seconds < 60) return `${seconds} sec`; const minutes = Math.floor(seconds / 60); return `${minutes} min ${seconds % 60} sec`; }
