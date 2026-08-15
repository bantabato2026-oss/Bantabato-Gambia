export type NotificationPriority = "critical" | "high" | "normal" | "low";
export type NotificationClass = "transactional" | "marketing";
export type NotificationChannel = "in_app" | "email" | "sms" | "push";
export type NotificationCategory = "messages" | "family" | "recommendations" | "billing" | "product_updates" | "marketing" | "security" | "verification" | "safety";

export type TrustedNotificationEvent = {
  recipientUserId: number;
  actorUserId?: number | null;
  eventType: string;
  notificationType: "interest" | "match" | "message" | "verification" | "safety" | "family" | "connection" | "recommendation" | "billing" | "product" | "security";
  category: NotificationCategory;
  priority: NotificationPriority;
  notificationClass: NotificationClass;
  idempotencyKey: string;
  sourceType?: string;
  sourceId?: string | number;
  actionPath?: string;
  expiresAt?: Date | null;
};

const safeCopies: Record<string, { title: string; body: string }> = {
  message_received: { title: "You have a new message", body: "Open Bantabato to review your private conversation." },
  voice_note_received: { title: "You have a new message", body: "Open Bantabato to review your private conversation." },
  family_invitation_received: { title: "Family Circle notification", body: "You have a Family Circle invitation to review securely in Bantabato." },
  family_update: { title: "Family Circle update", body: "You have a Family Circle update to review securely in Bantabato." },
  recommendation_available: { title: "A considered introduction is ready", body: "Open Bantabato to review it at your own pace." },
  recommendation_withdrawn: { title: "Your introductions changed", body: "Open Bantabato to review your current introductions." },
  verification_update: { title: "Verification update", body: "Your verification status has changed. Sign in to review the update." },
  trust_safety_action: { title: "Important account update", body: "There is an important account update to review securely in Bantabato." },
  connection_update: { title: "Connection update", body: "There is an update to review in your private connection space." },
  payment_success: { title: "Membership update", body: "Your membership has an update. Sign in to view your private billing record." },
  payment_failed: { title: "Membership needs attention", body: "There is a membership update to review securely in Bantabato." },
  subscription_update: { title: "Membership update", body: "Your membership has an update. Sign in to review your private billing record." },
  refund_update: { title: "Membership update", body: "There is a membership update to review securely in Bantabato." },
  account_security_event: { title: "Important account notification", body: "Please sign in to Bantabato to review an important account update." },
  international_profile_update: { title: "International profile update", body: "Your location or international profile settings have changed. Sign in to review them securely." },
  product_update: { title: "Bantabato update", body: "There is an optional product update available in Bantabato." },
};

export function privacySafeCopy(eventType: string) {
  return safeCopies[eventType] ?? { title: "Bantabato notification", body: "You have an update to review securely in Bantabato." };
}

export function essentialTransactionalEvent(event: Pick<TrustedNotificationEvent, "notificationClass" | "category" | "priority">) {
  return event.notificationClass === "transactional" && (event.priority === "critical" || ["security", "safety", "verification", "billing"].includes(event.category));
}

export function canUseChannel(event: Pick<TrustedNotificationEvent, "notificationClass" | "category" | "priority">, channel: NotificationChannel, preference: { inAppEnabled: boolean; emailEnabled: boolean; smsEnabled: boolean; pushEnabled: boolean; marketingOptIn: boolean } | undefined) {
  if (channel === "in_app" && essentialTransactionalEvent(event)) return true;
  if (!preference) return channel === "in_app";
  if (event.notificationClass === "marketing" && !preference.marketingOptIn) return false;
  return channel === "in_app" ? preference.inAppEnabled : channel === "email" ? preference.emailEnabled : channel === "sms" ? preference.smsEnabled : preference.pushEnabled;
}

export function quietHoursOutcome(input: { quietHoursEnabled: boolean; quietHoursStart?: string | null; quietHoursEnd?: string | null; timezone: string; priority: NotificationPriority; notificationClass: NotificationClass; now?: Date }) {
  if (!input.quietHoursEnabled || !input.quietHoursStart || !input.quietHoursEnd || input.priority === "critical") return { state: "send" as const, availableAt: null };
  const now = input.now ?? new Date();
  const clock = new Intl.DateTimeFormat("en-GB", { timeZone: input.timezone || "UTC", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const hour = Number(clock.find(part => part.type === "hour")?.value ?? "0");
  const minute = Number(clock.find(part => part.type === "minute")?.value ?? "0");
  const current = hour * 60 + minute;
  const [startHour, startMinute] = input.quietHoursStart.split(":").map(Number);
  const [endHour, endMinute] = input.quietHoursEnd.split(":").map(Number);
  if (![startHour, startMinute, endHour, endMinute].every(Number.isFinite)) return { state: "send" as const, availableAt: null };
  const start = startHour * 60 + startMinute; const end = endHour * 60 + endMinute;
  const inside = start === end ? false : start < end ? current >= start && current < end : current >= start || current < end;
  if (!inside) return { state: "send" as const, availableAt: null };
  if (input.notificationClass === "marketing") return { state: "suppress" as const, availableAt: null };
  if (input.priority === "low") return { state: "delay" as const, availableAt: new Date(now.getTime() + 60 * 60 * 1000) };
  return { state: "delay" as const, availableAt: new Date(now.getTime() + 30 * 60 * 1000) };
}

export function retryAt(now: Date, retryCount: number, maxAttempts = 3) {
  if (retryCount >= maxAttempts) return null;
  const minutes = [1, 5, 30][Math.min(retryCount, 2)];
  return new Date(now.getTime() + minutes * 60_000);
}

export function isAllowedNotificationActionPath(path?: string) {
  return Boolean(path && path.startsWith("/app/") && !path.includes("//"));
}
