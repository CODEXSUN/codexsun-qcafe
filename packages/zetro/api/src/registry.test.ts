import { afterEach, expect, it, vi } from "vitest";
import { AgentRegistry } from "./registry.js";

const endpoint = { id: "image-agent", name: "Image Agent", duty: "Create image briefs", skills: ["image-brief.md"], url: "http://127.0.0.1:4211", tokenEnv: "TEST_TOKEN" };
afterEach(() => vi.unstubAllGlobals());

it("requires a matching healthy runtime before showing green", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "ok", configured: true, agentId: "image-agent", mode: "local-demo" })));
  vi.stubGlobal("fetch", fetcher);
  const registry = new AgentRegistry([endpoint], { TEST_TOKEN: "test" });
  expect(await registry.health()).toEqual([expect.objectContaining({ runtimeStatus: "healthy", mode: "local-demo" })]);
  fetcher.mockResolvedValue(new Response(JSON.stringify({ status: "ok", configured: true, agentId: "other-agent" })));
  expect(await registry.health()).toEqual([expect.objectContaining({ runtimeStatus: "offline" })]);
  fetcher.mockRejectedValue(new Error("Connection refused"));
  expect(await registry.health()).toEqual([expect.objectContaining({ runtimeStatus: "offline" })]);
});

it("does not probe an unconfigured agent", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  expect(await new AgentRegistry([endpoint], {}).health()).toEqual([expect.objectContaining({ runtimeStatus: "unconfigured" })]);
  expect(fetcher).not.toHaveBeenCalled();
});
