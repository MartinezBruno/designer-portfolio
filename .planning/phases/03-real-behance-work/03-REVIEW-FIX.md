---
phase: 03-real-behance-work
fixed_at: 2026-10-17T17:53:30Z
review_path: .planning/phases/03-real-behance-work/03-REVIEW.md
iteration: 1
findings_in_scope: 10
fixed: 10
skipped: 0
status: all_fixed
---

# Phase 03: Code Review Fix Report

**Fixed at:** 2026-10-17T17:53:30Z
**Source review:** .planning/phases/03-real-behance-work/03-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 10 (WR-01 to WR-10; IN-* excluded by fix_scope critical_warning)
- Fixed: 10
- Skipped: 0

## Fixed Issues

### WR-01: The offline guard misses named `dns` imports, `dns/promises` and the `dns.resolve*` family

**Files modified:** `scripts/offline-guard.ts`, `tests/unit/offline-guard.test.ts` (new)
**Commit:** 24295f1
**Applied fix:** The guard now replaces every `lookup`, `lookupService`, `resolve*` and `reverse` entry point on `node:dns`, `dns.Resolver.prototype`, `dns.promises` (the same object as `node:dns/promises`) and `dns.promises.Resolver.prototype`. It also blocks `dgram.Socket.prototype.send` and `connect`, then calls `syncBuiltinESMExports()` so named ESM imports pick up the patches. The new test runs a probe under the guard and checks named imports, dns/promises, resolve*, both Resolver classes and dgram. Each call must fail with ENOTFOUND or `offline` and must be logged. Probe targets are `.invalid` names and TEST-NET addresses.

### WR-02: Worker threads run with no offline guard

**Files modified:** `scripts/offline-guard.ts`, `tests/unit/offline-guard.test.ts`
**Commit:** 5ec0a2c
**Applied fix:** I checked by probe that `--import` in a worker's `execArgv` does not run for `eval` workers, while `--require` of the .ts ESM guard works for both eval and file workers. So `worker_threads.Worker` is now replaced with a subclass that prepends `--require <guard>` to `execArgv`. When a worker gets a custom `env` object, the subclass also adds the log path and the active flag to it. Workers never truncate the log. The header comment lists what is still not covered: native addons and subprocesses that are not Node. The test starts an eval worker, a file worker and a worker with `env: {}`, and checks that each worker's `fetch` is blocked and logged. I also confirmed that removing the patch leaves workers unguarded.

### WR-03: The guard log path is relative, and a stale log can satisfy the gate

**Files modified:** `scripts/offline-guard.ts`, `scripts/offline.ts`, `scripts/assert-offline.ts`, `tests/unit/offline.test.ts`, `tests/unit/offline-guard.test.ts`
**Commit:** 12e3666
**Applied fix:** The guard resolves the log path once and exports it in `OFFLINE_GUARD_LOG`. The root process writes `# offline-guard start <runId> <iso>` when it truncates the log and `# offline-guard end ...` on exit. `OFFLINE_GUARD_ACTIVE` now holds the run id. A process counts as a child only if that id matches the log's start marker, so a flag leaked from the shell starts a fresh log. `readAttempts` skips `#` lines. `assert-offline.ts` now requires a start marker and a matching end marker, and requires dist/'s newest file mtime to fall inside that window (with 2 s slack). I chose that window over the review's "newer than dist/'s mtime", which cannot work because the header is written before dist/. Tests cover the markers, a child process in another cwd writing to the same log, the leaked flag, and stale, unfinished and out-of-window logs. I also checked by hand that touching a dist file after the build makes the gate fail.

### WR-04: The CLI says the snapshot was untouched for failures after it was replaced

**Files modified:** `scripts/behance/errors.ts`, `scripts/behance/fs-commit.ts`, `scripts/behance/run-sync.ts`, `scripts/sync-behance.ts`, `tests/unit/sync-run.test.ts`, `tests/unit/sync-commit.test.ts`
**Commit:** c3f0295
**Applied fix:** `SyncError` gained a `committed` flag. A GC failure in `commitSync` after the rename throws `postCommitError` (G7, committed). `runSync` sets `committed = true` once `commitSync` returns, and wraps any later failure, such as one in G9 or `deps.log`. The CLI now prints through `failureMessage()`. That function says "The new snapshot was already written: review the diff..." for committed errors, and keeps the "left untouched" text for all others. Tests cover: GC `rm` failing on a directory with a cover name after the rename, a G9 log failure, the `commitSync` GC failure, and both `failureMessage` branches.
**Status:** fixed: requires human verification (logic/state handling)

### WR-05: A partially copied cover is kept forever and treated as valid

**Files modified:** `scripts/behance/fs-commit.ts`, `tests/unit/sync-commit.test.ts`
**Commit:** 6811940
**Applied fix:** Each staged cover is copied to `coversDir/.<name>.partial` and then renamed to its final name, so a cut-off copy never appears under a cover name. If a cover with that name already exists and its bytes match the staged bytes, it is left alone (mtime unchanged). If the bytes differ, the file on disk is truncated or corrupt, because the name is the hash of the staged bytes, and the rename replaces it atomically. GC also deletes `.partial` files left by a killed run. The existing "never overwrites" test now uses equal bytes. New tests cover repairing a truncated cover and cleaning up partial leftovers.
**Status:** fixed: requires human verification (logic/state handling)

### WR-06: Snapshot URL fields accept `javascript:`, `data:` and `file:` schemes

**Files modified:** `src/lib/projects/snapshot-schema.ts`, `tests/unit/projects-snapshot.test.ts`, `tests/unit/sync-run.test.ts`
**Commit:** ac9aacc
**Applied fix:** `projects[].url` and `profile.url` must now be https on `www.behance.net`, and `cover.sourceUrl` must be https on `mir-s3-cdn-cf.behance.net`. URLs with credentials are rejected. I checked first that the committed `src/data/behance/snapshot.json` still parses: its 8 page URLs are all https://www.behance.net and its 7 cover sourceUrls are all https://mir-s3-cdn-cf.behance.net. Module JSON (loose) is not constrained. Two test fixtures had used a gallery URL as `cover.sourceUrl` and now use a CDN URL. New negative tests cover javascript:, data:, file:, http, foreign hosts, look-alike hosts and credentials for all three fields.

### WR-07: The CDN-reference gate scans only `.html` and misses encoded URLs

**Files modified:** `scripts/offline.ts`, `scripts/assert-offline.ts`, `tests/unit/offline.test.ts`
**Commit:** 4832483
**Applied fix:** `findCdnReferences` now matches the host names themselves (case-insensitive), with an optional scheme and `//`. It scans both the raw text and an unescaped form, where `\/` becomes `/` and `%XX` sequences are decoded one at a time (a malformed sequence does not throw). It removes duplicates and reports the longest form of each reference. `assert-offline.ts` scans every dist/ file ending in `.html`, `.css`, `.js`, `.mjs`, `.cjs`, `.json`, `.webmanifest`, `.xml`, `.svg`, `.txt` or `.map`. New tests cover CSS, the URL-encoded `/_image?href=` form, JSON-escaped URLs, a bare host in JS, an upper-case host and a malformed escape.

### WR-08: The unknown-flag CLI test can trigger a live sync against the real repo

**Files modified:** `tests/unit/sync-cli.test.ts`
**Commit:** 1f949c9
**Applied fix:** `run()` now always spawns the CLI with `CI=1`, so no CLI test can reach `runSync`. The `--bogus` case also asserts that the unknown-flag error comes before the CI refusal. The header comment explains the rule.

### WR-09: Duplicate project ids are not rejected

**Files modified:** `src/lib/projects/snapshot-schema.ts`, `scripts/behance/parse.ts`, `tests/unit/projects-snapshot.test.ts`, `tests/unit/sync-parse.test.ts`
**Commit:** e72d8be
**Applied fix:** `SnapshotSchema.projects` now has a `superRefine` that reports `duplicate project id <id>` at `projects.<i>.id`. This covers the site build and the sync's G5. `parseProfileStore` fails G1 when the profile lists an id more than once. Both tests use a duplicate id with a different slug.

### WR-10: An error from `removeStaging` in `finally` hides the real sync failure

**Files modified:** `scripts/behance/run-sync.ts`, `tests/unit/sync-run.test.ts`
**Commit:** c2e3d3d
**Applied fix:** In the `finally` block, `removeStaging` errors are now caught and logged (`sync:behance: could not remove staging dir ...`) instead of being thrown. The tests make staging's parent read-only partway through the run. One checks that the original G4 error survives; the other checks that a successful run still succeeds. Both check the log line. Both tests fail without the fix (checked). They are skipped when running as root, because root ignores directory permissions.

## Verification (after all fixes, run in the isolated worktree)

- `pnpm lint`: passed. astro check found 0 errors, 0 warnings, 0 hints (118 files); eslint clean; prettier clean.
- `pnpm test`: passed. 33 files, 414 tests.
- `pnpm test:e2e`: passed. 167 Playwright tests.
- `pnpm build:offline`: passed. Output: "offline build ok (0 network attempts, 28 text files scanned, 6 html)". The guard log has matching start and end markers.
- `src/data/behance/snapshot.json` and `src/assets/projects/` are unchanged (`git diff main` on those paths is empty). No request was made to Behance, and `pnpm sync:behance` was never run for real (the CLI was run only with `--bogus` and with `CI=1`).

---

_Fixed: 2026-10-17T17:53:30Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
