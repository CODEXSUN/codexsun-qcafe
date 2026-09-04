import { aiTaskSchema, type AiTask } from "@codexsun/ai-task-contracts";

async function result(response: Response): Promise<AiTask> { const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Task request failed."); return aiTaskSchema.parse(body); }
export async function listTasks() { const response = await fetch("/api/v1/ai-tasks"); if (!response.ok) throw new Error("Task system is unavailable."); return aiTaskSchema.array().parse(await response.json()); }
export async function createTask(request: string) { return result(await fetch("/api/v1/ai-tasks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ request }) })); }
export async function startTask(id: string) { return result(await fetch(`/api/v1/ai-tasks/${id}/start`, { method: "POST" })); }
export async function approveTask(id: string) { return result(await fetch(`/api/v1/ai-tasks/${id}/approve`, { method: "POST" })); }
