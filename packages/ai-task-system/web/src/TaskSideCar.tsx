import { useState } from "react";
import { CheckCheck, CircleAlert, Clock, Loader2, Plus, Search } from "lucide-react";
import { Button } from "@codexsun/ui/components/button";
import { MdiTopologyRegion, type MdiTopologyAdapter } from "@codexsun/ui-desk";
import type { AiTask } from "@codexsun/ai-task-contracts";

export function TaskSideCar({
  activeId,
  busy = false,
  onNewTask,
  onQuery,
  onSelect,
  query,
  tasks,
  topology,
}: {
  activeId?: string;
  busy?: boolean;
  onNewTask: () => void;
  onQuery: (value: string) => void;
  onSelect: (task: AiTask) => void;
  query: string;
  tasks: AiTask[];
  topology?: MdiTopologyAdapter;
}) {
  const [filter, setFilter] = useState<"all" | "completed">("all");

  const visibleTasks = tasks
    .filter((task) => (filter === "completed" ? task.status === "completed" : task.status !== "completed"))
    .filter((task) => `${task.title} ${task.objective} ${task.status}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));

  return (
    <aside
      aria-label="Task System"
      className="ito-region relative flex h-full min-h-0 flex-col bg-background"
      {...topology?.regionProps("t2")}
    >
      {topology?.marker("t2")}
      <div className="flex items-center justify-between border-b border-border px-4 py-4">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Task System</h2>
        <MdiTopologyRegion id="t2.2" topology={topology}><Button
          aria-label="New task"
          className="size-8 rounded-full cursor-pointer"
          disabled={busy}
          onClick={onNewTask}
          size="icon"
          title="New task"
          variant="outline"
        >
          <Plus className="size-4" />
        </Button></MdiTopologyRegion>
      </div>

      <MdiTopologyRegion id="t2.3" topology={topology} className="px-3 py-3">
        <div className="flex h-9 items-center gap-2 rounded-lg border border-input bg-background px-3 focus-within:ring-1 focus-within:ring-ring">
          <Search aria-hidden="true" className="size-4 text-muted-foreground" />
          <input
            aria-label="Search tasks"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search tasks"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
          />
        </div>
      </MdiTopologyRegion>

      <MdiTopologyRegion id="t2.4" topology={topology} className="flex items-center justify-between px-4 pb-2 text-xs text-muted-foreground">
        <span>{filter === "completed" ? "Completed tasks" : "Active tasks"}</span>
        <Button
          className="h-auto px-1 py-0 text-xs cursor-pointer"
          disabled={busy}
          onClick={() => setFilter(filter === "completed" ? "all" : "completed")}
          title={filter === "completed" ? "Show active tasks" : "Show completed tasks"}
          variant="ghost"
        >
          {filter === "completed" ? "Active" : "Completed"}
        </Button>
      </MdiTopologyRegion>

      <MdiTopologyRegion
        id="t2.1"
        topology={topology}
        className="min-h-0 flex-1 overflow-y-auto p-2 space-y-1.5 border-y border-border"
      >
        {visibleTasks.map((task, index) => (
          <TaskListItem
            active={activeId === task.id}
            busy={busy}
            index={index + 1}
            key={task.id}
            onSelect={onSelect}
            task={task}
          />
        ))}
        {!visibleTasks.length && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            <p>{query ? "No matching tasks found." : "No tasks yet. Create one below."}</p>
          </div>
        )}
      </MdiTopologyRegion>
    </aside>
  );
}

function TaskListItem({
  active,
  busy,
  index,
  onSelect,
  task,
}: {
  active: boolean;
  busy: boolean;
  index: number;
  onSelect: (task: AiTask) => void;
  task: AiTask;
}) {
  const completedSteps = task.workItems.filter((item) => item.status === "completed").length;
  const isRunning = task.status === "running";
  const isCompleted = task.status === "completed";
  const isFailed = task.status === "failed";
  const isAwaiting = task.status === "awaiting_review";
  const taskNumber = index < 10 ? `0${index}` : String(index);

  return (
    <button
      aria-pressed={active}
      className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
        active
          ? "border-border/70 bg-muted/40 text-foreground shadow-2xs"
          : "border-border/25 bg-muted/15 hover:border-border/40 hover:bg-muted/30 text-foreground"
      }`}
      disabled={busy}
      onClick={() => onSelect(task)}
    >
      <div className="relative shrink-0">
        <div
          className={`flex size-9 items-center justify-center rounded-lg border font-mono text-xs font-semibold shadow-2xs transition-colors ${
            active
              ? "border-border/80 bg-background text-foreground"
              : "border-border/50 bg-muted/60 text-muted-foreground"
          }`}
        >
          {taskNumber}
        </div>
        <span
          aria-label={task.status}
          className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background ${
            isCompleted
              ? "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"
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
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <strong className="truncate text-sm font-medium">{task.title}</strong>
          <time className="shrink-0 text-xs text-muted-foreground">
            {formatTaskTime(task.updatedAt)}
          </time>
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground truncate">
          {isCompleted ? (
            <CheckCheck className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : isRunning ? (
            <Loader2 className="size-3.5 text-sky-500 animate-spin shrink-0" />
          ) : isFailed ? (
            <CircleAlert className="size-3.5 text-destructive shrink-0" />
          ) : isAwaiting ? (
            <Clock className="size-3.5 text-amber-500 shrink-0" />
          ) : (
            <Clock className="size-3.5 text-muted-foreground shrink-0" />
          )}
          <span className="truncate">
            {completedSteps}/{task.workItems.length} steps · {task.status.replace("_", " ")}
          </span>
        </span>
      </span>
    </button>
  );
}

function formatTaskTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}
