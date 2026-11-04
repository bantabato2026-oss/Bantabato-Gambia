export const DEVELOPER_ACCESS_STATUSES = [
  "DISCUSSION_ONLY",
  "NOT_APPOINTED",
  "APPOINTED",
] as const;

export type DeveloperAccessStatus = (typeof DEVELOPER_ACCESS_STATUSES)[number];

export type DeveloperAccessRecord = {
  status: DeveloperAccessStatus;
  writtenAgreement: boolean;
  accessApproval: boolean;
  accountId?: string;
};

export type OwnerAcceptance = {
  role: string;
  person: string;
  accepted: boolean;
  acceptanceReference?: string;
  acceptanceTimestamp?: string;
};

export type BudgetControl = {
  initialCeilingD: number;
  monthlyCeilingD: number;
  spendingAuthorized: boolean;
  provisioningAuthorized: boolean;
};

export type StagingIsolationEvidence = {
  deployment: boolean;
  environmentSecrets: boolean;
  database: boolean;
  migrations: boolean;
  storage: boolean;
  oauthAndSessions: boolean;
  communicationsDisabled: boolean;
  monitoring: boolean;
  backupRestore: boolean;
  rollbackAndProductionDenied: boolean;
};

export type FourEyesApproval = {
  action: string;
  requester: string;
  approver: string;
  approverIsAcceptedReviewer: boolean;
};

export type StagingDataSource = "SYNTHETIC" | "PRODUCTION";

export function assertDeveloperAccessAllowed(
  record: DeveloperAccessRecord
): void {
  if (record.status !== "APPOINTED") {
    throw new Error("Developer access denied: developer is not appointed");
  }
  if (!record.writtenAgreement || !record.accessApproval) {
    throw new Error(
      "Developer access denied: agreement and explicit access approval are required"
    );
  }
  if (!record.accountId?.trim()) {
    throw new Error("Developer access denied: separate account is required");
  }
}

export function assertOwnerAccepted(owner: OwnerAcceptance): void {
  if (!owner.person.trim() || !owner.role.trim()) {
    throw new Error("Owner acceptance requires a person and role");
  }
  if (!owner.accepted) {
    throw new Error(`Owner acceptance pending: ${owner.role}`);
  }
  if (
    !owner.acceptanceReference?.trim() ||
    !owner.acceptanceTimestamp?.trim()
  ) {
    throw new Error(`Owner acceptance evidence required: ${owner.role}`);
  }
}

export function assertFounderRoleAccepted(owner: OwnerAcceptance): void {
  if (owner.role !== "Founder") {
    throw new Error("Founder role record required");
  }
  assertOwnerAccepted(owner);
}

export function assertBudgetAndProvisioningAuthorized(
  control: BudgetControl
): void {
  if (control.initialCeilingD < 0 || control.monthlyCeilingD < 0) {
    throw new Error("Budget ceilings cannot be negative");
  }
  if (!control.spendingAuthorized) {
    throw new Error("Spending authorization is required");
  }
  if (!control.provisioningAuthorized) {
    throw new Error("Infrastructure provisioning authorization is required");
  }
}

export function assertStagingIsolationReady(
  evidence: StagingIsolationEvidence
): void {
  const missing = Object.entries(evidence)
    .filter(([, verified]) => !verified)
    .map(([control]) => control);
  if (missing.length > 0) {
    throw new Error(
      `Staging isolation evidence missing: ${missing.join(", ")}`
    );
  }
}

export function assertFourEyesApproval(approval: FourEyesApproval): void {
  if (!approval.requester.trim() || !approval.approver.trim()) {
    throw new Error("Four-eyes approval requires requester and approver");
  }
  if (approval.requester === approval.approver) {
    throw new Error("Four-eyes approval requires a distinct reviewer");
  }
  if (!approval.approverIsAcceptedReviewer) {
    throw new Error("Four-eyes approval requires an accepted reviewer");
  }
}

export function assertSyntheticStagingData(source: StagingDataSource): void {
  if (source !== "SYNTHETIC") {
    throw new Error("Staging tests may use synthetic data only");
  }
}
