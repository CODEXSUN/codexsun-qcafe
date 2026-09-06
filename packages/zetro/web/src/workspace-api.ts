import { platformFetch } from "@codexsun/platform-host-contracts";
import type { Conversation, Project } from "./conversations.js";
import { desktopZetroCoordinator, isDesktopZetro } from "./desktop-bridge.js";

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
  if (isDesktopZetro()) {
    return desktopZetroCoordinator<T>(path, { method: asDesktopMethod(options.method), body: options.body });
  }
  const response = await platformFetch(`${base}${path}`, { method: options.method, headers: options.body ? { "content-type": "application/json" } : undefined, body: options.body ? JSON.stringify(options.body) : undefined });
  const text = await response.text();
  if (!response.ok) {
    const detail = parseResponse<T>(text)?.error;
    throw new Error(detail ?? "Unable to reach the Zetro workspace coordinator.");
  }
  const result = parseResponse<T>(text);
  if (!result) throw new Error("The Zetro workspace coordinator returned an invalid response.");
  if (result.error) throw new Error(result.error);
  return result;
}

function parseResponse<T>(text: string): (T & { error?: string }) | null {
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T & { error?: string };
  } catch {
    return null;
  }
}

function asDesktopMethod(method?: string): "GET" | "POST" | "PUT" | "DELETE" {
  return method === "POST" || method === "PUT" || method === "DELETE" ? method : "GET";
}
