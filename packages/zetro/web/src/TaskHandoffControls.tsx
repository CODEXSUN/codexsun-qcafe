import { useState } from "react";
import { BarChart3, CheckCircle2, ClipboardCheck, Eye, Loader2, MessagesSquare, Play, RefreshCw, Send, Wrench } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@codexsun/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@codexsun/ui/components/ui/dialog";
import { createAndStartAiTask, getAiTask } from "./ai-task-api.js";

export function TaskHandoffControls({ chatReview, prompt, response, taskId, onTaskCreated }: { chatReview: string; prompt: string; response: string; taskId?: string; onTaskCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [reviewMode, setReviewMode] = useState<"prompt" | "chat">("prompt");
  const [taskRequest, setTaskRequest] = useState(() => composeTaskRequest(prompt, response, chatReview));
  const task = useQuery({ queryKey: ["zetro-linked-task", taskId], queryFn: () => getAiTask(taskId!), enabled: Boolean(taskId), refetchInterval: (query) => ["running", "planned"].includes(query.state.data?.status ?? "") ? 1500 : false });
  const send = useMutation({ mutationFn: createAndStartAiTask, onSuccess: (created) => { onTaskCreated(created.id); setOpen(false); } });

  function show(mode: "prompt" | "chat") {
    setReviewMode(mode);
    setTaskRequest(composeTaskRequest(prompt, response, chatReview));
    setOpen(true);
  }

  return <>
    <div className="flex items-center gap-0.5">
      <Button type="button" variant="ghost" size="icon" className="size-7 cursor-pointer" aria-label="Review prompt" title="Review prompt" onClick={() => show("prompt")}><Eye className="size-3.5" /></Button>
      <Button type="button" variant="ghost" size="icon" className="size-7 cursor-pointer" aria-label="Review chat" title="Review chat" onClick={() => show("chat")}><MessagesSquare className="size-3.5" /></Button>
      <Button type="button" variant="ghost" size="icon" className="size-7 cursor-pointer" aria-label="Send to Task System" title="Send to Task System" disabled={send.isPending || Boolean(taskId)} onClick={() => show("prompt")}><Send className="size-3.5" /></Button>
      {taskId && <Button type="button" variant="ghost" size="icon" className="size-7 cursor-pointer" aria-label="Check task status" title="Check task status" disabled={task.isFetching} onClick={() => void task.refetch()}>{task.isFetching ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}</Button>}
    </div>

    {task.data && <TaskResult task={task.data} />}
    {task.error && <p className="mt-2 text-xs text-destructive" role="alert">{task.error.message}</p>}

    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><ClipboardCheck className="size-4" />Review task handoff</DialogTitle><DialogDescription>Confirm the conclusion and context before Zetro starts agent work.</DialogDescription></DialogHeader>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <Button type="button" size="sm" variant={reviewMode === "prompt" ? "secondary" : "ghost"} className="flex-1 cursor-pointer gap-2" onClick={() => setReviewMode("prompt")}><Eye className="size-3.5" />Review prompt</Button>
          <Button type="button" size="sm" variant={reviewMode === "chat" ? "secondary" : "ghost"} className="flex-1 cursor-pointer gap-2" onClick={() => setReviewMode("chat")}><MessagesSquare className="size-3.5" />Review chat</Button>
        </div>
        {reviewMode === "prompt" ? <textarea aria-label="Task request" className="min-h-64 w-full resize-y rounded-xl border border-input bg-background p-3 text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring" maxLength={8000} value={taskRequest} onChange={(event) => setTaskRequest(event.target.value)} /> : <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-muted/30 p-3 text-xs leading-5">{chatReview || "No earlier chat context."}</pre>}
        {send.error && <p className="text-sm text-destructive" role="alert">{send.error.message}</p>}
        <DialogFooter><Button type="button" variant="outline" className="cursor-pointer" onClick={() => setOpen(false)}>Cancel</Button><Button type="button" className="cursor-pointer gap-2" disabled={send.isPending || taskRequest.trim().length < 8} onClick={() => send.mutate(taskRequest.trim())}>{send.isPending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}Send and start task</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}

function TaskResult({ task }: { task: Awaited<ReturnType<typeof getAiTask>> }) {
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
