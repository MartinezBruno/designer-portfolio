# Designer Portfolio — Martina Fernandez

## What This Is

A highly visual, motion-rich portfolio website for Martina Fernandez, a graphic designer (web design, social media management, and related services). Built with Astro, bilingual (English default, Spanish via toggle), it presents who she is, what she offers, the tools she uses, and her work — with projects sourced from her Behance profile.

## Core Value

Visitors (potential clients) immediately feel her design sensibility through a striking, animated experience and can browse her real Behance work and contact her — in English or Spanish.

## Requirements

### Validated

- [x] Hero with greeting, professional title, description and an image — Validated in Phase 1: Bilingual Walking Skeleton
- [x] Language toggle EN/ES with URL-prefix routing (`/` = English default, `/es/...` = Spanish) — Validated in Phase 1: Bilingual Walking Skeleton
- [x] Marquee listing all the jobs/roles she does (web design, social media manager, etc.) — Validated in Phase 2: Homepage Story
- [x] Section with her 4 most featured services — Validated in Phase 2: Homepage Story
- [x] Section showing the apps/tools she uses — Validated in Phase 2: Homepage Story
- [x] Availability badge driven by content (HOME-07) — Validated in Phase 2: Homepage Story
- [x] Jobs/Projects section on Home with her 3 latest Behance projects (HOME-06), shown as an even row — Validated in Phase 3: Real Behance Work
- [x] Projects page listing all her Behance projects, newest first, EN/ES (PROJ-01) — Validated in Phase 3: Real Behance Work
- [x] Consent documented, `pnpm sync:behance` committed snapshot, fail-loud sync, offline build, local overrides, source-agnostic model (DATA-01..06) — Validated in Phase 3: Real Behance Work
- [x] Project detail pages mirror the Behance content (image stack, collections, sanitized text, click-to-load Figma embed) with tools/category, "View on Behance", next/previous and a contact CTA, EN/ES, with localized share previews (PROJ-02, PROJ-03) — Validated in Phase 4: Project Detail & Discovery
- [x] Contact section on Home with a working, spam-protected form (honeypot + Turnstile siteverify), localized validation and feedback, typed text kept on failure, "Ask about this" service pre-selection from cards, and a no-JS `mailto:` fallback, EN/ES (CONT-01..05, HOME-08). The local v1 build logs the email through the console mailer, and the Resend provider is ready for deploy — Validated in Phase 5: Contact
- [x] Motion layer: scroll reveals, masked headline line rises, hero load sequence, playful cursor with "View" pill, magnetic buttons, image hover mat/zoom; reduced motion falls back to fades and an on-page header toggle switches motion live and persists (MOTN-01..04, 07, 08). GSAP is lazy-loaded only; eager homepage JS 14,643 B gzip (+6,107 B over the Phase 5 baseline) — Validated in Phase 6: Scroll & Interaction Motion
- [x] Motion: page transitions, smooth/inertial scroll with parallax — `<ClientRouter />` soft navigation with an ink wipe, card-title morph and focus/title handoff, Lenis inertial scroll, CSS scroll-driven card parallax, collection-cell drift and detail-stack side entrances; a 10-navigation leak test keeps listener and animation counts constant; the contact form loads on demand with its height reserved so Home never jumps (MOTN-05, MOTN-06, MOTN-09). Eager homepage JS 17,918 B gzip under the 22,000 B ceiling — Validated in Phase 7: Page Transitions & Smooth Scroll
- [x] Respects `prefers-reduced-motion` and remains accessible for transitions and smooth scroll — reduced motion crossfades pages and the header toggle disables transitions, smooth scroll and parallax; keyboard scrolling, anchor links (which move focus), Back during a glide and find-in-page keep working; manual UAT approved at 07-17 (Safari 26, Firefox 159, VoiceOver) — Validated in Phase 7: Page Transitions & Smooth Scroll

### Active

**Jobs/Projects page**
- [ ] Search + filtering ("a plus") — N/A while the catalog has fewer than 8 projects (Phase 4, D-16; currently 7). Revisit when `pnpm sync:behance` reports ≥8 (`NOTICE_AT`); dimensions would be category and tool (year dropped, D-17)

### Out of Scope

- Deployment to production / custom domain for v1 — v1 "done" = working local build (hosting target is Cloudflare, deployment comes later)
- CMS / admin panel — content is provided upfront; projects come from Behance
- Pixel-perfect Figma implementation — Figma is a reference only; final design is ours

## Context

- **Client:** Martina Fernandez, graphic designer. Behance: https://www.behance.net/martifernand7
- **Design reference:** Figma (reference only, final design fully up to us): https://www.figma.com/design/rj2KJq1kc8GTEWPs9lg9KR/my-own-webpage?node-id=9-95&t=bhsgizZcN52K5r6j-1
- **Content:** Her copy and assets (bio, services, app list, photo) are ready. English is the source; Spanish translations will be drafted by us for her review.
- **Behance data source is the key unknown.** [Unverified] Behance stopped issuing new public API keys around 2019–2020. The user chose "research first" — research must determine a feasible way to get (a) project list, (b) latest 3, and (c) full project content (images + text, for mirrored detail pages), plus what metadata exists for filtering (categories/fields, tools, tags). Options to evaluate: official API, RSS feed, build-time scraping, hybrid with local content.
- **Search/filter scope** is deferred until the available Behance metadata is known.

## Constraints

- **Tech stack**: Astro + TypeScript (strict) + Tailwind CSS (official Astro integration) — user's global conventions (AGENTS.md)
- **Package manager**: pnpm for everything
- **Icons**: Tabler icons, explicit imports, never barrels
- **Hosting target**: Cloudflare Workers (adapter dropped Pages support) — affects contact form backend and any server-side/build-time Behance fetching
- **i18n**: URL-prefix routing via Astro i18n, English default
- **Accessibility**: Non-negotiable — heavy motion must degrade gracefully with reduced-motion
- **Performance**: Measure, don't guess (bundle size, load times) — important given heavy motion + image-heavy content
- **Dependencies**: Don't add until needed
- **Quality gates**: No type errors, lint errors, or failing tests; add tests when behavior changes
- **Design (taste skill required)**: Every design or visual change (new sections, layout, typography, colour, imagery, motion, UI-SPEC work) must use the `taste-skill:taste-skill` skill: apply its house rules and laws, run its `lint.mjs` and `inspect.mjs` on the result, and review its screenshots before the work counts as done. Decided by the user 2026-10-16.
- **Commits during GSD workflows (pre-approved)**: Overrides the global "confirm every commit message" rule for this project. Commits made by GSD workflows (executors, fixers, orchestrator tracking/docs commits) are pre-approved and need no per-commit confirmation, provided they use Conventional Commits (lowercase, imperative, <50 chars, scope = plan/phase id) and contain no Claude/co-author attribution. The user reviews the phase's commit list once at phase end, and `/security-review` runs once per phase before the phase is marked complete. Ad-hoc commits outside a GSD workflow still need confirmation. Decided by the user 2026-10-16.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Astro as framework | User request + global convention | ✓ Good — Astro 7.4 skeleton shipped in Phase 1 |
| Behance data approach decided after research | API availability uncertain | ✓ Good — committed snapshot via `pnpm sync:behance` (cookie-replay scrape) + local overrides; first live sync 2026-10-17 (Phase 3) |
| Detail page mirrors Behance content | User preference — single source of truth on Behance | — Pending |
| Working contact form (emails her) | User preference | — Pending |
| URL-prefix i18n (`/`, `/es/`) | SEO-friendly, shareable | ✓ Good — live in Phase 1 with hreflang/canonical |
| We draft Spanish translations | User preference; she reviews | — Pending |
| Figma as reference only | Final design fully up to us | — Pending |
| v1 done = local build | User definition; Cloudflare deploy later | — Pending |
| Accent switched to client blue #0F70B7 | Matches her mockup (Phase 2, D-15) | ✓ Good — shipped Phase 2 |
| Marquee pause via invisible full-band control | User chose no visible button at 02-08 checkpoint | ⚠ Revisit — review WR-01/02 |
| Taste skill required for all design work | User decision 2026-10-16 | — Pending (first full pass still to do) |
| Project cards and detail pages show no project date | User decision 2026-10-17 (Phase 3) | ✓ Good — cards shipped without date; Phase 4 SC2/PROJ-03 amended |
| Home latest work as an even 3-tile row | User decision 2026-10-17 (fixed count of 3) | ✓ Good — shipped Phase 3 |
| `<ClientRouter />` for page transitions (not native cross-document view transitions) | Persisted cursor and Lenis root, scripted focus handoff and the title morph need same-document swaps | ✓ Good — shipped Phase 7 with cleanup on `astro:before-swap` and a 10-navigation leak test |
| Eager JS ceiling 22,000 B gzip; every non-critical chunk loads on demand | User directive "defer anything that can be deferred" (Phase 7, 07-15) | ✓ Good — 17,918 B at Phase 7 close, enforced by `scripts/measure-bundle.ts` on every built page |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-11-05 after Phase 7 (Page Transitions & Smooth Scroll): ClientRouter soft navigation with ink wipe, title morph and focus handoff; Lenis inertial scroll; CSS scroll-driven parallax and stack entrances; lazy contact form with height reserve; eager JS 17,918 B gzip under the 22,000 B ceiling; gap closure 07-18..07-21 re-verified 4/4 truths; human UAT approved at 07-17; gap-closure code review 0 critical / 2 warning / 4 info left advisory in 07-REVIEW.md; security review clean*
