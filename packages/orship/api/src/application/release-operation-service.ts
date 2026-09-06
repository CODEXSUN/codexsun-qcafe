import type { CreateReleaseOperation } from "@codexsun/orship-contracts";
import { ReleaseOperationAggregate } from "../domain/release-operation.js";
import type { ReleaseEventPublisher, ReleaseOperationRepository } from "./ports.js";

export class ReleaseOperationService {
  constructor(private readonly repository: ReleaseOperationRepository, private readonly publisher: ReleaseEventPublisher) {}

  list() { return this.repository.list(); }
  listEvents(limit: number = 24) { return this.repository.listEvents(limit); }
  get(id: string) { return this.repository.get(id); }

  async create(input: CreateReleaseOperation) {
    const existing = input.clientRequestId && this.repository.get(input.clientRequestId);
    if (existing) return existing;
    const operation = ReleaseOperationAggregate.plan(input, input.clientRequestId).snapshot();
    await this.save(operation, "release.planned");
    return operation;
  }

  async approve(id: string) { return this.transition(id, "release.approved", operation => operation.approve()); }
  async publish(id: string, version: string) { return this.transition(id, "release.published", operation => operation.publish(version), { version }); }
  async beginDeployment(id: string) { return this.transition(id, "release.deployment_started", operation => operation.beginDeployment()); }
  async completeDeployment(id: string) { return this.transition(id, "release.running", operation => operation.completeDeployment()); }
  async fail(id: string, reason: string) { return this.transition(id, "release.failed", operation => operation.fail(reason), { reason }); }
  close() { this.repository.close(); }

  private async transition(id: string, event: string, change: (operation: ReleaseOperationAggregate) => void, details: Record<string, unknown> = {}) {
    const stored = this.repository.get(id);
    if (!stored) throw new Error("Release operation was not found.");
    const operation = ReleaseOperationAggregate.restore(stored);
    change(operation);
    const snapshot = operation.snapshot();
    await this.save(snapshot, event, details);
    return snapshot;
  }

  private async save(operation: ReturnType<ReleaseOperationAggregate["snapshot"]>, event: string, details: Record<string, unknown> = {}) {
    this.repository.save(operation, event, details);
    await this.publisher.publish({ type: event, operation });
  }
}
