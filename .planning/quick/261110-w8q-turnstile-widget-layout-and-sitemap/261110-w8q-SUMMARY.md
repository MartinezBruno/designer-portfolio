---
phase: quick-261110-w8q
plan: 01
subsystem: contact, seo
tags: [turnstile, contact-form, sitemap, i18n, seo]
requires: []
provides:
  - "Turnstile widget: interaction-only + flexible, no reserved slot"
  - "/sitemap-index.xml + /sitemap-0.xml with en/es hreflang alternates"
affects: [contact form, SeoHead, astro.config]
tech-stack:
  added: ["@astrojs/sitemap 3.7.4 (exact pin, build-time only)"]
  patterns: ["before-interactive-callback toggles data-turnstile-interactive to open the gap above Send"]
key-files:
  created: []
  modified:
    - src/lib/ui/contact-form.ts
    - src/types/turnstile.d.ts
    - src/components/contact/ContactForm.astro
    - src/i18n/ui.en.ts
    - src/i18n/ui.es.ts
    - tests/unit/contact-form.test.ts
    - tests/unit/contact-section.test.ts
    - tests/e2e/contact-lazy.spec.ts
    - .planning/phases/08-quality-verification/08-SPANISH-REVIEW.md
    - package.json
    - pnpm-lock.yaml
    - astro.config.ts
    - src/components/global/SeoHead.astro
    - tests/e2e/seo.spec.ts
    - scripts/spanish-review.ts
decisions:
  - "Supersedes Phase 5 D-13 'compact widget': Turnstile now renders appearance 'interaction-only' + size 'flexible'. Managed mode, light theme, language, action, server siteverify and reset-after-every-attempt are unchanged."
  - "Send moves from the right end of a row (beside the widget) to the form's left edge, directly under the message field"
  - "New copy key contact.turnstile.interact replaces contact.turnstile.loading (no placeholder any more)"
  - "robots.txt stays Cloudflare-managed; the sitemap is announced with <link rel=\"sitemap\"> in every head"
metrics:
  duration: "~40 min"
  completed: 2026-11-10
---

# Quick 261110-w8q: Turnstile widget layout and sitemap Summary

Turnstile now renders `interaction-only` + `flexible`: most visitors see nothing, and challenged visitors see a full-width 65 px bar above Send instead of a 150x140 grey box. `@astrojs/sitemap` emits 18 EN/ES URLs with hreflang alternates.

## What changed

### Task 1: Turnstile (commit 7f90a8f)

- Option names and values checked against Cloudflare's widget-configurations docs (fetched 2026-11-10, page dated 2026-06-28). `size`: normal 300x65 | flexible 100% (min 300px) x 65 | compact 150x140. `appearance`: always | execute | interaction-only. `before-interactive-callback` exists.
- **Measured with Cloudflare's real script** (preview, test sitekeys):
  - `1x00000000000000000000AA` (always pass): the widget host stays **0 px tall**, and the token still arrives silently within about 2-5 s.
  - `3x00000000000000000000FF` (forced challenge): the host becomes **65 px**. After it is solved it **stays visible** (still 65 px with the token set).
- `contact-form.ts`: render `{ size: 'flexible', appearance: 'interaction-only', theme: 'light', language, action, callback, error-callback, expired-callback, before-interactive-callback }`.
  - `before-interactive-callback` sets `data-turnstile-interactive` on the slot. `resetWidget()` clears it (a fresh run is invisible again until it asks).
  - Submit with no token: the error note if the widget failed. Otherwise the new `contact.turnstile.interact` note ("Complete the spam check above, then send again." / "Completa la verificación antispam de arriba y vuelve a enviar.") while a challenge is visible, else the existing "still running" `contact.turnstile.wait` note. It never sends without a token.
- `ContactForm.astro`: removed `min-h-[140px] w-[150px] bg-surface-alt` and the loading placeholder. The slot is now an empty `w-full` block (`text-[0px] leading-[0]` kept for the inline-iframe descent from 07-21) stacked above Send, with `data-[turnstile-interactive]:mb-4`. Send is left-aligned with the fields.
- `turnstile.d.ts`: literal types are now `size: 'flexible'` and `appearance: 'interaction-only'`, plus the optional `before-interactive-callback`.
- Tests:
  - The unit tests expect the new options. A new case covers the marker, the interact note, solving and reset.
  - contact-section asserts an empty full-width slot with no `min-h-*`.
  - The contact-lazy 07-21 fake now models the measured resting anatomy (a full-width iframe, not displayed, in a closed root). That test asserts the slot reserves ≤1 px and the page height holds on mount.
- The Spanish review file was regenerated. Only the `contact.turnstile.*` row changed in this commit.

### Task 2: Sitemap (commit 36faec6)

- `@astrojs/sitemap@3.7.4` is pinned exactly. It is in the withastro/astro repo, has no peerDependencies, and depends on zod ^4.3.6 and sitemap ^9. The install succeeded.
- `astro.config.ts`: `integrations: [sitemap({ i18n: { defaultLocale, locales: {en:'en', es:'es'} }, filter: drop /404 })]`. `site` is already `https://martifernandez.com`. `/_actions` is on-demand, so it is never listed.
- Output: `dist/client/sitemap-index.xml` holds a single `<loc>https://martifernandez.com/sitemap-0.xml</loc>`. `sitemap-0.xml` has **18 URLs**: home, projects index and 7 project details, in each of EN and ES. Each URL carries `xhtml:link` hreflang alternates for en and es. There is no 404 or `_actions` entry.
- `SeoHead.astro`: `<link rel="sitemap" href="/sitemap-index.xml" />` on every page. There is no `public/robots.txt` in the repo, and live `/robots.txt` is Cloudflare-managed (content signals), so no `Sitemap:` line was added. To also list it there, add the sitemap URL in the Cloudflare dashboard's managed robots.txt settings, or commit a `public/robots.txt` (that would replace the managed one; not done here).
- `seo.spec.ts`: 3 new tests check the head link (EN and ES), the index → sitemap-0, all 18 locs, the alternates for each, and no 404/_actions.
- Adding the integration block moved the brand-fonts `TODO(martina)` from `astro.config.ts:76` to `:88`. `scripts/spanish-review.ts` was updated and the review file regenerated (spanish-review freshness test is green).

## Before / after (widget)

- **Before (live):** a 150x140 compact grey box ("Success!" + Cloudflare logo) left of Send, in a 140 px reserved slot, with the Send pill pushed to the far right of the row. The box showed for every visitor.
- **After, resting (almost every visitor):** nothing. The slot is 0 px, Send sits 32 px under the message field at the form's left edge, and CLS on `/#contact` load is 0.0000 at 1440/768/390 in both EN and ES.
  - Screenshots: `tmp/taste-w8q/en-1440-rest.png`, `en-768-rest.png`, `en-390-rest.png`, `es-*-rest.png`, plus the inspector set `tmp/taste-w8q/en/desktop-page-02.jpg` (all paths under /Users/bmartinez/Developer/personal/designer-portfolio).
- **After, challenged:** a full-width 65 px Cloudflare bar spanning the field column (752 / 704 / 358 px), 16 px above Send. Pressing Send shows "Complete the spam check above, then send again."
  - Screenshots: `tmp/taste-w8q/en-1440-challenge-view.png`, `en-768-challenge-view.png`, `en-390-challenge-view.png`, `es-*-challenge-view.png`. The red "For testing only" strip comes from the test key and does not appear with the real sitekey.
  - When the bar appears it shifts Send down by 81 px. Measured CLS is 0.046 at 1440 (Send already in view on `/#contact`) and 0 at 768/390 (below the fold). This is the accepted interaction-triggered expansion, only for visitors Cloudflare challenges, and it is under the 0.1 "good" threshold.

## Gates

| Gate | Result |
|------|--------|
| `pnpm lint` (astro check, eslint, prettier) | pass, 0 errors / 0 warnings |
| `pnpm test` | pass, 79 files / 1482 tests |
| `pnpm build` | pass (sitemap-index.xml created) |
| `pnpm check:secrets` | pass, 1320 dist files (1318 + 2 sitemap files) |
| `pnpm measure:bundle` | pass, eager max 18015 B on `/` (unchanged from the 09 / tfd baselines) |
| e2e seo + a11y + contact-lazy + contact + contact-preselect + contact-server (final build) | 174 passed |
| e2e contact-states (final build, default workers) | 30 passed |
| Taste lint (ContactForm.astro, contact-form.ts, SeoHead.astro) | 0 FAIL, 0 WARN (after rewording a comment containing "shadow root") |
| Taste inspect `/#contact`, `/es/#contact` @1440/768/390 | 1 FAIL `empty-screens` (screens 2-3) + 3 WARN (size-count, first-action, no-footage), page-level for all of Home. They also appear in the earlier Home inspect logs (`tmp/inspect-home.log`, `tmp/inspect-es-home.log`), are not caused by this change, and are out of scope. Contact screenshots reviewed at every width in both states. |

### Flaky network runs (reported faithfully)

On the intermediate build, `contact-states.spec.ts` (`@network`, real Cloudflare script and siteverify) failed 1/148 on the first parallel run and 3/30 on a parallel rerun, with different tests each time:
- token timeouts where the Turnstile script never loaded within 15 s (no input element, no error note);
- one server-side send failure.

The same spec passed 30/30 with `--workers=1`, and 30/30 with default workers on the final build. [Inference] These were transient network or rate-limit effects on challenges.cloudflare.com under parallel load, not the change. The resting widget still issues a token (measured above).

## Deviations from Plan

1. **[Rule 2 - Missing functionality] New `contact.turnstile.interact` copy.** With a visible challenge, the old "still running, wait a moment" note would be wrong because the check is waiting on the visitor. The new key replaces the now-unused `contact.turnstile.loading`. The ES text is a draft and is listed in 08-SPANISH-REVIEW.md for Martina's review. Commit 7f90a8f.
2. **[Rule 3 - Blocking] `tests/unit/contact-section.test.ts` pinned the old reserve classes**, so it was updated (not listed in the plan). Commit 7f90a8f.
3. **[Rule 3 - Blocking] Spanish-review pointer `astro.config.ts:76` → `:88`**, shifted by the sitemap block (`scripts/spanish-review.ts` was not in the plan). Commit 36faec6.
4. **Taste lint false positive.** A comment saying "shadow root" tripped the `[shadow]` rule, so the comment was reworded (no CSS change).
5. The plan listed `src/i18n/ui.*.ts` as conditional and they did change. `pnpm-lock.yaml` changed with the install, as planned.

## Notes

- **Out of scope / untouched:** `.impeccable/config.json` shows as modified in the working tree but was not changed by this task. It was not staged. `.planning/STATE.md` was not touched.
- At a 320 px viewport, the Cloudflare flexible widget's documented 300 px minimum fits the 288 px column only if Cloudflare shrinks it. [Unverified] It was not measured at 320 in the challenge state. The resting state adds nothing, and the 320 px contact-states long-name test passes.

## Threat surface

No new endpoints. The sitemap lists only public prerendered pages. Turnstile remains Managed with server-side siteverify, and submit still requires a token.

## Self-Check: PASSED

- FOUND: .planning/quick/261110-w8q-turnstile-widget-layout-and-sitemap/261110-w8q-PLAN.md
- FOUND: commits 7f90a8f, 36faec6
- FOUND: dist/client/sitemap-index.xml, dist/client/sitemap-0.xml (18 URLs)
