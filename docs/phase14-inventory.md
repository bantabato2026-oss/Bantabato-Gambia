# Bantabato Phase 14: System Inventory and Initial Security Findings

**Status:** In progress. This is an internal hardening inventory, not a production-readiness declaration.

## Scope and architecture

Bantabato is a React 19 and Tailwind 4 single-page application backed by Express 4, tRPC 11, Drizzle ORM, and MySQL/TiDB. Application state-changing and private-data operations are exposed through the typed `/api/trpc` boundary; there are no separate application REST resources beyond OAuth and the storage proxy. Authentication is provided through Manus OAuth, with a server-signed session, and the effective user record—including its legacy `role`—is loaded from the database on every authenticated request.

| Inventory area | Current implementation boundary | Phase 14 review status |
| --- | --- | --- |
| Public routes | Marketing, legal, safety, privacy, contact, FAQ, and sign-in/register routes in `client/src/App.tsx` | Inventoried; no member data is intentionally exposed by public tRPC procedures. |
| Member routes | `/app` workspace, onboarding, profile, discovery, compatibility, international, device, photos, recommendations, billing, matches, messaging, Family Circle, verification, settings, notifications, and safety | Inventoried; client route protection is user-experience support only, with sensitive data protected by server procedures. |
| Family participant route | `/family` and `familyParticipant.*` procedures | Inventoried; purpose-specific service guards protect dashboard, feedback, and acknowledgments. |
| Operations routes | `/admin` overview plus specialized verification, reports, connections, family, recommendations, billing, notifications, safety, support, approvals, incidents, staff, audit, configuration, and country routes | Inventoried; legacy scoped routes and Phase 11 granular staff permission services coexist. |
| API contract | `server/routers.ts`: public authentication/country endpoints; protected member endpoints; scoped legacy operations; active-staff Operations Center endpoints | Inventoried; every procedure accepts server-resolved `ctx.user`, not a user, role, subscription, verification, or safety claim from the client. |
| Domain services | Profile/discovery/compatibility, messaging, readiness, Family Circle, recommendations, billing/payment boundary, notifications, integrity, Operations Center, international policy, legacy operations, and storage services | Inventoried; object-level checks are performed by the relevant service instead of trusting route parameters alone. |
| Data model | 80+ normalized tables for members, privacy, messaging, safety, billing, notifications, recommendations, international settings, and operations | Inventoried; schema is additive through migrations `0000`–`0016`. |
| Migrations | 17 ordered SQL migrations under `drizzle/` | Inventoried; historic index/foreign-key replacements exist in migrations `0002`, `0012`, and `0014`, with no destructive row deletion found in the static scan. |
| Storage | Randomized object-key helper, direct signed upload, private signed download helper, and `/manus-storage/*` redirect proxy | Inventoried; verification documents and voice notes use server-authorized signed URLs; direct proxy behavior needs hardening review. |
| PWA and client storage | Static-only service worker; safe onboarding/profile/message draft helper; low-bandwidth and install-dismissal preferences | Inventoried; service worker excludes `/api/`, `/manus-storage/`, and Manus runtime paths. |
| Providers and background work | Payment, email, SMS, push, calling, verification, and scheduled-work boundaries are provider-ready only unless separately configured | Inventoried; no Phase 14 work may claim a provider or worker is live without evidence. |

## Authentication, session, and authorization boundary

The OAuth callback validates an opaque state nonce against a one-time cookie, exchanges the authorization code server-side, upserts the authenticated platform user, creates the signed session, and redirects to the application. The signed token carries only platform identity metadata; the server looks up the effective user record for every protected request. `protectedProcedure` requires this server-derived identity. Legacy operational controls then use `requireOperationalAccess`, while the Phase 11 Operations Center resolves an active `staffProfiles` record and its explicit role-template/override permissions.

The current client includes a preview/WebView fallback that copies a session value from `sessionStorage` into an `Authorization: Bearer` header when cookies are unavailable. This fallback is intended for preview compatibility, but it makes session-storage scope, cleanup, and production enablement a Phase 14 hardening concern. The client also stores non-secret runtime user metadata in `localStorage`, which is unnecessary for the core application workflow and is queued for reduction.

## Object-access and privacy boundary

Member profile views require an active viewer profile, exclude self and blocked relationships, reject inactive/hidden/deleted targets, and construct a field-by-field response based on the target member's server-enforced audience settings. Location presentation is similarly mediated through country, relationship, and declared detail-level policy. Messaging checks both match participation and current conversation state, then rejects blocks before returning messages, state, voice links, or mutations. Family Circle, readiness, recommendation, billing, notification, integrity, and Operations Center services each expose their own bounded contract rather than accepting client-supplied state.

The current inventory found dedicated server-side guards for the highest-value identifier classes: profile IDs, interest IDs, conversation IDs, message IDs, voice-message IDs, Family Circle links/shares/acknowledgments, recommendation IDs, subscription IDs, notification IDs, verification records, report/case IDs, enforcement/appeal IDs, staff identities, tickets, incidents, approvals, and country-policy IDs. Phase 14 regression work will validate these guards with deliberately substituted identifiers rather than treating route visibility as authorization.

## Media, storage, and cache boundary

Profile photos, identity documents, and voice notes are written through a storage helper that appends a random suffix to a caller-provided prefix. Verification-document review and voice-note playback request a storage presigned GET URL only after the relevant service has established staff scope or conversation membership. Identity-document, safety-evidence, and voice-note bytes are not placed in the PWA cache. The service worker caches only its application shell and same-origin static asset responses, and explicitly declines private API and storage paths.

The `/manus-storage/*` redirect proxy can resolve any supplied storage key into a new backend-signed redirect without application-level authentication. Although member object keys are randomized, this route must be treated as a possession-based URL and is therefore queued for a Phase 14 hardening decision. The review must preserve any intentionally public deployment assets while preventing private verification, voice, and member-media keys from being served through a general unauthenticated proxy.

## Initial findings queued for remediation and regression tests

| Finding | Risk | Planned Phase 14 treatment |
| --- | --- | --- |
| Session lifetime is configured for one year and the preview bearer fallback currently runs without a production-host restriction. | Long-lived browser-held token exposure increases impact if session storage is accessed by malicious script. | Shorten application session lifetime, limit fallback usage to the preview host, clear unnecessary local user metadata on logout, and add session/configuration tests. |
| The Express JSON and URL-encoded parsers accept payloads up to 50 MB. | Excessive body size expands denial-of-service exposure beyond the documented media limits. | Lower the boundary to safely cover the largest accepted base64 verification document and reject larger request bodies. |
| No shared request-level rate-limiting layer currently protects sensitive tRPC mutations. | Repeated reports, invitations, uploads, and payment-start attempts can create abusive load before service-specific checks apply. | Add a bounded, configurable in-memory request limiter with conservative route classes and focused behavior tests. |
| Upload validation trusts MIME declarations and size but does not yet verify common image/audio/document signatures. | A mislabeled file can be stored or later interpreted contrary to its declared type. | Add signature validation for the accepted image, PDF, and voice containers; retain strict MIME and size checks. |
| `staffSessionControls` records are created/revoked but are not currently attached to every privileged request-time permission evaluation. | Staff-session revocation records may not invalidate an already authenticated operational session. | Bind a per-session reference to server-side authorization where compatible, reject revoked/expired controls, and add adversarial permission tests. |
| Error boundary/client cache subscribers write raw error objects to browser logs. | Development diagnostics may reveal implementation detail to someone with device-console access. | Replace raw client logging with privacy-safe diagnostic summaries and maintain user-safe messages. |
| User-generated text is Zod-bounded but lacks a centralized defensive text normalization rule. | Inconsistent trimming/control-character handling across profile, feedback, ticket, and member-generated text fields. | Add narrow reusable input hardening without rewriting or mutating valid member content; confirm React's default escaping remains in use. |

## Positive controls confirmed during inventory

The inventory confirmed that the system does not depend on a client-provided role, member ID, payment state, verification state, or safety state for sensitive decisions. Operational permission defaults are explicit rather than inherited merely because a user is staff, high-impact Operations Center permissions require a recent reauthentication timestamp, and policy utilities prohibit self-approval and expired approval decisions. The PWA excludes API and storage routes from caching, all documented provider integrations remain provider-independent, and no live calling capability is implemented.

## Next audit steps

Phase 14 will implement only hardening work arising from this inventory: session and request controls, least-privilege enforcement, strict media validation, safe error/diagnostic behavior, private-storage boundary review, and regression coverage. The eventual launch report will clearly separate implemented controls from configuration or operational dependencies such as backups, monitoring, provider credentials, and scheduled worker deployment.
