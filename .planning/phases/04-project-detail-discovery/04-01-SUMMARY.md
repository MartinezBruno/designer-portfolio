---
phase: 04-project-detail-discovery
plan: 01
subsystem: project-detail
tags: [astro, i18n, routes, detail-page, e2e]
requires: [phase-03 query layer (loadProjects, sortProjects, buildCategoryTitles)]
provides:
  - ProjectDetailView / DetailTool model types
  - getProjectPaths(locale), getProjectDetail(locale, slug)
  - toDetailView, buildToolIcons (site-only)
  - EN/ES /projects/[slug]/ routes
  - ProjectDetailView, ProjectIntro, ExternalTextLink components
  - ToolIcon size prop, --text-4xl token
  - every Phase 4 dictionary key (EN + ES)
affects: [04-04 next/previous teaser, 04-09 module stack, SEO image plan]
tech-stack:
  added: []
  patterns: [thin getStaticPaths routes over the query layer, data-derived e2e expectations]
key-files:
  created:
    - src/lib/projects/detail-view-site.ts
    - src/pages/projects/[slug].astro
    - src/pages/es/projects/[slug].astro
    - src/components/views/ProjectDetailView.astro
    - src/components/project/ProjectIntro.astro
    - src/components/ui/ExternalTextLink.astro
    - tests/e2e/project-detail.spec.ts
    - tests/unit/project-detail-site.test.ts
    - tests/unit/project-intro.test.ts
  modified:
    - src/lib/projects/model.ts
    - src/lib/content/queries.ts
    - src/i18n/ui.en.ts
    - src/i18n/ui.es.ts
    - src/components/ui/ToolIcon.astro
    - src/styles/global.css
    - tests/e2e/helpers/projects.ts
decisions:
  - Phase 4 dictionary keys landed in the Task 1 (RED) commit because astro check type-checks tests/
  - ExpectedDetail carries an extra coverStem field so the e2e can prove the cover is not repeated
  - The e2e date check ignores URL-valued meta tags (numeric Behance ids such as 202447185 contain year-like digits)
metrics:
  duration: ~35 min
  completed: 2026-10-17
  tasks: 3
  files: 16
---

# Phase 4 Plan 01: Project detail route and intro band Summary

EN/ES `/projects/<slug>/` pages for all 7 visible projects. They are built through `getProjectPaths` from the query layer and render a title-first intro band: an h1 at 36px, then the summary, the visible Category/Tools labels with 20px tool icons, and a "View on Behance" link that opens in a new tab. The page shows no date and does not repeat the cover.

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Failing e2e for the detail-page intro band (RED) | 01d8f4a |
| 2 | Detail view model, query layer and Phase 4 dictionary keys | eb10ac4 |
| 3 | Routes, ProjectDetailView, ProjectIntro, ExternalTextLink, ToolIcon size (GREEN) | 9ab7d4e |

## Verification

- RED: `pnpm build && playwright test tests/e2e/project-detail.spec.ts` failed on 404s and missing elements (16 passed, the rest failed). It did not fail on type or import errors.
- GREEN: `tests/e2e/project-detail.spec.ts` gives 86/86 passed. The full Playwright suite gives 253/253 passed.
- `pnpm lint` passed: astro check found 0 errors and 0 warnings, and eslint and prettier were clean. `pnpm test` gives 431/431 passed (35 files).
- `dist/projects/*/index.html` contains 7 pages, and `dist/es/projects/*/index.html` contains 7.
- Threat greps: `set:html` in `src/components/project` returns nothing, and `sources/` in `src/pages` and `src/components` returns nothing.

## Taste gate

- `lint.mjs` on `src/components/project`, `ExternalTextLink.astro` and `src/pages/projects` reported 0 FAIL and 0 WARN.
- `inspect.mjs http://localhost:4322/projects/sistema-visual/` was used. Port 4321 was held by another process, so preview ran on 4322.
  - Measured: sizes in use 14/16/24/36. The h1 fits on 1 line at 1440, 768 and 390.
  - FAIL `few-pictures`, `still-page`: accepted per the UI-SPEC Verification section. The module stack comes in 04-09, and this phase adds no motion (D-04).
  - FAIL `focal-point`: recorded, not fixed. The page is intentionally short until the 04-09 module stack, whose 1400px images become the focal point.
  - WARN `hairline` (site header border), `palette-cream`, `no-footage`: pre-existing, and accepted.
  - WARN `first-action`: recorded. The primary contact button arrives with the 04-04 contact band.
- Screenshot review: I opened desktop-fold and mobile-page-01. The intro band layout matches the UI-SPEC: title, summary, labelled meta row, and the Behance link aligned right on desktop and stacked on mobile. The 20px Illustrator icon sits next to its name. No cover or date appears. The page ends with the footer directly after the band, which is expected for this slice.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Dictionary keys moved into the RED commit**
- **Found during:** Task 1
- **Issue:** `tsconfig` includes `**/*`, so `astro check` (part of `pnpm lint`) type-checks the e2e spec. Referencing `dict['detail.viewOnBehance']` before the key existed would have broken lint in the RED commit.
- **Fix:** All 17 Phase 4 keys (EN + ES, under `// TODO(martina): Phase 4 detail copy`) were added in Task 1 instead of Task 2.
- **Commit:** 01d8f4a

**2. [Rule 2 - Correctness] Robust D-11/D-12 e2e assertions**
- `coverStem` was added to `ExpectedDetail`. astro:assets keeps the source file stem in the optimized file name, so the cover check matches that stem instead of counting images. Later module images therefore will not break the check.
- The meta-tag date check skips URL values, because cover ids such as `202447185` contain "2024". The `<title>` is still checked.
- **Commit:** 01d8f4a

## Known Stubs

These are the new `TODO(martina)` dictionary strings: drafted copy waiting for Martina's review, in `src/i18n/ui.en.ts` and `src/i18n/ui.es.ts`:
`detail.cta.button`, `detail.cta.heading`, `detail.cta.body`, `detail.viewOnBehance`, `detail.imageAlt`, `detail.embed.label`, `detail.embed.note`, `detail.embed.load`, `detail.embed.iframeTitle`, `detail.embed.fallback`, `detail.unknown.body`, `detail.unknown.link`, `detail.next.heading`, `detail.next.srPrefix`, `detail.previous`, `meta.project.title`, `meta.project.description`.

Only `detail.viewOnBehance`, `meta.project.title` and `meta.project.description` are rendered by this plan. The rest are consumed by 04-04 and 04-09.

## TDD Gate Compliance

- RED: `test(04-01): add failing detail page e2e` (01d8f4a)
- GREEN: `feat(04-01): add project detail view and queries` (eb10ac4), then `feat(04-01): add project detail routes and intro` (9ab7d4e)

## Self-Check: PASSED

- All 9 created files and 7 modified files exist in the worktree.
- Commits 01d8f4a, eb10ac4 and 9ab7d4e are present in `git log`.
