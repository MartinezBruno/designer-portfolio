---
phase: 3
slug: real-behance-work
status: draft
nyquist_compliant: false
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

Task IDs are filled in by the planner; this map is keyed by requirement until plans exist.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 2 | DATA-01 | — | Consent committed before any sync script | git check | `git merge-base --is-ancestor <consent-add-sha> <sync-add-sha>` | ❌ W0 | ⬜ pending |
| TBD | TBD | 2 | DATA-02 | — | Success run writes snapshot + hashed covers, GCs old covers | integration | `pnpm vitest run tests/unit/sync-run.test.ts -t "success"` | ❌ W0 | ⬜ pending |
| TBD | TBD | gate | DATA-02 | — | Real snapshot `origin: "behance-sync"`, git size recorded | manual-once + assertion | `node -e "…origin==='behance-sync'…"` + `du -ch src/assets/projects src/data/behance` | ❌ | ⬜ pending |
| TBD | TBD | 2 | DATA-03 | T-3 host allowlist / magic bytes | Challenge, empty, `hasMore:true`, shrink, partial, bad bytes, cross-host redirect → throws; previous snapshot byte-identical | integration | `pnpm vitest run tests/unit/sync-run.test.ts -t "fails"` | ❌ W0 | ⬜ pending |
| TBD | TBD | 2 | DATA-03 | — | Parsers: store extraction, challenge detection, fields, cover pick, sniff | unit | `pnpm vitest run tests/unit/sync-parse.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 2 | DATA-03 | — | CLI loads under plain Node, no network | smoke | `node scripts/sync-behance.ts --help` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | DATA-04 | — | Network-blocked build: 0 attempts, no CDN URLs in dist | smoke | `pnpm build:offline` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | DATA-04 | — | Corrupt/empty snapshot fails build | unit | `pnpm vitest run tests/unit/projects-snapshot.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | DATA-05 | — | hidden/featured/order/category/coverAlt overrides; unknown id, dup slug, typo key throw | unit | `pnpm vitest run tests/unit/projects-overrides.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 2 | DATA-05 | — | Override change appears on site | e2e | `pnpm test:e2e -g "projects"` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | DATA-06 | — | Components/pages never import `sources/**` | lint | `pnpm lint` (`no-restricted-imports`) | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | HOME-06 | — | `selectHomeProjects`: featured first, fill latest, max 3, hidden excluded | unit | `pnpm vitest run tests/unit/projects-select.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 2 | HOME-06 | — | Home shows 3 cards, correct EN/ES hrefs, See all link | e2e | `pnpm test:e2e -g "latest work"` | ❌ W0 | ⬜ pending |
| TBD | TBD | 2 | PROJ-01 | — | `/projects/` + `/es/projects/` newest first, lang, canonical/hreflang, aria-current, axe, 320 px | e2e | `pnpm test:e2e -g "projects page"` + extended a11y/layout/seo specs | ❌ W0 | ⬜ pending |
| TBD | TBD | 2 | PROJ-01 | — | ProjectCard compact vs full; lang wrapper; no "Image may contain" alt | unit | `pnpm vitest run tests/unit/project-card.test.ts` | ❌ W0 | ⬜ pending |
| — | — | — | i18n | — | Dictionary parity for new keys | unit | existing `tests/unit/i18n.test.ts` / `dictionary-types.test.ts` | ✅ | ⬜ pending |

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
| Real `pnpm sync:behance` run against live Behance | DATA-02 | Manual-only by decision D-04 (never CI) | Run once, confirm 7 projects/7 covers, commit snapshot, record `du -ch` size |
| Consent date filled in | DATA-01 | Date supplied by user | Replace `TODO(martina-date)` in `docs/CONSENT.md` |
| Bilingual title drafts approved | DATA-05 | Needs Martina's review | Resolve `TODO(martina)` markers in overrides |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
