import { describe, expect, it } from "vitest";
import { AppRegistryWorkspace } from "./index.js";

describe("AppRegistryWorkspace module", () => {
  it("exports AppRegistryWorkspace component", () => {
    expect(AppRegistryWorkspace).toBeDefined();
    expect(typeof AppRegistryWorkspace).toBe("function");
  });
});
