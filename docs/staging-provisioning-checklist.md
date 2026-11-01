# Bantabato Sprint 61 — Staging Provisioning Checklist

**Status:** **NOT EXECUTED — REQUIRED EXTERNAL RESOURCES UNAVAILABLE**  
**Safety rule:** Never use production resources as a staging substitute.

## Founder/operator inputs required

- Approved staging hostname and DNS/TLS authority.
- Separate staging deployment target.
- Separate staging MySQL/TiDB database and least-privilege credentials.
- Separate private storage bucket/namespace and credentials.
- Separate OAuth application, callback URL, and cookie scope.
- Redacted staging environment identity values and secret owner.
- Monitoring project, scrubbing rules, alert route, and incident owner.
- Backup destination, recovery owner, and disposable restore target.
- Authorized synthetic tester accounts and approval to create fictional A–J fixtures.

## Execution order after inputs exist

1. Record provider, account, resource, region, and owner identities without storing secrets.
2. Deploy with explicit `APP_ENV=staging`; confirm the hostname is not the production origin.
3. Verify staging database identity and reject any production-looking or shared URL.
4. Verify storage namespace and cross-environment access denial.
5. Verify OAuth target, callback, cookie scope, logout, and session isolation.
6. Apply committed migrations to staging and record the migration/version result.
7. Configure privacy-safe monitoring with staging environment tags and a safe synthetic alert.
8. Create only fictional A–J accounts after the identity review passes.
9. Execute member/staff acceptance matrices using those accounts only.
10. Create a synthetic backup, record checksum/timestamp, restore to a disposable target, and compare schema/data invariants.
11. Rehearse rollback against a disposable deployment target; never perform a destructive production rollback.
12. Attach evidence, owner, date/version, and result to every applicable launch gate.

## Stop conditions

Stop immediately if any resource identity is shared with production, any secret is missing or exposed, the target cannot prove its environment, a provider would contact real users, or an owner/approval is absent. A checklist step is not evidence of completion until its result is independently recorded.
