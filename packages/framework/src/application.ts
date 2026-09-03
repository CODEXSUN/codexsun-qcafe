import { FrameworkError } from "./framework-error.js";
import { ModuleRegistry, type FrameworkApplicationState, type FrameworkModule, type FrameworkModuleState } from "./module.js";
import { ServiceContainer } from "./service-container.js";

export class FrameworkApplication {
  readonly modules = new ModuleRegistry();
  readonly services = new ServiceContainer();
  readonly #moduleStates = new Map<string, FrameworkModuleState>();
  #started: FrameworkModule[] = [];
  #state: FrameworkApplicationState = "created";

  get state(): FrameworkApplicationState {
    return this.#state;
  }

  register(module: FrameworkModule | unknown): this {
    if (this.#state !== "created") {
      throw new FrameworkError("APPLICATION_ALREADY_STARTED", "Modules can only be registered before the application starts.");
    }
    const registered = this.modules.register(module);
    this.#moduleStates.set(registered.manifest.id, "registered");
    return this;
  }

  moduleState(id: string): FrameworkModuleState | undefined {
    return this.#moduleStates.get(id);
  }

  async start(): Promise<void> {
    if (this.#state !== "created") {
      throw new FrameworkError("INVALID_APPLICATION_STATE", `Cannot start an application in state ${this.#state}.`);
    }
    this.#state = "starting";
    const context = { services: this.services };
    try {
      for (const module of this.modules.resolveOrder()) {
        this.#moduleStates.set(module.manifest.id, "starting");
        try {
          await module.register?.(context);
          await module.start?.(context);
        } catch (error) {
          this.#moduleStates.set(module.manifest.id, "failed");
          throw error;
        }
        this.#started.push(module);
        this.#moduleStates.set(module.manifest.id, "running");
      }
      this.#state = "running";
    } catch (error) {
      this.#state = "failed";
      const rollbackErrors = await this.#stopStarted(context);
      if (rollbackErrors.length > 0) {
        throw new AggregateError([error, ...rollbackErrors], "Framework application startup and rollback failed.");
      }
      throw new FrameworkError("APPLICATION_START_FAILED", "Framework application startup failed.", { cause: error });
    }
  }

  async stop(): Promise<void> {
    if (this.#state === "stopped") return;
    if (this.#state === "created") {
      this.#state = "stopped";
      return;
    }
    if (this.#state !== "running" && this.#state !== "failed") {
      throw new FrameworkError("INVALID_APPLICATION_STATE", `Cannot stop an application in state ${this.#state}.`);
    }
    this.#state = "stopping";
    const errors = await this.#stopStarted({ services: this.services });
    this.#state = errors.length === 0 ? "stopped" : "failed";
    if (errors.length > 0) throw new AggregateError(errors, "One or more framework modules failed to stop.");
  }

  async #stopStarted(context: { services: ServiceContainer }): Promise<unknown[]> {
    const errors: unknown[] = [];
    for (const module of [...this.#started].reverse()) {
      this.#moduleStates.set(module.manifest.id, "stopping");
      try {
        await module.stop?.(context);
        this.#moduleStates.set(module.manifest.id, "stopped");
      } catch (error) {
        this.#moduleStates.set(module.manifest.id, "failed");
        errors.push(error);
      }
    }
    this.#started = [];
    return errors;
  }
}
