---
phase: 06-scroll-interaction-motion
plan: 03
subsystem: motion
tags: [reveal, intersection-observer, css-failsafe, reduced-motion, a11y]
requires:
  - "06-01 three-state motion gate (data-motion on/reduced/off), onMotionChange, currentMotionState"
  - "06-02 measure:bundle eager gate"
provides:
  - "createReveal(deps) PageInit + revealDelay(el, batch) in src/lib/motion/reveal.ts"
  - "RevealDeps { now, createObserver } (06-08 adds an optional lines driver)"
  - "durations / eases token mirror in src/lib/motion/tokens.ts"
  - "src/lib/motion/effects.ts: page-wide effect registration, imported by BaseLayout"
  - "Markup API: data-reveal=lines|settle|shutter, data-reveal-delay, data-reveal-stagger"
  - "Runtime attributes: data-reveal-armed, data-revealed, data-reveal-instant, --reveal-delay"
  - "global.css motion tokens (--ease-*, --t-*), reveal states and @keyframes reveal-failsafe"
affects:
  - "06-04, 06-06 (picture transition declaration lives in the shutter rule), 06-08 (line rise on [data-reveal=lines])"
tech-stack:
  added: []
  patterns:
    - "Attributes in, CSS moves: JS only writes attributes and one custom property"
    - "Arm only after the observer exists; CSS failsafe animation shows unarmed elements at 1.5 s"
    - "Failsafe keyframe holds the visible state at both from and to (no interpolation residue)"
    - "Shutter end state is an explicit inset(0) (clip-path cannot interpolate inset() to none)"
key-files:
  created:
    - src/lib/motion/reveal.ts
    - src/lib/motion/tokens.ts
    - src/lib/motion/effects.ts
    - tests/unit/helpers/fake-io.ts
    - tests/unit/motion-reveal.test.ts
    - tests/unit/motion-tokens.test.ts
    - tests/e2e/motion-reveal.spec.ts
  modified:
    - src/styles/global.css
    - src/layouts/BaseLayout.astro
    - src/components/sections/FeaturedServices.astro
    - src/components/ui/ServiceCard.astro
    - src/components/sections/LatestWork.astro
    - src/components/sections/ToolsRow.astro
    - src/components/contact/ContactSection.astro
    - src/components/ui/ProjectCard.astro
    - src/components/ui/ProjectGrid.astro
    - tests/unit/project-card.test.ts
    - tests/e2e/motion.spec.ts
decisions:
  - "Late mount reveals everything whose top is above the viewport bottom (in view or above), not only intersecting elements, so scroll-restored pages never re-hide content above the fold"
  - "Cleanup removes data-reveal-armed from still-pending elements so the CSS failsafe owns them again if a remount never happens"
  - "Failsafe keyframe uses `from, to` with identical visible values; a `to`-only keyframe left 1e-11 residue in clip-path/translate"
  - "Revealed on-shutter frames carry clip-path: inset(0) explicitly; without it the cover snapped open"
  - "Integer parsing for data-reveal-delay / data-reveal-stagger accepts digits only (no sign, no exponent), then clamps"
metrics:
  duration: "~17 min"
  completed: 2026-10-29
  tasks: 3
  files: 18
---

# Phase 6 Plan 03: Scroll Reveals Summary

The scroll-reveal system for Home and every ProjectCard. One IntersectionObserver writes `data-revealed` with DOM-order batch delays. CSS owns the `settle`, `shutter` and `lines` (fade for now) start states under `on`, uses opacity-only fades under `reduced`, and has a 1.5 s CSS failsafe, so content is never stranded when JavaScript is off or fails.

## What was built

- **`src/lib/motion/reveal.ts`**
  - `revealDelay(el, batch)` (pure). The delay is the clamped authored base (0..600) plus `min(index, 4) × step`. The step comes from the nearest `[data-reveal-stagger]` ancestor (0..90, default 70). The index is the position of the stagger root's direct child within the batch, so a card's cover and its text share one slot.
  - `createReveal(deps)` handles:
    - `off`: no-op.
    - Arming inside the same try that creates the observer.
    - `rootMargin: '0px 0px -12% 0px'`, `threshold: 0`, and unobserve on reveal.
    - The late-mount instant rule.
    - `focusin`: reveals the focused element's own reveal ancestor, plus every part of the enclosing `article`, instantly.
    - A `scrollend` fallback at the page bottom.
    - An `onMotionChange` hook (no-op, kept for 06-08).
    - Cleanup: disconnect, abort, remove `--reveal-delay`, keep `data-revealed`.
- **`tokens.ts`**: `durations` (seconds) and `eases` (GSAP power names). A unit test parses `global.css` so CSS and JS cannot drift.
- **`effects.ts`**: registers `createReveal` on the lifecycle singleton. BaseLayout imports it after `../lib/motion`. The inline gate and `data-motion="off"` are untouched.
- **`global.css`**:
  - `--ease-reveal/travel/soft` in `@theme`, and the `--t-*` durations on `:root`.
  - Hidden, revealed, instant and failsafe rules.
  - One transition declaration on the shutter `<picture>` (06-06 merges its hover clip-path there).
  - `picture` inside a shutter frame is `display: block; block-size: 100%`, so `scale` applies.
- **Markup hooks**, per the UI-SPEC Home choreography:
  - Services: h2 `lines`, `ul` stagger 70, card `li` settle +140.
  - Latest work: h2 `lines`, "See all" `<p>` settle +280.
  - Tools: h2 `lines`, `ul` stagger 70, `li` settle +140 with 12px travel.
  - Contact: h2 `lines`, intro +140, email/socials +210, form column +280.
  - ProjectGrid: stagger 90.
  - ProjectCard: shutter only on non-eager covers, text block settle +70.
  - Hero, marquee and footer have no hooks.

## Verification

- Unit: `pnpm test` gives 62 files and **1,002 tests passing**. That includes `motion-reveal.test.ts` (revealDelay rules and every createReveal behaviour, including 10 lifecycle cycles holding `activeCleanups` at 1), `motion-tokens.test.ts`, and 4 new project-card tests (eager has no shutter, lazy has exactly one, both have one settle block).
- `pnpm lint` (astro check, eslint, prettier): clean.
- E2E (plan set: motion, motion-reveal, a11y, home, contact): **131 passed**. Full offline suite (`E2E_OFFLINE=1 pnpm playwright test`): **532 passed**.
  - V-02: with no JS, every `[data-reveal]` on `/`, `/es/`, `/projects/` and `/es/projects/` is at opacity 1 with no transform, translate or clip.
  - V-03 "fails": with `**/_astro/**/*.js` aborted, `data-motion` is `on` and everything is visible by 1.6 s on `/` and `/projects/`.
  - V-05 "scroll": at 1440x900 and 1440x1600 everything is revealed, and nothing re-hides after scrolling back.
  - V-12: under reduce, per-frame sampling while scrolling Home finds no transform, translate, scale or clip wipe.
  - "focus": Tab to the first Latest-work card reveals both of its parts within one frame, with text opacity 1.
  - "lcp cover": the first `/projects/` cover frame has no `data-reveal`, and the second has `shutter`.
  - "shutter" (added): the scroll shutter passes through intermediate `inset(0px 0px N%)` values and ends at `inset(0px)`.
- Acceptance greps:
  - `@keyframes reveal-failsafe`: 1.
  - `visibility: hidden|display: none` in global.css: 0.
  - `ease-in|transition-all` in global.css and in every `src/lib/motion` file: 0.
  - `rootMargin: '0px 0px -12% 0px'` in reveal.ts: 1.
  - `innerHTML` in reveal.ts: 0.
  - Effects import in BaseLayout: 1.
  - One `data-reveal="lines"` in each of the 4 sections.
  - Hero, marquee and footer have no `data-reveal`.
  - No element has both `data-magnetic` and `data-reveal`.

### Bundle (`pnpm measure:bundle`)

| Page | Eager files | Eager raw | Eager gzip -9 | Lazy |
|------|------|------|------|------|
| `/` | 8 | 24,584 B | **10,377 B** | 0 |
| `/es/` | 8 | 24,584 B | **10,377 B** | 0 |

The bundle check passes ("no GreenSock in eager chunks"). Against the 06-02 baseline of 8,536 B the total delta is **+1,841 B**. This plan's own code ships in the BaseLayout entry, which went from 49 B to **1,112 B gzip (+1,063 B)**. [Inference] The other ~778 B is 06-01 code merged after 06-02 measured: the MotionToggle entry (526 B) and the shared `motion` chunk (529 to 776 B, holding gate/events). I did not rebuild 27db884 on its own to confirm the split.

## Taste gate (CLAUDE.md)

- **lint.mjs** `src/components src/lib/motion src/styles`: 1 FAIL and 1 WARN, both pre-existing on lines this plan did not change. The FAIL is `hairline` at `SiteHeader.astro:34` (`border-b`). It was recorded in 06-01 and earlier phases. The WARN is `outlined-box` at `ToolsRow.astro:21`, the `tileBase` border. I left it unchanged, as Phase 2 did. The changed or new lines produce 0 findings.
- **inspect.mjs** `http://localhost:4431/` and `/es/` (build preview): 1 FAIL and 3 WARN on each, all pre-existing. The FAIL is `icon-cards` (services row). The WARNs are `hairline`, `palette-cream` and `no-footage`.
  - **No `empty-screens` and no `overflow`**: horizontal overflow is 0 at 1440, 768 and 390.
  - The `still-page` FAIL recorded in 06-01 is **gone**.
- **Moving elements at 1440: 28** (2 CSS animations, 26 transitions, 0 scripted). That is above the inspector's 16 warn threshold. The value is the same at 768 and 390.
- **Motion-state captures**: the Latest work and Services sections, mid-reveal (200 ms after scrolling to them) and settled, at 1440 and 390, in `.taste-skill/motion-states/`. The throwaway script is `tmp/capture-reveal.mjs` (gitignored).
- **Critique** (`references/critique.md`, motion passes only; the page composition is out of scope):
  1. *Fixed:* the first capture showed covers fully open at 200 ms. The shutter snapped instead of travelling, because `clip-path` cannot interpolate from `inset()` to `none`. I added an explicit `inset(0)` end state and an e2e sampling guard. After the fix the covers open as a top-anchored band that grows downward over 720 ms, staggered 90 ms across the row.
  2. *Open, for the UI-SPEC owner:* with `--ease-travel` (in-out), a cover is only about 6% open at 200 ms, while its title, settling at +70 ms on `--ease-reveal`, is already readable. Mid-reveal, the text therefore reads ahead of its picture, which inverts the "heading, text, picture" reading order only within the card. The settled state is correct. I kept the spec's +70 ms, so this is not a defect against the contract. Options: give the card text a larger offset, or open the shutter with `--ease-reveal`.
  3. *Fine:* services cards settle left to right at 70 ms steps from 140 ms, and the tools tiles travel 12 px. Nothing failed to appear in any settled capture or in the inspector screenshots. The only blank band is the bottom ~12% of the first screen at load, where the services cards wait for the trigger line by design.
  4. *Pre-existing page findings, not in this plan's scope:* `icon-cards`, `hairline`, `palette-cream` and `no-footage`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Failsafe keyframe left interpolation residue**
- **Found during:** Task 3 (V-03 e2e)
- **Issue:** With `to { … }` only, the forwards fill computed `clip-path: inset(0px 0px 1.1e-11%)` and `translate: 0px 2.2e-12px`. Visually it was fine, but it is not exact, and the test failed. Switching to `steps(1, end)` made things worse: the fill stayed at the start values.
- **Fix:** `@keyframes reveal-failsafe { from, to { …visible… } }`, so every progress value is the exact visible state.
- **Files:** src/styles/global.css. **Commit:** 80647f2

**2. [Rule 1 - Bug] Shutter snapped open instead of animating**
- **Found during:** Task 3 taste capture (mid-reveal screenshot)
- **Issue:** The revealed state fell back to `clip-path: none`, and `inset()` to `none` is not interpolable, so the 720 ms transition never ran.
- **Fix:** `clip-path: inset(0)` on `[data-motion='on'] [data-reveal='shutter'][data-revealed]`. I added the e2e "shutter" test, which samples intermediate clip values.
- **Files:** src/styles/global.css, tests/e2e/motion-reveal.spec.ts. **Commit:** 2946b09

**3. [Rule 2 - Correctness] Shutter `<picture>` made block-level**
- **Issue:** Astro's `<picture>` is inline, and `scale` does not apply to inline boxes, so the 1.08 → 1 settle would have done nothing.
- **Fix:** `[data-reveal='shutter'] > picture { display: block; block-size: 100% }`. The img is already `size-full`, so the layout is unchanged.
- **Commit:** 89aae04

### Other notes
- The plan's verify commands `cd` into the main checkout. I ran them inside this worktree instead.
- The worktree base was behind the expected base (234dcb2 vs 27db884). I reset to 27db884 as the startup check instructs, before any work.

## Known Stubs

None. `onMotionChange(doc, () => undefined, signal)` in reveal.ts is an intentional hook that 06-08 extends. CSS already switches transitions between `on` and `reduced`.

## TDD Gate Compliance

Task 1: RED `feca064` (`test(06-03)`), then GREEN `89aae04` (`feat(06-03)`). Compliant.

## Self-Check: PASSED

- All 7 created files and 11 modified files exist in the worktree.
- Commits present: feca064, 89aae04, 2883813, 80647f2, b1ee63b, 2946b09.
