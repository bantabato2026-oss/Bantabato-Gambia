import { createPool, type Pool, type PoolConnection } from "mysql2/promise";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { conversations, matches, memberProfiles, profilePhotos, staffProfiles, staffSessionControls, users, verificationRecords, type StaffRole } from "../../drizzle/schema";
import { withDatabaseOverride } from "../db";

export type TestDatabaseEnvironment = Record<string, string | undefined>;

export type SafeTestDatabaseConfig = {
  url: string;
  databaseName: string;
  marker: string;
};

export function assertSafeTestDatabaseEnvironment(env: TestDatabaseEnvironment): SafeTestDatabaseConfig {
  const marker = env.BANTABATO_TEST_MODE;
  const url = env.BANTABATO_TEST_DATABASE_URL;
  const declaredDatabase = env.BANTABATO_TEST_DATABASE_NAME;
  if (marker !== "1" && marker !== "true") throw new Error("Database-backed harness requires BANTABATO_TEST_MODE=1");
  if (env.NODE_ENV === "production" || env.APP_ENV === "production") throw new Error("Database-backed harness is disabled in production");
  if (!url) throw new Error("Database-backed harness requires BANTABATO_TEST_DATABASE_URL");
  if (url === env.DATABASE_URL) throw new Error("Database-backed harness refuses the application DATABASE_URL");

  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new Error("Database-backed harness requires a valid test database URL"); }
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!databaseName || !declaredDatabase || declaredDatabase !== databaseName) throw new Error("Database-backed harness cannot confirm test database identity");
  if (!/(^|[_-])test([_-]|$)/i.test(databaseName)) throw new Error("Database-backed harness requires a database name explicitly marked test");
  return { url, databaseName, marker };
}

export type TestDatabaseHandle = {
  config: SafeTestDatabaseConfig;
  pool: Pool;
  connection: PoolConnection;
  db: MySql2Database<Record<string, unknown>> & { $client: PoolConnection };
};

export async function openIsolatedTestDatabase(env: TestDatabaseEnvironment = process.env): Promise<TestDatabaseHandle> {
  const config = assertSafeTestDatabaseEnvironment(env);
  const pool = createPool({ uri: config.url, connectionLimit: 1, multipleStatements: false });
  const connection = await pool.getConnection();
  try {
    await connection.query("SELECT 1");
  } catch (error) {
    connection.release();
    await pool.end();
    throw error;
  }
  return { config, pool, connection, db: drizzle(connection) };
}

export async function withIsolatedRollback<T>(handle: TestDatabaseHandle, work: (db: TestDatabaseHandle["db"]) => Promise<T>): Promise<T> {
  await handle.connection.beginTransaction();
  try {
    return await withDatabaseOverride(handle.db, () => work(handle.db));
  } finally {
    await handle.connection.rollback();
  }
}

export type SeededMember = { id: string; userId: number; profileId: number };
export type SeededStaff = { id: string; userId: number; staffProfileId: number; staffRole: StaffRole; sessionReferenceHash: string };

const FICTIONAL_MEMBER_STATES = {
  A: { profileStatus: "active" as const, coreProfileComplete: true, photoCount: 5, verification: "approved" as const },
  B: { profileStatus: "active" as const, coreProfileComplete: true, photoCount: 5, verification: "approved" as const },
  C: { profileStatus: "active" as const, coreProfileComplete: true, photoCount: 5, verification: "approved" as const },
  D: { profileStatus: "draft" as const, coreProfileComplete: false, photoCount: 0, verification: "not_started" as const },
  E: { profileStatus: "active" as const, coreProfileComplete: true, photoCount: 4, verification: "approved" as const },
  F: { profileStatus: "under_review" as const, coreProfileComplete: true, photoCount: 5, verification: "pending_review" as const },
  G: { profileStatus: "paused" as const, coreProfileComplete: true, photoCount: 5, verification: "approved" as const },
  H: { profileStatus: "active" as const, coreProfileComplete: true, photoCount: 5, verification: "approved" as const },
  I: { profileStatus: "suspended" as const, coreProfileComplete: true, photoCount: 5, verification: "approved" as const },
  J: { profileStatus: "active" as const, coreProfileComplete: true, photoCount: 5, verification: "approved" as const },
} as const;

export async function seedFictionalMembers(handle: TestDatabaseHandle): Promise<SeededMember[]> {
  const seeded: SeededMember[] = [];
  for (const [id, state] of Object.entries(FICTIONAL_MEMBER_STATES)) {
    const openId = `bantabato-test-${id}`;
    await handle.db.insert(users).values({ openId, name: `Synthetic Member ${id}`, email: `${id.toLowerCase()}@example.test`, loginMethod: "test-harness" }).onDuplicateKeyUpdate({ set: { name: `Synthetic Member ${id}` } });
    const user = (await handle.db.select({ id: users.id }).from(users).where(eq(users.openId, openId)).limit(1))[0];
    if (!user) throw new Error(`Failed to seed synthetic user ${id}`);
    await handle.db.insert(memberProfiles).values({
      userId: user.id,
      firstName: `Synthetic ${id}`,
      displayName: `Synthetic Member ${id}`,
      profileStatus: state.profileStatus,
      birthDate: new Date("1992-04-18T00:00:00.000Z"),
      gender: id === "B" || id === "E" || id === "F" ? "woman" : "man",
      religion: "muslim",
      residenceType: "gambia",
      country: "GM",
      city: "Synthetic City",
      locationVisibility: "matches_only",
      locationDetailLevel: "city",
      searchVisible: state.profileStatus !== "paused" && state.profileStatus !== "suspended",
      profileVisibility: "members_only",
      photoVisibility: "mutual_match",
      marriageIntent: "seeking_marriage",
      maritalStatus: "never_married",
      createdAt: new Date("2026-08-24T12:00:00.000Z"),
      updatedAt: new Date("2026-08-24T12:00:00.000Z"),
    });
    const profile = (await handle.db.select({ id: memberProfiles.id }).from(memberProfiles).where(eq(memberProfiles.userId, user.id)).limit(1))[0];
    if (!profile) throw new Error(`Failed to seed synthetic profile ${id}`);
    if (state.photoCount > 0) {
      await handle.db.insert(profilePhotos).values(Array.from({ length: state.photoCount }, (_, index) => ({
        profileId: profile.id,
        storageKey: `bantabato-test/${id}/photo-${index + 1}.jpg`,
        mimeType: "image/jpeg",
        photoPurpose: "profile" as const,
        isPrimary: index === 0,
        displayOrder: index,
        reviewStatus: "approved" as const,
        createdAt: new Date("2026-08-24T12:00:00.000Z"),
        updatedAt: new Date("2026-08-24T12:00:00.000Z"),
      })));
    }
    if (state.verification !== "not_started") {
      await handle.db.insert(verificationRecords).values({
        profileId: profile.id,
        verificationType: "identity_document",
        status: state.verification === "approved" ? "approved" : "under_review",
        priority: "standard",
        reviewedAt: state.verification === "approved" ? new Date("2026-08-24T12:00:00.000Z") : null,
        createdAt: new Date("2026-08-24T12:00:00.000Z"),
        updatedAt: new Date("2026-08-24T12:00:00.000Z"),
      });
    }
    seeded.push({ id, userId: user.id, profileId: profile.id });
  }
  return seeded;
}

export type SeededConversation = { matchId: number; conversationId: number; memberOneProfileId: number; memberTwoProfileId: number };

/** Relationship precondition only; messaging authorization remains in messagingService. */
export async function seedAuthorizedConversation(handle: TestDatabaseHandle, members: SeededMember[]): Promise<SeededConversation> {
  const one = members.find(member => member.id === "A");
  const two = members.find(member => member.id === "B");
  if (!one || !two) throw new Error("Synthetic A–B fixtures are required");
  const matchResult = await handle.db.insert(matches).values({ memberOneProfileId: one.profileId, memberTwoProfileId: two.profileId, status: "active", matchedAt: new Date("2026-08-24T12:00:00.000Z"), createdAt: new Date("2026-08-24T12:00:00.000Z"), updatedAt: new Date("2026-08-24T12:00:00.000Z") });
  const matchId = Number(matchResult[0].insertId);
  const conversationResult = await handle.db.insert(conversations).values({ matchId, status: "active", mutualInterestAt: new Date("2026-08-24T12:00:00.000Z"), lastActivityAt: new Date("2026-08-24T12:00:00.000Z"), createdAt: new Date("2026-08-24T12:00:00.000Z"), updatedAt: new Date("2026-08-24T12:00:00.000Z") });
  return { matchId, conversationId: Number(conversationResult[0].insertId), memberOneProfileId: one.profileId, memberTwoProfileId: two.profileId };
}

const FICTIONAL_STAFF_ROLES: Array<{ id: string; role: StaffRole }> = [
  { id: "OPS", role: "operations_manager" },
  { id: "VER", role: "verification_officer" },
  { id: "SAF", role: "trust_safety_officer" },
  { id: "SAF2", role: "trust_safety_officer" },
  { id: "SUP", role: "customer_support_officer" },
  { id: "FIN", role: "finance_officer" },
  { id: "EDT", role: "content_policy_manager" },
  { id: "APR", role: "platform_administrator" },
];

export async function seedFictionalStaff(handle: TestDatabaseHandle): Promise<SeededStaff[]> {
  const seeded: SeededStaff[] = [];
  for (const { id, role } of FICTIONAL_STAFF_ROLES) {
    const openId = `bantabato-test-staff-${id}`;
    await handle.db.insert(users).values({ openId, name: `Synthetic Staff ${id}`, email: `${id.toLowerCase()}@staff.example.test`, loginMethod: "test-harness" }).onDuplicateKeyUpdate({ set: { name: `Synthetic Staff ${id}` } });
    const user = (await handle.db.select({ id: users.id }).from(users).where(eq(users.openId, openId)).limit(1))[0];
    if (!user) throw new Error(`Failed to seed synthetic staff user ${id}`);
    await handle.db.insert(staffProfiles).values({ userId: user.id, staffRole: role, status: "active", mfaRequired: true, activatedAt: new Date("2026-08-24T12:00:00.000Z"), lastReauthenticatedAt: new Date("2026-08-24T12:00:00.000Z"), createdAt: new Date("2026-08-24T12:00:00.000Z"), updatedAt: new Date("2026-08-24T12:00:00.000Z") }).onDuplicateKeyUpdate({ set: { staffRole: role, status: "active", lastReauthenticatedAt: new Date("2026-08-24T12:00:00.000Z") } });
    const profile = (await handle.db.select({ id: staffProfiles.id }).from(staffProfiles).where(eq(staffProfiles.userId, user.id)).limit(1))[0];
    if (!profile) throw new Error(`Failed to seed synthetic staff profile ${id}`);
    const sessionReferenceHash = `bantabato-test-session-${id}`;
    await handle.db.insert(staffSessionControls).values({ staffProfileId: profile.id, sessionReferenceHash, status: "active", issuedAt: new Date("2026-08-24T12:00:00.000Z"), expiresAt: new Date("2030-08-24T12:00:00.000Z"), reauthenticatedAt: new Date("2026-08-24T12:00:00.000Z") }).onDuplicateKeyUpdate({ set: { status: "active", expiresAt: new Date("2030-08-24T12:00:00.000Z"), reauthenticatedAt: new Date("2026-08-24T12:00:00.000Z") } });
    seeded.push({ id, userId: user.id, staffProfileId: profile.id, staffRole: role, sessionReferenceHash });
  }
  return seeded;
}

export async function withSeededFictionalMembers<T>(handle: TestDatabaseHandle, work: (members: SeededMember[]) => Promise<T>): Promise<T> {
  return withIsolatedRollback(handle, async () => work(await seedFictionalMembers(handle)));
}

export async function withSeededFictionalStaff<T>(handle: TestDatabaseHandle, work: (staff: SeededStaff[]) => Promise<T>): Promise<T> {
  return withIsolatedRollback(handle, async () => work(await seedFictionalStaff(handle)));
}

export async function closeIsolatedTestDatabase(handle: TestDatabaseHandle): Promise<void> {
  handle.connection.release();
  await handle.pool.end();
}
