import { describe, expect, it } from "vitest";
import { moduleManifestSchema } from "./index.js";

describe("moduleManifestSchema", () => {
  it("rejects an invalid module identifier", () => {
    expect(() => moduleManifestSchema.parse({
      description: "Invalid module",
      id: "Invalid Module",
      kind: "application",
      name: "Invalid",
      runtime: "node",
      version: "1.0.0",
    })).toThrow();
  });
});
