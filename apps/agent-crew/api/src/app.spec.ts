import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildAgentApp } from "./app.js";
import type { ModelProvider } from "./provider.js";

const token = "a-secure-agent-token-with-32-characters";
const profile = { id: "article-agent", name: "Article Agent", duty: "Draft articles.", skills: ["article.md"] };
const provider: ModelProvider = { configured: () => true, async answer() { return { message: "Draft answer", provider: "codex", usage: null }; } };

describe("agent API", () => {
  it("requires authentication and persists a conversation", async () => {
    const root = await mkdtemp(join(tmpdir(), "agent-crew-"));
    await mkdir(join(root, "profile", "skills"), { recursive: true });
    await writeFile(join(root, "profile", "skills", "article.md"), "Write clearly.");
    const app = buildAgentApp({ profile, profileDirectory: join(root, "profile"), stateDirectory: join(root, "state"), token, provider });
    try {
      expect((await app.inject({ method: "POST", url: "/api/v1/messages", payload: { message: "Hello" } })).statusCode).toBe(401);
      const response = await app.inject({ method: "POST", url: "/api/v1/messages", headers: { authorization: `Bearer ${token}` }, payload: { message: "Draft this" } });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ agentId: "article-agent", message: "Draft answer" });
    } finally { await app.close(); }
  });
});
