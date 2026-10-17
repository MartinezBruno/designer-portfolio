---
phase: 03-real-behance-work
plan: 03
subsystem: projects-ui
tags: [projects, grid, layout, card, loading, a11y, taste-skill]
requires:
  - 03-02 (ProjectCard, ProjectGrid, ProjectsView, /projects/ pages)
provides:
  - src/lib/projects/layout.ts (tileSizes, TileSize, tileSize(index, count))
  - ProjectCard required props size + eager, sizeClasses/aspectClasses/sizesFor maps
  - ProjectGrid wires tileSize(index, projects.length) and eager={eagerFirst === true && index === 0}
affects: [03-05 (Home compact grid uses the same rhythm), 03-09 (real covers; re-run taste gate)]
tech-stack:
  added: []
  patterns:
    - Tile size from position via a pure function, never CSS nth-*
    - Literal Record<TileSize, string> class maps so Tailwind sees full strings
    - Conditional attribute spread for fetchpriority (exactOptionalPropertyTypes-safe)
key-files:
  created:
    - src/lib/projects/layout.ts
    - tests/unit/projects-layout.test.ts
    - tests/unit/project-card.test.ts
    - tests/e2e/projects-grid.spec.ts
  modified:
    - src/components/ui/ProjectCard.astro
    - src/components/ui/ProjectGrid.astro
decisions:
  - "ProjectCard size and eager are now required props; the 03-02 optional eager default moved to ProjectGrid (eagerFirst === true && index === 0)"
  - "tileSize also rejects non-integer indexes with the same range error"
  - "The taste focal-point FAIL on /projects/ is left open: fixing it needs a display-size h1 or a bigger first tile, both outside the UI-SPEC contract (needs a design decision)"
metrics:
  duration: ~25 min
  completed: 2026-10-17
  tasks: 3
  files: 6
---

# Phase 3 Plan 03: Asymmetric projects grid Summary

From md up, the Projects page now uses the D-18 zig-zag: 7 columns, then 5, then 5, then 7, repeating. On an odd count above 1, the lone last tile is pushed to the right edge. DOM, tab and visual order stay newest first. The rhythm comes from a pure `tileSize(index, count)` function. ProjectCard gets per-size column, aspect and `sizes` maps, and only tile 0 is eager with `fetchpriority="high"`.

## What was built

- **`src/lib/projects/layout.ts`:** exports `tileSizes = ['large','small','large-end'] as const`, `TileSize`, and `tileSize(index, count)`.
  - Returns `large-end` when `count > 1`, `count` is odd and `index === count - 1`.
  - Otherwise follows `index % 4`: L S S L.
  - Throws `projects: tileSize index <i> out of range for <count> tiles` on an out-of-range index.
- **`ProjectCard.astro`:** new required props `size: TileSize` and `eager: boolean`.
  - Literal maps: `sizeClasses` (`md:col-span-7` / `md:col-span-5` / `md:col-span-7 md:col-start-6`), `aspectClasses` (`aspect-[5/4]`, small adds `md:aspect-[7/8]`) and `sizesFor` (625px/57vw for large, 440px/40vw for small, both falling back to 100vw).
  - `fetchpriority` goes through a conditional spread (`{...priority}`), so lazy covers carry no attribute.
  - `widths={[404, 640, 808]}` is unchanged. Everything else from 03-02 is unchanged too: no box, square corners, stretched link, `<dl>` meta, no transitions.
- **`ProjectGrid.astro`:** passes `size={tileSize(index, projects.length)}` and `eager={eagerFirst === true && index === 0}`. The container classes are unchanged.

## Verification

- `pnpm vitest run tests/unit/projects-layout.test.ts tests/unit/project-card.test.ts`: 25 pass. Every behavior bullet has an `it(` case.
  - `<Picture>` renders inside AstroContainer, so the loading, fetchpriority, width/height and `sizes` checks are in the unit test as well as the e2e. The [Inference] fallback in the plan was not needed.
- `pnpm test`: 25 files, 271 tests pass (was 246).
- `pnpm test:e2e`: 132/132 pass (was 120). That includes the 12 new `projects grid` tests (6 per locale).
- `pnpm lint`: astro check 0 errors and 0 warnings, eslint clean, prettier clean. `pnpm build:offline` ok (0 network attempts).
- Acceptance greps:
  - `grep -n "fetchpriority={" ProjectCard.astro` finds nothing.
  - `grep -n "grid-flow-dense\|order-\|row-span"` on both components finds nothing. I reworded the ProjectGrid doc comment so it no longer names those classes.
- RED checks:
  - The e2e failed on the width rhythm (all tiles 1088px). Eager-loading already passed, because 03-02 added `eager` early.
  - The unit tests failed on the missing `layout` module and on `md:col-span-12`.

## Taste gate

The skill scripts were resolved at runtime (`taste-skill/2.0.0`).

- `lint.mjs` on ProjectCard, ProjectGrid and ProjectsView: **0 FAIL, 0 WARN**.
- `inspect.mjs` ran at 1440, 768 and 390 on the built preview. Reports are in `.taste-skill/inspect-projects/report.json` and `.taste-skill/inspect-projects-es/report.json` (gitignored).
  - The first run hit port 4321, which another process holds and which serves a stale build: single-column tiles, `md:col-span-12`. Astro moved my preview to 4322. I discarded that run and re-ran both pages on 4322.

Findings, identical for `/projects/` and `/es/projects/`:

| Level | Code | Width | Origin |
|-------|------|-------|--------|
| FAIL | `still-page` | 1440 | Pre-existing (Home baseline). Motion is Phase 6, and UI-SPEC bans transitions in Phase 3. |
| FAIL | `empty-screens` | 1440 | Already raised in 03-02. It dropped from 8 of 9 screens to 3 of 4 (page height went from 8.4 to 3.4 screens). The rest comes from the flat seed placeholder covers: the inspector measures pixel fill, and a screen half covered by solid placeholders scores 0.04–0.06 filled. Re-run after the 03-09 real covers. |
| FAIL | `focal-point` | 1440 | **New in this plan.** The first L tile is about 625×500, which is 24% of a 1440×900 viewport (the rule needs at least 30%). The h1 is 48px, or 3.3vw (the rule needs at least 4.5vw). Before this plan the full-width first cover passed. Fixing it needs a display-size h1 or a larger first tile, and both break the UI-SPEC type scale or the D-18 rhythm. I did not change it (see Issues needing a decision). |
| WARN | `hairline` | all | Pre-existing header border (UI-SPEC: untouched). |
| WARN | `palette-cream` | all | Pre-existing palette. |
| WARN | `first-action` | all | Raised in 03-02 on this page. Comes from the site shell (no button in the first screen). |
| WARN | `no-footage` | 1440 | Pre-existing. |

- `icon-cards`: 0 in both reports. No card-row finding.
- No horizontal overflow at any width.

Screenshots I reviewed (desktop fold and pages, tablet pages, mobile pages, EN and ES):
- The rhythm reads `L S · S L · L S · · E` at 1440 and 768, and the last tile ends at the right edge. At 390 it is one column.
- Covers in each row line up within about 2px at 1440. 5/4 next to 7/8 gives the same row height.
- Every title is one line at every width in both locales.
- The covers are flat placeholders until 03-09, so I judged layout only, not imagery.

## Commits

| Task | Commit | Message |
| ---- | ------ | ------- |
| 1 (RED e2e) | 66a5ef6 | test(03-03): add failing projects grid e2e |
| 2 RED | ccaa794 | test(03-03): add failing tile size and card tests |
| 2 GREEN | 49d9dff | feat(03-03): add asymmetric projects grid rhythm |
| 3 | none | The taste gate needed no code change inside the contract |

## TDD Gate Compliance

Task 2 has a `test(...)` RED commit (ccaa794), then a `feat(...)` GREEN commit (49d9dff). The RED commit does not pass `astro check` (missing `layout` module). Every other commit passes `pnpm lint`.

## Deviations from Plan

1. **[Rule 1 - Bug] `fetchpriority={eager ? 'high' : undefined}` from 03-02 replaced by a conditional spread.** The plan required this (pattern-mapper issue 5).
2. **`eager` made required on ProjectCard,** as the plan's props contract says. The optional default moved to ProjectGrid. Only ProjectGrid renders ProjectCard today, so nothing else had to change.
3. **ProjectGrid doc comment reworded** so the acceptance grep (`grid-flow-dense|order-|row-span`) finds nothing. Behavior is unchanged.
4. **Extra coverage:** a `sizes` attribute test per size, a width/height test in the unit file, and non-integer index rejection in `tileSize`.

## Issues needing a decision

- **`focal-point` FAIL on `/projects/` and `/es/projects/` (1440).** Possible fixes, all outside the current UI-SPEC:
  - (a) Set the Projects h1 at display size (about 4.5vw / 64px or more).
  - (b) Let the first tile span 12 columns as a lead image, then start the zig-zag.
  - (c) Accept and defend: the D-18 grid is a deliberate set of several pictures, which the skill explicitly counts as "not one thing".
  - This needs a UI-SPEC or user decision, possibly in a fix plan after 03-09, when the real covers change the picture.

## Known Stubs

- Covers are still the seed placeholders (03-09). Card links still 404 until Phase 4 (D-09). Both come from 03-02 and are not new.

## Self-Check: PASSED

- Files exist: src/lib/projects/layout.ts, tests/unit/projects-layout.test.ts, tests/unit/project-card.test.ts, tests/e2e/projects-grid.spec.ts.
- Commits 66a5ef6, ccaa794, 49d9dff are present in `git log`.
- Both taste report.json files exist.
