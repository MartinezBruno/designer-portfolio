---
phase: 08-quality-verification
plan: 13
subsystem: hero, imagery
tags: [gap-closure, sketch-001, hero-portrait, taste-gate]
requires: []
provides:
  - defringed 1200x1600 RGBA hero cutout for the #0f70b7 ground
  - sketch 001 arch portrait (3:4, semicircle top, 1.25rem bottom corners, bg-accent)
  - arch geometry, reduced-motion and frame-0 e2e tests
affects:
  - 08-14 (the larger portrait may become the Home LCP element; re-measure there)
tech-stack:
  added: []
  patterns:
    - "Elliptical border-radius shorthand for the arch (50%/37.5% top) instead of rounded-t-full, which would scale the bottom radii to ~0"
key-files:
  created: []
  modified:
    - src/assets/hero/portrait.png
    - src/components/sections/Hero.astro
    - tests/e2e/home.spec.ts
    - tests/e2e/motion-hero.spec.ts
decisions:
  - "Defringe by edge colour decontamination without alpha erosion: erosion left a hard grey contour on the thin curls"
  - "Residual semi-transparent grey-blue curl tips accepted by the user (Task 3 approval)"
  - "Home empty-screens taste FAIL predates this plan (identical on the pre-change build); not attributed to the portrait"
metrics:
  duration: ~70 min
  completed: 2026-11-09
requirements-completed: [QUAL-01]
---

# Phase 8 Plan 13: Hero portrait arch on the accent ground Summary

The hero portrait is now the sketch 001 winner: a 3:4 arch (semicircle top, 1.25rem bottom corners, overflow hidden) on the accent #0f70b7 ground, `object-cover` at `50% 6%`, with real 600x800 dimensions. The cutout was resized to 1200x1600 RGBA and its hair rim darkened so the light halo no longer reads on blue. The D-03 shutter entrance still plays on the arch, and its first frame is never blank.

## Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Defringe the cutout for the accent-blue ground, measured | a2b1861 (superseded), bee3db3 (final) | src/assets/hero/portrait.png |
| 2 | Arch on bg-accent, tests, taste gate, layout-sensitive e2e | bc1ca10 | Hero.astro, home.spec.ts, motion-hero.spec.ts |
| 3 | User approves the arch portrait and the halo cleanup | none (review only) | none |

## Task 1: asset and halo metric

- Final asset: 1200x1600, `hasAlpha` true, 4 channels, no EXIF (T-08-28 mitigated by re-encoding through sharp without `withMetadata()`).
- Size: 1,674,653 B (palette PNG, 2310x3080) became 2,279,132 B (RGBA, `palette: false` as the plan requires). The plan expected the source to shrink; it grew because the palette was dropped. Shipped variants are avif/webp at 7.7 to 46 KB.
- Edge band: pixels with 0 < alpha < 253, plus opaque pixels within 2 px of a fully transparent pixel, composited over #0f70b7 (ground luminance 0.1511). The threshold is 253, not 255, because the source subject is quantized to alpha 254, so "< 255" would count the whole figure.

| Metric | Baseline | Final (bee3db3) |
|---|---|---|
| Plan metric: share lighter than the ground by > 0.15 | 0.13% (49 px) | 0.06% (22 px), 54% lower |
| Share lighter by > 0.05 | 4.11% | 2.21% |
| Share brighter than the ground | 26.34% | 11.56% |
| Mean band luminance | 0.1226 | 0.0923 |

The final method uses no erosion. Every pixel within 5 px of a transparent pixel takes the RGB of the darkest opaque pixel within an 8 px radius, when that pixel is darker. Chosen n = 0 (no erosion).

Review sheets: `.taste-skill/08-13/halo-n0.png` (baseline), `halo-n1.png` to `halo-n3.png` (the plan's plain 1/2/3 px erosion candidates), `halo-n0d.png` (chosen), `halo-curls-before-after.png`, `arch-2x-1440.png`, `arch-2x-1440-zoom.png`.

## Task 2: arch, tests, gates

- Hero.astro: `width={600} height={800}`, `widths={[256, 448, 600]}`, `sizes="(min-width: 87.5rem) 19rem, (min-width: 64rem) 16rem, (min-width: 40rem) 11rem, 8rem"`. The picture carries `overflow-hidden bg-accent rounded-[50%_50%_1.25rem_1.25rem/37.5%_37.5%_1.25rem_1.25rem]`. The img has `block aspect-[3/4] w-full object-cover object-[50%_6%]`. The stale 321x324 values and the circle comment are gone. TODO(martina) stays on line 10. `global.css` is untouched.
- home.spec.ts: "hero portrait is a 3:4 arch on the accent ground" at 375 and 1280 for `/` and `/es/`, plus a reduced-motion test at 375 (same geometry, picture `clip-path: none`).
- motion-hero.spec.ts: frame 0 still checks `inset(35% 0px 0px)`, and now also checks that the picture height is > 0 and its background is `rgb(15, 112, 183)`.
- Verify: `pnpm lint` 0 errors / 0 warnings / Prettier clean. `pnpm test` 1312/1312 (spanish-review included). `pnpm build` OK. The listed e2e specs (home, motion-hero, parallax, a11y, layout, skeleton, transitions, smooth-scroll, anchors, contact-lazy) passed 171/171, run twice (before and after the final asset).
- Locking: the shared port-4400 `e2e-lock.sh` from the orchestrator was used instead of the plan's `tmp/build-e2e.lock`, because each parallel worktree has its own `dist/`. inspect ran on port 4493 (current build) and 4494 (baseline build).

### Taste gate

- `lint.mjs src/components/sections/Hero.astro src/components/sections`: 0 FAIL, 0 WARN.
- `inspect.mjs` at 1440 and 390:

| Page | Codes after | Codes on the pre-change build |
|---|---|---|
| `/` | FAIL `empty-screens` (screens 2, 3); WARN `size-count`, `first-action`, `no-footage` | identical |
| `/es/` | FAIL `empty-screens` (screens 2, 3); WARN `size-count`, `first-action`, `no-footage` | identical |

No new code is attributed to the portrait. The arch now registers as hero media ("10% img"; baseline "none"). The Home `empty-screens` FAIL predates this plan and is not in the Phase 7 records, so it should be tracked separately.

Screenshots reviewed: `.taste-skill/08-13/en-home/` and `es-home/` (desktop-fold, desktop-page-01/02, mobile-fold, mobile-page-01/02), baselines in `base-en-home/` and `base-es-home/`, and first frames `frame0-{en,es}-{390,1440}.png`.

```
ROUND 1 (hero change only)
Seen in one second: the 168px "Hi, I'm Martina." and the blue arch portrait
Layout words: hero=split / roles=band / work=grid / services=list / tools=row
Findings:
1. Arch weight (304x405 at 1440) balances the two-line headline; it ties to the roles band (desktop-fold.jpg)
2. Mobile 390: the order-first arch (128x171) sits above the headline; CTA still on the first screen (mobile-fold.jpg)
3. Accent blue now appears 3 times on the first screen (arch, CTA, roles band). This weakens accent discipline, but it is the user's sketch 001 choice
First frame: the lower 65% of the arch shows on blue at both widths; never blank
```

## Task 3: checkpoint

User reply, verbatim: "approved"

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Edge-band metric counted the whole figure**
- **Found during:** Task 1
- **Issue:** the source subject is alpha 254, so the plan's "0 < alpha < 255" band covered about 845k pixels (the whole figure)
- **Fix:** treat alpha >= 253 as opaque in the metric
- **Commit:** a2b1861

**2. [Rule 1 - Bug] Alpha erosion made the halo worse**
- **Found during:** Task 1 and the Task 2 screenshot review
- **Issue:** plain 1/2/3 px erosion raised the plan's light share (0.13% to 0.22%, 0.33%, 0.55%). The first committed fix (a2b1861: 2 px erosion plus colour decontamination) passed the metric but rendered a hard grey contour on the thin lower-left curls, about 0.03 luminance above the blue and so under both thresholds
- **Fix:** bee3db3 drops erosion, keeps the soft alpha, and darkens the rim (5 px band, 8 px radius). Two commits: a2b1861 (superseded) and bee3db3 (final)
- **Attempt limit:** reached after 3 tuning attempts. The remaining residual is that the outermost lower-left curl tips stay semi-transparent grey-blue, with slight speckle at 2x. The user accepted this at the Task 3 checkpoint. A re-exported cutout from the source photo remains the alternative if it ever needs to be cleaner
- **Files modified:** src/assets/hero/portrait.png

**3. [Rule 3 - Blocking] Lock protocol**
- The plan's per-worktree `tmp/build-e2e.lock` cannot serialize parallel worktrees. The orchestrator's shared port-4400 lock was used for Playwright, and inspect used separate ports.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: src/assets/hero/portrait.png (1200x1600 RGBA)
- FOUND: src/components/sections/Hero.astro, tests/e2e/home.spec.ts, tests/e2e/motion-hero.spec.ts
- FOUND commits: a2b1861, bee3db3, bc1ca10
