---
phase: 05-contact
plan: 01
subsystem: infra
tags: [cloudflare, astro-adapter, astro-env, secrets, e2e, wrangler]
requires: []
provides:
  - "@astrojs/cloudflare adapter (Workers) with prerenderEnvironment 'node' and a Vitest stand-in adapter"
  - "astro:env schema: MAILER, CONTACT_TO, RESEND_API_KEY, TURNSTILE_SECRET_KEY (secret, optional), PUBLIC_TURNSTILE_SITE_KEY (client, public, test-key default)"
  - "src/actions/index.ts placeholder (empty server object) that 05-04 fills with the contact action"
  - "scripts/e2e-preview-env.ts: deterministic dist/server/.dev.vars for every e2e preview"
  - "secrets gate: isPluginPreviewCopy / isClientSecretPath"
  - "E2E_OFFLINE=1 skips @network-tagged tests"
affects: [05-02, 05-03, 05-04, 05-05, 05-08]
tech-stack:
  added: ["@astrojs/cloudflare 14.4.1", "wrangler 4.151.2 (dev)"]
  patterns:
    - "Secrets read only through astro:env/server with access 'secret' and optional: true"
    - "E2E preview secrets are overwritten by a script, never inherited from the developer's .dev.vars"
key-files:
  created:
    - wrangler.jsonc
    - pnpm-workspace.yaml
    - .env.example
    - src/actions/index.ts
    - scripts/e2e-preview-env.ts
  modified:
    - astro.config.ts
    - package.json
    - pnpm-lock.yaml
    - .gitignore
    - scripts/secrets.ts
    - scripts/check-secrets.ts
    - playwright.config.ts
    - tests/unit/secrets.test.ts
    - tests/e2e/not-found.spec.ts
key-decisions:
  - "Added an empty src/actions/index.ts now. Without an on-demand route the build is an assets-only Worker, and navigation misses get an empty-body 404"
  - "Kept wrangler.jsonc to the two planned keys (plus comments). Did not set assets.not_found_handling because it could stop /_actions/* reaching the Worker later"
requirements-completed: []
duration: 25min
completed: 2026-10-20
---

# Phase 5 Plan 01: Cloudflare adapter and secrets plumbing Summary

**The Cloudflare Workers adapter is installed with a typed `astro:env` secret schema and a Vitest stand-in adapter. The secrets gate tolerates only the plugin's `dist/server/.dev.vars` copy, and e2e previews always run with the console mailer and Turnstile test keys. All gates are green: 697 unit tests, 459 e2e tests, 0 network attempts in the offline build.**

## Performance

- **Duration:** about 25 min
- **Completed:** 2026-10-20
- **Tasks:** 3 (Task 1 approval checkpoint, plus Tasks 2 and 3)
- **Files modified:** 14

## Task 1: Package approval (checkpoint, resolved)

The user replied **"approved"** to the full list exactly as written in the plan, with no removals:
- `@astrojs/cloudflare@14.4.1` (dependency)
- `wrangler@4.151.2` (devDependency)
- `pnpm approve-builds workerd esbuild`

Nothing was installed before the approval.

Installed versions, pinned exactly in package.json: `"@astrojs/cloudflare": "14.4.1"`, `"wrangler": "4.151.2"`. pnpm (v12.14.0 locally) reported ignored builds for `esbuild@0.28.2`, `workerd@1.20261012.1` and `workerd@1.20261019.1`. Two workerd versions resolve, and both postinstalls ran after approval.

The generated `pnpm-workspace.yaml`:
```yaml
allowBuilds:
  esbuild: true
  workerd: true
```

## Accomplishments

- `astro.config.ts` now has:
  - `cloudflare({ imageService: 'compile', prerenderEnvironment: 'node' })`, or a `vitest-adapter-stub` when `process.env['VITEST']` is set
  - `session: false`
  - an env schema with four `access: 'secret'`, optional server vars (`MAILER` enum, default `console`)
  - one public client var, `PUBLIC_TURNSTILE_SITE_KEY`, defaulting to `1x00000000000000000000AA`, with a `TODO(deploy)` comment
- `wrangler.jsonc` has two keys: `name` and `compatibility_date` 2026-10-12.
- `.gitignore` now ignores `.wrangler/`.
- `.env.example` lists the variable names only. A local untracked `.dev.vars` exists and is gitignored (`git check-ignore` confirmed).
- `/es/does-not-exist` now gets the Spanish 404: status 404, `lang="es"`, and the Spanish h1. The e2e test and its header comment are updated.
- Secrets gate changes:
  - `isPluginPreviewCopy` matches exactly `dist/server/.dev.vars`, with either slash direction.
  - `isClientSecretPath` matches secret files under `dist/client/`.
  - `check-secrets.ts` skips only the preview copy, for both the path check and the value scan. It adds a `secret file in static assets:` problem line.
- `scripts/e2e-preview-env.ts` overwrites `dist/server/.dev.vars` with three fixed lines. Playwright's `webServer.command` runs it before `astro preview`, and `E2E_OFFLINE=1` adds `grepInvert: /@network/`.

## Dist layout

- `dist/client/`: static assets, including `404.html`, `es/404/index.html`, `_astro/`, `_headers`, and `.assetsignore` (which lists `wrangler.json` and `.dev.vars`).
- `dist/server/`: `entry.mjs`, `chunks/`, `virtual_astro_middleware.mjs`, `wrangler.json`, and `.dev.vars`. The `.dev.vars` file is the plugin's quoted copy of the root `.dev.vars`; for e2e it is overwritten by the env script.

## Task Commits

1. **Task 1: Package approval.** Checkpoint resolved by the user's "approved" reply. No commit.
2. **Task 2: Adapter, env, wrangler, and the 404 expectation.** `d2d2d18` (feat)
3. **Task 3: Secrets gate and e2e preview env** (TDD):
   - RED: `15756f1` (test). 13 new cases failed with `isPluginPreviewCopy is not a function`.
   - GREEN: `dd6fa62` (feat). 24/24 secrets tests pass.

## Verification

All results below were checked by running the commands:
- `pnpm lint`: 0 errors, 0 warnings, Prettier clean.
- `pnpm test`: 43 files and 697 tests pass. That is 684 before this plan plus 13 new tests.
- `pnpm build:offline`: `offline build ok (0 network attempts, 70 text files scanned, 20 html)`.
- `pnpm verify`: exits 0, with 459/459 e2e tests passing and `secrets check ok (997 dist files scanned)`.
- After `pnpm build:offline`, the plugin copy of the root `.dev.vars` is in `dist/server/` and `pnpm check:secrets` passes.
- I planted `.dev.vars` in `dist/client/`. `pnpm check:secrets` then exited 1 with `secret file in static assets: dist/client/.dev.vars`. I removed the planted file afterwards.
- After the e2e run, `dist/server/.dev.vars` contains exactly the three fixed lines.

**`/projects` 307:** no e2e assertion needed changing. The whole suite passed without touching anything for the trailing-slash redirect.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added a placeholder `src/actions/index.ts` (`export const server = {}`)**
- **Found during:** Task 2, first e2e run.
- **Issue:** With the adapter but no on-demand route, Astro emitted an empty `dist/server/` and an assets-only Worker. Browser navigations to missing pages (requests with `Sec-Fetch-Mode: navigate`) got a 404 with `content-length: 0`. Four 404 tests failed: three in not-found.spec and the `/does-not-exist` axe test. The research spike assumed an action existed, so it never saw this.
- **Fix:** Added an empty actions module. Astro now emits the Worker (`dist/server/entry.mjs`), and misses are rendered through Astro, which gives the English 404 for root misses and the Spanish 404 for `/es/*`. Plan 05-04 (wave 3) owns this file and replaces the empty object with the `contact` action.
- **Rejected alternative:** `assets.not_found_handling: "404-page"` in wrangler.jsonc. It would serve the English 404 for `/es/*` misses, and [Unverified] it might stop unmatched requests from reaching the Worker once `/_actions/*` exists.
- **Files:** src/actions/index.ts
- **Commit:** d2d2d18

### Other notes

- `wrangler.jsonc` has a two-line comment above the two keys. The keys themselves are exactly as planned.
- The worktree base was corrected with `git reset --hard 2af6de7` before any work, following the orchestrator's branch-check instruction.

## Known Stubs

- `src/actions/index.ts`: `server = {}` on purpose. 05-04 adds the `contact` action.
- `PUBLIC_TURNSTILE_SITE_KEY` defaults to Cloudflare's test sitekey (`TODO(deploy)`, DEPLOY-02).
- `.env.example` `CONTACT_TO=` is marked `TODO(martina)`.

## Threat Flags

None beyond the plan's threat model. T-05-01 through T-05-04 are mitigated as planned. T-05-05 is enabled here (the secrets are optional); the validation itself lands in 05-03 and 05-04.

## TDD Gate Compliance

Task 3: the RED commit `15756f1` (test) comes before the GREEN commit `dd6fa62` (feat). No refactor commit was needed.

## Self-Check: PASSED

- FOUND: wrangler.jsonc, pnpm-workspace.yaml, .env.example, src/actions/index.ts, scripts/e2e-preview-env.ts
- FOUND commits: d2d2d18, 15756f1, dd6fa62
