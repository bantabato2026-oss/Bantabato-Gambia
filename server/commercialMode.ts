export const COMMERCIAL_MODES = ["FREE_LAUNCH", "FUTURE_PAID"] as const;
export type CommercialMode = (typeof COMMERCIAL_MODES)[number];

/**
 * Free Launch is deliberately the fail-safe default. Only an explicit server
 * configuration can enable future paid behavior; member-facing code cannot
 * toggle this mode.
 */
export function getCommercialMode(): CommercialMode {
  return process.env.BANTABATO_COMMERCIAL_MODE === "FUTURE_PAID" ? "FUTURE_PAID" : "FREE_LAUNCH";
}

export function isFreeLaunch(): boolean {
  return getCommercialMode() === "FREE_LAUNCH";
}

export const FREE_LAUNCH_NOTICE = "Bantabato is currently free during our initial launch period. Existing eligibility, privacy, verification, consent, and safety rules still apply.";
export const FREE_LAUNCH_CHECKOUT_NOTICE = "Membership is currently free during the initial launch period. No checkout, payment, transaction, or entitlement is required or created.";

export function assertCommercialMutationAllowed(action: string): void {
  if (isFreeLaunch()) throw new Error(`${action} is unavailable while Bantabato is in Free Launch mode. ${FREE_LAUNCH_CHECKOUT_NOTICE}`);
}
