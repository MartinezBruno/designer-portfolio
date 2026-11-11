# Deploy

First deploy of the site to Cloudflare Workers (`*.workers.dev`) with the contact form emailing martinafernandez170404@gmail.com. Steps marked [Unverified] were not run while writing this runbook (no account access); everything else is backed by the repo's scripts and tests.

## Prerequisites

- Node per `.nvmrc`, then `pnpm install`.
- A Cloudflare account.
- Access to the inbox martinafernandez170404@gmail.com (the Resend account must be created with it, see step 4).

## 1. Log in to Cloudflare

```sh
pnpm wrangler login
```

## 2. Set `site.url` to the workers.dev URL

The Worker is named `designer-portfolio` (`wrangler.jsonc`), so its URL is `https://designer-portfolio.<account-subdomain>.workers.dev`. The account subdomain is shown in the Cloudflare dashboard under Workers and Pages.

Set `url` in `src/data/site.ts` to that URL (https, no trailing slash) and commit it.

Why it matters: canonical, hreflang and Open Graph URLs come from `site.url`, and so does the contact Action's Turnstile hostname binding. A wrong value makes every send fail closed. `pnpm test:e2e` should stay green after the change, because the e2e specs read `site.url` too.

The deploy check refuses the `.example` placeholder, other reserved hosts (`.test`, `.invalid`, `.localhost`), `http://`, and URLs with a path or a trailing slash.

## 3. Create the Turnstile widget

Dashboard, Turnstile, Add widget:

- Hostname: the workers.dev host from step 2 (add the real domain later).
- Widget mode: Managed.

Copy the **site key** (public) and the **secret key** (secret).

## 4. Create the Resend account and API key

Create the Resend account **with martinafernandez170404@gmail.com**. The sender is `Web Martina Fernandez <onboarding@resend.dev>` (`CONTACT_FROM` in `src/lib/contact/mailer/resend.ts`), and Resend's shared `onboarding@resend.dev` sender only delivers to the account owner's address. Any other `CONTACT_TO` gets nothing (Resend answers 403).

Create an API key with **Sending access** permission only.

## 5. First deploy

```sh
PUBLIC_TURNSTILE_SITE_KEY=<site key> pnpm run deploy
```

Use `pnpm run deploy`, **not** `pnpm deploy`: `pnpm deploy` is pnpm's built-in workspace command and does not run this script.

`PUBLIC_TURNSTILE_SITE_KEY` is a public build-time value: Astro inlines it into the client JS (`envField` with `context: 'client'`, `access: 'public'` in `astro.config.ts`). Pass it in the shell only:

- not in `.dev.vars` (that file holds server runtime secrets for local dev);
- not in `.env` (`pnpm check:secrets` treats `.env` values as secrets and would flag it in `dist/`).

`pnpm run deploy` runs `scripts/check-deploy-env.ts`, `astro build`, the same check with `--built`, then `wrangler deploy`. The check refuses to deploy when:

- `PUBLIC_TURNSTILE_SITE_KEY` is unset or one of Cloudflare's test sitekeys;
- `site.url` is still a placeholder or malformed (step 2);
- `dist/` contains a Cloudflare test sitekey, or does not contain the sitekey from the shell (the build did not pick it up).

It never prints the sitekey.

Optional rehearsal first, which needs no login and uploads nothing:

```sh
PUBLIC_TURNSTILE_SITE_KEY=<site key> pnpm run deploy:dry
```

It writes the bundled Worker to `tmp/deploy-dry-run/`. Note that wrangler contacts registry.npmjs.org for its update check even in a dry run.

## 6. Set the Worker secrets

Names exactly as in `astro.config.ts`. Each command prompts for the value:

```sh
pnpm wrangler secret put MAILER                # resend
pnpm wrangler secret put CONTACT_TO            # martinafernandez170404@gmail.com
pnpm wrangler secret put RESEND_API_KEY        # the key from step 4
pnpm wrangler secret put TURNSTILE_SECRET_KEY  # the secret key from step 3
```

Do **not** set `CONTACT_ALLOW_TEST_CONFIG` in production. It re-enables the console mailer and the Turnstile test keys, which are for local dev and e2e only.

[Unverified] Each `secret put` creates a new Worker version, so no redeploy is needed.

Never paste secrets into committed files. `.env*` (except `.env.example`) and `.dev.vars*` are git-ignored.

## 7. Smoke test

1. Open the site in English (`/`) and Spanish (`/es/`) and submit the contact form once in each.
2. Expect the success state, and an email in martinafernandez170404@gmail.com from `Web Martina Fernandez <onboarding@resend.dev>`. Check spam the first time.
3. Hit Reply: the Reply-To is the visitor's address.

On failure the visitor sees the failure block with a mailto link to `site.email`. That is the intended fail-closed behavior. To find the cause:

```sh
pnpm wrangler tail
```

or Workers, Observability logs in the dashboard (enabled by `"observability"` in `wrangler.jsonc`). Look for lines starting with `[contact] rejected:`:

| Log line                                                    | Likely cause                                                                                  |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `rejected: config MAILER=console outside local dev ...`     | `MAILER` secret not set to `resend` (step 6)                                                  |
| `rejected: config ... Cloudflare test secret/sitekey ...`   | Test Turnstile keys in production (steps 3, 5, 6)                                             |
| `rejected: config PUBLIC_TURNSTILE_SITE_KEY is a test ...`  | Deployed without the shell sitekey; redeploy with step 5                                      |
| `rejected: mailer_config ...`                               | `CONTACT_TO` or `RESEND_API_KEY` missing                                                      |
| `rejected: send_failed resend 403`                          | `CONTACT_TO` is not the Resend account owner's address (step 4), or the API key lacks sending |
| `rejected: turnstile_error TURNSTILE_SECRET_KEY is not set` | `TURNSTILE_SECRET_KEY` secret missing (step 6)                                                |
| `rejected: turnstile ...`                                   | `site.url` host does not match the Turnstile widget hostname or the served host (steps 2, 3)  |

## Later

### a. Custom domain (DEPLOY-01)

1. Workers, your Worker, Settings, Domains and Routes: add the custom domain.
2. Set `site.url` in `src/data/site.ts` to it and commit.
3. Add the hostname to the Turnstile widget.
4. Redeploy with step 5.

The Action binds Turnstile to one hostname (`site.url`), so after the switch the form on the workers.dev URL fails closed. Consider disabling the workers.dev route.

### b. Verified sending domain (DEPLOY-02)

1. Verify the domain in Resend (it gives DNS records to add).
2. Change `CONTACT_FROM` in `src/lib/contact/mailer/resend.ts` to an address on that domain (this resolves its `TODO(martina)`).
3. Redeploy. `CONTACT_TO` can then be any inbox.

Alternative: Cloudflare Email Routing's `send_email` binding to a verified destination address, once the domain is on Cloudflare.

### c. Git-connected Workers Builds (DEPLOY-03) [Unverified setup outline]

1. Connect the repository in the Worker's Builds settings.
2. Build command: `node scripts/check-deploy-env.ts && pnpm build && node scripts/check-deploy-env.ts --built`, with `PUBLIC_TURNSTILE_SITE_KEY` as a build variable.
3. Deploy command: `npx wrangler deploy`.
4. To refresh projects, trigger a deploy hook or scheduled rebuild after a `pnpm sync:behance` commit.
