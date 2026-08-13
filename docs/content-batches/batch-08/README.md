# Content Production Batch 08 v0.1

## Scope

- Kids: K1-L27 through K1-L30
- Youths: Y1-L27 through Y1-L30
- Teens: T1-L27 through T1-L30

This closes Cycle 1 for all three segments: one synthesis unit plus three intentional flex units per segment.

## Flex-unit rule

L28-L30 are not pretending to be fixed canonical lessons. They are importable editorial templates. Catch-up and local/seasonal templates **must not be published** until the editor selects the actual approved passage/topic and completes normal review. L29 includes a safe default prayer/service anchor but may still be adapted under review.

## Upstream regression gates

Batch production now fails when:

1. `engagement.puzzle.type == "matching"` and `choices` is missing/empty.
2. any `framework_position` claim lacks a non-empty `interpretive_hinge`.

All records use repository `schema_version: 1.2.0` and remain `in_review`.
