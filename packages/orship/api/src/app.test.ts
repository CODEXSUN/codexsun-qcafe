import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { buildOrshipApp } from "./app.js";

const directories: string[] = [];
const apps: Array<ReturnType<typeof buildOrshipApp>> = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map(app => app.close()));
  directories.splice(0).forEach(directory => rmSync(directory, { recursive: true, force: true }));
});

it("runs independently and records a release through its HTTP contract", async () => {
  const directory = mkdtempSync(join(tmpdir(), "orship-http-"));
  directories.push(directory);
  const stateFile = join(directory, "release.json");
  writeFileSync(stateFile, JSON.stringify({ version: "0.1.25", phase: "running", updatedAt: "2026-09-06T00:00:00.000Z", run: "sample" }));
  const app = buildOrshipApp({ databaseFile: join(directory, "orship.db"), cloudStateFile: stateFile });
  apps.push(app);
  expect((await app.inject("/health")).json()).toMatchObject({ service: "orship", status: "ok" });
  const created = await app.inject({ method: "POST", url: "/api/v1/orship", payload: { target: { projectKey: "sample-app", environment: "local" }, title: "Prepare a local release" } });
  expect(created.statusCode).toBe(200);
  expect((await app.inject("/api/v1/orship")).json()).toHaveLength(1);
  expect((await app.inject("/api/v1/orship/cloud-state")).json()).toMatchObject({ version: "0.1.25", phase: "running" });
  expect((await app.inject("/api/v1/orship/events")).json()).toHaveLength(1);
});
