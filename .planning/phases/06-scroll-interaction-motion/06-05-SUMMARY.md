---
phase: 06-scroll-interaction-motion
plan: 05
subsystem: motion
tags: [hero, css-keyframes, line-mask, shutter, lcp, reduced-motion, a11y]
requires:
  - "06-01 three-state motion gate, onMotionChange, currentMotionState, lifecycle"
  - "06-03 motion tokens (--ease-reveal/travel/soft, --t-hero, --t-settle) and reveal CSS"
provides:
  - "Hero markup hooks: data-hero, data-hero-line / data-hero-line-inner, data-hero-lead, data-hero-cta, picture[data-hero-portrait]"
  - "CSS hero load sequence (hero-rise, hero-shutter, hero-scale, hero-settle) under [data-motion='on'] [data-hero]:not([data-hero-played])"
  - "createHeroPlayed(deps) PageInit in src/lib/motion/hero.ts (no-replay marker)"
  - "tests/e2e/motion-hero.spec.ts and tests/e2e/motion-lcp.spec.ts (MEASURE_LCP=1)"
  - "settleMotion(page) helper in tests/e2e/a11y.spec.ts"
affects:
  - "06-08 (line splits elsewhere; the hero stays CSS-only)"
  - "06-10 phase review"
tech-stack:
  added: []
  patterns:
    - "CSS-only load sequence: hidden only inside running `both`-filled keyframes that end visible"
    - "No-replay marker attribute excluded by the keyframe selectors"
    - "Vertical-only line masks (overflow-x: visible; overflow-y: clip) with a 0.1em padding/negative-margin pair"
key-files:
  created:
    - src/lib/motion/hero.ts
    - tests/unit/motion-hero.test.ts
    - tests/e2e/motion-hero.spec.ts
    - tests/e2e/motion-lcp.spec.ts
  modified:
    - src/components/sections/Hero.astro
    - src/styles/global.css
    - tests/e2e/a11y.spec.ts
decisions:
  - "User (2026-10-29): approved the hero visual review and chose the UI-SPEC fallback start values (headline from translate 0 60%, portrait from inset(35% 0 0 0)) so the first frame is never blank (D-03)"
  - "data-hero-played waits for both the CTA row and the portrait <picture> animationend; marking at the CTA end (840ms) would cut the 960ms shutter short"
  - "Adjacent hero masks get margin-block-start: -0.2em because adjoining negative margins collapse instead of summing"
metrics:
  duration: "~85 min (including checkpoint)"
  completed: 2026-10-29
  tasks: 2
  files: 7
---

# Phase 6 Plan 05: Hero Load Sequence Summary

The hero is the site's signature moment and runs on CSS only. On first paint the two headline lines rise out of their masks (the second 90 ms after the first), the portrait opens like a shutter while settling from 1.08 scale, and the lead and CTA row settle in. Everything ends by 960 ms. The sequence finishes even when every script fails. It never replays, it is static under `reduced` and `off`, and the h1 accessible name never changes.

## What was built

- **`Hero.astro`**
  - Added `data-hero` on the section.
  - Each authored h1 line is now a `data-hero-line` mask holding one `data-hero-line-inner` span. There is exactly one `{' '}` between the masks, so the built name is still "Hi, I'm Martina." / "Hola, soy Martina.".
  - Added `data-hero-lead` and `data-hero-cta`.
  - The portrait's sizing moved to `pictureAttributes` (`data-hero-portrait`, `mx-auto block w-full max-w-64 lg:max-w-80`).
  - A component script runs `lifecycle.register(createHeroPlayed({ now: () => performance.now() }))`.
  - **At rest the hero is pixel-identical to the Phase 5 build:** a 0-pixel diff at 1440 and 390, EN and ES, in reduced motion.
- **`global.css`**
  - A mask rule that applies in every motion state: `overflow-x: visible; overflow-y: clip`, plus the 0.1em padding/negative-margin pair and the adjacent-mask fix.
  - The keyframes `hero-rise`, `hero-shutter`, `hero-scale` and `hero-settle`, scoped to `[data-motion='on'] [data-hero]:not([data-hero-played])`.
  - Delays: 0 and 90 ms (lines), 120 ms (portrait clip 840 ms `--ease-travel`, scale 840 ms `--ease-soft`), 200 ms (lead) and 280 ms (CTA). Settle durations use `--t-settle`.
  - There are no rules for `reduced` or `off`.
- **`hero.ts`: `createHeroPlayed({ now })`**
  - No `[data-hero]` on the page: returns undefined.
  - Already played, motion not `on`, or `now() >= 1000`: marks played at once.
  - Otherwise it waits for the `animationend` events fired on the CTA row and the portrait `<picture>` themselves (events bubbling from children are ignored), or for any `motion:change`. It uses one AbortController, and cleanup leaves the marker in place.

## First-frame decision (user, 2026-10-29)

The checkpoint review showed that the spec's original start values (headline at 110%, portrait at `inset(100% 0 0 0)`) left frame 0 empty below the header, and at 390 the whole first screen was blank. **The user approved the hero review and chose the UI-SPEC fallback values:** the headline starts at `translate: 0 60%` and the portrait at `inset(35% 0 0 0)`.

The recaptured 0 ms frames now show the top of every headline glyph and the lower 65% of the portrait at 1440 and 390, in EN and ES. A new e2e test seeks the hero animations to 0 and asserts that more than 30% of each line is visible and that the portrait clip is `inset(35% 0px 0px)`.

## Verification

- `pnpm lint` (astro check 0/0/0, eslint, prettier): clean. `pnpm test`: 63 files, 1,011 tests pass, including 9 hero tests.
- E2E: motion-hero, home, a11y, motion and motion-reveal give **103 passed**. The full offline suite before the a11y fix gave 545 passed and 1 flaky failure (see deviation 3). After the fix, a11y.spec passed 328 of 328 runs with `--repeat-each=4`, run twice.
- **motion-hero.spec** covers:
  - settled by 1100 ms with `data-hero-played` set and every hook at rest;
  - the first frame is not blank;
  - the accessible name at 0, 200 and 1100 ms;
  - completion with every `/_astro/**/*.js` request aborted;
  - static under reduce at 50 ms;
  - no replay after toggling reduced and then on;
  - the narrow mask checks.
- **Narrow:** at 390x844, on `/` and `/es/`, in `on` (settled) and in `reduced`, each inner span is 1 line box, its `scrollHeight` is no larger than the mask height, and it sits inside the mask rect (within 1 px).
- **320x640 `/es/` (recorded, not blocking):** passes. Each mask holds 1 line box, the inner span is 4 px shorter than the mask, and there is 6.08 px of room above and below. Nothing needs to go to 06-10 for this.
- **Bundle (`pnpm measure:bundle`):** eager JS on `/` is **10,781 B gzip**, up from 10,377 B. The +404 B is the Hero script entry. There is no GreenSock in the eager chunks.

### LCP gate (MEASURE_LCP=1, median of 5, on and reduced interleaved, local preview over loopback)

The LCP element is the hero `img` in every case.

Before, with the original start values (110% and `inset(100% 0 0 0)`):

| Page | Viewport | on (ms) | reduced (ms) | gap (ms) | within 100 ms |
|------|----------|---------|--------------|----------|---------------|
| `/` | 1440x900 | 24 | 28 | -4 | yes |
| `/` | 390x844 | 24 | 28 | -4 | yes |
| `/es/` | 1440x900 | 28 | 24 | 4 | yes |
| `/es/` | 390x844 | 24 | 28 | -4 | yes |

After, with the fallback start values (60% and `inset(35% 0 0 0)`), applied by user decision rather than because the gate failed:

| Page | Viewport | on (ms) | reduced (ms) | gap (ms) | within 100 ms |
|------|----------|---------|--------------|----------|---------------|
| `/` | 1440x900 | 28 | 28 | 0 | yes |
| `/` | 390x844 | 24 | 28 | -4 | yes |
| `/es/` | 1440x900 | 24 | 24 | 0 | yes |
| `/es/` | 390x844 | 28 | 28 | 0 | yes |

[Inference] The loopback runs have no network throttling, so the absolute numbers only reflect render cost. The on/reduced gap is the useful signal, and it stays within ±4 ms.

## Taste gate (CLAUDE.md)

- **lint.mjs** on `src/components/sections src/styles src/lib/motion`: 0 FAIL, 1 WARN. The WARN (`outlined-box`, ToolsRow.astro:21) was already there.
- **inspect.mjs** on `/` and `/es/`: 1 FAIL (`icon-cards`) and 3 WARN (`hairline`, `palette-cream`, `no-footage`), all already there. There is **no `clipped-text`**, and the headline is 2 lines at 1440, 768 and 390.
- **Motion-state captures:** the hero at 0, 300, 600 and 1000 ms, at 1440 and 390, in EN and ES, in `.taste-skill/motion-states/hero-*.png`. They were taken with hero animations paused and seeked by the gitignored `tmp/capture-hero.mjs`. The 0 ms frames were recaptured after the fallback change.
- **Critique** (`references/motion.md`):
  1. *Resolved by user decision:* frame 0 used to be blank under the header. It now shows the top of each headline line and most of the portrait.
  2. *Fine:* at 300 ms the headline is nearly settled while the portrait is still opening, because the shutter uses an in-out curve. That keeps the reading order: headline, then text, then picture. By 600 ms the portrait is mostly open, and it is at rest by 1000 ms.
  3. *Fine:* the descender of "soy" is masked while the line rises, as intended. At rest nothing is clipped at any width.
  4. *Fine:* this is one gesture with four staggered parts, as the skill's "stagger at most four things" rule requires. Nothing bounces, and every ease is ease-out or in-out.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Adjoining negative mask margins collapsed**
- **Found during:** Task 1 (screenshot diff against the Phase 5 build)
- **Issue:** `margin-block: -0.1em` on both masks collapses into one -0.1em between the lines, which made the hero 11 px taller at 1440 and 7 px taller at 390.
- **Fix:** `[data-hero-line] + [data-hero-line] { margin-block-start: -0.2em }`. The hero is now a 0-pixel diff at rest.
- **Files:** src/styles/global.css. **Commit:** 1108739

**2. [Rule 1 - Bug] Marking played at the CTA end would cut the portrait short**
- **Found during:** Task 1
- **Issue:** the CTA ends at 840 ms but the portrait ends at 960 ms. Removing the keyframes at 840 ms would snap the shutter open.
- **Fix:** wait for the `animationend` of both the CTA row and the `<picture>` (each element's own event only). There is a unit test for it.
- **Files:** src/lib/motion/hero.ts, tests/unit/motion-hero.test.ts. **Commit:** 1108739

**3. [Rule 1 - Bug] Flaky axe colour-contrast on mid-fade elements**
- **Found during:** Task 2 (full offline e2e run)
- **Issue:** axe scans under `on` sometimes caught the hero lead, and also 06-03 project-card links, while they were still fading in (contrast 1.3).
- **Fix:** a `settleMotion(page)` helper waits for every finite animation and transition. It runs before the per-page axe scan and the tooltip axe scan. Plan 06-04 added a similar `settleReveals(page)` in parallel, and the orchestrator reconciles the two at merge.
- **Files:** tests/e2e/a11y.spec.ts. **Commit:** d019a3a

**4. [Rule 1 - Test] No-JS rest values serialize differently**
- **Issue:** without a script there is no `data-hero-played`, so the forwards fill reports `0px 0%`, `1` or `inset(0% 0px 0px)` instead of `none`. It looks identical.
- **Fix:** only the scripts-aborted e2e accepts these equivalent rest forms. Every other check stays strict.
- **Commit:** d91653d

**5. [User decision] Fallback start values applied**
- At the checkpoint the user chose the UI-SPEC fallback values (60% and `inset(35% 0 0 0)`) for a visible first frame. The LCP gate had passed with the original values. **Commit:** 865dff3

## Commits

- fc50c64 test(06-05): add failing hero played tests
- 1108739 feat(06-05): add css hero load sequence
- d91653d test(06-05): add hero e2e and lcp gate specs
- d019a3a fix(06-05): settle motion before axe scans
- 865dff3 fix(06-05): start hero from fallback values

## TDD Gate Compliance

The RED commit (fc50c64, a failing hero test) comes before the GREEN commit (1108739). No refactor commit was needed.

## Self-Check: PASSED

- All four created files exist: src/lib/motion/hero.ts, tests/unit/motion-hero.test.ts, tests/e2e/motion-hero.spec.ts, tests/e2e/motion-lcp.spec.ts.
- All five commits exist on branch worktree-agent-a6e43810771ff9a6a.
