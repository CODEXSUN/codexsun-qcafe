import Fastify from "fastify";
import { expect, it } from "vitest";
import { MemoryIdentityEventPublisher, MemoryIdentityRepository, hashPassword, IdentityService, staticTokenKeyResolver } from "./index.js";
import { registerIdentityRoutes } from "./routes.js";

it("requires a valid session for introspection and only permits self revocation", async () => {
  const service = new IdentityService(new MemoryIdentityRepository([{ id: "a9cc22ba-bf1d-41a0-a803-0ebda105fb91", login: "test", passwordHash: await hashPassword("safe-password"), applicationIds: [], permissions: [], scope: "single-client" }]), staticTokenKeyResolver("test-secret"), new MemoryIdentityEventPublisher());
  const app = Fastify();
  registerIdentityRoutes(app, service);
  try {
    const a = await service.login({ login: "test", password: "safe-password" });
    const b = await service.login({ login: "test", password: "safe-password" });
    const path = `/api/v1/identity/sessions/${b.claims.sid}/revoke`;
    expect((await app.inject({ method: "POST", url: path })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: path, headers: { authorization: `Bearer ${a.accessToken}` } })).statusCode).toBe(403);
    expect((await app.inject({ url: "/api/v1/identity/verify", headers: { authorization: `Bearer ${b.accessToken}` } })).statusCode).toBe(200);
    expect((await app.inject({ method: "POST", url: path, headers: { authorization: `Bearer ${b.accessToken}` } })).statusCode).toBe(204);
    expect((await app.inject({ url: "/api/v1/identity/verify", headers: { authorization: `Bearer ${b.accessToken}` } })).statusCode).toBe(401);
  } finally { await app.close(); }
});
