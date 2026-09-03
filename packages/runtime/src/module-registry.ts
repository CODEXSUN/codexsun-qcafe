import { moduleManifestSchema, type ModuleManifest } from "@codexsun/contracts";

export class ModuleRegistry {
  readonly #modules = new Map<string, ModuleManifest>();

  register(input: unknown): ModuleManifest {
    const manifest = moduleManifestSchema.parse(input);
    if (this.#modules.has(manifest.id)) {
      throw new Error(`Module ${manifest.id} is already registered.`);
    }
    this.#modules.set(manifest.id, manifest);
    return manifest;
  }

  list(): ModuleManifest[] {
    return [...this.#modules.values()].sort((left, right) => left.name.localeCompare(right.name));
  }

  validateDependencies(): void {
    for (const manifest of this.#modules.values()) {
      for (const dependency of manifest.dependencies) {
        if (!this.#modules.has(dependency)) {
          throw new Error(`Module ${manifest.id} requires missing module ${dependency}.`);
        }
      }
    }
  }
}
