import { z } from "zod";

export const taskStatusSchema = z.enum(["draft", "planned", "running", "awaiting_review", "completed", "failed"]);
export const workStatusSchema = z.enum(["ready", "running", "completed", "failed"]);
export const workItemSchema = z.object({
  id: z.string().uuid(), title: z.string(), instruction: z.string(), capability: z.string(), agentId: z.string(),
  status: workStatusSchema, order: z.number().int().nonnegative(), skills: z.array(z.string()).optional(), output: z.string().optional(), error: z.string().optional(),
});
export const aiTaskSchema = z.object({
  id: z.string().uuid(), title: z.string(), request: z.string(), refinedPrompt: z.string(), objective: z.string(),
  acceptanceCriteria: z.array(z.string()), status: taskStatusSchema, createdAt: z.string(), updatedAt: z.string(), workItems: z.array(workItemSchema),
});
export const createAiTaskSchema = z.object({ request: z.string().trim().min(8).max(8000) }).strict();
export type AiTask = z.infer<typeof aiTaskSchema>;
export type WorkItem = z.infer<typeof workItemSchema>;
export type CreateAiTask = z.infer<typeof createAiTaskSchema>;
