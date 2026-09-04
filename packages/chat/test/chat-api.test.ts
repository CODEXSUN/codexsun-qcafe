import { describe, expect, it } from "vitest";
import { createChatModule, StaticIdentityProvider } from "@codexsun/chat-api";

const identities = () => new StaticIdentityProvider([
  { token: "alice-token", actor: { uuid: "alice", name: "Alice", email: "alice@example.test" } },
  { token: "bob-token", actor: { uuid: "bob", name: "Bob", email: "bob@example.test" } },
]);

describe("Chat HTTP module", () => {
  it("denies unauthenticated requests", async () => {
    const { app } = createChatModule({ identities: identities() });
    try { expect((await app.inject("/api/v1/chat/conversations")).statusCode).toBe(401); }
    finally { await app.close(); }
  });

  it("issues a short-lived local token only when the issuer is enabled", async () => {
    const provider = identities();
    const { app } = createChatModule({
      identities: provider,
      localAccessTokenIssuer: { issue: () => provider.issue("alice", 60_000) },
    });
    try {
      const issued = await app.inject({ method: "POST", url: "/api/v1/chat/access-tokens/local" });
      expect(issued.statusCode).toBe(200);
      const token = issued.json().data.accessToken as string;
      expect(token.length).toBeGreaterThan(30);
      const profile = await app.inject({ method: "GET", url: "/api/v1/chat/profile", headers: { authorization: `Bearer ${token}` } });
      expect(profile.json().data.uuid).toBe("alice");
    } finally { await app.close(); }
  });

  it("keeps local token generation disabled by default", async () => {
    const { app } = createChatModule({ identities: identities() });
    try { expect((await app.inject({ method: "POST", url: "/api/v1/chat/access-tokens/local" })).statusCode).toBe(404); }
    finally { await app.close(); }
  });

  it("opens, sends, reads, and archives a direct conversation", async () => {
    const { app } = createChatModule({ identities: identities() });
    const auth = { authorization: "Bearer alice-token" };
    try {
      const opened = await app.inject({ method: "POST", url: "/api/v1/chat/conversations", headers: auth, payload: { peerActorId: "bob" } });
      expect(opened.statusCode).toBe(200);
      const conversationId = opened.json().data.id as string;
      const sent = await app.inject({ method: "POST", url: `/api/v1/chat/conversations/${conversationId}/messages`, headers: auth, payload: { body: "Hello Bob" } });
      expect(sent.json().data.body).toBe("Hello Bob");
      const history = await app.inject({ method: "GET", url: `/api/v1/chat/conversations/${conversationId}/messages`, headers: auth });
      expect(history.json().data.items).toHaveLength(1);
      expect((await app.inject({ method: "POST", url: `/api/v1/chat/conversations/${conversationId}/read`, headers: auth })).statusCode).toBe(200);
      const archived = await app.inject({ method: "POST", url: `/api/v1/chat/conversations/${conversationId}/preferences`, headers: auth, payload: { archived: true } });
      expect(archived.json().data.archivedAt).toBeTruthy();
    } finally { await app.close(); }
  });

  it("prevents actors outside a conversation from reading it", async () => {
    const provider = new StaticIdentityProvider([
      { token: "alice-token", actor: { uuid: "alice", name: "Alice", email: "alice@example.test" } },
      { token: "bob-token", actor: { uuid: "bob", name: "Bob", email: "bob@example.test" } },
      { token: "eve-token", actor: { uuid: "eve", name: "Eve", email: "eve@example.test" } },
    ]);
    const { app } = createChatModule({ identities: provider });
    try {
      const opened = await app.inject({ method: "POST", url: "/api/v1/chat/conversations", headers: { authorization: "Bearer alice-token" }, payload: { peerActorId: "bob" } });
      const id = opened.json().data.id as string;
      const response = await app.inject({ method: "GET", url: `/api/v1/chat/conversations/${id}/messages`, headers: { authorization: "Bearer eve-token" } });
      expect(response.statusCode).toBe(403);
    } finally { await app.close(); }
  });
});
