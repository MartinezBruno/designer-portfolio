---
phase: quick-261110-voa
plan: 01
subsystem: deploy, contact
tags: [cloudflare, send_email, email-routing, custom-domain, turnstile]
requires: [quick-261110-v6r]
provides: [martifernandez.com site.url, cloudflare mailer, EMAIL send_email binding, custom-domain route]
affects: [src/actions/index.ts, docs/DEPLOY.md]
tech-stack:
  added: []
  patterns: [lazy dynamic import of cloudflare:workers, structural binding type + runtime guard, ambient module declaration]
key-files:
  created:
    - src/lib/contact/mailer/cloudflare.ts
    - src/cloudflare-workers.d.ts
    - tests/unit/contact-mailer-cloudflare.test.ts
  modified:
    - src/data/site.ts
    - wrangler.jsonc
    - astro.config.ts
    - src/actions/index.ts
    - src/lib/contact/mailer/index.ts
    - src/lib/contact/mailer/types.ts
    - src/lib/contact/mailer/console.ts
    - src/lib/contact/mailer/resend.ts
    - src/lib/contact/deploy-guard.ts
    - scripts/deploy-env.ts
    - scripts/spanish-review.ts
    - .planning/phases/08-quality-verification/08-SPANISH-REVIEW.md
    - tests/unit/routes.test.ts
    - tests/unit/deploy-env.test.ts
    - tests/unit/spanish-review.test.ts
    - tests/unit/contact-deploy-guard.test.ts
    - docs/DEPLOY.md
    - .env.example
decisions:
  - Cloudflare send_email (Email Routing) is the primary mailer (MAILER=cloudflare); Resend stays selectable (MAILER=resend)
  - workers.dev kept on as a fallback URL (form fails closed there); www handled by an optional dashboard redirect, not a second custom domain
  - Minimal ambient declaration for cloudflare:workers instead of adding @cloudflare/workers-types
metrics:
  completed: 2026-11-10
---

# Quick 261110-voa: Switch to martifernandez.com and Cloudflare Email Summary

The site now targets `https://martifernandez.com` (custom-domain route in wrangler.jsonc) and the contact Action can send through Cloudflare's `send_email` binding `EMAIL`, restricted to martinafernandez170404@gmail.com and sender `web@martifernandez.com`, with Resend kept as an alternative.

## Commits

| Task | Commit  | Message                                     |
| ---- | ------- | ------------------------------------------- |
| 1    | f7d231e | feat(deploy): switch to martifernandez.com  |
| 2    | 9c783a7 | feat(contact): add cloudflare email mailer  |
| 3    | 0c23dca | docs(deploy): make cloudflare email primary |

## What changed

- **Domain:** `site.url` = `https://martifernandez.com` (plain comment, no TODO). routes/deploy-env tests updated; `siteUrlProblem` accepts the new URL; the fix hint no longer mentions workers.dev. `RUNBOOK` stays `docs/DEPLOY.md step 2` (the new runbook keeps steps 2, 3, 5 at the same numbers that scripts/deploy-env.ts cites).
- **Review list:** `NON_COPY_TODOS` dropped the real-domain, `.example` WR-04 and DEPLOY-02 items (2 left: hero photo, brand fonts). 08-SPANISH-REVIEW.md regenerated; diff is 3 deleted lines in the non-copy section only. The resend.ts TODO is now a plain comment; `CONTACT_FROM` unchanged.
- **wrangler.jsonc:** `routes` custom domain `martifernandez.com`, explicit `"workers_dev": true`, `send_email` `EMAIL` with `destination_address` and `allowed_sender_addresses`. No `remote`.
- **Mailer:** `src/lib/contact/mailer/cloudflare.ts` exports `CLOUDFLARE_FROM`, `CloudflareEmailMessage`, `SendEmailBinding`, `isSendEmailBinding`, `buildCloudflareMessage`, `createCloudflareMailer`. Plain text only; errors become `cloudflare email send failed (<error.name>)` with no visitor data and no `cause`.
- **Factory/guard/env:** `createMailer(env, fetch, { emailBinding })` throws `MAILER=cloudflare requires the EMAIL send_email binding` / `MAILER=cloudflare requires CONTACT_TO`; guard message now `MAILER=console outside local dev (set MAILER=cloudflare, or resend, for a deploy)`; `MAILER` enum has `cloudflare` (comment added on the same line, astro.config.ts:76 unchanged).
- **Action:** `loadEmailBinding()` does `await import('cloudflare:workers')` only when `MAILER === 'cloudflare'`; an import failure logs `[contact] rejected: mailer_config cloudflare:workers unavailable` and fails closed.
- **`src/cloudflare-workers.d.ts` was needed:** `pnpm check` reported TS2307 for `cloudflare:workers` before it existed. It declares only `env: Readonly<Record<string, unknown>>`; the binding is narrowed with `isSendEmailBinding`, no `any` or casts.
- **Docs:** docs/DEPLOY.md: Cloudflare Email primary (login, domain, Turnstile hostname, Email Routing + destination verification, deploy, 3 secrets, smoke test, troubleshooting rows for the new messages), "Alternative: Resend" section, DEPLOY-01/02 removed from Later. `.env.example` lists console | cloudflare | resend and no longer has a TODO.

## Verification

- [Verified] `pnpm test`: 79 files, 1481 tests passed (RED run first: the new test file failed on the missing module and the new guard case failed).
- [Verified] `pnpm lint` (astro check 0 errors, eslint, prettier): exit 0.
- [Verified] `pnpm build` (default env) exit 0; `dist/server/wrangler.json` contains `"pattern":"martifernandez.com","custom_domain":true`, `"workers_dev":true`, `"name":"EMAIL","destination_address":"martinafernandez170404@gmail.com"` and `web@martifernandez.com`.
- [Verified] `WRANGLER_SEND_METRICS=false pnpm exec wrangler deploy --dry-run --outdir tmp/deploy-dry-run`: exit 0, no login prompt. Bindings listed:
  ```
  env.EMAIL (martinafernandez170404@gmail.com - senders: web@martifernandez.com)       Send Email
  env.ASSETS                                                                           Assets
  ```
  The dry-run output does not list routes (wrangler prints routes only on a real deploy); the route was verified in dist/server/wrangler.json instead.
- [Verified] e2e: contact.spec, contact-server.spec, contact-states.spec, contact-lazy.spec, contact-preselect.spec and seo.spec: 171 passed (2.1m). The preview started with the send_email binding configured, with no remote/login error in the webServer output (MAILER=console as written by e2e-preview-env.ts).
- [Verified] `pnpm check:secrets` after the default build: ok (1318 dist files scanned).
- Shared lock `tmp/build-e2e.lock` acquired and released; no preview left on port 4400 (Playwright managed it).
- No visual UI change (config, server code, docs): taste-skill gate and the 08-17 LCP re-measure were not run.
- No wrangler login, real deploy, secret put, or Cloudflare/Resend API calls; no new dependencies.

## Deviations from Plan

**1. [Rule 3 - Blocking] eslint `preserve-caught-error` on the rethrow in cloudflare.ts**
- Found during: Task 2 (`pnpm lint`).
- Issue: the rule requires a `cause` on errors thrown from a catch, but attaching the provider error would carry visitor data (T-q261110voa-02).
- Fix: inline `eslint-disable-next-line preserve-caught-error` with the reason, plus a comment naming the threat.
- Commit: 9c783a7.

Otherwise the plan was executed as written. The Task 2 TDD cycle (RED then GREEN) ran but was committed as one commit, per the plan's three-commit list.

## Pending human actions

1. `pnpm wrangler login`.
2. Enable Email Routing on martifernandez.com and let Cloudflare add the DNS records.
3. Add martinafernandez170404@gmail.com as a destination address; Martina clicks the verification email.
4. Create the Turnstile widget for `martifernandez.com`.
5. `PUBLIC_TURNSTILE_SITE_KEY=<site key> pnpm run deploy`.
6. Secrets: `MAILER=cloudflare`, `CONTACT_TO=martinafernandez170404@gmail.com`, `TURNSTILE_SECRET_KEY`.
7. Smoke test EN and /es/ (mail from `Web Martina Fernandez <web@martifernandez.com>`, Reply-To = visitor).
8. Optional: www to apex Redirect Rule.

## Self-Check: PASSED
