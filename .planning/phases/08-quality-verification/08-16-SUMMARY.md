---
phase: 08-quality-verification
plan: 16
subsystem: performance, motion, project-detail
tags: [gap-closure, qual-01, lcp, gsap, idle, images]
requires:
  - 08-14 (Chosen levers: L2 in L2b form and L4 assigned to 08-16)
provides:
  - "afterLoadIdle(win, timeoutMs): load, one painted frame, then requestIdleCallback (setTimeout fallback)"
  - "loadGsap imports GSAP and SplitText only after afterLoadIdle(window)"
  - "768w candidate in MODULE_WIDTHS for detail-page images"
affects:
  - 08-17 (re-measures Lighthouse on the merged wave-3 build)
tech-stack:
  added: []
  patterns:
    - "Gate deferrable lazy chunks behind afterLoadIdle so they never start before the LCP paint"
key-files:
  created:
    - src/lib/motion/idle.ts
    - tests/unit/motion-idle.test.ts
  modified:
    - src/lib/motion/load-gsap.ts
    - src/lib/projects/detail-view.ts
    - tests/unit/project-detail-view.test.ts
    - tests/unit/project-detail-site.test.ts
decisions:
  - "L2 implemented in the L2b form measured by 08-14 (load, one painted frame, then idle). Plain load + idle raced the image paint"
  - "L4 implemented in src/lib/projects/detail-view.ts, where 08-14 measured it, not in ImageModule/CollectionModule"
  - "L3 and L5 not assigned by 08-14, so load-lenis.ts and astro.config.ts are untouched"
metrics:
  duration: ~40 min
  completed: 2026-11-09
requirements-completed: []
---

# Phase 8 Plan 16: Deferred GSAP and 768w detail images Summary

GSAP and SplitText are now requested only after window `load`, one painted frame and an idle callback (timeout 1000 ms), through a new `afterLoadIdle` helper. Detail-page images get a 768w candidate. In 3 informational Lighthouse runs on the detail page, the median simulated LCP is 2,558 ms (baseline 3,690 ms), CLS is 0, and the eager JS budget holds at 17,958 B.

## Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 (RED) | Failing idle gate tests | f175036 | tests/unit/motion-idle.test.ts |
| 1 (GREEN) | afterLoadIdle and the deferred GSAP loader (L2b) | 24a112e | src/lib/motion/idle.ts, src/lib/motion/load-gsap.ts |
| 2 | 768w detail image candidate (L4) | 32f4566 | src/lib/projects/detail-view.ts, tests/unit/project-detail-view.test.ts, tests/unit/project-detail-site.test.ts |

Task 2 also covered the bundle check, the e2e run and the Lighthouse runs. Those produced no file changes.

## Levers

| Lever | Status | Detail |
|---|---|---|
| L2 (L2b form) | Implemented | `export const loadGsap = createGsapLoader(() => afterLoadIdle(window).then(importGsap));`. `afterLoadIdle` waits for `load` (skipped when `readyState === 'complete'`), then `requestAnimationFrame` → `setTimeout 0` → `requestIdleCallback({ timeout })`, falling back to `setTimeout 0` when `requestIdleCallback` is missing. `createGsapLoader` is unchanged |
| L3 | **not assigned by 08-14** | Lenis is never requested in Lighthouse mobile. src/lib/motion/load-lenis.ts is untouched |
| L4 | Implemented | `MODULE_WIDTHS = [640, 768, 960, 1400]` |
| L5 (astro.config.ts) | **not assigned by 08-14** | Rejected there: +159 ms Home, +228 ms detail. astro.config.ts is untouched |

## Verification

- Unit tests (`pnpm test`): 72 files and 1,323 tests pass. That includes 6 new idle-gate cases: load wait, painted frame before idle, the complete-document skip, the timeout passed through, the setTimeout fallback, and the importer not being called before the gate opens, with one shared import.
- `pnpm lint` (eslint, astro check, prettier): 0 errors, 0 warnings.
- `pnpm build`: ok.
- `pnpm measure:bundle`: **"bundle check ok (no GreenSock or lenisVersion in eager chunks, eager gzip within 22000 B on every built page)"**, **max eager 17,958 B on `/`**. Detail pages are at 15,884 B eager with 3 lazy files. GSAP and Lenis stay lazy.
- E2E (`E2E_OFFLINE=1`, all 14 specs from the verify command, under the shared port-4400 lock): **413 passed, 32 skipped, 0 failed**. No spec needed a change. The cases "split fails safe when only the gsap chunk fails" and the split-headings reveals pass with the later GSAP start.
- `git diff --quiet 63f2041 -- package.json pnpm-lock.yaml` is true, so no dependency was added. tests/e2e/motion-hero.spec.ts is not modified.

## Informational Lighthouse

Lighthouse 13.6.0 (`pnpm dlx`), mobile defaults, `astro preview --port 4495`, strictly sequential runs. The machine was quiet: I waited until no `lighthouse` or `playwright test` process was running. benchmarkIndex was 4,658–4,673. The raw JSON is in the gitignored files `tmp/lighthouse/fix16-*.json`. The build is this worktree's (L2b + L4, **without** 08-15's L1).

| Run | Simulated LCP | Observed LCP | CLS | TBT | GSAP/SplitText request start | Requests before observed LCP |
|---|---|---|---|---|---|---|
| detail-1 | 2,635 ms | 61 ms | 0 | 0 | 62 ms | 24/26 |
| detail-2 | 2,336 ms | 32 ms | 0 | 0 | 63–64 ms | 20/26 |
| detail-3 | 2,558 ms | 65 ms | 0 | 0 | 63 ms | 26/26 |
| **detail median** | **2,558 ms** | 61 ms | **0** | 0 | | |
| Home (CLS check) | 3,406 ms | 1,014 ms | **0** | 0 | 80 ms | 24/24 |

- On the detail page the requests that still start before observed LCP are: the document; the CSS; both woff2 fonts; the eager scripts (ClientRouter, MotionToggle, CursorFollower, BaseLayout, client, tokens, motion, load-gsap, preload-helper); the LCP image; the second image; and the 9 lazy below-fold AVIFs. In detail-3 GSAP and SplitText started 2 ms before observed LCP (63 vs 65 ms). In detail-1 and -2 they started after it.
- `image-delivery-insight` scored 1 in all 3 detail runs, so the 960w-for-721px waste is gone, and `768w` appears in the built detail srcset.
- Home is still 3,406 ms because L1 (the hero lead entrance) belongs to 08-15 and is not in this build. CLS on Home is 0 with the deferred SplitText arming.
- 08-LIGHTHOUSE.md is not edited. 08-17 re-measures the merged build.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] L2 implemented in the L2b form instead of plain load + idle**
- **Found during:** Task 1 (from the 08-14 diagnosis)
- **Issue:** The plan's must-have describes "load + idle". 08-14 measured that form as a race on the detail page: one run hit 3,400 ms because `load` can fire before the image paint.
- **Fix:** `afterLoadIdle` waits one painted frame (`requestAnimationFrame` → `setTimeout 0`) after `load` before `requestIdleCallback`. The orchestrator directed this form. A unit case covers it.
- **Files modified:** src/lib/motion/idle.ts
- **Commit:** 24a112e

**2. [Rule 3 - Blocking] L4 is in detail-view.ts, not ImageModule/CollectionModule**
- **Found during:** Task 2
- **Issue:** The plan lists ImageModule.astro and CollectionModule.astro. 08-14 located and measured the lever in `MODULE_WIDTHS` in src/lib/projects/detail-view.ts.
- **Fix:** I patched detail-view.ts and updated the expectations in project-detail-view.test.ts (plus a new case for the 768w pick at 412 px × DPR 1.75) and in project-detail-site.test.ts (the 1400w and 900w fixtures now include 768). The .astro components are untouched.
- **Files modified:** src/lib/projects/detail-view.ts, tests/unit/project-detail-view.test.ts, tests/unit/project-detail-site.test.ts
- **Commit:** 32f4566

**3. Lock protocol**
- The plan's `tmp/build-e2e.lock` assumed a shared dist/. Each worktree has its own dist/, so I used the orchestrator's shared port-4400 lock (`e2e-lock.sh`) for the Playwright run only, as instructed, and built outside it. I did not find a stale lock. Lighthouse used port 4495, and its preview was stopped afterwards. Nothing I started is listening on 4400 or 4495.

## Notes for 08-17

- tests/e2e/motion-hero.spec.ts needs no change from this plan.
- GSAP now starts at about 62–64 ms on detail. That sits right at observed LCP (32–65 ms), so one of 3 runs still counted it. If the merged build is still bimodal, the residual cause is the same as 08-14 measured: the uncompressed critical path, with a floor of about 2,480 ms.

## Known Stubs

None.

## TDD Gate Compliance

The RED commit `test(08-16)` f175036 precedes the GREEN commit `feat(08-16)` 24a112e. No refactor commit was needed.

## Self-Check: PASSED

- FOUND: src/lib/motion/idle.ts, tests/unit/motion-idle.test.ts
- FOUND: f175036, 24a112e, 32f4566
