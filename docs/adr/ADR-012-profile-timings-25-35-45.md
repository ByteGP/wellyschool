# ADR-012: Delivery profile timings change to 25 / 35 / 45 minutes

**Status:** Accepted (owner decision, 2026-08-12).

## Context

The build pack shipped delivery profiles of Essential 25, Standard 40, and
Extended 55 minutes, locked in `lesson.schema.json` (schema v1.2.0) and enforced
by the content validator. The owner has decided the classes run shorter:
Short (25 min), Standard (35 min), and Extended (45 min).

## Decision

- Schema bumped to v1.2.1: `delivery_profile.duration_minutes` enum changes
  from `[25, 40, 55]` to `[25, 35, 45]`; `schema_version` const becomes `1.2.1`.
- Profile labels change to Short, Standard, Extended. Internal keys
  (`essential`, `standard`, `extended`) are unchanged so stored teacher
  preferences and code paths keep working.
- The migration script `scripts/migrations/2026-08-12-profile-timings.mjs`
  rescales each outline proportionally to the new total (minimum 1 minute per
  step, largest steps absorb rounding), bumps each lesson `content_version`
  minor, and rewrites labels. Step wording, order, questions, activities, and
  all theological content are untouched.
- The validator's expected totals change to 25 / 35 / 45.

## Consequences

- This intentionally deviates from the build pack's acceptance test B
  ("outlines total 25, 40, and 55 minutes"); this ADR is the record.
- Future lessons must be authored against the new totals.
- Re-running the migration is a no-op (it skips lessons already at 1.2.1).
