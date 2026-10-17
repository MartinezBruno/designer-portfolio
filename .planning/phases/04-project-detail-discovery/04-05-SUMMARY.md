---
phase: 04-project-detail-discovery
plan: 05
subsystem: seo
tags: [seo, open-graph, astro-assets, i18n, e2e]
requires:
  - phase: 04-01
    provides: detail routes with detail.seo and detail.cover (ImageMetadata)
provides:
  - optional og:image in SeoInput / SeoTags.og (page kind only)
  - BaseLayout ogImage prop forwarded to SeoHead
  - detail pages (EN/ES) emit an absolute 1200px JPG og:image built from the cover
affects: [seo, project-detail, polish-phase-sitemap]
tech-stack:
  added: []
  patterns:
    - "Optional props forwarded via conditional spread (exactOptionalPropertyTypes)"
    - "getImage({ width: 1200, format: 'jpg' }) + new URL(og.src, Astro.site) for absolute OG URLs"
key-files:
  created: []
  modified:
    - src/lib/seo.ts
    - tests/unit/seo.test.ts
    - src/components/global/SeoHead.astro
    - src/layouts/BaseLayout.astro
    - src/pages/projects/[slug].astro
    - src/pages/es/projects/[slug].astro
    - tests/e2e/seo.spec.ts
key-decisions:
  - "og:image only on kind 'page'; buildSeo drops it on notFound even if passed"
  - "Detail routes throw at build if Astro.site is unset rather than emit a relative og:image"
  - "Year-in-meta check uses a whole-token regex because cover file names are numeric Behance ids that can contain year digits (e.g. 202447185)"
requirements-completed: [PROJ-03]
duration: 6min
completed: 2026-10-17
---

# Phase 4 Plan 05: Detail Page SEO and og:image Summary

Detail pages now carry a localized title, the summary (or fallback) as description, canonical, en/es/x-default hreflang, and a same-origin absolute 1200px JPG `og:image` built from the project cover via `astro:assets` `getImage`. Pages that pass no image emit no `og:image` tag.

## Performance

- Duration: about 6 min
- Tasks: 2/2
- Files modified: 7

## Accomplishments

- `buildSeo` accepts an optional `image` and sets `og.image` only on `page` kind. The key is absent when no image is given.
- `SeoHead.astro` renders `<meta property="og:image">` only when there is an image. `BaseLayout.astro` takes an `ogImage` prop and forwards it with a conditional spread.
- Both detail routes build `getImage({ src: detail.cover, width: 1200, format: 'jpg' })` and pass `new URL(og.src, Astro.site).href`.
- `seo.spec.ts` now covers all 14 detail URLs: title, description, canonical, hreflang, a same-origin `.jpg` og:image that returns 200 with an `image/*` content type, and no publishedOn year in any meta tag. It also checks that Home, Projects (EN/ES) and the 404 page have no og:image.

## Task Commits

1. Task 1 RED: `0dc5c03` test(04-05): add failing og:image seo tests
2. Task 1 GREEN: `84aa7f5` feat(04-05): add optional og:image to seo head
3. Task 2 RED: `282320e` test(04-05): add detail page seo e2e checks
4. Task 2 GREEN: `b7ac37e` feat(04-05): pass cover og:image on detail pages

## Verification

[Verified] by running these commands in the worktree:
- `pnpm vitest run tests/unit/seo.test.ts`: 7/7 pass. Before the implementation, 1 of the 3 new tests failed (RED). The other two are absence checks, so they pass both before and after.
- `pnpm build`, then `grep -o 'property="og:image" content="[^"]*"' dist/projects/*/index.html | wc -l` printed 7.
- `pnpm exec playwright test tests/e2e/seo.spec.ts`: 53/53 pass. With the route changes reverted, the 14 og:image tests failed (RED confirmed).
- `pnpm lint` (astro check 0 errors, eslint clean, prettier clean) and `pnpm test` (501/501) pass.

## Deviations from Plan

- [Rule 2 - Missing check] Added `/no-such-page/` (the 404 page) to the "no og:image" e2e list, because the plan's must_haves name 404 but its e2e behavior list only named Home and Projects.
- The year assertion uses `\b<year>\b` instead of a substring match. Otherwise cover file names like `202447185-...` would collide with years. This is still a strict check on every meta `content`.

Otherwise the plan was executed as written.

## TDD Gate Compliance

Both tasks have a `test(...)` commit followed by a `feat(...)` commit. No refactor commits were needed.

## Threat Model

- T-04-01: meta content goes only through Astro `{}` attribute escaping. No `set:html` was added.
- T-04-16: og:image is built only from `getImage` output and `Astro.site`. The e2e test asserts the URL is on the site origin.
- T-04-13: the e2e test asserts no publishedOn year in any meta tag.

## Known Stubs

None. `site.url` is still the placeholder `https://martinafernandez.example` from an earlier phase (TODO(martina)), so og:image URLs point at that host until the real domain is set.

## Self-Check: PASSED

- All 7 modified files exist; commits 0dc5c03, 84aa7f5, 282320e and b7ac37e are in `git log`.
