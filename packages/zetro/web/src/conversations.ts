export type Exchange = {
  id: string;
  prompt: string;
  result: string;
  timestamp?: string;
  feedback?: "up" | "down";
  activities?: { id: string; label: string; status: string }[];
};
export type Project = {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
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
  { id: "proj-1", name: "Core Platform", description: "Platform services and runtime" },
  { id: "proj-2", name: "Agent Workflows", description: "Zetro autonomous agents" },
  { id: "proj-3", name: "UI Components", description: "Design system & interface modules" },
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
