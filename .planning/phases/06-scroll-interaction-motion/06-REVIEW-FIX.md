---
phase: 06-scroll-interaction-motion
fixed_at: 2026-11-02T00:00:00Z
review_path: .planning/phases/06-scroll-interaction-motion/06-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 7
skipped: 1
status: partial
---

# Phase 6: Code Review Fix Report

**Fixed at:** 2026-11-02
**Source review:** .planning/phases/06-scroll-interaction-motion/06-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 8 (CR-01, WR-01 to WR-07; Info findings out of scope)
- Fixed: 7
- Skipped: 1 (WR-06, a design decision for the user)

**Verification (on the final tree, 47c4d6a):**
- `pnpm lint`: exit 0 (astro check 0 errors and 0 warnings, ESLint clean, Prettier clean). It also ran before each commit.
- `pnpm test`: 66 files, all passing.
- `pnpm build && pnpm measure:bundle`: eager JS on `/` and `/es/` is **14,643 B gzip**. The ceiling is 14,680 B (8,536 B + 6,144 B), so 37 B are left. No GreenSock code is in the eager chunks. The intermediate fixes reached 14,692 B, so commit 47c4d6a trims code to get back under the ceiling.
- `pnpm build && pnpm exec playwright test --workers=3`: **703 passed, 33 skipped, 0 failed** (2.5 min). [Unverified] I did not compare the 33 skips against a baseline run from before the fixes.
- taste-skill `lint.mjs` on every changed `src/` file: 0 FAIL, 0 WARN.

## Fixed Issues

### CR-01: Magnetic rects are measured while ancestors are still translated

**Files modified:** `src/lib/motion/magnetic.ts`, `tests/unit/motion-magnetic.test.ts`
**Commit:** 72a378e
**Applied fix:** The magnetic session now listens on the document for `transitionend`, `transitioncancel` and `animationend`. When the event's target contains a magnetic shell (a reveal ancestor or the hero CTA row), it runs the existing debounced remeasure (150 ms). Transitions on unrelated elements, such as the card-mat hover, are ignored. New unit tests: (1) a shell measured 20 px low is centred correctly after its ancestor's `transitionend`, with offset 0 at the visual centre; (2) a transition on an element that holds no shell triggers no measurement.
**Status:** fixed: requires human verification. This is geometry logic, and it was only unit-tested with stubbed rects. Hover a below-the-fold magnetic target after it reveals.

### WR-01: Lines headings armed after GSAP loads skip the mount-time viewport pass

**Files modified:** `src/lib/motion/reveal.ts`, `tests/unit/motion-reveal.test.ts`
**Commits:** 76ebe62, then refactored in 47c4d6a
**Applied fix:** `armWaiting()` now gives each heading it arms a one-shot, zero-margin viewport pass, the same as the mount pass. This applies both when GSAP loads and when the visitor switches to reduced while GSAP is still loading. The mount pass and the late passes now share one `createPass()` helper and one `revealEntries()` callback, and cleanup disconnects every pass. New unit tests cover a heading that is on screen but inside the bottom 12% and only seen by the pass, and cleanup of a pass that never reported. Three existing tests now pick the -12% trigger observer explicitly, because `last()` can now return a late pass.
**Status:** fixed: requires human verification (state-handling logic).

### WR-02: The focus rule's `closest('article')` matches the whole detail page

**Files modified:** `src/lib/motion/reveal.ts`, `tests/unit/motion-reveal.test.ts`
**Commit:** 966ce8a
**Applied fix:** The focus rule now uses `closest('[data-card]')`. Both card articles, ProjectCard and the NextProjectTeaser card, already carry `data-card`. The unit fixture cards gained `data-card`. A new test checks that focus inside a plain `<article>` reveals only its own element.

### WR-03: If `splitAndRise` throws, the heading stays armed and invisible

**Files modified:** `src/lib/motion/reveal.ts`, `tests/unit/motion-reveal.test.ts`
**Commit:** e70f99d
**Applied fix:** The try/catch sits inside the `ctx.add` callback. GSAP's `Context.add` does not restore its current context when the callback throws (checked in `gsap-core.js`), so catching inside keeps GSAP's state clean. On a throw, the heading falls through to the CSS reveal (`--reveal-delay` plus `data-revealed`). A new test makes `SplitText.create` throw and expects no exception and a revealed heading.

### WR-04: Armed but unrevealed content prints blank

**Files modified:** `src/styles/global.css`, `tests/e2e/motion-reveal.spec.ts`
**Commit:** 82f6519
**Applied fix:** Added an `@media print` block. It forces `[data-reveal]` and its pictures to their end state (opacity 1, no translate or scale, no animation or transition) and removes the clip-path on the `[data-reveal]` frame. The card mat keeps its own resting `inset(0)`. A new e2e test loads both detail pages, confirms that some elements are still armed and hidden, switches to print media and expects every `[data-reveal]` to be visible. Without the CSS change the test fails (checked by stashing the change and rebuilding: 2 failed). taste-skill lint: 0 FAIL, 0 WARN. Nothing changes on screen; this affects print only.

### WR-05: Hero and reveal timing compare navigation-start time with CSS animation time

**Files modified:** `src/lib/motion/hero.ts`, `src/lib/motion/reveal.ts`, `src/lib/motion/effects.ts`, `src/components/sections/Hero.astro`, `tests/unit/motion-hero.test.ts`, `tests/unit/motion-reveal.test.ts`
**Commits:** 9287952, then simplified in 47c4d6a
**Applied fix:** Neither clock now uses `performance.now()`, which keeps both compatible with a future ClientRouter.
- **Hero:** `createHeroPlayed()` takes no dependencies. At mount it waits only for the CTA row and portrait animations that have not finished yet (`getAnimations().some(a => a.playState !== 'finished')`). If neither is still animating, it marks the hero played at once. `animationcancel` is handled the same way as `animationend`. A paused animation counts as not finished, so the scrubbing screenshot test in motion-states still works. Without `getAnimations`, it waits for the events.
- **Reveal:** `shownByFailsafe` now asks whether the element's own `reveal-failsafe` CSS animation has finished, instead of `now() > 1500`. `RevealDeps.now` was removed. Without `getAnimations`, the element is armed, as on an early mount.

New unit tests: a mount with a page clock at 60 s while the failsafe is still running arms everything; finished animations other than the failsafe are ignored; and new hero cases cover finished, waiting-only-for-running, paused and cancel.
**Status:** fixed: requires human verification (timing logic). The hero, reveal, LCP and motion e2e specs and the full suite pass.

### WR-07: Reveals near the page end depend on `scrollend`

**Files modified:** `src/lib/motion/reveal.ts`, `tests/unit/motion-reveal.test.ts`
**Commit:** f292b30
**Applied fix:** Added an exported `onScrollSettled(win, cb, signal)`. Where the browser supports it (`Reflect.has(win, 'onscrollend')`) it uses `scrollend`. Otherwise it runs `cb` 150 ms after the last `scroll` event, and abort clears the pending timer. `Reflect.has` is used instead of `in` because lib.dom types every Window with `onscrollend`, so an `in` check narrows the fallback branch to `never`. The bottom-of-page check goes through this helper. New unit tests cover both paths. A page that cannot scroll at all is already handled by the mount and late viewport passes (WR-01).

## Skipped Issues

### WR-06: Above-the-fold `h1`s are hidden until the GSAP chunk arrives (up to 1.5s)

**File:** `src/components/views/ProjectsView.astro:23-28`, `src/components/project/ProjectIntro.astro:20-30`
**Reason:** Skipped as a design decision for the user, not a code defect. The current behaviour is what the approved UI-SPEC specifies:
- Row 263: "h1 Projects: `lines`. First screen: it is pre-hidden at first paint and armed at mount".
- Row 273: "Intro h1: `lines`. First screen".
- Row 232 lists both h1s as line-rise headings (MOTN-02), and D-05 sets 1.5 s as the failsafe bound.

Both fixes the reviewer suggested change an approved contract:
- (a) `settle` drops the line rise on these h1s.
- (b) Rendering them visible and then splitting makes visible text vanish and rise again, which is a visible blink.

A third option is a bounded wait: give first-screen lines headings the spec's documented non-split fade if GSAP has not arrived within N ms. That needs a new timing value nobody has approved. The eager-JS budget has only 37 B left, so any of these options also needs a bundle re-measure.

[Inference] The Projects page LCP should be the exempt eager card cover. The motion-lcp gate only covers `/` and `/es/`, so I have not verified detail-page LCP.

Options for the user: keep the current spec, switch the two h1s to `settle`, or approve a bounded GSAP wait with a specific value.
**Original issue:** Under `'on'`, a `lines` heading has `opacity: 0` and waits for `loadGsap()`; only the 1500ms CSS failsafe shows it without GSAP, so the first-screen Projects and detail h1s can be blank for up to 1.5s on a slow chunk fetch.

---

_Fixed: 2026-11-02_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_

## User decision: WR-06 (2026-11-02)

**Keep the spec.** The Projects and detail-page h1s keep waiting for the lazy GSAP chunk (1.5 s CSS failsafe), as UI-SPEC rows 232/263/273 and D-05 require. Accepted as designed; not a defect.
