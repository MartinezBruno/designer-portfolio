---
phase: 05-contact
fixed_at: 2026-10-28T21:45:00Z
review_path: .planning/phases/05-contact/05-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 5: Code Review Fix Report

**Fixed at:** 2026-10-28
**Source review:** .planning/phases/05-contact/05-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (WR-01..WR-04; 0 critical; Info findings out of scope)
- Fixed: 4
- Skipped: 0

**Verification (whole tree, after all four fixes):** `pnpm verify` exit 0. That covers lint (`astro check` 0 errors, eslint, prettier), 57 unit files / 931 tests, 559 e2e tests including every `@network` success spec, and `check:secrets` ok (1005 files). No flaky reruns were needed.

## Fixed Issues

### WR-01: Line breaks in the message are counted once in the browser but twice on the server (CRLF)

**Files modified:** `src/lib/contact/schema.ts`, `tests/unit/contact-schema.test.ts`
**Commit:** 7d271b4
**Applied fix:** The `message` schema now runs `.overwrite((v) => v.replace(/\r\n?/g, '\n'))` before `.trim()` and the length checks, so the server counts the same text the textarea API value counts. A new parity test builds a 5000-character multi-line message that `validateContact` accepts. It round-trips the message through `new Response(formData).formData()`, asserts that the wire value contains CRLF, and asserts that the schema accepts it and returns the LF text. One more character is still rejected as `messageTooLong`. A second test covers bare CR normalization.
**Status:** fixed: requires human verification (logic change). Side effect: the email body now always uses LF line breaks.

### WR-02: A Turnstile `error-callback` blocks the form for good, even after the widget recovers

**Files modified:** `src/lib/ui/contact-form.ts`, `tests/unit/contact-form.test.ts`
**Commit:** c882fa6
**Applied fix:**
- The widget `callback` now sets `widgetFailed = false` and hides the note.
- The submit handler reads the token first. A present token always wins and clears `widgetFailed`. The error note only shows when there is no token and the widget has failed.
- "Send another message" clears `widgetFailed` when a rendered widget exists, since it gets a fresh challenge. A script that never loaded stays failed on purpose, because no token can arrive.

Four new unit tests cover four cases: the error still blocks while there is no token, recovery through `callback`, a token present without a callback, and the reset from "Send another message". I confirmed that three of them fail on the old code.
**Status:** fixed: requires human verification (state-flag logic).

### WR-03: The siteverify verdict is not bound to the widget's `action` (or hostname)

**Files modified:** `src/lib/contact/turnstile.ts`, `src/lib/contact/fields.ts`, `src/lib/ui/contact-form.ts`, `src/actions/index.ts`, `tests/unit/contact-turnstile.test.ts`
**Commit:** 9e70b65
**Applied fix:**
- `verifyTurnstile` takes a required `TurnstileBinding { action, hostnames }`.
- With a real secret, it rejects `action !== 'contact'` (`action-mismatch`) and any missing or unknown hostname (`hostname-mismatch`).
- Cloudflare test secrets (`/^[123]x0{31}AA$/`, exported as `isTurnstileTestSecret`) skip both checks.
- A new `TURNSTILE_ACTION` constant in `fields.ts` is shared by the widget render and the server binding, so they cannot drift.
- The Action binds to `new URL(site.url).hostname`.

I checked the exemption against the live siteverify (2026-10-28). The always-pass test secret returns `{"success":true,"hostname":"example.com","metadata":{"result_with_testing_key":true}}` with **no `action` field**, so an unconditional action check would have broken e2e. The review's suggested regexes (`0{33}`, `0{20}` for the secret) were off. The real lengths are 31 zeros for secrets and 20 for sitekeys, and both are checked against the keys in the repo.
**Deploy note:** `site.url` is still the placeholder `martinafernandez.example` (TODO(martina)). With a real secret, every send fails closed (`hostname-mismatch`) until `site.url` is the real domain. A `www.` alias or a `*.workers.dev` preview would have to be added to `hostnames`.
**Status:** fixed: requires human verification (security condition).

### WR-04: Leaving env unset on deploy silently drops messages (console mailer) or breaks Turnstile (test sitekey)

**Files modified:** `astro.config.ts`, `src/actions/index.ts`, `src/lib/contact/deploy-guard.ts` (new), `tests/unit/contact-deploy-guard.test.ts` (new), `scripts/e2e-preview-env.ts`, `.env.example`
**Commit:** f108f95
**Applied fix:**
- A new server env `CONTACT_ALLOW_TEST_CONFIG` (`envField.boolean`, secret access, default `false`) acts as the local/e2e opt-in.
- A new pure function `contactConfigProblem()` in `deploy-guard.ts` runs at the start of the Action handler. When the opt-in is false, it refuses three configs: `MAILER=console`, a Cloudflare test secret, and a test sitekey (`/^[123]x0{20}[A-F]{2}$/`). It always flags a real secret paired with a test sitekey.
- On a problem, the Action logs `[contact] rejected: config <reason>` (no secret values) and throws the generic `send_failed`. The visitor gets the failure block and mailto instead of a false "Message sent".
- `scripts/e2e-preview-env.ts` and `.env.example` set `CONTACT_ALLOW_TEST_CONFIG=true`. I also appended `CONTACT_ALLOW_TEST_CONFIG=true` to the developer's local, gitignored `.dev.vars`. That keeps `astro dev` working, leaves `CONTACT_TO=` blank as instructed, and was not committed.

I chose a runtime guard instead of a build-time sitekey gate. A build gate would need a deploy marker, because `pnpm build`, `test:e2e` and `build:offline` all build with the test sitekey on purpose, and no deploy pipeline exists yet (DEPLOY-02). The runtime guard covers both failure modes from the review, with no deploy marker:
- An unset env (console mailer) no longer reports success while dropping leads.
- A test secret or test sitekey can no longer serve production unnoticed.

**Verified by:** 9 unit tests, plus a manual `astro preview` probe of the built Worker. Without the flag, the POST returned 400 and the log showed `[contact] rejected: config MAILER=console outside local dev`. With the flag, it returned 200 and the console mailer logged the email. Every e2e `@network` success spec passed with the flag set.
**DEPLOY-02 checklist items (not recorded in planning docs by this fixer):**
- Set `MAILER=resend`, `RESEND_API_KEY`, `CONTACT_TO` and a real `TURNSTILE_SECRET_KEY` as Worker secrets.
- Build with a real `PUBLIC_TURNSTILE_SITE_KEY`.
- Never set `CONTACT_ALLOW_TEST_CONFIG` in production.
- Update `site.url` (WR-03 hostname binding).
- Optionally, add a build-time sitekey gate keyed to the deploy pipeline's env.

**Status:** fixed: requires human verification (fail-closed behavior change to the D-20 default).

---

_Fixed: 2026-10-28_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
