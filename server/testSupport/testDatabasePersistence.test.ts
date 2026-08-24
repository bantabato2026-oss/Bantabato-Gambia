import { describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import { memberProfiles, users } from "../../drizzle/schema";
import { closeIsolatedTestDatabase, openIsolatedTestDatabase, withSeededFictionalMembers } from "./testDatabaseAdapter";

const configuredForIsolatedDatabase = Boolean(
  process.env.BANTABATO_TEST_MODE &&
  process.env.BANTABATO_TEST_DATABASE_URL &&
  process.env.BANTABATO_TEST_DATABASE_NAME,
);

describe("Sprint 46 persistence-backed fictional lifecycle", () => {
  it.skipIf(!configuredForIsolatedDatabase)("persists A–J through the real schema and rolls every synthetic row back", async () => {
    const handle = await openIsolatedTestDatabase();
    try {
      await withSeededFictionalMembers(handle, async members => {
        expect(members.map(member => member.id)).toEqual(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]);
        const userIds = members.map(member => member.userId);
        const profiles = await handle.db.select({ userId: memberProfiles.userId, profileStatus: memberProfiles.profileStatus, searchVisible: memberProfiles.searchVisible }).from(memberProfiles).where(inArray(memberProfiles.userId, userIds));
        expect(profiles).toHaveLength(10);
        expect(profiles.find(profile => profile.userId === members[3]?.userId)?.profileStatus).toBe("draft");
        expect(profiles.find(profile => profile.userId === members[6]?.userId)?.searchVisible).toBe(false);
        expect(profiles.find(profile => profile.userId === members[8]?.userId)?.profileStatus).toBe("suspended");
      });

      const remaining = await handle.db.select({ id: users.id }).from(users).where(inArray(users.openId, ["bantabato-test-A", "bantabato-test-B", "bantabato-test-C", "bantabato-test-D", "bantabato-test-E", "bantabato-test-F", "bantabato-test-G", "bantabato-test-H", "bantabato-test-I", "bantabato-test-J"]));
      expect(remaining).toHaveLength(0);
    } finally {
      await closeIsolatedTestDatabase(handle);
    }
  });

  it("keeps the persistence suite opt-in and never silently falls back to the application datastore", () => {
    if (configuredForIsolatedDatabase) expect(process.env.BANTABATO_TEST_DATABASE_URL).not.toBe(process.env.DATABASE_URL);
    else expect(process.env.BANTABATO_TEST_DATABASE_URL).toBeUndefined();
  });
});
