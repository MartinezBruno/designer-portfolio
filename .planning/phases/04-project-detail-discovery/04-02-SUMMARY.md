---
phase: 04-project-detail-discovery
plan: 02
subsystem: requirements / projects page
tags: [requirements, n-a, discovery, e2e, regression]
requires: []
provides:
  - N/A record for PROJ-04..07 with dated snapshot evidence
  - PROJ-06 amended to tool-only (D-17)
  - e2e regression guard that the Projects page ships no filter or search UI
affects:
  - .planning/REQUIREMENTS.md
  - .planning/ROADMAP.md
  - tests/e2e/projects.spec.ts
tech-stack:
  added: []
  patterns: [Playwright count-zero assertion as a "feature stays off" guard]
key-files:
  created: []
  modified:
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md
    - tests/e2e/projects.spec.ts
decisions:
  - "PROJ-04..07 recorded N/A (7 projects < 8, D-16); checkboxes stay unchecked; the sync's >=8 notice is the revisit trigger"
  - "PROJ-06 and ROADMAP Phase 4 SC3 drop the year filter (D-17) so project dates stay hidden"
metrics:
  duration: ~5 min
  completed: 2026-10-17
  tasks: 2
  files: 3
---

# Phase 4 Plan 02: Discovery N/A Record and No-Filter Guard Summary

PROJ-04..07 are now marked N/A, with evidence anyone can check: the committed snapshot has origin `behance-sync` and 7 projects, and the threshold is 8. PROJ-06 and ROADMAP SC3 no longer include a year filter. A new Playwright test fails if any filter or search UI shows up in `main` on `/projects/` or `/es/projects/`.

## N/A evidence

These facts were checked on 2026-10-17. The verifier can quote them.

- `node -e "const s=require('./src/data/behance/snapshot.json');console.log(s.origin,s.projects.length)"` prints `behance-sync 7`.
- The count was confirmed live on 2026-10-16 (Phase 3 D-05; 03-VERIFICATION.md SC1: "Snapshot has 7 projects, so PROJ-04..07 are N/A").
- The threshold is 8 (D-16). `scripts/behance/run-sync.ts` still has `const NOTICE_AT = 8;` (line 76, unchanged). This prints the "Revisit filters and search (PROJ-04..07)" notice, which is the revisit trigger.
- REQUIREMENTS.md: each PROJ-04..07 line ends with `— **N/A (Phase 4, D-16):** 7 projects in the committed snapshot (origin behance-sync), confirmed live 2026-10-16 (Phase 3 D-05); threshold is 8. Revisit when pnpm sync:behance prints the ≥8 notice.` Their traceability rows say `N/A (7 projects < 8)`. The conditional note now says Phase 4 recorded them as N/A on 2026-10-17.
- PROJ-06 now reads: "Visitor can filter projects by tool (year filter dropped: it would expose the project dates the user chose to hide, D-17, 2026-10-17)". ROADMAP Phase 4 SC3 reads "Visitor filters by category chips and tool (no year filter, D-17)". SC4 and the Plans list were not touched.
- E2E guard: `has no filter or search UI (PROJ-04..07 N/A, D-16)` checks that `main` contains 0 elements matching `[role="search"], input, select, form, [aria-live], [aria-pressed]`. It passes on EN and ES (2/2).

## Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Record PROJ-04..07 as N/A, amend PROJ-06 (D-16, D-17) | 6e0473a | .planning/REQUIREMENTS.md, .planning/ROADMAP.md |
| 2 | Regression e2e: Projects page has no filter UI | 9003061 | tests/e2e/projects.spec.ts |

## Verification

- Task 1 grep check printed `ok`. The "and by year" count on the PROJ-06 line is 0, and the `N/A (7 projects < 8)` count is 4.
- `pnpm build && pnpm exec playwright test tests/e2e/projects.spec.ts -g "no filter"` passed 2 tests.
- `astro check` reported 0 errors. ESLint and Prettier were clean, run with `.claude/**` excluded (see Deviations). `pnpm test` passed 414/414.

## Deviations from Plan

**1. [Rule 3 - Blocking, environment] `pnpm lint` fails because of the parallel worktrees, not this plan's code**
- **Found during:** pre-commit gate for Task 1.
- **Issue:** `eslint .` reached into `.claude/worktrees/agent-*`, the parallel executors for 04-01 and 04-03. typescript-eslint then saw several tsconfig roots and reported 262 errors, all under `.claude/worktrees/`. No errors came from files outside the worktrees.
- **Fix:** I ran the same three lint steps separately (`astro check`, `eslint . --ignore-pattern '.claude/**'`, `prettier --check . '!.claude/**'`), and all passed. I did not change the repo's ESLint config. The error goes away once the worktrees are removed after the wave merges.
- **Files modified:** none.

## TDD Gate Compliance

Task 2 is marked `tdd="true"`, but it is a regression guard that the plan says must pass against today's page ("confirm today's Projects page passes"). So there was no failing RED run. It is committed as a single `test(04-02)` commit with no `feat` commit, because no production code changed.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: .planning/REQUIREMENTS.md, .planning/ROADMAP.md, tests/e2e/projects.spec.ts
- FOUND commits: 6e0473a, 9003061
