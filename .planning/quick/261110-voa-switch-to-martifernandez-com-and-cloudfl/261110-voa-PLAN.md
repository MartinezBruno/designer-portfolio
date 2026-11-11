---
phase: quick-261110-voa
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/data/site.ts
  - tests/unit/routes.test.ts
  - tests/unit/deploy-env.test.ts
  - scripts/deploy-env.ts
  - scripts/spanish-review.ts
  - tests/unit/spanish-review.test.ts
  - .planning/phases/08-quality-verification/08-SPANISH-REVIEW.md
  - wrangler.jsonc
  - astro.config.ts
  - src/actions/index.ts
  - src/cloudflare-workers.d.ts
  - src/lib/contact/deploy-guard.ts
  - src/lib/contact/mailer/types.ts
  - src/lib/contact/mailer/index.ts
  - src/lib/contact/mailer/cloudflare.ts
  - src/lib/contact/mailer/resend.ts
  - src/lib/contact/mailer/console.ts
  - tests/unit/contact-mailer.test.ts
  - tests/unit/contact-mailer-cloudflare.test.ts
  - tests/unit/contact-deploy-guard.test.ts
  - docs/DEPLOY.md
  - .env.example
autonomous: true
requirements: [QUICK-261110-voa, DEPLOY-01, DEPLOY-02]

must_haves:
  truths:
    - "site.url is https://martifernandez.com, so canonical/hreflang/OG URLs and the contact Action's Turnstile hostname binding use martifernandez.com"
    - "The Spanish-review non-copy TODO list no longer lists the real-domain, `.example` placeholder or DEPLOY-02 sending-domain items, and 08-SPANISH-REVIEW.md is regenerated (freshness test green)"
    - "The built dist/server/wrangler.json keeps the custom-domain route for martifernandez.com and a send_email binding EMAIL restricted to destination martinafernandez170404@gmail.com and sender web@martifernandez.com; `wrangler deploy --dry-run` accepts it without login"
    - "With MAILER=cloudflare the Action sends one plain-text email through env.EMAIL from `Web Martina Fernandez <web@martifernandez.com>` to CONTACT_TO with replyTo = visitor email; a missing binding or CONTACT_TO is a mailer_config failure (visitor sees the failure block), never a false success"
    - "MAILER=cloudflare passes the deploy guard like resend; MAILER=console (e2e) never imports `cloudflare:workers` nor touches the binding; resend still works"
    - "Errors thrown by the cloudflare mailer contain no visitor data (no name, email, message, subject)"
    - "docs/DEPLOY.md makes Cloudflare Email the primary path (Email Routing + destination verification + Turnstile hostname + 3 secrets) with Resend as an alternative section"
    - "No wrangler login/deploy (non dry-run)/secret put, no Cloudflare/Resend API calls, no new dependencies"
  artifacts:
    - path: "src/lib/contact/mailer/cloudflare.ts"
      provides: "Cloudflare send_email mailer"
      exports: ["CLOUDFLARE_FROM", "createCloudflareMailer", "isSendEmailBinding", "buildCloudflareMessage"]
    - path: "src/cloudflare-workers.d.ts"
      provides: "Minimal ambient type for `cloudflare:workers` (only if astro check cannot resolve it, see Task 2)"
    - path: "tests/unit/contact-mailer-cloudflare.test.ts"
      provides: "Mailer, factory and wrangler parity tests"
    - path: "wrangler.jsonc"
      provides: "routes (custom domain) + send_email EMAIL binding"
      contains: "send_email"
  key_links:
    - from: "src/actions/index.ts"
      to: "cloudflare:workers env.EMAIL"
      via: "dynamic import only when MAILER === 'cloudflare', narrowed with isSendEmailBinding, passed to createMailer"
      pattern: "import\\('cloudflare:workers'\\)"
    - from: "src/lib/contact/mailer/index.ts"
      to: "createCloudflareMailer"
      via: "MAILER=cloudflare branch, throws on missing binding / CONTACT_TO"
      pattern: "MAILER=cloudflare requires"
    - from: "wrangler.jsonc allowed_sender_addresses"
      to: "CLOUDFLARE_FROM.email"
      via: "unit parity test reads wrangler.jsonc"
      pattern: "web@martifernandez.com"
---

<objective>
[Proposed] Move the site to its real domain `martifernandez.com` (Cloudflare Registrar, zone in the same account as the Worker) and switch contact email delivery from Resend to Cloudflare's `send_email` Worker binding, keeping Resend as a working alternative.

User decision (Spanish, verbatim): "Podríamos usar todo aquí... no usar otro servicio extra".

Purpose: The first real deploy should serve martifernandez.com with a working contact form that emails martinafernandez170404@gmail.com without a third-party email vendor.
Output: site.url + test updates + review-list cleanup, wrangler custom domain + EMAIL binding, `cloudflare` mailer with tests, updated runbook and .env.example, SUMMARY.

Hard limits for the executor: do NOT run `wrangler login`, `wrangler deploy` without `--dry-run`, `wrangler secret put`, `pnpm run deploy`, `wrangler types` that hits the network, or any Cloudflare/Resend API call. No new dependencies (no `@cloudflare/workers-types`). No visual UI change (config, server code, docs), so the taste-skill gate and the 08-17 LCP re-measure do not apply; state this in the SUMMARY.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md
@.planning/STATE.md
@.planning/quick/261110-v6r-prepare-cloudflare-deploy-and-contact-em/261110-v6r-SUMMARY.md
@astro.config.ts
@wrangler.jsonc
@src/actions/index.ts
@src/lib/contact/mailer/index.ts
@src/lib/contact/mailer/resend.ts
@src/lib/contact/mailer/types.ts
@src/lib/contact/deploy-guard.ts
@scripts/spanish-review.ts
@docs/DEPLOY.md
@.env.example

<interfaces>
Facts gathered while planning (read from the repo and node_modules on 2026-11-10):

- UNCOMMITTED working-tree changes to keep and amend (do not revert): `src/data/site.ts` lines 17-18 are `// TODO(martina): real domain (workers.dev until then)` / `url: 'https://designer-portfolio.martinafernandez170404.workers.dev',`; `tests/unit/routes.test.ts` absoluteFor expects that workers.dev URL (`/` and `/es/`); `tests/unit/deploy-env.test.ts:170` test is `'passes on the committed workers.dev site.url with a real-format key'` expecting exit 0. `.planning/HANDOFF-phase-8-9.md` and `.planning/v1.0-MILESTONE-AUDIT.md` are untracked user files: never stage them.
- Spanish-review mechanism: `scripts/spanish-review.ts` `NON_COPY_TODOS` (5 items) = `src/data/site.ts:17` (real domain), `src/components/sections/Hero.astro:10`, `src/lib/contact/mailer/resend.ts:12` (DEPLOY-02 sending domain), `astro.config.ts:76` (brand fonts), `src/data/site.ts:17-18` (`.example` placeholder WR-04). `tests/unit/spanish-review.test.ts`: line ~100 `expect(NON_COPY_TODOS).toHaveLength(5)`, line ~102 `expect(review).toContain('.example')`, `NON_COPY_TODO_FILES` (line ~144) includes `src/data/site.ts` and `src/lib/contact/mailer/resend.ts` and asserts each contains `TODO(martina)`; every `file:line` location must point at a line containing `TODO(martina)`; freshness test requires `.planning/phases/08-quality-verification/08-SPANISH-REVIEW.md` to equal `buildSpanishReview()` (regenerate with `pnpm review:spanish`). Copy rows are untouched by this plan; only the "Non-copy TODO(martina)" section changes.
- `scripts/deploy-env.ts:15` `const RUNBOOK = 'docs/DEPLOY.md step 2'`, line 23 message says "set it to the workers.dev URL or the real domain". `siteUrlProblem('https://martinafernandez.com')` already passes (test line 38), so `https://martifernandez.com` passes too.
- Env schema (astro.config.ts): `MAILER: envField.enum({ context: 'server', access: 'secret', values: ['console', 'resend'], default: 'console' })`. Comment block above explains server vars are optional on purpose and validated by createMailer.
- `src/lib/contact/mailer/types.ts`: `Mailer { readonly name: 'console' | 'resend'; readonly to: string; send(email: ContactEmail): Promise<void> }`, `ContactEmail { to; replyTo; subject; text }`.
- `src/lib/contact/mailer/index.ts`: `MailerEnv { MAILER: 'console' | 'resend'; CONTACT_TO; RESEND_API_KEY }`, `createMailer(env, fetchFn)`, `present()` treats '' as unset, errors `'MAILER=resend requires RESEND_API_KEY'` / `'MAILER=resend requires CONTACT_TO'`.
- `src/lib/contact/deploy-guard.ts`: `ContactConfig.mailer: 'console' | 'resend'`; message `'MAILER=console outside local dev (set MAILER=resend for a deploy)'` (test matches `/MAILER=console/` only).
- `src/lib/contact/submit.ts`: `deps.mailer(): Mailer` is SYNC and called inside try/catch -> `fail('mailer_config', error.message)`; `mailer.send` rejection -> `send_failed` with error.message logged. So mailer error messages reach Worker logs: they must never contain visitor data.
- `src/actions/index.ts`: imports `CONTACT_ALLOW_TEST_CONFIG, CONTACT_TO, MAILER, RESEND_API_KEY, TURNSTILE_SECRET_KEY` from `astro:env/server`; `mailer: () => createMailer({ MAILER, CONTACT_TO, RESEND_API_KEY }, fetch)`. No test imports `src/actions/index.ts` (grep verified), and nothing in src imports `cloudflare:workers` today.
- Types: `@cloudflare/workers-types` is NOT installed (only a devDependency of the adapter, absent from node_modules/.pnpm) and the adapter ships no `declare module 'cloudflare:workers'`. So `astro check` will most likely fail with TS2307 on `import('cloudflare:workers')` [Inference]. Plan: a minimal ambient declaration `declare module 'cloudflare:workers' { export const env: Readonly<Record<string, unknown>>; }` and runtime narrowing with a type guard (no `any`, no cast). The real binding's `send` also accepts a raw `EmailMessage`; our structural `SendEmailBinding` interface is the documented builder subset.
- Local simulation (miniflare 5.20261019, `dist/src/workers/email/send_email.worker.js`): supports the builder form `send({ from, to, replyTo, subject, text, html? })`, returns `{ messageId }`, writes an `.eml` temp file and logs "send_email binding called with the following message"; throws `email to <addr> not allowed` / `email from <addr> not allowed` when outside `destination_address` / `allowed_sender_addresses`. Miniflare marks send_email as "local-and-remote"; local is the default unless `"remote": true`.
- Wrangler 4.151.2 config schema, `send_email[]` item: `name` (required), `destination_address`, `allowed_destination_addresses`, `allowed_sender_addresses`, `remote`. `workers_dev` default true; `preview_urls` default false. `routes[]` supports `{ "pattern": "...", "custom_domain": true }`.
- 261110-v6r findings: adapter writes `dist/server/wrangler.json` (merged config; observability survived), `.wrangler/deploy/config.json` redirects plain `wrangler deploy`; `WRANGLER_SEND_METRICS=false pnpm exec wrangler deploy --dry-run --outdir tmp/deploy-dry-run` exits 0 without login (only network use: npm update check). Shared build lock `tmp/build-e2e.lock` (mkdir, `owner` file); e2e preview on port 4400; `scripts/e2e-preview-env.ts` writes `MAILER=console` + `CONTACT_ALLOW_TEST_CONFIG=true` into dist/server/.dev.vars.
- pnpm `deploy` is a pnpm built-in: docs always say `pnpm run deploy`.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Real domain in site.ts, review-list cleanup, wrangler custom domain + EMAIL binding</name>
  <files>src/data/site.ts, tests/unit/routes.test.ts, tests/unit/deploy-env.test.ts, scripts/deploy-env.ts, scripts/spanish-review.ts, tests/unit/spanish-review.test.ts, .planning/phases/08-quality-verification/08-SPANISH-REVIEW.md, src/lib/contact/mailer/resend.ts, wrangler.jsonc</files>
  <action>
    1. `src/data/site.ts` (amend the uncommitted edit): `url: 'https://martifernandez.com'`. The real-domain TODO is now resolved, so update the review mechanism properly instead of keeping a fake TODO: replace the comment line 17 with a plain comment, e.g. `// Real domain (Cloudflare Registrar). Also the contact Action's Turnstile hostname binding.` (no `TODO(martina)`).
    2. Tests that hard-code the URL: `tests/unit/routes.test.ts` absoluteFor expects `https://martifernandez.com/` and `https://martifernandez.com/es/` (single-line `toBe` if Prettier allows). `tests/unit/deploy-env.test.ts`: rename the CLI case to `'passes on the committed site.url with a real-format key'` (still exit 0, key never echoed); add `'https://martifernandez.com'` to the passing `siteUrlProblem` cases. Grep `martinafernandez.example|workers\.dev|martinafernandez\.com` across src, scripts, tests (excluding the deploy-env placeholder/negative cases that intentionally test `.example` and generic workers.dev hosts) and update any other hard-coded site URL. `scripts/deploy-env.ts`: keep behavior; only reword the fix hint to "set it to the real domain (https, no trailing slash)" and point `RUNBOOK` at the runbook step that now covers site.url (keep in sync with Task 3's numbering; if unsure use `'docs/DEPLOY.md'`).
    3. Review list: in `scripts/spanish-review.ts` `NON_COPY_TODOS`, remove the `src/data/site.ts:17` (real domain) and `src/data/site.ts:17-18` (`.example` WR-04) items, and the `src/lib/contact/mailer/resend.ts:12` DEPLOY-02 item (DEPLOY-02 is resolved by sending from `web@martifernandez.com` via Cloudflare Email Routing; what remains for Martina is a dashboard step documented in docs/DEPLOY.md, not code). In `src/lib/contact/mailer/resend.ts` replace `// TODO(martina): verified sending domain (DEPLOY-02)` with a plain comment: Resend is the alternative provider (MAILER=resend); to use it with any CONTACT_TO, verify martifernandez.com in Resend and change CONTACT_FROM (docs/DEPLOY.md, Resend alternative). Keep `CONTACT_FROM` value unchanged (tests pin it). In `tests/unit/spanish-review.test.ts`: `toHaveLength(2)`; replace `expect(review).toContain('.example')` with `expect(review).not.toContain('martinafernandez.example')`; drop `src/data/site.ts` and `src/lib/contact/mailer/resend.ts` from `NON_COPY_TODO_FILES`. Run `pnpm review:spanish` to regenerate 08-SPANISH-REVIEW.md, then `git diff --stat` on it must show only the non-copy section changed (if copy rows change, stop and report).
    4. `wrangler.jsonc` (keep header comments and JSONC trailing-comma style, Prettier-clean). Add, each with a one-line comment:
       - `"routes": [{ "pattern": "martifernandez.com", "custom_domain": true }]` (Cloudflare creates the DNS record and certificate on deploy because the zone is in the same account).
       - `"workers_dev": true` explicit (decision: keep the workers.dev URL as a fallback to check a deploy; the contact form there fails closed because Turnstile is bound to site.url's host; docs explain how to disable it later).
       - www decision: do NOT add `www.martifernandez.com` as a second custom domain (it would serve a duplicate host whose form fails closed). Task 3 documents an optional dashboard Redirect Rule www -> apex instead (no code).
       - `"send_email": [{ "name": "EMAIL", "destination_address": "martinafernandez170404@gmail.com", "allowed_sender_addresses": ["web@martifernandez.com"] }]` (comment: free on Workers Free when sending to a verified destination address; restricted to one recipient and one sender so a compromised Action cannot mail anyone else). Do not set `remote` (local dev/preview simulate and log only).
    5. Run `pnpm test` and `pnpm lint`.
  </action>
  <verify>
    <automated>cd /Users/bmartinez/Developer/personal/designer-portfolio && grep -q "url: 'https://martifernandez.com'" src/data/site.ts && ! grep -q "TODO(martina)" src/data/site.ts && ! grep -q "TODO(martina)" src/lib/contact/mailer/resend.ts && grep -q '"custom_domain": true' wrangler.jsonc && grep -q '"destination_address": "martinafernandez170404@gmail.com"' wrangler.jsonc && test -z "$(grep -rln 'martinafernandez.example\|designer-portfolio.martinafernandez170404' src tests/unit/routes.test.ts)" && pnpm test && pnpm lint</automated>
  </verify>
  <done>site.url is https://martifernandez.com; routes/deploy-env/spanish-review tests updated and green; NON_COPY_TODOS has 2 items and the review file is regenerated (only the non-copy section changed); wrangler.jsonc has the custom-domain route, explicit workers_dev, and the restricted EMAIL binding; lint clean.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: `cloudflare` mailer, factory, guard, env schema and lazy binding in the Action</name>
  <files>src/lib/contact/mailer/cloudflare.ts, src/lib/contact/mailer/types.ts, src/lib/contact/mailer/index.ts, src/lib/contact/mailer/console.ts, src/lib/contact/deploy-guard.ts, astro.config.ts, src/actions/index.ts, src/cloudflare-workers.d.ts, tests/unit/contact-mailer-cloudflare.test.ts, tests/unit/contact-mailer.test.ts, tests/unit/contact-deploy-guard.test.ts</files>
  <behavior>
    - buildCloudflareMessage(email) returns exactly `{ from: { email: 'web@martifernandez.com', name: 'Web Martina Fernandez' }, to: email.to, replyTo: email.replyTo, subject: email.subject, text: email.text }` and has no `html` key.
    - createCloudflareMailer({ binding, to }) returns `name: 'cloudflare'`, `to`; `send` calls `binding.send` exactly once with buildCloudflareMessage's output and resolves.
    - When `binding.send` rejects with an Error whose message contains the visitor's email, name and message text, `send` rejects with an Error whose message is `cloudflare email send failed` plus at most the original error's `name` (e.g. `(Error)`), and contains none of the visitor's email, name, message or subject.
    - isSendEmailBinding: true for `{ send: () => Promise.resolve({ messageId: 'x' }) }`; false for undefined, null, `{}`, `{ send: 'x' }`, a string.
    - createMailer({ MAILER: 'cloudflare', CONTACT_TO: 'a@b.co', RESEND_API_KEY: undefined }, fetchFn, { emailBinding: fake }) returns the cloudflare mailer and never calls fetchFn.
    - MAILER=cloudflare with `emailBinding` undefined throws `MAILER=cloudflare requires the EMAIL send_email binding`; with CONTACT_TO undefined or '' throws `MAILER=cloudflare requires CONTACT_TO`. Neither message contains the CONTACT_TO value.
    - Existing console and resend factory behavior unchanged (existing tests keep passing; createMailer's third argument is optional).
    - contactConfigProblem allows `mailer: 'cloudflare'` with a real secret and real sitekey (undefined), refuses console outside local dev with a message naming `MAILER=cloudflare` as the deploy value.
    - Parity: the raw text of wrangler.jsonc contains `CLOUDFLARE_FROM.email` inside `allowed_sender_addresses` and contains `"name": "EMAIL"`.
  </behavior>
  <action>
    1. RED: create `tests/unit/contact-mailer-cloudflare.test.ts` covering the behavior block (fake binding records calls; the parity case uses `readFileSync('wrangler.jsonc', 'utf8')` and a regex, not a JSONC parser). Add the guard cases to `tests/unit/contact-deploy-guard.test.ts`. Run `pnpm test -- tests/unit/contact-mailer-cloudflare.test.ts tests/unit/contact-deploy-guard.test.ts` and confirm it fails.
    2. GREEN, `src/lib/contact/mailer/cloudflare.ts` (header comment listing invariants like resend.ts: fixed sender, plain text only, no SDK, binding injected so tests never import `cloudflare:workers`, errors never carry visitor data or the provider's message because it may echo addresses). Export `CLOUDFLARE_FROM = { name: 'Web Martina Fernandez', email: 'web@martifernandez.com' } as const` (the single place for the sender), interfaces `CloudflareEmailMessage` (from {email,name}, to, replyTo, subject, text) and `SendEmailBinding { send(message: CloudflareEmailMessage): Promise<unknown> }`, `isSendEmailBinding(value: unknown): value is SendEmailBinding` (typeof object, non-null, `'send' in value`, typeof function), `buildCloudflareMessage`, `createCloudflareMailer({ binding, to })`. In `send`, wrap the binding call in try/catch and rethrow `new Error(\`cloudflare email send failed (${name})\`)` using only `error.name` when it is an Error. Do not add `html`, attachments or custom headers.
    3. `types.ts`: `name: 'console' | 'resend' | 'cloudflare'` (update the doc comment). `index.ts`: `MailerEnv.MAILER` gains `'cloudflare'`; new optional third param `deps: { emailBinding?: SendEmailBinding | undefined } = {}`; cloudflare branch checks binding first, then CONTACT_TO via `present()`, then `createCloudflareMailer`. Update the header comment (fails loudly for resend and cloudflare). `console.ts`: update the comment "Production uses MAILER=resend" to name cloudflare (primary) or resend. `deploy-guard.ts`: `ContactConfig.mailer` union gains `'cloudflare'`; console message becomes `MAILER=console outside local dev (set MAILER=cloudflare, or resend, for a deploy)`.
    4. `astro.config.ts`: `values: ['console', 'resend', 'cloudflare']`. Add the comment ON THE SAME LINE or replace an existing comment line so line 76 (`// TODO(martina): brand fonts pending`) does not move (NON_COPY_TODOS pins `astro.config.ts:76`; the spanish-review test fails otherwise). Verify with `sed -n 76p astro.config.ts`.
    5. `src/actions/index.ts`: add `async function loadEmailBinding(): Promise<SendEmailBinding | undefined>` that does `const { env } = await import('cloudflare:workers')` and returns `env['EMAIL']` only if `isSendEmailBinding` passes, else undefined. In the handler, after the config guard and before `submitContact`, resolve `const emailBinding = MAILER === 'cloudflare' ? await loadEmailBinding() : undefined;` inside try/catch: on import failure log `console.error('[contact] rejected: mailer_config', 'cloudflare:workers unavailable')` and `throw sendFailed()`. Pass `createMailer({ MAILER, CONTACT_TO, RESEND_API_KEY }, fetch, { emailBinding })`. MAILER=console/resend must never execute the dynamic import (e2e uses console). Update the file header comment (secrets from astro:env/server; the EMAIL binding from cloudflare:workers, only for MAILER=cloudflare).
    6. Types: run `pnpm check`. If it reports TS2307 for `cloudflare:workers`, create `src/cloudflare-workers.d.ts` with a header comment (why: @cloudflare/workers-types is not a dependency; minimal surface; values are narrowed at runtime) and `declare module 'cloudflare:workers' { export const env: Readonly<Record<string, unknown>>; }`. If `astro check` already resolves the module, do not create the file and record that in the SUMMARY. Never use `any` or `as` casts to silence it.
    7. GREEN: run the new and existing contact tests, then `pnpm test` and `pnpm lint`.
  </action>
  <verify>
    <automated>cd /Users/bmartinez/Developer/personal/designer-portfolio && pnpm test -- tests/unit/contact-mailer-cloudflare.test.ts tests/unit/contact-mailer.test.ts tests/unit/contact-deploy-guard.test.ts tests/unit/spanish-review.test.ts && grep -q "'cloudflare'" astro.config.ts && sed -n 76p astro.config.ts | grep -q "TODO(martina): brand fonts" && grep -q "import('cloudflare:workers')" src/actions/index.ts && test "$(grep -rl 'cloudflare:workers' tests || true)" = "" && pnpm test && pnpm lint</automated>
  </verify>
  <done>New mailer and factory/guard tests pass; MAILER enum includes cloudflare; the Action imports `cloudflare:workers` lazily only for MAILER=cloudflare; no test imports `cloudflare:workers`; astro.config.ts line 76 unchanged; `pnpm test` and `pnpm lint` (incl. astro check) green.</done>
</task>

<task type="auto">
  <name>Task 3: Build + dry-run + contact e2e proof, runbook and .env.example, commits, SUMMARY</name>
  <files>docs/DEPLOY.md, .env.example</files>
  <action>
    1. Proof under the shared lock: `mkdir tmp/build-e2e.lock` and write `quick-261110-voa $(date +%s)` to `tmp/build-e2e.lock/owner` (if taken, wait with a Monitor/background until-loop; never delete another owner's lock). Holding it:
       a. `pnpm build 2>&1 | tee tmp/quick-261110-voa-build.log` (default env).
       b. `dist/server/wrangler.json` must contain the route (`"custom_domain":true` with `martifernandez.com`), `"workers_dev":true`, and the `send_email` entry with `EMAIL`, the destination and `web@martifernandez.com` (grep each; whitespace-insensitive). If the adapter drops any of them, stop and report (do not hand-edit dist).
       c. `WRANGLER_SEND_METRICS=false pnpm exec wrangler deploy --dry-run --outdir tmp/deploy-dry-run 2>&1 | tee tmp/quick-261110-voa-dryrun.log`: must exit 0 without a login prompt and list the EMAIL send-email binding. Record the binding/route lines from the log in the SUMMARY. If dry-run rejects the config, fix wrangler.jsonc (Task 1 file) and repeat; if it demands login, report.
       d. Contact e2e (the Action changed): run `pnpm exec playwright test tests/e2e/contact.spec.ts tests/e2e/contact-server.spec.ts tests/e2e/contact-states.spec.ts tests/e2e/contact-lazy.spec.ts tests/e2e/contact-preselect.spec.ts` against the existing build (playwright webServer uses port 4400 and writes MAILER=console via scripts/e2e-preview-env.ts). Also run `tests/e2e/seo.spec.ts` (canonical URLs read site.url). Confirm `astro preview` starts with the send_email binding present (no remote/login error in the webServer output). All must pass.
       e. `pnpm check:secrets`. Release the lock: `rm -rf tmp/build-e2e.lock` (also on failure).
    2. `docs/DEPLOY.md` rewrite for the Cloudflare path (English, numbered, same plain style; label anything not run here [Unverified]):
       - Intro: deploy to `https://martifernandez.com` (Worker `designer-portfolio`), contact email to martinafernandez170404@gmail.com via Cloudflare Email (no extra vendor).
       - Step: log in (`pnpm wrangler login`).
       - Step: domain. site.url is already `https://martifernandez.com` (src/data/site.ts) and wrangler.jsonc has the custom-domain route; Cloudflare creates the DNS record and certificate on the first deploy [Unverified]. workers.dev stays on as a fallback URL (form fails closed there); to turn it off later set `"workers_dev": false`. Optional www: add a proxied DNS record for `www` and a Rules -> Redirect Rules entry `www.martifernandez.com/*` -> `https://martifernandez.com/${1}` 301 [Unverified], instead of a second custom domain.
       - Step: Turnstile widget, hostname `martifernandez.com` (optionally the workers.dev host too), Managed; copy site key and secret.
       - Step: Cloudflare Email: (1) Email -> Email Routing on martifernandez.com -> enable and let Cloudflare add the MX/SPF/DKIM DNS records; (2) Destination addresses -> add martinafernandez170404@gmail.com -> Martina clicks the verification email (sending fails until verified); (3) optional routing rule `hola@martifernandez.com` -> her Gmail for a public address. Explain the binding in wrangler.jsonc (EMAIL, restricted to that destination and to sender `web@martifernandez.com`), that it is free on Workers Free when sending to a verified destination, and that the sender `Web Martina Fernandez <web@martifernandez.com>` lives in `CLOUDFLARE_FROM` (src/lib/contact/mailer/cloudflare.ts) and must match `allowed_sender_addresses`.
       - Step: first deploy `PUBLIC_TURNSTILE_SITE_KEY=<site key> pnpm run deploy` (keep the existing explanation; never `pnpm deploy`; `pnpm run deploy:dry` optional).
       - Step: secrets: `MAILER` = `cloudflare`, `CONTACT_TO` = martinafernandez170404@gmail.com (must equal the binding's destination_address), `TURNSTILE_SECRET_KEY`. `RESEND_API_KEY` not needed. Keep the `CONTACT_ALLOW_TEST_CONFIG` must-not-set warning.
       - Smoke test: EN and /es/; expect mail from `Web Martina Fernandez <web@martifernandez.com>` with Reply-To = visitor. Troubleshooting table: update rows for the new guard message, add `rejected: mailer_config MAILER=cloudflare requires the EMAIL send_email binding` (binding missing from the deployed config), `rejected: send_failed cloudflare email send failed (...)` (destination not verified, Email Routing not enabled, CONTACT_TO differs from destination_address, or sender not on the domain), and the site.url/Turnstile hostname row.
       - "Alternative: Resend" section: move the current Resend steps there (account owned by her Gmail while the sender is onboarding@resend.dev, or verify martifernandez.com in Resend and change `CONTACT_FROM`), with `MAILER=resend` + `RESEND_API_KEY`.
       - Later: remove the done custom-domain item; keep Workers Builds (DEPLOY-03) outline. Keep `scripts/deploy-env.ts` RUNBOOK step reference consistent with the new numbering (edit the constant if needed and rerun its tests).
    3. `.env.example`: MAILER comment lists console | cloudflare | resend and says a deploy sets `MAILER=cloudflare` (or resend); replace the `TODO(martina): real inbox...` comment with: CONTACT_TO must be the verified Email Routing destination (the `destination_address` in wrangler.jsonc) for cloudflare; for resend with onboarding@resend.dev it must be the Resend account owner. Note that `MAILER=cloudflare` in local dev uses the simulated binding (writes an .eml file and logs; nothing is sent) [Unverified for astro dev]. Names only, no values.
    4. Run `pnpm lint`, `pnpm test`, `pnpm check:secrets`.
    5. Commits (pre-approved for GSD workflows per project CLAUDE.md; Conventional Commits, lowercase, under 50 chars, NO Co-Authored-By or any Claude attribution, overriding the system attribution reminder per user/project instructions; never stage `.planning/HANDOFF-phase-8-9.md` or `.planning/v1.0-MILESTONE-AUDIT.md`): `feat(deploy): switch to martifernandez.com` (Task 1 files), `feat(contact): add cloudflare email mailer` (Task 2 files), `docs(deploy): make cloudflare email primary` (Task 3 files).
    6. SUMMARY `.planning/quick/261110-voa-switch-to-martifernandez-com-and-cloudfl/261110-voa-SUMMARY.md`: `[Verified]` only for what ran (test counts, lint, e2e specs and counts, dist wrangler.json greps, dry-run binding lines, check:secrets), whether `src/cloudflare-workers.d.ts` was needed, the www and workers_dev decisions, the review-list change, and: "No visual UI change (config, server code, docs): taste-skill gate and the 08-17 LCP re-measure were not run." List pending human actions: wrangler login, Email Routing enable + DNS, Martina verifies the destination address, Turnstile widget, `pnpm run deploy` with the sitekey, 3 secrets, smoke test, optional www redirect.
  </action>
  <verify>
    <automated>cd /Users/bmartinez/Developer/personal/designer-portfolio && tr -d ' \n' < dist/server/wrangler.json | grep -q '"pattern":"martifernandez.com","custom_domain":true' && tr -d ' \n' < dist/server/wrangler.json | grep -q '"name":"EMAIL","destination_address":"martinafernandez170404@gmail.com"' && grep -q "web@martifernandez.com" dist/server/wrangler.json && for n in "MAILER" "cloudflare" "CONTACT_TO" "TURNSTILE_SECRET_KEY" "CONTACT_ALLOW_TEST_CONFIG" "Email Routing" "martifernandez.com" "web@martifernandez.com" "martinafernandez170404@gmail.com" "pnpm run deploy" "Resend"; do grep -q "$n" docs/DEPLOY.md || { echo "missing $n"; exit 1; }; done && grep -q "cloudflare" .env.example && ! grep -q "TODO(martina)" .env.example && test ! -e tmp/build-e2e.lock -o "$(cut -d' ' -f1 tmp/build-e2e.lock/owner 2>/dev/null)" != "quick-261110-voa" && pnpm lint && pnpm test && pnpm check:secrets && test -f .planning/quick/261110-voa-switch-to-martifernandez-com-and-cloudfl/261110-voa-SUMMARY.md</automated>
  </verify>
  <done>Built wrangler.json keeps route + EMAIL binding; dry-run exits 0 without login and lists EMAIL; the 5 contact specs and seo.spec pass with the binding configured; runbook and .env.example describe Cloudflare Email as primary and Resend as alternative; lint/test/check:secrets green; three commits without attribution; SUMMARY written; lock released.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| visitor form -> Action | name/email/message are untrusted; email becomes replyTo |
| Action -> EMAIL binding | Worker can send mail as web@martifernandez.com |
| Worker logs | mailer errors reach logs via submit.ts |
| repo -> deployed Worker | wrangler.jsonc config uploaded with the bundle |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-q261110voa-01 | Elevation / abuse (open relay) | send_email binding | mitigate | `destination_address` = her Gmail and `allowed_sender_addresses` = web@martifernandez.com in wrangler.jsonc; recipient only from CONTACT_TO, never input (D-21) |
| T-q261110voa-02 | Information disclosure | cloudflare mailer errors in Worker logs | mitigate | Rethrow a fixed message with only `error.name`; unit test asserts no visitor email/name/message/subject in the error |
| T-q261110voa-03 | Tampering (header injection) | replyTo / subject | mitigate | Existing zod email validation and `sanitizeHeader` in email.ts; the binding receives structured fields, not raw MIME |
| T-q261110voa-04 | Denial (false success) | missing binding or CONTACT_TO | mitigate | createMailer throws -> `mailer_config` -> visitor gets failure block + mailto; deploy guard still refuses console/test keys |
| T-q261110voa-05 | Spoofing (bot spam) | Turnstile on new host | mitigate | Action binds verdicts to `new URL(site.url).hostname` = martifernandez.com; widget hostname documented |
| T-q261110voa-06 | Information disclosure | e2e / local runs | mitigate | e2e keeps MAILER=console; the dynamic import runs only for MAILER=cloudflare; local binding is simulated (no real send) |
| T-q261110voa-SC | Tampering | package installs | accept | No new dependencies (ambient type declaration instead of @cloudflare/workers-types) |
</threat_model>

<verification>
- `pnpm lint`, `pnpm test`, `pnpm check:secrets` green; contact e2e specs + seo.spec green.
- dist/server/wrangler.json carries the custom-domain route and the restricted EMAIL binding; dry-run accepts them without login.
- No wrangler login/deploy/secret put or Cloudflare/Resend API calls were made; no new dependencies.
</verification>

<success_criteria>
- After the documented dashboard steps and `pnpm run deploy`, martifernandez.com serves the site and contact submissions arrive at martinafernandez170404@gmail.com from web@martifernandez.com with Reply-To set to the visitor.
- Resend remains selectable with MAILER=resend.
- No visual change; taste gate and LCP re-measure skipped with rationale in SUMMARY.
</success_criteria>

<output>
Create `.planning/quick/261110-voa-switch-to-martifernandez-com-and-cloudfl/261110-voa-SUMMARY.md` when done
</output>
