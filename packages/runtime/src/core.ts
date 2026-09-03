import type { CoreSnapshot, Deployment, RefinementProposal } from "@codexsun/contracts";
import { FrameworkApplication, OwnershipRegistry } from "@codexsun/framework";

const deployments: Deployment[] = [
  {
    id: "deploy-core-local",
    moduleId: "platform.core",
    provider: "local-preview",
    state: "running",
    updatedAt: new Date().toISOString(),
  },
];

const refinements: RefinementProposal[] = [];

export class PlatformCore {
  readonly framework = new FrameworkApplication();
  readonly ownership = new OwnershipRegistry();
  readonly registry = this.framework.modules;

  snapshot(): CoreSnapshot {
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
