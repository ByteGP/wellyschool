# ADR-011: Build-time preview content mode

**Status:** Accepted.

## Context

The six seed lessons ship with status `vertical_slice_draft` and incomplete review
states — deliberately, because the team has not yet run the editorial workflow. The
build brief requires that production never exposes draft content, that approved
schedule entries never reference draft lessons (enforced by the validator), and that
Deploy Previews may render `in_review` content. The church calendar is not approved,
so no approved schedule entries can exist yet either.

Without a mechanism, the pilot site would render nothing at all, defeating the pack's
own requirement that the team test the six seed lessons in the web MVP before
mass-producing content.

## Decision

Introduce a build-time content mode, resolved once at build:

- `PUBLIC_CONTENT_MODE=production` (default): only lessons with status `approved`,
  `scheduled`, or `published` build routes; only `approved` schedule entries drive
  current-lesson selection.
- `PUBLIC_CONTENT_MODE=preview`: additionally renders `vertical_slice_draft` and
  `in_review` lessons and considers `draft` schedule entries, so the team can pilot
  the seed content end-to-end.

Netlify wiring in `netlify.toml`: Deploy Previews and branch deploys build in preview
mode; the production context builds in production mode. Preview builds emit
`noindex` metadata on lesson routes.

Placeholder schedule entries are committed with status `draft` (honest: the calendar
is unapproved), which validates cleanly and works in preview mode.

## Consequences

- Production stays empty until the team genuinely approves lessons and schedule
  entries through review — this is the governance model working as designed.
- The pilot runs on Deploy Previews or a branch deploy, matching brief §8 phase 8.
- No runtime flag exists; the mode is fixed per build and cannot leak drafts into a
  production artifact.
