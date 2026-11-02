---
phase: 07-page-transitions-smooth-scroll
plan: 09
subsystem: motion
tags: [scroll-driven-animations, detail-stack, side-entrance, overrides, css, reduced-motion, taste-skill]
requires:
  - 07-08 @supports (animation-timeline: view()) gate, longhand rule, e2e DocumentTimeline wait filter
  - 07-03 leak contract (parallax animations == [data-parallax] elements)
  - 07-04 data-vt arrival hold, 07-06 project-title morph
provides:
  - "stackMotion override (false | image id list), validated against the snapshot image ids"
  - "Project.stackMotion and image ModuleView entrance: 'left' | 'right' | null"
  - "StackFrame.astro: overflow-clip frame (data-stack-frame, intrinsic aspect ratio) for moving images"
  - "--stack-travel: 7%, --stack view timeline, @keyframes stack-enter, print reset"
  - "tests/e2e/stack-entrance.spec.ts (14 cases) and a stack-enter leak assertion"
  - "capture item 7 (stack seams) in tests/e2e/transitions-capture.spec.ts"
affects: [07-10]
tech-stack:
  added: []
  patterns:
    - Scroll-driven animation in longhands only (07-08 rule), checked in the built CSS
    - Conditional wrapper component (slot alone when static) so static markup is byte-identical
key-files:
  created:
    - src/components/project/StackFrame.astro
    - tests/e2e/stack-entrance.spec.ts
  modified:
    - src/lib/projects/overrides-schema.ts
    - src/lib/projects/projects.ts
    - src/lib/projects/model.ts
    - src/lib/projects/detail-view-site.ts
    - src/components/project/ImageModule.astro
    - src/components/project/ProjectModule.astro
    - src/styles/global.css
    - src/data/project-overrides.json
    - tests/unit/projects-overrides.test.ts
    - tests/unit/project-detail-site.test.ts
    - tests/unit/project-card-view.test.ts
    - tests/unit/projects-order.test.ts
    - tests/unit/project-modules.test.ts
    - tests/unit/picture-format.test.ts
    - tests/unit/motion-tokens.test.ts
    - tests/e2e/navigation-leaks.spec.ts
    - tests/e2e/transitions-capture.spec.ts
    - .planning/phases/07-page-transitions-smooth-scroll/07-VALIDATION.md
decisions:
  - "stack-enter uses longhands only (animation-name, -timing-function, -fill-mode, -timeline, -range), never the shorthand. The built CSS keeps the rule intact; the minifier folds the range to `animation-range: entry`, which is the same as `entry 0% entry 100%`."
  - "Seam rule applied as a measurable test: a moving image is opted out when its top edge continues the module above it (same colour across at least half the seam row, in the reduced state, at 1440 or 390). In those seams the slide exposes a frame-coloured notch inside a continuous field and shifts the slice against its neighbour, which visibly tears the composition."
  - "A whole project gets stackMotion: false when most of its seams tear (InstaBlogs 42/57, Cabrera's 5/5, Reciclick 14/16, Portfolio web 6/9). PuroV (9/21) and Mart (4/12) keep the effect with per-image opt-outs."
  - "Travel stays 7% and the range stays entry 0%-100%; nothing was raised or lowered."
metrics:
  duration: ~2 h 30 min
  completed: 2026-11-02
---

# Phase 7 Plan 09: Detail-Stack Side Entrance Summary

**Read this first:** the effect works as specified, but the taste review found it tears Martina's continuous compositions on most seams of InstaBlogs and Cabrera's (and also Reciclick and Portfolio web). Those four projects are switched off by data (`stackMotion: false`). The side entrance is live only on PuroV (12 moving images) and Mart (8 moving images), whose pages are built from separate panels. All opt-outs are data only and can be reverted per project in `src/data/project-overrides.json`.

Zero-JS CSS scroll-driven side entrance for the detail stack. Each eligible ImageModule image sits in its own `overflow: clip` frame sized by the image's aspect ratio. As the frame enters the viewport, the image slides 7% of its own width in from the left or right (alternating), eased out over `entry 0%`–`entry 100%` of a named `--stack` view timeline, and rests at exactly 0. It runs only under `[data-motion='on']` inside `@supports (animation-timeline: view())`.

## What was built

- **Data layer (Task 1)**
  - `stackMotion: false | string[]` in `OverrideSchema`.
  - `validateOverrides` rejects unknown ids with the message "project-overrides: stackMotion id <key> for <id> matches no image in the snapshot. Fix or remove it in src/data/project-overrides.json". The check runs before the moduleAlt `continue`.
  - `applyOverrides` copies the field: `false`, a fresh id array, or `[]`.
  - `toModuleViews` gives each ImageModule `entrance: 'left' | 'right' | null`. It counts eligible images only (not eager, not opted out, project not off), in DOM order, starting at left, and never resets after a collection, text or embed.
- **Markup (Task 2)**
  - `ProjectModule` passes `entrance={module.entrance}`.
  - `ImageModule` wraps the `<Picture>` in `StackFrame`. A moving image gets `<div class="bg-surface-alt overflow-clip" data-stack-frame style="aspect-ratio: W / H">` inside the existing padding frame, and the img gets `data-stack-enter="left|right"`.
  - A static image renders the unchanged Phase 4/6 markup. No `data-parallax*` is used anywhere.
- **CSS (Task 2)**
  - `[data-stack-frame] { --stack-travel: 7% }` and `--stack-from: ±1` per side.
  - In the gate: `view-timeline: --stack block` on the frame, plus the `stack-enter` longhands on the image.
  - `@keyframes stack-enter` runs from `translate: calc(var(--stack-from) * var(--stack-travel)) 0` to `0 0`.
  - Print: `[data-stack-enter] { animation: none !important; translate: none !important }`.
  - There was no `[data-parallax-frame='stack']` rule to remove (07-08 never added it). The unit test now asserts it is absent.
- **Tests**
  - Unit: schema, validation, applyOverrides, the 5 alternation cases, frame markup (both branches, static unchanged), CSS tokens, longhands-only, gate and print.
  - `stack-entrance.spec.ts`: alternation and a real scroll-linked `stack-enter` animation (via `getAnimations()`, timeline is not a `DocumentTimeline`); scrubbed offsets (entering < -20 / > +20 px, monotonic, settled ≤ 0.5 px); seamless stack and frame = image height at 3 positions; equal stack height on vs reduced at 1440 and 390; no horizontal overflow; eager, collections, embeds and text never move; Pixel 7 touch; still under reduced, off, a live toggle and print; arrival hold coexistence (offsets equal under `data-vt` and after release, `view-transition-name: none`, one animation per image after a soft navigation).
  - Leak spec: `stackAnimations === stackElements` next to the unchanged parallax line.

## Task commits

| Task | Commit | Message |
|---|---|---|
| 1 RED | 3d6aced | test(07-09): add failing stack opt-out tests |
| 1 GREEN | 3a03c71 | feat(07-09): add stack motion opt-out and sides |
| 2 RED | 6d35dd8 | test(07-09): add failing stack entrance e2e |
| 2 GREEN | 0ff65e8 | feat(07-09): slide detail images in from sides |
| 3 | 172eb8d | feat(07-09): review stack seams and opt out |

## Verification

- `pnpm lint` (astro check 0 errors, eslint, prettier) is clean. `pnpm test`: 70 files and 1235 tests pass. `pnpm build` passes.
- e2e uses a scratch config on port 4471 (outside the repo, `@network` excluded).
  - RED: 14 of 14 stack-entrance cases failed, and 7 unit cases failed.
  - GREEN, before the opt-outs: stack-entrance, project-detail, parallax, transitions and navigation-leaks all passed (268 tests).
  - After the opt-outs: the same list again (one gap-check fix, see deviations), then stack-entrance 14/14.
- Built CSS (`dist/client/_astro/*.css`):

  ```
  [data-motion=on] [data-stack-frame] [data-stack-enter]{animation-name:stack-enter;animation-timing-function:var(--ease-reveal);animation-fill-mode:both;animation-timeline:--stack;animation-range:entry}
  ```

  The rule sits inside `@supports (animation-timeline:view())`, and the e2e confirms the animation actually runs.
- Scroll padding (correction 4): the view timeline honours the root `scroll-padding-top` (80/96 px).
  - A frame taller than the scrollport settles when its top clears the sticky header.
  - A shorter frame settles when it is fully visible.
  - Both read as intended: the image is at rest by the time its whole top edge is readable.
- Acceptance greps: `data-stack-frame` 1, `aspect-ratio` 1, `entrance={module.entrance}` 1, `data-parallax` 0 in ImageModule and CollectionModule, `data-stack` 0 in CollectionModule, `@keyframes stack-enter` 1, `data-parallax-frame='stack'` 0. No `ease-in`, `transition-all`, `display:none` or `visibility:hidden`. The parallax leak line is unchanged. `--stack-travel: 7%` appears once.

## Taste-skill seam review (SKILL.md, references/motion.md, references/critique.md)

This was run as "a component or a single section" (no draw step, house rules and laws applied).

- **lint.mjs** (`src/styles src/components/project`, 12 files): 0 FAIL, 0 WARN.
- **Captures:** `CAPTURE_TRANSITIONS=1`. Item "7 stack seams" saved 672 PNGs in `.taste-skill/transitions/` (gitignored), named `07-stack-<slug>-seam<N>-<entering|mid|settled>-<1440|390>.png`, where N is the lower module's stack index.
  - Before the opt-outs, every seam between two ImageModules with at least one moving image was captured for InstaBlogs, Cabrera's, Portfolio web, Reciclick, PuroV and Mart.
  - PuroV and Mart were captured again after the opt-outs.
  - Seams captured:
    - InstaBlogs: 1, 2, 6–8, 11–59
    - Cabrera's: 1–5
    - Portfolio web: 1–8
    - Reciclick: 1–16
    - PuroV after opt-outs: 1–4, 7–14, 17–22
    - Mart after opt-outs: 1, 2, 4–12
- **Method:**
  - I looked at full-stack screenshots of every project in the reduced state, plus the seam captures (full size for representative seams, contact sheets for the rest).
  - I then measured seam continuity: a 6 px band across the top edge of each moving image, in the reduced state at 1440 and 390, comparing the row above the seam with the row below.
  - Seams where the field continues were confirmed visually as tears:
    - Cabrera's seam 2 entering: a beige 78 px notch cut into the continuous red field.
    - InstaBlogs seam 13 mid: a notch and a sliver in the continuous yellow footer field.
    - Mart seam 2 entering: a notch in the continuous blue intro field.
    - PuroV seam 4 entering: a notch in the cream pattern field.
  - Seams with a natural edge read as an entrance and are kept:
    - PuroV seam 3: the palette bar slides in under the sign photo.
    - InstaBlogs seam 11: the homepage mockup slides in under its label strip.
  - No text is cropped at the settled position in any capture (offset 0, also asserted in the e2e).
- **Verdicts per seam** (keep = slide kept; opt-out = image listed or project off). The numbers are the moving image's stack index, which equals the capture's seam N.

| Project | Verdict | Seams that tear | Kept seams |
|---|---|---|---|
| InstaBlogs (176799549) | `stackMotion: false` | 42/57: 1, 2, 5, 6, 8, 10, 12–14, 16–18, 20–22, 24–26, 28–30, 32, 34–36, 38–40, 42, 44, 46–48, 50, 51, 53–59 | none (project off) |
| Cabrera's (238078789) | `stackMotion: false` | 5/5: 1–5 (one continuous red field) | none (project off) |
| Reciclick (226450035) | `stackMotion: false` | 14/16: 2–9, 11–16 | none (project off) |
| Portfolio web (202447185) | `stackMotion: false` | 6/9: 1–4, 8, 11 | none (project off) |
| PuroV (227934855) | 9 ids | 2, 4, 5, 6, 8, 11, 13, 20, 22 | 1, 3, 7, 9, 10, 12, 14, 16–19, 21 |
| Mart (172473551) | 4 ids | 2, 3, 8, 12 | 1, 4–7, 9–11 |

- **inspect.mjs** (preview on 4472, output in `.taste-skill/inspect-07-09/`, gitignored):

| URL | Result |
|---|---|
| `/projects/cabreras-motos-posts/` | 0 FAIL, 5 WARN. `still-page` 14 moving (Phase 6: 13/13/14), not regressed. Same accepted WARNs. |
| `/es/projects/website-instablogs/` | 1 FAIL `still-page` (6 moving; Phase 6: 5/5/5, the accepted artefact) + same 4 WARNs. Not regressed. |
| `/projects/website-instablogs/` | 1 FAIL `still-page` (6 moving; Phase 6: 5/5/5, the accepted artefact) + WARN `hairline`, `palette-cream`, `first-action`, `no-footage` (all accepted in Phase 6). Not regressed. The first run printed no report on this 45,800 px page; a re-run completed. |

  No `overflow`, `clipped-text` or `empty-screens` code was reported on the pages measured.
- **Critique:**
  - The effect is gentle and correct where panels are discrete (PuroV, Mart at 390 mid and 1440 entering).
  - It is unusable on Martina's long sliced web-design artboards: InstaBlogs, Reciclick, Portfolio web, and the Cabrera's red field.
  - The frame notch is inherent to a one-way slide with no overscan. Per D-11a, I did not compensate with travel or range.

## Opt-outs added (for user review)

All are in `src/data/project-overrides.json`. Image ids come from the committed snapshot (`src/data/behance/snapshot.json`, `projects[].content[].image.id`), mapped in DOM order.

- **InstaBlogs** `"stackMotion": false`. 42 of 57 seams continue one yellow/white artboard (mockups and section bands sliced across images).
- **Cabrera's Motos** `"stackMotion": false`. All 5 moving images share one continuous red field, and the slide cuts a beige notch into it.
- **Reciclick** `"stackMotion": false`. 14 of 16 seams continue the green and grey artboard with curves crossing seams.
- **Portfolio web** `"stackMotion": false`. 6 of 9 seams continue the yellow/cream landing artboard.
- **PuroV** `["1308199821", "1449250379", "1449250367", "1449250363", "1450079097", "1449250373", "1449250359", "1450083063", "1308206629"]`. Each of these continues the cream, green or orange field of the panel above it.
- **Mart** `["1237399189", "1077690335", "1077686211", "1282321591"]`. Each of these continues the blue, white or grey field above it.

Final travel is 7% and the final range is `entry 0%` to `entry 100%`; neither was changed.

## Deviations from Plan

### Orchestrator corrections (applied)

**1. CSS longhands only (correction 1)**
- `stack-enter` is written as longhands, not "shorthand then timeline" as in the plan text.
- I verified it in the built CSS, and the e2e asserts one scroll-linked `stack-enter` animation per moving image.

**2. Reused the 07-08 DocumentTimeline wait filters (correction 2)**
- No duplicate helpers.

**3. 07-VALIDATION.md rows 07-09-T1/T2 updated (correction 3)**
- They now name stackMotion, entrance and stack-entrance.spec.ts.

### Auto-fixed issues

**1. [Rule 3 - Blocking] Duplicated `<Picture>` broke the picture-format guard**
- **Found during:** Task 2 GREEN.
- **Issue:** Inline conditional wrappers made 8 `<Picture>` calls, but `picture-format.test` expects 6.
- **Fix:** A new `StackFrame.astro` (a file not in the plan) renders the slot alone when static, or wraps it in the clip frame. ImageModule keeps its two `<Picture>` calls, and the static markup is unchanged.
- **Commit:** 0ff65e8

**2. [Rule 1 - Test] The arrival-hold sample at `ready` read 0**
- **Issue:** At `transition.ready` the new view timelines have not been sampled yet, so offsets read 0 for one frame, under the ink panel. Two frames later, still under `data-vt`, they equal the released values.
- **Fix:** The test samples two frames after `ready`, while `data-vt` is still present.
- **Commit:** 0ff65e8

**3. [Rule 1 - Test] The seamless gap check hit the TextModule reveal translate**
- **Issue:** After the opt-outs the subject became PuroV, whose TextModule settles in with a Phase 6 `data-reveal` translate (20 px).
- **Fix:** Pairs that touch a `[data-reveal]` module are skipped in the gap check. Image seams are still checked.
- **Commit:** 172eb8d

**4. Leak count coverage moved**
- The leak spec's detail page (InstaBlogs) is now opted out, so its `stack-enter` assertion is 0 = 0 there. It was also trivially green at RED for the same reason.
- To keep the contract covered on a page that moves, the stack-entrance hold test asserts exactly one `stack-enter` animation per moving image after a soft navigation.

**5. Plan file reference**
- The plan lists `picture-format.test.ts` L116 as an ImageModule fixture. It is a ProjectCard fixture, so only L91 got `entrance: null`.

## Known Stubs

None.

## Threat Flags

None. T-07-23 is mitigated (strict schema plus the unknown-id check, both unit tested). T-07-25 and T-07-26 are mitigated (one-way 7% travel, 'on' only, clip frames; e2e covers the still states, overflow and stack height).

## Self-Check: PASSED

- FOUND: src/components/project/StackFrame.astro, tests/e2e/stack-entrance.spec.ts, `@keyframes stack-enter` in src/styles/global.css, `stackMotion` in src/data/project-overrides.json
- FOUND commits: 3d6aced, 3a03c71, 6d35dd8, 0ff65e8, 172eb8d
- inspect.mjs results recorded for all three required URLs.
