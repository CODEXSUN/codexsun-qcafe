import { z } from "zod";

export const moduleKindSchema = z.enum(["platform", "application", "addon", "feature"]);
export const runtimeSchema = z.enum(["node", "python", "rust", "static"]);

export const moduleManifestSchema = z.object({
  capabilities: z.array(z.string().min(1)).default([]),
  dependencies: z.array(z.string().min(1)).default([]),
  description: z.string().min(1),
  id: z.string().regex(/^[a-z][a-z0-9.-]+$/u),
  kind: moduleKindSchema,
  name: z.string().min(1),
  runtime: runtimeSchema,
  version: z.string().regex(/^\d+\.\d+\.\d+$/u),
});

export type ModuleManifest = z.infer<typeof moduleManifestSchema>;

export const deploymentStateSchema = z.enum([
  "draft",
  "planned",
  "building",
  "ready",
  "deploying",
  "running",
  "failed",
  "stopped",
]);

export type DeploymentState = z.infer<typeof deploymentStateSchema>;

export type Deployment = {
  id: string;
  moduleId: string;
  provider: "local-preview" | "docker" | "cloudflare";
  state: DeploymentState;
  updatedAt: string;
};

export type RefinementProposal = {
  id: string;
  evidence: string;
  status: "candidate" | "accepted" | "rejected";
  summary: string;
};

export type ControlPlaneSnapshot = {
  deployments: Deployment[];
  modules: ModuleManifest[];
  refinements: RefinementProposal[];
  system: {
    agentMode: "reviewed-learning";
    executionMode: "provider-isolated";
    name: string;
    version: string;
  };
};

export const chatMessageInputSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(20_000),
});

export type ChatMessageInput = z.infer<typeof chatMessageInputSchema>;

export type ChatActivity = {
  id: string;
  kind: "command" | "error" | "file" | "reasoning" | "search" | "todo" | "tool";
  label: string;
  status: "completed" | "failed" | "running";
};

export type ChatTurnResponse = {
  activities: ChatActivity[];
  conversationId: string;
  message: string;
  provider: "codex-sidecar";
  runId: string;
  usage: {
    cachedInputTokens: number;
    inputTokens: number;
    outputTokens: number;
  } | null;
};
