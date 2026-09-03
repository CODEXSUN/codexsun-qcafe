import type { ModuleManifest } from "@codexsun/contracts";

export const platformManifests: ModuleManifest[] = [
  {
    capabilities: ["desired-state", "deployments", "health"],
    dependencies: [],
    description: "Owns module registration and deployment state.",
    id: "platform.control-plane",
    kind: "platform",
    name: "Control plane",
    runtime: "node",
    version: "0.1.0",
  },
  {
    capabilities: ["tools", "evaluations", "refinement-proposals"],
    dependencies: ["platform.control-plane"],
    description: "Plans builds and learns through reviewed refinement proposals.",
    id: "platform.builder-agent",
    kind: "platform",
    name: "Builder agent",
    runtime: "node",
    version: "0.1.0",
  },
  {
    capabilities: ["node", "python", "rust"],
    dependencies: ["platform.control-plane"],
    description: "Defines isolated execution without running generated code on the host.",
    id: "platform.execution",
    kind: "platform",
    name: "Execution providers",
    runtime: "rust",
    version: "0.1.0",
  },
];
