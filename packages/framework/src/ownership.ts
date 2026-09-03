import { FrameworkError } from "./framework-error.js";

export type ModuleOwnership = {
  id: string;
  owner: string;
  protectedPaths: readonly string[];
  publicContracts: readonly string[];
  roots: readonly string[];
};

export class OwnershipRegistry {
  readonly #modules = new Map<string, ModuleOwnership>();

  register(ownership: ModuleOwnership): ModuleOwnership {
    validateOwnership(ownership);
    if (this.#modules.has(ownership.id)) {
      throw new FrameworkError("MODULE_OWNERSHIP_DUPLICATE", `Module ownership is already registered for ${ownership.id}.`);
    }
    for (const existing of this.#modules.values()) validateDistinctRoots(existing, ownership);
    this.#modules.set(ownership.id, freezeOwnership(ownership));
    return this.get(ownership.id)!;
  }

  get(id: string): ModuleOwnership | undefined {
    return this.#modules.get(id);
  }

  list(): ModuleOwnership[] {
    return [...this.#modules.values()].sort((left, right) => left.id.localeCompare(right.id));
  }
}

export function defineModuleOwnership(ownership: ModuleOwnership): ModuleOwnership {
  validateOwnership(ownership);
  return freezeOwnership(ownership);
}

function freezeOwnership(ownership: ModuleOwnership): ModuleOwnership {
  return Object.freeze({
    ...ownership,
    protectedPaths: Object.freeze([...ownership.protectedPaths]),
    publicContracts: Object.freeze([...ownership.publicContracts]),
    roots: Object.freeze([...ownership.roots]),
  });
}

function validateOwnership(ownership: ModuleOwnership): void {
  if (!validIdentifier(ownership.id)) throw new FrameworkError("MODULE_OWNERSHIP_INVALID", "Module ownership requires a stable module ID.");
  if (!ownership.owner.trim()) throw new FrameworkError("MODULE_OWNERSHIP_INVALID", `${ownership.id} requires an owner.`);
  if (ownership.roots.length === 0) throw new FrameworkError("MODULE_OWNERSHIP_INVALID", `${ownership.id} requires at least one source root.`);
  for (const root of ownership.roots) {
    if (!validPath(root)) throw new FrameworkError("MODULE_OWNERSHIP_INVALID", `${ownership.id} has an invalid source root: ${root}.`);
  }
}

function validateDistinctRoots(left: ModuleOwnership, right: ModuleOwnership): void {
  for (const leftRoot of left.roots) {
    for (const rightRoot of right.roots) {
      if (leftRoot === rightRoot) {
        throw new FrameworkError("MODULE_OWNERSHIP_CONFLICT", `${left.id} and ${right.id} both own ${leftRoot}.`);
      }
    }
  }
}

function validIdentifier(value: string): boolean {
  return /^[a-z][a-z0-9.-]+$/u.test(value);
}

function validPath(value: string): boolean {
  return value.length > 0 && !value.startsWith("/") && !value.includes("\\") && !value.split("/").includes("..");
}
