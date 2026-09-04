import type { AiTask } from "@codexsun/ai-task-contracts";
import type { TaskPlan } from "../domain/task.js";

export interface TaskRepository { list(): AiTask[]; get(id: string): AiTask | undefined; save(task: AiTask, event: string, details?: Record<string, unknown>): void; close(): void }
export interface TaskPlanner { plan(request: string, agents: AgentCapability[]): Promise<TaskPlan> }
export interface TaskWorker { agents(): Promise<AgentCapability[]>; execute(agentId: string, instruction: string): Promise<string> }
export type AgentCapability = { id: string; name: string; duty: string; skills: string[]; configured: boolean };
