---
phase: 9
slug: portfolio-features-hero-full-width-on-mobile-photography-ser
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-11-10
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: 09-RESEARCH.md "Validation Architecture".

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.5 (happy-dom); Playwright 1.64.1 + @axe-core/playwright 4.14.0 |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` (port 4400, `astro preview`, `reuseExistingServer: false`) |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm verify` (hermetic `E2E_OFFLINE=1` + `@network`), `pnpm measure:bundle`, `pnpm review:spanish` freshness |
| **Estimated runtime** | ~8 s unit; e2e several minutes |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test` (+ `pnpm lint` when touching `.astro` or types)
- **After every plan wave:** `pnpm test` + the e2e specs for the touched area (one Playwright run at a time on port 4400). Layout/CSS waves also run `smooth-scroll.spec.ts`, `contact-lazy.spec.ts`, `anchors.spec.ts`.
- **Before `/gsd:verify-work`:** full `pnpm verify`, `pnpm measure:bundle`, Spanish review fresh, Home LCP re-measure (08-17 protocol), taste gate
- **Max feedback latency:** ~10 s (unit)

---

## Per-Task Verification Map

Filled in by the planner/executor per task. The requirement → test map:

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| PROJ-04 | Chips = All + categories with ≥1 project, services order; photography hidden | unit | `pnpm vitest run tests/unit/projects-filter.test.ts` | ✅ | ✅ green |
| PROJ-04 | Select chip → others hidden, tile rhythm recomputed, no holes, EN/ES | e2e | `pnpm exec playwright test tests/e2e/projects-filter.spec.ts` | ✅ | ✅ green |
| PROJ-07 | `?category=` allow-list; unknown/empty/repeated → All | unit | `pnpm vitest run tests/unit/category-param.test.ts` | ✅ | ✅ green |
| PROJ-07 | replaceState (history length unchanged), deep link, Back from detail restores filter, count announced, All resets | e2e | `projects-filter.spec.ts` | ✅ | ✅ green |
| PROJ-07 | before-swap applies filter to newDocument; cleanup aborts listener | unit | `pnpm vitest run tests/unit/category-filter.test.ts` | ✅ | ✅ green |
| PROJ-04/07 | Skip link on filtered page is a fragment jump, not a swap | unit + e2e | `tests/unit/nav-focus.test.ts`, `projects-filter.spec.ts` | ✅ | ✅ green |
| PROJ-04 | Keyboard: chips one Tab stop, arrows select | e2e | `a11y.spec.ts`, `keyboard-journeys.spec.ts` | ✅ | ✅ green |
| PROJ-04 | axe clean EN/ES, filtered and unfiltered | e2e | `a11y.spec.ts`, `a11y-sweep.spec.ts`, `projects.spec.ts` (invert :146) | ✅ | ✅ green |
| PROJ-04 | Reduced motion: instant change, nothing left un-revealed | e2e | `projects-filter.spec.ts` (`reducedMotion: 'reduce'`) | ✅ | ✅ green |
| PROJ-04 | No listener leak over 10 navigations | e2e | `navigation-leaks.spec.ts` | ✅ | ✅ green |
| HOME-10 | services.json ids === categoryIds === SERVICE_IDS | unit | `contact-fields.test.ts`, `content-home.test.ts` | ✅ | ✅ green |
| HOME-10 | Action accepts photography; ES email label "Fotografía" | unit | `contact-schema.test.ts`, `contact-email.test.ts`, `contact-submit.test.ts` | ✅ | ✅ green |
| HOME-10 | `?service=photography` preselects | unit + e2e | `service-preselect.test.ts`, `contact-preselect.spec.ts` | ✅ | ✅ green |
| HOME-10 | 5 service cards, 6 radios, Spanish review fresh | unit + e2e | `featured-services.test.ts`, `contact-section.test.ts`, `spanish-review.test.ts`, `home-story.spec.ts` | ✅ | ✅ green |
| HOME-09 | <640px full-width 4:5 arch (radius 40%); ≥640px unchanged 3:4 | e2e | `home.spec.ts` (`expectArch`) | ✅ | ✅ green |
| HOME-09 | Phone gets a correctly sized srcset candidate | e2e | `home.spec.ts` (`currentSrc`) | ✅ | ✅ green |
| Budget | Eager JS ≤ 22,000 B on `/` and `/projects/` | script | `pnpm build && pnpm measure:bundle` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/unit/category-param.test.ts`: parse and URL write
- [x] `tests/unit/projects-filter.test.ts`: chip building, hiding empty categories, visible-subset rhythm
- [x] `tests/unit/category-filter.test.ts`: applyCategory on a Document, before-swap, cleanup, live-region text
- [x] `tests/e2e/projects-filter.spec.ts`: EN/ES, deep link, Back restore, keyboard, reduced motion, axe, skip link
- [x] Invert `tests/e2e/projects.spec.ts:146` ("has no filter or search UI")

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Status |
|----------|-------------|------------|-------------------|--------|
| Home mobile LCP ≤ 2,500 ms | HOME-09 | Lighthouse needs a quiet machine and the network; not CI | 08-LIGHTHOUSE.md "Re-measure rule": `pnpm dlx lighthouse@13.6.0`, mobile simulated, 7 selection runs, then 5 runs each on Home and the heaviest EN detail page; record the src commit | ✅ done: accepted miss (D-20). Median 2,933 ms on src `bda5a84` (09-08 measurement, still valid in 09-11); detail 2,633 ms |
| Taste gate on hero and chips | HOME-09, PROJ-04 | Visual judgement | taste-skill `lint.mjs` + `inspect.mjs` at 1440/768/390 on `/`, `/es/`, `/projects/`, `/es/projects/`, `/projects/?category=web-design`; review the screenshots | ✅ done (09-11, src `bda5a84`): lint.mjs 0 FAIL on 16 phase files; inspect.mjs on 5 URLs at 1440/768/390 shows only the known pre-existing findings (`empty-screens`, `few-pictures` on the filtered page, `size-count`/`first-action`/`no-footage` WARNs); screenshots reviewed, critique in 09-11-SUMMARY.md |
| Photography copy approval | HOME-10 | Martina reviews the Spanish copy | `pnpm review:spanish`; rows marked for review | ⬜ pending Martina's review (not a gate) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-11-10 (09-08 phase gate: `E2E_OFFLINE=1 pnpm verify` 1,407 unit + 833 e2e passed, `@network` 60 passed, `measure:bundle` ok (max eager 18,024 B on `/`, ceiling 22,000 B), Spanish review fresh). Re-confirmed in 09-11 on 2026-11-10: the final src commit is `bda5a84` (`git log -1 --format=%h -- src`, `git status --porcelain -- src` empty), unchanged since 09-08, so the 09-08 automated results above stand for the final commit (D-20 orchestrator amendment; no re-run)

**Re-approval on final src `cc64ecd` (2026-11-10, after code-review fixes WR-01/WR-02):** `E2E_OFFLINE=1 pnpm verify` passed (1,426 unit, 841 e2e). `@network` passed 60/60 on re-runs of `cc64ecd` in a clean worktree and in the main tree. The first run's Turnstile-latency failures were accepted by the user as an external flake (D-21). `measure:bundle` ok (max eager 18,015 B), Spanish review fresh. LCP re-measured on `cc64ecd`: Home 2,933 ms (accepted miss D-20), detail 2,633 ms, filtered-link CLS 0. The taste `still-page` WARN on hard-loaded filtered /projects/ at 1440 was accepted by the user (D-21).
