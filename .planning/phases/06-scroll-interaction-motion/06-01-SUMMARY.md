---
phase: 06-scroll-interaction-motion
plan: 01
subsystem: motion
tags: [motion, reduced-motion, a11y, i18n, header, localStorage]
requires: []
provides:
  - "MotionState 'on' | 'reduced' | 'off' (gate.ts)"
  - "MOTION_STORAGE_KEY, applyMotionGate(doc, win, override?), setMotionPreference, isOsReduced, syncMotionGate"
  - "events.ts: motion:change DocumentEventMap typing, onMotionChange, dispatchMotionChange, currentMotionState"
  - "CSS variants motion-reduced: and motion-js:"
  - "Header MotionToggle on every page, dictionary keys cursor.view, motion.toggle, motion.osLocked"
  - "tests/unit/helpers/fake-media.ts (mockMatchMedia per query, withoutMatchMedia, blockLocalStorage)"
affects: [06-03, 06-04, 06-05, 06-06, 06-07, 06-08, 06-09, 06-10]
tech-stack:
  added: []
  patterns:
    - "One self-contained resolver shared by the inline head gate and runtime"
    - "Typed motion:change CustomEvent bus instead of lifecycle remounts"
    - "Session override when a storage write throws"
key-files:
  created:
    - src/lib/motion/events.ts
    - src/lib/motion/toggle.ts
    - src/components/global/MotionToggle.astro
    - tests/unit/helpers/fake-media.ts
    - tests/unit/motion-toggle.test.ts
    - tests/e2e/motion-toggle.spec.ts
  modified:
    - src/lib/motion/gate.ts
    - src/styles/global.css
    - src/components/global/SiteHeader.astro
    - src/i18n/ui.en.ts
    - src/i18n/ui.es.ts
    - tests/unit/motion-gate.test.ts
    - tests/unit/site-header.test.ts
    - tests/e2e/motion.spec.ts
    - tests/e2e/a11y.spec.ts
    - tests/e2e/layout.spec.ts
    - tests/e2e/home-story.spec.ts
decisions:
  - "OS reduce resolves to 'reduced' (D-14); only a missing matchMedia (or no JS) stays 'off'"
  - "A successful storage write clears the session override, so the override only lives while storage is failing"
  - "The toggle also listens to the reduce media query directly: with a stored 'reduced' choice an OS change leaves the resolved state unchanged, so no motion:change fires, but the lock must still update"
  - "onMotionPreferenceChange removed (only syncMotionGate used it); syncMotionGate re-resolves through applyMotionGate"
metrics:
  duration: "~25 min"
  completed: 2026-10-29
  tasks: 3
  files: 17
---

# Phase 6 Plan 01: Three-state motion gate and header toggle Summary

The motion gate now has three states (`on` / `reduced` / `off`). OS reduced motion resolves to `reduced`. The new header toggle reduces motion live, with no reload. The choice is stored under the `localStorage` key `motion-preference` and read by the blocking head gate before first paint. A tampered stored value is ignored, and blocked storage does not break the toggle. Every later Phase 6 effect reads `data-motion` and subscribes to the typed `motion:change` event.

## Tasks

| Task | Name | Commits |
| ---- | ---- | ------- |
| 1 | Three-state gate, stored override, motion:change bus | cea6060 (RED), 91af31a (GREEN) |
| 2 | Header motion toggle (component, init, dictionaries, placement) | a12ec62 (RED), 6420a0f (GREEN), 4952621 (fix found in Task 3) |
| 3 | E2E for reduced state, toggle, keyboard order, header layout; taste check | 9fb6cb0 |

## Verification

- `pnpm lint` (astro check + eslint + prettier): 0 errors.
- `pnpm test`: 58 files, 959 tests passed.
- `pnpm build` then `E2E_OFFLINE=1 pnpm playwright test` (full offline suite, not just the four specs): 521 passed. The `@network` tests (live Turnstile token) were not run in this worktree.
- Acceptance greps: `MotionState` union, `MOTION_STORAGE_KEY`, both `@custom-variant`s, `DocumentEventMap`, the icon imports, `motion-js:inline-flex`, `lifecycle.register(initMotionToggle)` and `<MotionToggle` all return 1. `unmount(`/`.mount(` in toggle.ts returns 0. In `motion-gate.test.ts`, `'off'` appears only in the no-matchMedia case and in the `currentMotionState` narrowing test (unknown dataset value), never as an OS-reduce expectation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Toggle lock did not follow the OS when the resolved state stayed the same**
- **Found during:** Task 3 (e2e `stays reduced when the OS stops reducing`)
- **Issue:** With a stored `reduced` choice, an OS change between reduce and no-preference leaves `data-motion` at `reduced`. So no `motion:change` fires, and the toggle kept `aria-disabled="true"` after the OS unlocked it. The Task 2 unit test missed this because it did not assert the lock after the OS change.
- **Fix:** `initMotionToggle` also subscribes `sync` to the `(prefers-reduced-motion: reduce)` media query `change` event, using the same AbortSignal. Added the missing unit assertions.
- **Files modified:** src/lib/motion/toggle.ts, tests/unit/motion-toggle.test.ts
- **Commit:** 4952621

**2. [Rule 3 - Blocking] Other e2e specs still expected the old two-state gate (Pitfall 14)**
- **Found during:** Task 3
- **Issue:** The reduced-motion blocks in `a11y.spec.ts` expected `data-motion="off"`, and their Tab-order test filtered out every `BUTTON` step, which would also drop the new toggle. `home-story.spec.ts` `expectStaticMarquee` hard-coded `'off'` for both the reduce and the no-JS cases.
- **Fix:** The a11y reduce tests now expect `'reduced'` and filter only the marquee pause step (the locked toggle stays focusable). `expectStaticMarquee` takes the expected state (`'reduced'` under reduce, `'off'` without JS). `home-story.spec.ts` was not in the plan's file list.
- **Commit:** 9fb6cb0

**3. [Test fix] The tampered-value DOM check in the unit truth table**
- The first draft also asserted "not in outerHTML" for the stored values `on` / `REDUCED`. That always fails, because `data-motion="on"` contains `on`. The DOM-leak assertion is now one dedicated test for `<img src=x>`. Fixed before the GREEN commit.

**4. Playwright and `aria-disabled`:** Playwright treats `aria-disabled="true"` as not enabled and will not click it, so the OS-locked click test uses `click({ force: true })`. The click still has to do nothing.

## Taste gate (CLAUDE.md)

- **Skill path:** I followed the "component or single section" special case: no draw; I matched the surrounding header and applied the house rules.
- **lint.mjs** `src/components/global src/lib/motion src/styles`: 1 FAIL, `hairline` on `SiteHeader.astro:34` `border-b`. That border was already there before this plan. Phases 03-05 and 04-xx recorded it and left it untouched per their UI-SPECs, and I did the same, so the plan's "no FAIL" criterion is not met as written. On the new or changed files alone (`MotionToggle.astro`, `src/lib/motion`, `src/styles`): 0 FAIL, 0 WARN.
- **inspect.mjs** `http://localhost:4431/` (build preview): 2 FAIL, 3 WARN. All are page-level and were there before this plan: `icon-cards` (services row), `still-page` (later Phase 6 plans build the motion layer), and the WARNs `hairline`, `palette-cream` and `no-footage`. The toggle adds no new finding.
- **Screenshots** in `.taste-skill/motion-states/` (gitignored, captured by the throwaway `tmp/motion-states.mjs`): full-1440, full-1440-hover, reduced-1440-focus, os-locked-1440-hover, full-320, reduced-320, os-locked-320-hover, es-os-locked-320-hover, es-full-768, reduced-icon-zoom.

### Screenshot critique (toggle states)

- **Rest, 1440:** a bare ink icon 8px right of `EN / ES`. There is no chrome, pill or border, so it reads as part of the plain bar (house rule: no bar chrome). Weight and size match the 14px semibold nav. Good.
- **Hover/focus, 1440:** the tooltip pill sits below the button, right-aligned to it, in the same dark pill as the Tools tooltip. The 2px accent focus ring is clearly visible. The `rounded-lg` radius is the "soft" radius the laws call a weak-site default, but it matches the existing ToolsRow tooltip, and consistency inside the site wins. Kept.
- **OS-locked, 1440:** the muted slashed icon plus the hint, wrapping to two lines inside 256px. It reads as one idea with the OS wording. Good.
- **320, row 1:** the wordmark on the left and the toggle on the right of row 1 balance the bar. Row 2 (nav + languages) is unchanged. The header stays 89px (e2e-verified).
- **ES OS-locked hint at 320:** it wraps to two lines and stays inside the viewport (left edge about 48px; e2e asserts no horizontal overflow). While hovered it covers part of nav row 2. That is acceptable for a transient floating element.
- **Weakest point (not fixed, within the UI-SPEC):** at 20px, pressed and unpressed differ only by the slash, so the pressed state is subtle at a glance. I confirmed the state with `reduced-icon-zoom.png` and computed styles. Screen readers get `aria-pressed`. If the user wants a stronger visual, a follow-up could tint the pressed icon or add a filled background. That is a UI-SPEC change, so I did not make it here.

## Known Stubs

These are draft copy strings marked `TODO(martina)` in both dictionaries:
- `src/i18n/ui.en.ts` / `ui.es.ts`: `cursor.view` ("View" / "Ver"; consumed by plan 06-09), `motion.toggle` ("Reduce motion" / "Reducir movimiento"), `motion.osLocked` ("Your device settings already reduce motion." / "La configuración de tu dispositivo ya reduce el movimiento.").

## Threat model check

- T-06-01: strict `=== 'reduced'` comparison, and the value is never interpolated. The unit test and the e2e `storage` test check that `<img src=x>` is absent from the DOM and from `page.content()`.
- T-06-02: the `win.localStorage` property access is inside the try. The e2e blocked-storage test passes with zero console errors, and the toggle still works through the session override.
- T-06-03: nothing stores `'on'` (unit test spies `setItem`). OS reduce is checked first. A click on the locked toggle is a no-op and writes nothing.

No new threat surface beyond the register.

## Self-Check: PASSED

- Files: src/lib/motion/events.ts, src/lib/motion/toggle.ts, src/components/global/MotionToggle.astro, tests/unit/helpers/fake-media.ts, tests/unit/motion-toggle.test.ts, tests/e2e/motion-toggle.spec.ts: all present.
- Commits: cea6060, 91af31a, a12ec62, 6420a0f, 4952621, 9fb6cb0: all in `git log`.
