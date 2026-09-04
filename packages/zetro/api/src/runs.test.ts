import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { RunEngine } from "./runs.js";
import { ZetroDispatcher } from "./dispatcher.js";
import { AgentRegistry } from "./registry.js";

const directories: string[] = [];
const engines: RunEngine[] = [];
afterEach(() => { engines.splice(0).forEach((engine) => engine.close()); directories.splice(0).forEach((directory) => rmSync(directory, { recursive: true, force: true })); });
function setup(fail = false) {
  const directory = mkdtempSync(join(tmpdir(), "zetro-run-")); directories.push(directory);
  const registry = new AgentRegistry(["zetro", "image-agent"].map((id) => ({ id, name: id, duty: "Test", skills: [], url: "http://localhost:4210", tokenEnv: "TEST_TOKEN" })), { TEST_TOKEN: "test" });
  const dispatcher = new ZetroDispatcher(registry);
  const send = vi.spyOn(dispatcher, "send").mockImplementation(async (agentId) => {
    if (fail && agentId === "image-agent") throw new Error("Runtime unavailable");
    return { agentId, conversationId: crypto.randomUUID(), runId: crypto.randomUUID(), message: "Test response", provider: "codex", activities: [], usage: null };
  });
  const engine = new RunEngine(dispatcher, join(directory, "zetro.db")); engines.push(engine);
  return { directory, dispatcher, send, engine };
}

it("persists a delegated run with Zetro planning and contributing", async () => {
  const { engine, send, dispatcher, directory } = setup();
  const run = engine.create({ message: "Create a brief", agentIds: ["image-agent"], manualApprovals: false });
  await vi.waitFor(() => expect(run.status).toBe("completed"));
  expect(send.mock.calls.map(([id]) => id)).toEqual(["zetro", "zetro", "image-agent", "zetro", "image-agent", "zetro"]);
  expect(run.tasks.at(-1)?.dependencies).toHaveLength(1);
  const restored = new RunEngine(dispatcher, join(directory, "zetro.db")); engines.push(restored);
  expect(restored.get(run.id)?.status).toBe("completed");
});

it("blocks synthesis after a child failure", async () => {
  const { engine, send } = setup(true);
  const run = engine.create({ message: "Create a brief", agentIds: ["image-agent"], manualApprovals: false });
  await vi.waitFor(() => expect(run.status).toBe("failed"));
  expect(send).toHaveBeenCalledTimes(3);
  expect(run.tasks.at(-1)?.status).toBe("pending");
});

it("supports Zetro alone and rejects overlapping runs", async () => {
  const { engine } = setup();
  const run = engine.create({ message: "Answer directly", agentIds: [], manualApprovals: false, mode: "langgraph" });
  expect(() => engine.create({ message: "Overlapping", agentIds: [] })).toThrow("active");
  await vi.waitFor(() => expect(run.status).toBe("completed"));
  expect(run.tasks.every((task) => task.agentId === "zetro")).toBe(true);
});

it("persists both manual approval gates", async () => {
  const { engine, send } = setup();
  const run = engine.create({ message: "Approved work", agentIds: [] });
  await vi.waitFor(() => expect(run.status).toBe("awaiting_approval"));
  expect(run.approval?.kind).toBe("plan");
  expect(send).toHaveBeenCalledTimes(3);
  engine.approve(run.id, "approve", "Plan reviewed");
  await vi.waitFor(() => expect(engine.get(run.id)?.approval?.kind).toBe("completion"));
  expect(send).toHaveBeenCalledTimes(5);
  expect(engine.get(run.id)?.tasks.at(-1)?.result?.message).toBe("Test response");
  engine.approve(run.id, "approve", "Evidence reviewed");
  await vi.waitFor(() => expect(engine.get(run.id)?.status).toBe("completed"));
});

it("revises rejected plans before requesting approval again", async () => {
  const { engine, send } = setup();
  const run = engine.create({ message: "Revise this plan", agentIds: [] });
  await vi.waitFor(() => expect(run.status).toBe("awaiting_approval"));
  engine.approve(run.id, "reject", "Add rollback steps");
  await vi.waitFor(() => expect(engine.get(run.id)?.status).toBe("awaiting_approval"));
  expect(send).toHaveBeenCalledTimes(4);
  expect(send.mock.calls.at(-1)?.[1].message).toContain("Reviewer requested changes:\nAdd rollback steps");
  expect(engine.get(run.id)?.approval?.kind).toBe("plan");
});

it("keeps a persisted approval gate exclusive", async () => {
  const { engine } = setup();
  const run = engine.create({ message: "Wait for approval", agentIds: [] });
  await vi.waitFor(() => expect(run.status).toBe("awaiting_approval"));
  expect(() => engine.create({ message: "Do not overlap", agentIds: [] })).toThrow("active");
});

it("cancels a waiting run and permits an explicit retry", async () => {
  const { engine } = setup();
  const run = engine.create({ message: "Cancelable work", agentIds: [] });
  await vi.waitFor(() => expect(run.status).toBe("awaiting_approval"));
  expect(engine.cancel(run.id).status).toBe("cancelled");
  expect(engine.get(run.id)?.status).toBe("cancelled");
  expect(engine.resume(run.id).status).toBe("running");
  await vi.waitFor(() => expect(engine.get(run.id)?.status).toBe("awaiting_approval"));
});

it("aggregates token usage across completed tasks", async () => {
  const directory = mkdtempSync(join(tmpdir(), "zetro-run-usage-"));
  directories.push(directory);
  const registry = new AgentRegistry([{ id: "zetro", name: "zetro", duty: "Test", skills: [], url: "http://localhost:4210", tokenEnv: "TEST_TOKEN" }], { TEST_TOKEN: "test" });
  const dispatcher = new ZetroDispatcher(registry);
  vi.spyOn(dispatcher, "send").mockImplementation(async (agentId) => ({
    agentId,
    conversationId: crypto.randomUUID(),
    runId: crypto.randomUUID(),
    message: "Response",
    provider: "codex",
    activities: [],
    usage: { inputTokens: 10, outputTokens: 5, cachedInputTokens: 2 },
  }));
  const engine = new RunEngine(dispatcher, join(directory, "zetro.db"));
  engines.push(engine);
  const run = engine.create({ message: "Calculate tokens", agentIds: [], manualApprovals: false });
  await vi.waitFor(() => expect(run.status).toBe("completed"));
  expect(run.usage).toEqual({ inputTokens: 50, outputTokens: 25, cachedInputTokens: 10 });
  expect(engine.get(run.id)?.usage).toEqual({ inputTokens: 50, outputTokens: 25, cachedInputTokens: 10 });
});

it("enqueues runs and executes them sequentially when queue is true", async () => {
  const { engine } = setup();
  const run1 = engine.create({ message: "First run", agentIds: [], manualApprovals: false });
  const run2 = engine.create({ message: "Queued run", agentIds: [], manualApprovals: false, queue: true });
  expect(run2.status).toBe("queued");
  await vi.waitFor(() => expect(run1.status).toBe("completed"));
  await vi.waitFor(() => expect(engine.get(run2.id)?.status).toBe("completed"));
});

it("emits live events via engine.subscribe", async () => {
  const { engine } = setup();
  const events: string[] = [];
  const run = engine.create({ message: "Event streaming", agentIds: [], manualApprovals: false });
  engine.subscribe(run.id, (payload) => events.push(payload.event));
  await vi.waitFor(() => expect(run.status).toBe("completed"));
  expect(events).toContain("task.completed");
  expect(events).toContain("run.completed");
});
