# Content Production Batch 06 — HELD (not imported)

**Received:** 2026-08-13. **Status:** held pending a corrected re-export.

Batch 06 (K1-L19..L22, Y1-L19..L22, T1-L19..L22) declares `schema_version: "1.2.1"`
but every one of its 12 lessons fails the repository content schema. The batch is
authored against a **different, incompatible content shape** than schema v1.2.

## Structural differences (batch 06 vs. repo schema v1.2)

| Field | Batch 06 | Repo schema v1.2 requires |
| --- | --- | --- |
| `teacher.activities[].steps` | omitted; free-text `instructions` string | `steps` array (required) |
| `family.flow[]` | extra `step_id`, `title` properties | only `duration_minutes`, `type`, `instructions` |
| `family.interactive.type` | `sort` | one of quiz/puzzle/discussion/movement/creative/audit |
| `engagement.quiz[].type` | `single_choice` | `multiple_choice` (+ true_false/sequence/scenario/short_answer) |
| `engagement.puzzle.type` | `ordered_list` | one of sequence/matching/sort/word_scramble/case_grid |
| `editorial.source_provenance` | string | array |
| `editorial.editor_notes` | string | array |
| `editorial.review_state.*` | `pending` | not_started/in_review/approved/not_required |

The batch's own QA report claims "Schema validation errors: 0", so its validator is
not checking against the same schema this repository enforces.

## Action required upstream

Re-export Batch 06 against **schema v1.2.1** (the contract in `src/schemas/lesson.schema.json`),
matching the field shapes above, or supply a migration. Batches 01-05 imported
correctly against this schema; Batch 06 should follow the same shape.

Note also: Batch 06's `K1-L19` is a production rewrite of the existing seed lesson
(same id/title, "Jesus Calms the Storm"); on re-export it will overwrite the seed,
which is expected.

Two recurring smaller issues also seen (fixed inline for batches 04-05, should be
fixed upstream): matching puzzles omitting `choices`, and framework_position claims
omitting `interpretive_hinge`.
