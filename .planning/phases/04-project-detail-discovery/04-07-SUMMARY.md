---
phase: 04-project-detail-discovery
plan: 07
subsystem: behance-sync
tags: [sync, module-images, content, overrides, moduleAlt, gc]
requires:
  - "04-03: ContentSchema, ImageRef, contentImageIds, MODULE_FILE, planModuleImages, toContent"
  - "04-06: downloadModuleImage, moduleFileName, writeStagedModule, commitSync modulesDir/referencedModules"
provides:
  - "run-sync G4m: per-project module image plan, reuse or download (paced), toContent"
  - "SnapshotProjectSchema.content (optional until 04-08)"
  - "SyncDeps.paths.modulesDir; SyncReport.modulesAdded/modulesRemoved/moduleBytesAdded"
  - "OverrideSchema.moduleAlt; validateOverrides moduleAlt checks; missingModuleAlts"
  - "SourceProject.imageIds (adapter: contentImageIds(project.content ?? []))"
affects: [04-08, 04-09, 04-10]
tech-stack:
  added: []
  patterns:
    - "Reuse an unchanged module image only when the previous sourceUrl is still a candidate and the committed file's bytes match its hash-based name"
    - "Module GC referenced set derived from the new snapshot's content image refs"
key-files:
  created:
    - src/assets/projects/modules/.gitkeep
  modified:
    - scripts/behance/run-sync.ts
    - scripts/behance/normalize.ts
    - scripts/behance/errors.ts
    - scripts/sync-behance.ts
    - src/lib/projects/snapshot-schema.ts
    - src/lib/projects/overrides-schema.ts
    - src/lib/projects/projects.ts
    - src/lib/projects/model.ts
    - src/lib/projects/sources/behance-snapshot.ts
    - tests/fixtures/behance/project.html
    - tests/unit/sync-run.test.ts
    - tests/unit/projects-overrides.test.ts
    - tests/unit/project-card-view.test.ts
    - tests/unit/project-detail-site.test.ts
    - tests/unit/projects-order.test.ts
decisions:
  - "referencedModules = every image file in the new snapshot's content; replaces the 04-06 empty-set placeholder"
  - "Module reuse also checks moduleFileName(id, bytes) === ref.file so a truncated or edited committed file is downloaded again"
  - "Unknown-type and embed warnings come only from toContent; run-sync no longer needs KNOWN_MODULES"
  - "missing module alts lines are appended to report.checklist after the missing-overrides lines"
metrics:
  duration: "~15 min"
  completed: 2026-10-17
---

# Phase 4 Plan 07: Sync module images, content and moduleAlt Summary

One `pnpm sync:behance` run now writes a normalized `content` array per project and commits every module image to `src/assets/projects/modules/`. All requests go through the 2 s paced fetch. Unchanged images are reused with no request. The run prints the module image size and the unknown-type and embed warnings. Project overrides gain a validated bilingual `moduleAlt` map, and the sync prints a `missing module alts` checklist for it. Everything is proven with the fake-fetch harness. No live sync was run (that is 04-08).

## Tasks

| # | Task | Commits |
|---|------|---------|
| 1 | Wire module images and content into the sync (G4m) | ce2b0b0 (RED test), 4726b6d (feat) |
| 2 | moduleAlt overrides, validation and checklist (D-09) | fb81ca2 (RED test), 5047e2f (feat) |

## What was built

- **snapshot-schema.ts**: `SnapshotProjectSchema.content: z.array(ContentSchema).optional()`, placed after `modules`, with the 04-08 migration comment. The committed snapshot, which has no `content` yet, still parses and builds.
- **normalize.ts**: `toSnapshotProject(..., cover, content)` writes `content` after `modules`.
- **run-sync.ts**:
  - `readPrevious` replaces `previousCount`. It does the same tolerant read and also returns a `Map<imageId, ImageRef>` built from the previous content.
  - G4m runs per project: `planModuleImages`, then for each plan either `reusable(...)` or `downloadModuleImage(plan, paced, ref)`, then `writeStagedModule`, then `toContent`.
  - G7 passes `modulesDir: deps.paths.modulesDir` and `referencedModules` = every image file referenced by the new content. **This replaces the 04-06 placeholder.**
  - G8 sources include `imageIds`.
  - G9 logs `sync:behance: module images: <n> files, <x.xx> MB added`, the toContent warnings (UI-SPEC wording) and the missing module alts checklist.
  - The local `KNOWN_MODULES` copy and the "Phase 4 must render a fallback" notice are gone. `REQUEST_SPACING_MS = 2000` is unchanged.
- **CLI and errors.ts**: the CLI passes `modulesDir: 'src/assets/projects/modules'`. The done line and `COMMITTED` now mention `src/assets/projects/modules`. Because the directory was not in git, `src/assets/projects/modules/.gitkeep` was added. Module GC leaves it alone since it does not match MODULE_FILE.
- **overrides-schema.ts**: `moduleAlt: z.record(z.string().regex(/^\d+$/), localized).optional()`.
- **projects.ts**:
  - `SourceRef` gains `imageIds`.
  - `validateOverrides` rejects a moduleAlt key that is not in that project's `imageIds`, and any value over 125 code points. Both use the exact UI-SPEC messages.
  - New `missingModuleAlts(sources, overrides)` returns `{ id, slug, missing, total }`.
  - `applyOverrides` copies `imageIds`.
- **model.ts and behance-snapshot.ts**: `SourceProject.imageIds`, set from `contentImageIds(project.content ?? [])`.

## Tests covering the handoff items

- The `referencedModules` placeholder is replaced and tested by these sync-run tests:
  - "writes content and commits exactly the referenced module images": the modules dir equals the content files, and the seeded unreferenced `9001-000000009001.webp` is GC'd.
  - "a re-sync reuses unchanged module images without a request and keeps them": zero module requests, `modulesAdded`/`modulesRemoved` empty, and every referenced module file is byte-identical after GC.
- Other new sync-run tests:
  - 404 on `1400_webp` falls back to `1400` and stores WebP.
  - A missing or corrupt committed file is downloaded again.
  - All variants unavailable makes G4m fail with `could not download module image 5551002 for 1002` plus `The previous snapshot was left untouched.`. The snapshot, covers and modules dir stay byte-identical.
  - Module bytes that are not an image make G4m fail.
  - The pacing test now counts 13 fetches, each preceded by sleep(2000).
  - Collection, text and non-allowlisted embed normalization, with the embed warning line.
  - G8 refuses an unknown moduleAlt key and a value over 125 characters.
  - The missing module alts checklist.

## Verification

- `pnpm vitest run tests/unit/sync-run.test.ts tests/unit/sync-cli.test.ts tests/unit/sync-commit.test.ts tests/unit/projects-snapshot.test.ts tests/unit/sync-parse.test.ts`: 5 files, 134 passed (after Task 1).
- `pnpm vitest run tests/unit/projects-overrides.test.ts tests/unit/sync-run.test.ts`: 66 passed.
- `pnpm lint` (astro check, eslint, prettier): 0 errors. `pnpm test`: 40 files, 567 passed.
- `pnpm build`: 20 pages built on the unchanged committed snapshot.
- Acceptance greps:
  - `const KNOWN_MODULES` in run-sync: 0. `Phase 4 must render a fallback`: 0. `module images: `: 2. `REQUEST_SPACING_MS = 2000`: 1.
  - `moduleAlt` in overrides-schema: 1. `matches no image in the snapshot`: 1. `(max 125)`: 1. `missing module alts for` in run-sync: 1.

## Deviations from Plan

1. **[Rule 3 - Blocking] Fixture ImageModule shape.** `tests/fixtures/behance/project.html` had an ImageModule with no `id` or `imageSizes`, which `planModuleImages` correctly rejects as G4m. I gave it `id: 5551001` and an `imageSizes.allAvailable` list with `fs`, `1400` and `1400_webp` URLs. It still has 2 modules, so `sync-parse.test.ts` is unchanged.
2. **[Rule 2 - Integrity] Reuse checks the file hash.** On top of the plan's reuse rule (same id, sourceUrl among the candidates, file exists), the committed bytes must hash to the ref's file name. A truncated or edited file is downloaded again instead of being silently re-committed. This is covered by a test.
3. **No `KNOWN_MODULES` import in run-sync.** The plan said to import the export from module-content.ts. With the G9 notice replaced by `toContent` warnings, run-sync no longer uses it, and an unused import would fail lint. The local copy is deleted, which meets the acceptance criterion.
4. **Failure suffix.** UI-SPEC line 532 ends the module-download failure with "The previous snapshot and images were left untouched." The plan's behavior and acceptance text use the existing `UNTOUCHED` constant ("The previous snapshot was left untouched."), which the CLI CI-refusal test also asserts. I kept `UNTOUCHED`. 04-08 or 04-11 can reword it if the UI-SPEC wording is wanted.
5. **Report placement.** The `module images:` line is logged right after the project count line. It is not in `notices`, and its numbers are in `SyncReport` as `modulesAdded` and `moduleBytesAdded`. The missing-module-alts lines go into `report.checklist` after the missing-overrides lines.
6. **Fixture builders.** `project-card-view`, `project-detail-site` and `projects-order` tests gain `imageIds: []`, because `SourceProject` now requires it.

## Known Stubs

- `project.content ?? []` in `behance-snapshot.ts` and `run-sync.ts`, and `content` being `.optional()` in the schema, are intentional migration shims. 04-08 makes `content` required right after the live re-sync (RESEARCH Pitfall 5).

## Threat Flags

None. The new surface is covered by the plan's threat model:
- T-04-05: every module request goes through `paced`, then `fetchModuleImage` guards.
- T-04-17: G5 strict content schema, the byte-identical failure test, and reuse hash verification.
- T-04-09: 2 s spacing kept, and reuse avoids repeat downloads.
- T-04-19: Zod digit keys, plus unknown-key and length checks at build time and at sync G8.

## TDD Gate Compliance

Task 1: RED ce2b0b0 (test) came before GREEN 4726b6d (feat). Task 2: RED fb81ca2 (test) came before GREEN 5047e2f (feat). No refactor commits were needed.

## Self-Check: PASSED

- FOUND: src/assets/projects/modules/.gitkeep, scripts/behance/run-sync.ts, src/lib/projects/overrides-schema.ts, src/lib/projects/projects.ts
- FOUND commits: ce2b0b0, 4726b6d, fb81ca2, 5047e2f
