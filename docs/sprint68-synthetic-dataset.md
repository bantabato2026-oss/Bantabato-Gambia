# Bantabato — Sprint 68 Synthetic Dataset and Scenario Register

**Dataset ID:** `SPRINT68-SYNTHETIC-AJ-v1`  
**Status:** Prepared as a deterministic test contract; no staging seed or external resource created.

## Synthetic-only rules

The dataset contains fictional accounts A–J only. It contains no real names, phone numbers, photographs, identity documents, private messages, production exports, or live contact points. Every generated asset must use the `SYNTHETIC-ASSET-` label prefix. Accounts are excluded from public discovery and public success stories. Notifications are disabled or routed to a synthetic sink; real SMS, email, calls, and push notifications are prohibited.

## Scenarios

1. New registration.
2. Incomplete profile.
3. Eligibility verification.
4. Five-photo approval using synthetic assets.
5. Married relationship status and polygamy scenarios.
6. Family Circle Parent and Wali/Guardian permissions.
7. Messaging and voice-note permissions.
8. Blocking and reporting.
9. Account privacy and deletion requests.
10. Staff permission boundaries and session revocation.
11. Recovery and rollback scenarios.

## Verification boundary

The deterministic fixture and automated contract are repository-level preparation evidence. They do not prove a working isolated deployment, storage namespace, OAuth application, notification sink, backup target, restore target, rollback target, or independent review. Those items remain unverified and blocked.
