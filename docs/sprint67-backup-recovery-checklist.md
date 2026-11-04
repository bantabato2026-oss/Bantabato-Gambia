# Bantabato — Sprint 67 Database Backup and Recovery Checklist

**Provisional recovery contact:** Bubacarr Sillah, sole current active operator.  
**Formal recovery-owner acceptance:** **PENDING**.  
**Backup/restore status:** **BLOCKED — no verified artifact or target**.

## Responsibility checklist

- [ ] Founder confirms the recovery-owner scope through authenticated acceptance.
- [ ] Separate non-production database and least-privilege identity exist.
- [ ] Approved backup destination and retention decision exist.
- [ ] Timestamped synthetic A–J backup is created.
- [ ] Checksum and fixture manifest are recorded without secrets.
- [ ] Restore is performed into a distinct disposable database.
- [ ] Schema, migration version, row invariants, privacy boundaries, and eligibility state are compared.
- [ ] Synthetic storage is restored into a distinct private namespace.
- [ ] Rollback or compensating migration is rehearsed on a disposable deployment.
- [ ] Recovery duration is measured with an actual timer.
- [ ] A genuinely separate reviewer signs the result.

No checklist item above was executed in Sprint 67. The provisional contact is not a substitute for authenticated acceptance, a backup artifact, a restore target, or an independent reviewer.
