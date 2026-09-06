import { expect, it, vi } from "vitest";
import { createAiTaskClient } from "./api.js";

const task = {
  id: "b8ef4f14-e4fe-4fbd-b1a9-90c0b9223b64",
  title: "Review project",
  request: "Review the connected project",
  refinedPrompt: "Review the connected project and report evidence.",
  objective: "Return a verified review.",
  acceptanceCriteria: ["Evidence is returned."],
  status: "planned" as const,
  createdAt: "2026-09-06T12:00:00.000Z",
  updatedAt: "2026-09-06T12:00:00.000Z",
  workItems: [],
  source: { applicationId: "app.zetro", applicationName: "Zetro", surface: "desktop" as const, sender: "Zetro Desk", subject: "Review project" },
};

it("uses an injected desktop transport for the shared task list and handoff metadata", async () => {
  const transport = vi.fn(async () => [task]);
  const client = createAiTaskClient(transport);
  await expect(client.list()).resolves.toEqual([task]);
  expect(transport).toHaveBeenCalledWith("/api/v1/ai-tasks");
});
