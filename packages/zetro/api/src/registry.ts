import { readFileSync } from "node:fs";
import { z } from "zod";
import { agentProfileSchema, type AgentSummary } from "./contracts.js";

const endpointSchema = agentProfileSchema.extend({
  url: z.string().url().refine((value) => ["http:", "https:"].includes(new URL(value).protocol)),
  tokenEnv: z.string().regex(/^[A-Z][A-Z0-9_]+$/u),
});
export type AgentEndpoint = z.infer<typeof endpointSchema>;

export class AgentRegistry {
  constructor(readonly endpoints: AgentEndpoint[], readonly env: NodeJS.ProcessEnv = process.env) {
    z.array(endpointSchema).parse(endpoints);
    if (new Set(endpoints.map((agent) => agent.id)).size !== endpoints.length) throw new Error("Duplicate agent identity.");
  }

  static fromEnvironment(defaultFile?: string) {
    const file = process.env.ZETRO_AGENTS_FILE ?? defaultFile;
    const endpoints = file ? z.array(endpointSchema).parse(JSON.parse(readFileSync(file, "utf8"))) : [];
    return new AgentRegistry(endpoints);
  }

  list(): AgentSummary[] {
    return this.endpoints.map(({ url: _url, tokenEnv, ...profile }) => ({ ...profile, configured: Boolean(this.env[tokenEnv]) }));
  }

  async health(): Promise<AgentSummary[]> {
    return Promise.all(this.list().map(async (agent) => {
      if (!agent.configured) return { ...agent, runtimeStatus: "unconfigured" as const };
      try {
        const endpoint = this.endpoints.find((item) => item.id === agent.id)!;
        const response = await fetch(new URL("/health", endpoint.url), { signal: AbortSignal.timeout(2000), redirect: "error" });
        const body = await response.json();
        const healthy = response.ok && body.status === "ok" && body.agentId === agent.id && body.configured === true;
        return {
          ...agent,
          runtimeStatus: healthy ? "healthy" as const : "offline" as const,
          mode: runtimeMode(body.mode),
          providers: Array.isArray(body.providers) ? body.providers : undefined,
        };
      } catch { return { ...agent, runtimeStatus: "offline" as const }; }
    }));
  }
}

function runtimeMode(value: unknown): AgentSummary["mode"] {
  return value === "local-demo" || value === "local-cli" || value === "docker-local" || value === "docker-vps"
    ? value
    : "provider";
}
