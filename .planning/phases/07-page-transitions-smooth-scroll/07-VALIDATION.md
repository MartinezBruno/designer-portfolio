---
phase: 7
slug: page-transitions-smooth-scroll
status: draft
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

Filled by the planner (2026-11-02) with plan task IDs; statuses are updated by 07-10 Task 2.

| Task ID | Req / SC | Behavior | Test Type | Automated Command | File Exists | Status |
|---------|----------|----------|-----------|-------------------|-------------|--------|
| 07-01-T1/T3 | MOTN-05 / SC1 | Soft nav, focus on new h1, title, `lang`/canonical/hreflang after EN/ES; Turnstile after Home -> Projects -> Home | e2e | `pnpm exec playwright test tests/e2e/transitions.spec.ts` | ❌ W0 (07-01-T1) | ⬜ pending |
| 07-01-T2 | MOTN-05 / SC1 | `data-motion` survives swap (on and reduced); toggle aria-pressed synced; `off` opt-out | unit | `pnpm vitest run tests/unit/motion-navigation.test.ts` | ❌ W0 (07-01-T2) | ⬜ pending |
| 07-01-T3 | MOTN-05 / D-14 | Focus target selection (hash -> h1 -> #main), no focus on first load, safe hash lookup | unit | `pnpm vitest run tests/unit/nav-focus.test.ts` | ❌ W0 (07-01-T3) | ⬜ pending |
| 07-01-T1/T3 | SC4 / D-04 | `reduced` carry; `off` gives full page loads | e2e | `pnpm exec playwright test tests/e2e/transitions-reduced.spec.ts` | ❌ W0 (07-01-T1) | ⬜ pending |
| 07-02-T1/T2 | MOTN-05 / SC1 | View Transition with `wipe` + still `site-header` under `on`; back reverses; EN/ES wipes | e2e | `pnpm exec playwright test tests/e2e/transitions.spec.ts -g "wipe"` | ❌ (07-02-T1) | ⬜ pending |
| 07-02-T1/T2 | SC4 / D-04 | Reduced: root crossfade 320 ms only, no wipe/project-title | e2e | `pnpm exec playwright test tests/e2e/transitions-reduced.spec.ts` | ❌ (07-02-T1) | ⬜ pending |
| 07-02-T2 | MOTN-05 | Tokens `--t-wipe`, `--wipe-release`, `--t-nav-fade`; `data-wipe` lifecycle | unit | `pnpm vitest run tests/unit/motion-tokens.test.ts tests/unit/motion-navigation.test.ts` | ✅ (extend) | ⬜ pending |
| 07-03-T1/T2 | MOTN-09 / SC3 | 10 navigations: per-URL listener and animation counts constant, cursor layer = 1, no split masks, no project-title at rest, parallax count == `[data-parallax]` count | e2e (CDP) | `pnpm exec playwright test tests/e2e/navigation-leaks.spec.ts` | ❌ W0 (07-03-T1) | ⬜ pending |
| 07-03-T2 | MOTN-05 / D-05 | Cursor layer in persisted host, label resync on swap | unit | `pnpm vitest run tests/unit/motion-cursor.test.ts` | ✅ (extend) | ⬜ pending |
| 07-04-T1 | MOTN-05 / D-16, D-18 | Release gate 70%/finished/1200 ms cap, delayed mount with token guard, skipTransition on toggle | unit | `pnpm vitest run tests/unit/motion-navigation.test.ts tests/unit/lifecycle.test.ts` | ✅ (extend) | ⬜ pending |
| 07-04-T2 | MOTN-06 / D-15 | Reveals above restored viewport instant; hero scrolled past marked played | unit | `pnpm vitest run tests/unit/motion-reveal.test.ts tests/unit/motion-hero.test.ts` | ✅ (extend) | ⬜ pending |
| 07-04-T3 | MOTN-05 / D-15, D-16 | Hold until release, settle budget, back restores scrollY ±2 px, flash limit, live toggle | e2e | `pnpm exec playwright test tests/e2e/transitions.spec.ts` | ✅ (extend) | ⬜ pending |
| 07-05-T2/T3 | MOTN-06 / SC2, SC4 | Lenis only fine pointer + `on`; none on touch/reduced/off/forced colours; live toggle; keyboard; find proxy; Tab order unchanged | e2e | `pnpm exec playwright test tests/e2e/smooth-scroll.spec.ts` | ❌ (07-05-T2) | ⬜ pending |
| 07-05-T3 | MOTN-06 | Lenis loader memoise/retry; effect gating and destroy | unit | `pnpm vitest run tests/unit/motion-load-lenis.test.ts tests/unit/smooth-scroll.test.ts` | ❌ (07-05-T3) | ⬜ pending |
| 07-06-T1/T2 | MOTN-05 / D-02 | Card click names exactly one `project-title` old/new, none at rest; h1 does not replay line rise; no morph for nav/EN-ES/back/reduced | unit + e2e | `pnpm vitest run tests/unit/motion-navigation.test.ts && pnpm exec playwright test tests/e2e/transitions.spec.ts -g "morph"` | ✅ (extend) | ⬜ pending |
| 07-07-T1/T2 | MOTN-06 / SC2, D-08 | `#contact` glide + hash + focus after scrollend; reduced instant; skip link instant `#main`; cross-page hash focus; Ask-about-this no swap | e2e | `pnpm exec playwright test tests/e2e/anchors.spec.ts` | ❌ (07-07-T1) | ⬜ pending |
| 07-07-T2 | MOTN-06 | Anchor hook rules, `applyServicePreselect` allow-list | unit | `pnpm vitest run tests/unit/nav-focus.test.ts tests/unit/service-preselect.test.ts` | ✅ (extend) | ⬜ pending |
| 07-08-T1/T2 | MOTN-06 / SC4 | Card/teaser parallax translate changes under `on` (incl. touch), covers frame, no CLS, hover composes, `none` under reduced/off/live toggle, no overflow | e2e | `pnpm exec playwright test tests/e2e/parallax.spec.ts` | ❌ (07-08-T1) | ⬜ pending |
| 07-09-T1 | MOTN-06 / D-11 | `parallax` opt-out schema + validation + view flag | unit | `pnpm vitest run tests/unit/projects-overrides.test.ts tests/unit/project-detail-site.test.ts` | ✅ (extend) | ⬜ pending |
| 07-09-T2 | MOTN-06 / D-11 | Detail stack drift, seamless adjacency, equal stack height across states | unit + e2e | `pnpm vitest run tests/unit/project-modules.test.ts && pnpm exec playwright test tests/e2e/parallax.spec.ts` | ✅ (extend) | ⬜ pending |
| 07-10-T1 | Budget | Eager ≤ 22,000 B gzip; no GreenSock/lenisVersion in eager chunks | unit + script | `pnpm vitest run tests/unit/measure-bundle.test.ts && pnpm build && pnpm measure:bundle` | ✅ (extend) | ⬜ pending |
| 07-10-T1 | Regression | Phase 1–7 suites green under the router | full | `pnpm verify` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/motion-navigation.test.ts` — before-swap carry, toggle aria sync, title naming/clearing, `off` opt-out
- [ ] `tests/unit/nav-focus.test.ts` — h1/hash/main fallback selection, no focus on first load
- [ ] `tests/unit/smooth-scroll.test.ts` — injected Lenis factory, fine + on only, destroyed on unmount and `motion:change`
- [ ] `tests/e2e/helpers/navigation.ts` — `softNavigate(page, href)`, CDP listener counter
- [ ] e2e specs: transitions, smooth-scroll, parallax, navigation-leaks, transitions-reduced
- [ ] `settleMotion` helper extended to wait for VT attributes to clear
- [ ] Wave 0 spike (folded into plans): Chromium wipe/morph captures in 07-02 and 07-06; manual Safari/Firefox check in 07-10 Task 3

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real browser find bar (Cmd+F) not fighting Lenis | MOTN-06 | Native find UI not scriptable | Desktop Chrome/Safari/Firefox, Cmd+F a below-fold word, confirm it stays in view |
| Safari/Firefox transition + fallback quality | MOTN-05 | Playwright runs Chromium only here | Navigate Home → Projects → detail → back in Safari and Firefox, confirm no flash or broken state |
| Visual quality of wipe/morph | MOTN-05 | Taste judgment | taste skill `inspect.mjs` screenshots reviewed |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
