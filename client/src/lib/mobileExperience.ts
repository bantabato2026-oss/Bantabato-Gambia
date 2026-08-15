export type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }> };
export type DeviceNetworkState = "online" | "offline";

const STORAGE_PREFIX = "bantabato.device.v1.";
const INSTALL_DISMISS_KEY = `${STORAGE_PREFIX}install-dismissed-at`;
const DRAFT_PREFIX = `${STORAGE_PREFIX}draft.`;
const LOW_BANDWIDTH_KEY = `${STORAGE_PREFIX}low-bandwidth`;
const MAX_DRAFT_SIZE = 12_000;

function storage() { try { return window.localStorage; } catch { return null; } }

export function registerPwaServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !window.isSecureContext) return;
  window.addEventListener("load", () => { void navigator.serviceWorker.register("/sw.js").catch(() => undefined); }, { once: true });
}

export function draftKey(scope: "onboarding" | "profile" | "message", id = "current") { return `${DRAFT_PREFIX}${scope}.${id}`; }
export function loadSafeDraft<T>(key: string): T | null { try { const raw = storage()?.getItem(key); return raw ? JSON.parse(raw) as T : null; } catch { return null; } }
export function saveSafeDraft(key: string, value: unknown) { try { const serialized = JSON.stringify(value); if (serialized.length > MAX_DRAFT_SIZE) return false; storage()?.setItem(key, serialized); return true; } catch { return false; } }
export function clearSafeDraft(key: string) { try { storage()?.removeItem(key); } catch { /* unavailable storage is a supported fallback */ } }
export function clearAllMobileDrafts() { try { const area = storage(); if (!area) return; for (let index = area.length - 1; index >= 0; index -= 1) { const key = area.key(index); if (key?.startsWith(DRAFT_PREFIX)) area.removeItem(key); } } catch { /* unavailable storage is a supported fallback */ } }
export function lowBandwidthEnabled() { try { const stored = storage()?.getItem(LOW_BANDWIDTH_KEY); return stored === null ? deviceConnectionProfile().saveData : stored === "true"; } catch { return false; } }
export function saveLowBandwidthPreference(enabled: boolean) { try { storage()?.setItem(LOW_BANDWIDTH_KEY, String(enabled)); return true; } catch { return false; } }

export function installPromptRecentlyDismissed(now = Date.now()) { const raw = storage()?.getItem(INSTALL_DISMISS_KEY); const dismissedAt = raw ? Number(raw) : 0; return Number.isFinite(dismissedAt) && now - dismissedAt < 30 * 24 * 60 * 60 * 1000; }
export function recordInstallDismissal() { try { storage()?.setItem(INSTALL_DISMISS_KEY, String(Date.now())); } catch { /* unsupported storage */ } }
export function notificationPermissionState() { return typeof Notification === "undefined" ? "unsupported" as const : Notification.permission; }
export function deviceConnectionProfile() { const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection; return { saveData: Boolean(connection?.saveData), effectiveType: connection?.effectiveType ?? "unknown" }; }
export function simpleMemberError(error: unknown) { const message = error instanceof Error ? error.message : ""; if (!navigator.onLine || /network|fetch|failed/i.test(message)) return "We couldn’t complete that action. Check your connection and try again."; return message || "We couldn’t complete that action. Please try again."; }
