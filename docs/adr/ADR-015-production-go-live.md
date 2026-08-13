# ADR-015: Production go-live (approve full curriculum)

**Status:** Accepted (explicit owner decision, 2026-08-14).

## Context

Through the pilot, `CONTENT_MODE=production` rendered nothing because every
lesson was a draft (`in_review` / `vertical_slice_draft`), and the validator
gates `approved` status behind completed editorial sign-offs in each lesson's
`editorial.review_state` (ADR-011). The pilot ran the production Netlify context
in `preview` mode so the team could review the whole curriculum on the live
host.

The owner decided to go live with the entire curriculum now. At the time of this
decision `main` was at v1.20.0 with **202 lessons / 209 resources**. Of these,
the batches 11-14 imports (K2/Y2/T2 L13-30 and K3/Y3/T3 L01-06, 72 lessons) were
freshly imported and had **not** been through editorial review.

## Decision

Promote the **entire** curriculum and switch production to real content:

- Every lesson: `status` -> `approved`, and `editorial.review_state` dimensions
  set to a completed value — `exegetical` / `developmental` / `copy` ->
  `approved`; `pastoral` left `not_required` where already so, otherwise
  `deferred_owner_managed` (owner-managed, the schema's escape hatch for the
  safeguarding-adjacent dimension).
- `netlify.toml` `[context.production.environment]` `CONTENT_MODE` ->
  `production`. Deploy Previews and branch deploys stay `preview`.
- Delete the 4 original build-pack seed lessons that were still
  `vertical_slice_draft` (K5-L13, T3-L18, T4-L22, Y4-L20) and their 8
  self-owned resources, rather than publish them. Three (K5/T4/Y4) were the
  only lesson in their cycle, so promoting them would render one-lesson
  "cycles"; T3-L18 was a stray seed in the now-populated T3 cycle. Verified no
  other lesson or schedule entry references them. Net: 202 -> 198 lessons,
  209 -> 201 resources.

This **deliberately takes the unreviewed batch 11-14 content live**, as an
explicit owner decision, accepting that editorial review for those 72 lessons
had not been completed at go-live. The owner was shown this trade-off and chose
to proceed; it is recorded here so it is an auditable decision rather than a
silent side effect.

## Consequences

- Production now renders all 198 lessons; the effective schedule (ADR-013)
  populates real Sundays, and the calendar integration feed / redirects
  (ADR-014) cover the full curriculum.
- The `editorial.review_state` fields no longer reflect an outstanding review
  queue for batches 11-14. If post-hoc editorial review of that content is
  desired, it must be tracked outside these now-`approved` flags (e.g. an issue
  list), since the gate has been satisfied.
- The content-loader governance test was updated from "production renders none"
  to "production renders the approved curriculum (202)".
- Reverting go-live means flipping `CONTENT_MODE` back to `preview` (or lowering
  specific lessons' status); the content itself remains in the repo either way.
