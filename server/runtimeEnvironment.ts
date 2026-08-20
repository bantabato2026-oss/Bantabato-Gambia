export type RuntimeEnvironment = "development" | "staging" | "production";

/**
 * Derives environment only from server-injected runtime values. Client input,
 * request parameters, and database values must never select an environment.
 */
export function getRuntimeEnvironment(env: NodeJS.ProcessEnv = process.env): RuntimeEnvironment {
  const configured = env.APP_ENV?.trim().toLowerCase();
  if (configured === "staging" || configured === "production" || configured === "development") return configured;
  return env.NODE_ENV === "production" ? "production" : "development";
}
