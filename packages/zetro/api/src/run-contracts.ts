import { z } from "zod";
import { agentIdSchema, type AgentTurn } from "./contracts.js";

export const runInputSchema = z.object({
  message: z.string().trim().min(1).max(8000),
  agentIds: z.array(agentIdSchema).max(8).default([]),
}).strict();
export type RunInput = z.infer<typeof runInputSchema>;
export type RunTask = {
  id: string; agentId: string; task: string; dependencies: string[];
  status: "pending" | "running" | "completed" | "failed";
  startedAt?: string; endedAt?: string; result?: AgentTurn; error?: string;
};
export type OrchestrationRun = {
  id: string; message: string; createdAt: string;
  status: "queued" | "running" | "completed" | "failed" | "interrupted";
  tasks: RunTask[];
};
