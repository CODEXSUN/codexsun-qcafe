export const ZETRO_AGENT_RUNTIMES = [
  { id: "zxa", name: "ZXA", state: "available", providers: ["Codex", "Gemini", "OpenCode"] },
  { id: "nexus", name: "Nexus", state: "planned", providers: ["Codex", "Gemini", "OpenCode"] },
  { id: "orbis", name: "Orbis", state: "planned", providers: ["Codex", "Gemini", "OpenCode"] },
  { id: "axon", name: "Axon", state: "planned", providers: ["Codex", "Gemini", "OpenCode"] },
  { id: "kore", name: "Kore", state: "planned", providers: ["Codex", "Gemini", "OpenCode"] },
] as const;
