import { z } from "zod";

export const taskStatusSchema = z.enum(["draft", "planned", "running", "awaiting_review", "completed", "failed"]);
export const workStatusSchema = z.enum(["ready", "running", "completed", "failed"]);
export const taskSourceSchema = z.object({
  applicationId: z.string().min(1),
  applicationName: z.string().min(1),
  surface: z.enum(["web", "desktop", "mobile", "service"]),
  sender: z.string().min(1),
  subject: z.string().min(1).max(240),
  conversationId: z.string().optional(),
  exchangeId: z.string().optional(),
  returnTarget: z.string().optional(),
});
export const workItemSchema = z.object({
  id: z.string().uuid(), title: z.string(), instruction: z.string(), capability: z.string(), agentId: z.string(),
  status: workStatusSchema, order: z.number().int().nonnegative(), skills: z.array(z.string()).optional(), output: z.string().optional(), error: z.string().optional(),
});
export const aiTaskSchema = z.object({
  id: z.string().uuid(), title: z.string(), request: z.string(), refinedPrompt: z.string(), objective: z.string(),
  workCaseId: z.string().uuid().optional(),
  source: taskSourceSchema.optional(),
  acceptanceCriteria: z.array(z.string()), status: taskStatusSchema, createdAt: z.string(), updatedAt: z.string(), workItems: z.array(workItemSchema),
});
export const createAiTaskSchema = z.object({ request: z.string().trim().min(8).max(8000), clientRequestId: z.string().uuid().optional(), workCaseId: z.string().uuid().optional(), source: taskSourceSchema.optional() }).strict();
export type AiTask = z.infer<typeof aiTaskSchema>;
export type WorkItem = z.infer<typeof workItemSchema>;
export type CreateAiTask = z.infer<typeof createAiTaskSchema>;
export type TaskSource = z.infer<typeof taskSourceSchema>;

export const AI_TASK_NAVIGATE_EVENT = "codexsun:ai-task:navigate";
export type AiTaskNavigateDetail = { taskId: string };
