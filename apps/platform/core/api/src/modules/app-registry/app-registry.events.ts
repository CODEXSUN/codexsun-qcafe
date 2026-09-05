import type { PlatformPersistenceLifecycle } from "../../database/persistence.js";
import type { AppRegistryAuditEvent } from "./app-registry.types.js";

export interface AppRegistryEventPublisher {
  publish(event: AppRegistryAuditEvent): Promise<void>;
}

export class MemoryAppRegistryEventPublisher implements AppRegistryEventPublisher {
  readonly events: AppRegistryAuditEvent[] = [];

  async publish(event: AppRegistryAuditEvent): Promise<void> {
    this.events.push(event);
  }
}

export class PlatformAppRegistryEventPublisher implements AppRegistryEventPublisher {
  constructor(private readonly persistence: PlatformPersistenceLifecycle) {}

  async publish(event: AppRegistryAuditEvent): Promise<void> {
    await this.persistence.recordEvent({
      payload: event as unknown as Record<string, unknown>,
      topic: "platform.registry",
      type: event.type,
    });
  }
}
