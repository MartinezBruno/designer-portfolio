---
phase: 09-portfolio-features-hero-full-width-on-mobile-photography-ser
plan: 09
subsystem: performance
tags: [lighthouse, lcp, gap-closure, diagnosis]
status: failed
requires: ["09-08"]
provides: ["09-LIGHTHOUSE.md Gap-closure diagnosis (09-09): measured D-18 bound, early-GSAP cause, stop-gate result"]
affects: ["09-10 (blocked until the user decides)"]
tech-stack:
  added: []
  patterns: ["Lighthouse --blocked-url-patterns bounds before any src lever"]
key-files:
  created: []
  modified:
    - .planning/phases/09-portfolio-features-hero-full-width-on-mobile-photography-ser/09-LIGHTHOUSE.md
decisions:
  - "09-09 stop gate: blocking the Latest-work covers and gsap+SplitText leaves Home LCP at 2,933 ms (> 2,500); the D-18 levers are bounded at about -76 ms; needs user decision"
  - "The 27-38 ms 'gsap' request in 09-08 was the eager load-gsap chunk (1.0 KB); gsap core always starts after window load (afterLoadIdle works)"
metrics:
  duration: 10 min
  completed: 2026-11-10
  tasks: "1/2 (Task 2 skipped by the plan's stop gate)"
  files: 1
---

# Phase 9 Plan 09: Home LCP gap-closure diagnosis Summary

## Needs user decision

The stop gate was hit. Even with the 3 Latest-work covers **and** gsap + SplitText blocked (b3), Home still has a median simulated LCP of **2,933 ms**. That is the same as the baseline and over the 2,500 ms budget. The D-18 directions (defer the covers, gate GSAP) cannot reach the budget, even if they work perfectly.

| Set (Home, 3 runs each, src `bda5a84`) | Runs (ms) | Median | vs base |
|---|---|---|---|
| base | 2,862 / 2,934 / 2,934 | 2,934 | — |
| b1 (covers blocked) | 2,932 / 2,933 / 2,932 | 2,932 | −2 |
| b2 (gsap + SplitText blocked) | 2,858 / 2,858 / 2,933 | 2,858 | −76 |
| b3 (both blocked) | 2,933 / 2,934 / 2,933 | **2,933** | −1 |

CLS 0 and TBT 0 in all 12 runs. The LCP element is the hero portrait (768w AVIF) in every run.

Options for the user (all [Proposed] and unmeasured; full text in 09-LIGHTHOUSE.md "Chosen levers (09-09)"):

1. Accept the Home miss, as the detail-page miss was accepted in 08-17. Under Brotli, Home measured 2,109–2,259 ms in 09-08.
2. Allow a direction outside D-18 and bound it first: the preloaded fonts (88.2 KB, High), or a Hero change on phones (conflicts with D-01/D-02).
3. Re-define the D-04 measurement, for example measure with compression.

## What was done

- **Task 1 (commit `1c5034f`):** built `bda5a84`, previewed it on 4485 and ran 12 sequential Lighthouse 13.6.0 runs (base, b1, b2, b3), with benchmarkIndex 4,630–4,723.5 and Chrome 157. Added "## Gap-closure diagnosis (09-09)" to 09-LIGHTHOUSE.md. It covers context, the verbatim blocked patterns, a per-run table, medians, the early-GSAP finding, the early-cover finding, the gate decision and "### Chosen levers (09-09)" (needs user decision).
- **Task 2:** not run. The plan's stop gate says to skip it when the b3 median is over 2,500 ms. There is no "Lever experiments (09-09)" table, and no lever was chosen for 09-10.

## Key findings

- **Early GSAP:** the "gsap at 27–38 ms" in 09-08 was the eager `load-gsap.C4xI3dII.js` chunk (1.0 KB), which `BaseLayout`'s script imports statically. `gsap.DLHyXJrb.js` starts after `observedLoad` in all 3 base runs here and in all 5 09-08 runs. `afterLoadIdle` works. GSAP can still land just before observed LCP (base-2: 63.7 vs 64 ms), because window `load` fires 11–22 ms before the portrait paints. Blocking GSAP entirely is worth at most −76 ms.
- **Early covers:** they start at 33–91 ms with Low priority, before observed LCP in every run (and before `observedLoad` in 2 of 3). Blocking them gives −2 ms.
- [Inference] The simulated LCP is set by the High/VeryHigh critical set, 292.3 KB requested at 13–20 ms: Document 65.0, CSS 57.5 (render-blocking, 304 ms estimate), fonts 88.2, portrait 32.2, and about 47 KB of eager scripts. The 09-08 "bytes in flight" diagnosis is not confirmed.

## Deviations from Plan

1. **[Rule 1 - Bug] Narrower GSAP block pattern.** The plan says `*gsap*`. That pattern also matches the eager `load-gsap.C4xI3dII.js`, which `BaseLayout`'s script imports statically, so blocking it would break the whole effects module and measure something else. I used `*/_astro/gsap.*` and `*/_astro/SplitText.*` instead (documented in 09-LIGHTHOUSE.md).
2. **[Rule 1 - Bug] Discarded one batch of invalid bound runs.** The first b1/b2/b3 batch ran from zsh with an unquoted `$VAR` that does not word-split, so all patterns arrived as one string and nothing was blocked (`configSettings.blockedUrlPatterns` showed a single entry, and the covers transferred 65 KB). I deleted those 9 JSONs and re-ran with each pattern quoted separately. I verified `blockedUrlPatterns` per run and confirmed the blocked requests have transferSize 0. The 09-09 section uses only the re-run files.
3. **Preview stop:** `pnpm astro preview stop` reported "No preview server is running" (the server was started with `--ignore-lock`). I stopped the preview process (pid 19109) with `kill` and confirmed `lsof -ti :4485` was empty before releasing the lock.

## Lock and working tree

- `tmp/build-e2e.lock` had no stale lock at start. It was acquired at 21:52 UTC and released at 21:57 UTC after the gate stopped the plan. Nothing was listening on 4485 after release.
- Leftover `p9g-*` files from the interrupted attempt were moved to `tmp/lighthouse/p9g-stale/` and not used.
- `git status --porcelain -- src astro.config.ts` was empty throughout. No src patch was applied.

## Self-Check: PASSED

- FOUND: 09-LIGHTHOUSE.md contains "Gap-closure diagnosis (09-09)" and "Chosen levers (09-09)"
- FOUND: commit 1c5034f
- src and astro.config.ts are clean, port 4485 is free, and the lock is released
