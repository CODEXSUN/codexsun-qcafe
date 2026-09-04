import { useEffect, useState } from "react";
import { CheckCircle2, Circle, GitBranch, ListOrdered, PauseCircle, Play, RotateCcw, Square, XCircle } from "lucide-react";
import { Button } from "@codexsun/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@codexsun/ui/components/ui/dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { OrchestrationRun, RunTask } from "@codexsun/zetro-api/runs";
import { cancelRun, decideRun, listRuns, resumeRun, subscribeRunEvents } from "./workflow-api.js";

export type WorkflowMode = "sequential" | "langgraph";
type Props = { enabled: boolean; mode: WorkflowMode; manualApprovals: boolean; onEnabled(value: boolean): void; onMode(value: WorkflowMode): void; onManualApprovals(value: boolean): void };

export function WorkflowPanel({ enabled, mode, manualApprovals, onEnabled, onMode, onManualApprovals }: Props) {
  const client = useQueryClient();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [note, setNote] = useState("");
  const runs = useQuery({ queryKey: ["zetro-runs"], queryFn: listRuns, refetchInterval: (query) => query.state.data?.some(isLive) ? 1200 : 5000 });
  const refresh = () => client.invalidateQueries({ queryKey: ["zetro-runs"] });
  const decide = useMutation({ mutationFn: ({ id, decision, note }: { id: string; decision: "approve" | "reject"; note?: string }) => decideRun(id, decision, note), onSuccess: () => { setReviewOpen(false); setNote(""); void refresh(); } });
  const cancel = useMutation({ mutationFn: cancelRun, onSuccess: refresh });
  const resume = useMutation({ mutationFn: resumeRun, onSuccess: refresh });
  const run = runs.data?.find(isLive) ?? runs.data?.[0];
  const locked = Boolean(run && isLive(run));
  const evidence = run ? approvalEvidence(run) : [];

  useEffect(() => {
    if (!run?.id || !isLive(run)) return;
    const unsubscribe = subscribeRunEvents(run.id, (updatedRun) => {
      client.setQueryData<OrchestrationRun[]>(["zetro-runs"], (old) => {
        if (!old) return [updatedRun];
        return old.map((r) => (r.id === updatedRun.id ? updatedRun : r));
      });
    });
    return unsubscribe;
  }, [run?.id, isLive(run)]);

  return <section aria-label="Orchestration" className="min-w-0 rounded-xl bg-muted/35 p-3">
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-2"><GitBranch className="size-4 shrink-0 text-primary" /><h2 className="truncate text-sm font-semibold">{run ? phaseName(run) : "Configure"}</h2></div>
      <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs font-medium"><span>Run workflow</span><input aria-label="Agent workflow" type="checkbox" checked={enabled} disabled={locked} onChange={(event) => onEnabled(event.target.checked)} className="size-4 cursor-pointer accent-primary disabled:cursor-not-allowed" /></label>
    </div>
    {!locked && <Configuration mode={mode} manualApprovals={manualApprovals} onMode={onMode} onManualApprovals={onManualApprovals} />}
    {run && <div className="pt-3">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
        <div className="min-w-0 flex-1"><p className="break-words text-xs font-semibold leading-5">{run.message}</p><p className="pt-1 text-[11px] capitalize text-muted-foreground">{run.mode} · {run.status.replaceAll("_", " ")} · {run.tasks.filter((task) => task.status === "completed").length}/{run.tasks.length}{run.usage ? ` · ${(run.usage.inputTokens + run.usage.outputTokens).toLocaleString()} tokens` : ""}</p></div>
        <RunActions run={run} busy={decide.isPending || cancel.isPending || resume.isPending} onReview={() => setReviewOpen(true)} onCancel={() => cancel.mutate(run.id)} onResume={() => resume.mutate(run.id)} />
      </div>
      <ol className="grid gap-2 pt-3 sm:grid-cols-2">{run.tasks.map((task, index) => <TaskRow key={task.id} task={task} index={index} />)}</ol>
    </div>}
    {!run && <p className="pt-3 text-xs text-muted-foreground">Select a mode and send a prompt.</p>}
    {run?.approval && <Dialog open={reviewOpen} onOpenChange={setReviewOpen}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{run.approval.kind === "plan" ? "Review plan" : "Review completion"}</DialogTitle><DialogDescription>Approval applies to the evidence shown below. Add a note before deciding.</DialogDescription></DialogHeader><div className="space-y-3">{evidence.map((task, index) => <article key={task.id} className="rounded-xl border border-border p-3"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">{task.title ?? labelFor(task, index)}</h3><span className="text-xs text-muted-foreground">{task.agentId}</span></div><p className="pt-2 whitespace-pre-wrap text-xs leading-5 text-foreground">{task.result?.message ?? "No evidence returned."}</p></article>)}<label className="block"><span className="block pb-1.5 text-xs font-medium">Review note</span><textarea aria-label="Review note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} className="min-h-20 w-full resize-y rounded-xl border border-input bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Decision context or requested changes" /></label></div><DialogFooter><Button variant="outline" className="cursor-pointer" disabled={decide.isPending} onClick={() => decide.mutate({ id: run.id, decision: "reject", note })}>Request changes</Button><Button className="cursor-pointer" disabled={decide.isPending} onClick={() => decide.mutate({ id: run.id, decision: "approve", note })}>Approve and continue</Button></DialogFooter></DialogContent></Dialog>}
  </section>;
}

function Configuration({ mode, manualApprovals, onMode, onManualApprovals }: Omit<Props, "enabled" | "onEnabled">) {
  return <div className="grid gap-2 pt-3 sm:grid-cols-3"><label className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 ${mode === "sequential" ? "border-primary bg-primary/5" : "border-border"}`}><input aria-label="Sequential mode" type="radio" checked={mode === "sequential"} onChange={() => onMode("sequential")} className="accent-primary" /><ListOrdered className="size-4" /><span className="text-xs font-medium">Sequential</span></label><label className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 ${mode === "langgraph" ? "border-primary bg-primary/5" : "border-border"}`}><input aria-label="LangGraph mode" type="radio" checked={mode === "langgraph"} onChange={() => onMode("langgraph")} className="accent-primary" /><GitBranch className="size-4" /><span className="text-xs font-medium">LangGraph</span></label><label className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-border p-3"><span className="text-xs font-medium">Manual approvals</span><input aria-label="Manual approvals" type="checkbox" checked={manualApprovals} onChange={(event) => onManualApprovals(event.target.checked)} className="size-4 cursor-pointer accent-primary" /></label></div>;
}

function RunActions({ run, busy, onReview, onCancel, onResume }: { run: OrchestrationRun; busy: boolean; onReview(): void; onCancel(): void; onResume(): void }) {
  if (run.status === "awaiting_approval") return <Button size="sm" disabled={busy} className="shrink-0 cursor-pointer" onClick={onReview}><PauseCircle className="size-3.5" />Review {run.approval?.kind}</Button>;
  if (["queued", "running"].includes(run.status)) return <Button size="sm" variant="outline" disabled={busy} className="shrink-0 cursor-pointer" onClick={onCancel}><Square className="size-3.5" />Stop</Button>;
  if (["failed", "interrupted", "cancelled"].includes(run.status)) return <Button size="sm" variant="outline" disabled={busy} className="shrink-0 cursor-pointer" onClick={onResume}><RotateCcw className="size-3.5" />Retry</Button>;
  return <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700"><CheckCircle2 className="size-4" />Complete</span>;
}
function TaskRow({ task, index }: { task: RunTask; index: number }) {
  const Icon = task.status === "completed" ? CheckCircle2 : task.status === "failed" ? XCircle : task.status === "waiting_approval" ? PauseCircle : task.status === "running" ? Play : Circle;
  const color = task.status === "completed" ? "text-emerald-600" : task.status === "failed" ? "text-destructive" : task.status === "waiting_approval" ? "text-amber-600" : task.status === "running" ? "text-primary" : "text-muted-foreground";
  return <li className="flex min-w-0 items-start gap-2 text-xs"><Icon className={`mt-0.5 size-4 shrink-0 ${color}`} /><span className="min-w-0"><span className="font-medium">{task.title ?? labelFor(task, index)}</span><span className="text-muted-foreground"> · {task.agentId}</span></span></li>;
}
function isLive(run?: OrchestrationRun): boolean { return Boolean(run && ["queued", "running", "awaiting_approval"].includes(run.status)); }
function phaseName(run: OrchestrationRun) { if (run.status === "awaiting_approval") return "Review"; if (run.status === "completed") return "Complete"; if (["failed", "interrupted", "cancelled"].includes(run.status)) return "Needs attention"; return "Running"; }
function approvalEvidence(run: OrchestrationRun) { return run.tasks.filter((task) => task.status === "completed" && (run.approval?.kind === "plan" ? ["understand", "plan"].includes(task.stage) : true)); }
function labelFor(task: RunTask, index: number) { return task.stage === "understand" ? "Understand request" : task.stage === "work" ? "Execute approved work" : task.stage === "review" ? "Verify completion evidence" : index > 1 ? "Review and combine plans" : "Create implementation plan"; }
