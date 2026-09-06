import { ArrowLeft, CheckCircle2, ClipboardCopy, ExternalLink, PackageCheck, TerminalSquare } from "lucide-react";
import { Button } from "@codexsun/ui/components/button";
import type { MdiTopologyAdapter } from "@codexsun/ui-desk";

type ReleaseTask = {
  id: "commit-push" | "build-publish";
  title: string;
  summary: string;
  command: string;
  prerequisites: string[];
  result: string;
};

const TASKS: ReleaseTask[] = [
  {
    id: "commit-push",
    title: "1. Commit and push Q Cafe source",
    summary: "Review the changelog and source, then create the versioned commit and push it to GitHub.",
    command: "npm.cmd run github:now",
    prerequisites: ["Review the working tree and short Q Cafe changelog.", "Confirm the version and commit subject in the interactive review."],
    result: "The reviewed source commit is on the tracked Git branch.",
  },
  {
    id: "build-publish",
    title: "2. Build and publish Q Cafe update",
    summary: "Validate source, build Windows installers, generate checksums and qcafe-update.json, then publish the Git tag and GitHub release.",
    command: "npm.cmd run release:q-cafe -- --publish",
    prerequisites: ["Task 1 completed and the source tree is clean.", "GitHub CLI is authenticated for CODEXSUN/codexsun."],
    result: "GitHub has v-<version>, release notes, installers, checksums, and qcafe-update.json.",
  },
];

export function QcafeReleaseTasks({ taskId, onSelect, topology }: { taskId?: string; onSelect: (id?: string) => void; topology?: MdiTopologyAdapter }) {
  const selected = TASKS.find(task => task.id === taskId);
  return selected ? <TaskAction task={selected} onBack={() => onSelect()} topology={topology} /> : <TaskList onSelect={onSelect} topology={topology} />;
}

function TaskList({ onSelect, topology }: { onSelect: (id: string) => void; topology?: MdiTopologyAdapter }) {
  return <main className="mx-auto flex h-full w-full max-w-5xl flex-col gap-6 overflow-y-auto bg-background px-5 py-8 text-foreground sm:px-8" {...topology?.regionProps("o5")}>
    {topology?.marker("o5")}
    <header><p className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">Q Cafe release</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Release tasks</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Complete the source handoff first, then build and publish the verified desktop update.</p></header>
    <section className="grid gap-4" {...topology?.regionProps("o6")}>
      {topology?.marker("o6")}
      {TASKS.map(task => <button className="group flex cursor-pointer items-start gap-4 rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" key={task.id} onClick={() => onSelect(task.id)} type="button">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-background"><PackageCheck className="size-5" /></span>
        <span className="min-w-0 flex-1"><strong className="text-base">{task.title}</strong><span className="mt-2 block text-sm text-muted-foreground group-hover:text-accent-foreground/70">{task.summary}</span></span><ExternalLink className="mt-1 size-4 shrink-0" />
      </button>)}
    </section>
  </main>;
}

function TaskAction({ task, onBack, topology }: { task: ReleaseTask; onBack: () => void; topology?: MdiTopologyAdapter }) {
  const copy = async () => { await navigator.clipboard.writeText(task.command); };
  return <main className="mx-auto flex h-full w-full max-w-4xl flex-col gap-6 overflow-y-auto bg-background px-5 py-8 text-foreground sm:px-8" {...topology?.regionProps("o7")}>
    {topology?.marker("o7")}
    <Button className="w-fit cursor-pointer" onClick={onBack} variant="ghost"><ArrowLeft className="size-4" />All tasks</Button>
    <header><p className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">Q Cafe release task</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{task.title}</h1><p className="mt-2 text-sm text-muted-foreground">{task.summary}</p></header>
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm"><h2 className="font-semibold">Before you run it</h2><ul className="mt-3 grid gap-2 text-sm text-muted-foreground">{task.prerequisites.map(item => <li className="flex gap-2" key={item}><CheckCircle2 className="mt-0.5 size-4 shrink-0" />{item}</li>)}</ul></section>
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm" {...topology?.regionProps("o8")}>
      {topology?.marker("o8")}
      <div className="flex items-center gap-2"><TerminalSquare className="size-5" /><h2 className="font-semibold">Action command</h2></div>
      <pre className="mt-4 overflow-x-auto rounded-lg bg-muted p-4 text-sm">{task.command}</pre>
      <Button className="mt-4 cursor-pointer" onClick={() => void copy()} variant="outline"><ClipboardCopy className="size-4" />Copy command</Button>
      <p className="mt-4 text-sm text-muted-foreground">Expected result: {task.result}</p>
    </section>
  </main>;
}
