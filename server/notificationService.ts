import { and, asc, desc, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
import { memberNotificationSettings, notificationDeliveries, notificationEvents, notificationJobs, notificationPreferences, notificationProviderConfigurations, notificationTemplates, notifications } from "../drizzle/schema";
import { createAuditLog, getDb } from "./db";
import { deliverExternalNotification } from "./domain/notificationDelivery";
import { canUseChannel, essentialTransactionalEvent, isAllowedNotificationActionPath, privacySafeCopy, quietHoursOutcome, retryAt, type NotificationCategory, type NotificationChannel, type TrustedNotificationEvent } from "./domain/notificationPolicy";

const categories: NotificationCategory[] = ["messages", "family", "recommendations", "billing", "product_updates", "marketing", "security", "verification", "safety"];
const externalChannels: Array<Exclude<NotificationChannel, "in_app">> = ["email", "sms", "push"];
type LegacyNotificationType = Exclude<TrustedNotificationEvent["notificationType"], "product" | "security">;
const legacyCategory: Record<LegacyNotificationType, NotificationCategory> = { interest: "messages", match: "messages", message: "messages", verification: "verification", safety: "safety", family: "family", connection: "messages", recommendation: "recommendations", billing: "billing" };
const legacyEventType: Record<LegacyNotificationType, string> = { interest: "message_received", match: "message_received", message: "message_received", verification: "verification_update", safety: "trust_safety_action", family: "family_update", connection: "connection_update", recommendation: "recommendation_available", billing: "subscription_update" };

type PreferenceState = { inAppEnabled: boolean; emailEnabled: boolean; smsEnabled: boolean; pushEnabled: boolean; marketingOptIn: boolean };
const defaultPreference: PreferenceState = { inAppEnabled: true, emailEnabled: false, smsEnabled: false, pushEnabled: false, marketingOptIn: false };

async function getSettingsAndPreference(userId: number, category: NotificationCategory) {
  const db = await getDb();
  if (!db) throw new Error("Notification service is temporarily unavailable.");
  const [settingsRows, preferenceRows] = await Promise.all([db.select().from(memberNotificationSettings).where(eq(memberNotificationSettings.userId, userId)).limit(1), db.select().from(notificationPreferences).where(and(eq(notificationPreferences.userId, userId), eq(notificationPreferences.category, category))).limit(1)]);
  const settings = settingsRows[0] ?? { timezone: "UTC", quietHoursEnabled: false, quietHoursStart: null, quietHoursEnd: null, locale: "en" };
  const preference = preferenceRows[0] ?? defaultPreference;
  return { settings, preference };
}

function safeType(event: TrustedNotificationEvent): TrustedNotificationEvent["notificationType"] { return event.notificationType; }

/** Called only by server domain services. The client receives no generic send-notification procedure. */
export async function emitTrustedNotification(event: TrustedNotificationEvent) {
  const db = await getDb();
  if (!db) return { notificationId: null, duplicate: false, external: [] as Array<{ channel: string; status: string }> };
  if (!isAllowedNotificationActionPath(event.actionPath) && event.actionPath) throw new Error("Notification action path is invalid.");
  const existing = await db.select().from(notificationEvents).where(and(eq(notificationEvents.recipientUserId, event.recipientUserId), eq(notificationEvents.idempotencyKey, event.idempotencyKey))).limit(1);
  if (existing[0]) return { notificationId: null, duplicate: true, external: [] as Array<{ channel: string; status: string }> };
  const eventId = Number((await db.insert(notificationEvents).values({ recipientUserId: event.recipientUserId, actorUserId: event.actorUserId ?? null, eventType: event.eventType, notificationType: event.notificationType, notificationClass: event.notificationClass, priority: event.priority, sourceType: event.sourceType ?? null, sourceId: event.sourceId === undefined ? null : String(event.sourceId), idempotencyKey: event.idempotencyKey, safeMetadata: null, actionPath: event.actionPath ?? null, expiresAt: event.expiresAt ?? null }).$returningId())[0]?.id ?? 0);
  const { settings, preference } = await getSettingsAndPreference(event.recipientUserId, event.category);
  const copy = privacySafeCopy(event.eventType);
  const activeTemplate = (await db.select().from(notificationTemplates).where(and(eq(notificationTemplates.eventType, event.eventType), eq(notificationTemplates.channel, "in_app"), eq(notificationTemplates.locale, settings.locale), eq(notificationTemplates.status, "active"))).orderBy(desc(notificationTemplates.createdAt)).limit(1))[0];
  const inAppAllowed = canUseChannel(event, "in_app", preference);
  let notificationId: number | null = null;
  if (inAppAllowed) {
    notificationId = Number((await db.insert(notifications).values({ userId: event.recipientUserId, notificationType: safeType(event), title: copy.title, body: copy.body, actionPath: event.actionPath ?? null, eventKey: event.idempotencyKey, eventType: event.eventType, priority: event.priority, notificationClass: event.notificationClass, templateVersion: activeTemplate?.templateVersion ?? "system-v1", expiresAt: event.expiresAt ?? null }).$returningId())[0]?.id ?? 0);
    await db.insert(notificationDeliveries).values({ notificationId, notificationEventId: eventId, recipientUserId: event.recipientUserId, channel: "in_app", templateVersion: activeTemplate?.templateVersion ?? "system-v1", status: "delivered", deliveredAt: new Date() });
  }
  const external: Array<{ channel: string; status: string }> = [];
  for (const channel of externalChannels) {
    if (!canUseChannel(event, channel, preference)) {
      await db.insert(notificationDeliveries).values({ notificationEventId: eventId, recipientUserId: event.recipientUserId, channel, status: "suppressed", failureReason: event.notificationClass === "marketing" && !preference.marketingOptIn ? "Marketing opt-in is disabled" : "Member channel preference is disabled" });
      external.push({ channel, status: "suppressed" });
      continue;
    }
    const quiet = quietHoursOutcome({ quietHoursEnabled: settings.quietHoursEnabled, quietHoursStart: settings.quietHoursStart, quietHoursEnd: settings.quietHoursEnd, timezone: settings.timezone, priority: event.priority, notificationClass: event.notificationClass });
    if (quiet.state === "suppress") {
      await db.insert(notificationDeliveries).values({ notificationEventId: eventId, recipientUserId: event.recipientUserId, channel, status: "suppressed", failureReason: "Suppressed during quiet hours" });
      external.push({ channel, status: "suppressed" });
      continue;
    }
    const configured = (await db.select().from(notificationProviderConfigurations).where(and(eq(notificationProviderConfigurations.channel, channel), eq(notificationProviderConfigurations.enabled, true))).limit(1))[0];
    if (!configured) {
      await db.insert(notificationDeliveries).values({ notificationEventId: eventId, recipientUserId: event.recipientUserId, channel, status: "unavailable", failureReason: `${channel.toUpperCase()} provider is not configured` });
      external.push({ channel, status: "unavailable" });
      continue;
    }
    const deliveryId = Number((await db.insert(notificationDeliveries).values({ notificationEventId: eventId, recipientUserId: event.recipientUserId, channel, provider: configured.provider, templateVersion: "system-v1", status: "queued", scheduledAt: quiet.availableAt ?? new Date() }).$returningId())[0]?.id ?? 0);
    await db.insert(notificationJobs).values({ notificationDeliveryId: deliveryId, priority: event.priority, availableAt: quiet.availableAt ?? new Date(), maxAttempts: 3 });
    external.push({ channel, status: quiet.state === "delay" ? "queued_for_quiet_hours" : "queued" });
  }
  await createAuditLog(event.actorUserId ?? null, "notification.event_created", "notification_event", String(eventId), { eventType: event.eventType, recipientUserId: event.recipientUserId, notificationClass: event.notificationClass, priority: event.priority, inAppCreated: Boolean(notificationId), external: external.map(item => ({ channel: item.channel, status: item.status })) });
  return { notificationId, duplicate: false, external };
}

/** Compatibility seam for completed phases: copy arguments are deliberately ignored in favour of central privacy-safe event copy. */
export async function emitLegacyNotification(userId: number, notificationType: LegacyNotificationType, _title: string, _body: string, actionPath?: string, eventKey?: string) {
  const eventType = legacyEventType[notificationType];
  return emitTrustedNotification({ recipientUserId: userId, eventType, notificationType, category: legacyCategory[notificationType], priority: notificationType === "safety" ? "high" : "normal", notificationClass: "transactional", idempotencyKey: eventKey ?? `${eventType}:${userId}:${Date.now()}`, actionPath });
}

export async function getNotificationCenter(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(notifications).where(and(eq(notifications.userId, userId), isNull(notifications.dismissedAt), or(isNull(notifications.expiresAt), gt(notifications.expiresAt, new Date())))).orderBy(desc(notifications.createdAt)).limit(100);
}

export async function markNotificationReadState(userId: number, notificationId: number) { const db = await getDb(); if (!db) throw new Error("Notification service is temporarily unavailable."); await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId))); }
export async function markAllNotificationsRead(userId: number) { const db = await getDb(); if (!db) throw new Error("Notification service is temporarily unavailable."); await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, userId), isNull(notifications.readAt))); }
export async function dismissNotification(userId: number, notificationId: number) { const db = await getDb(); if (!db) throw new Error("Notification service is temporarily unavailable."); const item = (await db.select().from(notifications).where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId))).limit(1))[0]; if (!item) return; if (item.priority === "critical" || item.notificationType === "safety") throw new Error("Important safety notifications cannot be dismissed."); await db.update(notifications).set({ dismissedAt: new Date() }).where(eq(notifications.id, notificationId)); }

export async function getNotificationPreferences(userId: number) {
  const db = await getDb(); if (!db) return { settings: { timezone: "UTC", quietHoursEnabled: false, quietHoursStart: null, quietHoursEnd: null, locale: "en" }, preferences: categories.map(category => ({ category, ...defaultPreference })) };
  const [settingsRows, rows] = await Promise.all([db.select().from(memberNotificationSettings).where(eq(memberNotificationSettings.userId, userId)).limit(1), db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId))]);
  return { settings: settingsRows[0] ?? { timezone: "UTC", quietHoursEnabled: false, quietHoursStart: null, quietHoursEnd: null, locale: "en" }, preferences: categories.map(category => ({ category, ...(rows.find(row => row.category === category) ?? defaultPreference) })) };
}

export async function saveNotificationPreferences(userId: number, input: { timezone: string; quietHoursEnabled: boolean; quietHoursStart?: string | null; quietHoursEnd?: string | null; locale: string; preferences: Array<{ category: NotificationCategory; inAppEnabled: boolean; emailEnabled: boolean; smsEnabled: boolean; pushEnabled: boolean; marketingOptIn: boolean }> }) {
  const db = await getDb(); if (!db) throw new Error("Notification service is temporarily unavailable.");
  try { new Intl.DateTimeFormat("en", { timeZone: input.timezone }); } catch { throw new Error("Choose a valid timezone."); }
  if (input.quietHoursEnabled && (!/^\d{2}:\d{2}$/.test(input.quietHoursStart ?? "") || !/^\d{2}:\d{2}$/.test(input.quietHoursEnd ?? ""))) throw new Error("Quiet hours need a start and end time.");
  await db.insert(memberNotificationSettings).values({ userId, timezone: input.timezone, quietHoursEnabled: input.quietHoursEnabled, quietHoursStart: input.quietHoursEnabled ? input.quietHoursStart ?? null : null, quietHoursEnd: input.quietHoursEnabled ? input.quietHoursEnd ?? null : null, locale: input.locale }).onDuplicateKeyUpdate({ set: { timezone: input.timezone, quietHoursEnabled: input.quietHoursEnabled, quietHoursStart: input.quietHoursEnabled ? input.quietHoursStart ?? null : null, quietHoursEnd: input.quietHoursEnabled ? input.quietHoursEnd ?? null : null, locale: input.locale } });
  for (const pref of input.preferences) await db.insert(notificationPreferences).values({ userId, ...pref }).onDuplicateKeyUpdate({ set: { inAppEnabled: pref.inAppEnabled, emailEnabled: pref.emailEnabled, smsEnabled: pref.smsEnabled, pushEnabled: pref.pushEnabled, marketingOptIn: pref.marketingOptIn } });
  await createAuditLog(userId, "notification.preferences_updated", "member_notification_settings", String(userId), { timezone: input.timezone, quietHoursEnabled: input.quietHoursEnabled, locale: input.locale, categories: input.preferences.map(pref => pref.category) });
}

/** Future worker seam. No scheduler is activated in Phase 9; an authorized operational action may process a bounded batch. */
export async function processQueuedNotificationDeliveries(actorUserId: number, limit = 25) {
  const db = await getDb(); if (!db) return { processed: 0, delivered: 0, retrying: 0, failed: 0 };
  const jobs = await db.select().from(notificationJobs).where(and(eq(notificationJobs.status, "queued"), lte(notificationJobs.availableAt, new Date()))).orderBy(asc(notificationJobs.availableAt)).limit(Math.min(limit, 50));
  let delivered = 0, retrying = 0, failed = 0;
  for (const job of jobs) {
    const delivery = (await db.select().from(notificationDeliveries).where(eq(notificationDeliveries.id, job.notificationDeliveryId)).limit(1))[0];
    if (!delivery || delivery.channel === "in_app") continue;
    const event = (await db.select().from(notificationEvents).where(eq(notificationEvents.id, delivery.notificationEventId)).limit(1))[0];
    if (!event) continue;
    if (event.expiresAt && event.expiresAt <= new Date()) { await db.update(notificationJobs).set({ status: "expired" }).where(eq(notificationJobs.id, job.id)); await db.update(notificationDeliveries).set({ status: "expired" }).where(eq(notificationDeliveries.id, delivery.id)); continue; }
    await db.update(notificationJobs).set({ status: "processing", attempts: job.attempts + 1 }).where(eq(notificationJobs.id, job.id));
    const copy = privacySafeCopy(event.eventType);
    const result = await deliverExternalNotification(delivery.channel, { recipientUserId: event.recipientUserId, notificationType: event.notificationType as any, subject: copy.title, body: copy.body, actionPath: event.actionPath ?? undefined });
    if (result.delivered) { delivered++; await db.update(notificationDeliveries).set({ status: "delivered", sentAt: new Date(), deliveredAt: new Date(), failureReason: null }).where(eq(notificationDeliveries.id, delivery.id)); await db.update(notificationJobs).set({ status: "completed", lastError: null }).where(eq(notificationJobs.id, job.id)); }
    else { const next = retryAt(new Date(), job.attempts + 1, job.maxAttempts); if (next) { retrying++; await db.update(notificationDeliveries).set({ status: "retrying", retryCount: job.attempts + 1, nextRetryAt: next, failureReason: result.reason ?? "Provider failed" }).where(eq(notificationDeliveries.id, delivery.id)); await db.update(notificationJobs).set({ status: "queued", availableAt: next, lastError: result.reason ?? "Provider failed" }).where(eq(notificationJobs.id, job.id)); } else { failed++; await db.update(notificationDeliveries).set({ status: "failed", retryCount: job.attempts + 1, failedAt: new Date(), failureReason: result.reason ?? "Provider failed" }).where(eq(notificationDeliveries.id, delivery.id)); await db.update(notificationJobs).set({ status: "failed", lastError: result.reason ?? "Provider failed" }).where(eq(notificationJobs.id, job.id)); } }
  }
  await createAuditLog(actorUserId, "notification.queue_processed", "notification_job", undefined, { processed: jobs.length, delivered, retrying, failed });
  return { processed: jobs.length, delivered, retrying, failed };
}

export async function listNotificationOperations() { const db = await getDb(); if (!db) return []; return db.select({ id: notificationDeliveries.id, channel: notificationDeliveries.channel, provider: notificationDeliveries.provider, status: notificationDeliveries.status, retryCount: notificationDeliveries.retryCount, nextRetryAt: notificationDeliveries.nextRetryAt, createdAt: notificationDeliveries.createdAt, eventType: notificationEvents.eventType, priority: notificationEvents.priority, notificationClass: notificationEvents.notificationClass }).from(notificationDeliveries).innerJoin(notificationEvents, eq(notificationDeliveries.notificationEventId, notificationEvents.id)).orderBy(desc(notificationDeliveries.createdAt)).limit(100); }

export async function listNotificationConfiguration() { const db = await getDb(); if (!db) return { templates: [], providers: [] }; return { templates: await db.select({ id: notificationTemplates.id, eventType: notificationTemplates.eventType, channel: notificationTemplates.channel, locale: notificationTemplates.locale, templateVersion: notificationTemplates.templateVersion, status: notificationTemplates.status, createdAt: notificationTemplates.createdAt }).from(notificationTemplates).orderBy(desc(notificationTemplates.createdAt)), providers: await db.select().from(notificationProviderConfigurations).orderBy(asc(notificationProviderConfigurations.provider)) }; }

export async function saveNotificationTemplateConfiguration(actorUserId: number, input: { eventType: string; channel: "in_app" | "email" | "sms" | "push"; locale: string; templateVersion: string; subject: string; body: string; allowedVariables: string[]; activate: boolean }) {
  const db = await getDb(); if (!db) throw new Error("Notification service is temporarily unavailable.");
  if (input.allowedVariables.length) throw new Error("Phase 9 templates do not permit dynamic personal variables. Use privacy-safe standard copy.");
  if (/\{\{|\}\}|@|\+\d{5,}/.test(`${input.subject} ${input.body}`)) throw new Error("Template copy must not include variable placeholders, contact details, or phone numbers.");
  const existing = await db.select().from(notificationTemplates).where(and(eq(notificationTemplates.eventType, input.eventType), eq(notificationTemplates.channel, input.channel), eq(notificationTemplates.locale, input.locale), eq(notificationTemplates.templateVersion, input.templateVersion))).limit(1);
  if (existing[0]) throw new Error("A template with this event, channel, locale, and version already exists. Create a new version.");
  const result = await db.insert(notificationTemplates).values({ eventType: input.eventType, channel: input.channel, locale: input.locale, templateVersion: input.templateVersion, status: input.activate ? "active" : "draft", subject: input.subject, body: input.body, allowedVariables: [], createdByUserId: actorUserId, activatedAt: input.activate ? new Date() : null }).$returningId();
  const templateId = Number(result[0]?.id ?? 0);
  await createAuditLog(actorUserId, "notification.template_created", "notification_template", String(templateId), { eventType: input.eventType, channel: input.channel, locale: input.locale, templateVersion: input.templateVersion, activate: input.activate });
  return { templateId };
}

export async function saveNotificationProviderAvailability(actorUserId: number, input: { provider: string; channel: "email" | "sms" | "push"; enabled: boolean; supportedLocales: string[]; configurationNote?: string }) {
  const db = await getDb(); if (!db) throw new Error("Notification service is temporarily unavailable.");
  const provider = input.provider.trim().toLowerCase(); if (!provider) throw new Error("Provider name is required.");
  await db.insert(notificationProviderConfigurations).values({ provider, channel: input.channel, enabled: input.enabled, supportedLocales: Array.from(new Set(input.supportedLocales.map(item => item.trim().toLowerCase()).filter(Boolean))), configurationNote: input.configurationNote?.trim() || null, updatedByUserId: actorUserId }).onDuplicateKeyUpdate({ set: { enabled: input.enabled, supportedLocales: Array.from(new Set(input.supportedLocales.map(item => item.trim().toLowerCase()).filter(Boolean))), configurationNote: input.configurationNote?.trim() || null, updatedByUserId: actorUserId } });
  await createAuditLog(actorUserId, "notification.provider_availability_updated", "notification_provider_configuration", `${provider}:${input.channel}`, { enabled: input.enabled, supportedLocales: input.supportedLocales });
  return { provider, channel: input.channel, enabled: input.enabled };
}
