import { z } from "zod";

export const agentIdSchema = z.string().regex(/^[a-z][a-z0-9-]{0,63}$/u);
export const attachmentSchema = z.object({ name: z.string().min(1).max(255), mime: z.string().max(120), data: z.string().max(2_800_000).regex(/^[A-Za-z0-9+/]*={0,2}$/u) }).strict();
export type PromptAttachment = z.infer<typeof attachmentSchema>;
export const messageInputSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(20_000),
  attachments: z.array(attachmentSchema).max(3).refine((items) => items.reduce((size, item) => size + item.data.length, 0) <= 2_800_000, "Attachments exceed 2 MB.").optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
}).strict();
export const dispatchInputSchema = messageInputSchema.extend({ agentId: agentIdSchema, workCaseId: z.string().uuid().optional() });
export const agentProfileSchema = z.object({
  id: agentIdSchema,
  name: z.string().min(1).max(100),
  duty: z.string().min(1).max(8_000),
  skills: z.array(z.string().regex(/^[a-z0-9-]+\.md$/u)).max(30),
}).strict();
export const turnSchema = z.object({
  agentId: agentIdSchema,
  conversationId: z.string().uuid(),
  message: z.string().min(1).max(100_000),
  provider: z.enum(["codex", "openai-compatible"]),
  runId: z.string().uuid(),
  activities: z.array(z.object({
    id: z.string(), kind: z.literal("tool"), label: z.string(), status: z.literal("completed"),
  })),
  usage: z.object({ inputTokens: z.number(), outputTokens: z.number(), cachedInputTokens: z.number() }).nullable(),
  workCaseId: z.string().uuid().optional(),
  connection: z.object({
    id: z.string(),
    name: z.string(),
    model: z.string(),
  }).optional(),
});
export type AgentProfile = z.infer<typeof agentProfileSchema>;
export type MessageInput = z.infer<typeof messageInputSchema>;
export type AgentTurn = z.infer<typeof turnSchema>;
export type AgentSummary = AgentProfile & {
  configured: boolean;
  runtimeStatus?: "healthy" | "offline" | "unconfigured";
  mode?: "local-demo" | "provider" | "local-cli" | "docker-local" | "docker-vps";
  providers?: Array<{
    id: string;
    name: string;
    model: string;
    configured: boolean;
    busy?: boolean;
    connectedAs?: string;
    connectionMethod?: string;
  }>;
};
