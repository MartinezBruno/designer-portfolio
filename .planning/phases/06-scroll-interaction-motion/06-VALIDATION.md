---
phase: 6
slug: scroll-interaction-motion
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-10-29
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `06-RESEARCH.md` § Validation Architecture (rows V-01..V-19).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.5 (happy-dom 21); Playwright 1.64.1 + @axe-core/playwright 4.14.0 |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` (port 4400, preview of `dist`) |
| **Quick run command** | `pnpm vitest run tests/unit/motion-*.test.ts && pnpm check` |
| **Full suite command** | `pnpm verify` |
| **Estimated runtime** | ~180 seconds (full); ~15 seconds (quick) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run tests/unit/motion-*.test.ts && pnpm check`
- **After every plan wave:** Run `pnpm build && pnpm playwright test tests/e2e/motion*.spec.ts tests/e2e/a11y.spec.ts`
- **Before `/gsd:verify-work`:** `pnpm verify` green, `node scripts/measure-bundle.ts` recorded, taste gates run
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

Task IDs use `{plan}-T{n}` (for example, 06-01-T1 = plan 06-01, Task 1). The "Implemented by" column lists the tasks that build the behaviour. The "Verified by" column lists the tasks whose `<verify>` runs the automated command.

| Row | Requirement | Behavior | Test Type | Automated Command | Implemented by | Verified by | Wave | File Exists | Status |
|-----|-------------|----------|-----------|-------------------|----------------|-------------|------|-------------|--------|
| V-01 | MOTN-01 | Gate truth table (off/reduced/on, storage throws, override) | unit | `pnpm vitest run tests/unit/motion-gate.test.ts` | 06-01-T1 | 06-01-T1 | 1 | ✅ update | ⬜ pending |
| V-02 | MOTN-01 | JS disabled → all `[data-reveal]` visible | e2e | `pnpm playwright test tests/e2e/motion.spec.ts -g "without JavaScript"` | 06-01-T1 (gate), 06-03-T1 (reveal CSS) | 06-01-T3 (gate/toggle part), 06-03-T3 | 1, 2 | ✅ extend | ⬜ pending |
| V-03 | MOTN-01 | JS/gsap chunk fails → content visible by 1.6 s | e2e | `pnpm playwright test tests/e2e/motion-reveal.spec.ts -g "fails"` | 06-03-T1 (CSS failsafe), 06-08-T1 (gsap-only path) | 06-03-T3, 06-08-T2 (gsap-only variant) | 2, 5 | ❌ W0 | ⬜ pending |
| V-04 | MOTN-01 | Reveal runtime arming, once-only, focusin, cleanup | unit | `pnpm vitest run tests/unit/motion-reveal.test.ts` | 06-03-T1, 06-08-T1 (lines driver) | 06-03-T1, 06-08-T1 | 2, 5 | ❌ W0 | ⬜ pending |
| V-05 | MOTN-01 | Scroll to bottom reveals all, none re-hidden | e2e | `pnpm playwright test tests/e2e/motion-reveal.spec.ts -g "scroll"` | 06-03-T2 (Home), 06-04-T1 (Projects, detail) | 06-03-T3, 06-04-T2 | 2, 3 | ❌ W0 | ⬜ pending |
| V-06 | MOTN-02 | Split heading accessible name stable; `[lang]` kept; reverted after | e2e | `pnpm playwright test tests/e2e/motion-reveal.spec.ts -g "split"` | 06-08-T1 | 06-08-T2 | 5 | ❌ W0 | ⬜ pending |
| V-07 | MOTN-02 | split-lines wrapper aria/link/mask rules | unit | `pnpm vitest run tests/unit/motion-split.test.ts` | 06-08-T1 | 06-08-T1 | 5 | ❌ W0 | ⬜ pending |
| V-08 | MOTN-03 | Cursor follower layer, aria-hidden, click-through, no overflow | e2e | `pnpm playwright test tests/e2e/motion-pointer.spec.ts` | 06-09-T1 | 06-09-T2 | 5 | ❌ W0 | ⬜ pending |
| V-09 | MOTN-03 | Magnetic clamp/zone; shell rect unchanged; reset on leave/toggle | e2e + unit | `pnpm playwright test tests/e2e/motion-pointer.spec.ts -g magnetic` / `pnpm vitest run tests/unit/motion-magnetic.test.ts` | 06-07-T1, 06-07-T2 | 06-07-T1 (unit), 06-07-T3 (e2e) | 4 | ❌ W0 | ⬜ pending |
| V-10 | MOTN-03 | Touch profiles: no follower, faces untransformed | e2e | `pnpm playwright test tests/e2e/motion-pointer.spec.ts -g touch` | 06-07-T1 (faces), 06-09-T1 (follower) | 06-07-T3 (faces), 06-09-T2 (follower) | 4, 5 | ❌ W0 | ⬜ pending |
| V-11 | MOTN-04 | Hover + focus image effect; no hover-only info | e2e | `pnpm playwright test tests/e2e/motion-hover.spec.ts` | 06-06-T1 | 06-06-T2 | 4 | ❌ W0 | ⬜ pending |
| V-12 | MOTN-07 | OS reduce → `reduced`, no transforms, no follower | e2e | `pnpm playwright test tests/e2e/motion.spec.ts -g reduce` | 06-01-T1, 06-03-T1, 06-05-T1, 06-09-T1 | 06-01-T3 (toggle), 06-03-T3 (reveals), 06-05-T2 (hero), 06-09-T2 (follower) | 1, 2, 3, 5 | ✅ update | ⬜ pending |
| V-13 | MOTN-07 | Live OS change handling | e2e | `pnpm playwright test tests/e2e/motion.spec.ts -g "after load"` | 06-01-T1 | 06-01-T3 | 1 | ✅ update | ⬜ pending |
| V-14 | MOTN-08 | Toggle: no reload, form preserved, persists pre-paint | e2e | `pnpm playwright test tests/e2e/motion-toggle.spec.ts` | 06-01-T1, 06-01-T2 | 06-01-T3 | 1 | ❌ W0 | ⬜ pending |
| V-15 | MOTN-08 | Tampered/throwing storage safe | e2e | `pnpm playwright test tests/e2e/motion-toggle.spec.ts -g storage` | 06-01-T1 | 06-01-T3 | 1 | ❌ W0 | ⬜ pending |
| V-16 | MOTN-08 | Toggle keyboard order, aria sync, i18n keys | e2e + unit | `pnpm playwright test tests/e2e/a11y.spec.ts` / `pnpm vitest run tests/unit/motion-toggle.test.ts tests/unit/site-header.test.ts` | 06-01-T2 | 06-01-T2 (unit), 06-01-T3 (e2e) | 1 | ✅ / ❌ W0 | ⬜ pending |
| V-17 | SC5 | Homepage bundle measured; gsap never eager | script | `pnpm build && node scripts/measure-bundle.ts` | 06-02-T2 (script + baseline), 06-02-T3 (lazy loader) | 06-02-T2, 06-02-T3, 06-10-T1 (final numbers), 06-10-T3 | 1, 6 | ❌ W0 | ⬜ pending |
| V-18 | all | axe zero violations across motion states | e2e | `pnpm playwright test tests/e2e/a11y.spec.ts` | all UI tasks | 06-01-T3, 06-09-T2 (cursor layer), 06-10-T1 (all motion states) | 1, 5, 6 | ✅ extend | ⬜ pending |
| V-19 | SC5 | All effects via `lifecycle.register`; unmount leaves nothing | unit | `pnpm vitest run tests/unit/motion-*.test.ts` | 06-03-T1, 06-05-T1, 06-07-T1, 06-08-T1, 06-09-T1 | 06-03-T1 (reveal), 06-07-T1 (magnetic), 06-09-T1 (cursor), 06-10-T1 (registry audit) | 2, 3, 4, 5, 6 | ❌ W0 | ⬜ pending |
| V-20 | MOTN-02 (hero) | ES hero h1 at 390 px: no glyph clipping, no extra wrap inside a `[data-hero-line]` span | e2e | `pnpm playwright test tests/e2e/motion-hero.spec.ts -g "narrow"` | 06-05-T1 | 06-05-T2, 06-10-T3 (review) | 3, 6 | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/helpers/` — shared `FakeMediaQueryList` (extracted from `motion-gate.test.ts`) and fake `IntersectionObserver`
- [ ] `tests/unit/motion-reveal.test.ts`, `motion-split.test.ts`, `motion-magnetic.test.ts`, `motion-cursor.test.ts`, `motion-toggle.test.ts`
- [ ] `tests/e2e/motion-reveal.spec.ts`, `motion-pointer.spec.ts`, `motion-hover.spec.ts`, `motion-toggle.spec.ts`, `motion-hero.spec.ts`, `motion-lcp.spec.ts`
- [ ] `scripts/measure-bundle.ts`
- [ ] Updates to `tests/unit/motion-gate.test.ts`, `tests/e2e/motion.spec.ts`, `tests/e2e/a11y.spec.ts` in the same plan that changes the behaviour

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Taste gates and screenshot review | all (visual) | Requires judgment on screenshots | Run taste-skill `lint.mjs` and `inspect.mjs` per UI-SPEC Verification; review screenshots |
| Motion feel (durations, easing, cursor playfulness) | MOTN-02/03/04 | Subjective | Browse `/`, `/projects/`, a detail page at 1440 with mouse; confirm with UI-SPEC |
| LCP on vs reduced | perf | Recorded, not CI-blocking | `pnpm playwright test tests/e2e/motion-lcp.spec.ts`; record in SUMMARY |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (each Wave 0 test file is created by the task that first verifies against it; see the map above)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags (all commands use `vitest run` / `playwright test`)
- [x] Feedback latency < 180s
- [x] `nyquist_compliant: true` set in frontmatter
- [ ] `wave_0_complete` stays false until execution creates the Wave 0 test files

**Approval:** planned (all V-rows mapped to tasks; execution pending)
