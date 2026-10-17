---
phase: 03-real-behance-work
plan: 01
subsystem: projects-data
tags: [behance, snapshot, zod, model, slug, fixtures]
requires: []
provides:
  - src/lib/projects/model.ts (categoryIds, CategoryId, Localized, OrderFields, SourceProject, Project, ProjectCardView)
  - src/lib/projects/slug.ts (toSlug, SLUG_PATTERN)
  - src/lib/projects/snapshot-schema.ts (SnapshotSchema, SnapshotProjectSchema, parseSnapshot, Snapshot, SnapshotProject, COVER_FILE)
  - src/lib/projects/projects.ts (toProjects, assertUniqueSlugs, sortProjects)
  - src/lib/projects/sources/behance-snapshot.ts (getSourceProjects, getSnapshotOrigin)
  - src/data/behance/snapshot.json (seed, 7 projects)
affects: [03-02, 03-06, 03-07, 03-08, 03-09]
tech-stack:
  added: []
  patterns:
    - Node-safe shared modules (erasable TS, .ts extension value imports, astro/zod only)
    - Fail-loud module-scope validation of committed snapshot
    - Local-only cover resolution via eager import.meta.glob
key-files:
  created:
    - src/lib/projects/model.ts
    - src/lib/projects/slug.ts
    - src/lib/projects/snapshot-schema.ts
    - src/lib/projects/projects.ts
    - src/lib/projects/sources/behance-snapshot.ts
    - src/data/behance/snapshot.json
    - src/assets/projects/*.png (7 placeholder covers, 808x632)
    - tests/unit/project-slug.test.ts
    - tests/unit/projects-order.test.ts
    - tests/unit/projects-snapshot.test.ts
  modified:
    - .prettierignore
decisions:
  - "Snapshot schema uses strict objects for every shape we write ourselves; only modules are loose (full Behance module JSON kept for Phase 4)"
  - "parseSnapshot reports the first Zod issue as '<path>: <message>' ('root' when the path is empty)"
  - "sortProjects: explicit order first (asc), then publishedOn desc, then id asc; hidden filtered out"
  - "toProjects copies tools into a new array so Project never aliases the source array"
metrics:
  duration: ~4 min
  completed: 2026-10-17
  tasks: 2
  files: 18
---

# Phase 3 Plan 01: Typed project model and seed snapshot Summary

Source-agnostic project model, D-08 slug rule, Zod snapshot schema with fail-loud `snapshot: ...` errors, pure ordering builders, and a committed seed snapshot of the 7 known Behance projects with local placeholder covers read through a single adapter.

## What was built

- **model.ts**: the exact contracts from the plan interfaces. Only `import type`, no Behance names outside the header comment.
- **slug.ts**: `toSlug` strips quotes/apostrophes (`´ ' ’ " “ ”`), NFKD + mark strip, lowercase, collapses non-alphanumerics, trims dashes; empty result throws `projects: empty slug from "<input>". Add a "slug" override in src/data/project-overrides.json`.
- **snapshot-schema.ts**: `SnapshotSchema` (version 1, origin `seed|behance-sync`, ISO `syncedAt`, profile, `projects.min(1)`), `COVER_FILE` regex constraining cover names (T-03-05), `parseSnapshot` throwing `snapshot: invalid or missing src/data/behance/snapshot.json (<path>: <message>). Re-run pnpm sync:behance or restore it from git`.
- **projects.ts**: `toProjects`, `assertUniqueSlugs` (exact duplicate message), `sortProjects`.
- **sources/behance-snapshot.ts**: imports the JSON, `parseSnapshot` at module scope (T-03-01), eager `import.meta.glob('/src/assets/projects/*.{png,jpg,jpeg,webp}')`, `coverFor` throws the missing-cover message (T-03-03), maps tools to titles in source order. Never reads `altText`.
- **Seed**: `src/data/behance/snapshot.json` (origin `seed`, 7 projects sorted publishedOn desc, names kept verbatim incl. U+00B4 and ASCII quotes) and 7 solid neutral-tone 808x632 RGB PNGs named `<id>-<sha256[0:12]>.png`, generated with a one-off `node:zlib`/`node:crypto`/`node:fs` command (not committed). Snapshot added to `.prettierignore`.

## Verification

- `pnpm vitest run` on the three new files: 3 files green (slug 14, order 8, snapshot 17 tests).
- `node --input-type=module -e "await import('./src/lib/projects/projects.ts'); await import('./src/lib/projects/snapshot-schema.ts'); ..."` printed `node-safe ok` (also imported model.ts).
- `node -e ...` seed check printed `seed ok`; 7 cover files match `^[0-9]+-[0-9a-f]{12}\.png$`.
- `grep astro:` over the four Node-safe modules: empty. `grep -ic behance` on model.ts minus comments: 0. `grep altText src/lib/projects`: empty.
- `pnpm lint` (astro check 0 errors, eslint, prettier) and `pnpm test` (19 files, 166 tests) green.

## Commits

| Task | Commit | Message |
| ---- | ------ | ------- |
| 1 RED | 176ed94 | test(03-01): add failing project model tests |
| 1 GREEN | 3f6dda4 | feat(03-01): add typed project model and slug rule |
| 2 RED | f175531 | test(03-01): add failing seed snapshot tests |
| 2 GREEN | 0eefbbd | feat(03-01): add seed snapshot and snapshot adapter |

## TDD Gate Compliance

Both tasks have a `test(...)` RED commit followed by a `feat(...)` GREEN commit. RED runs were confirmed failing (missing modules) before implementation. No refactor commits were needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing coverage] Adapter failure-path tests**
- **Found during:** Task 2
- **Issue:** The plan's must-have truth requires a missing cover or corrupt/empty snapshot to throw the `snapshot: ...` message, but the Task 2 behavior list had no test for the adapter's throw paths.
- **Fix:** Added two tests using `vi.doMock` of the snapshot JSON + dynamic import of the adapter, asserting the exact missing-cover message and the invalid-snapshot prefix/suffix.
- **Files modified:** tests/unit/projects-snapshot.test.ts
- **Commit:** 0eefbbd

**2. [Rule 3 - Blocking] Lint-clean test fixtures**
- **Found during:** Task 1
- **Issue:** Initial tests used destructure-to-discard and non-null assertions, rejected by the project's ESLint config.
- **Fix:** Introduced a `validProject()` fixture factory and a fingerprint-based no-mutation check.
- **Commit:** 3f6dda4

**3. Header comment wording in projects.ts** avoids the literal `astro:` so the acceptance grep stays empty (comment only, no behavior change).

Additional slug cases beyond the behavior list (`Website "Reciclick"`, edge dashes, SLUG_PATTERN negatives) were added as extra coverage.

## Known Stubs

- `src/data/behance/snapshot.json`: `origin: "seed"`, with empty `tags`, `tools`, `fields`, `modules`, `description ""`, `modifiedOn`/`canvasWidth` null. The first real sync (plan 03-09) replaces it.
- `src/assets/projects/*.png`: 7 solid-colour placeholder covers. 03-09 replaces and garbage-collects them.
- `cover.sourceUrl` holds the gallery URL for now, not a CDN image URL. Real values come from the sync.

These stubs are intentional fixtures (fixtures-first ordering). The adapter is not wired into any page yet; 03-02 does that.

## Self-Check: PASSED

- All created files listed above exist on disk (checked with `ls`/`test -f`).
- Commits 176ed94, 3f6dda4, f175531, 0eefbbd are present in `git log`.
