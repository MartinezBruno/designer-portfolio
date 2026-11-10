---
phase: 09-portfolio-features-hero-full-width-on-mobile-photography-ser
plan: 08
subsystem: quality-gate
status: failed
tags: [phase-gate, lighthouse, lcp, verify, bundle, taste]
requires:
  - phase: 09-01
    provides: full-width mobile hero portrait
  - phase: 09-02
    provides: photography service
  - phase: 09-07
    provides: filter e2e and taste gate
provides:
  - 09-LIGHTHOUSE.md with the Phase 9 Home/detail LCP re-measure on src bda5a84 (D-04 miss)
  - signed-off 09-VALIDATION.md (automated rows green)
affects: [phase-9-gap-closure]
tech-stack:
  added: []
  patterns: []
key-files:
  created:
    - .planning/phases/09-portfolio-features-hero-full-width-on-mobile-photography-ser/09-LIGHTHOUSE.md
  modified:
    - .planning/phases/09-portfolio-features-hero-full-width-on-mobile-photography-ser/09-VALIDATION.md
key-decisions:
  - "D-04 not met: the Home mobile LCP median is 2,933 ms on src bda5a84 (budget 2,500). The LCP element moved from the lead text to the 768w hero portrait, and Lantern charges it with the 474 KB in flight"
  - "No Hero.astro fallback was applied: the measured cause is the competing bytes (lazy Latest-work AVIFs 106 KB, gsap+SplitText 76 KB), not the 32 KB portrait, so no Hero-only change within the D-01/D-02 limits can recover 433 ms"
  - "Task 3 (final taste gate) was not run because the plan stopped at the Task 2 failure. Gap-closure src changes would invalidate it anyway"
metrics:
  duration: 11min
  completed: 2026-11-10
---

# Phase 9 Plan 08: Phase gate Summary

**Gate FAILED at Task 2.** Verify, `@network`, the 22,000 B bundle ceiling and Spanish review freshness all pass. The D-04 Home mobile LCP re-measure (08-17 protocol, src `bda5a84`) has a median of **2,933 ms against a budget of 2,500 ms**. On phones the LCP element is now the full-width hero portrait instead of the lead text.

## Status by task

| Task | Result | Commit |
|---|---|---|
| 1. Full verify, bundle budget, Spanish review freshness | Passed. One plan-local target was missed (`/` eager, below) | `2c71bc8` |
| 2. Home LCP re-measure (D-04) | **Failed**: Home median 2,933 ms > 2,500 ms. Recorded in 09-LIGHTHOUSE.md | `2ad821b` |
| 3. Final taste gate | **Not run** (plan stopped at the Task 2 failure). Only `lint.mjs` ran, below | — |

## Task 1: automated gates

All runs were on HEAD `ae1c0f5` / src `bda5a84`, under `tmp/build-e2e.lock`.

- `E2E_OFFLINE=1 pnpm verify`: exit 0. `astro check` 275 files, 0 errors and 0 warnings. ESLint and Prettier clean. Vitest 76 files / **1,407 passed**. Playwright **833 passed**, 117 skipped (conditional skips), 0 failed, 0 flaky. keyboard-journeys test 9 did not flake. `check:secrets`: ok (1,318 dist files).
- `pnpm exec playwright test --grep @network`: exit 0, **60 passed**.
- `pnpm measure:bundle`: exit 0 (`bundle check ok`, eager within 22,000 B on all 19 pages).

| Route | Eager JS (gzip -9) | Plan target | Result |
|---|---|---|---|
| `/` | 18,024 B | ≤ 17,958 B | **target missed by 66 B**. Same value 09-06 measured. It was already 18,007 B at the wave-1 base (09-06 SUMMARY "`/` unchanged criterion"). Ceiling 22,000 B holds |
| `/es/` | 18,024 B | ≤ 22,000 B | pass |
| `/projects/` | 17,975 B | ≤ 17,500 B | target missed by 475 B. Under the 18,003 B the orchestrator already accepted (09-06), and under the ceiling |
| `/es/projects/` | 17,975 B | ≤ 22,000 B | pass |
| Max (all pages) | 18,024 B on `/` | ≤ 22,000 B (ROADMAP criterion 4) | pass |

  The `/ ≤ 17,958 B` miss is not explicitly accepted yet, so it needs the user's acceptance together with the D-04 decision. ROADMAP Phase 9 criterion 4 names only the 22,000 B ceiling.
- `pnpm review:spanish` followed by `git diff --exit-code -- .planning/phases/08-quality-verification/08-SPANISH-REVIEW.md`: exit 0 (fresh). It lists the 5 `ui:projects.filter.*` rows and the Photography title plus its 4 items, all "draft, for Martina's review".
- 09-VALIDATION.md: every requirement row is green, the Wave 0 and sign-off boxes are ticked, and the frontmatter has `nyquist_compliant: true`, `wave_0_complete: true` and `status: approved`. Note: `grep -c "nyquist_compliant: true"` prints 2, not the 1 the plan expects, because the pre-existing sign-off checkbox line also contains that literal text. The manual "Taste gate" row was not ticked (Task 3 not run).

## Task 2: Home LCP re-measure (D-04)

Full evidence is in `09-LIGHTHOUSE.md`. Summary:

- Protocol: `pnpm dlx lighthouse@13.6.0`, mobile simulated defaults, a fresh profile per run, preview on 4485, a quiet machine (pgrep showed only this preview), 7 selection runs, then 5 + 5. Strictly sequential. Chrome 157, benchmarkIndex about 3,380 (08-17: about 4,680).
- Heaviest EN detail: `/projects/website-reciclick/` (500.8 KB), the same as before.
- **Home: LCP median 2,933 ms** (2,858–3,621). CLS 0.000. TBT median 0. LCP element: the hero portrait, the **768w AVIF** (32.2 KB), as 09-01 expected for Lighthouse.
- **Detail: LCP median 2,633 ms**, identical to the accepted 08-17 value. No regression. CLS 0.
- Cause: the observed load is fast (observed LCP 66 ms). Lantern's image-LCP charges the 473.9 KB requested by then over the 1.6 Mbps link. That includes the three `loading="lazy"` Latest-work AVIFs (105.8 KB, started at 33 ms because of Chrome's lazy distance threshold) and gsap + SplitText (75.9 KB). In 08-17 the LCP was text at FCP (1,207 ms).
- The fallback was not applied: no Hero.astro-only change within the D-01/D-02 limits can recover about 433 ms (about 89 KB). The whole portrait is 32 KB.
- Informational only: through the Brotli proxy, Home measured 2,109 / 2,259 / 2,259 ms.
- Gap-closure candidates are listed in 09-LIGHTHOUSE.md "Gap closure input". The first is deferring the Latest-work image fetches past the hero paint on mobile. The last is re-deciding D-04 with the user, as the 08-17 detail miss was.

## Task 3: taste gate (partial)

- Phase base commit: `06adfbd` (docs(09): start phase 9 execution, the commit before 09-01's first commit `5429580`).
- `lint.mjs` on all 16 lintable phase-changed src files (`git diff --name-only 06adfbd..HEAD -- src`; `services.json` is not scanned): **0 FAIL**, 1 WARN (`em-dash`, 14 em dashes). All of them are in `src/i18n/ui.en.ts` and `ui.es.ts` (7 each) and existed before Phase 9. Phase 9 added no em dash (`git diff 06adfbd..HEAD -- src | grep '^+.*—'` is empty).
- `inspect.mjs` at 1440/768/390 on the 5 URLs, screenshot review and critique: **not run**. The plan stopped at the Task 2 failure. Gap-closure src changes would make that evidence stale. Re-run Task 3 after the LCP gap is closed.

## Deviations from Plan

None in the work itself. The plan's failure path for Task 2 was followed (record the miss and stop for gap closure). Task 3 was not executed for that reason.

## Lock usage

- `tmp/build-e2e.lock` was free at start and was acquired once (16:54 UTC) for verify, `@network`, measure:bundle, the build, the preview on 4485 and every Lighthouse run. The preview and the Brotli proxy were stopped (`lsof -i :4485 -i :4486` empty). The lock was released after the measurement. No stale lock was removed.

## Notes for the phase end

- `/security-review` runs once for the phase, scoped to the phase base commit `06adfbd` (not origin/main), per the user's memory. The user reviews the phase commit list once at phase end.
- Phase 9 cannot be marked complete: D-04 (ROADMAP criterion 1) fails, and the final taste gate is pending.

## Self-Check: PASSED

- FOUND: .planning/phases/09-portfolio-features-hero-full-width-on-mobile-photography-ser/09-LIGHTHOUSE.md
- FOUND: .planning/phases/09-portfolio-features-hero-full-width-on-mobile-photography-ser/09-VALIDATION.md (signed off)
- FOUND: commit 2c71bc8
- FOUND: commit 2ad821b
