---
phase: 5
slug: contact
status: draft
nyquist_compliant: false
wave_0_complete: false
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
- **After every plan wave:** Run `pnpm test && pnpm test:e2e`
- **Before `/gsd:verify-work`:** `pnpm verify` and `pnpm build:offline` must both be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| _TBD by planner_ | | | | | | | | | ⬜ pending |

Requirement → test targets (from research):

| Req | Behavior | Type | Command |
|-----|----------|------|---------|
| CONT-01 | Schema rules, localized `UIKey` messages, service default `other` | unit | `pnpm vitest run tests/unit/contact-schema.test.ts` |
| CONT-01 | Client mirror agrees with server on shared fixtures; `EMAIL_PATTERN` equals `z.regexes.email` | unit | `pnpm vitest run tests/unit/contact-validate.test.ts` |
| CONT-01 | Empty submit in `/es/` shows Spanish summary and per-field errors; focus on first invalid | e2e | `pnpm exec playwright test tests/e2e/contact.spec.ts -g "validation"` |
| CONT-02 | Honeypot filled or empty/failed token → generic failure, no send | unit | `pnpm vitest run tests/unit/contact-submit.test.ts tests/unit/contact-turnstile.test.ts` |
| CONT-02 | POST to `/_actions/contact` with honeypot or empty token is rejected | e2e | `pnpm exec playwright test tests/e2e/contact.spec.ts -g "server rejects"` |
| CONT-03 | Success panel, focus and status announcement; "Send another" resets | e2e | `pnpm exec playwright test tests/e2e/contact.spec.ts -g "success"` |
| CONT-03 | Failure keeps typed values, shows localized error, Retry and prefilled mailto | e2e | `pnpm exec playwright test tests/e2e/contact.spec.ts -g "failure"` |
| CONT-03 | Mailto builder encoding and truncation | unit | `pnpm vitest run tests/unit/contact-mailto.test.ts` |
| CONT-04 | `createMailer` selection and errors; Resend request shape; email builder | unit | `pnpm vitest run tests/unit/contact-mailer.test.ts tests/unit/contact-email.test.ts` |
| CONT-05 | JS disabled: mailto block visible in both locales | e2e | `pnpm exec playwright test tests/e2e/contact.spec.ts -g "without JavaScript"` |
| HOME-08 | `parseServiceParam`; card link href and accessible name | unit | `pnpm vitest run tests/unit/contact-service-param.test.ts tests/unit/featured-services.test.ts` |
| HOME-08 | Card click lands on `#contact` with the matching service checked (EN, ES) | e2e | `pnpm exec playwright test tests/e2e/contact.spec.ts -g "pre-select"` |
| a11y | Home EN/ES with form and widget rendered: 0 axe violations | e2e | `pnpm exec playwright test tests/e2e/a11y.spec.ts` |
| Secrets | `check-secrets` skips only `dist/server/.dev.vars` | unit | `pnpm vitest run tests/unit/secrets.test.ts` |
| Build | Adapter build stays offline | gate | `pnpm build:offline` |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Adapter and tooling task, then the full existing suite green: `not-found.spec.ts` update (Spanish 404 for `/es/*`), Vitest stand-in adapter, `check-secrets` exclusion, `.gitignore` `.wrangler/`, root `wrangler.jsonc`, `prerenderEnvironment: 'node'`
- [ ] `scripts/e2e-preview-env.ts` + `playwright.config.ts` webServer command update
- [ ] `tests/unit/contact-{schema,validate,submit,turnstile,mailer,email,mailto,service-param}.test.ts`
- [ ] `tests/e2e/contact.spec.ts` with a helper that waits for the Turnstile token

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real email delivery through Resend | CONT-04 | Needs a real API key; research did not send a real email | Set `MAILER=resend`, `RESEND_API_KEY`, `CONTACT_TO` in local `.dev.vars`, submit once, confirm receipt (test sender only delivers to the Resend account owner) |
| Screen reader announcement of success/error | CONT-03 | Live-region wording is best judged with a real screen reader | VoiceOver on `/` and `/es/`: submit valid and failing forms, confirm the announcements |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
