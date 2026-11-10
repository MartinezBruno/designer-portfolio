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
fixed: [WR-01, WR-02]
fixed_at: 2026-11-10
open: [IN-01, IN-02, IN-03, IN-04]
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

**Status:** fixed (`da00585`; RED unit test `2003a21`). See Fixes.
**File:** `src/lib/motion/nav-focus.ts:264`
**Issue:** The branch only runs when `here.search !== ''`. The router's `samePage(from, to)` compares the **load-time** `originalLocation` (pathname + search, `router.js:7`, set at `router.js:159` and `:490`) with the link target. Two flows leave the live search empty while `originalLocation` still has one:
1. Land on `/projects/?category=branding`, then pick **All**. `withCategory` deletes the param, so `location.search === ''`.
2. Land on `/projects/?category=bogus`. `initCategoryFilter` canonicalizes it away (`category-filter.ts:142-146`).

In both, a skip-link or in-page hash click has `url.search === here.search === ''`. The new branch is skipped and the click falls through to the native path. [Inference, from router.js] The router then sees `from.search = '?category=…'` and `to.search = ''`, treats the click as a new page, and swaps `/projects/` onto itself. This is the same failure 07-11 CR-01 and Research Pitfall 2 describe, and it loses focus, scroll and filter state. The unit tests appear to cover only the non-empty-search case.
**Fix:** Drop the `here.search !== ''` guard, so any hash click on a page with `[data-project-filter]` is handled locally. Replacing only the fragment is harmless when the search already matches. Alternatively, record the search seen at `astro:page-load` and branch whenever it differs from `here.search`. Add a unit/e2e case: load with `?category=x`, choose All, activate the skip link, and assert no `astro:before-swap` fires.

### WR-02: Hard-load pre-filter runs in a deferred module script, so the "first painted frame is already filtered" claim does not hold

**Status:** fixed (`cc64ecd`). The shift was measured and is real (CLS 0.25 to 0.42). See Fixes.
**File:** `src/lib/ui/category-filter.ts:251-270` (called from the `<script>` in `src/components/ui/CategoryFilter.astro:66-73`)
**Issue:** `bootCategoryFilter` filters the current document at once on a hard load, and the doc comment says this means "the first painted frame is already filtered". [Inference] Astro emits processed `<script>` blocks as `type="module"`, which are deferred until parsing finishes, so the browser can paint the full unfiltered grid first. On a shared `/projects/?category=x` link the grid then collapses and re-flows. That is a layout shift (CLS) and a visible flash. The chip row avoids this only because of the separate `motion-js` gate. The before-swap path (ClientRouter navigations) is fine.
**Fix:** Pick one:
- (a) Have the blocking inline gate in BaseLayout set an `html[data-category-pending]` attribute when `location.search` contains `category=`, and hide `[data-project-grid]` under that attribute until the module clears it.
- (b) Move the hard-load `applyCategory` into a small `is:inline` script placed right after the grid.
- (c) Correct the comment and accept the shift.

Measure with a Lighthouse/CLS run on `/projects/?category=<id>` once the shared port is free.

## Fixes

Applied 2026-11-10 by the GSD code fixer, as approved by the user (WR-01 and WR-02 only; IN-01 to IN-04 left open).

| Finding | Commit | Change |
|---|---|---|
| WR-01 (RED test) | `2003a21` | `test(09): cover hash links on emptied filter url`: the unit case for a filter page with an empty search |
| WR-01 | `da00585` | `fix(09): handle hash links on unfiltered projects` |
| WR-02 | `cc64ecd` | `fix(09): pre-filter shared category links` |

### WR-01

- `src/lib/motion/nav-focus.ts`: the `here.search !== ''` guard was dropped. Any same-page hash click on a page with `[data-project-filter]` is now handled locally: `preventDefault`, `replaceState(history.state, '', url with the new hash)`, then scroll and focus the target. Pages without the filter keep the native path.
- Unit (`tests/unit/nav-focus.test.ts`): the old case "filter marker with an empty search keeps the native path" encoded the bug. It is replaced by "filter page with an emptied search: the skip link jumps locally (search stays empty, hash `#main`, same state object, no pushState, `#main` focused)". A no-filter, empty-search case confirms the native path is unchanged. RED was confirmed before the fix: `prevented` was `[false]`.
- E2E (`tests/e2e/projects-filter.spec.ts`, EN and ES): (1) load `?category=web-design`, choose All, activate the skip link; (2) load `?category=bogus` (cleaned URL), activate the skip link. Each asserts that no `astro:before-swap` fired, that an expando on the live `<main>` survived, that `history.length` did not change, that `#main` is focused, and that the search is empty with hash `#main`. [Verified] On the pre-fix build all 4 cases failed with `{swapped: true, marker: undefined, length +1}`, which confirms the reviewer's router inference in a real browser. They pass after the fix.

### WR-02

Measured before the fix. Method: the `pnpm build` preview, then Chromium via Playwright with `addInitScript` registering a buffered `PerformanceObserver('layout-shift')`, plus a `requestAnimationFrame` probe that logs visible/total cards each frame. Each run was a hard load, 4.5 s observation, unthrottled and at 4x CPU with slow network:

| Viewport | URL | CLS before | First frame before | CLS after | First frame after |
|---|---|---|---|---|---|
| 390x844 | `/projects/?category=branding` | 0.4198 | 7/7 cards, then 1/7 | 0 | 1/7 |
| 390x844 | `/es/projects/?category=web-design` | 0.3905 | 7/7, then 3/7 | 0 | 3/7 |
| 1440x900 | `/projects/?category=branding` | 0.2611 | 7/7, then 1/7 | 0 | 1/7 |
| 1440x900 | `/es/projects/?category=web-design` | 0.2538 | 7/7, then 3/7 | 0 | 3/7 |

The numbers were the same unthrottled and throttled. Every shift source was the card `ARTICLE`s, and every shift landed after FCP. [Verified] The shift is real and above the 0.1 "good" threshold, so the source was changed.

- `src/lib/projects/category-prefilter.ts` (new): `prefilterCategory` is self-contained, like the BaseLayout motion gate. It uses the same allow-list rules as `parseCategoryParam`: exactly one non-empty value that equals a rendered radio value. The URL value is only compared, so it never reaches a selector, id or HTML. It applies the same hidden, `data-tile` and `sizes` changes as `applyCategory`, and checks the radio. `categoryPrefilterInline(count)` stringifies it with a build-time rhythm table and `sizesFor` as JSON, with `<` escaped.
- `src/components/views/ProjectsView.astro`: a `<script is:inline set:html={prefilter}>` placed right after `<ProjectGrid>`, and only when the chip row renders. It is parse-blocking, so the first frame is already filtered. The deferred module re-applies the same state, which is idempotent. No-JS visitors are unchanged.
- `src/lib/ui/category-filter.ts`: the misleading `bootCategoryFilter` comment was corrected.
- Tests: `tests/unit/category-prefilter.test.ts` checks drift against `applyCategory` for every category. It also checks that 8 invalid, repeated, unrendered or hostile values leave the grid alone, that the inline string evaluates with global scope only, that the string has no `</`, and where the script sits. The `set:html` guard in `tests/unit/project-modules.test.ts` now allows ProjectsView and asserts that ProjectsView's only use is the build-time `prefilter` constant. E2E `projects filter, hard-load layout stability` (EN branding and ES web-design, at 390 and 1440) asserts CLS 0 and a first observed frame that is already filtered.
- Bundle: eager JS for `/projects/` and `/es/projects/` is 17,965 B gzip (it was 17,975 B in 09-08), with a ceiling of 22,000 B. The inline script adds 698 B gzip to the projects HTML only. `measure:bundle` does not count it, and even with it included the total stays under the ceiling.

### Verification

- `pnpm lint`: 0 errors, 0 warnings. `pnpm test`: 77 files, 1426 tests, all passed.
- Playwright on the final build: `projects-filter`, `projects-grid`, `projects`, `nav-feedback`, `a11y`, `keyboard-journeys`, `navigation-leaks`, `transitions`, `transitions-capture`, `transitions-reduced`, `smooth-scroll`, `anchors` and `contact-lazy`. Result: 181 passed, 84 skipped, 0 failed.
- One earlier run had `keyboard-journeys` "9. empty submit focuses the first invalid field on /" fail once. That test is on Home, which neither fix touches. It also fails intermittently on the pre-fix src (1 of 10 with `--repeat-each=5` x2 on a `1c629fb` src build), so it is a pre-existing flake.
- Lighthouse was not run; the orchestrator runs the re-gate.

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
