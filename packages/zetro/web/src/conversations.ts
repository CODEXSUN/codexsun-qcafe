export type Exchange = {
  id: string;
  prompt: string;
  result: string;
  timestamp?: string;
  feedback?: "up" | "down";
  activities?: { id: string; label: string; status: string }[];
  taskId?: string;
  workCaseId?: string;
};
export type Project = {
  id: string;
  name: string;
  projectNumber?: string;
  icon?: string;
  color?: "slate" | "violet" | "amber" | "blue" | "rose";
  description?: string;
  gitRepositoryUrl?: string;
  createdAt?: string;
  pinned?: boolean;
  localFolder?: string;
  status?: "new" | "planning" | "active" | "on_hold" | "completed";
  kind?: "project" | "addon";
};

export type Conversation = {
  id: string;
  title: string;
  updatedAt: string;
  exchanges: Exchange[];
  pinned?: boolean;
  archived?: boolean;
  projectId?: string;
};
const key = "zetro.prompt-conversations.v1";
const projectsKey = "zetro.prompt-projects.v1";

export const DEFAULT_PROJECTS: Project[] = [
  {
    id: "proj-1",
    name: "DevKit",
    projectNumber: "PRJ-0001",
    icon: "cx",
    color: "slate",
    description: "Plan and deliver the DevKit project lifecycle from roadmap through review.",
    status: "planning",
    kind: "project",
  },
  {
    id: "proj-2",
    name: "Techmedia.in",
    projectNumber: "PRJ-0002",
    icon: "TM",
    color: "violet",
    description: "Online shoping cart with portfolio",
    status: "new",
    kind: "project",
  },
  {
    id: "proj-3",
    name: "app.techmedia.in",
    projectNumber: "PRJ-0003",
    icon: "TM",
    color: "amber",
    description: "application backend for frappe backend and react front",
    status: "new",
    kind: "project",
  },
  {
    id: "proj-4",
    name: "Tirupur Connect",
    projectNumber: "PRJ-0004",
    icon: "TC",
    color: "blue",
    description: "B2B connect",
    status: "new",
    kind: "project",
  },
  {
    id: "proj-5",
    name: "CXSHOP",
    projectNumber: "PRJ-0005",
    icon: "cx",
    color: "rose",
    description: "Online Shopping cart",
    status: "new",
    kind: "project",
  },
];

export function loadProjects(storage: Pick<Storage, "getItem">): Project[] {
  try {
    const raw = storage.getItem(projectsKey);
    if (!raw) return DEFAULT_PROJECTS;
    const items: unknown = JSON.parse(raw);
    if (Array.isArray(items) && items.length > 0) {
      return items.filter((p): p is Project => typeof p?.id === "string" && typeof p?.name === "string");
    }
  } catch {
    // fallback to defaults
  }
  return DEFAULT_PROJECTS;
}

export function saveProjects(storage: Pick<Storage, "setItem">, items: Project[]) {
  storage.setItem(projectsKey, JSON.stringify(items));
}

export function formatShortTime(isoString?: string): string {
  const date = isoString ? new Date(isoString) : new Date();
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function loadConversations(storage: Pick<Storage, "getItem">): Conversation[] {
  const items: unknown = JSON.parse(storage.getItem(key) ?? "[]");
  if (!Array.isArray(items)) throw new Error("Invalid conversation history.");
  return items.filter((item): item is Conversation => typeof item?.id === "string" && typeof item.title === "string" && Number.isFinite(Date.parse(item.updatedAt)) && Array.isArray(item.exchanges) && item.exchanges.every((entry: Exchange) => typeof entry?.id === "string" && typeof entry.prompt === "string" && typeof entry.result === "string"));
}

export function saveConversations(storage: Pick<Storage, "setItem">, items: Conversation[]) {
  storage.setItem(key, JSON.stringify(items));
}

export function conversationGroup(updatedAt: string, now = new Date()) {
  const date = new Date(updatedAt);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const day = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const age = Math.floor((today - day) / 86_400_000);
  return age <= 0 ? "Today" : age === 1 ? "Yesterday" : age < 7 ? "Previous 7 days" : "Older";
}

export function formatChatDateDivider(isoString?: string, now = new Date()): string {
  const date = isoString ? new Date(isoString) : now;
  if (!Number.isFinite(date.getTime())) return "Today";
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export type ExchangeDateGroup = {
  dateKey: string;
  dateLabel: string;
  items: { exchange: Exchange; index: number }[];
};

export function groupExchangesByDate(exchanges: Exchange[], now = new Date()): ExchangeDateGroup[] {
  const groups: ExchangeDateGroup[] = [];
  let currentGroup: ExchangeDateGroup | null = null;

  exchanges.forEach((exchange, index) => {
    const date = exchange.timestamp ? new Date(exchange.timestamp) : now;
    const dateKey = Number.isFinite(date.getTime())
      ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
      : "today";
    const dateLabel = formatChatDateDivider(exchange.timestamp, now);

    if (!currentGroup || currentGroup.dateKey !== dateKey) {
      currentGroup = { dateKey, dateLabel, items: [] };
      groups.push(currentGroup);
    }
    currentGroup.items.push({ exchange, index });
  });

  return groups;
}
