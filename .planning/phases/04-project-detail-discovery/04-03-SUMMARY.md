---
phase: 04-project-detail-discovery
plan: 03
subsystem: behance-sync
tags: [sanitize-html, sharp, zod, embeds, behance, xss]
requires: []
provides:
  - scripts/behance/sanitize.ts (TEXT_OPTIONS, sanitizeText, cleanTextHtml, extractEmbedSrc)
  - src/lib/projects/embeds.ts (EMBED_PROVIDERS, EmbedProviderId, providerForUrl)
  - src/lib/projects/snapshot-schema.ts (MODULE_FILE, ImageRefSchema, ContentSchema, ImageRef, ContentEntry, contentImageIds)
  - scripts/behance/module-content.ts (KNOWN_MODULES, IMAGE_VARIANTS, ImagePlan, planModuleImages, toContent)
affects: [04-06, 04-07, 04-09, 04-10]
tech-stack:
  added: [sanitize-html@2.18.1, "@types/sanitize-html@2.16.2", sharp@0.35.5]
  patterns: [sync-time allowlist sanitizing, path-segment variant picking, exact-host https embed allowlist]
key-files:
  created:
    - scripts/behance/sanitize.ts
    - scripts/behance/module-content.ts
    - src/lib/projects/embeds.ts
    - tests/unit/sync-sanitize.test.ts
    - tests/unit/sync-modules.test.ts
  modified:
    - package.json
    - pnpm-lock.yaml
    - src/lib/projects/snapshot-schema.ts
    - scripts/behance/raw-schemas.ts
decisions:
  - "h1-h6 map to p (not p > strong): no current module has headings; UI-SPEC refinement"
  - "No data-newtab-hint span stored at sync; the localized hint is injected at render (04-09), so stored text HTML is a pure sanitizer fixed point"
  - "planModuleImages takes an optional project ref for error messages; a module image with no IMAGE_VARIANTS candidate fails G4m"
metrics:
  duration: ~6min (continuation)
  completed: 2026-10-17
---

# Phase 4 Plan 03: Behance Module Sanitizer and Content Normalizer Summary

The sync now has a sanitize-html allowlist for Behance text (text-align only, safe links with target/rel). It also has an exact-host https embed allowlist (embed.figma.com) and a strict Zod content union (image, collection, text, embed, unknown). All of it is tested against the real committed snapshot modules.

## Package Approval (Task 1 checkpoint)

A previous agent ran read-only registry checks:
- sanitize-html@2.18.1: repo git+https://github.com/apostrophecms/apostrophe.git, published 2026-10-14, no postinstall, maintainers apostrophecms
- @types/sanitize-html@2.16.2: DefinitelyTyped, no scripts
- sharp@0.35.5: lovell/sharp, no install script, already present as Astro's optional dependency

The orchestrator asked "Which versions should plan 04-03 install?" The user replied (verbatim): "Approved (2.18.1)"

Installed with exact pins: `pnpm add -D sanitize-html@2.18.1 @types/sanitize-html@2.16.2 sharp@0.35.5 --save-exact`. pnpm reported no ignored build scripts. `node -e "import('sharp')..."` printed `0.35.5`.

## Tasks

| Task | Name | Commits |
| ---- | ---- | ------- |
| 1 | Package legitimacy checkpoint | (no commit; approval recorded above) |
| 2 | Install deps + TextModule sanitizer (D-02) | 60e6583 (chore deps), 7746719 (RED test), 9908e74 (GREEN feat) |
| 3 | Embed allowlist, content schema, module normalizer (D-07, D-08) | 139eac8 (RED test), 9128f83 (GREEN feat) |

## What Was Built

- **sanitize.ts**: the only importer of sanitize-html, enforced by a guard test that walks `src/` and `scripts/`. Allowed tags are p, div, br, a, strong, b, em, i. Links keep only http, https or mailto hrefs and get `target="_blank" rel="noopener noreferrer"` through `simpleTransform` with no third argument. Spans are discarded but their text is kept. A link whose href was stripped is unwrapped to its text. `cleanTextHtml` trims leading and trailing empty `<div|p><br /></div|p>` blocks until the output stops changing. `extractEmbedSrc` takes the first iframe src from sanitize-html's parser (entities decoded, no regex) and returns it only if `URL.canParse` accepts it.
- **embeds.ts**: `providerForUrl` returns `'figma'` only for https on exactly `embed.figma.com` with no credentials. It imports nothing, so Node, the site and the client can all load it.
- **snapshot-schema.ts**: new exports `MODULE_FILE`, `ImageRefSchema`, `ContentSchema` (each member a strict object), `ImageRef`, `ContentEntry` and `contentImageIds`. `SnapshotProjectSchema` does not use them yet (Pitfall 5: that waits for 04-07), and the committed snapshot still parses.
- **raw-schemas.ts**: loose schemas for the image, collection, text and embed modules, plus `RawImageSizesSchema`.
- **module-content.ts**:
  - `planModuleImages` returns 154 plans on the real snapshot, in DOM order. Candidates are picked by `/project_modules/<variant>/` path segment, in the order 1400_webp, 1400, max_1200_webp, max_1200, fs_webp, fs.
  - `toContent` maps every module to one entry. Embeds that are not allowlisted, and unknown types, become `unknown` with the UI-SPEC warning text.
  - A known module type with an unexpected shape, or an image id missing from the map, throws `SyncError('G4m')`.
  - Behance `altText` is never read.

## Verification

- `pnpm vitest run tests/unit/sync-modules.test.ts tests/unit/sync-sanitize.test.ts tests/unit/projects-snapshot.test.ts`: 3 files, 109 tests passed
- `pnpm lint` (astro check 0 errors, eslint, prettier): passed
- `pnpm test`: 35 files, 481 tests passed
- Acceptance greps: the `simpleTransform` line count is 1. `grep -rln "from 'sanitize-html'" src scripts` lists only `scripts/behance/sanitize.ts`. `grep -c "astro:" src/lib/projects/embeds.ts` is 0. The `MODULE_FILE`, `ContentSchema` and `contentImageIds` exports are present.
- Node type stripping loads `scripts/behance/module-content.ts` directly (smoke import OK).

## Deviations from Plan

### UI-SPEC deviations (planned, recorded as required)
1. **h1-h6 map to `p`, not `p > strong`.** No snapshot module has headings (RESEARCH Open Question 3).
2. **No `<span data-newtab-hint>` token is stored at sync.** The localized new-tab hint is injected at render in 04-09 (RESEARCH Open Question 2), so stored HTML is a pure sanitizer fixed point. `span` is not in the allowlist.

### Minor implementation choices
- **[Rule 2] Image with no candidate variant fails G4m.** `planModuleImages` throws `SyncError('G4m')` when an image has no IMAGE_VARIANTS candidate, or has a non-digit id. The alternative was a plan with no candidates that the downloader cannot use. The real snapshot always has at least one candidate, and the first is always `1400_webp`.
- **`planModuleImages(modules, project?)`.** It takes an optional project ref, used only to add context to error messages. Calls that pass only `modules` still work.
- **Collection needs at least one component.** The raw collection schema requires `.min(1)` components, which mirrors `ContentSchema`'s `images.min(1)`. An empty collection fails G4m as an unexpected shape.
- **Warning for an embed with no parsable src.** The warning reports the origin as `"unparsable"`. URLs with a `null` origin (for example `javascript:`) report their protocol instead.
- **`run-sync.ts` is unchanged.** It keeps its own `KNOWN_MODULES` copy, as the plan says. 04-07 switches it to the exported one.

## Known Stubs

None. `ContentSchema` is intentionally not attached to `SnapshotProjectSchema` yet; 04-07 wires it in together with the regenerated snapshot.

## Threat Flags

None. All new surface is covered by T-04-01..T-04-04 and T-04-SC.

## TDD Gate Compliance

Task 2 has RED commit 7746719 (test) followed by GREEN commit 9908e74 (feat). Task 3 has RED commit 139eac8 (test) followed by GREEN commit 9128f83 (feat). Neither task needed a refactor commit.

## Self-Check: PASSED
