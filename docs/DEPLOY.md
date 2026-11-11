# Deploy

First deploy of the site to `https://martifernandez.com` (Cloudflare Worker `designer-portfolio`), with the contact form emailing martinafernandez170404@gmail.com through Cloudflare Email (Email Routing and the Worker `send_email` binding), so no extra email vendor is needed. Resend remains available as an alternative (see the end of this file). Steps marked [Unverified] were not run while writing this runbook (no account access); everything else is backed by the repo's scripts and tests.

## Prerequisites

- Node per `.nvmrc`, then `pnpm install`.
- A Cloudflare account that holds the `martifernandez.com` zone (bought through Cloudflare Registrar).
- Access to the inbox martinafernandez170404@gmail.com: Martina has to click the destination verification email in step 4.

## 1. Log in to Cloudflare

```sh
pnpm wrangler login
```

## 2. Domain and `site.url`

Already done in the repo:

- `url` in `src/data/site.ts` is `https://martifernandez.com`.
- `wrangler.jsonc` has the route `{ "pattern": "martifernandez.com", "custom_domain": true }`. Because the zone is in the same account, Cloudflare creates the DNS record and certificate on the first deploy [Unverified].

Why it matters: canonical, hreflang and Open Graph URLs come from `site.url`, and so does the contact Action's Turnstile hostname binding. A wrong value makes every send fail closed. If you ever change it, keep it https with no trailing slash, and `pnpm test:e2e` should stay green (the e2e specs read `site.url` too). The deploy check refuses the `.example` placeholder, other reserved hosts (`.test`, `.invalid`, `.localhost`), `http://`, and URLs with a path or a trailing slash.

workers.dev stays on (`"workers_dev": true`) as a fallback URL to check a deploy: `https://designer-portfolio.<account-subdomain>.workers.dev`. Its contact form fails closed, because Turnstile is bound to `site.url`'s host. To turn it off later, set `"workers_dev": false` in `wrangler.jsonc` and redeploy.

Optional `www`: do not add `www.martifernandez.com` as a second custom domain (it would serve a duplicate host whose form fails closed). Instead [Unverified]:

1. DNS: add a proxied record for `www` (for example `AAAA www 100::`).
2. Rules, Redirect Rules: `www.martifernandez.com/*` to `https://martifernandez.com/${1}`, status 301.

## 3. Create the Turnstile widget

Dashboard, Turnstile, Add widget:

- Hostname: `martifernandez.com` (optionally also the workers.dev host, although the form there still fails closed because of the hostname binding).
- Widget mode: Managed.

Copy the **site key** (public) and the **secret key** (secret).

## 4. Set up Cloudflare Email

1. Dashboard, `martifernandez.com`, Email, Email Routing: enable it and let Cloudflare add the MX, SPF and DKIM DNS records [Unverified].
2. Email Routing, Destination addresses: add martinafernandez170404@gmail.com. Martina clicks the verification link in the email Cloudflare sends. **Sending fails until the address is verified.**
3. Optional: a routing rule such as `hola@martifernandez.com` to her Gmail, if she wants a public address on the domain.

How the code uses it:

- `wrangler.jsonc` declares the `send_email` binding `EMAIL`, restricted to the destination martinafernandez170404@gmail.com and to the sender `web@martifernandez.com`, so even a compromised Action cannot mail anyone else. Sending to a verified destination address is free on Workers Free [Documented, developers.cloudflare.com/email-routing].
- The sender `Web Martina Fernandez <web@martifernandez.com>` lives in `CLOUDFLARE_FROM` (`src/lib/contact/mailer/cloudflare.ts`). It must match `allowed_sender_addresses` in `wrangler.jsonc` (a unit test pins this).
- Mail is plain text with Reply-To set to the visitor's address.
- Locally (`astro dev`, `astro preview`) the binding is simulated: it logs the message and writes an `.eml` file; nothing is sent [Unverified for astro dev].

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

It writes the bundled Worker to `tmp/deploy-dry-run/` and lists the bindings, including `env.EMAIL (martinafernandez170404@gmail.com - senders: web@martifernandez.com)`. Note that wrangler contacts registry.npmjs.org for its update check even in a dry run.

## 6. Set the Worker secrets

Names exactly as in `astro.config.ts`. Each command prompts for the value:

```sh
pnpm wrangler secret put MAILER                # cloudflare
pnpm wrangler secret put CONTACT_TO            # martinafernandez170404@gmail.com
pnpm wrangler secret put TURNSTILE_SECRET_KEY  # the secret key from step 3
```

`CONTACT_TO` must equal the binding's `destination_address` in `wrangler.jsonc`. `RESEND_API_KEY` is not needed with `MAILER=cloudflare`.

Do **not** set `CONTACT_ALLOW_TEST_CONFIG` in production. It re-enables the console mailer and the Turnstile test keys, which are for local dev and e2e only.

[Unverified] Each `secret put` creates a new Worker version, so no redeploy is needed.

Never paste secrets into committed files. `.env*` (except `.env.example`) and `.dev.vars*` are git-ignored.

## 7. Smoke test

1. Open `https://martifernandez.com/` (English) and `/es/` (Spanish) and submit the contact form once in each.
2. Expect the success state, and an email in martinafernandez170404@gmail.com from `Web Martina Fernandez <web@martifernandez.com>`. Check spam the first time.
3. Hit Reply: the Reply-To is the visitor's address.

On failure the visitor sees the failure block with a mailto link to `site.email`. That is the intended fail-closed behavior. To find the cause:

```sh
pnpm wrangler tail
```

or Workers, Observability logs in the dashboard (enabled by `"observability"` in `wrangler.jsonc`). Look for lines starting with `[contact] rejected:`:

| Log line                                                                          | Likely cause                                                                                                                                               |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rejected: config MAILER=console outside local dev ...`                           | `MAILER` secret not set to `cloudflare` (or `resend`) (step 6)                                                                                             |
| `rejected: config ... Cloudflare test secret/sitekey ...`                         | Test Turnstile keys in production (steps 3, 5, 6)                                                                                                          |
| `rejected: config PUBLIC_TURNSTILE_SITE_KEY is a test ...`                        | Deployed without the shell sitekey; redeploy with step 5                                                                                                   |
| `rejected: mailer_config MAILER=cloudflare requires the EMAIL send_email binding` | The `send_email` binding is missing from the deployed config; redeploy from this repo (step 5)                                                             |
| `rejected: mailer_config MAILER=cloudflare requires CONTACT_TO`                   | `CONTACT_TO` secret missing (step 6)                                                                                                                       |
| `rejected: send_failed cloudflare email send failed (...)`                        | Destination not verified, Email Routing not enabled, `CONTACT_TO` differs from `destination_address`, or the sender is not on the domain (step 4)          |
| `rejected: mailer_config MAILER=resend requires ...`                              | Resend alternative only: `CONTACT_TO` or `RESEND_API_KEY` missing                                                                                          |
| `rejected: send_failed resend 403`                                                | Resend alternative only: `CONTACT_TO` is not the Resend account owner's address, or the API key lacks sending                                              |
| `rejected: turnstile_error TURNSTILE_SECRET_KEY is not set`                       | `TURNSTILE_SECRET_KEY` secret missing (step 6)                                                                                                             |
| `rejected: turnstile ...`                                                         | `site.url` host (`martifernandez.com`) does not match the Turnstile widget hostname or the served host, e.g. the form was used on workers.dev (steps 2, 3) |

## Alternative: Resend

Use this instead of step 4 if Cloudflare Email is not an option.

1. Create the Resend account **with martinafernandez170404@gmail.com**. The sender is `Web Martina Fernandez <onboarding@resend.dev>` (`CONTACT_FROM` in `src/lib/contact/mailer/resend.ts`), and Resend's shared `onboarding@resend.dev` sender only delivers to the account owner's address. Any other `CONTACT_TO` gets nothing (Resend answers 403).
2. Or verify `martifernandez.com` in Resend (it gives DNS records to add) and change `CONTACT_FROM` to an address on that domain; `CONTACT_TO` can then be any inbox.
3. Create an API key with **Sending access** permission only.
4. In step 6 set `MAILER` to `resend` and also run `pnpm wrangler secret put RESEND_API_KEY`.

## Later

### Git-connected Workers Builds (DEPLOY-03) [Unverified setup outline]

1. Connect the repository in the Worker's Builds settings.
2. Build command: `node scripts/check-deploy-env.ts && pnpm build && node scripts/check-deploy-env.ts --built`, with `PUBLIC_TURNSTILE_SITE_KEY` as a build variable.
3. Deploy command: `npx wrangler deploy`.
4. To refresh projects, trigger a deploy hook or scheduled rebuild after a `pnpm sync:behance` commit.
