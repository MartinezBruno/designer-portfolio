---
phase: 08-quality-verification
plan: 05
subsystem: i18n
tags: [i18n, spanish-review, qual-03, tooling]
requires:
  - phase: 08-03
    provides: service icon removed from services.json and content.config.ts
provides:
  - scripts/spanish-review.ts (buildSpanishReview, REVIEW_PATH, STATUS_DRAFT, NON_COPY_TODOS, escapeCell)
  - .planning/phases/08-quality-verification/08-SPANISH-REVIEW.md (generated, committed)
  - EMAIL_COPY_ES export in src/lib/contact/email.ts
  - pnpm review:spanish
affects: [08 final gate, Martina copy review]
tech-stack:
  added: []
  patterns: [generated planning doc guarded by a freshness unit test]
key-files:
  created:
    - scripts/spanish-review.ts
    - tests/unit/spanish-review.test.ts
    - .planning/phases/08-quality-verification/08-SPANISH-REVIEW.md
  modified:
    - src/lib/contact/email.ts
    - package.json
    - src/i18n/ui.en.ts
    - src/i18n/ui.es.ts
    - src/content.config.ts
    - src/lib/projects/overrides-schema.ts
key-decisions:
  - "Tools are listed as a bullet list (brand names, no status), not table rows, so every table row is a copy row with the draft status"
  - "Non-copy TODO(martina) list uses file:line constants; the unit test checks each line still holds TODO(martina) so the list cannot drift silently"
  - "Generator runs directly under node (pnpm review:spanish); the UPDATE_SPANISH_REVIEW fallback was not needed"
requirements-completed: [QUAL-03]
duration: ~15min
completed: 2026-11-06
---

# Phase 8 Plan 05: Spanish review file Summary

All site copy (102 UI keys, roles, services, project overrides and the Spanish-only contact email) is generated into one file, `08-SPANISH-REVIEW.md`, as `key | EN | ES | status` rows. A unit test fails if any string is missing, if the committed file is stale, or if a copy TODO(martina) comment in the source does not point to the file.

## Accomplishments
- `scripts/spanish-review.ts`: `buildSpanishReview()` is pure and deterministic (no timestamps). The CLI guard writes the file, and `pnpm review:spanish` runs it with node directly. The file has these sections: How to review, the D-14 scope note (I18N-09 v2, brand names), the UI dictionary grouped by key prefix (including `meta.*` and `notFound.*`), Roles, Services, Project overrides (one heading per project), Contact email (Spanish only), Tools (brand names), and Non-copy TODO(martina) (5 items plus the WR-04 `.example` placeholders).
- `EMAIL_COPY_ES` in `email.ts` now holds every Spanish email literal. `buildContactEmail` reads from it, and its output is byte-identical: the fixture test and all existing `contact-email` tests pass.
- The 11 dictionary TODO(martina) comments and the TODOs in `content.config.ts` and `overrides-schema.ts` now point to `08-SPANISH-REVIEW.md`. Only comments changed, so regenerating the review file produced no diff.

## Measurements
- The `en` dictionary has 102 keys. `grep -c "draft, for Martina's review"` on the review file returns 158, which is at least 102.
- `Non-copy TODO(martina)` appears once and `I18N-09` appears once.
- `pnpm test`: 71 files, 1312 tests, all passing. `pnpm check`: 0 errors, 0 warnings, 0 hints. ESLint and Prettier are clean on the touched files.

## Task Commits
1. Task 1 RED: `694b61a` test(08-05): add failing spanish review coverage test
2. Task 1 GREEN: `5386cf7` feat(08-05): generate spanish review file
3. Task 2 RED: `8a9ee73` test(08-05): add failing todo pointer test
4. Task 2 GREEN: `3424e61` docs(08-05): point copy todos at spanish review

## Hard-coded copy grep
`grep -rnE "(alt|aria-label|title|placeholder)=\"[A-Za-z]" src/components src/layouts src/pages` found nothing. `HARDCODED_COPY` is empty, and the section is left out of the file until an entry is added.

## Deviations from Plan
- `project-overrides.json` has no `moduleAlt` entries yet, so the review file has no moduleAlt rows. The generator and the test both handle them when entries are added.
- The test adds 2 checks beyond the plan. It exports `escapeCell`, `STATUS_DRAFT` and `NON_COPY_TODOS` for exact row matching, and it checks that each non-copy `file:line` still holds a TODO(martina).

Otherwise the plan ran as written.

## TDD Gate Compliance
Both tasks have a RED `test(...)` commit followed by a GREEN commit. Task 2 is a comment-only change, so its GREEN commit is typed `docs`.

## Known Stubs
None. The draft status on every row is intentional: it marks the copy for Martina's review (D-13).

## Self-Check: PASSED
All 3 created files exist, and commits 694b61a, 5386cf7, 8a9ee73 and 3424e61 are on the branch. No preview or e2e servers were started.
