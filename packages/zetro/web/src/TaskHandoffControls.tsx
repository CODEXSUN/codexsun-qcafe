import { useEffect, useRef, useState } from "react";
import { BarChart3, CheckCircle2, ClipboardCheck, Eye, Loader2, MessagesSquare, Play, RefreshCw, Rocket, Send, ShieldCheck, Wrench } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@codexsun/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@codexsun/ui/components/ui/dialog";
import { AI_TASK_NAVIGATE_EVENT, type AiTaskNavigateDetail } from "@codexsun/ai-task-contracts";
import { approveAiTask, createAndStartAiTask, createZetroTaskSource, getAiTask, prepareTaskRelease } from "./ai-task-api.js";
import { zetroNotifications } from "./notifications.js";

export function TaskHandoffControls({ chatReview, conversationId, exchangeId, prompt, response, taskId, workCaseId, onTaskCreated }: { chatReview: string; conversationId: string; exchangeId: string; prompt: string; response: string; taskId?: string; workCaseId?: string; onTaskCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [reviewMode, setReviewMode] = useState<"prompt" | "chat">("prompt");
  const [taskRequest, setTaskRequest] = useState(() => composeTaskRequest(prompt, response, chatReview));
  const task = useQuery({ queryKey: ["zetro-linked-task", taskId], queryFn: () => getAiTask(taskId!), enabled: Boolean(taskId), refetchInterval: (query) => ["running", "planned"].includes(query.state.data?.status ?? "") ? 1500 : false });
  const send = useMutation({
    mutationFn: createAndStartAiTask,
    onSuccess: (created) => {
      onTaskCreated(created.id);
      setOpen(false);
      zetroNotifications.success("Task sent and started", { description: created.title });
    },
    onError: (cause) => zetroNotifications.error(cause, "Unable to start the task."),
  });

  async function refreshTask() {
    const result = await task.refetch();
    if (result.error) {
      zetroNotifications.error(result.error, "Unable to refresh task status.");
      return;
    }
    zetroNotifications.info("Task status refreshed", { description: result.data?.status.replaceAll("_", " ") });
  }

  function show(mode: "prompt" | "chat") {
    setReviewMode(mode);
    setTaskRequest(composeTaskRequest(prompt, response, chatReview));
    setOpen(true);
  }

  return <>
    <Button type="button" variant="ghost" size="icon" className="size-7 cursor-pointer hover:text-foreground" aria-label="Review prompt" title="Review prompt" onClick={() => show("prompt")}><Eye className="size-3.5" /></Button>
    <Button type="button" variant="ghost" size="icon" className="size-7 cursor-pointer hover:text-foreground" aria-label="Review chat" title="Review chat" onClick={() => show("chat")}><MessagesSquare className="size-3.5" /></Button>
    <Button type="button" variant="ghost" size="icon" className="size-7 cursor-pointer hover:text-foreground" aria-label="Send to Task System" title="Send to Task System" disabled={send.isPending || Boolean(taskId)} onClick={() => show("prompt")}><Send className="size-3.5" /></Button>
    {taskId && <Button type="button" variant="ghost" size="icon" className="size-7 cursor-pointer hover:text-foreground" aria-label="Check task status" title="Check task status" disabled={task.isFetching} onClick={() => void refreshTask()}>{task.isFetching ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}</Button>}

    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><ClipboardCheck className="size-4" />Review task handoff</DialogTitle><DialogDescription>Confirm the conclusion and context before Zetro starts agent work.</DialogDescription></DialogHeader>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <Button type="button" size="sm" variant={reviewMode === "prompt" ? "secondary" : "ghost"} className="flex-1 cursor-pointer gap-2" onClick={() => setReviewMode("prompt")}><Eye className="size-3.5" />Review prompt</Button>
          <Button type="button" size="sm" variant={reviewMode === "chat" ? "secondary" : "ghost"} className="flex-1 cursor-pointer gap-2" onClick={() => setReviewMode("chat")}><MessagesSquare className="size-3.5" />Review chat</Button>
        </div>
        {reviewMode === "prompt" ? <textarea aria-label="Task request" className="min-h-64 w-full resize-y rounded-xl border border-input bg-background p-3 text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring" maxLength={8000} value={taskRequest} onChange={(event) => setTaskRequest(event.target.value)} /> : <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-muted/30 p-3 text-xs leading-5">{chatReview || "No earlier chat context."}</pre>}
        {send.error && <p className="text-sm text-destructive" role="alert">{send.error.message}</p>}
        <DialogFooter><Button type="button" variant="outline" className="cursor-pointer" onClick={() => setOpen(false)}>Cancel</Button><Button type="button" className="cursor-pointer gap-2" disabled={send.isPending || taskRequest.trim().length < 8} onClick={() => send.mutate({ requestText: taskRequest.trim(), workCaseId, source: createZetroTaskSource({ subject: prompt, conversationId, exchangeId }) })}>{send.isPending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}Send and start task</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}

export function TaskHandoffResult({ taskId }: { taskId?: string }) {
  const task = useQuery({ queryKey: ["zetro-linked-task", taskId], queryFn: () => getAiTask(taskId!), enabled: Boolean(taskId), refetchInterval: (query) => ["running", "planned"].includes(query.state.data?.status ?? "") ? 1500 : false });
  const [approvalOpen, setApprovalOpen] = useState(false);
  const previousStatus = useRef<string | undefined>(undefined);
  useEffect(() => {
    const status = task.data?.status;
    if (!status || previousStatus.current === status) return;
    previousStatus.current = status;
    if (status === "awaiting_review") {
      setApprovalOpen(true);
      zetroNotifications.warning("Task is waiting for approval", { description: task.data?.title });
    } else if (status === "completed") {
      zetroNotifications.success("Task completed", { description: task.data?.title });
    } else if (status === "failed") {
      zetroNotifications.error(new Error("Agent execution stopped."), task.data?.title ?? "Task failed.");
    }
  }, [task.data?.status, task.data?.title]);
  if (!taskId) return null;
  return <>
    {task.data && <TaskResult task={task.data} />}
    {task.error && <p className="mt-2 text-xs text-destructive" role="alert">{task.error.message}</p>}
    <Dialog open={approvalOpen} onOpenChange={setApprovalOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Task waiting for approval</DialogTitle><DialogDescription>{task.data?.title ?? "Agent work is ready."} Review the returned evidence before allowing completion.</DialogDescription></DialogHeader>
        <DialogFooter><Button type="button" variant="outline" className="cursor-pointer" onClick={() => setApprovalOpen(false)}>Later</Button><Button type="button" className="cursor-pointer" onClick={() => { setApprovalOpen(false); openTaskSystem(taskId); }}>Review in Task System</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}

function TaskResult({ task }: { task: Awaited<ReturnType<typeof getAiTask>> }) {
  const client = useQueryClient();
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [projectKey, setProjectKey] = useState("codexsun-os");
  const [repository, setRepository] = useState("");
  const approve = useMutation({
    mutationFn: () => approveAiTask(task.id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["zetro-linked-task", task.id] });
      zetroNotifications.success("Task evidence approved");
    },
    onError: (cause) => zetroNotifications.error(cause, "Unable to approve task evidence."),
  });
  const release = useMutation({
    mutationFn: () => prepareTaskRelease({ taskId: task.id, projectKey: projectKey.trim(), repository }),
    onSuccess: (prepared) => {
      setReleaseOpen(false);
      zetroNotifications.success("Orship release prepared", { description: prepared.id });
    },
    onError: (cause) => zetroNotifications.error(cause, "Unable to prepare the Orship release."),
  });
  const completed = task.workItems.filter((item) => item.status === "completed");
  const agents = [...new Set(task.workItems.map((item) => item.agentId))];
  const capabilities = [...new Set(task.workItems.map((item) => item.capability))];
  const skills = [...new Set(task.workItems.flatMap((item) => item.skills ?? []))];
  const duration = Math.max(0, new Date(task.updatedAt).getTime() - new Date(task.createdAt).getTime());
  return <div className="mt-3 space-y-2 rounded-xl border border-border bg-muted/20 p-3 text-xs">
    <div className="flex flex-wrap items-center justify-between gap-2"><span className="flex items-center gap-1.5 font-semibold"><CheckCircle2 className={`size-4 ${task.status === "completed" ? "text-emerald-600" : "text-primary"}`} />Task System · {task.status.replaceAll("_", " ")}</span><span>{completed.length}/{task.workItems.length} steps</span></div>
    <div className="grid gap-2 text-muted-foreground sm:grid-cols-3"><span className="flex items-center gap-1"><BarChart3 className="size-3.5" />{formatDuration(duration)}</span><span className="flex items-center gap-1"><Wrench className="size-3.5" />{agents.length} agent{agents.length === 1 ? "" : "s"}</span><span>{capabilities.join(", ")}</span></div>
    {skills.length > 0 && <p className="text-muted-foreground"><span className="font-medium text-foreground">Skills:</span> {skills.join(", ")}</p>}
    {completed.map((item) => <details key={item.id} className="rounded-lg border border-border/70 bg-background p-2"><summary className="cursor-pointer font-medium">{item.title} · {item.agentId}</summary><p className="mt-2 whitespace-pre-wrap leading-5 text-muted-foreground">{item.output ?? "No result was reported."}</p></details>)}
    <div className="flex flex-wrap gap-2 pt-1">
      {task.status === "awaiting_review" && <Button type="button" size="sm" variant="outline" className="h-8 cursor-pointer gap-1.5 text-xs" disabled={approve.isPending} onClick={() => approve.mutate()}>{approve.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}Approve evidence</Button>}
      {task.status === "completed" && <Button type="button" size="sm" variant="outline" className="h-8 cursor-pointer gap-1.5 text-xs" onClick={() => setReleaseOpen(true)}><Rocket className="size-3.5" />Prepare release</Button>}
    </div>
    {(approve.error || release.error) && <p className="text-destructive" role="alert">{approve.error?.message ?? release.error?.message}</p>}
    {release.data && <p className="text-muted-foreground">Orship release prepared: {release.data.id}</p>}
    <Dialog open={releaseOpen} onOpenChange={setReleaseOpen}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Prepare Orship release</DialogTitle><DialogDescription>This creates an approval-required release record. It does not publish or deploy.</DialogDescription></DialogHeader><label className="space-y-1.5"><span className="text-xs font-medium">Project key</span><input className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={projectKey} onChange={(event) => setProjectKey(event.target.value)} /></label><label className="space-y-1.5"><span className="text-xs font-medium">Repository path or URL (optional)</span><input className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={repository} onChange={(event) => setRepository(event.target.value)} /></label><DialogFooter><Button type="button" variant="outline" className="cursor-pointer" onClick={() => setReleaseOpen(false)}>Cancel</Button><Button type="button" className="cursor-pointer gap-2" disabled={release.isPending || projectKey.trim().length < 2} onClick={() => release.mutate()}>{release.isPending ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}Create release record</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

function composeTaskRequest(prompt: string, response: string, chat: string) {
  return `Requested outcome:\n${prompt}\n\nZetro discussion conclusion:\n${response}\n\nRelevant discussion context:\n${chat || "No earlier discussion."}\n\nExecution requirements:\n- Review the supplied conclusion before implementation.\n- Use only assigned skills and isolated tools.\n- Return work results, evidence, limitations, agents used, and measurable completion details.`.slice(0, 8000);
}

function formatDuration(milliseconds: number) {
  if (milliseconds < 1000) return `${milliseconds} ms`;
  const seconds = Math.round(milliseconds / 1000);
  return seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function openTaskSystem(taskId: string) {
  window.dispatchEvent(new CustomEvent<AiTaskNavigateDetail>(AI_TASK_NAVIGATE_EVENT, { detail: { taskId } }));
}
