import { platformFetch } from "@codexsun/platform-host-contracts";
import { aiTaskSchema, type AiTask } from "@codexsun/ai-task-contracts";
import { desktopZetroCoordinator, isDesktopZetro } from "./desktop-bridge.js";

const base = import.meta.env.VITE_ZETRO_API_URL ?? "";

export async function getAiTask(id: string): Promise<AiTask> {
  return request(`/api/v1/ai-tasks/${id}`);
}

export async function listAiTasks(): Promise<AiTask[]> {
  if (isDesktopZetro()) return aiTaskSchema.array().parse(await desktopZetroCoordinator("/api/v1/ai-tasks"));
  const response = await platformFetch(`${base}/api/v1/ai-tasks`);
  const body: unknown = await response.json();
  if (!response.ok) throw new Error("AI Task System is unavailable.");
  return aiTaskSchema.array().parse(body);
}

export async function createAndStartAiTask({ requestText, workCaseId }: { requestText: string; workCaseId?: string }): Promise<AiTask> {
  const planned = await request("/api/v1/ai-tasks", { method: "POST", body: { request: requestText, workCaseId } });
  return request(`/api/v1/ai-tasks/${planned.id}/start`, { method: "POST" });
}

export async function approveAiTask(id: string): Promise<AiTask> {
  return request(`/api/v1/ai-tasks/${id}/approve`, { method: "POST" });
}

export async function prepareTaskRelease(input: { taskId: string; projectKey: string; repository?: string }): Promise<{ id: string }> {
  if (isDesktopZetro()) return desktopZetroCoordinator(`/api/v1/ai-tasks/${input.taskId}/release`, { method: "POST", body: { projectKey: input.projectKey, repository: input.repository?.trim() || undefined } });
  const response = await platformFetch(`${base}/api/v1/ai-tasks/${input.taskId}/release`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ projectKey: input.projectKey, repository: input.repository?.trim() || undefined }),
  });
  const body = await response.json() as { id?: string; error?: string };
  if (!response.ok || !body.id) throw new Error(body.error ?? "Unable to prepare the Orship release.");
  return { id: body.id };
}

async function request(path: string, options: { method?: string; body?: unknown } = {}) {
  if (isDesktopZetro()) return aiTaskSchema.parse(await desktopZetroCoordinator(path, { method: options.method === "POST" ? "POST" : "GET", body: options.body }));
  const response = await platformFetch(`${base}${path}`, {
    method: options.method,
    headers: options.body ? { "content-type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const body: unknown = await response.json();
  if (!response.ok) throw new Error(typeof body === "object" && body && "error" in body ? String(body.error) : "AI Task System request failed.");
  return aiTaskSchema.parse(body);
}
