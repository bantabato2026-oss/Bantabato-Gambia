import { describe, expect, it } from "vitest";
import {
  deriveLaunchReadinessStatus,
  deriveReadinessLayers,
  unresolvedBlockingGates,
  validateLaunchGate,
  validateLaunchGates,
  type LaunchGate,
} from "./launchReadinessPolicy";

const gate = (overrides: Partial<LaunchGate> = {}): LaunchGate => ({
  id: "ENG-001",
  category: "engineering",
  status: "VERIFIED",
  evidence: "Automated source contract passed",
  evidenceDateOrVersion: "test-version",
  dependency: "Repository source",
  ownerStatus: "ENGINEERING",
  nextAction: "Preserve regression coverage",
  blocking: false,
  ...overrides,
});

describe("launch readiness policy", () => {
  it("rejects a claimed verified gate without dated or versioned evidence", () => {
    expect(() => validateLaunchGate(gate({ evidence: "" }))).toThrow(
      "without evidence"
    );
    expect(() =>
      validateLaunchGate(gate({ evidenceDateOrVersion: undefined }))
    ).toThrow("evidence date or version");
  });

  it("rejects duplicate gate IDs and preserves explicit hard blockers", () => {
    const blocker = gate({
      id: "INF-001",
      category: "infrastructure",
      status: "BLOCKED",
      blocking: true,
      evidence: "No isolated staging target exists",
      evidenceDateOrVersion: "2026-10-06",
    });
    expect(() => validateLaunchGates([blocker, blocker])).toThrow(
      "Duplicate launch gate ID"
    );
    expect(unresolvedBlockingGates([blocker])).toEqual([blocker]);
    expect(deriveLaunchReadinessStatus([blocker])).toBe("NOT READY");
  });

  it("does not collapse engineering evidence into operational, legal, security, or acceptance readiness", () => {
    const engineering = gate();
    const layers = deriveReadinessLayers([engineering]);
    expect(layers.engineeringReady).toBe(true);
    expect(layers.operationallyReady).toBe(false);
    expect(layers.legallyReady).toBe(false);
    expect(layers.securityReviewed).toBe(false);
    expect(layers.userAcceptanceReviewed).toBe(false);
    expect(deriveLaunchReadinessStatus([engineering])).toBe(
      "READY FOR LAUNCH REVIEW"
    );
  });

  it("requires all readiness layers and zero unresolved blockers before launch ready", () => {
    const gates: LaunchGate[] = [
      gate({ id: "ENG-001", category: "engineering" }),
      gate({ id: "OPS-001", category: "operations" }),
      gate({ id: "OWN-001", category: "ownership" }),
      gate({ id: "LEGAL-001", category: "legal-privacy" }),
      gate({ id: "SEC-001", category: "security" }),
      gate({ id: "ACC-001", category: "accessibility" }),
      gate({ id: "UA-001", category: "user-acceptance" }),
      gate({ id: "LOC-001", category: "localization" }),
    ];
    expect(deriveLaunchReadinessStatus(gates)).toBe("LAUNCH READY");
  });
});
