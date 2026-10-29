---
phase: 5
slug: contact
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-10-19
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `05-RESEARCH.md` § Validation Architecture. The per-task map is filled in once plans exist.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.5 (+ happy-dom 21, `experimental_AstroContainer`) for unit · Playwright 1.64.1 + @axe-core/playwright 4.14 for e2e |
| **Config file** | `vitest.config.ts` (`getViteConfig`, `tests/unit/**/*.test.ts`; needs the Vitest stand-in adapter from Wave 0), `playwright.config.ts` (webServer = `astro preview`; command updated in Wave 0 to write the fixed `dist/server/.dev.vars` first) |
| **Quick run command** | `pnpm vitest run tests/unit/contact-*.test.ts` |
| **Full suite command** | `pnpm verify` (lint, unit, e2e, secrets) |
| **Estimated runtime** | ~60 seconds full suite [Inference: based on the Phase 2 figure; not measured for Phase 5] |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run tests/unit/contact-*.test.ts` (only the files that exist so far), plus `pnpm lint` after file moves or import changes
- **RED e2e tasks:** the `<automated>` gate is `pnpm exec playwright test <spec> --list`. It checks that the new tests compile and are registered, and it needs no build. The executor still builds and runs the spec once to watch it fail, and records that in the SUMMARY.
- **Plan end (last task of each plan):** `pnpm build && pnpm test:e2e` (or `pnpm verify`). This is the only place the full e2e suite runs, so it is the wave gate.
- **Offline runs:** tests that need challenges.cloudflare.com (a real Turnstile token or the live siteverify) have `@network` in their title or their describe title. `E2E_OFFLINE=1 pnpm test:e2e` skips them through `grepInvert` (05-01 Task 3). Phase sign-off still needs the full run with network.
- **After every plan wave:** Run `pnpm test && pnpm test:e2e`
- **Before `/gsd:verify-work`:** `pnpm verify` and `pnpm build:offline` must both be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 05-01 | 1 | CONT-02, CONT-04 | T-05-01 | Only user-approved packages installed (slopcheck unavailable) | manual checkpoint | user replied "approved" (05-01-SUMMARY) | n/a | ✅ |
| 05-01-02 | 05-01 | 1 | CONT-02, CONT-04 | T-05-02, T-05-03 | Adapter build stays offline; secrets only via `astro:env/server` | gate + unit | `pnpm lint && pnpm test && pnpm build:offline` | ✅ | ✅ |
| 05-01-03 | 05-01 | 1 | CONT-02, CONT-04 | T-05-04, T-05-05 | No secret in `dist/`; e2e preview forces console mailer + Turnstile test keys | unit + gate | `pnpm vitest run tests/unit/secrets.test.ts && pnpm verify && pnpm build:offline` | ✅ | ✅ |
| 05-02-01 | 05-02 | 2 | CONT-05 | T-05-07 | No-JS mailto block, no Cloudflare request without JS | e2e | `pnpm exec playwright test tests/e2e/contact.spec.ts -g "without JavaScript"` | ✅ | ✅ |
| 05-02-02 | 05-02 | 2 | CONT-05 | T-05-06, T-05-07 | Section markup, mailto subject from dictionary only | unit | `pnpm vitest run tests/unit/contact-section.test.ts tests/unit/site-footer.test.ts` | ✅ | ✅ |
| 05-02-03 | 05-02 | 2 | CONT-05 | T-05-08 | Every Contact link targets Home `#contact` | e2e + taste lint | `pnpm exec playwright test tests/e2e/contact.spec.ts -g "contact links"` + `lint.mjs` | ✅ | ✅ |
| 05-03-01 | 05-03 | 2 | CONT-04 | T-05-09, T-05-10 | Email built as text, header-injection safe, Spanish subject | unit | `pnpm vitest run tests/unit/contact-fields.test.ts tests/unit/contact-email.test.ts` | ✅ | ✅ |
| 05-03-02 | 05-03 | 2 | CONT-04 | T-05-11, T-05-12, T-05-13 | `createMailer` fails loudly on missing config; Resend request shape; key never logged | unit | `pnpm vitest run tests/unit/contact-mailer.test.ts` | ✅ | ✅ |
| 05-04-01 | 05-04 | 3 | CONT-01, CONT-02 | T-05-14..T-05-17 | Server rejects honeypot, empty/failed token, bad input | e2e | `pnpm exec playwright test tests/e2e/contact-server.spec.ts` | ✅ | ✅ |
| 05-04-02 | 05-04 | 3 | CONT-01, CONT-02 | T-05-18, T-05-19 | Schema returns dictionary keys; siteverify with secret, timeout, fail-closed | unit | `pnpm vitest run tests/unit/contact-schema.test.ts tests/unit/contact-turnstile.test.ts` | ✅ | ✅ |
| 05-04-03 | 05-04 | 3 | CONT-01, CONT-02, CONT-04 | T-05-20, T-05-21 | Generic failure, no send on spam; thin Action | unit + e2e | `pnpm vitest run tests/unit/contact-submit.test.ts && pnpm exec playwright test tests/e2e/contact-server.spec.ts && pnpm check:secrets` | ✅ | ✅ |
| 05-05-01 | 05-05 | 4 | CONT-01, CONT-03 | T-05-22 | Turnstile loads only near the section; keyboard order | e2e | `pnpm exec playwright test tests/e2e/contact.spec.ts tests/e2e/a11y.spec.ts` | ✅ | ✅ |
| 05-05-02 | 05-05 | 4 | CONT-01, CONT-03 | T-05-23, T-05-24 | Server-resolved strings; no dictionary or zod in the client bundle | unit | `pnpm vitest run tests/unit/contact-strings.test.ts tests/unit/contact-section.test.ts tests/unit/i18n.test.ts` | ✅ | ✅ |
| 05-05-03 | 05-05 | 4 | CONT-01, CONT-03 | T-05-25, T-05-26 | Success text set via `textContent`; pending guard against double send | unit + e2e | `pnpm vitest run tests/unit/contact-form.test.ts && pnpm exec playwright test tests/e2e/contact.spec.ts -g "success\|sending"` | ✅ | ✅ |
| 05-06-01 | 05-06 | 5 | CONT-01, CONT-03 | T-05-27 | Localized validation and failure in EN and ES | e2e | `pnpm exec playwright test tests/e2e/contact.spec.ts -g "validation\|failure"` | ✅ | ✅ |
| 05-06-02 | 05-06 | 5 | CONT-01, CONT-03 | T-05-28, T-05-29 | Client mirror equals server rules; mailto encoded and capped at 1800 | unit | `pnpm vitest run tests/unit/contact-validate.test.ts tests/unit/contact-mailto.test.ts` | ✅ | ✅ |
| 05-06-03 | 05-06 | 5 | CONT-01, CONT-03 | T-05-30 | Typed text kept on failure; errors text + icon; axe 0 | unit + e2e | `pnpm vitest run tests/unit/contact-form.test.ts && pnpm exec playwright test tests/e2e/contact.spec.ts -g "failure"` | ✅ | ✅ |
| 05-07-01 | 05-07 | 6 | HOME-08 | T-05-31 | Card links and pre-selection, no focus stolen | e2e | `pnpm exec playwright test tests/e2e/contact-preselect.spec.ts` | ✅ | ✅ |
| 05-07-02 | 05-07 | 6 | HOME-08 | — | Card link href and accessible name | unit | `pnpm vitest run tests/unit/featured-services.test.ts` | ✅ | ✅ |
| 05-07-03 | 05-07 | 6 | HOME-08 | T-05-32 | `?service=` allow-listed; unknown value leaves "other" | unit + e2e | `pnpm vitest run tests/unit/contact-service-param.test.ts tests/unit/service-preselect.test.ts` | ✅ | ✅ |
| 05-08-01 | 05-08 | 7 | CONT-01..05, HOME-08 | T-05-33, T-05-35 | Every state: no overflow at 320, h2 ≤ 2 lines, submit the only accent; no secrets in dist | e2e + gate | `pnpm verify && pnpm build:offline && pnpm exec playwright test tests/e2e/contact-states.spec.ts` | ✅ | ✅ |
| 05-08-02 | 05-08 | 7 | CONT-01..05, HOME-08 | T-05-34 | User review, VoiceOver, `/security-review` | manual checkpoint | user sign-off | n/a | ✅ approved 2026-10-28 |

Status from the 05-08 Task 1 run (2026-10-22): `pnpm verify` 905 unit + 559 e2e green, `pnpm build:offline` 0 network attempts. `nyquist_compliant` stays `false` until the 05-08-02 sign-off row turns green; flip it then.

Requirement → test targets (from research):

| Req | Behavior | Type | Command |
|-----|----------|------|---------|
| CONT-01 | Schema rules, localized `UIKey` messages, service default `other` | unit | `pnpm vitest run tests/unit/contact-schema.test.ts` |
| CONT-01 | Client mirror agrees with server on shared fixtures; `EMAIL_PATTERN` equals `z.regexes.email` | unit | `pnpm vitest run tests/unit/contact-validate.test.ts` |
| CONT-01 | Empty submit in `/es/` shows Spanish summary and per-field errors; focus on first invalid | e2e | `pnpm exec playwright test tests/e2e/contact.spec.ts -g "validation"` |
| CONT-02 | Honeypot filled or empty/failed token → generic failure, no send | unit | `pnpm vitest run tests/unit/contact-submit.test.ts tests/unit/contact-turnstile.test.ts` |
| CONT-02 | POST to `/_actions/contact` with honeypot or empty token is rejected | e2e | `pnpm exec playwright test tests/e2e/contact-server.spec.ts -g "server rejects"` |
| CONT-03 | Success panel, focus and status announcement; "Send another" resets | e2e | `pnpm exec playwright test tests/e2e/contact.spec.ts -g "success"` |
| CONT-03 | Failure keeps typed values, shows localized error, Retry and prefilled mailto | e2e | `pnpm exec playwright test tests/e2e/contact.spec.ts -g "failure"` |
| CONT-03 | Mailto builder encoding and truncation | unit | `pnpm vitest run tests/unit/contact-mailto.test.ts` |
| CONT-04 | `createMailer` selection and errors; Resend request shape; email builder | unit | `pnpm vitest run tests/unit/contact-mailer.test.ts tests/unit/contact-email.test.ts` |
| CONT-05 | JS disabled: mailto block visible in both locales | e2e | `pnpm exec playwright test tests/e2e/contact.spec.ts -g "without JavaScript"` |
| HOME-08 | `parseServiceParam`; card link href and accessible name | unit | `pnpm vitest run tests/unit/contact-service-param.test.ts tests/unit/featured-services.test.ts` |
| HOME-08 | Card click lands on `#contact` with the matching service checked (EN, ES) | e2e | `pnpm exec playwright test tests/e2e/contact-preselect.spec.ts -g "pre-select"` |
| a11y | Home EN/ES with form and widget rendered: 0 axe violations | e2e | `pnpm exec playwright test tests/e2e/a11y.spec.ts` |
| Secrets | `check-secrets` skips only `dist/server/.dev.vars` | unit | `pnpm vitest run tests/unit/secrets.test.ts` |
| Build | Adapter build stays offline | gate | `pnpm build:offline` |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] Adapter and tooling task, then the full existing suite green: `not-found.spec.ts` update (Spanish 404 for `/es/*`), Vitest stand-in adapter, `check-secrets` exclusion, `.gitignore` `.wrangler/`, root `wrangler.jsonc`, `prerenderEnvironment: 'node'`
- [x] `scripts/e2e-preview-env.ts` + `playwright.config.ts` webServer command update
- [x] `tests/unit/contact-{schema,validate,submit,turnstile,mailer,email,mailto,service-param}.test.ts`
- [x] `tests/e2e/contact.spec.ts` with a helper that waits for the Turnstile token

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real email delivery through Resend | CONT-04 | Needs a real API key; research did not send a real email | Set `MAILER=resend`, `RESEND_API_KEY`, `CONTACT_TO` in local `.dev.vars`, submit once, confirm receipt (test sender only delivers to the Resend account owner) |
| Screen reader announcement of success/error | CONT-03 | Live-region wording is best judged with a real screen reader | VoiceOver on `/` and `/es/`: submit valid and failing forms, confirm the announcements |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
