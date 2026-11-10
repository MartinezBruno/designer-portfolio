---
phase: 09-portfolio-features-hero-full-width-on-mobile-photography-ser
plan: 04
subsystem: motion/navigation
tags: [nav-focus, client-router, skip-link, project-filter, a11y]
requires: []
provides:
  - "Filtered-page same-search hash branch in bindAnchorFocus (selector-only, no filter import)"
affects:
  - src/lib/motion/nav-focus.ts
tech-stack:
  added: []
  patterns:
    - "Local hash jump with replaceState(history.state, ...) when the router's originalLocation may be stale"
key-files:
  created: []
  modified:
    - src/lib/motion/nav-focus.ts
    - tests/unit/nav-focus.test.ts
decisions:
  - "The branch fires only when the search is non-empty and [data-project-filter] exists; pages without the filter keep the native fragment path"
  - "nav-focus.ts depends only on the selector string, never on the filter module, so it adds no bundle weight"
requirements: [PROJ-07]
metrics:
  duration: ~10 min
  completed: 2026-11-10
  tasks: 1
  files: 2
---

# Phase 9 Plan 04: Local hash jump on filtered pages Summary

Same-page hash links (including the skip link) on a page with `[data-project-filter]` and a non-empty search are now handled locally in `bindAnchorFocus`: preventDefault, replace only the fragment with `replaceState(history.state, ...)`, scrollIntoView (smooth only under motion 'on' and never for the skip link), then focus on landing. This stops the ClientRouter, whose `originalLocation` goes stale after the filter rewrites `?category=`, from swapping /projects/ onto itself.

## Tasks

| Task | Name | Commits | Files |
| ---- | ---- | ------- | ----- |
| 1 | Local hash jump on filtered pages (TDD) | 7024a47 (RED), 761292c (GREEN) | src/lib/motion/nav-focus.ts, tests/unit/nav-focus.test.ts |

## Verification

- [Verified] RED: 3 new tests failed before the implementation (skip link, smooth plain link, reduced plain link); the two "native path stays" guards passed as expected.
- [Verified] GREEN: `pnpm vitest run tests/unit/nav-focus.test.ts` 61/61; `pnpm test` 72 files / 1328 tests passed; `pnpm lint` 0 errors, 0 warnings, Prettier clean.
- [Verified] Acceptance greps: `[data-project-filter]` appears 2 times in nav-focus.ts (code and docstring), `category-filter` 0 times, `data-project-filter` present in the test file.
- The e2e proof (filter, then skip link, no wipe, focus on #main) is owned by plan 09-07 and was not run here.

## Tests added

- Skip link on a filtered page: prevented, `?category=web-design` kept, hash `#main`, one replaceState with the same state object, `history.length` and `history.state` unchanged, no pushState, instant scroll, #main focused.
- Plain `#contact` link under 'on': prevented, smooth scrollIntoView, focus at scrollend.
- Plain link under 'reduced': instant jump, focus after two frames.
- Without the marker (with search): native path, not prevented.
- With the marker but empty search: native path, not prevented.
- Service fixture gained a `#contact-service-photography` radio; all existing `?service=` tests still pass.

## Deviations from Plan

None - plan executed exactly as written. The extra "marker present, empty search" guard test documents the `here.search !== ''` condition the plan specified.

## TDD Gate Compliance

RED `test(09-04)` commit 7024a47 precedes GREEN `feat(09-04)` commit 761292c. No refactor commit needed.

## Threat model

- T-09-11: the new branch reuses `hashTarget` (getElementById only); no selector is built from URL text.
- T-09-12: the history write is a same-origin `replaceState` built from `here.href` with the URL API; only the hash changes.

## Self-Check: PASSED

- FOUND: src/lib/motion/nav-focus.ts, tests/unit/nav-focus.test.ts
- FOUND: 7024a47, 761292c
