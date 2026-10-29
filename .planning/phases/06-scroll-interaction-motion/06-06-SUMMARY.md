---
phase: 06-scroll-interaction-motion
plan: 06
subsystem: motion
tags: [hover, focus, project-card, css, a11y, e2e]
requires:
  - "06-03 shutter reveal (picture scale 1.08 start, --reveal-delay, data-reveal-instant, failsafe)"
  - "06-04 teaser shutter hook"
provides:
  - "data-card + data-cursor=\"view\" on every project tile article (ProjectCard compact/full, NextProjectTeaser)"
  - "data-card-mat on the <picture> (via pictureAttributes, class block size-full) and data-card-image on the <img>"
  - "CSS-only mat (clip-path inset(12px)) + zoom (scale 1.05) on hover and :has(:focus-visible), 'on' only"
  - "tests/e2e/motion-hover.spec.ts (V-11)"
affects:
  - "06-09 (cursor pill targets [data-cursor=\"view\"])"
tech-stack:
  added: []
  patterns:
    - "One transition declaration per layer per state; the picture carries both clip-path and the shutter scale"
    - "Hover rules written as plain CSS inside @media (hover: hover), focus via [data-card]:has(:focus-visible)"
    - "Failsafe on the picture fills only scale, so a JS failure never pins the mat clip-path"
key-files:
  created:
    - tests/e2e/motion-hover.spec.ts
  modified:
    - src/components/ui/ProjectCard.astro
    - src/components/project/NextProjectTeaser.astro
    - src/styles/global.css
    - tests/unit/project-card.test.ts
    - tests/unit/project-closing.test.ts
decisions:
  - "The mat's scale transition always carries var(--reveal-delay, 0ms) instead of a revealed-only rule. The mat only scales during the shutter reveal, so the delay never affects hover, and one rule replaces the old revealed picture transition (Pitfall 12)."
  - "Instant reveals (focus, late mount) keep the hover clip-path transition: the generic instant rule now skips picture[data-card-mat], and a mat-specific instant rule sets scale 0s. Without this, a keyboard-focused card would snap its mat."
  - "The picture failsafe uses a scale-only keyframe (reveal-failsafe-scale). The shared keyframe filled clip-path: inset(0) with forwards, which would override the hover inset whenever scripts fail."
metrics:
  duration: "~25 min"
  completed: 2026-10-29
  tasks: 2
  files: 6
---

# Phase 6 Plan 06: Project Imagery Hover and Focus Summary

Every project tile (Home compact, Projects full, detail Next-project teaser) now has a pure-CSS effect on hover and on keyboard focus. The `<picture>` clips inward 12px so the surface-alt frame shows as a mat, and the `<img>` zooms slowly to 1.05. The effect runs only under `data-motion="on"`, and hover only on hover-capable pointers. Tiles also carry `data-cursor="view"` for the 06-09 cursor pill.

## What was built

- **Markup (both components):** the `article.group/card` has `data-card data-cursor="view"`. `<Picture>` gets `pictureAttributes={{ 'data-card-mat': '', class: 'block size-full' }}` and `data-card-image` (which lands on the `<img>`). The title link, underline and `::after` focus ring are unchanged.
- **global.css:**
  - Rest (`on`): the mat has `clip-path: inset(0)` and `transition: clip-path 280ms var(--ease-reveal), scale 900ms var(--ease-soft) var(--reveal-delay, 0ms)`. The image has `transition: scale 490ms var(--ease-soft)`.
  - Active (`@media (hover: hover)` `[data-card]:hover`, and `[data-card]:has(:focus-visible)`): the mat has `inset(12px)` and a 400ms clip-path. The image has `scale: 1.05` over 700ms.
  - The standalone 06-03 picture `transition: scale ...` rule is gone.
  - There are no `reduced`/`off` rules, no `transition-all`, and no colour, filter, overlay or shadow.
- **Built CSS check:** `dist/client/_astro/*.css` contains `:has(:focus-visible)` and `inset(12px)`, and lightningcss kept every mat rule intact.

## Verification

- `pnpm vitest run tests/unit/project-card.test.ts tests/unit/project-closing.test.ts tests/unit/project-card-view.test.ts`: passed. The full `pnpm test` run passed 1022/1022 tests.
- `pnpm check`: 0 errors. `pnpm lint` (eslint + prettier): clean. `pnpm build`: OK.
- Playwright on port 4481 used a throwaway config at `tmp/playwright.4481.config.ts`. The repo config hardcodes 4400, which a parallel agent may share.
  - `motion-hover`, `projects-grid`, `home-latest-work`, `a11y`, `motion-reveal`, `project-detail`: **330 passed**.
  - `motion`, `motion-hero`, `motion-lcp`, `motion-toggle`: **41 passed**.
- `motion-hover.spec.ts` (V-11) runs 20 tests:
  - Full motion: hover and Tab-focus on 3 tile types × EN/ES. The mat reaches `inset(12px)` and the image scale lands between 1.04 and 1.06. The article box stays the same within 0.5px and the text matches the rest state. The link matches `:focus-visible`, and the next Tab leaves the card.
  - Reduced motion: hover and focus stay at rest.
  - Pixel 7: the test first asserts `(pointer: coarse)` and `(hover: none)`. A touchscreen tap on a `/projects/` tile, with the navigation cancelled by a capture-phase click listener, leaves the mat at `inset(0px)` and the scale at `none`.

## Taste review (taste-skill, required by CLAUDE.md)

- **lint.mjs** `src/components/ui src/components/project src/styles`: 0 FAIL, 0 WARN.
- **inspect.mjs** against my preview on 4481. I confirmed the server cwd was this worktree and the served HTML carries `data-card-mat`. All results match the 06-03/06-04 baselines, and nothing new came from this plan. The inspector moves no pointer, so the hover effect does not change its counts.
  - `/`: 1 FAIL `icon-cards`; WARN `hairline`, `palette-cream`, `no-footage`.
  - `/projects/`: 1 FAIL `focal-point`; WARN `hairline`, `palette-cream`, `first-action`, `no-footage`.
  - `/projects/purov/`: FAIL `still-page` (5 moved). This is the same class as 06-04's InstaBlogs note: the long detail page is beyond the inspector's walk, so the teaser never enters its window. The WARNs are the same four as `/projects/`.
- **Screenshots** are in `.taste-skill/motion-states/` (gitignored). The capture script is `tmp/capture-hover-states.ts`. They show the PuroV tile on `/projects/` at rest and hovered at 1440, and keyboard-focused at 1440 and 390, in EN and ES.
- **Critique:**
  - The mat is even on all four sides. The measured picture box is unchanged and the clip is `inset(12px)`, which shows as a 12px surface-alt band all round.
  - The card box is identical at rest, hovered and focused (439.3×632.5 at 1440, 358×416.8 at 390).
  - The zoom reads as a gentle push-in, not a jump. Title, summary, category and tools stay where they are.
  - On focus, the accent underline and the 2px ring on the stretched `::after` both show and sit clear of the mat.
  - At 390, the 12px mat is a larger share of the smaller cover but still reads as a mat, not a border.
  - There is no colour shift and no overlay, so the response is consistent with the house rules.
- **For user review (UI-SPEC Open Question 4):** the 400ms clip and 700ms zoom on enter, and 280/490ms on leave, are slower than the skill's 150–200ms hover guidance. D-06 asks for this on purpose. Please confirm they feel right in a real browser.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The instant-reveal rule would have killed the hover transition on focused cards**
- **Found during:** Task 1
- **Issue:** `:is(on, reduced) [data-reveal][data-reveal-instant] picture { transition: none }` has higher specificity than the mat rest rule. `data-reveal-instant` is never removed, and a focus reveal sets it. So a keyboard-focused or late-mounted card would snap its mat instead of transitioning.
- **Fix:** the generic rule now targets `picture:not([data-card-mat])`. A mat-specific instant rule keeps the clip-path transition and sets `scale 0s`, so the reveal scale still lands at once.
- **Files modified:** src/styles/global.css
- **Commit:** ba158a4

**2. [Rule 1 - Bug] The failsafe keyframe would have pinned the mat open**
- **Found during:** Task 1
- **Issue:** the picture failsafe used `reveal-failsafe`, which fills `clip-path: inset(0)` forwards. Animations override declarations, so whenever scripts fail after the gate, hover and focus could not apply `inset(12px)`.
- **Fix:** the picture now uses a new scale-only `reveal-failsafe-scale` keyframe. The frame keeps the original keyframe.
- **Files modified:** src/styles/global.css
- **Commit:** ba158a4

### Test-harness notes (not product changes)
- The e2e helper centres the tile with `scrollIntoView({ block: 'center' })`. A tile peeking in at the viewport bottom sits below the -12% reveal trigger line and never reveals.
- The touch test uses `page.touchscreen.tap(x, y)` instead of `locator.tap()`. The stretched link `::after` covers the `<picture>`, so Playwright's hit-target check would retry until it timed out.

## Known Stubs

None.

## Commits

- ba158a4 `feat(06-06): add mat and zoom hover to project tiles`
- 15bd141 `test(06-06): cover tile hover, focus, reduced and touch`

## Self-Check: PASSED

- FOUND: src/components/ui/ProjectCard.astro, src/components/project/NextProjectTeaser.astro, src/styles/global.css, tests/unit/project-card.test.ts, tests/unit/project-closing.test.ts, tests/e2e/motion-hover.spec.ts
- FOUND: ba158a4, 15bd141
