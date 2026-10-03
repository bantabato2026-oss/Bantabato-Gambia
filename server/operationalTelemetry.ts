export const OPERATIONAL_EVENT_CATEGORIES = [
  "application_health",
  "database_connectivity",
  "authentication_failure",
  "authorization_failure",
  "unexpected_server_error",
  "queue_failure",
  "storage_failure",
  "safety_workflow_failure",
] as const;

export type OperationalEventCategory =
  (typeof OPERATIONAL_EVENT_CATEGORIES)[number];
export type OperationalSeverity = "info" | "warning" | "error" | "critical";

export type OperationalEvent = {
  category: OperationalEventCategory;
  severity: OperationalSeverity;
  code: string;
  occurredAt: string;
  requestId?: string;
  operation?: string;
};

const SECRET_OR_PRIVATE_KEYS =
  /password|token|secret|cookie|authorization|credential|document|message|marriage|family|location|email|phone|storagekey|profile/i;
const PRIVATE_VALUE_PATTERNS =
  /@|BEGIN\s+(?:RSA|OPENSSH|PRIVATE)|eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\./i;

/**
 * Produces a deliberately small event envelope. Callers must never pass raw
 * request bodies, member rows, provider responses, or exception messages here.
 */
export function normalizeOperationalEvent(input: {
  category: OperationalEventCategory;
  severity: OperationalSeverity;
  code: string;
  occurredAt?: Date;
  requestId?: string;
  operation?: string;
  details?: Record<string, unknown>;
}): OperationalEvent {
  const safeCode = input.code
    .trim()
    .replace(/[^a-zA-Z0-9_.-]/g, "_")
    .slice(0, 96);
  const event: OperationalEvent = {
    category: input.category,
    severity: input.severity,
    code: safeCode || "unknown",
    occurredAt: (input.occurredAt ?? new Date()).toISOString(),
  };
  if (input.requestId && /^[a-zA-Z0-9._:-]{1,128}$/.test(input.requestId))
    event.requestId = input.requestId;
  if (input.operation && /^[a-zA-Z0-9._:-]{1,128}$/.test(input.operation))
    event.operation = input.operation;
  return event;
}

export function containsPrivateOperationalData(value: unknown): boolean {
  if (typeof value === "string") return PRIVATE_VALUE_PATTERNS.test(value);
  if (Array.isArray(value)) return value.some(containsPrivateOperationalData);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(
    ([key, nested]) =>
      SECRET_OR_PRIVATE_KEYS.test(key) || containsPrivateOperationalData(nested)
  );
}

export function operationalTelemetryReadiness(
  env: NodeJS.ProcessEnv = process.env
) {
  return {
    status:
      env.BANTABATO_MONITORING_PROVIDER_CONFIGURED === "1"
        ? ("CONFIGURED" as const)
        : ("PENDING" as const),
    provider:
      env.BANTABATO_MONITORING_PROVIDER_CONFIGURED === "1"
        ? "provider-configured"
        : null,
    note: "Provider-neutral event contracts exist; external monitoring and alert ownership are not claimed until configured and verified.",
  };
}
