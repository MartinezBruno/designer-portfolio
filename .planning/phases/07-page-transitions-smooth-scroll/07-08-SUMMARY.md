---
phase: 07-page-transitions-smooth-scroll
plan: 08
subsystem: motion
tags: [parallax, scroll-driven-animations, css, cards, reduced-motion, print]
requires:
  - Phase 6 card layers (frame reveal clip, picture mat, img hover scale)
  - 07-03 leak contract (parallax animations == [data-parallax] elements)
  - 07-06 title morph (project-title name on the card title, not on the image)
provides:
  - "[data-parallax-frame] (overflow-clip frame, names the --px view timeline) and [data-parallax] (moving img) markup on lazy ProjectCard covers and the NextProjectTeaser thumbnail"
  - "--px-overscan: 4% / --px-travel: 3.5% tokens on [data-parallax-frame]"
  - "@supports (animation-timeline: view()) block in global.css, with a marked slot for 07-09's side-entrance rules"
  - "@keyframes parallax and a print reset for [data-parallax]"
  - "tests/e2e/parallax.spec.ts"
  - "capture item 7 in tests/e2e/transitions-capture.spec.ts"
affects: [07-09, 07-10]
tech-stack:
  added: []
  patterns:
    - Scroll-driven animation written with longhands only (animation-name, -timing-function, -fill-mode, -timeline, -range), never the `animation` shorthand
    - e2e waits on animations filter `a.timeline instanceof DocumentTimeline`, so scroll-linked animations never hang them
key-files:
  created:
    - tests/e2e/parallax.spec.ts
  modified:
    - src/styles/global.css
    - src/components/ui/ProjectCard.astro
    - src/components/project/NextProjectTeaser.astro
    - tests/unit/motion-tokens.test.ts
    - tests/unit/project-card.test.ts
    - tests/e2e/transitions-capture.spec.ts
    - tests/e2e/helpers/motion.ts
    - tests/e2e/motion-hover.spec.ts
    - tests/e2e/motion-pointer.spec.ts
    - tests/e2e/transitions.spec.ts
    - tests/e2e/navigation-leaks.spec.ts
decisions:
  - "Parallax uses animation longhands, not the `animation` shorthand. The build's CSS minifier folds `animation: parallax linear both` plus `animation-timeline: --px` into `animation: linear both parallax --px`. Chromium rejects that because the timeline is reset-only in the shorthand, and the whole animation is silently dropped. 07-09 must follow the same rule for stack-enter. Its plan text says shorthand first."
  - "The custom rules in global.css are unlayered, after `@import 'tailwindcss'`, so the parallax `height` override beats Tailwind's layered `size-full` without any specificity tricks."
  - "Scope amendment D-11a: no `[data-parallax-frame='stack']` token rule, no stack token tests and no 'stack' frame value in comments. The @supports block ends with a comment slot where 07-09's side-entrance rules go."
metrics:
  duration: ~55 min
  completed: 2026-11-02
---

# Phase 7 Plan 08: Card and Teaser Parallax Summary

Zero-JS CSS scroll-driven parallax for lazy project card covers (Home and Projects) and the Next-project teaser. It uses a named `--px` view timeline on an `overflow: clip` frame, 4% overscan and ±3.5% travel, runs only under `[data-motion='on']` inside `@supports (animation-timeline: view())`, and composes with the Phase 6 hover zoom because it animates `translate` while the hover uses `scale`.

## What was built

- **global.css**
  - Frame tokens: `[data-parallax-frame] { --px-overscan: 4%; --px-travel: 3.5% }`.
  - Inside `@supports (animation-timeline: view())`: the frame gets `view-timeline: --px block` under `'on'`. The image gets `position: relative; top: -overscan; height: 100% + 2 × overscan` and the `parallax` animation on `--px` with `cover 0% cover 100%`. The overscan exists only under `'on'`, so `reduced`, `off`, browsers without scroll timelines and print keep the exact Phase 6 box.
  - `@keyframes parallax` goes from `translate: 0 -3.5%` to `0 3.5%`, with the arithmetic in a comment: 3.5% of 108% = 3.78% < 4%.
  - The print block resets `animation`, `translate`, `top` and `height` on `[data-parallax]`.
- **ProjectCard.astro**
  - The frame is `overflow-clip` (it was `overflow-hidden`).
  - `data-parallax-frame` and `data-parallax` are added by conditional spread, and the eager LCP cover gets neither.
- **NextProjectTeaser.astro**: the same change, unconditional, because the teaser is never eager.
- **Tests**
  - Unit tests for the tokens, the support gate, the `'on'`-only selectors and the print reset (motion-tokens), plus the frame and image hooks on lazy and eager cards (project-card).
  - e2e tests (parallax.spec, 15 cases):
    - drift at 1440, 390 and on Pixel 7 touch, for the Projects card, the Home card and the teaser
    - the image always covers its frame
    - hover zoom and drift together
    - the eager cover and the hero portrait are never moved
    - no CLS between `'on'` and `'reduced'` at 1440 and 390
    - no horizontal overflow
    - still states: reduced, off, a live toggle to reduced, and print

## Task commits

| Task | Commit | Message |
|---|---|---|
| 1 RED | f502104 | test(07-08): add failing parallax e2e |
| 2 GREEN | 65e4059 | feat(07-08): drift card and teaser covers on scroll |
| 3 | e589ece | test(07-08): capture card parallax frames |

## Verification

- `pnpm lint` (astro check, eslint, prettier) is clean. `pnpm test`: 70 files and 1214 tests pass.
- `pnpm build` passes.
- e2e uses the scratch config on port 4461 with `@network` excluded.
  - RED: 10 of 15 parallax cases failed before Task 2.
  - The plan's list passed: parallax, motion-hover, motion-reveal, projects-grid, home-latest-work, layout and navigation-leaks, 138 tests.
  - The **full offline suite also passed**: 699 passed, 95 skipped. The skips are the opt-in capture specs.
- `grep -c overflow-hidden` returns 0 for both components. `@keyframes parallax` appears once. There is no `ease-in`, `transition-all`, `display: none` or `visibility: hidden` in global.css.

## Taste-skill gate (SKILL.md, references/motion.md, references/critique.md)

- **lint.mjs** (`src/styles src/components/ui src/components/project`, 21 files): 0 FAIL, 0 WARN.
- **inspect.mjs** ran against the preview on 4461. Output is in `.taste-skill/inspect-07-08/` (gitignored).

| URL | Moving (1440/768/390) | Codes |
|---|---|---|
| `/` | 37 / 37 / 38 (Phase 6: 34 / 34 / 35) | FAIL `icon-cards` (accepted in Phase 6). WARN `hairline`, `palette-cream`, `first-action`, `no-footage` (all accepted in Phase 6) |
| `/projects/` | 27 / 27 / 27 (Phase 6: 21 / 21 / 21) | FAIL `focal-point` (logged in 06-06). FAIL `empty-screens` (Phase 6 artefact: the probe hits the card link overlay). Same 4 WARNs |

  - No `overflow`, `clipped-text`, `covered-text`, `headline-lines`, `shadow`, `gradient` or `glass` on either page. Every code above already existed in 06-10.
  - `still-page` did not regress. The moving count went up on both pages, as expected, because each lazy cover now counts as moving.
- **Capture item 7** (`CAPTURE_TRANSITIONS=1`, 62 captures passed) is in `.taste-skill/transitions/`:
  - `7-home-{1440,390}-{entering,centred,leaving}.png`
  - `7-projects-{1440,390}-{entering,centred,leaving}.png`
  - `7-teaser-{1440,390}-{entering,centred,leaving}.png`
- **Critique** (from the captures and the inspector page strips):
  - **Empty frame edge:** none in any capture. The covers fill the frame at entering, centred and leaving. At 1440, entering is clamped at the top of `/projects/`, and the teaser's leaving is clamped at the page end. The e2e checks image-covers-frame at all three positions.
  - **Gentle:** the measured drift on a 502 px Projects frame is about 19 px each way, roughly 7.6% total. It reads as depth rather than as movement of the work. That is within motion.md's "under 8% of the element" and D-10.
  - **Cropping:** about 4% of the cover sits outside the frame at each edge. Text inside her covers (Cabrera's posts, the PuroV wordmark, Mart) is not cut more than in Phase 6 in any capture.
  - **Layering:** the hover mat (12 px inset) and zoom still apply while the image drifts (e2e D-13 case). The `project-title` morph name sits on the title, not the image, so the two don't interact.
  - The shutter mid-reveal that is visible in `7-projects-1440-leaving` (the next row) is the Phase 6 reveal after an instant jump, not parallax.
  - **Blocking findings: none.**

## Deviations from Plan

### Scope amendment (orchestrator, D-11a)

**1. The stack token rule and its tests were dropped**
- The orchestrator instructed this after the user's 2026-11-02 decision D-11a: the detail stack now gets a horizontal side entrance in revised 07-09, not vertical drift.
- Not added: `[data-parallax-frame='stack'] { --px-overscan: 3%; --px-travel: 2.6% }`, the unit assertions for those values, and any 'stack' frame value in comments.
- The `@supports (animation-timeline: view())` block ends with a comment slot for 07-09's side-entrance rules, so they can go into the same gate.

### Auto-fixed issues

**1. [Rule 1 - Bug] The CSS minifier dropped the parallax animation**
- **Found during:** Task 2 (the drift e2e still read `translate: none`).
- **Issue:** the minifier rewrote `animation: parallax linear both` plus `animation-timeline: --px` as `animation: linear both parallax --px`. That is invalid in Chromium, which dropped it, so no animation ran.
- **Fix:** the rule now uses longhands only (`animation-name`, `animation-timing-function`, `animation-fill-mode`, `animation-timeline`, `animation-range`). I confirmed this in `dist/client/_astro/*.css`.
- **For 07-09:** its plan says "`animation` shorthand first, then the timeline". It must use longhands too, or `stack-enter` will be dropped the same way.
- **Commit:** 65e4059

**2. [Rule 3 - Blocking] e2e animation waits hung on scroll-linked animations**
- **Found during:** Task 2. navigation-leaks timed out at 120 s.
- **Issue:** several waits awaited `.finished` on every finite animation. Scroll-driven parallax never finishes while its frame is on screen. Its endTime is a percentage, not Infinity, so the existing filter let it through.
- **Fix:** the waits now filter on `a.timeline instanceof DocumentTimeline`. Changed files: `settleMotion` in `helpers/motion.ts`, the motion-pointer copy, the motion-hover card wait, transitions.spec `entranceDone`, and the navigation-leaks pre-count wait. The leak assertion itself is unchanged.
- **Commit:** 65e4059

**3. [Rule 1 - Bug] Teaser attribute value**
- A bare `data-parallax-frame` in the teaser template rendered as `="true"`. I made it explicit as `=""` so it matches the cards.
- **Commit:** 65e4059

**4. Test-measurement notes (in the spec)**
- The computed `translate` is a percentage of the image, so drift is measured in px from the bounding rects.
- `view-timeline` honours the root's `scroll-padding-top`, so the timeline reaches 100% a little before the frame fully leaves.
- The hover case moves the mouse instead of calling `hover()`, because the stretched title link covers the frame.

## Known Stubs

None.

## Threat Flags

None. The change is static CSS and build-time attributes only. T-07-21 and T-07-22 are mitigated:
- Travel is below 8% and runs only under `'on'`. The e2e covers the still states.
- Overscan exists only under `'on'` inside clip frames. The e2e checks no horizontal overflow and equal frame heights.

## Self-Check: PASSED

- FOUND: tests/e2e/parallax.spec.ts, src/styles/global.css (`@keyframes parallax`), ProjectCard.astro and NextProjectTeaser.astro (`data-parallax-frame`)
- FOUND commits: f502104, 65e4059, e589ece
