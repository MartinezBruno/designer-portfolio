# Walking Skeleton — Designer Portfolio (Martina Fernandez)

**Phase:** 1
**Generated:** 2026-10-16
**Status:** [Proposed] — every decision below stays [Proposed] until Plan 01-01 is executed and `pnpm verify` is green in the real repo.

## Capability Proven End-to-End

A visitor opens the statically built site at `/` (English) or `/es/` (Spanish), gets a page whose `<html lang>` matches the URL, and passes an automated axe scan. The same local build is exercised by `pnpm dev`, `pnpm build`, `pnpm lint` (astro check + ESLint + Prettier), `pnpm test` (Vitest), `pnpm test:e2e` (Playwright + axe against `astro preview`), and `pnpm check:secrets`.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Astro 7.4.0, static output (no adapter), `build.format: 'directory'` (default) | User convention (AGENTS.md: new project = Astro). Static output needs no server for Phases 1–4. `directory` format keeps canonical/hreflang URLs consistent (`preserve` breaks them, verified in research spike) |
| Language | TypeScript `~6.0.3`, `tsconfig` extends `astro/tsconfigs/strictest` | AGENTS.md requires strict TS. TS 7 breaks `@astrojs/check` and `typescript-eslint` peer ranges |
| Styling | Tailwind CSS 4.3.3 via `@tailwindcss/vite`; all tokens in `src/styles/global.css` `@theme`; no `tailwind.config.*` | AGENTS.md: Tailwind is the only styling solution; official v4 route |
| Data layer | No database. Build-time typed TS modules: `src/i18n/ui.en.ts` / `ui.es.ts` (UI strings, `satisfies Dictionary`), `src/data/site.ts` (name, site URL, email, social URLs). Later phases add Astro Content Layer collections (Phase 2 content files, Phase 3 committed Behance snapshot) | A portfolio has no runtime writes until the Phase 5 contact form. Typed modules make a missing Spanish string a compile error (I18N-05) |
| i18n routing | Astro built-in i18n: `locales: ['en','es']`, `defaultLocale: 'en'`, `routing.prefixDefaultLocale: false`. Folder-per-locale pages (`src/pages/` = EN, `src/pages/es/` = ES) as thin wrappers over shared `src/components/views/*View.astro` | No i18n library needed for 2 locales. Locale is passed explicitly as a prop, never sniffed from the browser (I18N-03) |
| Locale URL math | `getRelativeLocaleUrl` / `getAbsoluteLocaleUrl` from `astro:i18n` plus one `stripLocale()` helper in `src/i18n/routes.ts` | Build-format-aware URLs, verified in spike |
| Auth | None (public static site) | No accounts in v1 |
| Interactive element | The "EN / ES" language toggle: plain `<a>` links computed at build time (no JS) | The only Phase 1 interaction; proves the routing slice end to end |
| Client JS | Zero framework JS. One blocking inline motion-gate script (`html[data-motion]`) and one tiny bundled lifecycle-registry module (Plan 01-05) | Motion phases 6–7 plug into the gate and registry instead of retrofitting |
| Fonts | Astro Fonts API, `fontProviders.local()` pointing at `@fontsource-variable/inter` and `@fontsource-variable/bricolage-grotesque` latin woff2 files | Offline builds (Phase 3 requires network-free builds); metric-adjusted fallbacks generated automatically |
| Images | `astro:assets` `<Picture formats={['avif','webp']}>` from `src/assets/` | Build-time optimization, explicit width/height (no CLS) |
| Icons | `@tabler/icons` raw SVG imported per icon as Astro SVG components (`import IconMail from '@tabler/icons/outline/mail.svg'`) | AGENTS.md: explicit imports, never barrels; renders inline `<svg>` with zero JS |
| Testing | Vitest 5 (`getViteConfig` from `astro/config`, `experimental_AstroContainer` for component renders, happy-dom for DOM units) + Playwright 1.64 + `@axe-core/playwright` 4.14 against `astro preview --ignore-lock` | `--ignore-lock` is mandatory: Astro 7 auto-backgrounds dev/preview when run by an agent, killing Playwright's `webServer` |
| Lint/format | ESLint 10 flat config via `defineConfig` from `eslint/config` + `typescript-eslint` strict + `eslint-plugin-astro` (`recommended` + `jsx-a11y-strict`, backed by `eslint-plugin-jsx-a11y-x`) + Prettier 3 (astro + tailwind plugins) | ESLint 10 compatible a11y linting; `tseslint.config()` is deprecated |
| Secrets hygiene | `.gitignore` covers `.env`, `.env.*` (except `.env.example`), `.dev.vars*`; `scripts/check-secrets.ts` scans `git ls-files` and `dist/` | FND-04; future Cloudflare `.dev.vars` (Phase 5) already covered |
| Deployment target | **Local only for v1**: documented full-stack local run = `pnpm verify` (lint + unit + build + e2e + secrets) and `pnpm preview`. Cloudflare Workers static assets after v1 | ROADMAP: v1 "done" = working local build. Adapter/wrangler deliberately not installed in Phase 1 |
| Directory layout | `src/{assets,data,i18n,lib,layouts,styles}`, `src/components/{ui,global,sections,views}`, `src/pages/{index,404}.astro` + `src/pages/es/{index,404}.astro`, `tests/{unit,e2e}`, `scripts/` | UI-SPEC component contract; small single-responsibility components (AGENTS.md) |
| Package manager / runtime | pnpm 11, Node `>=22.22.0` in `engines`; `.nvmrc` = `24.22.0` (optional upgrade, user-run) | AGENTS.md: pnpm for everything. Putting `>=24.16` in `engines` causes warnings on every command |

## Stack Touched in Phase 1

- [ ] Project scaffold (framework, build, lint, test runner) — Plan 01-01
- [ ] Routing — `/` and `/es/` real routes (Plan 01-01), language toggle between them (Plan 01-02), `/404` + `/es/404/` (Plan 01-04)
- [ ] Data — build-time typed data reads: `src/data/site.ts` (Plan 01-01), complete EN/ES dictionaries (Plan 01-02). No runtime writes exist in a static site; the first write path is the Phase 5 contact form
- [ ] UI — the EN/ES toggle (Plan 01-02), hero CTA + footer links (Plan 01-03), skip link (Plan 01-02)
- [ ] Deployment — documented local full-stack run: `pnpm verify` and `pnpm preview` (README.md, Plan 01-01)

## Out of Scope (Deferred to Later Slices)

- `<ClientRouter />` / page transitions (Phase 7 decides ClientRouter vs native cross-document view transitions)
- Any actual animation, GSAP, Lenis, motion toggle UI (Phases 6–7)
- `@astrojs/cloudflare` adapter, `wrangler`, `.dev.vars` usage, deploy (Phase 5 / post-v1)
- Sitemap, OG images (SEO-01, v2), dark mode, hamburger menu, language-suggestion banner (I18N-08, v2)
- Emitting `dist/es/404.html` for real static hosts (deploy-time `astro:build:done` copy; post-v1). `astro preview` serves only the root `404.html`, so the root 404 is bilingual
- Real brand values from Martina: site domain, contact email, Instagram/LinkedIn, portrait, final hero copy, brand fonts/palette. Phase 1 ships TODO(martina)-marked stand-in values in `src/data/site.ts`, the dictionaries, and `src/assets/hero/portrait.jpg`

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- Phase 2: Homepage story — roles marquee, 4 featured services, tools grid, availability badge (localized content files)
- Phase 3: Real Behance work — committed snapshot + Content Layer loader, latest 3 on Home, Projects list page
- Phase 4: Project detail pages + conditional filters/search
- Phase 5: Contact form (Astro Actions on the Cloudflare adapter, Turnstile, honeypot, logging mailer)
- Phase 6: Scroll and interaction motion through the Phase 1 motion gate + lifecycle registry
- Phase 7: Page transitions and smooth scroll (lifecycle registry binds to Astro navigation events)
- Phase 8: Measured performance/a11y verification and Spanish copy review
