export const FOUNDER_APPROVAL_STATUSES = [
  "AWAITING FOUNDER APPROVAL",
  "APPROVED",
  "REJECTED",
  "DEFERRED",
  "RESOURCE REQUIRED",
  "EXECUTION BLOCKED",
  "EXECUTED — VERIFICATION PENDING",
  "VERIFIED",
] as const;

export type FounderApprovalStatus = (typeof FOUNDER_APPROVAL_STATUSES)[number];

export type FounderApprovalRecord = {
  decisionId: string;
  title: string;
  description: string;
  whyApprovalRequired: string;
  recommendedOption: string;
  requiredResources: string;
  securityImplications: string;
  relatedLaunchGates: readonly string[];
  status: FounderApprovalStatus;
  approvingPerson?: string;
  approvingRole?: string;
  approvalTimestamp?: string;
  executionStatus: string;
  verificationEvidence?: string;
  approvalVersion: number;
  currentVersion: number;
};

const statusesRequiringApproval = new Set<FounderApprovalStatus>([
  "APPROVED",
  "EXECUTED — VERIFICATION PENDING",
  "VERIFIED",
]);
const statusesWithEvidence = new Set<FounderApprovalStatus>([
  "EXECUTED — VERIFICATION PENDING",
  "VERIFIED",
]);

export function isFounderApprovalStatus(
  value: string
): value is FounderApprovalStatus {
  return (FOUNDER_APPROVAL_STATUSES as readonly string[]).includes(value);
}

export function validateFounderApproval(record: FounderApprovalRecord): void {
  const requiredText: Array<[string, string]> = [
    ["decision ID", record.decisionId],
    ["title", record.title],
    ["description", record.description],
    ["approval rationale", record.whyApprovalRequired],
    ["recommended option", record.recommendedOption],
    ["required resources", record.requiredResources],
    ["security implications", record.securityImplications],
    ["execution status", record.executionStatus],
  ];
  for (const [label, value] of requiredText) {
    if (!value.trim()) throw new Error(`Founder approval ${label} is required`);
  }
  if (!isFounderApprovalStatus(record.status)) {
    throw new Error(`Unsupported founder approval status: ${record.status}`);
  }
  if (record.relatedLaunchGates.length === 0) {
    throw new Error(
      `Founder approval ${record.decisionId} needs related launch gates`
    );
  }
  if (!Number.isInteger(record.approvalVersion) || record.approvalVersion < 1) {
    throw new Error(
      `Founder approval ${record.decisionId} has an invalid approval version`
    );
  }
  if (record.approvalVersion !== record.currentVersion) {
    throw new Error(`Founder approval ${record.decisionId} is stale`);
  }
  if (statusesRequiringApproval.has(record.status)) {
    if (!record.approvingPerson?.trim() || !record.approvingRole?.trim()) {
      throw new Error(
        `Founder approval ${record.decisionId} requires an approver and role`
      );
    }
    if (!record.approvalTimestamp?.trim()) {
      throw new Error(
        `Founder approval ${record.decisionId} requires an approval timestamp`
      );
    }
  }
  if (
    statusesWithEvidence.has(record.status) &&
    !record.verificationEvidence?.trim()
  ) {
    throw new Error(
      `Founder approval ${record.decisionId} requires execution evidence`
    );
  }
}

export function validateFounderApprovals(
  records: readonly FounderApprovalRecord[]
): void {
  const ids = new Set<string>();
  for (const record of records) {
    if (ids.has(record.decisionId)) {
      throw new Error(`Duplicate founder decision ID: ${record.decisionId}`);
    }
    ids.add(record.decisionId);
    validateFounderApproval(record);
  }
}
