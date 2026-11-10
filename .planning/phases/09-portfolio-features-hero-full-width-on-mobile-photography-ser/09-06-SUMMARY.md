---
phase: 09-portfolio-features-hero-full-width-on-mobile-photography-ser
plan: 06
subsystem: projects-filter
tags: [filter, i18n, a11y, radio-group, bundle]
requires:
  - 09-02 ProjectCardView.categoryId
  - 09-03 buildCategoryChips, bootCategoryFilter, initCategoryFilter (DOM contract)
provides:
  - src/components/ui/CategoryFilter.astro (fieldset[data-project-filter] radio chips, sr-only status region, client script)
  - ProjectsView chip row (built at build time with buildCategoryChips(all))
  - projects.filter.* EN/ES copy (ES queued in 08-SPANISH-REVIEW.md)
affects: [09-07 e2e (filter behaviour on /projects/ and /es/projects/)]
tech-stack:
  added: []
  patterns:
    - hidden + motion-js:block display gate for JS-only controls (no CLS, no dead no-JS control)
    - localized live-region templates as data-* attributes (no dictionary in the client bundle)
    - happy-dom Window parse inside a node-environment AstroContainer test
key-files:
  created:
    - src/components/ui/CategoryFilter.astro
    - tests/unit/category-filter-view.test.ts
  modified:
    - src/components/views/ProjectsView.astro
    - src/i18n/ui.en.ts
    - src/i18n/ui.es.ts
    - .planning/phases/08-quality-verification/08-SPANISH-REVIEW.md
decisions:
  - "Chip class stays a literal in CategoryFilter (UI-SPEC allows two literals) rather than a shared src/lib/ui/chip.ts: sharing would change ServiceChips' shipped motion-safe: behaviour and re-open the contact taste gate. A drift-guard test checks the shared tokens in both files."
  - "No ScrollTrigger.refresh() after a filter change: no ScrollTrigger exists anywhere in src/ (GSAP loads core + SplitText only; reveals use IntersectionObserver, card parallax is a CSS view timeline), so there is nothing to refresh."
  - "The status <p> lives inside CategoryFilter (after the fieldset). It is sr-only (position absolute), so it takes no gap slot in the gap-8 wrapper."
metrics:
  duration: ~12min
  completed: 2026-11-10
---

# Phase 9 Plan 06: Category Filter Chips on the Projects Pages Summary

/projects/ and /es/projects/ now render a native radio-group chip row: All/Todos, then Graphic design, Web design, Branding and Social media in services.json order, with no Photography chip. The chip row sits below the intro and is hidden until the motion gate has run. An empty sr-only status region carries the localized templates. The 09-03 filter module loads only on these two pages.

## Tasks

| Task | Name | Commits |
|------|------|---------|
| 1 | EN/ES copy, CategoryFilter component, render test | bfad45d (RED), 8a28dce (GREEN), 9dd0868 (REFACTOR: comment wording) |
| 2 | Wire into ProjectsView, regenerate the Spanish review, measure | 2083375 |

## Verification

- `pnpm test`: 76 files, 1400 tests pass. `pnpm lint` (astro check 0/0/0, eslint, prettier): passes.
- `tests/unit/category-filter-view.test.ts` (6 tests) covers:
  - EN and ES render: legend, radio order, the checked All radio, labels, status templates, an empty status region
  - no form, svg or aria-pressed
  - drift guard against the ServiceChips chip tokens; motion-on: used, no motion-safe:
- Acceptance greps:
  - `projects.filter.status.many`: 1 in each dictionary
  - `motion-js:block` = 1, `motion-safe` = 0, `<form|aria-pressed` = 0, `lifecycle.register(initCategoryFilter)` = 1 (CategoryFilter.astro)
  - `buildCategoryChips(all)` = 1 (ProjectsView.astro)
- Built output:
  - `dist/client/projects/index.html` has `data-project-filter` (1) and `projects-filter-web-design` (1), and no `projects-filter-photography` (0).
  - `dist/client/es/projects/index.html` has `Todos` (1).
  - The CategoryFilter chunk is referenced from the Projects pages only, not from `index.html`.
- taste-skill `lint.mjs` on CategoryFilter.astro: 0 FAIL, 0 WARN.
- taste-skill `inspect.mjs` on /projects/ (1440/768/390), screenshots reviewed:
  - Placement: the chip row shares its left edge with the h1, sits 48px below the intro and 32px above the grid, and wraps to two lines at 390px.
  - Findings: 1 FAIL (`empty-screens`, about the grid screens; the grid layout is owned by 09-05). 2 WARN (`first-action`, `no-footage`), both page-level and present before this plan. None of the three comes from the chip row.

## Bundle (gzip -9, `pnpm measure:bundle`, exit 0)

| Page | Base (e515b6b, measured) | After | Delta |
|------|------|-------|-------|
| `/projects/`, `/es/projects/` | 15,930 B | 18,003 B | +2,073 (CategoryFilter chunk 1,952 + interpolate chunk 121) |
| `/`, `/es/` | 18,007 B | 18,024 B | +17 (ContactForm chunk: `interpolate` is now split into a shared chunk) |
| Max eager, all pages | 18,007 B | 18,024 B | ceiling 22,000 B holds |

The baseline was measured by rebuilding with the pre-plan ProjectsView while holding the lock.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Render test parses with happy-dom's `Window` instead of the happy-dom environment**
- **Found during:** Task 1
- **Issue:** Under `// @vitest-environment happy-dom`, AstroContainer failed to render the `.astro` import (NoMatchingRenderer).
- **Fix:** The test keeps the node environment and parses the rendered HTML with `new Window()` from happy-dom (already a dev dependency).
- **Commit:** 8a28dce

**2. [Rule 3 - Blocking] Comment wording to satisfy the zero-count acceptance greps**
- **Issue:** The header comments mentioned `motion-js:block`, `<form>` and `motion-safe:`.
- **Fix:** Reworded the comments. The code is unchanged.
- **Commit:** 9dd0868

### Not met: /projects/ eager target 17,500 B (Deferred Issue)

- **Measured:** /projects/ eager is 18,003 B, 503 B over the plan's 17,500 B target. It stays under the project ceiling of 22,000 B and under today's page maximum (/ at 18,024 B).
- **Why it was not trimmed:**
  - The 09-03 module is already lean. There are no duplicated helpers: tokens.ts exports constants only.
  - Saving about 500 B (a quarter of the chunk) would mean deferring the change/animation half into an on-demand chunk while the URL apply stays eager (deep links need it before first paint).
  - That changes 09-03's tested synchronous contract: the change listener writes status and history at once, and its tests and 09-07's e2e rely on that.
  - 09-05 runs in parallel on the same feature, so I did not rework another plan's module mid-wave.
- **Option for the orchestrator:** lazy-load `transition()` and its WAAPI code from the change listener on first use, if the 17,500 B target matters more than the 22,000 B ceiling.

### `/` "unchanged" criterion

- `/` was already 18,007 B at the wave-1 base, above the 17,958 B figure from 08-18, so the plan's `/ ≤ 17,958 B` check was already failing before this plan.
- This plan adds 17 B to `/` through chunk splitting (`interpolate` is now shared with the filter). Home loads no filter code.

## Lock usage

- First attempt: the lock was held by 09-05 with an active Playwright run, so I waited for it with a background until-loop.
- Acquired twice (build + baseline build; build + preview + inspect) and released both times. No stale lock was removed.
- `astro preview` daemonizes in Astro 7. It was stopped with `pnpm astro preview stop` (pid 694) after inspect. It was briefly still running after the second lock release; it was stopped immediately after.

## Known Stubs

None.

## Threat Flags

None. All chip values are build-time constants. The status templates are data-* attributes rendered server-side (T-09-17). The script is imported only by CategoryFilter (T-09-16, measured above).

## Self-Check: PASSED

- Files exist: src/components/ui/CategoryFilter.astro, tests/unit/category-filter-view.test.ts, and the modified ProjectsView, ui.en.ts, ui.es.ts and 08-SPANISH-REVIEW.md.
- Commits exist: bfad45d, 8a28dce, 9dd0868, 2083375.
