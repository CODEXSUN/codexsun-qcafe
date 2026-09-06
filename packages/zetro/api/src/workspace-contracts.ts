import { z } from "zod";
import { agentIdSchema } from "./contracts.js";

export const exchangeSchema = z.object({ id: z.string().min(1), prompt: z.string(), result: z.string(), timestamp: z.string().optional(), feedback: z.enum(["up", "down"]).optional(), activities: z.array(z.object({ id: z.string(), label: z.string(), status: z.string() })).optional(), taskId: z.string().uuid().optional() });
export const conversationSchema = z.object({ id: z.string().min(1), title: z.string().min(1).max(160), updatedAt: z.string(), exchanges: z.array(exchangeSchema), pinned: z.boolean().optional(), archived: z.boolean().optional(), projectId: z.string().optional() });
export const projectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  projectNumber: z.string().trim().min(1).max(40).optional(),
  icon: z.string().trim().min(1).max(8).optional(),
  color: z.enum(["slate", "violet", "amber", "blue", "rose"]).optional(),
  description: z.string().max(500).optional(),
  gitRepositoryUrl: z.string().url().max(1_000).optional(),
  localFolder: z.string().max(500).optional(),
  status: z.enum(["new", "planning", "active", "on_hold", "completed"]).optional(),
  createdAt: z.string().optional(),
  pinned: z.boolean().optional(),
  kind: z.enum(["project", "addon"]).optional(),
});
export const createFolderSchema = z.object({ folder: z.string().trim().min(1).max(500) }).strict();
export const workspaceSchema = z.object({ projects: z.array(projectSchema), conversations: z.array(conversationSchema) });
export const runtimeTargetSchema = z.enum(["local", "docker-local", "docker-vps"]);
export const settingsSchema = z.object({
  repositoryRoot: z.string().trim().min(1).max(1_000),
  githubUrl: z.union([z.literal(""), z.string().url().max(1_000)]),
  enabledAgentIds: z.array(agentIdSchema).max(32),
  defaultAgentId: agentIdSchema,
  runtimeTarget: runtimeTargetSchema.default("docker-local"),
  vpsAgentUrl: z.union([z.literal(""), z.string().url().max(1_000)]).default(""),
}).strict();
export type ZetroConversation = z.infer<typeof conversationSchema>;
export type ZetroProject = z.infer<typeof projectSchema>;
export type ZetroWorkspace = z.infer<typeof workspaceSchema>;
export type ZetroSettings = z.infer<typeof settingsSchema>;
export type RuntimeTarget = z.infer<typeof runtimeTargetSchema>;
