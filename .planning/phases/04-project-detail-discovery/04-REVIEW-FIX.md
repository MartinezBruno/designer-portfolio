---
phase: 04-project-detail-discovery
fixed_at: 2026-10-19T13:50:39Z
review_path: .planning/phases/04-project-detail-discovery/04-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 04: Code Review Fix Report

**Fixed at:** 2026-10-19T13:50:39Z
**Source review:** .planning/phases/04-project-detail-discovery/04-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (WR-01..WR-05; no Critical findings; Info IN-01..IN-10 out of scope)
- Fixed: 5
- Skipped: 0

## Fixed Issues

### WR-01: Cover GC regex also matches module-image names

**Files modified:** `scripts/behance/fs-commit.ts`, `tests/unit/sync-commit.test.ts`
**Commit:** 0094435
**Applied fix:** `commitSync` now throws `SyncError('G7')` before pre-flight, so before any write, when `resolve(root, coversDir) === resolve(root, modulesDir)`. The header comment now states the invariant. New test: `covers`, `covers/` and `./covers` as modulesDir are all refused, and the snapshot, covers and module images are left untouched. The additive option (cover GC skips referenced module names) was not applied, because the guard alone closes the hole.

### WR-02: Image candidates not filtered by allowlisted host

**Files modified:** `scripts/behance/fetch-page.ts`, `scripts/behance/module-content.ts`, `tests/unit/sync-modules.test.ts`
**Commit:** 9169b81
**Applied fix:** `CDN_HOSTS` is now exported from `fetch-page.ts`. `planOf` only plans https URLs whose hostname is in `CDN_HOSTS`, so an off-CDN or http variant falls through to the next same-variant entry or the next variant. The hard `assertAllowed` guard in `fetchModuleImage` is unchanged. The 04-08 redirect allowance (`mir-cdn.behance.net` as a redirect target only) is untouched. A direct `mir-cdn` candidate is now skipped at planning, where before it threw G4m. New tests: fall-through ordering, and G4m "no usable image variant" when no candidate is on the CDN.

### WR-03: Empty `originalEmbed` blocks the `fluidEmbed` fallback

**Files modified:** `scripts/behance/module-content.ts`, `tests/unit/sync-modules.test.ts`
**Commit:** 3268dcb
**Applied fix:** The fallback now works per field: `extractEmbedSrc(originalEmbed ?? '') ?? extractEmbedSrc(fluidEmbed ?? '')`. New test: `originalEmbed: ''` with a Figma iframe in `fluidEmbed` gives an `embed` entry and no warning.

### WR-04: Image captions rendered from Behance's possibly-rich `caption`

**Files modified:** `scripts/behance/sanitize.ts`, `scripts/behance/raw-schemas.ts`, `scripts/behance/module-content.ts`, `tests/unit/sync-modules.test.ts`, `tests/unit/sync-sanitize.test.ts`
**Commit:** dfed240
**Applied fix:** A new `plainCaption()` in `sanitize.ts` (still the only importer of sanitize-html) drops every tag and keeps its text. `<br>` becomes a space. Entities are decoded: the parser decodes them, then the four sanitize-html escapes are reversed. Whitespace is collapsed. `RawImageModuleSchema` gains an optional `captionPlain`. The sync stores `plainCaption(captionPlain)` when it is non-empty, else `plainCaption(caption)`. New tests cover HTML, entity, script/img, whitespace and empty inputs, plus the order of preference.
**Note:** [Verified] All 264 `caption` values in the committed snapshot are `""`, and `captionPlain` appears only on the EmbedModule. Rendered output is therefore unchanged today. [Unverified] It is still not confirmed that Behance's ImageModule `caption` carries HTML (see the review's own label).

### WR-05: `set:html` trusts snapshot text HTML at build time

**Files modified:** `src/lib/projects/snapshot-schema.ts`, `src/components/project/TextModule.astro`, `tests/unit/sync-sanitize.test.ts`
**Commit:** 44de0cd
**Applied fix:** The fix is adapted from the review's suggestion, which would also have matched prose such as " one = two". A new exported `isStoredTextHtml()` checks each tag against the exact TEXT_OPTIONS output grammar:
- `<p>`/`<div>`, optionally with only `style="text-align:left|right|center|justify"`
- `<br />`, `<strong>`, `<b>`, `<em>` and `<i>`, plus the matching closing tags
- `<a>` with exactly `href` (http, https or mailto), `target="_blank"` and `rel="noopener noreferrer"`, in any order
- no `<` or `>` outside a tag

`ContentSchema` text `html` now uses this refine. The snapshot is parsed at module load in `behance-snapshot.ts`, so `astro build` now fails closed. The `TextModule.astro` comment now points at the check. New tests:
- every XSS fixture's sanitized form and each sanitizer output shape is accepted, so the sync is not broken
- 11 hand-crafted bad inputs are rejected by `isStoredTextHtml` and by `ContentSchema`

The commit was amended once before it was final. A doc comment that contained the literal `set:html` tripped the T-04-01 grep guard in `project-modules.test.ts`, so it was reworded.
**Status:** fixed: requires human verification. This is a logic-heavy grammar check. The tests show that the committed snapshot and all current sanitizer outputs pass. A new sanitizer output shape added in the future would also need this grammar updated.

## Verification

- Per fix: re-read the changed code, ran the targeted vitest files, prettier check and eslint on the touched files. Loaded `module-content.ts` under Node type stripping to confirm the new import still runs as erasable TS.
- `pnpm lint` (astro check + eslint + prettier): passed. 0 errors, 0 warnings, 0 hints across 150 files. This ran before the WR-05 comment reword. After the reword, prettier was re-checked on the edited file.
- `pnpm test`: 43 files, 684 tests passed. The first run failed 1 test, the set:html guard. The cause was fixed and folded into the WR-05 commit, and the rerun was fully green.
- `pnpm test:e2e` (astro build + Playwright): 459 passed.

---

_Fixed: 2026-10-19T13:50:39Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
