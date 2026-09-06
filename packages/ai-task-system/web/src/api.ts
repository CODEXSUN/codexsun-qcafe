import { platformFetch } from "@codexsun/platform-host-contracts";
import { aiTaskSchema, type AiTask, type CreateAiTask } from "@codexsun/ai-task-contracts";

export type AiTaskTransport = (path: string, options?: { method?: "GET" | "POST"; body?: unknown }) => Promise<unknown>;

export type AiTaskClient = {
  list(): Promise<AiTask[]>;
  create(input: CreateAiTask): Promise<AiTask>;
  start(id: string): Promise<AiTask>;
  approve(id: string): Promise<AiTask>;
};

export function createAiTaskClient(transport: AiTaskTransport): AiTaskClient {
  return {
    async list() { return aiTaskSchema.array().parse(await transport("/api/v1/ai-tasks")); },
    async create(input) { return aiTaskSchema.parse(await transport("/api/v1/ai-tasks", { method: "POST", body: input })); },
    async start(id) { return aiTaskSchema.parse(await transport(`/api/v1/ai-tasks/${id}/start`, { method: "POST" })); },
    async approve(id) { return aiTaskSchema.parse(await transport(`/api/v1/ai-tasks/${id}/approve`, { method: "POST" })); },
  };
}

export const platformAiTaskClient = createAiTaskClient(async (path, options = {}) => {
  const response = await platformFetch(path, {
    method: options.method,
    headers: options.body ? { "content-type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  const body = parseJson(text);
  if (!response.ok) throw new Error(errorMessage(body) ?? "Task System is unavailable.");
  if (body === null) throw new Error("Task System returned an invalid response.");
  return body;
});

function parseJson(text: string): unknown {
  if (!text.trim()) return null;
  try { return JSON.parse(text) as unknown; }
  catch { return null; }
}

function errorMessage(value: unknown): string | undefined {
  return typeof value === "object" && value !== null && "error" in value ? String(value.error) : undefined;
}
