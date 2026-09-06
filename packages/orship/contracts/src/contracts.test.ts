import { expect, it } from "vitest";
import { createReleaseOperationSchema, releaseHistoryEntrySchema, saveReleaseOperationReviewSchema } from "./index.js";

it("accepts a project-owned release request", () => {
  const release = createReleaseOperationSchema.parse({ target: { projectKey: "codexsun-os", environment: "cloud" }, title: "Publish release state" });
  expect(release.approvalRequired).toBe(true);
});

it("validates durable release reviews and complete history entries", () => {
  expect(saveReleaseOperationReviewSchema.parse({ status: "reviewed", notes: "Deployment evidence accepted." })).toMatchObject({ status: "reviewed" });
  expect(releaseHistoryEntrySchema.parse({
    operation: { id: crypto.randomUUID(), target: { projectKey: "codexsun-os", environment: "cloud" }, title: "Publish release", version: "0.1.31", phase: "running", approvalRequired: false, createdAt: "2026-09-06T09:00:00.000Z", updatedAt: "2026-09-06T09:02:00.000Z" },
    events: [], review: null, reviews: [],
    summary: { outcome: "completed", eventCount: 0, durationMs: 120000, completedAt: "2026-09-06T09:02:00.000Z" },
  }).summary.outcome).toBe("completed");
});
