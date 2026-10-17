---
phase: 04-project-detail-discovery
plan: 06
subsystem: behance-sync
tags: [sync, images, webp, sharp, fs-commit, gc]
requires:
  - "04-03: MODULE_FILE, ImageRef, ImagePlan, IMAGE_VARIANTS, sharp devDependency"
provides:
  - "fetchModuleImage (skip-on-404 / non-image, G4m guards)"
  - "module-images.ts: encodeModuleImage, moduleFileName, downloadModuleImage"
  - "fs-commit.ts: writeStagedModule, modulesDir commit + separate GC"
affects:
  - "04-07 (wires module images into pnpm sync:behance and replaces the run-sync placeholder)"
tech-stack:
  added: []
  patterns:
    - "Variant chain: 404/non-image => next candidate, any other failure stops the sync"
    - "Per-set FileSet commit (own regex, own referenced set, own partial regex)"
key-files:
  created:
    - scripts/behance/module-images.ts
    - tests/unit/sync-module-images.test.ts
    - tests/fixtures/behance/module.webp
  modified:
    - scripts/behance/fetch-page.ts
    - scripts/behance/fs-commit.ts
    - scripts/behance/run-sync.ts
    - tests/unit/sync-commit.test.ts
decisions:
  - "A hard failure on one candidate (500, oversize, bad magic bytes, refused redirect) stops the sync; only 404 and non-image content-type skip to the next variant"
  - "modulesDir is created only when a module image is actually copied, and module GC is skipped when the dir is absent"
  - "WebP re-encode quality 82 is [ASSUMED], to be tuned on PuroV in 04-11"
metrics:
  duration: "~10 min"
  completed: 2026-10-17
---

# Phase 4 Plan 06: Module image download and commit Summary

The sync now has a tested, guarded path for module images. It tries the Behance variants in order (404 or non-image means try the next one). It stores the result as hash-named WebP at most 1400 px wide, with the real pixel size read by sharp. Module images are committed to `src/assets/projects/modules/` with their own pre-flight, copy-if-absent and GC, kept apart from the cover GC.

## Tasks

| # | Task | Commits |
|---|------|---------|
| 1 | Variant-chain download and WebP storage | 6fdb832 (RED test + fixture), 57be0c0 (feat) |
| 2 | Module images commit dir with separate GC | d19856b |

## What was built

- `fetchModuleImage(url, deps)` in `fetch-page.ts` returns `{status:'ok', bytes, ext}` or `{status:'skip', reason}`. A 404 or a non-`image/*` content-type is a skip, and the body is cancelled. It throws `SyncError('G4m')` for a disallowed host or non-https URL (checked before any fetch), a refused redirect or network error, any other non-200 status, a body over 10 MB, a body of 1024 bytes or less, or unknown magic bytes. It reuses `assertAllowed`, `request` (`redirect: 'error'`, `BEHANCE_UA`) and `readCapped`.
- `scripts/behance/module-images.ts` is the only file that imports `sharp`, and a test checks this.
  - `encodeModuleImage` keeps WebP up to 1400 px wide byte-identical. Everything else becomes WebP via `resize({ width: 1400, withoutEnlargement: true }).webp({ quality: 82 })`. Width and height come from the stored bytes.
  - `moduleFileName` builds `<digits id>-<sha256[0..12]>.webp`.
  - `downloadModuleImage` walks `plan.candidates`. If every candidate is skipped it throws `G4m: could not download module image <id> for <projectId> (<slug>): <reasons>`.
- `fs-commit.ts`:
  - New `writeStagedModule` writes to `<staging>/modules/` and checks the name against MODULE_FILE.
  - `CommitInput` gains `modulesDir` and `referencedModules`. `CommitResult` gains `modulesAdded` and `modulesRemoved`.
  - Covers and modules are each handled as their own `FileSet`, with pre-flight for both sets before any write. After that come the copies (partial file, then rename), the single atomic snapshot rename, and then two independent GCs inside the `postCommitError` try. Module GC uses MODULE_FILE and `MODULE_PARTIAL_FILE`.

## Verification

- `pnpm vitest run tests/unit/sync-module-images.test.ts tests/unit/sync-fetch.test.ts`: 45 passed.
- `pnpm vitest run tests/unit/sync-commit.test.ts`: 18 passed, including "a cover GC never removes module images" and "unreferenced module images are removed after the rename".
- `pnpm lint` (astro check, eslint, prettier): 0 errors. `pnpm test`: 38 files, 525 tests passed.
- `grep -rln "from 'sharp'" scripts src` lists only `scripts/behance/module-images.ts`. The `redirect: 'error'` count in fetch-page.ts went from 4 to 5.
- `tests/fixtures/behance/module.webp` is 21,936 bytes (more than 1024).

## Deviations from Plan

1. **[Rule 3 - Blocking] Fixture size.** The plan's command for a 64×48 solid WebP produced an 82-byte file, below MIN_COVER_BYTES. I switched to the plan's documented fallback size of 256×192 and added gaussian noise (mean 128, sigma 30) so the file is over 1024 bytes. The fixture is 256×192 and 21,936 bytes.
2. **[Rule 3 - Required by TypeScript] run-sync.ts call-site touch.** `commitSync` in `scripts/behance/run-sync.ts` now passes `modulesDir: join(deps.paths.coversDir, 'modules')` and `referencedModules: new Set()`, as the plan allowed. **04-07 must replace this placeholder.** With an empty set, the module GC would remove any module images already in `src/assets/projects/modules`. That directory does not exist in the repo yet, so this is safe today.
3. **modulesDir is created lazily.** The modules dir is created only when a module image is copied, and GC skips it when it is missing. This keeps the existing sync-run tests, which list the covers dir, unchanged. A test covers this behaviour.

## TDD Gate Compliance

- Task 1: the RED commit (6fdb832, test failed on the missing module) came before GREEN (57be0c0).
- Task 2: there is no separate RED commit. The tests and the implementation were written together and committed in d19856b. All behaviours listed in the plan are covered by the new tests.

## Known Stubs

- `scripts/behance/run-sync.ts`: `referencedModules: new Set()` is the placeholder described above. It is intentional and is resolved in 04-07.

## Threat Flags

None. All new surface is covered by T-04-04, T-04-05, T-04-07, T-04-17 and T-04-18, and each mitigation is tested.

## Self-Check: PASSED

- FOUND: scripts/behance/module-images.ts, tests/unit/sync-module-images.test.ts, tests/fixtures/behance/module.webp
- FOUND commits: 6fdb832, 57be0c0, d19856b
