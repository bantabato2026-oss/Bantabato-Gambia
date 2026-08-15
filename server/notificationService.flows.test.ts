import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), createAuditLog: vi.fn() }));
vi.mock("./db", () => ({ getDb: mocks.getDb, createAuditLog: mocks.createAuditLog }));

import { dismissNotification, emitLegacyNotification, emitTrustedNotification, markAllNotificationsRead, markNotificationReadState, saveNotificationPreferences } from "./notificationService";

function fakeDb(rows: unknown[][]) {
  const inserts: Array<{ table: unknown; values: Record<string, unknown> }> = []; const updates: Array<{ table: unknown; values: Record<string, unknown> }> = [];
  const select = () => { const result = rows.shift() ?? []; const query: any = { limit: async () => result, then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve) }; query.orderBy = () => query; return { from: () => ({ where: () => query }) }; };
  const insert = (table: unknown) => ({ values: (values: Record<string, unknown>) => { inserts.push({ table, values }); const result = Object.assign([{ id: inserts.length }], { $returningId: async () => [{ id: inserts.length }], onDuplicateKeyUpdate: async () => undefined }); return result; } });
  const update = (table: unknown) => ({ set: (values: Record<string, unknown>) => ({ where: async () => { updates.push({ table, values }); } }) });
  return { db: { select, insert, update }, inserts, updates };
}

describe("Phase 9 centralized notification service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a privacy-safe in-app notification and records external channels as preference-suppressed without provider calls", async () => {
    const fake = fakeDb([[], [], [], []]); mocks.getDb.mockResolvedValue(fake.db);
    const result = await emitTrustedNotification({ recipientUserId: 4, actorUserId: 2, eventType: "message_received", notificationType: "message", category: "messages", priority: "normal", notificationClass: "transactional", idempotencyKey: "message:1:4", actionPath: "/app/messages/1" });
    expect(result.duplicate).toBe(false); expect(result.notificationId).toBe(2);
    const inApp = fake.inserts.find(entry => entry.values.eventType === "message_received" && entry.values.title);
    expect(inApp?.values).toMatchObject({ title: "You have a new message", body: "Open Bantabato to review your private conversation.", notificationClass: "transactional" });
    expect(JSON.stringify(inApp?.values)).not.toMatch(/Sarah|voice note|private profile/i);
    expect(result.external).toEqual([{ channel: "email", status: "suppressed" }, { channel: "sms", status: "suppressed" }, { channel: "push", status: "suppressed" }]);
  });

  it("uses the existing legacy helper seam but discards scattered caller copy in favor of centralized safe copy", async () => {
    const fake = fakeDb([[], [], [], []]); mocks.getDb.mockResolvedValue(fake.db);
    await emitLegacyNotification(4, "family", "A Wali accepted", "Named family feedback and contact data", "/app/family", "family:one");
    const notification = fake.inserts.find(entry => entry.values.eventType === "family_update" && entry.values.title);
    expect(notification?.values.title).toBe("Family Circle update");
    expect(String(notification?.values.body)).not.toMatch(/wali|feedback|contact/i);
  });

  it("makes application-event creation idempotent before creating another in-app item or delivery record", async () => {
    const fake = fakeDb([[{ id: 99 }]]); mocks.getDb.mockResolvedValue(fake.db);
    const result = await emitTrustedNotification({ recipientUserId: 4, eventType: "recommendation_available", notificationType: "recommendation", category: "recommendations", priority: "normal", notificationClass: "transactional", idempotencyKey: "recommendation:4:current", actionPath: "/app/recommendations" });
    expect(result).toEqual({ notificationId: null, duplicate: true, external: [] }); expect(fake.inserts).toHaveLength(0);
  });

  it("keeps essential safety notifications in-app even when a member disabled ordinary in-app channels", async () => {
    const disabled = { inAppEnabled: false, emailEnabled: false, smsEnabled: false, pushEnabled: false, marketingOptIn: false };
    const fake = fakeDb([[], [], [disabled], []]); mocks.getDb.mockResolvedValue(fake.db);
    const result = await emitTrustedNotification({ recipientUserId: 4, eventType: "trust_safety_action", notificationType: "safety", category: "safety", priority: "high", notificationClass: "transactional", idempotencyKey: "safety:4:1", actionPath: "/app/profile" });
    expect(result.notificationId).toBe(2); expect(fake.inserts.some(entry => entry.values.notificationType === "safety" && entry.values.title === "Important account update")).toBe(true);
  });

  it("marks enabled external channels unavailable rather than claiming a delivery when no provider configuration exists", async () => {
    const email = { inAppEnabled: true, emailEnabled: true, smsEnabled: false, pushEnabled: false, marketingOptIn: false };
    const fake = fakeDb([[], [], [email], [], []]); mocks.getDb.mockResolvedValue(fake.db);
    const result = await emitTrustedNotification({ recipientUserId: 4, eventType: "payment_success", notificationType: "billing", category: "billing", priority: "high", notificationClass: "transactional", idempotencyKey: "payment:4:1", actionPath: "/app/billing" });
    expect(result.external).toContainEqual({ channel: "email", status: "unavailable" });
    expect(fake.inserts.some(entry => entry.values.channel === "email" && entry.values.status === "unavailable" && String(entry.values.failureReason).includes("not configured"))).toBe(true);
  });

  it("keeps critical safety items non-dismissible while allowing member-owned read-state updates", async () => {
    const safety = fakeDb([[{ id: 3, priority: "critical", notificationType: "safety" }]]); mocks.getDb.mockResolvedValue(safety.db);
    await expect(dismissNotification(4, 3)).rejects.toThrow("cannot be dismissed");
    const state = fakeDb([]); mocks.getDb.mockResolvedValue(state.db);
    await markNotificationReadState(4, 5); await markAllNotificationsRead(4);
    expect(state.updates).toHaveLength(2); expect(state.updates.every(entry => entry.values.readAt instanceof Date)).toBe(true);
  });

  it("persists member-owned channel, timezone, quiet-hours, locale, and marketing choices without accepting arbitrary recipients", async () => {
    const fake = fakeDb([]); mocks.getDb.mockResolvedValue(fake.db);
    await saveNotificationPreferences(4, { timezone: "Africa/Banjul", quietHoursEnabled: true, quietHoursStart: "22:00", quietHoursEnd: "07:00", locale: "en", preferences: [{ category: "marketing", inAppEnabled: true, emailEnabled: false, smsEnabled: false, pushEnabled: false, marketingOptIn: false }] });
    expect(fake.inserts.some(entry => entry.values.userId === 4 && entry.values.timezone === "Africa/Banjul")).toBe(true);
    expect(fake.inserts.some(entry => entry.values.category === "marketing" && entry.values.marketingOptIn === false)).toBe(true);
    expect(fake.inserts.flatMap(entry => Object.keys(entry.values))).not.toContain("recipientUserId");
  });
});
