export type ServiceHealth = {
  status: "ok";
  service: "bantabato";
  timestamp: string;
};

/**
 * Provides a process-liveness response only. It intentionally does not query
 * member data, report database/provider reachability, or disclose build and
 * environment metadata. External monitoring may safely poll this route once
 * an owner configures it, but the route alone does not mean monitoring exists.
 */
export function getServiceHealth(now: Date = new Date()): ServiceHealth {
  return {
    status: "ok",
    service: "bantabato",
    timestamp: now.toISOString(),
  };
}
