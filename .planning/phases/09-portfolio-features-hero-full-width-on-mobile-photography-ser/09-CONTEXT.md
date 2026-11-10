# Phase 9: Portfolio Features - Context

**Gathered:** 2026-11-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Three user-requested features on top of the finished v1 (Phase 8 closed 2026-11-10):

1. **Hero portrait full width on phones.** Today the arch portrait is 128×171 at 390px (from 08-13).
2. **Photography service.** A 5th service in `src/data/services.json` (EN + ES). It flows to every place that consumes services.
3. **Filter /projects/ by category.** Chips built from the service categories, in both EN and ES.

Out of scope: text search, tool or year filters, multi-category projects, re-assigning existing project categories, new Behance sync behaviour.

</domain>

<decisions>
## Implementation Decisions

### Hero on mobile
- **D-01:** Keep the sketch-001 arch on the accent-blue ground, but on phones use a **4:5 crop** instead of 3:4. That is about 358×448 at 390px inside the 16px gutters. The semicircle top and the 1.25rem bottom corners stay.
- **D-02:** The portrait stays **above the headline** on mobile (today's `order-first`). [Inference] It will probably become the Home LCP element on mobile.
- **D-03:** Full width applies to **phones only (<640px, below Tailwind `sm`)**. From `sm` up, today's sizes are unchanged: `sm:w-44`, `lg:w-64`, `min-[87.5rem]:w-[19rem]`, all 3:4.
- **D-04:** **Re-measure Home LCP** after the change, using the 08-17 protocol in `08-LIGHTHOUSE.md` "Re-measure rule": mobile simulated, `pnpm dlx lighthouse@13.6.0`, 7 selection runs, then 5 runs each. The budget is 2,500 ms; today it is 1,207 ms. The `sizes` and `widths` must give a phone a correctly sized candidate. Code-review IN-08 already notes that 600w is under-sized at ≥87.5rem on 2x screens.
- **D-05:** Check the hair halo/rim at the larger crop (08-13 SUMMARY: defringe and darken the hair rim on the blue ground). If the larger render shows fringe, fix the asset rather than the layout.

### Photography service
- **D-06:** New service id `photography`, `order: 5` (last). Title EN **"Photography"**, ES **"Fotografía"**. The short style matches the other titles; the "Servicio de fotografía" wording from the request was not used.
- **D-07:** Items, user-approved 2026-11-10:
  - EN: "Product photography", "Portraits", "Photos for social media", "Editing and retouching"
  - ES: "Fotografía de producto", "Retratos", "Fotos para redes sociales", "Edición y retoque"
  - The rows still go through `pnpm review:spanish` and are marked for Martina's review, like all other copy (QUAL-03 convention).
- **D-08:** Photography must show up everywhere services are consumed: Home FeaturedServices (a vertical list, so a 5th entry needs no layout change), contact ServiceChips, the `?service=photography` preselect, the contact action's service validation, and the email service label.
- **D-09:** `categoryIds` in `src/lib/projects/model.ts` gains `photography`, so `services.json` and the project categories stay one-to-one. `card-view.ts` already fails loudly if a category id is missing from services.json.

### Projects filter
- **D-10:** Filter by the **service categories** (`project.category`, curated in `project-overrides.json`), **not raw Behance tags**. The user first chose raw tags, then switched after seeing the real list on 2026-11-10: about 50 tags, mixed EN/ES/PT, with duplicates, mostly on one project each.
- **D-11:** This overrides the Phase 4 conditional rule (D-16: filters only at ≥8 projects) for the category filter. The project still has 7. PROJ-04 ("curated category chips") is now in scope. PROJ-05 (search), PROJ-06 (tool filter) and the search part of PROJ-07 stay N/A.
- **D-12:** **Single-select chips with "All"** (EN "All", ES "Todos"), one active at a time, like tabs. Order follows services.json `order`.
- **D-13:** **Hide categories with no projects.** Photography shows no chip until a project is assigned to it. Today's chips: All (7), Graphic design (2), Web design (3), Branding (1), Social media (1).
- **D-14:** The selected category is stored in the URL as `?category=<id>` (shareable, works with back/forward), and the result count is announced in a polite live region (e.g. "3 projects" / "3 proyectos"). An unknown or empty `?category` value falls back to All. Without JS, all projects show.
- **D-14a (user, 2026-11-10):** "works with back/forward" means **`history.replaceState`**. A chip change rewrites `?category=` in place and adds no history entry. Going back from a project returns to the filtered list. Back does not step through earlier chip choices. Research shows `pushState` makes Astro's ClientRouter re-render /projects/ on top of itself.
- **D-15:** It must work in both EN and ES, with full keyboard use, reduced motion and axe coverage (the requirement from the handoff). Filtering must not leak ScrollTriggers or reveal state across `<ClientRouter />` navigations (Phase 6/7 lifecycle rules).

### Categories data
- **D-16:** **One category per project**, as today. No data-model change to `category`.
- **D-17:** Keep the current assignments: Cabrera's → social-media; PuroV, Mart → graphic-design; Reciclick, Portfolio, InstaBlogs → web-design; Visual system → branding.

### Claude's Discretion
- Where the chips sit on /projects/ and how they look (they must pass the taste-skill house rules; reusing the ServiceChips pill style is a candidate).
- Whether chips are `<button aria-pressed>` or a radio group, and how the live region is worded, as long as it meets WCAG and the keyboard e2e.
- Motion when the filter changes, which must degrade to an instant change under reduced motion.
- Research open questions, settled here: Photography is **not** added to the roles marquee (`roles.json`, outside D-08). No `suggestCategory` and Behance-sync mapping for Photography (sync is out of scope). The EN/ES switcher may drop `?category=` (deferred). Whether the result count is also visible text follows the UI-SPEC.
- Hero `widths`: the UI-SPEC proposes `[256,448,720,960,1200]` and RESEARCH proposes `[256,448,640,768,1024]` (measured with sharp). The planner picks one and checks it with the D-04 LCP re-measure.
- Unit and e2e test split; the e2e must take turns on the shared port 4400 (see HANDOFF).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project rules
- `CLAUDE.md`: stack, taste-skill requirement for visual changes, and the pre-approved GSD commits rule
- `.planning/HANDOFF-phase-8-9.md` §"Session B": the original Phase 9 brief
- `.planning/REQUIREMENTS.md`: PROJ-04..07 (conditional filter rows, now partly in scope per D-11), QUAL-01..03

### Hero
- `.planning/sketches/001-hero-portrait-shape/` and `.planning/sketches/MANIFEST.md`: arch-on-blue direction
- `.planning/phases/08-quality-verification/08-13-SUMMARY.md`: portrait asset, hair halo/defringe notes
- `.planning/phases/08-quality-verification/08-LIGHTHOUSE.md`: "Re-measure rule" (around line 424) and the 08-17 protocol
- `.planning/phases/08-quality-verification/08-REVIEW.md`: Gap-Closure Review IN-08 (hero widths) and IN-09 (stale TODO)

### Filter and categories
- `.planning/phases/04-project-detail-discovery/04-CONTEXT.md`: D-16 (≥8 rule) and D-17 (no year filter, dates hidden)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/sections/Hero.astro`: `<Picture>` arch with `widths`/`sizes`, `pictureAttributes` width classes, and `aspect-[3/4]`
- `src/data/services.json` (content collection `services` in `src/content.config.ts`): the single source for service titles and items
- `src/components/contact/ServiceChips.astro`: pill-chip styling (2px border for WCAG 1.4.11, checked state)
- `src/lib/contact/service-param.ts` and `src/lib/ui/service-preselect.ts`: `?service=` parsing and preselect, a model for `?category=`
- `src/lib/projects/model.ts` (`categoryIds`, `CategoryId`), `card-view.ts` (category titles from services.json), `overrides-schema.ts` (`z.enum(categoryIds)`)
- `src/components/views/ProjectsView.astro` and `src/components/ui/ProjectGrid.astro`: the list page that hosts the filter

### Established Patterns
- Bilingual routes: `src/pages/projects/index.astro` and `src/pages/es/projects/index.astro` render shared views with a `locale` prop
- Motion lifecycle: `lifecycle.register(...)` from `src/lib/motion`; init on `astro:page-load`, kill on `astro:before-swap`
- Deferred JS budget: largest eager script 17,958 B of 22,000 B (08-18). The filter script must be small or lazily loaded (memory: defer deferrable JS)
- Spanish copy goes through `pnpm review:spanish`, and a unit test keeps `08-SPANISH-REVIEW.md` up to date

### Integration Points
- Contact action input validation (`src/actions/index.ts`, `src/lib/contact/fields.ts`) must accept `photography`
- Email service label (`src/lib/contact/email.ts`)
- `nav-focus.ts` references services, so check it

</code_context>

<specifics>
## Specific Ideas

- The user gave "Social media" and "Graphic design" as example filter values. They match the service titles exactly, which is why D-10 was chosen.
- On phones the hero should feel like a full-width, editorial portrait, but keep the arch identity from sketch 001.

</specifics>

<deferred>
## Deferred Ideas

- Projects in more than one category (e.g. InstaBlogs = Web design + Branding): decided against for now (D-16).
- Text search and tool filter (PROJ-05/06): still conditional on ≥8 projects.
- Assigning projects to Photography: this needs Martina's photography work on Behance first.

</deferred>

---

*Phase: 09-portfolio-features*
*Context gathered: 2026-11-10*
