import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckSquare,
  ClipboardCheck,
  ExternalLink,
  Folder,
  FolderKanban,
  GitBranch,
  LayoutGrid,
  List,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@codexsun/ui/components/button";
import { GlobalLoader } from "@codexsun/ui/components/global-loader";
import { Input } from "@codexsun/ui/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@codexsun/ui/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@codexsun/ui/components/ui/popover";
import { MdiTopologyRegion, type MdiTopologyAdapter } from "@codexsun/ui-desk";
import { DEFAULT_PROJECTS, loadConversations, loadProjects, saveProjects, type Conversation, type Project } from "../conversations.js";
import { getWorkspace, saveProject } from "../workspace-api.js";
import { zetroNotifications } from "../notifications.js";

type ProjectTab = "overview" | "conversations" | "tasks" | "reviews" | "context";
type ViewMode = "stack" | "grid";
type KindFilter = "all" | "project" | "addon";

const tabs: Array<{ id: ProjectTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "conversations", label: "Conversations" },
  { id: "tasks", label: "Tasks" },
  { id: "reviews", label: "Reviews" },
  { id: "context", label: "Context" },
];

export const projectThemes = {
  slate: {
    bg: "bg-[#18181b] text-white",
    solidHex: "#18181b",
    dot: "bg-slate-500",
    border: "border-slate-200 dark:border-slate-800",
  },
  violet: {
    bg: "bg-[#5b21b6] text-white",
    solidHex: "#5b21b6",
    dot: "bg-violet-500",
    border: "border-slate-200 dark:border-slate-800",
  },
  amber: {
    bg: "bg-[#b45309] text-white",
    solidHex: "#b45309",
    dot: "bg-amber-500",
    border: "border-slate-200 dark:border-slate-800",
  },
  blue: {
    bg: "bg-[#2563eb] text-white",
    solidHex: "#2563eb",
    dot: "bg-blue-500",
    border: "border-slate-200 dark:border-slate-800",
  },
  rose: {
    bg: "bg-[#9f1239] text-white",
    solidHex: "#9f1239",
    dot: "bg-rose-500",
    border: "border-slate-200 dark:border-slate-800",
  },
} as const;

const defaultStatusConfig = {
  label: "New",
  badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30",
  dotClass: "bg-purple-500",
};

const statusConfigs: Record<string, { label: string; badgeClass: string; dotClass: string }> = {
  active: {
    label: "Active",
    badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    dotClass: "bg-emerald-500 animate-pulse",
  },
  planning: {
    label: "Planning",
    badgeClass: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30",
    dotClass: "bg-sky-500",
  },
  new: defaultStatusConfig,
  on_hold: {
    label: "On hold",
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
    dotClass: "bg-amber-500",
  },
  completed: {
    label: "Completed",
    badgeClass: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30",
    dotClass: "bg-slate-400",
  },
};

function getStatusConfig(status?: string): { label: string; badgeClass: string; dotClass: string } {
  if (!status) return defaultStatusConfig;
  return statusConfigs[status] ?? defaultStatusConfig;
}

function getProjectTheme(color?: Project["color"]) {
  if (!color) return projectThemes.slate;
  return projectThemes[color] ?? projectThemes.slate;
}

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
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Form states for creation
  const [kind, setKind] = useState<"project" | "addon">("project");
  const [name, setName] = useState("");
  const [projectNumber, setProjectNumber] = useState("");
  const [icon, setIcon] = useState("");
  const [color, setColor] = useState<Project["color"]>("slate");
  const [description, setDescription] = useState("");
  const [gitRepositoryUrl, setGitRepositoryUrl] = useState("");
  const [localFolder, setLocalFolder] = useState("");
  const [status, setStatus] = useState<NonNullable<Project["status"]>>("planning");

  const source = workspace.data ?? localWorkspace;
  // Connect both real projects and addons
  const allProjects = useMemo(() => source.projects, [source.projects]);
  const selected = allProjects.find((project) => project.id === selectedId) ?? null;

  // Realtime Bidirectional Synchronization Listener
  useEffect(() => {
    const handleWorkspaceUpdated = () => {
      void workspace.refetch();
    };
    window.addEventListener("zetro-workspace-updated", handleWorkspaceUpdated);
    window.addEventListener("storage", handleWorkspaceUpdated);
    return () => {
      window.removeEventListener("zetro-workspace-updated", handleWorkspaceUpdated);
      window.removeEventListener("storage", handleWorkspaceUpdated);
    };
  }, [workspace]);

  // Create Project / Addon Mutation
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
      try {
        const current = loadProjects(localStorage);
        saveProjects(localStorage, [...current, project]);
      } catch {}
      window.dispatchEvent(new CustomEvent("zetro-workspace-updated", { detail: { project } }));
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
      setKind("project");
      zetroNotifications.success(`${project.kind === "addon" ? "Add-on" : "Project"} created`, { description: project.name });
    },
    onError: (cause) => zetroNotifications.error(cause, "Unable to create workspace."),
  });

  // Update Project Mutation (for bidirectional sync when edited here)
  const updateProject = useMutation<Project, Error, Project>({
    mutationFn: async (project: Project) => {
      if (workspace.isError) {
        setLocalWorkspace((current) => {
          const next = { ...current, projects: current.projects.map((p) => (p.id === project.id ? project : p)) };
          saveProjects(localStorage, next.projects);
          return next;
        });
        return project;
      }
      await saveProject(project);
      return project;
    },
    onSuccess: async (savedProject: Project) => {
      await queryClient.invalidateQueries({ queryKey: ["zetro-workspace"] });
      try {
        const current = loadProjects(localStorage);
        const updated = current.map((p) => (p.id === savedProject.id ? savedProject : p));
        saveProjects(localStorage, updated);
      } catch {}
      window.dispatchEvent(new CustomEvent("zetro-workspace-updated", { detail: { project: savedProject } }));
      zetroNotifications.success("Workspace updated", { description: savedProject.name });
      setEditingProject(null);
    },
    onError: (cause) => zetroNotifications.error(cause, "Unable to update workspace."),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    createProject.mutate({
      id: `${kind}-${Date.now()}`,
      name: trimmedName,
      projectNumber: projectNumber.trim() || nextProjectNumber(allProjects),
      icon: icon.trim() || initials(trimmedName),
      color,
      description: description.trim() || undefined,
      gitRepositoryUrl: gitRepositoryUrl.trim() || undefined,
      localFolder: localFolder.trim() || undefined,
      status,
      createdAt: new Date().toISOString(),
      kind,
    });
  }

  const sideCar = sideCarTarget ? createPortal(
    <MdiTopologyRegion topology={topology} id="zp2" className="flex h-full min-h-0 flex-col p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Zetro Workspaces</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{allProjects.length}</span>
      </div>
      <div className="min-h-0 space-y-1 overflow-y-auto pr-0.5">
        {allProjects.map((project) => {
          const isSelected = selectedId === project.id;
          const theme = getProjectTheme(project.color);
          const statusInfo = getStatusConfig(project.status);

          return (
            <button
              key={project.id}
              type="button"
              onClick={() => {
                setSelectedId(project.id);
                setActiveTab("overview");
              }}
              className={`group flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-all ${
                isSelected
                  ? "bg-accent font-semibold text-accent-foreground shadow-xs ring-1 ring-border"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  style={{ backgroundColor: theme.solidHex }}
                  className="flex size-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white shadow-xs"
                >
                  {project.icon || initials(project.name)}
                </span>
                <span className="truncate">{project.name}</span>
              </div>
              <span className={`size-1.5 shrink-0 rounded-full ${statusInfo.dotClass}`} title={statusInfo.label} />
            </button>
          );
        })}
        {!allProjects.length && <p className="px-2 py-4 text-center text-xs text-muted-foreground">No projects yet.</p>}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3 w-full border-dashed text-xs font-semibold"
        onClick={() => setCreateOpen(true)}
      >
        <Plus className="size-3.5" />
        New project
      </Button>
    </MdiTopologyRegion>,
    sideCarTarget,
  ) : null;

  if (workspace.isLoading) return <GlobalLoader className="h-full min-h-64" fullScreen={false} />;

  return (
    <MdiTopologyRegion topology={topology} id="zp1" className="h-full overflow-auto bg-background">
      {sideCar}
      <div className="mx-auto w-full max-w-6xl px-6 py-8 md:px-10">
        {workspace.isError && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-foreground">
            <span>Showing the local Zetro project cache while the coordinator reconnects.</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void workspace.refetch()}>
              Retry sync
            </Button>
          </div>
        )}

        {!selected ? (
          <ProjectList
            projects={allProjects}
            conversations={source.conversations}
            createOpen={createOpen}
            onCreateOpenChange={setCreateOpen}
            onSelect={(id) => {
              setSelectedId(id);
              setActiveTab("overview");
            }}
            onEdit={(proj) => setEditingProject(proj)}
            onSubmit={submit}
            kind={kind}
            onKindChange={setKind}
            name={name}
            projectNumber={projectNumber || nextProjectNumber(allProjects)}
            icon={icon}
            color={color}
            description={description}
            gitRepositoryUrl={gitRepositoryUrl}
            localFolder={localFolder}
            status={status}
            creating={createProject.isPending}
            error={createProject.error?.message}
            onNameChange={setName}
            onProjectNumberChange={setProjectNumber}
            onIconChange={setIcon}
            onColorChange={setColor}
            onDescriptionChange={setDescription}
            onGitRepositoryUrlChange={setGitRepositoryUrl}
            onLocalFolderChange={setLocalFolder}
            onStatusChange={setStatus}
            topology={topology}
          />
        ) : (
          <ProjectDetail
            project={selected}
            conversations={source.conversations}
            activeTab={activeTab}
            onBack={() => setSelectedId(null)}
            onTabChange={setActiveTab}
            onEdit={() => setEditingProject(selected)}
            topology={topology}
          />
        )}

        {/* Dedicated Edit Project Dialog for Bidirectional Sync */}
        <ProjectEditDialog
          project={editingProject}
          open={Boolean(editingProject)}
          onOpenChange={(open) => {
            if (!open) setEditingProject(null);
          }}
          onSave={(updated) => updateProject.mutate(updated)}
          updating={updateProject.isPending}
        />
      </div>
    </MdiTopologyRegion>
  );
}

type ProjectListProps = {
  projects: Project[];
  conversations: Array<{ projectId?: string; exchanges: unknown[]; updatedAt: string }>;
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  onSelect: (id: string) => void;
  onEdit: (project: Project) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  kind: "project" | "addon";
  onKindChange: (kind: "project" | "addon") => void;
  name: string;
  projectNumber: string;
  icon: string;
  color: Project["color"];
  description: string;
  gitRepositoryUrl: string;
  localFolder: string;
  status: NonNullable<Project["status"]>;
  creating: boolean;
  error?: string;
  onNameChange: (value: string) => void;
  onProjectNumberChange: (value: string) => void;
  onIconChange: (value: string) => void;
  onColorChange: (value: Project["color"]) => void;
  onDescriptionChange: (value: string) => void;
  onGitRepositoryUrlChange: (value: string) => void;
  onLocalFolderChange: (value: string) => void;
  onStatusChange: (value: NonNullable<Project["status"]>) => void;
  topology?: MdiTopologyAdapter;
};

function ProjectList({
  projects,
  conversations,
  createOpen,
  onCreateOpenChange,
  onSelect,
  onEdit,
  onSubmit,
  topology,
  ...form
}: ProjectListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("stack");

  // Filter projects by search, status, and kind
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        project.name.toLowerCase().includes(query) ||
        (project.projectNumber && project.projectNumber.toLowerCase().includes(query)) ||
        (project.localFolder && project.localFolder.toLowerCase().includes(query)) ||
        (project.description && project.description.toLowerCase().includes(query));

      const matchesStatus = statusFilter === "all" || (project.status ?? "new") === statusFilter;
      const matchesKind = kindFilter === "all" || (project.kind ?? "project") === kindFilter;

      return matchesSearch && matchesStatus && matchesKind;
    });
  }, [projects, searchQuery, statusFilter, kindFilter]);

  const kindCounts = useMemo(() => {
    let projectCount = 0;
    let addonCount = 0;
    for (const p of projects) {
      if (p.kind === "addon") addonCount += 1;
      else projectCount += 1;
    }
    return { all: projects.length, project: projectCount, addon: addonCount };
  }, [projects]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: projects.length };
    for (const p of projects) {
      const s = p.status ?? "new";
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return counts;
  }, [projects]);

  return (
    <MdiTopologyRegion topology={topology} id="zp3" className="space-y-6">
      {/* Header with Title, Connected Count & Square '+' button matching media_1788711837620.png */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 md:text-3xl">Projects</h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 md:text-sm">
            Connected repository workspaces available on mobile, desktop, and web.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {filteredProjects.length} connected
          </span>

          {/* New Project Popover with Square Black '+' Button */}
          <Popover open={createOpen} onOpenChange={onCreateOpenChange}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex size-7.5 items-center justify-center rounded-md bg-slate-900 text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 cursor-pointer shadow-xs"
                title="New workspace"
                aria-label="New workspace"
              >
                <Plus className="size-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" side="bottom" className="w-[390px] p-5 shadow-2xl rounded-2xl border">
              <ProjectCreateForm {...form} onSubmit={onSubmit} />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search workspaces by name, code, folder..."
            className="h-9 pl-9 pr-8 text-xs rounded-xl bg-muted/30 focus:bg-background transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Kind Filter: All, Projects, Add-ons */}
          <div className="flex items-center rounded-lg border bg-muted/30 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setKindFilter("all")}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${
                kindFilter === "all" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({kindCounts.all})
            </button>
            <button
              type="button"
              onClick={() => setKindFilter("project")}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${
                kindFilter === "project" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Projects ({kindCounts.project})
            </button>
            {kindCounts.addon > 0 && (
              <button
                type="button"
                onClick={() => setKindFilter("addon")}
                className={`rounded px-2.5 py-1 font-medium transition-colors ${
                  kindFilter === "addon" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Add-ons ({kindCounts.addon})
              </button>
            )}
          </div>

          {/* View mode switcher */}
          <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("stack")}
              className={`rounded p-1.5 transition-colors ${
                viewMode === "stack" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Standard Stack View"
            >
              <List className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`rounded p-1.5 transition-colors ${
                viewMode === "grid" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Card List Display matching media_1788711837620.png */}
      {viewMode === "stack" ? (
        <div className="space-y-3">
          {filteredProjects.map((project) => {
            const theme = getProjectTheme(project.color);
            const logoText = project.icon || initials(project.name);

            return (
              <div
                key={project.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(project.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(project.id);
                  }
                }}
                className="group relative flex items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4.5 shadow-xs transition-all duration-150 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs cursor-pointer"
              >
                {/* Left side: Icon badge + Title + Description + Meta line */}
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  {/* Logo Icon Badge with solid background from project table */}
                  <div
                    style={{ backgroundColor: theme.solidHex }}
                    className="size-11 shrink-0 rounded-lg flex items-center justify-center font-bold text-sm text-white shadow-xs"
                  >
                    {logoText}
                  </div>

                  {/* Project Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold text-[15px] text-slate-900 dark:text-slate-100 leading-tight group-hover:text-primary transition-colors">
                        {project.name}
                      </h3>
                      {project.kind === "addon" && (
                        <span className="rounded-md border border-purple-500/20 bg-purple-500/10 px-1.5 py-0.2 text-[10px] font-medium text-purple-600 dark:text-purple-400">
                          Add-on
                        </span>
                      )}
                    </div>

                    <p className="line-clamp-1 text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-1">
                      {project.description || "Connected repository workspace."}
                    </p>

                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 font-mono">
                      <GitBranch className="size-3 text-slate-400 shrink-0" />
                      <span>{project.projectNumber || "PRJ-0000"}</span>
                      <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                      <span className="font-sans lowercase">{project.status || "new"}</span>
                    </div>
                  </div>
                </div>

                {/* Right side: 0% completion badge & hover action buttons */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    0%
                  </span>

                  {/* Quick Edit Action Button to update fields */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(project);
                    }}
                    className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Edit project fields"
                  >
                    <Pencil className="size-3.5" />
                  </button>

                  <ArrowRight className="size-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-700 dark:group-hover:text-slate-200 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map((project) => {
            const theme = getProjectTheme(project.color);
            const statusInfo = getStatusConfig(project.status);
            const logoText = project.icon || initials(project.name);

            return (
              <div
                key={project.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(project.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(project.id);
                  }
                }}
                className="group relative flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs transition-all duration-150 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm cursor-pointer"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        style={{ backgroundColor: theme.solidHex }}
                        className="size-11 shrink-0 rounded-lg flex items-center justify-center font-bold text-sm text-white shadow-xs"
                      >
                        {logoText}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-base text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">
                          {project.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                          <GitBranch className="size-3 text-slate-400" />
                          <span className="font-mono text-[11px]">{project.projectNumber || "PRJ-0000"}</span>
                        </div>
                      </div>
                    </div>

                    <span className="rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      0%
                    </span>
                  </div>

                  <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                    {project.description || "Connected repository workspace."}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-border/50 pt-3 text-xs text-muted-foreground">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusInfo.badgeClass}`}>
                    <span className={`size-1.5 rounded-full ${statusInfo.dotClass}`} />
                    {statusInfo.label}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(project);
                    }}
                    className="flex items-center gap-1 font-semibold text-primary hover:underline"
                  >
                    <Pencil className="size-3" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!filteredProjects.length && (
        <div className="rounded-2xl border border-dashed p-12 text-center bg-muted/10">
          <FolderKanban className="mx-auto size-10 text-muted-foreground/60" />
          <h2 className="mt-4 font-bold text-base text-foreground">
            {projects.length === 0 ? "No projects connected" : "No matching projects found"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            {projects.length === 0
              ? "Use the button above to create or register a repository workspace in Zetro."
              : `No project matches your search "${searchQuery}". Try a different keyword or reset filters.`}
          </p>
          {projects.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4 text-xs font-semibold"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      )}
    </MdiTopologyRegion>
  );
}

type ProjectFormProps = Omit<ProjectListProps, "projects" | "conversations" | "createOpen" | "onCreateOpenChange" | "onSelect" | "onEdit" | "topology">;

function ProjectCreateForm({
  onSubmit,
  kind,
  onKindChange,
  name,
  projectNumber,
  icon,
  color,
  description,
  gitRepositoryUrl,
  localFolder,
  status,
  creating,
  error,
  onNameChange,
  onProjectNumberChange,
  onIconChange,
  onColorChange,
  onDescriptionChange,
  onGitRepositoryUrlChange,
  onLocalFolderChange,
  onStatusChange,
}: ProjectFormProps) {
  const colorOptions: Array<{ id: Project["color"]; label: string; bg: string }> = [
    { id: "slate", label: "Slate (Charcoal)", bg: "bg-[#18181b]" },
    { id: "violet", label: "Violet (Purple)", bg: "bg-[#5b21b6]" },
    { id: "amber", label: "Amber (Copper)", bg: "bg-[#b45309]" },
    { id: "blue", label: "Blue", bg: "bg-[#2563eb]" },
    { id: "rose", label: "Rose (Wine)", bg: "bg-[#9f1239]" },
  ];

  return (
    <form onSubmit={onSubmit} className="grid gap-3.5 text-xs">
      <div className="flex items-center gap-2 border-b pb-2">
        <Sparkles className="size-4 text-primary" />
        <h3 className="font-bold text-sm text-foreground">New Workspace</h3>
      </div>

      {/* Kind selector: Project or Addon */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onKindChange("project")}
          className={`rounded-lg border p-2 text-center font-medium transition-colors ${
            kind === "project" ? "border-primary bg-primary/10 text-primary font-bold" : "border-input bg-background text-muted-foreground hover:bg-muted"
          }`}
        >
          Project
        </button>
        <button
          type="button"
          onClick={() => onKindChange("addon")}
          className={`rounded-lg border p-2 text-center font-medium transition-colors ${
            kind === "addon" ? "border-primary bg-primary/10 text-primary font-bold" : "border-input bg-background text-muted-foreground hover:bg-muted"
          }`}
        >
          Add-on
        </button>
      </div>

      <label className="grid gap-1 font-semibold text-slate-700 dark:text-slate-300">
        Workspace Name
        <Input
          autoFocus
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          maxLength={100}
          placeholder="e.g. DevKit, Techmedia.in, CXSHOP"
          className="h-8 text-xs rounded-lg"
        />
      </label>

      <div className="grid grid-cols-[1fr_84px] gap-2.5">
        <label className="grid gap-1 font-semibold text-slate-700 dark:text-slate-300">
          Code Identifier
          <Input
            value={projectNumber}
            onChange={(e) => onProjectNumberChange(e.target.value)}
            maxLength={40}
            placeholder="PRJ-0006"
            className="h-8 text-xs font-mono rounded-lg"
          />
        </label>
        <label className="grid gap-1 font-semibold text-slate-700 dark:text-slate-300">
          Logo Glyph
          <Input
            value={icon}
            onChange={(e) => onIconChange(e.target.value.slice(0, 4))}
            maxLength={4}
            placeholder="cx"
            className="h-8 text-xs font-bold text-center rounded-lg"
          />
        </label>
      </div>

      {/* Color Swatch Picker */}
      <div>
        <label className="block mb-1.5 font-semibold text-slate-700 dark:text-slate-300">Icon Color</label>
        <div className="flex items-center gap-2">
          {colorOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onColorChange(opt.id)}
              className={`size-6 rounded-full ${opt.bg} transition-all ${
                color === opt.id ? "ring-2 ring-foreground ring-offset-2 scale-110" : "opacity-70 hover:opacity-100"
              }`}
              title={opt.label}
            />
          ))}
        </div>
      </div>

      <label className="grid gap-1 font-semibold text-slate-700 dark:text-slate-300">
        Repository Folder
        <Input
          value={localFolder}
          onChange={(e) => onLocalFolderChange(e.target.value)}
          maxLength={500}
          placeholder="e.g. apps/devkit, apps/neot"
          className="h-8 text-xs font-mono rounded-lg"
        />
      </label>

      <label className="grid gap-1 font-semibold text-slate-700 dark:text-slate-300">
        Git Remote URL
        <Input
          value={gitRepositoryUrl}
          onChange={(e) => onGitRepositoryUrlChange(e.target.value)}
          type="url"
          maxLength={1000}
          placeholder="https://github.com/owner/repo.git"
          className="h-8 text-xs rounded-lg"
        />
      </label>

      <label className="grid gap-1 font-semibold text-slate-700 dark:text-slate-300">
        Status
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as NonNullable<Project["status"]>)}
          className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="planning">planning</option>
          <option value="new">new</option>
          <option value="active">active</option>
          <option value="on_hold">on_hold</option>
          <option value="completed">completed</option>
        </select>
      </label>

      <label className="grid gap-1 font-semibold text-slate-700 dark:text-slate-300">
        Description <span className="font-normal text-muted-foreground">(optional)</span>
        <Input
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          maxLength={500}
          placeholder="Plan and deliver lifecycle from roadmap through review"
          className="h-8 text-xs rounded-lg"
        />
      </label>

      {error && <p className="text-xs text-destructive font-medium">{error}</p>}

      <div className="mt-2 flex justify-end gap-2 border-t pt-2">
        <Button type="submit" size="sm" disabled={!name.trim() || creating} className="w-full font-semibold">
          {creating ? "Creating…" : "Create Workspace"}
        </Button>
      </div>
    </form>
  );
}

// Dedicated Dialog to Edit Project Fields (Bidirectional Synchronization)
function ProjectEditDialog({
  project,
  open,
  onOpenChange,
  onSave,
  updating,
}: {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updated: Project) => void;
  updating: boolean;
}) {
  const [name, setName] = useState("");
  const [projectNumber, setProjectNumber] = useState("");
  const [icon, setIcon] = useState("");
  const [color, setColor] = useState<Project["color"]>("slate");
  const [kind, setKind] = useState<"project" | "addon">("project");
  const [description, setDescription] = useState("");
  const [gitRepositoryUrl, setGitRepositoryUrl] = useState("");
  const [localFolder, setLocalFolder] = useState("");
  const [status, setStatus] = useState<NonNullable<Project["status"]>>("new");

  useEffect(() => {
    if (project) {
      setName(project.name);
      setProjectNumber(project.projectNumber || "");
      setIcon(project.icon || initials(project.name));
      setColor(project.color || "slate");
      setKind(project.kind || "project");
      setDescription(project.description || "");
      setGitRepositoryUrl(project.gitRepositoryUrl || "");
      setLocalFolder(project.localFolder || "");
      setStatus(project.status || "new");
    }
  }, [project]);

  if (!project) return null;

  const colorOptions: Array<{ id: Project["color"]; label: string; bg: string }> = [
    { id: "slate", label: "Slate (Charcoal)", bg: "bg-[#18181b]" },
    { id: "violet", label: "Violet (Purple)", bg: "bg-[#5b21b6]" },
    { id: "amber", label: "Amber (Copper)", bg: "bg-[#b45309]" },
    { id: "blue", label: "Blue", bg: "bg-[#2563eb]" },
    { id: "rose", label: "Rose (Wine)", bg: "bg-[#9f1239]" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Pencil className="size-4 text-primary" />
            Edit {kind === "addon" ? "Add-on" : "Project"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Update workspace attributes. Changes synchronize bidirectionally with agents and storage.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            onSave({
              ...project,
              name: name.trim(),
              projectNumber: projectNumber.trim() || undefined,
              icon: icon.trim() || undefined,
              color,
              kind,
              description: description.trim() || undefined,
              gitRepositoryUrl: gitRepositoryUrl.trim() || undefined,
              localFolder: localFolder.trim() || undefined,
              status,
            });
          }}
          className="space-y-3 pt-1 text-xs"
        >
          {/* Kind selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setKind("project")}
              className={`rounded-lg border p-2 text-center font-medium transition-colors ${
                kind === "project" ? "border-primary bg-primary/10 text-primary font-bold" : "border-input bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              Project
            </button>
            <button
              type="button"
              onClick={() => setKind("addon")}
              className={`rounded-lg border p-2 text-center font-medium transition-colors ${
                kind === "addon" ? "border-primary bg-primary/10 text-primary font-bold" : "border-input bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              Add-on
            </button>
          </div>

          <label className="grid gap-1 font-semibold text-slate-700 dark:text-slate-300">
            Workspace Name
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-xs rounded-lg"
              placeholder="Workspace name"
            />
          </label>

          <div className="grid grid-cols-[1fr_84px] gap-2.5">
            <label className="grid gap-1 font-semibold text-slate-700 dark:text-slate-300">
              Project Code
              <Input
                value={projectNumber}
                onChange={(e) => setProjectNumber(e.target.value)}
                className="h-8 text-xs font-mono rounded-lg"
                placeholder="PRJ-0001"
              />
            </label>
            <label className="grid gap-1 font-semibold text-slate-700 dark:text-slate-300">
              Logo Glyph
              <Input
                value={icon}
                onChange={(e) => setIcon(e.target.value.slice(0, 4))}
                maxLength={4}
                className="h-8 text-xs font-bold text-center rounded-lg"
                placeholder="cx"
              />
            </label>
          </div>

          {/* Color swatch picker */}
          <div>
            <label className="block mb-1.5 font-semibold text-slate-700 dark:text-slate-300">Icon Color</label>
            <div className="flex items-center gap-2">
              {colorOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setColor(opt.id)}
                  className={`size-6 rounded-full ${opt.bg} transition-all ${
                    color === opt.id ? "ring-2 ring-foreground ring-offset-2 scale-110" : "opacity-70 hover:opacity-100"
                  }`}
                  title={opt.label}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <label className="grid gap-1 font-semibold text-slate-700 dark:text-slate-300">
              Status
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as NonNullable<Project["status"]>)}
                className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="planning">planning</option>
                <option value="new">new</option>
                <option value="active">active</option>
                <option value="on_hold">on_hold</option>
                <option value="completed">completed</option>
              </select>
            </label>

            <label className="grid gap-1 font-semibold text-slate-700 dark:text-slate-300">
              Repository Folder
              <Input
                value={localFolder}
                onChange={(e) => setLocalFolder(e.target.value)}
                className="h-8 text-xs font-mono rounded-lg"
                placeholder="apps/neot"
              />
            </label>
          </div>

          <label className="grid gap-1 font-semibold text-slate-700 dark:text-slate-300">
            Git Remote URL
            <Input
              value={gitRepositoryUrl}
              onChange={(e) => setGitRepositoryUrl(e.target.value)}
              className="h-8 text-xs rounded-lg"
              placeholder="https://github.com/..."
            />
          </label>

          <label className="grid gap-1 font-semibold text-slate-700 dark:text-slate-300">
            Description
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-8 text-xs rounded-lg"
              placeholder="Workspace description"
            />
          </label>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!name.trim() || updating} className="font-semibold">
              {updating ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProjectDetail({
  project,
  conversations,
  activeTab,
  onBack,
  onTabChange,
  onEdit,
  topology,
}: {
  project: Project;
  conversations: Array<{
    id: string;
    title: string;
    projectId?: string;
    exchanges: Array<{ id: string; taskId?: string; feedback?: "up" | "down"; prompt: string; timestamp?: string }>;
    updatedAt: string;
    archived?: boolean;
  }>;
  activeTab: ProjectTab;
  onBack: () => void;
  onTabChange: (tab: ProjectTab) => void;
  onEdit: () => void;
  topology?: MdiTopologyAdapter;
}) {
  const linked = conversations.filter((conversation) => conversation.projectId === project.id);
  const taskExchanges = linked
    .flatMap((conversation) => conversation.exchanges.map((exchange) => ({ ...exchange, conversationTitle: conversation.title })))
    .filter((exchange) => exchange.taskId);
  const reviewed = linked
    .flatMap((conversation) => conversation.exchanges.map((exchange) => ({ ...exchange, conversationTitle: conversation.title })))
    .filter((exchange) => exchange.feedback);

  const theme = getProjectTheme(project.color);
  const statusInfo = getStatusConfig(project.status);
  const logoText = project.icon || initials(project.name);

  return (
    <MdiTopologyRegion topology={topology} id="zp4" className="space-y-6">
      {/* Back button & Header */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>&larr; All Workspaces</span>
        </button>

        <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-6">
          <div className="flex items-start gap-4">
            <div
              style={{ backgroundColor: theme.solidHex }}
              className="flex size-14 shrink-0 items-center justify-center rounded-2xl font-bold text-lg text-white shadow-md"
            >
              {logoText}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{project.name}</h1>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusInfo.badgeClass}`}>
                  <span className={`size-1.5 rounded-full ${statusInfo.dotClass}`} />
                  {statusInfo.label}
                </span>
                {project.kind === "addon" && (
                  <span className="rounded-md border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-xs font-semibold text-purple-600 dark:text-purple-400">
                    Add-on
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground max-w-xl">
                {project.description || "Connected repository workspace in Zetro."}
              </p>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground font-mono">
                <span>{project.projectNumber || "PRJ-0000"}</span>
                {project.localFolder && <span>&bull; {project.localFolder}</span>}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onEdit} className="gap-1.5 text-xs font-semibold">
              <Pencil className="size-3.5" />
              Edit Workspace
            </Button>
            <div className="text-right text-xs text-muted-foreground">Updated {timeLabel(project.createdAt)}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`shrink-0 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors ${
              activeTab === tab.id ? "border-foreground font-bold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab contents */}
      <div className="mt-4">
        <MdiTopologyRegion topology={topology} id="zp5">
          {activeTab === "overview" && (
            <Overview project={project} linked={linked} taskCount={taskExchanges.length} reviewCount={reviewed.length} />
          )}
          {activeTab === "conversations" && <ConversationList linked={linked} />}
          {activeTab === "tasks" && (
            <ExchangeList
              title="Task handoffs"
              icon={<CheckSquare className="size-4" />}
              rows={taskExchanges}
              empty="No task handoffs are linked to this project."
            />
          )}
          {activeTab === "reviews" && (
            <ExchangeList
              title="Reviews"
              icon={<ClipboardCheck className="size-4" />}
              rows={reviewed}
              empty="No reviewed responses are linked to this project."
            />
          )}
          {activeTab === "context" && <Context project={project} />}
        </MdiTopologyRegion>
      </div>
    </MdiTopologyRegion>
  );
}

function Overview({
  project,
  linked,
  taskCount,
  reviewCount,
}: {
  project: Project;
  linked: Array<{ exchanges: unknown[] }>;
  taskCount: number;
  reviewCount: number;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-6">
        <div className="rounded-2xl border bg-card p-5 space-y-4">
          <h3 className="font-bold text-sm text-foreground">Workspace Configuration</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <dt className="text-muted-foreground">Project Name</dt>
              <dd className="font-semibold text-foreground mt-0.5">{project.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Code Identifier</dt>
              <dd className="font-mono font-semibold text-foreground mt-0.5">{project.projectNumber || "PRJ-0000"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Repository Folder</dt>
              <dd className="font-mono text-foreground mt-0.5">{project.localFolder || "Not connected"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Git Remote URL</dt>
              <dd className="font-mono text-foreground mt-0.5 truncate">{project.gitRepositoryUrl || "None"}</dd>
            </div>
          </dl>
        </div>
      </div>

      <aside className="grid grid-cols-2 gap-3 self-start">
        <Stat icon={<MessageSquare className="size-4" />} label="Conversations" value={linked.length} />
        <Stat icon={<CheckSquare className="size-4" />} label="Tasks" value={taskCount} />
        <Stat icon={<ClipboardCheck className="size-4" />} label="Reviews" value={reviewCount} />
        <Stat icon={<Star className="size-4" />} label="Exchanges" value={linked.reduce((total, item) => total + item.exchanges.length, 0)} />
      </aside>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-xs">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 text-2xl font-black text-foreground">{value}</p>
    </div>
  );
}

function ConversationList({
  linked,
}: {
  linked: Array<{ id: string; title: string; exchanges: unknown[]; updatedAt: string; archived?: boolean }>;
}) {
  return (
    <div className="space-y-3">
      <h2 className="font-bold text-sm text-foreground">Linked Conversations</h2>
      <div className="divide-y rounded-2xl border bg-card overflow-hidden shadow-xs">
        {linked.map((conversation) => (
          <div key={conversation.id} className="flex items-center justify-between gap-4 p-4 hover:bg-muted/30 transition-colors">
            <div>
              <p className="font-semibold text-xs text-foreground">{conversation.title}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {conversation.exchanges.length} exchange{conversation.exchanges.length === 1 ? "" : "s"}
                {conversation.archived ? " &bull; Archived" : ""}
              </p>
            </div>
            <span className="text-xs text-muted-foreground">{timeLabel(conversation.updatedAt)}</span>
          </div>
        ))}
        {!linked.length && <Empty message="No conversations are linked to this project yet." />}
      </div>
    </div>
  );
}

function ExchangeList({
  title,
  icon,
  rows,
  empty,
}: {
  title: string;
  icon: ReactNode;
  rows: Array<{ id: string; prompt: string; conversationTitle: string; timestamp?: string }>;
  empty: string;
}) {
  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 font-bold text-sm text-foreground">
        {icon}
        <span>{title}</span>
      </h2>
      <div className="divide-y rounded-2xl border bg-card overflow-hidden shadow-xs">
        {rows.map((row) => (
          <div key={row.id} className="p-4 hover:bg-muted/30 transition-colors">
            <p className="font-semibold text-xs text-foreground">{row.conversationTitle}</p>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{row.prompt}</p>
            <p className="mt-2 text-[10px] text-muted-foreground">{timeLabel(row.timestamp)}</p>
          </div>
        ))}
        {!rows.length && <Empty message={empty} />}
      </div>
    </div>
  );
}

function Context({ project }: { project: Project }) {
  return (
    <div className="max-w-2xl rounded-2xl border bg-card p-6 shadow-xs space-y-4">
      <div>
        <h2 className="font-bold text-sm text-foreground">Project Context</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          This page reads the project connection stored by Zetro. Source ownership, repository inspection, and task execution remain in their owning applications.
        </p>
      </div>
      <dl className="grid gap-4 sm:grid-cols-2 text-xs pt-2 border-t">
        <div>
          <dt className="text-muted-foreground">Project ID</dt>
          <dd className="mt-0.5 font-mono text-foreground font-semibold">{project.id}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Repository Folder</dt>
          <dd className="mt-0.5 font-mono text-foreground font-semibold">{project.localFolder || "Not connected"}</dd>
        </div>
      </dl>
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return <p className="p-8 text-center text-xs text-muted-foreground">{message}</p>;
}

function nextProjectNumber(projects: Project[]) {
  const highest = projects.reduce((maximum, project) => Math.max(maximum, Number(project.projectNumber?.match(/(\d+)$/)?.[1]) || 0), 0);
  return `PRJ-${String(highest + 1).padStart(4, "0")}`;
}
