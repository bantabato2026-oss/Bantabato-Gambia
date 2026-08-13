# Bantabato Phase 2 — Existing Implementation Map

## Authentication and Authorization

The application uses the template’s Manus OAuth session flow. Server procedures use public or protected tRPC procedures, while the owner identity is promoted to the base `admin` role during user upsert. The existing `admin_roles` table already stores scoped operational roles, although the Phase 1 UI currently gates operations only on the broad user role. Phase 2 should apply those scopes to verification and Trust & Safety actions rather than build another authorization system.

## Member and Trust Foundations

Member data is stored separately from authenticated users in `member_profiles`. Profile photos are stored by key in S3-backed storage rather than database blobs. Profile visibility, photo visibility, discovery inclusion, family visibility, blocks, reports, matches, and messaging access are already server-side data models. Private conversation access is conditional on an active mutual match and block state.

## Verification and Storage

`verification_records` supports identity-document submissions and current review states. Identity documents are uploaded through the server to a private member-specific storage key, and the existing review helper creates an expiring signed URL only after an administrator-gated procedure. Phase 1 supports approve and reject outcomes, reviewer notes, notification creation, and audit events; it requires structured operational states, reasons, reviewer assignment, and scoped-role enforcement.

## Notifications and Safety

In-app notifications are persisted in `notifications`. `queueEmailNotification` is an intentionally inactive provider boundary, so Phase 2 should add channel abstractions and delivery records without claiming an email provider is live. Member reports and blocks already persist on the server; the administrative page currently shows simple queue counts but does not implement case workflows, assignment, notes, resolutions, or controlled moderator actions.

## Existing Tests

The repository already contains a logout test and four pure business-rule tests covering canonical matching, photo privacy, conversation gating, and verified-badge eligibility. Phase 2 should preserve them and add coverage for verification states, report transitions, RBAC scopes, and private document access.
