---
phase: 08-quality-verification
plan: 14
subsystem: performance, lighthouse
tags: [gap-closure, qual-01, lcp, diagnosis, lighthouse]
requires:
  - 08-10, 08-11, 08-12, 08-13 (wave 1 merged at 620a673; src measured at f38b9c9)
provides:
  - "08-LIGHTHOUSE.md section 'Gap-closure diagnosis (08-14)': 3-run baseline, answers (a)-(e), lever table, Chosen levers"
  - measured lever set for 08-15 (L1) and 08-16 (L2 in L2b form, L4)
affects:
  - 08-15 (Home hero lead entrance, global.css)
  - 08-16 (load-gsap.ts deferral, detail-view.ts MODULE_WIDTHS)
  - 08-17 (residual detail miss on uncompressed preview goes to the user)
tech-stack:
  added: []
  patterns:
    - "Lighthouse --blocked-url-patterns as a no-src-change upper bound for what non-critical requests cost"
key-files:
  created:
    - .planning/phases/08-quality-verification/08-14-SUMMARY.md
  modified:
    - .planning/phases/08-quality-verification/08-LIGHTHOUSE.md
decisions:
  - "Chosen levers = best combination C2 (L1 + L2b + L4): Home 1,209 ms, detail 2,559 ms (3-run medians, uncompressed preview)"
  - "L1 -> 08-15; L2 (L2b form: load, one painted frame, then idle) and L4 (768w candidate) -> 08-16"
  - "L2 as written (load + idle) is a race on the detail page (one run at 3,400 ms); L2b holds in all runs"
  - "L5 inlineStylesheets 'always' rejected (+159 ms Home, +228 ms detail); L3 not qualified (lenis never requested on mobile)"
  - "No set reaches 2,400 ms on detail; floor ~2,480 ms even with all non-critical requests blocked; residual goes to 08-17 (D-06). Brotli proxy: detail 2,259 ms"
metrics:
  duration: ~45 min
  completed: 2026-11-10
requirements-completed: []
---

# Phase 8 Plan 14: LCP gap-closure diagnosis Summary

Measured diagnosis of both QUAL-01 LCP misses on the post-wave-1 build. The Home miss is caused entirely by the hero lead's opacity entrance: Chrome only reports the lead as LCP at about 1,010 ms, after `data-hero-played` removes the animation. A translate-only lead (L1) brings Home from 3,473 to 1,209 ms. The detail miss comes from requests that start before the image LCP. The best measured set (L1 + L2b + L4) brings detail from 3,690 to 2,559 ms. That is still above the 2,400 ms target on the uncompressed local preview, so the residual goes to the 08-17 checkpoint with its measured cause.

## Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Baseline and attribution on the post-wave-1 build | f81f2b0 | 08-LIGHTHOUSE.md |
| 2 | Measure each candidate lever, choose the lever set, revert the experiments | 44deff9 | 08-LIGHTHOUSE.md |

## Key results

- Baseline (src `f38b9c9`, Chrome 157): Home 3,473 ms (LCP `p[data-hero-lead]`, render delay 1,009 ms), detail 3,690 ms (observed LCP 67 ms). On both pages every request starts before observed LCP.
- (a) The Home LCP is still the lead. The arch portrait is an earlier but smaller candidate (21,844 vs 36,822 px²).
- (b) The lead's opacity first rises above 0 at about 223–241 ms and reaches 1 at 791 ms. Its LCP entry lands at 1,008–1,012 ms, right after `data-hero-played` (989–992 ms).
- (c) gsap and SplitText are requested by `ensureGsap` in `createReveal` (reveal.ts line 355, mount call at line 382), registered in effects.ts. Confirmed with CDP async initiator stacks. Lenis is not requested on mobile.
- (d) The CSS is 56,117 B raw / 10,747 B gz, of which 35.7 KB raw is Tailwind utilities and 8.6 KB is global.css unlayered rules. It contains 0 B of @font-face (those are inlined in the HTML) and 344 B of lenis rules.
- (e) All 10 non-LCP detail images (264,118 B) start before LCP. Four are 960w for 721 px displayed (71.9 KB waste).
- Levers (3-run medians): L1 Home −2,264. L2 detail −138 (race). L2b detail −1,130. L4 detail −284. L5 +159/+228 (harm). C2 = L1 + L2b + L4: Home 1,209, detail 2,559.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] L2 as specified was a race on the detail page**
- **Found during:** Task 2 (combination C1)
- **Issue:** Window `load` fires at 33–57 ms, before the image LCP paint (45–72 ms), so "load + idle" still started GSAP before observed LCP in 1 of 3 runs (3,400 vs 2,635 ms).
- **Fix:** Measured an L2b variant that waits one painted frame after `load` before idle (no src change committed). It is the form chosen for 08-16.
- **Files modified:** none committed (experiment only)

**2. [Rule 2 - Missing critical info] Extra diagnostic measurements**
- **Found during:** Task 2
- **Issue:** No lever set reached 2,400 ms on detail. 08-17 needs the measured cause of the residual.
- **Fix:** Added `--blocked-url-patterns` upper bounds (floor ~2,482 ms with fonts, GSAP and lazy images blocked), a C3 run (L1 + L2b without L4) to justify keeping L4, and a Brotli-proxy run of C2 (Home 760, detail 2,259), the same informational method as 08-08.

## Notes

- Lock: `tmp/build-e2e.lock` was taken for both measurement spans and released. No stale lock was found.
- Machine: a user-started `astro dev` (00:21 UTC, idle) overlapped the last runs. Their benchmarkIndex was in range and their results reproduced earlier numbers. It is recorded in 08-LIGHTHOUSE.md and was left running.
- Tree: `git diff --quiet -- src astro.config.ts` and `-- package.json pnpm-lock.yaml` are both true. Throwaway helpers live only in the gitignored `tmp/lighthouse/`.
- QUAL-01 is not marked complete here. This is a diagnosis plan, and the fixes land in 08-15 and 08-16.

## Self-Check: PASSED

- FOUND: .planning/phases/08-quality-verification/08-LIGHTHOUSE.md ("Gap-closure diagnosis (08-14)", "Chosen levers")
- FOUND: tmp/lighthouse/diag-home-3.json, tmp/lighthouse/diag-detail-3.json
- FOUND: f81f2b0, 44deff9
