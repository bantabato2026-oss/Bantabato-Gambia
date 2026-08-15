import { and, asc, desc, eq, inArray, isNull, like, or, sql } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";
import { adminRoles, auditLogs, memberProfiles, notifications, operationalApprovals, operationalFeatureFlags, operationalIncidentEvents, operationalIncidents, reports, staffInvitations, staffPermissionOverrides, staffPermissions, staffProfiles, staffRolePermissions, staffSessionControls, supportTicketEvents, supportTickets, type StaffRole, users, verificationRecords } from "../drizzle/schema";
import { createAuditLog, getDb } from "./db";
import { getActiveAdminScopes } from "./operations";
import { DEFAULT_ROLE_PERMISSIONS, PERMISSION_CATALOG, canDecideApproval, isKnownPermission, permissionRequiresFreshReauthentication, requiresIndependentApproval, roleCan, staffSessionIsUsable, type PermissionKey } from "./domain/adminOperationsPolicy";

type StaffStatus = "invited" | "active" | "suspended" | "deactivated";
type ApprovalType = "safety_action" | "refund" | "staff_role_change" | "permission_override" | "policy_change" | "configuration_change" | "feature_flag";
type SupportStatus = "new" | "open" | "waiting_for_member" | "waiting_for_staff" | "escalated" | "resolved" | "closed";
type IncidentStatus = "detected" | "investigating" | "mitigating" | "monitoring" | "resolved" | "closed";

function hash(value: string) { return createHash("sha256").update(value).digest("hex"); }
function asId(result: unknown) { const row = Array.isArray(result) ? result[0] as { id?: number; insertId?: number } | undefined : undefined; return Number(row?.id ?? row?.insertId ?? 0); }
function isHighImpactStaffRole(role: StaffRole) { return ["platform_administrator", "trust_safety_officer", "finance_officer"].includes(role); }
const LEGACY_SCOPE_MAP: Partial<Record<StaffRole, "verification_reviewer" | "trust_safety" | "support_agent" | "subscription_manager" | "platform_admin">> = { platform_administrator: "platform_admin", trust_safety_officer: "trust_safety", verification_officer: "verification_reviewer", customer_support_officer: "support_agent", finance_officer: "subscription_manager" };

export async function getEffectiveStaffAccess(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const profile = (await db.select().from(staffProfiles).where(eq(staffProfiles.userId, userId)).limit(1))[0];
  if (profile?.status === "active") {
    const mapped = await db.select({ permissionKey: staffPermissions.permissionKey }).from(staffRolePermissions).innerJoin(staffPermissions, eq(staffRolePermissions.permissionId, staffPermissions.id)).where(eq(staffRolePermissions.staffRole, profile.staffRole));
    const defaults = DEFAULT_ROLE_PERMISSIONS[profile.staffRole];
    const overrideRows = await db.select({ permissionKey: staffPermissions.permissionKey, effect: staffPermissionOverrides.effect }).from(staffPermissionOverrides).innerJoin(staffPermissions, eq(staffPermissionOverrides.permissionId, staffPermissions.id)).where(and(eq(staffPermissionOverrides.staffProfileId, profile.id), eq(staffPermissionOverrides.status, "active")));
    const permissions = new Set<PermissionKey>((mapped.length ? mapped.map(row => row.permissionKey).filter(isKnownPermission) : defaults) as PermissionKey[]);
    for (const override of overrideRows) if (isKnownPermission(override.permissionKey)) { if (override.effect === "grant") permissions.add(override.permissionKey); else permissions.delete(override.permissionKey); }
    return { staffProfileId: profile.id, staffRole: profile.staffRole, status: profile.status as StaffStatus, permissions: Array.from(permissions), lastReauthenticatedAt: profile.lastReauthenticatedAt };
  }
  const legacy = await getActiveAdminScopes(userId);
  if (legacy.includes("platform_admin")) return { staffProfileId: null, staffRole: "platform_administrator" as StaffRole, status: "active" as StaffStatus, permissions: [...DEFAULT_ROLE_PERMISSIONS.platform_administrator], lastReauthenticatedAt: new Date() };
  throw new Error("An active, permissioned staff identity is required.");
}

export async function requireOperationalPermission(userId: number, permission: PermissionKey, options?: { requireFresh?: boolean }) {
  const access = await getEffectiveStaffAccess(userId);
  if (!access.permissions.includes(permission)) throw new Error("Your staff permissions do not permit this action.");
  if ((options?.requireFresh || permissionRequiresFreshReauthentication(permission)) && (!access.lastReauthenticatedAt || Date.now() - access.lastReauthenticatedAt.getTime() > 15 * 60 * 1000)) throw new Error("A fresh staff reauthentication is required before this sensitive action.");
  return access;
}

export async function listCurrentStaffPermissions(userId: number) { return getEffectiveStaffAccess(userId); }

export async function listStaffDirectory(actorUserId: number) {
  await requireOperationalPermission(actorUserId, "staff.view"); const db = await getDb(); if (!db) return [];
  return db.select({ id: staffProfiles.id, userId: staffProfiles.userId, staffRole: staffProfiles.staffRole, status: staffProfiles.status, mfaRequired: staffProfiles.mfaRequired, activatedAt: staffProfiles.activatedAt, suspendedAt: staffProfiles.suspendedAt, deactivatedAt: staffProfiles.deactivatedAt, name: users.name, email: users.email }).from(staffProfiles).innerJoin(users, eq(staffProfiles.userId, users.id)).orderBy(asc(staffProfiles.staffRole), asc(users.name)).limit(100);
}

export async function inviteStaff(actorUserId: number, input: { email: string; staffRole: StaffRole; expiresInHours: number }) {
  const access = await requireOperationalPermission(actorUserId, "staff.manage", { requireFresh: true });
  if (isHighImpactStaffRole(input.staffRole) && access.staffRole !== "platform_administrator") throw new Error("Only a platform administrator may propose an elevated staff invitation.");
  if (isHighImpactStaffRole(input.staffRole)) throw new Error("Elevated staff invitations require a separate approved staff-role request before an invitation can be issued.");
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  const invitationCode = randomBytes(24).toString("base64url"); const expiresAt = new Date(Date.now() + Math.min(Math.max(input.expiresInHours, 1), 168) * 60 * 60 * 1000);
  const result = await db.insert(staffInvitations).values({ invitedEmail: input.email.trim().toLowerCase(), invitationCodeHash: hash(invitationCode), requestedRole: input.staffRole, invitedByUserId: actorUserId, expiresAt });
  const invitationId = asId(result); await createAuditLog(actorUserId, "staff.invitation_created", "staff_invitation", String(invitationId), { staffRole: input.staffRole, expiresAt });
  return { invitationId, invitationCode, expiresAt };
}

export async function acceptStaffInvitation(userId: number, email: string, invitationCode: string) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable"); const codeHash = hash(invitationCode);
  const invitation = (await db.select().from(staffInvitations).where(eq(staffInvitations.invitationCodeHash, codeHash)).limit(1))[0];
  if (!invitation || invitation.status !== "pending" || invitation.expiresAt <= new Date() || invitation.invitedEmail !== email.trim().toLowerCase()) throw new Error("This staff invitation is invalid, expired, or unavailable.");
  const existing = (await db.select({ id: staffProfiles.id }).from(staffProfiles).where(eq(staffProfiles.userId, userId)).limit(1))[0]; if (existing) throw new Error("This account already has a staff identity.");
  const result = await db.insert(staffProfiles).values({ userId, staffRole: invitation.requestedRole, status: "active", invitedByUserId: invitation.invitedByUserId, activatedAt: new Date() });
  const staffProfileId = asId(result); await db.update(users).set({ role: "admin" }).where(eq(users.id, userId));
  const legacyScope = LEGACY_SCOPE_MAP[invitation.requestedRole]; if (legacyScope) await db.insert(adminRoles).values({ userId, scope: legacyScope, status: "active", grantedByUserId: invitation.invitedByUserId }).onDuplicateKeyUpdate({ set: { status: "active", revokedAt: null, grantedByUserId: invitation.invitedByUserId, grantedAt: new Date() } });
  await db.update(staffInvitations).set({ status: "accepted", acceptedByUserId: userId, acceptedAt: new Date() }).where(eq(staffInvitations.id, invitation.id));
  await createAuditLog(userId, "staff.invitation_accepted", "staff_profile", String(staffProfileId), { invitationId: invitation.id, staffRole: invitation.requestedRole }); return { staffProfileId };
}

export async function proposeStaffChange(actorUserId: number, input: { staffProfileId: number; nextRole?: StaffRole; nextStatus?: "suspended" | "deactivated" | "active"; reason: string }) {
  await requireOperationalPermission(actorUserId, "staff.manage", { requireFresh: true }); const db = await getDb(); if (!db) throw new Error("Database unavailable");
  const target = (await db.select().from(staffProfiles).where(eq(staffProfiles.id, input.staffProfileId)).limit(1))[0]; if (!target || target.userId === actorUserId) throw new Error("You cannot request a change to your own staff access.");
  const requiredApproverRole: StaffRole = "platform_administrator"; const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const result = await db.insert(operationalApprovals).values({ approvalType: "staff_role_change", resourceType: "staff_profile", resourceId: String(target.id), requestedByUserId: actorUserId, requiredApproverRole, reason: input.reason, impactSummary: JSON.stringify({ nextRole: input.nextRole ?? target.staffRole, nextStatus: input.nextStatus ?? target.status }), expiresAt });
  const approvalId = asId(result); await createAuditLog(actorUserId, "staff.change_proposed", "operational_approval", String(approvalId), { staffProfileId: target.id }); return { approvalId };
}

export async function createStaffSessionControl(actorUserId: number, sessionReference: string, expiresAt: Date) {
  const access = await getEffectiveStaffAccess(actorUserId); if (!access.staffProfileId) return { managed: false };
  const db = await getDb(); if (!db) throw new Error("Database unavailable"); const result = await db.insert(staffSessionControls).values({ staffProfileId: access.staffProfileId, sessionReferenceHash: hash(sessionReference), expiresAt, reauthenticatedAt: new Date() });
  return { managed: true, sessionControlId: asId(result) };
}

export async function revokeStaffSession(actorUserId: number, sessionControlId: number) {
  await requireOperationalPermission(actorUserId, "staff.manage", { requireFresh: true }); const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.update(staffSessionControls).set({ status: "revoked", revokedAt: new Date(), revokedByUserId: actorUserId }).where(eq(staffSessionControls.id, sessionControlId)); await createAuditLog(actorUserId, "staff.session_revoked", "staff_session_control", String(sessionControlId)); return { success: true };
}

export async function listOperationsOverview(actorUserId: number) {
  const access = await getEffectiveStaffAccess(actorUserId); const db = await getDb(); if (!db) return { access, queues: {} };
  const count = async (table: any, where?: any) => Number((await db.select({ count: sql<number>`count(*)` }).from(table).where(where))[0]?.count ?? 0);
  const can = (key: PermissionKey) => access.permissions.includes(key);
  return { access: { staffRole: access.staffRole, permissions: access.permissions }, queues: {
    verification: can("verification.view") ? await count(verificationRecords, inArray(verificationRecords.status, ["submitted", "under_review", "escalated"])) : undefined,
    safety: can("safety.cases.view") ? await count(reports, inArray(reports.status, ["open", "in_review", "action_required", "escalated"])) : undefined,
    support: can("support.view") ? await count(supportTickets, inArray(supportTickets.status, ["new", "open", "waiting_for_staff", "escalated"])) : undefined,
    approvals: can("approvals.view") ? await count(operationalApprovals, eq(operationalApprovals.status, "pending")) : undefined,
    incidents: can("incidents.view") ? await count(operationalIncidents, inArray(operationalIncidents.status, ["detected", "investigating", "mitigating", "monitoring"])) : undefined,
    notificationFailures: can("notifications.view") ? await count(notifications, isNull(notifications.readAt)) : undefined,
  }};
}

export async function searchOperationalMembers(actorUserId: number, query: string, page = 0) {
  await requireOperationalPermission(actorUserId, "members.search"); if (query.trim().length < 2) return [];
  const db = await getDb(); if (!db) return []; const term = `%${query.trim()}%`; const numeric = Number(query);
  const rows = await db.select({ profileId: memberProfiles.id, displayName: memberProfiles.displayName, profileVisibility: memberProfiles.profileVisibility, searchVisible: memberProfiles.searchVisible, userId: memberProfiles.userId }).from(memberProfiles).where(or(!Number.isNaN(numeric) ? eq(memberProfiles.id, numeric) : like(memberProfiles.displayName, term), like(memberProfiles.displayName, term))).orderBy(asc(memberProfiles.id)).limit(25).offset(Math.max(0, page) * 25);
  await createAuditLog(actorUserId, "operations.member_search", "member_profile", undefined, { queryLength: query.trim().length, resultCount: rows.length }); return rows;
}

export async function listSupportTickets(actorUserId: number, status?: SupportStatus) { await requireOperationalPermission(actorUserId, "support.view"); const db = await getDb(); if (!db) return []; return db.select().from(supportTickets).where(status ? eq(supportTickets.status, status) : inArray(supportTickets.status, ["new", "open", "waiting_for_member", "waiting_for_staff", "escalated"])).orderBy(desc(supportTickets.updatedAt)).limit(100); }
export async function createSupportTicket(actorUserId: number, input: { memberProfileId: number; category: typeof supportTickets.$inferInsert.category; subject: string; description: string; priority: typeof supportTickets.$inferInsert.priority }) { await requireOperationalPermission(actorUserId, "support.manage"); const db = await getDb(); if (!db) throw new Error("Database unavailable"); const result = await db.insert(supportTickets).values({ ...input, status: "new" }); const ticketId = asId(result); await db.insert(supportTicketEvents).values({ ticketId, actorUserId, eventType: "created" }); await createAuditLog(actorUserId, "support.ticket_created", "support_ticket", String(ticketId), { category: input.category, priority: input.priority }); return { ticketId }; }
export async function updateSupportTicket(actorUserId: number, ticketId: number, input: { status?: SupportStatus; assignedStaffProfileId?: number | null; resolution?: string }) { await requireOperationalPermission(actorUserId, "support.manage"); const db = await getDb(); if (!db) throw new Error("Database unavailable"); const values: any = { ...input }; if (input.status === "resolved") values.resolvedAt = new Date(); if (input.status === "closed") values.closedAt = new Date(); await db.update(supportTickets).set(values).where(eq(supportTickets.id, ticketId)); await db.insert(supportTicketEvents).values({ ticketId, actorUserId, eventType: input.status === "resolved" ? "resolved" : input.status === "closed" ? "closed" : input.assignedStaffProfileId !== undefined ? "assigned" : "status_changed" }); await createAuditLog(actorUserId, "support.ticket_updated", "support_ticket", String(ticketId), { status: input.status }); return { success: true }; }

export async function listOperationalIncidents(actorUserId: number) { await requireOperationalPermission(actorUserId, "incidents.view"); const db = await getDb(); if (!db) return []; return db.select().from(operationalIncidents).orderBy(desc(operationalIncidents.createdAt)).limit(100); }
export async function createOperationalIncident(actorUserId: number, input: { category: typeof operationalIncidents.$inferInsert.category; severity: typeof operationalIncidents.$inferInsert.severity; title: string; summary: string }) { await requireOperationalPermission(actorUserId, "incidents.manage", { requireFresh: input.severity === "critical" }); const db = await getDb(); if (!db) throw new Error("Database unavailable"); const result = await db.insert(operationalIncidents).values({ ...input, detectedByUserId: actorUserId }); const incidentId = asId(result); await db.insert(operationalIncidentEvents).values({ incidentId, actorUserId, eventType: "detected" }); await createAuditLog(actorUserId, "incident.created", "operational_incident", String(incidentId), { category: input.category, severity: input.severity }); return { incidentId }; }
export async function updateOperationalIncident(actorUserId: number, incidentId: number, status: IncidentStatus, note?: string) { await requireOperationalPermission(actorUserId, "incidents.manage"); const db = await getDb(); if (!db) throw new Error("Database unavailable"); const values: any = { status }; if (status === "resolved") values.resolvedAt = new Date(); if (status === "closed") values.closedAt = new Date(); await db.update(operationalIncidents).set(values).where(eq(operationalIncidents.id, incidentId)); await db.insert(operationalIncidentEvents).values({ incidentId, actorUserId, eventType: status === "resolved" ? "resolved" : "status_changed", safeMetadata: note ? { note } : null }); await createAuditLog(actorUserId, "incident.updated", "operational_incident", String(incidentId), { status }); return { success: true }; }

export async function createOperationalApproval(actorUserId: number, input: { approvalType: ApprovalType; resourceType: string; resourceId: string; requiredApproverRole: StaffRole; reason: string; impactSummary: string; expiresAt: Date }) { await requireOperationalPermission(actorUserId, "approvals.view"); if (!requiresIndependentApproval(input.approvalType)) throw new Error("This operation does not use the approval center."); const db = await getDb(); if (!db) throw new Error("Database unavailable"); const result = await db.insert(operationalApprovals).values({ ...input, requestedByUserId: actorUserId }); const approvalId = asId(result); await createAuditLog(actorUserId, "approval.requested", "operational_approval", String(approvalId), { approvalType: input.approvalType, resourceType: input.resourceType }); return { approvalId }; }
export async function listOperationalApprovals(actorUserId: number) { await requireOperationalPermission(actorUserId, "approvals.view"); const db = await getDb(); if (!db) return []; return db.select().from(operationalApprovals).where(eq(operationalApprovals.status, "pending")).orderBy(asc(operationalApprovals.expiresAt)).limit(100); }
export async function decideOperationalApproval(actorUserId: number, approvalId: number, decision: "approved" | "rejected") {
  const access = await requireOperationalPermission(actorUserId, "approvals.decide", { requireFresh: true }); const db = await getDb(); if (!db) throw new Error("Database unavailable");
  const approval = (await db.select().from(operationalApprovals).where(eq(operationalApprovals.id, approvalId)).limit(1))[0];
  if (!approval || !canDecideApproval(approval.requestedByUserId, actorUserId, access.staffRole, approval.requiredApproverRole, approval.status, approval.expiresAt)) throw new Error("This approval cannot be decided by the current staff identity.");
  await db.update(operationalApprovals).set({ status: decision, approvedByUserId: actorUserId, decidedAt: new Date() }).where(eq(operationalApprovals.id, approvalId));
  if (decision === "approved" && approval.approvalType === "staff_role_change" && approval.resourceType === "staff_profile") {
    const change = JSON.parse(approval.impactSummary) as { nextRole?: StaffRole; nextStatus?: StaffStatus }; const staffProfileId = Number(approval.resourceId);
    const target = (await db.select().from(staffProfiles).where(eq(staffProfiles.id, staffProfileId)).limit(1))[0]; if (!target) throw new Error("The requested staff identity is unavailable.");
    const nextRole = change.nextRole ?? target.staffRole; const nextStatus = change.nextStatus ?? target.status; const now = new Date();
    await db.update(staffProfiles).set({ staffRole: nextRole, status: nextStatus, suspendedAt: nextStatus === "suspended" ? now : null, deactivatedAt: nextStatus === "deactivated" ? now : null, activatedAt: nextStatus === "active" ? now : target.activatedAt }).where(eq(staffProfiles.id, staffProfileId));
    const legacyScope = LEGACY_SCOPE_MAP[nextRole]; if (legacyScope) await db.insert(adminRoles).values({ userId: target.userId, scope: legacyScope, status: nextStatus === "active" ? "active" : "revoked", grantedByUserId: actorUserId, revokedAt: nextStatus === "active" ? null : now }).onDuplicateKeyUpdate({ set: { status: nextStatus === "active" ? "active" : "revoked", grantedByUserId: actorUserId, revokedAt: nextStatus === "active" ? null : now, grantedAt: now } });
    if (nextStatus !== "active") await db.update(staffSessionControls).set({ status: "revoked", revokedAt: now, revokedByUserId: actorUserId }).where(and(eq(staffSessionControls.staffProfileId, staffProfileId), eq(staffSessionControls.status, "active")));
    await createAuditLog(actorUserId, "staff.change_applied", "staff_profile", String(staffProfileId), { nextRole, nextStatus, approvalId });
  }
  await createAuditLog(actorUserId, `approval.${decision}`, "operational_approval", String(approvalId), { approvalType: approval.approvalType }); return { success: true };
}

export async function listOperationalAudit(actorUserId: number, input?: { action?: string; entityType?: string; page?: number }) { await requireOperationalPermission(actorUserId, "audit.view"); const db = await getDb(); if (!db) return []; const filters = [input?.action ? eq(auditLogs.action, input.action) : undefined, input?.entityType ? eq(auditLogs.entityType, input.entityType) : undefined].filter(Boolean) as any[]; return db.select({ id: auditLogs.id, actorUserId: auditLogs.actorUserId, action: auditLogs.action, entityType: auditLogs.entityType, entityId: auditLogs.entityId, createdAt: auditLogs.createdAt }).from(auditLogs).where(filters.length ? and(...filters) : undefined).orderBy(desc(auditLogs.createdAt)).limit(100).offset(Math.max(0, input?.page ?? 0) * 100); }
export async function listFeatureFlags(actorUserId: number) { await requireOperationalPermission(actorUserId, "feature_flags.view"); const db = await getDb(); if (!db) return []; return db.select({ id: operationalFeatureFlags.id, flagKey: operationalFeatureFlags.flagKey, environment: operationalFeatureFlags.environment, enabled: operationalFeatureFlags.enabled, status: operationalFeatureFlags.status, updatedAt: operationalFeatureFlags.updatedAt }).from(operationalFeatureFlags).orderBy(asc(operationalFeatureFlags.flagKey)).limit(100); }
