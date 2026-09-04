import { describe, expect, it } from "vitest";
import { identityClaimsSchema } from "./index.js";

describe("identity claims contract", () => {
  it("accepts a single-client access claim", () => {
    expect(identityClaimsSchema.parse({ aud: "codexsun-platform", iat: 1, iss: "codexsun-identity", jti: "5c910bd8-7c14-4875-84b1-6ff58576d057", scope: "single-client", sid: "10c6b035-0030-48ea-bbf6-b175b5ed77a4", sub: "34e2f1d2-ffeb-48a4-b69d-7522f29678a8", type: "access" }).scope).toBe("single-client");
  });

  it("rejects a tenant token without a valid subject", () => {
    expect(() => identityClaimsSchema.parse({ aud: "codexsun-platform", iat: 1, iss: "codexsun-identity", jti: "bad", scope: "tenant", sid: "bad", sub: "bad", type: "access" })).toThrow();
  });
});
