# Phase 5: Contact - Research

**Researched:** 2026-10-19
**Domain:** Astro Actions on `@astrojs/cloudflare` 14 (workerd) with prerendered pages, Cloudflare Turnstile, mailer port (console and Resend), accessible progressive-enhancement forms, EN/ES
**Confidence:** HIGH for the adapter, Actions, env and tooling wiring (verified in two spikes, one on a full copy of this repo). MEDIUM for Resend (docs only, no live send). LOW for the deploy-only items, which are flagged.

## Summary

Phase 5 adds the site's first server code. The research flag asked three things. Do Astro Actions work under static output with `@astrojs/cloudflare` 14 on workerd dev? **Yes, verified.** What are the Turnstile test keys? **Verified from the official page and exercised live.** What does the Resend test sender allow? **Cited:** `onboarding@resend.dev` only delivers to the Resend account owner's address.

I installed `@astrojs/cloudflare@14.4.1` + `wrangler@4.151.2` into a full copy of this repo (`/tmp/p5real`) and added one Action. Results:
- `pnpm build:offline` passes with 0 network attempts, but **only with `prerenderEnvironment: 'node'`**. The default workerd prerenderer trips the offline guard: Miniflare does a DNS lookup of `0.0.0.0` to probe ports.
- `pnpm lint` passes.
- 458 of 459 e2e tests pass against the adapter's workerd `astro preview`. The one failure is an improvement: `/es/<miss>` now gets the Spanish 404, so the test needs updating.
- `POST /_actions/contact` works from a prerendered `/es/` page in headless Chromium, in both `astro dev` (workerd) and `astro preview`.

The spikes also hit four integration traps the plan must handle:
1. **Vitest breaks once the adapter is added.** The error is "There is already a server associated with the config". Removing the adapter under Vitest then fails with `ActionsWithoutServerOutputError`. Fix: a no-op stub adapter when `process.env.VITEST` is set. Verified: 684/684 unit tests pass.
2. **The build copies `.dev.vars` into `dist/server/.dev.vars`** (also from `.env`). The current `pnpm check:secrets` then fails. Fix: exclude that one path. `astro preview` reads secrets only from that copy. It ignores the root file and process env (with `CLOUDFLARE_INCLUDE_PROCESS_ENV=true`, process env only fills keys that file doesn't have). So e2e must write that file itself to stay deterministic.
3. **`astro:env` server vars with `access: 'public'` are inlined at build** (`var MAILER = "resend"` appeared in `dist/server`). `MAILER` must be `access: 'secret'` to be read at runtime.
4. **`astro dev` only reads the root `.dev.vars` when a root `wrangler.jsonc` exists.** A two-key file (`name`, `compatibility_date`) is enough.

On the client side:
- The Turnstile test sitekey `1x00000000000000000000AA` produced `XXXX.DUMMY.TOKEN.XXXX` in headless Chromium in about 1.6 s.
- axe found 0 WCAG 2.2 AA violations with the compact widget rendered.
- Server-side, the always-pass test secret accepted even a bogus token. The docs say otherwise. Only an empty token failed (`missing-input-response`).
- Shipping Zod to the browser costs **22.7 KB gzip**, versus 3.4 KB for the `astro:actions` client. So client validation must be a small hand-written mirror of the server schema, sharing constants and the exact email regex.

**Primary recommendation:**
- Add `@astrojs/cloudflare` 14.4.1 with `{ imageService: 'compile', prerenderEnvironment: 'node' }`, `session: false`, and an `env.schema`.
- Add a two-key root `wrangler.jsonc`.
- Add one Action, `contact` (`accept: 'form'`). Keep the handler thin: it calls a pure, injectable `submitContact()` (honeypot, then Turnstile `fetch` siteverify, then build the Spanish plain-text email, then `Mailer.send`).
- Mailers: `console` (default) and `resend` (raw `fetch`, no SDK).
- The Home Contact section ships with the form `hidden` and a mailto block visible. A lifecycle-registered script reveals the form, loads Turnstile explicitly, validates with shared rules, calls `actions.contact(formData)`, and manages focus, live regions and the mailto prefill.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Contact section markup, chips, no-JS mailto block | Static (prerendered HTML) | — | D-12: Home stays fully static and prerendered |
| Reveal form, pre-select service from `?service=`, live validation, focus, live regions, mailto prefill | Browser (lifecycle-registered script) | — | Progressive enhancement. Must survive the Phase 7 `<ClientRouter />` |
| Turnstile widget render and reset | Browser (explicit render) | Cloudflare (challenges.cloudflare.com) | Token is produced client-side only |
| Input validation (final verdict) | API (Astro Action in the Worker) | Browser mirror for UX | D-10: server verdict is final |
| Honeypot and Turnstile `siteverify` | API (Worker) | Cloudflare siteverify | CONT-02 requires server-side verification |
| Email composition (Spanish, subject, CR/LF stripping) | API (pure module) | — | D-16..D-18. Never trust client-built strings |
| Delivery (console log or Resend HTTP) | API (mailer port) | Resend API | D-20: env-selected provider |
| Secrets (`TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, `CONTACT_TO`, `MAILER`) | API runtime env (`astro:env/server`, `access: 'secret'`) | `.dev.vars` locally | Must never be inlined (verified that `public` server vars are inlined) |

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Section layout & placement
- **D-01: The form lives in a new Contact section at the end of Home**, directly above the footer. That section takes the `id="contact"` anchor, so the existing `/#contact` links (hero CTA, header nav, Phase 4 detail-page CTA) reach the form without changes.
- **D-02: The section has two columns on desktop and stacks on mobile.** One column holds a short headline/invitation, her direct email (`mailto:`), and her socials. The other holds the form. That mailto doubles as the no-JS fallback (D-12).
- **D-03: The footer stays as it is (email, socials, copyright) on every page. Only its `id="contact"` moves** to the new section (`SiteFooter.astro:22`).
- **D-04: Every "Contact" link on every page goes to Home's form**: `/#contact` (EN) and `/es/#contact` (ES), built with `getRelativeLocaleUrl(locale, '/')`. Today some links are a bare `#contact`, which would scroll to the footer on non-Home pages: the header nav (`SiteHeader.astro:53`), the Projects empty-state CTA (`ProjectsView.astro:36`), and the hero (`Hero.astro:32`, which is fine on Home but should match). Update the keyboard-order and nav e2e tests.

#### Service pre-selection (HOME-08)
- **D-05: Each service card gets an explicit text link with an arrow at the bottom** (draft copy: EN "Ask about this", ES "Consultar", final wording up to the UI-SPEC). The whole card is not clickable. The link's accessible name must say which service it is (e.g., visually hidden service title), so four identical "Ask about this" links aren't ambiguous. `ServiceCard.astro` stops being non-interactive. Update its header comment and add one tab stop per card to the keyboard-order e2e test.
- **D-06: The service field is a chip-style radio group** (`<fieldset>` + `<legend>`, native radio inputs styled as pills). All options are visible at once.
- **D-07: The service is optional.** The options are the 4 services (in the Phase 2 order, with labels from the localized service titles) plus **"Not sure yet / Something else"** (ES draft "Aún no lo sé / Otra cosa"). That extra option is selected by default when there's no pre-selection.
- **D-08: Pre-selection uses a query param plus the anchor**: `/?service=<id>#contact` (and `/es/?service=<id>#contact`), where `<id>` is one of the stable Phase 2 ids (`graphic-design`, `web-design`, `branding`, `social-media`). A small script reads the param and checks the matching radio. It ignores unknown values and falls back to the default. Links are shareable and work from any page. Without JS the link still jumps to `#contact`, but the form is hidden (D-12), so no pre-selection is needed there.

#### Submit & feedback flow
- **D-09: Required fields are name, email, and message.** The message has a short minimum (about 10 characters). The service is optional (D-07). The server enforces length caps (draft: name ≤ 100, email ≤ 254, message ≤ 5000). The client shows matching `maxlength`/hints. Exact numbers are Claude's discretion.
- **D-10: Validation timing:** nothing shows while the visitor first types. On submit, show an error summary plus per-field messages (linked with `aria-describedby`, `aria-invalid`) and move focus to the first invalid field. After that first submit, each field re-validates live as it's corrected. All messages are localized EN/ES. The server validates with the same rules (Zod via `astro/zod`), and the server's verdict is final.
- **D-11: Success replaces the form with a thank-you panel.** Draft copy: EN "Thanks, {name}! I'll get back to you within 48 hours." / ES "¡Gracias, {name}! Te respondo en menos de 48 horas." Mark it `TODO(martina)` so she can confirm the 48 h promise. Focus moves to the panel heading, and the message is announced through a live region. A "Send another message" button restores an empty form.
- **D-12: No-JS behavior:** the form is hidden, and a clear "Email me at …" `mailto:` block is shown instead. Turnstile needs JS, so a no-JS submit would always fail. Home stays fully static and prerendered. The form markup is revealed only when JS runs (progressive enhancement), so no-JS visitors never type a message they can't send.
- **D-13: Turnstile runs in managed mode with a compact widget**, placed near the submit button and themed to match light/dark. Use Cloudflare's dummy test keys in dev/CI. The token is verified server-side via `siteverify`. Reset the widget after any failed attempt so Retry works.
- **D-14: Failure keeps every field exactly as typed.** A localized error appears near submit (draft: "Couldn't send your message. Try again, or email me directly at …"). It offers Retry and a **mailto link prefilled with what they typed**: the subject includes the service and the body includes the message. The body is URL-encoded and truncated safely so the link stays within practical length limits. This covers network, server, and Turnstile failures. A honeypot hit is rejected server-side. Whether the client shows a bot a "success" or the generic error is Claude's discretion; follow security research.
- **D-15: While sending, the submit button is disabled and shows "Sending…" / "Enviando…"** to prevent double submits. No rate limiter in v1. Turnstile plus the honeypot cover abuse locally.

#### Email content & delivery
- **D-16: The email to Martina is always in Spanish** (labels, subject, framing), because her own copy is Spanish. It states which site language the visitor used (EN/ES) so she knows how to reply. The message body is passed through exactly as typed.
- **D-17: The subject is service plus name.** Example: `Nuevo mensaje web — Branding — Ana López`. Use `Sin especificar` when no service was chosen. Strip CR/LF from user values in the subject (header-injection safety).
- **D-18: The email is plain text only** (no HTML template), with `reply_to` set to the visitor's email so she can just hit Reply. The console provider logs exactly the same payload (to, reply_to, subject, text) that the Resend provider would send.
- **D-19: No auto-reply to the visitor.** The on-page thank-you panel is the confirmation.
- **D-20: The provider is chosen by an env var: `MAILER=console|resend`, default `console`**, read via `astro:env/server`. The local v1 build never sends real email. `MAILER=resend` requires `RESEND_API_KEY`, and fails loudly (a clear error, never a silent fallback to console) if it's missing.
- **D-21: The recipient comes from a server-only env var `CONTACT_TO`**, not from the public `site.email`. In console mode a placeholder is fine. Mark the real address `TODO(martina)`, and note that the Resend test sender (`onboarding@resend.dev`) can only deliver to the Resend account owner's address. Secrets go in `.dev.vars` (already gitignored and covered by `pnpm check:secrets`). Add a committed `.dev.vars.example` (or `.env.example`) with placeholder names only.

### Claude's Discretion
- The headline and invitation copy for the contact section (EN source of our draft plus ES, both `TODO(martina)`), and the final link text on the cards.
- The exact length caps and minimum message length (D-09).
- The honeypot field name and hiding technique, and whether to add a minimum time-to-submit check (PITFALLS §11 suggests one).
- The visual design of the chips, error states, thank-you panel, and Turnstile placement, decided in the UI-SPEC with the taste skill (required by PROJECT.md). Keep `#0F70B7` contrast rules from Phase 2 (D-15..D-17).
- What a honeypot-flagged bot sees on the client (D-14).
- The server mechanism (Astro Action vs. one on-demand API route) and adapter wiring: research decides. Pages stay prerendered.

### Deferred Ideas (OUT OF SCOPE)
- Auto-reply confirmation email to the visitor: needs a verified sending domain, and it's an abuse vector. Revisit with DEPLOY-02.
- Per-IP rate limiting (Cloudflare rate-limiting binding): revisit at deploy if spam gets past Turnstile.
- HTML-branded notification email: plain text is enough for v1.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONT-01 | Visitor can submit a contact form (name, email, message, service) with localized validation messages | Action `accept: 'form'` + Zod 4 schema whose `error:` values are i18n keys (verified: `fields.email = ['contact.error.emailInvalid']`). A client mirror validator shares the constants and `z.regexes.email`. A11y pattern is in Pattern 5 |
| CONT-02 | Spam blocked with honeypot + Turnstile, verified server-side | Pure `submitContact()`: honeypot first (no network), then `siteverify` via `fetch` (verified from workerd). Test keys verified. Empty token is rejected (`missing-input-response`, verified) |
| CONT-03 | Localized success/error feedback announced to SRs; typed text kept on failure | Client never resets on error. A polite live region plus focus to the panel heading or error. All non-input errors collapse to one generic code. Prefilled mailto builder (pure) |
| CONT-04 | Mailer interface; console logs locally; Resend ready | `Mailer` port, `createMailer(env)` factory that fails loudly. Console output appears in `astro dev` and `astro preview` terminals (verified). Resend via raw `fetch` (cited API) |
| CONT-05 | No-JS `mailto:` fallback | Form ships `hidden` and the mailto block is visible. The script swaps them (same pattern as `EmbedFacade`). Playwright `javaScriptEnabled: false` test |
| HOME-08 | Service card → contact form with service pre-selected | Card link `${getRelativeLocaleUrl(locale,'/')}?service=${id}#contact`. Pure `parseServiceParam()` plus a lifecycle-registered init checks the radio |
</phase_requirements>

## Project Constraints (from CLAUDE.md / AGENTS.md / PROJECT.md)

- pnpm for everything. TypeScript strictest (`astro/tsconfigs/strictest`). Avoid `any` and `unknown`, and prefer inference.
- Tailwind is the only styling solution. Tabler icons are imported per icon as SVG components (`@tabler/icons/outline/<name>.svg`), never through barrels.
- Accessibility is mandatory: semantic HTML, ARIA where it applies, managed focus, `motion-safe:` for motion.
- **Taste skill is required** for every visual change (chips, error states, thank-you panel, section layout): run its `lint.mjs` and `inspect.mjs` and review screenshots.
- Don't add dependencies until needed. Measure, don't guess (bundle size).
- Quality gates: `pnpm lint` (astro check + eslint + prettier), `pnpm test`, `pnpm test:e2e`, `pnpm check:secrets`. `pnpm verify` runs them all. Add tests when behavior changes.
- Offline build (`pnpm build:offline`) must stay at 0 network attempts.
- GSD commits are pre-approved (Conventional Commits, lowercase, scope = plan id, no Claude attribution). `/security-review` runs once per phase.
- Global user rule: label unverified claims. This document uses `[VERIFIED: …]`, `[CITED: …]`, `[ASSUMED]`.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@astrojs/cloudflare` | **14.4.1** (latest, peers `astro ^7.4.0`, `wrangler ^4.125.0`) [VERIFIED: npm registry] | Adapter. Enables on-demand `/_actions/*` on Workers while all pages stay prerendered | First-party Astro adapter for the project's Cloudflare Workers target. 15.x is beta only |
| `wrangler` (devDependency) | **4.151.2** (published 2026-10-19) [VERIFIED: npm registry] | Peer of the adapter. Local env (`.dev.vars`), future deploy | Required peer |
| `astro:actions` (built in) | astro 7.4.0 (installed) | Typed form endpoint, `isInputError`, `ActionError` | Verified working under `output: 'static'` + adapter [VERIFIED: spike] |
| `astro/zod` (built in) | zod 4.6.7 bundled [VERIFIED: spike `node_modules/.pnpm`] | Server schema | Never install zod separately (STACK.md) |
| `astro:env` (built in) | — | Typed secrets: `astro:env/server` (secret), `astro:env/client` (public site key) | `access: 'secret'` is read at runtime and never inlined [VERIFIED: grep of dist] |
| Cloudflare Turnstile | `api.js?render=explicit` (no npm) | Bot check | Plain script plus `fetch` siteverify [CITED: developers.cloudflare.com/turnstile] |
| Resend REST API | `POST https://api.resend.com/emails` (no npm) | Email for `MAILER=resend` | Raw `fetch` keeps "no deps until needed" [CITED: resend.com/docs/api-reference/emails/send-email] |

### Supporting (already installed, reuse)
| Library | Purpose | When to Use |
|---------|---------|-------------|
| `happy-dom` 21.0.3 | DOM unit tests for the enhancement script (`// @vitest-environment happy-dom`) | Client controller and pre-selection tests |
| `experimental_AstroContainer` | Render tests for `ContactSection`, `ServiceCard` link | Markup and ARIA assertions |
| `@playwright/test` 1.64.1 + `@axe-core/playwright` 4.14.0 | E2E form flows, no-JS, axe | Already in `tests/e2e` |
| `@tabler/icons` 3.49.0 | Arrow, mail, alert and check icons | Explicit SVG imports |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Astro Action | One `src/pages/api/contact.ts` with `prerender = false` | Not needed. Actions work under static output with the adapter [VERIFIED]. They give typed `fields` errors and origin checking for free (cross-origin POST returned **403** [VERIFIED]) |
| `resend` SDK 6.34.1 | raw `fetch` | The SDK adds a dependency for one POST. Raw fetch is about 30 lines and unit-testable with a mocked `fetch` |
| Zod on the client | Hand-written mirror validator | Zod in the browser costs **22.7 KB gzip** [VERIFIED: measured]. The mirror shares constants and the exact regex, and a parity test keeps them aligned |
| `@types/cloudflare-turnstile` | Local `src/types/turnstile.d.ts` (about 25 lines) | Avoids a dependency. We use only `render/reset/remove/getResponse` |
| `prerenderEnvironment: 'workerd'` (default) | `'node'` | workerd prerender **fails the offline guard** (DNS `0.0.0.0` from Miniflare port probing) [VERIFIED]. `'node'` keeps today's exact build path |

**Installation:**
```bash
pnpm add @astrojs/cloudflare@14.4.1
pnpm add -D wrangler@4.151.2
# pnpm 11 blocks build scripts; the add exits non-zero with ERR_PNPM_IGNORED_BUILDS (so `&&` chains stop).
pnpm approve-builds workerd esbuild   # writes pnpm-workspace.yaml: allowBuilds: { esbuild: true, workerd: true }
```
Commit the new `pnpm-workspace.yaml` [VERIFIED: spike, pnpm 11.0.8].

## Package Legitimacy Audit

slopcheck could not be installed in this environment (pip install produced no `slopcheck` binary), so per protocol every package is tagged `[ASSUMED]`. The planner must gate the install behind a `checkpoint:human-verify`, as Phase 1 did for its package list. Registry metadata was verified:

| Package | Registry | Age | Downloads (wk) | Source Repo | slopcheck | Disposition |
|---------|----------|-----|----------------|-------------|-----------|-------------|
| `@astrojs/cloudflare` | npm | since 2022-06 | 853,907 | github.com/withastro/astro | unavailable | [ASSUMED] Approve at checkpoint. No postinstall |
| `wrangler` | npm | since 2012 (name), Cloudflare-owned | 18,080,483 | github.com/cloudflare/workers-sdk | unavailable | [ASSUMED] Approve at checkpoint. No postinstall |
| `workerd` (transitive) | npm | — | 19,807,176 | github.com/cloudflare/workerd | unavailable | Needs `approve-builds` (postinstall `node install.js` fetches the platform binary at install time, not at build time) |
| `esbuild` (transitive) | npm | — | — | github.com/evanw/esbuild | unavailable | Needs `approve-builds` |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none (tool unavailable; all `[ASSUMED]`)

## Architecture Patterns

### System Architecture Diagram

```
 Visitor (EN/ES)                         Prerendered static HTML (dist/client)
 ─────────────────                       ──────────────────────────────────────
 Service card link ── /?service=branding#contact ──▶ Home: <section id="contact">
                                                    ├─ mailto block (visible by default = CONT-05)
                                                    └─ <form hidden> (chips, fields, honeypot, Turnstile slot)
                                                            │
                     lifecycle init (client script) ◀───────┘
                     ├─ reveal form, hide no-JS block
                     ├─ parseServiceParam(location.search) → check radio (HOME-08)
                     ├─ inject api.js?render=explicit → turnstile.render(compact, light, lang)
                     └─ on submit:
                          validateContact(values) ──invalid──▶ summary + aria-invalid + focus first field
                                │ valid
                                ▼
                          actions.contact(FormData) ── POST /_actions/contact/ ──▶ Worker (workerd)
                                                                                 │ Astro checkOrigin (403 cross-origin)
                                                                                 │ Zod schema (input error → fields[key])
                                                                                 ▼
                                                                         submitContact(input, deps)
                                                                           1. honeypot filled? → reject (generic)
                                                                           2. verifyTurnstile(token, ip) ──▶ challenges.cloudflare.com/siteverify
                                                                           3. buildContactEmail(input) (Spanish, CR/LF stripped)
                                                                           4. createMailer(env).send(email)
                                                                                 ├─ console → console.info(payload)
                                                                                 └─ resend  → POST api.resend.com/emails
                                                                         any failure → ActionError(generic code, no internals)
                                ◀──────────── { data } | { error } ───────────────┘
                          success → thank-you panel, focus heading, live region; reset Turnstile
                          input error → map fields to i18n keys; focus first invalid
                          other error → generic localized error + Retry + prefilled mailto; keep values; turnstile.reset()
```

### Recommended Project Structure
```
wrangler.jsonc                       # 2 keys: name, compatibility_date (adapter fills main/assets)
pnpm-workspace.yaml                  # allowBuilds for workerd, esbuild (created by approve-builds)
.env.example                         # placeholder NAMES only (allowlisted by .gitignore and isSecretPath)
src/
├── actions/index.ts                 # export const server = { contact: defineAction(...) } (thin)
├── lib/contact/
│   ├── fields.ts                    # LIMITS, SERVICE_IDS (+ 'other'), EMAIL_PATTERN, field names, honeypot name
│   ├── schema.ts                    # server Zod schema (imports fields.ts); error values are UIKey strings
│   ├── validate.ts                  # client mirror: validateContact(values) → Partial<Record<Field, UIKey>>
│   ├── email.ts                     # buildContactEmail(input, servicesEs) → { subject, text }; sanitizeHeader()
│   ├── mailto.ts                    # buildPrefilledMailto(to, subject, body, maxLen) (pure, safe truncation)
│   ├── service-param.ts             # parseServiceParam(search) → ServiceChoice
│   ├── turnstile.ts                 # verifyTurnstile(fetchFn, secret, token, ip) (pure, injectable fetch)
│   ├── submit.ts                    # submitContact(input, deps) orchestrator (honeypot → verify → build → send)
│   └── mailer/
│       ├── types.ts                 # ContactEmail, Mailer
│       ├── console.ts
│       ├── resend.ts
│       └── index.ts                 # createMailer(env): fails loudly on resend without key/recipient
├── lib/ui/contact-form.ts           # initContactForm(doc): Cleanup (registered on lifecycle)
├── types/turnstile.d.ts             # minimal window.turnstile typing (no dep)
└── components/contact/
    ├── ContactSection.astro         # two columns, id="contact", mailto column (D-02)
    ├── ContactForm.astro            # <form hidden novalidate>, fields, chips, honeypot, status regions
    └── ServiceChips.astro           # fieldset/legend + native radios as pills
scripts/e2e-preview-env.ts           # writes dist/server/.dev.vars with fixed test values before preview
```

### Pattern 1: Adapter + env wiring (verified config)
**What:** Static output, prerendered pages, one Worker for `/_actions/*`. The Vitest stub adapter keeps unit tests working.
```ts
// astro.config.ts — verified: build:offline 0 attempts, lint clean, 684/684 unit tests, 458/459 e2e (spike /tmp/p5real)
import { defineConfig, envField, fontProviders } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
// ...existing imports

export default defineConfig({
  site: site.url,
  // Vitest loads this config through getViteConfig(); the Cloudflare Vite plugin cannot start there
  // ("There is already a server associated with the config"), and Actions refuse to load without an
  // adapter (ActionsWithoutServerOutputError), so unit tests get a no-op stand-in.
  adapter: process.env['VITEST']
    ? {
        name: 'vitest-adapter-stub',
        hooks: {
          'astro:config:done': ({ setAdapter }) => {
            setAdapter({
              name: 'vitest-adapter-stub',
              serverEntrypoint: 'astro/app',
              supportedAstroFeatures: { staticOutput: 'stable', hybridOutput: 'stable', serverOutput: 'stable' },
            });
          },
        },
      }
    : cloudflare({ imageService: 'compile', prerenderEnvironment: 'node' }),
  session: false, // no KV "SESSION" binding needed (adapter otherwise auto-enables sessions)
  env: {
    schema: {
      MAILER: envField.enum({ context: 'server', access: 'secret', values: ['console', 'resend'], default: 'console' }),
      CONTACT_TO: envField.string({ context: 'server', access: 'secret', optional: true }),
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      TURNSTILE_SECRET_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({
        context: 'client', access: 'public', default: '1x00000000000000000000AA', // TODO(deploy): real key at build
      }),
    },
  },
  // ...i18n, fonts, vite unchanged
});
```
```jsonc
// wrangler.jsonc — verified minimal; required so `astro dev` reads the root .dev.vars
{
  "name": "designer-portfolio",
  "compatibility_date": "2026-10-12",
}
```
Why every secret is `optional: true`: a required secret that is missing throws **at action-module load**, before the handler runs, so every action call returns a 500 [VERIFIED: spike error at `actions/load.js`]. Make them optional and validate inside `createMailer()` / `submitContact()`, which throw descriptive errors (D-20 "fails loudly"). Those errors are logged server-side and mapped to a generic client error.

### Pattern 2: Thin Action, pure orchestrator
```ts
// src/actions/index.ts
import { ActionError, defineAction } from 'astro:actions';
import { CONTACT_TO, MAILER, RESEND_API_KEY, TURNSTILE_SECRET_KEY } from 'astro:env/server';
import { contactSchema } from '../lib/contact/schema';
import { submitContact } from '../lib/contact/submit';
import { createMailer } from '../lib/contact/mailer';
import { verifyTurnstile } from '../lib/contact/turnstile';

export const server = {
  contact: defineAction({
    accept: 'form',
    input: contactSchema,
    handler: async (input, ctx) => {
      const outcome = await submitContact(input, {
        verify: (token) => verifyTurnstile(fetch, TURNSTILE_SECRET_KEY, token, ctx.request.headers.get('CF-Connecting-IP')),
        mailer: () => createMailer({ MAILER, CONTACT_TO, RESEND_API_KEY }, fetch),
      });
      // Astro serializes a non-ActionError's e.message to the client (verified in astro/dist/actions/runtime/server.js
      // callSafely), so never let raw errors escape: one generic code for honeypot, Turnstile and mailer failures.
      if (!outcome.ok) throw new ActionError({ code: 'BAD_REQUEST', message: 'send_failed' });
      return { ok: true as const };
    },
  }),
};
```
`submitContact` catches internally, `console.error`s the real reason (never PII in resend mode), and returns `{ ok: false, reason }` so unit tests can assert the reason. The reason never goes over the wire.

### Pattern 3: Schema with i18n-key messages (Zod 4)
```ts
// src/lib/contact/schema.ts — verified behaviors: error strings come back in error.fields; empty form values arrive as null
import { z } from 'astro/zod';
import { LIMITS, SERVICE_CHOICES, EMAIL_PATTERN, HONEYPOT } from './fields';

export const contactSchema = z.object({
  name: z.string({ error: 'contact.error.nameRequired' }).trim()
    .min(1, { error: 'contact.error.nameRequired' }).max(LIMITS.name, { error: 'contact.error.nameTooLong' }),
  email: z.email({ pattern: EMAIL_PATTERN, error: 'contact.error.emailInvalid' })
    .max(LIMITS.email, { error: 'contact.error.emailTooLong' }),
  message: z.string({ error: 'contact.error.messageRequired' }).trim()
    .min(LIMITS.messageMin, { error: 'contact.error.messageShort' }).max(LIMITS.messageMax, { error: 'contact.error.messageTooLong' }),
  service: z.enum(SERVICE_CHOICES).default('other'),       // SERVICE_CHOICES = [...service ids, 'other']
  locale: z.enum(['en', 'es']),
  [HONEYPOT]: z.string().max(500).nullish(),                // checked in submitContact, NOT via schema (no field error leak)
  'cf-turnstile-response': z.string().max(2048).nullish(),  // 2048 = Turnstile max token length [CITED]
});
```
- `z.string()` without `{ error }` returns the English default "Invalid input: expected string, received null" for an empty field [VERIFIED: wire response]. Always pass `error`.
- `EMAIL_PATTERN`: copy `z.regexes.email` once into `fields.ts`, so client and server use the identical regex without shipping Zod. Add a unit test: `expect(EMAIL_PATTERN.source).toBe(z.regexes.email.source)`. Verified value: `/^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/` [VERIFIED: zod 4.6.7].
- Error message strings must be `UIKey`s. Type `fields.ts` key constants as `UIKey` so a missing dictionary key fails `astro check`.
- Add a unit test that `SERVICE_CHOICES` minus `'other'` equals the ids in `src/data/services.json` (drift guard).

### Pattern 4: Turnstile explicit render inside the lifecycle
```ts
// inside initContactForm(doc) — verified in headless Chromium: token "XXXX.DUMMY.TOKEN.XXXX" in ~1.6 s,
// hidden input name "cf-turnstile-response" created inside the container (so FormData carries it)
const script = doc.createElement('script');
script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; // exact URL required [CITED]
script.defer = true;
script.addEventListener('load', () => {
  widgetId = window.turnstile.render(container, {
    sitekey: PUBLIC_TURNSTILE_SITE_KEY,   // from astro:env/client (or a data- attribute)
    size: 'compact',                      // 150x140 [CITED]
    theme: 'light',                       // site is light-only (no dark tokens in global.css) → 'auto' would mismatch
    language: locale,                     // 'en' | 'es'
    action: 'contact',
    callback: () => clearTurnstileError(),
    'error-callback': () => showTurnstileError(),
    'expired-callback': () => window.turnstile.reset(widgetId),
  });
}, { signal });
doc.head.append(script);
// cleanup: if (widgetId) window.turnstile.remove(widgetId); ac.abort();
```
- Inject the script only when the form is revealed (JS on). That keeps the no-JS page free of third-party requests. If a later test asserts "no third-party request on load", gate the injection on an IntersectionObserver near `#contact`, or on the first `focusin` in the form. [ASSUMED] preference. Turnstile docs recommend loading early, so near-viewport loading is the compromise.
- Guard against injecting twice (Phase 7 ClientRouter re-mounts): check `window.turnstile` or an existing `<script>` before appending.
- On submit, if `window.turnstile.getResponse(widgetId)` is empty, show a localized "Please wait for the verification to finish" message near the widget and don't send.
- After any failure **and** after success: `window.turnstile.reset(widgetId)`. Tokens are single-use, valid for 300 s [CITED].

### Pattern 5: Accessible validation and feedback (D-10, D-11, D-14)
- `<form novalidate hidden>`: native bubbles are English-only on `/es/` (PITFALLS §11). We render our own messages.
- Each field: `<label for>`, `aria-describedby="{id}-hint {id}-error"`, `aria-invalid="true"` only after the first submit attempt, `maxlength` from `LIMITS`, `autocomplete="name"` / `"email"`.
- Error summary: a `role="alert"` container is unnecessary when focus moves. Use a heading plus a list of in-page links to each invalid field. Move focus to the first invalid field (D-10) and keep the summary as a polite region.
- One polite live region (`role="status"`), present in the DOM from page load (live regions must exist before content changes), announces "Sending…", success and the generic error.
- Success: replace the form with the panel. Focus the panel heading (`tabindex="-1"`). "Send another message" restores an empty form, resets Turnstile, and focuses the name field.
- Failure: never call `form.reset()`. Show the error near submit with a Retry (submit again) and the prefilled mailto. Focus the error heading or message.
- Chips: `<fieldset><legend>` + `<input type="radio" class="peer sr-only">` + `<label>` styled via `peer-checked:` / `peer-focus-visible:`. Native arrow-key behavior comes free. Keep the focus ring visible (Phase 2 accent rules).

### Pattern 6: No-JS swap (CONT-05, D-12), same idiom as `EmbedFacade`
```astro
<div data-contact-nojs>…"Email me at" <a href={`mailto:${site.email}`}>…</a></div>
<form data-contact-form hidden novalidate>…</form>
```
The script sets `nojs.hidden = true; form.hidden = false`. If the script fails to load, the mailto stays. That beats `<noscript>`, which hides the fallback whenever JS is merely enabled.

### Pattern 7: Mailer port
```ts
// src/lib/contact/mailer/types.ts
export interface ContactEmail { to: string; replyTo: string; subject: string; text: string }
export interface Mailer { readonly name: 'console' | 'resend'; send(email: ContactEmail): Promise<void> }

// resend.ts — body names per Resend REST docs (snake_case reply_to; SDK uses replyTo) [CITED]
const res = await fetchFn('https://api.resend.com/emails', {
  method: 'POST',
  headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
  body: JSON.stringify({ from: CONTACT_FROM, to: [email.to], reply_to: email.replyTo, subject: email.subject, text: email.text }),
  signal: AbortSignal.timeout(8000),
});
if (!res.ok) throw new Error(`resend ${res.status}`); // body logged server-side only
```
- `CONTACT_FROM`: a constant `'Web Martina Fernandez <onboarding@resend.dev>'` with `TODO(martina)` (verified domain later). `onboarding@resend.dev` **can only send to the Resend account owner's address**. Otherwise it returns 403 "You can only send testing emails to your own email address…" [CITED: resend.com/docs/knowledge-base/403-error-resend-dev-domain].
- `createMailer(env, fetchFn)`:
  - `MAILER === 'resend'` with no `RESEND_API_KEY` throws `Error('MAILER=resend requires RESEND_API_KEY')`.
  - Resend with no `CONTACT_TO` throws too.
  - Console mode falls back to the placeholder `CONTACT_TO ?? 'inbox@example.invalid'`.
- Console mailer: `console.info('[contact] email', JSON.stringify(email, null, 2))`. That output shows up in both the `astro dev` and `astro preview` terminals [VERIFIED].

### Pattern 8: Spanish plain-text email (D-16..D-18)
`buildContactEmail(input, serviceTitlesEs)` returns:
- `subject`: `Nuevo mensaje web — ${service ? titleEs : 'Sin especificar'} — ${name}`. Every interpolated value goes through `sanitizeHeader()`: strip `\r`, `\n` and other C0 controls (`/[\u0000-\u001f\u007f]/g` → space), collapse spaces, cap at about 200 chars.
- `text`: Spanish labels (`Nombre:`, `Email:`, `Servicio:`, `Idioma del sitio: Inglés (EN)|Español (ES)`, `Mensaje:`), then the message exactly as typed.
- `replyTo`: the validated email (Zod already rejects CR/LF via the regex).
- `to` comes only from env, never from input.

### Pattern 9: Pre-selection (HOME-08)
- Card link: `` `${getRelativeLocaleUrl(locale, '/')}?service=${service.id}#contact` `` gives `/?service=branding#contact` and `/es/?service=branding#contact`.
- Card link text: "Ask about this" plus `<span class="sr-only">: {title}</span>`, or `aria-label` combining both. Prefer visible text plus sr-only so the accessible name contains the visible label (WCAG 2.5.3 Label in Name).
- `parseServiceParam(search: string): ServiceChoice` returns the id when it is in `SERVICE_IDS`, otherwise `'other'`. Pure and unit-tested.
- Init: check the matching radio. Don't steal focus. Fragment navigation already moves the sequential focus starting point to `#contact` in modern browsers [ASSUMED], so the next Tab enters the section. Phase 6 Lenis must keep `anchors` and focus behavior (PITFALLS §6).

### Pattern 10: Prefilled mailto (D-14)
`buildPrefilledMailto({ to, subject, body, maxLength = 1800 })`:
- Encode with `encodeURIComponent`. That gives `%20`, not `+`, and newlines become `%0D%0A` after normalizing to CRLF (RFC 6068 [ASSUMED]).
- Truncate the **body** by code points (`Array.from`) until the full URL is ≤ `maxLength`, then append `…`. Never cut inside a surrogate pair or a `%XX` escape (truncate before encoding, then re-measure).
- Subject: `[Servicio] — {name}` in the visitor's language. Body: the message.
- 1800 is a conservative practical cap: older clients and Windows handlers choke around 2 KB [ASSUMED].

### Anti-Patterns to Avoid
- **Reading secrets via `import.meta.env` or `access: 'public'` server vars**: they get inlined into `dist/server` [VERIFIED for public].
- **Required (`optional: false`) secrets in `env.schema`**: a missing value kills every action at module load [VERIFIED].
- **Throwing plain `Error`s out of the handler**: the message is serialized to the client [VERIFIED in source].
- **Honeypot as a Zod constraint** (`max(0)`): bots get a field-level error telling them which field tripped. Check it in `submitContact` and return the generic failure.
- **Implicit Turnstile rendering (`class="cf-turnstile"`)**: it doesn't survive ClientRouter swaps and renders before the form is revealed. Use explicit rendering.
- **`theme: 'auto'`**: the site has no dark theme, so dark-OS visitors would see a dark widget on a cream page.
- **`<noscript>` for the fallback**: see Pattern 6.
- **Importing `astro/zod` in client code**: +22.7 KB gzip [VERIFIED].

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form endpoint + typed errors + CSRF origin check | Custom API route, manual JSON | Astro Action (`accept: 'form'`, `isInputError`) | Verified 403 on cross-origin POST, `fields` map, typed client |
| Bot detection | Custom challenges or CAPTCHA | Turnstile managed mode + siteverify | Free, accessible (axe 0 violations, verified) |
| Server validation | Manual checks | `astro/zod` schema | D-10 locks Zod |
| Email regex | A new regex | `z.regexes.email` copied once, with a parity test | Client and server stay identical |
| Env loading and typing | `process.env` / `import.meta.env` reads | `astro:env` schema | Runtime secrets, typed, never inlined |
| Mail transport | SMTP / nodemailer | Resend HTTP API via `fetch` | SMTP can't run on Workers (PITFALLS §10) |
| DOM lifecycle | Ad-hoc `DOMContentLoaded` | `lifecycle.register(initContactForm)` + `AbortController` | ClientRouter-safe (Phase 7) |

**Key insight:** the hard parts here are wiring and edge cases: env inlining, error serialization, test determinism, focus and live regions. None of them need new libraries.

## Runtime State Inventory

Not a rename phase, but adding the adapter creates new local runtime state the plan must account for:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None. No KV/D1. `session: false` removes the auto `SESSION` KV binding [VERIFIED: `kv_namespaces: []` in generated config] | none |
| Live service config | None for v1. Cloudflare Turnstile widget (real sitekey/secret) and Resend account are deploy-time (DEPLOY-02) | Note `TODO(deploy)` |
| OS-registered state | None | none |
| Secrets/env vars | New names: `MAILER`, `CONTACT_TO`, `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY` (in `.dev.vars`), `PUBLIC_TURNSTILE_SITE_KEY` (schema default = test key; **never put it in `.dev.vars`/`.env`**, because it ends up in `dist/client` and `check:secrets` would flag it) | Add `.env.example` with names only |
| Build artifacts | `dist/` becomes `dist/client/` + `dist/server/` [VERIFIED]. `dist/server/.dev.vars` is a copy of local secrets [VERIFIED]. `.wrangler/state/` created by dev/build | `.gitignore` add `.wrangler/`. Update `check-secrets.ts` (see Pitfall 2) |

## Common Pitfalls

### Pitfall 1: Vitest stops starting after adding the adapter
**What goes wrong:** `pnpm test` fails with "Startup Error: There is already a server associated with the config." Dropping the adapter under Vitest gives `ActionsWithoutServerOutputError` instead. Passing `{ adapter: undefined }` as `getViteConfig`'s second argument does **not** help [VERIFIED].
**How to avoid:** use the `process.env['VITEST']` stub adapter in Pattern 1 [VERIFIED: 43 files / 684 tests pass, `astro check` clean].
**Warning signs:** any unit test run failing before the first test executes.

### Pitfall 2: `check:secrets` fails on every build once `.dev.vars` exists
**What goes wrong:** the Cloudflare Vite plugin writes `dist/server/.dev.vars`, merged from the root `.dev.vars` or `.env` [VERIFIED]. `scripts/check-secrets.ts` reports "secret file in dist" and "secret value found in". `astro preview` needs that file: deleting it made the action 500 with "TURNSTILE_SECRET_KEY is missing" [VERIFIED].
**How to avoid:**
- Change `check-secrets.ts` to skip exactly `dist/server/.dev.vars` for both the path check and the value scan. That file is the plugin's local-preview copy, outside the `dist/client` static assets and listed in `dist/client/.assetsignore` [VERIFIED].
- Keep scanning everything else, including `dist/server/**/*.mjs`.
- Add a hard failure if any secret file appears under `dist/client/`.
- Unit-test the new rule in `tests/unit/secrets.test.ts`.

[ASSUMED] `wrangler deploy` doesn't upload `dist/server/.dev.vars`: module rules match `**/*.js`/`**/*.mjs` only. Re-verify at DEPLOY-02.

### Pitfall 3: E2E silently uses the developer's real `.dev.vars`
**What goes wrong:** `pnpm test:e2e` runs `astro build`, which copies the developer's `.dev.vars` (maybe `MAILER=resend` + a real key) into `dist/server/.dev.vars`. Preview then uses it, and e2e could send real email. Process env doesn't help: with `CLOUDFLARE_INCLUDE_PROCESS_ENV=true`, process env only adds keys and doesn't override file values [VERIFIED: `CONTACT_TO` stayed at the file value]. Without a root file, CI has no secrets and every submit returns 500.
**How to avoid:** set `webServer.command` to `node scripts/e2e-preview-env.ts && pnpm astro preview --port 4400 --ignore-lock`. The script **overwrites** `dist/server/.dev.vars` with fixed values: `MAILER=console`, `TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA`, `CONTACT_TO=inbox@example.invalid`. Writing that file before preview was verified to work.

### Pitfall 4: Offline build breaks with the default prerender environment
**What goes wrong:** `pnpm build:offline` exits 1. The guard log shows `dns lookup 0.0.0.0` from `@cloudflare/vite-plugin` `checkAvailablePort` [VERIFIED].
**How to avoid:** `prerenderEnvironment: 'node'` [VERIFIED: 0 attempts, 20 html]. On-demand code (the Action) still runs in workerd in dev and preview [CITED: adapter docs].

### Pitfall 5: `MAILER` inlined at build
**What goes wrong:** `envField.enum({ access: 'public', context: 'server' })` compiles to `var MAILER = "resend"` in `dist/server` [VERIFIED]. Runtime switching is ignored and a stale value ships.
**How to avoid:** `access: 'secret'` for all four server vars.

### Pitfall 6: `astro dev` ignores `.dev.vars`
**What goes wrong:** with no root wrangler config, `astro dev` reports "TURNSTILE_SECRET_KEY is missing". After a previous build, a stale `.wrangler/deploy/config.json` can redirect to `dist/server/wrangler.json` [VERIFIED].
**How to avoid:** commit the two-key `wrangler.jsonc`. If env looks stale, delete `.wrangler/`.

### Pitfall 7: Turnstile test secret accepts any non-empty token
**What goes wrong:** a test expecting "bogus token is rejected" with secret `1x…AA` fails: siteverify returned `success: true`, `metadata.result_with_testing_key: true` for `bogus` [VERIFIED]. This contradicts the doc's "accept only the dummy token".
**How to avoid:** for rejection paths, either send an **empty** token (`missing-input-response`, verified) or unit-test `verifyTurnstile` with a mocked `fetch` returning `{ success: false, 'error-codes': ['invalid-input-response'] }`. Never assert on `hostname` with test keys: it returned `example.com`.

### Pitfall 8: Raw error messages leak to the browser
**What goes wrong:** `throw new Error('MAILER=resend requires RESEND_API_KEY')` reaches the client as `INTERNAL_SERVER_ERROR` with that message (`callSafely` in `astro/dist/actions/runtime/server.js`) [VERIFIED in source].
**How to avoid:** use Pattern 2. Only throw `ActionError` with a fixed code and message.

### Pitfall 9: Routing and 404 changes under the adapter's preview
**What goes wrong:**
- `/es/does-not-exist` now serves the **Spanish** 404 (`lang="es"`), so the existing `not-found.spec.ts:38` expectation (English 404 with Spanish cross-link) fails [VERIFIED].
- `/projects` now returns a 307 redirect to `/projects/` [VERIFIED].
**How to avoid:**
- Update that test (and its header comment) to the new, better behavior: `/es/*` misses get the Spanish 404.
- Re-run the whole e2e suite right after the adapter task, before any contact work.

### Pitfall 10: pnpm 11 build-script gate
`pnpm add @astrojs/cloudflare` exits non-zero with `ERR_PNPM_IGNORED_BUILDS` (esbuild, workerd), so a chained `&& pnpm add -D wrangler` never runs [VERIFIED]. Run the two `add`s separately, then `pnpm approve-builds workerd esbuild`.

### Pitfall 11: Autofill trips the honeypot
Password managers can fill hidden "website/url/company/fax" fields [ASSUMED].
**How to avoid:**
- Use a non-autofill name such as `extra_info` with `autocomplete="off"` and `tabindex="-1"`, inside an `aria-hidden="true"` wrapper positioned off-screen (`absolute -left-[9999px]`). Avoid `display:none`, which bots skip.
- Return the **generic error**, not fake success. A human false positive then still gets the prefilled mailto (D-14), and bots learn nothing more than from any other failure.

### Pitfall 12: Astro 7 dev server backgrounding under agents
`astro dev` run by an agent detached itself ("Dev server running at … Stop: astro dev stop") [VERIFIED]. Use `--ignore-lock` (as `playwright.config.ts` already does for preview) and stop it with `pnpm astro dev stop`.

## Code Examples

### Turnstile siteverify (verified from workerd)
```ts
// Source: developers.cloudflare.com/turnstile/get-started/server-side-validation/ + spike
export type TurnstileResult = { ok: true } | { ok: false; codes: string[] };
export async function verifyTurnstile(
  fetchFn: typeof fetch, secret: string | undefined, token: string | null | undefined, ip: string | null,
): Promise<TurnstileResult> {
  if (!secret) throw new Error('TURNSTILE_SECRET_KEY is not set');
  if (!token) return { ok: false, codes: ['missing-input-response'] };
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set('remoteip', ip);
  const res = await fetchFn('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST', body, signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return { ok: false, codes: [`http-${res.status}`] };
  const json: { success: boolean; 'error-codes'?: string[] } = await res.json();
  return json.success ? { ok: true } : { ok: false, codes: json['error-codes'] ?? [] };
}
```

### Client call and result handling
```ts
// Source: docs.astro.build/en/guides/actions/ (verified client POST to /_actions/contact/ from prerendered /es/)
import { actions, isInputError } from 'astro:actions';
const { data, error } = await actions.contact(new FormData(form));
if (data) showSuccess();
else if (isInputError(error)) showFieldErrors(error.fields); // values are UIKey strings → t(key)
else showGenericFailure();                                    // keep values, reset Turnstile, offer Retry + mailto
```
Wire shapes [VERIFIED]: input error is HTTP 400 `{"type":"AstroActionInputError","issues":[…],"fields":{"email":["contact.error.emailInvalid"]}}`. ActionError is `{"type":"AstroActionError","code":"BAD_GATEWAY","status":502,"message":"…"}`. Client bundle cost for `astro:actions` is 3.4 KB gzip [VERIFIED].

### Turnstile test keys [CITED: developers.cloudflare.com/turnstile/troubleshooting/testing/]
| Sitekey | Behavior |
|---|---|
| `1x00000000000000000000AA` | Always passes (visible) |
| `2x00000000000000000000AB` | Always fails (visible) |
| `1x00000000000000000000BB` / `2x00000000000000000000BB` | Pass / fail (invisible) |
| `3x00000000000000000000FF` | Forces interactive challenge |

| Secret | Behavior |
|---|---|
| `1x0000000000000000000000000000000AA` | Always passes (in practice also for non-dummy tokens, see Pitfall 7) |
| `2x0000000000000000000000000000000AA` | Always fails |
| `3x0000000000000000000000000000000AA` | `timeout-or-duplicate` |

Dummy token: `XXXX.DUMMY.TOKEN.XXXX`. Test keys work on `localhost`.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `output: 'hybrid'` | `output: 'static'` + adapter; on-demand routes (incl. `/_actions/*`) run in the Worker | Astro 5 | Verified: build log shows `output: "static"`, `mode: "server"` |
| `Astro.locals.runtime.env` | `astro:env/server` or `import { env } from 'cloudflare:workers'` | Astro 6 | Use `astro:env` |
| Cloudflare Pages target | Workers + static assets (`dist/client`, `dist/server`) | adapter 13+ | Output layout change |
| Zod 3 `message:` / `z.string().email()` | Zod 4 `error:` / `z.email({ pattern })` | Astro 6 (zod 4) | Verified on zod 4.6.7 |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `wrangler deploy` doesn't upload `dist/server/.dev.vars` | Pitfall 2 | Secrets uploaded at deploy. Re-check in DEPLOY-02 |
| A2 | Fragment navigation moves the sequential focus starting point to `#contact` | Pattern 9 | Keyboard users Tab from the top. Then add `tabindex="-1"` + focus on the section |
| A3 | Mailto practical cap of about 1800 chars; CRLF encoding per RFC 6068 | Pattern 10 | Long prefilled mail truncated or not opening on some clients |
| A4 | Password managers may fill honeypots named like website/url | Pitfall 11 | False positives. Mitigated by the generic-error + mailto choice |
| A5 | Turnstile `language: 'es'` is supported | Pattern 4 | Widget falls back to `auto` |
| A6 | Loading `api.js` when the form is revealed (or near viewport) is acceptable for Turnstile's risk scoring | Pattern 4 | Slightly slower first token. Managed mode still works |
| A7 | Both packages are legitimate (slopcheck unavailable) | Package audit | Mitigated by checkpoint and first-party repos |

## Open Questions (RESOLVED)

1. **Lazy versus eager Turnstile script on Home.**
   - What we know: the no-JS page makes no third-party request (form hidden). Eager load on JS pages adds one request to challenges.cloudflare.com for every Home visitor.
   - RESOLVED: lazy. `api.js?render=explicit` loads once, on the first of: IntersectionObserver with `rootMargin: '600px'` on `#contact`, URL hash `#contact` or a `service=` param at init, or the first `focusin` inside the form. No load at the top of Home. Implemented in 05-05 (Task 3 `src/lib/ui/contact-form.ts`, e2e "Turnstile loads only near the section"); 05-02 asserts no request without JS; 05-08 measures the request count at the top of Home.
2. **Minimum time-to-submit check.**
   - RESOLVED: skipped in this phase, as recommended (the client-set timestamp is forgeable, Turnstile managed mode already scores behavior, and it makes e2e timing-sensitive). Spam defence is the honeypot plus server-side siteverify, implemented in 05-04 (`submitContact`, `verifyTurnstile`). No plan adds a timing check. Revisit with rate limiting at deploy (DEPLOY-02).
3. **Real Turnstile sitekey injection at deploy.**
   - RESOLVED: `PUBLIC_TURNSTILE_SITE_KEY` is a `context: 'client', access: 'public'` envField that defaults to the always-pass test sitekey, with a `TODO(deploy)` comment saying the real key comes from the build environment and never from `.dev.vars`. Implemented in 05-01 (Task 2, `astro.config.ts` and `.env.example`). 05-08 lists it as a Known Stub for DEPLOY-02. Setting the real key and secret is DEPLOY-02 work, not this phase.
4. **E2E dependence on challenges.cloudflare.com.**
   - RESOLVED: as recommended. Happy-path tests use the real test widget and the live siteverify with the always-pass keys (D-13). Failure paths are hermetic (`page.route` fulfill 500, 400 input errors, or abort). Every test or describe that waits for a real Turnstile token or reaches the live siteverify has `@network` in its title, and `E2E_OFFLINE=1 pnpm test:e2e` skips those tests through `grepInvert` in `playwright.config.ts`. Implemented in 05-01 (Task 3 config switch), 05-04 (server accept test), 05-05 (success, sending and axe tests), 05-06 (validation and failure tests that wait for a token) and 05-08 (contact-states).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | build/dev | ✓ | 24.15.0 | — |
| pnpm | all | ✓ | 11.0.8 | — |
| workerd binary (via approve-builds) | dev/preview on-demand routes | ✓ after `approve-builds` | 1.20261012.1 / 1.20261019.1 | — |
| Playwright Chromium | e2e | ✓ | 1.64.1 | — |
| Network to challenges.cloudflare.com | Turnstile widget and siteverify (dev, e2e happy path) | ✓ (verified live) | — | Hermetic route stubs for failure paths |
| Network to api.resend.com | `MAILER=resend` only | not exercised (no key) | — | console mailer (default) |

**Missing dependencies with no fallback:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.5 (+ happy-dom 21, AstroContainer); Playwright 1.64.1 + axe-core 4.14 |
| Config file | `vitest.config.ts` (`getViteConfig`, `tests/unit/**/*.test.ts`); `playwright.config.ts` (webServer = `astro preview` on 4400) |
| Quick run command | `pnpm vitest run tests/unit/contact-*.test.ts` |
| Full suite command | `pnpm verify` (lint, unit, e2e, secrets) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONT-01 | Schema: required, caps, email pattern, null handling, `UIKey` messages; service default `other` | unit | `pnpm vitest run tests/unit/contact-schema.test.ts` | ❌ Wave 0 |
| CONT-01 | Client mirror equals server verdict on a shared fixture table; `EMAIL_PATTERN` equals `z.regexes.email` | unit | `pnpm vitest run tests/unit/contact-validate.test.ts` | ❌ |
| CONT-01 | Submit empty in `/es/` shows Spanish summary + per-field errors, focus on first invalid, live re-validation | e2e | `pnpm exec playwright test tests/e2e/contact.spec.ts -g "validation"` | ❌ |
| CONT-02 | Honeypot filled gives generic failure, no verify or send; empty token rejected; verify failure means no send | unit (`submitContact` with fakes) | `pnpm vitest run tests/unit/contact-submit.test.ts` | ❌ |
| CONT-02 | `verifyTurnstile` maps success, failure, http error, timeout | unit (mock fetch) | `pnpm vitest run tests/unit/contact-turnstile.test.ts` | ❌ |
| CONT-02 | POST with honeypot or empty token to `/_actions/contact` returns error status | e2e (`request.post`, Origin header) | `pnpm exec playwright test tests/e2e/contact-server.spec.ts -g "server rejects"` | ❌ |
| CONT-03 | Success: panel replaces form, heading focused, status text; "Send another" restores empty form | e2e (real test widget) | `… -g "success"` | ❌ |
| CONT-03 | Failure (routed 500 / abort): values kept, generic localized error, Retry, mailto prefilled | e2e (hermetic `page.route`) | `… -g "failure"` | ❌ |
| CONT-03 | Mailto builder encoding and truncation (surrogates, `%XX`, CRLF, max length) | unit | `pnpm vitest run tests/unit/contact-mailto.test.ts` | ❌ |
| CONT-04 | `createMailer`: console default, resend without key throws, resend without `CONTACT_TO` throws; resend request shape (`reply_to`, Bearer, text) | unit | `pnpm vitest run tests/unit/contact-mailer.test.ts` | ❌ |
| CONT-04 | Email builder: Spanish subject/labels, `Sin especificar`, CR/LF stripped, locale line, body verbatim | unit | `pnpm vitest run tests/unit/contact-email.test.ts` | ❌ |
| CONT-05 | JS disabled: form hidden, mailto block visible with `site.email`, both locales | e2e | `… -g "without JavaScript"` | ❌ |
| HOME-08 | `parseServiceParam` (valid ids, unknown, empty, repeated) | unit | `pnpm vitest run tests/unit/contact-service-param.test.ts` | ❌ |
| HOME-08 | Card link href + accessible name per card (container render) | unit | `pnpm vitest run tests/unit/featured-services.test.ts` | ✅ (extend) |
| HOME-08 | Click card link lands on `#contact` with matching chip checked (EN, ES) | e2e | `… -g "pre-select"` | ❌ |
| D-04 | All Contact links are `/#contact` / `/es/#contact`; keyboard order includes 4 card links + form | e2e | `pnpm exec playwright test tests/e2e/a11y.spec.ts tests/e2e/layout.spec.ts tests/e2e/home.spec.ts` | ✅ (update) |
| a11y | Home EN/ES with form revealed and widget rendered: 0 axe violations | e2e | `pnpm exec playwright test tests/e2e/a11y.spec.ts` | ✅ (extend) |
| Secrets | `check-secrets` ignores only `dist/server/.dev.vars`, fails on secret files in `dist/client` | unit | `pnpm vitest run tests/unit/secrets.test.ts` | ✅ (extend) |
| Build | Adapter build stays offline | gate | `pnpm build:offline` | ✅ |

### Sampling Rate
- **Per task commit:** `pnpm vitest run tests/unit/contact-*.test.ts` (+ `pnpm lint` after moves or imports)
- **Per wave merge:** `pnpm test && pnpm test:e2e`
- **Phase gate:** `pnpm verify` + `pnpm build:offline` green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Adapter task first, then the full existing suite: fix `not-found.spec.ts` (Spanish 404 for `/es/*`), Vitest stub adapter, `check-secrets` exclusion, `.gitignore` `.wrangler/`
- [ ] `scripts/e2e-preview-env.ts` + `playwright.config.ts` webServer command update
- [ ] `tests/unit/contact-{schema,validate,submit,turnstile,mailer,email,mailto,service-param}.test.ts`
- [ ] `tests/e2e/contact.spec.ts` (with a helper to wait for the Turnstile token: `await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/)`)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | `session: false` |
| V4 Access Control | partial | Public action. Astro `checkOrigin` (cross-origin POST returns 403, verified). Requests with no Origin header still pass (curl returned 200), so Turnstile is the real gate |
| V5 Input Validation | yes | `astro/zod` schema (caps, enum, email pattern); Turnstile token ≤ 2048 |
| V6 Cryptography | no | — (TLS by platform) |
| V7 Error Handling / Logging | yes | Only `ActionError` with fixed generic messages leaves the server. `console.error` reasons server-side. The console mailer logs PII only in local console mode |
| V8 Data Protection | yes | Secrets via `astro:env` `access: 'secret'`; `check:secrets` gate; site key public by design |
| V13 API | yes | `accept: 'form'` only; JSON body to a form action returns 415 (verified) |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Email header injection via name/service in subject | Tampering | `sanitizeHeader()` strips C0 controls. `to`/`from` fixed. `reply_to` = Zod-validated email |
| Open relay (attacker-chosen recipient) | Spoofing | Recipient only from `CONTACT_TO` env |
| Spam bots | DoS / abuse | Honeypot + Turnstile siteverify (server-side); rate limit deferred |
| Secret leakage into bundles | Information disclosure | `access: 'secret'`; `check:secrets` on dist (minus the plugin preview copy) |
| Error-message disclosure | Information disclosure | Generic `ActionError` (Pitfall 8) |
| CSRF from other origins | Tampering | Astro `security.checkOrigin` default (verified 403) |
| Token replay | Spoofing | Turnstile tokens single-use, 300 s [CITED]; reset widget after each attempt |
| Real email from tests | Tampering | e2e overwrites `dist/server/.dev.vars` with `MAILER=console` |

## Sources

### Primary (HIGH confidence)
- **Spike A** `/tmp/p5spike` (minimal Astro 7.4.0 + `@astrojs/cloudflare` 14.4.1 + wrangler 4.151.2): Actions under static output, dev and preview env behavior, inlining, error wire shapes, siteverify from workerd, client call from a prerendered page, bundle sizes
- **Spike B** `/tmp/p5real` (copy of this repo + adapter + one action): `build:offline`, `lint`, `test` (684), e2e (458/459), `check:secrets` failure, dev/preview routes
- Headless Chromium probes: Turnstile test sitekey token, axe on the rendered widget
- `astro/dist/actions/runtime/{server,client}.js` (error serialization, codes); `@astrojs/cloudflare/dist/{index,utils/wrangler-config}.js` (sessions, env loading)
- https://developers.cloudflare.com/turnstile/troubleshooting/testing/ (test keys)
- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/ (siteverify)
- https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/ and `/widget-configurations/` (explicit render, sizes, options)
- https://docs.astro.build/en/guides/actions/, https://docs.astro.build/en/guides/integrations-guide/cloudflare/

### Secondary (MEDIUM confidence)
- https://resend.com/docs/api-reference/emails/send-email (REST body, `reply_to`, Idempotency-Key)
- https://resend.com/docs/knowledge-base/403-error-resend-dev-domain (test sender limit)
- https://resend.com/docs/dashboard/emails/send-test-emails (`delivered@resend.dev`)
- npm registry: versions, publish dates, weekly downloads, repos, postinstall scripts

### Tertiary (LOW confidence)
- Web search for the Vitest "already a server associated" error: no matching issue found. The fix is empirical (spike).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH. Exact versions installed and exercised against this repo.
- Architecture: HIGH for server and tooling (verified). MEDIUM for client a11y patterns (standard practice, to be verified by e2e/axe in-phase).
- Pitfalls: HIGH. Pitfalls 1–10 and 12 were reproduced. Pitfall 11 is an assumption.

**Research date:** 2026-10-19
**Valid until:** about 2026-11-02 (the wrangler/adapter release cadence is weekly; re-check versions before install)
