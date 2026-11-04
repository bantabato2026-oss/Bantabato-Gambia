# Bantabato — Sprint 66 Milestone 1: Isolated Staging Operational

**Milestone status:** **PLANNED — EXECUTION BLOCKED**  
**Authorization:** `STAGE-001` is not approved. No step below may be executed.

## Entry criteria

Milestone 1 may start only when the consolidated decision register has authenticated approvals, budget ceilings, approved providers, accepted technical and recovery owners, separate resource identities, a secure secret scope, and a valid release version. The entry review must confirm no production data or credentials are present.

## Controlled execution sequence

1. Provision the approved isolated WebDev deployment and distinct non-production hostname.
2. Provision the approved separate TiDB/MySQL database and least-privilege staging identity.
3. Provision the private staging storage namespace and deny production object access.
4. Configure staging-only secrets, OAuth client/callback, cookie/session scope, and no-send controls.
5. Configure staging monitoring, alert route, scrubbing, and incident ownership.
6. Apply committed Drizzle migrations to the verified staging endpoint only.
7. Deploy the approved revision and record version, environment identity, and health result without printing secrets.
8. Verify database, storage, OAuth, session, and production-denial isolation.
9. Seed deterministic fictional A–J accounts and synthetic media only.
10. Run member, staff, eligibility, consent, privacy, messaging, Family Circle, safety, account lifecycle, accessibility, mobile, and localization acceptance scenarios.
11. Create a timestamped synthetic backup and checksum in the approved non-production target.
12. Restore to a distinct disposable database/storage target and compare schema, migration version, row invariants, privacy boundaries, eligibility state, and signed-access behavior.
13. Rehearse version rollback or compensating migration on a disposable deployment.
14. Obtain recovery-owner and independent-review evidence, then map results to every applicable launch gate.

## Stop conditions

Stop immediately if approval is missing/stale, a resource is shared with production, endpoint identity is uncertain, a secret is exposed, no-send controls fail, real-user communications could fire, synthetic-only data cannot be guaranteed, or backup/restore/rollback targets are unavailable.

## Evidence package

Record for each step: decision/version, resource identity redacted to non-secret metadata, owner, revision, timestamp, command/result summary, limitation, artifact/checksum reference, and affected gate. Failed or unperformed steps must remain `BLOCKED`, `PENDING`, or `NOT VERIFIED`; they must not be converted to `VERIFIED` by plan text alone.

## Current result

Milestone 1 is executable as a controlled plan but remains blocked. No staging, migration, deployment, synthetic account, backup, restore, rollback, or acceptance action was performed in Sprint 66.
