import { describe, expect, it } from "vitest";
import { normalizeTags, readStartupPreferences } from "./startup-preferences";

describe("browser startup preferences", () => {
  it("recovers from invalid and unavailable storage", () => {
    expect(readStartupPreferences({ getItem: () => "{" }).iotEnabled).toBe(false);
    expect(readStartupPreferences({ getItem: () => { throw new Error("Storage denied"); } }).features.navigation).toBe(true);
  });

  it("restores known applications and rejects malformed feature values", () => {
    const preferences = readStartupPreferences({ getItem: () => JSON.stringify({ applications: { devkit: true }, features: { menu: false }, iotEnabled: true, tags: { devkit: ["IoT", "iot", 12, " Sensors "] } }) });
    expect(preferences.applications).toEqual({ devkit: true });
    expect(preferences.features.menu).toBe(false);
    expect(preferences.tags.devkit).toEqual(["iot", "sensors"]);
    expect(preferences.iotEnabled).toBe(true);
  });

  it("removes empty tags and limits saved capability metadata", () => {
    expect(normalizeTags(" IoT, , iot, SENSORS ")).toEqual(["iot", "sensors"]);
    expect(normalizeTags(Array.from({ length: 20 }, (_, index) => `tag-${index}`).join(","))).toHaveLength(12);
    expect(normalizeTags("")).toEqual([]);
  });
});
