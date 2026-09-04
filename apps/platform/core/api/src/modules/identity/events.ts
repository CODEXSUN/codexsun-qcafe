import type { IdentityAuditEvent } from "@codexsun/identity-contracts";
import type { PlatformPersistenceLifecycle } from "../../database/persistence.js";

export interface IdentityEventPublisher {
  publish(event: IdentityAuditEvent): Promise<void>;
}

export class MemoryIdentityEventPublisher implements IdentityEventPublisher {
  readonly events: IdentityAuditEvent[] = [];

  async publish(event: IdentityAuditEvent): Promise<void> {
    this.events.push(event);
  }
}

export class PlatformIdentityEventPublisher implements IdentityEventPublisher {
  constructor(private readonly persistence: PlatformPersistenceLifecycle) {}
  async publish(event: IdentityAuditEvent): Promise<void> {
    await this.persistence.recordEvent({ payload: event, topic: "identity.audit", type: event.type });
  }
}
