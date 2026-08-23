import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const notificationService = readFileSync(join(root, "server/notificationService.ts"), "utf8");
const notificationPolicy = readFileSync(join(root, "server/domain/notificationPolicy.ts"), "utf8");
const notificationRouter = readFileSync(join(root, "server/routers.ts"), "utf8");
const messagingService = readFileSync(join(root, "server/messagingService.ts"), "utf8");
const notificationPage = readFileSync(join(root, "client/src/pages/MemberPages.tsx"), "utf8");
const memberShell = readFileSync(join(root, "client/src/components/MemberShell.tsx"), "utf8");

describe("Sprint 15 notification and communication contracts", () => {
  it("recovers an absent in-app record after a duplicate event race without re-queueing external delivery", () => {
    expect(notificationService).toContain("const raced = await db.select().from(notificationEvents)");
    expect(notificationService).toContain("const existingInApp = (await db.select().from(notifications)");
    expect(notificationService).toContain("notificationEventId: existing.id");
    expect(notificationService).toContain("if (duplicate) return { notificationId, duplicate: true, external: []");
  });

  it("keeps notification list, unread summary, and mutations member-owned and server-authoritative", () => {
    expect(notificationService).toContain("eq(notifications.userId, userId)");
    expect(notificationService).toContain("getNotificationSummary(userId: number)");
    expect(notificationService).toContain("isNull(notifications.readAt)");
    expect(notificationRouter).toContain("summary: betaMemberProcedure.query");
    expect(notificationRouter).toContain("read: betaMemberProcedure.input");
    expect(notificationRouter).toContain("markAllRead: betaMemberProcedure.mutation");
    expect(notificationRouter).toContain("dismiss: betaMemberProcedure.input");
  });

  it("projects factual categories and actionable state without retaining expired or dismissed items", () => {
    expect(notificationService).toContain("notificationCategory(row.notificationType)");
    expect(notificationService).toContain("actionable: Boolean(row.actionPath)");
    expect(notificationService).toContain("isNull(notifications.dismissedAt)");
    expect(notificationService).toContain("gt(notifications.expiresAt, new Date())");
    expect(notificationPage).toContain("Connections");
    expect(notificationPage).toContain("Verification & photos");
    expect(notificationPage).toContain("Membership & finance");
    expect(notificationPage).toContain("No longer actionable");
  });

  it("keeps notifications privacy-safe across messages, voice, safety, family, verification, and billing", () => {
    expect(notificationPolicy).toContain("Open Bantabato to review your private conversation.");
    expect(notificationPolicy).not.toContain("message body");
    expect(messagingService).toContain("New voice note from a match");
    expect(messagingService).toContain("!preference[0]?.isMuted");
    expect(messagingService).toContain("assertPrivateVoiceAccess");
    expect(notificationPolicy).toContain("trust_safety_action");
    expect(notificationPolicy).toContain("payment_success");
    expect(notificationPolicy).toContain("family_invitation_received");
  });

  it("supports factual in-app refresh, offline recovery, accessible unread state, and reduced external claims", () => {
    expect(notificationPage).toContain("network === \"offline\"");
    expect(notificationPage).toContain("refetchInterval: 30_000");
    expect(notificationPage).toContain("aria-live=\"polite\"");
    expect(notificationPage).toContain("Reconnect before opening this private update.");
    expect(notificationPage).toContain("No external channel is currently connected.");
    expect(memberShell).toContain("trpc.notifications.summary.useQuery");
    expect(memberShell).toContain("Notifications, ${unreadNotifications} unread");
  });

  it("preserves premium-neutral and no-engagement notification boundaries", () => {
    expect(notificationService).not.toMatch(/premium.*notification|notification.*premium/i);
    expect(notificationPolicy).not.toMatch(/popularity|engagement score|most contacted|trust score/i);
    expect(notificationService).toContain("safeMetadata: null");
    expect(notificationPolicy).toContain("isAllowedNotificationActionPath");
  });
});
