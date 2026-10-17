# Roadmap: Designer Portfolio — Martina Fernandez

## Overview

This roadmap uses vertical MVP slices. Phase 1 ships a working bilingual walking skeleton: a real Astro site in English and Spanish with a hero, the quality gates, and the motion gate and lifecycle registry already in place. Each later phase adds one visible capability: homepage sections, her real Behance work, project detail pages and discovery, a working contact form, then two motion layers. The last phase measures performance and accessibility and finishes the Spanish copy for Martina's review. v1 "done" = working local build. Cloudflare deploy comes after v1.

> All phase content is **[Proposed]** until built and verified. Ordering follows research/SUMMARY.md dependencies, rearranged into vertical slices.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Bilingual Walking Skeleton** - Astro site with quality gates, EN/ES routing, shared layout, hero, 404, plus motion gate and lifecycle registry (completed 2026-10-16)
- [x] **Phase 2: Homepage Story** - Roles marquee, 4 featured services, tools, and availability badge, in both languages (completed 2026-10-17)
- [ ] **Phase 3: Real Behance Work** - Consent, a typed project model, a fail-loud snapshot sync, latest 3 on Home, and the Projects list page
- [ ] **Phase 4: Project Detail & Discovery** - Mirrored detail pages with metadata and navigation, plus conditional filter/search
- [ ] **Phase 5: Contact** - Working spam-protected contact form (logging mailer in v1), service pre-selection, and a mailto fallback
- [ ] **Phase 6: Scroll & Interaction Motion** - Reveals, text splits, cursor/magnetic buttons, card hover effects, reduced-motion support, and a motion toggle
- [ ] **Phase 7: Page Transitions & Smooth Scroll** - Animated navigation with focus management, inertial scroll and parallax, no lifecycle leaks
- [ ] **Phase 8: Quality Verification** - Measured performance budget, full axe/keyboard pass in both languages, and Spanish copy ready for review

## Phase Details

### Phase 1: Bilingual Walking Skeleton

**Goal**: A visitor can open a real, accessible site in English at `/` or Spanish at `/es/`, switch languages, and see Martina's hero immediately. The developer has every quality gate working, plus the motion gate and lifecycle registry that later motion code will use.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: FND-01, FND-02, FND-03, FND-04, I18N-01, I18N-02, I18N-03, I18N-04, I18N-05, I18N-06, I18N-07, HOME-01
**Success Criteria** (what must be TRUE):

  1. Developer runs `pnpm dev`, `pnpm build`, `pnpm lint` (incl. `astro check`), `pnpm test` and a Playwright + axe e2e run, and all pass with zero errors. The secrets check finds no `.env`/`.dev.vars` content in git or `dist/`.
  2. Visitor sees the home hero (greeting, title, description, image) at `/` in English and at `/es/` in Spanish, rendered without JavaScript. The page has a shared header/nav, a footer with email and socials, a working skip-to-content link, and at least one Tabler icon rendered as inline SVG with no client JS.
  3. Visitor clicks the "EN / ES" toggle and lands on the same page in the other language. Changing the browser language never redirects them.
  4. Page source shows the correct `html lang`, canonical, and hreflang (en, es, x-default) tags plus localized title/description/OG. A deliberately missing Spanish UI key fails type-check or tests.
  5. Visitor who requests a nonexistent URL sees a localized 404 with a link home. With `prefers-reduced-motion` or JS disabled, `html[data-motion]` resolves to "off" and all content stays visible. The motion gate and lifecycle registry exist and are covered by unit tests.

**Plans**: 5 plans
Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Walking skeleton: package approval checkpoint, Astro scaffold, all quality gates, EN `/` + ES `/es/` pages

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Language switching: typed EN/ES dictionaries, EN / ES toggle, header, skip link, no auto-redirect

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-03-PLAN.md — Hero + footer: no-JS hero with portrait, footer with email/socials, Tabler inline icons, self-hosted fonts

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 01-04-PLAN.md — SEO head (canonical, hreflang, OG) and localized bilingual 404 pages

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 01-05-PLAN.md — Motion gate + lifecycle registry wired into the layout, full axe/keyboard sweep

**UI hint**: yes

### Phase 2: Homepage Story

**Goal**: A visitor on the homepage, in either language, understands what Martina does: her roles, her 4 featured services, the tools she uses, and whether she is available.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: HOME-02, HOME-03, HOME-04, HOME-05, HOME-07
**Success Criteria** (what must be TRUE):

  1. Visitor sees a marquee of all her roles that pauses on hover/focus or via a control. Under reduced motion it is static, and a screen reader announces each role once (clones are `aria-hidden`).
  2. Visitor sees exactly 4 featured services and a grid of the apps/tools she uses, in English at `/` and Spanish at `/es/`, sourced from localized content files.
  3. Visitor sees an "available for projects" badge. Changing one content value shows or hides the badge after a rebuild, with no code change (amended by 02-CONTEXT D-08).
  4. The homepage still passes axe checks and keyboard navigation with the new sections in both languages.

**Plans**: 8 plans
Plans:
**Wave 1**

- [x] 02-01-PLAN.md — Content layer: localized roles/services/tools/profile JSON collections, astro/zod schemas, pure query layer with count guards
- [x] 02-02-PLAN.md — Tokens and copy: accent swap to #0F70B7, motion-on variant, marquee keyframes, success token, five new EN/ES dictionary keys

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-03-PLAN.md — Availability badge in the hero, driven by profile.json (HOME-07)
- [x] 02-04-PLAN.md — Roles marquee on the blue band with aria-pressed pause toggle (HOME-02, HOME-03)
- [x] 02-05-PLAN.md — Featured services: 4 non-interactive cards with bullet lists (HOME-04)
- [x] 02-06-PLAN.md — Tools row: icon-only focusable tiles with WCAG 1.4.13 tooltips (HOME-05)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 02-07-PLAN.md — Compose HomeView, homepage-story e2e in EN/ES, generalized keyboard-order test

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 02-08-PLAN.md — Reduced-motion/tooltip axe, 320px and track-fill layout checks, pnpm verify, human visual check

**UI hint**: yes

### Phase 3: Real Behance Work

**Goal**: A visitor sees Martina's real Behance projects: the 3 latest on the homepage and all of them on a Projects page in both languages. The site builds from a committed snapshot that never depends on Behance being reachable.
**Mode:** mvp
**Depends on**: Phase 1 (Phase 2 for placing the latest-projects section on Home)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, HOME-06, PROJ-01
**Success Criteria** (what must be TRUE):

  1. Martina's explicit consent to pulling her Behance content is documented in the repo before any sync script code exists. The real project count (7 vs 14 conflict) is confirmed and recorded, which settles whether PROJ-04..07 apply.
  2. Developer runs `pnpm sync:behance` and gets a committed snapshot with all projects and locally optimized images. A simulated challenge page, empty response, or partial response makes the sync fail loudly and leaves the previous good snapshot untouched.
  3. `pnpm build` succeeds with the network disabled, reading only the snapshot.
  4. Visitor sees the 3 latest projects on the homepage, sorted by publish date and linking to their detail-page URLs, and a Projects page listing all projects newest first at `/projects` and `/es/projects` (exact slugs to be decided in planning).
  5. Developer can hide, reorder, feature, recategorize, or add alt text to a project through local overrides, and the change shows up on the site. UI components read only the source-agnostic typed model, never the Behance adapter.

**Plans:** 10/10 plans executed (phase verification pending)

Plans:
**Wave 1**

- [x] 03-01-PLAN.md — Typed project model, slug rule, snapshot schema, seed snapshot and fail-loud read path (fixtures first)
- [x] 03-06-PLAN.md — Consent note (own commit, ancestry-gated) and tested sync building blocks (parse, challenge fetch, covers)
- [x] 03-07-PLAN.md — `pnpm build:offline` network-blocked build proof

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 03-02-PLAN.md — Projects page (EN/ES) from the seed snapshot: card view, getAllProjects, DATA-06 lint boundary

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 03-03-PLAN.md — Asymmetric fixed-rhythm grid and compact/full ProjectCard, taste gate
- [x] 03-04-PLAN.md — Local overrides (hide/order/feature/category/alt/titles) and Home selection rule

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 03-05-PLAN.md — Home "Latest work" section, Projects nav link, two-row mobile header, keyboard order
- [x] 03-08-PLAN.md — `runSync` gates, atomic commit protocol, `pnpm sync:behance` CLI

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 03-09-PLAN.md — Live sync run (user go-ahead checkpoint) with measurements, curated overrides, real-imagery taste gate

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 03-10-PLAN.md — Phase gate and user review (checkpoint)

**UI hint**: yes
**Research flag**: Needs `/gsd:plan-phase --research-phase`. Topics: reconcile 7 vs 14 projects, `hasMore`/pagination, unknown module types, how durable the challenge replay is, build time and git size for about 150 images, consent wording. Plan the typed model and fixtures first so UI work is not blocked by the scraper.

### Phase 4: Project Detail & Discovery

**Goal**: A visitor can open any project and see its full Behance content styled inside the site, with context and navigation. If the catalog is big enough, they can also narrow the Projects list by category, tool, year, or text.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: PROJ-02, PROJ-03, PROJ-04, PROJ-05, PROJ-06, PROJ-07
**Success Criteria** (what must be TRUE):

  1. Visitor opens a project detail page in either locale and sees its images, text, grids, and embeds mirrored from Behance in the original language (wrapped in the correct `lang`). Unknown module types render a safe fallback instead of breaking the page.
  2. Each detail page shows tools and category (no project date: decided by the user 2026-10-17), a "View on Behance" link, next/previous project links, and a contact CTA.
  3. *(If ≥8 projects)* Visitor filters by category chips, tool, and year, and runs an accent-insensitive text search (e.g. "diseno" matches "diseño"). Reloading the URL restores the same filters, screen readers hear the result count, and an empty result offers "clear filters".
  4. *(If <8 projects)* PROJ-04..07 are recorded as not applicable, with the confirmed count from Phase 3 as evidence, and the Projects page has no filter UI.

**Plans**: TBD
**UI hint**: yes

### Phase 5: Contact

**Goal**: A potential client can send Martina a message in either language, including straight from a service card. Spam is blocked, there is clear feedback, and a no-JS fallback exists.
**Mode:** mvp
**Depends on**: Phase 2 (service cards for pre-selection). Can run in parallel with Phases 3–4.
**Requirements**: CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, HOME-08
**Success Criteria** (what must be TRUE):

  1. Visitor submits name, email, message, and service. Invalid input shows localized validation messages in EN or ES.
  2. A valid submission produces a localized success message announced to screen readers, and the local v1 build logs the message through the console mailer provider (Resend provider implemented behind the same interface). On failure, the visitor sees a localized error and their typed text is still there.
  3. A submission with the honeypot filled or a failing Turnstile token is rejected by server-side verification.
  4. Visitor clicks a service card and lands on the contact form with that service pre-selected. With JavaScript disabled, a `mailto:` link is still available.

**Plans**: TBD
**UI hint**: yes
**Research flag**: Needs `/gsd:plan-phase --research-phase`. Topics: Astro Actions under static output with `@astrojs/cloudflare` 14 on workerd dev, Turnstile test-key values, Resend test-sender constraint.

### Phase 6: Scroll & Interaction Motion

**Goal**: A visitor feels Martina's design sensibility through scroll reveals, headline text animations, a playful cursor, magnetic buttons, and image hover effects. Anyone who prefers less motion gets a calm, fully usable site.
**Mode:** mvp
**Depends on**: Phase 2, Phase 4 (stable section and card markup)
**Requirements**: MOTN-01, MOTN-02, MOTN-03, MOTN-04, MOTN-07, MOTN-08
**Success Criteria** (what must be TRUE):

  1. Visitor scrolling Home, Projects, and detail pages sees sections and headlines animate in (reveals and text splits). With JavaScript disabled or failing, all content is still visible.
  2. Visitor on a fine-pointer desktop gets a custom cursor and magnetic buttons. On touch devices the native cursor and behavior stay unchanged.
  3. Visitor hovering or focusing a project card sees a playful image effect, and no information exists only on hover.
  4. With `prefers-reduced-motion`, all non-essential motion is disabled or replaced with simple fades. Visitor can also switch animations off with an on-page toggle, and that works without changing OS settings.
  5. All effects register through the Phase 1 lifecycle registry, and the homepage JS bundle size is measured and recorded.

**Plans**: TBD
**UI hint**: yes

### Phase 7: Page Transitions & Smooth Scroll

**Goal**: Moving through the site feels fluid: animated page transitions, inertial scrolling, and parallax. Keyboard users, screen-reader users, and find-in-page all keep working, and animations never leak between pages.
**Mode:** mvp
**Depends on**: Phase 6
**Requirements**: MOTN-05, MOTN-06, MOTN-09
**Success Criteria** (what must be TRUE):

  1. Visitor navigating between pages sees an animated transition. After each navigation, focus moves to the new page and the document title updates.
  2. Visitor gets smooth/inertial scrolling with parallax images, and keyboard scrolling, anchor links (which move focus), and browser find-in-page still work.
  3. An automated test that navigates 10 times shows constant listener and ScrollTrigger counts, with no duplicated animations.
  4. Reduced motion and the Phase 6 toggle also disable transitions, smooth scroll, and parallax.

**Plans**: TBD
**UI hint**: yes
**Research flag**: Needs `/gsd:plan-phase --research-phase`. Open decision: `<ClientRouter />` vs native cross-document view transitions. Also research how Lenis/ScrollTrigger interact with scroll restoration, Safari/Firefox support, and the bundle budget.

### Phase 8: Quality Verification

**Goal**: The finished v1 local build is shown, by measurement, to be fast, accessible in both languages, and ready for Martina to review the Spanish copy.
**Mode:** mvp
**Depends on**: Phases 1–7
**Requirements**: QUAL-01, QUAL-02, QUAL-03
**Success Criteria** (what must be TRUE):

  1. Mobile Lighthouse results for Home and a heavy project detail page are recorded against the budget (proposed: LCP < 2.5 s, CLS < 0.1, homepage JS ≈ 100 KB gz). The final numbers come from measurement, and any regressions are fixed or documented.
  2. Every page passes axe checks in both EN and ES and can be fully used by keyboard alone, including the form, filters (if present), toggles, and navigation.
  3. Every piece of site copy has a Spanish draft marked for Martina's review, and a reviewer can find the full list of strings to review in one place.

**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. Phase 5 (Contact) depends only on Phase 2, so it can run in parallel with Phases 3–4.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Bilingual Walking Skeleton | 5/5 | Complete   | 2026-10-16 |
| 2. Homepage Story | 8/8 | Complete   | 2026-10-17 |
| 3. Real Behance Work | 10/10 | Verifying  |  |
| 4. Project Detail & Discovery | 0/TBD | Not started | - |
| 5. Contact | 0/TBD | Not started | - |
| 6. Scroll & Interaction Motion | 0/TBD | Not started | - |
| 7. Page Transitions & Smooth Scroll | 0/TBD | Not started | - |
| 8. Quality Verification | 0/TBD | Not started | - |
