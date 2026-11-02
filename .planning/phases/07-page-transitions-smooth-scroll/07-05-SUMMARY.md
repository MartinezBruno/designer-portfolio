---
phase: 07-page-transitions-smooth-scroll
plan: 05
subsystem: motion
tags: [lenis, smooth-scroll, lazy-load, accessibility, reduced-motion, leak-test]
requires:
  - 07-02 (lifecycle mount after router scroll restore)
  - 07-03 (navigation-leaks.spec, at most one html.lenis per visit)
provides:
  - lenis@1.3.27 runtime dependency (exact pin, user-approved)
  - Memoised lazy loader src/lib/motion/load-lenis.ts (createLenisLoader, loadLenis, LenisCtor)
  - Page-scoped smooth-scroll PageInit src/lib/motion/smooth-scroll.ts (createSmoothScroll, SmoothScrollDeps)
  - Lenis base rules src/styles/smooth-scroll.css, imported in BaseLayout
  - SC2/SC4 smooth-scroll e2e tests/e2e/smooth-scroll.spec.ts
affects: [07-07, 07-08, 07-09, 07-10]
tech-stack:
  added: [lenis@1.3.27]
  patterns:
    - Lazy third-party chunk behind a memoised loader that forgets rejections (copy of load-gsap)
    - Media + motion-state gated session with an abort guard after the async load (copy of cursor.ts)
key-files:
  created:
    - src/lib/motion/load-lenis.ts
    - src/lib/motion/smooth-scroll.ts
    - src/styles/smooth-scroll.css
    - tests/unit/motion-load-lenis.test.ts
    - tests/unit/smooth-scroll.test.ts
    - tests/e2e/smooth-scroll.spec.ts
  modified:
    - package.json
    - pnpm-lock.yaml
    - src/lib/motion/effects.ts
    - src/layouts/BaseLayout.astro
decisions:
  - lerp stays at the UI-SPEC default 0.12 (no hands-on trackpad review possible in this agent run; final feel check is in 07-10 / manual UAT)
  - Lenis base rules live in a dedicated src/styles/smooth-scroll.css (plan file list), not global.css as UI-SPEC wording says, to avoid touching 07-04's file in the same wave
  - The `.lenis-autoToggle` transition rule from lenis.css is left out (autoToggle is never enabled)
  - Tab-order e2e compares 'on' with Lenis against 'on' with the Lenis chunk blocked, because 'reduced' legitimately drops the marquee pause button from the Tab order
  - e2e activates header controls with a dispatched click, because Playwright's click() scrolls the sticky header ~370 px (scroll-padding-top) even with Lenis absent
metrics:
  duration: ~45 min
  completed: 2026-11-02
  tasks: 3
  files: 10
---

# Phase 7 Plan 05: Lenis smooth scroll Summary

Desktop wheel and trackpad scrolling now glides lightly through Lenis 1.3.27 (lerp 0.12). Lenis loads lazily, only for a fine hover pointer under `data-motion="on"` with no forced colours. It is page-scoped: it is destroyed on `astro:before-swap` and rebuilt on `astro:page-load` at the restored position. A live switch of the motion toggle or the media queries destroys or re-creates it in place. Touch, `reduced`, `off` and forced colours keep native scrolling. Keyboard, find-in-page and Tab order are unchanged.

## Tasks

| # | Task | Commit | Notes |
|---|------|--------|-------|
| 1 | Approve lenis@1.3.27 before install (checkpoint:human-verify, blocking-human) | none (approval only) | Resolved by the orchestrator before this run. The user was shown: lenis@1.3.27, MIT, repo github.com/darkroomengineering/lenis, dist-tag latest = 1.3.27, no preinstall/install/postinstall scripts, no runtime dependencies. On 2026-11-02 the user answered **"Approved"** to `pnpm add lenis@1.3.27 --save-exact`. Nothing was installed before that approval. |
| 2 | Install lenis and write the failing smooth-scroll e2e (RED) | `cf3c8d8` | `"lenis": "1.3.27"` in dependencies. Before Task 3: 6 Lenis-present cases failed (glide, keyboard, find, toggle, soft-nav/back, Tab order); the 4 absence cases passed, as expected. |
| 3 | Lazy loader, page-scoped effect, base CSS, registration (GREEN) | `5369523` | Unit RED confirmed (modules missing), then 14/14 green. |

## What was built

- `load-lenis.ts`: `createLenisLoader(importer)` memoises the import and clears the cache after a rejection. `loadLenis` is the only `import('lenis')` in `src/`. The constructor type is imported type-only. `lenis/dist/lenis.css` is not imported anywhere.
- `smooth-scroll.ts`: `createSmoothScroll({ matchMedia, loadLenis })`. `allowed = fine && !forced && state === 'on'`. The session aborts before construction if it was stopped while the chunk loaded. Options: `{ lerp: 0.12, smoothWheel: true, syncTouch: false, wheelMultiplier: 1, anchors: false, stopInertiaOnNavigate: true, autoRaf: true }`. A failed chunk load leaves native scroll. The init returns undefined with no `defaultView`. `scroll-behavior: smooth` is never set.
- `smooth-scroll.css`: the lenis.css rules with their exact upstream selectors (`html.lenis, html.lenis body`; `.lenis:not(.lenis-autoToggle).lenis-stopped`; the five `.lenis [data-lenis-prevent*]` selectors; `.lenis.lenis-smooth iframe`). Upstream also has a `.lenis.lenis-autoToggle` transition rule. It is omitted because `autoToggle` is never enabled.
- `effects.ts`: `lifecycle.register(createSmoothScroll({ matchMedia: (q) => window.matchMedia(q), loadLenis }))`.
- `BaseLayout.astro`: `import '../styles/smooth-scroll.css';` right after `global.css`.

## Verification

- `pnpm lint` (astro check, eslint, prettier): 0 errors, clean. [Verified]
- `pnpm test`: 70 files, 1140 tests passed (14 new: 2 loader, 12 effect). [Verified]
- `pnpm build`: ok. [Verified]
- e2e (scratch config outside the repo, port 4442):
  - `smooth-scroll.spec.ts` + `navigation-leaks.spec.ts` with `--repeat-each=2`: 22/22 passed. [Verified]
  - Full hermetic suite (`@network` excluded): 664 passed, 73 skipped, 0 failed (1.7 min). This includes `transitions.spec` at this worktree's base, without 07-04's edits. [Verified]
  - Leak table: per-URL counts identical on every counted visit (for example `/` w17/d102/a2), and `html.lenis` ≤ 1 per visit. [Verified]
- Acceptance greps: no `lenis` import outside `load-lenis.ts`. `anchors: false` = 1 and `syncTouch: false` = 1 in `smooth-scroll.ts`. No `scroll-behavior: smooth` in `src/styles`. `smooth-scroll.css` = 1 in `BaseLayout.astro`. [Verified]

### Bundle (`pnpm measure:bundle`, fresh build)

| Page | Eager gzip -9 | 07-01 record | Phase 6 baseline |
|------|---------------|--------------|------------------|
| `/` | 21,480 B (14 files) | 20,732 B | 14,643 B |
| `/es/` | 21,480 B (14 files) | 20,732 B | 14,643 B |

- Lazy Lenis chunk: `/_astro/lenis.CZma2zI-.js`, 18,646 B raw, **5,350 B gzip -9** (target ≤ 6,000 B). `gzip -9 | wc -c` gives 5,368 B including the gzip header. [Verified]
- `grep -l lenisVersion dist/client/_astro/*.js` matches only `lenis.CZma2zI-.js`, which the measure output lists under "lazy" for both pages. Lenis is in no eager chunk. [Verified]
- The +748 B over the 07-01 record covers all of 07-02, 07-03 and this plan's registration code (the base was not rebuilt separately, so this plan's share is not isolated). It is still under the proposed 22,000 B ceiling, which 07-10 enforces. [Inference]

## Taste-skill gate (design_gate, motion change)

Read `SKILL.md` (§7 Gate, §8 Look) and `references/motion.md` (§2, §6) directly from `/Users/bmartinez/.claude/plugins/cache/taste-skill/taste-skill/2.0.0/skills/taste-skill/`.

- `node .../scripts/lint.mjs src/lib/motion/smooth-scroll.ts src/lib/motion/load-lenis.ts src/lib/motion/effects.ts src/styles/smooth-scroll.css src/layouts/BaseLayout.astro`: **0 FAIL, 0 WARN**. [Verified]
- `node .../scripts/inspect.mjs http://localhost:4443/` (run from the scratchpad, so no `.taste-skill/` in the repo): FAIL `icon-cards` (Phase 2, accepted). WARN `hairline`, `palette-cream`, `first-action`, `no-footage`. These are identical to 07-02's record, so nothing is new. [Verified]
- `inspect.mjs http://localhost:4443/projects/website-instablogs/`: FAIL `still-page` with 5 elements, the same as Phase 6 and 07-02 (accepted artefact). Same WARNs. No regression. [Verified]
- Looked at `desktop-fold.jpg` (1440): the render is unchanged. Lenis has no visual surface in a still.
- **Override recorded:** motion.md §6 says "No scroll hijacking, no smooth-scroll library by default". The user locked Lenis in 07 D-06. The contract keeps the rule's reasons in check: wheel only (`smoothWheel`, `syncTouch: false`), a light lerp, never in touch, `reduced`, `off` or forced colours, native keys, find and Tab (all e2e-verified), and no `scroll-behavior` rule.
- **lerp feel check:** kept **0.12**. [Inference] With lerp 0.12 the remaining distance shrinks by 12% per 60 Hz frame, so about 99% of a notch settles in about 36 frames (about 0.6 s): a short catch-up, not a float. The e2e glide sample confirms progressive motion (start < 60 ms sample < 1 s sample). **I could not verify the hands-on trackpad or wheel feel at 1440 on Home and a long detail page**, because this agent has no physical input device. That check stays with 07-10's taste review and the manual UAT (Safari/Firefox).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug, test] Playwright click() scrolled the page before toggle and nav clicks**
- **Found during:** Task 3 GREEN run
- **Issue:** The toggle and back-restore cases were off by 368 px. A debug run showed that Playwright's `click()` on the sticky-header toggle scrolls 900 → 532 even with the Lenis chunk blocked, and a JS click does not. Chromium treats the header control as hidden under `scroll-padding-top`. This is a harness artefact, not a Lenis bug.
- **Fix:** Added a `pressInPlace()` helper (dispatched click, button 0) for the toggle and the header nav link, plus a local `routerNavigate()` (astro:page-load wait plus `waitForNavigationIdle`) for the nav and `goBack()`.
- **Files modified:** tests/e2e/smooth-scroll.spec.ts
- **Commit:** 5369523

**2. [Rule 1 - Bug, test] The Tab-order comparison against 'reduced' was not apples-to-apples**
- **Found during:** Task 3 GREEN run
- **Issue:** 'reduced' drops the marquee's "Pause roles animation" button from the Tab order (Phase 6 behaviour), so the lists differed for reasons unrelated to Lenis.
- **Fix:** The test now compares 'on' with Lenis against 'on' with the Lenis chunk aborted through `page.route` (marker `lenisVersion`). This isolates Lenis as the only variable.
- **Files modified:** tests/e2e/smooth-scroll.spec.ts
- **Commit:** 5369523

**3. [Rule 3 - Blocking] `window.find` is missing from lib.dom**
- **Found during:** Task 2 lint (`astro check` ts2339)
- **Fix:** Typed `find(text: string): boolean` in the spec's `declare global` Window augmentation.
- **Commit:** cf3c8d8

**4. [Plan wording] JSDoc citation of "anchors: false"**
- The plan's JSDoc text and its acceptance grep (`grep -c "anchors: false"` = 1) conflict. The JSDoc now says "Pitfall 4 (Lenis anchors off)", so the option line is the only match.

**5. [Setup] Worktree base reset**
- The worktree started at `234dcb2` (Phase 5). Following the setup check, it was reset to the expected base `997b947` before any work.

## Known Stubs

None. `[data-lenis-prevent]` rules ship unused on purpose: no nested scrollers exist yet (plan interfaces, grep 2026-11-02).

## Threat Flags

None beyond the plan's threat register. T-07-SC: human approval, exact pin, lockfile committed. T-07-13: iframe rule, no syncTouch, keys and find e2e. T-07-14: gating plus live destroy, unit and e2e. The embed-over-glide check stays a manual 07-10 step.

## TDD Gate Compliance

`test(07-05)` commit `cf3c8d8` (RED) is followed by `feat(07-05)` commit `5369523` (GREEN). The unit RED for Task 3 was confirmed locally (modules missing) and committed together with GREEN in `5369523`, per the plan's two-commit structure.

## Self-Check: PASSED

- FOUND: src/lib/motion/load-lenis.ts, src/lib/motion/smooth-scroll.ts, src/styles/smooth-scroll.css, tests/unit/motion-load-lenis.test.ts, tests/unit/smooth-scroll.test.ts, tests/e2e/smooth-scroll.spec.ts
- FOUND: commits cf3c8d8, 5369523
- STATE.md and ROADMAP.md untouched
