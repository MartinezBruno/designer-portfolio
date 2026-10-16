---
phase: 01-bilingual-walking-skeleton
plan: 01
subsystem: foundation
tags: [astro, i18n, tailwind, eslint, prettier, vitest, playwright, axe, secrets]
requires: []
provides:
  - "src/i18n/config.ts: locales, Locale, defaultLocale, isLocale"
  - "src/data/site.ts: SiteConfig + site (name, url, email, socials.behance)"
  - "src/layouts/BaseLayout.astro: Props { locale, title }, html lang + data-motion=off, main#main"
  - "scripts/secrets.ts: isSecretPath, parseSecretValues"
  - "pnpm verify gate chain (lint, test, test:e2e, check:secrets)"
affects: [01-02, 01-03, 01-04, 01-05]
tech-stack:
  added:
    - astro@7.4.0
    - "@tailwindcss/vite@4.3.3"
    - tailwindcss@4.3.3
    - typescript@~6.0.3 (resolved 6.0.3)
    - "@types/node@24.19.2"
    - "@astrojs/check@0.9.10"
    - vitest@5.0.5
    - "@playwright/test@1.64.1"
    - "@axe-core/playwright@4.14.0"
    - eslint@10.12.0
    - "@eslint/js@10.0.1"
    - typescript-eslint@8.71.2
    - eslint-plugin-astro@3.2.1
    - eslint-plugin-jsx-a11y-x@0.2.0
    - globals@17.13.0
    - prettier@3.9.10
    - prettier-plugin-astro@1.1.1
    - prettier-plugin-tailwindcss@0.8.1
  patterns:
    - "Thin locale route files (src/pages, src/pages/es) rendering BaseLayout with an explicit locale prop"
    - "Contracts typed with `as const satisfies` (site.ts)"
    - "Node 24 type-stripped scripts (erasable TS, explicit .ts imports)"
    - "Playwright webServer uses `astro preview --ignore-lock`"
key-files:
  created:
    - package.json
    - pnpm-lock.yaml
    - .nvmrc
    - .prettierrc.json
    - .prettierignore
    - astro.config.ts
    - eslint.config.js
    - vitest.config.ts
    - playwright.config.ts
    - src/i18n/config.ts
    - src/data/site.ts
    - src/styles/global.css
    - src/layouts/BaseLayout.astro
    - src/pages/index.astro
    - src/pages/es/index.astro
    - scripts/secrets.ts
    - scripts/check-secrets.ts
    - tests/unit/secrets.test.ts
    - tests/e2e/skeleton.spec.ts
  modified:
    - .gitignore
    - README.md
    - tsconfig.json
decisions:
  - "Package list approved by user as listed (no removals), including eslint-plugin-jsx-a11y-x@0.2.0; Node stays at 24.15.0, eslint-plugin-astro engines warning accepted"
  - "Exact versions pinned with --save-exact; typescript kept as ~6.0.3 per plan"
  - "src/styles/global.css created in Task 3 (bare @import) because prettier-plugin-tailwindcss requires tailwindStylesheet to exist"
  - "Tailwind v4 `--text-*: initial` namespace reset works: text-lg no longer compiles"
metrics:
  duration: "~5 min (continuation session, Tasks 2-4)"
  completed: 2026-10-16
  tasks: 3
  files: 22
---

# Phase 1 Plan 01: Bilingual Walking Skeleton Summary

Astro 7.4 static site at the repo root serving English at `/` and Spanish at `/es/` (correct `html lang`, `data-motion="off"`, zero axe WCAG 2.2 AA violations), with every Phase 1 gate wired and green: `astro check` + ESLint + Prettier, Vitest, Playwright + axe against `astro preview --ignore-lock`, and a `check:secrets` gate over git and `dist/`.

## Task 1 approval (checkpoint)

The user replied "Approved as listed". The full Phase 1 package list in the plan and RESEARCH is approved with **no removals**, including `eslint-plugin-jsx-a11y-x@0.2.0`. The orchestrator checked it on npm: repo github.com/es-tooling/eslint-plugin-jsx-a11y-x, maintainer 43081j, created 2024-10, listed as a peer dependency of eslint-plugin-astro. Node stays at v24.15.0 with no upgrade, and the eslint-plugin-astro engines warning is accepted. No package was installed before this approval.

Installed in this plan: astro, @tailwindcss/vite, tailwindcss, typescript, @types/node, @astrojs/check, vitest, @playwright/test, @axe-core/playwright, eslint, @eslint/js, typescript-eslint, eslint-plugin-astro, eslint-plugin-jsx-a11y-x, globals, prettier, prettier-plugin-astro and prettier-plugin-tailwindcss. Deferred as planned: @tabler/icons and the @fontsource-variable/* packages to 01-03, and happy-dom to 01-05.

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Approve package list | none (checkpoint, approved) |
| 2 | Scaffold Astro, install tooling, ignore secrets | 11cb05b |
| 3 | Gate configs, i18n/site contracts, failing e2e (RED) | 30ed277 |
| 4 | RED unit tests for the secrets helpers | b571a6d |
| 4 | EN/ES slice, tokens, secrets gate (GREEN) | 3cd52f3 |

## Verification (all run in this session)

- `pnpm verify` passed. `astro check` reported 0 errors, 0 warnings and 0 hints across 14 files. ESLint and Prettier were clean. Vitest passed 11/11. Playwright passed 2/2 (`/` lang en and `/es/` lang es, each with an h1 "Martina Fernandez" and an empty axe violations array). `check:secrets` printed "secrets check ok (5 dist files scanned)".
- A planted `dist/.env` made `pnpm check:secrets` exit 1 ("secret file in dist: dist/.env"). Removing it brought the gate back to ok.
- Extra probe: a temporary `.env` value copied into `dist/leak.txt` was detected ("secret value found in"). Both probe files were removed afterwards.
- Type-scale probe: adding `text-lg` to the h1 and building gave **0** `.text-lg` rules and 1 `.text-5xl` rule in `dist/_astro/*.css`. The `--text-*: initial` reset works. The probe was reverted and the site rebuilt.
- Dev smoke: `pnpm astro dev --background`, then curl `/` and `/es/` both succeeded, then `pnpm astro dev stop`.
- `git check-ignore`: `.dev.vars` and `.env.local` are ignored and `.env.example` is not. CLAUDE.md is unchanged.

## Observations (measured, not targets)

- `pnpm-workspace.yaml` was **not** created by pnpm 11.0.8.
- `pnpm ignored-builds` reported no pending build approvals ("Cannot identify as no node_modules found"), so `pnpm approve-builds` was not run. Builds and the dev server work without it.
- dist/ is 32 KB on disk (`du -sk`) and contains **0 JS files**. Files: `_astro/site.*.css` (15,289 B), `index.html` (467 B), `es/index.html` (467 B), `favicon.svg` (749 B), `favicon.ico` (655 B).
- create-astro (minimal template, `--no-ai`) produced no AI-agent files.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created `src/styles/global.css` in Task 3 instead of Task 4**
- **Found during:** Task 3 (`pnpm format`)
- **Issue:** `prettier-plugin-tailwindcss` reads `tailwindStylesheet: ./src/styles/global.css` and failed with ENOENT on every file, so `prettier --check` could not pass in Task 3.
- **Fix:** Added a bare `@import 'tailwindcss';` file in Task 3. Task 4 filled in the `@theme` tokens as planned.
- **Files modified:** src/styles/global.css
- **Commit:** 30ed277

**2. [Minor] Removed the template `"astro": "astro"` script; Prettier normalized the CSS import quotes**
- The plan's script list says "exactly", so the template's `astro` script was dropped. `pnpm astro ...` still works because pnpm runs local binaries.
- Prettier (`singleQuote: true`) rewrote `@import "tailwindcss";` as `@import 'tailwindcss';`. It behaves the same.

**3. [Note] RED e2e failure mode**
- In Task 3, `pnpm test:e2e` failed as expected, but the failure came from Playwright's webServer timing out after 60 s (with no pages, the preview URL never returned a success status) rather than from assertion failures. That still counts as the intended RED state.

### TDD Gate Compliance

Task 4 (`tdd="true"`): the RED commit `b571a6d` (`test(...)`) comes before the GREEN commit `3cd52f3` (`feat(...)`). No refactor commit was needed. The slice-level e2e RED is `30ed277`.

## Known Stubs

- `src/data/site.ts`: `url` (`https://martinafernandez.example`) and `email` (`hello@martinafernandez.example`) are placeholders marked `TODO(martina)`. This is intentional per the plan; the real values are open questions for Martina. Neither blocks the goal of this slice.
- `src/pages/index.astro` and `src/pages/es/index.astro`: the h1 is a placeholder slice that Plan 01-03 replaces with HomeView/Hero. The Spanish page has no Spanish copy yet. Dictionaries come in a later plan.

## Self-Check: PASSED

- Files: every file listed in key-files exists (checked with `test -f`).
- Commits: 11cb05b, 30ed277, b571a6d and 3cd52f3 are all in `git log`.
