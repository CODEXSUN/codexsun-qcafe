import { RemoteIdentityVerifier } from "@codexsun/platform-host-contracts";
import type { ChatActor } from "@codexsun/chat-contracts";
import type { ChatIdentityProvider } from "../application/ports.js";

export class PlatformChatIdentityProvider implements ChatIdentityProvider {
  private actors: ChatActor[] = [];
  private readonly verifier: RemoteIdentityVerifier;
  constructor(private readonly baseUrl: string) { this.verifier = new RemoteIdentityVerifier(baseUrl); }

  async authenticate(token: string) {
    try {
      const claims = await this.verifier.verifyAccessToken(token);
      if (claims.scope !== "single-client" || !claims.appIds.includes("app.chat") || !claims.permissions.includes("chat.access")) return undefined;
      const response = await fetch(`${this.baseUrl}/api/v1/identity/directory`, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000), redirect: "error" });
      if (!response.ok) return undefined;
      this.actors = (await response.json() as { actors: ChatActor[] }).actors;
      return this.findActor(claims.sub);
    } catch { return undefined; }
  }
  async findActor(id: string) { return this.actors.find(actor => actor.uuid === id); }
  async listContacts(id: string) { return this.actors.filter(actor => actor.uuid !== id); }
}
