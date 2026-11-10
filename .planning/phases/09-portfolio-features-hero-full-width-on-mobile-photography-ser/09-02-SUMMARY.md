---
phase: 09-portfolio-features-hero-full-width-on-mobile-photography-ser
plan: 02
subsystem: content, contact, projects
tags: [services, photography, contact, i18n, projects-filter]
requires: []
provides:
  - "Photography service (order 5) in services.json, categoryIds and SERVICE_IDS"
  - "ProjectCardView.categoryId (CategoryId | null) for the /projects/ filter"
affects: [09-03, 09-05, 09-06]
tech-stack:
  added: []
  patterns:
    - "Three-way drift guard: services.json order === categoryIds === SERVICE_IDS"
    - "buildServices count tied to categoryIds.length instead of a literal 4"
key-files:
  created: []
  modified:
    - src/data/services.json
    - src/lib/projects/model.ts
    - src/lib/projects/card-view.ts
    - src/lib/contact/fields.ts
    - src/lib/content/home.ts
    - scripts/spanish-review.ts
    - .planning/phases/08-quality-verification/08-SPANISH-REVIEW.md
    - .planning/REQUIREMENTS.md
    - tests/unit/* (13 files), tests/e2e/home-story.spec.ts, contact-preselect.spec.ts, contact.spec.ts
decisions:
  - "SERVICE_IDS stays a literal tuple (no import from model.ts) so the client contact bundle is unchanged; the drift guard ties it to categoryIds"
  - "HOME-04 already carried a Phase 9 note; added only the D-06..D-08 refs instead of a duplicate note"
metrics:
  duration: "~35 min"
  completed: 2026-11-10
---

# Phase 9 Plan 02: Photography service and card categoryId Summary

Photography / Fotografía is now the 5th service. It appears on Home, as a contact chip just before "Not sure yet", preselects through `?service=photography`, is accepted by the action, and the Spanish email labels it "Fotografía". Every project card view also carries a stable `categoryId` for the filter.

## Tasks

| Task | Name | Commits |
| ---- | ---- | ------- |
| 1 | Photography data, id tuples, build guard, unit tests | 51883e8 (RED), 2f4425f (GREEN) |
| 2 | categoryId on every project card view | 3801331 (RED), 5b61059 (GREEN) |
| 3 | e2e counts, Spanish review regen, HOME-04 wording | dc514a0 |

## Verification

- `pnpm test`: 72 files, 1332 tests pass
- `pnpm lint` (eslint, astro check, prettier): 0 errors
- `pnpm check`: 0 errors
- `pnpm build`: succeeds (assertCount accepts 5 services)
- Playwright home-story, contact-preselect and contact specs: 89 passed, run while holding the shared lock
- `src/data/project-overrides.json` unchanged
- 08-SPANISH-REVIEW.md lists the Photography title and its 4 items as "draft, for Martina's review"

## Deviations from Plan

1. **[Rule 3 - Blocking] Regenerated the Spanish review in Task 1 as well as Task 3.** Changing services.json made the freshness test fail. Regenerating in Task 1 keeps every commit green. Task 3 regenerated it again after the Hero TODO text change.
2. **home-story.spec.ts lines 228/343** are tool counts (5 tools), not per-card service item counts, so I left them alone. The service assertions (cards, links, no-JS h3) now use `sortedServices.length`, and a check pins that length to 5.
3. **REQUIREMENTS.md HOME-04** already said "5 with Photography from Phase 9". I added ", per D-06..D-08" instead of appending a second, duplicate note.
4. The worktree started at e14688b instead of the expected base 06adfbd. I reset it to 06adfbd as the startup check requires.

## Lock usage

I waited for plan 09-01's lock to be released (no stale removal), held the lock only for build and e2e, and released it afterwards.

## TDD Gate Compliance

Tasks 1 and 2 each have a `test(...)` RED commit followed by a `feat(...)` GREEN commit.

## Known Stubs

None.

## Self-Check: PASSED
