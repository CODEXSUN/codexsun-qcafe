import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import {
  Calendar,
  Check,
  CheckCheck,
  ChevronDown,
  CircleAlert,
  CircleHelp,
  ClipboardList,
  Clock,
  Copy,
  Hash,
  Info,
  Loader2,
  Paperclip,
  Play,
  Send,
  Sparkles,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@codexsun/ui/components/avatar";
import { Button } from "@codexsun/ui/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@codexsun/ui/components/ui/popover";
import { MdiTopologyRegion, type MdiTopologyAdapter } from "@codexsun/ui-desk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AiTask } from "@codexsun/ai-task-contracts";
import { approveTask, createTask, listTasks, startTask } from "./api.js";
import { TaskSideCar } from "./TaskSideCar.js";

export function TaskWorkspace({
  pageId,
  sideCarTarget,
  topology,
}: {
  pageId: string;
  sideCarTarget?: HTMLElement | null;
  topology?: MdiTopologyAdapter;
}) {
  const client = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(pageId || null);
  const [request, setRequest] = useState("");
  const [query, setQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const tasks = useQuery({
    queryKey: ["ai-tasks"],
    queryFn: listTasks,
    refetchInterval: (q) => (q.state.data?.some((t) => t.status === "running") ? 1200 : 5000),
  });

  const refresh = () => client.invalidateQueries({ queryKey: ["ai-tasks"] });

  const create = useMutation({
    mutationFn: createTask,
    onSuccess: (task) => {
      setRequest("");
      setSelectedId(task.id);
      updateUrl(task.id);
      void refresh();
    },
  });

  const start = useMutation({ mutationFn: startTask, onSuccess: refresh });
  const approve = useMutation({ mutationFn: approveTask, onSuccess: refresh });

  useEffect(() => {
    setSelectedId(pageId || null);
  }, [pageId]);

  const selected = tasks.data?.find((task) => task.id === selectedId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.id, selected?.status, selected?.workItems]);

  function handleSelectTask(task: AiTask) {
    setSelectedId(task.id);
    updateUrl(task.id);
  }

  function handleNewTask() {
    setSelectedId(null);
    setRequest("");
    create.reset();
    updateUrl("");
    requestAnimationFrame(() => {
      textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      textareaRef.current?.focus({ preventScroll: true });
    });
  }

  function handleSend(event?: FormEvent) {
    event?.preventDefault();
    const trimmed = request.trim();
    if (trimmed.length < 8 || create.isPending) return;
    create.mutate(trimmed);
  }

  return (
    <section
      aria-label="Task System Workspace"
      className="ito-region relative flex h-full min-h-0 flex-col bg-background"
      {...topology?.regionProps("t1")}
    >
      {topology?.marker("t1")}

      {sideCarTarget &&
        createPortal(
          <TaskSideCar
            activeId={selected?.id}
            busy={create.isPending}
            onNewTask={handleNewTask}
            onQuery={setQuery}
            onSelect={handleSelectTask}
            query={query}
            tasks={tasks.data ?? []}
            topology={topology}
          />,
          sideCarTarget,
        )}

      <TaskHeader
        busy={start.isPending || approve.isPending}
        onApprove={() => selected && approve.mutate(selected.id)}
        onStart={() => selected && start.mutate(selected.id)}
        task={selected}
        topology={topology}
      />

      <MdiTopologyRegion
        id="t3"
        topology={topology}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6"
      >
        <div className="mx-auto w-full md:w-[75%] space-y-4">
          {selected ? (
            <TaskTranscript
              busy={start.isPending || approve.isPending}
              onApprove={() => approve.mutate(selected.id)}
              onStart={() => start.mutate(selected.id)}
              task={selected}
            />
          ) : <TaskWelcomeState />}
          <div ref={bottomRef} />
        </div>
      </MdiTopologyRegion>

      <MdiTopologyRegion id="t4" topology={topology} className="shrink-0 bg-background p-4">
        <form
          onSubmit={handleSend}
          className="mx-auto w-full md:w-[75%] rounded-xl border border-input bg-card p-3 shadow-sm"
        >
          <MdiTopologyRegion id="t4.1" topology={topology}>
            <textarea
              ref={textareaRef}
              aria-label="New task request"
              maxLength={8000}
              disabled={create.isPending}
              className="min-h-20 w-full resize-none bg-transparent p-2 text-sm border-0 shadow-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder={
                selected
                  ? "Describe a new task outcome or follow-up instruction (min 8 chars)..."
                  : "Describe the outcome you want agents to achieve (min 8 chars)..."
              }
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
            />
          </MdiTopologyRegion>

          {create.error && (
            <p role="alert" className="px-2 pt-1 text-xs text-destructive">
              {create.error.message}
            </p>
          )}

          <div className="flex items-center justify-between gap-3 px-1 pt-2">
            <MdiTopologyRegion id="t4.2" topology={topology} className="flex items-center gap-1">
              <ComposerTool icon={Sparkles} label="AI refinement & planning" />
              <ComposerTool icon={Paperclip} label="Attach context" />
              <ComposerTool icon={Hash} label="Capability requirements" />
              <ComposerTool icon={CircleHelp} label="Task instructions help" />
            </MdiTopologyRegion>

            <MdiTopologyRegion id="t4.3" topology={topology}>
              <Button
                type="submit"
                aria-label="Refine and plan task"
                disabled={create.isPending || request.trim().length < 8}
                className="rounded-full bg-muted text-muted-foreground shadow-none hover:bg-muted enabled:bg-foreground enabled:text-background enabled:hover:bg-foreground/90 cursor-pointer"
                size="icon"
                title="Refine and plan task"
              >
                {create.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </MdiTopologyRegion>
          </div>
        </form>
      </MdiTopologyRegion>
    </section>
  );
}

function TaskHeader({
  task,
  busy,
  onStart,
  onApprove,
  topology,
}: {
  task?: AiTask;
  busy: boolean;
  onStart: () => void;
  onApprove: () => void;
  topology?: MdiTopologyAdapter;
}) {
  const isCompleted = task?.status === "completed";
  const isRunning = task?.status === "running";
  const isAwaiting = task?.status === "awaiting_review";
  const isFailed = task?.status === "failed";
  const completedSteps = task?.workItems.filter((i) => i.status === "completed").length ?? 0;

  return (
    <header className="ito-region relative flex items-center justify-between gap-4 border-b border-border bg-background px-5 py-2">
      <MdiTopologyRegion id="t1.1" topology={topology} className="flex min-w-0 items-center gap-3">
        <div className="relative">
          <Avatar className="size-8 border border-border bg-muted">
            <AvatarFallback className="text-xs font-medium">
              <ClipboardList className="size-4 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          <span
            aria-label={task?.status ?? "Ready"}
            className={`absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-background ${
              isCompleted
                ? "bg-emerald-500"
                : isRunning
                ? "bg-sky-500 animate-pulse"
                : isAwaiting
                ? "bg-amber-500"
                : isFailed
                ? "bg-destructive"
                : "bg-muted-foreground/60"
            }`}
          />
        </div>
        <div className="flex min-w-0 items-center gap-2.5 text-xs">
          <h1 className="truncate text-sm font-semibold leading-none text-foreground">
            {task?.title ?? "Task System"}
          </h1>
          <span className="text-muted-foreground/40">·</span>
          <span
            role="status"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground"
          >
            <span
              className={`size-2 rounded-full ${
                isCompleted
                  ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]"
                  : isRunning
                  ? "bg-sky-500 animate-pulse"
                  : isAwaiting
                  ? "bg-amber-500"
                  : isFailed
                  ? "bg-destructive"
                  : "bg-muted-foreground/60"
              }`}
            />
            <span className="capitalize">{task ? task.status.replace("_", " ") : "Ready"}</span>
          </span>
          {task && (
            <>
              <span className="text-muted-foreground/40 hidden sm:inline">·</span>
              <span className="truncate text-muted-foreground hidden sm:inline text-[11px]">
                {completedSteps}/{task.workItems.length} steps
              </span>
            </>
          )}
        </div>
      </MdiTopologyRegion>

      <MdiTopologyRegion id="t1.2" topology={topology} className="flex shrink-0 items-center gap-2">
        {task && ["planned", "failed"].includes(task.status) && (
          <Button
            size="sm"
            disabled={busy}
            onClick={onStart}
            className="h-8 gap-1.5 rounded-full cursor-pointer text-xs"
          >
            <Play className="size-3.5" />
            Start agents
          </Button>
        )}
        {task && task.status === "awaiting_review" && (
          <Button
            size="sm"
            disabled={busy}
            onClick={onApprove}
            className="h-8 gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer text-xs"
          >
            <Check className="size-3.5" />
            Approve completion
          </Button>
        )}

        {task && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="size-8 rounded-full border-border bg-background hover:bg-accent cursor-pointer"
                title="Task details"
                aria-label="Task details"
              >
                <Info className="size-4 text-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 rounded-2xl border border-border p-4 shadow-lg bg-background">
              <h3 className="text-sm font-semibold mb-2">Task Details</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium capitalize text-foreground">{task.status.replace("_", " ")}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Work Items</span>
                  <span className="text-foreground">{task.workItems.length} planned steps</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Created</span>
                  <span className="text-foreground">{new Date(task.createdAt).toLocaleString()}</span>
                </div>
                <div className="py-1">
                  <span className="text-muted-foreground block mb-1">Objective</span>
                  <p className="text-foreground font-normal leading-relaxed">{task.objective}</p>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </MdiTopologyRegion>
    </header>
  );
}

function TaskTranscript({
  task,
  busy,
  onStart,
  onApprove,
}: {
  task: AiTask;
  busy: boolean;
  onStart: () => void;
  onApprove: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopyPrompt() {
    void navigator.clipboard.writeText(task.refinedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6 py-2">
      {/* Date Divider */}
      <div className="relative my-6 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-border/60" />
        </div>
        <div className="relative flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-2xs">
          <Calendar className="size-3 text-muted-foreground" />
          <span>
            {new Date(task.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>
      </div>

      {/* Bubble 1: Outgoing User Request */}
      <div className="flex flex-col items-end ml-auto max-w-[75%] w-fit py-1.5">
        <div className="flex items-center gap-1.5 mb-2 px-1.5 text-[11px] text-muted-foreground">
          <span className="font-medium">You</span>
          <span>·</span>
          <span>{formatConversationTime(task.createdAt)}</span>
        </div>
        <article className="rounded-2xl rounded-tr-xs border border-border/60 bg-card text-foreground px-6 py-4 sm:px-7 sm:py-5 shadow-2xs">
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{task.request}</p>
        </article>
        <div className="mt-2 flex items-center justify-end gap-1.5 px-1.5 text-[10px] text-muted-foreground">
          <span>{formatMessageTimestamp(task.createdAt)}</span>
          {task.status === "completed" ? (
            <span title="Completed" className="inline-flex items-center gap-1 font-medium text-blue-500">
              <CheckCheck className="size-3 text-blue-500 shrink-0" />
              <span>Completed</span>
            </span>
          ) : task.status === "failed" ? (
            <span title="Failed" className="inline-flex items-center gap-1 font-medium text-destructive">
              <CircleAlert className="size-3 text-destructive shrink-0" />
              <span>Failed</span>
            </span>
          ) : (
            <span title="Processed" className="inline-flex items-center gap-1 text-muted-foreground">
              <CheckCheck className="size-3 text-muted-foreground/75 shrink-0" />
              <span>Processed</span>
            </span>
          )}
        </div>
      </div>

      {/* Bubble 2: Task Plan & Machine-Ready Prompt */}
      <div className="flex flex-col items-start mr-auto max-w-[75%] w-fit py-1.5">
        <div className="flex items-center gap-1.5 mb-1.5 px-1 text-[11px] text-muted-foreground">
          <span className="font-medium">Task Coordinator (Zetro)</span>
          <span>·</span>
          <span>{formatConversationTime(task.createdAt)}</span>
        </div>
        <article className="rounded-2xl rounded-tl-xs border border-border/50 bg-muted/60 text-foreground px-5 py-4 sm:px-6 sm:py-5 shadow-2xs space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{task.title}</h3>
            <p className="pt-1 text-xs leading-relaxed text-muted-foreground">{task.objective}</p>
          </div>

          <details className="group rounded-xl border border-border/60 bg-background/80 p-3 text-xs">
            <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-foreground/85">
              <span className="flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-primary" />
                <span>Machine-ready request</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyPrompt();
                  }}
                  className="size-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Copy machine prompt"
                >
                  <Copy className="size-3" />
                </button>
                <ChevronDown className="size-3.5 text-muted-foreground transition-transform group-open:rotate-180" />
              </div>
            </summary>
            <p className="mt-2.5 whitespace-pre-wrap font-sans text-xs text-muted-foreground leading-relaxed">
              {task.refinedPrompt}
            </p>
            {copied && <span className="pt-1 text-[10px] text-emerald-600 font-medium block">Copied to clipboard!</span>}
          </details>

          <div className="space-y-1.5 pt-1">
            <span className="text-xs font-semibold text-foreground/80">Acceptance Criteria</span>
            <ul className="grid gap-1.5 text-xs text-muted-foreground">
              {task.acceptanceCriteria.map((criterion, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Check className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{criterion}</span>
                </li>
              ))}
            </ul>
          </div>
        </article>
      </div>

      {/* Bubbles 3...N: Agent Sequence Steps */}
      {task.workItems.map((item) => (
        <div key={item.id} className="flex flex-col items-start mr-auto max-w-[85%] w-fit">
          <div className="flex items-center gap-1.5 mb-1.5 px-1 text-[11px] text-muted-foreground">
            <span className="font-medium">{item.agentId}</span>
            <span>·</span>
            <span>{item.capability}</span>
            <span>·</span>
            <span>Step {item.order + 1} of {task.workItems.length}</span>
          </div>
          <article className="rounded-2xl rounded-tl-xs border border-border/50 bg-card text-foreground px-5 py-4 sm:px-6 sm:py-4 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {item.status === "completed" && <CheckCheck className="size-4 text-emerald-500 shrink-0" />}
                {item.status === "running" && <Loader2 className="size-4 text-sky-500 animate-spin shrink-0" />}
                {item.status === "failed" && <CircleAlert className="size-4 text-destructive shrink-0" />}
                {item.status === "ready" && <Clock className="size-4 text-muted-foreground shrink-0" />}
                <h4 className="text-sm font-medium text-foreground">{item.title}</h4>
              </div>
              <span
                className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                  item.status === "completed"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : item.status === "running"
                    ? "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                    : item.status === "failed"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {item.status}
              </span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">{item.instruction}</p>

            {item.output && (
              <div className="mt-2 rounded-xl bg-muted/60 p-3 font-mono text-xs text-foreground border border-border/40 whitespace-pre-wrap max-h-80 overflow-y-auto leading-relaxed">
                {item.output}
              </div>
            )}

            {item.error && (
              <div className="mt-2 rounded-xl bg-destructive/10 text-destructive p-3 text-xs border border-destructive/20">
                {item.error}
              </div>
            )}
          </article>
        </div>
      ))}

      {/* Action Banners */}
      {task.status === "awaiting_review" && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div>
            <h4 className="text-sm font-medium text-foreground">Execution finished · Ready for review</h4>
            <p className="text-xs text-muted-foreground pt-0.5">
              Verify the outputs against acceptance criteria above before approving.
            </p>
          </div>
          <Button
            onClick={onApprove}
            disabled={busy}
            className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer text-xs gap-1.5"
          >
            <Check className="size-3.5" />
            Approve completion
          </Button>
        </div>
      )}

      {task.status === "completed" && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 flex items-center gap-3 text-emerald-700 dark:text-emerald-400 shadow-xs">
          <CheckCheck className="size-5 shrink-0" />
          <div>
            <h4 className="text-sm font-medium">Task verified and completed</h4>
            <p className="text-xs opacity-90 pt-0.5">All work items satisfied stated acceptance criteria.</p>
          </div>
        </div>
      )}

      {["planned", "failed"].includes(task.status) && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div>
            <h4 className="text-sm font-medium text-foreground">
              {task.status === "failed" ? "Execution stopped on failure" : "Execution plan ready"}
            </h4>
            <p className="text-xs text-muted-foreground pt-0.5">
              {task.status === "failed"
                ? "Retry the agent sequence from the failed step."
                : "Trigger autonomous agent sequence through the execution worker."}
            </p>
          </div>
          <Button
            onClick={onStart}
            disabled={busy}
            className="rounded-full cursor-pointer text-xs gap-1.5"
          >
            <Play className="size-3.5" />
            Start agents
          </Button>
        </div>
      )}
    </div>
  );
}

function TaskWelcomeState() {
  return (
    <div className="grid min-h-[50vh] place-content-center gap-3 py-12 text-center">
      <div className="mx-auto size-12 rounded-2xl bg-muted border border-border flex items-center justify-center text-primary">
        <ClipboardList className="size-6" />
      </div>
      <h2 className="text-xl font-semibold text-foreground">Task System</h2>
    </div>
  );
}

function ComposerTool({ icon: Icon, label }: { icon: typeof Paperclip; label: string }) {
  return (
    <Button
      aria-label={label}
      className="text-muted-foreground cursor-pointer"
      size="icon"
      title={label}
      type="button"
      variant="ghost"
    >
      <Icon aria-hidden="true" className="size-4" />
    </Button>
  );
}

function updateUrl(id: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("app", "ai-tasks");
  if (id) {
    url.searchParams.set("page", id);
  } else {
    url.searchParams.delete("page");
  }
  window.history.replaceState(null, "", url.toString());
}

function formatConversationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatMessageTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = date.toLocaleDateString([], { day: "2-digit", month: "short" });
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).toLowerCase();
  return `${day} - ${time}`;
}
