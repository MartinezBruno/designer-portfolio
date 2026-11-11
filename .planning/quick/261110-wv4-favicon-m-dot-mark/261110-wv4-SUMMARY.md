---
phase: quick-261110-wv4
plan: 01
subsystem: brand / head
tags: [favicon, brand, seo, pwa-manifest]
requires: [sketch-002 winner E]
provides: [path-only favicon.svg, favicon.ico 16+32, apple-touch-icon, manifest icons, build:favicons script]
affects: [src/layouts/BaseLayout.astro head]
tech-stack:
  added: []
  patterns: ["SVG source of truth + sharp raster script (pure helpers in scripts/favicons.ts, CLI in scripts/build-favicons.ts)"]
key-files:
  created:
    - public/apple-touch-icon.png
    - public/icon-192.png
    - public/icon-512.png
    - public/icon-maskable-512.png
    - public/site.webmanifest
    - scripts/favicons.ts
    - scripts/build-favicons.ts
    - tests/unit/favicons.test.ts
  modified:
    - public/favicon.svg
    - public/favicon.ico
    - package.json
    - src/layouts/BaseLayout.astro
    - tests/e2e/seo.spec.ts
    - tests/unit/sync-module-images.test.ts
decisions:
  - "The m is outlined from the site's own font file (latin wght woff2, byte-identical to the sketch's embedded font) at wght 800; that file has only the wght axis, so there is no opsz choice to make"
  - "Placement reproduces the sketch's canvas glyph() exactly (origin x 2.41, baseline 22.28), so the blue dot overlaps the right leg of the m just as it does in sketch E"
  - "theme_color #ffffff (site surface and header are white), background_color #ffffff, display minimal-ui"
  - "Head order: ico with sizes=32x32 first, then svg (Evil Martians 2024+), then apple-touch-icon and manifest"
metrics:
  duration: ~25 min
  completed: 2026-11-10
---

# Quick 261110-wv4: favicon m. mark Summary

The Astro default favicon is replaced with sketch 002 variant E: a black Bricolage Grotesque wght 800 "m", outlined from the site font with fontTools, plus a blue #0f70b7 full stop on a white disc. Alongside it ship a 16+32 ICO, a 180 px apple-touch tile, 192/512 and maskable manifest icons, all regenerable with `pnpm build:favicons`.

## Tasks

| Task | Commit | What |
| ---- | ------ | ---- |
| 1 Icon set + script | ffaa703 | favicon.svg (967 B, paths only), ICO with PNG entries 16/32, apple-touch 180 (opaque), icon-192/512 (disc), icon-maskable-512 (mark at 80%, opaque), site.webmanifest, scripts/favicons.ts + build-favicons.ts, `build:favicons` script, 15 unit tests |
| 2 Head links + e2e | 68bd3af | BaseLayout: ico sizes=32x32, svg, apple-touch-icon, manifest; seo.spec checks that each link appears once on / and /es/projects/, still once after a ClientRouter soft navigation, and that every href (and every manifest icon) returns 200 with the right type |

## Verification

- [Verified] pnpm lint (0 errors), pnpm test (80 files, 1497 tests), pnpm build, check:secrets (1325 files), measure:bundle (max eager 18015 B, under the 22000 B ceiling), seo.spec + a11y.spec (90 passed; the 4 favicon tests also run on their own).
- [Verified] Contact sheet: the SVG rendered by Chromium and the ICO/PNG rasters at 16, 32 (×5 pixel zoom) and 180 px, on light and dark backgrounds, next to the sketch E canvas render. The glyph shape, position and dot match the sketch; the white disc keeps the mark legible in a dark tab.
- taste-skill: lint.mjs reports 0 FAIL / 0 WARN on the changed source. inspect.mjs on the built home page reports 1 FAIL (empty-screens) and 3 WARN (size-count, first-action, no-footage). These are about the page body, which this task did not change, so they are pre-existing and not caused by the favicon.

## Deviations from Plan

**1. [Rule 3 - Blocking] sharp import boundary test allow-list**
- **Found during:** Task 1 (pnpm test)
- **Issue:** tests/unit/sync-module-images.test.ts asserted that scripts/behance/module-images.ts is the only sharp importer under scripts/ and src/.
- **Fix:** Added scripts/build-favicons.ts to the allow-list. It is also a dev-only build script and never ships to the worker. The boundary for src/ still holds.
- **Commit:** ffaa703

**2. Added a `build:favicons` package script and a pure-helper module (scripts/favicons.ts)**, following the repo's existing secrets.ts / check-secrets.ts split, so the helpers can be unit-tested without running the CLI.

## Known Stubs

None.

## Self-Check: PASSED
- All created files exist; commits ffaa703 and 68bd3af are present in git log.
