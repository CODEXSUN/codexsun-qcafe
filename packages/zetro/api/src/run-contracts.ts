import { z } from "zod";
import { agentIdSchema, type AgentTurn } from "./contracts.js";

export const runInputSchema = z.object({
  message: z.string().trim().min(1).max(8000),
  agentIds: z.array(agentIdSchema).max(8).default([]),
  mode: z.enum(["sequential", "langgraph"]).default("sequential"),
  manualApprovals: z.boolean().default(true),
  queue: z.boolean().default(false),
  workCaseId: z.string().uuid().optional(),
}).strict();
export type RunInput = z.input<typeof runInputSchema>;
export type RunTask = {
  id: string; title: string; agentId: string; task: string; dependencies: string[];
  stage: "understand" | "plan" | "work" | "review";
  status: "pending" | "running" | "waiting_approval" | "completed" | "failed";
  startedAt?: string; endedAt?: string; result?: AgentTurn; error?: string;
};
export type OrchestrationRun = {
  id: string; message: string; createdAt: string; updatedAt: string;
  workCaseId?: string;
  mode: "sequential" | "langgraph"; manualApprovals: boolean;
  status: "queued" | "running" | "awaiting_approval" | "completed" | "failed" | "interrupted" | "cancelled";
  approval?: { taskId: string; kind: "plan" | "completion"; status: "pending" | "approved" | "rejected"; requestedAt: string; decidedAt?: string; note?: string };
  tasks: RunTask[];
  usage?: { inputTokens: number; outputTokens: number; cachedInputTokens: number } | null;
};

export const approvalInputSchema = z.object({ decision: z.enum(["approve", "reject"]), note: z.string().trim().max(1000).optional() }).strict();
