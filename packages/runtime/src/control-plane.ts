import type { ControlPlaneSnapshot, Deployment, RefinementProposal } from "@codexsun/contracts";
import { ModuleRegistry } from "./module-registry.js";

const deployments: Deployment[] = [
  {
    id: "deploy-control-plane-local",
    moduleId: "platform.control-plane",
    provider: "local-preview",
    state: "running",
    updatedAt: new Date().toISOString(),
  },
];

const refinements: RefinementProposal[] = [];

export class ControlPlane {
  readonly registry = new ModuleRegistry();

  snapshot(): ControlPlaneSnapshot {
    return {
      deployments,
      modules: this.registry.list(),
      refinements,
      system: {
        agentMode: "reviewed-learning",
        executionMode: "provider-isolated",
        name: "CODEXSUN OS",
        version: "0.1.0",
      },
    };
  }
}
