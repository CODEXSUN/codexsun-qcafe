import type { ControlPlaneSnapshot } from "@codexsun/contracts";
import { Box, Bot, ChevronRight, CircleAlert, RefreshCw, Server, Settings2, Workflow } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const apiUrl = import.meta.env.VITE_OS_API_URL ?? "http://127.0.0.1:4100";

export function App() {
  const [density, setDensity] = useState<"compact" | "relaxed">("relaxed");
  const [snapshot, setSnapshot] = useState<ControlPlaneSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const response = await fetch(`${apiUrl}/api/v1/control-plane`);
      if (!response.ok) throw new Error(`API returned ${response.status}.`);
      setSnapshot(await response.json() as ControlPlaneSnapshot);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The control plane is unavailable.");
    }
  }

  useEffect(() => { void refresh(); }, []);

  return (
    <div className="min-h-screen bg-[#f5f4ef] text-zinc-950" data-density={density}>
      <header className="flex h-16 items-center justify-between border-b border-zinc-300 px-6 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-zinc-950 text-white"><Box className="size-5" /></div>
          <div><strong className="block text-[15px] leading-4">CODEXSUN OS</strong><span className="text-sm text-zinc-600">Control plane</span></div>
        </div>
        <Button onClick={() => void refresh()} variant="outline"><RefreshCw className="size-4" />Refresh state</Button>
      </header>

      <main className="mx-auto flex max-w-[1440px] flex-col gap-10 px-6 pb-28 pt-10 lg:px-10">
        <section className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Orchestration foundation</p>
            <h1 className="max-w-2xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">One control plane. Isolated application runtimes.</h1>
            <p className="mt-5 max-w-2xl text-[17px] leading-7 text-zinc-600">Manage desired state, deployment providers, and reviewed agent learning from one operational surface.</p>
          </div>
          <Status error={error} ready={Boolean(snapshot)} />
        </section>

        <section className="grid gap-px overflow-hidden rounded-xl border border-zinc-300 bg-zinc-300 lg:grid-cols-3">
          <Metric icon={Workflow} label="Registered modules" value={snapshot?.modules.length ?? "—"} />
          <Metric icon={Server} label="Active deployments" value={snapshot?.deployments.filter((item) => item.state === "running").length ?? "—"} />
          <Metric icon={Bot} label="Learning policy" value="Reviewed" />
        </section>

        <section className="grid gap-10 lg:grid-cols-[1.45fr_0.55fr]">
          <div>
            <div className="mb-5 flex items-center justify-between"><div><h2 className="text-xl font-semibold">Runtime modules</h2><p className="mt-1 text-sm text-zinc-600">Validated capabilities loaded by the OS registry.</p></div><span className="text-sm text-zinc-600">{snapshot?.system.version ?? "0.1.0"}</span></div>
            <div className="divide-y divide-zinc-300 border-y border-zinc-300">
              {snapshot?.modules.map((module) => (
                <article className="module-row flex items-center gap-4 py-5" key={module.id}>
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white"><ModuleIcon id={module.id} /></div>
                  <div className="min-w-0 flex-1"><div className="flex items-center gap-3"><h3 className="font-medium">{module.name}</h3><span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[13px] text-zinc-700">{module.runtime}</span></div><p className="mt-1 truncate text-sm text-zinc-600">{module.description}</p></div>
                  <span className="w-24 shrink-0 text-right text-sm text-zinc-600">{module.capabilities.length} capabilities</span><ChevronRight className="size-4 shrink-0 text-zinc-500" />
                </article>
              )) ?? <p className="py-8 text-zinc-600">Waiting for the control-plane API.</p>}
            </div>
          </div>

          <aside className="flex flex-col gap-6 border-l border-zinc-300 pl-0 lg:pl-8">
            <div><h2 className="text-xl font-semibold">Execution policy</h2><p className="mt-2 text-sm leading-6 text-zinc-600">Generated code stays outside the host process. Providers must supply isolation, limits, health checks, and cleanup.</p></div>
            <div className="flex items-start gap-3 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><CircleAlert className="mt-0.5 size-4 shrink-0" /><p>Docker and Cloudflare providers are planned. This preview reports desired state only.</p></div>
            <div className="mt-auto flex items-center gap-3 border-t border-zinc-300 pt-5"><Settings2 className="size-4" /><div><strong className="block text-sm">Builder agent</strong><span className="text-sm text-zinc-600">Review required for refinements</span></div></div>
          </aside>
        </section>
      </main>

      <div className="fixed bottom-5 right-5 flex items-center gap-1 rounded-lg border border-zinc-300 bg-white p-1 shadow-lg" aria-label="Display density">
        <span className="px-2 text-sm text-zinc-600">Spacing</span>
        <button className={density === "compact" ? "tweak-active" : "tweak"} onClick={() => setDensity("compact")}>Compact</button>
        <button className={density === "relaxed" ? "tweak-active" : "tweak"} onClick={() => setDensity("relaxed")}>Relaxed</button>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Server; label: string; value: number | string }) {
  return <div className="bg-white p-6"><Icon className="mb-8 size-5 text-zinc-500" /><strong className="block text-3xl tracking-[-0.04em]">{value}</strong><span className="mt-1 block text-sm text-zinc-600">{label}</span></div>;
}

function ModuleIcon({ id }: { id: string }) {
  if (id.includes("agent")) return <Bot className="size-5" />;
  if (id.includes("execution")) return <Server className="size-5" />;
  return <Workflow className="size-5" />;
}

function Status({ error, ready }: { error: string | null; ready: boolean }) {
  const label = error ? "API unavailable" : ready ? "Runtime connected" : "Connecting";
  return <div className="flex items-center gap-3 text-sm"><span className={`size-2 rounded-full ${error ? "bg-red-500" : ready ? "bg-emerald-500" : "bg-amber-500"}`} /><span>{label}</span></div>;
}
