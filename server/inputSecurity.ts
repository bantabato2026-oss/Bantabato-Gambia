const DISALLOWED_CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

export function normalizeUserText(value: string) {
  if (DISALLOWED_CONTROL_CHARACTERS.test(value)) {
    throw new Error("This text contains unsupported control characters");
  }
  return value.normalize("NFC");
}

export function normalizeOptionalUserText(value: string | null | undefined) {
  return typeof value === "string" ? normalizeUserText(value) : value;
}

export function normalizeTextRecord<T extends Record<string, unknown>>(record: T): T {
  const normalized = Object.fromEntries(Object.entries(record).map(([key, value]) => {
    if (typeof value === "string") return [key, normalizeUserText(value)];
    if (Array.isArray(value) && value.every(item => typeof item === "string")) return [key, value.map(item => normalizeUserText(item))];
    return [key, value];
  }));
  return normalized as T;
}
