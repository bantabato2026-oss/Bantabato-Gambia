# Bantabato Sprint 60 — Founder / Legal Privacy Decision Package

**Status:** DECISION REQUIRED  
**Prepared:** 2026-10-06  
**Boundary:** This package records questions for an authorized founder/privacy/legal decision-maker. It does not choose legal periods, provide legal advice, or claim approval.

## Decision register

| ID        | Data class / workflow                  | Decision required                                                                          | Current implementation boundary                                                                 | Status                     | Owner                           |
| --------- | -------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------- |
| LEGAL-001 | Account/profile data                   | Retention period and deletion trigger                                                      | Member-owned profile lifecycle and deletion-review request exist; no period is invented         | LEGAL REVIEW REQUIRED      | Privacy/legal owner required    |
| LEGAL-002 | Identity-verification records          | Retention period, access, resubmission history, and deletion exception                     | Private manual-review records and staff access boundaries exist; final retention rule is absent | LEGAL REVIEW REQUIRED      | Privacy/legal owner required    |
| LEGAL-003 | Safety blocklist / enforcement records | Retention and access after account deletion                                                | Safety workflows preserve minimum-necessary operational boundaries; policy period is absent     | LEGAL REVIEW REQUIRED      | Privacy/legal + Trust & Safety  |
| LEGAL-004 | Photos and private media               | Retention after removal, pause, deletion request, or failed review                         | Storage references and privacy projections exist; purge and backup treatment are unresolved     | LEGAL REVIEW REQUIRED      | Privacy/legal + infrastructure  |
| LEGAL-005 | Messages and voice media               | Retention, deletion exceptions, and participant rights                                     | Mutual-access and privacy controls exist; final retention policy is absent                      | LEGAL REVIEW REQUIRED      | Privacy/legal owner required    |
| LEGAL-006 | Family Circle information              | Retention, withdrawal consequences, and participant access                                 | Scoped consent and withdrawal controls exist; final policy is absent                            | LEGAL REVIEW REQUIRED      | Privacy/legal owner required    |
| LEGAL-007 | Support records                        | Retention, access, and deletion exceptions                                                 | Support lifecycle exists; final retention policy is absent                                      | LEGAL REVIEW REQUIRED      | Privacy/legal + support owner   |
| LEGAL-008 | Trust & Safety records                 | Retention, escalation, and disclosure boundaries                                           | Staff role boundaries and audit controls exist; final policy is absent                          | LEGAL REVIEW REQUIRED      | Privacy/legal + Trust & Safety  |
| LEGAL-009 | Audit records                          | Retention, minimization, and legal hold exceptions                                         | Audit records intentionally exclude raw secrets and sensitive content; final period is absent   | LEGAL REVIEW REQUIRED      | Privacy/legal + security owner  |
| LEGAL-010 | Data exports                           | Categories, format, secure generation, delivery, expiry, revocation, and deletion handling | Member-owned scope and fresh-auth controls exist; secure delivery infrastructure is unavailable | EXTERNAL PROVIDER REQUIRED | Privacy/legal + infrastructure  |
| LEGAL-011 | Backups                                | Retention, encryption, residency, access, and deletion treatment                           | No verified backup mechanism or artifact exists                                                 | LEGAL REVIEW REQUIRED      | Privacy/legal + recovery owner  |
| LEGAL-012 | Account deletion                       | What is erased, retained, withdrawn, or unavailable; user-facing timing                    | UI truthfully distinguishes request/review from completed deletion and does not show a date     | LEGAL REVIEW REQUIRED      | Privacy/legal owner required    |
| LEGAL-013 | Essential storage / cookies            | Essential-storage definition and public notice language                                    | No non-essential analytics or marketing provider is active; final notice wording is absent      | LEGAL REVIEW REQUIRED      | Privacy/legal owner required    |
| LEGAL-014 | Public business identity/contact       | Approved legal/business identity and support contact                                       | Public contact page states delivery is not configured and does not invent an address            | BUSINESS INPUT REQUIRED    | Founder/business owner required |

## Required decisions before launch review

1. Approve or reject a retention rule for each data class above.
2. Define deletion exceptions and the user-visible consequences of account deletion.
3. Approve the secure export delivery architecture and its authorization/expiry controls.
4. Provide approved public business identity and contact details.
5. Record the accountable privacy/legal owner and decision date/version.

Until these decisions are recorded by an authorized owner, the corresponding launch gates remain **LEGAL REVIEW REQUIRED**, **BUSINESS INPUT REQUIRED**, or **EXTERNAL PROVIDER REQUIRED**. No application code should infer or silently apply a legal policy from this document.
