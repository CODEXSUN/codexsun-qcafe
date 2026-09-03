import { describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { AgentRegistry } from "./registry.js";
import { DispatchError, ZetroDispatcher } from "./dispatcher.js";

const endpoint = { id: "article-agent", name: "Article Agent", duty: "Draft articles.", skills: ["article.md"], url: "http://article-agent:4200", tokenEnv: "ARTICLE_TOKEN" };

describe("Zetro dispatcher", () => {
  it("does not expose an agent token through the registry", () => {
    expect(new AgentRegistry([endpoint], { ARTICLE_TOKEN: "secret" }).list()).toEqual([{ id: "article-agent", name: "Article Agent", duty: "Draft articles.", skills: ["article.md"], configured: true }]);
  });

  it("authenticates and validates the selected agent identity", async () => {
    const conversationId = randomUUID();
    const transport = vi.fn(async (_url, init) => new Response(JSON.stringify({ agentId: "wrong-agent", conversationId, runId: randomUUID(), message: "Draft", provider: "codex", activities: [], usage: null }), { status: 200, headers: { "content-type": "application/json" } }));
    const dispatcher = new ZetroDispatcher(new AgentRegistry([endpoint], { ARTICLE_TOKEN: "secret" }), transport as typeof fetch);
    await expect(dispatcher.send("article-agent", { conversationId, message: "Draft an article" })).rejects.toMatchObject({ status: 502 });
    expect(transport.mock.calls[0]?.[1]?.headers).toMatchObject({ authorization: "Bearer secret" });
  });
});
