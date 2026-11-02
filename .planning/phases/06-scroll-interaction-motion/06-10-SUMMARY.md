---
phase: 06-scroll-interaction-motion
plan: 10
subsystem: motion
tags: [a11y, axe, bundle-size, taste, playwright, phase-gate]
requires:
  - phase: 06-01
    provides: three-state gate, header toggle
  - phase: 06-02
    provides: pnpm measure:bundle and the Phase 5 baseline (8,536 B)
  - phase: 06-03
    provides: reveal.ts
  - phase: 06-08
    provides: line split reveal
  - phase: 06-09
    provides: cursor follower
provides:
  - "axe gate across every motion state: 'on' settled, 'reduced', OS-locked tooltip, JS off, plus a mid-reveal sample (tests/e2e/a11y.spec.ts)"
  - "Shared settleMotion helper (tests/e2e/helpers/motion.ts), including a scroll-through mode"
  - "Opt-in motion-state screenshot capture (tests/e2e/motion-states.spec.ts, CAPTURE_MOTION_STATES=1)"
  - "Mount-time viewport pass in reveal.ts: first-screen elements reveal without a scroll"
  - "Cursor dot hidden over accent pills"
  - "AA-compliant primary pill hover (--color-accent-hover)"
affects: [07 page transitions (lifecycle cleanup now also disconnects the mount pass)]
tech-stack:
  added: []
  patterns:
    - "JS-off axe runs: strip <script> from the document via page.route, since axe cannot inject under javaScriptEnabled false"
    - "One-shot IntersectionObserver with no margin, created before the trigger observer so its initial callback owns the first batch"
key-files:
  created:
    - tests/e2e/helpers/motion.ts
    - tests/e2e/motion-states.spec.ts
  modified:
    - tests/e2e/a11y.spec.ts
    - tests/e2e/skeleton.spec.ts
    - tests/e2e/projects.spec.ts
    - tests/e2e/motion-pointer.spec.ts
    - tests/e2e/motion-reveal.spec.ts
    - tests/unit/motion-cursor.test.ts
    - tests/unit/motion-reveal.test.ts
    - src/lib/motion/reveal.ts
    - src/lib/motion/cursor.ts
    - src/lib/ui/button-classes.ts
    - src/styles/global.css
key-decisions:
  - "User approved the Phase 6 motion feel on 2026-10-29, including the 390 px ES hero."
  - "The cursor dot hides over [data-magnetic=\"pill\"] (review decision 3)."
  - "Elements already in the viewport reveal at mount, including the trigger's bottom 12% (review decision 10)."
  - "The primary pill hover darkens (accent mixed with 12% ink) instead of lightening to bg-accent/90, which measured 4.37:1."
  - "Accepted as documented inspector artefacts: first-action (fill on the magnetic face), empty-screens on /projects/ (probe hits the card link overlay), still-page on the long InstaBlogs detail (the walk ends before the teaser)."
  - "Copy approved as is; the TODO(martina) markers stay for Martina's review."
requirements-completed: [MOTN-01, MOTN-02, MOTN-03, MOTN-04, MOTN-07, MOTN-08]
duration: ~4h of active work across 2026-10-29 and 2026-11-02 (session break in between)
completed: 2026-11-02
---

# Phase 6 Plan 10: Phase Gate (a11y, Bundle, Taste, User Review) Summary

The whole motion layer now passes axe with zero violations in 'on' (settled), 'reduced', OS-locked toggle with its tooltip open, and JS off. Eager JS on `/` is 14,340 B gzip -9, which is +5,804 B over the Phase 5 baseline and inside the 6 KB target. The lazy GSAP + SplitText chunk is 30,363 B. The user approved the motion feel. The two follow-ups from the review are in: first-screen card tops now reveal without a scroll, and the cursor dot hides over accent pills.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | f4c90d1 | test(06-10): gate axe across every motion state |
| 1 (deviation) | 3fbc60b | fix(06-10): darken primary pill hover for contrast |
| 1 (deviation) | 02b1c47 | test(06-10): share settleMotion across axe specs |
| 1 (deviation) | ded2d47 | test(06-10): settle motion before projects axe scan |
| 2 | bc1dd62 | test(06-10): add opt-in motion-state screenshot capture |
| 3 follow-up (RED) | 852827b | test(06-10): add failing mount-time reveal tests |
| 3 follow-up (GREEN) | 538ef2c | feat(06-10): reveal first-screen elements at mount |
| 3 follow-up | 534a791 | feat(06-10): hide cursor dot over accent pills |

## Task 1: axe across motion states (V-18)

Pages: `/`, `/es/`, `/projects/`, `/es/projects/`, `/projects/website-instablogs/`, `/es/projects/website-instablogs/`. Every state reports zero WCAG 2.2 AA violations:

- **'on', settled:** `settleMotion(page, { scrollThrough: true })` scrolls one screen at a time. It then waits until no `[data-reveal]` is pending and no `.split-line-mask` remains (the GSAP rises have reverted), and then for every finite animation.
- **'reduced':** the same scroll-through. The existing reduced axe runs on Home, Projects and the detail pages were upgraded to it as well.
- **OS-locked toggle:** under `reducedMotion: 'reduce'`, the hint tooltip is opened by keyboard focus and the toggle is `aria-disabled`.
- **JS off:** axe needs JavaScript to inject, so it cannot run under `javaScriptEnabled: false`. The axe runs load the document with every `<script>` stripped and every script request aborted. A separate `javaScriptEnabled: false` test pins that a real JS-off visit lands in the same state: `data-motion="off"`, no toggle, nothing armed or revealed. The site has no `<noscript>` and no `scripting` media query.
- **Mid-reveal sample:** `/`, 200 ms after scrolling to Services. The result was the same in 3 of 3 runs: only `color-contrast`, on the 2nd and 3rd service cards' h3 and list items and on two "Ask about this" spans. Those elements already carry `data-revealed` and are mid-fade in the left-to-right stagger. This is recorded as transient, because WCAG evaluates the settled state. The settled runs stay strict and nothing is excluded. The test fails on any rule other than `color-contrast`.

## Registry audit (V-19)

`grep -rn "lifecycle.register(" src` returns 10 hits:

- **5 from before Phase 6:** ToolsRow, RolesMarquee, ServiceChips, ContactForm, EmbedFacade.
- **5 from Phase 6:**
  - reveal: `effects.ts:7`
  - magnetic: `effects.ts:17`
  - hero: `Hero.astro:81`
  - toggle: `MotionToggle.astro:59`
  - cursor: `CursorFollower.astro:52`

Every Phase 6 listener sits inside a registered PageInit and is removed by its cleanup. The new mount-pass observer is disconnected in reveal's cleanup, and unit tests cover it, including the 10-cycle idempotency test.

## Bundle (SC5)

Measured with `pnpm build && pnpm measure:bundle`, gzip -9, after the follow-ups. Exit 0, "no GreenSock in eager chunks".

| | Phase 5 baseline | Final | Delta | UI-SPEC target |
|---|---|---|---|---|
| Eager JS on `/` (and `/es/`, identical) | 8,536 B, 7 files | **14,340 B**, 11 files | **+5,804 B** | at most +6 KB: **pass** |
| Lazy gsap + SplitText | 0 | **30,363 B** (27,107 + 3,256) | — | at most 35 KB: **pass** |

Eager files on `/`, gzip -9:

| File | gzip |
|---|---|
| ContactForm | 6,636 |
| BaseLayout | 2,613 |
| load-gsap | 1,091 |
| CursorFollower | 967 |
| motion | 776 |
| MotionToggle | 526 |
| ToolsRow | 450 |
| Hero | 404 |
| ServiceChips | 326 |
| RolesMarquee | 296 |
| fields | 255 |

Before the follow-ups, eager JS was 14,286 B. The mount pass added 41 B to BaseLayout and the pill selector added 13 B to CursorFollower.

## Task 2: taste gate

**lint.mjs** (`src/components src/pages src/layouts src/styles src/lib/motion`):
- 1 FAIL `hairline` (SiteHeader.astro:34 `border-b`, from 2026-10-17, accepted).
- 1 WARN `outlined-box` (ToolsRow.astro:21, from 2026-10-16).
- None in Phase 6 files: no `transition-all`, `ease-in`, `scale-0`, `animate-*` or `h-screen`.
- No new `taste-skill-ignore`; the single Phase 5 one is unchanged.

**inspect.mjs**, against a preview on 4521. I confirmed the served build via the BaseLayout chunk hash (`BweO9mVz` before the follow-ups, `DyIBkocs` after). Moving elements are given at 1440 / 768 / 390.

| URL | Moving | Codes |
|---|---|---|
| `/` | 34 / 34 / 35 | FAIL `icon-cards` (accepted). WARN `hairline`, `palette-cream`, `no-footage` (accepted), `first-action` (accepted artefact) |
| `/es/` | 34 / 34 / 36 | same as `/` |
| `/projects/` | 21 / 21 / 21 | FAIL `focal-point` (from Phase 4/5, logged in 06-06). FAIL `empty-screens` (accepted artefact, see below). Same 4 WARNs |
| `/projects/website-instablogs/` and `/es/` twin | 5 / 5 / 5 | FAIL `still-page` (accepted artefact, see below). Same 4 WARNs |
| `/projects/cabreras-motos-posts/` (comparison) | 13 / 13 / 14 | 0 FAIL. WARN `still-page`, inside the UI-SPEC 8-15 band |

- No page reports any of `clipped-text`, `covered-text`, `overflow`, `headline-lines`, `shadow`, `gradient` or `glass`.
- I re-inspected `/` and `/es/` after the follow-ups. The codes and moving counts are identical. The desktop fold now shows the four Services card tops (see `.taste-skill/inspect-06-10-final/home-en/desktop-fold.jpg`).
- **`empty-screens` on `/projects/`:** I checked `projects-en/desktop-page-01.jpg` visually. Every desktop screen is mostly covers and colour fields. The probe's `elementFromPoint` hits the full-tile link overlay, not the IMG (06-08 analysis).
- **`still-page` on InstaBlogs:** the page is about 12 desktop screens long. The inspector's walk ends before the teaser and contact band, and the image stack is static by D-04. The shorter Cabreras detail measures 13.

**Motion-state screenshots:** 66 PNGs in `.taste-skill/motion-states/` (gitignored), regenerated with `CAPTURE_MOTION_STATES=1 pnpm playwright test tests/e2e/motion-states.spec.ts`.
1. `1-hero-{en,es}-{1440,390}-{0000,0300,0600,1000}ms`: the hero CSS animations are paused and scrubbed, so these are exact frames.
2. `2-services-{en,es}-{1440,390}-{0200ms,settled}`
3. `3-tile-rest-{en,es}-1440`, `3-4-tile-hover-pill-{en,es}-1440`, `3-tile-focus-{en,es}-{1440,390}`
4. `4-cursor-dot-over-cta-{en,es}-1440`: captured before the pill-hide follow-up. It shows the tint that decision 3 fixed.
5. `5-toggle-{full-rest,full-tooltip,reduced-tooltip,reduced-rest,oslocked-tooltip}-{en,es}-{1440,320}`
6. `6-reduced-{home,projects,detail}-{en,es}-{1440,390}`: full page.

### Critique (references/critique.md, against the UI-SPEC review list)

- **Hero:** one gesture.
  - 0 ms: headline and lead in place, portrait shutter closed, CTA ghosted.
  - 300 ms: portrait half open, CTA fading.
  - 600 ms: nearly settled.
  - 1000 ms: complete.
  - No blank frame.
  - At 390, "Hola, soy / Martina." has no clipped ascenders or descenders and no wrap inside a masked line. `motion-hero.spec.ts -g "narrow"` passes 5/5.
- **Line masks:** no clipped glyphs at rest in either locale.
- **Blank bands:** none in any scrolled screenshot.
  - The one first-screen band (Services card tops hidden in the -12% zone at 1440×900) was fixed by the mount pass and is confirmed in the final inspector fold.
- **Sections arrive differently:** a line rise on headings, cards row by row, shutter covers, the form settling as one block.
  - At +200 ms on Services, the cards visibly stagger left to right while the Latest-work shutters start opening.
- **Hover:** the mat is even (12 px on all four sides), the card keeps its size, and the "View" pill is centred.
- **Toggle:** reads as a control in all three states.
  - The pressed state differs from the unpressed one only by the slash, which is legible but subtle. It was accepted, because `aria-pressed` and the tooltip carry the state.
  - The ES OS-lock hint wraps inside 320 px. The capture spec asserts the tooltip box stays in the viewport.
- **Reduced pages:** fades only. Everything is visible at the bottom, with no shutter and no zoom.
- **Text leading the picture mid-reveal (06-03 note):** resolved. At +200 ms the shutters are opening while the titles are still faded.

```
ROUND 1
Seen in one second: the "Hi, I'm Martina." headline and her portrait
Idea: a personal designer's studio card that comes alive (one hero gesture, shuttered work)
Live thing: the motion layer plus the cursor "View" pill over work
Layout words: hero=split / marquee=band / services=grid / work=grid / tools=row / contact=split
Scores: design 7 · usability 8 · creativity 6.5 · content 7 → 7.2
Caps applied: icon-cards FAIL still reported → overall ≤ 6.0 (accepted pre-existing finding)
Top three:
1. Services is a row of four icon-topped cards (desktop fold and page-01). This is the accepted icon-cards finding; the fix is a large-type list (future design pass).
2. The blank card band under the Services heading at the 1440 fold. Fixed in 538ef2c.
3. The cursor dot tinted the accent CTA label (4-cursor-dot-over-cta-*.png). Fixed in 534a791.
```

The overall score stays under 7.5 only because of the accepted `icon-cards` cap. No Phase 6 finding remains open.

## Task 3: user review (checkpoint, 2026-10-29)

**Reply:** motion feel **approved**, including the 390 px ES hero (step 5a).

| # | Question | Decision |
|---|---|---|
| 1 | OQ1 copy ("View"/"Ver", "Reduce motion"/"Reducir movimiento", OS hint) | Approved as is; the `TODO(martina)` markers stay |
| 2 | Darker AA hover (deviation 1) | Keep |
| 3 | Cursor dot over pill buttons | **Hide it**, implemented in 534a791 |
| 4 | OQ2: toggle on row 1 below sm, last in Tab order | Accepted |
| 5 | OQ3: sparkles-2 / sparkles-2-off icons | Keep |
| 6 | `first-action` WARN | Accepted as an artefact |
| 7 | OQ4: 400/700 ms hover | Keep |
| 8 | `empty-screens` on `/projects/` | Accepted as an artefact |
| 9 | InstaBlogs `still-page` | Accepted as an artefact |
| 10 | Blank band on the 1440×900 first screen | **Reveal in-viewport at mount**, implemented in 852827b + 538ef2c |
| 11 | Text leads picture mid-reveal | Closed as resolved |
| 12 | OQ5: 64 px section spacing | Keep |

### Follow-up implementation

- **Mount-time viewport pass (`reveal.ts`):**
  - A second, one-shot observer with `rootMargin: '0px'` observes every armed element. It is created before the `-12%` trigger, so its initial callback forms the first batch.
  - Its first callback reveals whatever is intersecting as one staggered batch, then disconnects.
  - `finish()` dedupes, so an element reported by both observers reveals once.
  - Guarantees kept:
    - **No JS / 'off':** nothing changes, because the effect returns before any observer exists.
    - **Failsafe:** nothing is armed before the observers exist, and if creation throws, both are disconnected and the arming is rolled back.
    - **LCP:** cover frames are still never reveal targets. `motion-lcp.spec.ts` passes.
  - Lines headings still wait for GSAP and use the trigger observer.
  - Tests:
    - 5 new unit tests: mount observer config, the staggered batch with disconnect, the one-shot behaviour, no double reveal, cleanup.
    - The 10-cycle idempotency test now expects exactly one trigger plus one pending mount pass.
    - New e2e in `motion-reveal.spec.ts`: at 1440×900 on `/`, all four Services card tops are on the first screen and revealed with `scrollY` still 0.
- **Cursor:** `HIDE_OVER` now includes `[data-magnetic="pill"]`.
  - 1 new unit test: the dot hides over the pill and its face, and comes back to rest or link once the pointer leaves.
  - The `motion-pointer.spec.ts` dot test now grows the dot over a header link, checks that it is hidden (opacity 0) over the hero CTA and visible again after leaving, then hidden over the message field.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Accessibility] Primary pill hover failed AA contrast**
- **Found during:** Task 1 (first full `pnpm verify`). `contact.spec.ts` "failure: axe…" `@network` failed every time.
- **Issue:** `hover:bg-accent/90` lightens the accent over the surface to #267ebd. White 14 px semibold text on it is 4.37:1, below the 4.5:1 minimum. Since 06-07 the magnetic face follows the pointer, so the face stays hovered after a click and axe measured the hover fill.
- **Fix:** a new `--color-accent-hover: color-mix(in oklab, var(--color-accent) 88%, var(--color-ink))` token. `primaryFace` uses `hover:bg-accent-hover`, which darkens, so contrast rises above the resting 5.x:1. The user kept it at review.
- **Files:** src/styles/global.css, src/lib/ui/button-classes.ts
- **Commit:** 3fbc60b

**2. [Rule 1 - Bug] axe tests scanning mid-fade**
- **Found during:** Task 1 full-suite runs.
- **Issue:** the skeleton, projects and embed-prototype axe tests ran axe right after load or facade activation, while Phase 6 fades were still running. Under parallel load they failed on `color-contrast` with mid-fade colours (for example #948e88 at 3.03:1).
- **Fix:** moved `settleMotion` into `tests/e2e/helpers/motion.ts` (extended, not duplicated). It now also waits for GSAP line splits to revert, and it is used in those tests and in the capture spec.
- **Commits:** 02b1c47, ded2d47

**3. [Rule 3 - Blocking] axe cannot run with `javaScriptEnabled: false`**
- **Found during:** Task 1.
- **Issue:** AxeBuilder injects JS, so the JS-off runs hung until timeout.
- **Fix:** the JS-off axe runs strip the document's scripts through `page.route`. A real `javaScriptEnabled: false` test asserts the matching state.
- **Commit:** f4c90d1

### Environment notes (not code issues)

- Two full `pnpm verify` runs on 2026-10-29 failed only on 30 s timeouts. Those tests ran 53 s to 3 min of wall-clock time, a different set each run, and three vitest workers timed out at startup. The load average was about 10, with a `pnpm dev`/workerd running in the main checkout. Running e2e with `--workers=3` was stable.
- The 2026-11-02 resume found the session had ended mid-run (exit 137). The uncommitted follow-up edits were intact and were reviewed, retested and committed. Nothing was reset.

## Final verification (2026-11-02, after the follow-ups)

- `pnpm lint`: `astro check` 0 errors / 0 warnings / 0 hints; ESLint clean; Prettier clean.
- `pnpm test`: **66 files, 1082 tests passed.** That is 1076 plus 5 reveal tests and 1 cursor test.
- `pnpm build`: complete.
- `pnpm measure:bundle`: exit 0, eager 14,340 B, lazy 30,363 B.
- `pnpm playwright test --workers=3` on that build: **701 passed, 33 skipped, 0 failed**, including the `@network` tests. The 33 skipped are the opt-in capture spec.
- `pnpm check:secrets`: ok (1013 dist files).
- `motion-hero.spec.ts -g "narrow"`: 5/5 passed.
- Motion e2e subset (reveal, pointer, LCP, motion) after the follow-ups: 78 passed, 1 skipped.

## Known Stubs

`cursor.view`, `motion.toggle` and `motion.osLocked` stay marked `TODO(martina)` in `src/i18n/ui.en.ts` and `ui.es.ts`. The user approved the copy, and the markers remain only for Martina's own read-through. The UI works as is.

## Self-Check: PASSED

- Files exist: tests/e2e/helpers/motion.ts, tests/e2e/motion-states.spec.ts, and this SUMMARY.
- Commits on the branch: f4c90d1, 3fbc60b, 02b1c47, ded2d47, bc1dd62, 852827b, 538ef2c, 534a791.
- STATE.md and ROADMAP.md are untouched.
