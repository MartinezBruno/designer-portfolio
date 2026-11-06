---
phase: 08-quality-verification
plan: 03
subsystem: content
tags: [cleanup, services, home-04, audit-debt]
requires: []
provides:
  - icon-free services content pipeline (schema, data, view models, components)
affects:
  - src/content.config.ts services schema
  - HOME-04 audit status (orphaned ServiceIcon / unused icon prop)
tech-stack:
  added: []
  patterns:
    - "Negative shape test ('services have no icon field') guards against dead content fields returning"
key-files:
  created: []
  modified:
    - src/components/ui/ServiceCard.astro
    - src/components/sections/FeaturedServices.astro
    - src/lib/motion/index.ts
    - src/content.config.ts
    - src/data/services.json
    - src/lib/content/icons.ts
    - src/lib/content/home.ts
    - tests/unit/content-home.test.ts
    - tests/unit/contact-section.test.ts
    - tests/unit/featured-services.test.ts
    - tests/unit/project-card-view.test.ts
  deleted:
    - src/components/ui/ServiceIcon.astro
decisions:
  - "D-15 applied: service icon removed end to end; toolIconKeys/ToolIcon kept because tools still render icons"
metrics:
  duration: ~15min
  completed: 2026-11-06
  tasks: 2
  files: 12
---

# Phase 8 Plan 03: Remove dead service icon data Summary

The services pipeline no longer has a service icon. ServiceIcon.astro is deleted, ServiceCard has no `icon` prop, the services zod schema and services.json have no `icon` field, and `serviceIconKeys`/`ServiceIconKey` are gone. The motion comment that still mentioned "tool tooltips" is fixed. This clears the milestone audit's HOME-04 PARTIAL (D-15). Nothing changes for visitors.

## Tasks

| # | Task | Commit(s) |
|---|------|-----------|
| 1 | Remove the icon prop and the orphaned component from the view layer | 9353886 |
| 2 | Remove icon from the schema, data, content lib and tests (TDD) | c7f77bd (RED), 0c60662 (GREEN) |

## Verification

[Verified] by running each command in this worktree:
- `pnpm check`: 0 errors, 0 warnings, 0 hints (250 files)
- `pnpm test`: 70 files, 1293 tests passed
- `pnpm exec eslint src tests`: clean. `prettier --check src tests`: clean
- `pnpm build`: succeeded, with services content validated by the narrowed schema
- `E2E_OFFLINE=1 playwright test home-story contact-preselect a11y`: 103 passed (1.6m)
- Rendered output: both `dist/client/index.html` and `dist/client/es/index.html` still contain the 4 `?service=<id>#contact` links (branding, graphic-design, social-media, web-design)
- RED step: "services have no icon field" failed against the old services.json (1 failed, 23 passed). It passed after the GREEN change.

Final grep `grep -rn "serviceIconKeys\|ServiceIconKey\|\"icon\"" src tests`: there are no service-icon hits. The remaining hits are:
- `src/data/tools.json` lines 2-6 (`"icon"` per tool, which is tool-icon data and stays)
- `<Fragment slot="icon">` / `<slot name="icon" />` in ContactSection, ButtonLink, Hero, ProjectContactBand and NotFoundView (the ButtonLink slot, which is unrelated)
- `<link rel="icon">` in BaseLayout (the favicon, which is unrelated)

Acceptance greps: `"icon"` in services.json is 0. serviceIconKeys/ServiceIconKey appear nowhere. `toolIconKeys` in content.config.ts is 2. "no icon field" in content-home.test.ts is 1. `tooltip` in motion/index.ts is 0.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Service fixtures in three more unit test files still set `icon`**
- **Found during:** Task 2 (`pnpm check` reported 7 TS errors after the type change)
- **Issue:** `tests/unit/contact-section.test.ts`, `tests/unit/featured-services.test.ts` and `tests/unit/project-card-view.test.ts` built ServiceView/ServiceEntry fixtures with `icon`, so they no longer type-checked. The plan's interface map didn't list them. featured-services also passed `icon: 'palette'` to the ServiceCard render props.
- **Fix:** Removed the `icon` lines from those fixtures. No assertions changed.
- **Files modified:** the three test files above
- **Commit:** 0c60662

### Notes
- The worktree started at ff5bf7c rather than the expected base 2c2c8c5. Following the branch-check instruction, it was reset to 2c2c8c5 before any work.
- Build/e2e lock: `tmp/build-e2e.lock` was acquired in this worktree before `pnpm build` and released after Playwright. The e2e run used an uncommitted scratch config (`tmp/pw-08-03.config.ts`, port 4483, deleted afterwards) so it couldn't collide with sibling worktrees on port 4400. No stale locks were found or removed.
- The GREEN commit uses `refactor` rather than `feat` because no behavior was added.
- This plan made no visual change (the markup is unchanged), so the taste-skill review did not apply.

## Known Stubs

None.

## TDD Gate Compliance

The RED gate is `test(08-03)` c7f77bd. The GREEN gate is 0c60662, which comes after it and uses the `refactor` type for a pure removal.

## Self-Check: PASSED
- src/components/ui/ServiceIcon.astro absent: FOUND (deleted)
- Commits 9353886, c7f77bd, 0c60662: present in `git log`
