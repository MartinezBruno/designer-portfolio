---
phase: 08-quality-verification
plan: 08
subsystem: performance
tags: [lighthouse, qual-01, lcp, performance-budget, d-01, d-06]
requires:
  - 08-01, 08-02, 08-03, 08-05, 08-06, 08-07 (base e0a98b6)
provides:
  - mobile Lighthouse medians (5 runs) for / and the heaviest EN detail page, against the D-06 budget
  - measured heaviest-page ranking of all 7 EN detail pages
  - two user-signed LCP misses queued for /gsd:plan-phase 8 --gaps
affects:
  - .planning/phases/08-quality-verification/08-LIGHTHOUSE.md
tech-stack:
  added: []
  patterns:
    - "One-off pinned pnpm dlx lighthouse@13.6.0, raw JSON in gitignored tmp/lighthouse/, only the Markdown report committed (D-02)"
key-files:
  created:
    - .planning/phases/08-quality-verification/08-LIGHTHOUSE.md
    - .planning/phases/08-quality-verification/08-08-SUMMARY.md
  modified: []
decisions:
  - "D-06: Home LCP miss (3,189 ms; hero lead fades in from opacity 0) goes to a gap fix: the lead paints at full opacity in its first frame (taste gate applies), then re-measure"
  - "D-06: Detail LCP miss (3,637 ms; all 7 detail pages 3.4-4.0 s) goes to a gap fix for headroom: defer GSAP/SplitText to after load/idle on detail pages and/or fetch fewer below-fold images at load, then re-measure"
  - "Re-measure rule: after the gap fixes land, re-run 08-LIGHTHOUSE.md on the fix commit with the D-01..D-06 protocol, then the 08-09 gate, before Phase 8 is complete"
metrics:
  duration: about 25 min of measurement and reporting (plus checkpoint waits)
  completed: 2026-11-09
  tasks: 3
  files: 2
---

# Phase 8 Plan 08: Mobile Lighthouse budget measurement Summary

I measured mobile Lighthouse 13.6.0 (simulated throttling, motion `on`) on `astro preview` of the production build at base `e0a98b6` (latest src commit `3424e61`). Home and the heaviest EN detail page (`/projects/website-reciclick/`, chosen by measured total-byte-weight) each got 5 runs. CLS, TBT, homepage JS and the eager ceiling pass. **LCP misses on both pages.** The user signed off on fixing both misses through gap-closure plans. QUAL-01 evidence is **pending re-measurement** after those fixes.

## Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Package legitimacy check for lighthouse@13.6.0 (checkpoint) | none (checkpoint) | none |
| 2 | Measure (7 selection runs, 5x Home, 5x heaviest detail) and write 08-LIGHTHOUSE.md | 79203eb | 08-LIGHTHOUSE.md |
| 3 | User reviews the numbers and signs off (checkpoint) | this docs commit | 08-LIGHTHOUSE.md (Sign-off section), 08-08-SUMMARY.md |

## Package approval (Task 1, T-08-SC)

**lighthouse@13.6.0 approved.** The user's reply, relayed by the coordinator: "Approve". It covers `pnpm dlx lighthouse@13.6.0` as a transient one-off download, with no package.json or lockfile change. Registry metadata was checked before the first run: repo github.com/GoogleChrome/lighthouse, maintainers paulirish, hoten and lusayaa, dist-tag latest 13.6.0, engines node >=22.19.

## Results (median / min / max of 5 runs; details in 08-LIGHTHOUSE.md)

| Metric | Home `/` | Detail `/projects/website-reciclick/` | Budget | Result |
|---|---|---|---|---|
| LCP (ms) | 3,189 / 3,186 / 3,476 | 3,637 / 3,621 / 3,693 | < 2,500 | **miss / miss** |
| CLS | 0.000 / 0.000 / 0.000 | 0.000 / 0.000 / 0.000 | < 0.1 | pass / pass |
| TBT (ms) | 0 / 0 / 0 | 0 / 0 / 0 | < 200 | pass / pass |
| FCP (ms) | 1,208 / 1,208 / 1,209 | 1,059 / 1,057 / 1,061 | info | — |
| SI (ms) | 1,288 / 1,283 / 1,413 | 1,059 / 1,057 / 1,061 | info | — |
| Score | 93 / 91 / 93 | 90 / 90 / 90 | info | — |
| Homepage JS gz | 60,022 B (eager 17,661 + lazy 42,361) | — | about 100 KB | pass |
| Eager per page | max 17,661 B | 15,578 B | ≤ 22,000 B | pass (`bundle check ok`) |

Heaviest-page ranking by total-byte-weight: website-reciclick 567.6 KB, purov 554.7, cabreras-motos-posts 532.9, website-instablogs 507.3, sistema-visual 487.6, portfolio-web 474.6, mart 466.4. All 7 detail pages had LCP between 3.4 and 4.0 s.

Measured causes:
- **Local preview serves no compression** (no `content-encoding` header). Lighthouse therefore counts raw bytes.
- **Home:** the LCP element is the hero lead text. It waits 1,012 ms to render because of the `hero-settle` fade from opacity 0.
- **Detail:** the LCP image itself paints at 74 ms (observed). [Inference] The simulated LCP includes the lazy GSAP/SplitText chunks and nine below-fold lazy images that start loading first.
- **Supplementary Brotli-proxy runs** (informational): Home 2.13–2.35 s and detail 2.26–2.43 s, both under budget, the detail page only just.

## Sign-off

- **Home LCP 3,189 ms:** "Fix (Recommended)". Fix → `/gsd:plan-phase 8 --gaps`. The hero lead paints at full opacity in its first frame (for example a slide-only settle). The taste-skill gate applies. Re-measure after.
- **Detail LCP 3,637 ms (all 7 detail pages 3.4–4.0 s):** "Fix (Recommended)". Fix → `/gsd:plan-phase 8 --gaps`. Defer GSAP/SplitText until after load or idle on detail pages and/or reduce below-fold image fetches at load. Re-measure after.
- **All other budget rows** pass.

**QUAL-01 status:** measured, not yet met. After the gap fixes land in src/, re-run 08-LIGHTHOUSE.md with the D-01..D-06 protocol on the fix commit, then the 08-09 gate, before Phase 8 is marked complete.

## Deviations from Plan

1. **[Orchestrator] Preview port 4485 instead of 4450.** The orchestrator assigned a dedicated port. The commands are otherwise identical.
2. **[Rule 3 - Blocking] Run wrapper script.** The worktree sandbox rejected a shell `for` loop around `pnpm dlx`, so each run went through the gitignored `tmp/lighthouse/run.sh <name> <path>`, which runs the plan's exact command.
3. **[Rule 2 - Evidence] Supplementary compressed runs.** I added 3 extra runs per page through a throwaway Brotli proxy (`tmp/lighthouse/gzip-proxy.mjs`, port 4486, gitignored) to separate the effect of the uncompressed local preview from real page cost. They are labeled informational and are not the D-01 measurement.
4. **Quiet-machine check:** one idle `astro preview --port 4321`, started from the main checkout (0% CPU, not this executor), was running. I left it alone and recorded it in the report. Nothing else was running.

Also: the worktree started with merge-base `ff5bf7c` and was reset to the required base `e0a98b6` before any work.

## Known Stubs

None. This is a docs-only plan.

## Self-Check: PASSED

- FOUND: .planning/phases/08-quality-verification/08-LIGHTHOUSE.md
- FOUND: .planning/phases/08-quality-verification/08-08-SUMMARY.md
- FOUND: commit 79203eb
- FOUND: 10 measurement JSONs (home-1..5, detail-1..5) and 7 selection JSONs in tmp/lighthouse/, gitignored
- `git diff --quiet -- package.json` succeeds. src/ is unchanged
