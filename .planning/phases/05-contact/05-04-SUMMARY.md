---
phase: 05-contact
plan: 04
subsystem: contact
tags: [contact, astro-actions, zod, turnstile, honeypot, tdd]
requires:
  - phase: 05-01
    provides: "astro:env secrets, Cloudflare adapter, e2e preview env"
  - phase: 05-02
    provides: "contact.error.* dictionary keys"
  - phase: 05-03
    provides: "fields.ts constants, buildContactEmail, createMailer"
provides:
  - "POST /_actions/contact (accept: 'form'): 200 on success, 400 send_failed on any rejection"
  - "src/lib/contact/errors.ts: CONTACT_ERRORS UIKey constants (client-safe)"
  - "src/lib/contact/schema.ts: contactSchema, ContactInput (server only)"
  - "src/lib/contact/turnstile.ts: verifyTurnstile with injected fetch"
  - "src/lib/contact/submit.ts: submitContact orchestrator, serviceTitlesEs"
affects: [05-05, 05-06, 05-08]
tech-stack:
  added: []
  patterns:
    - "Thin Action + pure orchestrator: submitContact never throws, the Action throws only ActionError send_failed"
    - "Zod error messages are dictionary keys, never English defaults"
key-files:
  created:
    - src/lib/contact/errors.ts
    - src/lib/contact/schema.ts
    - src/lib/contact/turnstile.ts
    - src/lib/contact/submit.ts
    - tests/unit/contact-schema.test.ts
    - tests/unit/contact-turnstile.test.ts
    - tests/unit/contact-submit.test.ts
    - tests/e2e/contact-server.spec.ts
  modified:
    - src/actions/index.ts
key-decisions:
  - "Email is z.string().trim().pipe(z.email({ pattern: EMAIL_PATTERN }).max(254)), so trimming happens before the regex and both emailInvalid and emailTooLong can report"
  - "Required checks use .min(1, { error, abort: true }) so an empty message reports only messageRequired"
  - "serviceTitlesEs(services) runs inside the handler in a try/catch that maps to send_failed, so its Error message can never reach the client"
requirements-completed: [CONT-01, CONT-02, CONT-04]
duration: long wall-clock (host load ~23 from parallel agents; cold image cache made builds slow)
completed: 2026-10-21
---

# Phase 5 Plan 04: Contact server send path Summary

**`POST /_actions/contact` now validates input with astro/zod, using dictionary-key errors. It then checks the honeypot, runs Turnstile siteverify server-side, builds the Spanish email from 05-03, and sends it through the env-selected mailer. Every rejection reaches the browser only as `ActionError BAD_REQUEST send_failed`.**

## Accomplishments

- `errors.ts`: `CONTACT_ERRORS` `as const satisfies Record<string, UIKey>`, plus `ContactErrorKey`. Imports no zod.
- `schema.ts` (server only). The exact Zod constructs:
  - name: `z.string({ error: nameRequired }).trim().min(1, { error: nameRequired, abort: true }).max(100, { error: nameTooLong })`
  - email: `z.string({ error: emailInvalid }).trim().pipe(z.email({ pattern: EMAIL_PATTERN, error: emailInvalid }).max(254, { error: emailTooLong }))`
  - message: `z.string({ error: messageRequired }).trim().min(1, { error: messageRequired, abort: true }).min(10, { error: messageShort }).max(5000, { error: messageTooLong })`
  - service: `z.enum(SERVICE_CHOICES).catch('other')`
  - locale: `z.enum(locales)`
  - `extra_info`: `z.string().max(500).nullish()`
  - `cf-turnstile-response`: `z.string().max(2048).nullish()`
  - Zod 4 accepted `abort` and the pipe form as written, so no workaround was needed.
- `turnstile.ts`: fixed siteverify URL, `AbortSignal.timeout(5000)`, `remoteip` only when known. An empty token returns `missing-input-response` without a network call.
- `submit.ts`: runs honeypot, then Turnstile, then build, then send. It returns `{ ok: false, reason }` for `honeypot`, `turnstile`, `turnstile_error`, `mailer_config` and `send_failed`. Logs carry only reasons and codes, never visitor PII (unit-asserted).
- `src/actions/index.ts`: replaces the 05-01 empty `server = {}` with the thin `contact` action. Secrets come only from `astro:env/server`. The localized 404 e2e tests still pass.

## Dev smoke test (console mailer)

`pnpm astro dev --ignore-lock` came up on port 4322, because 4321 was taken by another process. A curl POST of the base payload returned HTTP 200 `[{"ok":1},true]`, and the terminal logged:

```
[contact] email {
  "from": "Web Martina Fernandez <onboarding@resend.dev>",
  "to": [
    "inbox@example.invalid"
  ],
  "reply_to": "ana@example.com",
  "subject": "Nuevo mensaje web — Branding — Ana López",
  "text": "Nombre: Ana López\nEmail: ana@example.com\nServicio: Branding\nIdioma del sitio: Español (ES)\n\nMensaje:\nNecesito una identidad visual para mi café."
}
[200] POST /_actions/contact 115ms
```

During e2e, the preview logged `[contact] rejected: honeypot honeypot filled` and `[contact] rejected: turnstile missing-input-response`. Neither line contains PII.

## Task Commits

1. Task 1 RED: `ec46df5` test(05-04): add failing contact server e2e. Before the action existed, the endpoint returned 404 (checked with curl against the preview).
2. Task 2 RED: `ded9c00` test(05-04): add failing schema and turnstile tests
3. Task 2 GREEN: `67af0ee` feat(05-04): add contact schema and turnstile check
4. Task 3 RED: `90c01c0` test(05-04): add failing submitContact tests
5. Task 3 GREEN: `4e46616` feat(05-04): wire contact action to submitContact

## Verification (run in this worktree)

- `pnpm lint`: 0 errors, 0 warnings, Prettier clean.
- `pnpm test`: 50 files, 796 tests pass.
- `pnpm build`: exit 0. `contact-server.spec.ts` (6 tests, including `@network` accept) and `not-found.spec.ts` (4 tests) all pass.
- `pnpm check:secrets`: `secrets check ok (999 dist files scanned)`. See the note below; this result depends on the local `.dev.vars`.
- `pnpm build:offline`: `offline build ok (0 network attempts, 72 text files scanned, 20 html)`.
- Acceptance greps:
  - `astro:env/server` import: 1.
  - `import.meta.env` / `process.env` in the action and `src/lib/contact/*.ts`: 0.
  - `message: 'send_failed'`: 1.
  - `throw new Error` in the action: 0.
  - `astro/zod`: 0 in `errors.ts`, 1 in `schema.ts`.
  - `satisfies Record<string, UIKey>`: 1.
  - Siteverify URL in `turnstile.ts`: 1.
  - Test secret or recipient in `dist/client`: none.
- I did not run the full e2e suite (`pnpm verify`). Only the contact-server and not-found specs ran.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Security] Guarded `serviceTitlesEs` in the handler**
- **Issue:** the plan called `serviceTitlesEs(services)` inline in the handler. If it ever throws, the plain Error message would be serialized to the client (Pitfall 8).
- **Fix:** it now runs in a try/catch that logs server-side and throws the same `send_failed` ActionError.
- **Commit:** `4e46616`

**2. [Rule 1 - Bug] Test fixture corrections before RED commits**
- The 255-character email fixture was 251 characters. I lengthened the local part.
- The `social-media` Spanish title in `services.json` is "Social media", not "Redes sociales". I fixed the fixture.

### Secrets gate false positive (needs a decision, not fixed)

After the action wired in the mailer, `pnpm check:secrets` failed with `secret value found in: dist/server/chunks/entrypoint_*.mjs(.map)`.
- **Cause:** the local `.dev.vars`, copied from the main repo, sets `CONTACT_TO=inbox@example.invalid`. That is byte-identical to the public `CONSOLE_PLACEHOLDER_TO` literal in `src/lib/contact/mailer/index.ts` (05-03), which now reaches the server bundle.
- **Not a leak:** the Turnstile secret value is not in the bundle (grep count 0), and nothing appears in `dist/client`.
- **What I verified:** I blanked `CONTACT_TO` in this worktree's gitignored `.dev.vars` only. The gate then passed. The console mailer falls back to the same placeholder, so behaviour is unchanged.
- **Impact on the main repo:** `pnpm check:secrets` / `pnpm verify` **will fail** until the user either blanks `CONTACT_TO` in `.dev.vars` or sets it to a real address. Alternatively, the gate could learn to ignore known public placeholders. I did not weaken the gate or touch the main repo's `.dev.vars`.

## Known Stubs

None added. The 05-03 stubs remain: `CONTACT_FROM` uses `onboarding@resend.dev`, and the real `CONTACT_TO` is `TODO(martina)`.

## Threat Flags

None beyond the plan's threat model. T-05-14 through T-05-19 and T-05-21 are mitigated and tested. T-05-20 (no rate limiting) is accepted per the plan.

## TDD Gate Compliance

- Task 1: RED commit `ec46df5`. Its GREEN is Task 3's `4e46616`.
- Task 2: RED `ded9c00`, then GREEN `67af0ee`.
- Task 3: RED `90c01c0`, then GREEN `4e46616`.
- No refactor commits.

## Self-Check: PASSED

- FOUND: all 8 created files and `src/actions/index.ts`
- FOUND commits: ec46df5, ded9c00, 67af0ee, 90c01c0, 4e46616
