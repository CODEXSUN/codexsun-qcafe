/**
 * App Registry audit events are dispatched to the Platform persistence outbox;
 * background delivery is handled by the platform queue/outbox worker.
 */
export async function runAppRegistryWorker(): Promise<void> {}
