---
phase: 05-contact
reviewed: 2026-10-28T00:00:00Z
depth: standard
files_reviewed: 46
files_reviewed_list:
  - .env.example
  - .gitignore
  - astro.config.ts
  - eslint.config.js
  - package.json
  - playwright.config.ts
  - pnpm-workspace.yaml
  - wrangler.jsonc
  - scripts/check-secrets.ts
  - scripts/e2e-preview-env.ts
  - scripts/secrets.ts
  - src/actions/index.ts
  - src/components/contact/ContactForm.astro
  - src/components/contact/ContactSection.astro
  - src/components/contact/ServiceChips.astro
  - src/components/global/SiteFooter.astro
  - src/components/global/SiteHeader.astro
  - src/components/project/EmbedFacade.astro
  - src/components/sections/FeaturedServices.astro
  - src/components/sections/Hero.astro
  - src/components/ui/ButtonLink.astro
  - src/components/ui/ServiceCard.astro
  - src/components/ui/SocialLinks.astro
  - src/components/views/HomeView.astro
  - src/components/views/ProjectsView.astro
  - src/i18n/interpolate.ts
  - src/i18n/t.ts
  - src/i18n/ui.en.ts
  - src/i18n/ui.es.ts
  - src/lib/contact/email.ts
  - src/lib/contact/errors.ts
  - src/lib/contact/fields.ts
  - src/lib/contact/mailer/console.ts
  - src/lib/contact/mailer/index.ts
  - src/lib/contact/mailer/resend.ts
  - src/lib/contact/mailer/types.ts
  - src/lib/contact/mailto.ts
  - src/lib/contact/schema.ts
  - src/lib/contact/service-param.ts
  - src/lib/contact/strings.ts
  - src/lib/contact/submit.ts
  - src/lib/contact/turnstile.ts
  - src/lib/contact/validate.ts
  - src/lib/ui/button-classes.ts
  - src/lib/ui/contact-form.ts
  - src/lib/ui/service-preselect.ts
  - src/types/turnstile.d.ts
findings:
  critical: 0
  warning: 4
  info: 7
  total: 11
status: issues_found
---

# Phase 5: Code Review Report

**Reviewed:** 2026-10-28
**Depth:** standard
**Files Reviewed:** 46 (47 paths listed; `src/types/turnstile.d.ts` is counted with the client script)
**Status:** issues_found

## Summary

I reviewed the Phase 5 contact pipeline from start to finish: the Astro Action, the Zod schema, the honeypot, Turnstile siteverify, the Spanish email builder, the console and Resend mailers, the browser validator and controller, the mailto fallback, the secrets gate, and the touched Home/nav components. I read each file in full and checked it against `git diff 2af6de7..HEAD`.

The security core is solid:
- The recipient comes only from server config.
- `replyTo` passes the strict email regex, so CR/LF and commas are impossible.
- The subject goes through `sanitizeHeader`.
- Both outbound hosts are fixed.
- Visitor text reaches the DOM only through `textContent`.
- Every non-input failure is collapsed to one generic `ActionError`.
- Secrets are `access: 'secret'`, so they are never inlined.

I found no Critical issues. The defects that matter are:
1. A client/server length mismatch caused by multipart CRLF normalization. I verified it in Node.
2. A Turnstile error state that never clears, even when the widget recovers.
3. Siteverify verdicts are not bound to the widget `action` or the hostname.
4. Defaults that fail open or drop messages silently if the site is deployed without explicit env (console mailer, test sitekey).

**Out of scope (excluded to stay under the 50-file limit; not reviewed):** the 27 test files changed in this phase:
- `tests/e2e/a11y.spec.ts`, `tests/e2e/contact-preselect.spec.ts`, `tests/e2e/contact-server.spec.ts`, `tests/e2e/contact-states.spec.ts`, `tests/e2e/contact.spec.ts`, `tests/e2e/home-story.spec.ts`, `tests/e2e/home.spec.ts`, `tests/e2e/layout.spec.ts`, `tests/e2e/not-found.spec.ts`
- `tests/unit/contact-email.test.ts`, `tests/unit/contact-fields.test.ts`, `tests/unit/contact-form.test.ts`, `tests/unit/contact-mailer.test.ts`, `tests/unit/contact-mailto.test.ts`, `tests/unit/contact-schema.test.ts`, `tests/unit/contact-section.test.ts`, `tests/unit/contact-service-param.test.ts`, `tests/unit/contact-strings.test.ts`, `tests/unit/contact-submit.test.ts`, `tests/unit/contact-turnstile.test.ts`, `tests/unit/contact-validate.test.ts`, `tests/unit/featured-services.test.ts`, `tests/unit/secrets.test.ts`, `tests/unit/service-preselect.test.ts`, `tests/unit/site-footer.test.ts`, `tests/unit/site-header.test.ts`

`pnpm-lock.yaml` was also excluded (lock file).

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: Line breaks in the message are counted once in the browser but twice on the server (CRLF)

**File:** `src/lib/contact/schema.ts:34-39`, `src/lib/contact/validate.ts:34-39`, `src/components/contact/ContactForm.astro:116`
**Issue:** The textarea value and `validateContact` count each line break as one character (`\n`). The Action client sends `FormData`, and the multipart/form-data encoding algorithm used by `fetch` rewrites every bare LF to CRLF. I verified this from the scratch dir with Node's fetch: `new Response(fd).text()` turned `"a\nb"` into `"a\r\nb"`. Chromium follows the same Fetch/HTML algorithm (inferred, not run in a browser here).

The server's `.max(5000)` therefore sees `length + lineBreakCount`. A message the client accepts, with up to 5000 characters and several paragraphs, is rejected with `contact.error.messageTooLong`. The live re-validation (`contact-form.ts:477-497`) then clears that error as soon as the visitor types, because the client still thinks the text is valid. Resubmitting hits the same server error again. The visitor ends up in a loop with no visible reason, and `maxlength` gives no hint either. The same skew applies to `messageMin`, but there the server is more lenient, so it causes no harm.
**Fix:** Normalize line endings on the server before trimming and counting, so the schema measures what the browser measured:
```ts
message: z
  .string({ error: CONTACT_ERRORS.messageRequired })
  .overwrite((value) => value.replace(/\r\n?/g, '\n'))
  .trim()
  .min(1, { error: CONTACT_ERRORS.messageRequired, abort: true })
  .min(LIMITS.messageMin, { error: CONTACT_ERRORS.messageShort })
  .max(LIMITS.messageMax, { error: CONTACT_ERRORS.messageTooLong }),
```
(or `z.preprocess`). Add a parity test with a multi-line message at exactly `LIMITS.messageMax` sent through `new Response(formData)`.

### WR-02: A Turnstile `error-callback` blocks the form for good, even after the widget recovers

**File:** `src/lib/ui/contact-form.ts:236-239, 262-269, 442-445, 514-532`
**Issue:** `showWidgetError()` sets `widgetFailed = true`, and nothing ever sets it back to false. Turnstile calls `error-callback` for transient faults as well as fatal ones (network hiccups, generic challenge failures in the 600xxx range). With the default `retry: 'auto'` it then retries on its own and may later call `callback` with a valid token. When that happens:
- `callback` skips `hideNote()` because `widgetFailed` is true (line 264).
- The submit handler returns early with the error note (lines 442-445) and never reads the token.

So one transient error stops a JS visitor from using the form until they reload the page. "Send another message" (lines 514-532) does not clear the flag either.
**Fix:** Treat a token as recovery:
```ts
callback: () => {
  widgetFailed = false;
  hideNote();
},
```
Also reset `widgetFailed = false` in the `again` handler. Better still, read the token in the submit handler before checking `widgetFailed`, so a present token always wins.

### WR-03: The siteverify verdict is not bound to the widget's `action` (or hostname)

**File:** `src/lib/contact/turnstile.ts:16-19, 40-41`
**Issue:** The client renders with `action: 'contact'` (`contact-form.ts:261`), but the server accepts any `success: true`. It never checks `json.action`, and it deliberately skips `hostname`. Cloudflare's server-side validation guide recommends checking both. A token minted by another widget or page under the same sitekey (Turnstile sitekeys can be shared across hostnames and widgets) passes. Skipping hostname is documented as necessary for the test keys, but nothing makes that exception conditional: production gets the same lax check.
**Fix:** Extend `SiteverifyResponse` with `action?: string; hostname?: string`. Reject when `json.action !== 'contact'` (the test secrets echo the action; confirm against the docs). Check `hostname` against an allow-list derived from `site.url`, and skip that check only when the secret is one of Cloudflare's documented test secrets (`/^[123]x0{33}AA$/`).

### WR-04: Leaving env unset on deploy silently drops messages (console mailer) or breaks Turnstile (test sitekey)

**File:** `astro.config.ts:42-61`, `src/lib/contact/mailer/index.ts:25-33`, `src/lib/contact/mailer/console.ts:1-23`
**Issue:**
- `MAILER` defaults to `'console'`. If production starts without an explicit `MAILER=resend`, every submission returns success: the visitor sees "Message sent". Meanwhile the email never leaves the Worker, and its full PII (name, email, message) is written to Workers logs (`console.info`, `console.ts:11`). That is silent data loss of every lead, plus PII retention.
- `PUBLIC_TURNSTILE_SITE_KEY` defaults to the always-pass test sitekey. If the build env is not set, it is baked into the client. Paired with a real secret, siteverify fails and every send fails. Paired with the test secret that `.env.example` suggests, every bot passes.

Deploy is out of scope for Phase 5 (CONTEXT, line 11), and D-20 makes `console` the v1 default. However, no guard exists to stop this configuration from shipping, and the TODOs are the only safeguard.
**Fix:** Fail closed outside local dev. For example, in `createMailer`, throw on `MAILER === 'console'` when a deploy marker is set (an `envField.boolean` `CONTACT_ALLOW_CONSOLE` that defaults to `false`, set `true` only in `.dev.vars` and `e2e-preview-env.ts`). Add an `astro:build:done` check, or a `check:secrets`-style gate, that fails a production build when `PUBLIC_TURNSTILE_SITE_KEY` matches `/^[123]x0{20}AA$/`. Record both in the DEPLOY-02 checklist.

## Info

### IN-01: The honeypot and token length caps leak field-level input errors

**File:** `src/lib/contact/schema.ts:7-8, 43-44`
**Issue:** The header comment says a bot "gets no field-level hint that the field is a trap". However, `extra_info` longer than 500 characters, or a `cf-turnstile-response` longer than 2048, fails the schema. The Action then returns an `ActionInputError` whose `fields` names `extra_info` or `cf-turnstile-response`. The browser hides it (generic failure), but a scripted client sees exactly which field tripped.
**Fix:** Accept any string, `z.string().nullish().catch(null)`-style, and enforce the caps in `submitContact`, mapping them to the same generic `send_failed`.

### IN-02: `verdict.codes.join` runs outside a try block

**File:** `src/lib/contact/submit.ts:50`, `src/lib/contact/turnstile.ts:40-41`
**Issue:** The siteverify JSON is cast, not validated. If `error-codes` ever arrives as a non-array (for example a string), `.join` throws a `TypeError` outside every try in `submitContact`, which breaks its "never throws" contract. The resulting non-`ActionError` reaches Astro, which the Action header says is serialized to the client (Pitfall 8). The trigger is unlikely, but the invariant is enforced only by convention.
**Fix:** In `verifyTurnstile`: `const codes = Array.isArray(json['error-codes']) ? json['error-codes'].filter((c) => typeof c === 'string') : [];`. Also wrap the Action handler body in a try/catch that rethrows `sendFailed()`.

### IN-03: `sanitizeHeader` lets C1 controls and bidi overrides through, and can return an empty name

**File:** `src/lib/contact/email.ts:34-39, 45-49`
**Issue:**
- Only U+0000–U+001F and U+007F are stripped. C1 controls (U+0080–U+009F, including NEL U+0085, which JS `\s` does not match) and bidi controls (U+202A–U+202E, U+2066–U+2069) survive into the subject. That allows visual spoofing of the subject in the inbox, such as reversing "— Branding — name". Header injection is not practical, because Resend encodes non-ASCII.
- A name made only of control characters passes `.trim().min(1)` (trim does not remove NUL), then sanitizes to `""`, giving `Nombre: ` and a subject that ends in `— `.

**Fix:** Widen the class to `/[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g`. In the schema, add `.refine((v) => sanitizeHeader(v) !== '', { error: CONTACT_ERRORS.nameRequired })`, or apply the same strip before `.min(1)`.

### IN-04: Resend `Idempotency-Key` is random per call, so it deduplicates nothing

**File:** `src/lib/contact/mailer/resend.ts:46, 56`
**Issue:** The key is a fresh UUID for every `send()`. A retried submission, such as a double-click race or a client Retry after a timeout that actually delivered, therefore gets a new key and sends a duplicate email. The header suggests protection that does not exist.
**Fix:** Derive the key from the submission (for example a SHA-256 of the Turnstile token, which is single-use) and pass it through `ContactEmail`, or drop the header.

### IN-05: The failure block and the "Try again" label stay up when the next attempt fails client validation

**File:** `src/lib/ui/contact-form.ts:396-402, 440-454`
**Issue:** After a send failure, `showFailure` shows the block and relabels the submit "Try again". If the visitor then edits a field into an invalid state and submits, the handler returns at line 441, before `hideFailure()` (line 454). The error summary then sits next to a stale "Couldn't send your message" block with a mailto, under a "Try again" button. That is two conflicting messages.
**Fix:** Call `hideFailure()` and `setSending(false)` (or restore `contact.submit`) before the validation early return.

### IN-06: The secrets gate gives a false positive when `CONTACT_TO` equals the public email

**File:** `scripts/check-secrets.ts:39-48`, `scripts/secrets.ts:39-49`
**Issue:** Every `.dev.vars` value of 8 or more characters is treated as a secret. D-21 notes that `CONTACT_TO` must be the Resend account owner's address until a domain is verified, and that is likely Martina's public address, which is `site.email` and appears in every dist HTML page. Once the real address replaces the placeholder in both places, `pnpm check:secrets` fails on every page. The likely reaction is to weaken the gate.
**Fix:** Exclude non-secret keys by name (for example parse `KEY=value` and skip `CONTACT_TO` and `MAILER`), or keep an explicit allow-list of secret key names (`RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`).

### IN-07: `createContactForm` is a single closure of about 420 lines

**File:** `src/lib/ui/contact-form.ts:136-556`
**Issue:** Turnstile loading, validation rendering, the failure/mailto block, success, and the lifecycle all share one closure with 8 mutable `let` flags. WR-02 and IN-05 both come from flag interactions that are hard to see at this size.
**Fix:** Extract the Turnstile controller (`ensureWidget`/`resetWidget`/`widgetFailed`/`api`/`widgetId`) and the error renderer (`renderField`/`renderSummary`/`showErrors`) into small factories with explicit state.

---

_Reviewed: 2026-10-28_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
