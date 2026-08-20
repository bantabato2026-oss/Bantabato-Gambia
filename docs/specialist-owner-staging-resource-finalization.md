# BANTABATO — Specialist Owner & Staging Resource Finalization

**Scope:** Infrastructure/readiness only. **STAGING: NOT CONFIGURED.** **LAUNCH: NOT READY.** No production or external system is changed by this package.

## 1. Specialist ownership registry

| Role | Owner | Backup | Responsibilities and authority | Status |
| --- | --- | --- | --- | --- |
| Trust & Safety Owner | Not provided | Not provided | Controlled safety scenarios, escalation, restrictions, evidence boundaries, and independent workflow review where required. | **UNASSIGNED — USER ACTION REQUIRED** |
| Verification Owner | Not provided | Not provided | Verification test scope, reviewer role, fresh-auth boundary, and member-safe outcomes. | **UNASSIGNED — USER ACTION REQUIRED** |
| Editorial Owner | Not provided | Not provided | Consent-scoped story review, editorial controls, and independent publication approval boundary. | **UNASSIGNED — USER ACTION REQUIRED** |
| Staging Owner | Not provided | Not provided | Stage access, environment configuration, test-account coordination, smoke-test coordination, release-candidate verification, incident reporting, teardown, and recovery. | **UNASSIGNED — USER ACTION REQUIRED** |

These roles are not automatically delegated to a founder. Existing system-enforced independence, permission, audit, and fresh-auth controls remain binding.

## 2. Exact isolated staging resource specification

| Resource | Required | Current availability | Additional requirement | Security condition |
| --- | --- | --- | --- | --- |
| Application hosting | Yes | **NOT AVAILABLE** | **REQUIRES MANUAL PROVISIONING**, credentials, and user approval. | Separate deployment/origin, server-only `APP_ENV=staging`, no production identities. |
| MySQL/TiDB database | Yes | **NOT AVAILABLE** | **REQUIRES MANUAL PROVISIONING**, credentials, and database-owner/staging-owner approval. | Separate instance/database, credentials, connection string, migration identity, fictional data only. |
| Private object/file storage | Yes | **NOT AVAILABLE** | **REQUIRES MANUAL PROVISIONING**, credentials, and user approval. | Separate private container, signed access, no production media/object references. |
| Authentication | Yes | **NOT AVAILABLE** | **REQUIRES MANUAL PROVISIONING** and technical-owner approval. | Stage-only sessions/cookies; no production callback or account crossover. |
| OAuth | Required for current protected staging build. | **NOT AVAILABLE** | Separate client/secret/callback and user approval. | Staging redirect/logout only; never reuse production OAuth secret. |
| Staging hostname | Yes | **NOT AVAILABLE** | **USER TO PROVIDE** approved hostname/domain and DNS authority. | Separate origin, HTTPS, authentication-redirect compatibility, no production DNS edit. |
| TLS | Yes | **NOT AVAILABLE** | Hosting/domain authorization and manual configuration. | Valid certificate for stage hostname only. |
| Monitoring | Yes | **NOT AVAILABLE** | Monitoring owner approval, provider scope, credentials, manual configuration. | Separate environment/project, strict data scrubbing, scoped access. |
| Backup | Yes | **NOT AVAILABLE** | Backup/restore owner approval, provider target, schedule/retention policy. | Stage-only encrypted backup source, no production data. |
| Restore target | Yes | **NOT AVAILABLE** | Isolated recovery target and manual provisioning. | New non-production target; no overwrite/connect to production. |

**Staging hostname:** `[USER TO PROVIDE]`. The planning placeholder remains `staging.<approved Bantabato domain>`; it must never be treated as a selected domain.

## 3. MySQL/Drizzle and storage boundary

The application remains **MySQL/TiDB + Drizzle MySQL dialect**. Staging must use a separate MySQL/TiDB instance or database, distinct credentials and connection string, reviewed additive Drizzle migrations applied only to staging, and fictional seed data only. Environment separation must be verified by redacted identity comparison, stage connection test, and explicit evidence that stage credentials cannot access production.

Stage storage must use a distinct bucket/container, private-by-default access, controlled signed URLs, current upload/file validation, the existing five-photo rule, fictional media only, documented retention/deletion, and a recovery record. It must not list, read, sign, or reference production media.

## 4. Authentication, OAuth, monitoring, and backup

The current protected application build requires authentication and OAuth configuration. Staging must have a separate OAuth application/client and secret, stage redirect/logout URI, stage-only cookie/session configuration, and a no-production-crossover test. It must not use production credentials.

| Operational area | Owner status | Required configuration before claim of readiness |
| --- | --- | --- |
| Error and availability monitoring | Bubacarr Sillah assigned; provider unavailable. | Stage-only error/liveness project, application/auth/database/storage/API/security signals, threshold, recipient, scrub/retention/access policy, observed non-sensitive test event. |
| Backup/restore | Bubacarr Sillah assigned; resource unavailable. | Approved backup method, schedule, retention, encrypted location, separate restore target, restore record, reconnect/integrity/storage/auth validation, cleanup. |

Monitoring must not collect private messages, verification documents, passwords, authentication tokens, family information, safety evidence, or payment credentials. Backup readiness must not be claimed until an actual isolated restore succeeds.

## 5. Least-privilege connector scope requirements

| Connector | Exact staging purpose | Minimum scope | Must not access | Current status |
| --- | --- | --- | --- | --- |
| GitHub | Bantabato repository/release activity for staging only. | Approved repository and only necessary release/branch/workflow operation. | Unrelated repositories, broad organization administration, secrets. | Disabled; **NOT AUTHORIZED**. |
| Sentry | Bantabato staging monitoring only. | New staging project/environment, safe event/configuration access. | Production projects and unnecessary private payload. | Disabled; **NOT AUTHORIZED**. |
| Cloudflare | Staging DNS/TLS resources only. | Approved staging hostname/zone resource. | Production DNS, unrelated zones, broad account controls. | Disabled; **NOT AUTHORIZED**. |
| Supabase | No core database access required. | None unless a separately approved non-database purpose is selected. | Replacing MySQL/Drizzle or production projects/data. | Disabled; **NOT APPLICABLE** to core database. |

## 6. Planned providers — not live and not integrated

| Provider | Intended role | Required before sandbox testing | Production activation gate |
| --- | --- | --- | --- |
| Modem Pay | Planned local subscriptions/payments. | Merchant account, legal/compliance approval, sandbox/test mode, API credentials, signed webhook, reconciliation/refund owner, stage plan. | Successful sandbox transaction/reconciliation, approved compliance and explicit production decision. |
| Waychit | Planned local subscriptions/payments. | Merchant account, legal/compliance approval, sandbox/test mode, API credentials, signed webhook, reconciliation/refund owner, stage plan. | Successful sandbox transaction/reconciliation, approved compliance and explicit production decision. |
| Stripe | Planned diaspora payments. | Merchant account, legal/compliance approval, sandbox/test mode, API credentials, signed webhook, reconciliation/refund owner, stage plan. | Successful sandbox transaction/reconciliation, approved compliance and explicit production decision. |
| Africa’s Talking | Planned SMS OTP. | Sandbox/test capability, sender approval, API credentials, safe OTP flow, rate limits/abuse protection, compliance, no-real-recipient test plan. | Stage OTP evidence, approved sender/compliance, and explicit production activation decision. |

No provider is integrated until the required controlled sandbox evidence exists. No live payment or SMS may be attempted here.

## 7. Fictional account readiness

After resource isolation is proven, create only opaque fictional accounts for incomplete member, five-photo member, verification pending/approved/rejected, married member, Family Circle member, mutual pair, restricted member, report/safety case, verification reviewer, Trust & Safety reviewer, editorial reviewer, publication approver, support operator, and administrator. No account may use a real person, real media, real document, real contact information, or real evidence.

## 8. Staging security gate

| Mandatory condition | Status |
| --- | --- |
| Staging hostname/application/MySQL/storage/OAuth/secrets/monitoring isolated | [ ] |
| No production credentials or data | [ ] |
| No production DNS modification | [ ] |
| No production payment or SMS connection | [ ] |

Any failure is a **P0 BLOCKER**.

## 9. Final human approval package

| Item | Status | Owner | Approver | Required action |
| --- | --- | --- | --- | --- |
| Specialist owners assigned | Not approved | UNASSIGNED | User/operational decision-maker | Name Trust & Safety, verification, editorial, and staging owners. |
| Staging owner assigned | Not approved | UNASSIGNED | User/operational decision-maker | Appoint an authorized staging owner. |
| Staging hostname / hosting / MySQL / storage / authentication / OAuth targets | Not approved | Technical/operations owners | User with resource authority | Provide and approve isolated targets and credentials through approved channels. |
| Monitoring / backup / restore targets | Not approved | Bubacarr Sillah | User with provider authority | Approve provider target/scope and restore target. |
| GitHub / Sentry / Cloudflare scope | Not approved | Bubacarr Sillah | User with connector authority | Approve narrow scope before enabling any connector. |
| Supabase scope | Not applicable to core database | N/A | N/A | Keep disabled unless a separate service purpose is approved. |

Until every relevant approval is genuine and the stage resources exist, **STAGING TESTING NOT READY**.
