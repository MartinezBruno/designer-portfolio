---
phase: 04-project-detail-discovery
plan: 12
subsystem: images
tags: [gap-closure, images, astro-assets, picture, webp, avif, measurements, taste]
requires: [04-11]
provides:
  - src/lib/ui/picture-format.ts (single Picture format policy, AVIF source + WebP img fallback)
  - tests/unit/picture-format.test.ts (policy, call-site and rendered-markup guard)
affects: [dist size, cold build, 04-VERIFICATION known gap (PNG fallback weight)]
tech-stack:
  added: []
  patterns:
    - "Shared prop object spread onto <Picture> ({...pictureFormat}) instead of per-call-site formats"
key-files:
  created:
    - src/lib/ui/picture-format.ts
    - tests/unit/picture-format.test.ts
  modified:
    - src/components/project/ImageModule.astro
    - src/components/project/CollectionModule.astro
    - src/components/project/NextProjectTeaser.astro
    - src/components/ui/ProjectCard.astro
    - src/components/sections/Hero.astro
    - tests/e2e/home.spec.ts
decisions:
  - "Picture policy is formats ['avif'] + fallbackFormat 'webp' (one AVIF source, WebP img); WebP keeps alpha for the round hero portrait"
  - "Cold build wall time is load-dominated on this machine; reported as 3 alternating runs per side, no wall-time improvement claimed"
metrics:
  duration: ~16 min (2026-10-19 13:02Z to 13:18Z)
  completed: 2026-10-19
---

# Phase 4 Plan 12: WebP Picture Fallback Summary

All six `<Picture>` call sites now spread one shared policy, `{ formats: ['avif'], fallbackFormat: 'webp' }`. A cold `pnpm build:offline` emits 0 PNG files, down from 457. `du -sk dist` went from 211,484 KiB to 35,172 KiB, which is -176,312 KiB or about -83%. AVIF, WebP and JPG outputs are identical in count and size.

## Format decision and evidence

- Astro 7.4 `Picture.astro` sets `defaultFallbackFormat = 'png'` for PNG and WebP sources. Every module image (committed WebP) and the hero portrait (PNG) therefore got a PNG `<img>` at every width.
- The fix is `formats: ['avif']` plus `fallbackFormat: 'webp'`. The markup is one `<source type="image/avif">` and an `<img>` whose `src`/`srcset` are WebP. The redundant WebP `<source>` is gone.
- **[Verified by measurement]** WebP output is unchanged: 457 files / 19.8 MiB before and after. Each WebP is now encoded once per width as the `<img>`, so the plan's inference held.
- **[Verified by curl on preview]** The hero on `/` serves one `source[type=image/avif]` and `img src=/_astro/portrait.RtVae4IC_ZT4bSK.webp`.
- WebP keeps alpha. The hero portrait still renders as a round crop on the page ground, with no square backing (screenshots below).
- The OG image (`getImage(... format: 'jpg')`) is unchanged: 7 files / 0.5 MiB before and after.

## Measurements

All runs are on the same machine and the same worktree. Each cold run is `rm -rf node_modules/.astro dist` followed by `/usr/bin/time -p pnpm build:offline`. MB values are `stat -f%z` sums divided by 1048576, so they are MiB. 04-11 reported `du -sh` (244 MB); its numbers are context only.

Baseline: HEAD `0878a28`, before any source change (Task 1, `tmp/04-12-baseline.md`).
After: commit `2c29b4c`, first cold build after the change.

| Metric                                  | Baseline                                           | After                          | Delta                     |
| --------------------------------------- | -------------------------------------------------- | ------------------------------ | ------------------------- |
| Cold build `real` (first run each)      | 60.30 s                                            | 132.02 s                       | +71.72 s (see note)       |
| Cold build `real`, median of 3          | 71.50 s (60.30 / 75.89 / 71.50)                    | 80.32 s (132.02 / 69.03 / 80.32) | +8.82 s (within noise)  |
| Cold build `user` CPU, median of 3      | 550.86 s (454.38 / 553.57 / 550.86)                | 499.95 s (485.96 / 499.95 / 555.59) | -50.91 s             |
| Images optimized by Astro               | 1378                                               | 921                            | -457                      |
| Astro image-optimization line (run 1)   | "generating optimized images" 1378, done in 55.91s | 921, done in 2m 11s            | see note                  |
| `du -sk dist`                           | 211,484                                            | 35,172                         | -176,312 KiB (-83.4%)     |
| `du -sh dist`                           | 207M                                               | 34M                            | -173M                     |
| Files in dist                           | 1426                                               | 969                            | -457                      |
| PNG                                     | 457 files, 171.2 MiB                               | 0 files, 0.0 MiB               | -457 files, -171.2 MiB    |
| WebP                                    | 457 files, 19.8 MiB                                | 457 files, 19.8 MiB            | 0, 0.0 MiB                |
| AVIF                                    | 457 files, 11.5 MiB                                | 457 files, 11.5 MiB            | 0                         |
| JPG (OG images)                         | 7 files, 0.5 MiB                                   | 7 files, 0.5 MiB               | 0                         |
| Largest PNG                             | 7,174,171 B `dist/_astro/1082499147-d04fcd1172d4.DXUNZ3vi_14N2Hq.png` | none          | -                         |
| PNG refs in HTML `src`/`srcset`         | 686                                                | 0                              | -686                      |

**Cold build time note (finding, not hidden).** The first after-run took 132.02 s, against 60.30 s for the baseline. User CPU was almost unchanged (486 s vs 454 s), so the extra wall time was waiting, not encoding. `uptime` then showed a load average of about 21 on 10 cores: xcodebuild and sibling worktree agents were running. I re-ran both configurations alternately (baseline, after, baseline) and logged the load for each run, which stayed between 18 and 29. For the baseline-equivalent reruns I temporarily set the policy to `formats: ['avif','webp'], fallbackFormat: 'png'`, which reproduces the original markup and the original 457 PNGs, then reverted it. The tree was verified clean afterwards and none of that state was committed.
- With 3 runs per side, the medians are 71.50 s vs 80.32 s wall and 550.86 s vs 499.95 s user CPU. Under this load the wall-time difference is within run-to-run noise (spread of 15 to 63 s per side), so **no wall-time improvement or regression can be claimed from these numbers**. The measurable effect is 457 fewer images encoded and about 51 s less median CPU.
- `du -sk dist` depends on APFS allocation. A non-cold `pnpm build:offline` after `pnpm verify` produced the same 969 files but showed 40,036 KiB, with an apparent size (`du -A`) of 33,455 KiB (33,965,123 bytes). The cold-run values (35,172 after, three times; 211,484 / 212,392 / 211,484 baseline) are the comparable ones.

## Gate results

- `pnpm verify`: exit 0
  - astro check: 0 errors / 0 warnings / 0 hints; eslint and prettier clean
  - vitest: 43 files, 652/652 passing (04-11: 42 files / 648, plus the 4 new guard tests)
  - playwright: 459/459 passing (hero test renamed to "hero picture offers an avif source and a webp img")
  - secrets: ok (969 dist files scanned)
- `pnpm build:offline` (after verify): exit 0, "offline build ok (0 network attempts, 45 text files scanned, 20 html)"
- Task 2 acceptance greps: `formats={` in src .astro = 0; `{...pictureFormat}` = 6; files with `<Picture` = 5; `fallbackFormat: 'webp'` = 1 line; `formats: ['avif']` = 1 line; no `any`/`unknown` in code lines; e2e `source[type="image/webp"]` has `toHaveCount(0)`.

## TDD Gate Compliance

- RED: `test(04-12): add picture format guard` (`49c112d`). `pnpm vitest run tests/unit/picture-format.test.ts` failed because `src/lib/ui/picture-format` did not exist.
- GREEN: `fix(04-12): switch picture fallback to webp` (`2c29b4c`), 41/41 in the four unit files listed in the plan.
- Mutation check (not committed): temporarily setting `fallbackFormat: 'png'` made both render tests fail on `expected '/_image?href=…' to match /[?&;]f=webp\b/`. The render guard therefore checks the `f=` format parameter, not the `portrait.png` file name in `href`.
- The GREEN commit uses type `fix` instead of `feat`, as the plan prescribes, because this is gap closure.

## Taste

The skill was loaded from `~/.claude/plugins/marketplaces/taste-skill/skills/taste-skill` (SKILL.md and references/critique.md read). It is the `TASTE` path resolved as in 04-01.

**lint.mjs** (`src/components src/pages src/lib/ui/picture-format.ts`, 41 files): 1 FAIL `hairline` at `src/components/global/SiteHeader.astro:28`, 1 WARN `outlined-box` at `src/components/sections/ToolsRow.astro:21`. This is identical to the 04-11 baseline. There are no findings in `picture-format.ts` or in the 5 edited `.astro` files.

**inspect.mjs** (against `pnpm preview` on this worktree's dist, port 4322):
- `/`: FAIL `icon-cards`, `still-page`; WARN `hairline`, `palette-cream`, `no-footage`. No `broken-image`.
- `/projects/website-instablogs/`: FAIL `still-page`; WARN `hairline`, `palette-cream`, `first-action`, `no-footage`. No `broken-image`. 86 images measured, hero media 60% img. All codes are on the 04-11 accepted list.
- `icon-cards` on `/` is outside the 04-11 accepted list only because 04-11 inspected detail pages and never `/`. It was already recorded on `/` in 03-09-SUMMARY ("FAIL icon-cards, still-page, empty-screens") and 03-UI-SPEC ("`icon-cards` (Phase 2 services)"). It comes from the services cards and is unrelated to the image encoding. It is reported here, not fixed (out of scope).
- `broken-image` count in both `report.json` files: 0.

**Screenshot critique** (scope: did the format change break imagery; full-page scoring is unchanged from 04-11 because no layout, type or colour changed):

```
ROUND 1 (regression check only)
Seen in one second: "/": the "Hi, I'm Martina." headline and the round portrait; detail: the InstaBlogs yellow device mockup.
Idea (one sentence): unchanged from 04-11 (content-first detail pages); not re-scored.
Live thing: unchanged (embed facade on portfolio-web).
Layout words by section: unchanged from 04-11.
Scores: not re-scored; no visual delta to score.
Caps applied: still-page (pre-existing, motion is Phases 6-7).
Top three problems relevant to this plan:
1. None from the format change. Hero portrait (desktop-fold, tablet-fold, mobile-fold of /) is still a round crop on the cream ground with clean transparent edges; no square box, no matte.
2. Card covers on / (desktop-page-01: Cabrera's Motos, PuroV, Reciclick) and InstaBlogs modules (desktop-fold, desktop-page-02, tablet-page-01, mobile-fold) are present and sharp; text in the mockups (LB marks, button labels) reads cleanly.
3. No layout shift or empty slot at 1440/768/390: module stacks run seamless, no grey boxes or collapsed heights.
```

Chromium loads the AVIF `<source>`, so these pixels are the same AVIF files as in 04-11 (AVIF output is byte-for-byte equal in count and size). The WebP `<img>` is only used by browsers without AVIF; that path is covered by the unit render guard and the e2e `img src` assertion, not by the screenshots.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Preview port 4321 was occupied**
- **Found during:** Task 3 step 5b
- **Issue:** `pnpm preview --port 4321` started on 4322 because 4321 was taken by the main checkout's dev server, which serves `/_image?href=...` dev URLs from a different tree. Inspecting 4321 would have measured the wrong build.
- **Fix:** ran inspect.mjs against `http://localhost:4322/`, after checking with curl that 4322 serves this worktree's dist (AVIF source + `.webp` hero img). The server was stopped with `astro preview stop`.
- **Files modified:** none

**2. [Rule 1 - Formatting] Prettier reformatted the new guard test**
- **Found during:** Task 2 `pnpm lint`
- **Fix:** `prettier --write tests/unit/picture-format.test.ts`, included in the GREEN commit `2c29b4c`.

**3. [Measurement method] Extra cold-build runs**
- The plan asked for one cold build per side. Because of the heavy machine load, I added two alternating runs per side so the wall-time comparison would not rest on one noisy pair. The baseline-equivalent reruns used a temporary, uncommitted policy value that reproduces the original output (457 PNG, same `du -sk`). Task 1's baseline remains the real HEAD `0878a28` build.
- I also passed `src/lib/ui/picture-format.ts` to lint.mjs in addition to `src/components src/pages`, so the new file was scanned too.

### Pre-existing findings (not fixed, out of scope)

- taste inspect `icon-cards` on `/` (Phase 2 services cards), as explained above.

## Known Stubs

None.

## Gap status

**Closed.** The 04-VERIFICATION known gap "PNG `<Picture>` fallbacks weigh 205 MB of the 244 MB dist" is resolved by measurement. A cold `pnpm build:offline` emits 0 PNG files (was 457 / 171.2 MiB on this machine). The HTML has 0 PNG references (was 686). `du -sk dist` dropped from 211,484 to 35,172 KiB (-83.4%). AVIF, WebP and JPG output are unchanged. The cold build wall time showed no measurable change under the current machine load, and that is recorded as is.

## Commits

- `49c112d` test(04-12): add picture format guard
- `2c29b4c` fix(04-12): switch picture fallback to webp

## Self-Check: PASSED

- FOUND: src/lib/ui/picture-format.ts, tests/unit/picture-format.test.ts
- FOUND commits: 49c112d, 2c29b4c
- dist PNG count after final build:offline: 0
