---
phase: 03-real-behance-work
plan: 06
subsystem: behance-sync
tags: [behance, sync, scraping, zod, security, tdd]
requires: []
provides:
  - docs/CONSENT.md (DATA-01 consent note, own commit before any sync code)
  - scripts/behance/errors.ts (SyncError with named gate)
  - scripts/behance/raw-schemas.ts (loose Zod schemas for profile/project store slices)
  - scripts/behance/parse.ts (extractStore, parseProfileStore, parseProjectStore, keywordsMeta, deriveFields)
  - scripts/behance/covers.ts (pickCover, sniffImage, coverFileName)
  - scripts/behance/fetch-page.ts (BEHANCE_UA, FetchDeps, fetchStorePage, fetchCover)
affects: [03-08]
tech-stack:
  added: []
  patterns:
    - Node-strippable TypeScript (explicit .ts value imports, no enums/namespaces/parameter properties)
    - Dependency-injected fetch/sleep for deterministic tests
    - Named failure gates (G1 profile, G2 challenge, G3 project, G4 cover, G6 body sanity)
key-files:
  created:
    - docs/CONSENT.md
    - scripts/behance/errors.ts
    - scripts/behance/raw-schemas.ts
    - scripts/behance/parse.ts
    - scripts/behance/covers.ts
    - scripts/behance/fetch-page.ts
    - tests/fixtures/behance/profile.html
    - tests/fixtures/behance/project.html
    - tests/fixtures/behance/challenge.html
    - tests/fixtures/behance/cover.png
    - tests/fixtures/behance/not-image.bin
    - tests/unit/sync-parse.test.ts
    - tests/unit/sync-fetch.test.ts
  modified:
    - .prettierignore
decisions:
  - Behance HTML fixtures are kept raw (minified, like real pages) and excluded from Prettier
  - parseProjectStore reports a missing store as gate G3 (project), extractStore alone uses G1
  - A 200 page without beconfig-store_state is G2 (possible hardening, points at plan B); a body under 2 KB is G6
  - Bodies are read through a streaming cap, so an oversize body is cut off without being buffered whole
  - Tag/tool ids accept number or string and are normalised to strings
metrics:
  duration: ~10 min
  completed: 2026-10-17
  tasks: 3
  files: 14
---

# Phase 3 Plan 06: Behance Sync Building Blocks Summary

Consent note committed first, then Zod-validated parsing of Behance's `beconfig-store_state` island, a cover picker that never relies on array position, and a challenge-aware fetch that allowlists hosts and caps body size. Every failure throws a `SyncError` that names its gate.

## What was built

- **Task 1 (DATA-01):** `docs/CONSENT.md` is a one-line consent note, committed alone in `6331404`. `git show --stat` lists only that file. At that commit, `scripts/` contains only `check-secrets.ts` and `secrets.ts`.
- **Task 2:** `extractStore`, `parseProfileStore` (G1: missing store, bad JSON, Zod path, `hasMore: true` → pagination/plan B, 0 projects), `parseProjectStore` (G3: store, Zod, id mismatch; unknown module types such as `FutureModule` are kept), `keywordsMeta`/`deriveFields` (creative fields only, never a runtime category), `pickCover` (non-WEBP `/projects/max_808/`, otherwise the largest finite-width non-WEBP entry, otherwise G4), `sniffImage` (PNG/JPEG/WEBP magic bytes), and `coverFileName` (`<digits id>-<sha256 first 12>.<ext>`).
- **Task 3:** `fetchStorePage` checks the host before any request. It sends `redirect: 'error'` and the fixed `BEHANCE_UA`. On a 403 with `js_challenge_value`, it calls `deps.sleep(2000)` and replays once with the same UA plus the challenge cookie. A repeated challenge, a 403 without the marker, a non-200, or a page with no store fails with G2 and names plan B. A body under 2 KB or over 5 MB (by content-length or by actual bytes) fails with G6. `fetchCover` accepts only `https://mir-s3-cdn-cf.behance.net`. It requires `image/*`, 1 KB < size ≤ 10 MB, and recognised magic bytes, and it takes the extension from the sniffed bytes. Rejected or redirected fetches fail with G4 `redirect refused`.

## Verification

- `pnpm vitest run tests/unit/sync-parse.test.ts tests/unit/sync-fetch.test.ts`: 53 passed
- `pnpm test`: 18 files, 180 tests passed
- `pnpm lint` (astro check, eslint, prettier): 0 errors
- `node --input-type=module -e "await import('./scripts/behance/parse.ts'); …covers.ts; …fetch-page.ts"` printed `node-safe ok`
- Acceptance greps: no `altText` and no `password|token|login|credential` in `scripts/behance`; no `[0]`/`at(-1)` in `covers.ts`; `redirect: 'error'` appears 4 times in `fetch-page.ts`; `mir-cdn.behance.net` appears only in tests; `profile.html` is 8266 bytes
- The consent gate (`git merge-base --is-ancestor <consent commit> HEAD`) passed before Task 2 and before Task 3

## Commits

| Task | Commit | Message |
| ---- | ------ | ------- |
| 1 | 6331404 | docs(03-06): record behance sync consent |
| 2 (RED) | 623656f | test(03-06): add failing behance parse tests |
| 2 (GREEN) | e2d5cf8 | feat(03-06): parse behance stores and pick covers |
| 3 (RED) | ebe6e9d | test(03-06): add failing behance fetch tests |
| 3 (GREEN) | 513a785 | feat(03-06): add challenge-aware behance fetch |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Raw HTML fixtures excluded from Prettier**
- **Found during:** Task 2
- **Issue:** `pnpm lint` runs `prettier --check .`. Formatting the fixtures would rewrite the embedded JSON and the meta tags, so they would no longer look like real Behance pages, and the single-line `KEYWORDS` regex would stop matching wrapped attributes.
- **Fix:** Added `tests/fixtures/behance` to `.prettierignore`.
- **Files modified:** .prettierignore
- **Commit:** 623656f

**2. [Rule 2 - Hardening] Streaming body cap**
- Bodies are read chunk by chunk and cancelled as soon as they pass the limit, instead of buffering with `arrayBuffer()` first and checking afterwards. This is the T-03-15 mitigation. The cover is still returned as a `Uint8Array`.

**3. Minor:** The synthetic `challenge.html` is 358 bytes rather than 453. It has the same shape: robots noindex meta, inline `document.cookie = "js_challenge_value=<128 hex>; Path=/"; window.location.reload();`. The fixtures were generated by a throwaway Node script kept outside the repo.

## TDD Gate Compliance

Both TDD tasks have a `test(...)` RED commit followed by a `feat(...)` GREEN commit. RED was confirmed: the suites failed because the modules were missing. No refactor commit was needed.

## Known Stubs

- `docs/CONSENT.md`: `TODO(martina-date)`. The date of Martina's written consent has not been provided (RESEARCH Open Question 1). Replace it with the real date before the phase closes.

## Threat Flags

None. All new surface (outbound fetches to the Behance page and CDN hosts) is covered by T-03-13..T-03-18.

## Self-Check: PASSED

- All 14 created/modified files exist on disk
- Commits 6331404, 623656f, e2d5cf8, ebe6e9d, 513a785 are present in `git log`
