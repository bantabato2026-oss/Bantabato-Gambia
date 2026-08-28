import { mkdir, writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { memberProfiles, notifications, users } from "../../drizzle/schema";
import { blockProfile, getMemberEligibility, getProfileForMember, getProfileByUserId, getUserByOpenId, listBlockedProfiles } from "../db";
import { listMessages, sendText } from "../messagingService";
import { createMemberSupportTicket, listMemberSupportTickets, reopenMemberSupportTicket, requireOperationalPermission, withdrawMemberSupportTicket } from "../adminOperationsService";
import { acceptFamilyInvitation, createFamilyInvitation, listMemberFamilyCircle, removeFamilyParticipant } from "../familyService";
import { getReadinessForMember } from "../readinessService";
import { compareMemberStates, normalizeDatabaseMemberState, normalizeInMemoryMemberState } from "./persistenceStateNormalizer";
import { closeIsolatedTestDatabase, openIsolatedTestDatabase, seedAuthorizedConversation, seedFictionalMembers, withIsolatedRollback, withSeededFictionalMembers } from "./testDatabaseAdapter";

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
        const persistedAUser = await getUserByOpenId("bantabato-test-A");
        const persistedA = await getProfileByUserId(members[0]!.userId);
        const persistedAEligibility = await getMemberEligibility(members[0]!.profileId);
        const persistedDEligibility = await getMemberEligibility(members[3]!.profileId);
        const persistedGEligibility = await getMemberEligibility(members[6]!.profileId);
        const persistedIEligibility = await getMemberEligibility(members[8]!.profileId);
        await expect(requireOperationalPermission(members[0]!.userId, "support.manage")).rejects.toThrow();
        await expect(requireOperationalPermission(members[1]!.userId, "incidents.manage")).rejects.toThrow();
        expect(persistedAUser?.openId).toBe("bantabato-test-A");
        expect(persistedA?.displayName).toBe("Synthetic Member A");
        expect(persistedAEligibility.discoveryEligible).toBe(true);
        expect(persistedDEligibility.discoveryEligible).toBe(false);
        expect(persistedGEligibility.discoveryEligible).toBe(false);
        expect(persistedIEligibility.discoveryEligible).toBe(false);
        const familyInvitation = await createFamilyInvitation(members[0]!.profileId, members[0]!.userId, { relationship: "parent", contactName: "Synthetic Parent C", contactEmail: "c@example.test", preferredContactMethod: "email" });
        await expect(acceptFamilyInvitation(members[2]!.userId, "c@example.test", familyInvitation.invitationCode)).resolves.toMatchObject({ accepted: true, status: "accepted" });
        expect((await listMemberFamilyCircle(members[0]!.profileId)).find(link => link.id === familyInvitation.familyLinkId)?.status).toBe("accepted");
        expect((await listMemberFamilyCircle(members[2]!.profileId)).find(link => link.id === familyInvitation.familyLinkId)?.status).toBe("accepted");
        expect((await listMemberFamilyCircle(members[3]!.profileId)).some(link => link.id === familyInvitation.familyLinkId)).toBe(false);
        await removeFamilyParticipant(members[0]!.profileId, members[0]!.userId, familyInvitation.familyLinkId);
        expect((await listMemberFamilyCircle(members[0]!.profileId)).find(link => link.id === familyInvitation.familyLinkId)?.status).toBe("removed");
        const conversation = await seedAuthorizedConversation(handle, members);
        await handle.db.update(memberProfiles).set({ marriageIntent: "private-synthetic-intent", marriageExpectations: "private-synthetic-expectations", reasonSeekingMarriage: "private-synthetic-reason" }).where(eq(memberProfiles.id, members[1]!.profileId));
        const memberProjection = await getProfileForMember(members[0]!.profileId, members[1]!.profileId);
        expect(memberProjection?.displayName).toBe("Synthetic Member B");
        expect(memberProjection?.hasMutualMatch).toBe(true);
        expect(memberProjection?.country).toBe("GM");
        expect(memberProjection?.city).toBe("Synthetic City");
        expect(memberProjection).not.toHaveProperty("exactLocation");
        expect(memberProjection).not.toHaveProperty("marriageIntent");
        expect(memberProjection).not.toHaveProperty("marriageExpectations");
        expect(memberProjection).not.toHaveProperty("reasonSeekingMarriage");
        expect(memberProjection).not.toHaveProperty("privateDeclaration");
        expect(memberProjection).not.toHaveProperty("privateMessages");
        expect(memberProjection).not.toHaveProperty("staffNotes");
        expect(memberProjection).not.toHaveProperty("credentials");
        const readiness = await getReadinessForMember(members[0]!.profileId, conversation.conversationId);
        expect(readiness.futureProvider.configured).toBe(false);
        expect(readiness.permissions.every(permission => permission.providerConfigured === false)).toBe(true);
        const firstMessage = await sendText(members[0]!.profileId, conversation.conversationId, "A private test message", undefined, "test-message-A-1");
        const duplicateMessage = await sendText(members[0]!.profileId, conversation.conversationId, "A private test message", undefined, "test-message-A-1");
        const recipientMessages = await listMessages(members[1]!.profileId, conversation.conversationId);
        expect(firstMessage.duplicate).toBe(false);
        expect(duplicateMessage).toMatchObject({ id: firstMessage.id, duplicate: true });
        expect(recipientMessages.items.some(message => message.id === firstMessage.id && message.body === "A private test message")).toBe(true);
        await expect(listMessages(members[2]!.profileId, conversation.conversationId)).rejects.toThrow();
        const inAppNotifications = await handle.db.select({ notificationType: notifications.notificationType, eventKey: notifications.eventKey }).from(notifications).where(inArray(notifications.userId, [members[0]!.userId, members[1]!.userId]));
        expect(inAppNotifications.some(notification => notification.notificationType === "message" && notification.eventKey?.includes(String(conversation.conversationId)))).toBe(true);
        const concurrentMessages = await Promise.all([
          sendText(members[0]!.profileId, conversation.conversationId, "Concurrent test message", undefined, "test-message-A-concurrent"),
          sendText(members[0]!.profileId, conversation.conversationId, "Concurrent test message", undefined, "test-message-A-concurrent"),
        ]);
        expect(new Set(concurrentMessages.map(message => message.id)).size).toBe(1);
        expect(concurrentMessages.filter(message => message.duplicate).length).toBe(1);
        await blockProfile(members[0]!.profileId, members[1]!.profileId, "Synthetic safety test");
        expect((await listBlockedProfiles(members[0]!.profileId)).some(block => block.profileId === members[1]!.profileId)).toBe(true);
        expect(await getProfileForMember(members[0]!.profileId, members[1]!.profileId)).toBeUndefined();
        await expect(listMessages(members[1]!.profileId, conversation.conversationId)).rejects.toThrow();
        const supportInput = { category: "technical_issue" as const, subject: "Synthetic support request", description: "A deterministic isolated support request.", idempotencyKey: "support-A-1" };
        const supportCreated = await createMemberSupportTicket(members[0]!.userId, supportInput);
        const supportDuplicate = await createMemberSupportTicket(members[0]!.userId, supportInput);
        const concurrentSupport = await Promise.all([
          createMemberSupportTicket(members[0]!.userId, { ...supportInput, idempotencyKey: "support-A-concurrent" }),
          createMemberSupportTicket(members[0]!.userId, { ...supportInput, idempotencyKey: "support-A-concurrent" }),
        ]);
        expect(new Set(concurrentSupport.map(result => result.ticket.id)).size).toBe(1);
        expect(concurrentSupport.filter(result => result.duplicate).length).toBe(1);
        expect(supportCreated.duplicate).toBe(false);
        expect(supportDuplicate).toMatchObject({ duplicate: true, ticket: { id: supportCreated.ticket.id } });
        const supportObservedVersion = supportCreated.ticket.updatedAt;
        const supportWithdrawn = await withdrawMemberSupportTicket(members[0]!.userId, supportCreated.ticket.id, supportObservedVersion);
        await expect(reopenMemberSupportTicket(members[0]!.userId, supportCreated.ticket.id, new Date(0))).rejects.toThrow("changed before your update");
        const supportReopened = await reopenMemberSupportTicket(members[0]!.userId, supportCreated.ticket.id, supportWithdrawn.ticket!.updatedAt);
        expect(supportWithdrawn.ticket?.status).toBe("withdrawn");
        expect(supportReopened.ticket?.status).toBe("open");
        expect((await listMemberSupportTickets(members[0]!.userId)).find(ticket => ticket.id === supportCreated.ticket.id)?.status).toBe("open");
        const inMemoryState = normalizeInMemoryMemberState("A");
        const databaseState = await normalizeDatabaseMemberState(members[0]!);
        const comparison = compareMemberStates("A", inMemoryState, inMemoryState, databaseState);
        expect(comparison.comparison).toBe("match");
        const comparisonFile = process.env.BANTABATO_COMPARISON_RESULT_FILE;
        if (comparisonFile) {
          await mkdir(comparisonFile.substring(0, comparisonFile.lastIndexOf("/")) || ".", { recursive: true });
          await writeFile(comparisonFile, JSON.stringify({ suite: "bantabato-persistence-comparison", status: comparison.comparison === "match" ? "PASS" : "FAIL", scenarios: [comparison], environment: "isolated-test-datastore" }, null, 2) + "\n");
        }
      });

      const rollbackProbeOpenId = "bantabato-test-rollback-probe";
      await expect(withIsolatedRollback(handle, async () => {
        await handle.db.insert(users).values({ openId: rollbackProbeOpenId, name: "Rollback Probe", email: "rollback-probe@example.test", loginMethod: "test-harness" });
        throw new Error("controlled rollback probe");
      })).rejects.toThrow("controlled rollback probe");
      const remaining = await handle.db.select({ id: users.id }).from(users).where(eq(users.openId, rollbackProbeOpenId));
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
