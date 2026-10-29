---
phase: 06-scroll-interaction-motion
plan: 08
subsystem: motion
tags: [gsap, splittext, reveal, a11y, i18n, motion]
requires:
  - phase: 06-02
    provides: lazy loadGsap() (GSAP core + SplitText, the only gsap import site)
  - phase: 06-03
    provides: reveal runtime (reveal.ts, data-reveal CSS, failsafe) and lines headings
  - phase: 06-06
    provides: picture-mat reveal-instant/failsafe rules
  - phase: 06-07
    provides: magnetic pattern for async gsap.context + ctx.add
provides:
  - split-lines.ts (splitAndRise, canSplit), SplitText line-mask rise with revert on complete
  - lines driver in reveal.ts (arm after loadGsap resolves, instant reveal on reject, motion:change finish)
  - .split-line-mask CSS (0.1em padding pair, vertical-only clip)
  - card settle blocks no longer translate (stretched-link overlay stays full-tile mid-reveal)
affects: [06-10, phase-07 page transitions]
tech-stack:
  added: []
  patterns:
    - "Driver-ready arming: a reveal kind that needs JS (lines under 'on') stays unarmed under the CSS failsafe until its driver loads"
    - "Async GSAP work inside gsap.context via ctx.add, reverted on lifecycle cleanup"
key-files:
  created:
    - src/lib/motion/split-lines.ts
    - tests/unit/motion-split.test.ts
    - tests/unit/helpers/fake-gsap.ts
    - .planning/phases/06-scroll-interaction-motion/deferred-items.md
  modified:
    - src/lib/motion/reveal.ts
    - src/lib/motion/effects.ts
    - src/styles/global.css
    - tests/unit/motion-reveal.test.ts
    - tests/e2e/motion-reveal.spec.ts
key-decisions:
  - "A lines heading that is not split (it wraps a link, or loadGsap is not injected) keeps the 06-03 CSS fade; only a heading holding .split-line-mask gets transition: none (via :has), so the fade fallback never pops"
  - "Card text settle blocks ([data-card] [data-reveal=settle]) fade without translate: any translate makes the block the containing block of the title link's after:inset-0 overlay; the cover shutter carries the card's motion"
  - "Line splits ignore --reveal-delay (lines headings lead their section at offset 0)"
  - "Late arming re-applies the late-mount rule: a lines heading the failsafe already showed (in/above viewport after 1.5 s) is revealed instantly instead of being armed (Pitfall 6)"
requirements-completed: [MOTN-02, MOTN-01, MOTN-07]
duration: 80min
completed: 2026-10-29
---

# Phase 6 Plan 08: Headline line split reveal Summary

**Under full motion, every `data-reveal="lines"` heading now rises line by line out of vertical-only SplitText masks once the lazy GSAP chunk resolves. Accessible names and lang spans stay intact, the split reverts after the rise, the headings fade under reduced motion, and they are shown instantly if the GSAP chunk fails.**

## Performance

- **Duration:** about 80 min
- **Completed:** 2026-10-29
- **Tasks:** 2 of 2, plus 1 coordinator-requested bug fix
- **Files:** 4 created, 5 modified

## Accomplishments

- `split-lines.ts`: `canSplit()` (no `a` inside) and `splitAndRise()`. It calls `SplitText.create` with `type: 'lines'`, `mask: 'lines'`, `tag: 'span'`, `linesClass: 'split-line'` and `autoSplit: true`. `aria` is `'none'` when the heading holds `[lang]` and `'auto'` otherwise. `onSplit` sets the masks to `overflow-y: clip` only, sets `data-revealed` in the same task, and returns `gsap.from(lines, { yPercent: 110, duration: durations.line, ease: eases.reveal, stagger: 0.08 })`. `onComplete` reverts the split. `finish()` calls `progress(1)` and then reverts, only once.
- `reveal.ts` lines driver, with `RevealDeps.loadGsap` optional:
  - Under `'on'`, lines stay unarmed under the failsafe. They are armed and observed after `loadGsap()` resolves, and split on intersection.
  - If the load is rejected, every waiting line is shown instantly.
  - Under `'reduced'`, lines are armed at mount and fade; GSAP is never loaded.
  - Switching to `'reduced'` finishes and reverts running splits, and waiting lines are armed for the fade.
  - Switching to `'on'` loads GSAP once if lines are still pending.
  - Cleanup calls `ctx.revert()`, and a load that resolves after cleanup arms nothing.
- `effects.ts` passes `loadGsap` to `createReveal`.
- `global.css`:
  - `.split-line-mask { padding-block: 0.1em; margin-block: -0.1em }`.
  - `transition: none` on revealed lines headings that hold a split, so the heading stays at opacity 1 and only the lines move.
  - Card settle blocks no longer translate (see Deviations).
- e2e (V-06, the gsap-only V-03 variant, resize, and lang):
  - **Names, lang and revert:** 12 split tests (6 pages × 1440/390, EN and ES). Accessible names are compared before, at +200 ms and after; `[lang]` counts are kept; no `.split-line*` remains afterwards; opacity is 1; at least one heading per page was seen mid-split.
  - **lang path:** route-injected `<span lang="es">` detail-h1 tests at 1440 and 390 exercise the real `aria: 'none'` path. No committed title currently has `titleLang` on a detail h1.
  - **Resize:** a heading resized 1440→390 mid-rise ends with byte-identical `innerHTML` and no `aria-label`.
  - **GSAP failure:** only chunks containing "GreenSock" are aborted, and every lines heading reaches opacity 1 within 1.6 s.

## Task Commits

1. **Task 1 (TDD).** RED `f667a7a` test(06-08): add failing tests for line split reveal. GREEN `d379cf3` feat(06-08): rise lines headings with splittext. No refactor commit was needed.
2. **Task 2.** `72df264` test(06-08): cover line splits end to end. It includes the stretched-link mid-reveal test for the bug fix.
3. **Coordinator-requested fix.** `eb85c85` fix(06-08): keep card link overlay full size.

## Verification

- `pnpm lint`: 0 errors (`astro check`, eslint, prettier). `pnpm test`: 65 files, 1059 tests passed.
- On a fresh build (throwaway config `tmp/pw-06-08.config.ts`, port 4501): motion-reveal, motion-hero, motion-hover, motion-lcp, motion-pointer, motion-toggle, motion and a11y gave 147 passed and 1 skipped. After the fix, rebuilt: motion-reveal, motion-hover, motion-pointer, projects-grid, home-latest-work and a11y gave 132 passed.
- Full offline e2e suite: 589 passed and 16 failed. All 16 failures are pre-existing and unrelated (see Deferred Issues).
- **Bundle (`pnpm measure:bundle`, ok, no GreenSock in eager chunks):**
  - Eager JS on `/` and `/es/` is **13,101 B** gzip -9, up from 12,565 B (+536 B for split-lines and the driver).
  - The lazy chunks are `gsap` 27,107 B and `SplitText` 3,256 B, **30,363 B gzip in total, within the 35 KB UI-SPEC budget**.

## Taste Check (taste-skill)

- `lint.mjs src/lib/motion src/styles`: 0 FAIL, 0 WARN.
- `inspect.mjs` against the preview on 4501, after confirming it served this worktree's build (process cwd and the BaseLayout chunk hash `BO6iz_Pv` matched):
  - **No `clipped-text`, no `headline-lines`, no `covered-text`, no `overflow` on any page.**
  - `/` and `/es/`: 1 FAIL (`icon-cards`) and 4 WARN (`hairline`, `palette-cream`, `first-action`, `no-footage`). These are the same codes as the 06-07 baseline and come from files this plan does not touch.
  - `/projects/`: before the fix, 1 FAIL (`focal-point`) and 4 WARN.
  - Detail `/projects/cabreras-motos-posts/`: 0 FAIL. `still-page` WARN at 13 moving elements, which is accepted by the UI-SPEC because the detail image stack is static (D-04).
  - **After the card-overlay fix, `/projects/` adds an `empty-screens` FAIL. This is a measurement artefact, verified:**
    - `filled` dropped from 0.48/0.49/0.23 to 0.07/0.04/0.07, yet the desktop screenshots before and after are visually identical.
    - The probe (`lib/probe.mjs:541-546`) walks up from `elementFromPoint`. A point over a card cover now hits the title `<a>` (its full-tile `::after`), and that ancestor chain never reaches the IMG. `tmp/probe-06-08.mjs` confirmed that the hit over a cover is `A` both mid-reveal and after it.
    - That is the intended stretched-link behaviour (D-19). Earlier runs only measured the covers because the bug had shrunk the overlay.
    - `/` re-inspected after the fix gives the same codes as before.
- **Mid-rise captures** are in `.taste-skill/motion-states/` (gitignored): the Home "Latest work" h2, the Home contact h2 and the Projects h1, at 1440 and 390, EN and ES, at +200 ms and at the end.
  - The probe shows every mask at `overflow-x: visible; overflow-y: clip`, and every split reverted.
  - The 390 contact h2 splits into 2 lines in both locales ("Tell me about / your project", "Cuéntame tu / proyecto"). That stays within the two-line rule.
- **Critique:**
  - Descenders (y, p, j, g in "your project", "Trabajo", "Proyectos") and side bearings render whole at +200 ms and at the end. Nothing is clipped.
  - `power4.out` lands most of the travel in the first ~200 ms, so the rise reads as one quick gesture and not a slow crawl. That fits the "signature move, done once" rule.
  - The type is unchanged (no tracking, no per-word effects).
  - One observation: at +200 ms the single-line headings already look almost settled. The 80 ms stagger is only visible on multi-line headings (mobile contact h2).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The stretched card link shrank during the card text reveal (reported by the coordinator, from the 06-09 executor)**
- **Found during:** Task 2, from the coordinator's message.
- **Issue:** The 06-03 `settle` hidden state sets `translate: 0 20px`. Any non-`none` translate makes the text block the containing block of the title link's `after:absolute after:inset-0` overlay. For about 560 ms (plus the delay) the overlay covered only the text block, and clicking the cover did nothing. This affects `ProjectCard` and `NextProjectTeaser`, both `[data-card]`.
- **Fix:** `[data-motion='on'] [data-card] [data-reveal='settle']:not([data-revealed]) { translate: none; }`. The card text fades only, and the cover shutter still carries the card's motion. A transform cannot avoid creating the containing block, so markup-free options were limited to removing the travel.
- **Test:** "clicking a Latest-work cover mid-reveal opens the project" at 1440 and 390. It asserts the text block is still transitioning, clicks the cover centre, and expects the project URL. The test failed on the unfixed build at both widths (stayed on `/`) and passes after the fix.
- **Files modified:** `src/styles/global.css`, `tests/e2e/motion-reveal.spec.ts`
- **Commit:** `eb85c85` (test in `72df264`)

**2. [Plan detail] CSS `transition: none` is scoped to split headings**
- The plan asked for `transition: none` on all revealed lines headings under `'on'`. It is scoped with `:has(.split-line-mask)` instead, so a lines heading that cannot be split (it wraps a link) keeps the fade and does not pop. The behaviour for split headings is exactly as planned.

**3. [Test infra] Shared GSAP fake**
- `tests/unit/helpers/fake-gsap.ts` (a `FakeSplitText` and a gsap stub whose `progress(1)` runs `onComplete`) was added for the split and reveal unit tests. It was not in the plan's file list.

## Deferred Issues

- 16 pre-existing e2e failures from the 06-07 shell/face split: `home-story.spec.ts:268` and `project-detail.spec.ts:161` select `a.bg-accent`, but the fill now sits on the face span. They are logged in `deferred-items.md`. This plan does not touch those files.

## Known Stubs

None.

## TDD Gate Compliance

The RED commit `test(06-08)` (`f667a7a`) comes before the GREEN commit `feat(06-08)` (`d379cf3`). RED failed as expected: the split module was missing, and 6 reveal tests failed.

## Self-Check: PASSED

- The files exist: src/lib/motion/split-lines.ts, tests/unit/motion-split.test.ts, tests/unit/helpers/fake-gsap.ts and deferred-items.md.
- The commits exist: f667a7a, d379cf3, 72df264 and eb85c85.
