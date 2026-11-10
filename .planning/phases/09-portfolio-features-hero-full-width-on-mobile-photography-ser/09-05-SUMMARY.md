---
phase: 09-portfolio-features-hero-full-width-on-mobile-photography-ser
plan: 05
subsystem: projects-grid
tags: [grid, tailwind, data-attributes, filter, PROJ-04]
requires:
  - "09-02: ProjectCardView.categoryId"
  - "09-03: sizesFor in src/lib/projects/layout.ts, DOM contract"
provides:
  - "li[data-tile][data-category] on every project card"
  - "ul[data-project-grid] on the project grid"
  - "tile span and cover aspect driven only by data-tile (runtime re-flow by attribute rewrite)"
affects:
  - "09-06 CategoryFilter (rewrites data-tile and sizes)"
tech-stack:
  added: []
  patterns:
    - "Tailwind 4 data-attribute variants (md:data-[tile=x]:...) and named group variants (group-data-[tile=x]/tile:...)"
key-files:
  created: []
  modified:
    - src/components/ui/ProjectCard.astro
    - src/components/ui/ProjectGrid.astro
    - tests/unit/project-card.test.ts
    - tests/unit/latest-work.test.ts
decisions:
  - "Variant order `md:data-[tile=...]:` compiles as written in Tailwind 4.3 (RESEARCH A2 confirmed); no reorder needed"
  - "data-category for a null category is rendered by Astro as a bare attribute, which HTML parses as the empty string"
metrics:
  duration: "~10 min"
  completed: 2026-11-10
  tasks: 2
  files: 4
---

# Phase 9 Plan 05: data-tile grid markup Summary

Project cards now size themselves from a `data-tile` attribute through literal Tailwind data variants and expose `data-category`. The grid `<ul>` is marked `data-project-grid`. The category filter (09-06) can re-flow the 12-column rhythm by rewriting `data-tile` alone, and the unfiltered layout is unchanged.

## What changed

- **ProjectCard.astro**: removed the local `sizeClasses`, `aspectClasses` and `sizesFor` maps. `sizesFor` is now imported from `src/lib/projects/layout.ts`.
  - The `<li>` gets `data-tile={size}`, `data-category={project.categoryId ?? ''}` and one literal class string: `group/tile md:data-[tile=large]:col-span-7 md:data-[tile=small]:col-span-5 md:data-[tile=large-end]:col-span-8 md:data-[tile=large-end]:col-start-3 md:data-[tile=third]:col-span-4`.
  - The frame class is `bg-surface-alt overflow-clip aspect-[5/4] md:group-data-[tile=small]/tile:aspect-[7/8] group-data-[tile=third]/tile:aspect-[4/5]`.
  - The eager, shutter and parallax spreads are unchanged.
- **ProjectGrid.astro**: added `data-project-grid` to the `<ul>`. The size logic is unchanged.
- **Tests**: the size tests now check `data-tile`, the literal variant tokens, the frame aspect tokens, `data-category` (set and empty), and `sizes` on the img and every source matching `sizesFor`. The latest-work test checks `data-tile="third"` on all three tiles and `data-project-grid` on the `<ul>`.

## Verification

- `pnpm vitest run`: 75 files and 1400 tests passed. `pnpm lint` (eslint, astro check, prettier) passed with 0 errors and 0 warnings.
- Built CSS from `pnpm build` was checked with a node brace-depth scan. Every `md:data-[tile=large|small|large-end|third]` rule and `md:group-data-[tile=small]/tile:aspect-[7/8]` sits inside `@media (width>=48rem)`. `group-data-[tile=third]/tile:aspect-[4/5]` sits in the utilities layer with no media query, which matches the old always-on `aspect-[4/5]`.
- E2E, run while holding `tmp/build-e2e.lock`: projects-grid, home-latest-work, parallax, motion-reveal, collection-motion, smooth-scroll, contact-lazy and anchors. All 136 tests passed and no spec was edited (`git diff --stat e515b6b -- tests/e2e` is empty).
- Lock: acquired fresh (no stale lock was present) and released after the run. No preview process was left running.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Test] Empty data-category serialisation**
- **Found during:** Task 1 GREEN
- **Issue:** Astro renders `data-category={''}` as a bare `data-category` attribute, not `data-category=""`. This is HTML-equivalent: `getAttribute` returns `''` and `[data-category=""]` matches.
- **Fix:** The new unit test accepts either serialisation and asserts there is no non-empty value. The component was not changed.
- **Files modified:** tests/unit/project-card.test.ts
- **Commit:** 6f3cb17

Task 2 was verification only. No fix was needed, so it has no commit.

### Note on taste-skill

The plan's intent is a markup refactor with pixel-identical output, so there is no visual change. Unchanged layout is shown by the layout e2e specs rather than by a taste-skill review.

## TDD Gate Compliance

- RED: e9b2ec5 `test(09-05): add failing data-tile render tests` (7 failing)
- GREEN: 6f3cb17 `feat(09-05): drive tile layout from data-tile`

## Commits

- e9b2ec5 test(09-05): add failing data-tile render tests
- 6f3cb17 feat(09-05): drive tile layout from data-tile

## Self-Check: PASSED

- src/components/ui/ProjectCard.astro, src/components/ui/ProjectGrid.astro, tests/unit/project-card.test.ts and tests/unit/latest-work.test.ts: FOUND
- e9b2ec5 and 6f3cb17: FOUND in git log
- `grep -cE "sizeClasses|aspectClasses" ProjectCard.astro` = 0. `data-[tile=large-end]` is present. `data-project-grid` appears once in ProjectGrid.astro.
