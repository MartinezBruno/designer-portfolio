# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Potential clients deciding whether to hire Martina Fernandez, weighted equally between:

- **Direct clients:** small businesses and brands looking for a designer.
- **Agencies and studios:** teams hiring her as a freelancer or for a role.

Both groups arrive in English or Spanish. They want to judge her taste quickly, browse real work, and get in touch.

## Product Purpose

A bilingual (EN default, ES via `/es/`) portfolio for Martina Fernandez, a graphic designer. It shows who she is, the services she offers, the tools she uses and her real Behance work. Success means a visitor feels her design sensibility straight away, browses her projects, and contacts her through the form.

## Positioning

End-to-end range. One designer covers brand identity, web design, social media and graphic or print work, so a client's identity stays consistent across every touchpoint. Her service list (`src/data/services.json`) and roles marquee (`src/data/roles.json`) are evidence of this breadth.

## Operating Context

- Projects come from her Behance profile (martifernand7) through `pnpm sync:behance`. The sync writes a committed snapshot (`src/data/behance/`), and local bilingual overrides (`src/data/project-overrides.json`) sit on top of it. The site never fetches from Behance at runtime.
- Site sections: Home (hero, roles marquee, 4 services, tools, latest 3 projects, contact), a Projects index (newest first), and project detail pages that mirror the Behance content.
- Contact goes through an Astro Action with a honeypot and Cloudflare Turnstile, sends via Resend (console mailer locally), and falls back to `mailto:` when JavaScript is off.

## Capabilities and Constraints

- Astro 7 + TypeScript strictest + Tailwind 4 (`@tailwindcss/vite`), pnpm, targeting Cloudflare Workers.
- i18n uses URL prefixes with typed dictionaries (`src/i18n/ui.en.ts`, `ui.es.ts`). English is the source; the Spanish is drafted by us for her review.
- Icons are Tabler raw SVGs imported per file. Barrel imports are not allowed.
- Motion: GSAP (lazy-loaded) plus Lenis and ClientRouter. A three-state motion gate with a header toggle exists. Reduced motion must degrade gracefully.
- Performance is measured, not guessed. Eager JS stays minimal and anything that can be deferred is lazy-loaded.
- Add dependencies only when they are needed. Quality gates: `astro check`, ESLint, Vitest and Playwright with axe must pass.
- Project cards and detail pages show no project date (user decision).
- Search and filters are deferred until the catalog reaches 8 or more projects. It currently has 7.

## Brand Commitments

- Accent colour is client blue **#0F70B7** (binding).
- Her portrait (`src/assets/hero/portrait.png`) stays in the hero (binding).
- Standing visual preference (user choice, 2026-11-04 redesign round): the category standard, a clean designer portfolio built with full craft. The quality bar is Awwwards Site-of-the-Day personal portfolios. Two re-rolled concept hands were declined in favour of this.
- Copy is not word-for-word binding, but factual claims (services, roles, tools) must not change without asking.

## Evidence on Hand

- 7 real Behance projects with images, tags and tools (`src/data/behance/`, `src/assets/projects/`).
- Services, roles and tools data in `src/data/`, plus her portrait.
- There are no testimonials, client logos, metrics or press. Do not invent any.

## Product Principles

1. The work leads. Her projects are the proof, and the interface stays out of their way.
2. Show range as one coherent practice, not a scattered list of services.
3. English and Spanish are equal. Neither reads as a translation.
4. Motion should feel like a designer's hand but must never be required. The full experience works with reduced motion.
5. Every claim on the site is backed by real content.

## Accessibility & Inclusion

Accessibility is non-negotiable. Target WCAG 2.2 AA: axe checks on every page and locale, a full experience with reduced motion, a live motion toggle in the header, and keyboard-operable cursor and magnetic effects.
