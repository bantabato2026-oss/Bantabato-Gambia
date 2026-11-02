# Bantabato Sprint 64 — Staging Cost and Resource Estimate

**Purpose:** Support one informed founder decision without inventing provider pricing.  
**Current spend authorization:** **$0**

## Verified current facts

- The application already runs in a WebDev-managed project.
- The current project has a public deployment target.
- Production runtime metadata identifies a MySQL-compatible TiDB Cloud configuration.
- The repository contains Drizzle MySQL migrations and disposable MySQL CI.
- Storage and OAuth use Manus-provided integrations in the current architecture.
- No second environment, staging database, storage namespace, OAuth target, monitoring project, backup target, or rollback target is verified.

## Resource estimate

| Resource                    | Required shape                                                     | Initial cost | Monthly cost | Pricing status                               | Founder action                                        |
| --------------------------- | ------------------------------------------------------------------ | -----------: | -----------: | -------------------------------------------- | ----------------------------------------------------- |
| Staging deployment/hostname | Separate WebDev project/origin or approved compatible target       |      Unknown |      Unknown | Not available in repository/project metadata | Obtain provider quote/limits and approve budget       |
| Staging database            | Separate MySQL/TiDB instance/database and least-privilege identity |      Unknown |      Unknown | Not verified                                 | Obtain current provider pricing and retention options |
| Private staging storage     | Separate private namespace/bucket                                  |      Unknown |      Unknown | Not verified                                 | Confirm included quota/egress and approve limit       |
| OAuth/auth target           | Separate client/callback/cookie scope                              |      Unknown |      Unknown | Not verified                                 | Confirm provider account capability and any limits    |
| Secret management           | Environment-scoped managed secrets                                 |      Unknown |      Unknown | Not verified                                 | Confirm included capability and appoint owner         |
| Monitoring/alerts           | Staging destination, scrubbing, route, incident owner              |      Unknown |      Unknown | Not verified                                 | Confirm provider plan/limits before activation        |
| Backup/restore              | Disposable backup and restore targets                              |      Unknown |      Unknown | Not verified                                 | Approve retention, storage, and recovery budget       |
| Rollback target             | Disposable versioned deployment                                    |      Unknown |      Unknown | Not verified                                 | Confirm platform capability and budget                |

## Recommendation

Use the existing WebDev-managed architecture if it can satisfy isolation and environment-scoped secret requirements within a founder-approved budget. Do not introduce a paid platform merely to create a second opinion. If the capability or price cannot be verified, keep staging blocked.

## Cost controls

Set a hard maximum initial and monthly budget before provisioning. Require founder approval for any resource that exceeds the limit, creates recurring billing, or enables an external integration. Record provider quote date, plan, quota, currency, and expiry in the approval register; never treat an estimate as an invoice or approval.
