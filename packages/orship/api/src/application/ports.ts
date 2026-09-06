import type { ReleaseOperation, ReleaseOperationEvent } from "@codexsun/orship-contracts";

export interface ReleaseOperationRepository {
  list(): ReleaseOperation[];
  listEvents(limit: number): ReleaseOperationEvent[];
  get(id: string): ReleaseOperation | undefined;
  save(operation: ReleaseOperation, event: string, details?: Record<string, unknown>): void;
  close(): void;
}

export interface ReleaseEventPublisher {
  publish(event: { type: string; operation: ReleaseOperation }): Promise<void>;
}
