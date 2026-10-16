---
phase: 01-bilingual-walking-skeleton
plan: 04
subsystem: seo-i18n
tags: [astro, seo, hreflang, open-graph, i18n, 404, playwright, vitest]
requires:
  - "01-02: routes.ts (stripLocale, alternatePath, absoluteFor), dictionaries, LanguageSwitcher, SiteHeader"
  - "01-03: ButtonLink, Tabler arrow-right icon pattern, header layout"
provides:
  - "src/lib/seo.ts: PageKind, SeoInput, SeoTags, buildSeo(input, absolute) (pure, no astro:i18n import)"
  - "src/components/global/SeoHead.astro: Props = SeoInput; title, description, robots, canonical, hreflang alternates, og:*"
  - "BaseLayout Props { locale; title; description; kind?: PageKind = 'page' }"
  - "SiteHeader / LanguageSwitcher gain kind?: PageKind; 'notFound' points each toggle link at the target locale home"
  - "src/components/views/NotFoundView.astro: Props { locale; showAltLocale }"
  - "src/pages/404.astro (EN + Spanish cross-link) and src/pages/es/404.astro (ES)"
affects: [01-05]
tech-stack:
  added: []
  patterns:
    - "Pure builder + injected URL resolver (absoluteFor) so SEO logic is unit-testable without Astro virtual modules"
    - "Page kind flag on BaseLayout to opt 404s out of canonical/hreflang/og:url and add noindex"
    - "Inline language switch inside a page via lang attribute on the cross-locale paragraph"
key-files:
  created:
    - src/lib/seo.ts
    - src/components/global/SeoHead.astro
    - src/components/views/NotFoundView.astro
    - src/pages/404.astro
    - src/pages/es/404.astro
    - tests/unit/seo.test.ts
    - tests/e2e/seo.spec.ts
    - tests/e2e/not-found.spec.ts
  modified:
    - src/layouts/BaseLayout.astro
    - src/components/global/SiteHeader.astro
    - src/components/global/LanguageSwitcher.astro
    - src/pages/index.astro
    - src/pages/es/index.astro
    - tests/unit/language-switcher.test.ts
key-decisions:
  - "buildSeo takes the absolute-URL function as a parameter; SeoHead injects routes.absoluteFor"
  - "x-default hreflang points at the English (default locale) URL"
  - "404 pages emit robots noindex and no canonical, hreflang or og:url; og:title/description/locale still emitted"
  - "Root 404.html is English with a lang=es Spanish cross-link because astro preview and most static hosts serve only the root 404 for every miss"
  - "build.format stays default (no 'preserve'); dist/es/404.html for real hosts is deferred to deploy time"
requirements-completed: [I18N-04, I18N-07]
duration: 6min
completed: 2026-10-16
---

# Phase 1 Plan 04: SEO Head and Localized 404 Summary

**Every page now emits html lang, a self canonical, en/es/x-default hreflang alternates and localized title/description/Open Graph tags from a pure `buildSeo` builder, and missing URLs get a noindexed localized 404 (English with a Spanish way home at the root, Spanish at /es/404/).**

## Performance

- Duration: about 6 min
- Completed: 2026-10-16
- Tasks: 3
- Files: 8 created, 6 modified

## Accomplishments

- `src/lib/seo.ts`: pure `buildSeo` implementing the planned `SeoInput`/`SeoTags` contract; 4 unit tests cover en/es pages, the notFound opt-out and title pass-through.
- `SeoHead.astro` replaces the bare `<title>` in `BaseLayout`; home pages pass `meta.home.title` and `meta.home.description`.
- `LanguageSwitcher` / `SiteHeader` accept `kind`; on 404s the toggle targets `getRelativeLocaleUrl(target, '/')` instead of `/es/404/`. The existing accessible names (`EN English` / `ES Español`) are unchanged.
- `NotFoundView` follows the UI-SPEC: decorative `aria-hidden` "404" numeral in `text-ink-muted` (not accent), `h1` heading, body, `ButtonLink` home CTA with the arrow-right icon, and an optional `<p lang="es">` cross-link to `/es/`.
- `src/pages/404.astro` (EN, `showAltLocale`) and `src/pages/es/404.astro` (ES) use `kind="notFound"`.

## Task Commits

1. Task 1, failing SEO and 404 e2e specs: `b6d4107` (test)
2. Task 2, SEO builder and SeoHead: `5589c08` (test, RED), `3654f70` (feat, GREEN)
3. Task 3, localized 404 pages and switcher 404 behavior: `b2c768a` (test, RED), `288b949` (feat, GREEN)

## Verification

Verified by running the commands below on 2026-10-16:
- `pnpm verify` exits 0 (astro check: 0 errors, 0 warnings, 0 hints; eslint; prettier; vitest 41/41; playwright 32/32; secrets check).
- `dist/404.html` and `dist/es/404/index.html` exist.
- `dist/404.html`: 1 `name="robots" content="noindex"`, 0 `rel="canonical"`, `lang="es"` present, `href="/es/"` present.
- `astro.config.ts` has no `preserve`.
- `dist/es/index.html` head checked by hand: canonical `https://martinafernandez.example/es/`, three alternates, `og:locale` es_ES, `og:locale:alternate` en_US, `og:url` equal to the canonical.

## Deviations from Plan

None. The plan was executed as written.

Minor implementation notes, all within the plan's scope:
- The Spanish cross-link anchor also has `hreflang="es"`, and the NotFoundView root is a `<section aria-labelledby>` that wraps the planned centered block.
- The e2e cross-link selector is scoped to `main [lang="es"] a[href="/es/"]`. Without `main`, it could also match header markup.

## Deferred Items

- **Deploy-time `dist/es/404.html`.** `astro preview` and most static hosts serve only the root `dist/404.html` for misses, including `/es/*`, so the root 404 carries the Spanish cross-link. A host that resolves per-directory 404s needs `dist/es/404.html`. Planned fix after v1: copy `dist/es/404/index.html` to `dist/es/404.html` in an `astro:build:done` hook. `build.format: 'preserve'` was rejected because it breaks the trailing-slash canonicals. Review this together with the Cloudflare Workers 404 handling when the adapter lands.

## Threat Model

- T-04-01 (mitigated): the 404 pages are prerendered and never read or echo the request URL. Toggle and CTA targets are fixed homes from `getRelativeLocaleUrl`.
- T-04-02 (mitigated): canonical and og:url come only from `site.url` plus the build-time pathname via `getAbsoluteLocaleUrl`. 404s emit neither and carry noindex.

## Known Stubs

None added by this plan. `site.url` (`https://martinafernandez.example`) is still the existing `TODO(martina)` placeholder from 01-01, so the absolute canonical, hreflang and og:url values will change once the real domain is set.

## TDD Gate Compliance

A RED `test(01-04)` commit comes before a GREEN `feat(01-04)` commit for both Task 2 (`5589c08` then `3654f70`) and Task 3 (`b2c768a` then `288b949`). The Task 1 e2e RED (`b6d4107`) is made GREEN by `3654f70` (seo.spec) and `288b949` (not-found.spec).

## Self-Check: PASSED
