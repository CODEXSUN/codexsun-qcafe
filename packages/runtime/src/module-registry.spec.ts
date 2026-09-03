import { describe, expect, it } from "vitest";
import { ModuleRegistry } from "./module-registry.js";

describe("ModuleRegistry", () => {
  it("rejects a missing dependency", () => {
    const registry = new ModuleRegistry();
    registry.register({
      dependencies: ["platform.identity"],
      description: "A test application",
      id: "application.test",
      kind: "application",
      name: "Test",
      runtime: "node",
      version: "1.0.0",
    });
    expect(() => registry.validateDependencies()).toThrow("platform.identity");
  });
});
