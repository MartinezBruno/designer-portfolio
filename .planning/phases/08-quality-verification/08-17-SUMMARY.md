---
phase: 08-quality-verification
plan: 17
subsystem: performance, quality
tags: [gap-closure, qual-01, lighthouse, lcp, measurement]
requires:
  - 08-10..08-16 (all gap-closure src changes merged)
provides:
  - "Re-measure (08-17) in 08-LIGHTHOUSE.md on src e96db32, with the user's D-06 sign-off"
affects:
  - 08-18 (final full gate before the phase is marked complete)
tech-stack:
  added: []
  patterns:
    - "Re-measure Lighthouse with the locked D-01..D-06 protocol after every src change; record the src commit hash"
key-files:
  created:
    - .planning/phases/08-quality-verification/08-17-SUMMARY.md
  modified:
    - .planning/phases/08-quality-verification/08-LIGHTHOUSE.md
decisions:
  - "QUAL-01 is met with one accepted miss: detail LCP 2,633 ms (+133 ms) on the uncompressed local preview, accepted by the user ('accept (Recommended)') with its measured cause (second-image priority boost ~75 ms + uncompressed critical path ~58 ms; Brotli approximation 2,260 ms)"
  - "Heaviest EN detail page stays /projects/website-reciclick/ (498.4 KB total-byte-weight, 5.1 KB ahead of cabreras-motos-posts)"
metrics:
  duration: ~35 min
  completed: 2026-11-10
requirements-completed: [QUAL-01]
---

# Phase 8 Plan 17: QUAL-01 Lighthouse re-measure Summary

I re-measured both pages with the locked mobile Lighthouse protocol (pinned 13.6.0, median of 5) on the final src commit `e96db32`.

- **Home:** LCP 1,207 ms, score 100. That is 1,982 ms faster than 08-08, and it passes.
- **Heaviest detail page:** LCP 2,633 ms, 1,004 ms faster than 08-08. It is still 133 ms over budget on the uncompressed local preview. The user accepted that miss with its measured cause (D-06).
- **CLS, TBT and both JS budgets:** pass. The bundle check printed "bundle check ok".

**QUAL-01 status: met, with one documented accepted miss** (detail LCP).

## Tasks

| Task | Name | Commit | Files |
|---|---|---|---|
| 1 | Full D-01..D-06 re-measure on the final src commit and report update | b0095e9 | 08-LIGHTHOUSE.md |
| 2 | User reviews the re-measured numbers (D-06) | — (checkpoint; reply: "accept (Recommended)") | none |
| 3 | Record the sign-off | (this plan's docs commit) | 08-LIGHTHOUSE.md, 08-17-SUMMARY.md |

## Results (median of 5 runs)

| Page | LCP | CLS | TBT | FCP | SI | Score | vs 08-08 LCP |
|---|---|---|---|---|---|---|---|
| Home `/` | 1,207 (1,207–1,208) pass | 0 | 0 | 1,207 | 1,207 | 100 | −1,982 |
| `/projects/website-reciclick/` | 2,633 (2,558–2,634) miss, accepted | 0 | 0 | 1,058 | 1,058 | 97 | −1,004 |

JS: homepage 60,319 B gzip (58.9 KiB). Max eager is 17,958 B against the 22,000 B ceiling. Both pass.

Cause of the detail miss, as measured:
- About 75 ms comes from Chrome boosting the in-viewport, lazy second image to High priority (4 of 5 runs). Blocking that image reproduces the 2,558 ms lower level.
- About 58 ms comes from the uncompressed critical path on `astro preview`.
- The Brotli q5 approximation of edge compression measures 2,260 ms median.

## Deviations from Plan

### Additions (informational, no src change)

**1. Diagnostic runs to find the cause of the miss**
- **Found during:** Task 1. The detail runs came out at two levels, 2,558 and 2,633–2,634 ms.
- **What I did:**
  - 3 extra Lighthouse runs with `--blocked-url-patterns='*1321800269*'`. They pinned the 75 ms gap to the second image's priority.
  - 3 runs per page through the existing throwaway Brotli proxy (port 4486), for the compressed reference.
- **Effect:** these runs are informational only. The D-01 numbers come only from `select-*`, `home-1..5` and `detail-1..5`.

Otherwise I ran the plan exactly as written. The lock was acquired and released; I found no stale lock. src is unchanged (`git diff --quiet -- src`).

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: .planning/phases/08-quality-verification/08-LIGHTHOUSE.md ("Re-measure (08-17)", "Re-measure misses (08-17)", "Re-measure sign-off (08-17)")
- FOUND: commit b0095e9
- FOUND: tmp/lighthouse/home-5.json, tmp/lighthouse/detail-5.json (gitignored)
