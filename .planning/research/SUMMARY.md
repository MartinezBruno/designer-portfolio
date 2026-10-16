# Project Research Summary

**Project:** Designer Portfolio — Martina Fernandez
**Domain:** Motion-rich, bilingual (EN/ES) graphic-designer portfolio; projects sourced from Behance; Cloudflare hosting target (deploy post-v1)
**Researched:** 2026-10-15
**Confidence:** MEDIUM-HIGH (core stack HIGH; Behance data access MEDIUM — relies on undocumented page internals)

> Labels follow the user's verification rules: **[Verified]** = tested directly by a researcher; **[Documented]** = official docs; **[Inference]/[Proposed]/[Unverified]** as stated. All recommendations are **[Proposed]** until built and tested.

## Executive Summary

A static-first, image- and motion-heavy marketing site for a freelance designer, whose visitors (potential clients) judge in minutes. Motion serves the core value ("feel her design sensibility") but must never delay the landing → work → contact path. Experts build this as a prerendered Astro site (EN at `/`, ES at `/es/`) with one on-demand surface (contact Action on Cloudflare Workers), a build-time content pipeline, and a vanilla-TS motion runtime (GSAP + ScrollTrigger + Lenis) gated by `prefers-reduced-motion` and progressively enhanced (content visible without JS).

For the key unknown — Behance data — the recommendation is a **snapshot hybrid**: a manual `pnpm sync:behance` script scrapes the embedded `beconfig-store_state` JSON from the public profile and project pages, normalizes/sanitizes/validates it with Zod, and writes a **committed JSON snapshot**; a custom Content Layer loader reads only the snapshot, so builds never depend on Behance being reachable. A local bilingual **overrides** collection (keyed by Behance id) supplies what Behance can't (ES/EN titles and summaries, curated categories, alt text, featured/order/hidden). The official API is unobtainable and RSS is too thin (7 items, cover only). Stack: Astro 7.4, TypeScript pinned to ~6.0.3, Tailwind 4.3 via `@tailwindcss/vite`, GSAP 3.15 + Lenis 1.3, Astro Actions + Turnstile + Resend (behind a mailer interface) on `@astrojs/cloudflare` 14 (Workers, not Pages).

Key risks, in priority order:
1. Behance scraping is undocumented, fragile, and has ToS exposure → Martina's explicit consent; committed snapshot as resilience; Playwright / manual-entry fallbacks.
2. GSAP/Lenis/ScrollTrigger lifecycle bugs under page transitions → lifecycle registry before any effect.
3. Accessibility and LCP regressions from motion → reduced-motion gate and progressive enhancement designed into the foundation.
4. i18n retrofit cost → locale plumbing before any content component.
5. Behance content is single-language with empty descriptions and machine alt text → local bilingual overrides are required, not optional.

## Conflicts & Resolutions

Directly verified evidence wins over unverified or older claims.

| # | Conflict | Resolution | Status |
|---|---|---|---|
| 1 | **Astro version.** PITFALLS cites Astro 6; STACK and ARCHITECTURE verified **7.4.0** on npm (2026-10-15), and STACK built a throwaway project on it. | **Use Astro 7.4.0.** PITFALLS' Astro-6 points still apply to v7: Cloudflare adapter is Workers-only; `Astro.locals.runtime` removed (use `astro:env` / `cloudflare:workers`); secrets via `astro:env` because `import.meta.env` is inlined; `redirectToDefaultLocale` defaults to `false`; `<ViewTransitions />` removed → `<ClientRouter />`; Zod 4 via `astro/zod`; legacy collections removed. **v7 differences:** Vite 8 (`@tailwindcss/vite` 4.3.3 verified to build); Node `>=22.22.0`; Rust compiler rejects invalid HTML; `compressHTML` defaults to `'jsx'`; `astro:transitions` helper constants removed (use raw `astro:page-load` / `astro:before-swap`); `@astrojs/db` removed. | Resolved |
| 2 | **Behance project count.** PITFALLS: 14 in profile JSON. STACK: 7 (`profileProjects`, `hasMore:false`), matching RSS count of 7. | STACK is more specific (field path, `hasMore:false`, RSS cross-check), but PITFALLS' 14 may come from another JSON path. Neither can be preferred with certainty. | **Unresolved — confirm in Behance phase** (count live profile, compare RSS, check `hasMore`). Decides filter scope (FEATURES threshold ≈ 8 projects). |
| 3 | **Behance detail pages.** PITFALLS: 403 + JS challenge = blocked. STACK: challenge is a cookie-setting script; replaying `js_challenge_value` with the **same UA** returned 200 for all 7; JSON has `allModules[]` (images ≤1920px, text HTML, grids, embeds), tags, tools. | **Prefer STACK** (tested past the first 403). Fragility retained: fails if UA differs; undocumented key paths; unknown module types (video, audio, 3D) may appear. Plan B: Playwright in a local sync run. Plan C: manual entry via overrides schema. Fail loudly on challenge bodies (~453 bytes, contains `js_challenge_value`); never overwrite a good snapshot with a partial one. | Resolved, risk retained |
| 4 | **Page transitions.** ARCHITECTURE + STACK: `<ClientRouter />`. PITFALLS: native cross-document view transitions to avoid GSAP/Lenis re-init bugs. | **Deferred to Motion phase.** ClientRouter: persistent cursor/Lenis state, shared-element morphs, but needs strict lifecycle discipline. Native: removes teardown bug class but loses persisted state; Firefox/Safari support needs re-checking (LOW confidence). **Binding either way:** motion gate + lifecycle registry (init/cleanup on `astro:page-load` / `astro:before-swap`) built in the shell phase. Motion exit criterion: "navigate 10×, trigger count stays constant". | **Open — Motion phase** |
| 5 | **Contact email.** STACK: Resend. ARCHITECTURE: mailer interface with console provider for local-only v1. | **Compatible — adopt both.** v1: `Mailer` interface + `console` provider. Deploy: Resend provider (`onboarding@resend.dev` test sender emails only the account owner — fits if the account uses her address). Later: verified domain in Resend or Cloudflare Email Routing `send_email`. Cloudflare Email Service (beta, Workers Paid) not recommended for v1. | Resolved |

**Also captured:**
- **Pages → Workers:** `@astrojs/cloudflare` 14.x targets Workers (static assets + Worker); Pages support removed in v13. Stay on adapter 14 (15 is beta).
- **TypeScript:** pin `~6.0.3`. Not TS 7.x (npm `latest`) — `@astrojs/check@0.9.10` and `typescript-eslint@8.71` peers exclude it.
- **Node:** Astro 7 needs `>=22.22.0`; `eslint-plugin-astro@3.2.1` needs `^22.22.3 / ^24.16 / >=26.3`. Local machine has 24.15 → upgrade to ≥24.16. Pin via `.nvmrc` / `engines`. pnpm 11 needs `pnpm approve-builds` for sharp, esbuild, workerd.
- **Scraping ToS & consent:** Adobe terms §6.6 / §6.18 forbid automated extraction; §4.2 says she retains rights to her content. robots.txt doesn't disallow profile or `/gallery/` for generic agents (disallows `/v2/`, `/v3/`, AI-training bots). **Get Martina's explicit consent before building the scraper.** Keep volume tiny (~8 requests, 2 s apart, manual runs only). Never scrape from CI on a schedule or at runtime from a Worker. Link back to Behance on every project. Not legal advice.
- **Fragile/empty Behance fields:** creative fields only extractable from `<meta name="keywords">` (positional heuristic); `description` empty for all 7; `altText` machine-generated ("Image may contain: …") and missing on many modules → local bilingual overrides required for categories, summaries, ES titles, alt text.

## Key Findings

### Recommended Stack (see STACK.md)

Astro 7.4 static-first with built-in i18n, a build-time Behance snapshot behind a Content Layer loader, and a vanilla GSAP/Lenis motion runtime. Add dependencies only in the phase that needs them.

- **Astro 7.4.0 + `astro/tsconfigs/strictest`** — framework, built-in i18n (`prefixDefaultLocale:false`), Content Layer, Actions, assets. Verified by a real build.
- **TypeScript `~6.0.3`** — TS 7 breaks check/lint peers.
- **Tailwind 4.3.3 via `@tailwindcss/vite`** — only style solution, `@theme` tokens. Not legacy `@astrojs/tailwind`.
- **Custom Content Layer loader + committed `snapshot.json` + `sync-behance.ts`** — Behance resilience; Zod (`astro/zod`) and `sanitize-html` at sync time only.
- **GSAP 3.15 (ScrollTrigger, SplitText — free) + Lenis 1.3** — gsap+ScrollTrigger+SplitText 49.3 KB gz, Lenis 5.5 KB gz (~55 KB). Don't also ship `motion`. Add OGL (~14 KB gz) only if WebGL distortion is truly needed.
- **`@astrojs/cloudflare` 14.4 + wrangler 4.151, Astro Actions, Turnstile (plain script + `fetch`), Resend or plain `fetch`** — added in the contact phase. `imageService:'compile'`; `astro:env` / `.dev.vars` for secrets.
- **`astro:assets` with `remotePatterns` for `mir-s3-cdn-cf.behance.net`** — build-time download/optimization (verified: 89 kB PNG → 40 kB WebP). No hotlinking.
- **`@tabler/icons` raw SVGs as Astro SVG components** — explicit per-icon imports, no barrels (verified on Astro 7.4).
- **Quality:** Vitest 5, Playwright 1.64 + axe, ESLint 10 + eslint-plugin-astro 3 + typescript-eslint 8, Prettier 3, `astro check`.

### Expected Features (see FEATURES.md)

**Must have (table stakes):**
- Header/nav, EN/ES text switcher (no flags) preserving current page, footer with email/socials, skip link, CTA on every page.
- i18n foundation: `html lang`, hreflang + x-default (Astro doesn't emit it), per-page SEO/OG, no auto-redirect by browser language.
- Motion foundation: reduced-motion gate, progressive-enhancement reveals (content visible without JS).
- Hero (not JS-gated — LCP element), accessible roles marquee (WCAG 2.2.2: pause, static under reduced motion, `aria-hidden` clones), 4 services, tools grid.
- Behance pipeline with committed snapshot and optimized local images; latest 3 sorted by `publishedOn` (never feed order); projects page lists all, newest first.
- Project detail module renderer: image/text/grid/embed modules with unknown-type fallback, metadata header, next/prev, "View on Behance", contact CTA.
- Contact form: localized validation, honeypot + Turnstile, success/error states, `mailto:` fallback, typed text kept on failure.
- Localized 404, scroll reveals, page transitions with focus management, image hover effects.

**Should have (competitive):**
- Category filter chips + accent-insensitive text search with URL state (once real count/fields confirmed).
- Custom cursor + magnetic buttons (pointer-fine only).
- Smooth scroll + parallax (highest a11y/perf risk).
- Service → contact pre-fill, branded OG images, remembered-language banner, in-UI motion-off toggle, availability badge.

**Defer (v2+):** manual ES overrides for Behance body text, testimonials (only with real content), scheduled refresh (needs deploy), tools/year filters, cookieless analytics.

**Anti-features:** full-screen preloader; scroll-jacking; auto-redirect by language/IP; flags in switcher; machine-translating Behance text; faceted search/pagination/infinite scroll; runtime Behance fetch; Behance hotlinking or iframe embeds; content hidden until JS runs; cursor replacing native one on touch; skill bars.

**Filter scope note:** STACK suggests Field/Category + Tool + Year + text; FEATURES suggests category-only for v1. Resolution: Category chips + text search; tools and year shown as labels; revisit once real count is known.

### Architecture Approach (see ARCHITECTURE.md)

Static output with exactly one on-demand surface (contact Action). Data flows down only: Content Layer → `queries.ts` → views → sections → UI. Components never import the Behance adapter. Source-agnostic Zod `Project` model with `behance` / `snapshot` / `fixtures` adapters, so UI work starts on fixtures. Three i18n content classes: typed UI dictionaries (missing ES key = type error); localized static YAML with `{en, es}`; Behance content untranslated, wrapped in `lang`, with overrides for key summaries. Motion lives in `lib/motion/` as vanilla TS with `data-*` hooks, a reduced-motion gate, and a lifecycle registry; hidden initial states apply only under `html[data-motion="on"]`.

**Major components:**
1. **Project model + adapters + loader + queries** (`src/lib/projects/`) — the only place that knows Behance exists.
2. **Sync script** (`scripts/sync-behance.ts`) — only writer of the snapshot; fails loudly on drift or challenge pages.
3. **Overrides collection** (keyed by Behance id) — bilingual titles/summaries, category, per-module alt text, featured/order/hidden.
4. **i18n module** (`src/i18n/`) + thin page wrappers in `src/pages/` and `src/pages/es/` rendering shared views.
5. **Layouts / views / sections / UI primitives** — `BaseLayout` handles lang, hreflang, SEO, skip link, motion bootstrap; sections map 1:1 to requirements.
6. **Motion runtime** — `gate.ts`, `lifecycle.ts`, effects declared via `data-reveal`, `data-parallax`, `data-magnetic`.
7. **Contact Action + mailer port** — Zod, honeypot, Turnstile verify; provider chosen by env (console in v1, Resend at deploy).

### Critical Pitfalls

1. **Live Behance fetch at build/request time** → broken builds or empty portfolio. Prevent: committed snapshot, loader reads only local data, sync refuses partial/empty overwrites, offline-build check.
2. **Filters/detail pages built on data Behance doesn't expose.** Prevent: real data sample first, optional enrichment fields, overrides file for hand-tagged categories, data-driven filter UI.
3. **Behance ToS/robots exposure and scraping fragility.** Prevent: Martina's consent, minimal manual runs, no CI/runtime scraping, "View on Behance" credit, Playwright and manual fallbacks.
4. **GSAP/Lenis/ScrollTrigger lifecycle bugs under page transitions.** Prevent: registry kills triggers and ticker callbacks on `before-swap`; on `page-load` run `scrollTo(0,{immediate})` and `ScrollTrigger.refresh()` after fonts/images load; single `gsap.ticker` driving Lenis; 10-navigation loop test.
5. **Motion damaging a11y and Core Web Vitals.** Prevent: `gsap.matchMedia()` branches from day one; never JS-gate the LCP hero; WCAG 2.2.2 marquee; pointer-fine-only cursor; anchors move focus; `data-lenis-prevent` on scrollable overlays; early perf budget (proposed: LCP < 2.5 s, CLS < 0.1, homepage JS ≈ 100 KB gz).
6. **Secrets and runtime pitfalls on Cloudflare.** Prevent: HTTP-API email only (no SMTP); secrets from `astro:env`, never `PUBLIC_` vars or `import.meta.env`; grep `dist/` for secrets in CI; homepage static, submit via script call.
7. **i18n routing and SEO errors.** Prevent: path-preserving switcher, identical slugs across locales, hreflang/canonical/`html lang`, typed key-parity test, explicit `Intl` locale.

## Implications for Roadmap

Order follows ARCHITECTURE's dependency-driven build order, adjusted by PITFALLS (decide Behance access early; motion foundation in the shell) and FEATURES (motion effects after markup is stable).

**Suggested phases: 8**

### Phase 1: Foundation & quality gates
**Rationale:** AGENTS.md quality gates must exist before code; version pins prevent later breakage.
**Delivers:** Astro empty template, `strictest` tsconfig, TS `~6.0.3`, Node pin; Tailwind v4 via `@tailwindcss/vite` with `@theme` tokens; ESLint, Prettier, Vitest, Playwright + axe; `astro check` in `pnpm lint`; `.gitignore` for `.dev.vars` / `.env`; perf budget; icon smoke test; `pnpm approve-builds`.
**Avoids:** legacy Tailwind integration, TS 7, Rust-compiler invalid-HTML surprises, secrets in git.

### Phase 2: Layout shell, i18n plumbing, motion gate
**Rationale:** i18n retrofit is the costliest change; an early gate + registry skeleton means every later script registers through it.
**Delivers:** `BaseLayout` (`html lang`, hreflang/x-default, canonical, SEO/OG, skip link, `data-motion` head script); header/footer; path-preserving EN/ES text switcher; typed dictionaries + key-parity test; EN/ES page wrappers; localized 404; `gate.ts` / `lifecycle.ts` skeletons; progressive-enhancement reveal CSS pattern.
**Avoids:** i18n routing errors, lifecycle bugs, reduced-motion as afterthought.

### Phase 3: Behance spike, consent, data layer
**Rationale:** Biggest unknown; drives filters, detail pages, images. Resolve count and challenge behavior early, behind the model, so UI is never blocked.
**Delivers:** Martina's written consent; project count confirmed (conflict 2); Project model, fixtures, loader, queries, tests; `sync-behance.ts` (challenge cookie replay, Zod, `sanitize-html`, fail-loud, polite pacing); committed snapshot; overrides collection (bilingual, alt text, category, featured/order); image build-time and repo-size measurements; fallback tests (offline build, simulated challenge).
**Note:** model + fixtures can land first to unblock Phases 4–5.

### Phase 4: Homepage static sections
**Rationale:** Mostly content; needs i18n and the project model.
**Delivers:** LCP-safe hero, accessible roles marquee, 4 services, tools grid, latest 3 projects, contact section placeholder; YAML content `{en,es}`; draft ES translations for Martina's review; `data-*` motion hooks (no animation yet).
**Avoids:** JS-gated LCP hero, marquee a11y violations, hover-only information.

### Phase 5: Projects list & detail pages
**Rationale:** Depends on real snapshot shape; module renderer is the highest-complexity table-stakes feature.
**Delivers:** grid and cards; `ModuleRenderer` with unknown-type fallback; detail routes in both locales via shared `getStaticPaths`; metadata header, next/prev, "View on Behance", `lang`-wrapped Behance text; cover-based OG; category chips + search with URL state and `aria-live` count if count/fields justify it (else defer to v1.x).
**Avoids:** filters on unverified data, raw `set:html`.

### Phase 6: Contact form (parallelizable with 4–5)
**Rationale:** Independent of Behance; first on-demand surface. Spike first.
**Delivers:** `@astrojs/cloudflare` 14 + `wrangler.jsonc`; spike confirming Actions under static output on workerd; `Mailer` interface with console provider (Resend provider written, exercised at deploy); honeypot + Turnstile test keys; localized aria-live states and focus management; `mailto:` fallback; `astro:env` secrets; `dist/` secret grep.
**Avoids:** Cloudflare runtime/secret pitfalls, spam, missing feedback.

### Phase 7: Motion layer
**Rationale:** Animating unstable markup causes rework; Phase 2 registry makes this additive.
**Delivers:** reveals and text splits; Lenis smooth scroll + parallax (anchor focus handling, `data-lenis-prevent`); custom cursor + magnetic buttons (pointer-fine only); image hover effects; page transitions with focus management; optional motion toggle; measured JS budget.
**Decision at phase start:** `<ClientRouter />` vs native view transitions (conflict 4).
**Avoids:** lifecycle leaks, smooth-scroll a11y breakage, reduced-motion gaps, touch/cursor artifacts.

### Phase 8: Hardening & verification
**Rationale:** "Measure, don't guess" (AGENTS.md).
**Delivers:** Lighthouse mobile vs budget (Home + heavy detail page); image weight and build-time measurements; keyboard and screen-reader pass; reduced-motion audit; axe per page and locale; hreflang and sitemap validation; offline build check; real-device and Safari checks; final "Looks Done But Isn't" checklist.

**Post-v1 (out of scope):** Workers deploy, domain, Resend or Email Routing at deploy; optional cron/deploy-hook refresh (no scheduled CI scraping without revisiting ToS).

### Phase Ordering Rationale
- i18n and the motion registry are cheap early, expensive late.
- Behance access resolved in Phase 3 behind the model, so UI phases are never blocked; real data can reshape the model before motion polish.
- Contact is independent and can overlap Phases 4–5.
- Motion after stable markup, but its gate/lifecycle skeleton first.
- Phase 3 holds consent and the count question, so Phase 5 filter scope is evidence-based.

### Research Flags
Needs `/gsd:plan-phase --research-phase`:
- **Phase 3 (Behance):** reconcile 7 vs 14; `hasMore` / pagination above ~12–24 projects (untested; likely needs GraphQL, which robots.txt disallows); unknown module types; challenge-replay robustness; build time and git size for ~150 images; consent/ToS wording.
- **Phase 6 (Contact):** Actions under static output with adapter + workerd dev (MEDIUM inference); Turnstile test-key values (unverified); Resend test-sender constraint vs her account.
- **Phase 7 (Motion):** ClientRouter vs native; Lenis/ScrollTrigger scroll-restoration interplay; Safari/Firefox cross-document transition support; bundle budget.

Standard patterns (skip research): Phase 1 (well-documented setup, versions verified), Phase 2 (documented Astro i18n helpers), Phase 4 (content composition), Phase 5 (renderer follows from model; filter is simple client code), Phase 8 (checklist audit).

## Confidence Assessment

| Area | Confidence | Notes |
|---|---|---|
| Stack | HIGH (Behance access MEDIUM) | Versions checked on npm today; throwaway Astro 7.4 build passed `astro check` with 0 errors on TS 6.0.3. Untested: Vitest 5 + Astro 7 `getViteConfig`; `imageService:'compile'` with adapter installed. |
| Features | MEDIUM | i18n/SEO and WCAG guidance HIGH; "what clients expect" is opinion/pattern (LOW–MEDIUM); Behance metadata now verified by STACK. |
| Architecture | MEDIUM-HIGH | Platform facts documented; folder layout and motion lifecycle proposed. Two inferences need a spike: Actions under static output; ClientRouter swapping `<html>` attributes. |
| Pitfalls | MEDIUM-HIGH | Live probes HIGH for today, but Astro-6 framing and "detail pages blocked" conclusion superseded. ToS text, Chrome LCP opacity rule, Firefox cross-document support unverified there (STACK verified ToS text and GSAP license separately). |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address
- **Project count (7 vs 14):** count live, compare RSS and `hasMore` — Phase 3.
- **Scraping consent and ToS:** explicit consent from Martina before building the scraper; document it.
- **Pagination past one profile page:** untested; new investigation if count grows with `hasMore:true`.
- **Challenge replay durability:** may harden anytime; keep Playwright/manual fallbacks; snapshot keeps the site building.
- **Questions for Martina:** testimonials or client logos? ES showing Behance text in English (recommended v1)? availability badge? custom domain (affects email and `site`)? brand fonts (Astro Fonts API is stable and fits)?
- **Unknown module types / animated GIFs:** confirm against all her projects.
- **Page transition router:** open until Phase 7.
- **Cross-document transition browser support:** LOW confidence.
- **Perf budget numbers:** proposed, not measured.
- **Node:** local 24.15 below 24.16 minimum.
- **CI image cache:** Astro cache lives in `node_modules/.astro`; CI without it re-downloads every Behance image — measure.

## Sources

**Primary (HIGH):**
- STACK direct tests (2026-10-15): Node 24 `fetch` and curl against Behance profile, RSS, `/gallery` ×7, `/embed`, `api.behance.net/v2`, image CDN, `robots.txt`; throwaway Astro 7.4.0 + Tailwind 4.3.3 build; esbuild bundle sizes; `npm view` for versions/peers.
- Astro docs: upgrade v6/v7, on-demand rendering, Cloudflare adapter, content loader, actions, view transitions, i18n, images, testing.
- Tailwind Astro guide; GSAP standard license; Lenis README (v1.3.27).
- Cloudflare docs: Turnstile, Workers Builds deploy hooks, Email Routing/Service.
- Google Search Central multilingual guidance; W3C WCAG 2.3.3.
- Adobe legal terms (§4.2, §6.6, §6.18); Resend pricing and test-domain KB.

**Secondary (MEDIUM):** Behance Help Center; Hidde de Vries on WCAG 2.2.2; SimpleLocalize; GSAP forum (ScrollSmoother + Astro); Tailwind issue #15952; PITFALLS live probes where they corroborate STACK.

**Tertiary (LOW):** Adobe community threads on Behance API (2021–2024); Apify scraper schema; portfolio-advice blogs; cross-document transition support; Chrome LCP opacity rule; Cloudflare Email Service beta status.

---
*Research completed: 2026-10-15*
*Ready for roadmap: yes*
