---
phase: 08-quality-verification
plan: 02
subsystem: routing-a11y
tags: [a11y, skip-link, i18n, 404, workers, review-debt]
requires: []
provides:
  - skip link keeps 16px horizontal padding when focused (EN/ES)
  - /es/404 and /es/404/ return HTTP 404 on the Workers preview
affects:
  - src/components/global/SkipLink.astro
  - src/pages/es/404.astro
tech-stack:
  added: []
  patterns:
    - "A localized error page is rendered on demand (prerender = false) so Astro sets the 404 status instead of the asset layer serving a static 200"
key-files:
  created: []
  modified:
    - src/components/global/SkipLink.astro
    - src/pages/es/404.astro
    - tests/e2e/anchors.spec.ts
    - tests/e2e/not-found.spec.ts
decisions:
  - "D-18: focus:px-4 added after focus:not-sr-only (not-sr-only resets padding)"
  - "D-17: Option A (prerender = false on src/pages/es/404.astro) worked. Option B (wrangler.jsonc run_worker_first) was not needed, so wrangler.jsonc is unchanged"
metrics:
  completed: 2026-11-06
  tasks: 2
---

# Phase 8 Plan 02: Skip-link padding and Spanish 404 status Summary

The skip link keeps its 16px left and right padding when focused. Adding `focus:px-4` after `focus:not-sr-only` closes Phase 1 WR-02. The Spanish 404 page is now rendered by the Worker on demand (`export const prerender = false`), so the Workers asset layer no longer serves a static `es/404/index.html` with status 200. `/es/404/` and `/es/404` return HTTP 404, which closes Phase 1 WR-03. Both fixes have regression e2e tests.

## Tasks

| # | Task | Commit(s) |
|---|------|-----------|
| 1 | Skip-link focus padding (EN + ES) | c4be4f2 (RED), 59e2ee1 (GREEN) |
| 2 | /es/404 returns HTTP 404 (option A, on-demand render) | d9bbaf7 (RED), c8f6ceb (GREEN) |

## Verification

[Verified] by the orchestrator on main after merging wave 1:
- curl against `astro preview` (workerd, port 4491, after `pnpm build`):

  | URL | Status | lang |
  |-----|--------|------|
  | /es/404/ | 404 | es |
  | /es/404 | 404 | es |
  | /es/does-not-exist | 404 | es |
  | /does-not-exist | 404 | en |
- `E2E_OFFLINE=1 pnpm test:e2e` (full suite, including not-found, anchors, a11y, contact and smooth-scroll): 746 passed, 117 skipped, 0 failed
- `pnpm measure:bundle`: bundle check ok
- `pnpm lint`: clean. `pnpm test`: 1303 passed

## Deviations from Plan

**1. Execution interrupted.** The executor committed both tasks (RED and GREEN each) and then stalled for about 2 hours without writing a SUMMARY. It left two things behind: an uncommitted edit to SkipLink.astro that *removed* `focus:px-4` (apparently a scratch check that the RED test fails), and a scratch `playwright.0802.config.ts`. The user chose "finish inline". The orchestrator discarded both scratch artifacts, stopped the leftover preview server, merged the committed work, ran the verification above on main and wrote this SUMMARY.

**2. wrangler.jsonc not modified.** It was listed in files_modified only for the fallback option B, which wasn't needed.

### Notes
- Visual change is limited to restoring the intended focus padding on the skip link (a regression fix to the existing design). There is no new design surface, so no separate taste-skill run was done. The phase-level taste gate (08-07) covers the site.

## Known Stubs

None.

## Self-Check: PASSED
- `grep -c "focus:px-4" src/components/global/SkipLink.astro` = 1
- `grep -c "prerender = false" src/pages/es/404.astro` = 1
- Commits c4be4f2, 59e2ee1, d9bbaf7, c8f6ceb: present in `git log`
