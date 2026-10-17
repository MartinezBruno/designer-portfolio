---
phase: 04-project-detail-discovery
plan: 04
subsystem: project-detail
tags: [astro, navigation, a11y, e2e, detail-page]
requires: [04-01 detail routes and ProjectDetailView, phase-03 sortProjects and toCardView]
provides:
  - neighbours(sorted, slug), a pure Node-safe helper (src/lib/projects/detail-view.ts)
  - TeaserView type; ProjectDetailView.next / .previous
  - ProjectContactBand.astro (only accent button, links to /#contact or /es/#contact)
  - NextProjectTeaser.astro (next tile + Previous link)
  - ExpectedDetail.next / .previous in the e2e helper
  - Phase 3 D-09 link-check debt closed (every card link followed, expects 200)
affects: [04-09 module stack (slots between intro and contact band), a11y detail keyboard-order check]
tech-stack:
  added: []
  patterns: [wrap-around neighbours over sortProjects output, teaser fields picked from toCardView]
key-files:
  created:
    - src/lib/projects/detail-view.ts
    - src/components/project/ProjectContactBand.astro
    - src/components/project/NextProjectTeaser.astro
    - tests/unit/project-detail-view.test.ts
    - tests/unit/project-closing.test.ts
  modified:
    - src/lib/projects/model.ts
    - src/lib/projects/detail-view-site.ts
    - src/lib/content/queries.ts
    - src/components/views/ProjectDetailView.astro
    - src/components/ui/ProjectCard.astro
    - tests/unit/project-detail-site.test.ts
    - tests/unit/project-intro.test.ts
    - tests/e2e/helpers/projects.ts
    - tests/e2e/project-detail.spec.ts
    - tests/e2e/projects.spec.ts
    - tests/e2e/home-latest-work.spec.ts
    - tests/e2e/a11y.spec.ts
decisions:
  - No ProjectCover.astro extraction; the teaser cover box differs from ProjectCard (no size map, always lazy) and ProjectCard renders an li
  - Contact band row gets items-start on phones so the pill keeps content width (screenshot review)
  - a11y.spec follows each project-link step with page.request.get and expects 200
metrics:
  duration: ~25min
  completed: 2026-10-17
---

# Phase 4 Plan 04: Next/previous navigation and contact band Summary

Detail pages now end with a surface-alt contact band and a large next-project tile next to a quiet "Previous" link. Both links wrap around the `/projects` order and skip hidden projects, through the pure `neighbours()` helper. Every card link on Home and Projects is now followed in e2e and returns 200.

## What was built

- **`neighbours(sorted, slug)`** (`src/lib/projects/detail-view.ts`): pure, with no Astro virtual-module imports. With 1 project there are no neighbours. With 2, only `next` is set. With 3 or more, both are set and wrap. An unknown slug throws a developer error that names the slug. The e2e helper uses the same function, so expectations cannot drift from the site.
- **Model and query layer:** `TeaserView = Pick<ProjectCardView, slug|href|title|titleLang|cover|coverAlt>`. `toDetailView` takes a fifth argument, `neighbours`, and maps each neighbour through `toCardView`, so localization has one code path. `queries.ts` computes `sortProjects(loadProjects())` once and passes `neighbours(sorted, project.slug)` in both `loadDetails` and `getProjectDetail`.
- **`ProjectContactBand.astro`:** markup follows the UI-SPEC. `ButtonLink` points to `getRelativeLocaleUrl(locale, '/') + '#contact'` and carries an aria-hidden arrow-right icon.
- **`NextProjectTeaser.astro`:** a 12-column grid. The left column holds the h2 "Next project" and the optional Previous link (arrow-left, `span[lang]` on fallback titles). The right column is a 7/12 `article.group/card` tile with the same `Picture` widths and sizes as the Projects `large` tile. It has a 36px h3 and a stretched title link with an sr-only "Next project:" prefix, so it is one tab stop with the accessible name "Next project: {title}". It has no accent fill, no `set:html`, no eyebrow, no box and no shadow.
- **`ProjectDetailView.astro`:** renders `article`, then the contact band, then the teaser. The teaser is left out when `detail.next` is null. No motion.
- **e2e:**
  - `project-detail.spec` checks, for all 7 projects in both EN and ES:
    - contact href
    - the main area has exactly one accent button
    - next and previous hrefs and accessible names, with both links followed (200)
    - wrap-around for first and last
    - the next tile's `::after` shows a solid outline under keyboard `:focus-visible`
    - the h1, every h2 in main and the teaser h3 render in 2 lines or fewer at 320, 390, 768 and 1440
    - `scrollWidth <= 320` at 320 px
    - visual order equals DOM order in the meta row and the teaser at 1440 and 390
  - `projects.spec`, `home-latest-work.spec` and `a11y.spec` now follow every card link and expect 200.
  - `a11y.spec` runs axe on the `website-instablogs`, `portfolio-web` and `sistema-visual` detail pages in EN and ES, with motion on and with reduced motion. The slugs are resolved through `expectedDetails`, and the test throws if one disappears.
- `ProjectCard.astro`: the "404 by design" comment now reads "The title link opens the project detail page (Phase 4)."

## Verification

- `pnpm lint` (astro check + eslint + prettier): exit 0, 0 errors and 0 warnings.
- `pnpm test`: 39 files, 518 tests passed.
- `pnpm build`: 20 pages.
- `pnpm exec playwright test` for the 4 plan specs: 210 passed. Full e2e suite: 325 passed. This was re-run after the contact-band fix.
- Acceptance greps:
  - `grep -c "astro:" src/lib/projects/detail-view.ts` returns 0.
  - `grep -c "neighbours(" src/lib/content/queries.ts` returns 2.
  - `grep -c "bg-accent" NextProjectTeaser.astro` returns 0.
  - `#contact` is present in ProjectContactBand.
  - `set:html` does not appear in either new component.
  - `grep -rn "TODO(phase-4)" tests src` finds nothing.
  - `grep -c "404 by design" ProjectCard.astro` returns 0.
- Two-line rule: no real EN or ES title failed it at any tested width (verified by the e2e line-count test).

## Taste gate

- `lint.mjs src/components/project`: 3 files, **0 FAIL, 0 WARN**.
- `inspect.mjs` on `/projects/website-instablogs/` and `/es/projects/website-instablogs/` (preview on port 4431, because 4321 was busy). Both runs gave the same codes:
  - FAIL `still-page`: accepted (D-04, no motion until Phases 6–7).
  - FAIL `few-pictures`: 1 picture. In this worktree the module stack has not landed yet (it is a sibling plan in this wave, assembled in 04-09), so the cover of the next project is the only image. UI-SPEC expects this to clear on InstaBlogs once the module images render. **Re-check after 04-09.**
  - FAIL `focal-point`: the first screen shows the intro band and the contact band only, and the largest type is 36px. The 36px h1 is locked by the UI-SPEC two-line rule, so the dominant element is expected to come from the module stack's first full-width image. It is not in the UI-SPEC accepted list. **Re-check after 04-09; raise with the user if it persists.**
  - WARN `hairline`, `palette-cream`, `no-footage`: pre-existing site-wide, accepted.
  - None of the forbidden codes fired (`headline-lines`, `eyebrow`, `micro-label`, `shadow`, `gradient`, `outlined-box`, `card-rows`, `icon-cards`, `overflow`, `broken-image`, `clipped-text`, `contrast`, `grey-body`, `size-count`, `font-count`). Sizes in use: 14/16/24/36. Two typefaces.

**Screenshot critique (1440 / 768 / 390):**
- The fields step in tone as specified: cream intro, surface-alt contact band, cream teaser, surface-alt footer. There are no lines or boxes.
- At 1440 the teaser reads as the next plate of the Projects gallery: a large 7/12 cover with a 36px title underneath, and the "Next project" heading and "Previous" link held quietly in the left 5 columns. Visual order matches DOM order.
- At 768 the 5/7 split holds, and the heading and Previous link stay in one line each.
- At 390 the layout stacks as heading, then Previous, then tile.
- One defect was found and fixed: on phones the contact pill stretched to full width with its label left-aligned, which made the pill look lopsided. The band row now has `items-start`, so the pill keeps its content width, the same as the hero CTA. Re-inspected: fixed.
- The page is short (1.7 screens) because the module stack is missing in this worktree. That is not a defect of this plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The JSDoc text "astro:*" broke the `grep -c "astro:"` = 0 criterion**
- **Found during:** Task 1
- **Fix:** Reworded the comment to "imports no Astro virtual modules".
- **Commit:** 24d127f

**2. [Rule 3 - Blocking] `tests/unit/project-intro.test.ts` fixture missed the new required fields**
- **Found during:** Task 1 (`astro check` ts2739)
- **Fix:** Added `next: null, previous: null` to the fixture.
- **Commit:** 6f61111

**3. [Rule 1 - Bug] Full-width contact pill on phones (screenshot review)**
- **Found during:** Task 3 taste gate
- **Fix:** Added `items-start` to the contact band row. This departs from the verbatim UI-SPEC class string, but `md:items-end` and the desktop layout are unchanged.
- **Commit:** 4e09e38

**4. [Rule 2 - Coverage] The heading line-count test could pass vacuously**
- **Fix:** It now asserts at least 4 measured headings when a teaser exists (2 otherwise). It also measures the teaser h3, which the UI-SPEC holds to the same two-line rule.
- **Commit:** e01a7fe

## TDD Gate Compliance

- Task 1: RED `ae86ff9` (module-not-found failure), then GREEN `6f61111`. Compliant.
- Task 3 (tdd="true"): the behaviour it tests was implemented in Task 2, so its e2e tests passed on first run. It has a single `test(04-04)` commit (`e01a7fe`), which also contains the one-line ProjectCard comment change, and no separate RED failure. This is noted as a gate deviation.

## Known Stubs

None. Every value is wired from the snapshot and overrides.

## Self-Check: PASSED

- All 5 created files exist.
- Commits ae86ff9, 6f61111, 24d127f, 7ad806c, e01a7fe and 4e09e38 are present in `git log`.
