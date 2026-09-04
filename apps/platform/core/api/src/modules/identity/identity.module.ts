import { createToken, defineModule, type ServiceToken } from "@codexsun/framework";
import type { IdentityTokenVerifier } from "@codexsun/platform-host-contracts";
import type { IdentityService } from "./service.js";

export const identityTokenVerifier: ServiceToken<IdentityTokenVerifier> = createToken("identity-token-verifier");

export function createIdentityModule(service: IdentityService) {
  return defineModule({
    manifest: { capabilities: ["credentials", "sessions", "token-verification"], dependencies: ["platform.core"], description: "Owns platform identity sessions and tokens.", id: "platform.identity", kind: "platform", name: "Identity", runtime: "node", version: "0.1.0" },
    register(context) { context.services.bindValue(identityTokenVerifier, service); },
  });
}
