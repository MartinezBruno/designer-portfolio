---
phase: 07-page-transitions-smooth-scroll
plan: 01
subsystem: motion
tags: [client-router, soft-navigation, focus, a11y, i18n]
requires: []
provides:
  - bindNavigation (src/lib/motion/navigation.ts)
  - bindNavFocus, pickFocusTarget, NavFocusOptions (src/lib/motion/nav-focus.ts)
  - softNavigate, waitForNavigationIdle, listenerCounts (tests/e2e/helpers/navigation.ts)
affects: [07-02, 07-03, 07-04, 07-05, 07-06, 07-07, 07-08, 07-09, 07-10]
tech-stack:
  added: []
  patterns:
    - App-scope router hooks bound once in src/lib/motion/index.ts, AbortController unbind
    - Local DocumentEventMap augmentation for astro:before-preparation / astro:before-swap
key-files:
  created:
    - src/lib/motion/navigation.ts
    - src/lib/motion/nav-focus.ts
    - tests/unit/motion-navigation.test.ts
    - tests/unit/nav-focus.test.ts
    - tests/e2e/helpers/navigation.ts
    - tests/e2e/transitions.spec.ts
    - tests/e2e/transitions-reduced.spec.ts
  modified:
    - src/layouts/BaseLayout.astro
    - src/lib/motion/index.ts
    - src/components/sections/Hero.astro
    - src/components/views/ProjectsView.astro
    - src/components/project/ProjectIntro.astro
    - src/components/views/NotFoundView.astro
    - src/styles/global.css
    - tests/e2e/helpers/motion.ts
decisions:
  - before-swap work is split into two named handlers (carryMotionState, syncMotionToggle) plus preventOffNavigation, so three listeners share one AbortController
  - Event types come from a type-only import of astro:transitions/client (TransitionBeforePreparationEvent, TransitionBeforeSwapEvent) plus a local DocumentEventMap augmentation
  - The Turnstile round-trip e2e is tagged @network because a mounted widget is proven by a real token (same selector as contact.spec)
metrics:
  duration: ~25 min
  completed: 2026-11-02
  tasks: 3
  files: 15
---

# Phase 7 Plan 01: ClientRouter soft navigation with focus and motion carry Summary

Astro `<ClientRouter fallback="swap" />` mounted after the inline motion gate. App-scope hooks carry `html[data-motion]` and the toggle's `aria-pressed` into the arriving document, and in `off` they opt out to full page loads. A focus manager moves focus to the arriving hash target, h1 or `#main` after every swap. Shared e2e navigation helpers are in place for 07-02..07-10.

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Failing e2e for soft navigation, focus, title and motion carry (RED) | 8151deb |
| 2 | ClientRouter plus app-scope navigation hooks (unit RED then GREEN in one commit) | 423ab90 |
| 3 | Focus manager, h1 focus targets, no-ring rule; e2e GREEN | bda3cd1 |

## Verification

- `pnpm lint`: 0 errors (astro check over 233 files, eslint, prettier).
- `pnpm test`: 68 files, 1115 tests passed (adds 9 in motion-navigation and 11 in nav-focus).
- `pnpm test:e2e`: 707 passed, 33 skipped, 0 failed (full suite against the router build, so Phases 1-6 stay green).
- The transitions.spec and transitions-reduced.spec tests: all 4 failed or were expected to fail before Task 2. After Task 3 all 4 passed. The `off` full-load test passed during RED too, because full loads were the behaviour before the router.
- `grep -rn "transition:persist|transition:animate|transition:name" src` finds nothing.

### h1 inventory (`grep -rn "<h1" src/components src/pages src/layouts`)

Exactly four h1s exist and all now carry `tabindex="-1"`:

- `src/components/sections/Hero.astro` (`#hero-title`)
- `src/components/views/ProjectsView.astro` (`#projects-title`)
- `src/components/project/ProjectIntro.astro` (`#project-title`)
- `src/components/views/NotFoundView.astro` (`#not-found-title`)

### Bundle (`pnpm measure:bundle`)

| Page | Eager gzip | Phase 6 baseline | Delta |
| ---- | ---------- | ---------------- | ----- |
| `/` | 20,732 B | 14,643 B | +6,089 B |
| `/es/` | 20,732 B | 14,643 B | +6,089 B |

The ClientRouter chunk is 5,590 B gz and `client` is 44 B gz. The rest (about 455 B) is navigation.ts and nav-focus.ts inside the BaseLayout chunk. That is in line with Research's measured +5,655 B for the router alone. The ceiling is enforced in 07-05. The lazy GSAP split is unchanged and the check reports "no GreenSock in eager chunks".

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Language-switch locator in the new specs**
- **Found during:** Task 3 (GREEN run)
- **Issue:** The switcher link's accessible name is "ES Español" (code plus name), so `exact: true` on `en['lang.es']` never matched.
- **Fix:** Removed `exact` for that link only, the same as i18n.spec.
- **Files modified:** tests/e2e/transitions.spec.ts, tests/e2e/transitions-reduced.spec.ts
- **Commit:** bda3cd1

**2. [Rule 3 - Blocking] Worktree base**
- The worktree started at 234dcb2, which is behind the required base 612645a (no phase 7 plans). It was reset to 612645a following the branch-check instructions before any work began.

### Notes

- **`softNavigate` completion signal:** it waits for a one-shot `astro:page-load` flag rather than only polling `data-astro-transition`. Right after the click that attribute may not be set yet, so polling alone could pass too early. The flag also disappears on a full load, so the helper works for the `off` path too.
- **Task 2 commit:** the plan's commit protocol is "lint and test before each commit", so the failing unit test and its implementation were committed together. The RED run was observed before the implementation was written.
- **taste-skill not run:** the plan has no taste-skill step. The only visual-surface change is removing the outline on non-interactive programmatic focus targets (`h1`/`main`/`section` with `tabindex="-1"`). There is no new animation, because the wipe arrives in 07-02. The orchestrator may want to run lint.mjs/inspect.mjs at the 07-02 visual step.

## Threat Model Coverage

- T-07-01: `pickFocusTarget` decodes inside a try/catch and looks the id up with `getElementById` plus `instanceof HTMLElement`. It never calls `querySelector` on hash text. A unit test with `#a,body` confirms this.
- T-07-02: only the live `data-motion` value and the constant `'true'`/`'false'` are written into the new document.
- T-07-04: the Home -> Projects -> Home e2e test (@network) still produces a Turnstile token.

## Known Stubs

None.

## Self-Check: PASSED

- All 7 created files exist, and commits 8151deb, 423ab90 and bda3cd1 are on the branch (checked with `git log`).
