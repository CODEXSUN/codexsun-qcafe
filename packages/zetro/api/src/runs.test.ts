import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { RunEngine } from "./runs.js";
import { ZetroDispatcher } from "./dispatcher.js";
import { AgentRegistry } from "./registry.js";

const directories: string[] = [];
afterEach(() => directories.splice(0).forEach((directory) => rmSync(directory, { recursive: true, force: true })));
function setup(fail = false) {
  const directory = mkdtempSync(join(tmpdir(), "zetro-run-")); directories.push(directory);
  const registry = new AgentRegistry(["zetro", "image-agent"].map((id) => ({ id, name: id, duty: "Test", skills: [], url: "http://localhost:4210", tokenEnv: "TEST_TOKEN" })), { TEST_TOKEN: "test" });
  const dispatcher = new ZetroDispatcher(registry);
  const send = vi.spyOn(dispatcher, "send").mockImplementation(async (agentId) => {
    if (fail && agentId === "image-agent") throw new Error("Runtime unavailable");
    return { agentId, conversationId: crypto.randomUUID(), runId: crypto.randomUUID(), message: "Test response", provider: "codex", activities: [], usage: null };
  });
  return { directory, dispatcher, send, engine: new RunEngine(dispatcher, directory) };
}

it("persists a delegated run with Zetro planning and contributing", async () => {
  const { engine, send, dispatcher, directory } = setup();
  const run = engine.create({ message: "Create a brief", agentIds: ["image-agent"] });
  await vi.waitFor(() => expect(run.status).toBe("completed"));
  expect(send.mock.calls.map(([id]) => id)).toEqual(["zetro", "image-agent", "zetro"]);
  expect(run.tasks[2]?.dependencies).toHaveLength(2);
  expect(new RunEngine(dispatcher, directory).get(run.id)?.status).toBe("completed");
});

it("blocks synthesis after a child failure", async () => {
  const { engine, send } = setup(true);
  const run = engine.create({ message: "Create a brief", agentIds: ["image-agent"] });
  await vi.waitFor(() => expect(run.status).toBe("failed"));
  expect(send).toHaveBeenCalledTimes(2);
  expect(run.tasks[2]?.status).toBe("pending");
});

it("supports Zetro alone and rejects overlapping runs", async () => {
  const { engine } = setup();
  const run = engine.create({ message: "Answer directly", agentIds: [] });
  expect(() => engine.create({ message: "Overlapping", agentIds: [] })).toThrow("active");
  await vi.waitFor(() => expect(run.status).toBe("completed"));
  expect(run.tasks.every((task) => task.agentId === "zetro")).toBe(true);
});
