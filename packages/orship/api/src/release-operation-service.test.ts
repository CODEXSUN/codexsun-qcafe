import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { MemoryReleaseEventPublisher, ReleaseOperationService, SqliteReleaseOperationRepository } from "./index.js";

const directories: string[] = [];
const services: ReleaseOperationService[] = [];

afterEach(() => {
  services.splice(0).forEach(service => service.close());
  directories.splice(0).forEach(directory => rmSync(directory, { recursive: true, force: true }));
});

function setup() {
  const directory = mkdtempSync(join(tmpdir(), "orship-"));
  directories.push(directory);
  const publisher = new MemoryReleaseEventPublisher();
  const service = new ReleaseOperationService(new SqliteReleaseOperationRepository(join(directory, "orship.db")), publisher);
  services.push(service);
  return { publisher, service };
}

it("records an approved release lifecycle without executing deployment work", async () => {
  const { publisher, service } = setup();
  const release = await service.create({ target: { projectKey: "codexsun-os", environment: "cloud" }, title: "Publish cloud state" });
  await service.approve(release.id);
  await service.publish(release.id, "0.1.25");
  await service.beginDeployment(release.id);
  const complete = await service.completeDeployment(release.id);
  expect(complete.phase).toBe("running");
  expect(publisher.events.map(event => event.type)).toEqual(["release.planned", "release.approved", "release.published", "release.deployment_started", "release.running"]);
});

it("rejects a deployment before approval and keeps state durable", async () => {
  const { service } = setup();
  const release = await service.create({ target: { projectKey: "another-app", environment: "cloud" }, title: "Prepare release" });
  await expect(service.beginDeployment(release.id)).rejects.toThrow(/published/);
  expect(service.get(release.id)?.phase).toBe("awaiting_approval");
});
