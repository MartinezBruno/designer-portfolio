---
phase: 05-contact
plan: 05
subsystem: ui
tags: [contact, form, turnstile, astro-actions, a11y, e2e, tdd]
requires:
  - phase: 05-02
    provides: "ContactSection, data-contact-column/nojs hooks, button-classes, contact.* keys"
  - phase: 05-04
    provides: "actions.contact (form Action), CONTACT_ERRORS"
provides:
  - "ContactForm.astro: hidden-until-JS form + success panel, script wiring actions.contact and PUBLIC_TURNSTILE_SITE_KEY"
  - "ServiceChips.astro: fieldset/legend radio chips (4 services + other, other checked)"
  - "src/lib/ui/contact-form.ts: createContactForm(deps): PageInit, loadTurnstileScript, SendResult, ContactFormDeps, handleNonSuccess hook for 05-06"
  - "src/lib/contact/strings.ts: resolveContactStrings, ContactStrings, ContactUIKey"
  - "src/i18n/interpolate.ts: dictionary-free interpolate (t.ts re-exports it)"
  - "src/types/turnstile.d.ts: TurnstileApi, TurnstileRenderOptions, Window.turnstile"
  - "ESLint client-bundle boundary (@typescript-eslint/no-restricted-imports, allowTypeImports)"
affects: [05-06, 05-07, 05-08]
tech-stack:
  added: []
  patterns:
    - "Server-resolved copy shipped as JSON in data-contact-strings; the client never bundles the dictionaries"
    - "Controller with injected deps (send, siteKey, loadTurnstile), so it never imports astro:actions/astro:env"
    - "aria-disabled (never disabled) plus a pending guard for the sending state"
key-files:
  created:
    - src/components/contact/ContactForm.astro
    - src/components/contact/ServiceChips.astro
    - src/lib/ui/contact-form.ts
    - src/lib/contact/strings.ts
    - src/i18n/interpolate.ts
    - src/types/turnstile.d.ts
    - tests/unit/contact-form.test.ts
    - tests/unit/contact-strings.test.ts
  modified:
    - src/i18n/t.ts
    - src/components/contact/ContactSection.astro
    - src/components/views/HomeView.astro
    - eslint.config.js
    - tests/unit/contact-section.test.ts
    - tests/e2e/contact.spec.ts
    - tests/e2e/a11y.spec.ts
key-decisions:
  - "The SVG icons in the submit button and the Turnstile note toggle the Tailwind `hidden` class, because Astro SVG components do not accept the `hidden` attribute (astro check ts2322)"
  - "The Turnstile note holds an alert-circle icon and a text span in the markup; the script sets tone (text-danger or text-ink-muted) and text, so no SVG is built in JS"
  - "Keyboard order test stops at the message field, then asserts Send message by Shift+Tab from the footer email (UI-SPEC option 1)"
  - "The hermetic 'Turnstile loads only near the section' test answers the api.js request locally, so it never reaches Cloudflare"
requirements-completed: [CONT-01, CONT-03]
duration: about 30 min
completed: 2026-10-21
---

# Phase 5 Plan 05: JS contact form happy path Summary

**With JavaScript, Home's Contact section now shows the bilingual form in place of the no-JS block. It has service chips (Phase 2 order plus "Not sure yet", checked by default), name, email, message, a lazily loaded compact Turnstile widget and "Send message". A submission goes through `actions.contact`; on success the form is replaced by the "Message sent" panel, which names the visitor, takes focus and is announced by the status region.**

## Accomplishments

- **`interpolate.ts`**: `interpolate` moved out of `t.ts` unchanged; `t.ts` re-exports it, so existing imports keep working (a unit test checks it is the same function).
- **`strings.ts`**: `resolveContactStrings(locale, email)` returns every `contact.*` key. Keys come from `Object.keys(en)` through a type guard. It fills `{min}` and the per-key `{max}` from `LIMITS` and `{email}` from the argument, and leaves `{name}`/`{service}` for the client. One cast remains, on the fully populated record, with a comment.
- **`ServiceChips.astro`**: built to UI-SPEC: fieldset, legend with "(optional)" span, 5 radios with `peer sr-only`, and the chip class constant verbatim with the `taste-skill-ignore` comment on the same line.
- **`ContactForm.astro`**:
  - The form ships `hidden novalidate aria-labelledby="contact-title"` with `data-locale` and the `data-contact-strings` JSON.
  - Fields carry the attributes and `LIMITS` maxlengths from the spec.
  - The honeypot `extra_info` is off-screen inside an `aria-hidden` wrapper with `tabindex="-1"`, plus the hidden `locale` input.
  - Turnstile slot is `min-h-[140px] w-[150px]`.
  - The submit button has label, arrow and spinner.
  - The Turnstile note sits under the submit row.
  - The success panel is a sibling of the form.
  - The script maps the Action result to `SendResult` and calls `lifecycle.register(createContactForm(deps))`.
- **`ContactSection.astro`**: takes a `services` prop, renders `<ContactForm>` after the no-JS block, and has exactly one `role="status"` `[data-contact-status]` as its last child. `HomeView` passes `services`.
- **`contact-form.ts`**:
  - Reveals the form and hides the no-JS block.
  - Turnstile loads once, on the first of: IntersectionObserver `rootMargin: '600px'` on `#contact`, `#contact` hash or `?service=`, or the first `focusin` in the form.
  - Explicit render into `[data-turnstile]` (`replaceChildren()`) with sitekey, `compact`, `light`, the page locale and action `contact`.
  - Wait note when there is no token. On `error-callback` or a script load failure: a danger note with icon, which stays sticky.
  - `expired-callback` resets the widget.
  - Sending state: `aria-disabled`, label "Sending…", spinner, status announcement, and a pending guard.
  - After every attempt the widget is reset.
  - Success: form hidden, panel shown, body set by `textContent`, heading focused, body announced.
  - `handleNonSuccess(result)` restores the button and keeps every value, ready for 05-06.
  - "Send another message" resets the form, re-checks `other`, resets the widget, clears status and focuses the name field.
  - Cleanup aborts the one AbortController, disconnects the observer, cancels the pending frame and calls `turnstile.remove(widgetId)`.
- **`eslint.config.js`**: adds the `@typescript-eslint/no-restricted-imports` boundary for `src/lib/ui/**`, `interpolate.ts` and the client-safe contact modules, with two `allowTypeImports: true` groups and a why-comment. The DATA-06 block is unchanged.

## Task Commits

1. **Task 1 RED**: `1f641ae` test(05-05): add failing js contact form e2e. After `pnpm build`, 20 of the targeted tests failed (form visibility, Turnstile loading, success, sending, wait/error notes, both keyboard orders, the axe-with-widget test); 10 passed (the unchanged no-JS ones and others).
2. **Task 2**: `c38ba47` feat(05-05): add hidden contact form markup
3. **Task 3 RED**: `bf2e926` test(05-05): add failing contact controller tests (failed: module did not exist)
4. **Task 3 GREEN**: `dcd9902` feat(05-05): wire contact form controller

## Verification (run in this worktree)

- `pnpm lint`: astro check reports 0 errors, 0 warnings and 0 hints. ESLint and Prettier are clean. 05-04's `errors.ts` is unchanged and passes the boundary.
- `pnpm test`: 52 files, 840 tests pass. That includes contact-form (24), contact-strings (5) and contact-section (23).
- `pnpm test:e2e`: build plus **487/487 pass**, covering every contact.spec, a11y.spec order and axe test in EN and ES, including the 8 `@network` tests.
- `--list | grep -c "@network"` = 8.
- `pnpm check:secrets`: `secrets check ok (1003 dist files scanned)`. `.dev.vars` has `CONTACT_TO` blank.
- ESLint boundary via stdin:
  - The type import of `UIKey` into `errors.ts` exits 0.
  - A value import of `useTranslations` exits 1 with `@typescript-eslint/no-restricted-imports`.
  - `import { z } from 'astro/zod'` in `contact-form.ts` exits 1.
- Acceptance greps:
  - `innerHTML` 0 and `astro/zod|astro:env|astro:actions` 0 in `contact-form.ts`
  - `lifecycle.register(createContactForm` 1
  - `render=explicit` 1
  - `cf-turnstile"` 0
  - `'disabled'|.disabled =` 0
  - `'@typescript-eslint/no-restricted-imports'` 1
  - `allowTypeImports: true` 2
  - chip ignore comment 1
  - `set:html|innerHTML` 0 in every contact component
  - `role="status"` 1
- **`peer-checked:[&>svg]:block` compiled.** The built CSS has the rule (grep count 1), and the e2e checks that the checked chip's icon is visible and an unchecked chip's icon is hidden. The `group-has-checked` fallback was not needed. `aria-[invalid=true]` also compiled.
- **Turnstile time-to-token** (test sitekey, measured from DOMContentLoaded on `/#contact` with a throwaway spec, 4 runs): 1834, 1824, 1822 and 1825 ms, so about 1.8 s.

## Home module script sizes (dist/client/index.html, gzip -c | wc -c)

| Script | Raw bytes | Gzip bytes |
|---|---|---|
| `BaseLayout.astro_astro_type_script_index_0_lang.DXAl1XW_.js` | 29 | 109 |
| `ContactForm.astro_astro_type_script_index_0_lang.AzIcuTV_.js` | 12,860 | 5,222 |
| `RolesMarquee.astro_astro_type_script_index_0_lang.C_1bRBzR.js` | 453 | 355 |
| `ToolsRow.astro_astro_type_script_index_0_lang.CxashT3e.js` | 1,002 | 506 |
| **Entry scripts total** | 14,344 | **6,192** |
| Shared chunk `motion.fiA7hLNr.js` (imported by the entries) | 1,176 | 551 |

That is 6,743 B gzip in total, entries plus the shared chunk. The ContactForm chunk contains no zod (`grep -c "zod|ZodError"` = 0). Most of its 5.2 KB is the `astro:actions` client and its serializer. Cloudflare's `api.js` is third-party, loaded lazily, and not counted.

## Taste

The `taste-skill:taste-skill` skill could not be invoked as a skill from this agent. I applied the UI-SPEC class contract (derived from the skill) verbatim and ran its `lint.mjs` directly:
```
FAIL [hairline] src/components/global/SiteHeader.astro:30  border-b
WARN [outlined-box] src/components/sections/ToolsRow.astro:21  border
RESULT: 1 FAIL, 1 WARN
```
Both findings were there before this plan; the header hairline was accepted in 03-05, 04-11, 04-12 and 05-02. ContactForm.astro, ServiceChips.astro and ContactSection.astro have **no findings**. The chip line's ignore comment is the only ignore.

Screenshots of the section with the widget rendered, under reduced motion, at 1440/390/320 in EN and ES, plus the 390 success panel. They were saved in the session scratchpad and are not committed.
- `scrollWidth` equals the viewport at every width, so there is no overflow.
- Pressable controls are round and fields are square.
- The checked chip shows ink fill plus the check icon.
- The success panel is a flat sand field.
- In one 390 ES element screenshot the Turnstile iframe had not painted, so the slot looks blank. The token was present, so this is screenshot timing, not layout.
- The full `inspect.mjs` run and state screenshots are scheduled for 05-08, as in 05-02.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The spinner icon uses the `hidden` class, not the `hidden` attribute**
- **Found during:** Task 2 (`pnpm lint`)
- **Issue:** `<IconLoader2 hidden>` failed astro check with ts2322: Astro SVG components do not accept `hidden`.
- **Fix:** `class="hidden size-5 motion-safe:animate-spin"`. The controller toggles the `hidden` class on `[data-icon-ready]`/`[data-icon-sending]`.
- **Commit:** c38ba47

**2. [Rule 2 - Missing functionality] The Turnstile note has an icon and a text span in the markup**
- **Found during:** Task 3
- **Issue:** UI-SPEC wants "danger + alert icon" for the load error. The plan's empty `<p data-turnstile-note>` would have forced building an SVG in JS.
- **Fix:** The note holds `IconAlertCircle [data-turnstile-note-icon]` (class `hidden` by default) and `<span data-turnstile-note-text>`. The script toggles `text-danger`/`text-ink-muted` and the icon.
- **Commit:** dcd9902

**3. [Rule 1 - Bug] The wait-note e2e waits for DOMContentLoaded**
- **Found during:** Task 3 GREEN run
- **Issue:** With `#contact` the widget script is injected before the window `load` event. The test's 10 s delayed `api.js` held `page.goto`'s load wait until the abort, so the error note showed instead of the wait note.
- **Fix:** `goto(..., { waitUntil: 'domcontentloaded' })`, then wait for the form to be visible.
- **Note:** for real visitors landing on `#contact`, the lazy Turnstile request can delay the window `load` event until Cloudflare responds (about 1.8 s observed). The DOM and the form are unaffected.
- **Commit:** dcd9902

**4. [Rule 3 - Blocking] The loader unit tests drive happy-dom's script events**
- **Issue:** happy-dom fires `error` synchronously on script insertion when file loading is disabled.
- **Fix:** The tests disable JS file loading in the file docblock options, so there is no network. They then use a pre-inserted "loading" script for the reuse and error paths, and `handleDisabledFileLoadingAsSuccess` plus a `window.turnstile` getter for the fresh-injection path. I also added a test that a failed fresh injection rejects and that a later call settles from the recorded state.

### Other notes

- I reset the worktree base to `a9b0c42` with `git reset --hard` before any work, following the orchestrator's branch check. The worktree was clean.
- `.dev.vars` was copied from the main checkout with `CONTACT_TO` left blank.
- I added a "resolves at once when `window.turnstile` exists" test and a "throwing send = failed send" test. The e2e axe-with-widget test is an addition: the hermetic `/` and `/es/` axe tests stay, so `E2E_OFFLINE=1` still axes Home.
- `handleNonSuccess` records `data-contact-result` (`failed`/`input`) on the form as a hook for 05-06. It is cleared on the next send and on "Send another message".

## Known Stubs

None added. The 05-02 copy stubs (every `contact.*` string is `TODO(martina)`, including the 48 h promise) and `site.email` (placeholder) remain. The `input`/`failed` branches only restore the button. Field errors and the failure block are 05-06's scope, as the plan says.

## Threat Flags

None beyond the plan's threat model:
- T-05-22: the name goes in by `textContent`; a unit test with `<b>` and a source test guard it.
- T-05-24: no Cloudflare request before the section is near (e2e) or on no-JS pages (05-02 e2e).
- T-05-25: pending guard plus `aria-disabled`; the e2e counts 1 request.
- T-05-26: ESLint boundary, and the bundle grep shows no zod.
- T-05-23 (third-party script) is accepted per the plan: fixed URL, explicit render, injected once.

## TDD Gate Compliance

- Task 1 RED `1f641ae`; GREEN came in `c38ba47` + `dcd9902`.
- Task 3 RED `bf2e926`, then GREEN `dcd9902`.
- Task 2 was committed as feat, with its unit tests written alongside.
- No refactor commits.

## Self-Check: PASSED

- FOUND: src/components/contact/ContactForm.astro, src/components/contact/ServiceChips.astro, src/lib/ui/contact-form.ts, src/lib/contact/strings.ts, src/i18n/interpolate.ts, src/types/turnstile.d.ts, tests/unit/contact-form.test.ts, tests/unit/contact-strings.test.ts
- FOUND commits: 1f641ae, c38ba47, bf2e926, dcd9902
