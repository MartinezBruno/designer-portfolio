---
phase: 05-contact
plan: 06
subsystem: ui
tags: [contact, form, validation, a11y, mailto, e2e, tdd]
requires:
  - phase: 05-04
    provides: "contactSchema, CONTACT_ERRORS, LIMITS, EMAIL_PATTERN"
  - phase: 05-05
    provides: "createContactForm, handleNonSuccess hook, data-contact-status, ContactForm markup"
provides:
  - "src/lib/contact/validate.ts: validateContact, ContactValues, FieldErrors (browser mirror of the schema, no zod)"
  - "src/lib/contact/mailto.ts: buildPrefilledMailto, MAILTO_MAX_LENGTH (1800)"
  - "src/lib/ui/contact-form.ts: serverFieldErrors, client validation, live re-validation, failure block"
  - "ContactForm.astro: error summary, per-field error slots, failure block, data-email"
affects: [05-07, 05-08]
tech-stack:
  added: []
  patterns:
    - "Client validator mirrors the server schema check by check, held in step by a parity table that runs the real schema in Vitest"
    - "Server error values are allow-listed against CONTACT_ERRORS before any lookup; text reaches the DOM only through textContent"
    - "mailto body cut by code points before encoding, so neither surrogate pairs nor %XX escapes are ever split"
key-files:
  created:
    - src/lib/contact/validate.ts
    - src/lib/contact/mailto.ts
    - tests/unit/contact-validate.test.ts
    - tests/unit/contact-mailto.test.ts
  modified:
    - src/components/contact/ContactForm.astro
    - src/lib/ui/contact-form.ts
    - tests/unit/contact-form.test.ts
    - tests/e2e/contact.spec.ts
key-decisions:
  - "For an over-long email Zod reports the pattern first: a 255-character address that matches EMAIL_PATTERN gets emailTooLong, while a long malformed one gets only emailInvalid. The client mirrors this order (pattern, then length)."
  - "An `input` result whose fields name no known field and carry no known key shows the generic failure block, so the visitor always gets feedback."
  - "Validation runs before the Turnstile token check, so an invalid form never waits on or spends a token."
  - "The e2e 400 stub carries `issues`, not just `fields`: Astro's action client rebuilds `fields` from `issues` (ActionInputError constructor)."
requirements-completed: [CONT-01, CONT-03]
duration: about 70 min (much of it slow e2e runs under host load)
completed: 2026-10-21
---

# Phase 5 Plan 06: Validation and failure feedback Summary

**The contact form now tells visitors what is wrong, in EN or ES, and never loses their words. It has a client validator that mirrors the server schema without zod, server input errors shown with the same messages, an error summary and per-field errors with correct aria wiring, and a failure block with Try again and a prefilled, length-capped mailto. Every typed value and the checked chip stay as they were.**

## Accomplishments

- **`validate.ts`**: trims the fields, then checks them in the schema's order:
  - name: required (abort), then max 100.
  - email: `EMAIL_PATTERN`, then max 254.
  - message: required (abort), then min 10, then max 5000.

  It imports only `errors.ts` and `fields.ts`, so it has no zod and no dictionary values.
- **`mailto.ts`**:
  - Line breaks are normalized to CRLF and every part goes through `encodeURIComponent`.
  - If the URL is too long, a binary search finds the longest code-point prefix that fits with `…` appended.
  - If even an empty body cannot fit, the URL drops the body and keeps only `mailto:<to>?subject=…`.
- **`ContactForm.astro`** (built to the UI-SPEC markup):
  - The summary is the first child of the form: a danger title with a `size-5` alert icon, then `<ul data-contact-summary-list aria-labelledby>` with `pl-7`.
  - Each field has a `contact-<field>-error` `<p hidden>` holding an icon and `<span data-error-text>`. The id always resolves.
  - The failure block is the last child of the form: a danger title, the body with the email filled in, and the `data-contact-failure-mailto` link.
  - The form carries `data-email`. There is no `role="alert"` or `aria-live`.
- **`contact-form.ts`**:
  - The first submit sets `attempted` and validates the form. Fields get `aria-invalid="true"`, and `contact-<field>-error` is appended to `aria-describedby`. The message field keeps its hint id first.
  - The summary gets one link per invalid field, in form order, with classes from the `SUMMARY_LINK` constant. Focus moves to the first invalid field.
  - After that, an `input` event re-validates only the changed field and refreshes the summary. Focus never moves.
  - Clicking a summary link is handled by delegation: it calls `preventDefault` and focuses the field.
  - `handleNonSuccess`:
    - `input`: `serverFieldErrors` keeps only allow-listed keys, then the errors render and the first field gets focus.
    - `failed`: the mailto is rebuilt from the current values, using the subject with the chip label, or the no-service subject when `other` is checked. The block is shown, the label becomes "Try again", and the status region announces the title and body. Focus does not move.
  - A new send hides the block. "Send another message" clears the errors and the block.

## Task Commits

1. **Task 1 RED**: `810039d` test(05-06): add failing validation and failure e2e. Of the 22 targeted tests, 20 failed before the implementation. The 2 "nothing shows before the first submit" tests passed, as expected, because they check for absence.
2. **Task 2 RED**: `6ffeff8` test(05-06): add failing validator and mailto tests (the modules did not exist yet).
3. **Task 2 GREEN**: `e2e4db1` feat(05-06): add client validator and mailto builder
4. **Task 3 GREEN**: `47a5650` feat(05-06): show validation errors and failure block

## Verification (run in this worktree)

- `pnpm lint`: astro check reports 0 errors, 0 warnings and 0 hints. ESLint and Prettier are clean, and the 05-05 client-bundle boundary accepts both new modules.
- `pnpm test`: 54 files, 889 tests pass:
  - contact-validate: 28 tests, including a **22-row parity table** against `contactSchema.safeParse`.
  - contact-mailto: 9 tests.
  - contact-form: 36 tests (12 new).
- `pnpm build` then the full `playwright test`: **509/509 pass**, with all 22 new validation/failure tests in EN and ES, including axe 0 violations with the summary shown and with the failure block shown.
- `--list | grep -c "@network"` for `-g "validation|failure"` = 22.
- `pnpm check:secrets`: ok (1003 dist files).
- Acceptance greps:
  - `form.reset()` 1 (only in "Send another message")
  - `validateContact(` 2
  - `buildPrefilledMailto(` 1
  - `role="alert"|aria-live` in ContactForm.astro 0
  - `innerHTML` 0
  - `astro/zod` 0 in validate.ts and mailto.ts
  - no value imports across the boundary
- Built CSS contains `pl-7`, `hover:decoration-accent`, `focus-visible:decoration-2` and `decoration-1`.
- The ContactForm entry chunk is 17,131 B raw and **6,683 B gzip**, up from 5,222 B gzip in 05-05 (+1.46 KB). It contains no zod (`ZodError` count 0).

## Taste

As in 05-05, the `taste-skill:taste-skill` skill could not be invoked as a skill from this agent. I applied the UI-SPEC class contract verbatim and ran `lint.mjs` on src/components and src/pages. It reports the same 1 FAIL (SiteHeader hairline) and 1 WARN (ToolsRow outlined box) as before, both pre-existing and accepted earlier. **ContactForm.astro has no findings.**

I took screenshots of the summary and failure states with a throwaway spec (deleted, not committed), under reduced motion, at 320/390/1440 in EN and ES. They are in `/private/tmp/claude-501/-Users-bmartinez-Developer-personal-designer-portfolio/dd8cfb49-01a0-4f88-a739-49945dda9ca5/scratchpad/shots/`.
- `scrollWidth` stays within the viewport in every state.
- The summary has no box: a danger title and icon, and underlined ink links.
- Field errors have an icon and text under each field, with the danger bottom border.
- The failure block is flat, with the danger title, the body and a semibold mailto link.
- Element screenshots show the sticky header over the form and an unpainted Turnstile iframe. Both are screenshot artifacts, as noted in 05-05.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The e2e 400 stub includes `issues`**
- **Found during:** Task 1 (I read `astro/dist/actions/runtime/client.js`)
- **Issue:** `ActionError.fromJson` builds `new ActionInputError(body.issues)`, which derives `fields` from `issues`. The plan's body (`issues: []`) would give empty `fields`, so the test could never pass.
- **Fix:** The stub sends `issues: [{ code: 'custom', path: ['email'], message: 'contact.error.emailInvalid' }]` as well as `fields`.
- **Commit:** 810039d

**2. [Rule 2 - Missing functionality] An input error with no known field falls back to the failure block**
- **Issue:** For example, a `locale` issue, or keys that are not in `CONTACT_ERRORS`. Without a fallback the visitor would get no feedback at all.
- **Fix:** If `serverFieldErrors` yields nothing, the controller shows the generic failure block. A unit test covers it.
- **Commit:** 47a5650

**3. [Rule 1 - Bug] Updated an existing 05-05 unit test**
- **Issue:** "keeps every value and restores the button on failed" asserted the "Send message" label, but the plan now makes it "Try again" after a failed send.
- **Fix:** The assertion now expects `contact.retry` for `failed` and `contact.submit` for `input`.
- **Commit:** 47a5650

### Process notes

- **TDD order in Task 3:** I wrote the controller unit tests in the same change as the implementation rather than in a separate RED commit. The Task 1 e2e RED commit (`810039d`) covers the Task 3 behaviour and failed first. Task 2 followed RED then GREEN.
- **Worktree base:** I reset it to `501d721` with `git reset --hard` before any work, per the orchestrator's branch check. HEAD was at the older `234dcb2`.
- **`.dev.vars`:** copied from the main checkout, with `CONTACT_TO` left blank.
- **First e2e runs were stopped:** they hit the tool's foreground timeout under host load. I stopped them and re-ran in the foreground with logs in the scratchpad. The later runs took 54 s (targeted) and 1.3 min (full).

## Known Stubs

None added. The 05-02 copy stubs remain: every `contact.*` string is `TODO(martina)`, and `site.email` is a placeholder.

## Threat Flags

None beyond the plan's threat model:
- T-05-27: allow-listed keys, `textContent` only, and a unit test with an `<img onerror>` value.
- T-05-28: everything is encoded, the recipient comes from `data-email` (`site.email`), the length is capped at 1800 and truncation is by code points.
- T-05-29: one generic message for every non-input failure.

## TDD Gate Compliance

- RED: `810039d` (e2e) and `6ffeff8` (unit).
- GREEN: `e2e4db1` and `47a5650`.
- No refactor commit.

## Self-Check: PASSED

- FOUND: src/lib/contact/validate.ts, src/lib/contact/mailto.ts, tests/unit/contact-validate.test.ts, tests/unit/contact-mailto.test.ts, src/components/contact/ContactForm.astro, src/lib/ui/contact-form.ts
- FOUND commits: 810039d, 6ffeff8, e2e4db1, 47a5650
