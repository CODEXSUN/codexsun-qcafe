import { expect, it } from "vitest";
import { createAiTaskSchema } from "./index.js";

it("accepts useful requests and rejects empty intake", () => {
  expect(createAiTaskSchema.parse({ request: "Build a reusable task board" }).request).toContain("task board");
  expect(createAiTaskSchema.safeParse({ request: "short" }).success).toBe(false);
});
