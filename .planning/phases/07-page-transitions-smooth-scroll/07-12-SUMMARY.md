---
phase: 07-page-transitions-smooth-scroll
plan: 12
subsystem: tooling
tags: [bundle, performance, quality-gate, gap-closure]
requires: []
provides:
  - "pagesFromHtmlFiles route discovery helper (scripts/bundle.ts)"
  - "bundle gate over every built page (scripts/measure-bundle.ts)"
affects: [07-15]
tech-stack:
  added: []
  patterns: ["pure helper + thin fs script, unit-tested helper"]
key-files:
  created: []
  modified:
    - scripts/bundle.ts
    - scripts/measure-bundle.ts
    - tests/unit/measure-bundle.test.ts
decisions:
  - "Routes come from readdirSync(dist/client, recursive) through the pure pagesFromHtmlFiles helper; html is the separator-normalised path"
  - "Required-route guard (/, /es/, /projects/, /es/projects/) and an empty-list failure stop a broken build from passing by measuring nothing (T-07-25)"
  - "EAGER_CEILING_GZIP stays 22_000"
requirements: [MOTN-05, MOTN-06]
metrics:
  duration: "~6 min"
  completed: 2026-11-04
  tasks: 2
  files: 3
---

# Phase 7 Plan 12: Measure Every Built Page Summary

The bundle gate now finds every HTML page under `dist/client` with a pure, unit-tested `pagesFromHtmlFiles` helper. It checks eager markers (GreenSock, lenisVersion) and the 22,000 B eager gzip ceiling on all 20 built pages, and every problem names its route. This closes WR-04.

## Tasks

| Task | Name | Commits | Files |
| ---- | ---- | ------- | ----- |
| 1 | pagesFromHtmlFiles helper (TDD) | 7bce772 (RED), 5d1570a (GREEN) | scripts/bundle.ts, tests/unit/measure-bundle.test.ts |
| 2 | Measure every built page | 58ca390 | scripts/measure-bundle.ts |

## What changed

- `scripts/bundle.ts`: added `MeasuredPage` and `pagesFromHtmlFiles(paths)`. It turns `\` into `/`, keeps only `.html` files, maps `index.html` files to their directory route with a trailing slash and any other file to `/<path>`, and sorts by route. It does not touch the filesystem.
- `tests/unit/measure-bundle.test.ts`: 5 new cases covering the mapping, stable order for any input order, Windows separators, non-HTML input, and empty input.
- `scripts/measure-bundle.ts`:
  - Removed the hard-coded `PAGES`. Pages now come from `readdirSync(CLIENT, { recursive: true, encoding: 'utf8' })`.
  - Fails on an empty list or a missing required route.
  - Prints the per-file report for `/` and `/es/` and one line for every other page.
  - Prints a table of eager gzip per route, largest first, with the maximum.
  - Checks markers and the ceiling on every page.
  - The ok message now reads "on every built page".
  - Gzip sizes are cached per file because pages share chunks.

## Measured eager JS per route (gzip -9, after `pnpm build` on this worktree)

| Route | Eager gzip | vs 22,000 B |
| ----- | ---------- | ----------- |
| `/` | 23,010 B (13 files) | ABOVE (+1,010 B) |
| `/es/` | 23,010 B (13 files) | ABOVE (+1,010 B) |
| `/projects/portfolio-web/` | 15,702 B (9 files) | below |
| `/es/projects/portfolio-web/` | 15,702 B (9 files) | below |
| `/404.html` | 15,028 B (8 files) | below |
| `/es/404/` | 15,028 B | below |
| `/projects/` | 15,028 B | below |
| `/es/projects/` | 15,028 B | below |
| `/projects/cabreras-motos-posts/`, `/mart/`, `/purov/`, `/sistema-visual/`, `/website-instablogs/`, `/website-reciclick/` | 15,028 B each | below |
| `/es/projects/` same six slugs | 15,028 B each | below |

- Max is 23,010 B, on `/` and `/es/`. 20 pages were measured.
- No GreenSock or lenisVersion marker was found in eager chunks on any route.
- Lazy JS is 3 files on every route (35,713 B gzip on Home).
- `node scripts/measure-bundle.ts` exits 1, but only because of the known Home overage on `/` and `/es/`. The plan expects this until 07-15 lands.

Verified by: `pnpm build` then `node scripts/measure-bundle.ts`, `pnpm vitest run` (70 files, 1,247 tests passed), `pnpm lint` (exit 0).

## Deviations from Plan

- The plan's suggested GREEN commit message (`feat(07-12): measure every built page`) was used for Task 2. Task 1 GREEN uses `feat(07-12): add built page discovery helper` so each task has its own commit.
- For Windows-style input, `html` holds the normalised path (`projects/a/index.html`) rather than the raw input, so `join(CLIENT, html)` stays correct. On POSIX this is the same as the input.
- Ceiling problems carry a `<route>: ` prefix to match the marker problems (for example `/: eager JS on / is 23010 B ...`), so every problem line starts with its route.

Otherwise the plan was executed as written.

## Notes

- The build also emits `/es/404/` (a directory route) next to `/404.html`. Both are measured.

## Self-Check: PASSED

- FOUND: scripts/bundle.ts (exports pagesFromHtmlFiles, no node:fs)
- FOUND: scripts/measure-bundle.ts (readdirSync, EAGER_CEILING_GZIP = 22_000, no `const PAGES = [`)
- FOUND: commits 7bce772, 5d1570a, 58ca390
