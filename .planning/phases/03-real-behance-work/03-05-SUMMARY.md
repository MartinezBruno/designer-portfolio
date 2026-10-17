---
phase: 03-real-behance-work
plan: 05
subsystem: home-and-nav
tags: [home, latest-work, header, nav, a11y, keyboard, layout, taste-skill]
requires:
  - 03-03 (ProjectGrid with tileSize, ProjectCard size/eager)
  - 03-04 (getLatestProjects, expectedHome/expectedProjects helpers)
provides:
  - src/components/sections/LatestWork.astro (Home "Latest work", omitted when empty)
  - SiteHeader Projects + Contact nav list, aria-current on /projects/, two-row header below sm
  - scroll-pt-24 sm:scroll-pt-20 on <html>
  - e2e keyboard order for /projects/ and /es/projects/, phase 3 header/layout checks
affects: [03-09 (re-run taste gate on / with real covers), phase-4 (remove D-09 link TODOs)]
tech-stack:
  added: []
  patterns:
    - One frontmatter class const shared by both nav links (no duplicated class strings)
    - Project tile focus ring asserted on ::after (ringOnAfter step flag)
key-files:
  created:
    - src/components/sections/LatestWork.astro
    - tests/unit/latest-work.test.ts
    - tests/unit/site-header.test.ts
    - tests/e2e/home-latest-work.spec.ts
  modified:
    - src/components/views/HomeView.astro
    - src/components/global/SiteHeader.astro
    - src/layouts/BaseLayout.astro
    - tests/e2e/a11y.spec.ts
    - tests/e2e/layout.spec.ts
    - tests/e2e/home.spec.ts (outside files_modified, see Deviations)
    - tests/e2e/motion.spec.ts (outside files_modified, see Deviations)
decisions:
  - "LatestWork renders nothing (no heading, no See all) when the selection is empty; the guard is in the section, so HomeView stays a plain insertion"
  - "isProjects is computed from stripLocale(pathname) with /^\\/projects\\/?$/, so only the index page is current (detail pages in Phase 4 will not be)"
metrics:
  duration: ~25 min
  completed: 2026-10-17
  tasks: 3
  files: 11
---

# Phase 3 Plan 05: Latest work on Home and Projects nav link Summary

Home now has a "Latest work" / "Trabajo reciente" section between the services and the tools. It shows up to 3 compact cards (cover, title, category, year) from `getLatestProjects(locale)`, followed by a "See all projects" / "Ver todos los proyectos" text link to the Projects page. The header nav lists Projects before Contact on every page. The Projects link gets `aria-current="page"` and an ink underline on `/projects/` and `/es/projects/`. Below 640px the header is two rows; from 640px up it is one 64px row.

## What was built

- **LatestWork.astro.** Props are `{ projects, locale }`.
  - Renders `section[aria-labelledby="work-title"]` containing the h2, then `<ProjectGrid variant="compact" headingLevel={3}>` (no `eagerFirst`, so every Home cover loads lazily), then the See-all `<p><a>`. The link uses the explicitly imported `IconArrowRight` (aria-hidden, size-5).
  - Renders nothing when `projects.length === 0`.
- **HomeView.astro.** Adds `const latest = await getLatestProjects(locale)`. The placeholder comment is replaced by `<LatestWork>`, placed between FeaturedServices and ToolsRow inside the existing `gap-16 py-16` wrapper.
- **SiteHeader.astro.** The header now uses `sm:h-16` instead of a fixed `h-16`.
  - The wrapper is `flex-wrap … sm:flex-nowrap`, and the right group is `basis-full … sm:basis-auto`.
  - The nav is a `<ul>` holding Projects then Contact. Both links share one `navLink` class const.
  - The Projects link adds `aria-[current=page]:underline decoration-2 underline-offset-4`.
  - DOM order is unchanged: wordmark, nav, language switcher.
- **BaseLayout.astro.** `<html … class="scroll-pt-24 sm:scroll-pt-20">`.

## Verification

- RED:
  - The e2e ran first and failed 10 of 10.
  - Unit: the header file failed 7 of 7, and the latest-work file failed to load because the module did not exist yet.
- GREEN: `pnpm vitest run` on the two new unit files passes 13 tests. `pnpm test:e2e -g "latest work"` passes 10 of 10.
- Task 3 filter: `pnpm test:e2e -g "axe violations|keyboard Tab order|phase 3 header and layout|latest work|projects page"` passes 59 of 59.
  - This includes the two-row header heights (64±1 at 640px, 89±2 at 390px), no overflow at 320px on all four pages, and a one-line wordmark.
  - The scroll-padding check passes: on /projects/ at 390px, Shift+Tab from the footer email lands on a tile whose top is at or below the header's bottom.
- Final gates, all green:
  - `pnpm lint`: astro check 0 errors and 0 warnings, eslint clean, prettier clean.
  - `pnpm test`: 29 files, 316 tests (was 303).
  - Full `pnpm test:e2e`: 165 of 165 (was 136).
  - `pnpm build:offline`: ok, 0 network attempts.
  - `grep -rn "set:html" src` still finds only 1 (T-03-11).
- Acceptance greps:
  - The placeholder comment is gone.
  - `<LatestWork` sits on the line between `<FeaturedServices` and `<ToolsRow`.
  - The `scroll-pt-24 sm:scroll-pt-20` line exists.
  - The IconArrowRight import count is 1.
  - `hrefPattern` and `'::after'` are present in a11y.spec.ts, and `/projects/` is present in layout.spec.ts.

## Taste gate

The skill was resolved at runtime (`taste-skill/2.0.0`).

- **lint.mjs** on LatestWork.astro and SiteHeader.astro: 1 FAIL, `hairline` on the header's `border-b`. That line was already there. UI-SPEC says the header hairline stays untouched ("pre-existing taste WARN, not widened here"), so I recorded it and did not change it. LatestWork: 0 FAIL, 0 WARN.
- **inspect.mjs.** I ran it at 1440, 768 and 390 against my own build on port 4323. I first checked that the served HTML contained `work-title`, and I stopped the preview afterwards. Reports: `.taste-skill/inspect-home-p3/report.json` and `.taste-skill/inspect-home-p3-es/report.json` (gitignored).

Codes, identical for `/` and `/es/`, compared with the baseline `.taste-skill/inspect/report.json`:

| Level | Code | Versus baseline | Note |
|-------|------|-----------------|------|
| FAIL | `icon-cards` | pre-existing | Services row (Phase 2), recorded, not fixed |
| FAIL | `still-page` | pre-existing | Motion is Phase 6 |
| FAIL | `empty-screens` | **new** | Screens 2 and 3 of 4 at 1440 (see below) |
| WARN | `hairline` | pre-existing | Header border, untouched per UI-SPEC |
| WARN | `palette-cream` | pre-existing | |
| WARN | `no-footage` | pre-existing | |
| — | `few-pictures` | **cleared** | Was a FAIL (1 picture); the page now has 4 images |

**`empty-screens` (new).** Screens 2 and 3 at 1440px are counted as almost empty. In the screenshots this is the Latest work section:
- The covers are still the flat seed placeholders (03-09). The inspector measures pixel fill, so a solid placeholder counts as empty, the same mechanism 03-03 recorded on /projects/.
- With 3 items, 03-03's `tileSize` makes the third tile `large-end` and pushes it right, which leaves the left 5 columns of that row empty at md+.
- I did not change the grid. The rhythm belongs to 03-03 and D-18. Re-run this gate after 03-09 brings in real covers. If it still fails, the options are a compact-specific rhythm for 3 items (for example L S then a full-width third tile) or accepting the result. That is a design decision, not mine to make.

Screenshots I reviewed (desktop pages EN, mobile fold EN, mobile and tablet pages ES):
- The two-row header at 390px reads wordmark on row 1, then Projects/Contact on the left and EN/ES on the right on row 2.
- From 768px it is a single row.
- Card titles are one line, and See all sits start-aligned under the grid.
- No overflow.

## Commits

| Task | Commit | Message |
| ---- | ------ | ------- |
| 1 (RED e2e) | c3e1134 | test(03-05): add failing latest work e2e |
| 2 RED | 33ec256 | test(03-05): add failing latest work and header tests |
| 2 GREEN | 5f8e402 | feat(03-05): add latest work and projects nav link |
| 3 | fe27aa6 | test(03-05): cover nav keyboard order and layout |
| 3 (Rule 3 fix) | 4ae34d0 | fix(03-05): scope hero picture e2e locators |

## TDD Gate Compliance

Task 2 has a RED `test(...)` commit (33ec256), confirmed failing, followed by a GREEN `feat(...)` commit (5f8e402). Commit 33ec256 does not pass `astro check`, because LatestWork.astro does not exist yet. Every later commit passes lint.

## Deviations from Plan

1. **[Rule 3 - Blocking] Hero e2e locators scoped to the hero section.** The files were `tests/e2e/home.spec.ts` and `tests/e2e/motion.spec.ts`, both **outside files_modified**.
   - With the Home covers in place, `#main picture` matched 4 pictures. Playwright's strict mode then failed 12 hero and motion tests in the full suite.
   - I changed the locator to `#main section[aria-labelledby="hero-title"] picture` in 5 places. The tests assert the same things as before. Commit 4ae34d0.
2. **The reduced-motion axe check for `/projects/` and `/es/projects/` is its own loop** inside the reduced-motion describe. The existing loop is coupled to the Home keyboard cases. The reduced-motion keyboard order for the Projects pages is not repeated: those pages have no pause button, so it would be identical to the motion-on run.
3. **Extra unit coverage:** a 1-project case (1 card plus See all) and a check that compact cards render no summary and no tools.
4. I did not touch scripts/behance/*, scripts/sync-behance.ts or package.json (03-08 owns them). I did not modify STATE.md or ROADMAP.md.

## Issues needing a decision

- `empty-screens` FAIL on `/` and `/es/` at 1440 (see Taste gate). Re-check after 03-09. If it persists, choose between a compact 3-item rhythm and accepting it.
- The `focal-point` FAIL on /projects/ from 03-03 is still open. This plan does not touch it.

## Known Stubs

- Home card links point to `/projects/<slug>/`, which 404s until Phase 4 (D-09). They are asserted and never followed, and they carry `TODO(phase-4)` in both specs.
- Covers are still seed placeholders until 03-09 (inherited).

## Threat Flags

None. T-03-11 is covered: LatestWork reuses ProjectCard, which interpolates only through `{}`, and `set:html` still appears exactly once in src. The nav links are static same-origin URLs from `getRelativeLocaleUrl` (T-03-12 accepted).

## Self-Check: PASSED

- Files exist: src/components/sections/LatestWork.astro, tests/unit/latest-work.test.ts, tests/unit/site-header.test.ts, tests/e2e/home-latest-work.spec.ts.
- Commits c3e1134, 33ec256, 5f8e402, fe27aa6 and 4ae34d0 are in `git log`.
- Both taste report.json files exist (.taste-skill/inspect-home-p3, .taste-skill/inspect-home-p3-es).
