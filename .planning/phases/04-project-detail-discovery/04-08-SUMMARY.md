---
phase: 04-project-detail-discovery
plan: 08
subsystem: behance-sync
tags: [sync, live-run, module-images, ssrf, schema]
status: complete
requires:
  - "04-07: G4m module image download, content, moduleAlt checklist"
provides:
  - "Committed snapshot with required `content` for all 7 projects"
  - "154 committed module WebPs in src/assets/projects/modules/"
  - "Committed-snapshot invariant tests (sanitizer fixed point, real dims, embed allowlist, no orphans)"
  - "One validated CDN redirect hop for module images"
affects: [04-09, 04-10]
tech-stack:
  added: []
  patterns:
    - "redirect: 'manual' with exactly one validated hop (host, https, path prefix, no userinfo/port)"
key-files:
  created:
    - src/assets/projects/modules/*.webp (154 files)
  modified:
    - scripts/behance/fetch-page.ts
    - tests/unit/sync-module-images.test.ts
    - .planning/phases/04-project-detail-discovery/04-RESEARCH.md
    - src/data/behance/snapshot.json
    - src/lib/projects/snapshot-schema.ts
    - src/lib/projects/sources/behance-snapshot.ts
    - scripts/behance/run-sync.ts
    - tests/unit/projects-snapshot.test.ts
    - tests/unit/sync-run.test.ts
    - tests/unit/projects-overrides.test.ts
decisions:
  - "User approved one live sync (run-now). The first attempt failed at G4m on a CDN 302. It was not retried."
  - "User chose 'Allow one hop (Recommended)': module images follow exactly one redirect, only to https://mir-cdn.behance.net/v1/rendition/project_modules/. Every other redirect fails G4m."
  - "User chose 'Yes, fix + one run'. The second run succeeded: 7 projects, 154 module images, 461 s."
  - "Covers keep redirect: 'error'. Both live runs downloaded covers (G4 runs before G4m per project) without a redirect, so the 'same redirect pattern' condition was not met."
metrics:
  duration: "~25 min (continuation #2); sync wall time 461 s"
  completed: 2026-10-17
---

# Phase 4 Plan 08: Live Behance re-sync Summary

After a CDN redirect fix, the second approved live `pnpm sync:behance` run succeeded. The repo now has Martina's real module content: 154 WebPs, 15.40 MB. `content` is required in the schema, and committed-snapshot invariant tests guard it.

## Decisions (verbatim)

**Task 1 (checkpoint:decision).** Question: "Approve one manual live `pnpm sync:behance` run now?"
User response: "run-now (Recommended)"

**After the blocked first run (Rule 4, decided by the user):**
1. "How should the sync handle Behance's new CDN redirect?" → "Allow one hop (Recommended)"
2. "May I implement it and re-run the live sync once without asking again?" → "Yes, fix + one run"

## History: blocked first attempt

- Run 1 (`tmp/sync-run-04.log`) exited 1 after 54 s: `sync:behance: [G4m] https://mir-s3-cdn-cf.behance.net/project_modules/1400_webp/18e1ef227934855.6a18cb8c0ed5c.png: request failed (redirect refused or network error: fetch failed). The previous snapshot was left untouched.`
- Diagnosis (one HEAD request): `302 -> https://mir-cdn.behance.net/v1/rendition/project_modules/1400_webp/18e1ef227934855.6a18cb8c0ed5c.png`. `fetch-page.ts` used `redirect: 'error'`.
- DATA-03 held on that live failure. `git status --short src/data/behance src/assets/projects` was empty afterwards.
- It was not retried and Playwright plan B was not started. The blocked SUMMARY is in commit 74f7029.

## Tasks

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | User go-ahead for one live re-sync | Done: run-now | none (decision only) |
| 2a | Gap fix (RED): fake-fetch tests for the redirect rules | Done | 29fb8ff |
| 2b | Gap fix (GREEN): one allowlisted CDN hop in `fetchModuleImage` | Done | bce1358 |
| 2c | Live re-sync committed (snapshot and 154 module WebPs) | Done | ce8b9ef |
| 2d | Schema lock, fallbacks removed, snapshot invariant tests | Done | bdd3ba8 |

## Redirect fix (gap closure inside 04-08)

`fetchModuleImage` now sends `redirect: 'manual'`. On a 301, 302, 303, 307 or 308 response it follows **exactly one** hop, and only when all of these hold:
- the source URL passed the existing allowlist (`mir-s3-cdn-cf.behance.net`, https)
- the Location is an absolute URL (relative Locations are refused)
- the Location uses `https:`, on exactly `mir-cdn.behance.net`, with the default port and no username or password
- the normalized path starts with `/v1/rendition/project_modules/`, so `..` escapes are normalized first and then refused

Anything else fails G4m before the target is requested: a second hop, a foreign host, a look-alike host, the source host, a wrong path, http, userinfo, a port, a relative Location, an unparsable Location, a missing Location, or any other 3xx status. The status, content-type, size-cap, minimum-bytes and magic-byte checks run on the final response, and a 404 or non-image after the hop is still a `skip`. The UA is the same on both requests.

- Tests: 21 new cases in `tests/unit/sync-module-images.test.ts`, and the shared fake fetch now asserts `redirect: 'manual'`. Before the GREEN commit, 18 tests in the file failed (new and existing).
- [Verified] Node's `fetch` with `redirect: 'manual'` exposes the 302 status and `Location` header (checked against a local 127.0.0.1 server, with no Behance traffic).
- Pages (`fetchStorePage`) and covers (`fetchCover`) still use `redirect: 'error'`. [Verified by code order in run-sync.ts and both live runs] G4 (cover) runs before G4m for each project, and every cover in run 2 downloaded without a redirect.
- `04-RESEARCH.md` SSRF notes (approach step 2, ASVS V12 row, SSRF threat row) are amended to match.

## Sync output (verbatim, tmp/sync-run-04b.log, not committed)

```
$ node scripts/sync-behance.ts
sync:behance: 7 projects
sync:behance: module images: 154 files, 15.40 MB added
missing module alts for 238078789 (cabreras-motos-posts): 6 of 6 images. Add moduleAlt entries in src/data/project-overrides.json. TODO(martina)
missing module alts for 227934855 (purov): 22 of 22 images. Add moduleAlt entries in src/data/project-overrides.json. TODO(martina)
missing module alts for 226450035 (website-reciclick): 17 of 17 images. Add moduleAlt entries in src/data/project-overrides.json. TODO(martina)
missing module alts for 202447185 (portfolio-web): 10 of 10 images. Add moduleAlt entries in src/data/project-overrides.json. TODO(martina)
missing module alts for 185594991 (sistema-visual): 1 of 1 images. Add moduleAlt entries in src/data/project-overrides.json. TODO(martina)
missing module alts for 176799549 (website-instablogs): 85 of 85 images. Add moduleAlt entries in src/data/project-overrides.json. TODO(martina)
missing module alts for 172473551 (mart): 13 of 13 images. Add moduleAlt entries in src/data/project-overrides.json. TODO(martina)
sync:behance: done. Review the diff (src/data/behance, src/assets/projects, src/assets/projects/modules) and commit it.
exit=0 wall=461s
```

There were no unknown-type or non-allowlisted-embed warnings, and no `missing overrides` checklist lines.

## Measurements

| Metric | Before | After |
|--------|--------|-------|
| `du -sk src/assets/projects` | 1940 KB | 21336 KB |
| `du -sk src/assets/projects/modules` | `.gitkeep` only | 19396 KB |
| `du -sk src/data/behance` | 856 KB | 916 KB |
| Module WebPs | 0 | **154** (expected 154, no difference) |
| Sync-reported module bytes | n/a | 15.40 MB added |
| `git count-objects -vH` (loose, worktree) | count 2053, 13.24 MiB | count 2223, 28.88 MiB (**+15.64 MiB**, including the small code commits) |
| Snapshot commit `git show --stat` | n/a | 155 files changed, 1794 insertions(+), 1 deletion(-) |
| Covers | 7 files | unchanged (same 7 file names, no cover diff) |
| Content entries | none | 127 image, 9 collection, 4 text, 1 embed |
| Sync wall time | run 1: 54 s (failed) | run 2: **461 s** (exit 0) |
| `pnpm build:offline` | n/a | exit 0, 3 s, "offline build ok (0 network attempts, 43 text files scanned, 20 html)" |

The research estimate was ~180 requests and 6–7 min. The real run took 7 min 41 s. The size estimate was 15–16 MB, and the real added size is 15.40 MB (sync) / 15.64 MiB (git loose objects).

## Verification

- `node -e` plan verify: `content ok` (origin behance-sync, 7 projects, every project has non-empty content)
- `grep -c "content: z.array(ContentSchema).optional()" src/lib/projects/snapshot-schema.ts`: 0
- `grep -rn "content ?? \[\]" src scripts`: nothing
- `pnpm test`: 40 files, 594/594 passed
- `pnpm lint` (astro check, eslint, prettier): 0 errors, 0 warnings
- `pnpm build:offline`: passed
- `pnpm test:e2e` (astro build + Playwright): 372/372 passed

New tests in `tests/unit/projects-snapshot.test.ts` ("committed snapshot content (04-08 invariants)") check the following:
- every project has non-empty content
- every text entry satisfies `sanitizeText(html) === html`, with no color/font-family/font-size and only `text-align` styles
- every embed has `providerForUrl(src) === provider`
- image ref ids are unique per project
- every image/collection file exists, is a WebP, and has sharp width/height equal to the ref, ≤1400
- no orphan module files

## Deviations from Plan

### Rule 4 (decided by the user): CDN redirect gap closure

- **Found during:** Task 2, live run 1
- **Issue:** Behance's image CDN now sends a 302 for module image URLs, from `mir-s3-cdn-cf.behance.net` to `mir-cdn.behance.net/v1/rendition/...`. With `redirect: 'error'`, G4m failed on the first module image.
- **Fix:** One validated hop (see "Redirect fix"), written test-first. The user approved one more live run.
- **Files:** scripts/behance/fetch-page.ts, tests/unit/sync-module-images.test.ts, 04-RESEARCH.md
- **Commits:** 29fb8ff (RED), bce1358 (GREEN)

### Rule 3: test fixtures updated for required `content`

- **Found during:** Task 2, schema lock
- **Issue:** Once `content` was required, the `seedProject()` factory in `tests/unit/sync-run.test.ts` failed G1b. The previous-snapshot parse rejected projects without `content`.
- **Fix:** Added `content: []` to `seedProject()` and to `validProject()` (projects-snapshot test). Removed the `content ?? []` and `content?.` uses in tests/unit/sync-run.test.ts and tests/unit/projects-overrides.test.ts. One legitimate `find(...)?.content ?? []` stays at sync-run.test.ts:444, because `find` can return undefined.
- **Commit:** bdd3ba8

## Known Stubs

- **moduleAlt TODO(martina):** all 154 module images have no `moduleAlt` overrides (6 + 22 + 17 + 10 + 1 + 85 + 13; verbatim lines above). This is intentional per 04-07: Martina writes the alts in `src/data/project-overrides.json`. Rendering in 04-09 needs a fallback until she does.
- Module content is committed but not rendered yet. Rendering is plan 04-09.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: ssrf-redirect | scripts/behance/fetch-page.ts | The SSRF guard now allows one redirect hop for module images, to `mir-cdn.behance.net/v1/rendition/project_modules/` only. The user approved it, and tests cover the disallowed redirect cases. Include it in the phase `/security-review`. |

T-04-01 and T-04-02 are mitigated by the new committed-snapshot tests. T-04-09 is mitigated: there were two approved runs in total, each a single run with no retry loop. T-04-17 is mitigated: DATA-03 was shown on live run 1.

## Self-Check: PASSED

- FOUND: src/data/behance/snapshot.json (origin behance-sync, content on all 7 projects)
- FOUND: 154 files src/assets/projects/modules/*.webp
- FOUND: tests/unit/projects-snapshot.test.ts contains `sanitizeText`
- FOUND commits: 29fb8ff, bce1358, ce8b9ef, bdd3ba8
- tmp/sync-run-04b.log local only (gitignored by `tmp/`)
- STATE.md and ROADMAP.md not modified
