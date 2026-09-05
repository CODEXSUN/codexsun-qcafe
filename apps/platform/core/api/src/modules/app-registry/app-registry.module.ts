import { createToken, defineModule, type ServiceToken } from "@codexsun/framework";
import type { AppRegistryService } from "./app-registry.service.js";

export const appRegistryServiceToken: ServiceToken<AppRegistryService> = createToken("app-registry-service");

export function createAppRegistryModule(service: AppRegistryService) {
  return defineModule({
    manifest: {
      capabilities: ["registry", "architecture-inspection", "runtime-management"],
      dependencies: ["platform.core"],
      description: "Platform Architecture & Structures drill-down registry.",
      id: "platform.app-registry",
      kind: "platform",
      name: "App Registry",
      runtime: "node",
      version: "0.1.0",
    },
    register(context) {
      context.services.bindValue(appRegistryServiceToken, service);
    },
  });
}
