# BANTABATO — Authenticated Experience State Audit

**Prepared:** 19 August 2026  
**Scope:** Shared member and administration state handling. The audit does not fabricate authenticated accounts, provider responses, private data, or protected-route execution.

## Route inventory

The router currently registers **20 member routes** and **22 administration routes**. Member routes inherit `MemberShell`; administration workspaces inherit `AdminAccessGate` and the permission-aware `AdminShell` pattern. This gives the checkpoint two high-leverage shared consolidation points without changing the underlying server authorization model.

| State | Member route applicability | Administration route applicability | Current evidence | Standardization decision |
| --- | --- | --- | --- | --- |
| Loading | Session bootstrap, route lazy load, query-backed pages | Session bootstrap, access query, queue pages | `MemberShell` uses manual skeleton blocks; `AdminAccessGate` uses an empty app-loading area. | Replace shared guard loading with labelled shared skeleton/state surfaces. |
| Ready | All authenticated member journeys | All permitted workspaces | Existing route data and page shells. | Preserve route-specific ready content. |
| Empty | Discovery, recommendations, messages, family, notifications, billing history, safety/appeals, photo queue | Verification, report, support, incident, approval, audit, photo, story, country, billing queues | Existing per-route copy varies. | Retain logical route copy; add shared surface only where safe and high-value. |
| Error / retry required | Query, save, upload, message, voice, notification, billing metadata, story action failures | Queue, review, permissions, approval, configuration, and access failures | Most mutation failures use privacy-safe toasts; route-query errors are not uniformly presented. | Standardize global and shared-shell recovery; do not replace domain-specific form/upload recovery already holding draft state. |
| Unauthenticated | Every `/app` route | Every `/admin` route | Shell gates redirect users to sign in. | Reuse shared state surface while retaining separate member versus operations language. |
| Unauthorized / restricted | Member state is server-authoritative and member-specific | Admin role and granular permissions | `AdminAccessGate` rejects non-admin users; server procedures enforce granular permissions. | Show clear permission-aware state without exposing sensitive member data or required permission names. |
| Pending review | Verification, photos, readiness, success-story and review-linked state | Verification, reports, photos, stories, approvals, staffing and safety queues | Server data is authoritative. | Preserve existing domain-specific pending wording; no generic state may imply approval. |
| Offline | All member pages where the network hook detects offline | Operational pages are connection-dependent | Member shell already shows a privacy-safe offline banner. | Update to consistent reconnection language; do not queue safety, payment, or private operations. |
| Recovering | Safe local profile/onboarding/message drafts; retry-capable operations | Safe query refetch and operation reattempts | Existing local-draft and retry boundaries. | Do not discard entered data; expose recovery only where the existing domain workflow safely supports it. |

## Verified inconsistencies

| Finding | Risk | Safe correction |
| --- | --- | --- |
| Member bootstrap uses a manual pulse composition while admin bootstrap renders a blank loading region. | Screen readers receive no consistent loading announcement and visual language differs. | Reuse the labelled `StateSkeleton` from both shared guards. |
| Member and admin unauthenticated/restricted guards use hand-authored card structures. | Language and recovery treatment diverge between protected experiences. | Reuse `StatePanel` inside existing branded guards; keep role-sensitive wording. |
| The operations-access navigation query has loading logic but no shared error/recovery presentation. | A temporary query failure can reduce navigation without explaining recovery. | Add a privacy-safe retry panel without exposing permission metadata. |
| Offline message uses factual privacy language but not the established reconnection phrasing. | State voice differs from the standard. | Use a consistent “You’re offline. We’ll reconnect…” statement with the same privacy boundary. |

## Evidence boundary

Public desktop and mobile routes were visually reviewed in the preceding checkpoint. Protected route rendering, keyboard traversal, screen-reader announcements, photo upload, messaging, voice, staff review, and recovery behavior have **not** been exercised with real authenticated accounts because no authorized synthetic account or isolated staging environment exists. Automated contracts and shared-shell source tests can verify the structural state model but do not replace that blocked evidence.
