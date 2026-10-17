---
phase: 4
slug: project-detail-discovery
status: planned
nyquist_compliant: true
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

Filled from plans 04-01..04-11 (revision 1). Unit/astro-check commands target the 10 s latency budget; `pnpm build` (AVIF for ~154 module images) plus Playwright runs only on the final task of each plan, except the two build-bound exceptions noted in Latency.

| Task ID | Plan | Wave | Requirement | Threat Ref | Automated Command | File Exists | Latency | Status |
|---------|------|------|-------------|------------|-------------------|-------------|---------|--------|
| 04-01-01 | 04-01 | 1 | PROJ-03 | T-04-03 | `pnpm build && ! pnpm exec playwright test tests/e2e/project-detail.spec.ts` (RED: must fail) | ❌ created in task | build-bound (RED proof needs routes absent) | ⬜ pending |
| 04-01-02 | 04-01 | 1 | PROJ-03 | T-04-11 | `pnpm vitest run tests/unit/project-detail-site.test.ts tests/unit/dictionary-types.test.ts && pnpm exec astro check` | ❌ created in task / ✅ extend | unit (<10 s) | ⬜ pending |
| 04-01-03 | 04-01 | 1 | PROJ-03 | T-04-01, T-04-03, T-04-10 | `pnpm vitest run tests/unit/project-intro.test.ts tests/unit/tools-row.test.ts && pnpm build && pnpm exec playwright test tests/e2e/project-detail.spec.ts` | ❌ created in task / ✅ extend | final task: build+e2e | ⬜ pending |
| 04-02-01 | 04-02 | 1 | PROJ-04..07 | T-04-12, T-04-13 | `grep -c "N/A (Phase 4, D-16)" .planning/REQUIREMENTS.md \| grep -qx 4 && grep -q ... ROADMAP.md` | ✅ | <1 s | ⬜ pending |
| 04-02-02 | 04-02 | 1 | PROJ-04..07 | T-04-13 | `pnpm build && pnpm exec playwright test tests/e2e/projects.spec.ts -g "no filter"` | ✅ extend | final task: build+e2e | ⬜ pending |
| 04-03-01 | 04-03 | 1 | PROJ-02 | T-04-SC | `npm view sanitize-html@2.18.1 version && npm view @types/sanitize-html@2.16.2 version && npm view sharp@0.35.5 version` (blocking human-verify) | n/a | network | ⬜ pending |
| 04-03-02 | 04-03 | 1 | PROJ-02 | T-04-01, T-04-03 | `pnpm vitest run tests/unit/sync-sanitize.test.ts` | ❌ created in task | unit (<10 s) | ⬜ pending |
| 04-03-03 | 04-03 | 1 | PROJ-02 | T-04-02, T-04-04 | `pnpm vitest run tests/unit/sync-modules.test.ts tests/unit/sync-sanitize.test.ts tests/unit/projects-snapshot.test.ts` | ❌ created in task / ✅ extend | unit (<10 s) | ⬜ pending |
| 04-04-01 | 04-04 | 2 | PROJ-03 | T-04-14 | `pnpm vitest run tests/unit/project-detail-view.test.ts tests/unit/project-detail-site.test.ts && pnpm exec astro check` | ❌ created in task / ✅ (04-01) | unit (<10 s) | ⬜ pending |
| 04-04-02 | 04-04 | 2 | PROJ-03 | T-04-01 | `pnpm vitest run tests/unit/project-closing.test.ts && pnpm exec astro check` | ❌ created in task | unit (<10 s) | ⬜ pending |
| 04-04-03 | 04-04 | 2 | PROJ-03 | T-04-15 | `pnpm build && pnpm exec playwright test tests/e2e/project-detail.spec.ts tests/e2e/projects.spec.ts tests/e2e/home-latest-work.spec.ts tests/e2e/a11y.spec.ts` + taste gate | ✅ extend | final task: build+e2e | ⬜ pending |
| 04-05-01 | 04-05 | 2 | PROJ-03 | T-04-01, T-04-16 | `pnpm vitest run tests/unit/seo.test.ts && pnpm exec astro check` | ✅ extend | unit (<10 s) | ⬜ pending |
| 04-05-02 | 04-05 | 2 | PROJ-03 | T-04-16, T-04-13 | `pnpm build && pnpm exec playwright test tests/e2e/seo.spec.ts` | ✅ extend | final task: build+e2e | ⬜ pending |
| 04-06-01 | 04-06 | 2 | PROJ-02 | T-04-05, T-04-07, T-04-18 | `pnpm vitest run tests/unit/sync-module-images.test.ts tests/unit/sync-fetch.test.ts` | ❌ created in task / ✅ extend | unit (<10 s) | ⬜ pending |
| 04-06-02 | 04-06 | 2 | PROJ-02 | T-04-04, T-04-17 | `pnpm vitest run tests/unit/sync-commit.test.ts tests/unit/sync-run.test.ts && pnpm exec astro check` | ✅ extend | unit (<10 s) | ⬜ pending |
| 04-07-01 | 04-07 | 3 | PROJ-02 | T-04-05, T-04-09, T-04-17 | `pnpm vitest run tests/unit/sync-run.test.ts tests/unit/sync-cli.test.ts tests/unit/sync-commit.test.ts tests/unit/projects-snapshot.test.ts` | ✅ extend | unit (<10 s) | ⬜ pending |
| 04-07-02 | 04-07 | 3 | PROJ-02 | T-04-19 | `pnpm vitest run tests/unit/projects-overrides.test.ts tests/unit/sync-run.test.ts && pnpm test && pnpm exec astro check` | ✅ extend | unit (<10 s) | ⬜ pending |
| 04-08-01 | 04-08 | 4 | PROJ-02 | T-04-09, T-04-20 | precondition check: consent commit in git, `$CI` empty, clean `src/data/behance src/assets/projects` (checkpoint:decision) | ✅ | <1 s | ⬜ pending |
| 04-08-02 | 04-08 | 4 | PROJ-02 | T-04-01, T-04-02, T-04-17 | `node -e "...snapshot content check..." && pnpm vitest run tests/unit/projects-snapshot.test.ts && pnpm build:offline` | ✅ extend | final task: build; live sync is manual-only | ⬜ pending |
| 04-09-01 | 04-09 | 5 | PROJ-02 | T-04-11 | `pnpm vitest run tests/unit/project-detail-view.test.ts tests/unit/project-detail-site.test.ts tests/unit/projects-snapshot.test.ts && pnpm exec astro check` | ✅ (04-01/04-04) extend | unit (<10 s) | ⬜ pending |
| 04-09-02 | 04-09 | 5 | PROJ-02 | T-04-01, T-04-21 | `pnpm vitest run tests/unit/project-modules.test.ts && pnpm exec astro check && pnpm build` | ❌ created in task | build-bound (acceptance greps compiled `flex-grow:var(--ar)` in dist CSS); no e2e | ⬜ pending |
| 04-09-03 | 04-09 | 5 | PROJ-02 | T-04-03, T-04-21 | `pnpm build && pnpm exec playwright test tests/e2e/project-detail.spec.ts tests/e2e/a11y.spec.ts` + taste gate | ✅ (04-01) extend | final task: build+e2e | ⬜ pending |
| 04-10-01 | 04-10 | 6 | PROJ-02 | T-04-02 | `pnpm vitest run tests/unit/embed-facade.test.ts` | ❌ created in task | unit (<10 s) | ⬜ pending |
| 04-10-02 | 04-10 | 6 | PROJ-02 | T-04-06 | `pnpm vitest run tests/unit/project-modules.test.ts && pnpm exec astro check` | ✅ (04-09) extend | unit (<10 s) | ⬜ pending |
| 04-10-03 | 04-10 | 6 | PROJ-02 | T-04-03, T-04-06, T-04-22 | `pnpm build && pnpm exec playwright test tests/e2e/project-detail.spec.ts tests/e2e/a11y.spec.ts` + facade taste gate (replaces 04-09 embed-fallback assertion) | ✅ extend | final task: build+e2e | ⬜ pending |
| 04-11-01 | 04-11 | 7 | PROJ-02..07 | T-04-23 | `pnpm verify && pnpm build:offline` + measurements + phase taste gate | ✅ | phase gate | ⬜ pending |
| 04-11-02 | 04-11 | 7 | PROJ-02, PROJ-03 | T-04-22, T-04-23 | `test -f .planning/phases/04-project-detail-discovery/04-10-SUMMARY.md` (checkpoint:human-verify sign-off) | ✅ | manual sign-off | ⬜ pending |

**Latency exceptions (non-final tasks that keep `pnpm build`):**
- 04-01-01: TDD RED proof; the failing detail-page e2e can only be shown against a fresh build. Dropping it would drop the RED gate.
- 04-09-02: acceptance needs the compiled CSS to contain `flex-grow:var(--ar)` (Tailwind `grow-(--ar)` compile check). Runs `pnpm build` only, no Playwright.

### Requirement → test file summary

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
- [ ] `tests/unit/project-detail-site.test.ts`, `tests/unit/project-intro.test.ts` (04-01), `tests/unit/project-closing.test.ts` (04-04), `tests/unit/sync-module-images.test.ts` (04-06)
- No framework install needed

Each missing file is created by the task that first verifies against it (TDD tasks write the test before the implementation; mapping in the Per-Task Verification Map, column "File Exists"). `wave_0_complete` flips to true at execution once all of them exist.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live Behance re-sync with new schema | PROJ-02 | Network + user go-ahead (03-09 precedent) | Run sync, confirm `module images: N files, X MB added`, `du -sh src/assets/projects/modules` |
| Visual quality gate | PROJ-02/03 | Taste critique | UI-SPEC § Verification commands + screenshot review |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (each assigned to its creating task)
- [x] No watch-mode flags
- [x] Feedback latency < 10s for unit tasks (build-bound exceptions listed under Latency exceptions)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planner sign-off (revision 1); execution status tracked per task
