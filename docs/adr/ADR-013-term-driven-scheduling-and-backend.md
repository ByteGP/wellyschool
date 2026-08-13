# ADR-013: Term-driven scheduling and a teaching-log backend

**Status:** Accepted (owner decision, 2026-08-13).

## Context

Two owner requirements go beyond the original static MVP:

1. **Term-driven scheduling.** The owner wants to enter each year's school term
   start/end dates and have the site place lessons on term-time Sundays
   automatically, labelling holiday Sundays as breaks. Previously the schedule
   was hand-maintained as one JSON file per date+segment.
2. **A shared "taught" record.** Teachers want to mark each Sunday as taught /
   not taught / swapped to a different lesson, and review per term what was
   actually taught. This is shared, writable state that a purely static site
   cannot hold.

The build pack's MVP explicitly excludes a database, server functions, and
attendance tracking (ADR-001, ADR-008, brief §14/§20). These requirements are a
deliberate, owner-approved step past that boundary.

## Decision

### Part A: term-driven schedule (static)

- School terms live in `src/content/settings/terms.json` (Decap-editable),
  validated by `term-settings.schema.json`.
- At build time the schedule is generated (`src/lib/schedule/generate.ts`):
  each segment's public lessons, in cycle-then-sequence order, are assigned one
  per term-time Sunday; holiday Sundays inside the active teaching span become
  breaks carrying the next term's start date.
- Explicit entries in `src/content/schedule` still exist and **override** the
  generated entry for the same date+segment (special Sundays, manual swaps).
- The per-date placeholder schedule files were removed; the schedule collection
  remains for overrides only.

This stays fully static and changes no runtime infrastructure.

### Part B: teaching log (backend)

- A shared teaching log is stored in **Netlify Blobs**, read/written through two
  **Netlify Functions**, gated on writes by a single shared teacher passcode
  held in a Netlify environment variable (never in the repo).
- Chosen over Supabase to avoid a second vendor/bill and free-tier idle-pausing;
  Blobs + Functions are included in the existing Netlify plan.
- This is **operational data** (which lesson ran on which Sunday), not child
  data, so the safeguarding rules (no child accounts/profiles/attendance) are
  unaffected. Public teacher/parent/lesson pages stay static; only the log
  read/write hits a function.

## Consequences

- The site is no longer purely static: it gains term-driven build logic (Part A)
  and, in Part B, a small serverless surface. Both are documented deviations.
- Term dates become the single source of scheduling truth; the owner manages the
  calendar in Decap rather than hand-editing dated files.
- Part A ships first (this ADR's initial implementation); Part B follows.
