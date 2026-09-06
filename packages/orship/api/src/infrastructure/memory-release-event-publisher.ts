import type { ReleaseEventPublisher } from "../application/ports.js";

export class MemoryReleaseEventPublisher implements ReleaseEventPublisher {
  readonly events: Array<Parameters<ReleaseEventPublisher["publish"]>[0]> = [];
  async publish(event: Parameters<ReleaseEventPublisher["publish"]>[0]) { this.events.push(structuredClone(event)); }
}
