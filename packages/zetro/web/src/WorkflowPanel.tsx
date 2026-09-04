import { CheckCircle2, Circle, GitBranch, ListOrdered, PauseCircle, XCircle } from "lucide-react";
import { Button } from "@codexsun/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { decideRun, listRuns } from "./workflow-api.js";

export type WorkflowMode = "sequential" | "langgraph";
export function WorkflowPanel({ enabled, mode, manualApprovals, onEnabled, onMode, onManualApprovals }: { enabled: boolean; mode: WorkflowMode; manualApprovals: boolean; onEnabled(value: boolean): void; onMode(value: WorkflowMode): void; onManualApprovals(value: boolean): void }) {
  const client = useQueryClient();
  const runs = useQuery({ queryKey: ["zetro-runs"], queryFn: listRuns, refetchInterval: (query) => query.state.data?.some((run) => ["queued", "running"].includes(run.status)) ? 1500 : 5000 });
  const decide = useMutation({ mutationFn: ({ id, decision }: { id: string; decision: "approve" | "reject" }) => decideRun(id, decision), onSuccess: () => client.invalidateQueries({ queryKey: ["zetro-runs"] }) });
  const active = runs.data?.[0];
  return <section aria-label="Orchestration" className="min-w-0 rounded-xl bg-muted/35 p-3">
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-2"><GitBranch className="size-4 shrink-0 text-primary" /><h2 className="truncate text-sm font-semibold">Orchestration</h2></div>
      <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs font-medium"><span>Run workflow</span><input aria-label="Agent workflow" type="checkbox" checked={enabled} onChange={(event) => onEnabled(event.target.checked)} className="size-4 cursor-pointer accent-primary" /></label>
    </div>
    <div className="grid gap-2 pt-3 sm:grid-cols-3">
      <label className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 ${mode === "sequential" ? "border-primary bg-primary/5" : "border-border"}`}><input aria-label="Sequential mode" type="radio" checked={mode === "sequential"} onChange={() => onMode("sequential")} className="accent-primary" /><ListOrdered className="size-4" /><span className="text-xs font-medium">Sequential</span></label>
      <label className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 ${mode === "langgraph" ? "border-primary bg-primary/5" : "border-border"}`}><input aria-label="LangGraph mode" type="radio" checked={mode === "langgraph"} onChange={() => onMode("langgraph")} className="accent-primary" /><GitBranch className="size-4" /><span className="text-xs font-medium">LangGraph</span></label>
      <label className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-border p-3"><span className="text-xs font-medium">Manual approvals</span><input aria-label="Manual approvals" type="checkbox" checked={manualApprovals} onChange={(event) => onManualApprovals(event.target.checked)} className="size-4 cursor-pointer accent-primary" /></label>
    </div>
    {active && <div className="pt-3">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3"><div className="min-w-0 flex-1"><p className="break-words text-xs font-semibold leading-5">{active.message}</p><p className="pt-1 text-[11px] capitalize text-muted-foreground">{active.mode} · {active.status.replaceAll("_", " ")} · {active.tasks.filter((task) => task.status === "completed").length}/{active.tasks.length}</p></div>{active.status === "awaiting_approval" && <div className="flex shrink-0 gap-2"><Button size="sm" variant="outline" disabled={decide.isPending} className="cursor-pointer" onClick={() => decide.mutate({ id: active.id, decision: "reject" })}>Reject</Button><Button size="sm" disabled={decide.isPending} className="cursor-pointer" onClick={() => decide.mutate({ id: active.id, decision: "approve" })}>Approve {active.approval?.kind}</Button></div>}</div>
      <ol className="grid gap-2 pt-3 sm:grid-cols-2">{active.tasks.map((task) => <li key={task.id} className="flex min-w-0 items-start gap-2 text-xs">{task.status === "completed" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : task.status === "failed" ? <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" /> : task.status === "waiting_approval" ? <PauseCircle className="mt-0.5 size-4 shrink-0 text-amber-600" /> : <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}<span className="min-w-0"><span className="font-medium capitalize">{task.stage}</span><span className="text-muted-foreground"> · {task.agentId}</span></span></li>)}</ol>
    </div>}
    {!active && <p className="pt-3 text-xs text-muted-foreground">Select a mode and send a prompt.</p>}
  </section>;
}
