---
phase: 08
slug: quality-verification
status: gaps_closed
nyquist_compliant: false
gate_run: 2026-11-10
gate_commit: 8119292
latest_src_commit: e96db32
security_review_base: cf15eaf
---

# Phase 8: Validation Record

`nyquist_compliant: false`: seven plan tasks are human checkpoints with no automated command: 08-06 T3, 08-07 T2, 08-08 T1 and T3, plus the gap-closure checkpoints 08-10 T1 (WR-01 decision), 08-13 T3 (portrait approval) and 08-17 T2 (D-06 sign-off). Every other row names an automated command.

**Overall status: gaps closed (08-18).** The full 08-09 gate (steps 1-7) passed on the final src `e96db32` (see "Gate re-run (08-18)"), @network was actually run with 0 failures, and the 08-17 Lighthouse sign-off accepts the only remaining miss. `status: gaps_closed` follows the rule from 08-18: every gate step passes, @network ran with 0 failed, and every remaining Lighthouse miss is "accept". REQUIREMENTS.md QUAL rows are not ticked here; the orchestrator does that after verification.

Open items (the six original gap items and where each one stands):

1. **QUAL-01 LCP: closed, with one accepted miss.** 08-14 diagnosed both misses. 08-15 (L1, translate-only hero lead) and 08-16 (L2b deferred GSAP, L4 768w detail images) fixed them. The 08-17 re-measure on `e96db32` gives Home 1,207 ms (pass, was 3,189 ms) and heaviest detail `/projects/website-reciclick/` 2,633 ms (+133 ms over budget, was 3,637 ms). The user accepted the detail miss at the 08-17 D-06 checkpoint, verbatim "accept (Recommended)". Measured cause: about 75 ms from Chrome boosting the lazy second image's priority and about 58 ms from the uncompressed local preview. The Brotli approximation is 2,260 ms. CLS 0, TBT 0, homepage JS 58.9 KiB gz and max eager 17,958 B all pass.
2. **A11Y-01 (QUAL-02): closed by 08-11.** Shutter reveals are observed through their unclipped `article[data-card]`, so a card cover opens after an instant jump or a deep link. 8 new e2e cases (390 and 1440, `/` and `/es/`) failed RED and pass GREEN. They passed again in gate step 3.
3. **@network flake WR-03 (QUAL-02): closed by 08-10 T3.** The contact journey now waits for the Turnstile token before typing and asserts every typed value. 08-10: @network 60/60 and a 20/20 stress run. 08-18 gate step 4: **60 passed, 0 failed, 0 flaky**.
4. **WR-01 (marquee first activation): closed by 08-10 T1/T2.** The user chose "option-a (Recommended)": `aria-pressed` reflects only the explicit choice, and the first activation always pauses. **D-10 consequence:** D-10 is amended. The transient hover/focus pause is visual only and is no longer announced as pressed. With an explicit choice, `aria-pressed` and the visible state agree.
5. **WR-02 (404 path reflection): closed by 08-12.** BaseLayout pins the pathname to `/404/` or `/es/404/` for `kind: 'notFound'`. The not-found e2e guard "never reflects the requested path" passed in gate step 3. [Inference] It is a regression guard, not a RED test (08-12 did not run it against the pre-fix build).
6. **Hero portrait (sketch 001 arch): closed by 08-13.** The arch on the accent ground uses a defringed 1200x1600 cutout. The user replied "approved" at the Task 3 checkpoint, accepting the residual semi-transparent curl tips. The arch geometry, reduced-motion and frame-0 tests passed in gate step 3.

Still tracked, outside the six gap items:

- The taste inspector's Home `empty-screens` FAIL (screens 2 and 3, EN and ES) predates the gap closure. 08-13 found it identical on the pre-change build, and 08-15 confirmed it. It is not attributed to any gap plan and should be tracked separately.
- Keyboard journey 9 ("empty submit focuses the first invalid field", hermetic) failed 3 of 20 in an 08-10 repeat run and once in an 08-10 full run. It passed in the 08-18 gate (0 failed, 0 flaky) and in the two full runs before it. [Unverified] It is still unconfirmed whether the flake predates 08-10. It is not fixed. Suspected cause: Enter arrives before the lazy contact-form controller mounts.
- T-01, T-02 and T-04 taste findings stay deferred (08-07).

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

## Per-plan rows (08-10..08-17 gap closure, from their SUMMARYs)

| Plan | Task | Requirement / decision | Command | Result |
|------|------|------------------------|---------|--------|
| 08-10 | 1: Choose the WR-01 resolution | QUAL-02, WR-01, D-10 | human checkpoint (decision) | "option-a (Recommended)": explicit-only `aria-pressed`. D-10 amended. No commit (no files) |
| 08-10 | 2: Implement option-a, update the marquee tests | QUAL-02, WR-01 | `pnpm test -- marquee`; `pnpm lint`; `E2E_OFFLINE=1 playwright test home-story motion keyboard-journeys motion-states a11y` | pass: 1312 unit; 88 passed, 32 skipped on the second e2e run (the first run's single failure was keyboard journey 9, out of scope) (2e7e1a3) |
| 08-10 | 3: Stabilise the @network contact journey | QUAL-02, WR-03 | `pnpm exec playwright test -g "@network"`; `keyboard-journeys -g "@network" --repeat-each=10` | pass: 60/60, stress 20/20 (ccc97d3) |
| 08-11 | 1: Probe and failing A11Y-01 e2e tests (RED) | QUAL-02, A11Y-01 | throwaway IntersectionObserver probe; `E2E_OFFLINE=1 playwright test motion-reveal` | RED as expected: 8 new tests failed on the unfixed build (62e645c) |
| 08-11 | 2: Observe shutters through their card (GREEN) | QUAL-02, A11Y-01 | `pnpm exec vitest run tests/unit/motion-reveal.test.ts`; `pnpm test`; `pnpm lint`; `E2E_OFFLINE=1` on 10 specs | pass: 45/45 unit, 1316 total, 374 e2e passed (3b3d31f) |
| 08-12 | 1: Reflection guard, pin the 404 pathname | QUAL-02, WR-02 | `pnpm lint`; `E2E_OFFLINE=1 playwright test not-found seo i18n` | pass: 67 passed (cbdf2c3) |
| 08-12 | 2: Prove EN 404 unchanged | QUAL-02, WR-02 | `diff` of `dist/client/404.html` before and after; curl `/es/wr02-probe-cc/` on `astro preview` | pass: no diff; 404, probe string 0 times. No commit (verification only) |
| 08-13 | 1: Defringe the cutout for the accent ground | QUAL-01 (hero), sketch 001 | sharp edge-band halo metric (share lighter than the ground by > 0.15) | pass: 0.13% to 0.06% (a2b1861 superseded, bee3db3 final) |
| 08-13 | 2: Arch on bg-accent, tests, taste gate | QUAL-01 (hero) | `pnpm lint`; `pnpm test`; `pnpm build`; `E2E_OFFLINE=1` on 10 specs; taste `lint.mjs` and `inspect.mjs` | pass: 1312 unit, 171/171 e2e twice; taste lint 0 FAIL; inspect codes identical to the pre-change build (bc1ca10) |
| 08-13 | 3: User approves the arch portrait | sketch 001 | human checkpoint | "approved" |
| 08-14 | 1: Baseline and attribution on the post-wave-1 build | QUAL-01 | `pnpm dlx lighthouse@13.6.0` (3-run baselines, CDP initiator traces) | done: Home 3,473 ms, detail 3,690 ms; causes attributed (f81f2b0) |
| 08-14 | 2: Measure candidate levers, choose the set | QUAL-01 | `pnpm dlx lighthouse@13.6.0` per lever (3-run medians); `git diff --quiet -- src` | done: C2 = L1 + L2b + L4 (Home 1,209, detail 2,559); src reverted (44deff9) |
| 08-15 | 1: Slide-only hero lead (L1), frame-0 tests | QUAL-01 | `pnpm lint`; `pnpm build`; `E2E_OFFLINE=1` on motion-hero, home, transitions, motion-states, smooth-scroll, anchors, contact-lazy, a11y, motion-reveal | pass: 166 passed, 32 skipped; 3 motion-reveal load timeouts under parallel load passed 16/16 on re-run (082c1a5) |
| 08-15 | 2: Taste gate and informational Home Lighthouse | QUAL-01 | taste `lint.mjs`/`inspect.mjs`; `pnpm dlx lighthouse@13.6.0` x3 | pass: taste 0 new FAIL; Home 1,208 ms median. No commit (gitignored evidence) |
| 08-16 | 1: afterLoadIdle and deferred GSAP (L2b), TDD | QUAL-01 | `pnpm test` (tests/unit/motion-idle.test.ts) | pass: RED f175036, GREEN 24a112e |
| 08-16 | 2: 768w detail image candidate (L4) | QUAL-01 | `pnpm test`; `pnpm lint`; `pnpm measure:bundle`; `E2E_OFFLINE=1` on 14 specs; `pnpm dlx lighthouse@13.6.0` x3 | pass: 1323 unit; "bundle check ok", max eager 17,958 B; 413 passed, 32 skipped; detail 2,558 ms median (32f4566) |
| 08-17 | 1: Full D-01..D-06 re-measure on `e96db32` | QUAL-01 | `pnpm dlx lighthouse@13.6.0` (mobile, 7 selection runs, 5x Home, 5x detail) | Home 1,207 ms pass; detail 2,633 ms miss (+133 ms); CLS, TBT, JS pass (b0095e9) |
| 08-17 | 2: User reviews the re-measured numbers | D-06 | human checkpoint | "accept (Recommended)" for the detail miss |
| 08-17 | 3: Record the sign-off | QUAL-01 | `grep` for "Re-measure sign-off (08-17)" in 08-LIGHTHOUSE.md | done (8119292) |

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

## Staleness check (08-09, superseded by 08-18)

- 08-LIGHTHOUSE.md Context records latest src commit `3424e61`.
- `git log -1 --format=%h -- src` at gate time: `3424e61`. They **match**, so the Lighthouse evidence is current for today's src.
- The gap fixes for Home LCP, detail LCP and A11Y-01 will change src/. When they land, 08-LIGHTHOUSE.md **must be re-measured** with the same D-01..D-06 protocol on the fix commit, and this whole gate (steps 1-7) **must be re-run**, before Phase 8 is marked complete.

## Staleness check (08-18)

- 08-LIGHTHOUSE.md "Re-measure (08-17)" Context records the measured commit `e96db32`.
- `git log -1 --format=%h -- src` at 08-18 gate time: `e96db32` (HEAD `8119292`, docs only after `e96db32`). They **match**, so the Lighthouse evidence is current for the final src. The gate ran.
- `git diff --quiet -- src` was true before and after the gate. 08-18 changed no product code.

## Gate re-run (08-18)

Combined gap-closure result (08-10..08-17) on main, HEAD `8119292`, src `e96db32`, 2026-11-10, run sequentially on the main working tree. The `tmp/build-e2e.lock` lock was held from the step 3 build through step 6 and then released. No stale lock was found. Machine load average before the run: 2.5.

| Plan | Step | Requirement / decision | Command | Result |
|------|------|------------------------|---------|--------|
| 08-18 | 1 | QUAL-01..03 | `pnpm lint` | pass, exit 0. astro check 265 files: 0 errors, 0 warnings, 3 hints (deprecation hints only, all in the gitignored throwaway `tmp/lighthouse/css-split.mjs`). ESLint clean. Prettier: "All matched files use Prettier code style!" |
| 08-18 | 2 | QUAL-01..03 | `pnpm test` | pass: 72 files, 1323 tests |
| 08-18 | 3 | QUAL-02 | `E2E_OFFLINE=1 pnpm test:e2e` (full build plus the full hermetic suite: a11y-sweep, a11y, keyboard-journeys, motion-reveal with the A11Y-01 cases, home arch-portrait tests, motion-hero frame-0 lead tests, the not-found WR-02 guard, every scroll/contact/marquee spec) | pass: 919 run, **802 passed, 117 skipped (conditional), 0 failed, 0 flaky**, 2.3 min. Keyboard journey 9 ("empty submit focuses the first invalid field", the intermittent case 08-10 reported) passed in this run. The failure rule did not apply |
| 08-18 | 4 | QUAL-02 (WR-03) | `pnpm exec playwright test -g "@network"` (network reachable: `challenges.cloudflare.com/turnstile/v0/api.js` answered HTTP 302) | pass: **60 passed, 0 failed, 0 flaky** (1.4 min). The @network keyboard contact journey (keyboard-journeys 10) passed in EN and ES |
| 08-18 | 5 | T-08-17 | `pnpm check:secrets` | pass: "secrets check ok (1311 dist files scanned)" |
| 08-18 | 6 | QUAL-01 | `pnpm measure:bundle` | pass: "bundle check ok (no GreenSock or lenisVersion in eager chunks, eager gzip within 22000 B on every built page)". **Max eager gzip 17,958 B on `/`** (and `/es/`), ceiling 22,000 B, 19 pages. Detail pages 15,884 B (portfolio-web 16,558 B) |
| 08-18 | 7 | QUAL-03 | `pnpm review:spanish && git diff --exit-code .planning/phases/08-quality-verification/08-SPANISH-REVIEW.md` | pass: regenerated with no diff (fresh) |

## Security review

Run `/security-review` once at phase end, scoped to the Phase 8 diff from its base commit **cf15eaf**, not origin/main (memory rule: scope the review to the phase). Brief the review with:

```
git diff cf15eaf..HEAD -- . ':!.planning/' ':!tests/' ':!*.md' ':!pnpm-lock.yaml'
```

This covers the whole Phase 8 product diff, including the gap closure (08-10..08-16 src changes). This record only holds the instruction; the orchestrator runs the review.
