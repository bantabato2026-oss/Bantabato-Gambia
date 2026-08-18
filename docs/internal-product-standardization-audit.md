# BANTABATO — Internal Product Standardization Audit

**Prepared:** 18 August 2026  
**Scope:** The approved internal-standardization directive only. No external service is being activated or configured by this audit.

## Verified findings

| Area | Current implementation | Finding | Required internal action |
| --- | --- | --- | --- |
| Five-photo gallery | The gallery now stores distinct private object keys and prevents a sixth upload. Every new photo begins in `pending` review state. | The prior five-slot storage defect is repaired, but the displayed gallery count is not an approved-photo count and does not currently drive server eligibility. | Count only approved, non-deleted profile photos for eligibility; add a scoped photo-review workflow and member-safe completion guidance. |
| Profile completion | Core fields set `completedAt`, while the profile remains in `draft` unless another unrelated operation changes status. | Completion, activation, photos, discovery, and recommendations do not currently share an authoritative lifecycle; a normal completed profile can remain unreachable in active discovery. | Derive and persist an explicit active/needs-action outcome that never overrides pause, suspension, or safety restriction. |
| Discovery and recommendations | Both paths currently use active/search-visible conditions with separate completeness heuristics. | Five-approved-photo eligibility is not consistently applied to viewer or candidate paths. | Route all discovery and recommendation eligibility through one server-authoritative result. |
| Connection readiness | Readiness checks active accounts, reports, blocks, compatibility, verification, and consent. | It does not yet account for the new approved-photo completion policy. | Add approved-photo eligibility as a non-bypassable readiness gate and member-safe explanation. |
| Success declaration | A member can record an outcome, optional future-contact consent, and withdrawal. No public presentation exists. | Required draft/private/review/approved/published/withdrawn/rejected lifecycle, separate public-photo authorization, scoped editorial review, and high-impact approval controls are absent. | Extend the private declaration into a permission-scoped editorial record. No member content may become public without explicit consent, review, approval, and publication. |
| Staff authorization | The existing content-policy role and permission catalog have no success-story or profile-photo moderation permissions. | Editorial actions need least-privilege permission keys, fresh reauthentication for high-impact publication, independent approval, and audit events. | Additive permission and approval controls only; preserve existing staff role model. |
| Connectors | GitHub, Supabase, Sentry, and Cloudflare names appear in the current session configuration. | No connector is required to implement the internal product state model; external activation would exceed this directive. | Keep every connector inactive for this checkpoint. GitHub remains optional source control; Sentry/Cloudflare/Supabase require a separately approved, privacy-reviewed integration plan. |

## Implementation decision

The standardization checkpoint will use the existing MySQL/Drizzle backend, tRPC contract, private S3-compatible storage boundary, staff permission catalog, operational approvals, and audit log. It will not provision or migrate to Supabase, enable Sentry, modify Cloudflare, or perform external deployment/DNS/payment activity.
