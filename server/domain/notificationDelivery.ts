export type NotificationChannel = "in_app" | "email" | "sms" | "push";

export type TransactionalNotificationPayload = {
  recipientUserId: number;
  notificationType: "interest" | "match" | "message" | "verification" | "safety" | "family" | "connection" | "recommendation" | "billing";
  subject: string;
  body: string;
  actionPath?: string;
};

export type ChannelDeliveryResult = { channel: NotificationChannel; delivered: boolean; reason?: string };

export interface NotificationChannelAdapter {
  channel: Exclude<NotificationChannel, "in_app">;
  deliver(payload: TransactionalNotificationPayload): Promise<ChannelDeliveryResult>;
}

const adapters = new Map<Exclude<NotificationChannel, "in_app">, NotificationChannelAdapter>();

export function registerNotificationChannelAdapter(adapter: NotificationChannelAdapter) { adapters.set(adapter.channel, adapter); }
export function configuredNotificationChannels() { return Array.from(adapters.keys()); }

/**
 * Deliberate provider boundary. A delivery service may be configured later without changing
 * matching, messaging, or notification business rules. No email is claimed as sent until a
 * real provider adapter is added and enabled.
 */
export async function deliverExternalNotification(channel: Exclude<NotificationChannel, "in_app">, payload: TransactionalNotificationPayload) {
  const adapter = adapters.get(channel);
  if (!adapter) { const label = channel === "email" ? "Email" : channel === "sms" ? "SMS" : "Push"; return { channel, delivered: false, reason: `${label} delivery provider is not configured` }; }
  return adapter.deliver(payload);
}

/**
 * The in-app event has already been persisted by the caller. This routes only optional
 * out-of-app channels and can be extended with secure provider adapters later.
 */
export async function routeTransactionalNotification(payload: TransactionalNotificationPayload): Promise<ChannelDeliveryResult[]> {
  const [emailResult, smsResult, pushResult] = await Promise.all([deliverExternalNotification("email", payload), deliverExternalNotification("sms", payload), deliverExternalNotification("push", payload)]);
  return [
    { channel: "in_app", delivered: true },
    emailResult,
    smsResult,
    pushResult,
  ];
}
