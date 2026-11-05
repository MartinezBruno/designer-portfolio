---
phase: 07-page-transitions-smooth-scroll
plan: 14
subsystem: motion
tags: [parallax, scroll-driven-animations, collection-module, gap-closure]
requires: ["07-13"]
provides:
  - "CollectionItemView.drift: per-cell eligibility (not eager, project not opted out, id not listed)"
  - "CollectionModule drifting cells: data-parallax-frame + overflow-clip + aspect-(--ar), img data-parallax + object-cover, root data-collection"
  - "[data-collection] [data-parallax-frame] tokens 3% / 2.6%"
  - "tests/e2e/collection-motion.spec.ts and capture item 9"
affects: [project detail pages with MediaCollectionModules (InstaBlogs only today)]
tech-stack:
  added: []
  patterns: ["reuse the card parallax hooks per grid cell; the row moves as one because cells share top and bottom"]
key-files:
  created:
    - tests/e2e/collection-motion.spec.ts
  modified:
    - src/lib/projects/model.ts
    - src/lib/projects/detail-view-site.ts
    - src/components/project/CollectionModule.astro
    - src/styles/global.css
    - src/data/project-overrides.json
    - tests/unit/project-detail-site.test.ts
    - tests/unit/project-modules.test.ts
    - tests/e2e/transitions-capture.spec.ts
    - .planning/phases/07-page-transitions-smooth-scroll/07-UI-SPEC.md
decisions:
  - "InstaBlogs stackMotion changed from false to the explicit list of its 58 ImageModule ids, so its grid cells can drift while every image module stays static as 07-09 decided"
  - "Collection tokens kept at the planned 3% / 2.6%; the taste review's crop finding goes to the user (UI-SPEC Open Question 5 follow-up)"
metrics:
  duration: "~45 min"
  completed: 2026-11-04
---

# Phase 7 Plan 14: CollectionModule cell drift Summary

Eligible CollectionModule grid cells now drift gently inside their own overflow-clip frames. This reuses the card parallax engine (CSS `animation-timeline: view()`, zero JS) with gentler tokens (3% / 2.6%). Cells in a justified row move in unison, the grid stays seamless, and `reduced`, `off` and print stay static.

**Read this first: the taste review found a trade-off that needs a user decision.** The overscan hides about 3% of each cell at the top and bottom at rest, and up to about 5.6% of one edge at the ends of the range. InstaBlogs' grid cells are full screen mockups, so their thin navigation bars (logo, "About us / Opinions / Blog", avatar) and the footer credit lines ("Designed by ... / Dark mode") sit at the cell edges. Under `on` they are partly cropped. The clearest examples are capture `9-instablogs-col7-centred-1440.png` against the reduced reference, and `.taste-skill/inspect-07-14/en/desktop-page-01.jpg`, where the row-2 nav strip of collection 1 is cut. No gap opens and no colour field tears across a seam, but text is cropped at the cell edges. That conflicts with the 07-10 acceptance bullet "parallax never ... crops text". The user explicitly asked for grid motion (Q5), so I kept the drift at the planned tokens instead of silently opting out almost every cell. The options are in UI-SPEC Open Question 5, and each one changes only data or tokens:
- (a) Keep the drift as it is.
- (b) Lower the collection tokens, for example to 1.5% / 1.3%. This halves both the crop and the motion.
- (c) Opt cells out by id in `stackMotion`, or set `stackMotion: false` on InstaBlogs to return to fully static grids.

## Tasks

| Task | Commit | Message |
|------|--------|---------|
| 1 RED | af06595 | test(07-14): add failing tests for collection drift |
| 1 GREEN | c037aa7 | feat(07-14): drift collection cells inside frames |
| 2 | 0e80c43 | test(07-14): cover grid drift e2e and captures |

## What was built

- **model.ts:** added `CollectionItemView.drift: boolean`, with a doc comment that cites 07-14 and Q5.
- **detail-view-site.ts:** a cell gets `drift: !eager && optedOut !== null && !optedOut.has(image.id)`. It reuses the existing `optedOut` set and never calls `entranceOf`, so the ImageModule left/right alternation is untouched. This is unit tested.
- **CollectionModule.astro:**
  - The root carries `data-collection`.
  - A drifting cell gets `data-parallax-frame` plus the classes `aspect-(--ar) overflow-clip`. Its aspect ratio is the same `--ar` as its flex-grow, so the cell box is unchanged.
  - Its `<picture>` is `block size-full`, so the image's `calc(100% + 2 * overscan)` height resolves.
  - The `<img>` gets `data-parallax` and `object-cover`.
  - A static cell renders exactly the previous markup.
- **global.css:** `[data-collection] [data-parallax-frame] { --px-overscan: 3%; --px-travel: 2.6%; }`, with the arithmetic in a comment. Print is covered by the existing `[data-parallax]` print rule (translate none, height 100%). There are no new keyframes, timelines or JS.

## Verification

- **Unit:** `project-detail-site`, `project-modules` and `projects-overrides` pass. The full unit suite passes: 70 files, 1271 tests. `pnpm check` reports 0 errors and `pnpm lint` exits 0.
- **e2e** (temporary config on port 4414, deleted afterwards and never committed):
  - `collection-motion` passes 9/9:
    - drift at 1440 and 390: the translate changes over 200 px of scroll and no edge is ever exposed;
    - row unison at 1440: offsets equal to ±0.5 px at three scroll positions;
    - seamless at 1440 and 390: cells and rows touch, and every cell box and `scrollHeight` are the same in `on` and `reduced`;
    - `reduced` (EN and ES), `off` and print are static;
    - eligibility.
  - `navigation-leaks`, `parallax` and `stack-entrance` pass (39 tests).
  - Full offline e2e: 724 passed and 1 failed. The failure, `motion-reveal` "split fails safe when only the gsap chunk fails", passed on rerun and does not touch any file in this plan.
- **navigation-leaks.spec.ts was not changed:** `/projects/website-instablogs/` and its ES twin were already in the counted cycle. The invariant parallaxAnimations === parallaxElements now holds with 27 more parallax elements on that page.
- **Captures:** `CAPTURE_TRANSITIONS=1` item 9 produced 54 files `9-instablogs-col{1..9}-{entering,centred,leaving}-{1440,390}.png` in `.taste-skill/transitions/`.

## Taste gate (taste-skill)

- **lint.mjs** `src/components/project src/styles` (12 files): 0 FAIL, 0 WARN.
- **inspect.mjs** (preview on 4415, output in `.taste-skill/inspect-07-14/{en,es}/`):

| URL | Moving 1440/768/390 (07-10) | Codes |
|---|---|---|
| `/projects/website-instablogs/` | 33/33/33 (6/6/6) | 0 FAIL. WARN `hairline`, `palette-cream`, `first-action`, `no-footage` (all accepted before) |
| `/es/projects/website-instablogs/` | 33/33/33 (6/6/6) | 0 FAIL, same 4 WARNs |

  The `still-page` FAIL from 07-10 is gone. There is no `overflow`, `clipped-text` or `empty-screens`.

- **Per-collection verdicts.** I reviewed all 54 captures plus centred reduced references for all 9 collections at 1440.

| # | Content | Seam integrity (gaps, torn fields) | Edge crop | Verdict |
|---|---|---|---|---|
| 1 | Wireframes, 3 cells | intact | nav row of the row-2 mockups and the footer text partly cut | keep, crop flagged |
| 2 | Wireframes plus profile, 3 cells | intact | top nav strips cut | keep, crop flagged |
| 3 | Pop-up mockups on yellow, 5 cells (3 + 2) | intact | header strip and footer credits cut | keep, crop flagged |
| 4 | Card UI on yellow, 2 cells | intact | minimal (cell 2 has clean edges) | keep |
| 5 | Dark-mode components, 3 cells | intact | small: top labels near the edge | keep, crop flagged |
| 6 | Dark-mode screens, 3 cells | intact | nav and credits strips cut | keep, crop flagged |
| 7 | Blog and profile screens, 3 cells | intact | nav and "Designed by / Dark mode" strips cut | keep, crop flagged |
| 8 | 404 and blog screens, 3 cells | intact | nav strips cut | keep, crop flagged |
| 9 | Phone and desktop mockups on purple, 2 cells | intact; the seam to the yellow "¡Gracias!" module is clean | minimal | keep |

No cell id was opted out and no travel was changed. The seam rule (no torn composition across a seam) holds everywhere. The crop is the open item described at the top.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug in plan] InstaBlogs was opted out by `stackMotion: false`, so the plan's own eligibility rule made every grid cell static**
- **Found during:** Task 2, first build: InstaBlogs rendered 0 drifting cells.
- **Issue:** 07-09 set InstaBlogs to `stackMotion: false` because the side entrance tore its seams. InstaBlogs is the only project with collections, so following the plan's rule ("project with stackMotion false never moves") meant the feature did nothing.
- **Fix:** `stackMotion` for InstaBlogs (176799549) is now the explicit list of all 58 of its ImageModule ids. Every image module stays static, exactly as before (verified: 0 `[data-stack-enter]` on the page), and all 27 grid cells become eligible. This is a data-only change and can be reverted in one line. It is recorded in the UI-SPEC.
- **Files modified:** `src/data/project-overrides.json`
- **Commit:** 0e80c43

**2. Picture wrapper sizing (implementation detail not in the plan)**
- A drifting cell's `<picture>` gets `block size-full`, as in ProjectCard. Without it the image's percentage height has no definite parent and the overscan does not resolve.

### Notes

- I committed Task 2 as `test(07-14)`, but it also carries the overrides data change and the UI-SPEC amendment.
- The plan's class list `sm:aspect-(--ar) aspect-(--ar)` was reduced to `aspect-(--ar)`, which applies at every width. The `sm:` variant would have been redundant.

## Known Stubs

None.

## Threat Flags

None. T-07-30: unknown stackMotion ids still fail the build, and the new list passed `validateOverrides`. T-07-31: the drift runs under `on` only and is static in `reduced`, `off` and print; the leak invariant holds on InstaBlogs.

## Self-Check: PASSED

- FOUND: tests/e2e/collection-motion.spec.ts
- FOUND: commits af06595, c037aa7, 0e80c43
