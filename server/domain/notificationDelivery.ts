export type NotificationChannel = "in_app" | "email" | "sms" | "push";

export type TransactionalNotificationPayload = {
  recipientUserId: number;
  notificationType: "interest" | "match" | "message" | "verification" | "safety" | "family" | "connection";
  subject: string;
  body: string;
  actionPath?: string;
};

export type ChannelDeliveryResult = { channel: NotificationChannel; delivered: boolean; reason?: string };

export interface NotificationChannelAdapter {
  channel: Exclude<NotificationChannel, "in_app">;
  deliver(payload: TransactionalNotificationPayload): Promise<ChannelDeliveryResult>;
}

const unconfiguredEmailAdapter: NotificationChannelAdapter = {
  channel: "email",
  async deliver(_payload) {
    return { channel: "email", delivered: false, reason: "Email delivery provider is not configured" };
  },
};

/**
 * Deliberate provider boundary. A delivery service may be configured later without changing
 * matching, messaging, or notification business rules. No email is claimed as sent until a
 * real provider adapter is added and enabled.
 */
export async function queueEmailNotification(payload: TransactionalNotificationPayload) {
  return unconfiguredEmailAdapter.deliver(payload);
}

/**
 * The in-app event has already been persisted by the caller. This routes only optional
 * out-of-app channels and can be extended with secure provider adapters later.
 */
export async function routeTransactionalNotification(payload: TransactionalNotificationPayload): Promise<ChannelDeliveryResult[]> {
  const emailResult = await queueEmailNotification(payload);
  return [
    { channel: "in_app", delivered: true },
    emailResult,
    { channel: "sms", delivered: false, reason: "SMS delivery provider is not configured" },
    { channel: "push", delivered: false, reason: "Push delivery provider is not configured" },
  ];
}
