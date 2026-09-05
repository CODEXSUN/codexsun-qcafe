import { describe, expect, it } from "vitest";
import { MemoryIdentityEventPublisher } from "./events.js";
import { MemoryIdentityRepository } from "./repository.js";
import { hashPassword, IdentityService, staticTokenKeyResolver } from "./service.js";

describe("identity service", () => {
  it("issues tokens that verify through the same key resolver and rejects a revoked session", async () => {
    const repository = new MemoryIdentityRepository([{ applicationIds: ["app.devkit"], id: "a9cc22ba-bf1d-41a0-a803-0ebda105fb91", login: "operator", passwordHash: await hashPassword("safe-password"), permissions: ["project.read"], scope: "single-client" }]);
    const events = new MemoryIdentityEventPublisher();
    const identity = new IdentityService(repository, staticTokenKeyResolver("identity-test-secret"), events);
    const tokens = await identity.login({ login: "operator", password: "safe-password" });
    expect((await identity.verifyAccessToken(tokens.accessToken)).sub).toBe("a9cc22ba-bf1d-41a0-a803-0ebda105fb91");
    await expect(identity.profile(tokens.accessToken)).resolves.toMatchObject({ id: "a9cc22ba-bf1d-41a0-a803-0ebda105fb91", login: "operator", permissions: ["project.read"], scope: "single-client" });
    await identity.revoke(tokens.claims.sid);
    await expect(identity.verifyAccessToken(tokens.accessToken)).rejects.toThrow(/revoked/u);
    await expect(identity.revokeRefreshToken(tokens.refreshToken)).rejects.toThrow(/revoked/u);
    expect(events.events.map((event) => event.type)).toEqual(["identity.login", "identity.revoked"]);
  });
});
