import { describe, expect, it } from "vitest";
import { MemoryIdentityEventPublisher } from "./events.js";
import { MemoryIdentityRepository } from "./repository.js";
import { hashPassword, IdentityService, staticTokenKeyResolver } from "./service.js";

const login = "operator@example.com";
const code = "bootstrap-secret-for-setup";
const password = "my-new-private-passphrase";

async function fixture(enabled = true) {
  const repository = new MemoryIdentityRepository([{ id: "a9cc22ba-bf1d-41a0-a803-0ebda105fb91", login, passwordHash: await hashPassword(code), permissions: ["identity.admin"], applicationIds: [], scope: "single-client" }]);
  const create = () => new IdentityService(repository, staticTokenKeyResolver("test-secret"), new MemoryIdentityEventPublisher(), { enabled, login, code });
  return { repository, create, identity: create() };
}

describe("first login setup", () => {
  it("requires the switch and the bootstrap credential", async () => {
    const disabled = await fixture(false);
    expect(await disabled.identity.firstLoginAvailable()).toBe(false);
    await expect(disabled.identity.completeFirstLogin({ login, code, password })).rejects.toThrow();
    const { identity } = await fixture();
    await expect(identity.completeFirstLogin({ login, code: "wrong-setup-secret", password })).rejects.toThrow();
    await expect(identity.completeFirstLogin({ login: "other@example.com", code, password })).rejects.toThrow();
    await expect(identity.completeFirstLogin({ login, code, password: code })).rejects.toThrow();
    expect(await identity.firstLoginAvailable()).toBe(true);
  });

  it("stores a hash, revokes sessions and stays closed after service restart", async () => {
    const { identity, repository, create } = await fixture();
    const previous = await identity.login({ login, password: code });
    await identity.completeFirstLogin({ login, code, password });
    expect((await repository.findAccountByLogin(login))?.passwordHash).not.toBe(password);
    await expect(identity.verifyAccessToken(previous.accessToken)).rejects.toThrow();
    await expect(identity.refresh(previous.refreshToken)).rejects.toThrow();
    expect(await create().firstLoginAvailable()).toBe(false);
    await expect(create().completeFirstLogin({ login, code, password })).rejects.toThrow();
    await expect(identity.login({ login, password: code })).rejects.toThrow();
    expect((await identity.login({ login, password })).accessToken).toBeTruthy();
  });

  it("allows only one concurrent setup request", async () => {
    const { identity } = await fixture();
    const outcomes = await Promise.allSettled([identity.completeFirstLogin({ login, code, password }), identity.completeFirstLogin({ login, code, password: password + "-other" })]);
    expect(outcomes.filter(result => result.status === "fulfilled")).toHaveLength(1);
  });
});
