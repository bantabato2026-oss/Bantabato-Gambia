# Bantabato — Sprint 66 Founder Decision Register

**Review date:** 2026-11-04  
**Current launch status:** **NOT READY**  
**Approval rule:** No approval, appointment, resource, execution, or verification is inferred from this document.

## Consolidated decisions

| ID             | Decision                                                       | Current status                                   | Required evidence                                                     | Responsible approver      | Related gates                              |
| -------------- | -------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------- | ------------------------- | ------------------------------------------ |
| FIN-001        | Set maximum initial staging budget                             | **NOT PROVIDED**                                 | Amount, currency, expiry, cost ceiling                                | Founder/release approver  | INF-001, INF-002, OPS-001                  |
| FIN-002        | Set maximum monthly staging budget                             | **NOT PROVIDED**                                 | Monthly ceiling, alert threshold, expiry                              | Founder/release approver  | INF-001, INF-005, OPS-004                  |
| STAGE-001      | Approve recommended isolated WebDev staging architecture       | **AWAITING FOUNDER APPROVAL**                    | Authenticated approval, architecture scope, version                   | Founder/release approver  | INF-001, INF-002, INF-004                  |
| DATA-002       | Approve separate TiDB staging resources                        | **AWAITING FOUNDER APPROVAL**                    | Separate endpoint/database, least-privilege identity, isolation probe | Founder + database owner  | INF-002, OPS-001, OPS-002                  |
| MEDIA-AUTH-003 | Approve separate staging storage and OAuth configuration       | **AWAITING FOUNDER APPROVAL**                    | Private namespace, separate OAuth client/callback/session scope       | Founder + technical owner | INF-003, INF-004, UAT-001, UAT-002         |
| OWNER-004      | Appoint technical/platform owner                               | **OWNER REQUIRED**                               | Named acceptance, scope, access boundary, escalation route            | Founder/release approver  | OWN-001, INF-001–005                       |
| OWNER-005      | Appoint database/recovery owner                                | **OWNER REQUIRED**                               | Named acceptance, recovery scope, least privilege, escalation route   | Founder/release approver  | OWN-006, OPS-001–003                       |
| REVIEW-006     | Appoint privacy/legal owner                                    | **OWNER REQUIRED / LEGAL DECISION REQUIRED**     | Named qualified reviewer and documented decisions                     | Founder/legal authority   | LEGAL-001–003                              |
| REVIEW-007     | Appoint independent security reviewer                          | **OWNER REQUIRED / INDEPENDENT REVIEW REQUIRED** | Named independent reviewer, scope, report                             | Founder/release approver  | SEC-002                                    |
| ACCEPT-008     | Authorize synthetic staging acceptance and recovery rehearsals | **AWAITING FOUNDER APPROVAL**                    | Explicit scope, synthetic-only rule, accepted testers, targets        | Founder/release approver  | UAT-001–004, OPS-001–003, ACC-001, MOB-001 |

## Common approval record

A valid approval must include decision ID, decision version, approved scope, approved services/resources, maximum budget where applicable, approver identity and role, authenticated approval reference, timestamp, expiry/review date, and execution conditions. Blank, proposed, or unsigned fields are not approval evidence. A budget limit alone never authorizes spending or provisioning.

## Current result

All ten decisions remain unresolved in the available evidence. No founder approval, owner acceptance, budget, provider, or execution authorization was invented. `STAGE-001` is not approved, provisioning is not authorized, and all affected gates remain blocked or required.
