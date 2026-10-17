---
phase: 03-real-behance-work
plan: 04
subsystem: projects-data
tags: [overrides, zod, curation, home-selection, i18n, e2e]
requires:
  - 03-01 (model, slug, projects.ts, sources adapter, seed snapshot)
  - 03-02 (card-view.ts, getAllProjects, projects pages, e2e helper)
provides:
  - src/lib/projects/overrides-schema.ts (localized, OverrideSchema, OverridesSchema, Override, Overrides, parseOverrides; Node-safe)
  - src/lib/projects/projects.ts (validateOverrides, applyOverrides, missingOverrides, selectHomeProjects, CuratedField; toProjects removed)
  - src/lib/projects/local-overrides.ts (overrides, site-only)
  - src/data/project-overrides.json (7 drafted entries)
  - src/lib/content/queries.ts getLatestProjects(locale)
  - tests/e2e/helpers/projects.ts expectedHome(locale)
affects: [03-03, 03-05, 03-08, 03-09]
tech-stack:
  added: []
  patterns:
    - Overrides validated at module scope so a bad file fails astro build
    - Explicit field-by-field merge (no spreading Zod optionals)
    - e2e expectations reuse the Node-safe build rules (sortProjects, selectHomeProjects, parseOverrides)
key-files:
  created:
    - src/lib/projects/overrides-schema.ts
    - src/lib/projects/local-overrides.ts
    - src/data/project-overrides.json
    - tests/unit/projects-overrides.test.ts
    - tests/unit/projects-select.test.ts
  modified:
    - src/lib/projects/projects.ts
    - src/lib/content/queries.ts
    - tests/unit/projects-order.test.ts
    - tests/e2e/helpers/projects.ts
    - tests/e2e/projects.spec.ts
decisions:
  - "Title length is counted in code points ([...s].length) and checked in validateOverrides, not in the schema"
  - "parseOverrides uses safeParse with reportInput so the invalid-category message can quote the bad value"
  - "Final slugs (override or derived) are checked for uniqueness across all sources, hidden included"
  - "loadProjects() memoizes applyOverrides once per process; the seed warning moved there so it also fires from getLatestProjects"
  - "selectHomeProjects: featured by order asc (unordered last), then newest, then id; rest newest then id"
metrics:
  duration: ~6 min
  completed: 2026-10-17
  tasks: 3
  files: 10
---

# Phase 3 Plan 04: Local overrides and Home selection Summary

A developer can now edit `src/data/project-overrides.json`, keyed by Behance id, to hide, reorder, feature, recategorize, retitle, summarize or add cover alt text to a project. After a build the change shows on `/projects/` and `/es/projects/`. A bad entry fails the build with a one-line developer message. The Home selection rule (D-17) and `getLatestProjects(locale)` are ready for 03-05.

## What was built

- **overrides-schema.ts** (Node-safe): a `z.strictObject` per entry (`slug` matching `SLUG_PATTERN`, localized `title`/`summary`/`coverAlt`, `category` enum from `categoryIds`, `featured`, `order` int, `hidden`, `contentLang`), and a record keyed by `^\d+$`.
  - `parseOverrides` throws `project-overrides: invalid category "<v>" for <id>. Use one of graphic-design, web-design, branding, social-media` for category issues.
  - Any other issue throws `project-overrides: <path>: <zod message>. Fix src/data/project-overrides.json`.
- **projects.ts**:
  - `validateOverrides` checks for unknown ids, titles over 32 characters (message names the locale and id), and duplicate final slugs across every source, hidden ones included (via `assertUniqueSlugs`).
  - `applyOverrides` validates first, then builds each Project field by field with `null`/`false`/`'es'` defaults. It copies the localized objects and tools.
  - `selectHomeProjects(projects, limit = 3)` implements D-17.
  - `missingOverrides` reports which of title, category, summary and coverAlt are missing for each project, for the 03-08 sync checklist.
  - `toProjects` is removed.
- **project-overrides.json**:
  - Titles are copied verbatim from the UI-SPEC table.
  - Summaries are one-sentence drafts based only on each title.
  - Categories: 238078789 social-media; 226450035, 202447185 and 176799549 web-design; 185594991 branding. PuroV and Mart have no category.
  - No featured, order, hidden or coverAlt entries.
- **local-overrides.ts** parses the JSON at module scope. **queries.ts** has a memoized `loadProjects()` = `applyOverrides(getSourceProjects(), overrides)`. `getAllProjects` = `sortProjects(loadProjects())`, and `getLatestProjects` = `selectHomeProjects(loadProjects(), 3)`. When every project is hidden it warns with the UI-SPEC message.
- **e2e helper and spec**: the helper builds override-aware rows using the site's own rules and exports `expectedProjects` and `expectedHome`. The spec checks each card's title, category `dd` (or that the category item is absent) and summary, plus one SC5 wiring assertion per locale.

## Verification

- RED:
  - e2e failed with `Cannot find module .../src/data/project-overrides.json`.
  - Unit: 12 of 18 failed before the implementation.
- `pnpm vitest run` on the three projects-* unit files: 40 tests pass.
- Node-safe import command printed `overrides ok`. The title-length `node -e` check exited 0.
- `grep toProjects -r src tests` and `grep "max(32)" overrides-schema.ts` both print nothing. `grep -rn "sources/" src/components src/pages` prints nothing.
- `pnpm lint`: astro check 0 errors, 0 warnings, 0 hints; eslint and prettier clean.
- `pnpm test`: 25 files, 278 tests pass (was 246).
- `pnpm test:e2e` (full suite): 124/124 pass (was 120; 4 new tests).
- `pnpm build:offline`: `offline build ok (0 network attempts, 6 html files scanned)`.
- **Fail-loud check.** I added `"999": {}` to project-overrides.json temporarily. `pnpm build` exited 1 with:
  ```
  [ERROR] [build] Caught error rendering /es/projects: Error: project-overrides: unknown Behance id 999. Remove it or fix the id in src/data/project-overrides.json
  ```
  I then restored the file with `git checkout -- src/data/project-overrides.json`.

## Commits

| Task | Commit | Message |
| ---- | ------ | ------- |
| 1 RED | 3d7f107 | test(03-04): add failing project overrides e2e |
| 2 RED | b821fc6 | test(03-04): add failing overrides and select tests |
| 2 GREEN | 2e7b3d2 | feat(03-04): add overrides schema and home selection |
| 3 | 3786570 | feat(03-04): wire overrides and home query |

## TDD Gate Compliance

Task 2 has a `test(...)` RED commit (b821fc6), confirmed failing, followed by a `feat(...)` GREEN commit (2e7b3d2). The RED commits do not pass `pnpm lint` because the modules they import do not exist yet. Commit 2e7b3d2 removes `toProjects` while `queries.ts` still imports it, so `astro check` fails at that commit too. Commit 3786570, the next one, fixes the import, and every gate is green there.

## Deviations from Plan

1. **[Rule 2 - Coverage] Extra tests beyond the behavior list:**
   - a title of exactly 32 characters is accepted
   - the committed file validates against the seed snapshot
   - applyOverrides validates before merging
   - unordered featured projects sort after ordered ones
   - publishedOn ties break by id
   - hidden non-featured projects are excluded
   - missingOverrides uses the slug override
2. **Seed-origin warning moved** from `getAllProjects` into `loadProjects()` so the Home query also triggers it. It still prints once per process.
3. **Exported `Override` and `CuratedField` types** as well, for 03-08.
4. No files outside `files_modified` were touched. I did not edit any of the 03-03-owned files: ProjectCard, ProjectGrid, layout.ts, projects-grid.spec.ts.

## Known Stubs

- `src/data/project-overrides.json`: every title, summary and category is a draft marked TODO(martina) (the header comment in overrides-schema.ts; JSON has no comments). The summaries come from the titles only, and 03-09 revises them against the real tags and covers.
- PuroV (227934855) and Mart (172473551) have no category until the 03-09 sync checklist suggests one.
- No coverAlt overrides yet, so the D-15 `{title} — cover` fallback applies.

## Threat Flags

None. T-03-08 is covered: strictObject, the `^\d+$` id pattern, SLUG_PATTERN and the category enum. T-03-10 is covered: slugs are checked across hidden projects. T-03-09 is unchanged: ProjectCard still renders through `{}` with no `set:html`.

## Self-Check: PASSED

- Files exist: overrides-schema.ts, local-overrides.ts, project-overrides.json, projects-overrides.test.ts, projects-select.test.ts.
- Commits 3d7f107, b821fc6, 2e7b3d2 and 3786570 are in `git log`.
