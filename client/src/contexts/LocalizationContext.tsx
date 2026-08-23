import { AVAILABLE_LOCALES, DEFAULT_LOCALE, LANGUAGE_CHANGE_EVENT, languagePreference, localizedCopy, normalizeLocale, saveLanguagePreference, type SupportedLocale } from "@/lib/localization";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type LocalizationValue = {
  locale: SupportedLocale;
  copy: ReturnType<typeof localizedCopy>;
  availableLocales: typeof AVAILABLE_LOCALES;
  setLocale: (value: string) => { locale: SupportedLocale; persisted: boolean };
};

const LocalizationContext = createContext<LocalizationValue | null>(null);

export function LocalizationProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => languagePreference());

  useEffect(() => {
    const apply = (next: string) => setLocaleState(normalizeLocale(next));
    const onStorage = (event: StorageEvent) => { if (event.key === "bantabato.language.v1.locale") apply(event.newValue ?? DEFAULT_LOCALE); };
    const onLanguageChange = (event: Event) => apply((event as CustomEvent<{ locale?: string }>).detail?.locale ?? DEFAULT_LOCALE);
    window.addEventListener("storage", onStorage);
    window.addEventListener(LANGUAGE_CHANGE_EVENT, onLanguageChange);
    return () => { window.removeEventListener("storage", onStorage); window.removeEventListener(LANGUAGE_CHANGE_EVENT, onLanguageChange); };
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.locale = locale;
  }, [locale]);

  const value = useMemo<LocalizationValue>(() => ({
    locale,
    copy: localizedCopy(locale),
    availableLocales: AVAILABLE_LOCALES,
    setLocale: (next: string) => {
      const result = saveLanguagePreference(next);
      setLocaleState(result.locale);
      return result;
    },
  }), [locale]);

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
}

export function useLocalization() {
  const context = useContext(LocalizationContext);
  if (!context) throw new Error("useLocalization must be used inside LocalizationProvider");
  return context;
}
