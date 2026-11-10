---
phase: 09-portfolio-features-hero-full-width-on-mobile-photography-ser
plan: 01
subsystem: home-hero
tags: [hero, responsive-images, mobile, taste-gate]
requires: []
provides:
  - "Full-width 4:5 phone hero arch (HOME-09)"
  - "Hero srcset 256/448/640/768/1024 with phone sizes calc(100vw - 2rem)"
affects:
  - "09-02 (owns scripts/spanish-review.ts item text for Hero.astro:10)"
  - "09-08 (Home LCP re-measure against the new phone candidate)"
tech-stack:
  added: []
  patterns:
    - "Phone-first arch: w-full + aspect-[4/5] + 40% vertical radius, sm: restores the prior 3:4 geometry"
    - "srcset candidate test reads the w descriptor of currentSrc, since naturalWidth is density-corrected"
key-files:
  created: []
  modified:
    - src/components/sections/Hero.astro
    - tests/e2e/home.spec.ts
decisions:
  - "Phone top padding stays pt-10: the 390x844 first screen shows both headline lines, so the pt-6 fallback was not applied"
  - "portrait.png left untouched: the D-05 hair-rim check at DPR 3 found no halo or fringe"
  - "Home empty-screens FAIL at 1440 is the pre-existing 08-13/08-15 baseline (desktop unchanged by this plan), not attributed here"
metrics:
  duration: "~25 min"
  completed: 2026-11-10
  tasks: 2
  files: 2
requirements: [HOME-09]
---

# Phase 9 Plan 01: Full-width phone hero arch Summary

Below 640px the Home hero portrait is now a full-width 4:5 arch on the accent ground: 358x448 at 390px, with a true semicircle top (40% vertical radius) and 20px bottom corners. At sm and up it looks exactly as before. The srcset now runs 256/448/640/768/1024 with phone `sizes` of `calc(100vw - 2rem)`, so a 412px phone at DPR 1.75 loads the 768w AVIF.

## Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Full-width 4:5 phone arch, phone-sized srcset, geometry tests | 5429580 | src/components/sections/Hero.astro, tests/e2e/home.spec.ts |
| 2 | Taste gate and D-05 hair-rim check on / and /es/ | (no file changes; evidence below) | none |

### Task 1 details
- Hero.astro: `w-32` became `w-full`. The radius is now `40%_40%` at the base and `sm:` restores `37.5%_37.5%`. Aspect is `aspect-[4/5] sm:aspect-[3/4]`. Widths are `[256, 448, 640, 768, 1024]`, and the last `sizes` slot is `calc(100vw - 2rem)`. The HTML comment was updated. Line 10 still holds the TODO(martina), now reading `>=1600px-wide original would sharpen the 3x phone render`. `scripts/spanish-review.ts` was not touched; plan 09-02 owns it.
- home.spec.ts: `expectArch(page, width, { boxWidth, ratio, topRadius })` covers 375 (343, 4:5, `50% 40%`), 390 (358, 4:5), 640 (176, 3:4, `50% 37.5%`) and 1280 (256, 3:4). Reduced motion uses the 375 values. A new 412x915 DPR 1.75 test checks that the AVIF srcset lists 256/448/640/768/1024w and that the `currentSrc` candidate is at least 665w.
- Verification: `pnpm lint` passed (0 errors in astro check, eslint and prettier). `pnpm test` passed (72 files, 1323 tests), including `spanish-review.test.ts` (9/9, so the line pin is intact). After `pnpm build`, home, motion-hero, smooth-scroll, contact-lazy and anchors specs ran 79/79 green once the test fix below was in. home.spec alone ran 26/26.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Srcset candidate test first read `naturalWidth`**
- **Found during:** Task 1
- **Issue:** For a srcset image, `naturalWidth` is density-corrected to the `sizes` slot. It returned 380, even though the 768w file was loaded.
- **Fix:** The test now maps each AVIF srcset URL to its `w` descriptor and asserts that `currentSrc`'s descriptor is at least 665. It loads `portrait.BrseJGMn_ZjPMM8.avif`, which is the 1024w candidate in the Playwright run. (The plan expected 768w; Chromium picked 1024w, which still meets ">= 665".)
- **Files modified:** tests/e2e/home.spec.ts
- **Commit:** 5429580

**2. [Rule 3 - Blocking] TDZ on the arch case table**
- The `archCases` const was first placed after the describe blocks that read it at collection time. It was moved to the top of the file before the first run.

Note: the Skill tool was not available in this executor's toolset. The taste-skill `SKILL.md` and `references/critique.md` were read directly, and `lint.mjs` and `inspect.mjs` were run as the skill specifies.

## Taste gate (Task 2)

**Lock:** `/Users/bmartinez/Developer/personal/designer-portfolio/tmp/build-e2e.lock` was acquired cleanly (no stale lock), held through build, e2e, preview and inspect, then released after the preview (pid on port 4411) was stopped.

**lint.mjs** `src/components/sections/Hero.astro`: `RESULT: 0 FAIL, 0 WARN`.

**inspect.mjs** (preview on port 4411, widths 1440/768/390):

| Page | Result | Versus baseline |
| ---- | ------ | --------------- |
| `/` | FAIL `empty-screens` @1440 (screens 2, 3); WARN `size-count` (11), `first-action`, `no-footage` | Identical to 08-13 and 08-15. Desktop is unchanged by this plan, and screens 2-3 are below the hero. Pre-existing, not attributed. |
| `/es/` | Same set | Identical to 08-13 and 08-15 |

Screenshots (gitignored, in the worktree):
- `.taste-skill/inspect-09-01-en/{desktop-fold,desktop-page-01,desktop-page-02,tablet-fold,tablet-page-01,mobile-fold,mobile-page-01,mobile-page-02}.jpg`
- `.taste-skill/inspect-09-01-es/` (same set)
- `.taste-skill/rim-09-01/rim-{en,es}-{full,top,left,right}.png` (DPR 3 captures at 390px), `motion-mid.png`, `motion-end.png`

**Screenshot review:**
- 390 `/` and `/es/`: the arch fills the column (16px gutters) with a true semicircle top on the blue ground. Both headline lines ("Hi, I'm / Martina." and "Hola, soy / Martina.") fit inside the 390x844 first screen, so the `pt-6` fallback was not needed. The lead starts at the bottom of the fold. The CTA sits below the first screen, which is the UI-SPEC "Accepted trade-off"; the crop was not changed to fix it.
- 768 and 1440: the portrait is the same 176px and 304px 3:4 arch as before. No regression.
- Motion: a no-preference replay at 390 showed the shutter unmask mid-reveal (bottom-up, inside the arch) and finished with `clip-path: none`, no running animations, width 358.

**D-05 hair rim: PASS.** DPR 3 crops of the top, left and right hair edges at the 390px render (so 3x device pixels, at least 200% zoom against CSS px) show dark hair meeting flat `#0f70b7`, with no light halo or fringe pixels, on both `/` and `/es/`. `src/assets/hero/portrait.png` is untouched (still 1200 x 1600 RGBA). No CSS filter was added.

**Critique:**

```
ROUND 1
Seen in one second: Martina's face in a big blue arch (phone); the "Hi, I'm Martina." headline (desktop).
Idea (one sentence): Her own portrait becomes the arch-on-blue brand mark that opens the page (sketch 001).
Live thing: Not in scope for this plan (the hero change only).
Layout words by section: hero=stacked portrait-then-headline (phone) / split (desktop) / marquee=band / rest unchanged
Scores: design 7.5 · usability 8 · creativity 7 · content 8 → overall 7.6
Caps applied: inspect FAIL empty-screens on Home @1440 (pre-existing) caps overall at 6.0 for the page as a whole; the hero change itself adds no FAIL or WARN.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. The phone first screen has no button (mobile-fold.jpg). The CTA sits below the lead. This is the UI-SPEC accepted trade-off, so it is not changed here.
2. The desktop screens 2-3 empty-screens FAIL (desktop-page-01.jpg) predates this plan and is tracked from 08-13. Out of scope.
3. The largest candidate is 1024w (capped by T-09-01; the source is 1200w), but a 390px phone at DPR 3 wants about 1074px, so the 3x render is slightly soft (rim-en-full.png). The TODO(martina) on line 10 asks for a >=1600px original.
```

## Threat surface

T-09-01 is mitigated as planned: widths are capped at 1024 (no 1200 candidate) and phone `sizes` is `calc(100vw - 2rem)`. The Home LCP re-measure is in 09-08. No new surface.

## Known Stubs

None. The line-10 `TODO(martina)` is the existing tracked non-copy item (asset request), not a stub.

## Self-Check: PASSED
- FOUND: src/components/sections/Hero.astro (widths, calc(100vw - 2rem), aspect-[4/5] sm:aspect-[3/4], 40%_40% each once; w-32 absent; line 10 contains TODO(martina) and 1600px)
- FOUND: tests/e2e/home.spec.ts (contains `currentSrc` and `'50% 40%'`)
- FOUND: commit 5429580
