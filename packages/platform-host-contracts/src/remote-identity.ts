import { identityClaimsSchema, type IdentityClaims } from "@codexsun/identity-contracts";
import type { IdentityTokenVerifier } from "./index.js";

/** Application services use the Identity API; signing keys stay with Identity. */
export class RemoteIdentityVerifier implements IdentityTokenVerifier {
  constructor(private readonly baseUrl: string) {}

  async verifyAccessToken(token: string): Promise<IdentityClaims> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/u, "")}/api/v1/identity/verify`, {
      headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5_000), redirect: "error",
    });
    if (!response.ok) throw new Error("Platform session is invalid or expired.");
    const result = await response.json() as { claims: unknown };
    return identityClaimsSchema.parse(result.claims);
  }
}
