# Bantabato Sprint 65 — Database Isolation

**Current production database:** MySQL-compatible TiDB Cloud configuration is present in managed project metadata; secret values are not reproduced.  
**Current migration layer:** Drizzle ORM, MySQL dialect, committed schema/migrations.  
**Staging database:** Not provisioned and not account-verified.

## Required safe arrangement

Staging must use a separate TiDB database or instance with a staging-only credential whose permissions cannot reach the production database. The staging `DATABASE_URL` must be stored only in an approved staging secret scope. The production credential must never be reused in staging.

The migration operator must run committed Drizzle migrations against the staging endpoint only. The current CI pattern demonstrates disposable MySQL schema application, but it does not authorize or prove staging migration access.

## Capability and evidence status

| Control                                        | Status                   | Evidence or missing proof                                      |
| ---------------------------------------------- | ------------------------ | -------------------------------------------------------------- |
| MySQL/TiDB compatibility                       | **VERIFIED**             | Drizzle MySQL dialect and MySQL 8.4 disposable CI              |
| Separate TiDB instance/database                | **NOT VERIFIED**         | No account console/resource evidence available                 |
| Staging-only database identity                 | **NOT VERIFIED**         | No staging credential or permission review                     |
| Production access denied from staging identity | **NOT TESTED**           | Requires isolated non-production resource and permission probe |
| Staging-only migration execution               | **DOCUMENTED PROCEDURE** | Must run only after approval and endpoint verification         |
| Independent backup                             | **NOT VERIFIED**         | No staging backup artifact or target                           |
| Independent restore                            | **NOT VERIFIED**         | No disposable restore destination                              |
| Rollback verification                          | **NOT VERIFIED**         | No disposable deployment/database rollback target              |

## Public pricing context

TiDB Cloud Starter publicly advertises a $0/month starting point with per-organization free quotas and usage charges beyond the allowance. The provider states that region, provider, storage, request units, backup, data transfer, and plan choice affect cost. Whether the current Bantabato organization qualifies and whether a separate instance can be created under those terms remains unverified. [1] [2]

## Stop conditions

Stop before any migration if the endpoint identity, project/organization, database name, credential scope, or environment label cannot be independently verified as staging. Stop if any staging credential can access production. Never copy production data into staging; seed only deterministic fictional A–J data after the isolation checks pass.

## References

[1]: https://www.pingcap.com/tidb-cloud-pricing/ "TiDB Cloud Pricing"
[2]: https://www.pingcap.com/tidb-cloud-starter-pricing-details/ "TiDB Cloud Starter Pricing Details"
