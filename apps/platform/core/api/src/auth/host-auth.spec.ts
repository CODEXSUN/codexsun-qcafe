import { describe, expect, it } from "vitest";
import Fastify from "fastify";
import { IdentityHostAdapter, extractBearerToken, requireAuthorization } from "./host-auth.js";

describe("identity host adapter", () => {
  it("maps verified claims and enforces app entitlement", async () => {
    const adapter = new IdentityHostAdapter({
      async verifyAccessToken() {
        return { appIds: ["app.devkit"], aud: "codexsun-platform", iat: 1, iss: "codexsun-identity", jti: "5c910bd8-7c14-4875-84b1-6ff58576d057", permissions: ["project.read"], scope: "single-client", sid: "10c6b035-0030-48ea-bbf6-b175b5ed77a4", sub: "34e2f1d2-ffeb-48a4-b69d-7522f29678a8", type: "access" };
      },
    });
    const context = await adapter.authenticate("token");
    expect(adapter.authorize(context, "project.read", "app.devkit")).toBe(true);
    expect(adapter.authorize(context, "project.read", "app.q-cafe")).toBe(false);
  });

  it("extracts only bearer credentials", () => {
    expect(extractBearerToken("Bearer token")).toBe("token");
    expect(extractBearerToken("Basic token")).toBeUndefined();
  });

  it("denies unauthenticated protected routes", async () => {
    const app = Fastify();
    const adapter = new IdentityHostAdapter({ async verifyAccessToken() { throw new Error("invalid"); } });
    app.get("/protected", { preHandler: requireAuthorization(adapter, "project.read", "app.devkit") }, async () => ({ ok: true }));
    try {
      expect((await app.inject("/protected")).statusCode).toBe(401);
      expect((await app.inject({ headers: { authorization: "Bearer broken" }, url: "/protected" })).statusCode).toBe(401);
    } finally { await app.close(); }
  });
});
