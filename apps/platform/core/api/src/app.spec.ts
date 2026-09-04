import { describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import { MemoryIdentityEventPublisher, MemoryIdentityRepository, hashPassword, IdentityService, staticTokenKeyResolver } from "./modules/identity/index.js";

describe("platform composition", () => {
  it("runs with no products or agent routes", async () => {
    const app = buildApp({ applications: [] });
    try {
      const snapshot = (await app.inject("/api/v1/core")).json();
      expect(snapshot.modules.map((module: { id: string }) => module.id)).toEqual(["platform.core", "platform.execution", "platform.identity"]);
      expect((await app.inject({ method: "POST", url: "/api/v1/zetro/messages", payload: { message: "Hello" } })).statusCode).toBe(404);
    } finally { await app.close(); }
  });

  it("registers Zetro as an application without agent API routes", async () => {
    const app = buildApp();
    try {
      const snapshot = (await app.inject("/api/v1/core")).json();
      expect(snapshot.modules.map((module: { id: string }) => module.id)).toContain("app.zetro");
      expect((await app.inject("/api/v1/zetro/agents")).statusCode).toBe(404);
      expect((await app.inject({ method: "POST", url: "/api/v1/chat/messages", payload: { message: "Hello" } })).statusCode).toBe(404);
    } finally { await app.close(); }
  });

  it("starts a configured persistence boundary and records lifecycle events", async () => {
    const calls: string[] = [];
    const app = buildApp({
      applications: [],
      persistence: {
        async recordEvent() { calls.push("recordEvent"); return { eventId: "event", outboxId: "outbox" }; },
        async start() { calls.push("start"); },
        async stop() { calls.push("stop"); },
      },
    });
    try {
      expect((await app.inject("/health")).json()).toMatchObject({ database: "configured", status: "ok" });
      expect(calls).toEqual(["start", "recordEvent"]);
    } finally {
      await app.close();
    }
    expect(calls).toEqual(["start", "recordEvent", "stop"]);
  });

  it("requires a database URL when persistence is required", () => {
    expect(() => buildApp({ applications: [], environment: { OS_DATABASE_REQUIRED: "true" } })).toThrow(/DATABASE_URL/u);
  });

  it("provides one protected application context endpoint for every entitled application", async () => {
    const identity = new IdentityService(new MemoryIdentityRepository([{ applicationIds: ["app.devkit"], id: "34e2f1d2-ffeb-48a4-b69d-7522f29678a8", login: "operator", passwordHash: await hashPassword("safe-password"), permissions: ["app.access"], scope: "single-client" }]), staticTokenKeyResolver("test-secret"), new MemoryIdentityEventPublisher());
    const app = buildApp({ applications: [], identity });
    try {
      const tokens = await identity.login({ login: "operator", password: "safe-password" });
      expect((await app.inject({ headers: { authorization: `Bearer ${tokens.accessToken}` }, url: "/api/v1/apps/app.devkit/context" })).json()).toMatchObject({ available: true, scope: "single-client" });
      expect((await app.inject({ headers: { authorization: `Bearer ${tokens.accessToken}` }, url: "/api/v1/apps/app.q-cafe/context" })).json()).toEqual({ available: false });
    } finally { await app.close(); }
  });
});
