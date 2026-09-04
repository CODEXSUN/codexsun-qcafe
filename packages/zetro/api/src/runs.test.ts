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
  const { engine } = setup();
  const run = engine.create({ message: "Approved work", agentIds: [] });
  await vi.waitFor(() => expect(run.status).toBe("awaiting_approval"));
  expect(run.approval?.kind).toBe("plan");
  engine.approve(run.id, "approve", "Plan reviewed");
  await vi.waitFor(() => expect(engine.get(run.id)?.approval?.kind).toBe("completion"));
  engine.approve(run.id, "approve", "Evidence reviewed");
  await vi.waitFor(() => expect(engine.get(run.id)?.status).toBe("completed"));
});
