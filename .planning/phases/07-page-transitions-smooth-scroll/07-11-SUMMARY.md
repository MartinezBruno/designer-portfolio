---
phase: 07-page-transitions-smooth-scroll
plan: 11
subsystem: motion / focus management
tags: [gap-closure, a11y, focus, client-router, anchors]
requires: [07-07]
provides:
  - hash-only replaceState for Home service links (CR-01)
  - navToken stale-navigation guard for post-swap focus (WR-01)
  - glide cancel on popstate / astro:before-preparation (WR-02)
  - ensureFocusable + focusWithFallback focus chain (WR-03)
affects: [src/lib/motion/nav-focus.ts]
tech-stack:
  added: []
  patterns: [navToken guard copied from lifecycle.ts bindToAstro]
key-files:
  created: []
  modified:
    - src/lib/motion/nav-focus.ts
    - tests/unit/nav-focus.test.ts
    - tests/e2e/anchors.spec.ts
    - tests/e2e/contact-preselect.spec.ts
decisions:
  - Service links never touch location.search; the checked chip is the source of truth for the selected service
  - A popstate whose location hash still resolves to the pending target is treated as the router's own fragment move and keeps the landing; any other popstate cancels it
  - pickFocusTarget stays a pure selector; tabindex is added only by ensureFocusable inside focusWithFallback
metrics:
  duration: ~35 min
  completed: 2026-11-04
  tasks: 2
  files: 4
---

# Phase 7 Plan 11: Nav-focus hardening (CR-01, WR-01..03) Summary

Home "Ask about this" now replaces only the URL hash, so the ClientRouter's same-page check stays in step and a second Ask click or the skip link no longer swaps Home onto itself. Post-swap focus is also guarded by a navigation token, pending anchor glides are cancelled on history traversal and on new router navigations, and focus falls back through a chain (target, then `main h1`, then `#main`) so it never stays on body.

## Tasks

| Task | Name | Commits | Files |
| ---- | ---- | ------- | ----- |
| 1 | Harden nav-focus (TDD) | ebf718f (RED), 0b668a9 (GREEN) | src/lib/motion/nav-focus.ts, tests/unit/nav-focus.test.ts |
| 2 | CR-01 e2e and URL contract | 8819373 | tests/e2e/anchors.spec.ts, tests/e2e/contact-preselect.spec.ts |

## What changed

- **CR-01:** the service branch builds `new URL(here.href)`, sets only `.hash`, and passes that to `history.replaceState(view.history.state, ...)`. `applyServicePreselect` is unchanged. There is still no `pushState` in the file.
- **WR-01:** `navToken` is incremented on `astro:before-swap` and captured before `waitForRelease`. A superseded navigation returns without focusing.
- **WR-02:** `popstate` (on `doc.defaultView`) and `astro:before-preparation` both call `cancelPending`, which restores the inline `scroll-behavior` synchronously and aborts the landing wait.
- **WR-03:** new exports `ensureFocusable(el)` adds `tabindex="-1"` only when `tabIndex < 0` and there is no tabindex attribute. `focusWithFallback(doc, primary)` tries primary, then `main h1`, then `#main`, and stops at the first that becomes `document.activeElement`. It is used by both `onPageLoad` and `land()`.
- All listeners stay on the existing AbortController signal (MOTN-09 leak contract).

## Verification

- `pnpm vitest run tests/unit/nav-focus.test.ts tests/unit/service-preselect.test.ts`: 58 passed. Full `pnpm test`: 1255 passed.
- RED run before the fix: 13 new unit tests failed for the expected reasons (replaceState URL still had `?service=`, the second Ask click went to the router, focus happened on a superseded navigation, smooth was not restored on popstate/before-preparation, missing exports).
- `pnpm build` and Playwright on anchors, contact-preselect, transitions and smooth-scroll specs: 57 passed.
- E2E RED check: with `nav-focus.ts` temporarily restored from eee7f1a (written via `git show`, no stash) and rebuilt, both new CR-01 tests (on and reduced) failed on `__vtCount` (expected 0, received 1), which means the router ran a soft navigation. `__marker` survives a soft swap, so the vtCount assertion is the one that catches it. They pass after the fix.
- `pnpm lint` (astro check, eslint, prettier): exit 0.
- Acceptance greps: no `replaceState(view.history.state, '', url.href)`; `pushState` count 0; `navToken` on 4 lines; one line each for `'popstate', cancelPending` and `'astro:before-preparation', cancelPending`; both helpers exported.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The router's own popstate would have cancelled our glide**
- **Found during:** Task 1, by reading `node_modules/astro/dist/transitions/router.js` `moveToLocation`.
- **Issue:** For a same-page hash click, the router sets `location.href = to.href` and, when the entry has no state, dispatches a synthetic `new PopStateEvent("popstate")`. If every popstate cancelled the pending landing, the plain-branch glide that the hook just started would have lost its focus step.
- **Fix:** `cancelPending(event?)` ignores a `PopStateEvent` when `location.hash` still resolves (via `hashTarget`) to the pending target. Any other popstate cancels. A unit test covers the router's own popstate. The existing e2e glide-and-focus tests pass.
- **Commit:** 0b668a9

**2. [Plan wording] pickFocusTarget does not add tabindex**
- The `<behavior>` block said `pickFocusTarget` on a plain div leaves it with `tabindex="-1"`. The `<action>` says `pickFocusTarget` must stay a pure selector. I followed the action: tabindex is added by `ensureFocusable` and `focusWithFallback`, and the unit tests check it there and through the anchor hook.

**3. [Test detail] Simulated non-focusable target in unit tests**
- happy-dom does not reliably refuse focus on `hidden` elements, so the WR-03 fallback tests replace the element's `focus` with a no-op to simulate a target where focus does not land.

### Execution note
- Playwright was run with a temporary config copy on port 4471, because parallel worktrees share the hardcoded port 4400. The copy was deleted and not committed.

## Deferred / Observations

- [Inference, not tested] On a page loaded at `/?service=X`, clicking the "Ask about this" link for the same service X takes the plain router branch because the search is equal. The chip is not re-applied if the visitor changed it in the meantime. This existed before this plan and is out of scope; it could be fixed by also calling `applyServicePreselect` in the plain branch when the link has `?service=`.

## Known Stubs

None.

## TDD Gate Compliance

RED `test(07-11)` ebf718f, then GREEN `fix(07-11)` 0b668a9. There was no refactor commit.

## Self-Check: PASSED
- FOUND: src/lib/motion/nav-focus.ts, tests/unit/nav-focus.test.ts, tests/e2e/anchors.spec.ts, tests/e2e/contact-preselect.spec.ts
- FOUND commits: ebf718f, 0b668a9, 8819373
