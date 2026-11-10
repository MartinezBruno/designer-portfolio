---
phase: 09-portfolio-features-hero-full-width-on-mobile-photography-ser
plan: 03
subsystem: projects-filter
tags: [filter, url-state, client-script, tdd, a11y, motion]
requires: []
provides:
  - parseCategoryParam / withCategory / ALL_CATEGORIES (src/lib/projects/category-param.ts)
  - buildCategoryChips / visibleTiles / CategoryChip / CategorizedCard (src/lib/projects/filter.ts)
  - sizesFor shared map (src/lib/projects/layout.ts)
  - applyCategory / filterStatusText / initCategoryFilter / bootCategoryFilter / FILTER_ROOT (src/lib/ui/category-filter.ts)
affects: [09-05 ProjectCard sizesFor import, 09-06 chip row + script wiring, 09-07 e2e]
tech-stack:
  added: []
  patterns:
    - allow-listed URL param (service-param analog), no imports
    - doc-agnostic apply + PageInit with AbortController cleanup
    - app-scoped astro:before-swap write to event.newDocument (bound once)
    - Web Animations API (opacity/translate only), no GSAP
key-files:
  created:
    - src/lib/projects/category-param.ts
    - src/lib/projects/filter.ts
    - src/lib/ui/category-filter.ts
    - tests/unit/category-param.test.ts
    - tests/unit/projects-filter.test.ts
    - tests/unit/category-filter.test.ts
  modified:
    - src/lib/projects/layout.ts
    - tests/unit/projects-layout.test.ts
decisions:
  - "In-phase animations use fill 'backwards' (not 'none') so staggered cards hold opacity 0 through their delay instead of flashing; no effect remains after finish"
  - "Reveal targets are marked instant only on newly visible cards (hidden before the change), per UI-SPEC Reveal interplay"
  - "bootCategoryFilter returns a remover and a second call is a no-op (module guard)"
metrics:
  duration: ~10min
  completed: 2026-11-10
---

# Phase 9 Plan 03: Category Param, Chip Builder and Client Filter Summary

The /projects/ category filter's logic, built and tested before any markup exists: an import-free, allow-listed `?category=` parser and URL writer, a chip builder that follows services.json order and drops empty categories, a shared `sizesFor` map, and a client module. The client module filters any Document, writes the URL with `replaceState(history.state)`, announces the result only when the visitor changes the filter, animates with WAAPI under `motion=on` (instant otherwise), and filters the router's `newDocument` before the swap.

## Tasks

| Task | Name | Commits |
|------|------|---------|
| 1 | Pure modules: category-param.ts, filter.ts, sizesFor | 1034ff0 (RED), d0e149f (GREEN), 0e9eab7 (REFACTOR: comment wording) |
| 2 | Client module category-filter.ts | 74ed91f (RED), e9c3621 (GREEN) |

## DOM contract (for 09-05 / 09-06)

- `<fieldset data-project-filter>` with `input[type=radio][name=category]`. All has `id="projects-filter-all" value=""`. Each category has `id="projects-filter-{id}" value="{id}"` and a `<label for>` that holds the category title.
- `<p role="status" data-project-filter-status data-status-all data-status-one data-status-many>` with `{count}` and `{category}` tokens, empty in the HTML.
- `<ul data-project-grid>` > `li[data-tile][data-category]`, each with `source[sizes]`/`img[sizes]` and `[data-reveal]` targets.
- Wiring left to 09-06: call `bootCategoryFilter(document)` once (app scope), and `lifecycle.register(initCategoryFilter)` on the Projects page.

## Verification

- `pnpm vitest run` on the 4 plan test files passes. Full `pnpm test`: 75 files, 1380 tests pass.
- `pnpm lint` (astro check 0/0/0, eslint, prettier) passes.
- Acceptance greps: category-param imports = 0; `export const sizesFor` = 1; `astro:|i18n` in filter.ts = 0; pushState = 0; replaceState = 3; innerHTML/gsap/zod/dictionaries = 0; `astro:before-swap` = 3.

## TDD Gate Compliance

RED (`test(09-03)`) commits come before their GREEN (`feat(09-03)`) commits for both tasks. A refactor commit follows.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] In-phase fill mode `backwards` instead of `none`**
- **Found during:** Task 2
- **Issue:** With `fill: 'none'` and a stagger delay, cards that stay visible would render at full opacity during their delay, then jump to opacity 0 when the animation started (a flicker).
- **Fix:** Used `fill: 'backwards'`. It holds the first keyframe through the delay and leaves no effect and no inline style after the animation finishes.
- **Commit:** e9c3621

**2. [Rule 3 - Blocking] Comment wording to satisfy acceptance greps**
- The header comments mentioned "pushState", "innerHTML" and "astro:*", which tripped the zero-count grep checks and the import-pin test. Reworded them; the code is unchanged. Commits: e9c3621, 0e9eab7.

### Not done here (out of plan scope)

- UI-SPEC "call `ScrollTrigger.refresh()` after a swap only if GSAP is loaded" is not in this plan's actions. It is left to 09-06/09-07 wiring if needed.
- `ProjectCard.astro` still keeps its local `sizesFor`. Plan 09-05 removes it and imports the shared copy.

## Known Stubs

None.

## Self-Check: PASSED

- Files exist: category-param.ts, filter.ts, category-filter.ts, and the 3 new test files plus projects-layout.test.ts.
- Commits exist: 1034ff0, d0e149f, 74ed91f, e9c3621, 0e9eab7.
