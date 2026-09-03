import { existsSync, readFileSync } from "node:fs";
import { agentProfileSchema } from "@codexsun/zetro-api/contracts";
import { z } from "zod";
import { buildAgentApp } from "./app.js";
import { CodexProvider, CompatibleProvider } from "./provider.js";

if (!existsSync("/.dockerenv")) throw new Error("Start Agent Crew through its Docker execution provider.");
const providerName = z.enum(["codex", "openai-compatible"]).parse(process.env.AGENT_PROVIDER ?? "codex");
const app = buildAgentApp({
  profile: agentProfileSchema.parse(JSON.parse(readFileSync("/profile/agent.json", "utf8"))),
  profileDirectory: "/profile", stateDirectory: "/state", token: process.env.AGENT_API_TOKEN ?? "",
  provider: providerName === "codex" ? new CodexProvider() : new CompatibleProvider(),
});
await app.listen({ host: "0.0.0.0", port: 4200 });
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => void app.close());
