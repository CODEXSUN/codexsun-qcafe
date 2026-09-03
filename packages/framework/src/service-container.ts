import { FrameworkError } from "./framework-error.js";

export type ServiceToken<T> = symbol & { readonly __service?: T };
export type ServiceFactory<T> = (container: ServiceContainer) => T;

type Binding<T> = {
  factory: ServiceFactory<T>;
  initialized: boolean;
  instance?: T;
  resolving: boolean;
};

export function createToken<T>(description: string): ServiceToken<T> {
  return Symbol(description) as ServiceToken<T>;
}

export class ServiceContainer {
  readonly #bindings = new Map<ServiceToken<unknown>, Binding<unknown>>();

  bind<T>(token: ServiceToken<T>, factory: ServiceFactory<T>): this {
    if (this.#bindings.has(token)) {
      throw new FrameworkError("SERVICE_ALREADY_BOUND", `Service ${token.description ?? "unknown"} is already bound.`);
    }
    this.#bindings.set(token, { factory, initialized: false, resolving: false } as Binding<unknown>);
    return this;
  }

  bindValue<T>(token: ServiceToken<T>, value: T): this {
    return this.bind(token, () => value);
  }

  has<T>(token: ServiceToken<T>): boolean {
    return this.#bindings.has(token);
  }

  resolve<T>(token: ServiceToken<T>): T {
    const binding = this.#bindings.get(token) as Binding<T> | undefined;
    if (!binding) {
      throw new FrameworkError("SERVICE_NOT_BOUND", `Service ${token.description ?? "unknown"} is not bound.`);
    }
    if (binding.initialized) return binding.instance as T;
    if (binding.resolving) {
      throw new FrameworkError("CIRCULAR_SERVICE_DEPENDENCY", `Circular dependency while resolving ${token.description ?? "unknown"}.`);
    }

    binding.resolving = true;
    try {
      binding.instance = binding.factory(this);
      binding.initialized = true;
      return binding.instance;
    } finally {
      binding.resolving = false;
    }
  }
}
