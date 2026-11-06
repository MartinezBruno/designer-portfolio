---
phase: 08-quality-verification
plan: 01
subsystem: motion
tags: [a11y, marquee, wcag-4.1.2, wcag-2.2.2, review-debt]
requires: []
provides:
  - single-source marquee pause state (aria-pressed always equals the visible play state)
  - live reduced-motion reset of the marquee pause
affects:
  - src/lib/motion/marquee.ts
  - src/components/sections/RolesMarquee.astro
tech-stack:
  added: []
  patterns:
    - "The JS controller owns the pause state (explicit choice > transient hover/focus) and writes aria-pressed and data-paused together. CSS pauses only via group-data-paused"
key-files:
  created: []
  modified:
    - src/lib/motion/marquee.ts
    - src/components/sections/RolesMarquee.astro
    - tests/unit/marquee-toggle.test.ts
    - tests/unit/roles-marquee.test.ts
    - tests/e2e/home-story.spec.ts
    - tests/e2e/motion.spec.ts
decisions:
  - "D-10: hover and keyboard focus pause through the controller, not CSS-only selectors, so aria-pressed tracks them. An explicit click/Space wins over hover/focus"
  - "D-11: a motion change away from 'on' resets the explicit pause (aria-pressed=false, no data-paused)"
  - "D-12: the control stays an invisible full-band button with the inset focus outline. No visible pause button was added"
metrics:
  completed: 2026-11-06
  tasks: 2
---

# Phase 8 Plan 01: Marquee pause semantics Summary

The roles marquee now has one source of truth for its pause state. `marquee.ts` tracks the explicit choice plus transient hover/focus. It mirrors the result to both `aria-pressed` and `data-paused`, and it resets on `onMotionChange` when motion leaves "on". `RolesMarquee.astro` pauses only through `group-data-paused:[animation-play-state:paused]`. The CSS-only hover/focus pause selectors and the `data-playing` override are gone, so the visible play state can no longer disagree with `aria-pressed`. This closes Phase 2 review findings WR-01 and WR-03.

## Tasks

| # | Task | Commit(s) |
|---|------|-----------|
| 1 | Controller owns the pause state; CSS pauses only via data-paused; reset on motion change | c50aa72 (RED), 70f3a34 (GREEN) |
| 2 | E2E: hover/focus/click pair play state with aria-pressed; live reduced switch resets the pause | e89e198 |
| — | Stale unit assertion updated to the new contract (Rule 1, caused by Task 1) | f63676a |

## Verification

[Verified] by the orchestrator on main after merging wave 1 (08-01 + 08-02 + 08-03):
- `pnpm lint` (astro check + eslint + prettier): 0 errors, 0 warnings, 0 hints. Clean.
- `pnpm test`: 70 files, 1303 tests passed
- `E2E_OFFLINE=1 pnpm test:e2e` (full build + full offline suite, including home-story, motion, a11y, scroll and contact): 746 passed, 117 skipped (@network/conditional), 0 failed
- `pnpm measure:bundle`: bundle check ok (max eager 17661 B gzip on /)

## Deviations from Plan

**1. [Rule 1] Stale unit test pinned the old CSS-only pause path.** `tests/unit/roles-marquee.test.ts` asserted the `group-hover` and `group-has-[...focus-visible]` play-state classes that Task 1 removed. It now asserts that `group-data-paused` is the only play-state token and that `data-playing` is absent. The executor wrote the change but was stopped before committing it. The orchestrator committed it as f63676a.

**2. Execution interrupted.** The executor agent stalled after Task 2, with no commits for over 85 minutes and no SUMMARY. The user chose "finish inline". The orchestrator stopped the agent, committed the pending test change, merged, ran verification on main and wrote this SUMMARY.

### Notes
- Taste gate: this plan changes pause *behavior* only. The markup and visuals at rest are unchanged, and the focus outline was kept as-is, so no separate taste-skill run was done here. The phase-level taste gate (08-07) covers / and /es/.

## Known Stubs

None.

## Self-Check: PASSED
- Commits c50aa72, 70f3a34, e89e198, f63676a: present in `git log`
- `grep -c onMotionChange src/lib/motion/marquee.ts` ≥ 1, and `group-data-paused` is the only play-state selector in RolesMarquee.astro
