import { and, desc, eq, inArray } from "drizzle-orm";
import { memberAccountEvents, memberAccountStates, memberDataRightsRequests, memberPreferences, memberProfiles, profilePhotos, users } from "../drizzle/schema";
import { createAuditLog, getDb, getProfileByUserId, requireFreshMemberAuthentication, synchronizeProfileEligibility } from "./db";
import { withdrawRecommendationsForProfile } from "./recommendationService";
import { revokeConnectionsForProfile } from "./readinessService";
import { mayCancelDataRight, mayPauseAccount, mayReactivateAccount, restoredProfileStatus } from "./domain/accountLifecyclePolicy";

type AccountLifecycleStatus = "active" | "paused" | "deletion_requested";
type RequestType = "data_export" | "account_deletion";
type RequestStatus = "requested" | "processing" | "ready" | "expired" | "cancelled" | "unavailable" | "failed";
type ProfileStatus = "draft" | "under_review" | "active" | "paused" | "suspended";

const OPEN_REQUEST_STATUSES: RequestStatus[] = ["requested", "processing"];

function staleError() { return new Error("This account page changed before your action. Refresh it, then try again."); }
function unavailableError() { return new Error("This account action is not available right now. Please try again."); }

async function requireAccountState(db: any, userId: number) {
  await db.insert(memberAccountStates).values({ userId }).onDuplicateKeyUpdate({ set: { userId } });
  const [state] = await db.select().from(memberAccountStates).where(eq(memberAccountStates.userId, userId)).limit(1).for("update");
  if (!state) throw unavailableError();
  return state;
}

function assertObservedVersion(actual: Date, expectedUpdatedAt?: Date) {
  if (expectedUpdatedAt && actual.getTime() !== expectedUpdatedAt.getTime()) throw staleError();
}

function memberSafeRequest(row: typeof memberDataRightsRequests.$inferSelect) {
  return { id: row.id, requestType: row.requestType, status: row.status, requestedAt: row.requestedAt, completedAt: row.completedAt, cancelledAt: row.cancelledAt, expiresAt: row.expiresAt, available: row.status === "ready" && false };
}

export async function getMemberAccountSummary(userId: number) {
  const db = await getDb();
  if (!db) throw unavailableError();
  const [user, profile, state, preferences, requests, events] = await Promise.all([
    db.select({ name: users.name, email: users.email, loginMethod: users.loginMethod, lastSignedIn: users.lastSignedIn }).from(users).where(eq(users.id, userId)).limit(1),
    getProfileByUserId(userId),
    db.select().from(memberAccountStates).where(eq(memberAccountStates.userId, userId)).limit(1),
    db.select({ id: memberPreferences.id }).from(memberPreferences).innerJoin(memberProfiles, eq(memberPreferences.profileId, memberProfiles.id)).where(eq(memberProfiles.userId, userId)).limit(1),
    db.select().from(memberDataRightsRequests).where(eq(memberDataRightsRequests.userId, userId)).orderBy(desc(memberDataRightsRequests.updatedAt)).limit(12),
    db.select({ eventType: memberAccountEvents.eventType, createdAt: memberAccountEvents.createdAt }).from(memberAccountEvents).where(eq(memberAccountEvents.userId, userId)).orderBy(desc(memberAccountEvents.createdAt)).limit(12),
  ]);
  const photoCount = profile ? (await db.select({ id: profilePhotos.id }).from(profilePhotos).where(and(eq(profilePhotos.profileId, profile.id), eq(profilePhotos.photoPurpose, "profile"))).limit(20)).length : 0;
  const accountState = state[0] ?? null;
  return {
    account: { displayName: user[0]?.name ?? null, emailPresent: Boolean(user[0]?.email), lifecycleStatus: accountState?.lifecycleStatus ?? "active", updatedAt: accountState?.updatedAt ?? null, pausedAt: accountState?.pausedAt ?? null, deletionRequestedAt: accountState?.deletionRequestedAt ?? null },
    profile: profile ? { exists: true, profileStatus: profile.profileStatus, profileVisibility: profile.profileVisibility, photoVisibility: profile.photoVisibility, discoveryVisible: profile.searchVisible, familyVisibility: profile.familyVisibility, locationVisibility: profile.locationVisibility, locationDetailLevel: profile.locationDetailLevel, updatedAt: profile.updatedAt, photoCount } : { exists: false },
    dataReview: { profileStored: Boolean(profile), preferencesStored: Boolean(preferences[0]), profilePhotoRecords: photoCount, familyCircleAccess: "Manage in Family Circle", membershipAccess: "Manage in Membership & billing", safetyAccess: "Manage in Safety Center" },
    currentSession: { signedInAt: user[0]?.lastSignedIn ?? null, signInMethod: user[0]?.loginMethod ? "Secure sign-in" : "Secure session", signOutAvailable: true, otherSessionsAvailable: false },
    requests: requests.map(memberSafeRequest),
    events,
  };
}

export async function pauseMemberAccount(userId: number, expectedUpdatedAt?: Date) {
  const db = await getDb();
  if (!db) throw unavailableError();
  const result = await db.transaction(async tx => {
    const profile = await getProfileByUserId(userId);
    if (!profile) throw new Error("Start your profile before pausing discovery.");
    if (profile.profileStatus === "suspended") throw new Error("This profile cannot be changed from account settings right now.");
    const state = await requireAccountState(tx, userId);
    assertObservedVersion(state.updatedAt, expectedUpdatedAt);
    if (state.lifecycleStatus === "deletion_requested") throw new Error("A deletion request is already open. Cancel that request before changing account availability.");
    if (state.lifecycleStatus === "paused") return { profileId: profile.id, duplicate: true, state };
    if (!mayPauseAccount({ accountStatus: state.lifecycleStatus, profileStatus: profile.profileStatus })) throw new Error("This profile cannot be paused from account settings right now.");
    const now = new Date();
    await tx.update(memberAccountStates).set({ lifecycleStatus: "paused", previousProfileStatus: profile.profileStatus as ProfileStatus, previousSearchVisible: profile.searchVisible, pausedAt: now, deletionRequestedAt: null, updatedAt: now }).where(eq(memberAccountStates.id, state.id));
    await tx.update(memberProfiles).set({ profileStatus: "paused", searchVisible: false, updatedAt: now }).where(eq(memberProfiles.id, profile.id));
    await tx.insert(memberAccountEvents).values({ userId, eventType: "account_paused" });
    return { profileId: profile.id, duplicate: false, state: { ...state, lifecycleStatus: "paused" as const, updatedAt: now } };
  });
  await withdrawRecommendationsForProfile(result.profileId, "profile_hidden");
  await createAuditLog(userId, "member.account_paused", "member_account_state", String(userId), { duplicate: result.duplicate });
  return { lifecycleStatus: "paused" as const, duplicate: result.duplicate, updatedAt: result.state.updatedAt };
}

export async function reactivateMemberAccount(userId: number, expectedUpdatedAt?: Date) {
  const db = await getDb();
  if (!db) throw unavailableError();
  const result = await db.transaction(async tx => {
    const profile = await getProfileByUserId(userId);
    if (!profile) throw new Error("Start your profile before changing account availability.");
    const state = await requireAccountState(tx, userId);
    assertObservedVersion(state.updatedAt, expectedUpdatedAt);
    if (state.lifecycleStatus === "deletion_requested") throw new Error("A deletion request is open. Cancel it before reactivating your account.");
    if (state.lifecycleStatus === "active") return { profileId: profile.id, duplicate: true, state };
    if (!mayReactivateAccount({ accountStatus: state.lifecycleStatus, profileStatus: profile.profileStatus })) throw new Error("This profile cannot be reactivated from account settings right now.");
    const now = new Date();
    const restoredStatus = restoredProfileStatus(state.previousProfileStatus);
    await tx.update(memberProfiles).set({ profileStatus: restoredStatus, searchVisible: state.previousSearchVisible ?? true, updatedAt: now }).where(eq(memberProfiles.id, profile.id));
    await tx.update(memberAccountStates).set({ lifecycleStatus: "active", pausedAt: null, updatedAt: now }).where(eq(memberAccountStates.id, state.id));
    await tx.insert(memberAccountEvents).values({ userId, eventType: "account_reactivated" });
    return { profileId: profile.id, duplicate: false, state: { ...state, lifecycleStatus: "active" as const, updatedAt: now } };
  });
  await synchronizeProfileEligibility(result.profileId);
  await createAuditLog(userId, "member.account_reactivated", "member_account_state", String(userId), { duplicate: result.duplicate });
  return { lifecycleStatus: "active" as const, duplicate: result.duplicate, updatedAt: result.state.updatedAt };
}

export async function requestMemberDataRights(userId: number, requestType: RequestType, expectedUpdatedAt?: Date) {
  const db = await getDb();
  if (!db) throw unavailableError();
  if (requestType === "account_deletion") await requireFreshMemberAuthentication(userId);
  const result = await db.transaction(async tx => {
    const state = await requireAccountState(tx, userId);
    assertObservedVersion(state.updatedAt, expectedUpdatedAt);
    const [existing] = await tx.select().from(memberDataRightsRequests).where(and(eq(memberDataRightsRequests.userId, userId), eq(memberDataRightsRequests.requestType, requestType), inArray(memberDataRightsRequests.status, OPEN_REQUEST_STATUSES))).orderBy(desc(memberDataRightsRequests.updatedAt)).limit(1).for("update");
    if (existing) return { request: existing, duplicate: true, profileId: null as number | null };
    const now = new Date();
    if (requestType === "account_deletion") {
      const profile = await getProfileByUserId(userId);
      if (!profile) throw new Error("Start your profile before requesting account deletion.");
      if (profile.profileStatus === "suspended") throw new Error("This account cannot request deletion from member settings right now.");
      await tx.update(memberProfiles).set({ profileStatus: "paused", searchVisible: false, updatedAt: now }).where(eq(memberProfiles.id, profile.id));
      await tx.update(memberAccountStates).set({ lifecycleStatus: "deletion_requested", previousProfileStatus: profile.profileStatus as ProfileStatus, previousSearchVisible: profile.searchVisible, pausedAt: now, deletionRequestedAt: now, updatedAt: now }).where(eq(memberAccountStates.id, state.id));
    }
    const inserted = await tx.insert(memberDataRightsRequests).values({ userId, requestType, status: "requested", requestedAt: now, safeSummary: requestType === "data_export" ? { categories: ["profile", "preferences", "connections", "family_circle", "membership", "safety_activity"], fileGenerated: false } : { deletionApplied: false } });
    const requestId = Number(inserted[0]?.insertId ?? 0);
    const [request] = await tx.select().from(memberDataRightsRequests).where(eq(memberDataRightsRequests.id, requestId)).limit(1);
    if (!request) throw unavailableError();
    await tx.insert(memberAccountEvents).values({ userId, eventType: requestType === "data_export" ? "data_export_requested" : "deletion_requested", requestId });
    return { request, duplicate: false, profileId: requestType === "account_deletion" ? (await getProfileByUserId(userId))?.id ?? null : null };
  });
  if (requestType === "account_deletion" && result.profileId) {
    await withdrawRecommendationsForProfile(result.profileId, "profile_hidden");
    await revokeConnectionsForProfile(result.profileId, "member_withdrew_consent", { profileId: result.profileId, userId });
  }
  await createAuditLog(userId, requestType === "data_export" ? "member.data_export_requested" : "member.deletion_requested", "member_data_rights_request", String(result.request.id), { duplicate: result.duplicate, status: result.request.status });
  return { request: memberSafeRequest(result.request), duplicate: result.duplicate };
}

export async function cancelMemberDataRightsRequest(userId: number, requestId: number, expectedUpdatedAt?: Date) {
  const db = await getDb();
  if (!db) throw unavailableError();
  const result = await db.transaction(async tx => {
    const state = await requireAccountState(tx, userId);
    assertObservedVersion(state.updatedAt, expectedUpdatedAt);
    const [request] = await tx.select().from(memberDataRightsRequests).where(and(eq(memberDataRightsRequests.id, requestId), eq(memberDataRightsRequests.userId, userId), inArray(memberDataRightsRequests.status, OPEN_REQUEST_STATUSES))).limit(1).for("update");
    if (!request || !mayCancelDataRight(request.status)) throw new Error("This request is no longer available. Refresh and try again.");
    const now = new Date();
    await tx.update(memberDataRightsRequests).set({ status: "cancelled", cancelledAt: now, updatedAt: now }).where(eq(memberDataRightsRequests.id, request.id));
    let profileId: number | null = null;
    if (request.requestType === "account_deletion") {
      const profile = await getProfileByUserId(userId);
      if (profile && profile.profileStatus !== "suspended") {
        const restoredStatus = restoredProfileStatus(state.previousProfileStatus);
        await tx.update(memberProfiles).set({ profileStatus: restoredStatus, searchVisible: state.previousSearchVisible ?? true, updatedAt: now }).where(eq(memberProfiles.id, profile.id));
        profileId = profile.id;
      }
      await tx.update(memberAccountStates).set({ lifecycleStatus: "active", deletionRequestedAt: null, pausedAt: null, updatedAt: now }).where(eq(memberAccountStates.id, state.id));
    }
    await tx.insert(memberAccountEvents).values({ userId, eventType: request.requestType === "account_deletion" ? "deletion_cancelled" : "data_request_cancelled", requestId: request.id });
    return { request, profileId };
  });
  if (result.profileId) await synchronizeProfileEligibility(result.profileId);
  await createAuditLog(userId, "member.data_rights_request_cancelled", "member_data_rights_request", String(requestId), { requestType: result.request.requestType });
  return { requestId, status: "cancelled" as const };
}
