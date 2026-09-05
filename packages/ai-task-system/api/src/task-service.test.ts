import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { RulePlanner, SqliteTaskRepository, TaskService, type TaskWorker } from "./index.js";

const directories: string[] = [];
const services: TaskService[] = [];
afterEach(() => { services.splice(0).forEach((service) => service.close()); directories.splice(0).forEach((directory) => rmSync(directory, { recursive: true, force: true })); });
function setup() {
  const directory = mkdtempSync(join(tmpdir(), "ai-task-")); directories.push(directory);
  const worker: TaskWorker = { agents: async () => [{ id: "zetro", name: "Zetro", duty: "Coordinate and review", skills: [], configured: true }], execute: vi.fn(async (_agent, instruction) => `Evidence for ${instruction.slice(0, 20)}`) };
  const service = new TaskService(new SqliteTaskRepository(join(directory, "tasks.db")), new RulePlanner(), worker); services.push(service); return { service, worker };
}
it("plans, executes, persists evidence, and waits for final review", async () => {
  const { service, worker } = setup(); const task = await service.create({ request: "Build a reusable backend task module" });
  expect(task.status).toBe("planned"); expect(task.workItems).toHaveLength(3);
  service.start(task.id); await vi.waitFor(() => expect(service.get(task.id)?.status).toBe("awaiting_review"));
  expect(worker.execute).toHaveBeenCalledTimes(3); expect(service.approve(task.id).status).toBe("completed");
});
it("deduplicates retried task submissions and rejects conflicting payloads", async () => {
  const { service } = setup();
  const clientRequestId = "c189742b-d305-4407-905b-1eb6e6d3eb03";
  const input = { clientRequestId, request: "Verify the connectivity checklist" };
  const [first, retry] = await Promise.all([service.create(input), service.create(input)]);
  expect(first.id).toBe(retry.id);
  expect(service.list()).toHaveLength(1);
  await expect(service.create({ ...input, request: "A different request using the same identifier" })).rejects.toThrow(/different task/);
});
