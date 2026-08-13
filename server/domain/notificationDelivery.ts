export type EmailNotificationPayload = {
  recipientUserId: number;
  notificationType: "interest" | "match" | "message" | "verification" | "safety" | "family";
  subject: string;
  body: string;
  actionPath?: string;
};

/**
 * Deliberate provider boundary. A delivery service may be configured later without changing
 * matching, messaging, or notification business rules. No email is claimed as sent until a
 * real provider adapter is added and enabled.
 */
export async function queueEmailNotification(_payload: EmailNotificationPayload) {
  return { delivered: false, reason: "Email delivery provider is not configured" } as const;
}
