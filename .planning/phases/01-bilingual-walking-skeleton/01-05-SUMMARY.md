---
phase: 01-bilingual-walking-skeleton
plan: 05
subsystem: motion-a11y
tags: [astro, motion, reduced-motion, lifecycle, happy-dom, vitest, playwright, axe, a11y]
requires:
  - "01-04: BaseLayout Props { locale; title; description; kind? }, four pages (/, /es/, /404, /es/404/)"
  - "01-01: approved package list (happy-dom 21.0.3 deferred to this plan)"
provides:
  - "src/lib/motion/gate.ts: MotionState, applyMotionGate(doc, win), motionGateInline, onMotionPreferenceChange(win, cb)"
  - "src/lib/motion/lifecycle.ts: Cleanup, PageInit, Lifecycle, createLifecycle(doc, onError?), bindToAstro(lifecycle, doc)"
  - "src/lib/motion/index.ts: page singleton `lifecycle`, already bound to Astro events (Phases 6-7 register effects here)"
  - "BaseLayout: blocking inline gate right after the viewport meta; bundled module script bootstraps the registry"
  - "tests/e2e/a11y.spec.ts: phase-level axe sweep (4 pages) plus Home keyboard order and focus outline"
affects: [phase-06-motion, phase-07-transitions]
tech-stack:
  added: ["happy-dom 21.0.3 (dev, exact pin)"]
  patterns:
    - "One self-contained function used both as the stringified inline head script and as a unit-tested module export"
    - "Idempotent mount/unmount lifecycle registry, mounted immediately and also bound to raw astro:page-load / astro:before-swap"
    - "Typed FakeMediaQueryList (extends EventTarget implements MediaQueryList) for unit tests without casts"
key-files:
  created:
    - src/lib/motion/gate.ts
    - src/lib/motion/lifecycle.ts
    - src/lib/motion/index.ts
    - tests/unit/motion-gate.test.ts
    - tests/unit/lifecycle.test.ts
    - tests/e2e/motion.spec.ts
    - tests/e2e/a11y.spec.ts
  modified:
    - src/layouts/BaseLayout.astro
    - package.json
    - pnpm-lock.yaml
key-decisions:
  - "Motion gate returns 'off' when matchMedia is unavailable (safe default; deliberate deviation from the RESEARCH sketch that returned 'on')"
  - "Lifecycle cleanups are isolated in try/catch like inits, so one failing cleanup cannot leak the others"
  - "No CSS targets data-motion in Phase 1; the html element keeps a static data-motion=\"off\" for no-JS"
  - "The only set:html in src/ is the motionGateInline build-time constant"
requirements-completed: [FND-01, FND-02, HOME-01, I18N-06]
duration: 6min
completed: 2026-10-16
---

# Phase 1 Plan 05: Motion Gate, Lifecycle Registry and Accessibility Sweep Summary

Every page now sets `html[data-motion]` before first paint through a blocking inline script that is also a unit-tested function. It resolves to "on" only when matchMedia exists and reduced motion is not requested; otherwise it stays "off". The page also bootstraps an idempotent lifecycle registry that later motion effects will register through, and the phase closes with a green axe, keyboard-order and 320px sweep.

## Performance

- Duration: about 6 minutes
- Tasks: 3 of 3
- Files: 7 created, 3 modified

## Accomplishments

- `applyMotionGate` is self-contained (no imports). It is stringified into `motionGateInline` and injected with `<script is:inline set:html>` right after the viewport meta, before SeoHead, fonts and stylesheets.
- `createLifecycle` makes mount and unmount idempotent and isolates errors from each init and each cleanup through `onError`. A registration made after mount runs immediately, and `activeCleanups` stays constant over 10 cycles.
- `bindToAstro` mounts immediately and follows `astro:page-load` / `astro:before-swap` (raw strings). It returns an unbind function.
- The e2e tests verify: data-motion is "on" by default with zero console errors and zero page errors, and "off" under `reducedMotion: 'reduce'` and with JS disabled, with the h1, hero image, header and footer still visible.
- axe (wcag2a/2aa/21a/21aa/22aa) reports 0 violations on `/`, `/es/`, `/does-not-exist` and `/es/404/`. Tab order on `/` is skip link, wordmark, Contact, EN, ES, hero CTA, footer email, Behance, and each stop has a non-'none' outline-style.
- The existing 320px reflow test in `layout.spec.ts` (no horizontal overflow, h1 at most 2 lines) still passes on `/` and `/es/`.

## Task Commits

1. Task 1, failing motion and a11y e2e: `37c7cec` (test)
2. Task 2, RED (unit tests plus happy-dom): `6b07699` (test). GREEN (gate, lifecycle, index): `a4281fb` (feat)
3. Task 3, BaseLayout wiring and full gate: `9897120` (feat)

## Verification

- Verified by `pnpm verify`, which exited 0: astro check 0 errors, eslint clean, prettier clean, 55 unit tests passed, 43 e2e tests passed, secrets check ok (18 dist files).
- Verified by the dev smoke: `astro dev --background` with curl on `/` and `/es/` succeeded.
- Acceptance greps: `set:html` appears once in src/ (motionGateInline); the inline head-script node check exits 0; `data-motion="off"` appears once in dist/index.html; there are 0 `data-motion` references in src/styles and src/components; gate.ts has 0 `^import`; lifecycle.ts has 0 `| void`; there are 0 localStorage references.

## Build Observations (recorded only, no performance claims)

- `dist/_astro/*.js` files: **0**. Astro inlined the bundled registry module into each page as `<script type="module">` instead of emitting a chunk, presumably because it is below Vite's asset inline limit. [Inference] It will probably become an external chunk once Phase 6 effects make it larger.
- Inlined registry module: 645 B raw, **343 B gzip** (Python `gzip.compress` level 9 over the script body in dist/index.html). There was no separate file to run `gzip -c FILE | wc -c` against.
- Inline gate script: 317 B raw, 210 B gzip.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Robustness] Cleanups isolated in try/catch**
- Found during: Task 2
- Issue: The RESEARCH sketch drained cleanups without a guard, so one throwing cleanup would skip the rest and leave effects mounted.
- Fix: Each cleanup now runs in try/catch and reports through `onError`. Added the unit test "isolates a throwing cleanup so the remaining cleanups still run".
- Files: src/lib/motion/lifecycle.ts, tests/unit/lifecycle.test.ts
- Commit: a4281fb

**2. [Rule 3 - Blocking] Comments reworded to satisfy acceptance greps**
- Found during: Tasks 2 and 3
- Issue: Explanatory comments containing the literal strings `| void` and `set:html` broke the `grep -cE "\| void"` = 0 and `grep set:html` = 1 checks.
- Fix: Reworded the comments. There is no code change.
- Commits: a4281fb, 9897120

**3. [Convention] No `as unknown as` casts in unit tests**
- Found during: Task 2
- Issue: The first draft cast the matchMedia mocks through `unknown`, which conflicts with the user's rule to avoid `any` and `unknown`.
- Fix: Replaced the casts with a typed `FakeMediaQueryList extends EventTarget implements MediaQueryList`. The "matchMedia missing" case temporarily redefines `window.matchMedia` and restores it afterwards.
- Commit: 6b07699

Planned deviation applied as specified: the gate defaults to 'off' when matchMedia is missing.

## Known Stubs

None. Per the plan, Phase 1 intentionally registers no effects. The registry exists for Phases 6 and 7.

## TDD Gate Compliance

- RED: `37c7cec` (e2e; only the two data-motion="on" assertions failed while the other 41 passed) and `6b07699` (unit tests failed because the modules were missing).
- GREEN: `a4281fb` (unit tests) and `9897120` (e2e).

## Self-Check: PASSED

- FOUND: src/lib/motion/gate.ts, src/lib/motion/lifecycle.ts, src/lib/motion/index.ts, tests/unit/motion-gate.test.ts, tests/unit/lifecycle.test.ts, tests/e2e/motion.spec.ts, tests/e2e/a11y.spec.ts
- FOUND commits: 37c7cec, 6b07699, a4281fb, 9897120
