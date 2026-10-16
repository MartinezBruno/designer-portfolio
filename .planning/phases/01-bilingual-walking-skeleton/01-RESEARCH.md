# Phase 1: Bilingual Walking Skeleton - Research

**Researched:** 2026-10-16
**Domain:** Astro 7 static site scaffolding, built-in i18n routing, typed UI dictionaries, SEO head, Tailwind v4 tokens, Tabler SVG icons, quality gates (astro check / ESLint 10 / Vitest 5 / Playwright + axe), motion gate + lifecycle registry
**Confidence:** HIGH. Every load-bearing integration was built and run in a throwaway spike on this machine (`scratchpad/spike`, Astro 7.4.0, Node 24.15.0, pnpm 11.0.8). Items the spike did not cover are labelled.

> **Labels.** `[VERIFIED: spike]` = built and run today on this machine. `[VERIFIED: npm registry]` = `npm view` today. `[CITED: url]` = official docs fetched today. `[ASSUMED]` = training knowledge or untested. `[Proposed]` = a recommendation, not yet implemented in the real repo (per the user's CLAUDE.md, every recommendation stays [Proposed] until built in the repo and tested).

<user_constraints>
## User Constraints

**No CONTEXT.md exists.** The user skipped discuss-phase. The orchestrator says to treat the approved UI-SPEC and the project-level research as the design decisions. The constraints below are copied from those sources. The planner must honor them.

### Locked Decisions (from 01-UI-SPEC.md, approved 2026-10-16, and CLAUDE.md / AGENTS.md)
- **Stack:** Astro + TypeScript strict + Tailwind CSS (official Astro route = `@tailwindcss/vite`). pnpm for everything. Tabler icons with explicit per-icon imports, never barrels. No `any`/`unknown`. Accessibility is mandatory. Tests are required whenever behavior changes. `pnpm lint` and `pnpm test` must pass before a commit.
- **Versions (STATE.md roadmap decision):** Astro 7.4, TypeScript `~6.0.3` (not 7.x), Tailwind 4.3 via `@tailwindcss/vite`, Node >= 24.16 recommended (local is 24.15).
- **i18n:** `locales: ['en','es']`, `defaultLocale: 'en'`, `prefixDefaultLocale: false`. EN at `/`, ES at `/es/`. Never auto-redirect. The switcher is the text "EN / ES" (no flags, no `<select>`, no JS).
- **Design system (UI-SPEC):** Tokens live in `src/styles/global.css` under `@theme`. No `tailwind.config.*`, no `@apply` in component `<style>`. 4 type sizes (14/16/24/48), weights 400/600 only. Color tokens: surface `#FAF7F2`, surface-alt `#EFE9E0`, ink `#1A1714`, ink-muted `#5E5750`, accent `#4B2EE8`, accent-ink `#FFFFFF`, danger `#B42318`. Accent is reserved for the 4 uses listed in UI-SPEC.
- **Fonts (UI-SPEC):** Bricolage Grotesque (display) + Inter (body), self-hosted through the Astro Fonts API, `font-display: swap`, metric-adjusted fallback. *Placeholder pending Martina.*
- **Components (UI-SPEC):** `src/components/{ui,global,sections,views}`. BaseLayout has `<html lang={locale} data-motion="off">` plus a blocking inline head script that sets `"on"` only when JS runs and reduced motion is not requested. **No CSS in Phase 1 hides content under any `data-motion` value.** Landmark order: skip link, header, `<main id="main" tabindex="-1">`, footer.
- **Head (UI-SPEC / I18N-04):** localized `<title>` ("{page} — Martina Fernandez"), meta description, self canonical per locale, hreflang en/es/x-default (→ EN), og:title, og:description, og:locale (`en_US`/`es_ES`), og:locale:alternate, og:type=website, og:url. On 404s: `noindex`, and no canonical or hreflang.
- **Hero (HOME-01):** `<section aria-labelledby="hero-title">`, greeting `<p>`, `<h1 id="hero-title">`, title `<p>`, description `<p>`, CTA `<a href="#contact">`. `<Picture formats={['avif','webp']}>` from `src/assets/`, `loading="eager"`, `fetchpriority="high"`, 4:5. Nothing in the hero is hidden or delayed by JS.
- **Icons used in Phase 1:** `mail`, `brand-behance`, `brand-instagram` (only if a handle is provided), `brand-linkedin` (only if a URL is provided), `arrow-right`, `arrow-up-right`. All decorative (`aria-hidden="true"`, `focusable="false"`).
- **404 (I18N-07):** `src/pages/404.astro` (EN) and `src/pages/es/404.astro` (ES) both render `NotFoundView`. The EN 404 also carries one Spanish line in `lang="es"` linking to `/es/`.
- **Copy:** All strings go in `src/i18n/ui.en.ts` (source) and `src/i18n/ui.es.ts` (`satisfies` the EN key type). Email, name and URLs live in `src/data/site.ts`. No string literals in components. Spanish uses "tú".
- **a11y acceptance:** axe has zero violations on `/`, `/es/`, `/404`, `/es/404`. The keyboard order is the one listed in UI-SPEC. 44px touch targets. Focus ring is `outline-2 outline-offset-2 outline-accent` and is never removed.

### Claude's Discretion
- Whether to scaffold with `create-astro` or write the scaffold files by hand (see Pitfall 3).
- Test file layout, the exact package.json script names beyond `dev/build/lint/test`, and how the secrets check is implemented.
- Lifecycle registry API shape and how it binds to Astro events (the phase only requires that it exists and has unit tests).
- Placeholder values for `site` URL, email and Behance URL until Martina supplies them.

### Deferred Ideas (OUT OF SCOPE for Phase 1)
- `<ClientRouter />` / page transitions (Phase 7 decides ClientRouter vs native cross-document view transitions).
- Any actual animation, GSAP, Lenis, motion toggle UI (Phases 6–7). Language-suggestion banner (I18N-08, v2). Dark mode. `@astrojs/cloudflare` adapter, `wrangler`, deploy (Phase 5 / post-v1). Sitemap. OG images (SEO-01, v2). Hamburger menu.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FND-01 | `pnpm dev/build/lint (incl. astro check)/test` on Astro 7 + TS ~6.0 + Tailwind v4, zero errors | Verified stack and versions (Standard Stack). Script layout under "package.json scripts". Pitfalls 3, 4, 6, 9 |
| FND-02 | Playwright e2e with axe | Verified Playwright 1.64.1 + @axe-core/playwright 4.14.0 against `astro preview`. **`--ignore-lock` is required** when an agent runs it (Pitfall 1) |
| FND-03 | Tabler icons as explicit per-icon SVG imports, no client JS | Verified: `import IconX from '@tabler/icons/outline/x.svg'` renders inline `<svg>` with zero JS files (Pattern 4) |
| FND-04 | `.env`/`.dev.vars` git-ignored, never in `dist/` | Template `.gitignore` misses `.dev.vars` and `.env.*` (Pitfall 8). Verified `scripts/check-secrets.ts` runs natively on Node 24 (Code Examples) |
| I18N-01 | EN at `/…`, ES at `/es/…` | Verified i18n config and `Astro.currentLocale` per folder (Pattern 1) |
| I18N-02 | EN/ES toggle lands on the equivalent page | `alternatePath()` built on `getRelativeLocaleUrl` + `stripLocale`, verified in Vitest. On 404 pages, link to the other home (Pitfall 5) |
| I18N-03 | Never auto-redirect | Static output has no `Astro.preferredLocale` [CITED]. Do not add any client redirect. e2e with `locale: 'es-ES'` + `Accept-Language: es` asserts that `/` stays EN |
| I18N-04 | html lang, canonical, hreflang (en/es/x-default), localized title/description/OG | `SeoHead` built from `getAbsoluteLocaleUrl` (verified output shape). 404 opt-out |
| I18N-05 | Missing ES key fails type-check/tests | Verified: `satisfies Dictionary` gives `ts(1360)` in `astro check`. `@ts-expect-error` fixture verified. Key-parity Vitest test verified |
| I18N-06 | Shared header/nav, footer (email + socials), skip link | UI-SPEC component contract. e2e keyboard-order test |
| I18N-07 | Localized 404 with link home | Verified: `astro preview` serves **only root `404.html`** for every missing URL, while `astro dev` serves `/es/404`. Bilingual root 404 is required (Pitfall 2) |
| HOME-01 | Hero visible without JS | `<Picture>` verified (avif/webp, eager, fetchpriority, width/height). e2e with `javaScriptEnabled: false` |
</phase_requirements>

## Project Constraints (from CLAUDE.md and AGENTS.md)

| Directive | Source | Impact on Phase 1 |
|-----------|--------|-------------------|
| pnpm for everything (`pnpm install/add/dlx/dev/build`) | AGENTS.md | All commands use pnpm. No npm/yarn/npx. Use `pnpm dlx` instead of npx |
| TypeScript mandatory, strict. Avoid `any` and `unknown`. Prefer inference | AGENTS.md | `astro/tsconfigs/strictest`. ESLint `@typescript-eslint/no-explicit-any` (in `strict`). Avoid `unknown` in public signatures |
| Tailwind is the only styling solution. Don't duplicate classes; extract components | AGENTS.md | No `<style>` with custom CSS beyond `global.css` `@theme`. Extract `ButtonLink`, `IconLink` |
| Tabler icons, explicit imports, never barrels | AGENTS.md / CLAUDE.md | Per-file SVG import (verified) |
| Prefer ESM, modern syntax | AGENTS.md | `"type": "module"`, `.ts` config files |
| New project = Astro via `pnpm create astro@latest`; TS strict from the start; Tailwind via the official Astro integration | AGENTS.md | See Pitfall 3 (create-astro in a non-empty dir) |
| Don't add dependencies until needed | AGENTS.md / CLAUDE.md | Phase 1 installs only the quality + UI-shell deps listed below. No GSAP, Lenis, adapter or sitemap |
| Small, single-responsibility components; composition; no premature abstraction | AGENTS.md | Thin page wrappers + `views/` + small `global/`/`ui/` components |
| Accessibility is not optional: semantic HTML, ARIA where applicable, focus managed | AGENTS.md | axe zero-violation gate, eslint jsx-a11y-strict, skip link |
| Check CI workflows in `.github/workflows`; tests via `pnpm test`; Vitest via `pnpm vitest run -t` | AGENTS.md | No CI exists yet. Optional to add a CI workflow (not required by the success criteria) |
| Run `pnpm lint` after moving files or changing imports. No code with type, lint or test errors | AGENTS.md | `pnpm lint` = `astro check && eslint . && prettier --check .` |
| Add or update tests when behavior changes | AGENTS.md / CLAUDE.md | Unit + e2e for every requirement (Validation Architecture) |
| Measure, don't guess performance | AGENTS.md / CLAUDE.md | Phase 1 does not claim perf numbers. Record `dist/` size and JS count only as observations |
| Commits: Conventional Commits, lowercase, imperative, < 50 chars. **Ask the user to confirm the commit message before committing. Never add Claude as co-author.** Run `/security-review` before committing | ~/.claude/CLAUDE.md | The executor must propose messages and wait. This overrides the generic attribution reminder |
| PR title `[<project_name>] ...`, small PRs | AGENTS.md | n/a for local v1 |
| If a new constraint ("never X") is introduced, document it in AGENTS.md | AGENTS.md | E.g., "always pass `--ignore-lock` to astro preview in Playwright" belongs in project docs |
| GSD workflow enforcement: edit only via GSD commands | CLAUDE.md | Planner/executor flow |
| Label unverified content ([Inference], [Proposed], …) | ~/.claude/CLAUDE.md | This document follows it |

## Summary

Phase 1 is a greenfield Astro 7.4 static site. The decisions are already locked (UI-SPEC + project research), so this research focused on **verifying that each integration actually works together on this machine** and on finding the traps a planner would not see from the docs. A scratch spike built and ran: Astro 7.4.0 + i18n (en/es, no default prefix), Tailwind 4.3.3 `@theme` tokens, Fonts API with self-hosted Inter + Bricolage, `<Picture>` (avif/webp), Tabler SVG components, typed dictionaries, `astro check` on TS 6.0.3, ESLint 10 flat config with eslint-plugin-astro 3.2.1, Prettier 3.9 with the astro and tailwind plugins, Vitest 5.0.5 via `getViteConfig` (including the Container API, `astro:i18n` imports and happy-dom), Playwright 1.64.1 + axe 4.14.0 against `astro preview` (including reduced-motion and JS-disabled emulation), and a Node-native TypeScript secrets check. All passed.

The spike turned up **five facts the planner must design around**. (1) Astro 7 `astro dev`/`astro preview` **auto-detach into the background when they detect an AI agent**, so Playwright's `webServer` dies with "Process from config.webServer exited early". Fix: pass `--ignore-lock`. (2) `astro preview` serves **only the root `404.html`** for every missing URL, including `/es/...`. Only `astro dev` serves `/es/404`. The root 404 must therefore be bilingual (UI-SPEC already plans this). (3) The Fonts API `npm` provider **downloads from jsDelivr at build time** (it failed with the network blocked), and `npm({ remote: false })` fails outright. The `local` provider with package-import paths into `@fontsource-variable/*` works fully offline. (4) Without `<ClientRouter />`, **`astro:page-load` never fires**, so the lifecycle registry must mount on its own and treat Astro events as optional. (5) `eslint-plugin-jsx-a11y` 6.10.2 does not declare ESLint 10 support. Its maintained fork `eslint-plugin-jsx-a11y-x` 0.2.0 does, and eslint-plugin-astro 3.2.1 accepts either.

**Primary recommendation:** Build the thinnest vertical slice first: hand-written scaffold (or create-astro into a temp subfolder, then moved), `astro.config.ts` with i18n, a BaseLayout with `lang` + inline motion gate, EN/ES home pages with an `<h1>`, and **all five gates wired** (`build`, `lint` = astro check + eslint + prettier, `test` = vitest, `test:e2e` = playwright + axe with `--ignore-lock`, `check:secrets`). Then layer in the dictionaries/SEO head/switcher, the header/footer/hero/fonts/icons, and the 404s + motion gate/registry as follow-on slices, each with its own tests.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Locale routing (`/` vs `/es/`) | Frontend Server (SSG build) | CDN/Static | Folder-based routes are prerendered to static HTML. No runtime |
| UI string lookup (`t()`) | Frontend Server (SSG build) | — | Resolved at build. Zero client JS |
| Language switcher URL | Frontend Server (SSG build) | Browser (plain `<a>`) | The href is computed at build. Navigation is a normal link |
| SEO head (canonical, hreflang, OG) | Frontend Server (SSG build) | — | Needs `site` + locale at build |
| Hero image optimization | Frontend Server (build-time `astro:assets` + sharp) | CDN/Static | Emits avif/webp to `/_astro/` |
| Fonts self-hosting + fallback metrics | Frontend Server (build-time Fonts API) | CDN/Static | Copied to `/_astro/fonts/`, inline `@font-face` |
| Icons | Frontend Server (build-time SVG inlining) | — | Inline `<svg>` in HTML, no JS |
| Motion gate (`data-motion`) | Browser (blocking inline head script) | — | Must run before first paint. Default `"off"` in HTML |
| Lifecycle registry | Browser (bundled module) | — | Client-only. Unit-tested in happy-dom |
| 404 handling | CDN/Static (host decides which 404.html) | Frontend Server (builds both) | `astro preview` and static hosts choose the file. Verified behavior differs from dev |
| Secrets hygiene | Build tooling (git + dist scan) | — | Script over `git ls-files` + `dist/` |

## Standard Stack

All versions `[VERIFIED: npm registry 2026-10-16]` and installed and run in the spike `[VERIFIED: spike]` unless noted.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| astro | 7.4.0 | Framework, static output, i18n, assets, Fonts API, SVG components | Locked. Engines `node >=22.22.0`. Bundles Vite ^8.3.4 |
| typescript | ~6.0.3 (pin; npm `latest` is 7.0.2) | Type checking | `@astrojs/check@0.9.10` peers `^5 \|\| ^6`. `typescript-eslint@8.71.2` peers `<6.1.0` |
| @astrojs/check | 0.9.10 | `astro check` | Type-checks `.astro` + `.ts`. Verified 0 errors on strictest |
| tailwindcss + @tailwindcss/vite | 4.3.3 | Styling | CSS-first `@theme`. Verified tokens compile (`bg-surface`, `font-display`, `size-5`) |
| @tabler/icons | 3.49.0 | Raw SVG icons | `exports: {"./*": "./icons/*"}`. Verified inline render |
| @fontsource-variable/inter | 5.3.0 | Inter variable woff2 files (consumed by Astro `local` font provider) | Offline, versioned via lockfile |
| @fontsource-variable/bricolage-grotesque | 5.3.0 | Bricolage variable woff2 files | Same |

### Quality tooling (devDependencies)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| vitest | 5.0.5 | Unit tests | Peers vite ^6.4–^8. Verified with `getViteConfig` from `astro/config` |
| happy-dom | 21.0.3 | DOM env for gate/registry tests | Verified `window.matchMedia` exists and can be spied on. Use per-file `// @vitest-environment happy-dom` |
| @playwright/test | 1.64.1 | E2E | Needs `chromium-headless-shell-1248` (installed during this research into `~/Library/Caches/ms-playwright`) |
| @axe-core/playwright | 4.14.0 | a11y scans | Depends on `axe-core ~4.14.0` |
| eslint | 10.12.0 | Lint | Flat config via `defineConfig` from `eslint/config` |
| @eslint/js | 10.0.1 | Recommended JS rules | |
| typescript-eslint | 8.71.2 | TS rules | `tseslint.config()` is **deprecated** in favor of ESLint core `defineConfig()` [VERIFIED: spike, d.ts @deprecated] |
| eslint-plugin-astro | 3.2.1 | Astro lint + `jsx-a11y-strict` config | Peers eslint >=10, typescript-eslint >=8.61, and **either** `eslint-plugin-jsx-a11y >=6.10.2` **or** `eslint-plugin-jsx-a11y-x >=0.2.0`. Engines node `^24.16.0` (warning only on 24.15) |
| eslint-plugin-jsx-a11y-x | 0.2.0 | a11y rules backend | es-tooling fork. Peers `eslint ^9 \|\| ^10`. Verified `astro/jsx-a11y/alt-text` and `anchor-is-valid` fire |
| globals | 17.13.0 | Browser/node globals | |
| prettier | 3.9.10 | Formatting | |
| prettier-plugin-astro | 1.1.1 | `.astro` formatting | Verified |
| prettier-plugin-tailwindcss | 0.8.1 | Class sorting | Last in `plugins`. `tailwindStylesheet: "./src/styles/global.css"` (v4) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| eslint-plugin-jsx-a11y-x | eslint-plugin-jsx-a11y 6.10.2 | Works, but `pnpm peers check` reports an unmet peer (`eslint ^3…^9`). Last published 2024-10. Use the `-x` fork for a clean install [VERIFIED: spike] |
| Fonts `local` provider + `@fontsource-variable/*` | Fonts `npm`/`fontsource`/`google` provider | Those fetch from a CDN at build time, which breaks offline builds (Phase 3 requires offline builds) [VERIFIED: spike] |
| Fonts `local` provider + `@fontsource-variable/*` | woff2 files committed in `src/assets/fonts/` | Equivalent and offline. Package version pinning via lockfile is cleaner. Either is fine |
| happy-dom | jsdom 30.1.3 | Heavier. No need for Phase 1 |
| Playwright webServer on `astro preview` | on `astro dev` | dev serves `/es/404` correctly, but it is not the shipped artifact and is slower. Test the build |

**Installation:**
```bash
# runtime
pnpm add astro@7.4.0 @tailwindcss/vite@4.3.3 tailwindcss@4.3.3 @tabler/icons@3.49.0 \
  @fontsource-variable/inter@5.3.0 @fontsource-variable/bricolage-grotesque@5.3.0
# dev
pnpm add -D typescript@~6.0.3 @astrojs/check@0.9.10 \
  vitest@5.0.5 happy-dom@21.0.3 @playwright/test@1.64.1 @axe-core/playwright@4.14.0 \
  eslint@10.12.0 @eslint/js@10.0.1 typescript-eslint@8.71.2 eslint-plugin-astro@3.2.1 \
  eslint-plugin-jsx-a11y-x@0.2.0 globals@17.13.0 \
  prettier@3.9.10 prettier-plugin-astro@1.1.1 prettier-plugin-tailwindcss@0.8.1
pnpm exec playwright install chromium
```
[Proposed] The font packages can be devDependencies or dependencies. They are only read at build time. Note: in the spike, pnpm 11.0.8 reported **no ignored build scripts** for this set (sharp ships prebuilt `@img/*` binaries) [VERIFIED: spike]. If pnpm ever lists pending builds, approve them non-interactively with `pnpm approve-builds <pkg>` (`pnpm approve-builds` without args is interactive) [VERIFIED: `pnpm help approve-builds`].

## Package Legitimacy Audit

slopcheck **could not be installed** (`pip install slopcheck` failed / command absent). Per protocol, every package below is tagged `[ASSUMED]` for legitimacy, and the planner must gate installs behind a `checkpoint:human-verify`. A single batched checkpoint is reasonable. Registry metadata strongly supports legitimacy: every package is years old, from its official org repo, and none has a `postinstall` script.

| Package | Registry | Age (created) | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|---------------|-----------|-------------|-----------|-------------|
| astro | npm | 2021-03 | very high | github.com/withastro/astro | unavailable | [ASSUMED] Approved pending checkpoint |
| @astrojs/check | npm | 2023-07 | high | github.com/withastro/astro | unavailable | [ASSUMED] |
| typescript | npm | 2012-10 | very high | github.com/microsoft/TypeScript | unavailable | [ASSUMED] |
| @types/node (24.19.2, added at plan revision) | npm | 2016-05 | very high | github.com/DefinitelyTyped/DefinitelyTyped | unavailable | [ASSUMED] |
| tailwindcss / @tailwindcss/vite | npm | 2017-10 / 2024-02 | very high | github.com/tailwindlabs/tailwindcss | unavailable | [ASSUMED] |
| @tabler/icons | npm | 2020-11 | high | github.com/tabler/tabler-icons | unavailable | [ASSUMED] |
| @fontsource-variable/inter | npm | 2023-05 | high | github.com/fontsource/font-files | unavailable | [ASSUMED] |
| @fontsource-variable/bricolage-grotesque | npm | 2023-09 | ~490k/wk | github.com/fontsource/font-files | unavailable | [ASSUMED] |
| vitest | npm | 2021-12 | very high | github.com/vitest-dev/vitest | unavailable | [ASSUMED] |
| happy-dom | npm | 2019-09 | ~21M/wk | github.com/capricorn86/happy-dom | unavailable | [ASSUMED] |
| @playwright/test | npm | 2020-09 | very high | github.com/microsoft/playwright | unavailable | [ASSUMED] |
| @axe-core/playwright | npm | 2021-06 | high | github.com/dequelabs/axe-core-npm | unavailable | [ASSUMED] |
| eslint / @eslint/js | npm | 2013-07 / 2023-01 | very high | github.com/eslint/eslint | unavailable | [ASSUMED] |
| typescript-eslint | npm | 2019-08 | very high | github.com/typescript-eslint/typescript-eslint | unavailable | [ASSUMED] |
| eslint-plugin-astro | npm | 2022-05 | high | github.com/ota-meshi/eslint-plugin-astro | unavailable | [ASSUMED] |
| eslint-plugin-jsx-a11y-x | npm | 2024-10 | ~176k/wk | github.com/es-tooling/eslint-plugin-jsx-a11y-x | unavailable | [ASSUMED]. Named as a peer by eslint-plugin-astro 3.2.1 itself |
| globals | npm | 2012-11 | very high | github.com/sindresorhus/globals | unavailable | [ASSUMED] |
| prettier / prettier-plugin-astro / prettier-plugin-tailwindcss | npm | 2017 / 2021 / 2022 | high | prettier, withastro, tailwindlabs orgs | unavailable | [ASSUMED] |

**Packages removed due to slopcheck [SLOP] verdict:** none (slopcheck did not run)
**Packages flagged as suspicious [SUS]:** none flagged. All are gated by the `[ASSUMED]` rule above.
**postinstall scripts:** none found on any of the packages above [VERIFIED: `npm view <pkg> scripts.postinstall`].

## Architecture Patterns

### System Architecture Diagram

```
                         BUILD (pnpm build = astro build)
 src/i18n/ui.en.ts ──┐
 src/i18n/ui.es.ts ──┤ (satisfies Dictionary → astro check fails on a missing key)
 src/data/site.ts  ──┤
                     ▼
 src/pages/index.astro      (locale 'en') ─┐
 src/pages/es/index.astro   (locale 'es') ─┼─▶ views/HomeView ─▶ BaseLayout ─┬─▶ SeoHead (title, desc, canonical,
 src/pages/404.astro        (locale 'en') ─┤   views/NotFoundView           │    hreflang en/es/x-default, OG; noindex on 404)
 src/pages/es/404.astro     (locale 'es') ─┘                                ├─▶ inline motion gate <script> (data-motion)
                                                                            ├─▶ SkipLink, SiteHeader(LanguageSwitcher), SiteFooter
                                                                            └─▶ sections/Hero (<Picture>, Tabler <svg>)
 astro:assets + sharp ─▶ /_astro/*.avif|webp     Fonts API (local provider) ─▶ /_astro/fonts/*.woff2 + inline @font-face
                     ▼
                  dist/ (index.html, es/index.html, 404.html, es/404/index.html, _astro/*)
                     │
      ┌──────────────┴───────────────┐
      ▼                              ▼
 astro preview (e2e target)     scripts/check-secrets.ts (git ls-files + dist scan)
  /          → index.html
  /es/       → es/index.html
  /anything-missing → 404.html  (ALWAYS root, even under /es/ ; verified)
      │
      ▼
 BROWSER: html[data-motion="off"] in HTML → inline gate sets "on" only if JS ran and no reduced motion
          lib/motion bootstrap (module script): registry.mount() now; also listens to astro:page-load /
          astro:before-swap (only fire once a ClientRouter exists, Phase 7)
```

### Recommended Project Structure
```
designer-portfolio/
├── .nvmrc                       # 24.22.0 (latest 24 LTS available via nvm)
├── .gitignore                   # + .dev.vars*, .env.*, !.env.example, test-results/, playwright-report/
├── .prettierrc.json / .prettierignore
├── astro.config.ts              # site, i18n, fonts, vite tailwind plugin
├── eslint.config.js
├── playwright.config.ts
├── vitest.config.ts
├── tsconfig.json                # extends astro/tsconfigs/strictest
├── scripts/check-secrets.ts     # node scripts/check-secrets.ts (native TS on Node 24)
├── public/                      # favicon only
├── tests/
│   ├── unit/                    # i18n parity, dictionary types, routes, seo, gate, lifecycle, component render
│   └── e2e/                     # routes, switcher, seo head, a11y (axe), no-js, reduced-motion, 404, keyboard
└── src/
    ├── assets/hero/portrait.jpg # placeholder 4:5 until Martina's photo arrives (TODO)
    ├── data/site.ts             # name, email, socials (typed, locale-independent)
    ├── i18n/{config.ts, ui.en.ts, ui.es.ts, t.ts, routes.ts}
    ├── lib/seo.ts               # pure builders: canonical, alternates, og:locale
    ├── lib/motion/{gate.ts, lifecycle.ts, index.ts}
    ├── layouts/BaseLayout.astro
    ├── components/
    │   ├── ui/ButtonLink.astro, IconLink.astro
    │   ├── global/SkipLink.astro, SiteHeader.astro, LanguageSwitcher.astro, SiteFooter.astro, SeoHead.astro
    │   ├── sections/Hero.astro
    │   └── views/HomeView.astro, NotFoundView.astro
    ├── pages/{index.astro, 404.astro, es/index.astro, es/404.astro}
    └── styles/global.css        # @import "tailwindcss"; @theme tokens
```

### Pattern 1: i18n config + thin locale wrappers
**What:** Folder-per-locale pages that each render a locale-agnostic view. The locale is passed explicitly (do not read `Astro.currentLocale` deep in leaves).
```ts
// astro.config.ts  [VERIFIED: spike]
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://martinafernandez.example', // TODO real domain (open question); required for canonical/hreflang
  i18n: {
    locales: ['en', 'es'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: false },
  },
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Inter',
      cssVariable: '--font-inter',
      fallbacks: ['ui-sans-serif', 'system-ui', 'sans-serif'],
      options: { variants: [{ src: ['@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'], weight: '100 900', style: 'normal' }] },
    },
    {
      provider: fontProviders.local(),
      name: 'Bricolage Grotesque',
      cssVariable: '--font-bricolage',
      fallbacks: ['ui-sans-serif', 'system-ui', 'sans-serif'],
      options: { variants: [{ src: ['@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2'], weight: '200 800', style: 'normal' }] },
    },
  ],
  vite: { plugins: [tailwindcss()] },
});
```
- Keep the default `build.format: 'directory'` and the default `trailingSlash`. Verified: in directory mode `Astro.url.pathname` = `/projects/`, `getRelativeLocaleUrl('es','/')` = `/es/`, `getAbsoluteLocaleUrl('en','/projects')` = `https://…/projects/`. In `'preserve'` mode pathnames become `/about.html` and the helpers drop trailing slashes, which makes canonicals inconsistent [VERIFIED: spike]. **Do not switch to `preserve`.**
- The Latin subset covers Spanish (á é í ó ú ü ñ ¿ ¡ are in U+00A0–00FF) [ASSUMED: Unicode Latin-1 block, standard knowledge]. Using only the `latin` file gives 2 preloads total. The npm provider default produced 7 preloads per family (all subsets) [VERIFIED: spike].
- The `<Font cssVariable="--font-inter" preload />` component from `astro:assets` goes in `<head>`. It inlines `@font-face` + metric-adjusted `… fallback: Arial` faces [VERIFIED: spike output shows `size-adjust`/`ascent-override`].

```css
/* src/styles/global.css  [VERIFIED: spike compiles] */
@import "tailwindcss";
@theme {
  --color-surface: #faf7f2;
  --color-surface-alt: #efe9e0;
  --color-ink: #1a1714;
  --color-ink-muted: #5e5750;
  --color-accent: #4b2ee8;
  --color-accent-ink: #ffffff;
  --color-danger: #b42318;
  --font-sans: var(--font-inter);
  --font-display: var(--font-bricolage);
}
```
[Proposed] The UI-SPEC wants 4 font-size tokens "so later phases can't drift". In Tailwind v4 that means overriding the text scale, e.g. `--text-*: initial;` followed by only `--text-sm/--text-base/--text-2xl/--text-5xl` with their `--line-height` companions. [ASSUMED] The exact `--text-*: initial` namespace-reset syntax is Tailwind v4 documented behavior but was not run in the spike. Verify with a build and confirm that `text-lg` stops compiling.

### Pattern 2: Typed dictionaries (missing key = compile error)
```ts
// src/i18n/ui.en.ts  [VERIFIED: spike]
export const en = {
  'a11y.skipToContent': 'Skip to content',
  'hero.greeting': "Hi, I'm",
  // ...all UI-SPEC keys
} as const;
export type UIKey = keyof typeof en;
export type Dictionary = Record<UIKey, string>;

// src/i18n/ui.es.ts
import type { Dictionary } from './ui.en';
export const es = {
  'a11y.skipToContent': 'Saltar al contenido',
  'hero.greeting': 'Hola, soy',
} as const satisfies Dictionary; // missing key → ts(1360) in `astro check`; extra key → excess-property error

// src/i18n/t.ts
import { en, type UIKey } from './ui.en';
import { es } from './ui.es';
const dictionaries = { en, es } as const;
export type Locale = keyof typeof dictionaries;
export const locales = ['en', 'es'] as const satisfies readonly Locale[];
export const isLocale = (v: string | undefined): v is Locale => v === 'en' || v === 'es';
export const useTranslations = (locale: Locale) => (key: UIKey): string => dictionaries[locale][key];
```
Strings with placeholders (`footer.copyright` "© {year} Martina Fernandez") need a tiny `format(str, { year })` helper, or the year is composed in the component. [Proposed] Keep `{year}` in the string and use a typed `interpolate()` in `t.ts`, and unit-test it.

### Pattern 3: Locale-aware URLs (switcher, canonical, hreflang)
```ts
// src/i18n/routes.ts  [VERIFIED: spike — astro:i18n imports work inside Vitest via getViteConfig]
import { getRelativeLocaleUrl, getAbsoluteLocaleUrl } from 'astro:i18n';
import type { Locale } from './t';

/** '/es/' → '/', '/es/projects/' → '/projects/', '/essay/' stays '/essay/' */
export const stripLocale = (pathname: string): string => pathname.replace(/^\/es(?=\/|$)/, '') || '/';
export const alternatePath = (pathname: string, target: Locale): string => getRelativeLocaleUrl(target, stripLocale(pathname));
export const absoluteFor = (pathname: string, target: Locale): string => getAbsoluteLocaleUrl(target, stripLocale(pathname));
```
SeoHead (non-404 pages): `canonical = absoluteFor(path, locale)`, `alternate hreflang="en" = absoluteFor(path,'en')`, `"es" = absoluteFor(path,'es')`, `"x-default" = absoluteFor(path,'en')`, `og:url = canonical`, `og:locale = en_US|es_ES`, `og:locale:alternate = the other`. On 404 pages: `<meta name="robots" content="noindex">` and no canonical/hreflang (UI-SPEC). The spike's naive canonical on 404 produced `https://example.com/404/`, which is why the opt-out matters [VERIFIED: spike].

### Pattern 4: Tabler icon as an Astro SVG component (FND-03)
```astro
---
import IconArrowRight from '@tabler/icons/outline/arrow-right.svg';
---
<IconArrowRight aria-hidden="true" focusable="false" class="size-5" />
```
[VERIFIED: spike] Renders an inline `<svg … stroke="currentColor" stroke-width="2" class="size-5" aria-hidden="true">` in the HTML. The passed `class` replaces Tabler's own `icon icon-tabler…` classes. The `width="24" height="24"` attributes stay, and Tailwind `size-5` CSS overrides them. Zero `.js` files in `dist/_astro` [VERIFIED: spike]. The build also emits a stray `dist/_astro/arrow-right.<hash>.svg` file. It is harmless and unreferenced [VERIFIED: spike].

### Pattern 5: Motion gate, a single function used inline AND unit-tested
```ts
// src/lib/motion/gate.ts  [VERIFIED: spike — inline output and Playwright reduce/no-JS checks pass]
export type MotionState = 'on' | 'off';
export function applyMotionGate(doc: Document, win: Window): MotionState {
  // MUST stay self-contained: it is stringified into an inline <script>. No imports, no outer-scope refs.
  const reduce = typeof win.matchMedia === 'function' && win.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state: MotionState = reduce ? 'off' : 'on';
  doc.documentElement.dataset['motion'] = state;
  return state;
}
export const motionGateInline = `(${applyMotionGate.toString()})(document, window);`;
export function onMotionPreferenceChange(win: Window, cb: (state: MotionState) => void): () => void {
  const mq = win.matchMedia('(prefers-reduced-motion: reduce)');
  const handler = (): void => cb(mq.matches ? 'off' : 'on');
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}
```
```astro
<!-- BaseLayout <head>, before stylesheets -->
<html lang={locale} data-motion="off">
<script is:inline set:html={motionGateInline} />
```
Built output: `<script>(function applyMotionGate(doc, win) {…})(document, window);</script>` [VERIFIED: spike]. A unit test should also execute `new Function(motionGateInline)` in happy-dom to prove it is self-contained. [Proposed] The Phase 6 motion toggle (MOTN-08) will need a stored user override. Leave a single extension point (e.g. a third optional arg) but don't read storage in Phase 1 ("don't add until needed").

### Pattern 6: Lifecycle registry that works with or without ClientRouter
**Verified fact:** with no `<ClientRouter />`, a bundled script listening for `astro:page-load` never runs its handler [VERIFIED: spike, Playwright]. With ClientRouter, `astro:page-load` fires on the initial load and after every navigation, and bundled module scripts run only once [CITED: docs.astro.build/en/guides/view-transitions/]. So mount immediately **and** make `mount()` idempotent so a later ClientRouter does not double-mount.
```ts
// src/lib/motion/lifecycle.ts  [Proposed; shape validated in spike with a simpler version]
export type Cleanup = () => void;
export type PageInit = (doc: Document) => Cleanup | undefined; // not `| void` — @typescript-eslint/no-invalid-void-type (strict) rejects it [VERIFIED: spike]

export interface Lifecycle {
  register(init: PageInit): void;
  mount(): void;    // idempotent
  unmount(): void;  // idempotent, runs every cleanup exactly once
  readonly activeCleanups: number;
}

export function createLifecycle(doc: Document, onError: (err: Error) => void = () => {}): Lifecycle {
  const inits: PageInit[] = [];
  let cleanups: Cleanup[] = [];
  let mounted = false;
  const run = (init: PageInit): void => {
    try { const c = init(doc); if (c) cleanups.push(c); }
    catch (e) { onError(e instanceof Error ? e : new Error(String(e))); } // one effect failing must not stop others
  };
  return {
    register(init) { inits.push(init); if (mounted) run(init); },
    mount() { if (mounted) return; mounted = true; inits.forEach(run); },
    unmount() { if (!mounted) return; mounted = false; for (const c of cleanups.splice(0)) c(); },
    get activeCleanups() { return cleanups.length; },
  };
}

export function bindToAstro(lifecycle: Lifecycle, doc: Document): () => void {
  const onLoad = (): void => lifecycle.mount();
  const onBeforeSwap = (): void => lifecycle.unmount();
  lifecycle.mount(); // module scripts are deferred, so the DOM is parsed here
  doc.addEventListener('astro:page-load', onLoad);           // raw event names (Astro 7 removed the helper constants)
  doc.addEventListener('astro:before-swap', onBeforeSwap);
  return () => { doc.removeEventListener('astro:page-load', onLoad); doc.removeEventListener('astro:before-swap', onBeforeSwap); };
}
```
Unit tests (happy-dom): mount runs inits once, a second mount is a no-op, unmount runs each cleanup once, 10× (unmount → mount) keeps `activeCleanups` constant (this seeds MOTN-09), a throwing init doesn't block the others, registering after mount runs immediately, and dispatching `new Event('astro:before-swap')`/`'astro:page-load'` on `document` drives the binding.
[Proposed] Wiring: `src/lib/motion/index.ts` creates the singleton and calls `bindToAstro`, and BaseLayout includes one `<script>import '../lib/motion';</script>`. With zero registered effects this ships a few hundred bytes. Including it now proves the wiring end to end. Leaving it out keeps Phase 1 at zero client JS beyond the gate. The success criterion only requires that it "exists and is covered by unit tests", so either is acceptable. If it is wired, add an e2e assertion of no console errors.

### Pattern 7: Bilingual root 404 + per-locale 404
```
src/pages/404.astro      → dist/404.html            (served for EVERY missing URL by astro preview, incl. /es/*)
src/pages/es/404.astro   → dist/es/404/index.html   (served by astro dev for /es/*; reachable directly at /es/404/)
```
[VERIFIED: spike] `astro preview`: `/nope` → 404 + EN page. `/es/nope` → 404 + **EN** page. `astro dev`: `/es/nope` → 404 + ES page. Cloudflare Workers static assets with `not_found_handling: "404-page"` serve "the nearest `404.html`", walking up directories [CITED: developers.cloudflare.com/workers/static-assets/routing/static-site-generation/]. It would look for `es/404.html`, but Astro emits `es/404/index.html`, so it would fall back to root too. That is a **deploy-time** fix (post-v1): e.g. a 5-line integration in an `astro:build:done` hook that copies `es/404/index.html` → `es/404.html`. Do not solve it in Phase 1. Record it as a deferred item.

### Anti-Patterns to Avoid
- **`build.format: 'preserve'` to get `es/404.html`:** it breaks pathname/canonical consistency (`/about.html`) [VERIFIED: spike].
- **Reading `Astro.url.pathname` for the switcher on 404 pages:** the 404 is prerendered, so its pathname is `/404/` and the switcher would point at `/es/404/` (a 200 page). On 404 views, link the switcher to the other locale's home [VERIFIED: spike shows `/404/` canonical].
- **Client-side language detection** (`navigator.language`, Accept-Language) of any kind (I18N-03).
- **Hiding anything behind `html[data-motion="on"]` in Phase 1** (UI-SPEC).
- **`tseslint.config(...)`:** deprecated. Use `defineConfig` from `eslint/config` [VERIFIED: spike].
- **Barrel icon imports / `astro-icon` / `@tabler/icons-react`** (AGENTS.md).
- **`--background` or bare `astro preview` in Playwright `webServer`** (Pitfall 1).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Locale URL math | Custom prefix joiners for every link | `getRelativeLocaleUrl` / `getAbsoluteLocaleUrl` from `astro:i18n` + one `stripLocale` | Trailing-slash and `site` handling are build-format-aware [VERIFIED: spike outputs] |
| Font self-hosting + fallback metrics | Manual `@font-face` + hand-tuned `size-adjust` | Astro Fonts API (`local` provider) + `<Font preload />` | Generates metric-adjusted fallbacks automatically [VERIFIED: spike] |
| Responsive/modern image formats | Manual sharp pipeline | `astro:assets` `<Picture formats={['avif','webp']}>` | Width/height, hashing, formats [VERIFIED: spike] |
| SVG icon inlining | `set:html` of raw SVG strings / custom loader | Native Astro SVG component import | Inline, typed, no JS [VERIFIED: spike] |
| a11y assertions | Custom DOM checks for contrast/labels | `@axe-core/playwright` (`withTags([... 'wcag22aa'])`) | Rule coverage |
| Component render tests | String-concatenating HTML | `experimental_AstroContainer` from `astro/container` (`renderToString(Component, { props })`) | Verified with an SVG-importing component |
| Dictionary completeness | Runtime "missing key" fallbacks | `satisfies Dictionary` + parity test | Compile-time failure [VERIFIED: spike] |
| Reduced-motion/no-JS emulation | Manual CDP calls | Playwright `test.use({ reducedMotion: 'reduce' })`, `test.use({ javaScriptEnabled: false })` | Verified |

**Key insight:** Nearly every Phase 1 capability is first-party in Astro 7. The only custom code is the dictionary module, `stripLocale`, the SEO builder, the gate, the registry and the secrets script, and all of it is small and pure enough to unit-test.

## Common Pitfalls

### Pitfall 1: Playwright `webServer` dies because Astro 7 auto-backgrounds under AI agents
**What goes wrong:** `Error: Process from config.webServer exited early.` Later runs print "Preview server already running at … (pid …)".
**Why:** Astro 7's CLI calls `isRunByAgent()` (package `am-i-vibing`). When an agent is detected (non-Windows), `astro dev`/`astro preview` detach into a background process with a lock file and the parent exits [VERIFIED: spike + source `node_modules/astro/dist/cli/preview/index.js` lines 37–45]. GSD executors are agents.
**How to avoid:** `webServer.command: 'pnpm astro preview --port 4321 --ignore-lock'`. Per the source, `--ignore-lock` forces a one-off foreground server (refs withastro/astro#17903) [VERIFIED: spike, tests pass]. Also set `reuseExistingServer: !process.env['CI']`. When running servers manually as an agent, use `pnpm astro dev --background` and `pnpm astro dev stop` (or `preview stop`) to clean up.
**Warning signs:** a `.astro/preview.json` lock file. `pnpm astro preview status` reports a background server.

### Pitfall 2: The "localized 404" only works in dev
**What goes wrong:** e2e on `/es/does-not-exist` gets the EN 404 under `astro preview` [VERIFIED: spike].
**How to avoid:** Follow the UI-SPEC bilingual root 404 (EN content + `lang="es"` line linking `/es/`). E2E assertions: (a) `/does-not-exist` → status 404, EN h1, link to `/`. (b) `/es/does-not-exist` → status 404 **and** the Spanish cross-link (`[lang="es"] a[href="/es/"]`) is present. (c) `/es/404/` renders the ES `NotFoundView` with `html[lang="es"]`, ES h1, link to `/es/`, and `noindex`. Document the deploy-time `es/404.html` gap (Pattern 7).

### Pitfall 3: `create-astro` in this repo creates a random subfolder and may write AI files
**What goes wrong:** `pnpm create astro@latest . --template minimal --yes` in a non-empty directory (this repo has `.planning/`, `CLAUDE.md`, `.git`) scaffolds into a random subfolder (e.g. `./afraid-antimatter/`) [VERIFIED: spike with create-astro 5.3.0]. create-astro 5.3 also has an `--no-ai` flag ("Skip creating AI agent files") [VERIFIED: `--help`]. Without it, it may add agent files that collide with the project's `CLAUDE.md` [ASSUMED: the exact files created were not inspected].
**How to avoid:** Either (a) run `pnpm create astro@latest tmp-scaffold --template minimal --no-install --no-git --no-ai --skip-houston --yes`, move its files to the root, and delete the folder, or (b) write the ~6 scaffold files by hand (spike approach). The minimal template contains only `.gitignore`, `.vscode/*`, `README.md`, `astro.config.mjs`, `package.json` (`engines.node >=22.22.0`), `public/favicon.*`, `src/pages/index.astro`, and `tsconfig.json` (extends `strict`; change it to `strictest`) [VERIFIED: spike]. Option (a) honors the AGENTS.md "recommended command" wording. Option (b) is more deterministic. Either way, never let it touch `CLAUDE.md`/`.planning/`.

### Pitfall 4: Fonts API providers that fetch from the network
**What goes wrong:** `fontProviders.npm()` (and by nature `google`/`fontsource`/`bunny`) download from a CDN at build time. With the network blocked, the build fails with `CannotFetchFontFile … https://cdn.jsdelivr.net/npm/@fontsource-variable/inter@5.3.0/…` [VERIFIED: spike]. `npm({ remote: false })` fails too: Astro's `CachedFontFetcher` reads absolute paths but not the `file://` URLs unifont produces [VERIFIED: spike + source `astro/dist/assets/fonts/infra/cached-font-fetcher.js`] (looks like an Astro 7.4 / unifont 1.0.3 bug).
**How to avoid:** `fontProviders.local()` with `src` package-import paths (docs: "It can be a path relative to the root, a package import or a URL" [CITED: docs.astro.build/en/reference/font-provider-reference/]). Built offline [VERIFIED: spike with HTTPS_PROXY pointed at a dead port].
**Warning signs:** A cold build (no `node_modules/.astro/fonts` cache) needs the network.

### Pitfall 5: Switcher/canonical on prerendered 404 pages
See Anti-Patterns. `Astro.url.pathname` = `/404/` at build. Pass `kind: 'notFound'` to BaseLayout. It suppresses canonical/hreflang, adds noindex, and makes the switcher target the other home.

### Pitfall 6: Strict ESLint rejects common registry typings
`(doc) => Cleanup | void` fails `@typescript-eslint/no-invalid-void-type` under `tseslint.configs.strict` [VERIFIED: spike]. Use `Cleanup | undefined` and `return undefined`. Also `strictest` enables `noUnusedLocals` (`ts(6133)` on an unused import in a spec file broke `astro check`) [VERIFIED: spike].

### Pitfall 7: ESLint 10 + eslint-plugin-jsx-a11y peer mismatch
`eslint-plugin-jsx-a11y@6.10.2` peers `eslint ^3…^9`, so pnpm warns. Use `eslint-plugin-jsx-a11y-x@0.2.0`. eslint-plugin-astro resolves it automatically and its rules are reported as `astro/jsx-a11y/*` [VERIFIED: spike].

### Pitfall 8: Template `.gitignore` is incomplete for FND-04
The minimal template ignores `.env` and `.env.production` only. It does **not** ignore `.dev.vars`, `.env.local`, or `.env.*` [VERIFIED: spike]. Add:
```
.env
.env.*
!.env.example
.dev.vars
.dev.vars.*
test-results/
playwright-report/
```
Then enforce with `scripts/check-secrets.ts` (Code Examples), run after `astro build`.

### Pitfall 9: Node version noise
eslint-plugin-astro 3.2.1 `engines.node` = `^22.22.3 || ^24.16.0 || >=26.3.0`. Local is 24.15.0, which works but warns. Do **not** put `>=24.16` in the project's `package.json` `engines`: pnpm then prints `Unsupported engine` on every command (it does not fail) [VERIFIED: spike]. [Proposed] Add `.nvmrc` = `24.22.0` (latest 24 LTS listed by `nvm ls-remote 24`; nvm is installed) and keep `engines.node: ">=22.22.0"` (Astro's minimum). Make "upgrade Node via `nvm install`" a human-verify checkpoint, because it changes the user's machine.

### Pitfall 10: Astro 7 compiler and whitespace
The Rust compiler errors on invalid HTML (unclosed tags, `<div>` inside `<p>`), and `compressHTML: 'jsx'` can drop whitespace between inline elements [CITED: docs.astro.build/en/guides/upgrade-to/v7/ via project STACK.md]. For "EN / ES", use flex + `gap-1` rather than relying on text spaces between `<a>`s. In the spike, `{t('x')} {other}` kept its space [VERIFIED: spike].

### Pitfall 11: Hero image is LCP and must never be gated
`<Picture … loading="eager" fetchpriority="high" width height>` produced `<img … loading="eager" fetchpriority="high" decoding="async" width="400" height="500">` inside `<picture>` with avif/webp sources [VERIFIED: spike]. Keep it out of any `data-motion` CSS. [Proposed] Its placeholder asset must be a real raster (jpg/png) at 4:5 in `src/assets/`. sharp is **not** importable from the project root under pnpm's strict layout (it is a transitive dependency of astro), so generate the placeholder with a one-off tool or commit a provided file.

## Code Examples

### package.json scripts [Proposed; each command verified individually in the spike]
```json
{
  "type": "module",
  "engines": { "node": ">=22.22.0" },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "lint": "astro check && eslint . && prettier --check .",
    "format": "prettier --write .",
    "test": "vitest run",
    "test:e2e": "astro build && playwright test",
    "check:secrets": "node scripts/check-secrets.ts",
    "verify": "pnpm lint && pnpm test && pnpm test:e2e && pnpm check:secrets"
  }
}
```
`node scripts/check-secrets.ts` runs natively on Node 24.15 (type stripping), with no warnings printed [VERIFIED: spike].

### tsconfig.json
```json
{ "extends": "astro/tsconfigs/strictest", "include": [".astro/types.d.ts", "**/*"], "exclude": ["dist"] }
```

### vitest.config.ts [VERIFIED: spike]
```ts
/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';
export default getViteConfig({ test: { include: ['tests/unit/**/*.test.ts'] } });
```
Use `// @vitest-environment happy-dom` at the top of DOM tests (gate, lifecycle).

### Component render test [VERIFIED: spike]
```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, it } from 'vitest';
import LanguageSwitcher from '../../src/components/global/LanguageSwitcher.astro';
it('marks current locale and links to the other', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(LanguageSwitcher, { props: { locale: 'es', pathname: '/es/' } });
  expect(html).toContain('aria-current="true"');
  expect(html).toContain('href="/"');
});
```

### Dictionary tests [VERIFIED: spike]
```ts
// tests/unit/i18n.test.ts — runtime parity
import { expect, it } from 'vitest';
import { en } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';
it('es has exactly the en keys', () => { expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort()); });
it('no empty es strings', () => { for (const v of Object.values(es)) expect(v.trim()).not.toBe(''); });

// tests/unit/dictionary-types.test.ts — compile-time proof (astro check fails with ts(2578) if this ever compiles)
import type { Dictionary } from '../../src/i18n/ui.en';
it('a dictionary missing a key is a type error', () => {
  // @ts-expect-error -- deliberately incomplete
  const incomplete = { 'hero.greeting': 'x' } satisfies Dictionary;
  expect(Object.keys(incomplete)).toHaveLength(1);
});
```

### playwright.config.ts [VERIFIED: spike]
```ts
import { defineConfig, devices } from '@playwright/test';
const PORT = 4321;
export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: !!process.env['CI'],
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm astro preview --port ${PORT} --ignore-lock`, // --ignore-lock: see Pitfall 1
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env['CI'],
  },
});
```

### E2E building blocks [VERIFIED: spike for axe, reducedMotion, javaScriptEnabled, 404 status]
```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const path of ['/', '/es/', '/does-not-exist', '/es/404/']) {
  test(`axe: ${path}`, async ({ page }) => {
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(violations).toEqual([]);
  });
}

test.describe('no JS', () => {
  test.use({ javaScriptEnabled: false });
  test('hero + icon visible, motion off', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('#main img')).toBeVisible();
    await expect(page.locator('footer svg').first()).toBeVisible();
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('motion off', async ({ page }) => {
    await page.goto('/es/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
  });
});

test.describe('browser prefers Spanish', () => {
  test.use({ locale: 'es-ES', extraHTTPHeaders: { 'Accept-Language': 'es-ES,es;q=0.9' } });
  test('never redirects', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});

test('switcher keeps the page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Language' }).getByRole('link', { name: 'Español' }).click();
  await expect(page).toHaveURL(/\/es\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
});

test('seo head', async ({ page }) => {
  await page.goto('/es/');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/es\/$/);
  for (const l of ['en', 'es', 'x-default']) await expect(page.locator(`link[rel="alternate"][hreflang="${l}"]`)).toHaveCount(1);
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'es_ES');
});

test('skip link moves focus to main', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
});

test('320px: no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/es/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
```
[ASSUMED] The accessible-name selectors depend on final markup (e.g. the switcher link names "English"/"Español" via `aria-label`). Adjust to the UI-SPEC copy.

### ESLint flat config [VERIFIED: spike]
```js
// eslint.config.js
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import globals from 'globals';

export default defineConfig(
  globalIgnores(['dist/', '.astro/', 'node_modules/', 'test-results/', 'playwright-report/']),
  js.configs.recommended,
  tseslint.configs.strict,
  astro.configs.recommended,
  astro.configs['jsx-a11y-strict'],
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
);
```

### Prettier [VERIFIED: spike]
```json
{
  "singleQuote": true,
  "printWidth": 100,
  "plugins": ["prettier-plugin-astro", "prettier-plugin-tailwindcss"],
  "tailwindStylesheet": "./src/styles/global.css",
  "overrides": [{ "files": "*.astro", "options": { "parser": "astro" } }]
}
```
Add `.prettierignore` with `dist`, `.astro`, `pnpm-lock.yaml`, `.planning`. [Proposed] Exclude `.planning/` so docs aren't reformatted.

### Secrets check [VERIFIED: spike — exits 0 when clean, 1 with a planted `dist/.env`]
```ts
// scripts/check-secrets.ts — run after `astro build`
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SECRET_FILE = /(^|\/)(\.env(\..+)?|\.dev\.vars(\..+)?)$/;
const ALLOWED = /(^|\/)\.env\.example$/;
const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n').filter((f) => SECRET_FILE.test(f) && !ALLOWED.test(f));
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const distFiles = existsSync('dist') ? walk('dist') : [];
const leakedFiles = distFiles.filter((f) => SECRET_FILE.test(f));
const values = ['.env', '.dev.vars'].filter(existsSync)
  .flatMap((f) => readFileSync(f, 'utf8').split('\n'))
  .map((l) => l.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, ''))
  .filter((v) => v.length >= 8);
const leakedValues = distFiles.filter((f) => values.some((v) => readFileSync(f, 'utf8').includes(v)));
const problems = [
  ...tracked.map((f) => `tracked in git: ${f}`),
  ...leakedFiles.map((f) => `in dist: ${f}`),
  ...leakedValues.map((f) => `secret value in: ${f}`),
];
if (problems.length > 0) { console.error(problems.join('\n')); process.exit(1); }
console.log(`secrets check ok (${distFiles.length} dist files scanned)`);
```
[Proposed] Should the dist check fail when `dist/` is missing? Probably yes in `verify`, so that it doesn't silently pass. Note that `.dev.vars` files don't exist yet (no adapter until Phase 5), so the value scan is future-proofing.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@astrojs/tailwind` | `@tailwindcss/vite` + `@import "tailwindcss"` + `@theme` | Tailwind v4 | No `tailwind.config.*` |
| `tseslint.config()` | `defineConfig()` from `eslint/config` | typescript-eslint 8.x (deprecated) | Use core helper |
| `eslint-plugin-jsx-a11y` | `eslint-plugin-jsx-a11y-x` (for ESLint 10) | 2024–2026 | Clean peers |
| `<ViewTransitions />` | `<ClientRouter />` (Phase 7 decision) | Astro 6 | Not used in Phase 1 |
| `astro:transitions/client` `TRANSITION_*` constants | Raw event names `'astro:page-load'`, `'astro:before-swap'` | Astro 7 | Registry uses strings |
| Foreground-only `astro dev/preview` | Agent-aware auto-background + lock file, `--background`, `--ignore-lock`, `stop/status/logs` | Astro 7.x | Pitfall 1 |
| Fontsource CSS imports / Google Fonts links | Astro Fonts API (stable since 6.0) with `<Font />` | Astro 6 | Metric fallbacks for free |

**Deprecated/outdated:** `experimental_AstroContainer` is still exported under the `experimental_` prefix in 7.4.0 [VERIFIED: `astro/dist/container/index.d.ts`]. It works, but expect API churn.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The Latin subset alone covers all Spanish characters needed | Pattern 1 | Missing glyphs fall back to the system font. Low. Add `latin-ext` if needed |
| A2 | `--text-*: initial` reset limits Tailwind to the 4 UI-SPEC sizes | Pattern 1 | Typography drift not prevented. Low. Verify in the first build |
| A3 | create-astro without `--no-ai` writes agent files that could collide with CLAUDE.md | Pitfall 3 | Possible overwrite of project instructions. Mitigated by always passing `--no-ai` |
| A4 | Accessible-name selectors in the e2e examples match final markup | Code Examples | Test edits only |
| A5 | All recommended packages are legitimate (slopcheck unavailable) | Package Legitimacy Audit | Supply-chain. Low given org repos/ages. Human checkpoint required |
| A6 | Lifecycle registry API shape (Pattern 6) suits Phases 6–7 | Pattern 6 | Minor refactor later. It is Claude's discretion |

## Open Questions (RESOLVED)

1. **`site` URL (needed for canonical/hreflang/og:url).** RESOLVED
   - Known: Astro needs `site` for absolute URLs. The custom domain is an open question for Martina (STATE.md).
   - Recommendation: a placeholder constant (e.g. `https://martinafernandez.example`) with a TODO, kept in one place. The e2e tests assert path suffixes, not the host.
   - RESOLVED: placeholder `https://martinafernandez.example` in `src/data/site.ts` marked `TODO(martina)`, consumed by `astro.config.ts` `site` (Plan 01-01 Task 3, interfaces block); SEO tests assert paths, not host (Plan 01-04).
2. **Martina's email, Behance URL, Instagram/LinkedIn, portrait, final hero copy.** RESOLVED
   - Recommendation: `src/data/site.ts` with Behance `https://www.behance.net/martifernand7` (known from PROJECT.md), a placeholder email flagged TODO, and Instagram/LinkedIn omitted (UI-SPEC: only if provided). Use the UI-SPEC draft copy.
   - RESOLVED: `site.ts` with real Behance URL, placeholder email `hello@martinafernandez.example` (TODO(martina)), Instagram/LinkedIn omitted and rendered only when defined (Plan 01-01 Task 3, Plan 01-03 Task 3). Draft hero copy from UI-SPEC with a TODO(martina) header (Plan 01-02 Task 2). Solid-color stand-in portrait with a neutral TODO(martina) alt text; the real portrait is listed as a pre-launch item in the 01-03 SUMMARY (Plan 01-03 Task 2).
3. **Wire the lifecycle bootstrap into pages now, or only ship the module + tests?** RESOLVED
   - Recommendation: wire it (tiny, proves integration) and assert no console errors. The planner may defer.
   - RESOLVED: wired now. Registry module + unit tests in Plan 01-05 Task 2; bundled bootstrap script in BaseLayout plus zero-console-error e2e in Plan 01-05 Task 3.
4. **Node upgrade to >= 24.16.** RESOLVED
   - Recommendation: `.nvmrc` 24.22.0 plus a human checkpoint to run `nvm install && nvm use`. Not blocking (24.15 works with an engines warning) [VERIFIED: spike].
   - RESOLVED: `.nvmrc` = 24.22.0 and `engines.node` >=22.22.0 (Plan 01-01 Task 2); the upgrade is an optional user action offered in the Plan 01-01 Task 1 checkpoint. The executor never runs nvm.
5. **ES 404 on a real static host (`es/404.html`).** RESOLVED (deferred)
   - Deferred to deploy (post-v1). Note it in the phase summary.
   - RESOLVED: deferred to deploy time. Plan 01-04 Task 3 keeps the default build.format and records the `astro:build:done` copy step as a deferred item in the 01-04 SUMMARY.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | everything | ✓ | 24.15.0 (Astro needs >=22.22.0; eslint-plugin-astro prefers >=24.16) | Works with an engines warning. `nvm install 24.22.0` (nvm present) |
| pnpm | everything | ✓ | 11.0.8 | — |
| git | secrets check (`git ls-files`) | ✓ | 2.56.0. Repo initialized, 4 commits | — |
| Playwright Chromium headless shell v1248 | FND-02 | ✓ (installed during research) | 156.0.8078.4 | `pnpm exec playwright install chromium` |
| sharp (via astro) | `<Picture>` | ✓ | 0.35.5 prebuilt, no build approval needed | — |
| Network at build time | none if the `local` font provider is used | n/a | — | Offline build verified |
| nvm | Node upgrade | ✓ | — | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** Node >= 24.16 (optional upgrade).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.5 (unit, happy-dom 21.0.3 where needed) + Playwright 1.64.1 with @axe-core/playwright 4.14.0 (e2e) + `astro check` (type gate) |
| Config file | none yet. Wave 0 creates `vitest.config.ts`, `playwright.config.ts`, `eslint.config.js`, `.prettierrc.json` |
| Quick run command | `pnpm test` (Vitest, ~0.5 s in spike) |
| Full suite command | `pnpm lint && pnpm test && pnpm test:e2e && pnpm check:secrets` (`pnpm verify`) |

### Success Criteria → Automated Checks
| SC | Behavior | Test Type | Automated Command |
|----|----------|-----------|-------------------|
| SC1 | dev/build/lint/test/e2e all pass, zero errors | gate | `pnpm build && pnpm lint && pnpm test && pnpm test:e2e`. `pnpm dev` smoke: `pnpm astro dev --background` → `curl -sf localhost:4321/ && curl -sf localhost:4321/es/` → `pnpm astro dev stop` |
| SC1 | no `.env`/`.dev.vars` content in git or `dist/` | script | `pnpm build && pnpm check:secrets` (and a planted-file negative test, run once manually or as a Vitest test of the pure matcher) |
| SC2 | hero (greeting, h1, title, description, image) at `/` and `/es/` without JS | e2e | `pnpm playwright test tests/e2e/home.spec.ts` (`javaScriptEnabled: false`, both locales, localized text asserted from the dictionaries) |
| SC2 | shared header/nav, footer with email + socials, skip link works | e2e | `tests/e2e/layout.spec.ts` (landmarks, `mailto:`, Behance link `target=_blank rel=noopener noreferrer`, Tab → skip link → Enter → `#main` focused, keyboard order) |
| SC2 | ≥1 Tabler icon as inline SVG, no client JS | e2e + unit | e2e: `footer svg` visible with JS disabled, and raw `request.get('/')` HTML contains `<svg` inside the footer. Unit: Container render of `SiteFooter` contains `<svg` and `aria-hidden="true"` |
| SC3 | EN/ES toggle → same page in other language | unit + e2e | unit `tests/unit/routes.test.ts` (`stripLocale`, `alternatePath`). e2e click "Español" on `/` → `/es/`, "English" on `/es/` → `/` |
| SC3 | browser language never redirects | e2e | `test.use({ locale: 'es-ES', extraHTTPHeaders })` → `/` stays `/`, `lang="en"`. Plus `grep -rn "navigator.language\|preferredLocale" src/` returns nothing (lint-style check) |
| SC4 | html lang, canonical, hreflang en/es/x-default, localized title/description/OG | unit + e2e | unit `tests/unit/seo.test.ts` (pure builders). e2e `tests/e2e/seo.spec.ts` on `/` and `/es/` (exact values). 404s: noindex present, canonical/hreflang absent |
| SC4 | missing ES key fails type-check or tests | type + unit | `pnpm check` (`satisfies Dictionary`) + `tests/unit/dictionary-types.test.ts` (`@ts-expect-error` fixture, enforced by astro check) + `tests/unit/i18n.test.ts` (key parity) |
| SC5 | nonexistent URL → localized 404 with link home | e2e | `tests/e2e/not-found.spec.ts`: `/does-not-exist` 404 + EN h1 + link `/`. `/es/does-not-exist` 404 + `[lang="es"] a[href="/es/"]`. `/es/404/` ES h1 + link `/es/` |
| SC5 | reduced motion or no JS → `html[data-motion="off"]`, all content visible | e2e + unit | e2e `reducedMotion: 'reduce'` and `javaScriptEnabled: false` on `/`, `/es/`. Default context → `"on"`. Unit `tests/unit/motion-gate.test.ts` (matchMedia spy both ways + `new Function(motionGateInline)` runs) |
| SC5 | gate + lifecycle registry exist with unit tests | unit | `tests/unit/lifecycle.test.ts` (idempotent mount/unmount, 10× cycle constant count, error isolation, Astro event binding via dispatched events) |
| UI-SPEC | axe zero violations on `/`, `/es/`, `/404`, `/es/404` | e2e | `tests/e2e/a11y.spec.ts` with `withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'])` |
| UI-SPEC | 320px no horizontal overflow, h1 ≤ 2 lines | e2e | viewport 320 → `scrollWidth <= 320`. h1 `boundingBox().height <= 2 × line-height(52.8px) + tolerance` |

### Sampling Rate
- **Per task commit:** `pnpm lint && pnpm test`
- **Per wave merge:** `pnpm verify` (adds the build + e2e + secrets)
- **Phase gate:** `pnpm verify` green, plus the `pnpm dev` smoke, before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Scaffold + configs: `package.json`, `astro.config.ts`, `tsconfig.json`, `.gitignore` additions, `.nvmrc`, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `vitest.config.ts`, `playwright.config.ts`
- [ ] `scripts/check-secrets.ts`
- [ ] `tests/unit/` and `tests/e2e/` directories with at least one passing test each (the thinnest slice: `html lang` on `/` and `/es/` + axe on both)
- [ ] `pnpm exec playwright install chromium` (already present on this machine as of this research)

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — (no auth) |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | minimal | No user input in Phase 1. URL pathname is only used at build time. `stripLocale` is a pure regex over trusted build paths |
| V6 Cryptography | no | — |
| V8 Data Protection / V14 Config | yes | `.gitignore` for `.env*`/`.dev.vars*`, `check-secrets` over git + `dist/`. No `PUBLIC_` env vars. No secrets exist yet |
| V14.4 HTTP security headers | deferred | Headers belong to the host (post-v1 `_headers`/Worker). Phase 1 has no host |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Secret committed or bundled | Information disclosure | Gitignore + `check:secrets` gate in `verify` |
| Reverse tabnabbing on external socials | Tampering | `target="_blank" rel="noopener noreferrer"` (UI-SPEC) + jsx-a11y/ESLint |
| Inline script injection via `set:html` | Tampering | The only `set:html` is the build-time constant `motionGateInline` (no user data). Lint/grep to keep `set:html` usage limited to it |
| Supply-chain (typosquat) | Tampering | Exact versions pinned. Org-owned packages. Human checkpoint (slopcheck unavailable) |
| Open redirect via language switcher | Spoofing | Switcher hrefs are computed at build from known locales only. No query-driven redirects |

## Sources

### Primary (HIGH confidence)
- Spike on this machine, 2026-10-16 (`/private/tmp/claude-501/-Users-bmartinez-Developer-personal/50a98a67-f13d-4d85-90db-a2d32dc36664/scratchpad/spike`): build, preview/dev 404 routing, fonts offline, Picture, SVG icons, astro check, ESLint, Prettier, Vitest (+Container, astro:i18n, happy-dom), Playwright + axe, secrets script, create-astro behavior
- Astro 7.4.0 source: `dist/cli/preview/index.js` + `dist/cli/agent.js` (agent auto-background, `--ignore-lock`), `dist/assets/fonts/infra/cached-font-fetcher.js`, `dist/assets/fonts/providers/index.d.ts`, `dist/types/public/config.d.ts` (fonts), `dist/container/index.d.ts`
- npm registry (`npm view`) for every version/peer/engine/postinstall quoted above
- https://docs.astro.build/en/guides/internationalization/ (prefixDefaultLocale default, `Astro.currentLocale` on prerendered pages, `preferredLocale` only on-demand)
- https://docs.astro.build/en/reference/font-provider-reference/ (local `src` package imports, npm `remote`/`cdn` options)
- https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/ (`404-page` nearest-404 walk-up, `auto-trailing-slash`)

### Secondary (MEDIUM confidence)
- Project research `.planning/research/{STACK,ARCHITECTURE,PITFALLS,SUMMARY}.md` (2026-10-15), built on here, not redone
- https://docs.astro.build/en/guides/view-transitions/ (lifecycle events, scripts run once), via ARCHITECTURE.md

### Tertiary (LOW confidence)
- None relied upon

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH. Exact versions installed and run together
- Architecture: HIGH for routing/i18n/SEO/icons/fonts/404 behavior (observed). MEDIUM for the registry API shape (discretionary design)
- Pitfalls: HIGH. Each reproduced in the spike, except A3 (create-astro AI files)

**Research date:** 2026-10-16
**Valid until:** ~2026-11-15 (Astro is releasing minors quickly. Re-check `astro` and `@astrojs/check` peers if bumped)
