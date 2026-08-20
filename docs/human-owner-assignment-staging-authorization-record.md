# BANTABATO — Human Owner Assignment & Staging Authorization Record

**Authority:** User-confirmed founder and business responsibility assignments. This record does not grant external-provider access, create infrastructure, or authorize a production change.

| Operational area | Confirmed owner | Status | Boundary |
| --- | --- | --- | --- |
| Technical operations, application development, database, security, backup/restore, monitoring, technical release, release approval | Bubacarr Sillah | ASSIGNED | Scope does not replace an independent four-eyes reviewer when a workflow requires one. |
| Operations, community/outreach, member support | Salifu Marong | ASSIGNED | Scope does not confer unassigned specialist review permissions. |
| Beta testing and incident response | Bubacarr Sillah and Salifu Marong | ASSIGNED | Must retain separate identities, role scope, audit, and workflow-specific approval controls. |
| Trust & Safety, verification, editorial, staging ownership | Not provided | **UNASSIGNED — USER ACTION REQUIRED** | Required wherever a workflow mandates specialised or independent review. |

## Architecture and staging status

The current application database remains **MySQL/TiDB + Drizzle (MySQL dialect)**. Supabase is not approved or configured as a replacement database. Staging remains **NOT CONFIGURED**: no separate application, MySQL database, storage, environment secrets, authentication/OAuth client, monitoring project, backup, restore target, or hostname has been provided or authorized.

The prospective hostname remains `staging.<approved Bantabato domain>` only. No domain is selected and no production DNS may be modified.

## Planned providers — not configured

| Provider or category | Stated future purpose | Current state | Required before any test or activation |
| --- | --- | --- | --- |
| Modem Pay | Planned local subscription/payment capability. | **NOT CONFIGURED** | Approved merchant account, legal/compliance review, sandbox/test capability, signed webhooks, reconciliation/refund ownership, stage credentials. |
| Waychit | Planned local subscription/payment capability. | **NOT CONFIGURED** | Approved merchant account, legal/compliance review, sandbox/test capability, signed webhooks, reconciliation/refund ownership, stage credentials. |
| Stripe | Planned diaspora payment capability. | **NOT CONFIGURED** | Explicit provider approval, merchant account, sandbox/test capability, signed webhooks, reconciliation/refund ownership, stage credentials. |
| Africa’s Talking | Planned SMS OTP capability. | **NOT CONFIGURED** | Provider account, credentials, sender configuration, applicable compliance review, stage/test capability, and no-real-recipient test plan. |

No live payment, merchant account, webhook, refund, SMS, sender configuration, credential, or communication was activated or sent. The provider names are planning inputs, not evidence of a relationship, configuration, or capability.

## Current staging readiness gate

| Required condition | Status |
| --- | --- |
| Confirmed technical/operations ownership | Partially complete; named owners recorded. |
| Required specialist ownership where workflow needs it | **UNASSIGNED — USER ACTION REQUIRED** |
| Separate hosting, MySQL/TiDB database, storage, domain, OAuth, monitoring, backup, restore target | **NOT AVAILABLE** |
| Synthetic accounts and production-isolation verification | **NOT EXECUTED** |

**Decision:** **STAGING TESTING NOT READY.** Any attempt to use a production database, storage, OAuth credential, secret, domain, monitoring project, real person, or live provider capability is a P0 stop condition.
