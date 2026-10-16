---
phase: 02-homepage-story
plan: 03
subsystem: homepage
tags: [hero, availability, content, i18n, a11y]
requires:
  - phase: 02-01
    provides: getHomeContent(locale) and profile.json availability schema
  - phase: 02-02
    provides: availability.open dictionary key (EN/ES)
provides:
  - AvailabilityBadge.astro (conditional static pill)
  - Hero Props.available
  - HomeView reads getHomeContent(locale) (the single content reader for the homepage)
affects: [02-07]
tech-stack:
  added: []
  patterns:
    - "HomeView is the only component that reads content; sections receive plain props"
    - "Conditional render with {flag && (...)}: false state emits no element"
key-files:
  created:
    - src/components/ui/AvailabilityBadge.astro
    - tests/unit/availability-badge.test.ts
  modified:
    - src/components/sections/Hero.astro
    - src/components/views/HomeView.astro
key-decisions:
  - "Badge has no closed state: available=false renders nothing (D-08)"
  - "Badge dot uses bg-success, aria-hidden; no live region, no motion, no tab stop (D-11)"
requirements-completed: [HOME-07]
duration: 4min
completed: 2026-10-16
---

# Phase 2 Plan 03: Availability Badge Summary

A static "Open to new projects" / "Abierta a nuevos proyectos" pill is now the first child of the hero text column. Its presence comes from `profile.json` through `getHomeContent`, and when it is off nothing is rendered.

## Performance

- Duration: about 4 min
- Tasks: 2/2
- Files: 2 created, 2 modified

## Task Commits

1. Task 1 RED: `1820a45` test(02-03): add failing availability badge tests
2. Task 1 GREEN: `ca7d5ad` feat(02-03): add availability badge component
3. Task 2: `0a1e837` feat(02-03): show availability badge in hero

## What Was Built

- `src/components/ui/AvailabilityBadge.astro`: Props `{ available: boolean; locale: Locale }`. When `available` is true it renders `<p>` with a decorative `bg-success` dot (`aria-hidden="true"`) and `t('availability.open')`. When false it renders nothing.
- `src/components/sections/Hero.astro`: Props now include `available: boolean`. `<AvailabilityBadge>` sits on line 23, before the greeting on line 25. The h1, portrait and CTA are unchanged.
- `src/components/views/HomeView.astro`: `const content = await getHomeContent(locale);`, which passes `available={content.available}` to Hero.
- `tests/unit/availability-badge.test.ts`: 4 AstroContainer tests under `describe('availability badge')`. They cover EN true, ES true, false producing empty output, and the absence of role="status", aria-live, tabindex, `<a`, bg-accent and animate-.

## SC3 Content Flip

I changed `src/data/profile.json`, rebuilt with `pnpm build`, and counted matches with `grep -c`. The flip was never committed.

| `availability.available` | EN `dist/index.html` "Open to new projects" | ES `dist/es/index.html` "Abierta a nuevos proyectos" |
|---|---|---|
| true (committed value) | 1 | 1 |
| false (temporary flip) | 0 | 0 |
| true (restored, rebuilt) | 1 | 1 |

After the check I restored the file from `tmp/profile.json.bak`, confirmed it matched with `cmp`, and deleted the backup. `git status` showed no change to profile.json.

## Verification

- `pnpm vitest run tests/unit/availability-badge.test.ts`: 4/4 pass. RED failed before the component existed.
- `pnpm lint` (astro check, eslint, prettier): 0 errors.
- `pnpm test`: 11 files and 83 tests pass.
- `pnpm build`: 4 pages built.
- `tests/e2e/home.spec.ts`: 4/4 pass. It ran from a temporary config copy on port 4403 with server reuse off, and the copy was deleted afterwards. Port 4321 was left alone.
- `grep -rn "set:html" src | wc -l` returned 1, which is the same as before.

## Deviations from Plan

None. The plan was executed as written. The only difference is that the e2e run used port 4403 instead of 4321, as the orchestrator instructed.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: src/components/ui/AvailabilityBadge.astro
- FOUND: tests/unit/availability-badge.test.ts
- FOUND commits: 1820a45, ca7d5ad, 0a1e837
