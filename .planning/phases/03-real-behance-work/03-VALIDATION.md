---
phase: 3
slug: real-behance-work
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-10-17
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `03-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.5 (`getViteConfig`, happy-dom 21, `experimental_AstroContainer`) + Playwright 1.64.1 + @axe-core/playwright 4.14.0 |
| **Config file** | `vitest.config.ts` (`tests/unit/**/*.test.ts`), `playwright.config.ts` (port 4400, `astro preview --ignore-lock`) |
| **Quick run command** | `pnpm vitest run tests/unit/projects-*.test.ts tests/unit/sync-*.test.ts` |
| **Full suite command** | `pnpm lint && pnpm test && pnpm test:e2e && pnpm build:offline && pnpm check:secrets` |
| **Estimated runtime** | ~90 seconds (full); quick run under 15 seconds (estimate, not measured) |

---

## Sampling Rate

- **After every task commit:** Run the quick run command (plus `pnpm lint` when imports or files moved)
- **After every plan wave:** Run `pnpm lint && pnpm test && pnpm test:e2e`
- **Before `/gsd:verify-work`:** Full suite must be green, plus the phase-gate checks below
- **Max feedback latency:** 15 seconds (quick run)

---

## Per-Task Verification Map

Task IDs filled in by the planner on 2026-10-17 (format `<plan>-T<task>`), renumbered 2026-10-17 after the 03-01 split into 03-01 (data contracts) and 03-02 (Projects page slice).

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-06-T1, 03-06-T2, 03-06-T3, 03-10-T1 | 03-06, 03-10 | 1, 6 | DATA-01 | T-03-17 | Consent committed alone before any sync script; 03-06 T2/T3 verify start with the ancestry gate | git check | `git merge-base --is-ancestor "$(git log --diff-filter=A --format=%H -- docs/CONSENT.md \| tail -1)" HEAD` (T2/T3), consent-vs-sync ancestry in 03-10 | ❌ W0 | ⬜ pending |
| 03-08-T1, 03-08-T2 | 03-08 | 4 | DATA-02 | — | Success run writes snapshot + hashed covers, GCs old covers | integration | `pnpm vitest run tests/unit/sync-run.test.ts -t "success"` | ❌ W0 | ⬜ pending |
| 03-09-T1, 03-09-T2, 03-10-T1 | 03-09, 03-10 | 5, 6 | DATA-02 | T-03-28 | Live run only after the user's go-ahead checkpoint; real snapshot `origin: "behance-sync"`, git size recorded | checkpoint + assertion | `node -e "…origin==='behance-sync'…"` + `du -ch src/assets/projects src/data/behance` | ❌ | ⬜ pending |
| 03-08-T2 | 03-08 | 4 | DATA-03 | T-03-13, T-03-22 / magic bytes | Challenge, empty, `hasMore:true`, shrink, partial, bad bytes, cross-host redirect → throws; previous snapshot byte-identical | integration | `pnpm vitest run tests/unit/sync-run.test.ts -t "fails"` | ❌ W0 | ⬜ pending |
| 03-06-T2, 03-06-T3 | 03-06 | 1 | DATA-03 | — | Parsers: store extraction, challenge detection, fields, cover pick, sniff | unit | `pnpm vitest run tests/unit/sync-parse.test.ts tests/unit/sync-fetch.test.ts` | ❌ W0 | ⬜ pending |
| 03-08-T3 | 03-08 | 4 | DATA-03 | — | CLI loads under plain Node, no network | smoke | `node scripts/sync-behance.ts --help` | ❌ W0 | ⬜ pending |
| 03-07-T2, 03-10-T1 | 03-07, 03-10 | 1, 6 | DATA-04 | T-03-19 | Network-blocked build: 0 attempts, no CDN URLs in dist | smoke | `pnpm build:offline` | ❌ W0 | ⬜ pending |
| 03-01-T1, 03-01-T2 | 03-01 | 1 | DATA-04 | T-03-01, T-03-05 | Corrupt/empty snapshot or missing cover throws; seed loads with local covers | unit | `pnpm vitest run tests/unit/projects-snapshot.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-T1, 03-02-T3 | 03-02 | 2 | DATA-04 | T-03-03 | Pages never reference behance.net images | e2e | `pnpm test:e2e -g "projects page"` | ❌ W0 | ⬜ pending |
| 03-04-T2 | 03-04 | 3 | DATA-05 | T-03-08 | hidden/featured/order/category/coverAlt overrides; unknown id, dup slug, typo key throw | unit | `pnpm vitest run tests/unit/projects-overrides.test.ts` | ❌ W0 | ⬜ pending |
| 03-04-T1, 03-04-T3 | 03-04 | 3 | DATA-05 | — | Override change appears on site | e2e | `pnpm test:e2e -g "projects page\|projects grid"` | ❌ W0 | ⬜ pending |
| 03-01-T1 | 03-01 | 1 | DATA-06 | — | Model is source-agnostic and Node-safe | unit + grep | `pnpm vitest run tests/unit/projects-order.test.ts` + Node import check | ❌ W0 | ⬜ pending |
| 03-02-T3 | 03-02 | 2 | DATA-06 | T-03-04 | Components/pages never import `sources/**` | lint | `pnpm lint` (`no-restricted-imports`) | ❌ W0 | ⬜ pending |
| 03-04-T2 | 03-04 | 3 | HOME-06 | — | `selectHomeProjects`: featured first, fill latest, max 3, hidden excluded | unit | `pnpm vitest run tests/unit/projects-select.test.ts` | ❌ W0 | ⬜ pending |
| 03-05-T1, 03-05-T2 | 03-05 | 4 | HOME-06 | — | Home shows 3 cards, correct EN/ES hrefs, See all link | e2e | `pnpm test:e2e -g "latest work"` | ❌ W0 | ⬜ pending |
| 03-02-T1, 03-02-T3, 03-05-T3 | 03-02, 03-05 | 2, 4 | PROJ-01 | — | `/projects/` + `/es/projects/` newest first, lang, canonical/hreflang, aria-current, axe, 320 px | e2e | `pnpm test:e2e -g "projects page"` (03-02); `pnpm test:e2e -g "axe violations\|keyboard Tab order\|phase 3 header and layout\|latest work\|projects page"` (03-05-T3) | ❌ W0 | ⬜ pending |
| 03-02-T2 | 03-02 | 2 | PROJ-01 | — | Card view: fallback title lang, localized alt, UTC year, category labels | unit | `pnpm vitest run tests/unit/project-card-view.test.ts` | ❌ W0 | ⬜ pending |
| 03-03-T2 | 03-03 | 3 | PROJ-01 | T-03-06 | ProjectCard compact vs full; lang wrapper; no "Image may contain" alt | unit | `pnpm vitest run tests/unit/project-card.test.ts` | ❌ W0 | ⬜ pending |
| — | — | — | i18n | — | Dictionary parity for new keys | unit | existing `tests/unit/i18n.test.ts` / `dictionary-types.test.ts` | ✅ | ⬜ pending |

Full `pnpm test:e2e` runs at wave gates (each plan's `<verification>`) and in 03-10, not as a per-task verify.

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/fixtures/behance/` — synthetic `profile.html` (`hasMore` variants), `challenge.html` (453 B shape), `project-<id>.html` (tools/tags/1 ImageModule/1 unknown `__typename`), tiny `cover.png`, `not-image.bin`. Do not commit the real pages.
- [ ] `tests/unit/sync-parse.test.ts`, `tests/unit/sync-run.test.ts` (temp dir under `tmp/`, fake `fetch`, no-op `sleep`)
- [ ] `tests/unit/projects-snapshot.test.ts`, `projects-overrides.test.ts`, `projects-select.test.ts`, `project-slug.test.ts`, `project-card.test.ts`
- [ ] `scripts/offline-guard.ts`, `scripts/assert-offline.ts`, `build:offline` script
- [ ] ESLint `no-restricted-imports` block for `src/components/**` and `src/pages/**`
- [ ] `tests/e2e/projects.spec.ts` (new); extend `a11y.spec.ts`, `layout.spec.ts`, `seo.spec.ts`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real `pnpm sync:behance` run against live Behance | DATA-02 | Manual-only by decision D-04 (never CI); needs the user's network go-ahead | 03-09-T1 checkpoint (`run-now`), then 03-09-T2 runs once, confirms 7 projects/7 covers, commits snapshot, records `du -ch` size |
| Consent date filled in | DATA-01 | Date supplied by user | Replace `TODO(martina-date)` in `docs/CONSENT.md` |
| Bilingual title drafts approved | DATA-05 | Needs Martina's review | Resolve `TODO(martina)` markers in overrides |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (checkpoint tasks 03-09-T1 and 03-10-T2 excepted)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (each ❌ W0 test file is created in the RED step of the task that lists it)
- [x] No watch-mode flags (`vitest run`, `playwright test`)
- [ ] Feedback latency < 15s: met by the unit quick runs (estimate, not measured); per-task `pnpm test:e2e -g …` runs include `astro build` and are slower. Measure during execution.
- [x] `nyquist_compliant: true` set in frontmatter

`wave_0_complete: false` is accurate: no Wave 0 test file exists yet. They are created during execution.

**Approval:** pending (requires human approval of the plan set)
