import type { AppRegistryRepository } from "./app-registry.repository.js";

export async function seedAppRegistry(
  repository: AppRegistryRepository,
  _environment: NodeJS.ProcessEnv = process.env
): Promise<void> {
  const existing = await repository.listOverrides();
  if (existing.length > 0) return;

  // Platform seeds defaults repeatably without overwriting user data
}
