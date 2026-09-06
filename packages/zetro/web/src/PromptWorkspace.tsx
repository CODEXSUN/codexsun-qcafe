import { platformFetch } from "@codexsun/platform-host-contracts";
import { AttachmentControls, AttachmentPreviews } from "./AttachmentControls.js";
import type { PromptAttachment } from "@codexsun/zetro-api/contracts";
import { createPortal } from "react-dom";
import { ConversationSideCar } from "./ConversationSideCar.js";
import { DEFAULT_PROJECTS, formatShortTime, groupExchangesByDate, loadConversations, loadProjects, saveConversations, saveProjects, type Conversation, type Exchange, type Project } from "./conversations.js";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowUp, Archive, Bot, Boxes, Calendar, Check, CheckSquare, Copy, Cpu, Folder, FolderKanban, Lightbulb, Mail, MessageSquare, MoreHorizontal, Pencil, Pin, RotateCcw, Share2, SlidersHorizontal, Sparkles, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import { Button } from "@codexsun/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@codexsun/ui/components/ui/dialog";
import { Input } from "@codexsun/ui/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@codexsun/ui/components/ui/popover";
import { Spinner } from "@codexsun/ui/components/ui/spinner";
import { MdiTopologyRegion, type MdiTopologyAdapter } from "@codexsun/ui-desk";
import { useMutation, useQuery } from "@tanstack/react-query";
import { sendPrompt } from "./prompt-api.js";
import { desktopZetroStatus, isDesktopZetro } from "./desktop-bridge.js";
import { ComposerOptions } from "./ComposerOptions.js";
import { createRun } from "./workflow-api.js";
import { WorkflowPanel, type WorkflowMode } from "./WorkflowPanel.js";
import { archiveProjectChats, deleteConversation as deleteStoredConversation, deleteProject as deleteStoredProject, getWorkspace, saveConversation as saveStoredConversation, saveProject as saveStoredProject } from "./workspace-api.js";
import { getZetroSettings } from "./settings-api.js";
import { TaskHandoffControls, TaskHandoffResult } from "./TaskHandoffControls.js";
import { MarkdownRenderer } from "./components/MarkdownRenderer.js";
import { ModelProviderSelector } from "./components/ModelProviderSelector.js";
import type { ProviderId } from "./model-provider-api.js";
import { ConversationTabs } from "./ConversationTabs.js";
import { useConversationValue } from "./useConversationValue.js";
import { zetroNotifications } from "./notifications.js";

export const ZETRO_MODELS = [
  { id: "codex-specialist", name: "Codex Specialist", badge: "Docker · Sandbox", desc: "Isolated specialist container with code execution tools." },
  { id: "claude-3-7-sonnet", name: "Claude 3.7 Sonnet", badge: "Reasoning · 200k", desc: "Advanced hybrid reasoning and extended context." },
  { id: "gpt-4o", name: "GPT-4o", badge: "Vision · Fast", desc: "High-speed multimodal intelligence with vision tools." },
  { id: "deepseek-r1", name: "DeepSeek R1", badge: "Deep Logic", desc: "Specialized open-weight reasoning model." },
  { id: "local-demo", name: "Local Demo", badge: "Offline Echo", desc: "Simulated deterministic replies for local testing." },
];

export const ZETRO_FEATURES = [
  { id: "codeExecution", label: "Code Execution", desc: "Run code inside isolated Docker sandbox" },
  { id: "deepReasoning", label: "Deep Reasoning", desc: "Include step-by-step thinking evidence" },
  { id: "multimodal", label: "Multimodal Processing", desc: "Inspect image, document, and audio files" },
  { id: "webTools", label: "Web & API Tools", desc: "External search and specialist tool dispatch" },
];

export type PendingTurn = {
  id: string;
  prompt: string;
  timestamp: string;
  status: "thinking" | "streaming";
  statusText: string;
  activities?: { id: string; label: string; status: string }[];
  streamedResult: string;
};

type QueuedPrompt = {
  id: string;
  message: string;
  attachments: PromptAttachment[];
};

const emptyAttachments = (): PromptAttachment[] => [];
const emptyError = () => "";
const emptyExchanges = (): Exchange[] => [];
const emptyPendingTurn = (): PendingTurn | null => null;
const emptyProjectId = (): string | undefined => undefined;
const emptyPrompt = () => "";
const emptyQueue = (): QueuedPrompt[] => [];

function streamText(
  fullText: string,
  onUpdate: (partial: string) => void,
  onDone: () => void
): () => void {
  if (!fullText) {
    onDone();
    return () => {};
  }
  const len = fullText.length;
  const targetDuration = Math.min(1500, Math.max(200, len * 3));
  const intervalMs = 20;
  const totalSteps = Math.max(1, Math.floor(targetDuration / intervalMs));
  const stepSize = Math.max(1, Math.ceil(len / totalSteps));

  let currentIndex = 0;
  let timer: ReturnType<typeof setInterval> | null = setInterval(() => {
    currentIndex = Math.min(len, currentIndex + stepSize);
    onUpdate(fullText.slice(0, currentIndex));
    if (currentIndex >= len) {
      if (timer) clearInterval(timer);
      timer = null;
      onDone();
    }
  }, intervalMs);

  return () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export function PromptWorkspace({ topology, sideCarTarget }: { topology?: MdiTopologyAdapter; sideCarTarget?: HTMLElement | null }) {
  const [conversations, setConversations] = useState<Conversation[]>(() => { try { return loadConversations(localStorage); } catch { return []; } });
  const [projects, setProjects] = useState<Project[]>(() => { try { return loadProjects(localStorage); } catch { return DEFAULT_PROJECTS; } });
  const [activeId, setActiveId] = useState<string>(() => crypto.randomUUID());
  const [openTabIds, setOpenTabIds] = useState<string[]>(() => [activeId]);
  const projectState = useConversationValue(activeId, emptyProjectId);
  const newConversationProjectId = projectState.value;
  const [selectedModelId, setSelectedModelId] = useState(() => {
    try { return localStorage.getItem("zetro.selected-model.v1") ?? "codex-specialist"; } catch { return "codex-specialist"; }
  });
  const [modelOpen, setModelOpen] = useState(false);
  const [features, setFeatures] = useState<{ [key: string]: boolean }>({
    codeExecution: true,
    deepReasoning: true,
    multimodal: true,
    webTools: false,
  });
  const [connected, setConnected] = useState(true);
  const attachmentState = useConversationValue(activeId, emptyAttachments);
  const attachments = attachmentState.value;
  const setAttachments = attachmentState.setCurrent;
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const promptState = useConversationValue(activeId, emptyPrompt);
  const prompt = promptState.value;
  const setPrompt = promptState.setCurrent;
  const [showActivity, setShowActivity] = useState(false);
  const [motion, setMotion] = useState(true);
  const [workflowEnabled, setWorkflowEnabled] = useState(false);
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>("sequential");
  const [manualApprovals, setManualApprovals] = useState(true);
  const exchangeState = useConversationValue(activeId, emptyExchanges);
  const exchanges = exchangeState.value;
  const setExchanges = exchangeState.setCurrent;
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [newChatTitle, setNewChatTitle] = useState("");
  const workspaceHydrated = useRef(false);
  const workspace = useQuery({ queryKey: ["zetro-workspace"], queryFn: getWorkspace });
  const zetroSettings = useQuery({ queryKey: ["zetro-settings"], queryFn: getZetroSettings, retry: 5 });
  const workflowMutation = useMutation({ mutationFn: createRun });
  const pendingState = useConversationValue(activeId, emptyPendingTurn);
  const pendingTurn = pendingState.value;
  const queuedState = useConversationValue(activeId, emptyQueue);
  const queuedPrompts = queuedState.value;
  const setQueuedPrompts = queuedState.setCurrent;
  const errorState = useConversationValue(activeId, emptyError);
  const error = errorState.value;
  const setError = errorState.setCurrent;
  const requestControllers = useRef(new Map<string, AbortController>());
  const streamCancels = useRef(new Map<string, () => void>());
  const activeIdRef = useRef(activeId);
  const conversationsRef = useRef(conversations);
  const sending = pendingTurn !== null || workflowMutation.isPending;
  const bottom = useRef<HTMLDivElement>(null);
  const promptInputRef = useRef<HTMLTextAreaElement | null>(null);

  const [activeProvider, setActiveProvider] = useState<ProviderId>(() => {
    try {
      const saved = localStorage.getItem("zetro.selectedProvider");
      if (saved === "g" || saved === "o" || saved === "c") return saved;
    } catch {}
    return "g";
  });
  const [activeModel, setActiveModel] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("zetro.selectedModel");
      if (saved) return saved;
    } catch {}
    return "gemini-2.5-pro";
  });

  const handleSelectModelProvider = (provider: ProviderId, model: string) => {
    setActiveProvider(provider);
    setActiveModel(model);
    try {
      localStorage.setItem("zetro.selectedProvider", provider);
      localStorage.setItem("zetro.selectedModel", model);
    } catch {}
  };
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);
  useEffect(() => () => {
    requestControllers.current.forEach((controller) => controller.abort());
    streamCancels.current.forEach((cancel) => cancel());
  }, []);
  useEffect(() => {
    if (!workspace.data) return;
    if (!workspaceHydrated.current) {
      workspaceHydrated.current = true;
      if (workspace.data.projects.length || workspace.data.conversations.length) {
        setProjects(workspace.data.projects);
        setConversations(workspace.data.conversations);
        return;
      }
      void Promise.all([...projects.map(saveStoredProject), ...conversations.map(saveStoredConversation)]);
    } else {
      setProjects(workspace.data.projects);
      setConversations(workspace.data.conversations);
    }
  }, [workspace.data]);

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
  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [exchanges, sending, pendingTurn?.streamedResult, pendingTurn?.statusText]);
  useEffect(() => { promptInputRef.current?.focus(); }, [activeId]);
  useEffect(() => { if (!sending) promptInputRef.current?.focus(); }, [sending]);
  useEffect(() => {
    const refresh = () => void zetroSettings.refetch();
    window.addEventListener("zetro-settings-updated", refresh);
    return () => window.removeEventListener("zetro-settings-updated", refresh);
  }, [zetroSettings.refetch]);
  useEffect(() => {
    let active = true;
    async function checkHealth() {
      try {
        if (isDesktopZetro()) {
          const status = await desktopZetroStatus();
          if (active) setConnected(status.status === "ok" && status.agent === "ready");
          return;
        }
        const res = await platformFetch(`${import.meta.env.VITE_ZETRO_API_URL ?? ""}/health`, { signal: AbortSignal.timeout(2500) });
        if (active) setConnected(res.ok);
      } catch {
        if (active) setConnected(false);
      }
    }
    void checkHealth();
    const timer = setInterval(() => void checkHealth(), 15_000);
    return () => { active = false; clearInterval(timer); };
  }, []);

  const currentModel = ZETRO_MODELS.find((m) => m.id === selectedModelId) ?? ZETRO_MODELS[0]!;

  function onModelChange(id: string) {
    setSelectedModelId(id);
    try { localStorage.setItem("zetro.selected-model.v1", id); } catch { /* ignore */ }
  }

  function copyText(text: string, id: string) {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000);
  }

  function undoTo(index: number) {
    const target = exchanges[index];
    if (!target) return;
    const nextExchanges = exchanges.slice(0, index);
    setExchanges(nextExchanges);
    setPrompt(target.prompt);
    setTimeout(() => promptInputRef.current?.focus(), 0);
    const conversation = conversations.find((item) => item.id === activeId);
    if (conversation) {
      const next = [{ ...conversation, exchanges: nextExchanges, updatedAt: new Date().toISOString() }, ...conversations.filter((item) => item.id !== activeId)];
      setConversations(next);
      try { saveConversations(localStorage, next); } catch { /* ignore */ }
      void saveStoredConversation(next[0]!);
    }
  }

  function toggleFeedback(id: string, value: "up" | "down") {
    const updated = exchanges.map((ex) => (ex.id === id ? { ...ex, feedback: ex.feedback === value ? undefined : value } : ex));
    setExchanges(updated);
    const conversation = conversations.find((item) => item.id === activeId);
    if (conversation) {
      const next = [{ ...conversation, exchanges: updated, updatedAt: new Date().toISOString() }, ...conversations.filter((item) => item.id !== activeId)];
      setConversations(next);
      try { saveConversations(localStorage, next); } catch { /* ignore */ }
      void saveStoredConversation(next[0]!);
    }
  }

  function linkTask(exchangeId: string, taskId: string) {
    const updated = exchanges.map((exchange) => exchange.id === exchangeId ? { ...exchange, taskId } : exchange);
    setExchanges(updated);
    const conversation = conversations.find((item) => item.id === activeId);
    if (conversation) {
      const saved = { ...conversation, exchanges: updated, updatedAt: new Date().toISOString() };
      const next = [saved, ...conversations.filter((item) => item.id !== activeId)];
      setConversations(next);
      try { saveConversations(localStorage, next); } catch { /* ignore */ }
      void saveStoredConversation(saved);
    }
    zetroNotifications.success("Task started", { description: "Zetro will track its results in this chat." });
  }

  function shareWhatsApp(text: string) {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function shareEmail(subject: string, text: string) {
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleAction(exchange: Exchange, actionType: "task" | "idea" | "module") {
    let notice = "";
    if (actionType === "task") {
      void navigator.clipboard.writeText(`Task: ${exchange.prompt}\n\nOutcome / Solution:\n${exchange.result}`);
      notice = "Copied as task to clipboard!";
    } else if (actionType === "idea") {
      void navigator.clipboard.writeText(`Idea: ${exchange.prompt}\n\nInsight:\n${exchange.result}`);
      notice = "Saved idea to clipboard!";
    } else if (actionType === "module") {
      const promptText = `Generate modules based on:\n\n${exchange.result.slice(0, 300)}`;
      setPrompt(promptText);
      setTimeout(() => promptInputRef.current?.focus(), 0);
      notice = "Drafted module generation prompt!";
    }
    zetroNotifications.success(notice);
  }

  function handlePinConversation(id: string) {
    const updated = conversations.map((item) => (item.id === id ? { ...item, pinned: !item.pinned } : item));
    setConversations(updated);
    try { saveConversations(localStorage, updated); } catch { /* ignore */ }
    const target = updated.find((item) => item.id === id);
    if (target) void saveStoredConversation(target);
    zetroNotifications.success(target?.pinned ? "Chat pinned" : "Chat unpinned");
  }

  function handleRenameConversation(id: string, newTitle: string) {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    const updated = conversations.map((item) => (item.id === id ? { ...item, title: trimmed } : item));
    setConversations(updated);
    try { saveConversations(localStorage, updated); } catch { /* ignore */ }
    const target = updated.find((item) => item.id === id);
    if (target) void saveStoredConversation(target);
    zetroNotifications.success("Chat renamed");
  }

  function handleCreateProject(name: string, localFolder: string, kind: "project" | "addon" = "project") {
    const trimmed = name.trim();
    if (!trimmed) return;
    const maxNum = projects.reduce((max, p) => {
      const match = p.projectNumber?.match(/PRJ-(\d+)/i);
      return match && match[1] ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);
    const projectNumber = `PRJ-${String(maxNum + 1).padStart(4, "0")}`;
    const initialsGlyph = trimmed.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "PR";
    const colors: Array<Project["color"]> = ["slate", "violet", "amber", "blue", "rose"];
    const color = colors[projects.length % colors.length] ?? "slate";

    const newProj: Project = {
      id: `${kind}-${Date.now()}`,
      name: trimmed,
      projectNumber,
      icon: initialsGlyph,
      color,
      localFolder,
      status: "new",
      kind,
      createdAt: new Date().toISOString(),
    };
    const updated = [...projects, newProj];
    setProjects(updated);
    try { saveProjects(localStorage, updated); } catch { /* ignore */ }
    void saveStoredProject(newProj)
      .then(() => {
        window.dispatchEvent(new CustomEvent("zetro-workspace-updated", { detail: { project: newProj } }));
      })
      .catch((cause: unknown) => setError(zetroNotifications.error(cause, "Unable to synchronize the new project.")));
    zetroNotifications.success(`${kind === "addon" ? "Add-on" : "Project"} created`, { description: trimmed });
  }

  function handleEditProject(id: string, name: string, localFolder: string) {
    const target = projects.find((project) => project.id === id);
    if (!target || !name.trim()) return;
    const updatedProject = { ...target, name: name.trim(), localFolder };
    const updated = projects.map((project) => project.id === id ? updatedProject : project);
    setProjects(updated);
    try { saveProjects(localStorage, updated); } catch { /* Local cache is optional. */ }
    void saveStoredProject(updatedProject)
      .then(() => {
        zetroNotifications.success("Project updated", { description: updatedProject.name });
        window.dispatchEvent(new CustomEvent("zetro-workspace-updated", { detail: { project: updatedProject } }));
      })
      .catch((cause: unknown) => setError(zetroNotifications.error(cause, "Unable to save the project.")));
  }

  function handlePinProject(id: string) {
    const target = projects.find((project) => project.id === id);
    if (!target) return;
    const updatedProject = { ...target, pinned: !target.pinned };
    const updated = projects.map((project) => project.id === id ? updatedProject : project);
    setProjects(updated);
    try { saveProjects(localStorage, updated); } catch { /* Local cache is optional. */ }
    zetroNotifications.success(updatedProject.pinned ? "Project pinned" : "Project unpinned", { description: updatedProject.name });
    void saveStoredProject(updatedProject)
      .then(() => {
        window.dispatchEvent(new CustomEvent("zetro-workspace-updated", { detail: { project: updatedProject } }));
      })
      .catch((cause: unknown) => setError(zetroNotifications.error(cause, "Unable to synchronize the project.")));
  }

  async function handleArchiveProjectChats(id: string) {
    try {
      const snapshot = await archiveProjectChats(id);
      setProjects(snapshot.projects);
      setConversations(snapshot.conversations);
      if (snapshot.conversations.find((item) => item.id === activeId)?.archived) handleNewChat();
      zetroNotifications.success("Project chats archived");
      window.dispatchEvent(new CustomEvent("zetro-workspace-updated"));
    } catch (cause) { setError(zetroNotifications.error(cause, "Unable to archive project chats.")); }
  }

  async function handleRemoveProject(id: string) {
    try {
      const snapshot = await deleteStoredProject(id);
      setProjects(snapshot.projects);
      setConversations(snapshot.conversations);
      zetroNotifications.success("Project removed", { description: "Its chats are now unassigned." });
      window.dispatchEvent(new CustomEvent("zetro-workspace-updated"));
    } catch (cause) { setError(zetroNotifications.error(cause, "Unable to remove project.")); }
  }

  function activateConversation(id: string, conversation?: Conversation) {
    setOpenTabIds((current) => current.includes(id) ? current : [...current, id]);
    activeIdRef.current = id;
    setActiveId(id);
    if (conversation) {
      exchangeState.setFor(id, conversation.exchanges);
      projectState.setFor(id, conversation.projectId);
    }
    setTimeout(() => promptInputRef.current?.focus(), 0);
  }

  function handleNewChat(projectId?: string) {
    const id = crypto.randomUUID();
    projectState.setFor(id, projectId);
    activateConversation(id);
  }

  function handleCloseTab(id: string) {
    const remaining = openTabIds.filter((tabId) => tabId !== id);
    setOpenTabIds(remaining);
    if (!pendingState.values[id]) {
      attachmentState.remove(id);
      errorState.remove(id);
      exchangeState.remove(id);
      projectState.remove(id);
      promptState.remove(id);
      queuedState.remove(id);
    }
    if (id !== activeId) return;
    const nextId = remaining.at(-1);
    if (nextId) {
      activeIdRef.current = nextId;
      setActiveId(nextId);
      setTimeout(() => promptInputRef.current?.focus(), 0);
      return;
    }
    handleNewChat();
  }

  function handleAssignProject(conversationId: string, projectId?: string) {
    const updated = conversations.map((item) => (item.id === conversationId ? { ...item, projectId } : item));
    setConversations(updated);
    try { saveConversations(localStorage, updated); } catch { /* ignore */ }
    const target = updated.find((item) => item.id === conversationId);
    if (target) void saveStoredConversation(target);
    const proj = projects.find((p) => p.id === projectId);
    zetroNotifications.success(proj ? `Moved to ${proj.name}` : "Moved to Conversations");
  }

  function handleArchiveConversation(id: string) {
    const updated = conversations.map((item) => (item.id === id ? { ...item, archived: !item.archived } : item));
    setConversations(updated);
    try { saveConversations(localStorage, updated); } catch { /* ignore */ }
    const target = updated.find((item) => item.id === id);
    if (target) void saveStoredConversation(target);
    zetroNotifications.success(target?.archived ? "Chat archived" : "Chat restored");
  }

  function handleDeleteConversation(id: string) {
    requestControllers.current.get(id)?.abort();
    requestControllers.current.delete(id);
    streamCancels.current.get(id)?.();
    streamCancels.current.delete(id);
    pendingState.setFor(id, null);
    const updated = conversations.filter((item) => item.id !== id);
    setConversations(updated);
    try { saveConversations(localStorage, updated); } catch { /* ignore */ }
    void deleteStoredConversation(id);
    handleCloseTab(id);
    zetroNotifications.success("Chat deleted");
  }

  function handleCopyConversation(item: Conversation) {
    const text = `${item.title}\n\n` + item.exchanges.map((e) => `User: ${e.prompt}\nZetro: ${e.result}`).join("\n\n");
    void navigator.clipboard.writeText(text);
    zetroNotifications.success("Conversation copied");
  }

  function handleDeleteExchange(index: number) {
    const updated = exchanges.filter((_, i) => i !== index);
    setExchanges(updated);
    const conversation = conversations.find((item) => item.id === activeId);
    if (conversation) {
      const next = [{ ...conversation, exchanges: updated, updatedAt: new Date().toISOString() }, ...conversations.filter((item) => item.id !== activeId)];
      setConversations(next);
      try { saveConversations(localStorage, next); } catch { /* ignore */ }
      void saveStoredConversation(next[0]!);
    }
    zetroNotifications.success("Message removed from history");
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if (attachmentBusy || (!prompt.trim() && !attachments.length)) return;
    const submitted = prompt.trim() || "Process attached files";
    const submittedAttachments = [...attachments];
    const conversationId = activeId;
    const conversationExchanges = [...exchanges];
    const conversationProjectId = newConversationProjectId;

    if (requestControllers.current.has(conversationId) || pendingTurn || workflowMutation.isPending) {
      setQueuedPrompts((current) => [...current, {
        id: `queued-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        message: submitted,
        attachments: submittedAttachments,
      }]);
      setPrompt("");
      setAttachments([]);
      setError("");
      zetroNotifications.info("Message queued", { description: "Review the current response before sending it." });
      return;
    }

    // Immediately remove from input area on submit
    setPrompt("");
    setAttachments([]);
    setError("");

    if (workflowEnabled) {
      try {
        await workflowMutation.mutateAsync({ message: submitted, mode: workflowMode, manualApprovals, queue: true });
        zetroNotifications.success("Workflow added to the orchestration queue");
      } catch (cause) {
        setError(zetroNotifications.error(cause, "Unable to start workflow."));
        setPrompt(submitted);
      } finally {
        setTimeout(() => promptInputRef.current?.focus(), 0);
      }
      return;
    }

    const pendingId = `turn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const providerLabel = activeProvider === "g" ? "Gemini" : activeProvider === "o" ? "OpenCode" : "Codex";

    // Immediately show on history and display live processing actions
    pendingState.setFor(conversationId, {
      id: pendingId,
      prompt: submitted,
      timestamp: now,
      status: "thinking",
      statusText: `Asking ${providerLabel} (${activeModel})…`,
      activities: [
        { id: "act-1", label: "Receiving prompt", status: "completed" },
        { id: "act-2", label: `Dispatching to ${providerLabel} (${activeModel})`, status: "running" },
      ],
      streamedResult: "",
    });

    const controller = new AbortController();
    requestControllers.current.set(conversationId, controller);

    const stageTimer1 = setTimeout(() => {
      pendingState.setFor(conversationId, (prev) => {
        if (!prev || prev.status !== "thinking") return prev;
        return {
          ...prev,
          statusText: `Consulting ${providerLabel} & tools…`,
          activities: [
            { id: "act-1", label: "Receiving prompt", status: "completed" },
            { id: "act-2", label: `Dispatching to ${providerLabel} (${activeModel})`, status: "completed" },
            { id: "act-3", label: "Gathering context", status: "running" },
          ],
        };
      });
    }, 1800);

    const stageTimer2 = setTimeout(() => {
      pendingState.setFor(conversationId, (prev) => {
        if (!prev || prev.status !== "thinking") return prev;
        return {
          ...prev,
          statusText: `Synthesizing ${providerLabel} response…`,
          activities: [
            { id: "act-1", label: "Receiving prompt", status: "completed" },
            { id: "act-2", label: `Dispatching to ${providerLabel} (${activeModel})`, status: "completed" },
            { id: "act-3", label: "Gathering context", status: "completed" },
            { id: "act-4", label: "Synthesizing answer", status: "running" },
          ],
        };
      });
    }, 3800);

    try {
      const result = await sendPrompt({
        agentId: zetroSettings.data?.defaultAgentId ?? "zetro",
        conversationId,
        message: submitted,
        signal: controller.signal,
        attachments: submittedAttachments,
        provider: activeProvider,
        model: activeModel,
      });

      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);

      const finalActivities = result.activities?.length
        ? result.activities
        : [
            { id: "act-1", label: "Receiving prompt", status: "completed" },
            { id: "act-2", label: "Analyzing request", status: "completed" },
            { id: "act-3", label: "Synthesizing answer", status: "completed" },
          ];

      // Stream response live
      pendingState.setFor(conversationId, (prev) =>
        prev
          ? {
              ...prev,
              status: "streaming",
              statusText: "Responding",
              activities: finalActivities,
              streamedResult: "",
            }
          : null
      );

      await new Promise<void>((resolve) => {
        const cancel = streamText(
          result.message,
          (partial) => {
            pendingState.setFor(conversationId, (prev) => (prev ? { ...prev, streamedResult: partial } : null));
          },
          () => {
            streamCancels.current.delete(conversationId);
            resolve();
          }
        );
        streamCancels.current.set(conversationId, cancel);
      });

      const updated: Exchange[] = [
        ...conversationExchanges,
        {
          id: result.runId || pendingId,
          prompt: submitted,
          result: result.message,
          timestamp: now,
          activities: finalActivities,
          workCaseId: result.workCaseId,
        },
      ];
      exchangeState.setFor(conversationId, updated);
      const prior = conversationsRef.current.find((item) => item.id === conversationId);
      const conversation: Conversation = {
        id: conversationId,
        title: updated[0]!.prompt.slice(0, 100),
        updatedAt: now,
        exchanges: updated,
        projectId: prior?.projectId ?? conversationProjectId,
        pinned: prior?.pinned,
        archived: prior?.archived,
      };
      const next = [conversation, ...conversationsRef.current.filter((item) => item.id !== conversationId)];
      conversationsRef.current = next;
      setConversations(next);
      try {
        saveConversations(localStorage, next);
      } catch {
        errorState.setFor(conversationId, "Unable to save chat history in this browser.");
      }
      void saveStoredConversation(conversation).catch(() =>
        errorState.setFor(conversationId, zetroNotifications.error(null, "Unable to save chat history in Zetro."))
      );
      pendingState.setFor(conversationId, null);
      if (activeIdRef.current !== conversationId) zetroNotifications.success("Zetro response ready", { description: conversation.title });
    } catch (cause) {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      streamCancels.current.get(conversationId)?.();
      streamCancels.current.delete(conversationId);
      pendingState.setFor(conversationId, null);
      if (!controller.signal.aborted) {
        errorState.setFor(conversationId, zetroNotifications.error(cause, "Unable to connect to Zetro."));
        promptState.setFor(conversationId, submitted);
      }
    } finally {
      requestControllers.current.delete(conversationId);
      if (activeIdRef.current === conversationId) setTimeout(() => promptInputRef.current?.focus(), 0);
    }
  }

  function prepareQueuedPrompt(id: string) {
    const queued = queuedPrompts.find((item) => item.id === id);
    if (!queued) return;
    setPrompt(queued.message);
    setAttachments(queued.attachments);
    setQueuedPrompts((current) => current.filter((item) => item.id !== id));
    setError("");
    zetroNotifications.info("Queued message moved to the composer");
    setTimeout(() => promptInputRef.current?.focus(), 0);
  }

  function discardQueuedPrompt(id: string) {
    setQueuedPrompts((current) => current.filter((item) => item.id !== id));
  }

  const runningConversationIds = useMemo(
    () => new Set(Object.entries(pendingState.values).filter(([, turn]) => turn !== null).map(([id]) => id)),
    [pendingState.values]
  );

  return <MdiTopologyRegion id="z1" topology={topology} className="flex h-full min-h-0 flex-col bg-background [&>.technical-label]:!left-auto [&>.technical-label]:!right-3">
    {sideCarTarget && createPortal(<ConversationSideCar
      topology={topology}
      conversations={conversations}
      projects={projects}
      activeId={activeId}
      runningIds={runningConversationIds}
      disabled={attachmentBusy}
      onSelect={(item) => activateConversation(item.id, item)}
      onNew={handleNewChat}
      onPin={handlePinConversation}
      onRename={handleRenameConversation}
      onArchive={handleArchiveConversation}
      onDelete={handleDeleteConversation}
      onCopy={handleCopyConversation}
      onCreateProject={handleCreateProject}
      onEditProject={handleEditProject}
      onPinProject={handlePinProject}
      onArchiveProjectChats={(id) => void handleArchiveProjectChats(id)}
      onRemoveProject={(id) => void handleRemoveProject(id)}
      onAssignProject={handleAssignProject}
    />, sideCarTarget)}
    <header {...topology?.regionProps("z3")} className="ito-region relative flex items-center justify-between gap-4 border-b border-border px-6 py-2">
      {topology?.marker("z3")}
      <div className="flex min-w-0 items-center gap-3.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Bot className="size-4" />
        </div>
        <div className="flex min-w-0 items-center gap-2.5 text-xs">
          <h1 className="text-sm font-semibold leading-none text-foreground">Zetro</h1>
          <span className="text-muted-foreground/40">·</span>
          <button
            type="button"
            onClick={() => setConnected((prev) => !prev)}
            title={`Status: ${connected ? "Connected" : "Disconnected"} (click to toggle test)`}
            aria-label={`Connection status: ${connected ? "Connected" : "Disconnected"}`}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground cursor-pointer hover:bg-muted"
          >
            <span className={`size-2 rounded-full transition-colors ${connected ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" : "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]"}`} />
            <span>{connected ? "Connected" : "Disconnected"}</span>
          </button>
          <span className="text-muted-foreground/40">·</span>
          <span className="truncate text-muted-foreground">
            Model: <span className="font-medium text-foreground">{currentModel.name}</span>
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        <Popover open={modelOpen} onOpenChange={setModelOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="relative size-8 rounded-full border-border bg-background hover:bg-accent cursor-pointer"
              title={`Select model (active: ${currentModel.name})`}
              aria-label={`Select model (active: ${currentModel.name})`}
            >
              <Cpu className="size-4 text-foreground" />
              <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background bg-primary" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 rounded-2xl border-border p-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div>
                <h3 className="text-xs font-semibold text-foreground">Select Model</h3>
                <p className="text-[11px] text-muted-foreground">Active: <span className="font-medium text-foreground">{currentModel.name}</span></p>
              </div>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{currentModel.badge}</span>
            </div>
            <div className="py-2 space-y-1">
              {ZETRO_MODELS.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => { onModelChange(model.id); setModelOpen(false); }}
                  className={`w-full flex items-start justify-between rounded-xl p-2.5 text-left text-xs transition-colors cursor-pointer ${
                    selectedModelId === model.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-foreground">{model.name}</div>
                    <div className="text-[10px] text-muted-foreground">{model.badge} · {model.desc}</div>
                  </div>
                  {selectedModelId === model.id && <Check className="size-4 text-primary shrink-0 mt-0.5 ml-2" />}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="relative size-8 rounded-full border-border bg-background hover:bg-accent cursor-pointer"
              title={`Model Features (${Object.values(features).filter(Boolean).length} active)`}
              aria-label="Model features"
            >
              <SlidersHorizontal className="size-4 text-foreground" />
              <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm">
                {Object.values(features).filter(Boolean).length}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 rounded-2xl border-border p-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div>
                <h3 className="text-xs font-semibold text-foreground">Model Features</h3>
                <p className="text-[11px] text-muted-foreground">Capabilities for {currentModel.name}</p>
              </div>
              <Sparkles className="size-4 text-primary" />
            </div>
            <div className="space-y-2 pt-2">
              {ZETRO_FEATURES.map((feature) => (
                <label key={feature.id} className="flex items-center justify-between gap-3 rounded-xl p-2 hover:bg-muted/50 cursor-pointer transition-colors">
                  <div>
                    <span className="block text-xs font-medium text-foreground">{feature.label}</span>
                    <span className="block text-[10px] text-muted-foreground">{feature.desc}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(features[feature.id])}
                    onChange={(e) => setFeatures((prev) => ({ ...prev, [feature.id]: e.target.checked }))}
                    className="size-4 cursor-pointer accent-primary rounded"
                  />
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
    <MdiTopologyRegion id="z3.1" topology={topology} className="shrink-0">
      <ConversationTabs
        activeId={activeId}
        conversations={conversations}
        openIds={openTabIds}
        runningIds={runningConversationIds}
        onClose={handleCloseTab}
        onNew={() => handleNewChat()}
        onSelect={(id) => activateConversation(id, conversations.find((item) => item.id === id))}
      />
    </MdiTopologyRegion>
    <MdiTopologyRegion id="z4" topology={topology} className="min-h-0 flex-1 overflow-y-auto px-6 py-8"><div aria-live="polite">
      <MdiTopologyRegion id="z4.1" topology={topology} className="mx-auto w-full md:w-4/5 max-w-5xl space-y-8">
        {exchanges.length || pendingTurn ? (
          <>
            {exchanges.length ? (
              groupExchangesByDate(exchanges).map((dateGroup) => (
                <section key={dateGroup.dateKey} aria-label={`Messages from ${dateGroup.dateLabel}`} className="space-y-6">
                  <div className="relative my-6 flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-2xs">
                      <Calendar className="size-3 text-muted-foreground" />
                      <span>{dateGroup.dateLabel}</span>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {dateGroup.items.map(({ exchange, index }) => (
                      <article
                        key={exchange.id}
                        className="group/turn relative space-y-4 border-b border-border/50 pb-6 pt-2"
                      >
                        <div className="group ml-auto flex max-w-[90%] flex-col items-end gap-1">
                          <div className="rounded-2xl bg-muted px-4 py-3"><p className="whitespace-pre-wrap break-words text-sm leading-6">{exchange.prompt}</p></div>
                          <div className="flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            {exchange.timestamp && <span>{formatShortTime(exchange.timestamp)}</span>}
                            <Button type="button" variant="ghost" size="icon" className="size-6 cursor-pointer text-muted-foreground hover:text-foreground" title="Copy prompt" aria-label="Copy prompt" onClick={() => copyText(exchange.prompt, `${exchange.id}-prompt`)}>
                              {copiedId === `${exchange.id}-prompt` ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                            </Button>
                            <Button type="button" variant="ghost" size="icon" className="size-6 cursor-pointer text-muted-foreground hover:text-foreground" title="Undo to this prompt" aria-label="Undo to this prompt" onClick={() => undoTo(index)}>
                              <RotateCcw className="size-3" />
                            </Button>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button type="button" variant="ghost" size="icon" className="size-6 cursor-pointer text-muted-foreground hover:text-foreground" title="More options" aria-label="Prompt options">
                                  <MoreHorizontal className="size-3" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent align="end" className="w-36 p-1 rounded-xl border-border shadow-md">
                                <Button type="button" variant="ghost" className="w-full justify-start gap-2 h-8 px-2 text-xs cursor-pointer" onClick={() => handlePinConversation(activeId)}>
                                  <Pin className="size-3.5" />
                                  Pin
                                </Button>
                                <Button type="button" variant="ghost" className="w-full justify-start gap-2 h-8 px-2 text-xs cursor-pointer" onClick={() => {
                                  const current = conversations.find((c) => c.id === activeId);
                                  setRenameTargetId(activeId);
                                  setNewChatTitle(current?.title ?? "New Chat");
                                  setRenameDialogOpen(true);
                                }}>
                                  <Pencil className="size-3.5" />
                                  Rename
                                </Button>
                                <Button type="button" variant="ghost" className="w-full justify-start gap-2 h-8 px-2 text-xs cursor-pointer" onClick={() => copyText(exchange.prompt, `${exchange.id}-prompt`)}>
                                  <Copy className="size-3.5" />
                                  Copy
                                </Button>
                                <Button type="button" variant="ghost" className="w-full justify-start gap-2 h-8 px-2 text-xs cursor-pointer" onClick={() => handleArchiveConversation(activeId)}>
                                  <Archive className="size-3.5" />
                                  Archive
                                </Button>
                                <Button type="button" variant="ghost" className="w-full justify-start gap-2 h-8 px-2 text-xs cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteExchange(index)}>
                                  <Trash2 className="size-3.5" />
                                  Delete
                                </Button>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                        <div className={`group flex items-start gap-3 ${motion ? "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300" : ""}`}>
                          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
                            <Bot className="size-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <MarkdownRenderer content={exchange.result} />
                            <div className="mt-1 flex items-center gap-1 text-muted-foreground opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                              {exchange.timestamp && <span className="mr-1 text-[10px] text-muted-foreground">{formatShortTime(exchange.timestamp)}</span>}
                              <Button type="button" variant="ghost" size="icon" className="size-7 cursor-pointer hover:text-foreground" title="Copy response" aria-label="Copy response" onClick={() => copyText(exchange.result, `${exchange.id}-result`)}>
                                {copiedId === `${exchange.id}-result` ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                              </Button>
                              <Button type="button" variant="ghost" size="icon" className={`size-7 cursor-pointer hover:text-foreground ${exchange.feedback === "up" ? "text-primary bg-primary/10" : ""}`} title="Thumbs up" aria-label="Thumbs up" onClick={() => toggleFeedback(exchange.id, "up")}>
                                <ThumbsUp className={`size-3.5 ${exchange.feedback === "up" ? "fill-current" : ""}`} />
                              </Button>
                              <Button type="button" variant="ghost" size="icon" className={`size-7 cursor-pointer hover:text-foreground ${exchange.feedback === "down" ? "text-destructive bg-destructive/10" : ""}`} title="Thumbs down" aria-label="Thumbs down" onClick={() => toggleFeedback(exchange.id, "down")}>
                                <ThumbsDown className={`size-3.5 ${exchange.feedback === "down" ? "fill-current" : ""}`} />
                              </Button>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button type="button" variant="ghost" size="icon" className="size-7 cursor-pointer hover:text-foreground" title="Share" aria-label="Share response">
                                    <Share2 className="size-3.5" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent align="start" className="w-52 p-1.5 rounded-xl">
                                  <Button type="button" variant="ghost" className="w-full justify-start gap-2 h-8 px-2 text-xs cursor-pointer" onClick={() => shareWhatsApp(`Zetro Response:\n\n${exchange.result}`)}>
                                    <MessageSquare className="size-3.5 text-emerald-600" />
                                    Share via WhatsApp
                                  </Button>
                                  <Button type="button" variant="ghost" className="w-full justify-start gap-2 h-8 px-2 text-xs cursor-pointer" onClick={() => shareEmail(`Zetro: ${exchange.prompt.slice(0, 40)}`, `Prompt: ${exchange.prompt}\n\nResponse:\n${exchange.result}`)}>
                                    <Mail className="size-3.5 text-blue-500" />
                                    Share via Email
                                  </Button>
                                </PopoverContent>
                              </Popover>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button type="button" variant="ghost" size="icon" className="size-7 cursor-pointer hover:text-foreground" title="Actions" aria-label="Response actions">
                                    <Sparkles className="size-3.5" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent align="start" className="w-48 p-1.5 rounded-xl">
                                  <Button type="button" variant="ghost" className="w-full justify-start gap-2 h-8 px-2 text-xs cursor-pointer" onClick={() => handleAction(exchange, "task")}>
                                    <CheckSquare className="size-3.5 text-primary" />
                                    Convert to task
                                  </Button>
                                  <Button type="button" variant="ghost" className="w-full justify-start gap-2 h-8 px-2 text-xs cursor-pointer" onClick={() => handleAction(exchange, "idea")}>
                                    <Lightbulb className="size-3.5 text-amber-500" />
                                    Add to ideas
                                  </Button>
                                  <Button type="button" variant="ghost" className="w-full justify-start gap-2 h-8 px-2 text-xs cursor-pointer" onClick={() => handleAction(exchange, "module")}>
                                    <Boxes className="size-3.5 text-indigo-500" />
                                    Generate modules
                                  </Button>
                                </PopoverContent>
                              </Popover>
                              <TaskHandoffControls
                                chatReview={exchanges.slice(0, index).map((item) => `You: ${item.prompt}\nZetro: ${item.result}`).join("\n\n")}
                                conversationId={activeId}
                                exchangeId={exchange.id}
                                onTaskCreated={(taskId) => linkTask(exchange.id, taskId)}
                                prompt={exchange.prompt}
                                response={exchange.result}
                                taskId={exchange.taskId}
                                workCaseId={exchange.workCaseId}
                              />
                              <div className="ml-auto">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button type="button" variant="ghost" size="icon" className="size-7 cursor-pointer hover:text-foreground" title="More options" aria-label="More options">
                                      <MoreHorizontal className="size-3.5" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent align="end" className="w-36 p-1 rounded-xl border-border shadow-md">
                                    <Button type="button" variant="ghost" className="w-full justify-start gap-2 h-8 px-2 text-xs cursor-pointer" onClick={() => handlePinConversation(activeId)}>
                                      <Pin className="size-3.5" />
                                      Pin
                                    </Button>
                                    <Button type="button" variant="ghost" className="w-full justify-start gap-2 h-8 px-2 text-xs cursor-pointer" onClick={() => {
                                      const current = conversations.find((c) => c.id === activeId);
                                      setRenameTargetId(activeId);
                                      setNewChatTitle(current?.title ?? "New Chat");
                                      setRenameDialogOpen(true);
                                    }}>
                                      <Pencil className="size-3.5" />
                                      Rename
                                    </Button>
                                    <Button type="button" variant="ghost" className="w-full justify-start gap-2 h-8 px-2 text-xs cursor-pointer" onClick={() => copyText(exchange.prompt, `${exchange.id}-prompt`)}>
                                      <Copy className="size-3.5" />
                                      Copy
                                    </Button>
                                    <Button type="button" variant="ghost" className="w-full justify-start gap-2 h-8 px-2 text-xs cursor-pointer" onClick={() => handleArchiveConversation(activeId)}>
                                      <Archive className="size-3.5" />
                                      Archive
                                    </Button>
                                    <Button type="button" variant="ghost" className="w-full justify-start gap-2 h-8 px-2 text-xs cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteExchange(index)}>
                                      <Trash2 className="size-3.5" />
                                      Delete
                                    </Button>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>
                            <TaskHandoffResult taskId={exchange.taskId} />
                          </div>
                        </div>
                        {showActivity && <div className="ml-9 space-y-1 border-l border-border pl-3 text-xs text-muted-foreground">{exchange.activities?.length ? exchange.activities.map((item) => <p key={item.id}>{item.label} · {item.status}</p>) : <p>No tool evidence reported.</p>}</div>}
                      </article>
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <div className="relative my-6 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-2xs">
                  <Calendar className="size-3 text-muted-foreground" />
                  <span>Today</span>
                </div>
              </div>
            )}

            {pendingTurn && (
              <article className="group/turn relative space-y-4 pb-6 pt-2">
                <div className="group ml-auto flex max-w-[90%] flex-col items-end gap-1">
                  <div className="rounded-2xl bg-muted px-4 py-3">
                    <p className="whitespace-pre-wrap break-words text-sm leading-6">{pendingTurn.prompt}</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
                    {pendingTurn.timestamp && <span>{formatShortTime(pendingTurn.timestamp)}</span>}
                    <span className="text-[10px] text-muted-foreground/70">· Live</span>
                  </div>
                </div>
                <div className={`group flex items-start gap-3 ${motion ? "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300" : ""}`}>
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
                    <Bot className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    {pendingTurn.status !== "streaming" ? (
                      <div className="flex items-center gap-2.5 rounded-xl bg-muted/40 px-3.5 py-2 text-sm text-muted-foreground w-fit">
                        <Spinner className="size-3.5 text-primary" />
                        <span className="text-xs font-medium text-foreground">{pendingTurn.statusText}</span>
                        <span className="inline-flex items-center gap-1 pl-0.5">
                          <span className="size-1 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.3s]" />
                          <span className="size-1 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.15s]" />
                          <span className="size-1 rounded-full bg-primary/70 animate-bounce" />
                        </span>
                      </div>
                    ) : (
                      <div>
                        <MarkdownRenderer content={pendingTurn.streamedResult} isStreaming />
                      </div>
                    )}
                    {showActivity && pendingTurn.activities?.length ? (
                      <div className="ml-9 space-y-1 border-l border-border pl-3 text-xs text-muted-foreground">
                        {pendingTurn.activities.map((item) => (
                          <p key={item.id} className="flex items-center gap-2">
                            <span className={`size-1.5 rounded-full ${item.status === "running" ? "bg-primary animate-ping" : "bg-emerald-500"}`} />
                            <span>{item.label} · {item.status}</span>
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            )}
          </>
        ) : (
          <div className="py-16 text-center"><h2 className="text-xl font-medium">What would you like to send?</h2><p className="mt-3 text-sm text-muted-foreground">Write a prompt to get a response from Zetro.</p></div>
        )}
        {sending && !pendingTurn && <article className="flex items-start gap-3 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
            <Bot className="size-3.5" />
          </div>
          <div className="flex items-center gap-2.5 rounded-xl bg-muted/40 px-3.5 py-2 text-sm text-muted-foreground w-fit">
            <Spinner className="size-3.5 text-primary" />
            <span className="text-xs font-medium text-foreground">Thinking</span>
            <span className="inline-flex items-center gap-1 pl-0.5">
              <span className="size-1 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.3s]" />
              <span className="size-1 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.15s]" />
              <span className="size-1 rounded-full bg-primary/70 animate-bounce" />
            </span>
          </div>
        </article>}
        <div ref={bottom} />
      </MdiTopologyRegion>
    </div>
    </MdiTopologyRegion>
    <MdiTopologyRegion id="z5" topology={topology} className="shrink-0 px-3 pb-5 pt-3 sm:px-6">
      <form
        onClick={() => promptInputRef.current?.focus()}
        onSubmit={(event) => void send(event)}
        className="relative mx-auto w-full md:w-4/5 max-w-5xl rounded-2xl border border-input bg-card p-3 shadow-sm cursor-text"
      >
        <MdiTopologyRegion id="z5.5" topology={topology} className="!absolute -top-5 right-3 z-10 cursor-default"><ComposerOptions activity={showActivity} motion={motion} onActivity={setShowActivity} onMotion={setMotion} workflow={<MdiTopologyRegion id="z5.6" topology={topology}><WorkflowPanel enabled={workflowEnabled} mode={workflowMode} manualApprovals={manualApprovals} onEnabled={setWorkflowEnabled} onMode={setWorkflowMode} onManualApprovals={setManualApprovals} /></MdiTopologyRegion>} /></MdiTopologyRegion>
        <MdiTopologyRegion id="z5.1" topology={topology}><textarea ref={promptInputRef} autoFocus aria-label="Prompt" disabled={attachmentBusy} maxLength={20000} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={sending ? "Queue a message for your next steer…" : "Send a prompt…"} className="min-h-20 w-full resize-none border-0 bg-transparent p-2 text-sm leading-6 shadow-none outline-none ring-0 focus:border-0 focus:shadow-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0" onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); setTimeout(() => promptInputRef.current?.focus(), 0); } }} />
        </MdiTopologyRegion>
        <AttachmentPreviews items={attachments} onChange={setAttachments} disabled={attachmentBusy} />
        {queuedPrompts.length > 0 && <MdiTopologyRegion id="z5.7" topology={topology} className="mt-2 block rounded-xl border border-dashed border-primary/35 bg-primary/5 p-2.5">
          <div className="flex items-center justify-between gap-3"><p className="text-xs font-medium text-foreground">{queuedPrompts.length} message{queuedPrompts.length === 1 ? "" : "s"} queued for your next steer</p><span className="text-[11px] text-muted-foreground">Review the response before sending.</span></div>
          <ul className="mt-2 space-y-1.5">{queuedPrompts.map((item) => <li key={item.id} className="flex items-center gap-2"><p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{item.message}</p><Button type="button" variant="ghost" size="sm" className="h-7 cursor-pointer px-2 text-xs" onClick={() => prepareQueuedPrompt(item.id)}>Use next</Button><Button type="button" variant="ghost" size="sm" className="h-7 cursor-pointer px-2 text-xs text-muted-foreground" onClick={() => discardQueuedPrompt(item.id)}>Discard</Button></li>)}</ul>
        </MdiTopologyRegion>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <AttachmentControls items={attachments} onChange={setAttachments} disabled={attachmentBusy} onBusy={setAttachmentBusy} onError={(message) => {
              setError(message);
              if (message) zetroNotifications.error(new Error(message), message);
            }} />
            <MdiTopologyRegion id="z5.2" topology={topology}>
              <ModelProviderSelector
                activeProvider={activeProvider}
                activeModel={activeModel}
                onSelect={handleSelectModelProvider}
                sending={sending}
                queuedCount={queuedPrompts.length}
                statusText={pendingTurn?.statusText}
              />
            </MdiTopologyRegion>
          </div>
          <MdiTopologyRegion id="z5.3" topology={topology}><Button type="submit" aria-label={sending ? "Queue prompt for next steer" : "Send prompt"} title={sending ? "Queue prompt for next steer" : "Send prompt"} disabled={attachmentBusy || (!prompt.trim() && !attachments.length)} className="rounded-full cursor-pointer" size="icon"><ArrowUp className="size-4" /></Button></MdiTopologyRegion>
        </div>
        {error && <MdiTopologyRegion id="z5.4" topology={topology}><p role="alert" className="mt-3 text-sm text-destructive">{error}</p></MdiTopologyRegion>}
      </form>
    </MdiTopologyRegion>

    <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Pencil className="size-4 text-primary" />
            Rename Chat
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Enter a new title for this conversation.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = newChatTitle.trim();
            if (trimmed && renameTargetId) {
              handleRenameConversation(renameTargetId, trimmed);
              setRenameDialogOpen(false);
            }
          }}
          className="space-y-4 pt-2"
        >
          <div className="space-y-1.5">
            <label htmlFor="rename-chat-input" className="text-xs font-medium text-foreground">
              Title
            </label>
            <Input
              id="rename-chat-input"
              placeholder="Enter title..."
              value={newChatTitle}
              onChange={(e) => setNewChatTitle(e.target.value)}
              autoFocus
              className="h-9 text-sm"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRenameDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!newChatTitle.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </MdiTopologyRegion>;
}
