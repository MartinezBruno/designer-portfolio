---
phase: quick-261110-v6r
plan: 01
subsystem: deploy
tags: [cloudflare, workers, turnstile, resend, deploy, runbook]
requires: []
provides:
  - pre-deploy env check (scripts/deploy-env.ts, scripts/check-deploy-env.ts)
  - pnpm run deploy / deploy:dry
  - Worker observability
  - docs/DEPLOY.md runbook
affects: [package.json, wrangler.jsonc, astro.config.ts, README.md]
tech-stack:
  added: []
  patterns: [pure helpers + plain-Node CLI tested with spawnSync (like check-secrets / sync-cli)]
key-files:
  created:
    - scripts/deploy-env.ts
    - scripts/check-deploy-env.ts
    - tests/unit/deploy-env.test.ts
    - docs/DEPLOY.md
  modified:
    - package.json
    - wrangler.jsonc
    - astro.config.ts
    - README.md
decisions:
  - No SITE_URL env override; src/data/site.ts stays the single source of truth for the URL (runbook step 2)
  - Built-output scan ignores only the env-schema `"default": "<test key>"` entry Astro embeds in the server bundle
  - Sitekey passed in the shell only (not .env, not .dev.vars); runbook says `pnpm run deploy`, never `pnpm deploy`
metrics:
  duration: ~5 min
  completed: 2026-11-10
requirements: [QUICK-261110-v6r, DEPLOY-01, DEPLOY-02, DEPLOY-03]
---

# Quick 261110-v6r: Prepare Cloudflare deploy and contact email Summary

A deploy gate that blocks a test or unset Turnstile sitekey and the `.example` site.url, before and after the build. Also `pnpm run deploy` / `deploy:dry` scripts, Worker observability logs, and a 7-step runbook (`docs/DEPLOY.md`) for the first workers.dev deploy with contact email delivered to martinafernandez170404@gmail.com via Resend.

## Commits

| Task | Commit  | Message                                           |
| ---- | ------- | ------------------------------------------------- |
| 1    | f40a703 | feat(deploy): add pre-deploy env check            |
| 2    | 2fb589f | chore(deploy): add deploy scripts and worker logs |
| 3    | 7e74a46 | docs(deploy): add cloudflare deploy runbook       |

## Verification

- [Verified] `pnpm test`: 78 files, 1464 tests pass (includes 36 new deploy-env cases, among them the parity test against `isTurnstileTestSiteKey`, and 3 plain-Node CLI cases).
- [Verified] `pnpm lint`: 0 errors, 0 warnings (3 pre-existing hints in `tmp/lighthouse/*.mjs`); Prettier clean.
- [Verified] `pnpm check:secrets` after a default-env `pnpm build`: ok (1318 dist files scanned).
- [Verified] With the committed placeholder `site.url` and a real-format key, `node scripts/check-deploy-env.ts` exits 1 naming site.url, without echoing the key.
- [Verified] Build with `PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAAAAAAAAAAAAAAAA` (a fake real-format key, not a secret) followed by `check-deploy-env.ts --built`: the only failure is site.url. The key was found in dist, so Astro reads the shell env at build time.
- [Verified] Negative: on a default-env build, `--built` reports the test sitekey in `dist/client/_astro/contact-form-boot.*.js` and `dist/server/chunks/entrypoint_*.mjs`, plus "sitekey from the shell not found in dist".
- [Verified] `dist/server/wrangler.json` contains `"observability":{"enabled":true}`.
- [Verified] `site.ts` and `deploy-guard.ts` are unchanged. The `astro.config.ts` comment swap keeps the same line count, and the spanish-review tests pass.

## Dry-run findings

- `pnpm help deploy`: pnpm has a **built-in** `deploy` command ("Deploy a package from a workspace"). The scripts must run as `pnpm run deploy` / `pnpm run deploy:dry`, which is what the README and the runbook say.
- Under the offline guard (`NODE_OPTIONS=--import=./scripts/offline-guard.ts`, `WRANGLER_SEND_METRICS=false`), `wrangler deploy --dry-run` attempted **one network connection: `registry.npmjs.org:443`** (its update check). The guard's thrown error aborted wrangler (exit 1). Log: `tmp/quick-261110-v6r-dryrun-guard.log`.
- Re-run once without the guard (with `WRANGLER_SEND_METRICS=false`): **exit 0, no login or account prompt.** It used the redirected config `dist/server/wrangler.json`, bundled 16 modules (807.56 KiB, gzip total 210.25 KiB), read 1304 assets, and listed only the `env.ASSETS` binding. No vars from `.dev.vars` were listed. So the dry-run needs no login, but network isolation was **not** proven: wrangler makes at least the npm update-check request. The runbook notes this.
- 05-RESEARCH A1 is now **[Verified]**: `find tmp/deploy-dry-run -name '.dev.vars*'` printed nothing. `dist/server/.dev.vars` exists locally but is not part of the bundle, and `dist/client/.assetsignore` lists `.dev.vars`. `deploy:dry` was kept.
- No `wrangler login`, non-dry `wrangler deploy`, `wrangler secret put`, `pnpm run deploy`, or Cloudflare/Resend API call was made.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The built scan flagged Astro's embedded env schema default**
- **Found during:** Task 2, step 4b.
- **Issue:** Astro embeds the env schema in `dist/server/chunks/entrypoint_*.mjs`, including `"default": "1x00000000000000000000AA"` for `PUBLIC_TURNSTILE_SITE_KEY`. That entry is there even when the real key is inlined, so the plan's "any test key in dist" rule would have made `pnpm run deploy` fail on every run.
- **Fix:** `builtProblems` strips only the `"default": "<test key>"` JSON form before scanning, and still flags every other occurrence (the default-env build is still rejected in both client and server). Two unit tests cover it.
- **Files:** `scripts/deploy-env.ts`, `tests/unit/deploy-env.test.ts`.
- **Commit:** 2fb589f.

**2. Runbook addition:** the troubleshooting table includes `turnstile_error TURNSTILE_SECRET_KEY is not set` and `mailer_config`. Both lines are taken from `src/lib/contact/turnstile.ts` and `src/lib/contact/mailer/index.ts`.

## Not run

No visual UI change (scripts, config, docs only), so the taste-skill gate and the 08-17 LCP re-measure were not run. E2E was not run either: no CSS or UI change.

## Pending human actions (docs/DEPLOY.md)

1. `pnpm wrangler login`
2. Set `site.url` in `src/data/site.ts` to the workers.dev URL and commit.
3. Create the Turnstile widget (workers.dev hostname, Managed).
4. Create the Resend account with martinafernandez170404@gmail.com and a sending-only API key.
5. `PUBLIC_TURNSTILE_SITE_KEY=<site key> pnpm run deploy`
6. `wrangler secret put` for MAILER, CONTACT_TO, RESEND_API_KEY and TURNSTILE_SECRET_KEY. Never set CONTACT_ALLOW_TEST_CONFIG.
7. Smoke test in EN and ES, check the inbox and Reply-To, and use `pnpm wrangler tail` if a send fails.

## Self-Check: PASSED

- FOUND: scripts/deploy-env.ts, scripts/check-deploy-env.ts, tests/unit/deploy-env.test.ts, docs/DEPLOY.md
- FOUND commits: f40a703, 2fb589f, 7e74a46
