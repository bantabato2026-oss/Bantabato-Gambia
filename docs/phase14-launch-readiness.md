# Bantabato Phase 14: Launch-Readiness and Operational Boundaries

**Status:** This document records the current implementation and configuration boundaries. It does not assert that external providers, backups, monitoring, or scheduled workers are operational unless that status is evidenced here.

## Production readiness matrix

| Area | Status | Evidence and condition | Launch blocker? |
| --- | --- | --- | --- |
| Application build | **READY** | `pnpm check` and the production Vite/esbuild build complete; authenticated and operations routes are code-split. | No. |
| HTTPS and domain | **CONFIGURED** | The managed deployed domain uses HTTPS. Production response middleware emits HSTS only in production. Custom-domain validation remains an operator responsibility. | No. |
| Authentication | **READY WITH CONDITIONS** | OAuth callback validates state, sessions are signed and database-backed for effective identity, secure cookies are used on HTTPS, and application sessions now expire after 30 days. OAuth availability remains a platform dependency. | No. |
| Authorization and operations | **READY** | Protected procedures, scoped legacy operations, granular staff permissions, request-bound staff-session checks, fresh-reauthentication gates, and independent approval policies are implemented. | No. |
| Database | **CONFIGURED** | Drizzle schema and migrations `0000`–`0016` are present, with application database access kept server-side. Backup verification is not available from this project. | No, if an operator confirms managed database backup and recovery ownership before launch. |
| Storage | **CONFIGURED** | Private bytes are accessed with service-authorized signed links. The general storage redirect proxy is restricted to an explicit `public/` prefix. Storage durability and backup policy need platform confirmation. | No, if platform storage lifecycle and backup expectations are accepted. |
| Messages and voice notes | **READY** | Mutual-match authorization, block checks, pagination, signed voice retrieval, sender-only deletion, binary signature checks, bounded payloads, and anti-abuse limits are implemented. | No. |
| PWA and offline | **READY WITH CONDITIONS** | Service worker caches only static shell/assets and excludes APIs, storage, and runtime paths. Safe drafts remain local. Offline use is intentionally limited. | No. |
| Notifications | **PROVIDER-READY** | In-app events, preferences, quiet hours, idempotency, queue records, and provider availability states are implemented. Email, SMS, and push are not live without an explicitly configured delivery provider and worker. | No, provided public copy does not claim external delivery. |
| Payments | **PROVIDER-READY** | Plans, entitlements, transactions, idempotency, reconciliation, and provider state boundaries are implemented. No payment provider credentials or live checkout are configured. | No, provided payments remain unavailable or clearly provider-dependent. |
| Verification | **READY WITH CONDITIONS** | Manual identity-document submission and scoped staff review exist. No automated identity-verification provider is connected. | No. |
| Calling | **NOT IMPLEMENTED** | Consent and readiness policy exist; no calling provider, WebRTC capability, or live-call claim is implemented. | No. |
| Background jobs | **NOT DEPLOYED** | Expiry and queue processors are callable as bounded operational actions. No recurring scheduler/worker is asserted by this project. | No, but operational owners must define how expiry, reconciliation, and external delivery jobs will run before enabling corresponding providers. |
| Monitoring and error tracking | **REQUIRES CONFIGURATION** | Development logs and internal operational incidents exist. A production error-tracking, alerting, and retention destination is not configured here. | No for controlled beta; review before broad production launch. |
| Backups and recovery | **REQUIRES CONFIRMATION** | The application has no self-managed backup process. Database and storage backup, recovery-point, and recovery-time guarantees are not evidenced in this repository. | **Yes for a public production launch until an operator confirms ownership and recovery procedure.** |

## Deployment configuration and secrets

The runtime reads the database URL, session-signing secret, OAuth configuration, owner identity, and server-side Forge storage credentials from environment variables. No secret values are written to this repository or exposed in client code. Front-end build variables contain only the configured public runtime endpoints and project identifiers supplied by the platform.

Before a production launch, an operator should confirm that each production secret is distinct from non-production environments, rotation ownership is documented, OAuth redirect configuration uses the production origin, and no debug credentials have been granted operational scope. Payment, email, SMS, push, calling, and automated-verification credentials must not be added unless the corresponding provider activation, secret management, error handling, and operational support plans are complete.

## Recovery and incident response baseline

| Incident | First safe action | Operational follow-up | Current limitation |
| --- | --- | --- | --- |
| Suspected account compromise | Revoke the relevant staff-session control or change staff status through the approval workflow; preserve audit events. | Review authentication and audit history; require a fresh sign-in; restrict affected operations if needed. | End-user account-recovery automation is not separately implemented. |
| Private-data exposure concern | Restrict the affected member, media, or staff workflow; create a privacy-minimized operational incident. | Preserve references and audit events; review storage access, roles, and downstream notifications; notify affected parties under an approved response plan. | No external breach-notification or legal workflow is configured. |
| Storage failure | Stop retry loops that could duplicate uploads; present a safe retry state. | Confirm provider status, inspect server-safe diagnostics, and reconcile affected metadata before reopening access. | Storage-provider monitoring and recovery guarantees are platform dependent. |
| Database failure | Return safe retryable errors; do not invent account, billing, or safety outcomes. | Escalate to managed database support and use confirmed recovery procedure. | Backup/restore capability is not evidenced in project code. |
| Notification or payment provider outage | Set the relevant provider availability to unavailable and record an incident. | Keep in-app state authoritative; reconcile queues/transactions only after provider recovery is independently confirmed. | External provider delivery and payment processing are not live. |
| Authentication outage | Show a generic, non-sensitive sign-in failure; do not bypass authentication. | Check OAuth configuration and platform availability; retain incident timeline. | OAuth provider availability is external. |

## Release safeguards implemented in Phase 14

The application now disables the Express technology banner, limits JSON and URL-encoded request bodies to a size compatible with accepted base64 identity documents, prevents API caching, applies production security headers, enforces sensitive tRPC rate limits, and returns generic messages for unexpected server errors. It also uses request-bound staff-session controls, conditional updates for approval decisions, server-side file signature checks, input normalization for member-controlled text, public-only proxy storage keys, and client-side cleanup of obsolete runtime metadata.

The production build now code-splits authenticated and operational route modules. The generated main application chunk is approximately 83 KB before gzip; large cross-cutting UI and React vendors remain shared cached chunks. This is an evidence-based build-output observation, not a measured real-network performance guarantee.

## Dependency-review outcome

The production dependency audit was run during Phase 14. Unused AWS SDK, markdown-rendering, and chart-library packages were removed after source-reference checks; Axios, tRPC, Drizzle, NanoID, and Express were upgraded to compatible patched releases. The final `pnpm audit --prod` result reports **no known production vulnerabilities**. The removed template-only chat renderer now uses React’s escaped plain-text rendering, and the unreferenced chart wrapper was removed with its dependency; neither was part of a Bantabato member workflow.

## Required operator actions before broad production launch

1. Confirm managed database and object-storage backup, recovery ownership, and restoration steps. Do not claim recovery testing unless it is actually performed.
2. Configure privacy-safe production monitoring and alerting with a documented retention policy that excludes authentication tokens, private messages, documents, safety evidence, and payment credentials.
3. Decide whether scheduled expiry, notification-delivery, reconciliation, and retention processing is needed for enabled providers; deploy and monitor a scheduler before declaring those operations automatic.
4. Keep email, SMS, push, payment, calling, automated verification, and exchange-rate capabilities marked unavailable until provider activation is separately tested and approved.
5. Review and rehearse member-support, Trust & Safety, and incident-escalation ownership, including the conditions for restricting access and preserving auditable evidence references.
