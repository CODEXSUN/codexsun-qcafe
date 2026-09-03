import { describe, expect, it } from "vitest";
import { isHierarchyLabelVisible } from "./label-visibility.js";

describe("hierarchical label visibility", () => {
  it("keeps root labels and hides children when highlighting is off", () => {
    expect(isHierarchyLabelVisible("05", "05", false)).toBe(true);
    expect(isHierarchyLabelVisible("5.1", "05", false)).toBe(false);
  });
  it("reveals only immediate children of the highlighted parent", () => {
    expect(isHierarchyLabelVisible("5.1", "05", true)).toBe(true);
    expect(isHierarchyLabelVisible("5.2", "05", true)).toBe(true);
    expect(isHierarchyLabelVisible("6.1", "05", true)).toBe(false);
    expect(isHierarchyLabelVisible("6.2.1", "06", true)).toBe(false);
  });
  it("drills into a selected child without showing sibling branches", () => {
    expect(isHierarchyLabelVisible("6.2", "6.2", true)).toBe(true);
    expect(isHierarchyLabelVisible("6.2.1", "6.2", true)).toBe(true);
    expect(isHierarchyLabelVisible("6.3", "6.2", true)).toBe(false);
  });
});
