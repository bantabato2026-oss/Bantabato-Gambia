# BANTABATO — Concurrency Assurance & Administration Experience Audit

## Private-message concurrency evidence

The current request-key foundation scopes `clientRequestId` to sender and conversation, performs normal active-mutual-match authorization before lookup, and has a database uniqueness constraint. It returns the existing message on a duplicate-key retry and does not repeat conversation touch, interaction signals, notification, or message-sent event. This protects ordinary retry idempotency.

Two verified assurance gaps remain. First, the existing request lookup does not compare a privacy-safe representation of the intended payload, so a reused key with a materially different text or voice payload would be treated as the original request rather than explicitly rejected. Second, deduplicated outcomes leave no bounded, content-free audit/event evidence. This checkpoint should add a server-only request fingerprint, compare it on every existing/duplicate lookup, reject a conflict, and record an auditable deduplication outcome without storing content, a request key, token, document, or media.

## Administration route-state evidence

The shared `AdminAccessGate` and `AdminShell` already cover authentication loading, unauthorized access, permission-aware navigation loading, and an operations-access read failure. Active administration page modules still contain verified local pulse, ad-hoc error, or empty-state surfaces. The following routes are appropriate for targeted shared-state adoption.

| Operational area | Active route modules | Verified improvement focus |
| --- | --- | --- |
| Verification administration | `AdminOperations` verification queue/case | Pending, claimed, approved/rejected, resubmission, expired/restricted, permission/error/retry states without document disclosure. |
| Trust & Safety | `AdminReportsQueuePage`, `AdminReportCasePage`, `AdminSafetyOperations`, `AdminConnectionReviews` | Case/review/approval/escalation/appeal/recovery explanations; preserve four-eyes and no automatic permanent sanction. |
| Operations Center | `AdminOperationsManagement` members/staff/audit/configuration | Read-query skeleton/error/empty surfaces and permission-aware metadata guidance. |
| Support | `AdminSupport` | Ticket loading/error/empty, response/recovery, and scope boundary panels. |
| Editorial | `AdminContentReview` success story/photo review | Submission/screening/copy/pending independent approval/published/withdrawn/rejected/expired status copy while retaining source privacy. |
| Country operations | `AdminCountries` | Gambia, Senegal, diaspora, policy draft/pending approval/error/recovery copy without ranking or immigration claims. |
| Permissions and approvals | `AdminOperationsManagement` staff; `AdminOperationalQueues` approvals | Permission denied, own-action prevention, independent approval requirement, pending/expired/retry explanations. |
| Audit and incidents | `AdminOperationsManagement` audit; `AdminOperationalQueues` incidents | Read-only audit/incident loading/error/empty and escalation/recovery states without exposing unnecessary member data. |
| Finance operations | `AdminBilling` | Existing provider boundary is strong; local skeleton/error surfaces should use shared primitives. |

## Scope decision

The implementation should add a compact shared `AdminDataState` composition only if it is a thin semantic adapter over existing `StatePanel` and `StateSkeleton`; it must not create a competing state system. Target active modules first, use existing permission/server responses, and leave unverified external/provider conditions as factual configuration-required states.

## Product-completeness method

The final audit will inspect public, member, family participant, administration, billing, country, mobile/PWA, security/privacy, and provider-bound routes and classify each meaningful remaining gap as **COMPLETE**, **PARTIAL**, **MISSING**, **EXTERNAL DEPENDENCY**, or **BLOCKED**. It will not create features merely to increase a count.
