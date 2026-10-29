# Phase 4: Project Detail & Discovery - Context

**Gathered:** 2026-10-17
**Status:** Ready for planning

<domain>
## Phase Boundary

One detail page per project at `/projects/<slug>` and `/es/projects/<slug>` (URLs locked by Phase 3 D-08). Each page mirrors the project's Behance modules (images, text, grids, embeds) in the original language, wrapped in the content `lang`. Unknown module types get a safe fallback. Each page shows tools and category (no date), a "View on Behance" link, next/previous project links, and a contact CTA. The sync is extended to download module images (Phase 3 D-21).

**Discovery (PROJ-04..07) is N/A.** There are 7 projects (Phase 3 D-05), so this phase records the N/A and adds no filter UI to the Projects page.

</domain>

<decisions>
## Implementation Decisions

### Canvas fidelity
- **D-01: Seamless stack.** Module images run edge to edge with no gaps, honouring Behance `fullBleed` (nearly every module has it set: 67/68 in InstaBlogs, 6/6 in Cabrera's). They sit in a centred column capped near Behance's 1400px `canvasWidth`. Her compositions flow from one image into the next, so do not add card frames, gaps or rounded corners between images.
- **D-02: Text modules are stripped to site typography.** Keep the structure: paragraphs, line breaks, links, bold/italic and `text-align`. Drop inline `color`, `font-family` and `font-size` (they were picked for her dark Behance canvases, for example `#ffffff` and `#f8f5c2`). Text renders in site fonts and theme colours in both light and dark mode. The HTML must be sanitized with an allowlist, preferably **at sync time** as a script-only dependency so nothing ships to the client (`research/STACK.md` recommends `sanitize-html`). Adding it is now justified, which resolves the Phase 3 discretion item. Never use raw `set:html` on unsanitized Behance HTML. Links stay external with `rel="noopener noreferrer"` and open in a new tab, with the existing new-tab hint pattern.
- **D-03: Canvas background = site theme background token.** There is no per-project background colour and no `canvasBg` override.
- **D-04: No motion on the detail page in this phase.** Scroll reveals and parallax for the image stack belong to Phase 7, through the existing motion gate. Amended by Phase 6 D-04 (2026-10-29): detail pages get reveals (intro title line split, text modules, metadata row, contact band, Next-project teaser). The module image stack stays static; its parallax is Phase 7. See .planning/phases/06-scroll-interaction-motion/06-CONTEXT.md.

### Images & embeds
- **D-05: Module images are committed, re-encoded at sync.** `pnpm sync:behance` downloads each module image (ImageModule plus every MediaCollection component, 154 in total today), re-encodes it to a modern format (WebP/AVIF, final choice is the planner's) and commits it next to the covers. The build must stay offline from a fresh clone. The plan **measures and records** the added git size; `[Unverified]` the PNG-originals estimate was 150–300 MB, which is why originals are not committed. The previous good snapshot and images stay untouched on any sync failure (DATA-03).
- **D-06: Max width 1400px**, matching `canvasWidth`. Responsive srcset sizes go downward from there via `astro:assets`. Image dimensions come from the snapshot to avoid layout shift.
- **D-07: Embeds use a click-to-load facade.** A poster/placeholder with an accessible "Load interactive prototype" button (localized). The `<iframe>` (Figma today, in Portfolio-web) is injected only on activation. Before the click, no third-party request is made. Only an allowlist of embed origins is accepted (e.g. `embed.figma.com`); any other embed falls back as in D-08. The iframe gets a `title` and sensible `sandbox`/`allow` attributes.
- **D-08: Unknown module types render a quiet localized note**, roughly "This part is best viewed on Behance", linking to the project's Behance URL. The sync already warns about unknown types (`scripts/behance/run-sync.ts:243`); keep that warning.
- **D-09: Module alt text is an optional per-image override, otherwise derived.** Add an optional `moduleAlt` map keyed by module id (or component id for collection images) with `{ en, es }` values in `src/data/project-overrides.json`. Without one, alt is derived from the localized title, e.g. "Reciclick website — image 3 of 17". Behance auto alt is never used (Phase 3 D-15). The sync's missing-overrides checklist lists missing module alts as `TODO(martina)` (a notice only; the build passes).
- **D-10: MediaCollection modules render as a responsive grid**: 2–3 columns that collapse on mobile. The taste skill and UI-SPEC set the exact columns.

### Page frame & metadata
- **D-11: The page opens with a title-first intro band**: the large localized title (from overrides, wrapped in the content `lang` when it falls back to Behance), the localized summary when present, then a metadata row with the category, tools and "View on Behance" link. The image stack follows straight after. The cover is **not** repeated as a hero.
- **D-12: Tools reuse `ToolIcon` with a visible name** (same icons as the Home ToolsRow). Behance tool names already match `src/data/tools.json` names. An unmatched tool shows its name only, so no normalization layer is needed unless the planner finds a mismatch. No project date anywhere (user decision 2026-10-17).
- **D-13: Next/prev follow the Projects-page order and wrap around.** Order is newest first with `order` overrides, the same query as `/projects`. The last project's "next" goes to the first, and the first project's "previous" goes to the last. Hidden projects are excluded.
- **D-14: Page end has a big "Next project" teaser**, a large block with the next project's cover thumbnail and title, plus a smaller "previous" text link. The visuals are tuned by UI-SPEC and the taste skill.
- **D-15: The contact CTA links to Home `#contact`**: `/#contact` and `/es/#contact`, the same target as the header nav. It goes live when Phase 5 lands, with no change needed here.

### Discovery (PROJ-04..07)
- **D-16: PROJ-04..07 are recorded N/A** in REQUIREMENTS.md and VERIFICATION, with Phase 3 D-05 (7 projects, live profile and RSS on 2026-10-16) as evidence. The Projects page gets no filter or search UI. The sync's ≥8 notice (Phase 3 D-06) remains the revisit trigger.
- **D-17: [AMENDS PROJ-06] The year filter is dropped.** If filters are ever built, PROJ-06 filters by tool only, because a year filter would expose the dates the user chose to hide. Update REQUIREMENTS.md PROJ-06 and ROADMAP Phase 4 SC3 wording accordingly.

### Phase-3 cleanup this phase owns
- Remove the three `TODO(phase-4)` D-09 link-check skips: `tests/e2e/projects.spec.ts:38`, `tests/e2e/a11y.spec.ts:38`, `tests/e2e/home-latest-work.spec.ts:61`. Also update the `src/components/ui/ProjectCard.astro:5` comment. Card links must now resolve.

### Claude's Discretion
- Exact image encoding (WebP vs AVIF, quality) and the storage path for module images, within D-05/D-06.
- The sanitizer library and its exact allowlist, within D-02.
- The module-renderer component structure: for example a `ProjectModule` dispatcher with `ImageModule`/`TextModule`/`CollectionModule`/`EmbedFacade`/`UnknownModule`, following the AGENTS.md small-component rule.
- Per-page SEO: title, description from the summary, and OG image from the cover. Reuse `buildSeo`/`SeoHead` and the hreflang/canonical pattern.
- Fallback copy wording, facade poster design, the next-project teaser visuals, and the column count in the collection grid: all through UI-SPEC and the taste skill.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope & requirements
- `.planning/ROADMAP.md` §Phase 4 — goal and success criteria (SC2 amended: no date; SC3 needs the D-17 year amendment)
- `.planning/REQUIREMENTS.md` — PROJ-02..07 (PROJ-03 amended: no date; PROJ-06 amended by D-17)
- `.planning/PROJECT.md` — constraints (taste skill required for all visual work, pre-approved GSD commits, measure performance)
- `.planning/phases/03-real-behance-work/03-CONTEXT.md` — D-05 (count = 7), D-08 (slug/URLs), D-09 (404 stubs and e2e skips), D-12..15 (category, tools, summary, alt), D-21 (sync extension), D-22/23 (overrides)

### Data & sync
- `.planning/research/STACK.md` §1 — Behance scrape and snapshot approach and guardrails (manual runs, ~2 s spacing, no runtime fetch)
- `.planning/research/PITFALLS.md` — Behance pitfalls (the "14 projects" figure is superseded by Phase 3 D-05)
- `docs/CONSENT.md` — Martina's written consent to sync her Behance content
- `src/data/behance/snapshot.json` — module data: `ImageModule`, `TextModule`, `EmbedModule`, `MediaCollectionModule`, `fullBleed`, `imageSizes`, `canvasWidth`
- `src/data/project-overrides.json` and `src/lib/projects/overrides-schema.ts` — where `moduleAlt` (D-09) is added

### Design
- `.planning/phases/03-real-behance-work/03-UI-SPEC.md` — card and Projects page design contract to stay consistent with
- `.planning/phases/02-homepage-story/02-UI-SPEC.md` — tokens, typography, ToolsRow visuals

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/projects/` (`model.ts`, `projects.ts`, `card-view.ts`, `slug.ts`, `local-overrides.ts`, `snapshot-schema.ts`): the typed model and query layer. Detail pages import only these, never the adapter (Phase 3 D-23 / DATA-06).
- `src/lib/projects/sources/behance-snapshot.ts`: the snapshot adapter, which gets extended for module images.
- `scripts/behance/run-sync.ts` and `scripts/sync-behance.ts`: the sync, which is extended to download and re-encode module images. It already warns on unknown module types.
- `src/components/ui/ToolIcon.astro`, `ButtonLink.astro`, `IconLink.astro` (new-tab hint pattern), `ProjectCard.astro` (cover for the next-project teaser)
- `src/components/views/ProjectsView.astro` and `src/pages/projects/index.astro` (plus `src/pages/es/projects/`): the view-plus-page pattern for both locales
- `src/i18n/routes.ts` (`stripLocale`/`alternatePath`/`absoluteFor`), `src/i18n/ui.en.ts`/`ui.es.ts` (new strings), `src/lib/seo.ts` with `SeoHead.astro`
- `src/lib/motion/` gate and lifecycle: the facade's click handler should register through the lifecycle registry so it survives future `<ClientRouter />` swaps (Phase 7)

### Established Patterns
- Thin pages delegate to views; both locales share one view
- Bilingual overrides `{ en, es }`; content fallback wrapped in the project's `lang`
- Committed assets, offline build (`scripts/assert-offline.ts`, `offline-guard.ts`); fail-loud override validation
- Tabler icons as explicit SVG imports, Tailwind only, TypeScript strictest

### Integration Points
- New `src/pages/projects/[slug].astro` and `src/pages/es/projects/[slug].astro` via `getStaticPaths` from the query layer
- `ProjectCard` links (already pointing at the final URLs) start resolving, so remove the D-09 e2e skips
- REQUIREMENTS/ROADMAP edits for D-16/D-17

</code_context>

<specifics>
## Specific Ideas

- Treat her Behance canvas as one continuous composition, without breaking it into framed tiles.
- Text should read like the site, not like Behance's dark canvas.
- No dead ends: next/prev wraps around, and the next-project teaser invites further browsing.
- Privacy and performance: no Figma/third-party request until the visitor asks for it.

</specifics>

<deferred>
## Deferred Ideas

- Scroll reveals and parallax on the detail image stack belong to Phase 7 (motion).
- Per-project canvas background colour (`canvasBg` override) was offered and not chosen.
- Drafting all 154 bilingual module alts was offered and not chosen. Missing alts go to the sync checklist as `TODO(martina)` for gradual filling.
- Filters/search (PROJ-04..07) wait until the sync reports 8 or more projects.

</deferred>

---

*Phase: 04-project-detail-discovery*
*Context gathered: 2026-10-17*
