# BANTABATO — Staging Authorization & Provisioning Readiness Package

**Status:** **NOT APPROVED.** **STAGING: NOT CONFIGURED.** This package is a human authorization aid. It does not provision hosting, database, storage, OAuth, DNS/TLS, monitoring, backups, accounts, or connectors.

## 1. Owner authorization form

| Role | Owner | Backup | Status | Required action |
| --- | --- | --- | --- | --- |
| Primary Technical Owner | Bubacarr Sillah | Salifu Marong (operational backup) | ASSIGNED | Technical architecture, development, infrastructure, security implementation, integrations, and technical release control. |
| Backup Technical Owner | Salifu Marong | Not provided | ASSIGNED | Operations, outreach, member support, community coordination, operational decisions, and continuity coordination. |
| Staging Owner | Not provided | Not provided | **UNASSIGNED — USER ACTION REQUIRED** | Authorize stage creation, isolation review, reset, and cleanup. |
| Database Owner | Bubacarr Sillah | Not provided | ASSIGNED | Authorize MySQL/TiDB stage identity, migrations, and recovery. |
| Backup/Restore Owner | Bubacarr Sillah | Not provided | ASSIGNED | Approve backup, retention, restore, and evidence. |
| Monitoring Owner | Bubacarr Sillah | Not provided | ASSIGNED | Approve scrubbing, routing, retention, and safe alert testing. |
| Security Owner | Bubacarr Sillah | Not provided | ASSIGNED | Approve scope review, isolation testing, and incident response. |
| Trust & Safety Owner | Not provided | Not provided | **UNASSIGNED — USER ACTION REQUIRED** | Approve controlled safety scenarios and evidence limits. |
| Verification Owner | Not provided | Not provided | **UNASSIGNED — USER ACTION REQUIRED** | Approve fictional verification workflow tests. |
| Editorial Owner | Not provided | Not provided | **UNASSIGNED — USER ACTION REQUIRED** | Approve controlled story-review/publication scenarios. |
| Support Owner | Salifu Marong | Not provided | ASSIGNED | Approve scoped support-test access. |
| Beta Test Owner | Bubacarr Sillah and Salifu Marong | Not provided | ASSIGNED | Maintain fictional account register, tests, and cleanup. |
| Release Owner | Bubacarr Sillah | Not provided | ASSIGNED | Select candidate checkpoint, validation, migration, rollback. |
| Incident Response Owner | Bubacarr Sillah and Salifu Marong | Not provided | ASSIGNED | Own stop/contain/recover/post-incident decisions. |

## 2. Staging target authorization inputs

| Target | Status | Required input | Who must authorize | Security requirement |
| --- | --- | --- | --- | --- |
| Staging hostname | **REQUIRES USER ACTION** | Approved non-production hostname. | Staging and domain owners. | Must differ from production; no production DNS modification. |
| Staging hosting | **NOT AVAILABLE** | Provider, account/project, isolated deployment target. | Technical and staging owners. | Separate environment/secrets and no production identity. |
| Staging MySQL database | **NOT AVAILABLE** | Provider, separate database identity, runtime/migration accounts. | Database and staging owners. | MySQL/TiDB only; no production URL/access; encrypted transport where supported. |
| Staging storage | **NOT AVAILABLE** | Separate private namespace and least-privilege identity. | Storage/staging owner. | No production objects; fictional media only; signed access only. |
| Staging OAuth | **NOT AVAILABLE** | Separate client, redirect URI, staging callback/origin. | OAuth/technical owner. | No production secret/callback/cookie crossover. |
| Staging monitoring | **NOT AVAILABLE** | Approved monitoring project, scrub rules, routing, retention. | Monitoring and security owners. | No private content, tokens, documents, or payment credentials. |
| Staging backup | **NOT AVAILABLE** | Provider, frequency, retention, encryption, storage location. | Backup/restore owner. | Non-production scope and isolated recovery path. |
| Staging restore target | **NOT AVAILABLE** | Fresh isolated non-production recovery target. | Backup/restore and database owners. | Never overwrite or connect to production. |

## 3. Current architecture boundary

The production application architecture remains **MySQL/TiDB + Drizzle (MySQL dialect)**. The required stage mirrors that architecture with fully separate resource identities:

```text
Staging hostname → staging application (APP_ENV=staging)
                 → staging MySQL/TiDB database
                 → stage-only private storage
                 → staging-specific OAuth/session configuration

No production database, storage, credentials, OAuth, domain/origin,
monitoring project, provider account, or real member data is permitted.
```

Supabase is **not** the application database. A Supabase service may be considered later only through an explicit, separately reviewed scope; it must not replace MySQL/Drizzle or receive production data as part of this authorization package.

## 4. Least-privilege connector authorization matrix

| Connector | Purpose | Minimum requested scope | Must not access | Revocation |
| --- | --- | --- | --- | --- |
| GitHub | Source/release management. | Approved repository only; read metadata/source and separately approved stage-branch/workflow write if needed. | Unrelated repositories, org administration, production secrets. | Disable connector, revoke repository token/app grant, remove repository permission. |
| Sentry | Staging monitoring. | New staging project/environment only; configure/read events needed for scrub/routing/test. | Production projects, private payloads, unnecessary org administration. | Disable connector, revoke project token/integration/member access. |
| Cloudflare | Staging DNS/TLS only. | Approved zone and staging hostname/DNS/TLS/header/cache controls only. | Production DNS changes, unrelated zones, broad Workers/R2/account administration. | Disable connector, revoke scoped token, remove zone resource access. |
| Supabase | Only a deliberately approved non-database service or future migration evaluation. | New staging project only and only the service needed. | Replacing MySQL/Drizzle, production projects/data, browser service-role access. | Disable connector, revoke project token/key/member access. |

## 5. Production safety barrier

Before any provisioning step, the named staging and security owners must attest that all conditions are true:

- [ ] Staging resource identity is different from production.
- [ ] Staging database is different from production and cannot reach production.
- [ ] Staging storage is different from production and cannot list/read/sign production objects.
- [ ] OAuth credentials, callback, cookie/session scope, environment values, and secrets are staging-specific.
- [ ] Monitoring uses a separate environment/project and scrubs prohibited content.
- [ ] Staging hostname/origin differs from production and no production DNS has been selected.

Any failed or uncertain condition is a **P0 blocker: STOP — BLOCKED — EXTERNAL ACTION REQUIRED**.

## 6. Authorized provisioning runbook

| Step | Action | Required approval/evidence | Current state |
| ---: | --- | --- | --- |
| 1 | Confirm owners. | Completed owner authorization form. | BLOCKED |
| 2 | Confirm staging hostname. | Domain/hostname approval. | BLOCKED |
| 3 | Provision isolated hosting. | Approved hosting account and stage origin. | BLOCKED |
| 4 | Provision isolated MySQL/TiDB. | Database owner, separate identity, redacted connection review. | BLOCKED |
| 5 | Provision isolated storage. | Separate private namespace and access review. | BLOCKED |
| 6 | Configure environment variables. | Stage-only secret inventory; `APP_ENV=staging`. | BLOCKED |
| 7 | Apply reviewed database migrations. | Additive SQL review, migration log, rollback decision. | BLOCKED |
| 8 | Configure authentication. | Stage session/cookie and login boundary test. | BLOCKED |
| 9 | Configure staging OAuth where required. | Separate client/callback/cookie crossover test. | BLOCKED |
| 10 | Configure Sentry staging monitoring. | Scrub/routing/retention approval. | BLOCKED |
| 11 | Configure Cloudflare staging DNS/TLS. | Approved scoped zone and hostname configuration. | BLOCKED |
| 12 | Create fictional accounts. | Isolation proof, account register, cleanup plan. | BLOCKED |
| 13 | Configure backup. | Owner, provider, frequency, retention, encryption evidence. | BLOCKED |
| 14 | Execute non-production restore. | Isolated target and restore evidence. | BLOCKED |
| 15 | Verify monitoring. | Safe test event, observed scrub/routing. | BLOCKED |
| 16 | Execute security-isolation checks. | Stage/production denial results. | BLOCKED |
| 17 | Execute authenticated smoke tests. | Approved accounts, tester, evidence record. | BLOCKED |
| 18 | Execute accessibility tests. | Named accessibility owner, assistive technology/device evidence. | BLOCKED |

## 7. Fictional-account authorization

After steps 1–11 prove isolation, the beta test owner may authorize only opaque fictional labels: `STG_MEMBER_INCOMPLETE`, `STG_MEMBER_FIVE_PHOTO`, verification pending/approved/rejected members, married member, Family Circle member, mutual pair A/B, restricted member, report-case member, verification/safety/editorial/publication/support staff, and operations administrator. No real person, email, phone, photo, address, document, message, or safety evidence may be used.

## 8. Backup/restore and monitoring gates

**Backup/restore gate:** Backup exists; an isolated restore has run; restored database is usable; application reconnects; integrity/storage/auth checks pass; evidence and cleanup are recorded. Until then, **BACKUP/RESTORE NOT READY**.

**Monitoring gate:** Staging monitoring is configured; a controlled non-sensitive event appears; alert routing is verified; scrub rules prevent prohibited data exposure. Until then, **MONITORING NOT READY**.

## 9. Final human approval block

| Approval | Approved | Not approved | Current state |
| --- | --- | --- | --- |
| Owner approval | [ ] | [ ] | Not approved / owner unassigned |
| Staging hostname approval | [ ] | [ ] | Not approved / hostname unavailable |
| Database target approval | [ ] | [ ] | Not approved / target unavailable |
| Storage target approval | [ ] | [ ] | Not approved / target unavailable |
| OAuth target approval | [ ] | [ ] | Not approved / target unavailable |
| GitHub scope approval | [ ] | [ ] | Not approved / connector disabled |
| Sentry scope approval | [ ] | [ ] | Not approved / connector disabled |
| Cloudflare scope approval | [ ] | [ ] | Not approved / connector disabled |
| Supabase scope approval | [ ] | [ ] / [ ] Not applicable | Not approved / not applicable to current database |

## 10. Do-not-proceed conditions

Stop immediately and report **BLOCKED — EXTERNAL ACTION REQUIRED** if a production resource, production database, production storage, production OAuth credential, production DNS, unknown owner, over-broad credential scope, unverified isolation, unclear restore target, or real personal data is selected.
