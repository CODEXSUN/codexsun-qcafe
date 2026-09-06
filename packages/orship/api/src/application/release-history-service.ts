import type { ReleaseHistoryEntry, ReleaseOperation, SaveReleaseOperationReview } from "@codexsun/orship-contracts";
import type { ReleaseOperationRepository } from "./ports.js";

const terminalPhases = new Set<ReleaseOperation["phase"]>(["running", "failed", "cancelled"]);

export type ReleaseHistoryFilter = { phase?: ReleaseOperation["phase"]; projectKey?: string; query?: string };

export class ReleaseHistoryService {
  constructor(private readonly repository: ReleaseOperationRepository) {}

  list(filter: ReleaseHistoryFilter = {}) {
    const query = filter.query?.trim().toLocaleLowerCase();
    return this.repository.list()
      .filter(operation => terminalPhases.has(operation.phase))
      .filter(operation => !filter.phase || operation.phase === filter.phase)
      .filter(operation => !filter.projectKey || operation.target.projectKey === filter.projectKey)
      .filter(operation => !query || searchableText(operation).includes(query))
      .map(operation => this.toEntry(operation));
  }

  get(operationId: string) {
    const operation = this.repository.get(operationId);
    return operation && terminalPhases.has(operation.phase) ? this.toEntry(operation) : undefined;
  }

  review(operationId: string, input: SaveReleaseOperationReview) {
    const operation = this.repository.get(operationId);
    if (!operation || !terminalPhases.has(operation.phase)) throw new Error("Only a completed release operation can be reviewed.");
    this.repository.saveReview({ operationId, status: input.status, notes: input.notes ?? "", reviewedAt: new Date().toISOString() });
    return this.toEntry(operation);
  }

  private toEntry(operation: ReleaseOperation): ReleaseHistoryEntry {
    const events = this.repository.listEventsForOperation(operation.id);
    return {
      operation,
      events,
      review: this.repository.getReview(operation.id) ?? null,
      reviews: this.repository.listReviews(operation.id),
      summary: {
        outcome: historyOutcome(operation),
        eventCount: events.length,
        durationMs: Math.max(0, Date.parse(operation.updatedAt) - Date.parse(operation.createdAt)),
        completedAt: operation.updatedAt,
      },
    };
  }
}

function historyOutcome(operation: ReleaseOperation): ReleaseHistoryEntry["summary"]["outcome"] {
  if (operation.phase === "running") return "completed";
  if (operation.phase === "failed" || operation.phase === "cancelled") return operation.phase;
  throw new Error("Release operation is not complete.");
}

function searchableText(operation: ReleaseOperation) {
  return [operation.title, operation.target.projectKey, operation.target.repository, operation.version, operation.sourceRevision, operation.failure]
    .filter(Boolean).join(" ").toLocaleLowerCase();
}
