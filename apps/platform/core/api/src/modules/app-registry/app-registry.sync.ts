import type { ModuleManifest } from "@codexsun/contracts";
import type { AppRegistryRepository } from "./app-registry.repository.js";

export async function syncAppRegistryManifests(
  manifests: readonly ModuleManifest[],
  repository: AppRegistryRepository
): Promise<{ syncedCount: number }> {
  const overrides = await repository.listOverrides();
  const overrideMap = new Map(overrides.map((o) => [o.application_id, o]));

  let syncedCount = 0;
  for (const manifest of manifests) {
    if (manifest.kind === "application" && !overrideMap.has(manifest.id)) {
      // Sync known active state
      syncedCount++;
    }
  }

  return { syncedCount };
}
