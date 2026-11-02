# Bantabato Sprint 64 — Staging Decision

**Decision state:** **AWAITING FOUNDER APPROVAL**  
**Provisioning state:** **NOT PROVISIONED**  
**Launch status:** **NOT READY**

## Verified current infrastructure

| Area               | Verified evidence                                                                                              | Boundary                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Hosting/deployment | Active WebDev-managed Bantabato project with a running server and public deployment domain                     | Only one public target is evidenced; no isolated staging target is evidenced             |
| Database           | MySQL-compatible TiDB Cloud production configuration is present in project runtime metadata                    | Values are secret-bearing and were not copied; separate staging database is absent       |
| ORM/migrations     | Drizzle ORM with MySQL dialect; committed schema/migrations; disposable CI applies schema to MySQL 8.4         | Applying schema in CI does not provision staging                                         |
| Storage            | Application uses Manus built-in storage helpers/proxy                                                          | Separate staging namespace and access policy are not verified                            |
| Authentication     | Manus OAuth server/portal integration is configured in the current runtime                                     | Separate staging OAuth client, callback, cookie scope, and synthetic accounts are absent |
| Secret handling    | Runtime secret names exist in managed project metadata                                                         | An approved staging secret-manager scope and accepted owner are not evidenced            |
| CI/CD              | GitHub Actions `persistence.yml` runs disposable MySQL 8.4, migrations, persistence tests, and artifact upload | CI is not a deployable staging environment                                               |
| Backup/recovery    | No verified backup artifact, restore target, or rollback target                                                | Recovery remains blocked                                                                 |

## Recommended smallest safe option

Authorize a **separate WebDev-managed staging deployment** only if the platform can provide a distinct project/origin and environment-scoped secrets without production crossover. Pair it with a separate MySQL/TiDB database, private storage namespace, separate OAuth client/callback, and staging-only monitoring. This preserves the existing architecture and avoids introducing a new paid platform.

If WebDev cannot provide those isolation properties, stop and obtain founder approval for a separate compatible provider before any spend. Do not use the current public deployment as staging.

## Required resource arrangement

- Distinct staging hostname and deployment target.
- Separate MySQL/TiDB database and least-privilege identity.
- Separate private storage namespace.
- Separate OAuth client, callback, cookies, and synthetic accounts.
- Approved secret manager with named technical owner.
- Staging-only monitoring and no-send configuration.
- Disposable backup/restore and rollback targets.

## Cost boundary

The repository and current project metadata do **not** contain verified pricing for an additional WebDev environment, database, storage, OAuth, monitoring, backup, or domain resource. Therefore:

- **New spend authorized:** $0.
- **Verified incremental initial cost:** Not available from current evidence.
- **Verified incremental monthly cost:** Not available from current evidence.
- **Required founder action:** Obtain current provider-console quotes/limits and approve a maximum budget before provisioning.

No recurring expense or external provider activation is implied by this recommendation.

## Decision requested

Approve or defer `STAGE-001`: authorize investigation and, after cost confirmation, provisioning of an isolated staging target with the resource arrangement above. Approval must name the approving person/role, scope, timestamp, budget limit, technical owner, and recovery owner. Approval alone does not mean staging is provisioned or verified.
