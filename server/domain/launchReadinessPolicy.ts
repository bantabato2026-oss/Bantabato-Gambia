export const LAUNCH_GATE_STATUSES = [
  "COMPLETE",
  "CONFIGURED",
  "VERIFIED",
  "PENDING",
  "BLOCKED",
  "NOT APPLICABLE",
  "LEGAL REVIEW REQUIRED",
  "BUSINESS INPUT REQUIRED",
  "OPERATIONAL OWNER REQUIRED",
  "EXTERNAL PROVIDER REQUIRED",
  "INDEPENDENT REVIEW REQUIRED",
] as const;

export type LaunchGateStatus = (typeof LAUNCH_GATE_STATUSES)[number];
export type LaunchReadinessStatus =
  | "NOT READY"
  | "READY FOR CONTROLLED CLOSED BETA"
  | "READY FOR LAUNCH REVIEW"
  | "LAUNCH READY";

export type LaunchGate = {
  id: string;
  category: string;
  status: LaunchGateStatus;
  evidence: string;
  evidenceDateOrVersion?: string;
  dependency: string;
  ownerStatus: string;
  nextAction: string;
  blocking: boolean;
};

const evidenceRequiredStatuses = new Set<LaunchGateStatus>([
  "COMPLETE",
  "CONFIGURED",
  "VERIFIED",
]);
const satisfiedStatuses = new Set<LaunchGateStatus>([
  "COMPLETE",
  "CONFIGURED",
  "VERIFIED",
  "NOT APPLICABLE",
]);

export function isLaunchGateStatus(value: string): value is LaunchGateStatus {
  return (LAUNCH_GATE_STATUSES as readonly string[]).includes(value);
}

export function validateLaunchGate(gate: LaunchGate): void {
  if (!gate.id.trim()) throw new Error("Launch gate ID is required");
  if (!gate.category.trim())
    throw new Error(`Launch gate ${gate.id} category is required`);
  if (!isLaunchGateStatus(gate.status))
    throw new Error(`Launch gate ${gate.id} has an unsupported status`);
  if (evidenceRequiredStatuses.has(gate.status) && !gate.evidence.trim()) {
    throw new Error(
      `Launch gate ${gate.id} cannot be ${gate.status} without evidence`
    );
  }
  if (
    !gate.evidenceDateOrVersion?.trim() &&
    evidenceRequiredStatuses.has(gate.status)
  ) {
    throw new Error(
      `Launch gate ${gate.id} cannot be ${gate.status} without an evidence date or version`
    );
  }
  if (!gate.dependency.trim())
    throw new Error(`Launch gate ${gate.id} dependency is required`);
  if (!gate.ownerStatus.trim())
    throw new Error(`Launch gate ${gate.id} owner status is required`);
  if (!gate.nextAction.trim())
    throw new Error(`Launch gate ${gate.id} next action is required`);
}

export function validateLaunchGates(gates: readonly LaunchGate[]): void {
  const ids = new Set<string>();
  for (const gate of gates) {
    if (ids.has(gate.id))
      throw new Error(`Duplicate launch gate ID: ${gate.id}`);
    ids.add(gate.id);
    validateLaunchGate(gate);
  }
}

export function unresolvedBlockingGates(
  gates: readonly LaunchGate[]
): LaunchGate[] {
  return gates.filter(
    gate => gate.blocking && !satisfiedStatuses.has(gate.status)
  );
}

function categorySatisfied(
  gates: readonly LaunchGate[],
  categories: readonly string[]
): boolean {
  const selected = gates.filter(gate => categories.includes(gate.category));
  return (
    selected.length > 0 &&
    selected.every(gate => satisfiedStatuses.has(gate.status))
  );
}

export type ReadinessLayers = {
  engineeringReady: boolean;
  operationallyReady: boolean;
  legallyReady: boolean;
  securityReviewed: boolean;
  userAcceptanceReviewed: boolean;
  launchReady: boolean;
};

export function deriveReadinessLayers(
  gates: readonly LaunchGate[]
): ReadinessLayers {
  validateLaunchGates(gates);
  const engineeringReady = categorySatisfied(gates, [
    "engineering",
    "public-product",
    "commercial",
  ]);
  const operationallyReady = categorySatisfied(gates, [
    "infrastructure",
    "operations",
    "ownership",
  ]);
  const legallyReady = categorySatisfied(gates, ["legal-privacy"]);
  const securityReviewed = categorySatisfied(gates, ["security"]);
  const userAcceptanceReviewed = categorySatisfied(gates, [
    "user-acceptance",
    "accessibility",
    "localization",
  ]);
  const launchReady = unresolvedBlockingGates(gates).length === 0;
  return {
    engineeringReady,
    operationallyReady,
    legallyReady,
    securityReviewed,
    userAcceptanceReviewed,
    launchReady,
  };
}

export function deriveLaunchReadinessStatus(
  gates: readonly LaunchGate[]
): LaunchReadinessStatus {
  const layers = deriveReadinessLayers(gates);
  if (!layers.launchReady) return "NOT READY";
  if (
    !layers.engineeringReady ||
    !layers.operationallyReady ||
    !layers.legallyReady ||
    !layers.securityReviewed ||
    !layers.userAcceptanceReviewed
  ) {
    return "READY FOR LAUNCH REVIEW";
  }
  return "LAUNCH READY";
}
