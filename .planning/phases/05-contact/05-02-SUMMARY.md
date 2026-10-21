---
phase: 05-contact
plan: 02
subsystem: ui
tags: [astro, i18n, contact, no-js, mailto, a11y, e2e]
requires:
  - phase: 05-01
    provides: "Cloudflare adapter, astro:env schema, e2e preview env, src/actions placeholder"
provides:
  - "ContactSection.astro: Home Contact section (id=contact) with invitation column and the visible no-JS mailto block"
  - "data-contact-column (form mount point for 05-05) and data-contact-nojs hooks"
  - "SocialLinks.astro shared by the footer and the section"
  - "src/lib/ui/button-classes.ts: primaryButton, inkButton"
  - "All Phase 5 dictionary keys (36 contact.* + services.ask, services.askTarget) in EN and ES"
  - "Every Contact link points to /#contact or /es/#contact"
affects: [05-04, 05-05, 05-06, 05-07, 05-08]
tech-stack:
  added: []
  patterns:
    - "No-JS fallback shipped visible (no <noscript>); later script hides it when the form is revealed"
    - "Shared class strings live in src/lib/ui/button-classes.ts"
key-files:
  created:
    - src/components/contact/ContactSection.astro
    - src/components/ui/SocialLinks.astro
    - src/lib/ui/button-classes.ts
    - tests/e2e/contact.spec.ts
    - tests/unit/contact-section.test.ts
  modified:
    - src/i18n/ui.en.ts
    - src/i18n/ui.es.ts
    - src/components/ui/ButtonLink.astro
    - src/components/project/EmbedFacade.astro
    - src/components/global/SiteFooter.astro
    - src/components/views/HomeView.astro
    - src/components/global/SiteHeader.astro
    - src/components/sections/Hero.astro
    - src/components/views/ProjectsView.astro
    - tests/e2e/a11y.spec.ts
    - tests/e2e/home.spec.ts
    - tests/e2e/layout.spec.ts
    - tests/unit/site-footer.test.ts
    - tests/unit/site-header.test.ts
key-decisions:
  - "The section email link copies the footer's class string verbatim (as the plan specifies) instead of extracting a third shared constant"
  - "The pre-existing header border-b taste FAIL is recorded, not changed (it was accepted in Phases 3 and 4)"
requirements-completed: [CONT-05]
duration: 20min
completed: 2026-10-20
---

# Phase 5 Plan 02: Home Contact section and no-JS mailto Summary

**Home now ends with a bilingual Contact section (`section#contact`). It has an invitation column with the email link and socials, plus a visible no-JS block with an "Email me" `mailto:` link whose subject is a localized, encoded string. Every Contact link on the site points to `/#contact` or `/es/#contact`, and all Phase 5 dictionary keys exist in EN and ES.**

## Performance

- **Duration:** about 20 min
- **Completed:** 2026-10-20
- **Tasks:** 3
- **Files:** 5 created, 14 modified

## Accomplishments

- `ContactSection.astro` follows the UI-SPEC section frame:
  - 5/7 grid from `lg`, stacked below that
  - h2 `#contact-title` with `text-4xl`
  - intro, email link and `SocialLinks`
  - `[data-contact-column]` holding `[data-contact-nojs]`, which ships visible with no `<noscript>`
  - mailto subject built with `encodeURIComponent(t('contact.nojs.subject'))` (T-05-07)
  - no third-party scripts (T-05-08)
- `SocialLinks.astro` is the footer's socials list moved verbatim. The footer renders it and no longer has `id="contact"` (D-03); the rest of the footer is unchanged.
- `button-classes.ts` exports `primaryButton` and `inkButton`. `ButtonLink` and `EmbedFacade` use them. The rendered class attributes in `dist/` are byte-identical to the pre-change build (I diffed the extracted `class="..."` sets from both builds).
- The header nav, the hero CTA and the projects empty-state CTA use `` `${getRelativeLocaleUrl(locale, '/')}#contact` `` (D-04).
- The 38 new keys were copied verbatim from the UI-SPEC table by a script that parses it, so EN and ES match the spec exactly.

## Task Commits

1. **Task 1: failing e2e (RED).** `fa2e3ee` (test). After `pnpm build`, all 6 contact.spec tests failed. `--list | grep -c "without JavaScript"` gives 4.
2. **Task 2: keys, button classes, SocialLinks and ContactSection.** `5934cb5` (feat)
3. **Task 3: re-pointed Contact links (GREEN).** `ab18150` (feat)

## Verification

I ran each of these and confirmed the result:
- `pnpm lint`: astro check reports 0 errors, 0 warnings and 0 hints. ESLint and Prettier are clean.
- `pnpm test`: 44 files, 705 tests pass (697 before this plan, plus 8 in contact-section.test.ts).
- `pnpm test:e2e`: 465/465 pass. That covers contact.spec, plus layout, home and a11y: keyboard order in EN and ES (with and without reduced motion), and axe with 0 violations on `/` and `/es/` including the new section.
- Acceptance greps:
  - no `href="#contact"` left in the header, hero or projects view
  - `getRelativeLocaleUrl(locale, '/')` present in all three
  - 36 `contact.` keys in ui.es.ts
  - `<SocialLinks` appears once in the footer and once in the section
  - `<ContactSection` comes after `<ToolsRow`
  - no `noscript`
- Screenshots of the section at 1440 (EN) and 390 (ES) under reduced motion:
  - the heading is 1 line at 1440 and 2 lines at 390
  - no overflow
  - no ornaments
  - The desktop form column is sparse (only the no-JS paragraph and button) until 05-05 mounts the form. The full inspect.mjs and state screenshots are scheduled for 05-08.

## Taste lint

`node .../taste-skill/scripts/lint.mjs src/components src/pages` (42 files):
```
FAIL [hairline] src/components/global/SiteHeader.astro:30  border-b
WARN [outlined-box] src/components/sections/ToolsRow.astro:21  border
RESULT: 1 FAIL, 1 WARN
```
Both findings were there before this plan. The header `border-b` is the same FAIL accepted in 03-05, 04-11 and 04-12 (UI-SPEC: header hairline untouched), and this plan only changed the Contact href in that file. The ToolsRow WARN dates from Phase 2. ContactSection.astro, SocialLinks.astro, SiteFooter.astro, Hero.astro and ProjectsView.astro have no findings.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated `tests/unit/site-header.test.ts` for the D-04 href**
- **Found during:** Task 3
- **Issue:** The test "nav lists Projects before Contact" looked up `href="#contact"`. Once the link was re-pointed, `indexOf` returned -1, so 2 unit tests failed. The plan didn't list this file.
- **Fix:** The test now looks up `` `href="${home}#contact"` `` (`/` or `/es/`).
- **Files modified:** tests/unit/site-header.test.ts
- **Commit:** ab18150

**2. [Rule 3 - Blocking] Updated the footer id assertion in `tests/e2e/layout.spec.ts:22`**
- **Found during:** Task 1
- **Issue:** The footer test asserted `id="contact"` on `contentinfo`. Under D-03 that would fail. The plan cited only lines 39-47 of this file.
- **Fix:** The test now asserts `not.toHaveAttribute('id', 'contact')`.
- **Commit:** fa2e3ee

### Other notes

- The worktree base was corrected with `git reset --hard 9b37f53` before any work, following the orchestrator's branch check.
- `.dev.vars` was copied from the main checkout (it is gitignored) for the e2e preview.

## Known Stubs

All 38 new dictionary keys are TODO(martina) copy, grouped under `// TODO(martina): Phase 5 contact copy` in `src/i18n/ui.en.ts` and `src/i18n/ui.es.ts`:
`contact.submit`, `contact.sending`, `contact.retry`, `contact.heading`, `contact.intro`, `contact.service.legend`, `contact.optional`, `contact.service.other`, `contact.name.label`, `contact.email.label`, `contact.message.label`, `contact.message.hint`, `contact.honeypot`, `contact.summary.title`, `contact.error.nameRequired`, `contact.error.nameTooLong`, `contact.error.emailInvalid`, `contact.error.emailTooLong`, `contact.error.messageRequired`, `contact.error.messageShort`, `contact.error.messageTooLong`, `contact.turnstile.loading`, `contact.turnstile.wait`, `contact.turnstile.error`, `contact.status.sending`, `contact.failure.title`, `contact.failure.body`, `contact.failure.mailto`, `contact.mailto.subject`, `contact.mailto.subjectNoService`, `contact.success.heading`, `contact.success.body` (the 48 h promise, D-11), `contact.success.again`, `contact.nojs.body`, `contact.nojs.button`, `contact.nojs.subject`, `services.ask`, `services.askTarget`.

Only `contact.heading`, `contact.intro` and the three `contact.nojs.*` keys render in this plan. The rest are consumed by 05-04 through 05-06.

Other stubs:
- `[data-contact-column]` holds only the no-JS block until 05-05 mounts the form. This is intentional: it is a working contact path for every visitor.
- `site.email` is still the placeholder `hello@martinafernandez.example` (TODO(martina), from an earlier phase).

## Threat Flags

None. The only new surface is the `mailto:` links, which the plan's threat model covers:
- T-05-07 is mitigated: the subject is an encoded dictionary constant.
- T-05-08 is mitigated: no third-party script, and the e2e asserts there is no request to challenges.cloudflare.com.
- T-05-06 is accepted: the section shows only the public `site.email`.

## TDD Gate Compliance

The RED commit `fa2e3ee` (test) comes before the GREEN commits `5934cb5` and `ab18150` (feat). No refactor commit was needed.

## Self-Check: PASSED

- FOUND: src/components/contact/ContactSection.astro, src/components/ui/SocialLinks.astro, src/lib/ui/button-classes.ts, tests/e2e/contact.spec.ts, tests/unit/contact-section.test.ts
- FOUND commits: fa2e3ee, 5934cb5, ab18150
