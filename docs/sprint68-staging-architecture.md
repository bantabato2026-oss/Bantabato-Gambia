# Bantabato — Sprint 68 Synthetic-Only Staging Architecture

**Date:** 2026-11-08  
**Status:** Proposed preparation package; not provisioned and not activated.  
**Launch:** NOT READY

## Boundary

Founder authorization covers design, configuration preparation, local validation, disposable testing, and synthetic-data planning only. It does not authorize creating a staging environment, provisioning cloud resources, spending money, activating paid services, connecting to production, creating production credentials, importing real member data, or granting external access.

## Proposed isolated components

| Component        | Proposed staging boundary                                          | Production boundary                   | Current verification                                                           |
| ---------------- | ------------------------------------------------------------------ | ------------------------------------- | ------------------------------------------------------------------------------ |
| Web application  | Separate WebDev-managed target                                     | Existing production target            | Proposed only; separate target not verified                                    |
| Database         | Separate MySQL-compatible TiDB resource or disposable MySQL target | Production TiDB configuration         | Disposable MySQL schema/persistence verified in CI; separate TiDB not verified |
| Migrations       | Drizzle migrations applied only to staging/disposable target       | Production target excluded            | CI behavior verified; staging identity not verified                            |
| Storage          | Separate private staging namespace                                 | Production storage namespace          | Not verified                                                                   |
| OAuth/callbacks  | Separate OAuth application and callback                            | Production OAuth application/callback | Not verified                                                                   |
| Sessions/signing | Separate cookies, session namespace, and signing configuration     | Production session configuration      | Not verified                                                                   |
| Secrets          | Environment-scoped staging secret namespace                        | Production secret scope               | Not verified; no secrets created or disclosed                                  |
| Communications   | Disabled or synthetic sink only                                    | Production providers                  | Not activated; no real send permitted                                          |
| Monitoring       | Staging telemetry destination and owner                            | Production telemetry destination      | Not verified                                                                   |
| Recovery         | Disposable backup/restore and rollback targets                     | Production recovery controls          | Not verified; no rehearsal executed                                            |

## Evidence vocabulary

- **PROPOSED:** Architecture or control described but not configured.
- **PREPARED_NOT_ACTIVATED:** Configuration design or test contract exists without resource activation.
- **TESTED_DISPOSABLE:** Behavior tested against disposable infrastructure, without proving provider isolation.
- **INDEPENDENTLY_VERIFIED:** Requires separate evidence and reviewer; none claimed in Sprint 68.
- **PRODUCTION_PROVISIONING_UNAUTHORIZED:** Production provisioning remains outside this sprint.

## Stop conditions

Any shared endpoint, uncertain resource identity, production secret, real notification path, production data source, missing reviewer, missing recovery target, or cost outside the D500/D500/D1,000 ceilings stops the workflow. The STAGE-001 gate remains pending/blocked until all required evidence and approvals exist.
