---
phase: 03-real-behance-work
plan: 02
subsystem: projects-ui
tags: [projects, i18n, card-view, eslint, e2e, a11y]
requires:
  - 03-01 (model, slug, projects.ts, sources/behance-snapshot.ts, seed snapshot)
provides:
  - src/lib/projects/card-view.ts (toCardView, buildCategoryTitles; site-only)
  - src/lib/content/queries.ts getAllProjects(locale)
  - src/components/ui/ProjectCard.astro, src/components/ui/ProjectGrid.astro
  - src/components/views/ProjectsView.astro
  - /projects/ and /es/projects/
  - All 14 Phase 3 dictionary keys (EN + ES)
  - DATA-06 eslint boundary (no-restricted-imports **/sources/** in src/components/**, src/pages/**)
  - tests/e2e/helpers/projects.ts expectedProjects(locale)
affects: [03-03, 03-04, 03-05, 03-09]
tech-stack:
  added: []
  patterns:
    - Views read projects only through queries.ts (lint-enforced)
    - Stretched-link card, one tab stop per tile
    - Fallback Behance title wrapped in lang="es" on EN pages only
key-files:
  created:
    - src/lib/projects/card-view.ts
    - src/components/ui/ProjectCard.astro
    - src/components/ui/ProjectGrid.astro
    - src/components/views/ProjectsView.astro
    - src/pages/projects/index.astro
    - src/pages/es/projects/index.astro
    - tests/unit/project-card-view.test.ts
    - tests/e2e/projects.spec.ts
    - tests/e2e/helpers/projects.ts
  modified:
    - src/lib/content/queries.ts
    - src/i18n/ui.en.ts
    - src/i18n/ui.es.ts
    - eslint.config.js
decisions:
  - "ProjectGrid and ProjectCard live in src/components/ui/ (no new components/projects/ folder)"
  - "ProjectCard already takes an optional eager prop so ProjectGrid's eagerFirst works now (tile 0 eager + fetchpriority=high per UI-SPEC); 03-03 adds only size"
  - "The seed-origin console.warn fires once per process from getAllProjects"
  - "Every tile is md:col-span-12 for now; 03-03 replaces this with the tileSize rhythm"
metrics:
  duration: ~12 min
  completed: 2026-10-17
  tasks: 3
  files: 13
---

# Phase 3 Plan 02: Projects page (EN/ES) Summary

Visitors can browse all 7 seed projects at `/projects/` and `/es/projects/`, newest first. Each card has a local cover with the localized fallback alt, a stretched title link to `/(es/)projects/<slug>/`, and the year. The data path is snapshot → adapter → `getAllProjects(locale)` → view. An eslint rule stops the UI from importing the source adapter.

## What was built

- **Dictionaries:** the 14 Phase 3 keys from UI-SPEC, copied verbatim into EN and ES. `nav.projects` sits before `nav.contact`, under a `TODO(martina): review Phase 3 copy` comment.
- **card-view.ts (site-only, uses astro:i18n):**
  - `toCardView` resolves href, title, `titleLang`, category label, summary, UTC year, copied tools and the D-15 alt fallback.
  - `buildCategoryTitles` maps each category id to its localized service title. It throws `projects: services.json is missing category ids <ids>. Fix src/data/services.json` when one is missing.
- **queries.ts:** `getAllProjects(locale)` = services collection → `buildCategoryTitles`, then `sortProjects(assertUniqueSlugs(toProjects(getSourceProjects())))` → `toCardView`. It warns once when the snapshot origin is `seed`. `getHomeContent` is unchanged.
- **ProjectCard.astro:** `compact` and `full` variants, dynamic h2/h3, and the exact UI-SPEC link classes (stretched `after:` overlay with a focus ring on the whole tile). It renders `<span lang>` only when `titleLang` is set. The `dl` has sr-only `dt` labels, and category, summary and tools appear only when present. It uses no rounded corners, line-clamp, transitions, icons, string literals or `set:html`.
- **ProjectGrid.astro:** a 12-column `ul` in received order. It never uses dense flow, `order-*` or row-span.
- **ProjectsView.astro:** h1 + intro, then the grid with `eagerFirst`. When there are no projects it shows the empty state instead (h2, body, `#contact` link).
- **Routes:** thin `BaseLayout` + `ProjectsView` files. There are no `[slug]` pages (D-09) and `routes.ts` is untouched.
- **eslint.config.js:** a DATA-06 `no-restricted-imports` block. To test it, I added `import '../../lib/projects/sources/behance-snapshot'` to ProjectsView and confirmed eslint failed with the DATA-06 message. Then I removed the import.

## Verification

- `pnpm vitest run tests/unit/project-card-view.test.ts`: 10 tests pass (one or more per behavior bullet).
- `pnpm lint` passes: astro check 0 errors / 0 warnings / 0 hints, eslint clean, prettier clean.
- `pnpm test`: 23 files, 246 tests pass (was 236).
- `pnpm test:e2e -g "projects page"`: 16/16 pass (8 per locale). Full `playwright test`: 120/120 pass.
- `pnpm build:offline`: `offline build ok (0 network attempts, 6 html files scanned)`.
- Acceptance greps:
  - `grep -rn "sources/" src/components src/pages` finds nothing.
  - `set:html` count in src is 1.
  - `dist/projects/` and `dist/es/projects/` each contain only `index.html`.
  - No `rounded-`, `line-clamp` or `transition` in ProjectCard.
  - Zero `page.goto` calls to slug URLs.
- RED check: before Task 3 the e2e failed 12 of 16 (404 page). The 4 that passed were axe and the no-behance check on the 404 page.
- **taste-skill gate:**
  - `lint.mjs` on the 5 new UI files: 0 FAIL, 0 WARN.
  - `inspect.mjs http://localhost:4455/projects/`: 2 FAIL, 4 WARN.
  - Screenshots reviewed (desktop fold, mobile pages): the structure matches the UI-SPEC card contract.
  - `still-page` FAIL: motion is Phase 6, and UI-SPEC bans transitions in Phase 3.
  - `empty-screens` FAIL: the covers are flat solid-colour seed placeholders and every tile is still full width. 03-03 adds the asymmetric rhythm and 03-09 the real covers. Re-run the inspector after both.
  - The WARNs (header hairline, cream palette, no button in the first screen, no footage) come from the existing site shell and palette from Phases 1–2. They are not new in this plan.

## Commits

| Task | Commit | Message |
| ---- | ------ | ------- |
| 1 + 2 RED | 165dd78 | test(03-02): add failing projects page tests |
| 2 GREEN | 6976bc0 | feat(03-02): add project card view and query |
| 3 | cc4b458 | feat(03-02): add projects pages in en and es |

## TDD Gate Compliance

Task 2 has a `test(...)` RED commit (165dd78) followed by a `feat(...)` GREEN commit (6976bc0). The unit test failed before card-view.ts existed (module not found). The RED commit also carries the Task 1 e2e spec and helper, as the commit_protocol asks, because the spec only type-checks once Task 2 adds the dictionary keys. That RED commit does not pass `pnpm lint`; every later commit does.

## Deviations from Plan

1. **[Rule 2 - Missing functionality] `eager` prop on ProjectCard now.** The plan gives ProjectGrid an `eagerFirst` prop but leaves `eager` to 03-03. Without the card prop, `eagerFirst` would do nothing, and UI-SPEC wants tile 0 `eager` + `fetchpriority="high"` (LCP). I added an optional `eager` (default false). 03-03 only needs to add `size`. Commit cc4b458.
2. **RED commit split.** Task 1 and the Task 2 unit test went into one `test(...)` commit, and the Task 2 implementation into the `feat(...)` commit. This differs from a single combined Task 1+2 commit, so that the TDD RED/GREEN gate stays visible.
3. **Coverage beyond the plan:** an extra no-alias tools test, and a key-order assertion in `buildCategoryTitles`.

## Known Stubs

- `src/i18n/ui.en.ts` / `ui.es.ts`: the Phase 3 copy block is marked `TODO(martina): review Phase 3 copy`.
- The seed covers (`src/assets/projects/*.png`) are solid placeholders until 03-09. `getAllProjects` warns at build while `origin === "seed"`.
- Card links point at `/projects/<slug>/`, which 404s until Phase 4 (D-09, accepted). The e2e asserts them without following them (`TODO(phase-4)` comment).
- The nav "Projects" link and `aria-current` are not wired yet (plan 03-05). The keys exist.

## Self-Check: PASSED

- All created files exist on disk: card-view.ts, ProjectCard/ProjectGrid/ProjectsView, both route files, the unit test, the e2e spec and helper.
- Commits 165dd78, 6976bc0 and cc4b458 are present in `git log`.
