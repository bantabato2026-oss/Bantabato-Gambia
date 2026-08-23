import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, MEMBER_COPY, localizedCopy, normalizeLocale, saveLanguagePreference } from "./localization";

describe("Sprint 27 localization foundation", () => {
  it("keeps English as the only approved fallback until another reviewed dictionary is added", () => {
    expect(DEFAULT_LOCALE).toBe("en");
    expect(normalizeLocale("en")).toBe("en");
    expect(normalizeLocale("fr")).toBe("en");
    expect(localizedCopy("en")).toBe(MEMBER_COPY);
  });

  it("does not fail or claim persistence when browser storage is unavailable", () => {
    const result = saveLanguagePreference("unreviewed-language");
    expect(result.locale).toBe("en");
    expect(result.persisted).toBe(false);
  });

  it("normalizes repeated language updates to the reviewed locale before persisting", () => {
    const originalWindow = globalThis.window;
    const values = new Map<string, string>();
    const dispatched: Event[] = [];
    Object.defineProperty(globalThis, "window", { configurable: true, value: {
      localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) },
      dispatchEvent: (event: Event) => { dispatched.push(event); return true; },
    } });
    try {
      expect(saveLanguagePreference("en")).toEqual({ locale: "en", persisted: true });
      expect(saveLanguagePreference("not-reviewed")).toEqual({ locale: "en", persisted: true });
      expect(values.get("bantabato.language.v1.locale")).toBe("en");
      expect(dispatched).toHaveLength(2);
    } finally {
      Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
    }
  });
});
