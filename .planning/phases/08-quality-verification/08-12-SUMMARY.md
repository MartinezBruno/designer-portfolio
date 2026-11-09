---
phase: 08-quality-verification
plan: 12
subsystem: seo-i18n
tags: [security, 404, i18n, gap-closure, wr-02]
requires: []
provides:
  - "BaseLayout pins pathname to /404/ or /es/404/ for kind 'notFound'"
  - "e2e guard that an /es/* miss never reflects the requested path"
affects: [SeoHead, SiteHeader, LanguageSwitcher]
tech-stack:
  added: []
  patterns: ["Pinned constant pathname for on-demand error pages"]
key-files:
  created: []
  modified:
    - src/layouts/BaseLayout.astro
    - src/components/global/SeoHead.astro
    - src/components/views/NotFoundView.astro
    - src/components/global/LanguageSwitcher.astro
    - tests/e2e/not-found.spec.ts
decisions:
  - "For kind 'notFound', BaseLayout passes a constant pathname ('/404/' en, '/es/404/' es), never Astro.url.pathname (WR-02)"
metrics:
  duration: "~5 min"
  completed: 2026-11-09
  tasks: 2
  files: 5
requirements: [QUAL-02]
---

# Phase 8 Plan 12: Pin the 404 pathname (WR-02) Summary

For 404 pages, BaseLayout now passes the constant pathname `/404/` (en) or `/es/404/` (es) to SeoHead, SiteHeader and LanguageSwitcher. The Worker-rendered ES 404 can no longer pass the visitor's request path to shared components. A new e2e regression guard checks this.

## Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Add reflection guard, pin 404 pathname, fix comments | cbdf2c3 | BaseLayout.astro, SeoHead.astro, NotFoundView.astro, LanguageSwitcher.astro, not-found.spec.ts |
| 2 | Prove EN 404 unchanged; run 404/SEO/i18n specs | (verification only, no file changes) | none |

## Verification evidence

Verified by running the commands below in this worktree on 2026-11-09:

- `pnpm lint` (eslint, astro check, prettier): 0 errors, 0 warnings, 0 hints across 257 files.
- EN 404 byte-identity: `dist/client/404.html` was built at base 53103d4 and saved to `tmp/08-12/404.before.html`. After the fix I rebuilt, and `diff tmp/08-12/404.before.html dist/client/404.html` printed nothing (exit 0). The prerendered EN 404 already used pathname `/404/`, so the pinned value matches it.
- Filtered run `E2E_OFFLINE=1 playwright test not-found seo i18n a11y-sweep -g "404|not-found|does-not-exist|never reflects"`: **12 passed** (6 not-found tests including the new WR-02 guard, plus 6 a11y-sweep rows for `/does-not-exist` and `/es/404/` in motion on, reduced and off).
- Full `E2E_OFFLINE=1 playwright test tests/e2e/not-found.spec.ts tests/e2e/seo.spec.ts tests/e2e/i18n.spec.ts`: **67 passed**.
- `curl` against `astro preview --port 4492` for `/es/wr02-probe-cc/` returned **404**, and the body contained the string `wr02-probe` 0 times.

## RED/GREEN note

The new test "an /es/* miss never reflects the requested path (WR-02)" is a **regression guard, not a RED test**. [Inference] It would most likely have passed before the fix too, because the review found no shared component that currently writes `pathname` into the HTML of a 404 page. I did not run it against the pre-fix build to confirm this. It now checks that two different `/es/*` misses both return 404, that their bodies are identical, and that neither body contains the probe string. If a shared component starts rendering `pathname`, this test will fail.

## Deviations from Plan

**1. [Rule 3 - Blocking] Lock mechanism**
- The plan's `tmp/build-e2e.lock` assumes all plans share one `dist/`. Each parallel executor has its own worktree, so it has its own `dist/` and `tmp/`, and a lock directory there would protect nothing. Instead, every Playwright run was wrapped in the orchestrator's shared port-4400 lock (`e2e-lock.sh`). Builds ran outside the lock. The curl preview used port 4492, which no other agent uses, and I stopped it afterwards. No stale locks were removed.

Otherwise the plan was executed as written.

## Threat model

- T-08-25 (reflected input): mitigated. The pathname is pinned for `kind === 'notFound'`, and the e2e guard enforces it.
- T-08-26 (SEO spoofing): mitigated. `expectNoIndexWithoutCanonical` still passes for the root 404 and the ES 404.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: src/layouts/BaseLayout.astro contains `kind === 'notFound'` and `'/es/404/'`
- FOUND: tests/e2e/not-found.spec.ts contains "never reflects"
- FOUND: commit cbdf2c3
