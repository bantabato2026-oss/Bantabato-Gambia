# Bantabato Launch-Readiness Matrix

**Review scope:** Sprint 54 application evidence only. No production mutations, real member data, provider activation, or authenticated browser review were performed.

| Area | State | Evidence / boundary |
|---|---|---|
| Automated regression suite | VERIFIED | Sprint 53: 510 tests passed; Sprint 54 focused tests are recorded with the checkpoint. |
| Disposable MySQL authority suite | VERIFIED | CI run 37002794891 passed migrations, persisted authority tests, and artifact upload. |
| Production environment identity | PENDING | Deployment identity contract exists; explicit production values are not verified in this environment. |
| Staging environment | BLOCKED | No separate staging infrastructure or credentials were verified; no staging claims are made. |
| Database separation | CONFIGURED | Test adapter rejects production mode, application DATABASE_URL reuse, malformed URLs, and unmarked test databases. |
| Storage separation | PENDING | Contract requires an explicit storage identity; actual staging/production storage separation is not verified. |
| OAuth/auth target separation | PENDING | Contract records the auth target; separate staging and production targets are not verified. |
| Application origin / allowed origins | PENDING | Contract requires an origin and allow-list relationship in production; deployment configuration is not verified here. |
| Monitoring | PENDING | Provider-neutral event schema and health endpoint exist; no monitoring provider is activated or claimed. |
| Alerting | OPERATIONAL OWNER REQUIRED | Alert thresholds, escalation, and ownership remain external operational decisions. |
| Backups | NOT CONFIGURED | No backup infrastructure was verified; application persistence tests are not backups. |
| Restore test | PENDING | No production restore test was run or claimed. |
| Rollback procedure | PENDING | Requires deployment-owner runbook and verified rollback rehearsal. |
| Retention policy | LEGAL DECISION REQUIRED | Retention periods are configurable but no legal periods are invented. |
| Data export scope | COMPLETE | Member-safe scope and exclusions are explicit; requests remain non-public and member-owned. |
| Data export delivery | EXTERNAL PROVIDER REQUIRED | Secure delivery infrastructure is not configured or claimed. |
| Session/device policy | VERIFIED | Current/other session distinction, revocation, fresh-auth, stale-state, and minimum metadata are covered by existing tests and account service. |
| Support operations | VERIFIED | Member ownership, role-scoped staff access, stale actions, revocation, and separation from Trust & Safety are covered by persisted and contract tests. |
| Localization | PENDING | English is the only reviewed locale; Wolof, Mandinka, and French are not claimed as reviewed. |
| Accessibility manual review | PENDING | Automated contracts exist; no manual browser/screen-reader certification was performed. |
| Security assessment | PENDING | Automated security and authorization coverage exists; independent assessment is not claimed. |
| Legal/privacy review | LEGAL DECISION REQUIRED | Retention, deletion, export, and privacy decisions still require accountable review. |
| Operational ownership | OPERATIONAL OWNER REQUIRED | Monitoring, alerts, backups, restore, rollback, and support escalation owners are not verified. |
| Provider credentials/scopes | EXTERNAL PROVIDER REQUIRED | SMS, email, payments, monitoring, and delivery providers remain dormant. |
| Free Launch billing state | VERIFIED | FREE_LAUNCH remains provider-neutral; no checkout, subscription paywall, transaction, or Premium gate is activated. |
| Authenticated member review | BLOCKED | My Browser was not enabled; no authenticated review is claimed. |
| Authenticated staff review | BLOCKED | My Browser was not enabled and no real staff account was used. |

## Readiness rule

Automated tests do not equal launch approval. Bantabato remains **NOT READY** until the blocked, pending, legal, owner, and external-provider states above are resolved with evidence.
