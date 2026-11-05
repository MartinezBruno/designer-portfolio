---
phase: 7
slug: page-transitions-smooth-scroll
status: in-review
nyquist_compliant: false
wave_0_complete: false
created: 2026-11-02
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.5 (happy-dom 21) + Playwright 1.64.1 (Chromium) + @axe-core/playwright 4.14 |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` (port 4400, `astro preview`) |
| **Quick run command** | `pnpm vitest run tests/unit/<file>.test.ts` (+ `pnpm check`) |
| **E2E single file** | `pnpm build && pnpm exec playwright test tests/e2e/<file>.spec.ts` |
| **Full suite command** | `pnpm verify` plus `pnpm measure:bundle` |
| **Estimated runtime** | ~5 s unit file · ~50 s build · full verify several minutes |

---

## Sampling Rate

- **After every task commit:** touched unit file(s) via `pnpm vitest run …`, plus `pnpm check`
- **After every plan wave:** `pnpm build && pnpm exec playwright test tests/e2e/{transitions,smooth-scroll,parallax,navigation-leaks,transitions-reduced}.spec.ts` plus `pnpm measure:bundle`
- **Before `/gsd:verify-work`:** `pnpm verify` green, taste skill `lint.mjs`/`inspect.mjs` + screenshots reviewed, manual Safari/Firefox UAT
- **Max feedback latency:** ~60 seconds (unit), ~120 seconds (single e2e spec incl. build)

---

## Per-Task Verification Map

Filled by the planner (2026-11-02) with plan task IDs; statuses set by 07-10 Task 2 (2026-11-04) from `pnpm verify` and `pnpm measure:bundle` on a fresh build in the 07-10 worktree. The anchors rows run `tests/e2e/anchors.spec.ts`; the stack row also runs `tests/e2e/stack-entrance.spec.ts`.

| Task ID | Req / SC | Behavior | Test Type | Automated Command | File Exists | Status |
|---------|----------|----------|-----------|-------------------|-------------|--------|
| 07-01-T1/T3 | MOTN-05 / SC1 | Soft nav, focus on new h1, title, `lang`/canonical/hreflang after EN/ES; Turnstile after Home -> Projects -> Home | e2e | `pnpm exec playwright test tests/e2e/transitions.spec.ts` | ✅ | ✅ green |
| 07-01-T2 | MOTN-05 / SC1 | `data-motion` survives swap (on and reduced); toggle aria-pressed synced; `off` opt-out | unit | `pnpm vitest run tests/unit/motion-navigation.test.ts` | ✅ | ✅ green |
| 07-01-T3 | MOTN-05 / D-14 | Focus target selection (hash -> h1 -> #main), no focus on first load, safe hash lookup | unit | `pnpm vitest run tests/unit/nav-focus.test.ts` | ✅ | ✅ green |
| 07-01-T1/T3 | SC4 / D-04 | `reduced` carry; `off` gives full page loads | e2e | `pnpm exec playwright test tests/e2e/transitions-reduced.spec.ts` | ✅ | ✅ green |
| 07-02-T1/T2 | MOTN-05 / SC1 | View Transition with `wipe` + still `site-header` under `on`; back reverses; EN/ES wipes | e2e | `pnpm exec playwright test tests/e2e/transitions.spec.ts -g "wipe"` | ✅ | ✅ green |
| 07-02-T1/T2 | SC4 / D-04 | Reduced: root crossfade 320 ms only, no wipe/project-title | e2e | `pnpm exec playwright test tests/e2e/transitions-reduced.spec.ts` | ✅ | ✅ green |
| 07-02-T2 | MOTN-05 | Tokens `--t-wipe`, `--wipe-release`, `--t-nav-fade`; `data-wipe` lifecycle | unit | `pnpm vitest run tests/unit/motion-tokens.test.ts tests/unit/motion-navigation.test.ts` | ✅ | ✅ green |
| 07-03-T1/T2 | MOTN-09 / SC3 | 10 navigations: per-URL listener and animation counts constant, cursor layer = 1, no split masks, no project-title at rest, parallax count == `[data-parallax]` count | e2e (CDP) | `pnpm exec playwright test tests/e2e/navigation-leaks.spec.ts` | ✅ | ✅ green |
| 07-03-T2 | MOTN-05 / D-05 | Cursor layer in persisted host, label resync on swap | unit | `pnpm vitest run tests/unit/motion-cursor.test.ts` | ✅ | ✅ green |
| 07-04-T1 | MOTN-05 / D-16, D-18 | Release gate 70%/finished/1200 ms cap, delayed mount with token guard, skipTransition on toggle | unit | `pnpm vitest run tests/unit/motion-navigation.test.ts tests/unit/lifecycle.test.ts` | ✅ | ✅ green |
| 07-04-T2 | MOTN-06 / D-15 | Reveals above restored viewport instant; hero scrolled past marked played | unit | `pnpm vitest run tests/unit/motion-reveal.test.ts tests/unit/motion-hero.test.ts` | ✅ | ✅ green |
| 07-04-T3 | MOTN-05 / D-15, D-16 | Hold until release, settle budget, back restores scrollY ±2 px, flash limit, live toggle | e2e | `pnpm exec playwright test tests/e2e/transitions.spec.ts` | ✅ | ✅ green |
| 07-05-T2/T3 | MOTN-06 / SC2, SC4 | Lenis only fine pointer + `on`; none on touch/reduced/off/forced colours; live toggle; keyboard; find proxy; Tab order unchanged | e2e | `pnpm exec playwright test tests/e2e/smooth-scroll.spec.ts` | ✅ | ✅ green |
| 07-05-T3 | MOTN-06 | Lenis loader memoise/retry; effect gating and destroy | unit | `pnpm vitest run tests/unit/motion-load-lenis.test.ts tests/unit/smooth-scroll.test.ts` | ✅ | ✅ green |
| 07-06-T1/T2 | MOTN-05 / D-02 | Card click names exactly one `project-title` old/new, none at rest; h1 does not replay line rise; no morph for nav/EN-ES/back/reduced | unit + e2e | `pnpm vitest run tests/unit/motion-navigation.test.ts && pnpm exec playwright test tests/e2e/transitions.spec.ts -g "morph"` | ✅ | ✅ green |
| 07-07-T1/T2 | MOTN-06 / SC2, D-08 | `#contact` glide + hash + focus after scrollend; reduced instant; skip link instant `#main`; cross-page hash focus; Ask-about-this no swap | e2e | `pnpm exec playwright test tests/e2e/anchors.spec.ts` | ✅ | ✅ green |
| 07-07-T2 | MOTN-06 | Anchor hook rules, `applyServicePreselect` allow-list | unit | `pnpm vitest run tests/unit/nav-focus.test.ts tests/unit/service-preselect.test.ts` | ✅ | ✅ green |
| 07-08-T1/T2 | MOTN-06 / SC4 | Card/teaser parallax translate changes under `on` (incl. touch), covers frame, no CLS, hover composes, `none` under reduced/off/live toggle, no overflow | e2e | `pnpm exec playwright test tests/e2e/parallax.spec.ts` | ✅ | ✅ green |
| 07-09-T1 | MOTN-06 / D-11a | `stackMotion` opt-out schema + validation + `entrance` side (alternation over eligible images) | unit | `pnpm vitest run tests/unit/projects-overrides.test.ts tests/unit/project-detail-site.test.ts` | ✅ | ✅ green |
| 07-09-T2 | MOTN-06 / D-11a | Detail stack side entrance: alternating sides, scrubbed, rests at 0, seamless adjacency, equal stack height across states, still under reduced/off/print, hold coexistence | unit + e2e | `pnpm vitest run tests/unit/project-modules.test.ts tests/unit/motion-tokens.test.ts && pnpm exec playwright test tests/e2e/stack-entrance.spec.ts` | ✅ | ✅ green |
| 07-10-T1 | Budget | Eager ≤ 22,000 B gzip; no GreenSock/lenisVersion in eager chunks | unit + script | `pnpm vitest run tests/unit/measure-bundle.test.ts && pnpm build && pnpm measure:bundle` | ✅ | ✅ green (2026-11-05, 07-17 re-run): max eager 17,640 B on `/` and `/es/` over all 20 built pages (4,360 B headroom); markers clean; `EAGER_CEILING_GZIP = 22_000` unchanged. Closed by 07-12 (every page) and 07-15 (lazy contact form) |
| 07-10-T1 | Regression | Phase 1–7 suites green under the router | full | `pnpm verify` | ✅ | ✅ green (final run: lint 0 errors, 1242 unit, 771 e2e passed / 110 opt-in skipped, secrets ok); ⚠️ one Phase 6 split-heading timing flake on the first full run, not reproduced in 10 isolated + 219 parallel-stress runs |
| 07-11-T1 | MOTN-05 / SC1 (CR-01, WR-01..03) | Ask-about-this replaces only the hash; navToken guards superseded focus; popstate/before-preparation cancel pending glides; focus fallback chain target -> `main h1` -> `#main` | unit | `pnpm vitest run tests/unit/nav-focus.test.ts tests/unit/service-preselect.test.ts` | ✅ | ✅ green (2026-11-05) |
| 07-11-T2 | MOTN-05 / SC1 (CR-01) | Second Ask click and skip link never soft-swap Home onto itself (vtCount 0), message kept, focus on main | e2e | `pnpm exec playwright test tests/e2e/anchors.spec.ts tests/e2e/contact-preselect.spec.ts` | ✅ | ✅ green (2026-11-05) |
| 07-12-T1 | Budget (WR-04) | `pagesFromHtmlFiles` maps every built `.html` to its route, stable order, Windows separators | unit | `pnpm vitest run tests/unit/measure-bundle.test.ts` | ✅ | ✅ green (2026-11-05) |
| 07-12-T2 | Budget (WR-04) | Markers + ceiling checked on every built page (20), problems name their route | script | `pnpm build && pnpm measure:bundle` | ✅ | ✅ green (2026-11-05): 20 pages, max 17,640 B |
| 07-13-T1 | MOTN-05 (Q2) | `--t-wipe` 480 ms / `durations.wipe` 0.48, release at 336 ms, flash limit holds | unit + e2e | `pnpm vitest run tests/unit/motion-tokens.test.ts tests/unit/motion-navigation.test.ts && pnpm exec playwright test tests/e2e/transitions.spec.ts` | ✅ | ✅ green (2026-11-05) |
| 07-13-T2 | MOTN-05 (morph findings, IN-01) | Plain-ink morph (no blend/invert), old/new hand-off never overlaps (11 samples), h1 unwrapped after settle | unit + e2e | `pnpm vitest run tests/unit/motion-navigation.test.ts && pnpm exec playwright test tests/e2e/transitions.spec.ts -g "morph"` | ✅ | ✅ green (2026-11-05) |
| 07-14-T1 | MOTN-06 (Q5) | Eligible CollectionModule cells get `drift`; static cells keep previous markup; tokens halved to 1.5% / 1.3% (user decision 2026-11-04, fe46f68) | unit | `pnpm vitest run tests/unit/project-detail-site.test.ts tests/unit/project-modules.test.ts tests/unit/projects-overrides.test.ts` | ✅ | ✅ green (2026-11-05) |
| 07-14-T2 | MOTN-06 / SC4 (Q5) | Grid drift at 1440/390, row unison, seamless grid, static under reduced/off/print | e2e | `pnpm exec playwright test tests/e2e/collection-motion.spec.ts tests/e2e/navigation-leaks.spec.ts` | ✅ | ✅ green (2026-11-05) |
| 07-15-T1 | Budget (Q1) | Contact controller loads on near-view, focusin/pointerdown, `#contact` or `?service=`; retry cap; focus handoff from the mailto block | unit | `pnpm vitest run tests/unit/contact-form-loader.test.ts` | ✅ | ✅ green (2026-11-05) |
| 07-15-T2 | Budget (Q1) / SC1 | Form loads on demand, no-JS block until mount, contact/a11y/anchors flows unchanged | e2e | `pnpm exec playwright test tests/e2e/contact-lazy.spec.ts tests/e2e/contact.spec.ts tests/e2e/a11y.spec.ts` | ✅ | ✅ green hermetic (2026-11-05); `@network` cases green in 07-17 full run 1, blocked in later runs by a local IPv6 outage to challenges.cloudflare.com (see 07-17-T1) |
| 07-16-T1 | MOTN-05 (touch latency) | `data-nav-pressed` on the source link at before-preparation, cleared at before-swap/timer/unbind, none under `off` or back/forward | unit + e2e | `pnpm vitest run tests/unit/motion-navigation.test.ts && pnpm exec playwright test tests/e2e/nav-feedback.spec.ts` | ✅ | ✅ green (2026-11-05) |
| 07-16-T2 | MOTN-05 (touch latency) | Tap -> feedback 1 ms; cold-gzip tap -> wipe median 218.5 ms (local gzip proxy, not the deployed edge) | measurement | see 07-16-SUMMARY (one-off Playwright measurement) | ✅ | ✅ recorded (2026-11-04) |
| 07-17-T1 | Regression (all gaps) | Phase 1–7 suites green on the combined 07-11..07-16 result | full | `pnpm verify && pnpm build && pnpm measure:bundle` | ✅ | ⚠️ (2026-11-05) astro check 0 errors, eslint + prettier clean, 1,292 unit, secrets ok (1,018 files), bundle ok. Run 1: 792 e2e passed / 117 skipped / 3 failed: 07-15 lazy-form regressions in motion-toggle and motion-pointer specs, fixed in 7d3ac29 (stable 5/5, 10/10). Hermetic run after the fix (`E2E_OFFLINE=1`): 736 passed / 117 skipped / 1 failed (`smooth-scroll` keyboard End, 6 px short; 5/5 in isolation, recorded flaky). `@network` (19 tests) blocked by a local IPv6 outage to challenges.cloudflare.com (curl -6 times out, -4 answers in 0.1 s); not a code change. Needs a clean `pnpm verify` once the network is back |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/unit/motion-navigation.test.ts` — before-swap carry, toggle aria sync, title naming/clearing, `off` opt-out
- [x] `tests/unit/nav-focus.test.ts` — h1/hash/main fallback selection, no focus on first load
- [x] `tests/unit/smooth-scroll.test.ts` — injected Lenis factory, fine + on only, destroyed on unmount and `motion:change`
- [x] `tests/e2e/helpers/navigation.ts` — `softNavigate(page, href)`, CDP listener counter
- [x] e2e specs: transitions, smooth-scroll, parallax, navigation-leaks, transitions-reduced
- [x] `settleMotion` helper extended to wait for VT attributes to clear
- [ ] Wave 0 spike (folded into plans): Chromium wipe/morph captures in 07-02 and 07-06 (done, recaptured in 07-10); manual Safari/Firefox check pending: the user runs it after the gap fixes land

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real browser find bar (Cmd+F) not fighting Lenis | MOTN-06 | Native find UI not scriptable | Desktop Chrome/Safari/Firefox, Cmd+F a below-fold word, confirm it stays in view |
| Safari/Firefox transition + fallback quality | MOTN-05 | Playwright runs Chromium only here | Navigate Home → Projects → detail → back in Safari and Firefox, confirm no flash or broken state |
| Visual quality of wipe/morph | MOTN-05 | Taste judgment | taste skill `inspect.mjs` screenshots reviewed |
| Safari 26: wipe, morph, back wipe, parallax incl. grid drift, Lenis glide, find bar | MOTN-05, MOTN-06 | Playwright runs Chromium only | 07-17 Task 2 step 1. Result: ⬜ pending user UAT |
| Firefox 159: same as Safari, plus Q7 no-morph fallback (no flash, no doubled title) | MOTN-05 | Playwright runs Chromium only | 07-17 Task 2 step 2. Result: ⬜ pending user UAT |
| VoiceOver (Q6): new page title/h1 announced once per navigation | MOTN-05 / D-14 | Screen reader output not scriptable | 07-17 Task 2 step 3. Result: ⬜ pending user UAT |
| Keyboard Ask-about-this twice + skip link: no reload, message kept, focus on main | MOTN-05 / CR-01 | Real keyboard check of the 07-11 fix | 07-17 Task 2 step 4. Result: ⬜ pending user UAT |
| Real Figma embed wheel on /projects/portfolio-web/ | MOTN-06 | Third-party iframe | 07-17 Task 2 step 5. Result: ⬜ pending user UAT |
| Pressed cue on a real phone before the wipe | MOTN-05 | Real touch timing | 07-17 Task 2 step 6. Result: ⬜ pending user UAT |

---

## 07-10 Checkpoint Decisions (2026-11-04)

- Q1 eager ceiling: keep 22,000 B gzip. Cut eager code instead: every chunk not needed for first paint or interaction loads on demand (gap).
- Touch latency (Pixel 7 Fast 4G, cold cache median 538.5 ms, default cache 296.5 ms): follow-up gap (production compression check and/or immediate touch feedback).
- Q2: shorten `--t-wipe` to 480 ms (gap). Q3: keep the vertical wipe. Q4: reverse morph out of v1.
- Q5: CollectionModule grids get motion (gap).
- Morph soft findings: remove the mid-morph doubled title and drop the difference blend so the title stays plain ink (gap).
- Q6 (VoiceOver double announcement) and Q7 (per-engine no-morph fallback): pending manual UAT after the gaps.

**Manual UAT (Safari 26, Firefox 159, VoiceOver, real Figma embed wheel, find bar): pending, after the gap fixes.**

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter (not set: the 07-10-T1 budget row is red until the user confirms or changes the eager ceiling)

**Approval:** pending
