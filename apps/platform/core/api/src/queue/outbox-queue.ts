import { Queue, type JobsOptions } from "bullmq";

export type OutboxJob = {
  id: string;
  payload: Record<string, unknown>;
  topic: string;
};

/**
 * Platform-owned queue boundary. Product workers consume through their public
 * contracts; this module does not own product jobs or business workflows.
 */
export class PlatformOutboxQueue {
  readonly #queues = new Map<string, Queue<OutboxJob>>();

  constructor(private readonly redisUrl?: string) {}

  async publish(job: OutboxJob, options: JobsOptions = {}): Promise<void> {
    if (!this.redisUrl) return;
    const queue = this.getQueue(job.topic);
    await queue.add(job.topic, job, { ...options, jobId: job.id });
  }

  async stop(): Promise<void> {
    await Promise.all([...this.#queues.values()].map((queue) => queue.close()));
    this.#queues.clear();
  }

  private getQueue(topic: string): Queue<OutboxJob> {
    const existing = this.#queues.get(topic);
    if (existing) return existing;
    const queue = new Queue<OutboxJob>(`platform.${topic}`, { prefix: "codexsun", connection: { url: this.redisUrl } });
    this.#queues.set(topic, queue);
    return queue;
  }
}
