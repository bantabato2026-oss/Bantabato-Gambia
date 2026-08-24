import { describe, expect, it } from "vitest";
import { canUseChannel, essentialTransactionalEvent, isAllowedNotificationActionPath, privacySafeCopy, quietHoursOutcome, retryAt, type TrustedNotificationEvent } from "./notificationPolicy";

const base: TrustedNotificationEvent = { recipientUserId: 2, eventType: "message_received", notificationType: "message", category: "messages", priority: "normal", notificationClass: "transactional", idempotencyKey: "event-1", actionPath: "/app/messages/1" };

describe("Phase 9 notification policy", () => {
  it("uses privacy-safe generic copy and never inserts message, profile, family, compatibility, or payment details", () => {
    expect(privacySafeCopy("message_received")).toEqual({ title: "You have a new message", body: "Open Bantabato to review your private conversation." });
    const family = privacySafeCopy("family_update");
    expect(`${family.title} ${family.body}`).not.toMatch(/wali|guardian|accepted|declined|feedback|profile|payment/i);
  });

  it("treats security, safety, verification, and billing transactional events as essential in-app records", () => {
    expect(essentialTransactionalEvent({ ...base, category: "security", priority: "high" })).toBe(true);
    expect(essentialTransactionalEvent({ ...base, category: "safety", priority: "normal" })).toBe(true);
    expect(essentialTransactionalEvent({ ...base, category: "verification", priority: "normal" })).toBe(true);
    expect(essentialTransactionalEvent({ ...base, category: "recommendations", priority: "normal" })).toBe(false);
  });

  it("uses distinct factual verification lifecycle copy without document, reviewer, or internal-safety detail", () => {
    const submitted = privacySafeCopy("verification_submission_received");
    const pending = privacySafeCopy("verification_pending_review");
    const changes = privacySafeCopy("verification_changes_required");
    const completed = privacySafeCopy("verification_completed");
    const additional = privacySafeCopy("verification_additional_review");
    expect(submitted.title).toContain("submission received");
    expect(pending.title).toContain("in progress");
    expect(changes.title).toContain("attention");
    expect(completed.title).toContain("completed");
    expect(additional.title).toContain("continues");
    expect(`${submitted.body} ${pending.body} ${changes.body} ${completed.body} ${additional.body}`).not.toMatch(/document number|passport number|reviewer|fraud|storage|internal/i);
  });

  it("uses privacy-safe lifecycle and session-security copy without session identifiers, devices, locations, or retention claims", () => {
    const copies = ["security_session_revoked", "security_other_sessions_revoked", "account_paused", "account_reactivated", "account_deletion_requested", "data_export_requested"].map(privacySafeCopy);
    expect(copies.map(copy => copy.title)).toEqual(expect.arrayContaining(["Session security update", "Account availability updated", "Deletion review request received", "Data review request received"]));
    expect(copies.map(copy => `${copy.title} ${copy.body}`).join(" ")).not.toMatch(/token|cookie|ip|device|browser|location|retention|days|document|staff/i);
  });

  it("does not let preference controls suppress essential in-app transactional events", () => {
    const disabled = { inAppEnabled: false, emailEnabled: false, smsEnabled: false, pushEnabled: false, marketingOptIn: false };
    expect(canUseChannel({ ...base, category: "security", priority: "critical" }, "in_app", disabled)).toBe(true);
    expect(canUseChannel(base, "in_app", disabled)).toBe(false);
  });

  it("keeps marketing separate and requires opt-in for every channel", () => {
    const pref = { inAppEnabled: true, emailEnabled: true, smsEnabled: true, pushEnabled: true, marketingOptIn: false };
    expect(canUseChannel({ ...base, category: "marketing", notificationClass: "marketing", priority: "low" }, "email", pref)).toBe(false);
    expect(canUseChannel({ ...base, category: "marketing", notificationClass: "marketing", priority: "low" }, "in_app", { ...pref, marketingOptIn: true })).toBe(true);
  });

  it("delays ordinary quiet-hour notifications, suppresses marketing, and lets critical safety bypass proceed", () => {
    const common = { quietHoursEnabled: true, quietHoursStart: "22:00", quietHoursEnd: "07:00", timezone: "UTC", now: new Date("2026-08-14T23:00:00Z") };
    expect(quietHoursOutcome({ ...common, priority: "normal", notificationClass: "transactional" }).state).toBe("delay");
    expect(quietHoursOutcome({ ...common, priority: "low", notificationClass: "marketing" }).state).toBe("suppress");
    expect(quietHoursOutcome({ ...common, priority: "critical", notificationClass: "transactional" }).state).toBe("send");
  });

  it("uses bounded exponential-style retry slots and does not retry indefinitely", () => {
    const now = new Date("2026-08-14T12:00:00Z");
    expect(retryAt(now, 0, 3)).toEqual(new Date("2026-08-14T12:01:00Z"));
    expect(retryAt(now, 1, 3)).toEqual(new Date("2026-08-14T12:05:00Z"));
    expect(retryAt(now, 3, 3)).toBeNull();
  });

  it("permits only member-app deep links and does not make a link an authorization bypass", () => {
    expect(isAllowedNotificationActionPath("/app/billing")).toBe(true);
    expect(isAllowedNotificationActionPath("https://outside.example/app/billing")).toBe(false);
    expect(isAllowedNotificationActionPath("/admin/notifications")).toBe(false);
    expect(isAllowedNotificationActionPath("/app//redirect")).toBe(false);
  });
});
