import { platformFetch } from "@codexsun/platform-host-contracts";
import type { Conversation, Project } from "./conversations.js";

const base = import.meta.env.VITE_ZETRO_API_URL ?? "";
export type WorkspaceSnapshot = { projects: Project[]; conversations: Conversation[] };
export type WorkspaceFolders = { root: string; folders: string[] };

export async function getWorkspace(): Promise<WorkspaceSnapshot> { return request("/api/v1/zetro/workspace"); }
export async function getWorkspaceFolders(): Promise<WorkspaceFolders> { return request("/api/v1/zetro/workspace/folders"); }
export async function createWorkspaceFolder(folder: string): Promise<{ folder: string; created: true }> { return request("/api/v1/zetro/workspace/folders", { method: "POST", body: { folder } }); }
export async function saveConversation(item: Conversation) { return request(`/api/v1/zetro/workspace/conversations/${item.id}`, { method: "PUT", body: item }); }
export async function deleteConversation(id: string) { return request(`/api/v1/zetro/workspace/conversations/${id}`, { method: "DELETE" }); }
export async function saveProject(item: Project) { return request(`/api/v1/zetro/workspace/projects/${item.id}`, { method: "PUT", body: item }); }
export async function archiveProjectChats(id: string): Promise<WorkspaceSnapshot> { return request(`/api/v1/zetro/workspace/projects/${id}/archive-chats`, { method: "POST" }); }
export async function deleteProject(id: string): Promise<WorkspaceSnapshot> { return request(`/api/v1/zetro/workspace/projects/${id}`, { method: "DELETE" }); }

async function request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const response = await platformFetch(`${base}${path}`, { method: options.method, headers: options.body ? { "content-type": "application/json" } : undefined, body: options.body ? JSON.stringify(options.body) : undefined });
  const result = await response.json() as T & { error?: string };
  if (!response.ok || result.error) throw new Error(result.error ?? "Zetro workspace request failed.");
  return result;
}
