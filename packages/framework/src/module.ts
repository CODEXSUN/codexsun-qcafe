import { moduleManifestSchema, type ModuleManifest } from "@codexsun/contracts";
import { FrameworkError } from "./framework-error.js";
import type { ServiceContainer } from "./service-container.js";

export type FrameworkApplicationState = "created" | "starting" | "running" | "stopping" | "stopped" | "failed";
export type FrameworkModuleState = "registered" | "starting" | "running" | "stopping" | "stopped" | "failed";

export type FrameworkModuleContext = {
  services: ServiceContainer;
};

export type FrameworkModule = {
  manifest: ModuleManifest;
  register?: (context: FrameworkModuleContext) => Promise<void> | void;
  start?: (context: FrameworkModuleContext) => Promise<void> | void;
  stop?: (context: FrameworkModuleContext) => Promise<void> | void;
};

export function defineModule(module: FrameworkModule): FrameworkModule {
  return { ...module, manifest: moduleManifestSchema.parse(module.manifest) };
}

export class ModuleRegistry {
  readonly #modules = new Map<string, FrameworkModule>();

  register(input: unknown | FrameworkModule): FrameworkModule {
    const module = isFrameworkModule(input) ? defineModule(input) : defineModule({ manifest: moduleManifestSchema.parse(input) });
    if (this.#modules.has(module.manifest.id)) {
      throw new FrameworkError("MODULE_ALREADY_REGISTERED", `Module ${module.manifest.id} is already registered.`);
    }
    this.#modules.set(module.manifest.id, module);
    return module;
  }

  get(id: string): FrameworkModule | undefined {
    return this.#modules.get(id);
  }

  list(): ModuleManifest[] {
    return [...this.#modules.values()]
      .map((module) => module.manifest)
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  resolveOrder(): FrameworkModule[] {
    const ordered: FrameworkModule[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    for (const id of this.#modules.keys()) this.#visit(id, visited, visiting, ordered, []);
    return ordered;
  }

  validateDependencies(): void {
    this.resolveOrder();
  }

  #visit(id: string, visited: Set<string>, visiting: Set<string>, ordered: FrameworkModule[], path: string[]): void {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      throw new FrameworkError("MODULE_DEPENDENCY_CYCLE", `Module dependency cycle: ${[...path, id].join(" -> ")}.`);
    }
    const module = this.#modules.get(id);
    if (!module) {
      throw new FrameworkError("MODULE_DEPENDENCY_MISSING", `Module ${path.at(-1) ?? id} requires missing module ${id}.`);
    }

    visiting.add(id);
    for (const dependency of module.manifest.dependencies) {
      this.#visit(dependency, visited, visiting, ordered, [...path, id]);
    }
    visiting.delete(id);
    visited.add(id);
    ordered.push(module);
  }
}

function isFrameworkModule(input: unknown): input is FrameworkModule {
  return typeof input === "object" && input !== null && "manifest" in input;
}
