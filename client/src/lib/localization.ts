export const DEFAULT_LOCALE = "en" as const;
export type SupportedLocale = typeof DEFAULT_LOCALE;

export const AVAILABLE_LOCALES = [
  { code: "en" as const, label: "English", nativeLabel: "English", status: "available" as const },
] as const;

export const MEMBER_COPY = {
  language: {
    label: "Language",
    englishOnly: "English is available now.",
    reviewedOnly: "New languages will appear here only after they are reviewed and added.",
    saved: "Your language choice is saved on this device.",
    unavailable: "This language is not available yet. English is still selected.",
  },
  voice: {
    available: "Voice guidance is ready when a reviewed audio guide is available.",
    unavailable: "Voice guidance is not available here. Read the text guide below.",
    playing: "Voice guidance is playing.",
    paused: "Voice guidance is paused.",
    stopped: "Voice guidance has stopped.",
    failed: "Voice guidance could not start. Read the text guide or try again later.",
    retry: "Try voice guidance again",
    textAlternative: "Text guide",
  },
  recovery: {
    offline: "You’re offline. Your draft stays on this device. Reconnect before saving.",
    stale: "This page has changed. Refresh it, then try again.",
    unavailable: "This action is not available right now. Please try again.",
  },
} as const;

const LANGUAGE_STORAGE_KEY = "bantabato.language.v1.locale";
export const LANGUAGE_CHANGE_EVENT = "bantabato:language-change";

function storage() { try { return window.localStorage; } catch { return null; } }

export function normalizeLocale(value: unknown): SupportedLocale {
  return AVAILABLE_LOCALES.some(locale => locale.code === value) ? value as SupportedLocale : DEFAULT_LOCALE;
}

export function languagePreference() {
  try { return normalizeLocale(storage()?.getItem(LANGUAGE_STORAGE_KEY)); } catch { return DEFAULT_LOCALE; }
}

export function saveLanguagePreference(locale: string) {
  const normalized = normalizeLocale(locale);
  try {
    storage()?.setItem(LANGUAGE_STORAGE_KEY, normalized);
    window.dispatchEvent(new CustomEvent(LANGUAGE_CHANGE_EVENT, { detail: { locale: normalized } }));
    return { locale: normalized, persisted: true } as const;
  } catch {
    return { locale: normalized, persisted: false } as const;
  }
}

export function localizedCopy(locale: SupportedLocale = DEFAULT_LOCALE) {
  // English is intentionally the only approved dictionary today. This stable shape
  // allows reviewed locale dictionaries to be added without scattering new copy.
  void locale;
  return MEMBER_COPY;
}
