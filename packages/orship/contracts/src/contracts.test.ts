import { expect, it } from "vitest";
import { createReleaseOperationSchema } from "./index.js";

it("accepts a project-owned release request", () => {
  const release = createReleaseOperationSchema.parse({ target: { projectKey: "codexsun-os", environment: "cloud" }, title: "Publish release state" });
  expect(release.approvalRequired).toBe(true);
});
