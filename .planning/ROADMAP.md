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
- [x] **Phase 3: Real Behance Work** - Consent, a typed project model, a fail-loud snapshot sync, latest 3 on Home, and the Projects list page (completed 2026-10-17)
- [x] **Phase 4: Project Detail & Discovery** - Mirrored detail pages with metadata and navigation, plus conditional filter/search (completed 2026-10-19)
- [x] **Phase 5: Contact** - Working spam-protected contact form (logging mailer in v1), service pre-selection, and a mailto fallback (completed 2026-10-29)
- [x] **Phase 6: Scroll & Interaction Motion** - Reveals, text splits, cursor/magnetic buttons, card hover effects, reduced-motion support, and a motion toggle (completed 2026-11-02)
- [x] **Phase 7: Page Transitions & Smooth Scroll** - Animated navigation with focus management, inertial scroll and parallax, no lifecycle leaks (completed 2026-11-05)
- [x] **Phase 8: Quality Verification** - Measured performance budget, full axe/keyboard pass in both languages, and Spanish copy ready for review (completed 2026-11-10)
- [ ] **Phase 9: Portfolio Features** - Hero full width on mobile, photography service, and filtering projects by service category

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

**Plans**: 10 plans

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
  3. *(If ≥8 projects)* Visitor filters by category chips and tool (no year filter, D-17), and runs an accent-insensitive text search (e.g. "diseno" matches "diseño"). Reloading the URL restores the same filters, screen readers hear the result count, and an empty result offers "clear filters".
  4. *(If <8 projects)* PROJ-04..07 are recorded as not applicable, with the confirmed count from Phase 3 as evidence, and the Projects page has no filter UI.

**Plans**: 12 plans
Plans:
**Wave 1**

- [x] 04-01-PLAN.md — Detail page slice: EN/ES routes, query layer, intro band (title, summary, category, tools, View on Behance)
- [x] 04-02-PLAN.md — Record PROJ-04..07 N/A with evidence, amend PROJ-06 (tool only), no-filter regression e2e
- [x] 04-03-PLAN.md — Package approval checkpoint, TextModule sanitizer, embed allowlist, module content normalizer

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 04-04-PLAN.md — Contact band, next/previous teaser with wrap, D-09 link skips removed, axe/line/overflow checks
- [x] 04-05-PLAN.md — Per-page SEO with og:image from the cover
- [x] 04-06-PLAN.md — Module image variant-chain download, WebP storage, modules-dir commit and GC

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 04-07-PLAN.md — Wire content + module images into sync:behance, image reuse, moduleAlt overrides and checklist

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 04-08-PLAN.md — Live re-sync checkpoint, lock required content, committed-snapshot invariants, measurements

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 04-09-PLAN.md — Render image stack, collection rows, sanitized text and unknown fallback on detail pages

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 04-10-PLAN.md — Click-to-load Figma embed facade, privacy/keyboard/axe e2e

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 04-11-PLAN.md — Phase gate: pnpm verify, measurements, full taste gate, user sign-off

**Wave 8** *(gap closure, blocked on Wave 7 completion)*

- [x] 04-12-PLAN.md — Gap: WebP Picture fallback instead of PNG (205 MB of dist), measured before/after
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

**Plans**: 8 plans
Plans:
**Wave 1**

- [x] 05-01-PLAN.md — Package gate, Cloudflare adapter + env schema, Vitest stub, secrets gate, deterministic e2e preview env

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 05-02-PLAN.md — Home Contact section with no-JS mailto, all Phase 5 copy, Contact links to /#contact everywhere
- [x] 05-03-PLAN.md — Mailer port (console + Resend) and Spanish plain-text email builder (TDD)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 05-04-PLAN.md — contact Action: zod schema, honeypot, Turnstile siteverify, server accept/reject e2e

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 05-05-PLAN.md — JS form with chips and Turnstile, sending state, success panel, keyboard order + axe

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 05-06-PLAN.md — Localized validation (client mirror + server errors), failure block with prefilled mailto

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 05-07-PLAN.md — Service card "Ask about this" links and ?service= pre-selection

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 05-08-PLAN.md — Phase gate: pnpm verify, state screenshots, taste gate, measurements, user sign-off
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

**Plans**: 10 plans
Plans:
**Wave 1**

- [x] 06-01-PLAN.md — Three-state motion gate (on/reduced/off), stored override, motion:change bus, header motion toggle (EN/ES)
- [x] 06-02-PLAN.md — gsap@3.15.0 approval checkpoint, lazy memoised loader, homepage bundle measurement + Phase 5 baseline

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 06-03-PLAN.md — Reveal runtime (IntersectionObserver, CSS failsafe, reduced fades) + Home section and project card reveals

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 06-04-PLAN.md — Projects page and detail page reveals (D-04 amends Phase 4 D-04), static image stack
- [x] 06-05-PLAN.md — CSS hero load sequence with no-replay marker and LCP measurement

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 06-06-PLAN.md — Shared project imagery hover/focus mat + zoom (CSS only), data-cursor markers
- [x] 06-07-PLAN.md — Magnetic pill CTAs, named links and social icons (shell/face split, gsap quickTo)

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 06-08-PLAN.md — Masked line-split headings with SplitText (aria, lang, revert, failure safety)
- [x] 06-09-PLAN.md — Cursor follower with localized View pill (fine pointer + full motion only)

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 06-10-PLAN.md — Phase gate: axe across motion states, final bundle numbers, full taste gate, user review

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

**Plans**: 21 plans (10 + 11 gap closure)
Plans:
**Wave 1**

- [x] 07-01-PLAN.md — ClientRouter soft navigation: motion-state carry, toggle sync, off full loads, focus to new h1, title/SEO after EN/ES

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 07-02-PLAN.md — Ink panel wipe, still header, reduced crossfade (VT CSS + tokens), wipe captures reviewed with taste skill
- [x] 07-03-PLAN.md — Persistent app-scope cursor with locale label resync + 10-navigation CDP leak test (SC3)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 07-04-PLAN.md — Arrival choreography: release gate (70%/finished/1200 ms), entrances and focus after the wipe, back/forward restore, live-toggle skip, flash limit
- [x] 07-05-PLAN.md — lenis@1.3.27 approval checkpoint, lazy page-scoped smooth wheel scroll (fine pointer + on), keyboard/find/touch e2e

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 07-06-PLAN.md — Card title -> detail h1 morph (click-time naming, invert/difference blend), morph captures reviewed
- [x] 07-07-PLAN.md — Anchors glide/jump with focus, instant skip link, Ask-about-this without page swap

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 07-08-PLAN.md — CSS scroll-driven parallax on card covers and Next-project teaser (overflow-clip frames, D-13 coexistence)

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 07-09-PLAN.md — Detail image-stack parallax with overrides opt-out and taste seam review (InstaBlogs, Cabrera's)

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 07-10-PLAN.md — Phase gate: bundle guard (Lenis marker, 22 KB eager ceiling), full verify, full taste gate, Safari/Firefox/VoiceOver UAT, user sign-off

**Gap closure — Wave 1**

- [x] 07-11-PLAN.md — nav-focus: CR-01 hash-only replaceState + e2e, WR-01 navToken, WR-02 cancel on popstate/before-preparation, WR-03 focus fallback
- [x] 07-12-PLAN.md — measure:bundle checks every built page (WR-04)
- [x] 07-13-PLAN.md — --t-wipe 480 ms, plain-ink non-ghosting morph, IN-01 h1 unwrap, taste review

**Gap closure — Wave 2** *(blocked on Wave 1 completion)*

- [x] 07-14-PLAN.md — CollectionModule grid drift (row unison, seamless, opt-out), taste seam review
- [x] 07-15-PLAN.md — Contact form controller loaded on demand; eager JS under 22,000 B on every route

**Gap closure — Wave 3** *(blocked on Wave 2 completion)*

- [x] 07-16-PLAN.md — Immediate pressed cue on tap + compressed cold-cache touch-latency measurement

**Gap closure — Wave 4** *(blocked on Wave 3 completion)*

- [x] 07-17-PLAN.md — Final gate (verify, bundle, taste) + manual UAT checkpoint (Safari 26, Firefox 159, VoiceOver Q6, morph fallback Q7, Figma wheel)

**Gap closure 2 — Wave 1** *(lazy contact form layout shift)*

- [x] 07-18-PLAN.md — Reserve the lazy contact form's height (scripting-only CSS stack) + held-chunk layout-shift e2e at 1440/390, taste review

**Gap closure 2 — Wave 2** *(blocked on Wave 1 completion)*

- [x] 07-19-PLAN.md — Loader focus handoff to the checked chip (WR-02) + mount deferred during a mailto press (IN-02)

**Gap closure 2 — Wave 3** *(blocked on Wave 2 completion)*

- [x] 07-20-PLAN.md — Anchor smooth window ends when the glide starts, so Back never glides (WR-01)

**Gap closure 2 — Wave 4** *(blocked on Wave 3 completion)*

- [x] 07-21-PLAN.md — Final gate: verify, layout-shift assertions, leaks, bundle, taste on / and /es/, validation map
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

**Plans**: 18 plans (9 executed, 9 gap closure)
Plans:
**Wave 1**

- [x] 08-01-PLAN.md — Marquee semantics: aria-pressed always matches the paused state, live reduced-motion reset (D-10..D-12)
- [x] 08-02-PLAN.md — Skip-link focus padding and /es/404/ returns HTTP 404 on Workers preview (D-17, D-18)
- [x] 08-03-PLAN.md — Remove dead HOME-04 service icon data and stale tooltip comment (D-15)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 08-04-PLAN.md — Every-route EN/ES axe sweep in on/reduced/off with build-output guard; trimmed-spec re-check (D-07, D-08, D-16)
- [x] 08-05-PLAN.md — Generated Spanish review file with coverage/freshness test; TODO(martina) repointed (D-13, D-14)
- [x] 08-07-PLAN.md — Taste-skill gate on the redesign, report-only, user reviews findings (D-20)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 08-06-PLAN.md — Keyboard-only journeys EN/ES (nav, toggles, marquee, detail, embed, contact) plus manual Tab pass (D-09)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 08-08-PLAN.md — Mobile Lighthouse (pinned 13.6.0, median of 5) for Home and the heaviest detail page, user sign-off (D-01..D-06)

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 08-09-PLAN.md — Planning-docs hygiene and full gate on the combined result (D-19)

**Gap closure (from 08-VERIFICATION.md, 2026-11-09)**

**Gap Wave 1**

- [x] 08-10-PLAN.md — Marquee WR-01 (first activation always pauses; user decides vs D-10) and stable @network contact journey (WR-03)
- [x] 08-11-PLAN.md — A11Y-01: work-card cover opens on any intersection, regression tests at 390 and 1440
- [x] 08-12-PLAN.md — WR-02: pin the 404 pathname in BaseLayout, comments and reflection guard
- [x] 08-13-PLAN.md — Hero portrait as the sketch 001 arch on accent blue, defringed cutout, taste gate, user approval

**Gap Wave 2** *(blocked on Gap Wave 1)*

- [x] 08-14-PLAN.md — LCP diagnosis: attribution and measured lever experiments for Home and detail

**Gap Wave 3** *(blocked on Gap Wave 2)*

- [x] 08-15-PLAN.md — Home LCP: slide-only hero lead entrance (user-directed), taste gate
- [x] 08-16-PLAN.md — Shared payload LCP: defer GSAP until load and idle, plus levers chosen by 08-14

**Gap Wave 4** *(blocked on Gap Wave 3)*

- [x] 08-17-PLAN.md — Lighthouse re-measure (pinned 13.6.0, median of 5) and user sign-off (D-06)

**Gap Wave 5** *(blocked on Gap Wave 4)*

- [x] 08-18-PLAN.md — Full quality gate re-run and 08-VALIDATION.md update

**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. Phase 5 (Contact) depends only on Phase 2, so it can run in parallel with Phases 3–4.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Bilingual Walking Skeleton | 5/5 | Complete   | 2026-10-16 |
| 2. Homepage Story | 8/8 | Complete   | 2026-10-17 |
| 3. Real Behance Work | 10/10 | Complete   | 2026-10-17 |
| 4. Project Detail & Discovery | 12/12 | Complete   | 2026-10-19 |
| 5. Contact | 8/8 | Complete   | 2026-10-29 |
| 6. Scroll & Interaction Motion | 10/10 | Complete   | 2026-11-02 |
| 7. Page Transitions & Smooth Scroll | 21/21 | Complete   | 2026-11-05 |
| 8. Quality Verification | 18/18 | Complete   | 2026-11-10 |

### Phase 9: Portfolio Features: hero full-width on mobile, photography service, filter projects by service category

**Goal**: Phones get a full-width hero portrait, Martina's Photography service appears wherever services do, and visitors can filter /projects/ by category in EN and ES. Accessibility, motion and performance budgets all hold.
**Depends on:** Phase 8
**Requirements**: HOME-09, HOME-10, PROJ-04, PROJ-07
**UI hint**: yes
**Success Criteria** (what must be TRUE):

  1. At 390px the hero portrait is a full-width 4:5 arch above the headline. From 640px up the layout is unchanged, and the Home LCP re-measured with the 08-17 protocol is ≤2,500 ms.
  2. Photography (EN "Photography" / ES "Fotografía", 4 approved items) appears in Home services, in the contact service chips, and through `?service=photography`, and the contact action accepts it.
  3. /projects/ and /es/projects/ show single-select category chips with All (empty categories hidden). `?category=` deep-links and updates in place, and the count is announced politely. Keyboard, reduced motion and axe all pass in both languages.
  4. The taste-skill lint and inspect runs and screenshots are reviewed for every visual change. Lint, unit tests and e2e are green, and the eager JS budget (22,000 B) holds.
**Plans:** 6/8 plans executed

Plans:
**Wave 1**

- [x] 09-01-PLAN.md — Hero: full-width 4:5 phone arch, phone-sized srcset, hair-rim check, taste gate (HOME-09)
- [x] 09-02-PLAN.md — Photography service everywhere services appear, categoryIds + categoryId on cards, Spanish review (HOME-10)
- [x] 09-03-PLAN.md — Filter core (TDD): ?category= parser, chip builder, client filter with replaceState, before-swap and lifecycle (PROJ-04, PROJ-07)
- [x] 09-04-PLAN.md — Skip link and hash links jump locally on a filtered /projects/ page (PROJ-07)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 09-05-PLAN.md — Re-flowable grid: data-tile / data-category markup, layout unchanged (PROJ-04)
- [x] 09-06-PLAN.md — CategoryFilter chips + status region on /projects/ and /es/projects/, EN/ES copy, bundle check (PROJ-04, PROJ-07)

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 09-07-PLAN.md — Filter e2e (EN/ES, URL, Back, keyboard, reduced motion, no-JS, axe, leaks), spec updates, Projects taste gate

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 09-08-PLAN.md — Phase gate: pnpm verify, bundle budget, Spanish review fresh, Home LCP re-measure (08-17 protocol), final taste gate
