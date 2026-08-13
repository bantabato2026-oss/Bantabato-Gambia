# Bantabato Phase 3 — Existing Profile and Discovery Implementation Map

## Reused Foundations

The existing `member_profiles` table already contains a member-owned profile draft with identity, location, religion, education, profession, marriage timeline, relocation, polygyny, children, biography, lifestyle, high-level visibility, family visibility, discovery status, and account-state controls. `member_preferences` is the existing one-to-one home for age, religion, location, tribe, education, marriage-intention, and must-have preferences; it will be extended rather than replaced.

Discovery is server-side and currently filters active, searchable, non-deleted profiles while excluding the requester and blocked pairs. Profile detail access is protected, applies active/deleted checks, and gates family background by visibility and mutual match. Interests, matching, conversations, blocking, reporting, notifications, and manual verification are already independent systems and will not be recreated.

## Phase 3 Extension Strategy

Phase 3 will add optional compatibility-relevant profile sections, a per-field visibility table, structured hard-versus-soft preference data on `member_preferences`, and a pure deterministic compatibility-dimension service. Curated discovery will reuse the existing server-side block, account-state, and profile-visibility conditions, apply bounded cursor pagination, and return explainable compatibility dimensions rather than engagement scoring or percentages.

## Explicitly Out of Scope

The phase will not create an AI matching system, attractiveness or popularity scoring, Trust Score, Marriage Intent Authenticity Score, voice/video calling, a duplicate Family Circle, a new messaging system, or a final diaspora product. It will not fabricate member records, verification badges, imagery, or external integration credentials.
