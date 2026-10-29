---
phase: 06-scroll-interaction-motion
plan: 09
subsystem: motion
tags: [cursor, gsap, quickTo, a11y, i18n, playwright, taste]
requires:
  - phase: 06-01
    provides: cursor.view dictionary key, currentMotionState / onMotionChange
  - phase: 06-02
    provides: loadGsap (the only GSAP entry point)
  - phase: 06-06
    provides: data-cursor="view" on ProjectCard and NextProjectTeaser articles
  - phase: 06-07
    provides: magnetic gating pattern (fine pointer + forced colours + motion:change), motion-pointer.spec.ts
provides:
  - createCursor(deps) PageInit (src/lib/motion/cursor.ts)
  - CursorFollower.astro build-time template + registration script, rendered once in BaseLayout
  - e2e V-08 (cursor), V-10 follower half (touch), V-12 follower half (reduce)
affects: [07 page transitions (lifecycle unmount must remove the layer; covered by cleanup)]
tech-stack:
  added: []
  patterns:
    - Build-time <template> cloned on the client for localized decorative UI (no innerHTML, no dictionary import)
    - Positioner span moved by GSAP x/y; children use Tailwind scale/translate (separate CSS properties)
key-files:
  created:
    - src/lib/motion/cursor.ts
    - src/components/global/CursorFollower.astro
    - tests/unit/motion-cursor.test.ts
  modified:
    - src/layouts/BaseLayout.astro
    - tests/e2e/motion-pointer.spec.ts
key-decisions:
  - "The cursor follower is a user override of taste motion.md §6 ('no custom cursor'), D-09/D-11/D-13, not a taste pass."
  - "The layer is appended only after GSAP loads, so a failed chunk leaves no orphan layer in the DOM."
  - "The first pointermove jumps the positioner (quickTo start value) instead of sliding in from the top-left corner."
  - "Registered from CursorFollower.astro's own script, not effects.ts, to stay clear of parallel plan 06-08."
requirements-completed: [MOTN-03, MOTN-07]
duration: ~12min
completed: 2026-10-29
---

# Phase 6 Plan 09: Cursor Follower Summary

**A decorative accent dot follows a fine pointer with a 0.25 s `quickTo` lag, grows to 24 px at 0.35 opacity over links and buttons, and turns into a localized "View" / "Ver" pill over project imagery. It is cloned from a build-time template, never exists on touch, reduced, off or forced colours, and mounts and unmounts live.**

## Performance

- **Duration:** about 12 min
- **Completed:** 2026-10-29
- **Tasks:** 2
- **Files:** 3 created, 2 modified

## Accomplishments

- `createCursor(deps)` (`src/lib/motion/cursor.ts`):
  - Gate: `(hover: hover) and (pointer: fine)`, `html[data-motion="on"]` and not `(forced-colors: active)`. It listens to both media queries and to `motion:change`, and starts or stops a session in place.
  - Session: loads GSAP lazily, clones `template[data-cursor-template]` into `<body>`, and creates `quickTo` x/y (0.25 s, `power2.out`) inside a `gsap.context`.
  - Listeners: one passive `pointermove` (touch ignored, no layout reads), delegated `pointerover`/`pointerout`, `pointerleave` on `<html>`, and window `blur`.
  - States: `data-state="view"` / `"link"` / none, and `data-hidden` until the first move, after leaving the window or blurring, and over `input`, `textarea`, `select` or `iframe`.
  - Cleanup: aborts the session, reverts the context and removes the layer.
- `CursorFollower.astro`: a `<template>` holding `div[data-cursor-layer][aria-hidden="true"]` (`group/cursor pointer-events-none fixed inset-0 z-50 overflow-clip`).
  - Inside it, `span[data-cursor-pos]` (the only element GSAP moves) contains the dot (`size-3 bg-accent`, 180 ms) and the pill (`h-8 px-4 bg-accent text-accent-ink text-sm font-semibold`, 240 ms in, 170 ms out). The pill label `{t('cursor.view')}` is rendered at build time.
  - Its script registers `createCursor({ matchMedia, loadGsap })` on `lifecycle`.
- `BaseLayout.astro` renders `<CursorFollower locale={locale} />` once, after the footer. The inline gate, `data-motion="off"` and the existing script imports are untouched.
- No `cursor: none` and no `cursor-none` anywhere in `src` (D-11).

## Task Commits

1. **Task 1 (RED):** `8d9ca6d` test(06-09): add failing cursor follower tests
2. **Task 1 (GREEN):** `6f5bbb0` feat(06-09): add decorative cursor follower
3. **Task 2:** `a1a93f2` test(06-09): add cursor follower e2e coverage

## Verification

[Verified by running the commands in this worktree, preview on port 4511, throwaway gitignored config `tmp/pw-0609.config.ts`]

- Unit tests: `pnpm vitest run tests/unit/motion-cursor.test.ts tests/unit/motion-magnetic.test.ts`: 34/34 pass. Full `pnpm test`: 65 files, 1060 tests pass.
- `pnpm lint` (`astro check` + eslint + prettier): 0 errors.
- `pnpm build`, then Playwright for `motion-pointer`, `motion-toggle`, `a11y`, `motion`, `motion-hover`, `motion-hero`, `motion-reveal` and `motion-lcp`: **142 passed** (`@network` tests excluded).
- New e2e tests in `motion-pointer.spec.ts`:
  - **cursor (1440x900):**
    - Exactly one layer exists; it is aria-hidden, has computed `pointer-events: none`, and contains nothing focusable.
    - The pill reads "View" on `/` and "Ver" on `/es/`, at opacity 1, with the dot at opacity 0. A click through the pill navigates to the tile's detail page.
    - Over the hero CTA the state is `link` and the dot's scale is 2. Over the message textarea the state is `hidden` and the positioner's opacity is 0.
    - With the pointer at the right edge, `scrollWidth <= innerWidth`.
    - No element has computed `cursor: none`.
    - The motion toggle removes the layer and brings it back live.
    - Axe finds 0 violations with the pill shown.
  - **touch (Pixel 7, iPhone 14):** the `(pointer: coarse)` precondition holds, and no layer exists after taps.
  - **reduce:** no layer exists after mouse moves.
  - The magnetic tests are unchanged and still pass.
- `pnpm measure:bundle`: OK, no GreenSock in eager chunks. Eager JS on `/` and `/es/` is **13,745 B gzip -9** (11 files), up from 12,565 B. The cursor script chunk is 956 B gz; the rest is chunk re-splitting around the shared `load-gsap` module. GSAP (27.1 KB gz) and SplitText (3.3 KB gz) stay lazy.
- Acceptance greps:
  - `data-cursor-template` = 1
  - `<CursorFollower` = 1
  - `innerHTML` in `cursor.ts` = 0
  - `cursor:\s*none|cursor-none` in `src`: none
  - `from 'gsap` in `cursor.ts` = 0
  - `cursor.view` in `CursorFollower.astro` = 1

## Taste Review (taste-skill:taste-skill)

- **lint.mjs** on `src/components/global` and `src/lib/motion`: 1 FAIL, `[hairline]` on `SiteHeader.astro:34 border-b`. It is pre-existing and accepted (the header border), not in a new or changed file. The new files have no FAILs and no `transition-all`, `ease-in`, `scale-0` or `animate-*` WARNs, and no `taste-skill-ignore` comments were added.
- **inspect.mjs http://localhost:4511/** (I first confirmed the server was serving this worktree's build: the HTML contains `data-cursor-template` and the matching `CursorFollower` chunk hash):
  - 1 FAIL, `icon-cards`, pre-existing and accepted at Phase 3.
  - WARNs `hairline`, `palette-cream`, `no-footage` and `first-action` were all already present before this plan (`first-action` is defended in 06-07).
  - **No `covered-text`, `overflow`, `clipped-text` or `still-page`.**
- **Screenshots** (`.taste-skill/motion-states/`, 1440, EN and ES, captured by the throwaway `tmp/shots-0609.spec.ts`): `cursor-pill-tile-{en,es}-1440(-crop).png`, `cursor-dot-cta-{en,es}-1440.png` and `cursor-dot-rest-{en,es}-1440.png`.
- **Critique:**
  - The pill sits centred on the pointer over the cover. It is the same accent fill and pill radius as the primary CTA, so it reads as part of the button family rather than an ornament. "Ver" is noticeably narrower than "View", but both stay within one h-8 pill.
  - At rest the dot is a small, quiet accent mark that never sits on top of text, because it trails the native arrow.
  - Over the accent CTA the dot is accent on accent at 0.35, so it reads as a faint tint over a letter or two ("to" in "together"). That is acceptable for a decorative layer that is never text, but it is the weakest state visually. If Martina finds it muddy, the follow-up is to drop the dot to opacity 0 over `[data-magnetic="pill"]`, with no layout change.
  - The accent count stays at "the action plus one other thing": the cursor is the other thing, and only for a fine pointer.
- **User override (recorded, not a taste pass):** taste `references/motion.md` §6 says "no custom cursor". The user locked the cursor follower in **D-09**. It stays within the skill's usability concerns:
  - the native cursor is never hidden (**D-11**)
  - it is decorative, aria-hidden and click-through, and appears only for a fine pointer (**D-13**)
  - it is absent under reduced motion, the toggle's off state and forced colours

## Deviations from Plan

### Auto-fixed Issues

None in product code. Test-side adjustments:

**1. [Rule 3 - Blocking] The e2e tile hover waits for the scroll-triggered reveals before clicking or running axe**
- **Found during:** Task 2
- **Issue:** The click-through and axe tests initially failed. The cause was not the follower: `elementFromPoint` showed the `<img>` was hit, not the layer.
  - **Click:** while the card's meta block runs its 560 ms `settle` reveal, its non-`none` `translate` becomes the containing block of the stretched link's `::after`. The `::after` then shrinks to the text block (about 347x52 px), so for that moment the cover is not part of the link.
  - **Axe:** it flagged colour contrast on mid-fade service cards (opacity below 1).
- **Fix:** `hoverTile()` scrolls the tile in, waits for every finite animation to end, and only then hovers.
- **Files modified:** `tests/e2e/motion-pointer.spec.ts`
- **Commit:** `a1a93f2`

**2. [Process] Base reset**
- The worktree started at `234dcb2`, behind the expected base `abc3f3e`, with no commits of its own. I reset it to `abc3f3e` as the worktree check prescribes.

**3. [Process] Misplaced screenshots**
- The first screenshot run wrote to `.claude/worktrees/.taste-skill/` (wrong relative path). I moved the files into this worktree's gitignored `.taste-skill/motion-states/` and removed the stray empty directories.

## Deferred Issues

- **Cover briefly not clickable during the settle reveal (pre-existing, out of scope; owned by the reveal CSS in `global.css`, which plan 06-08 is changing).** For about 560 ms after a card's meta block starts its `settle` reveal, clicks on the cover image do nothing. The `translate` on `[data-reveal="settle"]` confines the stretched link's `::after`. Possible fixes:
  - drop the transition-end `translate` to `none` and avoid the transform on the link's ancestor
  - make the article the positioned ancestor some other way
  - move `data-reveal="settle"` off the element that wraps the stretched link

  It doesn't affect keyboard users or the title link.

## Merge Notes (parallel with 06-08)

- `effects.ts`, `global.css`, `split-lines.ts`, `reveal.ts` and `a11y.spec.ts` were not touched. The cursor registers from `CursorFollower.astro`'s own `<script>`.

## Known Stubs

None. The `cursor.view` copy carries the existing `TODO(martina)` copy confirmation from 06-01.

## Threat Flags

None beyond the plan's register:
- **T-06-22:** template clone, no innerHTML, label is build-time text.
- **T-06-23:** pointer-events none, aria-hidden, native cursor kept, click-through and axe e2e.
- **T-06-24:** `fixed inset-0 overflow-clip`, right-edge scrollWidth e2e.

## TDD Gate Compliance

The RED commit `8d9ca6d` (17 failing tests) is followed by the GREEN commit `6f5bbb0` (17 passing). No refactor commit was needed.

## Self-Check: PASSED

- FOUND: src/lib/motion/cursor.ts, src/components/global/CursorFollower.astro, tests/unit/motion-cursor.test.ts
- FOUND commits: 8d9ca6d, 6f5bbb0, a1a93f2
