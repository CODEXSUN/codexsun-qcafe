import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { buildZetroApp } from "./app.js";
import { AgentRegistry } from "./registry.js";
import { ZetroDispatcher } from "./dispatcher.js";

describe("standalone Zetro API", () => {
  it("owns agent discovery and dispatch outside the platform", async () => {
    const endpoint = { id: "article-agent", name: "Article Agent", duty: "Draft.", skills: ["article.md"], url: "http://article-agent:4200", tokenEnv: "TOKEN" };
    const transport = vi.fn(async () => new Response(JSON.stringify({ agentId: "article-agent", conversationId: randomUUID(), runId: randomUUID(), message: "Draft", provider: "codex", activities: [], usage: null }), { status: 200 }));
    const app = buildZetroApp({ dispatcher: new ZetroDispatcher(new AgentRegistry([endpoint], { TOKEN: "secret" }), transport as typeof fetch) });
    try {
      expect((await app.inject("/health")).json()).toMatchObject({ service: "zetro" });
      expect((await app.inject("/api/v1/zetro/agents")).json()).toHaveLength(1);
      const providersRes = await app.inject("/api/v1/zetro/providers");
      expect(providersRes.statusCode).toBe(200);
      expect(providersRes.json()).toHaveProperty("providers");
      const modelsRes = await app.inject("/api/v1/zetro/models?provider=g");
      expect(modelsRes.statusCode).toBe(200);
      expect(modelsRes.json()).toMatchObject({ provider: "g" });
    } finally { await app.close(); }
  }, 15000);
});
