---
phase: 08-quality-verification
plan: 15
subsystem: motion/hero
tags: [perf, lcp, hero, motion, gap-closure]
requires: ["08-14"]
provides: ["L1: translate-only hero lead entrance (hero-lead-slide)"]
affects: [src/styles/global.css, tests/e2e/motion-hero.spec.ts]
tech-stack:
  added: []
  patterns: ["LCP text never animates opacity; entrance is translate-only"]
key-files:
  created: []
  modified: [src/styles/global.css, tests/e2e/motion-hero.spec.ts]
decisions:
  - "Hero lead uses translate-only hero-lead-slide (16px, --t-settle, --ease-reveal, 200ms); CTA keeps hero-settle (08-14 lever L1)"
  - "No other global.css lever: 08-14 assigned only L1 to 08-15 (L5 rejected, no unused-CSS block)"
  - "Taste review kept the 16px / 200ms values; no travel or delay adjustment"
metrics:
  duration: "~75 min (about 18 min of it the e2e run under parallel load)"
  completed: 2026-11-09
  tasks: 2
  files: 2
requirements: [QUAL-01]
---

# Phase 8 Plan 15: Slide-only Hero Lead (L1) Summary

The Home LCP text `p[data-hero-lead]` now has opacity 1 from its first frame and only slides 16px into place (`hero-lead-slide`). In an informational 3-run check, Home simulated LCP was 1,208 ms (median), down from the 3,473 ms baseline. Observed LCP was about 60 ms.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Slide-only lead entrance (L1) and frame-0 tests | 082c1a5 | src/styles/global.css, tests/e2e/motion-hero.spec.ts |
| 2 | Taste gate and informational Home Lighthouse | none (no tracked change; evidence is in the gitignored `.taste-skill/08-15/` and `tmp/lighthouse/`) | none |

### Task 1
- `@keyframes hero-lead-slide { from { translate: 0 16px } to { translate: none } }` sits next to `hero-settle`. The `[data-hero-lead]` rule now uses `animation: hero-lead-slide var(--t-settle) var(--ease-reveal) 200ms both`. `[data-hero-cta]` still uses `hero-settle`. The `html[data-vt]` paused-hold rule is unchanged and still lists `[data-hero-lead]`. The comment above the keyframes now says the lead never starts transparent and cites the 08-LIGHTHOUSE.md Miss 1 sign-off and L1.
- global.css diff: only the L1 change (rule, keyframe, comment). 08-14 "Chosen levers" assigns only L1 to 08-15.
- motion-hero.spec.ts:
  - 'the first frame is never blank' now also returns `leadOpacity` at frame 0 and asserts '1'.
  - New test '/ hero lead is fully opaque at 50 ms' asserts opacity '1' and that the lead is still moving (translate not `none`), or that `data-hero-played` is already set.
- Verify results:
  - `pnpm lint`: 0 errors, 0 warnings, Prettier clean.
  - `pnpm build`: ok.
  - Playwright (E2E_OFFLINE=1, under the shared port-4400 lock) on motion-hero, home, transitions, motion-states, smooth-scroll, anchors, contact-lazy and a11y, plus motion-reveal (project memory): 166 passed, 32 skipped, 3 failed. All 3 failures were motion-reveal "split headings" tests on /projects/ and the detail page (`.split-line-mask` not attached within 1,500 ms). The run took 18.1 min while the parallel 08-16 executor was also running Playwright.
  - Re-running `motion-reveal.spec.ts -g "split headings"`: 16/16 passed. [Inference] These were load timeouts unrelated to the hero: they are on pages without a hero, and the change is limited to the `[data-hero-lead]` rule.

### Task 2: taste gate
- `lint.mjs src/styles/global.css src/components/sections`: 6 files, **0 FAIL, 0 WARN**.
- `inspect.mjs` against preview port 4494, `--widths 1440,390`:

| Page | Width | Findings | Against 08-TASTE-REPORT |
|------|-------|----------|-------------------------|
| `/` | 1440 | FAIL `empty-screens` (screens 2, 3; fills 0.44 / 0.10 / 0.14 / 0.53 / 0.28 / 0.58), WARN `size-count` (11), `first-action`, `no-footage` | size-count, first-action and no-footage are the same as 08-07. empty-screens appeared on ES in 08-07 and is the accepted Phase 3 Home code. In 08-07, EN screen 3 sat at the 0.20 edge and did not trigger it. Screens 2 and 3 are below the hero, so the lead entrance cannot change their fill. [Inference] Not attributable to this plan |
| `/` | 390 | WARN `first-action` | same |
| `/es/` | 1440 | FAIL `empty-screens` (screens 2, 3), WARN `size-count`, `first-action`, `no-footage` | same as 08-07 row 2 |
| `/es/` | 390 | WARN `first-action` | same |

No new FAIL code is attributable to the lead entrance. Inspect screenshots: `.taste-skill/08-15/en-home/{desktop,mobile}-{fold,page-01,page-02}.jpg`, `.taste-skill/08-15/es-home/` (same set).

- Frame-0 and 300 ms captures (all `hero-*` animations paused at currentTime 0 or 300). In every capture the lead's computed opacity is '1'. Its translate is `0px 16px` at frame 0 and `0px 5.98px` at 300 ms:
  - `.taste-skill/08-15/en-390-t0.png`, `en-390-t300.png`, `en-1440-t0.png`, `en-1440-t300.png`
  - `.taste-skill/08-15/es-390-t0.png`, `es-390-t300.png`, `es-1440-t0.png`, `es-1440-t300.png`
- Review (I viewed en-1440 t0/t300 and es-390 t0/t300):
  - Frame 0: the headline is partly risen in its masks, the portrait is 35% open, the lead sits 16px low at full ink, and the CTA is absent.
  - 300 ms: the headline is almost settled, the lead has about 6px to go, and the CTA is fading in.
  - The lead reads as the steady text anchor of the staggered entrance (the display type and portrait carry the movement), not as a static block next to moving lines. **No travel or delay adjustment.**

### Task 2: informational Home Lighthouse
These are not the D-03 measurement (08-17 does that), and 08-LIGHTHOUSE.md was not edited. Command: `pnpm dlx lighthouse@13.6.0 http://localhost:4494/ --only-categories=performance --output=json --chrome-flags="--headless=new" --quiet`, run under the shared lock so the parallel Playwright run was paused.

| Run | Simulated LCP | FCP | Observed LCP | CLS | benchmarkIndex | Perf score |
|-----|---------------|-----|--------------|-----|----------------|------------|
| 1 | 1,209 | 1,209 | 62 | 0 | 4,640 | 1.00 |
| 2 | 1,208 | 1,208 | 51 | 0 | 4,669 | 1.00 |
| 3 | 1,208 | 1,208 | 63 | 0 | 4,673 | 1.00 |
| **Median** | **1,208 ms** | 1,208 | 62 ms | 0 | | |

- LCP element: `main#main > section.mx-auto > div.grid > p.text-ink` (`<p data-hero-lead>`). Element render delay: 48 ms in run 2, against 1,012 ms before.
- These numbers match the 08-14 L1 experiment (1,209 ms).
- Raw JSON: `tmp/lighthouse/fix15-home-{1,2,3}.json`.

## Deviations from Plan

- **Locking:** The plan's `tmp/build-e2e.lock` assumes 08-15 and 08-16 share one dist/. Each executor here runs in its own worktree with its own dist/, so I used the orchestrator's shared port-4400 lock (`e2e-lock.sh`) for every Playwright and Lighthouse run. Inspect, the screenshots and Lighthouse used preview port 4494, which I stopped afterwards (4494 confirmed free). No stale lock was removed.
- **Extra spec:** I added motion-reveal.spec.ts to the verify run, as project memory requires for CSS-touching plans. Its 3 load timeouts passed on re-run (see Task 1).
- Nothing else. The plan was otherwise executed as written.

## Known Stubs
None.

## Self-Check: PASSED
- src/styles/global.css: `@keyframes hero-lead-slide` appears once, `animation: hero-lead-slide` appears once, the CTA rule still uses hero-settle, and the keyframe has 0 opacity lines.
- tests/e2e/motion-hero.spec.ts: `data-hero-lead` matches inside the frame-0 test and the new 50 ms test.
- Commit 082c1a5 exists. `tmp/lighthouse/fix15-home-3.json` and `.taste-skill/08-15/{en,es}-home` exist.
