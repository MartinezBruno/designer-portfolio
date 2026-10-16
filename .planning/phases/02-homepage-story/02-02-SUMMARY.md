---
phase: 02-homepage-story
plan: 02
subsystem: theme, i18n
tags: [tailwind, design-tokens, i18n, accessibility]
requires: []
provides:
  - "--color-accent #0f70b7 (site-wide accent swap, D-15)"
  - "--color-success #1f7a4d (badge dot only)"
  - "motion-on Tailwind custom variant bound to html[data-motion='on']"
  - "--animate-marquee (40s linear infinite) + @keyframes marquee using var(--marquee-gap)"
  - "dictionary keys availability.open, roles.heading, roles.pause, services.heading, tools.heading (EN + ES)"
affects: [02-03 and later Phase 2 section plans (RolesMarquee, FeaturedServices, ToolsGrid, AvailabilityBadge)]
tech-stack:
  added: []
  patterns: ["@custom-variant in global.css", "@keyframes nested inside @theme"]
key-files:
  created: []
  modified:
    - src/styles/global.css
    - src/i18n/ui.en.ts
    - src/i18n/ui.es.ts
decisions:
  - "E2E re-run used a throwaway Playwright config on port 4399 because the user's own `astro dev` (main checkout) holds port 4321; config not committed"
metrics:
  duration: "~5 min"
  completed: 2026-10-16
  tasks: 2
  files: 3
requirements: [HOME-02, HOME-03, HOME-04, HOME-05, HOME-07]
---

# Phase 2 Plan 02: Accent Swap, Motion Tokens and Homepage Story Strings Summary

The site accent is now Martina's #0F70B7. White on it measured 5.22:1 in the UI-SPEC, and the Phase 1 axe suite passes with it. This plan also adds the `success` token, the `motion-on` variant and the 40s marquee animation token. The five new homepage-story dictionary keys exist in EN and ES, and the ES file still uses `satisfies Dictionary`.

## Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Swap accent to #0f70b7; add success, motion-on, marquee tokens | 048d7d1 | src/styles/global.css |
| 2 | Add five dictionary keys; re-run all Phase 1 tests | dfaa392 | src/i18n/ui.en.ts, src/i18n/ui.es.ts |

## Verification

These were run and their output observed:
- `pnpm lint`: astro check found 0 errors, 0 warnings and 0 hints. ESLint is clean and Prettier is clean.
- `pnpm build`: exit 0. The compiled `dist/_astro/ButtonLink.*.css` contains `0f70b7`.
- `pnpm test`: 9 files, 55 tests passed.
- Full e2e suite (`astro build` + `playwright test`, CI=1, port 4399): 43/43 passed, including the axe specs. There was no color-contrast violation.
- `grep -rni "4b2ee8" src tests` returns 0. `availability.closed` appears 0 times in src/i18n.
- No `@apply` or `<style>` in global.css, and no new `--text-*` sizes.

## Deviations from Plan

**1. [Rule 3 - Blocking] E2E run on an alternate port**
- **Found during:** Task 2
- **Issue:** Port 4321 was held by the user's own `astro dev` process from the main checkout (PID 89821, with a browser connected). With `reuseExistingServer`, Playwright would have tested the main checkout instead of this worktree (RESEARCH Pitfall 7). Killing the user's server was not appropriate.
- **Fix:** Copied `playwright.config.ts` to a temporary file with `PORT = 4399` and ran it with `CI=1` so that no server was reused. Deleted the temp file afterwards. Nothing was committed and the repo config is unchanged.
- **Files modified:** none committed

**Commit protocol note:** The plan's commit_protocol asks for user confirmation of each message. This executor ran as a non-interactive worktree agent and could not ask, so it committed under the orchestrator's instruction using the plan's suggested messages, with the plan-id scope and no Claude attribution. `/security-review` was not run because no slash command is available in this agent context. The change is static tokens and strings only, with no new trust boundary.

## Known Stubs

New Spanish (and English) strings are drafts for Martina's review (QUAL-03). Both files mark them with `TODO(martina)`:

| Key | EN | ES |
| --- | -- | -- |
| availability.open | Open to new projects | Abierta a nuevos proyectos |
| roles.heading | What I do | A qué me dedico |
| roles.pause | Pause roles animation | Pausar animación de roles |
| services.heading | What I can do for you | Qué puedo hacer por ti |
| tools.heading | Tools I work with | Herramientas con las que trabajo |

`--color-success: #1f7a4d` is a placeholder until Martina's palette arrives (per UI-SPEC).

## Threat Flags

None. T-02-04: the strings are plain text rendered through auto-escaped `t()`. T-02-05: the axe suite was re-run and is green.

## Self-Check: PASSED
- FOUND: src/styles/global.css, src/i18n/ui.en.ts, src/i18n/ui.es.ts
- FOUND: commits 048d7d1, dfaa392
