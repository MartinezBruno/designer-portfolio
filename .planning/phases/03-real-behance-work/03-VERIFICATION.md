---
phase: 03-real-behance-work
verified: 2026-10-17T15:00:00Z
status: passed
score: 5/5 roadmap success criteria verified (8/8 requirements satisfied)
overrides_applied: 0
---

# Phase 3: Real Behance Work Verification Report

**Phase Goal:** A visitor sees Martina's real Behance projects: the 3 latest on the homepage and all of them on a Projects page in both languages. The site builds from a committed snapshot that never depends on Behance being reachable.
**Status:** passed. Re-verification: No (initial).

## Observable Truths

| # | Success criterion | Status | Evidence (re-run by verifier) |
|---|---|---|---|
| SC1 | Consent documented before sync code; real count recorded | VERIFIED | `docs/CONSENT.md` exists with written approval dated 2026-10-17. The git ancestry check (consent-add commit is a strict ancestor of the first sync-code commit) printed "ancestry ok". Snapshot has 7 projects, so PROJ-04..07 are N/A. |
| SC2 | `pnpm sync:behance` yields a committed snapshot; challenge/empty/partial fail loudly and keep the old snapshot | VERIFIED | `src/data/behance/snapshot.json` has origin `behance-sync` and 7 projects. `sync:behance` script is in package.json. `sync-run.test.ts` has 19 passing tests, including the fail-loud cases. The full `pnpm test` run shows 32 files and 358 tests passing. I did not run a live sync, since I was told not to make network requests. |
| SC3 | Build succeeds with the network disabled | VERIFIED | `pnpm build:offline` printed "offline build ok (0 network attempts, 6 html files scanned)". See WR-01..03 below. |
| SC4 | 3 latest on Home, newest first, linking to detail URLs; `/projects` and `/es/projects` list all newest first | VERIFIED | `dist/index.html` links the 3 newest by `publishedOn` (cabreras-motos-posts, purov, website-reciclick), matching the snapshot timestamps. `dist/es/index.html` links the same 3 under `/es/projects/`. Both Projects pages list all 7 in descending order of publishedOn. Detail pages are Phase 4 scope, and `dist` has no stub detail directories. |
| SC5 | Overrides hide, reorder, feature, recategorize and set alt text; UI reads only the typed model | VERIFIED | `src/data/project-overrides.json` carries title, summary, coverAlt and category overrides that appear in the built pages. The ESLint `no-restricted-imports` rule (DATA-06) blocks `**/sources/**` imports from UI code. `grep "sources/" src/components src/pages` finds nothing. `pnpm lint` passes with 0 errors, 0 warnings, 0 hints, and prettier passes. Override unit tests are among the 358 passing tests. |

## Requirements Coverage

| ID | Status | Evidence |
|---|---|---|
| DATA-01 | SATISFIED | CONSENT.md plus ancestry check |
| DATA-02 | SATISFIED | Real 7-project snapshot with local covers (`src/assets/projects`), `sync:behance` CLI |
| DATA-03 | SATISFIED | `run-sync.ts` gates, atomic commit protocol, sync-run, sync-commit and sync-fetch tests |
| DATA-04 | SATISFIED | `build:offline` passes with 0 network attempts |
| DATA-05 | SATISFIED | overrides schema, loader, tests, and curated JSON visible in output |
| DATA-06 | SATISFIED | typed model, `queries.ts`, lint boundary |
| HOME-06 | SATISFIED | Home "Latest work" row of the 3 newest, EN and ES |
| PROJ-01 | SATISFIED | `/projects/` and `/es/projects/` list all 7 newest first |

All 8 IDs are claimed by the plans and mapped to Phase 3 in REQUIREMENTS.md. There are no orphans. REQUIREMENTS.md still shows several as "Pending" or unchecked. That is bookkeeping only, and the orchestrator should tick them.

## Accepted user decisions (not gaps)

- Home uses an even `layout="row"` instead of the D-18 rhythm.
- Project cards show no date. `publishedOn` still drives the ordering.
- The taste FAILs and the PuroV crop are accepted.
- TODO(martina) copy is pending editorial review.

## Code review warnings that touch a success criterion

- **WR-01 (DNS named imports, `dns/promises`, `resolve*`), WR-02 (worker threads) and WR-03 (relative or stale guard log):** these weaken the *proof* behind SC3 and DATA-04. The offline gate can report "0 attempts" even if a dependency used one of the unguarded paths. They do not change the fact that the site's own code makes no network calls: the build reads only the local snapshot, the sync script is not part of `astro build`, and the offline build passes. Judgment: SC3 is still met, but the evidence is weaker than it looks. I recommend fixing the guard before Phase 8, where the gate is likely to be reused.
- **Sync CLI message (snapshot "left untouched" claim even when failure came after replacement):** misleading for SC2's "leaves previous snapshot untouched" in a late-failure edge case. The pre-commit gates (G1..G7) still protect against the challenge, empty and partial cases the criterion names. Judgment: met, with a messaging defect.
- **Partial cover copy and `z.url()` accepting non-http schemes:** not part of SC1..SC5. The `z.url()` item should be tightened before the Phase 4 "View on Behance" link.

## Anti-patterns

No unresolved TBD, FIXME or XXX markers were found in the reviewed files. TODO(martina) copy is accepted per the user decisions. The review reports 0 critical findings.

## Human verification

None outstanding. The user approved the visuals in 03-10.

## Gaps

None. Advisory follow-ups: WR-01..03 (guard hardening), `z.url()` scheme restriction, CLI message accuracy, and ticking REQUIREMENTS.md and ROADMAP checkboxes.

_Verifier: Claude (gsd-verifier)_
