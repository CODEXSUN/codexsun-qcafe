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
}
