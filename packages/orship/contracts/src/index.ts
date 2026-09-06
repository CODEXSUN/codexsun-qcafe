import { z } from "zod";

export const releasePhaseSchema = z.enum(["planned", "awaiting_approval", "approved", "published", "deploying", "running", "failed", "cancelled"]);
export const releaseTargetSchema = z.object({
  projectKey: z.string().trim().min(2).max(120),
  repository: z.string().trim().min(1).max(500).optional(),
  environment: z.enum(["local", "cloud"]),
});
export const releaseOperationSchema = z.object({
  id: z.string().uuid(),
  target: releaseTargetSchema,
  title: z.string().trim().min(3).max(160),
  sourceRevision: z.string().trim().min(1).max(160).optional(),
  version: z.string().trim().min(1).max(48).optional(),
  aiTaskId: z.string().uuid().optional(),
  phase: releasePhaseSchema,
  approvalRequired: z.boolean(),
  approvedAt: z.string().datetime().optional(),
  failure: z.string().max(2000).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export const releaseOperationEventSchema = z.object({
  id: z.number().int().positive(),
  operationId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  type: z.string().min(1),
  details: z.record(z.string(), z.unknown()),
});
export const releaseReviewStatusSchema = z.enum(["pending", "reviewed", "action_required"]);
export const releaseOperationReviewSchema = z.object({
  operationId: z.string().uuid(),
  status: releaseReviewStatusSchema,
  notes: z.string().max(4000),
  reviewedAt: z.string().datetime(),
});
export const releaseOperationReviewEventSchema = releaseOperationReviewSchema.extend({ id: z.number().int().positive() });
export const releaseHistoryEntrySchema = z.object({
  operation: releaseOperationSchema,
  events: z.array(releaseOperationEventSchema),
  review: releaseOperationReviewSchema.nullable(),
  reviews: z.array(releaseOperationReviewEventSchema),
  summary: z.object({
    outcome: z.enum(["completed", "failed", "cancelled"]),
    eventCount: z.number().int().nonnegative(),
    durationMs: z.number().int().nonnegative(),
    completedAt: z.string().datetime(),
  }),
});
export const saveReleaseOperationReviewSchema = z.object({
  status: releaseReviewStatusSchema,
  notes: z.string().trim().max(4000).default(""),
}).strict();
export const cloudReleaseStateSchema = z.object({
  version: z.string().min(1),
  phase: z.string().min(1),
  updatedAt: z.string().datetime(),
  run: z.string().min(1),
});
export const createReleaseOperationSchema = z.object({
  target: releaseTargetSchema,
  title: z.string().trim().min(3).max(160),
  sourceRevision: z.string().trim().min(1).max(160).optional(),
  aiTaskId: z.string().uuid().optional(),
  approvalRequired: z.boolean().default(true),
  clientRequestId: z.string().uuid().optional(),
}).strict();

export type ReleaseOperation = z.infer<typeof releaseOperationSchema>;
export type ReleaseOperationEvent = z.infer<typeof releaseOperationEventSchema>;
export type ReleaseReviewStatus = z.infer<typeof releaseReviewStatusSchema>;
export type ReleaseOperationReview = z.infer<typeof releaseOperationReviewSchema>;
export type ReleaseOperationReviewEvent = z.infer<typeof releaseOperationReviewEventSchema>;
export type ReleaseHistoryEntry = z.infer<typeof releaseHistoryEntrySchema>;
export type SaveReleaseOperationReview = z.input<typeof saveReleaseOperationReviewSchema>;
export type CloudReleaseState = z.infer<typeof cloudReleaseStateSchema>;
export type CreateReleaseOperation = z.input<typeof createReleaseOperationSchema>;
export type ReleasePhase = z.infer<typeof releasePhaseSchema>;
