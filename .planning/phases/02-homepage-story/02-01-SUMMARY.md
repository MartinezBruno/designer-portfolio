---
phase: 02-homepage-story
plan: 01
subsystem: content
tags: [astro-content-layer, zod, i18n, json, vitest]
requires: []
provides:
  - src/lib/content/icons.ts (serviceIconKeys, toolIconKeys, ServiceIconKey, ToolIconKey)
  - roles/services/tools/profile file() collections (src/content.config.ts)
  - pure query layer (src/lib/content/home.ts)
  - getHomeContent(locale) (src/lib/content/queries.ts)
affects: [02-03, 02-04, 02-05, 02-06, 02-07]
tech-stack:
  added: []
  patterns:
    - as-const icon key tuples shared by z.enum and typed icon maps
    - pure, astro:content-free build/guard functions plus one thin collection reader
    - direct JSON imports in unit tests to catch parse errors the file() loader swallows
key-files:
  created:
    - src/lib/content/icons.ts
    - src/data/roles.json
    - src/data/services.json
    - src/data/tools.json
    - src/data/profile.json
    - src/content.config.ts
    - src/lib/content/home.ts
    - src/lib/content/queries.ts
    - tests/unit/content-home.test.ts
  modified: []
decisions:
  - Comments in home.ts/queries.ts avoid the literal "astro:content" and "getCollection" so the plan's grep gates count only real imports and calls
  - The CollectionEntry types were structurally assignable to the RoleEntry/ServiceEntry/ToolEntry/ProfileEntry interfaces (astro check 0 errors), so no interface changes or casts were needed
metrics:
  duration: ~4min
  completed: 2026-10-16
  tasks: 2
  files: 9
---

# Phase 2 Plan 01: Homepage Content Collections and Query Layer Summary

Four localized JSON collections (roles, services, tools, profile) hold Martina's real copy and are validated by `astro/zod` schemas. The tool and service icon enums are shared through `icons.ts`. A pure query layer sorts them, guards their counts and localizes them, and `getHomeContent(locale)` is the only module that reads collections.

## Tasks

| Task | Name | Commits | Files |
| ---- | ---- | ------- | ----- |
| 1 | Icon keys, four JSON content files, collections schema | 329dd9a (RED), 623230e (GREEN) | icons.ts, src/data/*.json, content.config.ts, content-home.test.ts |
| 2 | Pure query layer and getHomeContent | 30ec888 (RED), b6721c3 (GREEN) | home.ts, queries.ts, content-home.test.ts |

## Verification

[Verified by running the commands]
- `pnpm vitest run`: 10 files and 79 tests passed. `content-home.test.ts` contributes 24 tests across the `content files` and `home query layer` blocks.
- `pnpm lint`: astro check reported 0 errors, 0 warnings and 0 hints across 54 files. ESLint and Prettier also passed.
- All Task 1 and Task 2 acceptance grep checks returned the expected counts. `set:html` still appears once in src. Apart from queries.ts, no file calls `getCollection` or `getEntry`.
- The negative schema check (a missing es value makes astro check fail) was not run here, as the plan requires. Plan 02-07 runs it.

## TDD Gate Compliance

Both tasks followed the RED then GREEN order. Each RED run failed because the imported modules or files did not exist yet. No refactor commits were needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The wording of the JSDoc comments broke the grep acceptance gates**
- **Found during:** Task 2
- **Issue:** The first module comments mentioned `astro:content` and `getCollection`. That made `grep -c astro:content home.ts` return 1 (0 expected) and queries.ts return 2 (1 expected). It also made the "no getCollection outside queries.ts" grep match.
- **Fix:** Reworded the comments ("content collection runtime" and "collection reads"). Code behavior did not change.
- **Files modified:** src/lib/content/home.ts, src/lib/content/queries.ts
- **Commit:** b6721c3

### Process notes

- The plan's `<commit_protocol>` says to wait for user confirmation before each commit. The orchestrator told this parallel worktree agent to commit each task directly, without Co-Authored-By or attribution lines, and that is what was done. `/security-review` was not run inside this agent. The threat model mitigations (T-02-01 schemas, T-02-02 direct imports and guards) are implemented.
- `pnpm install --frozen-lockfile` was run in the worktree because node_modules was missing. No packages were added.

## Known Stubs

These are not code stubs. They are polished strings that Martina needs to review (D-02). JSON cannot hold comments, so `src/content.config.ts` carries a `TODO(martina)` block that points here.

**Role translations (src/data/roles.json; ES is her source, EN is our translation, D-01):**
- Diseño web -> Web design
- Branding -> Branding
- Social media manager -> Social media manager
- Diseño gráfico -> Graphic design

**Service titles and bullets (src/data/services.json), ES / EN:**
- Diseño gráfico / Graphic design
  - Diseño de merchandising y packaging / Merchandise and packaging design (fixes the "merchandasing" typo)
  - Marcas de agua / Watermarks
  - Miniaturas y portadas / Thumbnails and covers
  - Piezas multimedia / Multimedia pieces
- Diseño web / Web design
  - Wireframes y assets / Wireframes and assets
  - Diseño responsive / Responsive design
  - Prototipado / Prototyping
  - **Revisión y comentarios / Design reviews and feedback** (D-07: replaces her ambiguous "Comentarios"; NEEDS HER CONFIRMATION)
  - Diseño UX/UI / UX/UI design
- Branding / Branding
  - Identidad visual / Visual identity (D-06: first bullet, plain item)
  - Logo / Logo
  - Tipografía / Typography
  - Paleta de colores / Color palette
  - Mockups / Mockups
  - Aplicación de la marca en web y gráfica / Brand applications for web and print (replaces "en gral")
- Social media / Social media
  - Gestión de redes sociales / Social media management
  - Diseño de historias y publicaciones / Story and post design
  - Diseño del feed / Feed design

**Tools (src/data/tools.json):** Lightroom uses the generic Adobe mark (D-13). Tool names are not translated.

## Self-Check: PASSED

- FOUND: src/lib/content/icons.ts, src/data/roles.json, src/data/services.json, src/data/tools.json, src/data/profile.json, src/content.config.ts, src/lib/content/home.ts, src/lib/content/queries.ts, tests/unit/content-home.test.ts
- FOUND commits: 329dd9a, 623230e, 30ec888, b6721c3
