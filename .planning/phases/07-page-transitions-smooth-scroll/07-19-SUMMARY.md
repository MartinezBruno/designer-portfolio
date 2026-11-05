---
phase: 07-page-transitions-smooth-scroll
plan: 19
subsystem: contact
tags: [a11y, contact-form, lazy-load, focus, pointer-events, gap-closure]
requires:
  - phase: 07-15
    provides: createLazyContactForm lazy loader
  - phase: 07-18
    provides: stacked height reserve (form under the mailto block)
provides:
  - Checked-radio-first focus handoff on mount (WR-02)
  - Press-aware deferred mount with a 1000 ms cap (IN-02)
  - Press listeners and timer removed on mount, on final load failure and on cleanup (MOTN-09)
affects: [07-20, 07-21]
tech-stack:
  added: []
  patterns:
    - "Second AbortController for listeners that must outlive the trigger listeners"
    - "0 ms task after pointerup so the mount runs after the click"
key-files:
  created: []
  modified:
    - src/lib/ui/contact-form-loader.ts
    - tests/unit/contact-form-loader.test.ts
key-decisions:
  - "Press tracking is also aborted after the final failed load attempt, since no mount can follow"
  - "pointerup/pointercancel only schedule the flush when a press on the mailto block is in progress"
requirements-completed: [MOTN-09]
duration: 6min
completed: 2026-11-05
---

# Phase 07 Plan 19: Contact loader focus and press fixes Summary

The lazy contact loader now hands keyboard focus to the checked service chip, and it waits until after a mailto click (or a pointercancel, or 1000 ms) before mounting. Its press listeners and timer are removed after the mount, after the final failed load, and on cleanup.

## Performance

- **Duration:** about 6 min
- **Completed:** 2026-11-05
- **Tasks:** 2 of 2
- **Files modified:** 2

## Accomplishments

- **WR-02:** the focus handoff now runs two queries in order. It looks for `input[name="service"]:checked` first. Only if none is checked does it fall back to the first field that is not hidden, not `tabindex="-1"` and not a service radio. Before this, a single selector list matched in document order, so the first unchecked chip won.
- **IN-02:** a `pointerdown` inside `[data-contact-nojs]` sets `pressed`. If the chunk resolves while `pressed` is true, the mount is stored and runs after the click on a 0 ms timer scheduled by `pointerup` or `pointercancel`, or after `PRESS_CAP_MS = 1000`. A press outside the mailto block mounts at once, as before. The press still starts the load.
- **MOTN-09:** press tracking has its own `AbortController`. It is aborted after the mount, after the last failed load attempt, and in cleanup. Cleanup also clears `pressTimer` and drops the stored mount.

## Task Commits

1. **Task 1 RED:** `48b8dfd` test(07-19): add failing checked-radio focus test. Both WR-02 tests failed on the old code; in both, `activeElement` was the `web` radio.
2. **Task 1 GREEN:** `ea69012` fix(07-19): focus checked service chip on mount
3. **Task 2 RED:** `452d4cf` test(07-19): add failing press deferral tests. 4 of 7 failed (defer on pointerup, pointercancel, 1000 ms cap, cleanup while deferred). 3 already passed on the old code and stay as regression guards: no deferral outside the block, press ended before the load resolved, and no timer left after the mount.
4. **Task 2 GREEN:** `407f69b` fix(07-19): defer form mount during mailto press

## Verification

- `pnpm vitest run tests/unit/contact-form-loader.test.ts`: 20 of 20 pass (the 11 earlier tests, plus 2 WR-02 and 7 IN-02).
- `pnpm test` (full suite): 71 files, 1301 tests pass.
- `pnpm lint` (astro check, eslint, prettier): exits 0.
- `pnpm build && node scripts/measure-bundle.ts`: `bundle check ok`, **max eager 17,813 B on `/`**. That is +173 B over the 07-18 result (17,640 B) and under the 22,000 B ceiling.
- No `expect(` line was removed from the earlier tests: `git diff -U0 aca4945 -- tests/unit/contact-form-loader.test.ts | grep '^-.*expect('` prints nothing.
- Playwright was not run, as the plan says; 07-21 runs the full e2e suite.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Press listeners leaked when the load failed for good**
- **Found during:** Task 2 GREEN
- **Issue:** if both load attempts failed, nothing mounted, so `press` was never aborted until cleanup. The document-level `pointerup`/`pointercancel` listeners stayed for the life of the page. The unit test "leaves no timer behind after a deferred mount" caught this: a listener left over from the earlier "does not retry more than once" test, which never calls cleanup, scheduled a timer.
- **Fix:** the final-failure branch now calls `press.abort()` next to `stopTriggers()`.
- **Files modified:** src/lib/ui/contact-form-loader.ts
- **Commit:** 407f69b

**2. [Rule 2 - Correctness] Ignore releases when no press is in progress**
- **Issue:** as specified, every `pointerup` anywhere on the page scheduled a 0 ms timer until the form mounted.
- **Fix:** `release` returns early unless `pressed` is true.
- **Commit:** 407f69b

Otherwise the plan was executed as written. The 07-18 CSS reserve was not touched.

## TDD Gate Compliance

Both tasks have a `test(...)` RED commit followed by a `fix(...)` GREEN commit. No refactor commits were needed.

## Known Stubs

None.

## Self-Check: PASSED

- src/lib/ui/contact-form-loader.ts, tests/unit/contact-form-loader.test.ts: FOUND
- Commits 48b8dfd, ea69012, 452d4cf, 407f69b: FOUND in `git log`
