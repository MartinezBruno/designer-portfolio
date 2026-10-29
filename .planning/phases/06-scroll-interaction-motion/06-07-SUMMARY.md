---
phase: 06-scroll-interaction-motion
plan: 07
subsystem: motion
tags: [magnetic, gsap, pointer, a11y, e2e]
requires:
  - "06-01 motion gate and events (currentMotionState, onMotionChange)"
  - "06-02 lazy GSAP loader (loadGsap, GsapModules)"
  - "06-03 effects.ts lifecycle registry"
  - "06-04 settle wrapper around the detail contact band button"
provides:
  - "src/lib/motion/magnetic.ts: magneticOffset (pure) + createMagnetic(deps) PageInit"
  - "Markup API: [data-magnetic=pill|link] shell holding one [data-magnetic-face]"
  - "primaryShell / primaryFace pill classes (primaryButton removed)"
  - "ExternalTextLink `magnetic` prop"
  - "tests/e2e/motion-pointer.spec.ts with `magnetic`, `touch` and `reduce` blocks"
affects:
  - "06-06 / cursor plan: motion-pointer.spec.ts is the pointer e2e home; the cursor can add its own describe there"
  - "Any future accent pill must use primaryShell + primaryFace (span[data-magnetic-face])"
tech-stack:
  added: []
  patterns:
    - "Shell never moves (hit area + focus outline); only the inner face is translated"
    - "Page-relative rect cache, hit-tested against pageX/pageY; no layout reads in pointermove"
    - "Gate = fine hover pointer AND data-motion='on' AND not forced-colors, re-evaluated live"
key-files:
  created:
    - src/lib/motion/magnetic.ts
    - tests/unit/motion-magnetic.test.ts
    - tests/e2e/motion-pointer.spec.ts
  modified:
    - src/lib/motion/effects.ts
    - src/lib/ui/button-classes.ts
    - src/components/ui/ButtonLink.astro
    - src/components/contact/ContactForm.astro
    - src/components/ui/IconLink.astro
    - src/components/ui/ExternalTextLink.astro
    - src/components/project/ProjectIntro.astro
    - src/components/sections/LatestWork.astro
    - tests/unit/contact-section.test.ts
    - tests/unit/latest-work.test.ts
    - tests/unit/project-intro.test.ts
    - tests/e2e/contact-states.spec.ts
decisions:
  - "The release reuses the quickTo setters (0.3s power2.out), not a separate 0.4s tween. A second tween on the same x/y would fight quickTo's own tween. The difference is 100 ms with the same curve and no overshoot."
  - "MagneticDeps gets an optional createResizeObserver so unit tests can assert observe/disconnect. It defaults to the browser ResizeObserver."
  - "Touch pointermove events (pointerType 'touch') are ignored even if the fine-pointer query matches, so hybrid devices never get pulled by a finger."
  - "The taste inspect WARN `first-action` on / is accepted as a measurement artefact. The probe reads only the <a>'s own background, and the fill now sits on the face span. The rendered pixels are identical (screenshot diff)."
metrics:
  duration: "~35 min"
  completed: 2026-10-29
  tasks: 3
  files: 15
---

# Phase 6 Plan 07: Magnetic buttons Summary

The named CTAs, stand-alone links and social icons now pull gently toward a fine pointer under full motion. The pull is a GSAP `quickTo` x/y on an inner face, capped at 8px for pills and 6px for links. The shell that owns the click target and focus ring never moves. Touch, `reduced`, `off` and forced-colours users get no listener, and their faces stay at `transform: none`.

## What was built

- **`src/lib/motion/magnetic.ts`**
  - `magneticOffset(pointer, rect, cap)` returns null when the pointer is more than 24px outside the box. Otherwise it returns (pointer − centre) × 0.3, with each axis clamped to ±cap.
  - `createMagnetic(deps)` returns `undefined` when there is no `[data-magnetic]`. Otherwise it watches `(hover: hover) and (pointer: fine)`, `(forced-colors: active)` and `motion:change`. When all three allow it, it loads GSAP lazily and builds the `quickTo` setters inside a `gsap.context`. It caches page-relative shell rects at enable, on `resize`, on `load`, after `document.fonts.ready`, and through a 150 ms debounced ResizeObserver on `body`. One passive `pointermove` listener does the hit-testing.
  - Disabling (reduced, off, coarse pointer or forced colours) aborts the listeners, disconnects the observer, reverts the context and `gsap.set`s every face to x 0, y 0.
  - If `loadGsap` rejects, it is swallowed and nothing is attached.
- **`effects.ts`** registers `createMagnetic({ matchMedia, loadGsap })` on the lifecycle.
- **Markup**
  - `primaryShell` and `primaryFace` replace `primaryButton`. `ButtonLink` covers the hero, the no-JS contact block, the detail band and 404. With the contact submit, these are `data-magnetic="pill"`.
  - These are `data-magnetic="link"`: `IconLink` (footer and contact socials), "See all projects", and "View on Behance" (via the new `ExternalTextLink magnetic` prop).
  - The underline moved to the face span (`group-hover/link:underline`), so it travels with the face.
  - EmbedFacade and UnknownModule stay non-magnetic. No `data-magnetic` element carries `data-reveal`.

## Verification

- **Unit:** `motion-magnetic.test.ts` has 17 tests: the pure math, every gate, the pull and release, ignoring touch, zero `getBoundingClientRect` calls during moves, the scroll offset, reduced→on, the fine-pointer change, load rejection, cleanup, and 10 lifecycle cycles with `activeCleanups` at 1. The new shell/face assertions are in contact-section, latest-work and project-intro. Full suite: 64 files, **1,039 tests pass**. `pnpm lint` (astro check, eslint, prettier) is clean.
- **At-rest screenshot diff (throwaway `tmp/at-rest/`, port 4491):** all seven controls were captured before the edits and compared after a rebuild, at 1440 and 390: hero CTA, `/404` CTA, detail band button, contact submit, footer social icon, "See all projects" and "View on Behance". **14/14 match, pixel-identical (default `toHaveScreenshot` threshold).**
- **E2E (`pnpm build`, then `playwright test` against preview on port 4491):**
  - `motion-pointer.spec.ts` has 8 tests and passes 8/8, and also 24/24 with `--repeat-each 3`:
    - the hero CTA pulls (0 < x ≤ 8) with its shell box unchanged, and releases to identity;
    - the footer IconLink pulls (≤ 6) after scrolling;
    - the toggle (pressed by keyboard while the pointer is near) snaps the face to identity within 150 ms;
    - the header has no magnetic elements;
    - each shell has exactly one face and no reveal;
    - on Pixel 7 and iPhone 14 profiles, `(pointer: coarse)` is asserted and every face is `none` after a tap;
    - under `reducedMotion: 'reduce'` the face stays `none`.
  - Also run: the motion*, contact*, a11y and not-found specs. All pass (216 tests incl. `@network`) after the contact-states fix below.
- **Bundle:** `pnpm measure:bundle` exits 0 with "no GreenSock in eager chunks". gsap (27,107 B gz) and SplitText (3,256 B gz) are lazy. Eager on `/` and `/es/` is **12,565 B gzip -9**, against 10,781 B after 06-04: **+1,784 B**, all in the BaseLayout entry (1,112 → 2,896 B). [Inference] That is the magnetic module plus the dynamic-import preload helper that now ships because effects.ts references `loadGsap`. I did not split-measure it.

## Taste review (taste-skill, motion.md "Press and hover")

- **`lint.mjs src/components src/lib`:** 1 FAIL and 1 WARN, both pre-existing and in files this plan does not touch: `hairline` at `SiteHeader.astro:34` and `outlined-box` at `ToolsRow.astro:21`. This plan introduces no new finding.
- **`inspect.mjs http://localhost:4491/ --widths 1440,390`** (served build confirmed to contain `data-magnetic`): 1 FAIL and 4 WARN.
  - `icon-cards`, `hairline`, `palette-cream` and `no-footage` were already there (06-04 SUMMARY).
  - `first-action` is new. Its probe counts only `a`/`button` elements with their own fill, and the fill now lives on the face span. I'm defending it, not fixing it: the screenshot diff proves the CTA renders identically, and moving the fill back onto the shell would defeat the shell/face split (Pitfall 9).
  - The render screenshots (`.taste-skill/inspect-06-07/`) show nothing missing.
- **Motion states:** `.taste-skill/motion-states/magnetic-hero-{rest,pull,released}-1440.png`.
  - Mid-pull: the face computed to `matrix(1,0,0,1,8,-7.5)`, at the cap. 150 ms into the release it was 0.71/−0.67, and it was exactly identity at rest.
  - **Critique:** the pull reads as a small lean toward the pointer, not a jump. The pill stays in its row, it settles with `power2.out`, and it has no overshoot or elastic (grep confirms none in magnetic.ts). It matches the house rule that interface motion is small and consistent. The press scale (0.97, `motion-on:` only) follows motion.md's press recipe.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] contact-states e2e tagged the accent fill by the button**
- **Found during:** Task 3 (e2e verify run)
- **Issue:** `accentFills()` in `tests/e2e/contact-states.spec.ts` identified the submit by `data-contact-submit` on the element with the accent background. The fill now sits on the face span, so all 20 state tests failed on their first assertion.
- **Fix:** The helper now matches `[data-contact-submit] > [data-magnetic-face]` as "submit". The contract is unchanged: exactly one accent fill, and it is the submit.
- **Files modified:** tests/e2e/contact-states.spec.ts
- **Commit:** 1cfc15a

**2. [Spec nuance] The release duration is 0.3s, not 0.4s**
- See decisions. The release uses the quickTo setters with target 0, which avoids competing tweens on x/y.

**3. Port 4491 config**
- I ran the plan's e2e verify through a throwaway `tmp/e2e.config.ts`, which is the repo config with the port changed to 4491, so it could not collide with the parallel 06-06 executor on 4400. The repo `playwright.config.ts` is unchanged.

Unit tests for contact-form, site-footer, embed-facade and project-modules needed no changes. They select by attribute.

## Known Stubs

None.

## TDD Gate Compliance

RED `1464d6a` (test) came before GREEN `1fd3417` (feat). No refactor commit was needed.

## Commits

- 1464d6a test(06-07): add failing magnetic effect tests
- 1fd3417 feat(06-07): add gated magnetic pull effect
- 452ea11 feat(06-07): split magnetic controls into shell and face
- 1cfc15a test(06-07): add magnetic pointer e2e coverage

## Self-Check: PASSED

- All created files are present: src/lib/motion/magnetic.ts, tests/unit/motion-magnetic.test.ts and tests/e2e/motion-pointer.spec.ts.
- Commits 1464d6a, 1fd3417, 452ea11 and 1cfc15a are all present in `git log`.
