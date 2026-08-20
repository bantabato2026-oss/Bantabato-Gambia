import { createHash, randomBytes } from "crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import { betaEnrollments, betaEvents, betaInvitations, betaLaunchControls, memberProfiles, users } from "../drizzle/schema";
import { createAuditLog, getDb } from "./db";
import { requireOperationalPermission } from "./adminOperationsService";
import { betaAccessFailureMessage, betaModeAllowsEnrollment, betaModeAllowsMemberAccess, type BetaEnrollmentStatus, type BetaMode } from "./domain/betaPolicy";
import { getRuntimeEnvironment, type RuntimeEnvironment } from "./runtimeEnvironment";

type BetaInvitationStatus = "pending" | "accepted" | "expired" | "revoked";

function hash(value: string) { return createHash("sha256").update(value).digest("hex"); }
function currentEnvironment(): RuntimeEnvironment { return getRuntimeEnvironment(); }
function asId(result: unknown) {
  const row = Array.isArray(result) ? result[0] as { id?: number; insertId?: number } | undefined : undefined;
  return Number(row?.id ?? row?.insertId ?? 0);
}
function normalizedEmail(value: string) { return value.trim().toLowerCase(); }

async function getControl(environment = currentEnvironment()) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = (await db.select().from(betaLaunchControls).where(eq(betaLaunchControls.environment, environment)).limit(1))[0];
  return existing ?? { environment, mode: "disabled" as BetaMode, updatedByUserId: null, updatedAt: null };
}

async function getEnrollmentForUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return (await db.select().from(betaEnrollments).where(eq(betaEnrollments.userId, userId)).limit(1))[0] ?? null;
}

async function writeEvent(input: { actorUserId?: number | null; invitationId?: number | null; enrollmentId?: number | null; eventType: typeof betaEvents.$inferInsert.eventType; safeMetadata?: Record<string, unknown> }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(betaEvents).values({
    actorUserId: input.actorUserId ?? null,
    invitationId: input.invitationId ?? null,
    enrollmentId: input.enrollmentId ?? null,
    eventType: input.eventType,
    safeMetadata: input.safeMetadata ?? null,
  });
}

export async function requireBetaMemberAccess(userId: number) {
  const control = await getControl();
  if (control.mode === "disabled") return { mode: control.mode, enrollment: null };
  const enrollment = await getEnrollmentForUser(userId);
  const status = enrollment?.status as BetaEnrollmentStatus | undefined;
  if (!betaModeAllowsMemberAccess(control.mode as BetaMode, status)) throw new Error(betaAccessFailureMessage(control.mode as BetaMode, status));
  return { mode: control.mode, enrollment };
}

export async function getMyBetaEnrollment(userId: number) {
  const [control, enrollment] = await Promise.all([getControl(), getEnrollmentForUser(userId)]);
  return { environment: control.environment, mode: control.mode, enrollment: enrollment ? { status: enrollment.status, enrolledAt: enrollment.enrolledAt, suspendedAt: enrollment.suspendedAt, removedAt: enrollment.removedAt } : null };
}

export async function acceptBetaInvitation(userId: number, email: string | null | undefined, invitationCode: string) {
  const control = await getControl();
  if (!betaModeAllowsEnrollment(control.mode as BetaMode)) throw new Error("Beta enrollment is not currently available.");
  if (!email) throw new Error("A verified account email is required for beta enrollment.");
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const codeHash = hash(invitationCode);
  const invitation = (await db.select().from(betaInvitations).where(eq(betaInvitations.invitationCodeHash, codeHash)).limit(1))[0];
  const now = new Date();
  if (invitation?.status === "pending" && invitation.expiresAt <= now) {
    await db.update(betaInvitations).set({ status: "expired" }).where(and(eq(betaInvitations.id, invitation.id), eq(betaInvitations.status, "pending")));
    throw new Error("This beta invitation is invalid, expired, revoked, or unavailable for this account.");
  }
  if (!invitation || invitation.status !== "pending" || invitation.expiresAt <= now || invitation.invitedEmail !== normalizedEmail(email)) {
    throw new Error("This beta invitation is invalid, expired, revoked, or unavailable for this account.");
  }
  const existing = await getEnrollmentForUser(userId);
  if (existing && existing.status === "enrolled") throw new Error("This account is already enrolled in the beta.");

  const enrollmentResult = existing
    ? await db.update(betaEnrollments).set({ invitationId: invitation.id, status: "enrolled", enrolledAt: now, suspendedAt: null, removedAt: null, changedByUserId: userId }).where(eq(betaEnrollments.id, existing.id))
    : await db.insert(betaEnrollments).values({ userId, invitationId: invitation.id, status: "enrolled", changedByUserId: userId });
  const enrollmentId = existing ? existing.id : asId(enrollmentResult);
  const claimed = await db.update(betaInvitations).set({ status: "accepted", acceptedByUserId: userId, acceptedAt: now }).where(and(eq(betaInvitations.id, invitation.id), eq(betaInvitations.status, "pending")));
  const claimSummary = Array.isArray(claimed) ? claimed[0] as { affectedRows?: number } | undefined : undefined;
  if (claimSummary && claimSummary.affectedRows === 0) throw new Error("This beta invitation is no longer available.");
  await writeEvent({ actorUserId: userId, invitationId: invitation.id, enrollmentId, eventType: "invitation_accepted" });
  await writeEvent({ actorUserId: userId, invitationId: invitation.id, enrollmentId, eventType: "enrollment_completed" });
  await createAuditLog(userId, "beta.enrollment_completed", "beta_enrollment", String(enrollmentId), { invitationId: invitation.id });
  return { enrollmentStatus: "enrolled" as const };
}

export async function listBetaOperations(actorUserId: number) {
  await requireOperationalPermission(actorUserId, "beta.view");
  const db = await getDb();
  const environment = currentEnvironment();
  if (!db) return { environment, controls: [], invitations: [], enrollments: [] };
  const [controls, invitations, enrollments] = await Promise.all([
    db.select({ environment: betaLaunchControls.environment, mode: betaLaunchControls.mode, updatedAt: betaLaunchControls.updatedAt }).from(betaLaunchControls).where(eq(betaLaunchControls.environment, environment)).orderBy(asc(betaLaunchControls.environment)),
    db.select({ id: betaInvitations.id, invitedEmail: betaInvitations.invitedEmail, status: betaInvitations.status, expiresAt: betaInvitations.expiresAt, acceptedAt: betaInvitations.acceptedAt, revokedAt: betaInvitations.revokedAt, createdAt: betaInvitations.createdAt }).from(betaInvitations).orderBy(asc(betaInvitations.expiresAt)).limit(100),
    db.select({ id: betaEnrollments.id, userId: betaEnrollments.userId, status: betaEnrollments.status, enrolledAt: betaEnrollments.enrolledAt, suspendedAt: betaEnrollments.suspendedAt, removedAt: betaEnrollments.removedAt }).from(betaEnrollments).orderBy(asc(betaEnrollments.updatedAt)).limit(100),
  ]);
  const now = Date.now();
  return { environment, controls, invitations: invitations.map(invitation => ({ ...invitation, status: invitation.status === "pending" && invitation.expiresAt.getTime() <= now ? "expired" as BetaInvitationStatus : invitation.status })), enrollments };
}

export async function setBetaMode(actorUserId: number, input: { mode: BetaMode }) {
  await requireOperationalPermission(actorUserId, "beta.manage", { requireFresh: true });
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const environment = currentEnvironment();
  await db.insert(betaLaunchControls).values({ environment, mode: input.mode, updatedByUserId: actorUserId }).onDuplicateKeyUpdate({ set: { mode: input.mode, updatedByUserId: actorUserId, updatedAt: new Date() } });
  const control = (await db.select({ id: betaLaunchControls.id }).from(betaLaunchControls).where(eq(betaLaunchControls.environment, environment)).limit(1))[0];
  await writeEvent({ actorUserId, eventType: input.mode === "shutdown" ? "emergency_shutdown" : "mode_changed", safeMetadata: { environment, mode: input.mode } });
  await createAuditLog(actorUserId, input.mode === "shutdown" ? "beta.emergency_shutdown" : "beta.mode_changed", "beta_launch_control", String(control?.id ?? environment), { environment, mode: input.mode });
  return { environment, mode: input.mode };
}

export async function createBetaInvitation(actorUserId: number, input: { invitedEmail: string; expiresInHours: number }) {
  await requireOperationalPermission(actorUserId, "beta.manage", { requireFresh: true });
  const control = await getControl();
  if (!betaModeAllowsEnrollment(control.mode as BetaMode)) throw new Error("Enable invite-only beta mode before creating invitations.");
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const invitationCode = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + Math.min(Math.max(input.expiresInHours, 1), 168) * 60 * 60 * 1000);
  const result = await db.insert(betaInvitations).values({ invitedEmail: normalizedEmail(input.invitedEmail), invitationCodeHash: hash(invitationCode), invitedByUserId: actorUserId, expiresAt });
  const invitationId = asId(result);
  await writeEvent({ actorUserId, invitationId, eventType: "invitation_created", safeMetadata: { expiresAt } });
  await createAuditLog(actorUserId, "beta.invitation_created", "beta_invitation", String(invitationId), { expiresAt });
  return { invitationId, invitationCode, expiresAt };
}

export async function revokeBetaInvitation(actorUserId: number, invitationId: number) {
  await requireOperationalPermission(actorUserId, "beta.manage", { requireFresh: true });
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.update(betaInvitations).set({ status: "revoked", revokedAt: new Date() }).where(and(eq(betaInvitations.id, invitationId), eq(betaInvitations.status, "pending")));
  const summary = Array.isArray(result) ? result[0] as { affectedRows?: number } | undefined : undefined;
  if (summary && summary.affectedRows === 0) throw new Error("This beta invitation is no longer available for revocation.");
  await writeEvent({ actorUserId, invitationId, eventType: "invitation_revoked" });
  await createAuditLog(actorUserId, "beta.invitation_revoked", "beta_invitation", String(invitationId));
  return { success: true };
}

export async function changeBetaEnrollment(actorUserId: number, enrollmentId: number, nextStatus: "suspended" | "removed") {
  await requireOperationalPermission(actorUserId, "beta.manage", { requireFresh: true });
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const enrollment = (await db.select().from(betaEnrollments).where(eq(betaEnrollments.id, enrollmentId)).limit(1))[0];
  if (!enrollment || enrollment.status !== "enrolled") throw new Error("This beta enrollment is not active.");
  const now = new Date();
  const result = await db.update(betaEnrollments).set({ status: nextStatus, suspendedAt: nextStatus === "suspended" ? now : null, removedAt: nextStatus === "removed" ? now : null, changedByUserId: actorUserId }).where(and(eq(betaEnrollments.id, enrollmentId), eq(betaEnrollments.status, "enrolled")));
  const summary = Array.isArray(result) ? result[0] as { affectedRows?: number } | undefined : undefined;
  if (summary && summary.affectedRows === 0) throw new Error("This beta enrollment has already changed.");
  await db.update(memberProfiles).set({ profileStatus: "paused", searchVisible: false }).where(eq(memberProfiles.userId, enrollment.userId));
  await writeEvent({ actorUserId, enrollmentId, eventType: nextStatus === "suspended" ? "enrollment_suspended" : "enrollment_removed" });
  await createAuditLog(actorUserId, `beta.enrollment_${nextStatus}`, "beta_enrollment", String(enrollmentId));
  return { success: true };
}
