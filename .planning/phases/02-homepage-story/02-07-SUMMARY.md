---
phase: 02-homepage-story
plan: 07
subsystem: homepage
tags: [astro, e2e, playwright, a11y, i18n, integration]
requires:
  - phase: 02-03
    provides: Hero with availability badge, getHomeContent wired into HomeView
  - phase: 02-04
    provides: RolesMarquee section and pause toggle script
  - phase: 02-05
    provides: FeaturedServices section
  - phase: 02-06
    provides: ToolsRow section and tooltip script
provides:
  - HomeView that renders Hero, RolesMarquee, FeaturedServices and ToolsRow from a single getHomeContent call
  - tests/e2e/home-story.spec.ts with EN/ES coverage for roles, marquee, static fallbacks, services, tools, availability and accent
  - a keyboard-order probe in a11y.spec.ts that handles links, buttons and role=img tiles, plus module-scope expectedOrderFor and keyboardCases for 02-08
affects: [02-08, phase-03]
tech-stack:
  added: []
  patterns:
    - "Playwright specs import JSON with `with { type: 'json' }` (required by Node ESM in Playwright)"
    - "tabUntil(page, selector) helper so :focus-visible comes from real keyboard focus"
key-files:
  created:
    - tests/e2e/home-story.spec.ts
  modified:
    - tests/e2e/a11y.spec.ts
    - src/components/views/HomeView.astro
decisions:
  - "e2e JSON imports use import attributes, because Playwright's ESM loader rejects bare JSON imports"
  - "Added a marquee hover-pause e2e test, which the wave handoff required but the plan's behavior list did not include"
metrics:
  duration: ~25min
  completed: 2026-10-16
  tasks: 3
  files: 3
---

# Phase 2 Plan 07: Homepage Story Integration Summary

The real homepage at `/` and `/es/` now shows Hero (with the badge), the blue roles band, then Services and Tools inside a `flex flex-col gap-16 py-16` wrapper. All of it comes from one `getHomeContent(locale)` call in HomeView. A new EN/ES e2e spec and a keyboard probe that runs on both locales cover the full story, and the 65-test e2e suite passes.

## Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Failing e2e spec for the homepage story (RED) | 53676e5 | tests/e2e/home-story.spec.ts |
| 2 | Keyboard-order probe generalized (RED) | 8680d10 | tests/e2e/a11y.spec.ts |
| 3 | Compose HomeView, verify guards, measure JS, make the suite green | 14bc07c | src/components/views/HomeView.astro |

## TDD gates

- RED (Task 1): `home-story.spec.ts` had 17 failing tests and 4 passing. The 4 passes were availability and accent on both locales, which the plan expected to pass already.
- RED (Task 2): both keyboard tests failed at the step after the hero CTA, with `Expected: "BUTTON"` and `Received: "A"`. Every step before that passed on `/` and on `/es/`, including the `/es/` wordmark href.
- GREEN (Task 3): after composition, the full suite passed (65/65). Running `home-story.spec.ts` and `a11y.spec.ts` with `--repeat-each=3` gave 81/81 and no flakes.

## Verification records (required by the plan)

**Count guard (Task 3, step 2).** I cut `services.json` to 3 entries and ran `pnpm build`. The exit code was **1**, and the log had **3** matches of:
`Error: services: expected exactly 4 entries, got 3. Fix src/data/services.json` (logged while rendering `/es/`). I restored the file from the backup, `cmp` showed it was identical, and I deleted the backup and the log.

**Schema check (Task 3, step 3, carried over from 02-01).** I deleted `label.es` from the first role and ran `pnpm astro check`. The exit code was **1** with:
`[InvalidContentEntryDataError] roles → web-design data does not match collection schema. label.es: Required`. I restored the file from the backup, `cmp` showed it was identical, and I deleted the backup and the log. Node content checks after the restore: services length is 4, and every role has `label.es`.

**`!important` on the dismissed-state variants (UI-SPEC inference).** Both rules in the built CSS carry `!important`:
```
group-data-dismissed\/tool\:invisible\!:is(:where(.group\/tool)[data-dismissed] *){visibility:hidden!important}
group-data-dismissed\/tool\:opacity-0\!:is(:where(.group\/tool)[data-dismissed] *){opacity:0!important}
```
The e2e test also confirms the behavior: after Esc the tooltip is hidden while the tile keeps focus-visible.

**Client JS on `dist/index.html` (measured, not asserted):**

| File | Raw bytes | gzip bytes |
|------|-----------|------------|
| BaseLayout.astro_astro_type_script_index_0_lang.B4jLENcI.js | 29 | 109 |
| RolesMarquee.astro_astro_type_script_index_0_lang.C5lOtEl0.js | 415 | 346 |
| ToolsRow.astro_astro_type_script_index_0_lang.CdPa4Xje.js | 965 | 484 |
| motion.C3xKnLLc.js (shared chunk imported by the two above) | 668 | 378 |
| **Total** | **2077** | **1317** |

The page also has one inline `<script>`, which is the Phase 1 motion gate.

## What the e2e now proves (in a browser)

- Roles: the 4 D-03 labels are announced once each, in order, for each locale, and the sr-only h2 is exposed.
- Marquee: copy A has `animationName: marquee`. The button toggles `aria-pressed` on click, Space and Enter, and its label stays fixed. While paused, `animationPlayState` is `paused`. **Hovering the band pauses it**, and moving the mouse away resumes it. The band is `rgb(15, 112, 183)` and the role text is white (D-16). The keyboard focus ring on the pause button is `rgb(255, 255, 255)` (D-17).
- Static fallback: under reduced motion **and** without JS, `data-motion` is `off`, the aria-hidden copy is hidden, there is no button, `animationName` is `none`, and all 4 roles are visible. Without JS, the 4 service h3 headings and the 5 named tool images are present.
- Services: 4 cards in D-05 order, each with its D-07 bullets per locale. Branding's first bullet is Visual identity / Identidad visual. There are 0 links.
- Tools: 5 `role=img` tiles named by brand. Tooltips are hidden at rest. A tooltip shows on keyboard focus, Esc hides it while focus stays, hover shows it, hovering the tooltip keeps it open, and the bubble is ink-colored. On touch, a tap opens one tooltip at a time.
- Availability: the badge appears before the greeting when `profile.json` is true. The CTA is the accent color (D-15). No test logged console errors or page errors.
- Axe (WCAG 2.2 AA) passes on `/`, `/es/` and both 404 pages with the new sections in place. No ToolsRow markup change was needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] JSON import attributes in Playwright specs**
- **Found during:** Task 1
- **Issue:** Playwright's ESM loader failed with `Module ".../profile.json" needs an import attribute of "type: json"`.
- **Fix:** Added `with { type: 'json' }` to the JSON imports in `home-story.spec.ts` and `a11y.spec.ts`. `astro check`, eslint and prettier all pass. The key_link pattern `from '../../src/data/...json'` still matches.
- **Commits:** 53676e5, 8680d10

**2. [Rule 2 - Missing coverage] Marquee hover-pause e2e**
- **Found during:** Task 1
- **Issue:** The wave handoff said 02-04's hover pause had never been browser-tested, but the plan's behavior list had no hover test.
- **Fix:** Added `marquee: hovering the band pauses the animation` for both locales.
- **Commit:** 53676e5

**3. [Rule 3 - Blocking] Static test titles nested under per-path describes**
- **Issue:** The acceptance grep needs a plain-quoted `'static:` title, so the path moved into a nested `test.describe(path)` instead of a template-literal title.
- **Commit:** 53676e5

### Process notes

- **E2E port:** Port 4321 belongs to the user's own `astro dev`. Every Playwright run used a throwaway config at `tmp/playwright.agent.config.ts`, with port 4407, `reuseExistingServer: false` and `cwd: '..'` (the cwd setting is needed because webServer otherwise starts from the config's own directory). I deleted the config before running lint and before committing, so it was never committed. I did not touch the user's server. Because of this, the plan's literal `pnpm test:e2e` (port 4321) was not run. I ran the same `astro build` followed by the full `playwright test` against 4407 instead.
- **Commits:** the orchestrator authorized committing directly, with the plan id as scope and no attribution lines. `/security-review` was not run because no slash command is available to this agent. The change adds no new trust boundary: content is still rendered only through `{}` expressions, the `set:html` count is 1, and `getCollection` and `getEntry` appear only in `src/lib/content/queries.ts`.
- STATE.md and ROADMAP.md were not modified (the orchestrator owns them).

## Known Stubs

None added in this plan. The existing `TODO(martina)` notes in Hero and the dictionary (portrait and copy) are from earlier plans.

## Threat Flags

None. T-02-17 through T-02-20 are mitigated as planned: the grep gates pass, the guard was verified end to end, the backups were cmp-restored and removed, and the e2e runs used a dedicated port.

## Self-Check: PASSED

- FOUND: tests/e2e/home-story.spec.ts, tests/e2e/a11y.spec.ts, src/components/views/HomeView.astro
- FOUND commits: 53676e5, 8680d10, 14bc07c
- `pnpm lint` and `pnpm test` (118 tests) exit 0. Full e2e is 65/65 on port 4407.
