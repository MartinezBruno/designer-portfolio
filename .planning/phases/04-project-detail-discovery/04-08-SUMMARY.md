---
phase: 04-project-detail-discovery
plan: 08
subsystem: behance-sync
tags: [sync, live-run, blocker, module-images]
status: blocked
requires:
  - "04-07: G4m module image download, content, moduleAlt checklist"
provides: []
affects: [04-09, 04-10]
tech-stack:
  added: []
  patterns: []
key-files:
  created: []
  modified: []
decisions:
  - "User approved one live sync (run-now). It ran once and failed at G4m. Per plan it was not retried, and Playwright plan B was not started."
metrics:
  duration: "~5 min (sync wall time 54 s)"
  completed: 2026-10-17
---

# Phase 4 Plan 08: Live Behance re-sync (BLOCKED) Summary

The one approved live `pnpm sync:behance` run failed at gate G4m on the first module image. The Behance image CDN now answers module image URLs with a cross-host 302 redirect, and the sync refuses every redirect (`redirect: 'error'`, SSRF guard in `scripts/behance/fetch-page.ts`). DATA-03 held: the previous snapshot, covers and modules dir are unchanged. Task 2's schema lock, fallback removal and snapshot tests were **not** done, because the plan only allows them after a successful re-sync (RESEARCH Pitfall 5).

## Decision (Task 1, checkpoint:decision)

Question: "Approve one manual live `pnpm sync:behance` run now?"
User response (verbatim): "run-now (Recommended)"

Preconditions, checked again before the run:
- DATA-01 consent commit: `6331404a689dd0e6b06b36f54a25a6c725150d7b`
- `CI` unset
- `git status --short src/data/behance src/assets/projects`: empty
- `pnpm test`: 567/567 green (checked by the previous agent at the checkpoint)

## Tasks

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | User go-ahead for one live re-sync | Done: run-now | none (decision only) |
| 2 | Live re-sync, schema lock, snapshot invariants | **Blocked** at step 2 (the sync failed) | none |

## Sync output (verbatim, tmp/sync-run-04.log, not committed)

```
$ node scripts/sync-behance.ts
sync:behance: [G4m] https://mir-s3-cdn-cf.behance.net/project_modules/1400_webp/18e1ef227934855.6a18cb8c0ed5c.png: request failed (redirect refused or network error: fetch failed). The previous snapshot was left untouched.
 ELIFECYCLE  Command failed with exit code 1.
exit=1 wall=54s
```

## Root cause

After the failure I made one diagnostic HEAD request to the same URL. This was not a sync retry.

```
curl -sI -A "Mozilla/5.0" https://mir-s3-cdn-cf.behance.net/project_modules/1400_webp/18e1ef227934855.6a18cb8c0ed5c.png
-> 302 https://mir-cdn.behance.net/v1/rendition/project_modules/1400_webp/18e1ef227934855.6a18cb8c0ed5c.png
```

- [Verified] `mir-s3-cdn-cf.behance.net` now sends a 302 to a different host, `mir-cdn.behance.net`, with a `/v1/rendition/` path prefix.
- [Verified] The sandbox did not block the network. www.behance.net pages loaded: the run lasted 54 s and got as far as G4m, which comes after the profile and project fetches.
- [Inference] Phase 3 research saw a 200 from `mir-s3-cdn-cf.behance.net` on 2026-10-15, so Behance probably changed its CDN routing after that. Cover downloads (G4) would likely hit the same redirect on a cold run. This run reused the committed covers, so it did not test that.

## Measurements

| Metric | Before | After |
|--------|--------|-------|
| `du -sk src/assets/projects` | 1940 KB | 1940 KB (unchanged) |
| `du -sk src/data/behance` | 856 KB | 856 KB (unchanged) |
| `src/assets/projects/modules/` | `.gitkeep` only | `.gitkeep` only |
| `git count-objects -vH` (worktree) | count 2030, size 13.11 MiB, size-pack 0 | not re-measured (nothing written) |
| Module images added | n/a | 0 (expected 154) |
| Sync wall time | n/a | 54 s, failed at G4m |
| `missing module alts` checklist | n/a | not printed (the run failed before G9) |

`git status --short` after the failure was empty. DATA-03 was shown on a live run: the previous snapshot and images are untouched.

## Blocker and proposed fix (needs user decision, Rule 4)

[Proposed] Possible ways forward. None of them have been implemented.

1. **Allow the one known CDN redirect (recommended).** Put `mir-cdn.behance.net` on the image host allowlist. In `fetchModuleImage` and the cover fetch, use `redirect: 'manual'` and follow at most one hop, and only when the `Location` host is allowlisted and the path is `/v1/rendition/project_modules/...`. All other redirects keep failing. Add fake-fetch tests for the allowed hop, a disallowed host, and a second hop. This changes the SSRF guard on a trust boundary, so it needs your approval, plus a second approved live run.
2. **Rewrite the URLs up front.** Map `mir-s3-cdn-cf.behance.net/project_modules/X` to `mir-cdn.behance.net/v1/rendition/project_modules/X` before the request, and keep `redirect: 'error'`. This is simpler, but it depends on Behance's current URL scheme.
3. **Defer.** 04-09 onward cannot render modules, and PROJ-02 stays open.

Either fix needs a new plan or a gap-closure plan, then a fresh go-ahead for one more live run.

## Deviations from Plan

None in code. The plan's failure path ran as written: one run, no retry loop, no Playwright plan B, untouched state confirmed with `git status`. The extra step was one diagnostic HEAD request to find the cause.

## Known Stubs

These stay in place until a successful re-sync. They are intentional per 04-07:
- `content: z.array(ContentSchema).optional()` in `src/lib/projects/snapshot-schema.ts`
- `project.content ?? []` in `src/lib/projects/sources/behance-snapshot.ts` and `scripts/behance/run-sync.ts`
- The committed snapshot has no `content`, and there are no module WebPs.
- The moduleAlt checklist (TODO(martina) alts) has not been produced yet.

## Threat Flags

None. No code changed. T-04-09 (single approved run, no retry) and T-04-17 (untouched state on failure) were met.

## Self-Check: PASSED

- FOUND: tmp/sync-run-04.log (local only, gitignored)
- `git status --short src/data/behance src/assets/projects`: empty
- No task commits claimed
