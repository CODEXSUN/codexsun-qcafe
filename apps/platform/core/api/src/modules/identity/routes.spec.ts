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

it("lets an identity administrator manage accounts and revokes changed user sessions", async () => {
  const administrator = { id: "a9cc22ba-bf1d-41a0-a803-0ebda105fb91", login: "admin@example.com", passwordHash: await hashPassword("safe-password"), applicationIds: ["app.zetro"], permissions: ["app.access", "identity.admin"], role: "administrator" as const, responsibilities: [], scope: "single-client" as const, status: "active" as const };
  const service = new IdentityService(new MemoryIdentityRepository([administrator]), staticTokenKeyResolver("test-secret"), new MemoryIdentityEventPublisher());
  const app = Fastify();
  registerIdentityRoutes(app, service);
  try {
    const adminSession = await service.login({ login: administrator.login, password: "safe-password" });
    const headers = { authorization: `Bearer ${adminSession.accessToken}` };
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/identity/accounts",
      headers,
      payload: { applicationIds: ["app.chat"], login: "member@example.com", password: "member-password", permissions: ["chat.access"], responsibilities: ["Support"], role: "member", scope: "single-client", status: "active" },
    });
    expect(created.statusCode).toBe(201);
    const member = created.json<{ account: { id: string; role: string } }>().account;
    expect(member.role).toBe("member");
    expect((await app.inject({ method: "GET", url: "/api/v1/identity/accounts", headers })).json<{ accounts: { login: string }[] }>().accounts).toEqual(expect.arrayContaining([expect.objectContaining({ login: "member@example.com" })]));
    const memberSession = await service.login({ login: "member@example.com", password: "member-password" });
    const updated = await app.inject({
      method: "PATCH",
      url: `/api/v1/identity/accounts/${member.id}`,
      headers,
      payload: { applicationIds: ["app.chat"], login: "member@example.com", permissions: [], responsibilities: ["Support"], role: "viewer", scope: "single-client", status: "suspended" },
    });
    expect(updated.statusCode).toBe(200);
    await expect(service.verifyAccessToken(memberSession.accessToken)).rejects.toThrow(/revoked/u);
  } finally { await app.close(); }
});

it("resets a password only during an active reset window and revokes old sessions", async () => {
  const account = { id: "a9cc22ba-bf1d-41a0-a803-0ebda105fb91", login: "member@example.com", passwordHash: await hashPassword("old-password"), applicationIds: [], permissions: [], scope: "single-client" as const };
  const service = new IdentityService(new MemoryIdentityRepository([account]), staticTokenKeyResolver("test-secret"), new MemoryIdentityEventPublisher(), undefined, { code: "1234567890", enabled: true, expiresAt: new Date(Date.now() + 60_000).toISOString() });
  const app = Fastify();
  registerIdentityRoutes(app, service);
  try {
    const previous = await service.login({ login: account.login, password: "old-password" });
    expect((await app.inject({ method: "GET", url: "/api/v1/identity/password-reset" })).json()).toMatchObject({ available: true });
    expect((await app.inject({ method: "POST", url: "/api/v1/identity/password-reset", payload: { code: "wrong-code", login: account.login, password: "new-password" } })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/api/v1/identity/password-reset", payload: { code: "1234567890", login: account.login, password: "new-password" } })).statusCode).toBe(201);
    await expect(service.verifyAccessToken(previous.accessToken)).rejects.toThrow(/revoked/u);
    await expect(service.login({ login: account.login, password: "old-password" })).rejects.toThrow();
    await expect(service.login({ login: account.login, password: "new-password" })).resolves.toMatchObject({ accessToken: expect.any(String) });
  } finally { await app.close(); }
});
