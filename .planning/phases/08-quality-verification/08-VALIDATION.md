---
phase: 08
slug: quality-verification
status: gaps_open
nyquist_compliant: false
gate_run: 2026-11-09
gate_commit: e257bb5
latest_src_commit: 3424e61
security_review_base: cf15eaf
---

# Phase 8: Validation Record

`nyquist_compliant: false`: four plan tasks are human checkpoints with no automated command (08-06 T3, 08-07 T2, 08-08 T1, 08-08 T3). Every other row names an automated command.

**Overall status: NOT ready to complete.** Open items:

1. **QUAL-01 not met.** Lighthouse mobile LCP median misses the 2,500 ms budget: Home 3,189 ms, detail 3,637 ms (08-LIGHTHOUSE.md). The user chose "Fix" for both, so they go to a `/gsd:plan-phase 8 --gaps` plan.
2. **QUAL-02 has one open confirmed defect.** A11Y-01: a work-card cover mask stays closed after an instant jump (08-TASTE-REPORT.md). The user chose "Confirm, fix later", so it goes to a gaps plan.
3. **New @network flake (gate step 4).** `keyboard-journeys.spec.ts:275` "10. fill, send and 'Send another' by keyboard on / @network" (EN) failed once in the @network run: `#contact-message` was not focused after Tab from the email field. In isolation it passed 3 of 3 (EN and ES each time). It is **not** on the 07-17 accepted flake list, so under the plan rule it is recorded as a **gap**, not as flaky.

## Per-plan rows (08-01..08-08, from their SUMMARYs)

| Plan | Task | Requirement / decision | Command | Result |
|------|------|------------------------|---------|--------|
| 08-01 | 1: Marquee controller owns pause state | QUAL-02, D-10..D-12 | `pnpm test` (tests/unit/roles-marquee.test.ts) | pass (RED c50aa72, GREEN 70f3a34, stale test fix f63676a) |
| 08-01 | 2: E2E pause/aria-pressed parity, regression run | QUAL-02 | `E2E_OFFLINE=1 pnpm test:e2e` | pass: 746 passed, 117 skipped, 0 failed (e89e198) |
| 08-02 | 1: Skip link keeps padding on focus | QUAL-02, D-18 | `E2E_OFFLINE=1 playwright test anchors` (tests/e2e/anchors.spec.ts) | pass (RED c4be4f2, GREEN 59e2ee1) |
| 08-02 | 2: /es/404/ returns HTTP 404 on Workers preview | QUAL-02, D-17 | curl against `astro preview` (port 4491) plus `playwright test not-found` | pass: /es/404/ and /es/404 return 404, lang es (RED d9bbaf7, GREEN c8f6ceb) |
| 08-03 | 1: Remove the icon prop and orphaned component | QUAL-02, D-15 | `pnpm check`, `pnpm build` | pass (9353886) |
| 08-03 | 2: Remove icon from schema, data, lib and tests | QUAL-02, D-15 | `pnpm test`; `E2E_OFFLINE=1 playwright test home-story contact-preselect a11y` | pass: 1293 unit tests, 103 e2e (RED c7f77bd, GREEN 0c60662) |
| 08-04 | 1: Every-route three-state axe sweep with build guard | QUAL-02, D-07, D-08 | `E2E_OFFLINE=1 playwright test a11y-sweep` | pass (7e462bc) |
| 08-04 | 2: Re-check e2e assertions trimmed by redesign merge | D-16 | `git diff --stat eced448 ff5bf7c -- tests/` plus `E2E_OFFLINE=1 playwright test` on 9 specs | pass: 212 passed, 0 failed |
| 08-05 | 1: Spanish review generator and coverage test | QUAL-03, D-13, D-14 | `pnpm test`; `pnpm review:spanish` | pass (RED 694b61a, GREEN 5386cf7) |
| 08-05 | 2: Point copy TODO(martina) at the review file | QUAL-03 | `pnpm test` (todo pointer test) | pass (RED 8a9ee73, GREEN 3424e61) |
| 08-06 | 1: Keyboard nav, toggle, marquee, detail and embed journeys | QUAL-02, D-09 | `E2E_OFFLINE=1 playwright test keyboard-journeys a11y` | pass: 46/46 (f60185b) |
| 08-06 | 2: Service preselect and contact form keyboard journeys | QUAL-02, D-09 | `playwright test keyboard-journeys -g "@network"` | pass at the time: 2/2 (8837f77). See gate step 4: one flaky failure in the 08-09 combined run |
| 08-06 | 3: Manual Tab pass in EN and ES | QUAL-02, D-09 | manual (no automated command) | done, per 08-06-SUMMARY |
| 08-07 | 1: Taste gate on every page type, classified report | QUAL-01, QUAL-02, D-20 | taste-skill `lint.mjs` plus `inspect.mjs` | ran (ec52932). Found A11Y-01 and T-01..T-07 |
| 08-07 | 2: User reviews the taste findings | D-20 | manual checkpoint | A11Y-01 **confirmed, open** (gaps plan). T-01, T-02, T-04 deferred and logged |
| 08-08 | 1: Package legitimacy check for lighthouse@13.6.0 | T-08-SC | manual checkpoint | approved |
| 08-08 | 2: Lighthouse measurement (D-01..D-06) | QUAL-01 | `pnpm dlx lighthouse@13.6.0` (mobile, 7 selection runs, 5x Home, 5x detail) | CLS, TBT and JS pass. **LCP miss**: Home 3,189 ms, detail 3,637 ms (79203eb) |
| 08-08 | 3: User sign-off on misses | D-06 | manual checkpoint | "Fix" for both LCP misses, so they go to gaps plans. QUAL-01 **not met** |

## Gate rows (08-09, combined Phase 8 result on main at e257bb5, 2026-11-09)

| Plan | Step | Requirement / decision | Command | Result |
|------|------|------------------------|---------|--------|
| 08-09 | 1 | QUAL-01..03 | `pnpm lint` | pass: astro check 257 files, 0 errors, 0 warnings, 0 hints. ESLint clean. Prettier clean |
| 08-09 | 2 | QUAL-01..03 | `pnpm test` | pass: 71 files, 1312 tests |
| 08-09 | 3 | QUAL-02 | `E2E_OFFLINE=1 pnpm test:e2e` (full build plus full hermetic suite, including a11y-sweep, keyboard-journeys and every scroll/contact/marquee spec) | pass: 908 run, 791 passed, 117 skipped (conditional), 0 failed, 0 flaky, 2.3 min |
| 08-09 | 4 | QUAL-02 | `pnpm exec playwright test -g "@network"` (network reachable: challenges.cloudflare.com answered) | **fail, 1 of 60**: 59 passed, 1 failed (keyboard-journeys.spec.ts:275 EN, `#contact-message` not focused). Re-run in isolation 3 times: 2/2 passed each time (3 of 3). Not on the 07-17 accepted list, so it is a **gap** |
| 08-09 | 5 | T-08-17 | `pnpm check:secrets` | pass: "secrets check ok (1017 dist files scanned)" |
| 08-09 | 6 | QUAL-01 | `pnpm measure:bundle` | pass: "bundle check ok". Max eager gzip 17,661 B on / (ceiling 22,000 B, 19 pages) |
| 08-09 | 7 | QUAL-03 | `pnpm review:spanish && git diff --exit-code .planning/phases/08-quality-verification/08-SPANISH-REVIEW.md` | pass: regenerated with no diff (fresh) |

## Staleness check (re-measure rule)

- 08-LIGHTHOUSE.md Context records latest src commit `3424e61`.
- `git log -1 --format=%h -- src` at gate time: `3424e61`. They **match**, so the Lighthouse evidence is current for today's src.
- The gap fixes for Home LCP, detail LCP and A11Y-01 will change src/. When they land, 08-LIGHTHOUSE.md **must be re-measured** with the same D-01..D-06 protocol on the fix commit, and this whole gate (steps 1-7) **must be re-run**, before Phase 8 is marked complete.

## Security review

Run `/security-review` once at phase end, scoped to the Phase 8 diff from its base commit **cf15eaf** (`git diff cf15eaf..HEAD`), not origin/main (memory rule: scope the review to the phase). This plan only records the instruction. The orchestrator runs the review.
