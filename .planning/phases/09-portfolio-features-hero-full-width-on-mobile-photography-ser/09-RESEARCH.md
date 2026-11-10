# Phase 9: Portfolio Features - Research

**Researched:** 2026-11-10
**Domain:** Astro 7 static site. Responsive hero image and LCP, content-collection data flow (services to categories to contact), and client-side list filtering under `<ClientRouter />`
**Confidence:** HIGH for the codebase findings (read and grepped in this session). MEDIUM for the LCP outcome, which has to be measured.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Hero on mobile
- **D-01:** Keep the sketch-001 arch on the accent-blue ground, but on phones use a **4:5 crop** instead of 3:4. That is about 358×448 at 390px inside the 16px gutters. The semicircle top and the 1.25rem bottom corners stay.
- **D-02:** The portrait stays **above the headline** on mobile (today's `order-first`). [Inference] It will probably become the Home LCP element on mobile.
- **D-03:** Full width applies to **phones only (<640px, below Tailwind `sm`)**. From `sm` up, today's sizes are unchanged: `sm:w-44`, `lg:w-64`, `min-[87.5rem]:w-[19rem]`, all 3:4.
- **D-04:** **Re-measure Home LCP** after the change, using the 08-17 protocol in `08-LIGHTHOUSE.md` "Re-measure rule": mobile simulated, `pnpm dlx lighthouse@13.6.0`, 7 selection runs, then 5 runs each. The budget is 2,500 ms; today it is 1,207 ms. The `sizes` and `widths` must give a phone a correctly sized candidate. Code-review IN-08 already notes that 600w is under-sized at ≥87.5rem on 2x screens.
- **D-05:** Check the hair halo/rim at the larger crop (08-13 SUMMARY: defringe and darken the hair rim on the blue ground). If the larger render shows fringe, fix the asset rather than the layout.

#### Photography service
- **D-06:** New service id `photography`, `order: 5` (last). Title EN **"Photography"**, ES **"Fotografía"**. The short style matches the other titles; the "Servicio de fotografía" wording from the request was not used.
- **D-07:** Items, user-approved 2026-11-10:
  - EN: "Product photography", "Portraits", "Photos for social media", "Editing and retouching"
  - ES: "Fotografía de producto", "Retratos", "Fotos para redes sociales", "Edición y retoque"
  - The rows still go through `pnpm review:spanish` and are marked for Martina's review, like all other copy (QUAL-03 convention).
- **D-08:** Photography must show up everywhere services are consumed: Home FeaturedServices (a vertical list, so a 5th entry needs no layout change), contact ServiceChips, the `?service=photography` preselect, the contact action's service validation, and the email service label.
- **D-09:** `categoryIds` in `src/lib/projects/model.ts` gains `photography`, so `services.json` and the project categories stay one-to-one. `card-view.ts` already fails loudly if a category id is missing from services.json.

#### Projects filter
- **D-10:** Filter by the **service categories** (`project.category`, curated in `project-overrides.json`), **not raw Behance tags**. The user first chose raw tags, then switched after seeing the real list on 2026-11-10: about 50 tags, mixed EN/ES/PT, with duplicates, mostly on one project each.
- **D-11:** This overrides the Phase 4 conditional rule (D-16: filters only at ≥8 projects) for the category filter. The project still has 7. PROJ-04 ("curated category chips") is now in scope. PROJ-05 (search), PROJ-06 (tool filter) and the search part of PROJ-07 stay N/A.
- **D-12:** **Single-select chips with "All"** (EN "All", ES "Todos"), one active at a time, like tabs. Order follows services.json `order`.
- **D-13:** **Hide categories with no projects.** Photography shows no chip until a project is assigned to it. Today's chips: All (7), Graphic design (2), Web design (3), Branding (1), Social media (1).
- **D-14:** The selected category is stored in the URL as `?category=<id>` (shareable, works with back/forward), and the result count is announced in a polite live region (e.g. "3 projects" / "3 proyectos"). An unknown or empty `?category` value falls back to All. Without JS, all projects show.
- **D-15:** It must work in both EN and ES, with full keyboard use, reduced motion and axe coverage (the requirement from the handoff). Filtering must not leak ScrollTriggers or reveal state across `<ClientRouter />` navigations (Phase 6/7 lifecycle rules).

#### Categories data
- **D-16:** **One category per project**, as today. No data-model change to `category`.
- **D-17:** Keep the current assignments: Cabrera's → social-media; PuroV, Mart → graphic-design; Reciclick, Portfolio, InstaBlogs → web-design; Visual system → branding.

### Claude's Discretion
- Where the chips sit on /projects/ and how they look (they must pass the taste-skill house rules; reusing the ServiceChips pill style is a candidate).
- Whether chips are `<button aria-pressed>` or a radio group, and how the live region is worded, as long as it meets WCAG and the keyboard e2e.
- Motion when the filter changes, which must degrade to an instant change under reduced motion.
- Unit and e2e test split; the e2e must take turns on the shared port 4400 (see HANDOFF).

### Deferred Ideas (OUT OF SCOPE)
- Projects in more than one category (e.g. InstaBlogs = Web design + Branding): decided against for now (D-16).
- Text search and tool filter (PROJ-05/06): still conditional on ≥8 projects.
- Assigning projects to Photography: this needs Martina's photography work on Behance first.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROJ-04 | Visitor can filter projects by curated category chips (now in scope through D-11, with no ≥8 condition) | Radio-group chips built from the categories that have visible projects; `hidden` on the `<li>`; tile rhythm recomputed with `tileSize(i, visibleCount)` (Patterns 1–3) |
| PROJ-07 (non-search part) | Filter state is in the URL, the result count is announced, and there is a reset | `?category=` written with `history.replaceState(history.state, …)`; a polite `role="status"` count; "All" is the reset (the empty state can't be reached because of D-13) (Patterns 4–5, Pitfalls 1–3) |
| **HOME-09** *(proposed new)* | On phones (<640px) the hero portrait is a full-width 4:5 arch above the headline. From `sm` up it is unchanged. Home mobile LCP stays under 2.5 s, re-measured with the 08-17 protocol | Hero `widths`/`sizes`/radius math (Pattern 6), measured candidate bytes, LCP re-measure (Pitfall 6) |
| **HOME-10** *(proposed new)* | Visitor sees Photography as a 5th service on Home and can ask about it: contact chip, `?service=photography` preselect, server validation, Spanish email label. EN and ES rows are marked for Martina's review | Consumer inventory (Pattern 7), the `assertCount(4)` blocker (Pitfall 4) |
| HOME-04 *(wording change)* | Today: "Visitor sees her 4 most featured services". It must become "her services (5)", or the planner must record that the requirement text changes | `buildServices` hard-asserts exactly 4 entries (`src/lib/content/home.ts:94`) |

*HOME-08 already exists (the "Ask about this" preselect), so the new IDs start at HOME-09. [VERIFIED: REQUIREMENTS.md grep]*
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Astro 7.4 + TypeScript `~6.0.3` (strictest tsconfig) + Tailwind 4.3 via `@tailwindcss/vite`. Use pnpm for everything.
- Tabler icons are imported per file as Astro SVG components (`@tabler/icons/outline/x.svg`). Never use barrels.
- Accessibility is non-negotiable. Heavy motion must degrade with reduced motion.
- Performance: measure, don't guess. The eager JS ceiling is **22,000 B gzip per page** (`EAGER_CEILING_GZIP` in `scripts/measure-bundle.ts`). The user's rule is to cut code or defer it, never to raise the ceiling (memory "defer deferrable JS").
- **Don't add dependencies until needed.** This phase needs no new packages.
- Quality gates: no type, lint or test failures. Add tests when behaviour changes.
- **The taste skill is required** for every visual change (hero, chips): apply its house rules, run `lint.mjs` and `inspect.mjs` (at `~/.claude/plugins/cache/taste-skill/taste-skill/2.0.0/skills/taste-skill/scripts/`), and review the screenshots.
- GSD commits are pre-approved: Conventional Commits, scope = plan id, no co-author lines. `/security-review` runs once per phase, scoped to the phase base commit (memory "Scope security-review to the phase").
- Plans that touch `src/styles/global.css` or layout must also run `smooth-scroll.spec.ts`, `contact-lazy.spec.ts` and `anchors.spec.ts` (memory "post-merge gate has no e2e").
- Playwright uses fixed port 4400 with `reuseExistingServer: false`, so runs must take turns (HANDOFF). macOS has no `timeout` command.

## Summary

All three features are small in code but touch many places. The research found five things that are not obvious from CONTEXT.md and that the plans must cover:

1. **The ClientRouter owns history.** Astro's router (`node_modules/astro/dist/transitions/router.js`) treats any popstate to an entry with state as its own navigation. It compares against a private `originalLocation`, and a different `search` means a **full page swap onto itself**. So `history.pushState` per chip click would make Back/Forward wipe and re-render /projects/. **Use `history.replaceState(history.state, '', url)`** (the 07-11 CR-01 precedent in `nav-focus.ts`). Then apply the URL's category to `event.newDocument` in **`astro:before-swap`**, because the router restores the saved scroll position *before* `astro:after-swap` and before `astro:page-load`. [VERIFIED: router.js and events.js source]
2. **Hiding cards breaks the grid rhythm.** Tile spans come from `tileSize(index, count)` at build time (L S · S L · … E). The visible subset must be re-sized with the same pure function, or the filtered grid gets holes (for example a lone `large-end` with `col-start-3`). [VERIFIED: layout.ts, ProjectCard.astro]
3. **Adding a 5th service fails the build today.** `buildServices` calls `assertCount(entries, 4, 'services')`. About 6 unit tests and 3 e2e specs hard-code 4 services or 5 radios. One e2e test asserts that /projects/ has **no** filter UI and **no** `[aria-live]`, so it must be inverted. [VERIFIED: grep]
4. **There is no ScrollTrigger on /projects/.** Card reveals use IntersectionObserver, and parallax is a CSS `view-timeline`. Both handle `display:none` correctly: hidden cards never intersect and reveal when shown. Lenis `autoResize` (ResizeObserver, default `true`) follows the height change. So filtering needs no motion refresh calls. [VERIFIED: reveal.ts, global.css, lenis.mjs]
5. **The hero becomes an image LCP on mobile.** The Lighthouse mobile slot (412px at DPR 1.75) needs about 665 device px. With `widths=[256,448,640,768,1024]` it picks 768w AVIF = **32.7 KB** (today 256w = 7.1 KB). That is measured with the same sharp encoder Astro uses. The 4:5 arch needs a **40%** vertical radius (3:4 uses 37.5%) to keep a true semicircle. [VERIFIED: sharp probe matches the built files byte for byte; geometry]

**Primary recommendation:** Build the filter as a native radio group (the ServiceChips pattern) plus a tiny client module. The module (a) parses `?category=` through an allow-list, (b) toggles `hidden` and re-applies `tileSize()` through a `data-tile` attribute, (c) writes the URL with `replaceState`, (d) announces the count, and (e) pre-applies the URL state to `newDocument` in `astro:before-swap`. Bump every service consumer from one updated `categoryIds` tuple, with three-way drift guards.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Category chips (which ones, labels, order, hiding empty ones) | Build time (Astro SSG, ProjectsView) | — | Static data: services.json order plus visible projects. No runtime fetch. |
| Filtering cards and re-sizing tiles | Browser (small client module) | CSS (`hidden`, data-attribute variants) | Static output means there's no server to filter by query string |
| `?category=` URL state, back/forward | Browser (History API, cooperating with ClientRouter) | — | Must not fight the router's `originalLocation` and state objects |
| Count announcement | Browser (live region, localized strings from build-time data attributes) | — | The dictionaries must not ship to the client (the existing fields.ts rule) |
| Photography service data | Build time (content collection `services`) | — | Single source: `src/data/services.json` |
| Service validation and email label | API (Astro Action on the Cloudflare Worker) | — | `contactSchema` `z.enum(SERVICE_CHOICES)` plus `serviceTitlesEs` |
| Hero portrait sizing and art | Build time (`astro:assets` Picture at compile) / CDN static | Browser (srcset selection) | `imageService: 'compile'`. Candidates are generated at build. |

## Standard Stack

No new packages. Everything is already installed and pinned. [VERIFIED: package.json]

### Core (in use)
| Library | Version | Purpose in this phase |
|---------|---------|-----------------------|
| astro | 7.4.0 | `<Picture>` widths/sizes, content collection `services`, `astro:before-swap` `newDocument` hook, Actions |
| tailwindcss / @tailwindcss/vite | 4.3.3 | `noscript:` variant (`@media (scripting: none)`) [VERIFIED: present in `node_modules/tailwindcss/dist/lib.js`], data-attribute variants, preflight `[hidden]{display:none!important}` [VERIFIED: preflight.css:396] |
| @tabler/icons | 3.49.0 | `outline/check.svg` already used by ServiceChips (reuse for the chip check mark if the UI-SPEC wants it) |
| vitest / happy-dom | 5.0.5 / 21.0.3 | Unit tests for the pure parse and layout functions and for DOM application |
| @playwright/test + @axe-core/playwright | 1.64.1 / 4.14.0 | Filter e2e, keyboard order, axe in EN and ES |
| sharp | 0.35.5 | (Already present.) Used here only to probe candidate sizes; Astro uses it for build transforms |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Radio group | `<button aria-pressed>` toggle buttons | 5 Tab stops instead of 1, a custom single-select invariant, and `projects.spec.ts` already treats `[aria-pressed]` as "filter UI". The radio group is native, matches ServiceChips (same look, same tests) and gives arrow-key selection. |
| `replaceState` | `pushState` per chip | Breaks under ClientRouter: Back to the router's entry triggers a self-swap (wipe plus re-render). See Pitfall 1. |
| JS `hidden` toggle | Pure CSS `:has(input[value=x]:checked)` filtering | Works without JS, but can't re-run the `tileSize` rhythm, can't announce or write the URL, and needs a class per category. Not worth it with D-14's "without JS, all projects show". |
| A `@media (scripting: none)` hide (`noscript:hidden`) | Hide the chips in HTML and unhide them with JS | Unhiding above the grid causes a layout shift (CLS) on every load. `noscript:` keeps the space reserved for JS visitors and removes inert chips for no-JS visitors. |

**Installation:** none.

## Package Legitimacy Audit

No external packages are installed or added in this phase. slopcheck was not run because there was nothing to check.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
BUILD (astro build, static)
 services.json ──► content collection `services` ──┬─► buildServices (Home list, 5 entries)
                                                   ├─► ServiceChips (contact radios: 5 + other)
                                                   ├─► buildCategoryTitles (card/detail labels)
                                                   └─► actions/index.ts serviceTitlesEs (email label)
 categoryIds (model.ts) ═══ SERVICE_IDS (fields.ts) ═══ services.json ids   ◄── drift-guard tests
 snapshot + overrides ─► getAllProjects(locale) ─► cards[{…, categoryId}]
                                                   │
                     ProjectsView ─► chips = categories in services order with ≥1 visible card
                                   ─► <fieldset data-category-filter class="noscript:hidden"> radios (All checked)
                                   ─► <p role="status" data-count-one data-count-other>  (empty at load)
                                   ─► ProjectGrid <li data-category=… data-tile=…>

BROWSER
 full load /projects/?category=x ──► filter module (eager, small) ─► parseCategoryParam(search, allowed)
                                                                    ─► apply(doc, id): hidden + data-tile + radio.checked
 radio `change` (lifecycle-bound) ─► apply ─► history.replaceState(history.state,'',url) ─► status.textContent = "3 projects"
 soft nav / Back into /projects/?category=x
     router: fetch HTML ─► astro:before-swap  ──► apply(event.newDocument, parse(event.to.search))   [app-scoped listener]
                       ─► swap ─► router scrollTo(saved) (layout already filtered) ─► after-swap ─► page-load ─► lifecycle mount (binds change)
 IntersectionObserver reveals: hidden cards never intersect; shown cards reveal (or are already revealed)
 Lenis autoResize (ResizeObserver) follows the new page height
```

### Recommended Project Structure (new and changed files)
```
src/lib/projects/filter.ts        # NEW, pure, Node-safe: buildCategoryChips(cards, order), visibleTiles(ids[]) using tileSize
src/lib/projects/category-param.ts# NEW, pure, client-safe: parseCategoryParam(search, allowed) → id | 'all'; withCategory(url, id)
src/lib/ui/category-filter.ts     # NEW, client: applyCategory(doc, id), initCategoryFilter (lifecycle), bindBeforeSwap (app-scoped)
src/components/ui/CategoryFilter.astro  # NEW: fieldset + radios + status region + <script>
src/components/views/ProjectsView.astro # host the filter above ProjectGrid
src/components/ui/ProjectCard.astro     # data-category, data-tile, size classes via data-[tile=…] variants
src/lib/projects/model.ts         # categoryIds += 'photography'; ProjectCardView += categoryId
src/lib/projects/card-view.ts     # toCardView sets categoryId
src/lib/contact/fields.ts         # SERVICE_IDS += 'photography' (or derive from categoryIds)
src/lib/content/home.ts           # assertCount 4 → categoryIds.length (5)
src/data/services.json            # photography entry (D-06/D-07)
src/i18n/ui.en.ts / ui.es.ts      # filter legend, "All"/"Todos", count one/other
src/components/sections/Hero.astro# phone 4:5 full width, widths/sizes, radius 40% below sm
```

### Pattern 1: Native radio group for single-select chips (reuse ServiceChips)
**What:** `<fieldset>` + `<legend>` (visible or `sr-only` per UI-SPEC) + `input[type=radio][name=category].peer.sr-only` + a `<label>` pill. "All" (`value="all"`) is checked in the HTML. Do **not** wrap it in a `<form>`: the ClientRouter intercepts `submit`, and nothing gets submitted anyway.
**Why:** One Tab stop, arrow keys move and select (selection follows focus, like auto-activated tabs). Filtering content in place is not a "change of context" under WCAG 3.2.2, so selecting on arrow is allowed. [CITED: WCAG 2.2 SC 3.2.2 Understanding doc, ASSUMED interpretation] The pill class string with the 2px border (WCAG 1.4.11) already passed taste and axe in Phase 5. [VERIFIED: ServiceChips.astro]
**Ids:** Prefix them (`projects-category-${id}`) so they never collide with `contact-service-*`.
```astro
<fieldset data-category-filter class="noscript:hidden m-0 min-w-0 border-0 p-0">
  <legend class="…">{t('projects.filter.legend')}</legend>
  <div class="flex flex-wrap gap-2">
    {[{ id: 'all', label: t('projects.filter.all') }, ...chips].map((c) => (
      <div>
        <input type="radio" name="category" id={`projects-category-${c.id}`} value={c.id}
               checked={c.id === 'all'} class="peer sr-only" />
        <label for={`projects-category-${c.id}`} class={chip}>{c.label}</label>
      </div>
    ))}
  </div>
</fieldset>
<p role="status" data-category-status class="sr-only|visible-per-UI-SPEC"
   data-count-one={t('projects.filter.countOne')} data-count-other={t('projects.filter.countOther')}></p>
```

### Pattern 2: The DOM apply is pure and idempotent and works on any Document
`applyCategory(doc: Document, id: CategoryId | 'all'): number` sets `hidden` on every `li` whose `data-category` ≠ id (null-category cards show only under All). It checks the matching radio, re-sizes the visible tiles in DOM order with `tileSize(i, visibleCount)` by writing `data-tile`, and returns the visible count. It is called with the live `document` (load, change) **and** with `event.newDocument` (before-swap), so it must not use `window` or `location`. Unit-testable in happy-dom. [VERIFIED precedent: navigation.ts already mutates `event.newDocument` in before-swap, lines 186–212]

### Pattern 3: Tile size by data attribute, not class swapping
Today `ProjectCard` puts `sizeClasses[size]` (`md:col-span-7` and so on) on the `<li>` and `aspectClasses[size]` on the frame. Emit `data-tile={size}` on the `<li>` and express the classes as literal data variants, for example `md:data-[tile=large]:col-span-7 md:data-[tile=small]:col-span-5 md:data-[tile=large-end]:col-span-8 md:data-[tile=large-end]:col-start-3`. The frame uses `group/tile` + `group-data-[tile=small]/tile:md:aspect-[7/8]`. JS then only rewrites `data-tile`, and Tailwind sees every class at build time. The Home "row" (`third`) layout keeps working through the same attribute. [ASSUMED: exact Tailwind 4 variant ordering. Verify with `pnpm build` and `projects-grid.spec.ts`. Fallback: export the literal class maps from `layout.ts` and swap tokens.]
Optional: also rewrite `sizes` on `<source>`/`<img>` with the new tile's string, so a card promoted from `small` (40vw) to `large` (57vw) can pick a larger candidate. Low impact: candidates top out at 808w.

### Pattern 4: URL state that cooperates with ClientRouter
```ts
// Source: modeled on src/lib/motion/nav-focus.ts (07-11 CR-01) and router.js samePage/onPopState
function writeCategory(win: Window, id: string): void {
  const url = new URL(win.location.href);
  if (id === 'all') url.searchParams.delete('category');
  else url.searchParams.set('category', id);
  // Keep the router's own state object (index, scrollX, scrollY): no new entry, back/forward intact.
  win.history.replaceState(win.history.state, '', url.href);
}
```
`parseCategoryParam(search, allowed)` mirrors `parseServiceParam`: `getAll('category')`. Exactly one value that is in `allowed` (the **rendered** chip ids, so `photography` with no projects falls back) wins. Missing, empty, wrong-case, unknown or repeated values give `'all'`.

### Pattern 5: Lifecycle split (no leaks)
- **App-scoped, registered once at module evaluation:** a `document.addEventListener('astro:before-swap', e => { if (e.newDocument.querySelector('[data-category-filter]')) applyCategory(e.newDocument, parseCategoryParam(e.to.search, allowedFrom(e.newDocument))) })`. The module runs once per session under ClientRouter (`runScripts` skips already-executed `src`). [VERIFIED: router.js `detectScriptExecuted`; lifecycle comment in motion/index.ts]
- **Page-scoped through `lifecycle.register(initCategoryFilter)`:** apply from `location.search` (idempotent; covers the first load) and bind one delegated `change` listener on the fieldset with an `AbortController`. The cleanup aborts it. The listener count stays constant for `navigation-leaks.spec.ts`.
- Live region: write `textContent` only on user `change`, never on load or before-swap, so nothing is announced on arrival. Use `count === 1 ? one : other` with `{count}` interpolated (Spanish `Intl.PluralRules` gives `many` only for millions). Strings come from build-time `data-count-*`.
- Note on timing: lifecycle mount waits for the wipe release on soft navs (`bindToAstro` + `waitForRelease`). That is why first paint can't rely on the lifecycle init and needs the before-swap hook. [VERIFIED: lifecycle.ts:66–103]

### Pattern 6: Hero phone crop
- Picture classes: `w-full sm:w-44 lg:w-64 min-[87.5rem]:w-[19rem]`. Image: `aspect-[4/5] sm:aspect-[3/4]`. Radius: `rounded-[50%_50%_1.25rem_1.25rem/40%_40%_1.25rem_1.25rem] sm:rounded-[50%_50%_1.25rem_1.25rem/37.5%_37.5%_1.25rem_1.25rem]`. A semicircle needs a vertical radius of w/2: 3:4 → 1.5/4 = 37.5%, 4:5 → 2/5 = **40%**. [VERIFIED: geometry; today's value at Hero.astro:62]
- The wrapper's `lg:justify-self-end` already applies only at lg. On phones the grid cell is full width.
- `sizes="(min-width: 87.5rem) 19rem, (min-width: 64rem) 16rem, (min-width: 40rem) 11rem, calc(100vw - 2rem)"`. The gutter is `px-4` (16px each side) below `sm`.
- `widths={[256, 448, 640, 768, 1024]}`. Keep `width={600} height={800}`: the intrinsic ratio stays 3:4 and the CSS aspect crops. That keeps `home.spec.ts`'s width/height attribute assertions valid, or update them deliberately.

Measured candidate bytes (sharp defaults, identical to the built `dist` files for 256/448/600): [VERIFIED: tmp probe vs `dist/client/_astro/portrait.*`]

| width | AVIF B | WebP B | Who picks it |
|---|---|---|---|
| 256 | 7,127 | 14,676 | — |
| 448 | 14,966 | 36,096 | sm (176px × DPR2) |
| 640 | 25,224 | 61,738 | lg and ≥87.5rem at DPR2 (fixes IN-08's 608px need) |
| 768 | 32,659 | 82,700 | **Lighthouse mobile** (380 CSS px × 1.75 = 665), 390px phones at DPR2 (716) |
| 1024 | 49,645 | 129,250 | 390–430px phones at DPR3 (1,074–1,194 → capped at 1024, about 2.6–2.9x, visually fine) |
| 1200 | 60,144 | 160,296 | (not recommended: +10 KB for DPR3 only) |

### Pattern 7: Service consumer inventory (D-08/D-09). Every place that must change
| File | Today | Change |
|---|---|---|
| `src/data/services.json` | 4 entries | + `photography`, order 5, D-06/D-07 copy |
| `src/lib/projects/model.ts:9` | `categoryIds` 4-tuple | + `'photography'` (last) |
| `src/lib/contact/fields.ts:11` | `SERVICE_IDS` 4-tuple | + `'photography'`. [Inference] Better: `export const SERVICE_IDS = categoryIds` (model.ts is erasable TS with only type imports, so there's no bundle cost) |
| `src/lib/content/home.ts:94` | `assertCount(entries, 4, 'services')` | `assertCount(entries, categoryIds.length, …)` (the build otherwise **throws**) |
| `src/lib/contact/schema.ts` | `z.enum(SERVICE_CHOICES)` | automatic |
| `src/lib/contact/submit.ts` `serviceTitlesEs` | iterates SERVICE_IDS | automatic, and throws if JSON lacks the id |
| `src/lib/contact/email.ts` | `serviceTitlesEs[input.service]` | automatic ("Fotografía") |
| `src/lib/contact/service-param.ts`, `src/lib/ui/service-preselect.ts`, `src/lib/motion/nav-focus.ts` | allow-list through `isServiceChoice` | automatic (`#contact-service-photography` is rendered by ServiceChips) |
| `src/components/contact/ServiceChips.astro`, `FeaturedServices.astro` | map over services | automatic |
| `src/lib/projects/overrides-schema.ts` | `z.enum(categoryIds)` | automatic |
| `src/lib/projects/card-view.ts` `buildCategoryTitles` | throws on a missing id | automatic |
| `scripts/behance/parse.ts:175` `FIELD_CATEGORIES` | no photography | [Open Q2] optionally `['photography','photography']`. It is a checklist hint only, "never applied automatically" |
| `scripts/spanish-review.ts` | iterates services.json | automatic. **Must re-run `pnpm review:spanish`** (the freshness test fails otherwise) |
| `src/data/roles.json` (marquee) | no photography role | not in D-08 → [Open Q1] |

### Anti-Patterns to Avoid
- **`history.pushState` for chip changes:** self-swap on Back (Pitfall 1).
- **Applying the filter only in a lifecycle init:** it mounts after the wipe release, so you get a flash of all cards and a wrong scroll restore (Pitfall 2).
- **Using CSS `nth-*` or leaving the build-time spans on filtered tiles:** holes in the grid. The layout docstring already forbids `nth-*` rules.
- **Importing `src/i18n/ui.*.ts` into the client module:** ships the whole dictionary. Pass strings as data attributes (the contact-form pattern, `data-contact-strings`).
- **Writing `?category` values into the DOM with `innerHTML`:** the value is attacker-controlled. Allow-list it and use `textContent`/`dataset` only.
- **A `<form>` around the chips:** the ClientRouter `submit` handler would navigate.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Single-select keyboard model | roving tabindex / `aria-pressed` buttons | native `input[type=radio]` group | Arrow keys, one Tab stop and a checked state for free. Same as ServiceChips. |
| Tile rhythm for N visible cards | a new layout algorithm | `tileSize(index, count)` from `src/lib/projects/layout.ts` | Already unit-tested, and it is what the "All" view uses |
| `?param` allow-listing | ad-hoc `includes` | a copy of the `parseServiceParam` shape (`getAll`, exactly one, allow-list) | Its edge cases (repeated, wrong case, empty) are already worked out and tested |
| Hide/show | inline `style.display` | `hidden` attribute | Tailwind preflight `[hidden]{display:none !important}`. Semantic, and screen readers skip it |
| No-JS hide | `<noscript><style>` | Tailwind `noscript:hidden` (`@media (scripting: none)`) | Already in Tailwind 4.3.3, and no inline style block |
| Re-measuring Lighthouse | a custom script | the 08-17 protocol (`pnpm dlx lighthouse@13.6.0`, mobile simulated, 7+5+5 runs, quiet machine, own preview port, e.g. 4485) | Comparable with the 1,207 ms baseline |

## Common Pitfalls

### Pitfall 1: pushState plus ClientRouter equals a self-swap on Back
**What goes wrong:** Going Back from a pushed `?category=` entry to the router's entry fires `onPopState` with non-null state. The router calls `transition('back', originalLocation, location)`, and because `samePage` needs the same `search` and no hash, it fetches /projects/ and **swaps it onto itself** (wipe, reveal replay). Forward into a router-state entry does the same. [VERIFIED: router.js:7, 279–284, 453–472]
**How to avoid:** Use `replaceState(history.state, '', url)`, as in Pattern 4. Back/forward *between pages* still restores the filter, because the history entry's URL carries `?category=`.
**Interpretation risk:** D-14 says "works with back/forward". With `replaceState`, pressing Back after picking a chip leaves /projects/ (it does not step back through chip choices). This is the standard tab behaviour, but **confirm with the user** (Open Q3).

### Pitfall 2: A stale router `originalLocation` after replaceState
**What goes wrong:** The router decides "same page" against its private `originalLocation` (set at load or at the last router navigation). After `replaceState` changes `search`, a same-page hash link (the **skip link** `#main`) resolves to `/projects/?category=x#main`. The router sees a different `search`, so it does a full self-swap instead of a fragment jump. This is the same class of bug as 07-11 CR-01. [VERIFIED: router.js 279; nav-focus.ts:121–127 comment]
**How to avoid:** In `nav-focus.ts` `bindAnchorFocus`, add a branch for same pathname + same search **when the page has `[data-category-filter]`** (or a generic `data-owns-search` marker the filter sets on `<html>` after its first replaceState). Handle it locally the way the `?service=` branch does: `preventDefault`, `replaceState(history.state, '', withHash)`, scroll into view, `land()`. Unit-test it in `nav-focus.test.ts` and e2e-test "filter, then skip link, then no wipe and focus on #main".
**Warning sign:** `data-vt` appears on `<html>` (the wipe ran) after pressing the skip link on a filtered page.

### Pitfall 3: Restoring a filtered entry flashes and lands at the wrong scroll position
**What goes wrong:** On Back to `/projects/?category=x`, the router calls `doSwap` → `moveToLocation` → `scrollTo(saved)` **before** `astro:after-swap`, and long before the lifecycle mount (which waits for the wipe release). Filtering later shrinks the page under the restored offset, and every card is visible until the filter runs. [VERIFIED: router.js:243–245; lifecycle.ts]
**How to avoid:** Apply the filter in `astro:before-swap` on `event.newDocument` (Pattern 5). e2e: filter, scroll, open a card, go Back, then assert the filtered count is visible and the scroll offset is roughly preserved.

### Pitfall 4: The 5th service fails the build and many tests
**Hard blockers:** `src/lib/content/home.ts:94` `assertCount(…, 4, …)` throws during `astro build`.
**Tests that hard-code 4 services, 5 radios or "no filter"** [VERIFIED: grep]:
- `tests/unit/content-home.test.ts` (lines 48–54 "exactly 4 entries in order", 197, 259–261 messages)
- `tests/unit/featured-services.test.ts:142–163` (`<h3>` ×4, `<li>` ×22 → 27 with 4 photography items + 1 card, "Consultar:" ×4)
- `tests/unit/contact-section.test.ts:113` (radios ×5 → 6)
- `tests/unit/project-card-view.test.ts:37,108–126` (titles map and missing-ids message: `Record<CategoryId,string>` fixtures need `photography`, or the type check fails)
- `tests/unit/project-detail-site.test.ts:37` (same `Record<CategoryId,…>` fixture)
- `tests/unit/nav-focus.test.ts:171`, `tests/unit/service-preselect.test.ts:8` (fixture radio lists. They still pass but should list photography)
- `tests/e2e/home-story.spec.ts:204–214` ("four cards", `toHaveCount(4)`), `:341` (no-JS `toHaveCount(4)`)
- `tests/e2e/a11y.spec.ts:62–66` comments plus `serviceSteps` (derived from JSON, so automatic), and `expectedProjectsOrderFor` (**insert the chip radio stop** between the motion toggle and the first project link)
- `tests/e2e/projects.spec.ts:146–154` "has no filter or search UI": **invert or replace** it (it bans `input` and `[aria-live]` in main)
- `tests/e2e/home.spec.ts:58–80` `expectArch(375, 128)` 3:4 and radius `50% 37.5%`: becomes full width, 4:5, `40%` below 640px
**How to avoid:** One plan owns "services 4→5" with all the unit fixes in the same commit, and the drift guards: services.json ids (by order) === `categoryIds` === `SERVICE_IDS`.

### Pitfall 5: The Spanish review freshness and TODO line pins
**What goes wrong:** `tests/unit/spanish-review.test.ts` fails when `08-SPANISH-REVIEW.md` is stale (new services rows, new `projects.filter.*` keys). It also pins `NON_COPY_TODOS` by **file:line**, e.g. `src/components/sections/Hero.astro:10` (the IN-09 stale TODO). Editing Hero imports above line 10, or removing the TODO, breaks `keeps the non-copy TODO(martina) items in place`. [VERIFIED: scripts/spanish-review.ts:28–43, test:162–175]
**How to avoid:** After any copy edit, run `pnpm review:spanish`. When touching Hero.astro, update the `NON_COPY_TODOS` entry (and `NON_COPY_TODO_FILES` if the TODO is removed per IN-09), then regenerate.

### Pitfall 6: The Home LCP element changes on mobile
**What changes:** Today the mobile LCP is the hero lead text (`p[data-hero-lead]`, 1,207 ms). A 380×475 CSS px portrait will be larger than the lead, so it becomes the LCP. The request grows from 7.1 KB (256w) to 32.7 KB (768w). [VERIFIED bytes; ASSUMED outcome] The estimate is still well under 2,500 ms, but it **must be measured** (D-04). The portrait has no opacity animation (only `clip-path` inset 35% → 0 and `scale`), so it counts as an LCP candidate from its first frame. [VERIFIED: global.css:619–680]
**Also:** the Phase 8 evidence goes stale once src changes. The re-measure context must record the new `git log -1 --format=%h -- src`. Run Lighthouse on its own preview port (08-14 used 4485) on a quiet machine, and never during a Playwright run.
**Other hero tests:** `motion-lcp.spec.ts` (MEASURE_LCP=1, 390×844) is informational. `motion-hero.spec.ts` checks the shutter selectors (unchanged).

### Pitfall 7: The eager JS budget and the "defer deferrable" rule
**Measured now:** /projects/ and /es/projects/ eager = **15,884 B** gzip. The max is 17,958 B on `/`, and the ceiling is 22,000 B. [VERIFIED: `pnpm measure:bundle` on the current dist, 2026-11-10] The filter module is needed before first paint for deep links (Pitfall 3), so it can't be idle-loaded. Keep it tiny: no zod, no dictionaries, no GSAP. Import only `tileSize` and the parse function. [ASSUMED] It should be about 1–1.5 KB gzip. The planner should add an acceptance check that `/projects/` eager stays ≤ about 17.5 KB and that `/` is unchanged (the filter must not land in a shared chunk loaded on Home).

### Pitfall 8: The first card is eager and LCP-protected
With a deep link such as `?category=branding`, the eager cover (index 0) may be hidden. It still downloads (eager image in `display:none`), and the first *visible* card is a lazy shutter card. That's acceptable for deep links only. Lighthouse measures the unfiltered URL. Don't try to move `fetchpriority` dynamically.

## Code Examples

### Applying to the incoming document (before-swap)
```ts
// Source: pattern from src/lib/motion/navigation.ts (event.newDocument in astro:before-swap)
document.addEventListener('astro:before-swap', (event) => {
  const root = event.newDocument.querySelector('[data-category-filter]');
  if (root === null) return;
  const allowed = [...root.querySelectorAll<HTMLInputElement>('input[name="category"]')].map((i) => i.value);
  applyCategory(event.newDocument, parseCategoryParam(event.to.search, allowed));
});
```

### Pure parse (mirrors parseServiceParam)
```ts
export function parseCategoryParam(search: string, allowed: readonly string[]): string {
  const values = new URLSearchParams(search).getAll('category');
  if (values.length !== 1) return 'all';
  const [value] = values;
  return value !== undefined && value !== 'all' && allowed.includes(value) ? value : 'all';
}
```

### Rhythm for the visible subset
```ts
import { tileSize } from '../projects/layout';
const visible = items.filter((li) => !li.hidden);
visible.forEach((li, i) => { li.dataset['tile'] = tileSize(i, visible.length); });
```

## Runtime State Inventory

Not a rename or migration phase. Checked anyway, because adding an enum value touches stored data:

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | `src/data/project-overrides.json` categories validate against `z.enum(categoryIds)`. Adding a value is backward-compatible, so no existing record changes (D-17). The committed Behance snapshot has no category. | None |
| Live service config | None. Cloudflare/Resend config has no service list. | None |
| OS-registered state | None | None |
| Secrets/env vars | None reference service ids | None |
| Build artifacts | `node_modules/.astro` image cache: new hero widths are generated on the next build (expected) | Rebuild |

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `<noscript><style>` | `@media (scripting: none)` (Tailwind `noscript:` variant) | No inline style block. Supported in current evergreen browsers [ASSUMED: Chrome 120+/Firefox 113+/Safari 17+] |
| ScrollTrigger refresh after DOM changes | IntersectionObserver + CSS `view-timeline` (this codebase) | Hiding or showing needs no refresh call |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Home mobile LCP stays well under 2,500 ms with a 32.7 KB 768w AVIF as the LCP image | Pitfall 6 | Medium: would need a smaller candidate set, `quality` tuning or a size cap. Mitigated by the mandatory D-04 re-measure |
| A2 | Tailwind 4 `md:data-[tile=…]:` / `group-data-[…]/tile:` variant syntax compiles as written | Pattern 3 | Low: fall back to swapping literal class maps exported from layout.ts |
| A3 | The filter client module is about 1–1.5 KB gzip | Pitfall 7 | Low: measured by `pnpm measure:bundle` |
| A4 | Changing the selection on arrow keys does not violate WCAG 3.2.2 (no change of context) | Pattern 1 | Low: the button alternative exists |
| A5 | `replaceState` meets the user's meaning of "works with back/forward" (D-14) | Pitfall 1 | Medium: if the user expects per-chip history steps, a router-compatible approach needs deeper work (intercepting `astro:before-preparation` for same-path search changes) |
| A6 | `scripting: none` browser support as stated | State of the Art | Low: worst case, no-JS visitors on old browsers see inert chips with all projects shown |

## Open Questions (RESOLVED)

1. **Add "Photography / Fotografía" to the roles marquee (`roles.json`)?**
   - Known: D-08 lists the consumers and the marquee isn't among them. HOME-02 says "all the roles/jobs she does".
   - Recommendation: don't add it unless the user confirms. Ask at plan check.
   - RESOLVED: not added (09-CONTEXT.md, Claude's Discretion).
2. **Map the Behance field "Photography" in `suggestCategory`?**
   - Known: it's a sync checklist hint only ("never applied automatically"). The phase boundary excludes "new Behance sync behaviour".
   - Recommendation: add the one map row plus one test row to keep categories one-to-one (D-09), or skip it explicitly. Low risk either way.
   - RESOLVED: skipped. Sync is out of scope (09-CONTEXT.md, Claude's Discretion).
3. **Back/forward semantics (D-14):** should each chip change create a history step?
   - Recommendation: `replaceState` (Pitfall 1). Confirm with the user, because pushState conflicts with ClientRouter.
   - RESOLVED: the user confirmed `replaceState` (09-CONTEXT.md D-14a).
4. **Language switcher on a filtered page:** EN↔ES hrefs are built at build time and drop `?category=`.
   - Recommendation: out of scope (you land on All). Optional small enhancement: the filter rewrites the switcher hrefs' search. Raise it as an idea only.
   - RESOLVED: out of scope, deferred (09-CONTEXT.md, Claude's Discretion).
5. **The count region: visible text or screen-reader only?** That's a UI-SPEC call (the parallel 09-UI-SPEC.md). The research only requires that it exists in the DOM at load and is empty until the first change.
   - RESOLVED: follows 09-UI-SPEC.md (sr-only status text).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | build/tests | ✓ | 24.15.0 (eslint-plugin-astro wants ≥24.16; already tolerated) | — |
| pnpm | everything | ✓ | 12.14.0 | — |
| Playwright Chromium | e2e | ✓ | chromium-1228/1232 cached | — |
| sharp | image probe/build | ✓ | 0.35.5 | — |
| Lighthouse 13.6.0 | D-04 re-measure | via `pnpm dlx` (network) | — | none; must run online |
| taste-skill scripts | visual gate | ✓ | 2.0.0 (`lint.mjs`, `inspect.mjs`) | — |
| Port 4400 | Playwright | shared | — | take turns or use a mkdir lock (HANDOFF) |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.5 (happy-dom), Playwright 1.64.1 + axe 4.14.0 |
| Config file | `vitest.config.ts` (getViteConfig), `playwright.config.ts` (port 4400, `astro preview`) |
| Quick run command | `pnpm test` (72 files, 1,323 tests, about 8 s, baseline green 2026-11-10) |
| Full suite command | `pnpm verify` (lint, test, build + e2e, secrets) plus `pnpm measure:bundle` and `pnpm review:spanish` freshness |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROJ-04 | Chips = All + categories with ≥1 visible project, in services order; photography hidden | unit | `pnpm vitest run tests/unit/projects-filter.test.ts` | ❌ Wave 0 |
| PROJ-04 | Selecting a chip hides the others, the rhythm is recomputed, and the grid has no holes, EN and ES | e2e | `pnpm exec playwright test tests/e2e/projects-filter.spec.ts` | ❌ Wave 0 |
| PROJ-07 | `?category=` parse: allow-list, repeated/unknown/empty → all | unit | `pnpm vitest run tests/unit/category-param.test.ts` | ❌ Wave 0 |
| PROJ-07 | URL updated with replaceState (history length unchanged), deep link applies on load, Back from detail restores filter and scroll, count announced (`role=status` text), All resets | e2e | `projects-filter.spec.ts` | ❌ Wave 0 |
| PROJ-07 | before-swap applies to newDocument; the lifecycle cleanup aborts the listener | unit | `pnpm vitest run tests/unit/category-filter.test.ts` | ❌ Wave 0 |
| PROJ-04/07 | Skip link on a filtered page does a fragment jump, not a swap | unit + e2e | `tests/unit/nav-focus.test.ts`, `projects-filter.spec.ts` | ✅ extend |
| PROJ-04 | Keyboard: chips are one Tab stop, arrows select; projects Tab order updated | e2e | `tests/e2e/a11y.spec.ts`, `keyboard-journeys.spec.ts` | ✅ extend |
| PROJ-04 | axe clean EN/ES (filtered and unfiltered, scripts on and off) | e2e | `a11y.spec.ts`, `a11y-sweep.spec.ts`, `projects.spec.ts` (invert line 146) | ✅ update |
| PROJ-04 | Reduced motion: an instant change, nothing left un-revealed | e2e | `projects-filter.spec.ts` with `reducedMotion: 'reduce'` | ❌ Wave 0 |
| PROJ-04 | No listener leak over 10 navigations | e2e | `tests/e2e/navigation-leaks.spec.ts` | ✅ (should pass unchanged) |
| HOME-10 | services.json ids === categoryIds === SERVICE_IDS (drift) | unit | `tests/unit/contact-fields.test.ts`, `content-home.test.ts` | ✅ update |
| HOME-10 | Action accepts photography; email label "Fotografía" | unit | `contact-schema.test.ts`, `contact-email.test.ts`, `contact-submit.test.ts` | ✅ extend |
| HOME-10 | `?service=photography` preselects the chip | unit + e2e | `service-preselect.test.ts`, `contact-preselect.spec.ts` | ✅ extend |
| HOME-10 | 5 service cards, 6 radios, Spanish review fresh | unit + e2e | `featured-services.test.ts`, `contact-section.test.ts`, `spanish-review.test.ts`, `home-story.spec.ts` | ✅ update |
| HOME-09 | <640px: full width 4:5 arch, radius 40%; ≥640px unchanged 3:4 | e2e | `tests/e2e/home.spec.ts` (`expectArch`) | ✅ update |
| HOME-09 | Phone gets the ≥665px candidate; srcset has 768/1024 | e2e | `home.spec.ts` (`currentSrc` at 412×DPR1.75 context) | ❌ add |
| HOME-09 | Home mobile LCP < 2,500 ms | manual-measure | 08-17 protocol, `pnpm dlx lighthouse@13.6.0` (not CI, needs network and a quiet machine) | manual |
| Budget | `/projects/` eager stays small; `/` unchanged | script | `pnpm build && pnpm measure:bundle` | ✅ |
| Visual | Hero and chips pass the taste gate | manual + script | taste `lint.mjs`, `inspect.mjs` + screenshots | manual |

### Sampling Rate
- **Per task commit:** `pnpm test` (plus `pnpm lint` when touching `.astro` or types)
- **Per wave merge:** `pnpm test` + the listed e2e specs for the touched area (take turns on port 4400). Layout/CSS waves also run `smooth-scroll.spec.ts`, `contact-lazy.spec.ts` and `anchors.spec.ts`.
- **Phase gate:** full `pnpm verify` (hermetic `E2E_OFFLINE=1` plus `@network`), `pnpm measure:bundle`, `pnpm review:spanish` fresh, the Lighthouse re-measure, and the taste gate, all before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `tests/unit/category-param.test.ts`: parse and URL write
- [ ] `tests/unit/projects-filter.test.ts`: chip building, hiding empty categories, visible-subset rhythm
- [ ] `tests/unit/category-filter.test.ts`: applyCategory on a Document, before-swap, cleanup, live-region text
- [ ] `tests/e2e/projects-filter.spec.ts`: EN/ES, deep link, Back restore, keyboard, reduced motion, axe, skip link
- [ ] Invert `tests/e2e/projects.spec.ts:146` "has no filter or search UI"

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | `?category=` allow-listed against the rendered chip values, `?service=` through `isServiceChoice`, server `z.enum(SERVICE_CHOICES).catch('other')` (astro/zod) |
| V6 Cryptography | no | — |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| DOM XSS through a crafted `?category=<img onerror>` | Tampering | Allow-list. Never interpolate the param into HTML. `textContent`/`dataset` only |
| Open redirect / cross-origin URL write | Tampering | Build the URL from `location.href` with the `URL` API. `replaceState` is same-origin by spec |
| Email header injection through the service label | Tampering | Already `sanitizeHeader`. The label comes from server-side services.json, not the client |
| Forged service value in the Action POST | Tampering | `z.enum(...).catch('other')`. Unknown values become "Sin especificar" |

## Sources

### Primary (HIGH confidence, read in this session)
- `node_modules/astro/dist/transitions/router.js` (samePage, moveToLocation, onPopState, script execution order), `events.js` (TransitionBeforeSwapEvent `newDocument`, `to`), `components/ClientRouter.astro` (click/submit interception)
- `node_modules/tailwindcss/dist/lib.js` (`noscript` → `@media (scripting: none)`), `preflight.css:396`
- `node_modules/lenis/dist/lenis.mjs` (`autoResize = true`, ResizeObserver)
- Codebase: Hero.astro, ProjectsView/ProjectGrid/ProjectCard, layout.ts, reveal.ts, lifecycle.ts, motion/index.ts, nav-focus.ts, navigation.ts, services.json, model.ts, card-view.ts, overrides-schema.ts, home.ts, queries.ts, fields.ts, schema.ts, submit.ts, email.ts, service-param.ts, service-preselect.ts, ServiceChips.astro, actions/index.ts, spanish-review.ts, measure-bundle.ts, global.css (hero keyframes, parallax)
- Tests: content-home, featured-services, contact-section, contact-fields, project-card-view, spanish-review, nav-focus (unit); a11y, projects, home, home-story, motion-lcp (e2e)
- Measurements: `pnpm test` (1,323 green), `pnpm measure:bundle` on the current dist, sharp candidate probe matching `dist/client/_astro/portrait.*`

### Secondary
- `.planning/phases/08-quality-verification/08-LIGHTHOUSE.md` (re-measure rule, Lantern notes), `08-REVIEW.md` IN-08/IN-09, `08-13-SUMMARY.md` (halo), `.planning/HANDOFF-phase-8-9.md`

### Tertiary (LOW, not verified this session)
- WCAG 3.2.2 interpretation for selection-follows-focus radios. `scripting` media query browser support versions.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH. No new dependencies; installed versions verified.
- Architecture: HIGH for the router and lifecycle interplay (read from source); MEDIUM for the Tailwind data-variant syntax (needs a build).
- Pitfalls: HIGH (grep- and source-backed); MEDIUM for the LCP outcome (bytes measured, timing must be measured).

**Research date:** 2026-11-10
**Valid until:** 2026-12-10 (stable pinned stack; re-check if astro or tailwind versions change)
