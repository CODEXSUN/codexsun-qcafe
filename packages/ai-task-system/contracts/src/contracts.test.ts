import { expect, it } from "vitest";
import { aiTaskSchema, createAiTaskSchema } from "./index.js";

it("accepts useful requests and rejects empty intake", () => {
  expect(createAiTaskSchema.parse({ request: "Build a reusable task board" }).request).toContain("task board");
  expect(createAiTaskSchema.safeParse({ request: "short" }).success).toBe(false);
});

it("accepts a typed Zetro handoff source", () => {
  const source = { applicationId: "app.zetro", applicationName: "Zetro", surface: "desktop" as const, sender: "Zetro Desk", subject: "Review the Q Cafe repository" };
  expect(createAiTaskSchema.parse({ request: "Review the Q Cafe repository", source }).source).toEqual(source);
  expect(aiTaskSchema.safeParse({}).success).toBe(false);
});
