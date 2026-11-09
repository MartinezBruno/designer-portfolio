---
phase: 08-quality-verification
plan: 04
subsystem: testing-a11y
tags: [a11y, axe, e2e, playwright, wcag22, motion-states, review-debt]
requires:
  - 08-01 (marquee pause contract)
  - 08-02 (/es/404/ rendered on demand with status 404)
  - 08-03
provides:
  - sweepRoutes() helper deriving every page route per locale from expectedDetails
  - shared AXE_TAGS and gotoWithoutSiteScripts helpers
  - a parallel axe sweep over every route in on, reduced and off, plus a build-output guard
  - D-16 verdict table for every hunk the redesign merge removed from tests/
affects:
  - tests/e2e/a11y.spec.ts
tech-stack:
  added: []
  patterns:
    - "Route lists for e2e are derived from the snapshot helpers, and a guard compares them with dist/client so a new page cannot skip the sweep"
    - "test.describe.configure({ mode: 'parallel' }) for a file of independent page scans"
key-files:
  created:
    - tests/e2e/helpers/routes.ts
    - tests/e2e/helpers/axe.ts
    - tests/e2e/a11y-sweep.spec.ts
  modified:
    - tests/e2e/a11y.spec.ts
decisions:
  - "D-07: the sweep's 404 routes are /does-not-exist (EN) and /es/404/ (ES); the guard drops /404.html and /es/404/ from the build list because those pages are visited by explicit path"
  - "D-08: parallel mode inside one file with the default worker count (5 on this 10-core machine); no sharding needed at about 40 s"
  - "D-16: no assertion restored; every removed hunk was tooltip/icon or redesign-layout specific and is replaced by an equivalent current assertion"
metrics:
  duration: ~35 min
  completed: 2026-11-06
  tasks: 2
  files: 4
---

# Phase 8 Plan 04: Every-route axe sweep and D-16 trimmed-spec re-check Summary

Every built page in English and Spanish (20 routes) now gets a WCAG 2.2 AA axe scan in all three motion states. That is 60 scans in parallel plus a guard that fails when `dist/client` contains a page the sweep does not visit. The run passed with zero violations in about 40 s. I re-checked every hunk the redesign merge (ff5bf7c) removed from `tests/`. None needed restoring, and each has a recorded reason below.

## Tasks

| # | Task | Commit |
|---|------|--------|
| 1 | Every-route, three-state axe sweep with build-output guard (D-07, D-08) | 7e462bc |
| 2 | Re-check the e2e assertions trimmed by the redesign merge (D-16) | no code change; verdicts recorded in this SUMMARY (docs commit) |

## Task 1: the sweep

**Route list.** `sweepRoutes()` builds this from `expectedDetails`. No slug is hard-coded.

| Locale | home | projects | detail (7 each, `/projects` order) | 404 |
|--------|------|----------|------------------------------------|-----|
| en | `/` | `/projects/` | `/projects/{cabreras-motos-posts, purov, website-reciclick, portfolio-web, sistema-visual, website-instablogs, mart}/` | `/does-not-exist` |
| es | `/es/` | `/es/projects/` | `/es/projects/{same 7 slugs}/` | `/es/404/` |

**Results** [Verified by running Playwright against `astro preview` on port 4481 after `pnpm build`]:
- `--list`: 61 tests (20 routes x 3 states + 1 guard)
- Run 1: 61 passed (40.9 s reported, 41 s wall clock including preview start-up)
- Run 2: 61 passed in 39.6 s, "Running 61 tests using 5 workers"
- Well under the 10-minute limit, so no `--shard` note is needed
- Guard negative check: I added a temporary `dist/client/zz-probe/index.html`, and the guard failed with `+ "/zz-probe/"`. I then removed the probe file.
- The build output had 19 HTML files: `404.html` plus 18 pages, which equal the 18 non-404 sweep routes. `/es/404/` has no prerendered file since 08-02.

**a11y.spec.ts slimmed** (481 lines, from 588): I removed `AXE_DETAIL_SLUGS`, `detailPaths`/`detailPages`, the `pages` hand list and its axe loop, the reduced-motion axe loops (Home, Projects, detail), the 'on' settled loop, the stripped-scripts axe describe, and the local `gotoWithoutSiteScripts` and `AXE_TAGS`. These are kept: the @network widget runs, the keyboard Tab-order tests, the embed facade axe runs, the reduced-motion Tab order, the OS-locked tooltip axe runs (`motionStateCases`), the real `javaScriptEnabled: false` state checks (`motionStateCases`), and the mid-reveal sample. The inlined tag arrays now use `AXE_TAGS`. a11y.spec.ts: 28 passed (offline).

Gates: `pnpm exec eslint tests/e2e` was clean. `pnpm check` gave 0 errors, 0 warnings and 0 hints.

## Task 2: D-16 verdict table

Source: `git diff --stat eced448 ff5bf7c -- tests/` (16 files) and `git diff eced448 ff5bf7c -- <file>` for each one.

| Removed item | Spec | Verdict | Reason / where covered now |
|---|---|---|---|
| `tools.json` import, `toolSteps` (5 tool tab stops) in Home Tab order | e2e/a11y.spec.ts | Not valid | Tooltips and icons were removed by the redesign. Tools are plain text and not focusable. Tab order was also reordered (work before services). Current: "keyboard Tab order on / matches the UI-SPEC with visible focus" |
| "axe stays clean with a tool tooltip open on {path}" | e2e/a11y.spec.ts | Not valid | Tooltips were removed by the redesign. Home is axe-clean in all states in a11y-sweep.spec.ts |
| "focused tool tooltip persists while another tile is hovered" (WCAG 1.4.13) | e2e/a11y.spec.ts | Not valid | No tooltips remain, so 1.4.13 does not apply to the tools |
| `INK`, `SURFACE` constants | e2e/home-story.spec.ts | Not valid | Used only by the removed tool tests |
| "tools: tiles invert colors on hover and keyboard focus" | e2e/home-story.spec.ts | Not valid | Tiles are no longer interactive (no hover/focus state). Current test asserts zero `[tabindex], a, button` |
| "tools: five icon-only tiles named by brand" (role=img names, tooltip show/Esc/hover) | e2e/home-story.spec.ts | Replaced | "tools: five tools with visible names and no tab stops" covers the HOME-05 names as visible text |
| "tools tap on touch" describe | e2e/home-story.spec.ts | Not valid | No tooltips to toggle |
| no-JS block `getByRole('img')` per tool | e2e/home-story.spec.ts | Replaced | "static: no-JS shows roles, services and tool names" checks `[data-tool]` text |
| "sits between services and tools" ordering | e2e/home-latest-work.spec.ts | Replaced | Section order changed (work comes after roles and before services). Current: "sits after the roles band and before services with the localized heading" |
| hero intro color `rgb(26,23,20)` and portrait caps 256/320 | e2e/home.spec.ts | Replaced | New palette and portrait sizes. Same assertions with the redesign values |
| 320px tool tooltip Tab walk and per-tooltip overflow | e2e/layout.spec.ts | Replaced | "at 320px every tool name is visible without horizontal overflow" (items in viewport plus page scrollWidth <= 320) |
| "every Services card top on the first screen" | e2e/motion-reveal.spec.ts | Not valid | Services moved below the work section, so the cards are no longer on the first 1440x900 screen. The generalized "reveal blocks inside the first screen reveal without scrolling" keeps the MOTN-01 behavior |
| last odd tile anchored right (`e6.right == grid.right`) | e2e/projects-grid.spec.ts | Replaced | Redesign centres the odd last tile. The current assertion checks the centring |
| `max-w-6xl`, `tracking-tight`, `h-12`, `px-6` class tokens | unit/contact-section.test.ts | Replaced | Redesign tokens (`max-w-[88rem]`, `sm:text-5xl`, `h-14`, `px-7`) |
| card root styling, `list-disc`, icon chip (2 svgs), `mt-auto` link, card grid | unit/featured-services.test.ts | Not valid / replaced | Card became a typographic index, and ServiceIcon is gone (08-03 D-15). The new structure is asserted |
| straddling element `c` kept its entrance | unit/motion-reveal.test.ts | Replaced | Behavior was deliberately changed for shutters (a top-straddling element is shown instantly). The test asserts the new rule |
| tile spans/aspect/sizes | unit/project-card.test.ts | Replaced | New grid (8 centred columns, 4/5 third, 1408px sizes) |
| h1 `tracking-tight` | unit/project-intro.test.ts | Replaced | `sm:text-section` token |
| `max-w-6xl` | unit/project-modules.test.ts | Replaced | `max-w-[88rem]` |
| compact band size (`py-4`, `motion-on:text-3xl`, `size-5`) | unit/roles-marquee.test.ts | Replaced | Large band with one size in every motion state (stricter: no `motion-on:text-*`) |
| whole file: initToolTooltips (13 tests: tap, pen, Esc, outside pointerdown, 1.4.13, cleanup, listener leaks) | unit/tool-tooltips.test.ts | Not valid | The tooltip controller was deleted with the tooltips |
| role=img/tabindex/sr-only names, tooltip anchoring, color inversion tokens | unit/tools-row.test.ts | Not valid / replaced | No tooltips or focusable tiles. Current: "shows every tool name as visible text, in the D-12 order" and "has no tab stops or interactive roles and keeps the marks decorative" |

No marquee (HOME-02/03), badge (HOME-07) or MOTN-01/04 assertion was removed by the merge. This confirms the pattern map's [Inference] by reading the diffs.

**Current coverage** [Verified: these specs ran green in this worktree, 212 passed]:

| Requirement | Spec | Test title(s) |
|---|---|---|
| HOME-02 marquee present and readable | tests/e2e/home-story.spec.ts | "roles: each role is announced once, in order"; "marquee: animates and the invisible band toggle pauses it" |
| HOME-03 pause control and reduced-motion static band | tests/e2e/home-story.spec.ts; tests/e2e/motion.spec.ts | "marquee: hovering pauses the band and aria-pressed follows", "marquee: keyboard focus pauses with aria-pressed true and a white outline", "marquee: tapping the band toggles the pause state", "static: reduced motion shows one list without button"; motion.spec "{path} keeps the marquee static and locks the motion toggle", "{path} turns the roles band static and hides the pause toggle live" |
| HOME-07 badge follows content | tests/e2e/home-story.spec.ts | "availability: badge follows profile.json" (it is in home-story, not home.spec) |
| MOTN-01 reveals, content visible without JS | tests/e2e/motion.spec.ts; tests/e2e/motion-reveal.spec.ts | "{path} resolves data-motion to on with zero console errors", "{path} keeps data-motion off and content visible", "{path} shows every [data-reveal] element at rest"; "{path} fails safe: every [data-reveal] is visible by 1.6 s", "scroll at 1440x{h} reveals everything once and never re-hides" |
| MOTN-04 image hover effects | tests/e2e/motion-hover.spec.ts | "{tile}: hover zooms and mats the cover without moving the card", "{tile}: keyboard focus applies the same effect, one tab stop", "{tile}: hover and focus change nothing" (reduced) |

Task 2 verify: `git diff --stat eced448 ff5bf7c -- tests/` plus `E2E_OFFLINE=1 playwright test` on home-story, home, a11y, motion, motion-reveal, motion-hover, layout, projects-grid and home-latest-work gave 212 passed, 0 failed (58 s, 5 workers).

## Deviations from Plan

**1. [Rule 3 - Blocking] Worktree base reset.** The worktree started at ff5bf7c, not the expected base 69d8bc6. As the spawn instructions direct, I ran `git reset --hard 69d8bc6` before any work.

**2. Temporary Playwright config needed `cwd: '..'`.** The uncommitted `tmp/pw-08-04.config.ts` (port 4481) sits in `tmp/`, so `testDir` and `webServer.cwd` had to point to the repository root. I deleted it after the runs. The committed `playwright.config.ts` is unchanged.

**3. Lock scope note.** I took and released `tmp/build-e2e.lock` as the plan requires. [Inference] Each worktree has its own `tmp/` and `dist/`, so the lock does not interact with sibling worktrees (08-05, 08-07). It is harmless, but it does not coordinate anything.

**4. Extra comment edits in a11y.spec.ts.** The mid-reveal and real-JS-off comments said "gated strictly above" and "the stripped-script runs above". They now point to a11y-sweep.spec.ts, because those runs moved there.

## Known Stubs

None.

## Threat Flags

None. These are test-only changes that read committed snapshot data and local `dist/`.

## Process hygiene

All runs were in the foreground. No preview or workerd process from this worktree is left running (`pgrep` found none), the lock is released, and the temporary config is deleted.

## Self-Check: PASSED
- FOUND: tests/e2e/helpers/routes.ts, tests/e2e/helpers/axe.ts, tests/e2e/a11y-sweep.spec.ts
- FOUND commit: 7e462bc
- `grep -c AXE_DETAIL_SLUGS tests/e2e/a11y.spec.ts` = 0; `grep -c "mode: 'parallel'" tests/e2e/a11y-sweep.spec.ts` = 1; `pagesFromHtmlFiles` and `expectedDetails(` present
