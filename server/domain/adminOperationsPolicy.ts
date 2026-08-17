import type { StaffRole } from "../../drizzle/schema";

export const PERMISSION_CATALOG = [
  ["members.view", "members", "View support-safe member operational status", false],
  ["members.search", "members", "Search members by permitted identifiers", false],
  ["members.support", "members", "Create and manage support-safe member requests", false],
  ["verification.view", "verification", "View verification operational queue metadata", false],
  ["verification.review", "verification", "Claim and review verification work", false],
  ["verification.approve", "verification", "Approve or request verification resubmission", true],
  ["verification.reject", "verification", "Reject verification under policy", true],
  ["safety.cases.view", "safety", "View authorized safety case metadata", false],
  ["safety.cases.update", "safety", "Triage authorized safety cases", false],
  ["safety.cases.escalate", "safety", "Escalate authorized safety cases", false],
  ["safety.actions.create", "safety", "Request proportionate safety enforcement", true],
  ["safety.actions.approve", "safety", "Provide independent safety enforcement approval", true],
  ["finance.transactions.view", "finance", "View provider-safe transaction records", false],
  ["finance.refunds.create", "finance", "Request a refund through the existing workflow", true],
  ["finance.refunds.approve", "finance", "Approve a separately requested refund", true],
  ["subscriptions.view", "finance", "View membership plans and subscriptions", false],
  ["subscriptions.manage", "finance", "Manage permitted membership configuration", true],
  ["notifications.view", "notifications", "View privacy-safe notification operations", false],
  ["notifications.manage", "notifications", "Process notification operations and metadata", true],
  ["recommendations.policy.view", "recommendations", "View recommendation policy versions", false],
  ["recommendations.policy.manage", "recommendations", "Propose recommendation policy changes", true],
  ["recommendations.policy.approve", "recommendations", "Approve a separately proposed recommendation policy", true],
  ["settings.view", "configuration", "View safe operational configuration", false],
  ["settings.manage", "configuration", "Propose controlled configuration changes", true],
  ["audit.view", "audit", "View minimized operational audit history", false],
  ["staff.view", "staff", "View staff lifecycle and role metadata", false],
  ["staff.manage", "staff", "Invite and manage staff under approval controls", true],
  ["support.view", "support", "View support tickets within role scope", false],
  ["support.manage", "support", "Assign and transition support tickets", false],
  ["incidents.view", "incidents", "View operational incident records", false],
  ["incidents.manage", "incidents", "Create and update operational incidents", true],
  ["approvals.view", "approvals", "View permitted approval queue records", false],
  ["approvals.decide", "approvals", "Decide an independent approval request", true],
  ["feature_flags.view", "configuration", "View environment-scoped feature flag metadata", false],
  ["feature_flags.manage", "configuration", "Propose feature flag changes", true],
  ["beta.view", "configuration", "View closed-beta enrollment metadata", false],
  ["beta.manage", "configuration", "Manage closed-beta invitations and emergency controls", true],
] as const;

export type PermissionKey = (typeof PERMISSION_CATALOG)[number][0];

const allPermissions = PERMISSION_CATALOG.map(([key]) => key) as PermissionKey[];

export const DEFAULT_ROLE_PERMISSIONS: Record<StaffRole, readonly PermissionKey[]> = {
  platform_administrator: allPermissions,
  operations_manager: ["members.view", "members.search", "members.support", "verification.view", "safety.cases.view", "finance.transactions.view", "subscriptions.view", "notifications.view", "notifications.manage", "recommendations.policy.view", "settings.view", "audit.view", "staff.view", "support.view", "support.manage", "incidents.view", "incidents.manage", "approvals.view", "beta.view", "beta.manage"],
  trust_safety_officer: ["members.view", "members.search", "safety.cases.view", "safety.cases.update", "safety.cases.escalate", "safety.actions.create", "safety.actions.approve", "audit.view", "incidents.view", "approvals.view"],
  verification_officer: ["members.view", "members.search", "verification.view", "verification.review", "verification.approve", "verification.reject", "audit.view"],
  customer_support_officer: ["members.view", "members.search", "members.support", "support.view", "support.manage"],
  finance_officer: ["members.view", "finance.transactions.view", "finance.refunds.create", "finance.refunds.approve", "subscriptions.view", "subscriptions.manage", "audit.view", "approvals.view"],
  content_policy_manager: ["recommendations.policy.view", "recommendations.policy.manage", "recommendations.policy.approve", "settings.view", "settings.manage", "feature_flags.view", "feature_flags.manage", "audit.view", "approvals.view"],
  read_only_auditor: ["verification.view", "safety.cases.view", "finance.transactions.view", "subscriptions.view", "notifications.view", "recommendations.policy.view", "settings.view", "audit.view", "staff.view", "support.view", "incidents.view", "approvals.view", "feature_flags.view"],
};

export function isKnownPermission(value: string): value is PermissionKey { return allPermissions.includes(value as PermissionKey); }
export function roleCan(role: StaffRole, permission: PermissionKey) { return DEFAULT_ROLE_PERMISSIONS[role].includes(permission); }
export function permissionModules(keys: readonly PermissionKey[]) { return Array.from(new Set(PERMISSION_CATALOG.filter(([key]) => keys.includes(key)).map(([, module]) => module))); }
export function permissionIsHighImpact(key: PermissionKey) { return PERMISSION_CATALOG.find(([candidate]) => candidate === key)?.[3] ?? false; }
export function requiresIndependentApproval(type: "safety_action" | "refund" | "staff_role_change" | "permission_override" | "policy_change" | "configuration_change" | "feature_flag") { return ["safety_action", "refund", "staff_role_change", "permission_override", "policy_change", "configuration_change", "feature_flag"].includes(type); }
export function canDecideApproval(requesterUserId: number, approverUserId: number, approverRole: StaffRole, requiredRole: StaffRole, status: string, expiresAt: Date, now = new Date()) { return requesterUserId !== approverUserId && approverRole === requiredRole && status === "pending" && expiresAt > now; }
export function staffSessionIsUsable(status: string, expiresAt: Date, now = new Date()) { return status === "active" && expiresAt > now; }
export function permissionRequiresFreshReauthentication(permission: PermissionKey) { return ["staff.manage", "finance.refunds.approve", "safety.actions.approve", "settings.manage", "feature_flags.manage", "recommendations.policy.approve", "beta.manage"].includes(permission); }
export function safeStaffNavigation(keys: readonly PermissionKey[]) {
  const permitted = new Set(keys);
  return [
    ["Overview", "/admin", "members.view"], ["Members", "/admin/members", "members.search"], ["Verification", "/admin/verification", "verification.view"], ["Trust & Safety", "/admin/safety", "safety.cases.view"], ["Support", "/admin/support", "support.view"], ["Family Circle", "/admin/family", "members.view"], ["Recommendations", "/admin/recommendations", "recommendations.policy.view"], ["Billing", "/admin/billing", "finance.transactions.view"], ["Notifications", "/admin/notifications", "notifications.view"], ["Approvals", "/admin/approvals", "approvals.view"], ["Incidents", "/admin/incidents", "incidents.view"], ["Staff & permissions", "/admin/staff", "staff.view"], ["Audit logs", "/admin/audit", "audit.view"], ["Configuration", "/admin/configuration", "settings.view"],
  ].filter(([, , permission]) => permitted.has(permission as PermissionKey)).map(([label, href, permission]) => ({ label, href, permission: permission as PermissionKey }));
}
