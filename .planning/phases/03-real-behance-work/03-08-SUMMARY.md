---
phase: 03-real-behance-work
plan: 08
subsystem: behance-sync
tags: [behance, sync, cli, fs, atomic-commit, tdd]
requires:
  - 03-01 (SnapshotSchema, parseSnapshot, COVER_FILE, model CategoryId)
  - 03-04 (parseOverrides, validateOverrides, missingOverrides)
  - 03-06 (SyncError, fetchStorePage, fetchCover, parse*, pickCover, coverFileName, fixtures)
  - 03-07 (tmp/ git-ignored)
provides:
  - runSync(deps) with gates G1-G9 (scripts/behance/run-sync.ts)
  - staging + atomic commit protocol (scripts/behance/fs-commit.ts)
  - toSnapshotProject (scripts/behance/normalize.ts)
  - suggestCategory (scripts/behance/parse.ts)
  - pnpm sync:behance CLI (scripts/sync-behance.ts)
affects:
  - 03-09 (the real sync run uses this command)
tech-stack:
  added: []
  patterns:
    - dependency-injected sync (fetch, sleep, log, now, paths) tested with fake fetch + temp dirs under tmp/
    - copy-if-absent covers (COPYFILE_EXCL) -> single rename of snapshot.json -> GC of unreferenced COVER_FILE names
key-files:
  created:
    - scripts/behance/fs-commit.ts
    - scripts/behance/normalize.ts
    - scripts/behance/run-sync.ts
    - scripts/sync-behance.ts
    - tests/unit/sync-commit.test.ts
    - tests/unit/sync-run.test.ts
    - tests/unit/sync-cli.test.ts
  modified:
    - scripts/behance/parse.ts
    - package.json
    - tests/unit/sync-parse.test.ts
decisions:
  - "Identity and dates (id, slug, name, url, publishedOn, modifiedOn) come from the profile list; content (description, tags, tools, canvasWidth, modules) from the project page"
  - "Tag/tool ids (strings after 03-06 parsing) are converted back to integers for the snapshot; a non-numeric id fails G5 instead of being guessed"
  - "An unreadable previous snapshot fails G1b unless --allow-fewer (then treated as 0 projects); a missing one counts as 0"
  - "Unknown module type warnings go into report.notices together with the 8+ notice; checklist lines only for projects that still miss a curated field"
  - "Pacing wraps fetch: every request after the first (pages, replays and covers) waits 2000 ms; a challenge replay therefore waits 2 s (fetchStorePage) + 2 s (pacing)"
  - "suggestCategory uses a Map so scraped field text such as 'constructor' cannot hit a prototype key"
metrics:
  duration: ~7 min
  completed: 2026-10-17
  tasks: 3
  files: 10
---

# Phase 3 Plan 08: Behance sync orchestration and CLI Summary

`pnpm sync:behance` now runs a dependency-injected `runSync` that passes every Behance response through gates G1 to G9, stages the output under tmp/, and commits it with a single atomic rename of snapshot.json. It copies content-hashed covers only when they are missing and deletes covers the new snapshot no longer references. Every failure case is tested to leave the previous snapshot and covers byte-identical.

## What was built

- **fs-commit.ts**: `createStaging`, `writeStagedCover` (only accepts COVER_FILE names), `writeStagedSnapshot` (pretty JSON + newline), `commitSync`, `removeStaging` (safe to call twice). `commitSync` first checks that every referenced cover is either staged or already present. Then it runs three steps in order: (1) copy covers with COPYFILE_EXCL (EEXIST is skipped, so an existing file keeps its bytes and mtime); (2) one `rename(` of the staged snapshot over the target; (3) GC of COVER_FILE names that are not referenced (.gitkeep and other files are left alone).
- **normalize.ts**: `toSnapshotProject` writes keys in a fixed order (Pitfall 7), keeps modules as raw JSON and never copies altText out of them.
- **parse.ts**: `suggestCategory(fields)` is case-insensitive and trimmed, and the first match in field order wins.
- **run-sync.ts**: `runSync(deps): Promise<SyncReport>`. The header lists G1 to G9. The steps run in this order:
  1. Read the previous count.
  2. G1: fetch and parse the profile.
  3. G1b: check the shrink guard.
  4. Fetch each project page (G2/G3/G6), derive its fields, pick and fetch its cover (G4), and stage the cover.
  5. Build the snapshot sorted by publishedOn desc, then id.
  6. G5: `parseSnapshot` and a count check.
  7. G8: `parseOverrides` + `validateOverrides(`.
  8. G7: stage and commit.
  9. G9: log the count line, the 8+ notice, unknown-module warnings and checklist lines in the UI-SPEC format.

  `try/finally` always removes the staging dir.
- **sync-behance.ts**: thin CLI. `--help` exits 0 without calling `runSync`. Unknown flags print usage and exit 1. It refuses to run when CI is set. Errors print `sync:behance: <message>. The previous snapshot was left untouched.`, success prints the review-and-commit hint. The staging dir is `tmp/behance-sync/<ISO with - instead of :>`.
- **package.json**: `"sync:behance": "node scripts/sync-behance.ts"`. It is not added to any workflow or prebuild hook.

## Verification

- `pnpm vitest run tests/unit/sync-*.test.ts`: green. sync-run has 19 tests (`-t "success"` 9, `-t "fails"` 10); sync-commit 7, sync-cli 3, plus 9 new suggestCategory cases.
- Each `fails` case compares sha256 of the snapshot and of every file in coversDir before and after, and checks that staging is gone. Covered cases: G2 challenge-only, G1 empty list, G1 hasMore, G1b shrink, G1b unreadable previous snapshot, G2 project 500, G4 bad bytes, G4 cross-host cover, G8 unknown id 999, G3 string publishedOn.
- Request pacing is checked by a test: the first event is a fetch, and every later fetch (10 in total) comes straight after `sleep(2000)`.
- `node scripts/sync-behance.ts --help` exits 0. `CI=1 node scripts/sync-behance.ts` exits 1 with the refusal message. Both prove the module graph loads under plain Node.
- `pnpm lint`: 0 errors (astro check, eslint, prettier). `pnpm test`: 30 files, 343 tests. `pnpm build:offline`: ok, 0 network attempts.
- e2e was not re-run. This plan touches no site, component or page files (scripts/ and tests/unit only).
- Acceptance greps: `rename(` appears 1 time, `COPYFILE_EXCL` 1 line, `parseSnapshot(` and `validateOverrides(` both present in run-sync.ts, no `card-view` or `astro:` imports under scripts/, and no `.github/workflows` dir exists.
- No real network requests were made.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Tag/tool id type mismatch between 03-06 parse output and the 03-01 schema**
- **Found during:** Task 2
- **Issue:** parse.ts turns label ids into strings, but SnapshotSchema requires `z.int()`, so copying them as-is would fail G5 on every real run.
- **Fix:** normalize.ts converts them with `Number(id)`. A non-numeric id becomes NaN and fails G5 loudly.
- **Files:** scripts/behance/normalize.ts. **Commit:** e74a832

**2. [Rule 2 - Correctness] Pre-flight check in commitSync**
- **Issue:** a referenced cover that was neither staged nor already present would only show up as broken after the rename.
- **Fix:** `commitSync` checks every referenced cover before any write and throws if one is missing. A test covers this.
- **Commit:** c87e06d

**3. [Rule 2 - Correctness] Unreadable previous snapshot**
- **Issue:** the plan only defines the missing-file case.
- **Fix:** an invalid previous snapshot now fails G1b ("restore it from git, or re-run with --allow-fewer"), so the shrink guard cannot be bypassed silently. With `--allow-fewer` the run treats it as 0 projects. A test covers this.

**4. [Interface naming]** The plan's interfaces block names `RawProfileProject`/`RawProject`, but the 03-06 parse.ts exports `ProfileProject`/`ProjectStore`. normalize.ts uses the actual exports.

No files outside `files_modified` were touched (.gitignore and .prettierignore are unchanged).

## Known Stubs

None. The username `martifernand7` is hard-coded in run-sync.ts and the profile URL in the CLI, as the plan specifies.

## Threat Flags

None. The sync adds no new network surface beyond the allowlisted hosts in 03-06. File writes are limited to COVER_FILE names and the configured snapshot path (T-03-23), and GC only runs after the rename (T-03-24).

## TDD Gate Compliance

- Task 1: RED `2a2a651` test(03-08) → GREEN `c87e06d` feat(03-08)
- Task 2: RED `87fe5be` test(03-08) → GREEN `e74a832` feat(03-08)
- Task 3 (type auto): `1e7c067` feat(03-08)

## Commits

- 2a2a651 test(03-08): add failing commit protocol tests
- c87e06d feat(03-08): add staging and atomic commit protocol
- 87fe5be test(03-08): add failing runSync and category tests
- e74a832 feat(03-08): add runSync with gates g1-g9
- 1e7c067 feat(03-08): add pnpm sync:behance cli

## Self-Check: PASSED

All 7 created files and 3 modified files exist, and all 5 commit hashes are present in `git log`.
