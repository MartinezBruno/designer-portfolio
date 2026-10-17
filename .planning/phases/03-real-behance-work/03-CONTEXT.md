# Phase 3: Real Behance Work - Context

**Gathered:** 2026-10-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Martina's real Behance projects appear on the site in EN and ES. The data comes from a committed snapshot, so the build never depends on Behance.

In scope:
- the documented consent note (DATA-01)
- `pnpm sync:behance`, which writes a committed snapshot and fails loudly on bad data (DATA-02, DATA-03)
- builds that work offline from the snapshot (DATA-04)
- local overrides (DATA-05)
- a source-agnostic typed `Project` model (DATA-06)
- the Home "latest work" section (HOME-06)
- the Projects list page at `/projects` and `/es/projects` (PROJ-01)
- a "Projects" link in the header nav

Out of scope:
- project detail pages and their mirrored module content (PROJ-02, PROJ-03, Phase 4)
- filters and search (PROJ-04..07). They are N/A because the count is 7; Phase 4 records it.
- motion beyond what Phase 1/2 already provide (Phases 6–7)
- Cloudflare deploy

**Amendments made in this discussion** (this file wins over ROADMAP and REQUIREMENTS where marked):
- **[AMENDS HOME-06]** Home shows featured projects first, then fills the rest with the latest by date (D-17).
- **[AMENDS DATA-02 timing]** The snapshot stores full project JSON now, but only cover images are downloaded. Module image files arrive in Phase 4 (D-21).

</domain>

<decisions>
## Implementation Decisions

### Consent & data source
- **D-01:** Martina has given **written** consent (confirmed by the user). Record it as a **one-line note** in `docs/CONSENT.md`, for example: "Martina Fernandez approved syncing her Behance content into this site in writing on <date>." Use no quote and no screenshot. This file must be committed **before** any sync script code (SC1). The user supplies the date, or it is left as `TODO(martina-date)` and flagged.
- **D-02:** **There is no Behance API key**, confirmed by the user. The scrape-based snapshot hybrid from `research/STACK.md` §1.3 stays the approach: profile `beconfig-store_state`, then project pages with the `js_challenge_value` cookie replay and the same UA.
- **D-03:** Martina's **account credentials are never used, requested, or stored.** The sync reads only public pages.
- **D-04:** The research guardrails stay in force: manual runs only (never CI-scheduled, never at runtime in a Worker), about 2 s between requests, a link back to Behance, and Playwright as plan B if the challenge hardens.

### Project count
- **D-05: The confirmed count is 7.** Evidence: the live profile `profileProjects` returned 7 with `hasMore: false` on 2026-10-16, which matches the RSS count of 7. The "14" in PITFALLS.md is superseded. **PROJ-04..07 are N/A** for Phase 4.
- **D-06:** Every sync run prints the project count. If it reaches **8 or more**, it prints a prominent notice to revisit PROJ-04..07 filters. This is a notice, not a failure.

Live data on 2026-10-16 (id | Behance slug | publishedOn):
`238078789 Cabreras-motos-Posts 2025-11` · `227934855 PuroV 2025-06` · `226450035 Website-Reciclick 2025-05` · `202447185 Portfolio-web 2024-07` · `185594991 Sistema-visual 2023-11` · `176799549 Website-InstaBlogs 2023-08` · `172473551 Mart 2023-06`

### URLs & routing
- **D-07:** The Projects list lives at **`/projects`** and **`/es/projects`**, with an unlocalized path segment. It reuses `stripLocale`/`alternatePath`/`absoluteFor` from `src/i18n/routes.ts` with no changes, and the language toggle, hreflang and canonical work as they do today.
- **D-08:** Detail URLs are **`/projects/<slug>`** and **`/es/projects/<slug>`**. The slug is a **clean lowercase slug** derived from the Behance slug: lowercase, accents and `´`/apostrophes stripped, non-alphanumerics collapsed to `-`. For example, `Cabreras-motos-Posts` becomes `cabreras-motos-posts`. An optional `slug` override renames it. **A duplicate slug fails the build.**
- **D-09: Before Phase 4, cards link to the final detail URLs and those URLs 404.** The user accepted this for the local-only v1 build. E2e link checks must exclude `/projects/<slug>` targets until Phase 4, using an explicit, commented skip that Phase 4 removes. Do not generate stub pages, and do not link to Behance in the interim.

### Titles, language & card content
- **D-10: Titles get bilingual overrides.** The override field is `title: { en, es }`. Without one, the card shows the Behance title as-is in both locales, wrapped in an element with the project's content `lang`. Phase 3 drafts all 7 EN/ES pairs and marks them `TODO(martina)`. Example: "Sistema visual" becomes EN "Visual system" / ES "Sistema visual".
- **D-11: Cards show cover, title, category, year, tools and a short summary.** On Home, the compact variant drops tools and summary (D-15).
- **D-12: Each project has exactly one primary category**, chosen from the 4 Phase 2 service ids: `graphic-design`, `web-design`, `branding`, `social-media`. Category labels come from the existing localized service titles, so there's no new category list. The initial value is seeded from Behance creative fields (the keywords-meta heuristic) and set in overrides.
- **D-13:** **Year** comes from `publishedOn`. **Tools** come from Behance `tools[]` (structured, reliable). Phase 4 is where tool display names get normalized, if needed.
- **D-14: Short summary** is a 1-line bilingual `{ en, es }` override, because Behance descriptions are empty. Phase 3 drafts all 7 as `TODO(martina)`. Without one, the card shows no summary line.
- **D-15: Cover alt text** comes from an optional bilingual `coverAlt: { en, es }` override. The fallback is derived from the localized title, for example "Reciclick website — cover". **Behance's auto alt text ("Image may contain: …") is never used.**

### Projects page & Home section
- **D-16: Home "latest work" section:** a localized heading (EN "Latest work" / ES "Trabajo reciente", final wording up to the UI-SPEC), **3 compact cards**, and a **"See all projects"** link to `/projects`. It goes between FeaturedServices and ToolsRow, where `HomeView.astro` already has a placeholder comment.
- **D-17: [AMENDS HOME-06] `featured: true` pins a project to Home.** Featured projects take Home slots first, ordered by `order` then by date. Any remaining slots fill with the latest by `publishedOn`. With nothing featured, the behavior matches the original HOME-06. The Projects page stays **newest first**, with `order` as a manual tiebreak or override.
- **D-18: The Projects page is an asymmetric masonry with a fixed size rhythm by position.** It is a repeating size pattern (for example large, small, small, wide…) on a CSS grid. **DOM order, tab order and visual reading order all stay newest first.** It collapses to one column on mobile. The taste skill tunes the exact pattern, and it must avoid layout shift by using cover dimensions from the snapshot.
- **D-19:** One `ProjectCard` component has a `compact` variant for Home and a full variant for Projects. The full card adds tools and summary. Information never exists only on hover.
- **D-20:** The header nav adds **"Projects" / "Proyectos"** before Contact, with `aria-current="page"` on the Projects page. Update the keyboard-order e2e test.

### Sync behavior
- **D-21: [AMENDS DATA-02 timing] Covers only for now.** The sync stores each project's **full JSON**: modules, text, tags, tools, dates and dimensions. It downloads and commits **only the 7 cover images** (largest available, about 808px). Phase 4 extends the sync to module images. The plan measures and records the git size.
- **D-22: A new project with no overrides is published with fallbacks**: the Behance title in both locales, no category chip and no summary. The sync prints a **checklist of missing overrides** per project, and the build passes. Override *validation* (unknown ids, invalid category, duplicate slug) still fails loudly.
- **D-23:** Hidden, reorder, feature, recategorize and alt text all go through the overrides file keyed by Behance id (DATA-05). UI components import only the typed model and the query layer, never the Behance adapter (DATA-06).

### Claude's Discretion
- Snapshot and overrides file format and location (for example `src/data/behance/snapshot.json` and `src/data/project-overrides.json`), loader shape (custom Content Layer loader vs `file()`), and the adapter layout (`behance` / `snapshot` / `fixtures`).
- Failure-detection heuristics: challenge body markers, minimum project count, schema validation, and writing to a temp location before swapping. The previous good snapshot must stay untouched on any failure (DATA-03).
- Cover image storage path and whether images are pre-optimized at sync or by `astro:assets` at build. Build must work offline either way.
- Whether `sanitize-html` is added now (TextModule HTML is stored now) or deferred to Phase 4. Do not add dependencies before they're needed.
- The exact masonry rhythm, card visuals, the "See all" link styling and the Projects page header copy, all inside the taste skill and UI-SPEC process.
- Fixtures-first ordering: build the typed model and fixtures before the scraper, so UI work isn't blocked.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Behance data & risks
- `.planning/research/STACK.md` §1 (Behance data access): the tested endpoints, the challenge replay, store JSON key paths, module types, alt-text and creative-field caveats, and the ToS/robots notes.
- `.planning/research/SUMMARY.md`: the snapshot hybrid architecture and conflict #2 (7 vs 14, now resolved to 7 by D-05).
- `.planning/research/PITFALLS.md`: fragile fields, encoding (`´`, quotes in titles), sort-order disagreement, and build time for images. Its "14 projects" figure is superseded by D-05.
- `.planning/research/ARCHITECTURE.md`: the data-flow rule (Content Layer → `queries.ts` → views → sections → UI) and the source-agnostic adapters.
- `.planning/research/FEATURES.md`: alt-text fallback, and Behance content staying in its original language.

### Project-level
- `.planning/PROJECT.md`: constraints, including that the taste skill is required for all visual work and the pre-approved GSD commits.
- `.planning/REQUIREMENTS.md`: DATA-01..06, HOME-06 (amended by D-17), PROJ-01, and PROJ-04..07 (N/A per D-05).
- `.planning/ROADMAP.md` §Phase 3: success criteria 1–5.

### Inherited contracts
- `.planning/phases/02-homepage-story/02-CONTEXT.md`: service ids (D-05 there), which are reused as the project categories (D-12 here).
- `.planning/phases/02-homepage-story/02-UI-SPEC.md` and `.planning/phases/01-bilingual-walking-skeleton/01-UI-SPEC.md`: tokens, focus ring, accent `#0F70B7`, and touch targets.
- `.planning/phases/01-bilingual-walking-skeleton/SKELETON.md`: motion gate and lifecycle registry conventions.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/content.config.ts`: collections use `file()` loaders with `astro/zod`, plus a `localized` `{en, es}` schema helper. Reuse it for the override titles, summary and coverAlt.
- `src/lib/content/queries.ts`: the only collection reader, with thrown guards that fail the build. Add `getLatestProjects(locale)` and `getAllProjects(locale)` here.
- `src/lib/content/home.ts`: pure builder functions (`buildServices`, etc.) that are unit-testable. Follow this for project builders (sort, featured pinning, slug, fallbacks).
- `src/components/views/HomeView.astro`: holds the placeholder comment where the latest-work section goes.
- `src/i18n/routes.ts`: `stripLocale`, `alternatePath` and `absoluteFor` already handle `/es/projects/` (D-07).
- `src/i18n/ui.en.ts` / `ui.es.ts` (`satisfies Dictionary`): new keys for nav.projects, the latest-work heading, "See all", the Projects page title/description and the card meta labels.
- `src/components/global/SiteHeader.astro`: the nav currently has only Contact. Add Projects (D-20).
- `src/components/ui/*`: existing ButtonLink and IconLink patterns.

### Established Patterns
- Tabler icons are imported per file as Astro SVG components through typed key maps.
- Components contain no string literals. The only `set:html` in `src/` is the motion gate inline script.
- `TODO(martina)` markers plus SUMMARY "Known Stubs" track copy awaiting her review (titles, summaries and alt text here).
- `--text-*` is reset in `global.css`: only `text-sm/base/2xl/5xl` compile.

### Integration Points
- `tests/e2e/a11y.spec.ts` keyboard order: add the nav Projects link, the latest-work cards and "See all".
- `tests/e2e/layout.spec.ts`: no horizontal overflow at 320px on `/projects`.
- e2e link checks: temporarily skip `/projects/<slug>` (D-09).
- `package.json`: add a `sync:behance` script. The sync script lives outside `src/` and never ships to the client.

</code_context>

<specifics>
## Specific Ideas

- Titles to draft (Behance originals): "Cabrera´s motos, Posts", "PuroV", 'Website "Reciclick"', "Portfolio web", 'Website "InstaBlogs"', "Sistema visual", "Mart". Several are Spanish, and the quotes and `´` need cleanup in the localized overrides.
- Categories should feel like her services: the Home section ties the work back to the 4 service cards above it.
- The Projects page should feel "designery" (an asymmetric masonry), not a generic uniform grid, while keeping a strict newest-first reading order.

</specifics>

<deferred>
## Deferred Ideas

- Module image downloads (up to 1920px) and the full detail-page content are Phase 4 (D-21).
- Filters and search (PROJ-04..07) are N/A at 7 projects. The sync's ≥8 notice (D-06) triggers a revisit.
- Normalizing tool display names (for example "Adobe Illustrator" vs her Phase 2 tool list) belongs in Phase 4 if needed.
- Per-project `size` override for the masonry was offered and not chosen. A fixed rhythm is used instead.

</deferred>

---

*Phase: 03-real-behance-work*
*Context gathered: 2026-10-16*
