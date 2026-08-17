# Authenticated Smoke-Test Execution Record

**Environment selected:** None. The preferred isolated staging environment is not configured. Production is not used because no explicitly authorized synthetic accounts, owners, backups, monitoring, or production-test safeguards are available.

| Test ID | Area | Environment | Account | Expected result | Actual result | Status | Evidence | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SMK-001 | Member login/logout/session/protected route | Staging | `TEST_MEMBER_A` | Login/routes allowed; post-logout request denied | No account/environment | **BLOCKED — EXTERNAL ACTION REQUIRED** | Capability inventory | Test account and staging required |
| SMK-002 | Profile/privacy/save/reload | Staging | `TEST_MEMBER_A` | Allowed self update; server visibility enforced | No account/environment | **BLOCKED — EXTERNAL ACTION REQUIRED** | Test-account record | Synthetic member required |
| SMK-003 | Discovery/compatibility | Staging | Members A/B | Eligible controlled profiles only; no prohibited ranking | No accounts/environment | **BLOCKED — EXTERNAL ACTION REQUIRED** | Test-account record | Synthetic counterpart required |
| SMK-004 | Mutual interest/messaging/read state/IDOR | Staging | Members A/B | Mutual-only access; unrelated resource denied | No accounts/environment | **BLOCKED — EXTERNAL ACTION REQUIRED** | Test-account record | Do not contact real members |
| SMK-005 | Voice notes/private media | Staging | Members A/B | Authorized signed access; unauthorized denied | No accounts/environment | **BLOCKED — EXTERNAL ACTION REQUIRED** | Test-account record | Synthetic media and isolated storage required |
| SMK-006 | Connection readiness/consent/revocation | Staging | Members A/B | Consent/revocation follows policy immediately | No accounts/environment | **BLOCKED — EXTERNAL ACTION REQUIRED** | Test-account record | Controlled safety events only |
| SMK-007 | Family Circle/isolation/IDOR | Staging | Member A/family participant | Scoped participant only; private resources denied | No accounts/environment | **BLOCKED — EXTERNAL ACTION REQUIRED** | Test-account record | Controlled participant required |
| SMK-008 | Recommendations/notifications | Staging | Members A/B | Existing policy, privacy-safe in-app notifications | No accounts/environment | **BLOCKED — EXTERNAL ACTION REQUIRED** | Test-account record | External delivery remains unavailable |
| SMK-009 | Safety block/report/case boundary | Staging | Members A/B/staff | Controlled report/block and scoped staff workflow | No accounts/environment | **BLOCKED — EXTERNAL ACTION REQUIRED** | Test-account record | Never create real-member safety case |
| SMK-010 | Staff login/session/revocation/least privilege | Staging | `TEST_STAFF` | Scoped tools allowed; admin action denied; revoked session denied | No account/environment | **BLOCKED — EXTERNAL ACTION REQUIRED** | Test-account record | Least-privilege staff account required |
| SMK-011 | Admin/configuration/beta/four-eyes | Staging | `TEST_ADMIN` | Authorized scope only; self-approval denied | No account/environment | **BLOCKED — EXTERNAL ACTION REQUIRED** | Test-account record | Separate requester/approver required |
| SMK-012 | Verification/private document boundary | Staging | Members/staff | Synthetic-only submission; document access scoped | No accounts/environment | **BLOCKED — EXTERNAL ACTION REQUIRED** | Test-account record | Never upload real identity documents |
| SMK-013 | Beta invitation/pause/shutdown | Staging | Member A/admin | Valid lifecycle only; invalid paths denied; state restored | No accounts/environment | **BLOCKED — EXTERNAL ACTION REQUIRED** | Test-account record | Runtime remains beta-disabled |
| SMK-014 | Billing/settings/account controls | Staging | Member A/admin | Metadata/settings/entitlements behave; no live charge | No accounts/environment | **BLOCKED — EXTERNAL ACTION REQUIRED** | Test-account record | Payment provider unavailable |
| SMK-015 | Mobile/PWA/low bandwidth | Staging | Controlled accounts | Safe login/workflows/cache/recovery | No accounts/environment | **BLOCKED — EXTERNAL ACTION REQUIRED** | Test-account record | Staged device/network execution required |
| SMK-016 | Monitoring/backup/restore | Staging | N/A | Safe event, backup verification, isolated restore | No service/target | **BLOCKED — EXTERNAL ACTION REQUIRED** | Capability inventory | Monitoring, artifact, and restore target required |

## Summary

| Test class | Total | Passed | Failed | Blocked | Not applicable |
| --- | ---: | ---: | ---: | ---: | ---: |
| Authenticated end-to-end smoke tests | 16 | 0 | 0 | 16 | 0 |

No authenticated end-to-end smoke test was converted to a pass. Automated regression evidence is maintained separately and does not substitute for these blocked controlled-account tests.
