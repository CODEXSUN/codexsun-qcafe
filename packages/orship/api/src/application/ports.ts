import type { ReleaseOperation, ReleaseOperationEvent, ReleaseOperationReview, ReleaseOperationReviewEvent } from "@codexsun/orship-contracts";

export interface ReleaseOperationRepository {
  list(): ReleaseOperation[];
  listEvents(limit: number): ReleaseOperationEvent[];
  listEventsForOperation(operationId: string): ReleaseOperationEvent[];
  get(id: string): ReleaseOperation | undefined;
  getReview(operationId: string): ReleaseOperationReview | undefined;
  listReviews(operationId: string): ReleaseOperationReviewEvent[];
  saveReview(review: ReleaseOperationReview): void;
  save(operation: ReleaseOperation, event: string, details?: Record<string, unknown>): void;
  close(): void;
}

export interface ReleaseEventPublisher {
  publish(event: { type: string; operation: ReleaseOperation }): Promise<void>;
}
