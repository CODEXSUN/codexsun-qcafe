import type { ModuleManifest } from "@codexsun/contracts";

export const platformManifests: ModuleManifest[] = [
  {
    capabilities: ["credentials", "sessions", "token-verification"],
    dependencies: ["platform.core"],
    description: "Provides the tenancy-neutral identity foundation.",
    id: "platform.identity",
    kind: "platform",
    name: "Identity",
    runtime: "node",
    version: "0.1.0",
  },
  {
    capabilities: ["desired-state", "deployments", "health"],
    dependencies: [],
    description: "Owns module registration and deployment state.",
    id: "platform.core",
    kind: "platform",
    name: "Core",
    runtime: "node",
    version: "0.1.0",
  },
  {
    capabilities: ["node", "python", "rust"],
    dependencies: ["platform.core"],
    description: "Defines isolated execution without running generated code on the host.",
    id: "platform.execution",
    kind: "platform",
    name: "Execution providers",
    runtime: "rust",
    version: "0.1.0",
  },
];
