import type { ModuleManifest } from "@codexsun/contracts";
import { PlatformCore } from "@codexsun/runtime";

const platformOwnership = [
  {
    id: "platform.core",
    owner: "Platform Core",
    protectedPaths: ["apps/platform/core/api/src", "apps/platform/core/web/src"],
    publicContracts: ["/api/v1/core"],
    roots: ["apps/platform/core"],
  },
  {
    id: "platform.execution",
    owner: "Platform Execution",
    protectedPaths: ["packages/runtime/src"],
    publicContracts: ["@codexsun/runtime"],
    roots: ["packages/runtime"],
  },
] as const;

export function registerPlatformOwnership(core: PlatformCore): void {
  for (const ownership of platformOwnership) core.ownership.register(ownership);
}

export function validatePlatformManifestOwnership(core: PlatformCore, manifests: readonly ModuleManifest[]): void {
  for (const manifest of manifests) {
    if (!core.ownership.get(manifest.id)) {
      throw new Error(`Platform manifest ${manifest.id} has no ownership contract.`);
    }
  }
}
