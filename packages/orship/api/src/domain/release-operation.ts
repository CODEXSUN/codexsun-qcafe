import { randomUUID } from "node:crypto";
import type { CreateReleaseOperation, ReleaseOperation } from "@codexsun/orship-contracts";

export class ReleaseOperationAggregate {
  private constructor(private readonly state: ReleaseOperation) {}

  static plan(input: CreateReleaseOperation, id: string = randomUUID()) {
    const now = new Date().toISOString();
    const approvalRequired = input.approvalRequired ?? true;
    return new ReleaseOperationAggregate({
      id,
      target: input.target,
      title: input.title,
      sourceRevision: input.sourceRevision,
      aiTaskId: input.aiTaskId,
      phase: approvalRequired ? "awaiting_approval" : "approved",
      approvalRequired,
      approvedAt: approvalRequired ? undefined : now,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(operation: ReleaseOperation) { return new ReleaseOperationAggregate(structuredClone(operation)); }
  snapshot() { return structuredClone(this.state); }

  approve() {
    if (this.state.phase !== "awaiting_approval") throw new Error("Only a release awaiting approval can be approved.");
    this.state.phase = "approved";
    this.state.approvedAt = new Date().toISOString();
    this.touch();
  }

  publish(version: string) {
    if (this.state.phase !== "approved") throw new Error("Only an approved release can be published.");
    this.state.version = version;
    this.state.phase = "published";
    this.touch();
  }

  beginDeployment() {
    if (this.state.phase !== "published") throw new Error("Only a published release can deploy.");
    this.state.phase = "deploying";
    this.touch();
  }

  completeDeployment() {
    if (this.state.phase !== "deploying") throw new Error("Only a deploying release can complete.");
    this.state.phase = "running";
    delete this.state.failure;
    this.touch();
  }

  fail(reason: string) {
    if (["running", "cancelled"].includes(this.state.phase)) throw new Error("A completed or cancelled release cannot fail.");
    this.state.phase = "failed";
    this.state.failure = reason;
    this.touch();
  }

  private touch() { this.state.updatedAt = new Date().toISOString(); }
}
