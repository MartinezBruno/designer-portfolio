---
phase: 06-scroll-interaction-motion
plan: 04
subsystem: motion
tags: [reveal, projects, project-detail, a11y, e2e]
requires:
  - "06-03 reveal runtime and markup API (data-reveal lines|settle|shutter, data-reveal-delay, data-reveal-stagger)"
provides:
  - "Reveal hooks on the Projects heading block and the empty state"
  - "Reveal hooks on detail pages: intro, text modules, contact band contents, Next-project teaser"
  - "A settle wrapper div around the contact band ButtonLink (06-07 makes the link magnetic)"
  - "A settle wrapper div around the teaser Previous link"
  - "settleReveals(page) in a11y.spec.ts: axe audits the settled page"
affects:
  - "06-07 (the magnetic band button sits inside the settle wrapper, never carries data-reveal)"
  - "06-08 (the h1 lines split on detail pages; the h1 may hold a lang span)"
tech-stack:
  added: []
  patterns:
    - "Reveal on a wrapper, never on a link or a magnetic target"
    - "Image stack stays static: no data-reveal inside the module stack except TextModule roots"
    - "Axe runs after CSS transitions finish, because a mid-fade opacity skews its contrast maths"
key-files:
  created: []
  modified:
    - src/components/views/ProjectsView.astro
    - src/components/project/ProjectIntro.astro
    - src/components/project/TextModule.astro
    - src/components/project/ProjectContactBand.astro
    - src/components/project/NextProjectTeaser.astro
    - src/components/views/ProjectDetailView.astro
    - .planning/phases/04-project-detail-discovery/04-CONTEXT.md
    - tests/unit/project-intro.test.ts
    - tests/unit/project-closing.test.ts
    - tests/unit/project-modules.test.ts
    - tests/e2e/motion-reveal.spec.ts
    - tests/e2e/a11y.spec.ts
decisions:
  - "The detail-page a11y audits now wait for reveal transitions to finish. Without that, axe intermittently flagged color-contrast on intro text caught mid-fade."
  - "The teaser Previous wrapper is a plain block div. The parent's items-start keeps the link left-aligned and content-width, so no extra utility was needed."
metrics:
  duration: "~35 min"
  completed: 2026-10-29
  tasks: 2
  files: 12
---

# Phase 6 Plan 04: Projects and Detail Reveals Summary

Scroll reveals now cover the Projects heading block and every project detail page in EN and ES, per D-04 (which amends Phase 4 D-04). The intro title gets a line split, and the summary, metadata groups and Behance row settle in. Each text module settles as one block. In the contact band only the contents move, and the Next-project teaser uses lines, settle and shutter. The module image stack stays static.

## What was built

- **ProjectsView**: h1 `lines`, intro settles at +140, the empty-state block settles. The cards were already hooked in 06-03.
- **ProjectIntro**:
  - h1 `lines`. Any `<span lang>` is kept exactly as is.
  - Summary settles at +140.
  - The `<dl>` has `data-reveal-stagger="70"`, and each group settles at +210, so they land at 210 and 280 ms.
  - The Behance `<p>` settles at +350. The hook is on the `<p>`, never on `ExternalTextLink`.
- **TextModule**: the root div settles. The sanitized HTML is never split (T-06-10).
- **ProjectContactBand**:
  - h2 `lines`, body settles at +140.
  - A new `<div data-reveal="settle" data-reveal-delay="210">` wraps `ButtonLink`.
  - The `surface-alt` section and its layout div carry no hook.
- **NextProjectTeaser**:
  - h2 `lines`.
  - The Previous link is wrapped in a settle div at +140.
  - The cover frame is a `shutter` at +140.
  - The h3 settles at +210. It holds the stretched link, so it never uses `lines`.
- **Static stack**: ImageModule, CollectionModule, EmbedFacade and UnknownModule have no hooks (verified by grep: 0 per file).
- **04-CONTEXT.md**: the D-04 entry now ends with "Amended by Phase 6 D-04 (2026-10-29) ...".
- **ProjectDetailView.astro**: I updated a stale "No motion (D-04)" comment. This is a comment-only change.

## Verification

- **Unit**: `pnpm test` gives 62 files and **1,009 tests passing**. The new tests check:
  - The intro h1 uses `lines`, including with a lang span.
  - The summary, groups and Behance row have their settle delays, and no `<a>` has a hook.
  - The band has h2/body/wrapper hooks, and the section and field divs have none.
  - The teaser has h2 lines, a Previous wrapper, a shutter cover and an h3 settle, and no `<a>` has a hook.
  - The TextModule root settles, with exactly one hook.
  - Image, Collection, Unknown and every stack kind dispatched through ProjectModule have no `data-reveal`.
- **`pnpm lint`** (astro check, eslint, prettier): 0 errors, 0 warnings.
- **E2E** (`pnpm build`, then motion-reveal, motion, motion-toggle, project-detail, projects, projects-grid and a11y): **347 passed**. New in `motion-reveal.spec.ts`, run on `/projects/`, `/es/projects/` and the first `expectedDetails` page per locale (`/projects/cabreras-motos-posts/`, `/es/projects/cabreras-motos-posts/`):
  - **Without JavaScript**: every `[data-reveal]` has opacity 1, translate none and an open clip.
  - **Fails**: with `**/_astro/**/*.js` aborted, everything is visible within 1.7 s.
  - **Scroll** at 1440x900: everything is revealed, and nothing re-hides after scrolling back to the top.
  - **Static stack** (detail EN and ES): the stack container has no hook. The only hooks inside it are TextModule `DIV:settle` roots without images. The effective opacity of every module image, multiplied up the ancestor chain, stayed at 1 at every scroll sample.
- **a11y stability**: after the fix (see Deviations), `a11y.spec.ts --repeat-each=5` gave **215/215 passed**.
- **Acceptance greps**:
  - `data-reveal="lines"`: 1 each in ProjectsView, ProjectIntro, ProjectContactBand and NextProjectTeaser.
  - `data-reveal`: 0 in each of the 4 stack modules.
  - "Amended by Phase 6 D-04": 1.
  - `expectedDetails` in motion-reveal.spec.ts: 2.
  - A test title contains `static stack`.

## Taste gate (CLAUDE.md)

- **lint.mjs** on `src/components/project` and `src/components/views` (13 files): **0 FAIL, 0 WARN**.
- **inspect.mjs** against my own build preview (port 4473; see Other notes). No page had `empty-screens` or `overflow`.

| Page | Result | Codes | Moving elements (1440/768/390) |
|------|--------|-------|------|
| `/projects/` | 1 FAIL, 4 WARN | FAIL `focal-point`; WARN `hairline`, `palette-cream`, `first-action`, `no-footage` | 21 / 21 / 21 |
| `/es/projects/` | 1 FAIL, 4 WARN | same as EN | 21 / 21 / 21 |
| `/projects/cabreras-motos-posts/` | 0 FAIL, 5 WARN | `hairline`, `palette-cream`, `first-action`, `no-footage`, `still-page` (13) | 13 / 13 / 13 |
| `/es/projects/cabreras-motos-posts/` | 0 FAIL, 5 WARN | same as EN, `still-page` (13) | 13 / 13 / 13 |
| `/projects/website-instablogs/` (extra) | 1 FAIL, 4 WARN | FAIL `still-page` (5); WARN `hairline`, `palette-cream`, `first-action`, `no-footage` | 5 / 5 / 5 |

- **Detail `still-page` WARN (13 elements, within 8–15)**: the image stack is static by D-04, so only the intro, text modules, band and teaser move. The stack's parallax is Phase 7.
- **InstaBlogs `still-page` FAIL (5)**: the page is 52.6 screens long, and the inspector walks at most 11 screens. The band and teaser at the end never enter its window, so only the intro and early text modules register. The e2e scroll test proves every hook on the detail pages reveals.
  - [Inference] The full-page count would be about 13, like Cabrera's. I did not measure it, because the inspector caps the walk.
  - The stack is static by D-04.
- **Pre-existing, outside this plan's motion scope**:
  - `focal-point` on `/projects/`: the 48px h1 is the page-composition choice from Phase 3.
  - `hairline` (header border, recorded in 06-01 and 06-03).
  - `palette-cream`, `first-action`, `no-footage`.
  - No line this plan changed caused any of them.
- **Screenshots reviewed**: `.taste-skill/06-04/<page>/` (inspector sheets) and `.taste-skill/06-04/motion-states/` (band and teaser, 200 ms mid-reveal and settled, at 1440 and 390, EN and ES). These are gitignored. The throwaway scripts are `tmp/inspect-06-04.sh` and `tmp/capture-06-04.mjs`, also gitignored.
- **Critique** (motion passes only):
  1. *Fine:* at 200 ms the band's `surface-alt` field is fully present. Its heading is in, the body is mid-fade and the button is still waiting, so the order reads heading, text, action. Nothing fades into anything.
  2. *Fine:* the teaser h2 is in, Previous is mid-fade, and the cover opens as a top-anchored band. The h3 sits below the cover at +210, so the title never reads ahead of its picture. This avoids the inversion noted in 06-03 critique item 2.
  3. *Fine:* settled screens show every hooked element. The stack has no blank gaps between edge-to-edge images, and text modules are visible on the red Behance canvas.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Axe flagged contrast on detail intro text caught mid-fade**
- **Found during:** Task 2 (plan verify run of a11y.spec.ts)
- **Issue:** The detail intro is now above-the-fold reveal content. Axe ran while it was still fading in and intermittently reported `color-contrast`: 2 of 324 runs, then 2 of 104 with `--repeat-each=4`, on `/projects/portfolio-web/`, `/es/projects/sistema-visual/` and `/es/projects/website-instablogs/`.
- **Fix:** I added `settleReveals(page)` to `a11y.spec.ts`. It waits for load and two frames, then for every `CSSTransition` to finish. It is called before `analyze()` in the per-page axe loop and in the reduced-motion Projects/detail loop. The product markup is unchanged, and the settled page is what a visitor reads.
- **Files modified:** tests/e2e/a11y.spec.ts
- **Commit:** 2b2177c

**2. [Rule 1 - Doc] Stale "No motion (D-04)" comment in ProjectDetailView.astro**
- **Fix:** Comment-only change: it now points to Phase 6 D-04 and the static stack.
- **Commit:** 2b2177c

### Other notes
- The worktree base was 234dcb2, not the expected 495db2f. I reset to 495db2f before any work, as the startup check instructs.
- The plan's verify commands `cd` into the main checkout. I ran them inside this worktree.
- The first inspect pass hit the parallel 06-05 executor's preview on port 4471: its build has no 06-04 hooks, and it reported 0 elements moved. My `astro preview` had fallen through to 4473. I discarded those results and inspected again against 4473. I confirmed the served HTML carries the hooks first.

## Threat Flags

None. The only change at the trust boundary (T-06-10) is an attribute on the TextModule wrapper. The sanitized HTML is not split or re-parsed. T-06-11 is covered per page and locale by the no-JS and failsafe e2e.

## Known Stubs

None.

## Self-Check: PASSED

- All 12 modified files exist in the worktree. SUMMARY created.
- Commits present: 778651b (feat, task 1), 2b2177c (test, task 2).
