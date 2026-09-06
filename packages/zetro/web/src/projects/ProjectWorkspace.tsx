import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, ClipboardCheck, FolderKanban, GitBranch, MessageSquare, Plus, Star } from "lucide-react";
import { createPortal } from "react-dom";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@codexsun/ui/components/button";
import { Input } from "@codexsun/ui/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@codexsun/ui/components/ui/popover";
import { MdiTopologyRegion, type MdiTopologyAdapter } from "@codexsun/ui-desk";
import { DEFAULT_PROJECTS, loadConversations, loadProjects, saveProjects, type Conversation, type Project } from "../conversations.js";
import { getWorkspace, saveProject } from "../workspace-api.js";
import { zetroNotifications } from "../notifications.js";

type ProjectTab = "overview" | "conversations" | "tasks" | "reviews" | "context";

const tabs: Array<{ id: ProjectTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "conversations", label: "Conversations" },
  { id: "tasks", label: "Tasks" },
  { id: "reviews", label: "Reviews" },
  { id: "context", label: "Context" },
];

const projectColors = {
  slate: "bg-slate-700 text-white",
  violet: "bg-violet-700 text-white",
  amber: "bg-amber-700 text-white",
  blue: "bg-blue-700 text-white",
  rose: "bg-rose-700 text-white",
} as const;

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "PR";
}

function timeLabel(value?: string) {
  if (!value) return "No activity yet";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "No activity yet" : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ZetroProjectsWorkspace({ topology, sideCarTarget }: { topology?: MdiTopologyAdapter; sideCarTarget?: HTMLElement | null }) {
  const queryClient = useQueryClient();
  const workspace = useQuery({ queryKey: ["zetro-workspace"], queryFn: getWorkspace });
  const [localWorkspace, setLocalWorkspace] = useState<{ projects: Project[]; conversations: Conversation[] }>(() => {
    try {
      return { projects: loadProjects(localStorage), conversations: loadConversations(localStorage) };
    } catch {
      return { projects: DEFAULT_PROJECTS, conversations: [] };
    }
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProjectTab>("overview");
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [projectNumber, setProjectNumber] = useState("");
  const [icon, setIcon] = useState("");
  const [color, setColor] = useState<Project["color"]>("slate");
  const [description, setDescription] = useState("");
  const [gitRepositoryUrl, setGitRepositoryUrl] = useState("");
  const [localFolder, setLocalFolder] = useState("");
  const [status, setStatus] = useState<NonNullable<Project["status"]>>("planning");

  const source = workspace.data ?? localWorkspace;
  const projects = useMemo(() => source.projects.filter((project) => project.kind !== "addon"), [source.projects]);
  const selected = projects.find((project) => project.id === selectedId) ?? null;
  const createProject = useMutation({
    mutationFn: async (project: Project) => {
      if (workspace.isError) {
        setLocalWorkspace((current) => {
          const next = { ...current, projects: [...current.projects, project] };
          saveProjects(localStorage, next.projects);
          return next;
        });
        return project;
      }
      return saveProject(project);
    },
    onSuccess: async (_savedProject, project) => {
      await queryClient.invalidateQueries({ queryKey: ["zetro-workspace"] });
      setSelectedId(project.id);
      setActiveTab("overview");
      setCreateOpen(false);
      setName("");
      setProjectNumber("");
      setIcon("");
      setColor("slate");
      setDescription("");
      setGitRepositoryUrl("");
      setLocalFolder("");
      setStatus("planning");
      zetroNotifications.success("Project created", { description: project.name });
    },
    onError: (cause) => zetroNotifications.error(cause, "Unable to create the project."),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    createProject.mutate({
      id: crypto.randomUUID(),
      name: trimmedName,
      projectNumber: projectNumber.trim() || nextProjectNumber(projects),
      icon: icon.trim().toUpperCase() || initials(trimmedName),
      color,
      description: description.trim() || undefined,
      gitRepositoryUrl: gitRepositoryUrl.trim() || undefined,
      localFolder: localFolder.trim() || undefined,
      status,
      createdAt: new Date().toISOString(),
      kind: "project",
    });
  }

  const sideCar = sideCarTarget ? createPortal(
    <MdiTopologyRegion topology={topology} id="zp2" className="flex h-full min-h-0 flex-col p-3">
      <div className="mb-3 px-1 text-xs font-medium text-muted-foreground">Zetro projects</div>
      <div className="min-h-0 space-y-1 overflow-y-auto">
        {projects.map((project) => <button key={project.id} type="button" onClick={() => { setSelectedId(project.id); setActiveTab("overview"); }} className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors ${selectedId === project.id ? "bg-accent text-accent-foreground" : "hover:bg-accent/70"}`}>
          <span className="flex size-6 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-semibold text-foreground">{initials(project.name)}</span>
          <span className="min-w-0 truncate">{project.name}</span>
        </button>)}
        {!projects.length && <p className="px-2 py-3 text-xs text-muted-foreground">No projects yet.</p>}
      </div>
      <Button type="button" variant="outline" size="sm" className="mt-3 w-full" onClick={() => setCreateOpen(true)}><Plus className="size-3.5" />New project</Button>
    </MdiTopologyRegion>, sideCarTarget,
  ) : null;

  if (workspace.isLoading) return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading projects…</div>;

  return <MdiTopologyRegion topology={topology} id="zp1" className="h-full overflow-auto bg-background">{sideCar}
    <div className="mx-auto w-full max-w-6xl px-6 py-9 md:px-10">
      {workspace.isError && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-foreground"><span>Showing the local Zetro project cache while the coordinator reconnects.</span><Button type="button" variant="outline" size="sm" onClick={() => void workspace.refetch()}>Retry sync</Button></div>}
      {!selected ? <ProjectList projects={projects} conversations={source.conversations} createOpen={createOpen} onCreateOpenChange={setCreateOpen} onSelect={(id) => { setSelectedId(id); setActiveTab("overview"); }} onSubmit={submit} name={name} projectNumber={projectNumber || nextProjectNumber(projects)} icon={icon} color={color} description={description} gitRepositoryUrl={gitRepositoryUrl} localFolder={localFolder} status={status} creating={createProject.isPending} error={createProject.error?.message} onNameChange={setName} onProjectNumberChange={setProjectNumber} onIconChange={setIcon} onColorChange={setColor} onDescriptionChange={setDescription} onGitRepositoryUrlChange={setGitRepositoryUrl} onLocalFolderChange={setLocalFolder} onStatusChange={setStatus} topology={topology} />
        : <ProjectDetail project={selected} conversations={source.conversations} activeTab={activeTab} onBack={() => setSelectedId(null)} onTabChange={setActiveTab} topology={topology} />}
    </div>
  </MdiTopologyRegion>;
}

type ProjectListProps = {
  projects: Project[];
  conversations: Array<{ projectId?: string; exchanges: unknown[]; updatedAt: string }>;
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  onSelect: (id: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  name: string; projectNumber: string; icon: string; color: Project["color"]; description: string; gitRepositoryUrl: string; localFolder: string; status: NonNullable<Project["status"]>; creating: boolean; error?: string;
  onNameChange: (value: string) => void; onProjectNumberChange: (value: string) => void; onIconChange: (value: string) => void; onColorChange: (value: Project["color"]) => void; onDescriptionChange: (value: string) => void; onGitRepositoryUrlChange: (value: string) => void; onLocalFolderChange: (value: string) => void; onStatusChange: (value: NonNullable<Project["status"]>) => void;
  topology?: MdiTopologyAdapter;
};

function ProjectList({ projects, conversations, createOpen, onCreateOpenChange, onSelect, onSubmit, topology, ...form }: ProjectListProps) {
  return <MdiTopologyRegion topology={topology} id="zp3">
    <div className="mb-6 flex items-end justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight">Projects</h1><p className="mt-2 text-sm text-muted-foreground">Connected repository workspaces available on mobile, desktop, and web.</p></div><div className="flex items-center gap-3"><span className="text-sm font-medium text-muted-foreground">{projects.length} connected</span><Popover open={createOpen} onOpenChange={onCreateOpenChange}><PopoverTrigger asChild><Button type="button" size="icon" aria-label="Create project"><Plus className="size-4" /></Button></PopoverTrigger><PopoverContent align="end" side="bottom" className="w-[360px] p-4 shadow-xl"><ProjectCreateForm {...form} onSubmit={onSubmit} /></PopoverContent></Popover></div></div>
    <div className="space-y-2">{projects.map((project) => { const linked = conversations.filter((conversation) => conversation.projectId === project.id); return <button key={project.id} type="button" onClick={() => onSelect(project.id)} className="group flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${projectColors[project.color ?? "slate"]}`}>{project.icon || initials(project.name)}</span><span className="min-w-0 flex-1"><span className="block truncate font-semibold text-foreground">{project.name}</span><span className="mt-1 block truncate text-sm text-muted-foreground">{project.description || "Zetro project workspace"}</span><span className="mt-2 flex items-center gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-1"><GitBranch className="size-3" />{project.projectNumber || "No number"}</span><span>{project.status || "new"}</span></span></span><span className="flex size-9 shrink-0 items-center justify-center rounded-full border-4 border-muted text-[10px] font-semibold text-foreground">{linked.length ? "•" : "0"}</span>
    </button>; })}</div>
    {!projects.length && <div className="rounded-xl border border-dashed p-12 text-center"><FolderKanban className="mx-auto size-8 text-muted-foreground" /><h2 className="mt-4 font-semibold">No projects connected</h2><p className="mt-1 text-sm text-muted-foreground">Use the add button to create a Zetro project workspace.</p></div>}
  </MdiTopologyRegion>;
}

type ProjectFormProps = Omit<ProjectListProps, "projects" | "conversations" | "createOpen" | "onCreateOpenChange" | "onSelect" | "topology">;

function ProjectCreateForm({ onSubmit, name, projectNumber, icon, color, description, gitRepositoryUrl, localFolder, status, creating, error, onNameChange, onProjectNumberChange, onIconChange, onColorChange, onDescriptionChange, onGitRepositoryUrlChange, onLocalFolderChange, onStatusChange }: ProjectFormProps) {
  return <form onSubmit={onSubmit} className="grid gap-3">
    <label className="grid gap-1.5 text-xs font-semibold">Project name<Input autoFocus value={name} onChange={(event) => onNameChange(event.target.value)} maxLength={100} placeholder="New project name" /></label>
    <div className="grid grid-cols-[1fr_84px] gap-3"><label className="grid gap-1.5 text-xs font-semibold">Project no.<Input value={projectNumber} onChange={(event) => onProjectNumberChange(event.target.value)} maxLength={40} placeholder="PRJ-0008" /></label><label className="grid gap-1.5 text-xs font-semibold">Icon<Input value={icon} onChange={(event) => onIconChange(event.target.value.slice(0, 4))} maxLength={4} placeholder="PX" /></label></div>
    <label className="grid gap-1.5 text-xs font-semibold">Colour<select value={color ?? "slate"} onChange={(event) => onColorChange(event.target.value as NonNullable<Project["color"]>)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="slate">Slate</option><option value="violet">Violet</option><option value="amber">Amber</option><option value="blue">Blue</option><option value="rose">Rose</option></select></label>
    <label className="grid gap-1.5 text-xs font-semibold">Git repository URL<Input value={gitRepositoryUrl} onChange={(event) => onGitRepositoryUrlChange(event.target.value)} type="url" maxLength={1_000} placeholder="https://github.com/owner/repository.git" /></label>
    <label className="grid gap-1.5 text-xs font-semibold">Repository folder<Input value={localFolder} onChange={(event) => onLocalFolderChange(event.target.value)} maxLength={500} placeholder="apps/my-project" /></label>
    <label className="grid gap-1.5 text-xs font-semibold">Status<select value={status} onChange={(event) => onStatusChange(event.target.value as NonNullable<Project["status"]>)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="new">New</option><option value="planning">Planning</option><option value="active">Active</option><option value="on_hold">On hold</option><option value="completed">Completed</option></select></label>
    <label className="grid gap-1.5 text-xs font-semibold">Description <span className="font-normal text-muted-foreground">(optional)</span><Input value={description} onChange={(event) => onDescriptionChange(event.target.value)} maxLength={500} placeholder="What this project delivers" /></label>
    {error && <p className="text-sm text-destructive">{error}</p>}
    <div className="mt-1 flex justify-end"><Button type="submit" size="sm" disabled={!name.trim() || creating}>{creating ? "Creating…" : "Create project"}</Button></div>
  </form>;
}

function ProjectDetail({ project, conversations, activeTab, onBack, onTabChange, topology }: { project: Project; conversations: Array<{ id: string; title: string; projectId?: string; exchanges: Array<{ id: string; taskId?: string; feedback?: "up" | "down"; prompt: string; timestamp?: string }>; updatedAt: string; archived?: boolean }>; activeTab: ProjectTab; onBack: () => void; onTabChange: (tab: ProjectTab) => void; topology?: MdiTopologyAdapter }) {
  const linked = conversations.filter((conversation) => conversation.projectId === project.id);
  const taskExchanges = linked.flatMap((conversation) => conversation.exchanges.map((exchange) => ({ ...exchange, conversationTitle: conversation.title }))).filter((exchange) => exchange.taskId);
  const reviewed = linked.flatMap((conversation) => conversation.exchanges.map((exchange) => ({ ...exchange, conversationTitle: conversation.title }))).filter((exchange) => exchange.feedback);
  return <MdiTopologyRegion topology={topology} id="zp4"><button type="button" onClick={onBack} className="mb-5 text-sm text-muted-foreground hover:text-foreground">← All projects</button><div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5"><div><p className="text-xs text-muted-foreground">Project workspace</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">{project.name}</h1><p className="mt-2 text-sm text-muted-foreground">{project.description || "Zetro-owned project workspace"}</p></div><div className="text-right text-sm text-muted-foreground">Updated {timeLabel(project.createdAt)}</div></div>
    <div className="mt-4 flex gap-1 overflow-x-auto border-b">{tabs.map((tab) => <button key={tab.id} type="button" onClick={() => onTabChange(tab.id)} className={`shrink-0 border-b-2 px-3 py-2.5 text-sm transition-colors ${activeTab === tab.id ? "border-foreground font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{tab.label}</button>)}</div>
    <div className="mt-6"><MdiTopologyRegion topology={topology} id="zp5">{activeTab === "overview" && <Overview project={project} linked={linked} taskCount={taskExchanges.length} reviewCount={reviewed.length} />}{activeTab === "conversations" && <ConversationList linked={linked} />}{activeTab === "tasks" && <ExchangeList title="Task handoffs" icon={<CheckSquare className="size-4" />} rows={taskExchanges} empty="No task handoffs are linked to this project." />}{activeTab === "reviews" && <ExchangeList title="Reviews" icon={<ClipboardCheck className="size-4" />} rows={reviewed} empty="No reviewed responses are linked to this project." />}{activeTab === "context" && <Context project={project} />}</MdiTopologyRegion></div>
  </MdiTopologyRegion>;
}

function Overview({ project, linked, taskCount, reviewCount }: { project: Project; linked: Array<{ exchanges: unknown[] }>; taskCount: number; reviewCount: number }) { return <div className="grid gap-6 lg:grid-cols-[1fr_300px]"><div className="space-y-6"><section><p className="text-xs text-muted-foreground">Project</p><p className="mt-1 font-semibold">{project.name}</p></section><section><p className="text-xs text-muted-foreground">Repository folder</p><p className="mt-1 font-mono text-sm">{project.localFolder || "Not connected"}</p></section><section><p className="text-xs text-muted-foreground">Workspace</p><p className="mt-1 font-semibold">Connected</p></section></div><aside className="grid grid-cols-2 gap-2 self-start border-l pl-6"><Stat icon={<MessageSquare className="size-4" />} label="Conversations" value={linked.length} /><Stat icon={<CheckSquare className="size-4" />} label="Tasks" value={taskCount} /><Stat icon={<ClipboardCheck className="size-4" />} label="Reviews" value={reviewCount} /><Stat icon={<Star className="size-4" />} label="Exchanges" value={linked.reduce((total, item) => total + item.exchanges.length, 0)} /></aside></div>; }
function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) { return <div className="rounded-lg border p-3"><div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div><p className="mt-2 text-xl font-semibold">{value}</p></div>; }
function ConversationList({ linked }: { linked: Array<{ id: string; title: string; exchanges: unknown[]; updatedAt: string; archived?: boolean }> }) { return <div><h2 className="font-semibold">Conversations</h2><div className="mt-3 divide-y rounded-lg border">{linked.map((conversation) => <div key={conversation.id} className="flex items-center justify-between gap-4 p-4"><div><p className="font-medium">{conversation.title}</p><p className="mt-1 text-sm text-muted-foreground">{conversation.exchanges.length} exchange{conversation.exchanges.length === 1 ? "" : "s"}{conversation.archived ? " · Archived" : ""}</p></div><span className="text-xs text-muted-foreground">{timeLabel(conversation.updatedAt)}</span></div>)}{!linked.length && <Empty message="No conversations are linked to this project." />}</div></div>; }
function ExchangeList({ title, icon, rows, empty }: { title: string; icon: ReactNode; rows: Array<{ id: string; prompt: string; conversationTitle: string; timestamp?: string }>; empty: string }) { return <div><h2 className="flex items-center gap-2 font-semibold">{icon}{title}</h2><div className="mt-3 divide-y rounded-lg border">{rows.map((row) => <div key={row.id} className="p-4"><p className="font-medium">{row.conversationTitle}</p><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{row.prompt}</p><p className="mt-2 text-xs text-muted-foreground">{timeLabel(row.timestamp)}</p></div>)}{!rows.length && <Empty message={empty} />}</div></div>; }
function Context({ project }: { project: Project }) { return <div className="max-w-2xl rounded-lg border p-5"><h2 className="font-semibold">Project context</h2><p className="mt-2 text-sm text-muted-foreground">This page reads the project connection stored by Zetro. Source ownership, repository inspection, and task execution remain in their owning applications.</p><dl className="mt-5 grid gap-4 sm:grid-cols-2"><div><dt className="text-xs text-muted-foreground">Project ID</dt><dd className="mt-1 font-mono text-sm">{project.id}</dd></div><div><dt className="text-xs text-muted-foreground">Repository folder</dt><dd className="mt-1 font-mono text-sm">{project.localFolder || "Not connected"}</dd></div></dl></div>; }
function Empty({ message }: { message: string }) { return <p className="p-6 text-center text-sm text-muted-foreground">{message}</p>; }

function nextProjectNumber(projects: Project[]) {
  const highest = projects.reduce((maximum, project) => Math.max(maximum, Number(project.projectNumber?.match(/(\d+)$/)?.[1]) || 0), 0);
  return `PRJ-${String(highest + 1).padStart(4, "0")}`;
}
