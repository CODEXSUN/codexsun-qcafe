import { expect, it } from "vitest";
import { requiredPermission } from "./identity-access.js";

it("separates chat access from task and installation mutations", () => {
  expect(requiredPermission("POST", "/api/v1/zetro/messages")).toBeUndefined();
  expect(requiredPermission("POST", "/api/v1/ai-tasks")).toBe("tasks.manage");
  expect(requiredPermission("POST", `/api/v1/ai-tasks/${crypto.randomUUID()}/release`)).toBe("tasks.manage");
  expect(requiredPermission("PUT", `/api/v1/zetro/knowledge/proposals/${crypto.randomUUID()}/review`)).toBe("tasks.manage");
  expect(requiredPermission("POST", "/api/v1/zetro/knowledge/index")).toBe("installation.manage");
});
