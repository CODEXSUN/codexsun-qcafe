import { Cloud, GitCommitHorizontal, LoaderCircle, RefreshCw, Rocket, TerminalSquare } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@codexsun/ui/components/button";
import { Input } from "@codexsun/ui/components/ui/input";
import type { MdiWorkspaceAddon } from "@codexsun/ui-desk";
import type { CloudReleaseState, ReleaseOperation, ReleaseOperationEvent } from "@codexsun/orship-contracts";

const apiBase = location.hostname === "127.0.0.1" || location.hostname === "tauri.localhost" || location.protocol === "tauri:"
  ? "http://127.0.0.1:4190"
  : location.origin;

export const orshipWorkspaceAddon: MdiWorkspaceAddon = {
  id: "orship",
  label: "Orship",
  icon: Rocket,
  navigation: { id: "orship", hideSearch: true, groups: [{ id: "orship", title: "Release operations", items: [{ id: "operations", title: "Operations" }] }] },
  renderPage: () => <OrshipWorkspace />,
};

function OrshipWorkspace() {
  const [operations, setOperations] = useState<ReleaseOperation[]>([]);
  const [events, setEvents] = useState<ReleaseOperationEvent[]>([]);
  const [cloudState, setCloudState] = useState<CloudReleaseState | null>(null);
  const [title, setTitle] = useState("");
  const [projectKey, setProjectKey] = useState("codexsun-os");
  const [status, setStatus] = useState("Connecting to Orship…");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      const response = await fetch(`${apiBase}/api/v1/orship`, { credentials: "include" });
      if (!response.ok) throw new Error(`Orship API returned ${response.status}.`);
      setOperations(await response.json() as ReleaseOperation[]);
      const eventsResponse = await fetch(`${apiBase}/api/v1/orship/events`, { credentials: "include" });
      if (!eventsResponse.ok) throw new Error(`Orship event API returned ${eventsResponse.status}.`);
      setEvents(await eventsResponse.json() as ReleaseOperationEvent[]);
      const cloudStateResponse = await fetch(`${apiBase}/api/v1/orship/cloud-state`, { credentials: "include" });
      if (!cloudStateResponse.ok) throw new Error(`Cloud state API returned ${cloudStateResponse.status}.`);
      setCloudState(await cloudStateResponse.json() as CloudReleaseState | null);
      setStatus(`Connected · refreshed ${new Date().toLocaleTimeString()}`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Orship is unavailable."); }
  };

  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(), 5_000); return () => window.clearInterval(timer); }, []);
  const active = useMemo(() => operations.find(operation => !["running", "failed", "cancelled"].includes(operation.phase)), [operations]);

  async function createOperation(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      const response = await fetch(`${apiBase}/api/v1/orship`, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ target: { projectKey: projectKey.trim(), environment: "cloud" }, title: title.trim() }) });
      if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? "Could not create the release operation.");
      setTitle("");
      setStatus("Release operation created. Review it before publishing.");
      await refresh();
    } catch (error) { setStatus(error instanceof Error ? error.message : "Could not create the release operation."); } finally { setBusy(false); }
  }

  return <main className="mx-auto flex h-full w-full max-w-6xl flex-col gap-6 overflow-y-auto bg-background px-5 py-8 text-foreground sm:px-8">
    <header className="flex flex-col justify-between gap-4 border-b border-border pb-5 sm:flex-row sm:items-end">
      <div><p className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">Release operations</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Orship</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Track desktop release work, cloud deployment progress, and the evidence needed to decide the next action.</p></div>
      <Button className="cursor-pointer" onClick={() => void refresh()} variant="outline"><RefreshCw className="size-4" /> Refresh</Button>
    </header>

    <section className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
      <form className="rounded-xl border border-border bg-card p-5 shadow-sm" onSubmit={createOperation}>
        <div className="flex items-center gap-2"><GitCommitHorizontal className="size-5" /><h2 className="font-semibold">Desktop release intent</h2></div>
        <p className="mt-2 text-sm text-muted-foreground">Create a reviewed release record before the desktop routine makes a changelog, commit, tag, and cloud update.</p>
        <div className="mt-5 grid gap-3"><Input aria-label="Project key" className="cursor-text" onChange={event => setProjectKey(event.target.value)} placeholder="Project key" value={projectKey} /><Input aria-label="Release title" className="cursor-text" onChange={event => setTitle(event.target.value)} placeholder="What is ready to release?" value={title} /><Button className="cursor-pointer" disabled={busy || !title.trim() || !projectKey.trim()} type="submit">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Rocket className="size-4" />} Create release record</Button></div>
      </form>
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm"><div className="flex items-center gap-2"><Cloud className="size-5" /><h2 className="font-semibold">Cloud handoff</h2></div><p className="mt-2 text-sm text-muted-foreground">The desktop routine sends the tagged source archive. The cloud runner validates it, preserves data, builds services, and records the applied state.</p><div className="mt-5 rounded-lg border border-border bg-muted/40 p-3 text-sm"><span className="font-medium">Cloud state</span><p className="mt-1 text-muted-foreground">{cloudState ? `${cloudState.version} · ${cloudState.phase} · ${new Date(cloudState.updatedAt).toLocaleString()}` : "No cloud release state is available."}</p></div><div className="mt-3 text-xs text-muted-foreground">Desktop: {active ? `${active.title} · ${label(active.phase)}` : "No active release operation."}</div></section>
    </section>

    <section className="rounded-xl border border-border bg-card shadow-sm"><div className="flex items-center gap-2 border-b border-border px-5 py-4"><TerminalSquare className="size-5" /><div><h2 className="font-semibold">Release console</h2><p className="text-xs text-muted-foreground">{status}</p></div></div><div className="divide-y divide-border">{events.length ? events.map(event => <article className="flex items-start gap-3 px-5 py-3 text-sm" key={event.id}><span className="mt-1.5 size-2 rounded-full bg-foreground" /><div><p className="font-medium">{event.type.replace("release.", "")}</p><p className="text-muted-foreground">{new Date(event.occurredAt).toLocaleString()} · {operationName(event.operationId, operations)}</p></div></article>) : <p className="px-5 py-12 text-center text-sm text-muted-foreground">No release events yet. Create a release record to begin the console.</p>}</div></section>
  </main>;
}

function label(phase: ReleaseOperation["phase"]) { return phase.replaceAll("_", " "); }
function operationName(id: string, operations: ReleaseOperation[]) { return operations.find(operation => operation.id === id)?.title ?? "Release operation"; }
