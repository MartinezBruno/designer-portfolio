---
phase: 03-real-behance-work
plan: 10
subsystem: phase-gate
tags: [gate, verification, human-review, behance]
requires:
  - 03-09 (real snapshot, curated overrides, taste gate with real covers)
provides:
  - recorded automated evidence for Phase 3 SC1-SC5 and DATA-01..06, HOME-06, PROJ-01
  - user approval of Home and the Projects page with real work
affects:
  - phase verification (/gsd:verify-work), code review, /security-review
  - Phase 4 (detail pages show no project date; PROJ-06 year filter to confirm)
tech-stack:
  added: []
  patterns: []
key-files:
  created:
    - .planning/phases/03-real-behance-work/03-10-SUMMARY.md
  modified: []
decisions:
  - "User approved Phase 3 visible result 2026-10-17"
  - "Post-approval: project date removed from cards; Phase 4 detail pages show no date either (275a88b, 6ce1765)"
  - "User accepted open taste items as they stand (focal-point/empty-screens on /projects/, PuroV 7/8 crop, pre-Phase-3 FAILs)"
metrics:
  duration: gate run + human review (Task 1 at 3ce8187)
  completed: 2026-10-17
  tasks: 2
  files: 0 source files (SUMMARY only)
---

# Phase 3 Plan 10: Phase gate and user review Summary

Every automated Phase 3 check passed against the real 7-project Behance snapshot. Git history shows the consent commit comes before the sync code. The user approved Home and the Projects page, then asked for one change: remove the project date. That change was made and re-verified after approval.

## Task 1: Automated gate (run at 3ce8187)

| # | Check | Command | Result |
|---|-------|---------|--------|
| 1 | Consent ancestry | `C=$(git log --diff-filter=A --format=%H -- docs/CONSENT.md \| tail -1)`; `S=$(git log --diff-filter=A --format=%H -- scripts/behance scripts/sync-behance.ts \| tail -1)`; `git merge-base --is-ancestor $C $S && test "$C" != "$S"` | PASS. C=6331404 "docs(03-06): record behance sync consent" is an ancestor of S=e2d5cf8 "feat(03-06): parse behance stores and pick covers", and C≠S |
| 2a | Lint | `pnpm lint` | PASS. 0 errors, 0 warnings, 0 hints across 117 files |
| 2b | Unit | `pnpm test` | PASS. 32 files, 358 tests |
| 2c | E2E | `pnpm test:e2e` | PASS. 167/167 |
| 2d | Offline build | `pnpm build:offline` | PASS. ok, 0 network attempts, 6 html pages |
| 2e | Secrets | `pnpm check:secrets` | PASS. ok, 97 dist files scanned |
| 3 | Real snapshot | `node -e "...s.origin!=='behance-sync'..."` | PASS. origin `behance-sync`, 7 projects |
| 4 | Model boundary | `grep -rn "sources/" src/components src/pages`; `grep -rn "set:html" src \| wc -l` | PASS. No `sources/` imports. `set:html` appears exactly once, at src/layouts/BaseLayout.astro:29 (motion gate inline) |
| 5 | No stub detail pages | `find dist/projects dist/es/projects -mindepth 1 -type d` | PASS. Nothing printed |
| 6 | Sync fails loudly | `pnpm vitest run tests/unit/sync-run.test.ts -t "fails"` | PASS. 10 passed |
| 7 | Size | `du -ch src/assets/projects src/data/behance` | src/assets/projects 2.1M + src/data/behance 856K = 3.0M (same as 03-09) |

### Success criteria (ROADMAP Phase 3)

| SC | Criterion | Evidence | Status |
|----|-----------|----------|--------|
| SC1 | Consent documented before any sync code; real project count confirmed | Check 1 (6331404 is an ancestor of e2d5cf8). Check 3 and the 03-09 sync log line `sync:behance: 7 projects`, so 7 projects and PROJ-04..07 are N/A | PASS |
| SC2 | `pnpm sync:behance` writes a committed snapshot; challenge, empty and partial responses fail loudly and leave the snapshot untouched | Check 3 (real snapshot from 03-09 run f35fada), check 6 (10 "fails" tests) | PASS |
| SC3 | `pnpm build` succeeds with the network disabled | Check 2d (0 network attempts) | PASS |
| SC4 | Home shows 3 latest by publish date linking to detail URLs; `/projects` and `/es/projects` list all newest first | Check 2c (home-latest-work, projects specs) plus user review in Task 2 | PASS |
| SC5 | Local overrides hide, reorder, feature, recategorize and set alt text; UI reads only the typed model | Check 2b (overrides unit tests), check 2c (coverAlt e2e), check 4 (no `sources/` imports) | PASS |

### Requirements

| ID | Evidence | Status |
|----|----------|--------|
| DATA-01 | Check 1 | PASS |
| DATA-02 | Check 3, 03-09 sync run (f35fada) | PASS |
| DATA-03 | Check 6 | PASS |
| DATA-04 | Check 2d | PASS |
| DATA-05 | Check 2b/2c (override tests, curated overrides d26e8a6) | PASS |
| DATA-06 | Check 4, DATA-06 lint boundary in check 2a | PASS |
| HOME-06 | Check 2c (home-latest-work.spec.ts), Task 2 review | PASS |
| PROJ-01 | Check 2c (projects.spec.ts EN/ES), Task 2 review | PASS |

## Task 2: User review (checkpoint:human-verify)

User reply (verbatim):

> "all changes approved. but lets make a little change to the projects cards, and also update this for the detail page later.
> lets remove the date of the project"

No new consent date was supplied. docs/CONSENT.md already holds 2026-10-17 from 03-09 (d1d278d).

### Post-approval changes (made by the orchestrator)

- **275a88b feat(03): remove project date from cards.** The year was removed from ProjectCardView, card-view.ts, ProjectCard.astro and the `projects.meta.year` dictionary keys (EN/ES). The tests were updated and the UI-SPEC amended. `publishedOn` still drives the newest-first order.
- **6ce1765 docs(03): drop project date from phase 4 scope.** ROADMAP Phase 4 SC2, REQUIREMENTS PROJ-03 and the STATE decisions now say detail pages show no project date. Open for Phase 4 discuss: is the conditional PROJ-06 year filter (only with 8+ projects) still wanted?
- **Re-verified after the change:** `pnpm lint` 0 errors, 358/358 unit, 167/167 e2e, `pnpm build:offline` ok, no `<time>` in dist pages. Taste `lint.mjs` 0/0 on ProjectCard. `inspect.mjs` counts are the same as before the change (/projects/ 3 FAIL/4 WARN, Home 2 FAIL/3 WARN).

### Earlier user-directed change during this phase

- **1410d82 feat(03): use even row for home latest work.** Home uses `layout="row"` with `third` tiles. The Projects page keeps the D-18 rhythm. This cleared Home's empty-screens FAIL and the PuroV crop on Home.

## Deviations from Plan

None in the plan itself: Task 1 changed no files, and Task 2 recorded the approval. The post-approval date removal (275a88b, 6ce1765) and the earlier Home row change (1410d82) were user-directed changes made by the orchestrator outside this plan's tasks. They are listed above.

## Open items / follow-ups

By approving, the user accepted these taste items as they stand:
- `/projects/` **focal-point FAIL** (first L tile at 1440 is about 625×500 and not dominant enough).
- `/projects/` **empty-screens FAIL** (screens 1-3 of 4 at 1440).
- **PuroV (227934855) 7/8 crop** on the small tiles of `/projects/`: the wordmark loses the edge of the "P" and the "V".
- **Pre-Phase-3 FAILs**: icon-cards and still-page.

Copy still marked `TODO(martina)` (JSON has no comments, so it is tracked here):
- `summary.en/es` for all 7 projects.
- `coverAlt.en/es` for all 7 projects.
- `category` for all 7, including the PuroV and Mart choice between `graphic-design` (heuristic, current) and `branding` (tags).
- Titles from 03-04.
- The three least-certain summaries:
  - 185594991 (Sistema visual): "contemporary dance degree programme", read from small poster text.
  - 226450035 (Website Reciclick): "a community about recycling", read from the landing copy.
  - 202447185 (Portfolio web): "a developer's portfolio", inferred from the mockup.

For Phase 4 discuss: is the PROJ-06 year filter still wanted?

## Known Stubs

See the TODO(martina) list above. No UI-blocking stubs: all 7 projects render with real covers and drafted copy.

## Threat Flags

None. T-03-30 is mitigated by check 2e. T-03-31 (`/security-review`) runs at phase end, before the phase is marked complete.

## Commits

- No task commits (the gate changed no files).
- Related: 1410d82, 275a88b, 6ce1765 (user-directed, orchestrator).

## Self-Check: PASSED

Verified: commits 6331404, e2d5cf8, 1410d82, 275a88b, 6ce1765 and d1d278d exist in git history, and this SUMMARY file exists.
