import { describe, expect, it } from "vitest";
import { evaluateCompatibility, evaluatePair } from "./compatibility";

const viewer = { id: 1, birthDate: "1991-05-10", gender: "woman" as const, religion: "muslim" as const, country: "The Gambia", maritalStatus: "never_married" as const, hasChildren: false, relocationWillingness: "open" as const, marriageIntent: "Seeking marriage" };
const candidate = { id: 2, birthDate: "1988-08-12", gender: "man" as const, religion: "muslim" as const, country: "The Gambia", maritalStatus: "never_married" as const, hasChildren: false, relocationWillingness: "open" as const, marriageIntent: "Seeking marriage" };

describe("deterministic compatibility dimensions", () => {
  it("returns explainable compatible dimensions without a percentage", () => {
    const result = evaluateCompatibility(viewer, candidate, { minAge: 30, maxAge: 45, preferredGenders: ["man"], preferredReligions: ["muslim"], preferredLocations: ["The Gambia"], preferenceImportance: { age: "required", gender: "required", religion: "preferred", location: "preferred" } });
    expect(result.eligible).toBe(true);
    expect(result.dimensions.find(item => item.dimension === "age")?.result).toBe("compatible");
    expect(result.dimensions.find(item => item.dimension === "gender")?.result).toBe("compatible");
    expect(JSON.stringify(result)).not.toContain("percentage");
  });

  it("excludes a candidate only when a stated hard requirement is not met", () => {
    const result = evaluateCompatibility(viewer, { ...candidate, country: "United Kingdom" }, { preferredLocations: ["The Gambia"], preferenceImportance: { location: "required" } });
    expect(result.eligible).toBe(false);
    expect(result.dimensions.find(item => item.dimension === "location")?.result).toBe("not_compatible");
  });

  it("treats a non-required preference mismatch as a respectful consideration", () => {
    const result = evaluateCompatibility(viewer, { ...candidate, relocationWillingness: "not_open" }, { preferredRelocation: ["open"], preferenceImportance: { relocation: "preferred" } });
    expect(result.eligible).toBe(true);
    expect(result.dimensions.find(item => item.dimension === "relocation")?.result).toBe("consideration");
  });

  it("does not use ethnicity, wealth, appearance, popularity, or paid status as dimensions", () => {
    const result = evaluatePair(viewer, candidate, {}, {});
    const dimensions = result.dimensions.map(item => item.dimension);
    expect(dimensions).not.toContain("ethnicity");
    expect(dimensions).not.toContain("wealth");
    expect(dimensions).not.toContain("appearance");
    expect(dimensions).not.toContain("popularity");
  });

  it("allows married-status and polygyny preferences to be evaluated only when voluntarily configured", () => {
    const result = evaluateCompatibility(viewer, { ...candidate, maritalStatus: "divorced", polygynyOpenness: "discuss" }, { preferredMaritalStatuses: ["divorced"], preferredPolygynyOpenness: ["discuss"], preferenceImportance: { marital_status: "required", polygyny: "preferred" } });
    expect(result.eligible).toBe(true);
    expect(result.dimensions.find(item => item.dimension === "marital_status")?.result).toBe("compatible");
  });

  it("supports married members only through voluntary marital-status and polygyny preferences", () => {
    const result = evaluateCompatibility(viewer, { ...candidate, maritalStatus: "married", polygynyOpenness: "open" }, { preferredMaritalStatuses: ["married"], preferredPolygynyOpenness: ["open"], preferenceImportance: { marital_status: "required", polygyny: "required" } });
    expect(result.eligible).toBe(true);
    expect(result.dimensions.find(item => item.dimension === "polygyny")?.result).toBe("compatible");
  });

  it("evaluates desire-for-children as its own explainable configurable dimension", () => {
    const compatible = evaluateCompatibility(viewer, { ...candidate, desireChildren: "open" }, { desiredChildrenPreference: "yes", preferenceImportance: { desired_children: "required" } });
    const incompatible = evaluateCompatibility(viewer, { ...candidate, desireChildren: "no" }, { desiredChildrenPreference: "yes", preferenceImportance: { desired_children: "required" } });
    expect(compatible.eligible).toBe(true);
    expect(compatible.dimensions.find(item => item.dimension === "desired_children")?.result).toBe("compatible");
    expect(incompatible.eligible).toBe(false);
    expect(incompatible.dimensions.find(item => item.dimension === "desired_children")?.result).toBe("not_compatible");
  });

  it("evaluates has-children preference separately from desire-for-children", () => {
    const compatible = evaluateCompatibility(viewer, { ...candidate, hasChildren: false }, { childrenPreference: "prefer_no_children", preferenceImportance: { children: "required" } });
    const incompatible = evaluateCompatibility(viewer, { ...candidate, hasChildren: true }, { childrenPreference: "prefer_no_children", preferenceImportance: { children: "required" } });
    expect(compatible.eligible).toBe(true);
    expect(incompatible.eligible).toBe(false);
    expect(incompatible.dimensions.find(item => item.dimension === "children")?.result).toBe("not_compatible");
  });
});
