---
phase: 4
slug: project-detail-discovery
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-17
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `04-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.5 (AstroContainer, happy-dom) + Playwright 1.64.1 (`astro preview` :4400) + @axe-core/playwright 4.14.0 |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `pnpm vitest run tests/unit/<file>.test.ts` |
| **Full suite command** | `pnpm lint && pnpm test && pnpm test:e2e` (or `pnpm verify`) |
| **Estimated runtime** | ~2 s unit; e2e requires `pnpm build` first |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run <touched test files>` (+ `pnpm exec astro check` for `.astro` changes)
- **After every plan wave:** Run `pnpm lint && pnpm test`; `pnpm test:e2e` after any page/component wave
- **Before `/gsd:verify-work`:** `pnpm verify` + `pnpm build:offline` green + taste gate
- **Max feedback latency:** 10 seconds (unit)

---

## Per-Task Verification Map

*Filled by the planner / executor per task. Requirement → test mapping from research:*

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| PROJ-02 | Sanitizer allowlist, real modules, XSS fixtures, idempotent | unit | `pnpm vitest run tests/unit/sync-sanitize.test.ts` | ❌ W0 | ⬜ pending |
| PROJ-02 | Committed snapshot HTML is sanitizer fixed point; schema strict union; image files exist w/ dims | unit | `pnpm vitest run tests/unit/projects-snapshot.test.ts` | ✅ extend | ⬜ pending |
| PROJ-02 | Module normalization + embed allowlist → unknown fallback | unit | `pnpm vitest run tests/unit/sync-modules.test.ts` | ❌ W0 | ⬜ pending |
| PROJ-02 | Variant fallback chain; failure leaves old snapshot untouched | unit | `pnpm vitest run tests/unit/sync-run.test.ts` | ✅ extend | ⬜ pending |
| PROJ-02 | Module dir commit + separate GC (covers GC never touches modules) | unit | `pnpm vitest run tests/unit/sync-commit.test.ts` | ✅ extend | ⬜ pending |
| PROJ-02 | moduleAlt overrides schema | unit | `pnpm vitest run tests/unit/projects-overrides.test.ts` | ✅ extend | ⬜ pending |
| PROJ-02/03 | Alt numbering, `collectionRows`, `neighbours` | unit | `pnpm vitest run tests/unit/project-detail-view.test.ts` | ❌ W0 | ⬜ pending |
| PROJ-02 | Module components render (lang, hint, facade, unknown fallback) | unit | `pnpm vitest run tests/unit/project-modules.test.ts` | ❌ W0 | ⬜ pending |
| PROJ-02 | Embed facade script (sandboxed iframe, focus, allowlist re-check) | unit | `pnpm vitest run tests/unit/embed-facade.test.ts` | ❌ W0 | ⬜ pending |
| PROJ-02/03 | Detail pages 7×2 render, meta, Behance link, contact CTA, next/prev wrap, no 3rd-party request pre-click | e2e | `pnpm build && pnpm exec playwright test tests/e2e/project-detail.spec.ts` | ❌ W0 | ⬜ pending |
| PROJ-02/03 | axe 0 violations on detail pages | e2e | `pnpm exec playwright test tests/e2e/a11y.spec.ts` | ✅ extend | ⬜ pending |
| PROJ-03 | Tool icons, SEO og:image, no date | unit | `pnpm vitest run tests/unit/seo.test.ts tests/unit/tools-row.test.ts` | ✅ extend | ⬜ pending |
| PROJ-04..07 | N/A recorded with evidence (7 projects); no filter UI on Projects page | e2e + grep | `pnpm exec playwright test tests/e2e/projects.spec.ts -g "no filter"`; `grep -n "PROJ-0[4-7]" .planning/REQUIREMENTS.md` | ✅ extend | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/sync-sanitize.test.ts` — sanitizer fixtures (4 real modules + XSS set)
- [ ] `tests/unit/sync-modules.test.ts` — content normalization + embed extraction
- [ ] `tests/unit/project-detail-view.test.ts` — `neighbours`, `collectionRows`, alt numbering
- [ ] `tests/unit/project-modules.test.ts` — AstroContainer renders
- [ ] `tests/unit/embed-facade.test.ts` — happy-dom facade behavior
- [ ] `tests/e2e/project-detail.spec.ts` + `tests/e2e/helpers/projects.ts` `expectedDetail`
- [ ] `tests/fixtures/behance/module.webp` fixture
- No framework install needed

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live Behance re-sync with new schema | PROJ-02 | Network + user go-ahead (03-09 precedent) | Run sync, confirm `module images: N files, X MB added`, `du -sh src/assets/projects/modules` |
| Visual quality gate | PROJ-02/03 | Taste critique | UI-SPEC § Verification commands + screenshot review |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
