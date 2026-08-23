# BANTABATO — Major Product Capability Sprint 13

## Administration, Operations & Trust & Safety Command Center

Sprint 13 audited the existing staff product and completed two genuine cross-workspace gaps: a permission-scoped factual Command Center workload view and a minimum-necessary staff member projection. Specialist Verification, Photo Review, Trust & Safety, Appeals, Enforcement, Family Circle, Editorial, Finance, Membership, Beta, Audit, Notification, Approval, and Staff-permission workflows were retained rather than duplicated. No external provider, real staff/member account, case, report, payment, verification decision, invitation, enforcement, or operational history was created.

| Requested area | Sprint 13 result |
|---|---|
| 1. Admin Command Center audited | The overview now includes factual, server-counted cards only when the active staff identity has the corresponding permission: verification, photos, safety cases, appeals, active/proposed safety actions, Family Circle attention, editorial submissions, refunds, membership attention, beta invitations, support, approvals, incidents, and unread notification records. Empty workload is shown as `0 active`; no vanity or popularity metric was added. |
| 2. Member operations | Controlled member search now links to a dedicated operational summary with server-side role checks and audit evidence. |
| 3. Member profile projection | The projection separates **member-visible**, **operational**, **restricted**, and **staff-only** data. Identity documents, messages, private Family Circle content, payment credentials, safety evidence, and unrelated data are excluded. |
| 4. Verification operations | The existing queue, case, claim, temporary private-document access, decision, duplicate/stale update guard, audit trail, and member-safe message paths remain authoritative. |
| 5. Photo review operations | The existing private queue, temporary review URL, approval/rejection, member-safe note, duplicate protection, and eligibility recalculation remain authoritative. The Command Center now exposes pending photo workload where permitted. |
| 6. Trust & Safety operations | Existing signals, proportionate enforcement, restrictions, suspensions, integrity holds, expiry, revocation, safety case details, evidence references, appeals, and recovery paths remain in the scoped Safety Operations workspace. No Trust Score exists. |
| 7. Report management | Existing report queue, claim, state transitions, controlled actions, internal notes, member-safe explanations, resolution records, and audit trail remain server-authoritative. |
| 8. Appeals | Existing member-owned appeal workflow and separate reviewer, decision, revocation, and member-safe notification paths remain available through authorized Safety Operations. The overview now counts pending appeal work where permitted. |
| 9. Enforcement controls | Existing idempotent proposal, second-review approval when required, scoped activation, expiry, revocation, and enforcement-owned restoration behavior remains unchanged. |
| 10. Four-eyes approval | Existing requester-versus-approver separation, required-role check, expiry check, pending-state compare-and-update, duplicate-decision rejection, and audit evidence remain enforced. |
| 11. Family Circle operations | Existing metadata-only oversight, Wali/Guardian review, and scoped restriction remain intact. The overview exposes only invitation/Wali/restriction attention count, not private Family Circle material or conversations. |
| 12. Editorial operations | Existing consent-first submission, screened presentation copy, independent publication approval, fresh-auth publication gate, withdrawal, and public-removal lifecycle remain intact. The overview counts only consent-scoped editorial work. |
| 13. Finance operations | Existing provider-neutral transactions, refund review, reconciliation findings, and lifecycle state remain intact. No money moved, provider connected, refund completed, or discrepancy auto-corrected. |
| 14. Membership operations | Existing plan/version, price, subscription, entitlement, checkout, and provider-availability boundaries remain intact. The overview shows only lifecycle attention count where authorized. |
| 15. Invitation / beta operations | Existing closed-beta invitation, revoke, mode, pause/shutdown, and enrollment controls remain scoped and token-safe. The overview shows only pending invitation count where authorized. |
| 16. Staff permissions | Existing server-side staff identity, role template, override, fresh-auth, route, API, and record-level enforcement remains authoritative. Navigation is only a convenience layer. |
| 17. Staff search | Search remains paginated, minimum-necessary, identifier/name limited, audit-recorded, and non-exporting. |
| 18. Operational case management | Existing specialist case pages remain the authoritative place for allowed actions, audit history, approval requirements, and resolution. The new member summary does not merge unrelated case content. |
| 19. Audit-event experience | Existing append-only minimized audit list remains permission-gated. The member projection includes only permitted audit references, never metadata payloads or private content. |
| 20. Staff notifications | Existing notification operations remain privacy-safe delivery/configuration management. The Command Center exposes factual unread-record workload only; it does not create engagement scoring or a fabricated alert feed. |
| 21. Recovery states | Shared loading, empty, error, retry, and unavailable treatment was retained. The new unknown-member route truthfully shows no record rather than exposing data or reporting a false success. |
| 22. Concurrency / stale actions | Existing verification, report, approval, enforcement, refund, beta, editorial, and Family Circle guards remain. Sprint 13 preserves approval pending-state compare-and-update and adds no client-owned source of truth. |
| 23. Security / IDOR | The new summary is `staffOnlyProcedure` plus server-side `members.view` permission. Direct calls from members or unscoped administrators are covered by regression tests. |
| 24. Mobile administration | Read-only 375 px review confirmed a single-column operational-card sequence, touch-friendly lookup, readable recovery card, and no dependence on desktop tables. |
| 25. Accessibility and motion | Existing shared labels, headings, explicit actions, error states, focusable links/buttons, reduced-motion foundation, and low-bandwidth boundary were retained. No unverified screen-reader execution is claimed. |
| 26. Cross-module integrity | Existing verification/photo eligibility, safety connection/recommendation revocation, provider-neutral finance, editorial consent, Family Circle isolation, and approval paths remain covered. No policy shortcut was introduced. |
| 27. Premium neutrality | Existing policy and finance boundaries retain that membership cannot bypass verification, safety, blocks, restrictions, privacy, Family Circle, eligibility, consent, staff authority, or matching. |
| 28. Tests added | Added `server/sprint13AdministrationOperations.contract.test.ts` and extended direct administrative authorization coverage for the new member-summary endpoint. |

## Validation Evidence

| Validation | Result |
|---|---|
| Regression suite | **325 tests across 70 files passed** |
| TypeScript | Passed (`pnpm check`) |
| Production build | Passed (`pnpm build`) |
| Production dependency audit | Passed; no known production dependency vulnerabilities (`pnpm audit --prod --audit-level=high`) |
| Desktop review | Read-only review of `/admin`, `/admin/members`, and `/admin/members/1` at 1280 px; Command Center workloads, lookup, and unavailable-member recovery were legible. |
| Mobile review | Read-only review of the same routes at 375 px; cards, search, and recovery remained readable and touch-oriented. |

## Classification and Remaining Internal Capability

The product-completeness classification is **internally strengthened for Sprint 13 Administration and Operations scope; launch remains NOT READY**. The highest-value remaining internal capability is a **test-only, multi-role operational journey harness** covering the actual role matrix from permission removal through member lookup, verification/photo decision, report/enforcement/appeal, Family Circle restriction, editorial approval, refund review, beta invitation, and stale/concurrent conflicts using fictional fixtures only. It should not create real accounts or claim cross-account browser execution.
