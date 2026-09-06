import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { WorkCaseStore } from "./work-case-store.js";

const folders: string[] = [];
afterEach(() => folders.splice(0).forEach((folder) => rmSync(folder, { recursive: true, force: true })));

it("keeps one durable timeline across task and release references", () => {
  const folder = mkdtempSync(join(tmpdir(), "zetro-work-case-"));
  folders.push(folder);
  const store = new WorkCaseStore(join(folder, "zetro.db"));
  const workCase = store.create("Deliver the approved client change.");
  store.record(workCase.id, "task.planned", { status: "planning", reference: { kind: "task", id: crypto.randomUUID() } });
  store.record(workCase.id, "release.planned", { status: "release_planned", reference: { kind: "release", id: crypto.randomUUID() } });
  expect(store.get(workCase.id)?.status).toBe("release_planned");
  expect(store.get(workCase.id)?.references.map((reference) => reference.kind)).toEqual(["task", "release"]);
  expect(store.events(workCase.id).map((event) => event.type)).toEqual(["work_case.created", "task.planned", "release.planned"]);
  store.close();
});
