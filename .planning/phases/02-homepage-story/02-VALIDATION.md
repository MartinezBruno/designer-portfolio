---
phase: 2
slug: homepage-story
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-16
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `02-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.5 (+ happy-dom 21.0.3, `experimental_AstroContainer`) for unit · Playwright 1.64.1 + @axe-core/playwright 4.14.0 for e2e · `astro check` as type gate |
| **Config file** | `vitest.config.ts` (`getViteConfig`, `tests/unit/**/*.test.ts`), `playwright.config.ts` (`astro preview --ignore-lock`, port 4321) — no install needed |
| **Quick run command** | `pnpm vitest run tests/unit/content-home.test.ts tests/unit/marquee-toggle.test.ts tests/unit/home-sections.test.ts` |
| **Full suite command** | `pnpm verify` (lint incl. astro check → vitest → build + playwright → secrets) |
| **Estimated runtime** | ~60 seconds (full suite) [Inference: based on Phase 1 figure; not measured for Phase 2] |

---

## Sampling Rate

- **After every task commit:** Run quick run command + `pnpm lint`
- **After every plan wave:** Run `pnpm test && pnpm test:e2e`
- **Before `/gsd:verify-work`:** `pnpm verify` must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

> Task IDs are filled in by the planner. Requirement → test mapping from research:

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | HOME-02 | — | N/A | e2e | `pnpm build && pnpm exec playwright test tests/e2e/home-story.spec.ts -g "roles"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | HOME-02 | — | N/A | unit | `pnpm vitest run tests/unit/home-sections.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | HOME-03 | — | N/A | unit (happy-dom) | `pnpm vitest run tests/unit/marquee-toggle.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | HOME-03 | — | N/A | e2e | `pnpm exec playwright test tests/e2e/home-story.spec.ts -g "marquee"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | HOME-03 | — | N/A | e2e (reduced motion / no-JS) | `pnpm exec playwright test tests/e2e/home-story.spec.ts -g "static"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | HOME-04 | T-2-01 | Content validated by zod schema; exactly 4 services | unit | `pnpm vitest run tests/unit/content-home.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | HOME-04 | — | N/A | e2e | `pnpm exec playwright test tests/e2e/home-story.spec.ts -g "services"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | HOME-05 | — | N/A | e2e + unit | `pnpm exec playwright test tests/e2e/home-story.spec.ts -g "tools"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | HOME-07 | — | N/A | unit | `pnpm vitest run tests/unit/home-sections.test.ts -t "badge"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | HOME-07 | — | N/A | e2e | `pnpm exec playwright test tests/e2e/home-story.spec.ts -g "availability"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SC4 (axe) | T-2-01 | No `set:html` on content (count in `src/` stays 1) | e2e | `pnpm exec playwright test tests/e2e/a11y.spec.ts` | ✅ | ⬜ pending |
| TBD | TBD | TBD | SC4 (keyboard) | — | N/A | e2e | `pnpm exec playwright test tests/e2e/a11y.spec.ts` | ✅ needs update | ⬜ pending |
| TBD | TBD | TBD | SC4 (320px) | — | N/A | e2e | `pnpm exec playwright test tests/e2e/layout.spec.ts` | ✅ | ⬜ pending |
| TBD | TBD | TBD | I18N-05 carry-over | — | N/A | type gate | `pnpm lint` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/content-home.test.ts` — JSON imports, counts, `sortByOrder` / `assertCount` / localize
- [ ] `tests/unit/marquee-toggle.test.ts` — happy-dom DOM fixture for `initMarqueeToggles`
- [ ] `tests/unit/home-sections.test.ts` — AstroContainer renders of RolesMarquee, FeaturedServices, ToolsGrid, AvailabilityBadge (props only)
- [ ] `tests/e2e/home-story.spec.ts` — EN/ES content, marquee on / reduced / no-JS, badge
- [ ] Update `tests/e2e/a11y.spec.ts` keyboard order to accept the pause `<button>`
- No framework install needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Flipping `available` flips badge state after rebuild, no code change | HOME-07 | Requires editing a content file and rebuilding; recorded once in SUMMARY | Toggle `available` in `profile.json` → `pnpm build` → grep `dist/index.html` and `dist/es/index.html` for the closed/open string → revert |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
