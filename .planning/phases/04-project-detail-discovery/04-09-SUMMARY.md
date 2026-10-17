---
phase: 04-project-detail-discovery
plan: 09
subsystem: project-detail
tags: [astro, astro-assets, modules, a11y, i18n, e2e, detail-page]
requires: [04-08 required snapshot content and module WebPs, 04-04 detail page frame, 04-07 moduleAlt overrides]
provides:
  - SourceImage / SourceModule (model.ts); SourceProject.modules; Project.moduleAlt
  - ModuleView / CollectionItemView; ProjectDetailView.modules (never empty)
  - collectionRows, moduleWidths, collectionItemSizes, escapeHtml, injectNewTabHint (detail-view.ts, pure, Node-safe)
  - toModuleViews(project, locale, title) (detail-view-site.ts), called by toDetailView
  - ProjectModule / ImageModule / CollectionModule / TextModule / UnknownModule components
  - module stack inside the article of ProjectDetailView.astro (max-w-[1400px], no gap, no padding)
  - ExpectedDetail.imageCount / textCount / hasEmbed / alts / textLang in the e2e helper
affects: [04-10 embed facade (switch the embed branch in ProjectModule.astro), 04-11 phase sign-off (taste items below)]
tech-stack:
  added: []
  patterns:
    - import.meta.glob over src/assets/projects/modules/*.webp with a throwing resolver
    - justified rows via flex basis-0 + flex-grow = aspect ratio (inline --ar custom property)
    - render-time sr-only new-tab hint injected into sanitized HTML, hint HTML-escaped
key-files:
  created:
    - src/components/project/ProjectModule.astro
    - src/components/project/ImageModule.astro
    - src/components/project/CollectionModule.astro
    - src/components/project/TextModule.astro
    - src/components/project/UnknownModule.astro
    - tests/unit/project-modules.test.ts
  modified:
    - src/lib/projects/model.ts
    - src/lib/projects/sources/behance-snapshot.ts
    - src/lib/projects/projects.ts
    - src/lib/projects/detail-view.ts
    - src/lib/projects/detail-view-site.ts
    - src/components/views/ProjectDetailView.astro
    - tests/unit/project-detail-view.test.ts
    - tests/unit/project-detail-site.test.ts
    - tests/unit/projects-snapshot.test.ts
    - tests/unit/projects-overrides.test.ts
    - tests/unit/projects-order.test.ts
    - tests/unit/project-card-view.test.ts
    - tests/unit/project-intro.test.ts
    - tests/e2e/helpers/projects.ts
    - tests/e2e/project-detail.spec.ts
decisions:
  - New-tab hint added at render (injectNewTabHint before every </a>), not as a sync-time token (deviation from UI-SPEC TextModule; RESEARCH Open Question 2)
  - Alt numbering total is counted from the modules themselves, not from Project.imageIds (same value for real data; keeps fixtures honest)
  - picture elements get class block (pictureAttributes) in addition to the img, so no inline baseline gap can appear between stacked images
  - sm:grow-(--ar) compiles to flex-grow:var(--ar); the arbitrary-value fallback was not needed
metrics:
  duration: ~35min
  completed: 2026-10-17
---

# Phase 4 Plan 09: Module Stack Summary

Detail pages now show Martina's real Behance work: every image, collection grid and text module from the committed snapshot, in Behance order, as an edge-to-edge 1400px stack with local `astro:assets` images, numbered localized alts, Spanish-marked prose with escaped new-tab hints, and a quiet "best viewed on Behance" note for unknown modules and (until 04-10) the Figma embed.

## What was built

**Task 1: data path (adapter, query layer, view builder)**
- `behance-snapshot.ts` globs `/src/assets/projects/modules/*.webp` eagerly. `moduleImageFor(file)` throws `snapshot: missing module image <file> in src/assets/projects/modules/. Re-run pnpm sync:behance or restore it from git`. `content` maps to `SourceModule[]`; `unknown` drops `type`. Dimensions come from the file's ImageMetadata. A unit test covers the real snapshot (all 154 files resolve, ids and dimensions match) and the missing-file error.
- `applyOverrides` copies `modules` and builds `moduleAlt` as a fresh object, entry by entry (`{}` when absent).
- `detail-view.ts`: `collectionRows` (1→[1] … 7→[3,2,2], 8→[3,3,2]; throws on 0, -1, 2.5), `moduleWidths`, `collectionItemSizes`, `escapeHtml`, `injectNewTabHint`.
- `toModuleViews`: numbers images across image modules and collection items in DOM order, makes only image 1 eager, uses the `moduleAlt` override for the locale or `detail.imageAlt`, sets text/caption `lang` only when `contentLang` differs from the locale, rounds the ratio to 4 decimals, computes per-item `sizes` from the row share, and builds the embed `providerName`/`iframeTitle`. Zero modules become `[{ kind: 'unknown' }]`.

**Task 2: components**
- `ImageModule`: `<Picture>` avif+webp, widths capped at the stored width, `sizes="(min-width: 1400px) 1400px, 100vw"`, width/height set, eager+`fetchpriority="high"` only when eager. No border, shadow or rounding. Padded frame when `fullBleed` is false. `<figure>`/`<figcaption lang?>` only when there is a caption.
- `CollectionModule`: rows `flex flex-col sm:flex-row`, items `min-w-0 sm:basis-0 sm:grow-(--ar)` with `style={{ '--ar': ratio }}` (the one sanctioned inline style).
- `TextModule`: a `div` root with the exact UI-SPEC class string, `lang` only when non-null, and `set:html`, with a comment documenting where the sanitizing happens.
- `UnknownModule`: the UI-SPEC markup with `ExternalTextLink`.
- `ProjectModule`: a dispatcher. `embed` renders `UnknownModule` until 04-10.
- `ProjectDetailView.astro`: the stack `<div class="mx-auto flex w-full max-w-[1400px] flex-col">` sits inside the article, after `ProjectIntro`. No motion (D-04).
- Guard test: `set:html` appears only in `src/layouts/BaseLayout.astro` and `src/components/project/TextModule.astro`.

**Task 3: e2e**
- On all 14 pages (7 projects × 2 locales):
  - the module image count matches the snapshot, and there are no other images in the project article
  - alts equal the expected override or numbered fallback, in DOM order
  - width/height are set on every image
  - only the first image is eager and has `fetchpriority="high"`
  - no `img`/`source` `src` or `srcset` contains `behance.net`
  - the text-module count matches, with `lang="es"` on EN pages and no `lang` on ES pages
  - every prose `a[target=_blank]` has `noopener noreferrer` and the localized sr-only hint
  - portfolio-web shows the unknown-module note and no iframe
- The 04-04 checks still pass, including the 320px no-overflow and two-line checks.

## Verification

- `pnpm lint`: 0 errors, 0 warnings, Prettier clean. `pnpm test`: 41 files, 634 tests passed.
- `pnpm build`: 20 pages built. `pnpm exec playwright test tests/e2e/project-detail.spec.ts tests/e2e/a11y.spec.ts`: 232 passed.
- Acceptance greps:
  - the modules glob appears once
  - `altText` appears 0 times in the adapter and in detail-view-site
  - `astro:` appears 0 times in detail-view.ts
  - `set:html` appears only in BaseLayout and TextModule
  - `max-w-[1400px]` appears once in ProjectDetailView
  - no `rounded`/`shadow` in ImageModule or CollectionModule
  - `flex-grow:var(--ar)` is present in `dist/_astro/*.css`
  - 0 `behance.net` src/srcset in the built detail pages

## Taste gate (CLAUDE.md)

`lint.mjs src/components/project src/components/views/ProjectDetailView.astro`:
- The first run gave 0 FAIL and 1 WARN: `[copy]` "Seamless" in a code comment. The comment was reworded (commit 20f6288). The re-run gives **0 FAIL, 0 WARN**.

`inspect.mjs`, run against `astro preview` on port 4410:

| Page | FAIL | WARN |
|------|------|------|
| /projects/website-instablogs/ | still-page | hairline, palette-cream, first-action, no-footage |
| /es/projects/website-instablogs/ | still-page | hairline, palette-cream, first-action, no-footage |
| /projects/sistema-visual/ | few-pictures, still-page | hairline, palette-cream, first-action, no-footage |
| /es/projects/sistema-visual/ | few-pictures, still-page | hairline, palette-cream, first-action, no-footage |

- Accepted per the UI-SPEC: `still-page` (D-04, no motion yet), `few-pictures` on sistema-visual only (her Behance project has a single image; nothing is padded), and the pre-existing `hairline`, `palette-cream` and `no-footage`.
- **`focal-point` is cleared.** It was the 04-04 FAIL. The first full-width module image now dominates the first screen on InstaBlogs.
- **`few-pictures` is cleared on InstaBlogs**, as the UI-SPEC expected.
- **`empty-screens` does not fire** on any page, sistema-visual included.
- **`first-action` WARN, for the user's sign-off in 04-11:**
  - It is not on the UI-SPEC accepted list.
  - The page's only primary button, "Let's work together", sits in the contact band after the module stack, so it is no longer in the first screen.
  - That position is the locked UI-SPEC order: intro → modules → contact band → teaser.
  - The first screen does hold the header Contact link and the "View on Behance" link.
  - Recorded here, not changed.

Screenshot critique (1440 / 768 / 390, InstaBlogs and sistema-visual, EN):
- The image stack runs edge to edge with no visible seams, gaps, frames or rounded corners. At 1440 the 1400px column leaves a 20px band of surface on each side, as specified. Below 1400 the images fill the viewport width.
- Collection rows are equal height and uncropped at 1440 and 768. Portrait and landscape mixes keep their full compositions, and the rows meet with no gap. At 390 the items stack full width.
- Text modules use the site's sans and ink on surface. They keep Behance's right/centre alignment (D-02), and no white or cream Behance colour reaches the page. The sistema-visual credit block reads cleanly at 390.
- Her own artwork brings strong colour fields (InstaBlogs yellow, sistema-visual lilac) that sit directly against the cream page with no frame. That is the intended "her work, our frame" read.

## Deviations from Plan

### Recorded UI-SPEC deviations (planned)
1. **Render-time new-tab hint.** The UI-SPEC wanted a sync-time `<span data-newtab-hint>` token. 04-03 stores no token, so `injectNewTabHint` adds `<span class="sr-only" lang="{locale}">{escaped hint}</span>` before every `</a>` at view-build time (RESEARCH Open Question 2). XSS surface: the hint and the locale are `escapeHtml`-ed, and a unit test covers `<`, `>`, `&` and `"`.
2. **h1–h6 → p.** Per 04-03, the sanitizer turns Behance headings into plain `p`, not the UI-SPEC's `p > strong`. Today no text module contains a heading, so the output is unchanged.

### Auto-fixed Issues
1. **[Rule 1 - Bug] The alt total came from imageIds.** `Project.imageIds` and `modules` are independent fields. The plan computed `total` from imageIds, which gives "of 0" when only modules are set (for example in the unit fixtures). `total` is now counted from the modules themselves, which gives the same value for real data. Files: detail-view-site.ts. Commit d82389b.
2. **[Rule 3 - Blocking] Fixtures for the new required fields.** `modules: []` and `moduleAlt: {}` were added to every SourceProject/Project/ProjectDetailView fixture, including `tests/unit/project-intro.test.ts`, which `astro check` flagged and the plan did not list. Commit d82389b.
3. **[Rule 1 - Bug] The e2e `article img` selector also matched the next-project tile.** That tile is an `<article>` too, so the new image-count check and the stack locator were scoped to `article[aria-labelledby="project-title"]`. Commit da0d9b3.
4. **Taste-lint copy WARN in a code comment.** "Seamless" was reworded. Commit 20f6288.

### TDD notes
- Task 1 followed RED (bcb45ff, 24 failing) → GREEN (d82389b).
- Task 3 is marked tdd, but its e2e tests target behaviour that Task 2 had already shipped, so they passed on their first green run once the selector was scoped. There is no separate failing commit for Task 3. This is recorded here per the TDD gate.

## Known Stubs

- The `embed` branch of `ProjectModule.astro` renders `UnknownModule` on purpose until 04-10 adds the click-to-load facade. The portfolio-web page shows the "best viewed on Behance" note in place of the Figma prototype.
- `moduleAlt` has no entries yet (04-08), so every module image uses the numbered fallback alt. Curation is Martina's content task. The pipeline is tested with overrides.

## Self-Check: PASSED

- All 5 new components, `tests/unit/project-modules.test.ts` and this SUMMARY exist.
- Commits bcb45ff, d82389b, 08d5407, da0d9b3 and 20f6288 are in `git log`.
