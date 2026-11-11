---
phase: quick-261110-tfd
plan: 01
status: complete
subsystem: site-data, contact, footer
tags: [contact, email, instagram, i18n, a11y, quick]
requires: []
provides:
  - Real contact email (martinafernandez170404@gmail.com) in site.email
  - Instagram social link (https://www.instagram.com/martif_ph/) in footer and Contact section, EN and ES
  - EmailText.astro (contact email that wraps after the "@" on narrow screens)
affects:
  - src/components/global/SiteFooter.astro
  - src/components/contact/ContactSection.astro
  - src/components/contact/ContactForm.astro
tech-stack:
  added: []
  patterns:
    - "<wbr> after the @ inside a span, so the break never becomes its own flex item"
key-files:
  created:
    - src/components/ui/EmailText.astro
  modified:
    - src/data/site.ts
    - scripts/spanish-review.ts
    - .planning/phases/08-quality-verification/08-SPANISH-REVIEW.md
    - src/components/global/SiteFooter.astro
    - src/components/contact/ContactSection.astro
    - src/components/contact/ContactForm.astro
    - tests/unit/site-footer.test.ts
    - tests/unit/contact-section.test.ts
    - tests/unit/spanish-review.test.ts
    - tests/e2e/a11y.spec.ts
    - tests/e2e/layout.spec.ts
decisions:
  - "The long real email wraps after the @ (<wbr>), with wrap-anywhere as fallback, instead of shrinking the type"
  - "site.url keeps the .example domain and its TODO(martina); only the email TODO was removed"
metrics:
  completed: 2026-11-10
  tasks: 3
  commits: 4
---

# Quick 261110-tfd: Real contact email and Instagram link Summary

The site now uses Martina's real address, martinafernandez170404@gmail.com, everywhere `site.email` is read: the footer and Contact section links, the no-JS mailto, and the form failure and Turnstile copy. The `@martif_ph` Instagram link renders after Behance in the footer and the Contact section, in EN and ES. The new address is much longer than the placeholder and made the page overflow at 320px, so it now wraps after the "@".

## Commits

| Task | Commit | Message |
| ---- | ------ | ------- |
| 1 (RED) | 57c0578 | test(quick-261110-tfd): cover real email and instagram |
| 1 (GREEN) | a9834b8 | feat(site): add real email and instagram link |
| 2 | 05c8435 | test(site): cover instagram in e2e order |
| 3 (Rule 1 fix) | a5867a2 | fix(site): wrap long email on narrow screens |

None of the commits has a Co-Authored-By or Claude attribution line (checked with `git log -4 --format=%B`). Nothing was pushed.

## What changed

- `src/data/site.ts`: `email: 'martinafernandez170404@gmail.com'`, `socials.instagram: 'https://www.instagram.com/martif_ph/'`. The `// TODO(martina): real address` line is gone. Line 17 `TODO(martina): real domain` and the `.example` `url` are unchanged.
- `scripts/spanish-review.ts`: the email entry was removed from `NON_COPY_TODOS` (6 entries become 5). The WR-04 entry is now `src/data/site.ts:17-18` and mentions only the domain. `08-SPANISH-REVIEW.md` was regenerated with `pnpm review:spanish`, not edited by hand.
- `SocialLinks.astro`, the i18n dictionaries and `.env.example` were not changed. The existing `socials.instagram &&` branch renders the link.
- Tests: the unit tests pin the email, check the Instagram href and label (EN "Martina on Instagram", ES "Martina en Instagram") and the `<wbr>` break, and expect 5 `NON_COPY_TODOS`. In `a11y.spec.ts`, `footerSteps` and `contactSteps` now include the Instagram stop right after Behance, and the order comments are updated. In `layout.spec.ts`, the footer test checks the Instagram href, `target=_blank`, `rel` noopener and noreferrer, and the sr-only new-tab hint. The optional `instagram` field is checked once per module, and the test throws if it is missing (no non-null assertion).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The longer email overflowed at 320px**
- **Found during:** Task 3 (first e2e run): 11 failures, all 320px "no horizontal overflow" checks (scrollWidth 323 > 320) in `layout.spec.ts` and `contact.spec.ts`.
- **Issue:** Measured on a local preview at 320px. In the Contact section, the email link (one unbreakable 32-character token) widened its grid column to 323px, so the page scrolled sideways. In the footer, the larger email ended at x=361.8px and the footer's `overflow-hidden` cut it off visually.
- **Fix:** New `src/components/ui/EmailText.astro` renders `<span class="min-w-0 wrap-anywhere">local@<wbr />domain</span>`. It is used in the footer and Contact section links, so the email breaks as "martinafernandez170404@ / gmail.com" and the text content and accessible name stay the plain address. `wrap-break-word` was added to the no-JS body paragraph and the form failure body, and `min-w-0 wrap-break-word` to the Turnstile note text span, because those strings include the email. This changes `src/components`, which the plan's Task 1 check expected to stay untouched. The change was needed because of the new data.
- **Files:** `src/components/ui/EmailText.astro` (new), `SiteFooter.astro`, `ContactSection.astro`, `ContactForm.astro`, plus unit assertions in `site-footer.test.ts` and `contact-section.test.ts`.
- **Commit:** a5867a2

Because markup changed, the full taste check ran (lint, inspect and screenshots), not just the lint the plan called for.

## Verification

All results below are [Verified] by running the command.

- `pnpm test`: 77 files, 1428 tests passed (6 failed in the RED step before the site.ts change, as expected).
- `pnpm lint` (astro check + eslint + prettier): 0 errors, 0 warnings, 3 hints in `tmp/lighthouse/css-split.mjs`, which is not project source.
- Task 1 greps: the real email is in site.ts; no `hello@martinafernandez.example` in src/tests/scripts; no "real address" or "Real contact email" in site.ts, the generator or the review file; `TODO(martina): real domain` is still present.
- `pnpm build`: succeeded, run under the shared lock `tmp/build-e2e.lock` (owner `quick-261110-tfd`).
- `pnpm exec playwright test tests/e2e/layout.spec.ts tests/e2e/a11y.spec.ts tests/e2e/contact.spec.ts`, final run after the fix: **108 passed, 0 failed** (`tmp/quick-261110-tfd-e2e.log`).
  - The run between the fix and the final run had 1 failure: `contact.spec.ts:413` "validation: server input errors use the same messages on /" (`@network`). The real Turnstile widget did not issue a token within 15 s. That is unrelated to email, socials or tab order. Re-run alone, it passed for EN and ES (`tmp/quick-261110-tfd-e2e-rerun.log`), and it passed in the final full run.
- `pnpm measure:bundle`: the page sizes and the max line are identical to the Phase 9 record (`diff` of `tmp/09-regate-bundle.txt` against `tmp/quick-261110-tfd-bundle.txt` is empty). The max is 18015 B eager gzip on `/`, within the 22000 B budget.
- Taste `lint.mjs` on EmailText, SocialLinks, SiteFooter, ContactSection and ContactForm: `RESULT: 0 FAIL, 0 WARN`.
- Taste `inspect.mjs` on `/` and `/es/` at 1440, 390 and 320 (output in `tmp/quick-261110-tfd-inspect/`):
  - `/`: 1 FAIL `empty-screens` @1440 (screens 2, 3). This existed before and was accepted in Phases 3, 7 and 9 (STATE.md). WARNs: `size-count`, `first-action`, `no-footage`, also seen before.
  - `/es/`: the same `empty-screens`, plus `headline-lines` @320: "Herramientas con las que trabajo" wraps to 3 lines. That is the Tools section heading, which this task did not touch. [Inference] It was not caused by this change. It was not confirmed against a pre-change build, and earlier gates may have run inspect without the 320px width. It needs a separate look.
  - No `overflow`, `clipped-text` or `covered-text` on either page.
- Screenshots reviewed (`tmp/quick-261110-tfd-inspect/footer-320-en.png`, `contact-320-en.png`, `footer-390-es.png`, `footer-1440-en.png`): at 320px the email wraps cleanly after the "@" in both places. At 390px and 1440px it stays on one line. The Behance and Instagram icons sit side by side with their new-tab arrows. scrollWidth equals the viewport at 320, 390 and 1440.
- Lock released (`tmp/build-e2e.lock` removed). Ports 4400 and 4411 checked free before release. No preview is left running.

## Notes for the user

- **LCP:** This is a src change after `cc64ecd`. It touches only static text and links (email string, one extra icon link in the footer/contact social row, below the fold): no images, CSS layout or above-the-fold scripts changed, so the 08-17 LCP re-measure was not re-run. The only CSS added is the wrap utilities on the email in the below-the-fold Contact section and footer.
- **CONTACT_TO deploy value:** `.env.example` `CONTACT_TO=` was intentionally left empty. The form's destination inbox must be set as a deploy secret or env var by you: `CONTACT_TO=martinafernandez170404@gmail.com`. While sending from `onboarding@resend.dev` (D-21), the Resend account must be owned by that same address. The `resend.ts` verified-domain TODO remains.
- **Still open:** the real domain (`site.url` `.example`, `TODO(martina)` at `src/data/site.ts:17`).
- **Out of scope, flagged:** the ES Tools heading `headline-lines` at 320px (see Verification).

## Threat model

- T-q261110-01 (accept): the email is meant to be public. No secrets were added, and `.env.example` is unchanged.
- T-q261110-02 (mitigate): the Instagram link uses the existing `IconLink` (`target=_blank`, `rel="noopener noreferrer"`). `layout.spec.ts` checks both rel tokens. [Verified] It passed in the e2e run.

## Known Stubs

None added. The `.example` domain is an existing, tracked TODO.

## Self-Check: PASSED

- FOUND: src/components/ui/EmailText.astro, src/data/site.ts, .planning/phases/08-quality-verification/08-SPANISH-REVIEW.md
- FOUND commits: 57c0578, a9834b8, 05c8435, a5867a2
