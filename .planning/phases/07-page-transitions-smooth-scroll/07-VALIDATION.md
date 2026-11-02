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

To be filled by the planner/executor once plan task IDs exist. Requirement → test map from RESEARCH.md:

| Req / SC | Behavior | Test Type | Automated Command | File Exists | Status |
|----------|----------|-----------|-------------------|-------------|--------|
| MOTN-05 / SC1 | `data-motion` survives swap (on and reduced) | unit + e2e | `pnpm vitest run tests/unit/motion-navigation.test.ts` | ❌ W0 | ⬜ pending |
| MOTN-05 / SC1 | A View Transition runs on navigation under `on` | e2e | `playwright test tests/e2e/transitions.spec.ts` | ❌ W0 | ⬜ pending |
| MOTN-05 / SC1 | Focus on new h1, title, `lang`/canonical/hreflang correct after EN/ES switch | e2e | `transitions.spec.ts` | ❌ W0 | ⬜ pending |
| MOTN-05 | Card click names exactly one `project-title` old/new; h1 doesn't replay line rise | unit + e2e | `motion-navigation.test.ts` | ❌ W0 | ⬜ pending |
| MOTN-06 / SC2 | Lenis active only for fine pointer + `on` | e2e | `playwright test tests/e2e/smooth-scroll.spec.ts` | ❌ W0 | ⬜ pending |
| MOTN-06 / SC2 | PageDown/Space/End scroll; Tab order unchanged | e2e | `smooth-scroll.spec.ts` | ❌ W0 | ⬜ pending |
| MOTN-06 / SC2 | Anchor links set hash + focus target; skip link instant | e2e | `smooth-scroll.spec.ts` | ❌ W0 | ⬜ pending |
| MOTN-06 / SC2 | Find-in-page proxy (`window.find`) not snapped back | e2e + manual | `smooth-scroll.spec.ts` | ❌ W0 | ⬜ pending |
| MOTN-06 | Parallax translate changes under `on`; `none` under reduced/off/live toggle | e2e | `playwright test tests/e2e/parallax.spec.ts` | ❌ W0 | ⬜ pending |
| MOTN-06 / D-15 | Back restores scrollY (±2px), reveals in view revealed | e2e | `transitions.spec.ts` | ❌ W0 | ⬜ pending |
| MOTN-09 / SC3 | 10 navigations: listener counts, cursor layer = 1, no split masks, animation counts stable | e2e | `playwright test tests/e2e/navigation-leaks.spec.ts` | ❌ W0 | ⬜ pending |
| SC4 | Reduced/toggle: root crossfade only, no Lenis, parallax none, live toggle stops Lenis | e2e | `playwright test tests/e2e/transitions-reduced.spec.ts` | ❌ W0 | ⬜ pending |
| SC4 / D-04 | `off` gives full page loads | e2e | `transitions-reduced.spec.ts` | ❌ W0 | ⬜ pending |
| Budget | eager ≤ ceiling; no GSAP/Lenis in eager chunks | script | `pnpm build && pnpm measure:bundle` | ✅ (extend) | ⬜ pending |
| Regression | Phase 1–6 suites green under the router | e2e | `pnpm test:e2e` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/motion-navigation.test.ts` — before-swap carry, toggle aria sync, title naming/clearing, `off` opt-out
- [ ] `tests/unit/nav-focus.test.ts` — h1/hash/main fallback selection, no focus on first load
- [ ] `tests/unit/smooth-scroll.test.ts` — injected Lenis factory, fine + on only, destroyed on unmount and `motion:change`
- [ ] `tests/e2e/helpers/navigation.ts` — `softNavigate(page, href)`, CDP listener counter
- [ ] e2e specs: transitions, smooth-scroll, parallax, navigation-leaks, transitions-reduced
- [ ] `settleMotion` helper extended to wait for VT attributes to clear
- [ ] Wave 0 spike (scratch, deleted after): wipe + morph CSS in real layout, Chromium screenshots, manual Safari/Firefox check

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
