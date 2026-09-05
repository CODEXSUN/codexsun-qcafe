import { platformFetch } from "@codexsun/platform-host-contracts";
import { aiTaskSchema, type AiTask } from "@codexsun/ai-task-contracts";

const base = import.meta.env.VITE_ZETRO_API_URL ?? "";

export async function getAiTask(id: string): Promise<AiTask> {
  return request(`/api/v1/ai-tasks/${id}`);
}

export async function listAiTasks(): Promise<AiTask[]> {
  const response = await platformFetch(`${base}/api/v1/ai-tasks`);
  const body: unknown = await response.json();
  if (!response.ok) throw new Error("AI Task System is unavailable.");
  return aiTaskSchema.array().parse(body);
}

export async function createAndStartAiTask(requestText: string): Promise<AiTask> {
  const planned = await request("/api/v1/ai-tasks", { method: "POST", body: { request: requestText } });
  return request(`/api/v1/ai-tasks/${planned.id}/start`, { method: "POST" });
}

async function request(path: string, options: { method?: string; body?: unknown } = {}) {
  const response = await platformFetch(`${base}${path}`, {
    method: options.method,
    headers: options.body ? { "content-type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const body: unknown = await response.json();
  if (!response.ok) throw new Error(typeof body === "object" && body && "error" in body ? String(body.error) : "AI Task System request failed.");
  return aiTaskSchema.parse(body);
}
