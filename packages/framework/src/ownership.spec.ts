import { describe, expect, it } from "vitest";
import { FrameworkError } from "./framework-error.js";
import { defineModuleOwnership, OwnershipRegistry } from "./ownership.js";

const frameworkOwnership = {
  id: "framework.kernel",
  owner: "framework",
  protectedPaths: ["packages/framework/src"],
  publicContracts: ["@codexsun/framework"],
  roots: ["packages/framework"],
};

describe("module ownership", () => {
  it("freezes a valid public ownership contract", () => {
    expect(defineModuleOwnership(frameworkOwnership)).toMatchObject(frameworkOwnership);
  });

  it("rejects duplicate source roots", () => {
    const registry = new OwnershipRegistry();
    registry.register(frameworkOwnership);
    expect(() => registry.register({ ...frameworkOwnership, id: "framework.copy", owner: "copy" })).toThrow(FrameworkError);
  });
});
