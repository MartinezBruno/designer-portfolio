# Phase 2: Homepage Story - Context

**Gathered:** 2026-10-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Four static homepage blocks are added to the Phase 1 skeleton, in EN at `/` and ES at `/es/`:
- the availability badge (HOME-07)
- the roles marquee with its pause control (HOME-02, HOME-03)
- Martina's 4 featured services (HOME-04)
- the apps/tools she uses (HOME-05)

Out of scope:
- latest Behance projects (HOME-06, Phase 3)
- service cards linking to the contact form (HOME-08, Phase 5)
- GSAP, Lenis, reveals, and the motion toggle (Phases 6–7)

**This discussion ran after `02-UI-SPEC.md` and `02-RESEARCH.md` were approved.** Where a decision below conflicts with them, **this file wins**. Every conflict is marked **[AMENDS UI-SPEC]** or **[AMENDS SC3]**. The planner must apply the amendments and keep the rest of the UI-SPEC.

</domain>

<decisions>
## Implementation Decisions

### Content: real copy replaces the drafts
- **D-01:** Martina supplied real content in a mockup (`02-client-mockup.png`). It replaces the UI-SPEC drafts for roles, services, and tools. Her source copy is **Spanish**. English is our translation, and both are marked for her review (QUAL-03).
- **D-02:** **Copy polish is allowed** (user: "Polish freely"): make bullets parallel, tighten wording, fix typos ("merchandasing", "en gral"). Meaning must stay hers. Mark polished strings `TODO(martina)` for review in the SUMMARY "Known Stubs".
- **D-03: Roles (marquee), exactly these 4, in this order:**

  | id | ES (source) | EN |
  |----|-------------|----|
  | `web-design` | Diseño web | Web design |
  | `branding` | Branding | Branding |
  | `social-media-manager` | Social media manager | Social media manager |
  | `graphic-design` | Diseño gráfico | Graphic design |

  The 6 draft roles in the UI-SPEC are dropped.
- **D-04: [AMENDS UI-SPEC] Service cards show a title plus a bullet list (`<ul>`), not a 1–2 sentence description.** The `description` field becomes a localized `items` array of strings. The "≤ 2 sentences / ~120 chars" copy rule no longer applies. Cards may be different heights within a row. Equal height still comes from the grid stretch, so no fixed heights and no `line-clamp`. Bullets use real list semantics. The visual bullet style (dash or dot) is Claude's discretion within the tokens.
- **D-05: Service order follows the mockup's reading order:** 1 Graphic design, 2 Web design, 3 Branding, 4 Social media. Service `id`s stay the stable kebab-case ids from the UI-SPEC (`graphic-design`, `web-design`, `branding`, `social-media`) because Phase 5 pre-selection keys on them.
- **D-06: In the Branding card, "Identidad visual" is the first bullet**, not an intro line or part of the title.
- **D-07: Service content (polished drafts based on her bullets, for her review):**

  | id | Title ES / EN | Items ES | Items EN |
  |----|---------------|----------|----------|
  | `graphic-design` | Diseño gráfico / Graphic design | Diseño de merchandising y packaging · Marcas de agua · Miniaturas y portadas · Piezas multimedia | Merchandise and packaging design · Watermarks · Thumbnails and covers · Multimedia pieces |
  | `web-design` | Diseño web / Web design | Wireframes y assets · Diseño responsive · Prototipado · Revisión y comentarios · Diseño UX/UI | Wireframes and assets · Responsive design · Prototyping · Design reviews and feedback · UX/UI design |
  | `branding` | Branding / Branding | Identidad visual · Logo · Tipografía · Paleta de colores · Mockups · Aplicación de la marca en web y gráfica | Visual identity · Logo · Typography · Color palette · Mockups · Brand applications for web and print |
  | `social-media` | Social media / Social media | Gestión de redes sociales · Diseño de historias y publicaciones · Diseño del feed | Social media management · Story and post design · Feed design |

  Her original "Comentarios" (web design) is ambiguous. It was polished to "Revisión y comentarios" and flagged for her to confirm.

### Availability badge
- **D-08: [AMENDS SC3 and UI-SPEC] When she's unavailable, the badge is hidden, not shown in a closed state.** `profile.json` → `availability.available: false` renders nothing. SC3 now reads "changing one content value shows/hides the badge after rebuild, with no code change". Drop the `availability.closed` dictionary key and the hollow-ring style. The e2e test asserts the badge is present when `true` and absent when `false`.
- **D-09:** The initial value is `available: true` (confirmed by the user, not an assumption).
- **D-10: [AMENDS UI-SPEC copy] Wording: EN "Open to new projects" / ES "Abierta a nuevos proyectos"** (key `availability.open`).
- **D-11:** Placement stays as in the UI-SPEC: a pill at the top of the hero text column, above the greeting. Static, no motion, not a live region.

### Tools
- **D-12: Tools are exactly these 5, in mockup order:** Adobe Illustrator, Adobe InDesign, Adobe Photoshop, Figma, Adobe Lightroom. Canva, CapCut, and Meta Business Suite are dropped. Names are brand names and are not translated.
- **D-13:** Every tool gets a Tabler icon (uniform monochrome line icons, `currentColor`): `brand-adobe-illustrator`, `brand-adobe-indesign`, `brand-adobe-photoshop`, `brand-figma`. **Lightroom has no Tabler icon** (verified in `@tabler/icons` 3.49.0), so it uses the generic `brand-adobe`. Tool icon keys become `illustrator`, `indesign`, `photoshop`, `figma`, `lightroom`.
- **D-14: [AMENDS UI-SPEC] Tiles are icon-only.** The name is not visible at rest. It is exposed as the accessible name (sr-only) and shown in a **tooltip on hover, focus, and tap, at every screen size**.
  - Tiles become focusable, which adds 5 tab stops after the marquee pause button. Update the keyboard-order e2e test.
  - The tooltip must meet **WCAG 1.4.13**: dismissible with Esc, hoverable without disappearing, persistent until dismissed or blurred. It must not be the only label (sr-only name always present).
  - Touch needs tap-to-show. Opening one tooltip closes the others.
  - The tooltip is a second small script next to the marquee toggle. It registers through the Phase 1 lifecycle registry with `AbortController` cleanup. With JS off, the sr-only name still serves AT, and a CSS `:hover`/`:focus-visible` fallback for the visual tooltip is preferred.
  - Tooltip motion uses `motion-safe:` only. No accent fill (see D-15/D-17 for the color rules).
  - Research must choose the semantics (e.g., a focusable element with `aria-describedby` pointing to the tooltip vs. the name as the label with a visual-only tooltip) so the name isn't announced twice.

### Primary color and marquee band
- **D-15: [AMENDS Phase 1 + Phase 2 UI-SPEC] The client's primary color is `#0F70B7`, and it replaces `--color-accent`** (`#4b2ee8` → `#0f70b7`) in `src/styles/global.css`. It's a single token swap that recolors the hero CTA, 404 CTA, focus rings, and footer link underline site-wide. `--color-accent-ink` stays `#ffffff`.
  - Measured contrast (WCAG formula, 2026-10-16): white on #0F70B7 = **5.22:1**; #0F70B7 on surface = **4.89:1**; on surface-alt = **4.33:1**.
  - Re-run the Phase 1 axe and e2e tests after the swap.
- **D-16: [AMENDS UI-SPEC] The marquee band is a full-bleed `#0F70B7` (`bg-accent`) band with white (`text-accent-ink`) role text,** matching the mockup. Add "marquee band background" to the exhaustive accent-usage list.
- **D-17: Focus inside the band must not use the accent ring** (#0F70B7 on #0F70B7 = 1:1). The pause button on the band uses a **white focus outline** (5.22:1 against the band). Verify with axe and by computing the ratio for whatever the button's own fill is.

### Claude's Discretion
- Asterisk separators and pause button styling on the blue band (e.g., white or white-with-opacity separators, which are decorative and `aria-hidden`; button fill/border chosen to keep icon contrast ≥ 3:1). Compute every new ratio.
- Bullet marker style in service cards, and keeping or dropping the service icon chips (the UI-SPEC keeps them; the mockup has none, and the user didn't ask to change card style, so **keep the UI-SPEC card style**).
- Tooltip visual design (ink or surface fill, position, arrow) within the existing tokens.
- Content file format: the user didn't discuss it, so the research default applies (localized `file()` JSON collections).
- The 40s marquee loop duration stays (UI-SPEC). Re-check that 4 roles still fill at least 100% of the track width at wide viewports. If not, research must handle it (e.g., more copies or a `min-w-full` strategy).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 2 contracts
- `.planning/phases/02-homepage-story/02-UI-SPEC.md`: approved visual and interaction contract. Applies everywhere except the **[AMENDS]** items above.
- `.planning/phases/02-homepage-story/02-RESEARCH.md`: patterns (localized `file()` collections, `motion-on` variant, CSS marquee, pause toggle, query layer with count guards, typed icon maps) and pitfalls.
- `.planning/phases/02-homepage-story/02-VALIDATION.md`: test map and sampling.
- `.planning/phases/02-homepage-story/02-client-mockup.png`: **Martina's mockup**, the source of the roles, services, apps, blue band, and primary color. Reference only (Figma-as-reference rule still applies to layout).

### Project-level
- `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md` (HOME-02..05, HOME-07), `.planning/ROADMAP.md` §Phase 2 (SC3 amended by D-08)
- `.planning/phases/01-bilingual-walking-skeleton/01-UI-SPEC.md`: inherited tokens, focus ring, touch targets, and accent list (accent value amended by D-15)
- `.planning/phases/01-bilingual-walking-skeleton/SKELETON.md`: motion gate and lifecycle registry conventions
- `.planning/research/FEATURES.md`: marquee and tool-grid anti-patterns (no skill bars, no second marquee)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/sections/Hero.astro`: the badge goes in as the first child of the text column (`flex flex-col gap-6`).
- `src/components/views/HomeView.astro`: the only component that reads collections. Sections get plain localized props.
- `src/lib/motion/{gate,lifecycle,index}.ts`: `html[data-motion]` gate plus lifecycle registry. Both the marquee toggle and the tooltip script register here.
- `src/i18n/ui.en.ts` / `ui.es.ts` (`satisfies Dictionary`) and `src/i18n/t.ts`: new keys `availability.open`, `roles.heading`, `roles.pause`, `services.heading`, `tools.heading`. **Do not add `availability.closed`.**
- `src/styles/global.css` `@theme`: holds `--color-accent` (swap per D-15). The `--text-*` reset means only `text-sm/base/2xl/5xl` compile.
- `src/data/site.ts`: existing `TODO(martina)` TS-config pattern.

### Established Patterns
- Tabler raw SVG per-file imports (`@tabler/icons/outline/*.svg`) as Astro SVG components, used through typed key maps.
- No string literals in components. Only one `set:html` exists in `src/` (the motion gate inline script).
- `TODO(martina)` markers plus SUMMARY "Known Stubs" for content awaiting her review.

### Integration Points
- `tests/e2e/a11y.spec.ts` keyboard-order test: add the pause button **and 5 tool tiles**.
- `tests/e2e/layout.spec.ts`: no horizontal overflow at 320px (the blue band is full-bleed).
- Phase 5 will key contact pre-selection on the service `id`s from D-05.

</code_context>

<specifics>
## Specific Ideas

- Visual reference: the client mockup's solid blue role band with large white text, the 4 services as bullet-list cards, and the app icons in a row.
- The client explicitly asked for `#0F70B7` as the site's primary color.
- The client's own wording is Spanish and should come through. English is the translation, not the source, for this content.

</specifics>

<deferred>
## Deferred Ideas

- Mockup card style (white cards, black border, drop shadow, centered serif titles) and short headings ("Servicios", "Apps"): these were offered and the user didn't take them up. The UI-SPEC card style and headings stand. Revisit with Martina in Phase 8 review if she asks.
- A full brand palette beyond the primary. The `success` green (`#1F7A4D`, open-state badge dot) stays a placeholder, and brand fonts are still pending.

</deferred>

---

*Phase: 02-homepage-story*
*Context gathered: 2026-10-16*
