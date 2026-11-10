---
phase: 09-portfolio-features-hero-full-width-on-mobile-photography-ser
reviewed: 2026-11-10T00:00:00Z
depth: standard
range: 06adfbd..HEAD -- src scripts
files_reviewed: 18
files_reviewed_list:
  - scripts/spanish-review.ts
  - src/components/sections/Hero.astro
  - src/components/ui/CategoryFilter.astro
  - src/components/ui/ProjectCard.astro
  - src/components/ui/ProjectGrid.astro
  - src/components/views/ProjectsView.astro
  - src/data/services.json
  - src/i18n/ui.en.ts
  - src/i18n/ui.es.ts
  - src/lib/contact/fields.ts
  - src/lib/content/home.ts
  - src/lib/motion/nav-focus.ts
  - src/lib/projects/card-view.ts
  - src/lib/projects/category-param.ts
  - src/lib/projects/filter.ts
  - src/lib/projects/layout.ts
  - src/lib/projects/model.ts
  - src/lib/ui/category-filter.ts
findings:
  critical: 0
  warning: 2
  info: 4
  total: 6
status: issues_found
advisory_only: true
---

# Phase 9: Code Review Report

**Reviewed:** 2026-11-10
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found (advisory only: no fixes applied, src/ and tests/ untouched)

## Summary

Scope is `06adfbd..HEAD -- src scripts`: hero full width on phones, the Photography service, the `/projects/` category filter (radio group, `?category=` URL state, before-swap pre-filter, Web Animations transition), the nav-focus hash branch for filtered pages, and the move from per-size classes to a `data-tile` grid.

Verified by: reading the diff and the surrounding code, reading `node_modules/astro/dist/transitions/router.js`, and running `pnpm test` (76 files, 1407 tests, all passing). Builds, preview, Playwright and Lighthouse were not run, per the review constraints. Runtime statements below are labelled.

No blockers. The URL handling is sound: `parseCategoryParam` allow-lists against the rendered radios, rejects repeated params, and no URL text reaches a selector or HTML. Photography is wired through every id list (`categoryIds`, `SERVICE_IDS`, services.json, `serviceTitlesEs`). The `data-tile` classes reproduce the old span and aspect tables exactly. `portrait.png` is 1200x1600, so every new `widths` entry (max 1024) is produced without upscaling.

## Warnings

### WR-01: nav-focus filter branch misses the case where the URL search was cleared after load

**File:** `src/lib/motion/nav-focus.ts:264`
**Issue:** The branch only runs when `here.search !== ''`. The router's `samePage(from, to)` compares the **load-time** `originalLocation` (pathname + search, `router.js:7`, set at `router.js:159` and `:490`) with the link target. Two flows leave the live search empty while `originalLocation` still has one:
1. Land on `/projects/?category=branding`, then pick **All**. `withCategory` deletes the param, so `location.search === ''`.
2. Land on `/projects/?category=bogus`. `initCategoryFilter` canonicalizes it away (`category-filter.ts:142-146`).

In both, a skip-link or in-page hash click has `url.search === here.search === ''`. The new branch is skipped and the click falls through to the native path. [Inference, from router.js] The router then sees `from.search = '?category=…'` and `to.search = ''`, treats the click as a new page, and swaps `/projects/` onto itself. This is the same failure 07-11 CR-01 and Research Pitfall 2 describe, and it loses focus, scroll and filter state. The unit tests appear to cover only the non-empty-search case.
**Fix:** Drop the `here.search !== ''` guard, so any hash click on a page with `[data-project-filter]` is handled locally. Replacing only the fragment is harmless when the search already matches. Alternatively, record the search seen at `astro:page-load` and branch whenever it differs from `here.search`. Add a unit/e2e case: load with `?category=x`, choose All, activate the skip link, and assert no `astro:before-swap` fires.

### WR-02: Hard-load pre-filter runs in a deferred module script, so the "first painted frame is already filtered" claim does not hold

**File:** `src/lib/ui/category-filter.ts:251-270` (called from the `<script>` in `src/components/ui/CategoryFilter.astro:66-73`)
**Issue:** `bootCategoryFilter` filters the current document at once on a hard load, and the doc comment says this means "the first painted frame is already filtered". [Inference] Astro emits processed `<script>` blocks as `type="module"`, which are deferred until parsing finishes, so the browser can paint the full unfiltered grid first. On a shared `/projects/?category=x` link the grid then collapses and re-flows. That is a layout shift (CLS) and a visible flash. The chip row avoids this only because of the separate `motion-js` gate. The before-swap path (ClientRouter navigations) is fine.
**Fix:** Pick one:
- (a) Have the blocking inline gate in BaseLayout set an `html[data-category-pending]` attribute when `location.search` contains `category=`, and hide `[data-project-grid]` under that attribute until the module clears it.
- (b) Move the hard-load `applyCategory` into a small `is:inline` script placed right after the grid.
- (c) Correct the comment and accept the shift.

Measure with a Lighthouse/CLS run on `/projects/?category=<id>` once the shared port is free.

## Info

### IN-01: A filtered deep link hides the eager, `fetchpriority="high"` LCP cover

**File:** `src/components/views/ProjectsView.astro:46` (`eagerFirst`), `src/lib/ui/category-filter.ts:65-83`
**Issue:** The first card is always eager with high priority. When `?category=` excludes it, its `<li>` is `hidden`. [Inference] The eager image is still fetched at high priority but never shown, and the visible first cover is lazy with no priority, so LCP on filtered links is likely worse than on `/projects/`.
**Fix:** Accept and document it (filtered links are secondary), or have the pre-filter set `loading="eager"` and `fetchpriority="high"` on the first visible card's `<img>` when it differs from card 0.

### IN-02: Hero `sizes` hard-codes the phone gutter

**File:** `src/components/sections/Hero.astro:57`
**Issue:** `calc(100vw - 2rem)` mirrors the section's `px-4`. If the gutter changes, `sizes` silently drifts and the browser picks the wrong candidate.
**Fix:** Add a comment tying the value to `px-4`, or add an existing-style drift guard in the hero unit test.

### IN-03: `buildServices` couples the services count to `categoryIds.length`

**File:** `src/lib/content/home.ts:95`
**Issue:** `assertCount(entries, categoryIds.length, 'services')` turns "every service is a project category" into a build-time invariant. A future service that is not a category, or a category that is not a service, now fails the build with a services-count error that does not mention categories.
**Fix:** Keep the coupling if it is intended, but make the error message say "one service per category id", or assert the id sets are equal so the message names the missing id.

### IN-04: The change handler re-checks the allow-list on every change

**File:** `src/lib/ui/category-filter.ts:231`
**Issue:** `allowedCategories(doc)` re-queries the DOM on every change, but the radio values are server-rendered and fixed for the page's lifetime. It is harmless, but redundant with the radio's own value.
**Fix:** Optionally compute the allow-list once in `initCategoryFilter` and reuse it.

---

_Reviewer: inline GSD code review (advisory). No source or test files were modified._
