# Requirements: Designer Portfolio — Martina Fernandez

**Defined:** 2026-10-15
**Core Value:** Visitors (potential clients) immediately feel her design sensibility through a striking, animated experience and can browse her real Behance work and contact her — in English or Spanish.

## v1 Requirements

v1 "done" = working local build (deploy is post-v1).

### Foundation (FND)

- [x] **FND-01**: Developer can run `pnpm dev`, `pnpm build`, `pnpm lint` (incl. `astro check`) and `pnpm test` on an Astro 7.x + strict TypeScript (~6.0.x) + Tailwind v4 project with zero errors
- [x] **FND-02**: Developer can run Playwright end-to-end tests with axe accessibility checks
- [x] **FND-03**: Icons render from Tabler as explicit per-icon SVG imports (no barrel imports, no client JS)
- [x] **FND-04**: Secrets (`.env`, `.dev.vars`) are git-ignored and never appear in the built output

### Internationalization & Layout (I18N)

- [x] **I18N-01**: Visitor sees English at `/…` and Spanish at `/es/…` for every page
- [x] **I18N-02**: Visitor can switch language via an "EN / ES" text toggle in the header and land on the equivalent page in the other language
- [x] **I18N-03**: Visitor is never auto-redirected based on browser language or location
- [x] **I18N-04**: Every page outputs correct `html lang`, canonical, and hreflang (en, es, x-default) tags plus localized title/description/OG metadata
- [x] **I18N-05**: All UI strings exist in both languages (a missing Spanish key fails type-check/tests)
- [x] **I18N-06**: Visitor sees a shared header/nav and footer (email + socials) on every page, with a skip-to-content link
- [x] **I18N-07**: Visitor sees a localized 404 page with a way back home

### Homepage (HOME)

- [x] **HOME-01**: Visitor sees a hero with greeting, professional title, description and her image, visible immediately without waiting on JavaScript
- [x] **HOME-02**: Visitor sees a marquee of all the roles/jobs she does (web design, social media manager, etc.)
- [x] **HOME-03**: Visitor can pause the marquee (pause on hover/focus or control); it is static under reduced motion and screen readers hear each role once
- [x] **HOME-04**: Visitor sees her featured services (4 in Phase 2; 5 with Photography from Phase 9)
- [x] **HOME-05**: Visitor sees the apps/tools she uses
- [x] **HOME-06**: Visitor sees her 3 latest Behance projects (sorted by publish date) linking to their detail pages
- [x] **HOME-07**: Visitor sees an "available for projects" badge whose state she controls via content
- [x] **HOME-08**: Visitor can click a service and land on the contact form with that service pre-selected
- [ ] **HOME-09**: On phones (<640px) the hero portrait is shown full width as a 4:5 arch above the headline, and Home LCP stays within the 2,500 ms budget (Phase 9, D-01..D-05)
- [ ] **HOME-10**: Visitor sees a Photography service (EN/ES) on Home, can pick it in the contact form, and can preselect it with ?service=photography (Phase 9, D-06..D-09)

### Behance Data (DATA)

- [x] **DATA-01**: Martina's explicit consent to pulling her Behance content is obtained and documented before the sync script is built
- [x] **DATA-02**: Developer can run `pnpm sync:behance` to fetch her profile and all project content (images, text, grids, embeds, tags, tools, dates) into a committed snapshot with locally optimized images
- [x] **DATA-03**: Sync fails loudly and never overwrites a good snapshot with empty, partial, or challenge-page data
- [x] **DATA-04**: Site builds successfully offline / when Behance is unreachable (build reads only the snapshot)
- [x] **DATA-05**: Developer can curate per-project overrides locally: category, alt text, featured/order/hidden
- [x] **DATA-06**: Project data is exposed through a source-agnostic typed model, so the source (scrape, Playwright, manual) can change without touching UI

### Projects (PROJ)

- [x] **PROJ-01**: Visitor can browse all her Behance projects on a Projects page, newest first, in both languages
- [x] **PROJ-02**: Visitor can open a project detail page that mirrors its Behance content (images, text, grids, embeds) in original language, with a safe fallback for unknown content types
- [x] **PROJ-03**: Visitor sees project metadata (tools, category; no project date, user decision 2026-10-17), a "View on Behance" link, next/previous project links, and a contact CTA on each detail page
- [ ] **PROJ-04**: Visitor can filter projects by curated category chips (single-select with All; empty categories hidden). **Now in scope in Phase 9 (D-10..D-13)** by user decision on 2026-11-10, which overrides the Phase 4 D-16 rule of ≥8 projects.
- [ ] **PROJ-05**: *(conditional: ≥8 projects)* Visitor can text-search projects (accent-insensitive) — **N/A (Phase 4, D-16):** 7 projects in the committed snapshot (origin behance-sync), confirmed live 2026-10-16 (Phase 3 D-05); threshold is 8. Revisit when pnpm sync:behance prints the ≥8 notice.
- [ ] **PROJ-06**: *(conditional: ≥8 projects)* Visitor can filter projects by tool (year filter dropped: it would expose the project dates the user chose to hide, D-17, 2026-10-17) — **N/A (Phase 4, D-16):** 7 projects in the committed snapshot (origin behance-sync), confirmed live 2026-10-16 (Phase 3 D-05); threshold is 8. Revisit when pnpm sync:behance prints the ≥8 notice.
- [ ] **PROJ-07**: Filter state is reflected in the URL (`?category=`, replaceState), the result count is announced to screen readers, and an unknown category falls back to All. **Phase 9 (D-14, D-14a)**, filter part only; the search part stays N/A with PROJ-05.

### Contact (CONT)

- [x] **CONT-01**: Visitor can submit a contact form (name, email, message, service) with localized validation messages
- [x] **CONT-02**: Spam is blocked with a honeypot and Cloudflare Turnstile, verified server-side
- [x] **CONT-03**: Visitor gets clear localized success/error feedback (announced to screen readers) and keeps their typed text on failure
- [x] **CONT-04**: Submissions go through a mailer interface; in the local v1 build the provider logs the message (Resend provider ready for deploy)
- [x] **CONT-05**: Visitor without JavaScript still has a `mailto:` fallback

### Motion (MOTN)

- [x] **MOTN-01**: Visitor sees content animate in as they scroll (reveals), while content stays visible if JavaScript fails
- [x] **MOTN-02**: Visitor sees headline text split/reveal animations
- [x] **MOTN-03**: Visitor on desktop (fine pointer) gets a custom cursor and magnetic buttons; touch devices keep native behavior
- [x] **MOTN-04**: Visitor sees playful image hover effects on project cards
- [x] **MOTN-05**: Visitor sees animated page transitions; after navigation focus moves to the new page and its title updates
- [x] **MOTN-06**: Visitor experiences smooth/inertial scrolling with parallax images, without breaking keyboard scrolling, anchor links (which move focus) or find-in-page
- [x] **MOTN-07**: With `prefers-reduced-motion`, all non-essential motion is disabled or replaced by simple fades
- [x] **MOTN-08**: Visitor can turn animations off with an on-page toggle
- [x] **MOTN-09**: Animations don't leak or duplicate across navigations (navigating 10× keeps listener/trigger counts constant)

### Quality (QUAL)

- [x] **QUAL-01**: Performance budget measured on mobile Lighthouse for Home and a heavy detail page (proposed: LCP < 2.5 s, CLS < 0.1, homepage JS ≈ 100 KB gz) — numbers to be confirmed by measurement
- [x] **QUAL-02**: Every page passes axe checks in both languages and is fully usable by keyboard
- [x] **QUAL-03**: Spanish translations are drafted for all site copy and marked for Martina's review

## v2 Requirements

Deferred. Tracked but not in current roadmap.

- **DEPLOY-01**: Site deployed to Cloudflare Workers on her custom domain
- **DEPLOY-02**: Contact emails actually delivered via Resend (verified domain) or Cloudflare Email Routing
- **DEPLOY-03**: Projects refresh automatically after she publishes on Behance (deploy hook / cron rebuild)
- **SEO-01**: Branded OG images per page/project
- **I18N-08**: Remembered-language suggestion banner
- **I18N-09**: Spanish titles/summaries/body for Behance projects
- **TEST-01**: Testimonials / client logos (only with real content)
- **ANL-01**: Cookieless analytics
- **MOTN-10**: WebGL image distortion on hover

## Out of Scope

| Feature | Reason |
|---------|--------|
| Live Behance fetch at runtime / in browser | Fragile, ToS exposure; snapshot approach instead |
| Behance iframe embeds / hotlinked images | Images are downloaded and optimized locally |
| Machine-translating Behance text | User chose original text on both locales |
| Auto-redirect by browser language/IP | Google advises against; hurts UX |
| Flags in the language switcher | Languages ≠ countries; text "EN / ES" instead |
| Full-screen preloader, scroll-jacking | Anti-patterns that delay content and hurt a11y |
| Pagination / infinite scroll / faceted search | Catalog is small (≈7–14 projects) |
| CMS / admin panel | Content provided upfront; projects come from Behance |
| Skill-percentage bars | Anti-pattern for design portfolios |
| Pixel-perfect Figma implementation | Figma is reference only |

## Traceability

Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FND-01 | Phase 1 | Complete |
| FND-02 | Phase 1 | Complete |
| FND-03 | Phase 1 | Complete |
| FND-04 | Phase 1 | Complete |
| I18N-01 | Phase 1 | Complete |
| I18N-02 | Phase 1 | Complete |
| I18N-03 | Phase 1 | Complete |
| I18N-04 | Phase 1 | Complete |
| I18N-05 | Phase 1 | Complete |
| I18N-06 | Phase 1 | Complete |
| I18N-07 | Phase 1 | Complete |
| HOME-01 | Phase 1 | Complete |
| HOME-02 | Phase 2 | Complete |
| HOME-03 | Phase 2 | Complete |
| HOME-04 | Phase 2 | Complete |
| HOME-05 | Phase 2 | Complete |
| HOME-06 | Phase 3 | Complete |
| HOME-07 | Phase 2 | Complete |
| HOME-08 | Phase 5 | Complete |
| HOME-09 | Phase 9 | Pending |
| HOME-10 | Phase 9 | Pending |
| DATA-01 | Phase 3 | Complete |
| DATA-02 | Phase 3 | Complete |
| DATA-03 | Phase 3 | Complete |
| DATA-04 | Phase 3 | Complete |
| DATA-05 | Phase 3 | Complete |
| DATA-06 | Phase 3 | Complete |
| PROJ-01 | Phase 3 | Complete |
| PROJ-02 | Phase 4 | Complete |
| PROJ-03 | Phase 4 | Complete |
| PROJ-04 | Phase 9 | Pending |
| PROJ-05 | Phase 4 | N/A (7 projects < 8) |
| PROJ-06 | Phase 4 | N/A (7 projects < 8) |
| PROJ-07 | Phase 9 | Pending |
| CONT-01 | Phase 5 | Complete |
| CONT-02 | Phase 5 | Complete |
| CONT-03 | Phase 5 | Complete |
| CONT-04 | Phase 5 | Complete |
| CONT-05 | Phase 5 | Complete |
| MOTN-01 | Phase 6 | Complete |
| MOTN-02 | Phase 6 | Complete |
| MOTN-03 | Phase 6 | Complete |
| MOTN-04 | Phase 6 | Complete |
| MOTN-05 | Phase 7 | Complete |
| MOTN-06 | Phase 7 | Complete |
| MOTN-07 | Phase 6 | Complete |
| MOTN-08 | Phase 6 | Complete |
| MOTN-09 | Phase 7 | Complete |
| QUAL-01 | Phase 8 | Complete |
| QUAL-02 | Phase 8 | Complete |
| QUAL-03 | Phase 8 | Complete |

**Coverage:**
- v1 requirements: 51 total (HOME-09, HOME-10 added in Phase 9)
- Mapped to phases: 51
- Unmapped: 0 ✓

Note: PROJ-04..07 are conditional on ≥8 projects; Phase 3 confirmed the count (7) and Phase 4 recorded them as N/A on 2026-10-17 (D-16). PROJ-06 dropped the year filter (D-17).

---
*Requirements defined: 2026-10-15*
*Last updated: 2026-10-15 after roadmap creation (traceability mapped)*
