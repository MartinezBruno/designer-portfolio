---
phase: 09-portfolio-features-hero-full-width-on-mobile-photography-ser
plan: 07
subsystem: projects-filter
tags: [e2e, a11y, filter, taste-gate, PROJ-04, PROJ-07]
requires:
  - "09-03 category-filter client module and DOM contract"
  - "09-05 data-tile grid"
  - "09-06 CategoryFilter chips on /projects/ and /es/projects/"
provides:
  - "tests/e2e/projects-filter.spec.ts: end-to-end filter coverage in EN and ES (22 tests)"
  - "Specs updated for the filter: projects.spec, a11y.spec Tab order, keyboard-journeys comment"
affects: [phase 9 verification]
tech-stack:
  added: []
  patterns:
    - "MutationObserver in page to count live-region writes and catch a transient data-vt"
key-files:
  created:
    - tests/e2e/projects-filter.spec.ts
  modified:
    - src/lib/ui/category-filter.ts
    - tests/unit/category-filter.test.ts
    - tests/e2e/projects.spec.ts
    - tests/e2e/a11y.spec.ts
    - tests/e2e/keyboard-journeys.spec.ts
decisions:
  - "A filter change marks the reveal targets of every visible card as revealed instantly, not only the newly shown cards. A card that was waiting below the fold for its scroll reveal can move into view, and it must not fade in late (reduced motion) or reveal on top of the entrance (motion on)."
  - "The odd last tile (large-end) is asserted as centred, not right-aligned. The finish-review redesign centres it, and projects-grid.spec.ts asserts the same."
metrics:
  duration: ~35min
  completed: 2026-11-10
  tasks: 3
  files: 6
---

# Phase 9 Plan 07: Projects Filter E2E and Taste Gate Summary

The category filter is now covered end to end in EN and ES: chips, re-flow, URL handling, deep links, Back restore, keyboard, skip link, leaks, reduced motion, no JS and axe. The specs that assumed there was no filter are updated, and the 11-spec suite passes (224 tests). The e2e run found one real defect: under reduced motion, cards that moved into view after a filter change stayed at opacity 0. It is fixed, and a unit test covers it.

## Tasks

| Task | Name | Commits |
|------|------|---------|
| 1 | projects-filter.spec.ts (EN/ES) plus the defect fix | bda5a84 (fix + unit test), 07becf2 (e2e spec) |
| 2 | Update the specs that assumed no filter, then run the related suites | 8bd3ee0 |
| 3 | Taste gate on the Projects pages | no commit (verification only; no source change needed) |

## What the new spec proves (per locale, 1280x900)

1. **Chips:** in the order `['', graphic-design, web-design, branding, social-media]`. Labels come from the dictionary and services.json. All is checked and there is no Photography chip.
2. **Filtering:**
   - Web design shows 3 cards with tiles `large, small, large-end`, and the other 4 `li` elements carry `hidden`.
   - The grid has no hole: large and small fill the first row edge to edge, and large-end is centred.
   - The URL becomes `?category=web-design` and `history.length` does not change.
   - The status reads "Showing 3 projects in Web design" (ES: "Mostrando 3 proyectos de Diseño web").
   - All restores the 7-card rhythm, removes the param and announces "Showing all 7 projects".
3. **Deep links:**
   - `?category=branding` shows 1 `large` card with its radio checked and no announcement.
   - `?category=bogus`, `?category=` and `?category=%3Cscript%3E` show all 7, and the URL is cleaned (T-09-18).
4. **Back restore:** confirms the 09-03 inference. Back from a detail page opened from `?category=web-design` restores the param, 3 cards and the checked radio, with scroll within 100px of where it was.
5. **Keyboard:**
   - Tabbing reaches the checked chip as a single stop.
   - ArrowRight checks Graphic design, keeps focus on it and leaves 2 cards.
   - Tab then moves to the first visible card's link.
6. **Skip link on a filtered page:** `html` never gets `data-vt` in the 500ms after Enter, `#main` is focused, and the URL keeps `?category=web-design` and ends with `#main`.
7. **Leaks:** after 3 soft round trips /projects/ → home → /projects/, one chip click writes the status exactly once (T-09-19).
8. **axe:** zero WCAG 2.2 AA violations on the unfiltered page and on `?category=web-design`.
9. **Reduced motion:** the change is synchronous after the click, and every visible `li` and `[data-reveal]` target has computed opacity 1.
10. **No JS:** the fieldset is hidden and all 7 cards are visible.

## Verification

- `pnpm test`: 76 files, 1407 tests pass. `pnpm lint` (astro check 0/0/0, eslint, prettier) passes.
- Holding the lock, after building:
  - `projects-filter.spec.ts`: 22/22.
  - The 11 specs from Task 2's verify list: **224/224 passed** (6.0m), including smooth-scroll, contact-lazy, anchors, navigation-leaks (unchanged, constant counts per URL) and transitions.
- `keyboard-journeys.spec.ts` ran 3 times in total (once in the suite and `--repeat-each=2` after it): 20 + 40 runs, all passed.
  - Test 9 ("empty submit focuses the first invalid field") did **not** flake in any of the 3 runs.
- Acceptance greps:
  - "has no filter or search UI" = 0
  - `projects-filter-all` in a11y.spec.ts = 1
  - "N/A: with 7 projects" = 0
  - In projects-filter.spec.ts, history.length, reducedMotion, javaScriptEnabled: false, goBack and AxeBuilder are each present at least once.

## Taste gate (Task 3)

**lint.mjs** on CategoryFilter.astro, ProjectsView.astro, ProjectGrid.astro, ProjectCard.astro and category-filter.ts: **0 FAIL, 0 WARN**.

**inspect.mjs** ran at 1440/768/390 on preview port 4417:

| URL | FAIL | WARN |
|-----|------|------|
| /projects/ | empty-screens (4/5) | first-action, no-footage |
| /es/projects/ | empty-screens (4/5) | first-action, no-footage |
| /projects/?category=web-design | empty-screens (2/4), few-pictures (3) | first-action, no-footage |

Defence of the remaining findings (none come from the chip row, and none are new in this plan):

- **empty-screens:** a measurement artefact.
  - The desktop page sheets show every screen filled with covers and titles.
  - The inspector measures before the scroll-reveal shutters open, so it counts the clipped covers as empty ground.
  - 09-06 recorded the same FAIL on the unfiltered page before this plan.
- **few-pictures** (filtered page only): the filter shows exactly the 3 real Web design projects, which is the point of the filter. The unfiltered page has 7.
- **first-action / no-footage:** page-level and pre-existing. An index page's action is to open a project, and there is no honest clip of her work.

Measured with Playwright on the preview at 1440px:

- The intro, the chip fieldset and the grid share left edge x=64. The h1 box sits at 57, which is the display face's optical offset and was there before this plan.
- Intro to chips is **48px**; chips to grid is **32px**.
- At 390px there is no horizontal scroll (`scrollWidth` 390 on `?category=web-design`), and the chips wrap to two rows.

Motion-on chip change, sampled every 80ms:

1. The 4 leaving cards fade 1 → 0 over about 240ms.
2. They become `hidden`.
3. The 3 Web design cards rise from `translate: 0 16px` at opacity 0 to rest with a 60ms stagger, done in about 700ms.

This matches the UI-SPEC Filter motion.

```
ROUND 1
Seen in one second: the giant "Projects" headline, then the red Cabrera's Motos cover.
Idea (one sentence): the work is the page: newest-first covers in an L S · S L rhythm; the filter re-cuts the same rhythm per discipline.
Live thing: the category chips (re-flow the grid in place; deep-linkable).
Layout words by section: hero=statement / filter=chip row / work=asymmetric grid / footer=full-width name on a colour field.
Scores: design 7.5 · usability 8 · creativity 7 · content 7.5 → overall 7.5
Caps applied: inspector FAIL (empty-screens) would cap at 6.0; recorded as a measurement artefact (screenshots show full screens), so the cap is noted rather than accepted as a real finding.
Top three problems (most visible first):
1. Filtered Web design page is short (3 screens), so the footer arrives fast (web-design/desktop-page-01.jpg). Inherent to 3 projects; no fix.
2. Chips are small next to the 168px headline at 1440 (desktop-fold.jpg). Defended: chips are controls, not headlines; 44px targets, ink-filled selection, the same chip as the contact form.
3. The h1 sits 7px left of the intro and chip edge (optical offset of the display face, pre-existing).
```

The selected chip is ink-filled (`peer-checked:bg-ink`) and no accent marks state. Focus uses the accent outline, which is correct.

Screenshots are in the worktree under the gitignored `tmp/taste-09-07/`:

- `projects/{desktop-fold,desktop-page-01,desktop-page-02,tablet-fold,tablet-page-01,mobile-fold,mobile-page-01}.jpg`
- `es-projects/` (same set)
- `web-design/{desktop-fold,desktop-page-01,tablet-fold,tablet-page-01,mobile-fold,mobile-page-01}.jpg`
- `motion-after.png`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Cards that stayed visible were left at opacity 0 after a filter change**
- **Found during:** Task 1 (reduced-motion e2e, both locales)
- **Issue:**
  - `transition()` and `enter()` marked reveal targets instant only on cards that were `hidden` before the change.
  - Under All, Web design cards below the fold had not had their scroll reveal yet. The filter moved them into view still at opacity 0, and they then faded in late (`--t-fade`).
  - That breaks the UI-SPEC rule for reduced motion ("instant", "no card left at opacity < 1"). With motion on, the scroll reveal could also play on top of the filter entrance.
- **Fix:** both paths now call `showInstantly` on every visible card. A unit test was added (RED, then GREEN). The existing "newly visible" test and the branding-unchanged assertion still pass.
- **Files modified:** src/lib/ui/category-filter.ts, tests/unit/category-filter.test.ts
- **Commit:** bda5a84

**2. [Plan text vs current design] large-end asserted centred, not right-aligned**
- The plan says the large-end card is "right-aligned within the grid". The finish-review redesign centres it (`col-start-3 col-span-8`), and projects-grid.spec.ts asserts it centred. The new spec asserts no hole and a centred last tile instead.
- **Commit:** 07becf2

**3. [Spec detail] a11y Step for the chip**
- The `Step` type has no id field, so the chip stop is `{ name: dict['projects.filter.all'], tag: 'INPUT', ringOnLabel: true }`, like the contact radio. `#projects-filter-all` is named in the comment beside it.

## Lock usage

- Acquired fresh; no stale lock was present.
- Held across build, the e2e runs, the keyboard repeats, preview on 4417 and inspect.
- Preview stopped with `pnpm astro preview stop` (pid 6215). Port 4417 was confirmed closed and no `astro preview` process was left.
- Lock released.

## Known Stubs

None.

## Threat Flags

None. No new surface: tests plus a one-line behaviour change in an existing client module.

## Self-Check: PASSED

- Files exist: tests/e2e/projects-filter.spec.ts and the modified src/lib/ui/category-filter.ts, tests/unit/category-filter.test.ts, tests/e2e/projects.spec.ts, tests/e2e/a11y.spec.ts and tests/e2e/keyboard-journeys.spec.ts.
- Commits exist: bda5a84, 07becf2, 8bd3ee0.
