import { z } from "zod";

export const workCaseStatusSchema = z.enum([
  "open",
  "planning",
  "executing",
  "awaiting_review",
  "completed",
  "failed",
  "release_planned",
]);

export const workCaseReferenceKindSchema = z.enum([
  "conversation",
  "prompt",
  "run",
  "task",
  "evidence",
  "learning_proposal",
  "release",
]);

export const workCaseReferenceSchema = z.object({
  kind: workCaseReferenceKindSchema,
  id: z.string().min(1).max(160),
  createdAt: z.string().datetime(),
});

export const workCaseSchema = z.object({
  id: z.string().uuid(),
  request: z.string().trim().min(1).max(20_000),
  status: workCaseStatusSchema,
  references: z.array(workCaseReferenceSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const workCaseEventSchema = z.object({
  id: z.number().int().positive(),
  workCaseId: z.string().uuid(),
  type: z.string().min(1).max(120),
  details: z.record(z.string(), z.unknown()),
  occurredAt: z.string().datetime(),
});

export type WorkCase = z.infer<typeof workCaseSchema>;
export type WorkCaseEvent = z.infer<typeof workCaseEventSchema>;
export type WorkCaseStatus = z.infer<typeof workCaseStatusSchema>;
export type WorkCaseReferenceKind = z.infer<typeof workCaseReferenceKindSchema>;
