# BANTABATO — MAJOR PRODUCT CAPABILITY SPRINT 6

## Safety Center, Reporting, Moderation & Member Protection

Sprint 6 audited and completed genuine internal safety-product gaps. The work preserves server authority, privacy, scoped and reversible enforcement, independent approval for high-impact action, and a no-score safety model. It does not activate a provider, create a real account, send external communication, create automatic permanent sanctions, change infrastructure, or claim launch readiness.

| Requested safety area | Sprint 6 completion |
|---|---|
| Member Safety Center | The member route now explains safe use of report and block controls, help boundaries, no-score policy, factual account actions, appeal status, private report history, and directed block management. It includes loading, empty, error, retry, confirmation, disabled, and mobile states. |
| Blocking lifecycle | Existing server-authoritative blocks remain the immediate discovery, recommendation, interest, connection, messaging, voice, and readiness boundary. Members can now view and remove only their own directed blocks. Removal does not reopen prior matches, conversations, safety actions, readiness permissions, or withdrawn recommendations. |
| Reporting lifecycle | Reports now carry a reporter-scoped client request key with a durable uniqueness constraint and insert-race recovery. A retried or concurrent same-key report returns the original record; a reused key with different concern data is rejected. Message reports avoid repeating moderation and revocation side effects on a duplicate. |
| Member report control | Members see only their own factual report progression and can update factual details or withdraw a report only while it remains pre-review. Withdrawal closes—not erases—the record, retains audit history, and dismisses only still-new linked signals. Internal notes, evidence, reporter identities, staff identities, and methods remain absent. |
| Appeals | Existing eligible appeal submission and independent-review protections remain. Members can withdraw only a submitted or information-requested appeal; the original enforcement record remains auditable. A decision maker cannot review their own enforcement appeal. |
| Staff moderation | Safety Operations now exposes policy-limited proposal controls for warning, discovery, messaging, connection, verification, integrity-hold, and temporary-suspension actions, with explicit scope and required expiry. It also exposes authorized action revocation. Permanent removal remains intentionally unavailable in this interface. |
| Four-eyes and replay | A proposer cannot approve their own high-impact action. Guarded proposed-to-active update prevents approval replay. A proposed action whose expiry has passed is marked expired and cannot activate. |
| Scoped enforcement and expiry | Enforcement-owned conversation restrictions now record the action that caused them. On expiry or revocation, only still-restricted conversations linked to that action are restored, avoiding automatic reopening of blocked, reported, closed, paused, or manually restricted threads. Active temporary action expiry retains audit events and creates member-safe in-app state notification through the existing boundary. |
| Safety integrations | Block and report paths continue to revoke readiness, withdraw appropriate recommendations, restrict/close affected interaction paths, and enforce current server state on messages and voice access. Family Circle remains unable to view reports, safety cases, decisions, private media, documents, or conversation content. |
| Verification and notifications | Existing verification status guidance and centralized privacy-safe safety notification architecture remain in place. Sprint 6 adds safety-action expiry/revocation state notifications without exposing case detail or enabling an external channel. |
| Privacy and no-score rules | Reporter identity, safety metadata, evidence, staff-only content, documents, and private conversations remain server-gated. No Trust Score, reputation score, popularity/engagement score, Premium safety advantage, protected-trait scoring, or automatic permanent sanction was introduced. |
| Focused regressions | `server/sprint6SafetyProtection.contract.test.ts` adds eight safety contracts for duplicate/replay report protection, report lifecycle, block removal, four-eyes/expiry, action-owned restriction restoration, appeal withdrawal, cross-module boundaries, privacy, no-score, and mobile/recovery states. An existing state-integrity contract was updated to assert the stronger restriction provenance. |

## Validation record

The final command `pnpm check && pnpm test && pnpm build && pnpm audit --prod --audit-level=high` passed with **289 tests across 64 files**. TypeScript passed, the production build passed, and the production dependency audit reported no known vulnerabilities. Additive migrations `0024_daffy_red_skull.sql` and `0025_cheerful_iron_monger.sql` were reviewed and applied: they add report request/lifecycle metadata and conversation restriction provenance only.

The desktop and 375px read-only review is recorded in `docs/major-product-capability-sprint-6-visual-validation.md`. The Safety Center rendered a member-safe no-score, report, appeal, and block-management presentation. The Safety Operations route rendered its constrained workflow and no-score boundary. The review did not execute member or staff actions.

## Remaining genuine gaps and classification

The safety product is materially more coherent internally but **not launch-ready**. Authorized fictional multi-member browser validation remains needed for report retry/replay, block/unblock effects, report update/withdrawal, appeal withdrawal, high-impact approval expiry, enforcement expiry/revocation restoration, notification creation, evidence authorization, private-voice denial, and screen-reader behavior. Provider delivery, real support escalation, legal/policy review, and operational staffing remain external-action work.

> The member report controls deliberately avoid providing a public or private detailed investigation tracker. They provide only factual, member-safe states and supported pre-review edits or withdrawal.

## Highest-value next internal capability

Build an **authorized fictional multi-member safety scenario harness** that renders the exact cross-account flows without seeding a live database: directed block, report submission/retry, pre-review update/withdrawal, safety action proposal/second approval/expiry/revocation, appeal withdrawal, and cross-module denial assertions. It should remain test-only and never create real users or imply browser execution until authorized.
