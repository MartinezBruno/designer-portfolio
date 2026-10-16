---
phase: 01-bilingual-walking-skeleton
plan: 02
subsystem: i18n
tags: [i18n, astro, a11y, header, language-switcher, skip-link, vitest, playwright]
requires:
  - "01-01: src/i18n/config.ts, src/data/site.ts, BaseLayout, gate chain"
provides:
  - "src/i18n/ui.en.ts: en dictionary (every UI-SPEC key), UIKey, Dictionary"
  - "src/i18n/ui.es.ts: es dictionary `as const satisfies Dictionary`"
  - "src/i18n/t.ts: useTranslations(locale)(key), interpolate(template, values); re-exports Locale, locales, isLocale"
  - "src/i18n/routes.ts: stripLocale, alternatePath, absoluteFor (astro:i18n based)"
  - "src/components/global/SkipLink.astro, LanguageSwitcher.astro, SiteHeader.astro"
  - "BaseLayout body order: SkipLink, SiteHeader, main#main"
affects: [01-03, 01-04, 01-05]
tech-stack:
  added: []
  patterns:
    - "Typed dictionaries: missing ES key is ts(1360) in astro check; @ts-expect-error fixture guards the Dictionary type"
    - "Locale URL helpers on getRelativeLocaleUrl/getAbsoluteLocaleUrl; build-time only, no browser language reads"
    - "Component render tests with experimental_AstroContainer"
    - "Switcher accessible name = visible code + language name (WCAG 2.5.3 Label in Name)"
key-files:
  created:
    - src/i18n/ui.en.ts
    - src/i18n/ui.es.ts
    - src/i18n/t.ts
    - src/i18n/routes.ts
    - src/components/global/SkipLink.astro
    - src/components/global/LanguageSwitcher.astro
    - src/components/global/SiteHeader.astro
    - tests/unit/i18n.test.ts
    - tests/unit/dictionary-types.test.ts
    - tests/unit/routes.test.ts
    - tests/unit/language-switcher.test.ts
    - tests/e2e/i18n.spec.ts
  modified:
    - src/layouts/BaseLayout.astro
decisions:
  - "Language toggle links use aria-label 'EN English' / 'ES Español' (not just 'English' / 'Español'), so the visible code is part of the accessible name (WCAG 2.5.3, flagged by axe)"
  - "404 cross-locale copy is split into notFound.altLocalePrompt + notFound.altLocaleLink (per plan), not the single notFound.altLocale key in UI-SPEC"
  - "meta.404.description duplicates notFound.body in each language"
metrics:
  duration: "~4 min"
  completed: 2026-10-16
  tasks: 3
  files: 13
---

# Phase 1 Plan 02: Language Switching Slice Summary

Typed EN/ES dictionaries cover every UI-SPEC string, and a missing Spanish key now fails `astro check` with ts(1360). The plan also adds `t()`/`interpolate()`, the locale URL helpers built on `astro:i18n`, a skip link, and a sticky header with the wordmark and a JS-free "EN / ES" toggle. Visitors move between `/` and `/es/` and are never redirected by browser language.

## Tasks

| Task | Name | Commits |
| ---- | ---- | ------- |
| 1 | Failing e2e for switching, no-redirect, skip link, header (RED) | 4551cc2 |
| 2 | Typed dictionaries, t()/interpolate(), route helpers | 298c5c8 (RED), 6355c7c (GREEN) |
| 3 | SkipLink, LanguageSwitcher, SiteHeader in BaseLayout | 56ff6c6 (RED), a659f1b (GREEN) |

## Verification (run in this session)

- `pnpm verify` exited 0. `astro check` reported 0 errors and 0 warnings across 26 files. ESLint and Prettier were clean. Vitest passed 31/31 across 5 files. Playwright passed 10/10: skeleton.spec 2/2 with an empty axe violations array, and i18n.spec 8/8. `check:secrets` printed "ok (5 dist files scanned)".
- Task 1 RED: 7 i18n.spec tests failed and the 2 skeleton tests passed. The Accept-Language no-redirect test already passed in RED because nothing redirects. It is a regression guard.
- **Manual type-gate proof:** I deleted `'nav.contact'` from `src/i18n/ui.es.ts` and ran `pnpm check`. It reported `ts(1360): Type '{...}' does not satisfy the expected type 'Dictionary'` at `ui.es.ts:34`, plus a knock-on ts(7053) in `t.ts`, for 2 errors in total. The file was then restored from a backup and is not committed.
- Acceptance greps:
  - `navigator.language|preferredLocale|Accept-Language` in `src/`: 0 matches
  - `<script` in LanguageSwitcher: 0
  - `outline-none` in `src/`: 0
  - `any`/`unknown` in non-comment lines of `t.ts` and `routes.ts`: 0
  - `satisfies Dictionary` in `ui.es.ts`: 1
- Build output: the ES toggle link in `dist/index.html` has `href="/es/" hreflang="es" lang="es"`. `dist/es/index.html` has `aria-current="true"` on the ES link.
- Measured, not targets: `dist` ships **0 JS files**. `index.html` is 1,929 B, `es/index.html` is 1,934 B, and the CSS is 15,536 B (before this plan it was 467 B, 467 B and 15,289 B).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug / a11y] Toggle accessible names didn't include the visible label**
- **Found during:** Task 3 (`pnpm test:e2e`, skeleton.spec axe check)
- **Issue:** axe `label-content-name-mismatch` (WCAG 2.5.3 Label in Name, level A) fired on both toggle links. The visible text "EN"/"ES" wasn't part of `aria-label="English"`/`"Español"`, so a voice-control user saying "click ES" couldn't activate the link.
- **Fix:** `aria-label` is now `"{CODE} {language name}"` ("EN English", "ES Español"). Screen readers still hear the language name, and the visible code is part of the name. The e2e locators (`name: 'Español'`, substring match) are unchanged. The render test now asserts the new labels.
- **Files modified:** src/components/global/LanguageSwitcher.astro, tests/unit/language-switcher.test.ts
- **Commit:** a659f1b
- **Note:** UI-SPEC says "aria-label with the language's own name". This is a small, deliberate change to that wording, made so the page meets WCAG 2.5.3. Please confirm during UI review.

**2. [Minor] Reworded a JSDoc comment in `t.ts`**
- The acceptance grep for `any`/`unknown` excludes lines starting with `//` or `*`, but not `/**`. The word "unknown" in a `/** ... */` comment matched. I changed it to a `//` comment with different wording and amended it into commit 6355c7c, before any later commit.

**3. [Minor] Header inner wrapper also has `h-full`**
- Added so the flex row fills the 64px header and its items center vertically. Purely visual.

## TDD Gate Compliance

- Task 1: `test(01-02)` 4551cc2 (slice-level RED). It goes GREEN in a659f1b.
- Task 2: `test(01-02)` 298c5c8, then `feat(01-02)` 6355c7c.
- Task 3: `test(01-02)` 56ff6c6, then `feat(01-02)` a659f1b.
- `dictionary-types.test.ts` is a compile-time fixture. Vitest doesn't type-check, so it passes at runtime even in RED. `astro check` enforces it through ts(2578).

## Known Stubs

- Hero copy keys (`hero.*`) are drafts marked `TODO(martina)` in `ui.en.ts`. The Spanish file is a draft for Martina's review (QUAL-03). This is intentional per UI-SPEC and doesn't block this slice.
- The header has no "Main" nav or Contact link yet. Plan 01-03 adds it together with the footer it targets.

## Threat Flags

None. The switcher hrefs are computed at build time from the fixed `locales` tuple and the page's own pathname (T-02-01 mitigated). No `set:html`, and no new network or runtime surface.

## Self-Check: PASSED

- All 13 key files exist (checked with `test -f`).
- Commits 4551cc2, 298c5c8, 6355c7c, 56ff6c6 and a659f1b are all in `git log`.
