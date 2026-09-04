import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { BarChart3, Bot, CheckSquare, ClipboardList, FileSearch, Loader2, MessageSquareText, RefreshCw, Send, Sparkles, WandSparkles } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@codexsun/ui/components/button";
import { MdiTopologyRegion, type MdiTopologyAdapter } from "@codexsun/ui-desk";
import { createAndStartAiTask, listAiTasks } from "./ai-task-api.js";
import { getWorkspace } from "./workspace-api.js";

type LibraryKind = "prompt" | "result" | "task" | "improvement";
type LibraryItem = { id: string; kind: LibraryKind; title: string; content: string; status?: string; updatedAt: string };
const tabs = [{ id: "all", label: "All" }, { id: "prompts", label: "Prompts" }, { id: "results", label: "Results" }, { id: "tasks", label: "Tasks" }, { id: "improvements", label: "Improvements" }] as const;

export function ReviewLibraryPage({ sideCarTarget, topology }: { sideCarTarget?: HTMLElement | null; topology?: MdiTopologyAdapter }) {
  const client = useQueryClient();
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState("");
  const workspace = useQuery({ queryKey: ["zetro-workspace"], queryFn: getWorkspace });
  const tasks = useQuery({ queryKey: ["ai-tasks"], queryFn: listAiTasks, refetchInterval: (query) => query.state.data?.some((task) => task.status === "running") ? 1500 : 5000 });
  const items = useMemo(() => buildItems(workspace.data, tasks.data), [workspace.data, tasks.data]);
  const visible = tab === "all" ? items : items.filter((item) => `${item.kind}s` === tab);
  const chosen = items.filter((item) => selected.has(item.id));
  const action = useMutation({
    mutationFn: ({ mode }: { mode: "consolidate" | "reanalyze" | "skill" | "task" }) => createAndStartAiTask(actionRequest(mode, chosen)),
    onSuccess: (task) => { setNotice(`Task ${task.status.replaceAll("_", " ")} · ${task.title}`); setSelected(new Set()); void client.invalidateQueries({ queryKey: ["ai-tasks"] }); },
  });
  const allVisibleSelected = visible.length > 0 && visible.every((item) => selected.has(item.id));

  function run(mode: "consolidate" | "reanalyze" | "skill" | "task") {
    if (chosen.length) action.mutate({ mode });
  }

  return <MdiTopologyRegion id="zr1" topology={topology} className="flex h-full min-h-0 flex-col bg-background">
    {sideCarTarget && createPortal(<div className="flex h-full flex-col p-3"><p className="px-2 pb-3 text-xs font-semibold text-muted-foreground">ZETRO LIBRARY</p><a className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent" href="/?app=zetro&page=agent"><Bot className="size-4" />Agent chat</a><a aria-current="page" className="flex cursor-pointer items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium" href="/?app=zetro&page=review"><FileSearch className="size-4" />Review library</a><div className="mt-auto rounded-xl border border-border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">Skill changes are saved as reviewable proposals with evidence. Accepted refinements can be versioned and rolled back.</div></div>, sideCarTarget)}
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-3"><div className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary"><FileSearch className="size-4" /></span><div><h1 className="text-sm font-semibold">Review Library</h1><p className="text-xs text-muted-foreground">Review, combine, and improve agent work.</p></div></div><Button variant="ghost" size="icon" className="cursor-pointer" aria-label="Refresh library" title="Refresh library" onClick={() => { void workspace.refetch(); void tasks.refetch(); }}><RefreshCw className="size-4" /></Button></header>

    <MdiTopologyRegion id="zr2" topology={topology} className="shrink-0 border-b border-border px-5 pt-3">
      <div className="flex gap-5" role="tablist" aria-label="Library content types">{tabs.map((item) => <button type="button" role="tab" aria-selected={tab === item.id} className={`cursor-pointer border-b-2 px-1 pb-2 text-sm transition-colors ${tab === item.id ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`} key={item.id} onClick={() => setTab(item.id)}>{item.label}<span className="ml-1.5 text-xs">{item.id === "all" ? items.length : items.filter((entry) => `${entry.kind}s` === item.id).length}</span></button>)}</div>
    </MdiTopologyRegion>

    <MdiTopologyRegion id="zr3" topology={topology} className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-muted/20 px-5 py-2.5">
      <label className="mr-2 flex cursor-pointer items-center gap-2 text-xs"><input type="checkbox" checked={allVisibleSelected} onChange={() => setSelected((current) => { const next = new Set(current); for (const item of visible) allVisibleSelected ? next.delete(item.id) : next.add(item.id); return next; })} />{selected.size ? `${selected.size} selected` : "Select all"}</label>
      <ActionButton disabled={!chosen.length} busy={action.isPending} icon={Sparkles} label="Consolidate & review" onClick={() => run("consolidate")} />
      <ActionButton disabled={!chosen.length} busy={action.isPending} icon={WandSparkles} label="Re-analyze" onClick={() => run("reanalyze")} />
      <ActionButton disabled={!chosen.length} busy={action.isPending} icon={ClipboardList} label="Send to task" onClick={() => run("task")} />
      <ActionButton disabled={!chosen.length} busy={action.isPending} icon={CheckSquare} label="Propose skill update" onClick={() => run("skill")} />
      {action.isPending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
    </MdiTopologyRegion>

    <MdiTopologyRegion id="zr4" topology={topology} className="min-h-0 flex-1 overflow-y-auto p-5">
      {(workspace.isLoading || tasks.isLoading) ? <div className="grid h-40 place-items-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div> : visible.length ? <div className="mx-auto max-w-6xl overflow-hidden rounded-xl border border-border bg-card">
        {visible.map((item) => <label key={item.id} className="grid cursor-pointer grid-cols-[auto_auto_minmax(0,1fr)_auto] items-start gap-3 border-b border-border p-3 last:border-b-0 hover:bg-accent/40">
          <input type="checkbox" className="mt-1" checked={selected.has(item.id)} onChange={() => setSelected((current) => { const next = new Set(current); next.has(item.id) ? next.delete(item.id) : next.add(item.id); return next; })} />
          <KindIcon kind={item.kind} />
          <span className="min-w-0"><span className="block truncate text-sm font-medium">{item.title}</span><span className="mt-1 block line-clamp-2 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{item.content}</span></span>
          <span className="text-right text-[11px] capitalize text-muted-foreground">{item.status ?? item.kind}<br />{new Date(item.updatedAt).toLocaleDateString()}</span>
        </label>)}
      </div> : <div className="grid h-48 place-items-center text-sm text-muted-foreground">No {tab === "all" ? "library items" : tab} available.</div>}
      {(notice || action.error) && <p className={`mx-auto mt-4 max-w-6xl rounded-lg border p-3 text-xs ${action.error ? "border-destructive/30 text-destructive" : "border-border text-muted-foreground"}`} role="status">{action.error?.message ?? notice}</p>}
    </MdiTopologyRegion>
  </MdiTopologyRegion>;
}

function buildItems(workspace?: Awaited<ReturnType<typeof getWorkspace>>, tasks?: Awaited<ReturnType<typeof listAiTasks>>): LibraryItem[] {
  const items: LibraryItem[] = [];
  for (const conversation of workspace?.conversations ?? []) for (const exchange of conversation.exchanges) {
    items.push({ id: `prompt:${exchange.id}`, kind: "prompt", title: conversation.title, content: exchange.prompt, updatedAt: exchange.timestamp ?? conversation.updatedAt });
    items.push({ id: `result:${exchange.id}`, kind: "result", title: `Zetro · ${conversation.title}`, content: exchange.result, updatedAt: exchange.timestamp ?? conversation.updatedAt });
    if (exchange.feedback === "down") items.push({ id: `improvement:${exchange.id}`, kind: "improvement", title: `Review weak response · ${conversation.title}`, content: `Prompt:\n${exchange.prompt}\n\nResponse requiring improvement:\n${exchange.result}`, status: "needs review", updatedAt: exchange.timestamp ?? conversation.updatedAt });
  }
  for (const task of tasks ?? []) {
    items.push({ id: `task:${task.id}`, kind: "task", title: task.title, content: task.workItems.map((item) => `${item.title}: ${item.output ?? item.error ?? item.status}`).join("\n"), status: task.status, updatedAt: task.updatedAt });
    if (task.status === "failed") items.push({ id: `improvement:task:${task.id}`, kind: "improvement", title: `Analyze failed task · ${task.title}`, content: task.workItems.map((item) => `${item.title} [${item.agentId}; ${item.capability}]: ${item.error ?? item.output ?? item.status}`).join("\n"), status: "skill gap", updatedAt: task.updatedAt });
  }
  return items.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function actionRequest(mode: "consolidate" | "reanalyze" | "skill" | "task", items: LibraryItem[]) {
  const evidence = items.map((item, index) => `[${index + 1}] ${item.kind.toUpperCase()} — ${item.title}\n${item.content}`).join("\n\n").slice(0, 6500);
  const instruction = mode === "consolidate" ? "Consolidate the selected evidence, resolve conflicts, review correctness, and return one actionable conclusion with gaps and next steps."
    : mode === "reanalyze" ? "Re-analyze the selected evidence from first principles. Identify faulty assumptions, missed risks, and a better implementation approach."
    : mode === "skill" ? "Create a skill refinement proposal. Include source evidence, repeated pattern, intended scope, risks, evaluation cases, version note, rollback plan, and the exact suggested guidance. Do not edit any skill or rule without human approval."
    : "Turn the selected evidence into an implementation task with acceptance criteria, ordered work, verification, metrics, and explicit limitations.";
  return `${instruction}\n\nSelected evidence:\n${evidence}`.slice(0, 8000);
}

function ActionButton({ busy, disabled, icon: Icon, label, onClick }: { busy: boolean; disabled: boolean; icon: typeof Send; label: string; onClick: () => void }) { return <Button type="button" variant="outline" size="sm" className="h-8 cursor-pointer gap-1.5 text-xs" disabled={busy || disabled} onClick={onClick}><Icon className="size-3.5" />{label}</Button>; }
function KindIcon({ kind }: { kind: LibraryKind }) { const Icon = kind === "prompt" ? MessageSquareText : kind === "result" ? Bot : kind === "improvement" ? WandSparkles : BarChart3; return <span className="mt-0.5 grid size-7 place-items-center rounded-lg bg-muted text-muted-foreground"><Icon className="size-3.5" /></span>; }
