import { describe, expect, it } from "vitest";
import { routeTransactionalNotification } from "./notificationDelivery";

describe("transactional notification boundary", () => {
  it("records in-app delivery while keeping unconfigured external channels explicitly inactive", async () => {
    const results = await routeTransactionalNotification({ recipientUserId: 7, notificationType: "verification", subject: "Status update", body: "Your review has changed.", actionPath: "/app/verification" });
    expect(results).toContainEqual({ channel: "in_app", delivered: true });
    expect(results).toContainEqual({ channel: "email", delivered: false, reason: "Email delivery provider is not configured" });
    expect(results).toContainEqual({ channel: "sms", delivered: false, reason: "SMS delivery provider is not configured" });
    expect(results).toContainEqual({ channel: "push", delivered: false, reason: "Push delivery provider is not configured" });
  });
});
