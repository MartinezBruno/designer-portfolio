---
phase: 2
slug: homepage-story
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-10-16
revised: 2026-10-16
revision_reason: regenerated from plans 02-01..02-08 (real task IDs; home-sections.test.ts split per section; new e2e cases)
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `02-RESEARCH.md` § Validation Architecture, reconciled with `02-CONTEXT.md` and the 8 plans.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.5 (+ happy-dom 21.0.3, `experimental_AstroContainer`) for unit · Playwright 1.64.1 + @axe-core/playwright 4.14.0 for e2e · `astro check` as type and content-schema gate |
| **Config file** | `vitest.config.ts` (`getViteConfig`, `tests/unit/**/*.test.ts`), `playwright.config.ts` (`astro preview --ignore-lock`, port 4321). No install needed |
| **Quick run command** | `pnpm vitest run tests/unit/content-home.test.ts tests/unit/availability-badge.test.ts tests/unit/marquee-toggle.test.ts tests/unit/roles-marquee.test.ts tests/unit/featured-services.test.ts tests/unit/tool-tooltips.test.ts tests/unit/tools-row.test.ts` |
| **Full suite command** | `pnpm verify` (lint incl. astro check → vitest → build + playwright → secrets) |
| **Estimated runtime** | ~60 seconds (full suite) [Inference: based on the Phase 1 figure; not measured for Phase 2] |

---

## Sampling Rate

- **After every task commit:** run the quick run command (only the files that exist so far) plus `pnpm lint`
- **After every plan wave:** `pnpm test && pnpm test:e2e` (port 4321 must be free, RESEARCH Pitfall 7)
- **Before `/gsd:verify-work`:** `pnpm verify` must be green (plan 02-08 Task 2)
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

Task ID format: `{plan}-T{n}`. "Created in" means the test file is written in that task's RED step, before the implementation.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Created in | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|------------|--------|
| 02-01-T1 | 02-01 | 1 | HOME-02, HOME-04, HOME-05, HOME-07 | T-02-01, T-02-02 | JSON imported directly (parse errors fail tests); exact counts, order and content | unit | `pnpm vitest run tests/unit/content-home.test.ts && pnpm lint` | 02-01-T1 | ⬜ pending |
| 02-01-T2 | 02-01 | 1 | HOME-02, HOME-04, HOME-05, HOME-07 | T-02-02 | sortByOrder, assertCount (exactly 4 services), assertNonEmpty, resolveAvailability throw the UI-SPEC messages | unit | `pnpm vitest run tests/unit/content-home.test.ts && pnpm lint` | 02-01-T1 (extended) | ⬜ pending |
| 02-02-T1 | 02-02 | 1 | HOME-02, HOME-03 (tokens) | T-02-05 | Accent #0f70b7, success token, motion-on variant, marquee keyframes | lint + build + grep | `pnpm lint && pnpm build && grep -rqi "0f70b7" dist/_astro/*.css` | — | ⬜ pending |
| 02-02-T2 | 02-02 | 1 | HOME-02..05, HOME-07 (copy) | T-02-04, T-02-05 | New keys typed via `satisfies Dictionary`; Phase 1 axe/e2e re-run after the accent swap (D-15) | type gate + unit + e2e | `pnpm lint && pnpm test && pnpm test:e2e` | — (existing suites) | ⬜ pending |
| 02-03-T1 | 02-03 | 2 | HOME-07 | T-02-07 | Badge renders open copy when true and nothing when false; no live region | unit | `pnpm vitest run tests/unit/availability-badge.test.ts -t "badge"` | 02-03-T1 | ⬜ pending |
| 02-03-T2 | 02-03 | 2 | HOME-07 | T-02-06, T-02-08 | Badge in hero via HomeView; content flip (true → present, false → absent) by build + grep, restored with cmp | build + grep + e2e | `pnpm lint && pnpm test && pnpm build && grep -q "Open to new projects" dist/index.html && grep -q "Abierta a nuevos proyectos" dist/es/index.html && pnpm exec playwright test tests/e2e/home.spec.ts` | — | ⬜ pending |
| 02-04-T1 | 02-04 | 2 | HOME-03 | T-02-10 | Toggle flips aria-pressed and data-paused, fixed label, AbortController cleanup, 10-cycle idempotency | unit (happy-dom) | `pnpm vitest run tests/unit/marquee-toggle.test.ts` | 02-04-T1 | ⬜ pending |
| 02-04-T2 | 02-04 | 2 | HOME-02, HOME-03 | T-02-09 | Two copies (second aria-hidden), fixed-label button, white focus ring class (D-17), all svgs aria-hidden | unit (AstroContainer) | `pnpm vitest run tests/unit/roles-marquee.test.ts tests/unit/marquee-toggle.test.ts && pnpm lint` | 02-04-T2 | ⬜ pending |
| 02-05-T1 | 02-05 | 2 | HOME-04 | T-02-12, T-02-13 | Card is an `<li>` with h3 and real bullet list; nothing clickable | unit (AstroContainer) | `pnpm vitest run tests/unit/featured-services.test.ts -t "service card"` | 02-05-T1 | ⬜ pending |
| 02-05-T2 | 02-05 | 2 | HOME-04 | T-02-12 | Section with h2, 4 cards in order, 22 `<li>` total, no links | unit (AstroContainer) | `pnpm vitest run tests/unit/featured-services.test.ts && pnpm lint` | 02-05-T1 (extended) | ⬜ pending |
| 02-06-T1 | 02-06 | 2 | HOME-05 | T-02-15 | Tap toggle (touch/pen only), Esc dismiss, one tooltip at a time, outside tap closes, 10-cycle idempotency | unit (happy-dom) | `pnpm vitest run tests/unit/tool-tooltips.test.ts` | 02-06-T1 | ⬜ pending |
| 02-06-T2 | 02-06 | 2 | HOME-05 | T-02-14, T-02-16 | 5 role=img tiles named via aria-labelledby, aria-hidden tooltips with index anchors; lint override scoped to ToolsRow.astro | unit (AstroContainer) + lint | `pnpm vitest run tests/unit/tools-row.test.ts tests/unit/tool-tooltips.test.ts && pnpm lint` | 02-06-T2 | ⬜ pending |
| 02-07-T1 | 02-07 | 3 | HOME-02, HOME-03, HOME-04, HOME-05, HOME-07 | — | e2e cases "roles", "marquee" (animation, pause, white focus ring), "static" (reduced motion and no-JS), "services", "tools" (focus/Esc/hover tooltip), "tools" tap on touch (hasTouch), "availability", "accent" (hero CTA rgb(15, 112, 183)) on / and /es/ | e2e (RED first) | `pnpm build && pnpm exec playwright test tests/e2e/home-story.spec.ts` | 02-07-T1 | ⬜ pending |
| 02-07-T2 | 02-07 | 3 | SC4 (keyboard) | — | Tab order incl. pause button and 5 tool tiles, on / and /es/ | e2e (RED first) | `pnpm exec playwright test tests/e2e/a11y.spec.ts -g "keyboard"` | existing file, updated | ⬜ pending |
| 02-07-T3 | 02-07 | 3 | HOME-02..05, HOME-07, SC4 | T-02-17, T-02-18, T-02-19 | Composition; count guard fails build; missing es fails astro check; `set:html` count stays 1; JS sizes recorded | full gate | `pnpm lint && pnpm test && pnpm test:e2e` | — | ⬜ pending |
| 02-08-T1 | 02-08 | 4 | SC4 (axe) | T-02-23 | Reduced-motion axe on / and /es/; reduced-motion keyboard order on / and /es/ (no pause button); axe with a tooltip open | e2e | `pnpm build && pnpm exec playwright test tests/e2e/a11y.spec.ts` | existing file, extended | ⬜ pending |
| 02-08-T2 | 02-08 | 4 | SC4 (320px), HOME-02 track fill | T-02-21, T-02-22 | No overflow at 320px with each tooltip shown; full-bleed band; copy A ≥ track at 1280/1920/2560 | e2e + full gate | `pnpm verify` | existing file, extended | ⬜ pending |
| 02-08-T3 | 02-08 | 4 | all | — | Visual check of band, focus ring, tooltips, cards, badge in EN and ES | manual (checkpoint) | n/a | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

There is no separate Wave 0 plan. Each test file is created in the RED step of the task that implements its behavior, before any implementation code:

- [ ] `tests/unit/content-home.test.ts` — 02-01-T1 (content), 02-01-T2 (query layer)
- [ ] `tests/unit/availability-badge.test.ts` — 02-03-T1
- [ ] `tests/unit/marquee-toggle.test.ts` — 02-04-T1
- [ ] `tests/unit/roles-marquee.test.ts` — 02-04-T2
- [ ] `tests/unit/featured-services.test.ts` — 02-05-T1
- [ ] `tests/unit/tool-tooltips.test.ts` — 02-06-T1
- [ ] `tests/unit/tools-row.test.ts` — 02-06-T2
- [ ] `tests/e2e/home-story.spec.ts` — created in **wave 3** (02-07-T1), RED before HomeView composition in 02-07-T3
- [ ] `tests/e2e/a11y.spec.ts` keyboard probe generalized (02-07-T2), then reduced-motion and tooltip-open variants (02-08-T1)
- [ ] `tests/e2e/layout.spec.ts` tooltip overflow and track fill (02-08-T2)
- No framework install needed.

`wave_0_complete` is false because no plan has run yet. It becomes true once the unit test files above exist (end of wave 2).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Flipping `available` shows or hides the badge after a rebuild, with no code change (D-08) | HOME-07 | Requires editing a content file and rebuilding. Automated once by the executor in 02-03-T2 and recorded in its SUMMARY | Back up `profile.json` → set `available: false` → `pnpm build` → badge **absent** from `dist/index.html` and `dist/es/index.html` (grep count 0) → restore with `cp` + `cmp` → rebuild → badge **present** again (grep count 1 each) |
| Visual fit with the client mockup (blue band, white focus ring, tooltips, cards, badge) in EN and ES | all | Visual judgment | 02-08-T3 checkpoint steps 1–9 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or are the single human checkpoint
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Every test file referenced above is created by a named task (no MISSING references)
- [x] No watch-mode flags
- [x] Feedback latency < 60s for unit commands
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
