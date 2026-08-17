# Controlled Staging, Test Accounts, Monitoring, and Backup/Restore Inventory

**Evidence date:** 17 August 2026  
**Scope:** Current verified state only. A missing external credential, vendor configuration, managed-service setting, owner, backup artifact, or test account is not inferred from application code.

| Component | Environment | Status | Evidence |
| --- | --- | --- | --- |
| Application development server | Development | **CONFIGURED** | Managed local development server is available at the project preview URL. |
| Application staging deployment | Staging | **NOT CONFIGURED** | No distinct staging origin/application was supplied or detected. |
| Application production deployment | Production | **PARTIALLY CONFIGURED** | Managed public HTTPS application domain exists; authenticated production smoke execution is not evidenced. |
| Database | Development/production dependency | **PARTIALLY CONFIGURED** | Server environment allowlist includes `DATABASE_URL`; production backup/access/restore evidence is absent. |
| Staging database | Staging | **NOT CONFIGURED** | No separate staging database or credential set was supplied. |
| Private storage | Development/production dependency | **PARTIALLY CONFIGURED** | Managed private storage boundaries and signed URLs are implemented; independent recovery/backup evidence is absent. |
| Staging storage | Staging | **NOT CONFIGURED** | No separate staging bucket/namespace or credentials were supplied. |
| OAuth authentication | Development/production dependency | **PARTIALLY CONFIGURED** | OAuth environment variables and callback implementation exist; staging and production callback-flow evidence is absent. |
| Environment values and secrets | Server runtime | **PARTIALLY CONFIGURED** | Server reads approved runtime variables; values were not inspected. No staging-specific secret set was supplied. |
| Background jobs | All | **NOT CONFIGURED** | Project scheduler inventory reports zero active jobs. |
| Email/SMS/push providers | All | **NOT CONFIGURED** | Provider-safe application boundaries exist; no external delivery configuration or credentials are evidenced. |
| Payment provider | All | **NOT CONFIGURED** | Provider-independent billing exists; no merchant/provider configuration is evidenced. |
| Calling/verification providers | All | **NOT CONFIGURED** | No live external provider is configured. |
| Monitoring/error tracking | Production | **NOT CONFIGURED** | Privacy-safe health endpoint exists; no monitor, tracker, routing, retention, or alert delivery is configured. |
| Alerting | Production | **NOT CONFIGURED** | Alert categories are documented; no live alert destination or test evidence exists. |
| Database backup | Production | **NOT VERIFIED** | Provider, frequency, retention, encryption, location, owner, backup ID, and last-success evidence were not supplied. |
| Database restore | Non-production | **NOT VERIFIED** | No source backup, restore target, or execution evidence exists. |
| Storage recovery | Production | **NOT VERIFIED** | No private-media recovery or backup configuration evidence exists. |
| Controlled test accounts | Production/staging | **NOT CONFIGURED** | No authorized synthetic member, participant, staff, or administrator accounts were created or identified. |
| Closed-beta runtime | Production | **PARTIALLY CONFIGURED** | Server-enforced control exists and defaults to disabled; no beta user has been enrolled. |

## Verified health and secret boundaries

The deployed public liveness route is intentionally unauthenticated and returns a minimal process response only. It does not assert database, storage, queue, provider, or member health. The server environment module reads only server runtime variables for database, OAuth, owner identity, and managed Forge services; the checkpoint did not read, expose, or log any values.

## Current external-action-required items

An external operator must provision any staging application, database, storage namespace, OAuth registration, environment values, provider sandbox, monitoring vendor, alert destination, backup/recovery system, or controlled production test account. Application documentation and tests cannot substitute for these external capabilities.
