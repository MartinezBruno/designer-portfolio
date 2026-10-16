---
phase: 01-bilingual-walking-skeleton
plan: 03
subsystem: home-ui
tags: [astro, hero, footer, tabler-icons, fonts, astro-assets, a11y, playwright, vitest]
requires:
  - "01-01: BaseLayout, site.ts, gate chain"
  - "01-02: typed dictionaries, t()/interpolate(), SiteHeader, LanguageSwitcher, SkipLink"
provides:
  - "src/components/ui/ButtonLink.astro: Props { href } + default slot (label) + named slot icon; accent pill CTA"
  - "src/components/ui/IconLink.astro: Props { href; label; newTabHint } + default slot (icon); 44x44 external link"
  - "src/components/sections/Hero.astro: Props { locale } (HOME-01)"
  - "src/components/views/HomeView.astro: Props { locale }"
  - "src/components/global/SiteFooter.astro: Props { locale }, footer#contact"
  - "SiteHeader: Main nav with Contact -> #contact"
  - "Self-hosted Inter + Bricolage Grotesque (Tailwind font-sans / font-display)"
affects: [01-04, 01-05]
tech-stack:
  added:
    - "@tabler/icons@3.49.0"
    - "@fontsource-variable/inter@5.3.0"
    - "@fontsource-variable/bricolage-grotesque@5.3.0"
  patterns:
    - "Tabler icons as per-file Astro SVG components with aria-hidden + focusable=false"
    - "Named-slot SVG components wrapped in <Fragment slot> so no slot attribute leaks into markup"
    - "Fonts API with fontProviders.local() + package-import src (offline builds)"
    - "Optional socials read through SiteConfig['socials'] so absent keys stay conditional"
key-files:
  created:
    - src/assets/hero/portrait.jpg
    - src/components/ui/ButtonLink.astro
    - src/components/ui/IconLink.astro
    - src/components/sections/Hero.astro
    - src/components/views/HomeView.astro
    - src/components/global/SiteFooter.astro
    - tests/unit/site-footer.test.ts
    - tests/e2e/home.spec.ts
    - tests/e2e/layout.spec.ts
  modified:
    - package.json
    - pnpm-lock.yaml
    - astro.config.ts
    - src/styles/global.css
    - src/layouts/BaseLayout.astro
    - src/components/global/SiteHeader.astro
    - src/i18n/ui.en.ts
    - src/i18n/ui.es.ts
    - src/pages/index.astro
    - src/pages/es/index.astro
decisions:
  - "hero.imageAlt temporarily says the image is a placeholder (EN/ES) while the solid-color stand-in portrait ships; TODO(martina) restores the UI-SPEC alt"
  - "IconLink aria-label = label + new-tab hint, so the accessible name still carries the hint that the sr-only span provides"
  - "Home pages use t('meta.home.title') as <title> (replaces site.name)"
  - "At 320px the header wordmark wraps to two lines inside the 64px header instead of overflowing; no hamburger needed in Phase 1"
metrics:
  duration: "~4 min"
  completed: 2026-10-16
  tasks: 3
  files: 19
---

# Phase 1 Plan 03: Hero and Footer Slice Summary

With JavaScript off, visitors at `/` and `/es/` now see Martina's localized hero: greeting, h1, title, description, an eagerly loaded 4:5 `<Picture>` with AVIF and WebP sources, and a "Let's work together" CTA that jumps to `#contact`. The footer has a mailto link, a Behance icon link that opens in a new tab with `rel="noopener noreferrer"`, and a build-time copyright. Tabler icons render as inline `aria-hidden` SVG. Inter and Bricolage Grotesque are self-hosted offline through the Astro Fonts API, and the dist still ships 0 JS files.

## Tasks

| Task | Name | Commits |
| ---- | ---- | ------- |
| 1 | Failing e2e for no-JS hero, footer, Contact nav, inline icons | 81c9a20 (RED) |
| 2 | Approved packages, self-hosted fonts, stand-in portrait, honest alt | bc16fd3 |
| 3 | Hero, HomeView, SiteFooter, header Contact nav, ButtonLink/IconLink | 8594be7 (RED unit), d18907c (GREEN) |

## Verification (run in this session)

- `pnpm verify` exited 0. `astro check` reported 0 errors and 0 warnings across 34 files. ESLint and Prettier were clean. Vitest passed 35/35 across 6 files. Playwright passed 22/22, including skeleton.spec axe (empty violations on `/` and `/es/`), i18n.spec 8/8, home.spec 4/4 and layout.spec 8/8. `check:secrets` printed "ok (16 dist files scanned)".
- Task 1 RED: 10 new tests failed and every earlier spec passed. The two 320px tests in layout.spec passed already in RED and act as regression guards.
- Task 2: `file` reported `src/assets/hero/portrait.jpg` as a baseline JPEG, 800x1000. `fontProviders.local()` appears 2 times in astro.config.ts and npm/google/fontsource providers appear 0 times. `dist/_astro/fonts/` has 2 woff2 files, and `dist/index.html` has 2 `rel="preload"` font links.
- Task 3 acceptance greps:
  - barrel or `astro-icon` imports in `src/`: 0
  - `@tabler/icons/outline/` imports: 6 (mail, brand-behance, brand-instagram, brand-linkedin, arrow-right, arrow-up-right)
  - `fetchpriority="high"` in Hero.astro: 1
  - `data-motion` in `src/components`: 0
  - `<svg` in `dist/index.html`: 4
  - `<img ... .svg` in `dist/index.html`: 0
- Rendered `<img>`: `loading="eager" fetchpriority="high" decoding="async" width="800" height="1000"`, inside a `<picture>` with avif and webp `<source>`s.
- Screenshots at 320px (EN and ES) and 1280px: no horizontal overflow, h1 on 2 lines at 320px. The header wordmark wraps to 2 lines at 320px (bounding box 125x44 in EN).
- Measured, not targets:
  - `dist/index.html`: 7,439 B (was 1,929 B)
  - `dist/es/index.html`: 7,473 B (was 1,934 B)
  - CSS: 16,038 B (was 15,536 B)
  - Portrait variants: jpg 4,993 B, webp 1,502 B, avif 395 B
  - JS files in dist: 0

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `slot="icon"` leaked into the CTA's SVG markup**
- **Found during:** Task 3 (inspecting `dist/index.html`)
- **Issue:** Putting `slot="icon"` directly on the `IconArrowRight` SVG component placed it in the right slot, but the SVG component also emitted the `slot` attribute in the HTML.
- **Fix:** Wrapped the icon in `<Fragment slot="icon">`. `dist/index.html` now has 0 `slot=` attributes.
- **Files modified:** src/components/sections/Hero.astro
- **Commit:** d18907c

**2. [Minor] Extra unit assertion in site-footer.test.ts**
- Besides the behavior-block cases, a 4th case checks that every `<svg>` in the footer has `aria-hidden="true"` and that there are at least 3 of them. It also asserts that LinkedIn is absent along with Instagram.

**3. [Note] Header right group spacing**
- The plan only said to place the nav "before LanguageSwitcher". I wrapped the nav and the switcher in a `flex items-center gap-2 sm:gap-4` group so `justify-between` keeps the wordmark on the left.

### Observations

- [Verified] The build emits stray unreferenced `dist/_astro/<icon>.<hash>.svg` files for each imported icon, including brand-instagram and brand-linkedin, which are imported but not rendered. RESEARCH Pattern 4 already notes these as harmless. The HTML references none of them.

## TDD Gate Compliance

- Task 1: slice-level RED `test(01-03)` 81c9a20. It goes GREEN in d18907c.
- Task 3: `test(01-03)` 8594be7 (fails with "Cannot find module SiteFooter.astro"), then `feat(01-03)` d18907c. No refactor commit was needed.

## I18N-06 delivery check

01-02 marked I18N-06 complete early. This plan delivers the rest:
- the header Main nav with a Contact link to `#contact`
- `<footer id="contact">` in BaseLayout on every page, with the email, the socials and the copyright

Both are verified on `/` and `/es/` by layout.spec.

## Known Stubs

- `src/assets/hero/portrait.jpg`: a solid #EFE9E0 800x1000 stand-in, marked `TODO(martina)` in Hero.astro. It is intentional per UI-SPEC ("neutral placeholder asset of the same 4:5 ratio is committed and flagged as a TODO"). Its alt text honestly says it is a placeholder.
- `src/data/site.ts`: `email` and `url` are still `.example` placeholders (`TODO(martina)`, carried over from 01-01). The footer renders them as-is.
- `hero.*` copy is still a draft (`TODO(martina)` at the top of ui.en.ts). The Spanish file is a draft for QUAL-03.
- Fonts are stand-ins for her brand fonts (`TODO(martina)` in astro.config.ts).

## Pre-launch items

1. Replace src/assets/hero/portrait.jpg with Martina's real 4:5 portrait and restore hero.imageAlt to the UI-SPEC text in ui.en.ts / ui.es.ts
2. Set the real `site.email` and `site.url` in src/data/site.ts
3. Add `socials.instagram` / `socials.linkedin` in site.ts if Martina provides them. The footer renders them automatically.
4. Swap Inter/Bricolage Grotesque for her brand fonts if she has any. This is a config-only change in astro.config.ts.
5. Martina reviews the hero copy (EN) and the Spanish dictionary (QUAL-03)

## Threat Flags

None.
- T-03-01: IconLink always sets `rel="noopener noreferrer"`. The unit test and the e2e test both assert it.
- T-03-SC: only the three approved packages were installed, at exact pinned versions. Fonts come from local package files, with no CDN fetch.
- No `set:html`, no new network or runtime surface.

## Self-Check: PASSED

- All 9 created key files exist (checked with `test -f`).
- Commits 81c9a20, bc16fd3, 8594be7 and d18907c are all in `git log`.
