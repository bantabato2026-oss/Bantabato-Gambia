# BANTABATO — Full Product Experience Interaction Design

## Branded signup entry

The registration route will use a compact **“Begin with intention”** welcome composition rather than a delayed splash screen. It will introduce three facts—private profile, thoughtful discovery, and member-controlled pace—before exposing the existing secure authentication button. The composition will use the existing forest/cream/gold palette, official brand area, trust-line language, and transform/opacity-only entrance treatment. The secure login handler remains unchanged and is always available without waiting for animation.

| State | Presentation | Accessibility and bandwidth behavior |
| --- | --- | --- |
| Default | One clear introduction card and three concise trust points. | Semantic heading/list, existing focus style, normal keyboard order. |
| Secure entry | Existing `startLogin()` action starts only after button activation. | No authentication URL generation in render; no new form or data collection. |
| Reduced motion | Same complete information with no decorative entrance motion. | CSS removes nonessential animation. |
| Low bandwidth | Same content with decorative orbit/root treatment hidden or static. | No new asset, video, fetch, or blocking media. |

## Progressive onboarding

The existing fields, local-draft key, network boundary, final `profile.save` mutation, and server validation remain unchanged. Only interaction organization changes: **Essentials → Life & marriage → Privacy** becomes a true three-step sequence. Members can move back without losing information; draft persistence remains device-local; only the final step calls the existing save mutation.

| Interaction | Rule |
| --- | --- |
| Step indicator | A labelled `<nav aria-label="Profile setup progress">` shows completed/current/upcoming state, not a score. |
| Continue | Runs browser validity validation on the current step only, focuses the first invalid current-step control, then advances. |
| Previous | Does not submit or discard values. |
| Save draft | Persists the existing narrow local draft at any step and gives a truthful local-only confirmation. |
| Final submit | Reuses offline refusal and existing profile-save mutation; no retry replays a mutation automatically. |
| Motion | Step content uses opacity/transform entry only; transition is disabled by existing reduced-motion/low-bandwidth selectors. |
| Mobile | Controls stack, no horizontal overflow, and the progress indicator remains readable at 375px. |

## Scope control

No change is planned to discovery/recommendation policy, staff scope, billing, Family Circle permissions, verification, photo review, engagement/marriage declaration, country policy, or provider capability. New animation is explanatory rather than gamified and must never convey profile rank, member desirability, verification outcome, safety status, or match likelihood.
