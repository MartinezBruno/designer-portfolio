---
phase: 07-page-transitions-smooth-scroll
plan: 20
subsystem: motion
tags: [anchors, history, scroll-behavior, focus, wr-01, gap-closure]
requires:
  - phase: 07-11
    provides: pending-landing AbortController, popstate cancel, focusability fallback
  - phase: 07-19
    provides: wave ordering (shared dist and port 4400)
provides:
  - Inline smooth scroll-behavior restored on the first scroll event of an anchor glide
  - One-frame re-pin of the router's history position when Back interrupts a glide
  - Chromium e2e guard for Back during an anchor glide
affects: [nav-focus, anchors, history traversal]
tech-stack:
  added: []
  patterns:
    - "One-shot listener bound to the pending entry's AbortController (once + signal), aborted on landing and cancel"
key-files:
  created:
    - .planning/phases/07-page-transitions-smooth-scroll/deferred-items.md
  modified:
    - src/lib/motion/nav-focus.ts
    - tests/unit/nav-focus.test.ts
    - tests/e2e/anchors.spec.ts
key-decisions:
  - "Restore scroll-behavior on the first scroll event, not on a single rAF (as decided in the plan)"
  - "Re-pin the router's restored position one frame after a history-traversal cancel of a glide (Chromium leaves the page mid-glide otherwise)"
requirements-completed: [MOTN-06]
duration: ~45min
completed: 2026-11-05
---

# Phase 7 Plan 20: WR-01 Back during an anchor glide Summary

**Under motion `on`, the anchor hook now drops the inline `scroll-behavior: smooth` as soon as the glide starts. When Back interrupts a glide, the router's restored position is re-applied one frame later. In Chromium, Back now lands on the saved position within two frames instead of gliding back.**

## Performance

- **Duration:** about 45 min
- **Completed:** 2026-11-05
- **Tasks:** 2
- **Files modified:** 3 (plus deferred-items.md)

## Accomplishments

- `land()` adds a one-shot `scroll` listener (`once: true`, signal from the pending entry's AbortController). On the first scroll it restores the previous inline value and sets `entry.restore = null`, so neither the landing nor a cancel restores a second time. `entry.ac` is now also aborted when the landing completes, so the listener never outlives its navigation (T-07-48).
- If no scroll happens, the value is still restored on landing (1200 ms fallback or scrollend) or on cancel, exactly as before.
- `cancelPending()` re-applies the router's position on a history-traversal popstate during a glide (`repinAfterTraversal`, a single rAF that calls `scrollTo` only if the page drifted). Reduced, off and the skip link never set smooth and are never re-pinned. The `?service=` branch still calls `land(view, target, smooth, null)`.
- The bindAnchorFocus doc comment now describes the new restore timing.

## Task Commits

1. **Task 1 RED:** `50c8406` test(07-20): add failing early smooth restore tests
2. **Task 1 GREEN:** `2134422` fix(07-20): restore scroll-behavior once glide starts
3. **Task 2 deviation (Rule 1):** `d34084e` fix(07-20): re-pin history restore after mid-glide back
4. **Task 2 e2e:** `0838c12` test(07-20): add back-during-glide e2e

## WR-01 reproduction (Chromium, 1440x900, motion `on`)

Result: **reproduced**. Back was pressed once `scrollY > 50`; `y0 = 0`.

| Build | scrollY two frames after popstate | inline scroll-behavior at Back | Result |
|-------|-----------------------------------|--------------------------------|--------|
| Pre-fix (`nav-focus.ts` from 50c8406) | 125 (3/3 runs, run twice) | `smooth` | FAIL. The router's `scrollTo(0,0)` glides back, reaching 0 after about 200-400 ms (frame trace 128, 125, 111, 68, 40, 24 ... 0) |
| Restore-only fix (2134422) | 49 (5/5) | `''` | FAIL. No glide, but the page stops at an intermediate offset |
| Final (d34084e) | 0 (5/5) | `''` | PASS |

[Verified by per-frame diagnostic traces] With only the early restore, Back during the glide does not glide. However, Chromium leaves the page at an intermediate offset one frame after the router's instant `scrollTo(0,0)`: 49, 145 and 118 for Back at 79, 304 and 944 px. `scrollY` reads 0 inside the popstate handler, and a synchronous re-issued instant `scrollTo` does not help. Back after the glide has landed restores 0 correctly. [Inference] The in-flight fragment smooth scroll (or the browser's per-entry `auto` scroll restoration that the router sets before `location.href = #hash`) applies after the popstate handlers. Re-applying the router's position on the next frame lands on 0 in every run.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Back during a glide landed at an intermediate offset after the restore-only fix**
- **Found during:** Task 2 (the e2e failed on the fixed build: 49 px after two frames)
- **Issue:** The plan's mechanism removes the glide, but in Chromium the history restore did not win. The page stayed partway down instead of returning to the saved position.
- **Fix:** `PendingLanding` gains `smooth`. On a popstate cancel of a gliding entry, `repinAfterTraversal` captures the router's restored position synchronously and re-applies it with `behavior: 'instant'` on the next frame if the page drifted. It is not triggered by `astro:before-preparation`, unbind, a superseding click, or non-gliding states. Three unit tests cover it (named "traversal re-pin (07-20, WR-01 follow-up)", so exactly four tests start with `WR-01 (07-20):` as the plan requires).
- **Files modified:** src/lib/motion/nav-focus.ts, tests/unit/nav-focus.test.ts
- **Commit:** d34084e

**2. [Rule 1 - Test correctness] Focus assertion in the new e2e**
- **Found during:** Task 2
- **Issue:** The plan's `#contact` not-focused check could never pass. Chromium's native fragment navigation focuses `#contact` (it has `tabindex="-1"`) at click time, without any `focus()` call from our code (verified by patching `HTMLElement.prototype.focus`: zero calls).
- **Fix:** The test blurs the active element right before `history.back()`. It then checks that the hook's landing focus never arrives within 1500 ms.
- **Commit:** 0838c12

### Pre-existing assertions changed

None. No existing unit or e2e assertion was edited (`git diff -U0 dda1a57 -- tests/e2e | grep '^-.*expect('` prints nothing).

## Verification

- `pnpm vitest run tests/unit/nav-focus.test.ts tests/unit/smooth-scroll.test.ts`: 68 passed
- `pnpm test`: 71 files, 1308 tests passed
- `pnpm lint` (eslint, astro check, prettier): 0 errors
- `pnpm build` passes. The e2e regression (anchors, smooth-scroll, transitions-reduced, motion-toggle, navigation-leaks, `--grep-invert @network`) gave 32 passed and 1 failed. The existing anchor glide tests still see a glide (intermediate positions) and focus at the end.

## Deferred Issues

- `tests/e2e/smooth-scroll.spec.ts:136` "keyboard: PageDown, Space, End and Home scroll natively" fails with 6 px left after `End` (limit 2). It fails identically on the base build dda1a57 with the original `nav-focus.ts` (3/3), so it is out of scope. Logged in deferred-items.md.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: src/lib/motion/nav-focus.ts, tests/unit/nav-focus.test.ts, tests/e2e/anchors.spec.ts, deferred-items.md
- FOUND commits: 50c8406, 2134422, d34084e, 0838c12
