# Phase 3: Real Behance Work - Research

**Researched:** 2026-10-17
**Domain:** Build-time data snapshot (scraped Behance JSON), typed source-agnostic model, Astro static pages (Home section + Projects list) in EN/ES
**Confidence:** HIGH for the toolchain and data-shape findings (verified by spike and a live probe today). MEDIUM for how long the Behance challenge replay keeps working (it works today, but nothing guarantees it).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Consent & data source
- **D-01:** Martina has given **written** consent (confirmed by the user). Record it as a **one-line note** in `docs/CONSENT.md`, for example: "Martina Fernandez approved syncing her Behance content into this site in writing on <date>." Use no quote and no screenshot. This file must be committed **before** any sync script code (SC1). The user supplies the date, or it is left as `TODO(martina-date)` and flagged.
- **D-02:** **There is no Behance API key**, confirmed by the user. The scrape-based snapshot hybrid from `research/STACK.md` §1.3 stays the approach: profile `beconfig-store_state`, then project pages with the `js_challenge_value` cookie replay and the same UA.
- **D-03:** Martina's **account credentials are never used, requested, or stored.** The sync reads only public pages.
- **D-04:** The research guardrails stay in force: manual runs only (never CI-scheduled, never at runtime in a Worker), about 2 s between requests, a link back to Behance, and Playwright as plan B if the challenge hardens.

#### Project count
- **D-05: The confirmed count is 7.** Evidence: the live profile `profileProjects` returned 7 with `hasMore: false` on 2026-10-16, which matches the RSS count of 7. The "14" in PITFALLS.md is superseded. **PROJ-04..07 are N/A** for Phase 4.
- **D-06:** Every sync run prints the project count. If it reaches **8 or more**, it prints a prominent notice to revisit PROJ-04..07 filters. This is a notice, not a failure.

Live data on 2026-10-16 (id | Behance slug | publishedOn):
`238078789 Cabreras-motos-Posts 2025-11` · `227934855 PuroV 2025-06` · `226450035 Website-Reciclick 2025-05` · `202447185 Portfolio-web 2024-07` · `185594991 Sistema-visual 2023-11` · `176799549 Website-InstaBlogs 2023-08` · `172473551 Mart 2023-06`

#### URLs & routing
- **D-07:** The Projects list lives at **`/projects`** and **`/es/projects`**, with an unlocalized path segment. It reuses `stripLocale`/`alternatePath`/`absoluteFor` from `src/i18n/routes.ts` with no changes, and the language toggle, hreflang and canonical work as they do today.
- **D-08:** Detail URLs are **`/projects/<slug>`** and **`/es/projects/<slug>`**. The slug is a **clean lowercase slug** derived from the Behance slug: lowercase, accents and `´`/apostrophes stripped, non-alphanumerics collapsed to `-`. For example, `Cabreras-motos-Posts` becomes `cabreras-motos-posts`. An optional `slug` override renames it. **A duplicate slug fails the build.**
- **D-09: Before Phase 4, cards link to the final detail URLs and those URLs 404.** The user accepted this for the local-only v1 build. E2e link checks must exclude `/projects/<slug>` targets until Phase 4, using an explicit, commented skip that Phase 4 removes. Do not generate stub pages, and do not link to Behance in the interim.

#### Titles, language & card content
- **D-10: Titles get bilingual overrides.** The override field is `title: { en, es }`. Without one, the card shows the Behance title as-is in both locales, wrapped in an element with the project's content `lang`. Phase 3 drafts all 7 EN/ES pairs and marks them `TODO(martina)`. Example: "Sistema visual" becomes EN "Visual system" / ES "Sistema visual".
- **D-11: Cards show cover, title, category, year, tools and a short summary.** On Home, the compact variant drops tools and summary (D-15).
- **D-12: Each project has exactly one primary category**, chosen from the 4 Phase 2 service ids: `graphic-design`, `web-design`, `branding`, `social-media`. Category labels come from the existing localized service titles, so there's no new category list. The initial value is seeded from Behance creative fields (the keywords-meta heuristic) and set in overrides.
- **D-13:** **Year** comes from `publishedOn`. **Tools** come from Behance `tools[]` (structured, reliable). Phase 4 is where tool display names get normalized, if needed.
- **D-14: Short summary** is a 1-line bilingual `{ en, es }` override, because Behance descriptions are empty. Phase 3 drafts all 7 as `TODO(martina)`. Without one, the card shows no summary line.
- **D-15: Cover alt text** comes from an optional bilingual `coverAlt: { en, es }` override. The fallback is derived from the localized title, for example "Reciclick website — cover". **Behance's auto alt text ("Image may contain: …") is never used.**

#### Projects page & Home section
- **D-16: Home "latest work" section:** a localized heading (EN "Latest work" / ES "Trabajo reciente", final wording up to the UI-SPEC), **3 compact cards**, and a **"See all projects"** link to `/projects`. It goes between FeaturedServices and ToolsRow, where `HomeView.astro` already has a placeholder comment.
- **D-17: [AMENDS HOME-06] `featured: true` pins a project to Home.** Featured projects take Home slots first, ordered by `order` then by date. Any remaining slots fill with the latest by `publishedOn`. With nothing featured, the behavior matches the original HOME-06. The Projects page stays **newest first**, with `order` as a manual tiebreak or override.
- **D-18: The Projects page is an asymmetric masonry with a fixed size rhythm by position.** It is a repeating size pattern (for example large, small, small, wide…) on a CSS grid. **DOM order, tab order and visual reading order all stay newest first.** It collapses to one column on mobile. The taste skill tunes the exact pattern, and it must avoid layout shift by using cover dimensions from the snapshot.
- **D-19:** One `ProjectCard` component has a `compact` variant for Home and a full variant for Projects. The full card adds tools and summary. Information never exists only on hover.
- **D-20:** The header nav adds **"Projects" / "Proyectos"** before Contact, with `aria-current="page"` on the Projects page. Update the keyboard-order e2e test.

#### Sync behavior
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

### Deferred Ideas (OUT OF SCOPE)
- Module image downloads (up to 1920px) and the full detail-page content are Phase 4 (D-21).
- Filters and search (PROJ-04..07) are N/A at 7 projects. The sync's ≥8 notice (D-06) triggers a revisit.
- Normalizing tool display names (for example "Adobe Illustrator" vs her Phase 2 tool list) belongs in Phase 4 if needed.
- Per-project `size` override for the masonry was offered and not chosen. A fixed rhythm is used instead.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-01 | Consent obtained and documented before the sync script is built | D-01 wording. `docs/CONSENT.md` is the first commit of the sync slice, and a verification step checks with `git log` that it predates `scripts/sync-behance*`. See "Consent note" |
| DATA-02 | `pnpm sync:behance` writes a committed snapshot with locally optimized images | Sync flow (Pattern 3). Covers stored as originals in `src/assets/projects/` and optimized by `astro:assets` at build, verified offline in the spike. Only covers this phase (D-21) |
| DATA-03 | Sync fails loudly and never overwrites a good snapshot | Failure gates G1–G9, staging plus atomic `rename` (verified that a file rename replaces the target and a dir rename over a non-empty dir fails), content-hashed cover names, injected `fetch` for tests |
| DATA-04 | Site builds offline, reading only the snapshot | Direct JSON import and `import.meta.glob` for covers. Spike: `astro build --force` with all sockets/DNS/fetch blocked and `ASTRO_TELEMETRY_DISABLED=1` made **0 network attempts** and exited 0 |
| DATA-05 | Local overrides: category, alt text, featured/order/hidden | `src/data/project-overrides.json` keyed by Behance id, validated by Zod. Unknown id, bad category or duplicate slug throws at build (Pattern 2) |
| DATA-06 | Source-agnostic typed model | `src/lib/projects/model.ts` (types) with `sources/behance-snapshot.ts` as the only Behance-aware module. ESLint `no-restricted-imports` blocks `**/sources/**` from `src/components/**` and `src/pages/**` |
| HOME-06 (amended D-17) | Home shows featured first, then latest by date, 3 cards linking to detail URLs | Pure `selectHomeProjects()` with unit tests. Section placed at the existing HomeView placeholder |
| PROJ-01 | Projects page, newest first, both locales | Thin `src/pages/projects/index.astro` and `src/pages/es/projects/index.astro` over `ProjectsView.astro`. `getRelativeLocaleUrl` verified to return `/projects/` and `/es/projects/` |
</phase_requirements>

## Project Constraints (from CLAUDE.md / AGENTS.md)

- Stack is fixed: Astro 7.4.0, TypeScript `~6.0.3` (never 7.x), `astro/tsconfigs/strictest` (this includes **`exactOptionalPropertyTypes`** and **`noUncheckedIndexedAccess`**, verified in `node_modules/astro/tsconfigs/strictest.json`), Tailwind 4.3 via `@tailwindcss/vite` (Tailwind is the only styling), and pnpm for everything.
- Tabler icons are explicit per-file SVG imports (`@tabler/icons/outline/<name>.svg`), never barrels.
- No `any` or `unknown` in source code. Prefer inference (`z.infer`). If types are unclear, stop and clarify.
- Don't add dependencies until they're needed. This phase needs **zero new packages** (see the audit).
- Quality gates: `pnpm lint` (astro check + ESLint + `prettier --check .`) and `pnpm test` must pass. Add tests whenever behavior changes. Run `pnpm lint` after moving files or changing imports.
- Measure, don't guess: git size and build time of the covers must be measured and recorded (D-21).
- Accessibility is required: semantic HTML, managed focus, no information that shows only on hover.
- **Taste skill is required** for every visual change: the `taste-skill:taste-skill` house rules, `lint.mjs` plus `inspect.mjs` on the result, and a screenshot review before visual work counts as done. `ui_phase: true` in config, so a `03-UI-SPEC.md` should exist before UI plans execute.
- GSD workflow commits are pre-approved: Conventional Commits, lowercase, imperative, under 50 chars, scope = plan/phase id, no Claude or co-author attribution. `/security-review` runs once at phase end.
- Components contain no string literals (all copy goes in `ui.en.ts`/`ui.es.ts` with `satisfies Dictionary`). The only `set:html` in `src/` is the motion gate.
- Only `text-sm/base/2xl/5xl` (plus `text-lead`, `text-display`) compile. Other `text-*` sizes silently produce nothing.

## Summary

The data path is settled and was re-verified today. A live probe on 2026-10-17 shows the profile still embeds `beconfig-store_state` with **7 projects and `hasMore: false`** (`cursor: "Nw=="`). The project-page JS challenge is still the 453-byte page that sets `js_challenge_value=<128 hex>`, and replaying that cookie with the same UA returns the 566 KB page with the store. The profile list has **no tools or tags**, so the sync must fetch all 7 project pages anyway (D-13 needs `tools[]`). A full `project.project` object is about 54 KB compact (78 KB pretty-printed) for a 6-module project. Covers have **no height** in the JSON, the `allAvailable[]` order is largest to smallest (so `.at(-1)` is the 115 px thumbnail, a trap), the `JPG` type label is wrong (the bytes are `image/png`, 301 KB for `max_808`), and the `original` variant **302-redirects to a different host** (`mir-cdn.behance.net`). The profile order is not newest first.

The most important architecture finding comes from the Phase 2 spike plus today's spike: **do not put the snapshot behind a Content Layer `file()` loader.** `file()` swallows parse errors and missing files, exits 0 and serves stale or empty data (Phase 2 RESEARCH, Pitfall 1). Importing the snapshot JSON directly into a pure TS adapter and parsing it with `astro/zod` **fails the build with exit 1** in all three bad cases: corrupt JSON, schema violation and missing file (verified today). It also works **inside Vitest**, where `getCollection` returns `[]`. Covers resolve through `import.meta.glob('/src/assets/projects/*', { eager: true })`, which gives `ImageMetadata` (real width and height, so no CLS) and is also unit-testable. With telemetry disabled, a forced build under a hard network block made zero network attempts.

Sync safety comes from three mechanisms. First, every response must pass explicit gates (status, challenge markers, store present, Zod shape, `hasMore === false`, count ≥ 1 and not shrinking unless allowed, ids match, cover bytes are a real image from an allowlisted host). Second, everything is written to a same-filesystem staging dir, and the result is committed by **one atomic `rename` of `snapshot.json`** (verified on this machine: a file rename replaces the target, a directory rename over a non-empty dir fails with `ENOTEMPTY`). Third, covers get **content-hashed filenames**, so a new run never overwrites a file the old snapshot references. Build the sync core as `runSync(deps)` with injected `fetch`, `sleep` and paths, so the challenge, empty and partial cases are plain Vitest tests.

**Primary recommendation:** Wave 1 ships the typed `Project` model, pure builders (slug, sort, featured pinning, overrides merge and validation), the snapshot Zod schema, a hand-written **seed snapshot** (the 7 known projects, placeholder covers, `"origin": "seed"`) and the overrides file. Wave 2 then runs **UI** (ProjectCard, LatestWork section, Projects page, nav) and **Sync** (consent note → `runSync` → real run replaces the seed) in parallel. The phase gate asserts `origin === "behance-sync"` and `pnpm build:offline` is green.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Fetch Behance (profile, project pages, covers) | Dev machine CLI (`scripts/`) | — | D-04: manual only. Never runs in build, CI or Worker |
| Validate and normalize raw Behance JSON into the snapshot | Dev machine CLI | Shared pure TS (`src/lib/projects/*.ts`, Node-strippable) | The same Zod snapshot schema guards the write (sync) and the read (build) |
| Persist snapshot and covers | Git repo (committed files) | — | DATA-04: build reads only committed files |
| Snapshot → `Project` model mapping | Build-time (SSG) adapter `sources/behance-snapshot.ts` | — | DATA-06: only Behance-aware module on the site side |
| Overrides merge, slug, sort, featured pinning | Build-time pure functions (`src/lib/projects/*.ts`) | — | Unit-testable, throws fail `astro build` |
| Image optimization (AVIF/WebP, srcset) | Build-time `astro:assets` | — | Local originals, offline. Sharp is not resolvable from the repo root, so no pre-optimization at sync |
| Card rendering, masonry, nav | Static HTML/CSS (Astro components + Tailwind) | Browser (none, zero JS) | No client JS needed this phase |
| Locale URLs, hreflang, canonical | Build-time (`astro:i18n`, `src/i18n/routes.ts`) | — | Already works for `/es/projects/` (D-07) |

## Standard Stack

### Core (all already installed, versions verified in `package.json` / `node_modules`)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| astro | 7.4.0 | SSG, `astro:assets`, `astro:i18n` | Project stack `[VERIFIED: package.json]` |
| astro/zod (zod) | 4.6.7 (bundled) | Raw Behance schemas, snapshot schema, overrides schema | Importable from **plain Node** (`node -e "import('astro/zod')"` works, `z.looseObject` exists) `[VERIFIED: local run]` |
| Node.js built-ins | Node 24.15.0 (`.nvmrc` 24.22.0) | `fetch`, `fs/promises`, `crypto` (sha256), `path` for the sync | Type stripping is on by default (`process.features.typescript === 'strip'`). `node scripts/x.ts` runs `[VERIFIED: local run]` `[CITED: nodejs.org/api/typescript.html]` |
| vitest | 5.0.5 | Unit and integration tests for builders, adapter and `runSync` | Existing. `import.meta.glob` of images and JSON imports work inside Vitest `[VERIFIED: spike]` |
| @playwright/test + @axe-core/playwright | 1.64.1 / 4.14.0 | e2e for Home section, Projects pages, keyboard order, axe | Existing |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| prettier | 3.9.10 (existing) | `pnpm lint` runs `prettier --check .` over generated JSON | Add the generated snapshot to `.prettierignore` (see Pitfall 7) |
| Playwright Chromium | 1.64.1 (existing devDep) | Plan B for the sync if the challenge hardens (D-04) | Only if gate G2/G3 starts failing on real runs |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct JSON import + Zod parse in the adapter | Content Layer `file()` loader with a `parser` | `file()` swallows parse errors and missing files, so the build exits 0 with stale or empty data `[VERIFIED: Phase 2 spike]`. It also returns `[]` in Vitest. Its `image()` support for `file()` is not documented `[CITED: content-loader-reference, silent on filePath for file()]`. Rejected |
| Direct JSON import | Custom Content Layer loader (ARCHITECTURE.md sketch) | More code. Its `mode: 'live'` sketch conflicts with D-04 (no fetching at build). It is still untestable in Vitest. Rejected for Phase 3 |
| Covers as local files + `import.meta.glob` | `image.remotePatterns` + remote URLs | Build would need network (violates DATA-04). Rejected |
| `astro:assets` at build | Pre-optimize at sync with sharp | sharp isn't resolvable from the root (`ERR_MODULE_NOT_FOUND`, verified), so this would need a new dependency, and 7 covers optimize in milliseconds anyway. Rejected |
| sanitize-html now | Defer to Phase 4 | Phase 3 renders no TextModule HTML (titles only, escaped by Astro). Storing raw HTML as inert data is safe until something renders it. **Defer** (no deps until needed). Phase 4 must sanitize before any `set:html` |

**Installation:** none. This phase adds **no packages**.

## Package Legitimacy Audit

No external packages are installed in this phase. All recommended code uses already-installed, already-approved packages (astro 7.4.0 including `astro/zod`, vitest, playwright) and Node built-ins. slopcheck was **not run**, because there is nothing to check. `sanitize-html` (STACK.md) is deferred to Phase 4. If Phase 4 adds it, run the legitimacy gate there.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| *(none)* | — | — | — | — | — | — |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Verified Behance Facts (live probe 2026-10-17, 7 requests total, 2 s or more apart)

| Fact | Value | Planning impact |
|------|-------|-----------------|
| Profile store path | `store.profile.activeSection.work.profileProjects` (array), `work.hasMore`, `work.cursor` | Raw profile schema. `hasMore: false`, `cursor: "Nw=="` (base64 "7") |
| Profile project keys | `__typename, id, url, slug, name, publishedOn, modifiedOn, publishStatus, privacyLevel, isPrivate, covers, colors, stats, owners, features, …` | **No `tools`, `tags`, modules or fields** in the list. All 7 project pages must be fetched |
| Profile order | Cabrera, PuroV, Reciclick, Portfolio web, **InstaBlogs (2023-08), Sistema visual (2023-11)**, Mart | Not newest first. Always sort by `publishedOn` |
| Exact publishedOn (unix s) | 238078789: 1762478100 · 227934855: 1749658367 · 226450035: 1747886271 · 202447185: 1720062283 · 185594991: 1701221351 · 176799549: 1691028099 · 172473551: 1686103564 | Seed snapshot and sort-test fixtures |
| Title encoding | `Cabrera´s motos, Posts` uses **U+00B4** (acute accent), cleanly encoded in JSON. `Website "Reciclick"` has ASCII quotes | Slug and fallback-title handling. Astro escapes `"` to `&quot;` (spike) |
| Challenge page | HTTP 403, **453 bytes**, `<meta name="robots" content="noindex,nofollow">`, `document.cookie = "js_challenge_value=<128 hex>; Path=/"; window.location.reload();`. No `Set-Cookie` header | Gate G2: detect by status 403 + `js_challenge_value=` + missing store |
| Replay | Same UA + `Cookie: js_challenge_value=<hex>` → **200**, 565,851 bytes, store present | Still works as of 2026-10-17 |
| Project store path | `store.project.project` with `id, slug, name, description (""), url, publishedOn, canvasWidth (1400), stylesInline, tags[], tools[], covers, allModules[], modules[], license {license:"no-use"}, colors, owners, stats, features, aeroData, adminNotices, sourceFiles, …`. `modifiedOn` is **empty** here (present on the profile) | Whitelist fields for the snapshot. Take `modifiedOn` from the profile |
| `modules` vs `allModules` | Identical for this project (6 `ImageModule`) | Store `allModules` only |
| Module discriminator | `__typename` (`ImageModule`, and per STACK.md `TextModule`, `MediaCollectionModule`, `EmbedModule`) | Loose union with an unknown-type passthrough. Warn, don't fail |
| ImageModule keys | `id, src, width, height, fullBleed, caption, altText ("Image may contain: screenshot"), imageSizes {size_disp, size_disp_still, size_1400, size_max_1200, allAvailable[]}, exifData, threeDData, …`. allAvailable widths go up to 3924 (`source`) | Phase 4 picks 1920. Phase 3 just stores it |
| tools[] | `{ id, title: "Adobe Photoshop", url, backgroundImage, backgroundColor, synonym{…} }` | Store `{ id, title }` only |
| Covers | `covers.allAvailable[]`: 14 entries (7 WEBP + 7 JPG) for `original`, `max_808`, `808`, `404`, `202`, `230`, `115`. **Width only, no height.** `original` has `width: null`. Order is largest first | Pick the cover by an explicit rule, never by position |
| Cover bytes | `max_808` (labelled `JPG`): **200, `image/png`, 301,334 bytes**, `cache-control: max-age=2628000`. `original`: **302 → `https://mir-cdn.behance.net/v1/rendition/...`** | Use `max_808`, non-webp. Derive the extension from content-type/magic bytes, not the URL or label. Refuse cross-host redirects |
| Creative fields | Not in JSON. `<meta name="keywords">` = `tools, tags…, fields` (here: `…, visual identity, Graphic Design`). Tags can carry trailing spaces (`"Advertising "`) | Split on `,` and trim, then drop `tools.length + tags.length` leading items. Use only for the checklist's *suggested* category |
| JSON size | `project.project` 53,901 B compact, 52,578 B without `stylesInline`, 77,865 B pretty. `allModules` 22,802 B | Estimate: 7 projects × 40–80 KB pretty ≈ **0.3–0.6 MB** snapshot (larger projects with 68 modules will push this up, so measure) |

## Architecture Patterns

### System Architecture Diagram

```
 DEV MACHINE (manual, D-04)                                   BUILD (offline, DATA-04)                 BROWSER
 ───────────────────────────                                   ────────────────────────                 ───────
 pnpm sync:behance
   │
   ▼
 GET profile ──► gate G1 (200, store, Zod, hasMore=false, count≥1, no shrink)
   │                     │fail → exit 1, src/ untouched
   ▼ for each project (2 s apart, same UA)
 GET gallery ──► 403 + js_challenge? ──yes──► replay w/ cookie ──► gate G2/G3 (200, store, Zod, id match)
   │                                                                        │fail → exit 1
   ▼
 pick cover (max_808, non-webp) ──► GET CDN (allowlisted host, no redirect) ──► gate G4 (image/*, magic bytes, size)
   │
   ▼
 staging dir tmp/behance-sync/<run>/  (covers as <id>-<sha12>.<ext>, snapshot.json)
   │
   ▼  gate G5: SnapshotSchema.parse (same schema the site uses)
 move new covers → src/assets/projects/   (new names only, never overwrite)
 rename staging snapshot.json → src/data/behance/snapshot.json   ◄── single atomic commit point
 delete covers no longer referenced; print count, ≥8 notice, missing-overrides checklist
   │
   ▼  developer reviews diff, commits
 ═══════════════════════════════════════════  git  ═══════════════════════════════════════════
                                                   │
       src/data/behance/snapshot.json ─────────────┤ import (JSON)          src/data/project-overrides.json
       src/assets/projects/*.{png,jpg,webp} ───────┤ import.meta.glob       (import JSON)
                                                   ▼                              │
                       sources/behance-snapshot.ts: SnapshotSchema.parse → toSourceProjects()
                                                   │ (only Behance-aware module)  │
                                                   ▼                              ▼
                       projects.ts (pure): applyOverrides → validate (unknown id / dup slug throw)
                                           → sortProjects / selectHomeProjects → toCardView(locale)
                                                   │
                       queries.ts: getLatestProjects(locale), getAllProjects(locale)
                                                   │
                     HomeView ──► LatestWork section ──► ProjectCard(compact) ─┐
                     ProjectsView ──► ProjectGrid (masonry) ──► ProjectCard ───┤──► static HTML + <picture>
                                                                               └──► /projects/<slug>/ (404 until Phase 4)
```

### Recommended Project Structure
```
docs/
└── CONSENT.md                          # DATA-01, first commit of the sync slice
scripts/
├── sync-behance.ts                     # CLI entry: parses flags, calls runSync with real deps, sets exit code
├── behance/
│   ├── run-sync.ts                     # runSync(deps): orchestrates gates, staging, commit; no globals
│   ├── fetch-page.ts                   # GET with UA, challenge detect + cookie replay, 2 s spacing via deps.sleep
│   ├── parse.ts                        # extractStore(html), keywordsMeta(html), deriveFields()
│   ├── raw-schemas.ts                  # Zod for raw profile/project store slices (loose)
│   ├── covers.ts                       # pickCover(), sniffImage(bytes), hashName()
│   └── fs-commit.ts                    # stage, atomic rename, GC
└── offline-guard.ts                    # --import preload: logs/blocks any non-IPC network use (DATA-04 check)
src/
├── data/
│   ├── behance/snapshot.json           # generated (seed first, then real), committed, prettier-ignored
│   └── project-overrides.json          # hand-edited, keyed by Behance id
├── assets/projects/                    # <id>-<sha12>.<ext> covers (committed)
├── lib/projects/
│   ├── model.ts                        # Project, ProjectCardView types, categoryIds (= service ids)
│   ├── snapshot-schema.ts              # SnapshotSchema (Zod) shared by sync (Node) and build. Node-safe imports only
│   ├── overrides-schema.ts             # OverridesSchema (Zod). Node-safe
│   ├── slug.ts                         # toSlug(). Node-safe
│   ├── projects.ts                     # applyOverrides, assertUniqueSlugs, sortProjects, selectHomeProjects, toCardView
│   ├── sources/behance-snapshot.ts     # imports snapshot.json + glob covers → SourceProject[]
│   └── queries.ts                      # getLatestProjects(locale), getAllProjects(locale)
├── components/
│   ├── ui/ProjectCard.astro            # compact | full
│   ├── sections/LatestWork.astro       # Home section (heading, 3 cards, See all)
│   ├── projects/ProjectGrid.astro      # masonry list
│   └── views/ProjectsView.astro
└── pages/projects/index.astro, pages/es/projects/index.astro
tests/
├── fixtures/behance/                   # synthetic small HTML: profile.html, challenge.html, project-<id>.html, cover.png
└── unit/ projects-*.test.ts, sync-*.test.ts
```
Note: `src/lib/content/queries.ts` is the existing "only collection reader". Either put `getLatestProjects`/`getAllProjects` there (CONTEXT code_context suggests this) or keep them in `src/lib/projects/queries.ts`. Recommendation: **add them to the existing `src/lib/content/queries.ts`**, delegating to `src/lib/projects/*`, so there is still one data entry point for views.

### Pattern 1: Snapshot read path (direct import, fail-loud, Vitest-friendly)
**What:** The adapter imports the JSON, parses it with Zod at module evaluation, and joins covers through an eager glob.
**When to use:** All build-time reads of the snapshot.
```ts
// Source: spike 2026-10-17 (/tmp/p3spike, astro build --force offline, exit 0; vitest pass)
import type { ImageMetadata } from 'astro';
import raw from '../../../data/behance/snapshot.json';
import { SnapshotSchema } from '../snapshot-schema';

// Glob must be a string literal; keys come back as '/src/assets/projects/<file>' (verified).
const covers = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/projects/*.{png,jpg,jpeg,webp}',
  { eager: true },
);

const snapshot = SnapshotSchema.parse(raw); // throws → astro build exit 1 (verified)

export function coverFor(file: string): ImageMetadata {
  const mod = covers[`/src/assets/projects/${file}`];
  if (mod === undefined) throw new Error(`snapshot: missing cover file ${file}. Re-run pnpm sync:behance`);
  return mod.default;
}
```
Verified behavior: a corrupt JSON gives `builtin:vite-json threw an error` with exit 1. An empty `projects` array with `.min(1)` gives a ZodError `too_small` with exit 1. A missing file gives `UNRESOLVED_IMPORT` with exit 1. `ImageMetadata.width/height` are the real file dimensions, so `<Picture>` gets intrinsic sizes and no CLS.

### Pattern 2: Overrides merge and validation (pure, throws fail the build)
```ts
// [Proposed] shape. Keyed by Behance id (string of digits).
// src/data/project-overrides.json
{
  "238078789": {
    "title": { "en": "Cabrera's Motos posts", "es": "Posteos Cabrera's Motos" },   // TODO(martina)
    "summary": { "en": "…", "es": "…" },                                          // TODO(martina)
    "category": "social-media",
    "featured": false,
    "hidden": false
  }
}
```
- Schema: `z.record(z.string().regex(/^\d+$/), OverrideSchema)`. `OverrideSchema = z.strictObject({ slug?, title?: localized, summary?: localized, coverAlt?: localized, category?: z.enum(categoryIds), featured?: z.boolean(), order?: z.number().int(), hidden?: z.boolean(), contentLang?: z.enum(['en','es']) })`. Use **`strictObject`** so a typo like `"catgory"` fails instead of being silently ignored.
- `categoryIds` must be the Phase 2 service ids. Derive them from one `as const` tuple (as `serviceIconKeys` in `icons.ts` does), and add a unit test that asserts the tuple equals `services.json` ids.
- Validation throws: an override id not in the snapshot ("unknown id"), duplicate final slugs, an invalid category (Zod).
- **Hidden projects still take part in the duplicate-slug check.** Otherwise un-hiding one later produces a surprise build failure.

### Pattern 3: Sync core as a dependency-injected function
```ts
// [Proposed] signature. The CLI passes real deps; tests pass fakes.
export interface SyncDeps {
  fetch: typeof globalThis.fetch;
  sleep: (ms: number) => Promise<void>;
  log: (line: string) => void;
  paths: { root: string; snapshot: string; coversDir: string; stagingDir: string; overrides: string };
  now: () => Date;
  allowFewer: boolean;            // --allow-fewer flag for an intentional removal on Behance
}
export async function runSync(deps: SyncDeps): Promise<SyncReport>; // throws SyncError on any gate failure
```
Failure gates (each throws a `SyncError` naming the gate; the CLI prints it and exits 1):
| Gate | Check | Why |
|------|-------|-----|
| G1 profile | status 200, `beconfig-store_state` present, JSON parses, raw Zod passes, `hasMore === false`, count ≥ 1 | Empty or partial list (DATA-03). `hasMore: true` means pagination we don't support. Fail and point at plan B |
| G1b shrink | count < previous snapshot count → fail unless `--allow-fewer` | A transient partial response must not delete projects |
| G2 challenge | 403 with `js_challenge_value=` → replay once. A second challenge, or a 403 without the marker, fails | Detects hardening. Plan B (Playwright) |
| G3 project | replay 200, store present, `store.project.project.id === expected id`, raw Zod passes | Partial or wrong page |
| G4 cover | URL host is `mir-s3-cdn-cf.behance.net`, `redirect: 'error'` (or a manual 3xx check), 200, `content-type` starts with `image/`, magic bytes PNG/JPEG/WEBP, 1 KB < size < 10 MB | SSRF/garbage guard. The bytes are PNG despite the `JPG` label |
| G5 snapshot | `SnapshotSchema.parse(newSnapshot)` with the **same schema the site uses**, and project count equals the profile count | The site can't break on a snapshot the sync accepted |
| G6 body sanity | Reject any HTML body < 2 KB as "not a real page" | The challenge page is 453 B. Cheap secondary signal |
| G7 commit | Only after G1–G6: move covers, then `rename(staging/snapshot.json, src/data/behance/snapshot.json)` | Single atomic commit point |
| G8 overrides | Load overrides and run the same validation as the build (unknown ids, dup slugs). On a validation error, fail **before** commit | Don't commit a snapshot the build would reject |
| G9 report | Print count, ≥8 notice (D-06), per-project missing-overrides checklist with the suggested category from fields (D-22), unknown module `__typename` warnings | Notices, not failures |

Spacing: `await deps.sleep(2000)` before **every** Behance HTML request after the first (profile → project 1 → replay 1 → project 2 …). That is about 15 requests in roughly 30 s for 7 projects. CDN cover downloads may use the same spacing; it's cheap politeness.

### Pattern 4: Commit protocol (never touch the good snapshot on failure)
1. `mkdir tmp/behance-sync/<timestamp>/` **inside the repo** (same filesystem, so `rename` can't hit `EXDEV`; `os.tmpdir()` can be another volume on Linux). Add `tmp/` to `.gitignore` (it is already in ESLint `globalIgnores`, but **not** in `.gitignore` today).
2. Write covers as `<id>-<sha256[0..12]>.<ext>` and `snapshot.json` into staging.
3. After all gates pass: copy or rename each cover whose name doesn't exist yet into `src/assets/projects/` (identical hash means identical bytes, so skip it). **Never overwrite.**
4. `rename(staging/snapshot.json, src/data/behance/snapshot.json)`. This replaces the file atomically (verified: the target gets the new content). This is the only step that changes what the site reads.
5. GC: delete files in `src/assets/projects/` not referenced by the new snapshot. Delete the staging dir.
6. A failure before step 4 leaves `src/` byte-identical. A crash between steps 3 and 4 only adds unreferenced files, which the next run's GC removes.
Directory swaps are **not** atomic (`rename` dir over a non-empty dir fails with `ENOTEMPTY`, verified), which is why the commit point is a single file.

### Pattern 5: Home selection and Projects order (pure)
```ts
// [Proposed]
// visible = projects.filter(p => !p.hidden)
// featured = visible.filter(p => p.featured).sort(byOrderThenDateDesc)
// rest     = visible.filter(p => !p.featured).sort(byDateDesc)
// home     = [...featured, ...rest].slice(0, 3)
// projectsPage = visible.sort(byOrderThenDateDesc)  // order asc (explicit first), then publishedOn desc, then id
```
`byOrderThenDateDesc`: projects with an `order` come first by ascending `order`, then everything else by `publishedOn` desc, then id for determinism. With no `order` set (the default for all 7), it's pure newest first. This implements "reorder" (SC5) and D-17 "order as a manual tiebreak or override". See Open Question 2.

### Pattern 6: Card link structure (one tab stop, no duplicate names)
- `<li>` > `<article class="relative">`, the cover `<Picture>` **outside** the link with its own alt (D-15), and `<h3><a href=…>Title</a></h3>`, where the link's `after:absolute after:inset-0` makes the whole card clickable. Accessible name = title only. One tab stop per card keeps the keyboard-order test simple.
- Meta (category chip, year, tools, summary) is always visible (D-19, no hover-only info). Chips are text, not links.
- Fallback title: `<span lang={contentLang}>` around the Behance title only when no override exists for that locale (D-10).
- Year: compute with `timeZone: 'UTC'` (`Intl.DateTimeFormat(locale, { year: 'numeric', timeZone: 'UTC' })` or `getUTCFullYear()`). `publishedOn` values like 2025-11-07T01:15Z fall on the previous day in Argentina.
- `<time datetime="2025">2025</time>` is fine. Keep it inside the card text.

### Pattern 7: Masonry with fixed rhythm (no reordering)
- CSS grid (`grid-cols-1 md:grid-cols-6` or similar) with `grid-auto-flow: row` (the default). **Never `grid-flow-dense`**, which visually reorders items and breaks D-18's "visual order = DOM order".
- Size by position with Tailwind v4 nth variants on the `<li>`: `md:nth-[6n+1]:col-span-4 md:nth-[6n+1]:row-span-2 …` `[CITED: tailwindcss.com/docs/hover-focus-and-other-states — nth-[3n+1] arbitrary syntax]`.
- Tile boxes use `aspect-*` plus `object-cover`. Pass the real width and height from `ImageMetadata` to `<Picture>`. Pick a pattern that tiles without holes for 7 items and for N mod pattern-length leftovers (taste skill and UI-SPEC decide).
- Behance covers are a uniform crop (token `Y3JvcCwxMDI3LDgwMywzNSwxMjc` decodes to `crop,1027,803,35,127`, about 1.28:1) `[VERIFIED: base64 decode of probe URL]`, so tile aspect is a design choice, not data-driven.

### Anti-Patterns to Avoid
- **`file()` / Content Layer for the snapshot:** silent stale or empty data (Pitfall 1).
- **Fetching anything in `getStaticPaths`, loaders or components:** violates DATA-04 and D-04.
- **`covers.allAvailable.at(-1)` or `[0]`:** `[0]` is `original` (width null, cross-host redirect) and `.at(-1)` is 115 px. Select by path segment (`/projects/max_808/`) and type.
- **Trusting URL extension or `type` label for image format:** the bytes are PNG while labelled JPG.
- **Importing `src/lib/projects/sources/*` from components or pages:** violates DATA-06. Enforce with ESLint.
- **Using Behance `altText`:** forbidden (D-15).
- **`set:html` with any Behance string:** not needed in Phase 3. Titles go through `{}` interpolation (auto-escaped, verified `&quot;`).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Runtime shape validation of scraped JSON | Manual `typeof` checks | `astro/zod` schemas (`looseObject` for raw, `strictObject` for overrides) | Inferred types without `any`/`unknown`, and precise error paths |
| Image resizing, AVIF/WebP, srcset | sharp scripts in the sync | `astro:assets` `<Picture>` with local imports | Offline at build, cached in `node_modules/.astro`, intrinsic dimensions |
| Locale URLs | String concatenation `'/es' + path` | `getRelativeLocaleUrl` + existing `routes.ts` | Trailing-slash and build-format aware. Returns `/projects/`, `/es/projects/`, `/projects/<slug>/` (verified) |
| Content hashing | Custom hash | `node:crypto` `createHash('sha256')` | Built-in |
| HTML parsing of the whole Behance page | A DOM parser dependency | One anchored regex for `<script … id="beconfig-store_state">…</script>` and one for `<meta name="keywords" content="…">`, then `JSON.parse` + Zod | Only two well-delimited islands are needed, and Zod catches shape drift. A DOM library adds a dependency for no gain |
| Headless browser | — | Not now. Plan B only (Playwright already installed) | The challenge is still a static cookie replay (verified today) |

**Key insight:** the risk in this phase is silent failure (stale data, empty lists, broken images that still build), not missing features. Every recommendation above trades a little ceremony for a loud failure.

## Common Pitfalls

### Pitfall 1: Content Layer `file()` hides a broken snapshot
**What goes wrong:** A truncated or corrupt `snapshot.json` builds green with stale or empty projects.
**Why it happens:** `file()` catches read and parse errors and only logs them (Phase 2 spike, verified at source).
**How to avoid:** Direct import + `SnapshotSchema.parse` (Pattern 1), with `.min(1)` on projects. Verified: exit 1 in all three bad cases.
**Warning signs:** `[ERROR] [file-loader]` in an otherwise green build.

### Pitfall 2: Offline build "passes" but something still phones home
**What goes wrong:** You can't tell whether the build used the network.
**Why it happens:** Astro telemetry POSTs to `telemetry.astro.build` during build. It is swallowed when offline, so builds pass, but it pollutes a strict network check `[VERIFIED: spike, the only attempt logged]`.
**How to avoid:** `pnpm build:offline` = `ASTRO_TELEMETRY_DISABLED=1 NODE_OPTIONS=--import=./scripts/offline-guard.ts astro build --force`. The guard replaces `globalThis.fetch`, `net.Socket.prototype.connect` (non-IPC) and `dns.lookup` with failing versions and records attempts. A post-step asserts zero attempts and that `dist/**/*.html` contains no `mir-s3-cdn-cf.behance.net` or `mir-cdn.behance.net`. (The footer's `https://www.behance.net/martifernand7` link is expected, so don't grep plain `behance.net`.) Verified: 0 attempts, exit 0.
**Warning signs:** Any line in the guard log. A remote URL in `dist`.
**Note:** The guard must keep IPC (`{ path }`) sockets working. Vite/esbuild use pipes; the spike's guard allowed them and the build passed.

### Pitfall 3: Shared code between the Node sync and the Astro build
**What goes wrong:** `node scripts/sync-behance.ts` crashes with `ERR_MODULE_NOT_FOUND` or a syntax error.
**Why it happens:** Node type stripping requires **explicit `.ts` extensions** on value imports, ignores tsconfig, and rejects enums, namespaces and parameter properties `[CITED: nodejs.org/api/typescript.html]`. Existing `src/` files use extensionless imports (`from './home'`), and anything importing `astro:*` virtual modules can't load in Node.
**How to avoid:** Modules shared with the sync (`snapshot-schema.ts`, `overrides-schema.ts`, `slug.ts`, `model.ts` constants, and the `projects.ts` validators) import only `astro/zod`, Node built-ins, and each other **with `.ts` extensions**. `import type` is erased and safe. `allowImportingTsExtensions` is already on in the Astro base tsconfig (verified). JSON imports in Node-loaded modules need `with { type: 'json' }`; better, read the overrides with `fs` in the sync and keep JSON imports in the site-only adapter. Add a unit test that `node --check` (or an actual `node scripts/sync-behance.ts --help` run) succeeds.
**Warning signs:** The sync works under Vitest but fails under plain `node`. Vitest resolves extensionless imports, so tests won't catch this. Add a CLI smoke test.

### Pitfall 4: Cover picked by array position or label
**What goes wrong:** You download a 115 px thumbnail, or hit a redirect to another host, or name a PNG `.jpg`.
**How to avoid:** `pickCover()`: filter `type !== 'WEBP'` and URL path containing `/projects/max_808/`. Fall back to the largest finite `width` non-webp entry. Fetch with `redirect: 'error'`. Name the file by sniffed magic bytes (`89 50 4E 47` PNG, `FF D8 FF` JPEG, `RIFF....WEBP`). Test with the probe's real 14-entry list.

### Pitfall 5: `exactOptionalPropertyTypes` vs Zod optionals and override spreads
**What goes wrong:** `astro check` errors like "type `undefined` is not assignable" when spreading `{ ...base, title: override.title }`.
**Why:** strictest enables `exactOptionalPropertyTypes` (verified), and Zod `.optional()` infers `T | undefined`.
**How to avoid:** Build view objects with conditional spreads (`...(x !== undefined && { x })`), or type the view fields as `T | undefined` explicitly. Prefer the resolved, non-optional view types that UI receives (`summary: string | null`).

### Pitfall 6: Keyboard-order and section-order e2e tests break
**What goes wrong:** `tests/e2e/a11y.spec.ts` hard-codes the Home tab order.
**How to avoid:** Update `expectedOrderFor`: skip, wordmark, **Projects**, Contact, EN, ES, hero CTA, pause button, **3 card links, See all**, 5 tool tiles, email, Behance. Add the same for `/projects/` and `/es/projects/` (Projects has `aria-current="page"`, then 7 card links). The reduced-motion variant filters out the BUTTON step; keep that working. Add `/projects/` and `/es/projects/` to the axe `pages` list and to `layout.spec.ts` 320 px overflow.

### Pitfall 7: Generated JSON vs `prettier --check .`
**What goes wrong:** `pnpm lint` fails after a sync if `JSON.stringify(…, null, 2)` output ever differs from Prettier's JSON style.
**Evidence:** A real project slice written with `JSON.stringify(x, null, 2) + '\n'` passed `prettier --check` today `[VERIFIED]`. That is a single sample, not a guarantee.
**How to avoid:** Add `src/data/behance/snapshot.json` to `.prettierignore` (it's a generated artifact). Keep `project-overrides.json` prettier-checked, since it's hand-edited. Write the snapshot with a stable key order (whitelisted fields in a fixed order) and projects sorted by `publishedOn` desc, then id, so diffs are reviewable.

### Pitfall 8: Detail links 404 and look like bugs
**What goes wrong:** A future link-crawler test (or a reviewer) flags `/projects/<slug>/` 404s.
**How to avoid:** Per D-09, e2e asserts hrefs **match** `/projects/<slug>/` (and `/es/projects/<slug>/`) without following them. If a crawler test is added, skip `^/(es/)?projects/[^/]+/$` with a `// TODO(phase-4): remove — detail pages land in Phase 4 (D-09)` comment. There is no link-crawl test in the repo today (verified by grep).

### Pitfall 9: Seed snapshot shipped as real data
**What goes wrong:** The phase closes with placeholder covers.
**How to avoid:** The snapshot carries `"origin": "seed" | "behance-sync"` plus `"syncedAt"`. The phase verification asserts `origin === "behance-sync"`. Optionally `queries.ts` logs a build warning when `origin === "seed"`.

### Pitfall 10: Challenge replay durability
**What we know:** It works with Node `fetch` and a fixed browser UA on 2026-10-15, 10-16 and 10-17 (3 consecutive days). The cookie isn't in a `Set-Cookie` header; it's set by inline JS. It fails if the UA differs between challenge and replay (STACK.md).
**Risk:** Behance can swap in a real JS/bot challenge at any time `[ASSUMED, no official statement]`.
**Mitigation:** Gate G2 fails loudly with a message naming plan B. The committed snapshot keeps the site building indefinitely (DATA-04). Don't build plan B now.

### Pitfall 11: Category seed misread as a runtime fallback
D-22 says a project without overrides shows **no** category chip. The keywords-meta heuristic is only for the sync's *suggested category* in the checklist and for the Phase 3 drafting of the 7 overrides. The adapter must not use derived fields as the category.

## Code Examples

### Challenge-aware page fetch
```ts
// Source: behavior verified by live probe 2026-10-17 (403 → cookie replay → 200)
const CHALLENGE = /js_challenge_value=([0-9a-f]{32,})/i;
const STORE = /<script[^>]*id="beconfig-store_state"[^>]*>([\s\S]*?)<\/script>/;

export async function fetchStorePage(url: string, deps: Pick<SyncDeps, 'fetch' | 'sleep'>, ua: string): Promise<string> {
  const first = await deps.fetch(url, { headers: { 'user-agent': ua }, redirect: 'error' });
  const body = await first.text();
  if (first.status === 200 && STORE.test(body)) return body;
  const match = CHALLENGE.exec(body);
  if (first.status !== 403 || match === null) throw new SyncError('G2', `${url}: unexpected ${first.status}`);
  await deps.sleep(2000);
  const replay = await deps.fetch(url, {
    headers: { 'user-agent': ua, cookie: `js_challenge_value=${match[1]}` }, // same UA is mandatory
    redirect: 'error',
  });
  const replayBody = await replay.text();
  if (replay.status !== 200 || !STORE.test(replayBody)) {
    throw new SyncError('G2', `${url}: challenge replay failed (${replay.status}). Consider Playwright plan B (D-04)`);
  }
  return replayBody;
}
```

### Slug (D-08)
```ts
// [Proposed]. Behance slugs are already ASCII, but overrides may not be.
export function toSlug(input: string): string {
  return input
    .replace(/[´'’"“”]/g, '')          // FIRST: drop apostrophes/quotes (NFKD would turn ´ into space + mark → '-')
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')           // strip combining marks (accents)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
// Expected: Cabreras-motos-Posts→cabreras-motos-posts, PuroV→purov, Website-Reciclick→website-reciclick,
// Portfolio-web→portfolio-web, Sistema-visual→sistema-visual, Website-InstaBlogs→website-instablogs, Mart→mart
// Also test: "Cabrera´s motos, Posts"→"cabreras-motos-posts", "Diseño"→"diseno", "" → throw (empty slug is invalid)
```
`[VERIFIED: node run 2026-10-17]` Order matters: normalizing before stripping `´` yields `cabrera-s-motos-posts`. Stripping first yields `cabreras-motos-posts`. The order above also gives `diseno-grafico` for "Diseño gráfico".

### Offline guard preload (DATA-04)
```ts
// Source: spike guard used 2026-10-17 (0 attempts with ASTRO_TELEMETRY_DISABLED=1)
import net from 'node:net';
import dns from 'node:dns';
import { appendFileSync } from 'node:fs';
const log = process.env['OFFLINE_GUARD_LOG'] ?? 'tmp/offline-guard.log';
const note = (what: string): void => appendFileSync(log, `${what}\n`);
globalThis.fetch = async (input) => { note(`fetch ${String(input)}`); throw new TypeError('offline'); };
// net.Socket.prototype.connect: allow IPC ({ path } / string), record + destroy TCP.
// dns.lookup: record + callback(ENOTFOUND).
```
package.json: `"build:offline": "ASTRO_TELEMETRY_DISABLED=1 NODE_OPTIONS=--import=./scripts/offline-guard.ts astro build --force && node scripts/assert-offline.ts"`. (POSIX env syntax is fine on macOS. This is a local-only v1.)

### Consent note (D-01)
```markdown
# Consent

Martina Fernandez approved syncing her Behance content (https://www.behance.net/martifernand7) into this site in writing on TODO(martina-date).

Scope: public profile and project pages only. No account credentials are used or stored. Syncs are run manually (`pnpm sync:behance`).
```
This goes in its own commit **before** any `scripts/behance/*` or `scripts/sync-behance.ts` exists. Verification: `git log --diff-filter=A --format=%H -- docs/CONSENT.md` is an ancestor of the first commit adding `scripts/sync-behance.ts`. Keep it one line plus scope, as the user chose "one-line note is fine". The scope line is optional. Drop it if the planner reads D-01 strictly.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ARCHITECTURE.md: custom Content Layer loader with `live/snapshot/fixtures` modes | Direct JSON import + Zod in a pure adapter, plus a committed seed for fixtures | This research (evidence: Phase 2 `file()` spike and today's spike) | Fail-loud, Vitest-testable, no live mode at build |
| PITFALLS.md: "14 projects", "gallery pages need a real browser" | 7 projects (D-05). Gallery pages pass with a cookie replay | 2026-10-15 to 10-17 probes | No Playwright now |
| STACK.md: `image.remotePatterns` for Behance | Local cover files only | DATA-04 | No remote image config needed |
| `ts-node`/`tsx` to run TS scripts | `node script.ts` (native type stripping, Node ≥22.18/23.6) | Node 24 default | No runner dependency. `.ts` extensions required |

**Deprecated/outdated:**
- `@astrojs/tailwind`, `<ViewTransitions />`: not relevant here, but don't let examples reintroduce them.
- `z` from `astro:content`: use `astro/zod` (the existing code already does).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The Behance challenge replay will keep working through Phase 3 execution | Pitfall 10 | Sync slice blocks. Fall back to plan B (Playwright) or keep the seed until fixed. The site still builds |
| A2 | `contentLang` default for fallback titles should be `es` (her source language per Phase 2 D-01) | Pattern 6 | Screen readers mispronounce a fallback title. Only affects projects without title overrides (none after Phase 3 drafting) |
| A3 | The `max_808` non-webp variant exists for every project (seen for all 7 today) | Pitfall 4 | The fallback rule (largest finite width) covers it |
| A4 | 7 covers ≈ 2 MB in git (1 measured at 301 KB) | D-21 | Must be measured, as required by D-21. Not a blocker |
| A5 | Nothing else in `astro build` uses the network besides telemetry (verified in the spike copy; real-repo build may differ if new integrations are added) | Pitfall 2 | `build:offline` would catch it |

## Open Questions

1. **Consent date**
   - What we know: written consent exists (D-01). The date is not supplied.
   - Recommendation: write `TODO(martina-date)` and list it in the SUMMARY "Known Stubs". It does not block the sync.
2. **Exact semantics of `order` on the Projects page** ("manual tiebreak or override", D-17)
   - Recommendation: explicit `order` values sort first (ascending), then newest first. With no `order`, it's pure newest first. Confirm in plan review; it's a one-line comparator change if wrong.
3. **Fallback `contentLang`** for Behance titles without overrides (D-10 requires a `lang` but names no source)
   - Recommendation: an optional `contentLang` override field with default `'es'`. Confirm with the user (A2).
4. **Home section when fewer than 3 visible projects** (for example most hidden)
   - Recommendation: render what exists (1–2 cards). Omit the whole section at 0 and throw at build if the snapshot has 0 projects (already enforced by `.min(1)`). The UI-SPEC can override this.
5. **Where `getLatestProjects`/`getAllProjects` live**
   - Recommendation: export them from the existing `src/lib/content/queries.ts` (single data entry point), with the implementation in `src/lib/projects/`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js (type stripping) | sync CLI, offline guard | ✓ | 24.15.0 (`.nvmrc` says 24.22.0) | — |
| pnpm | scripts | ✓ | 11.0.8 | — |
| Network access to www.behance.net + mir-s3-cdn-cf.behance.net | `pnpm sync:behance` (one real run) | ✓ (probe ok 2026-10-17) | — | Keep the seed snapshot. Plan B Playwright |
| Playwright Chromium | e2e, sync plan B | ✓ (devDep 1.64.1) | 1.64.1 | — |
| sharp (root-resolvable) | only if pre-optimizing at sync | ✗ (`ERR_MODULE_NOT_FOUND`; transitive only) | 0.35.5 transitive | Not needed: `astro:assets` optimizes at build |
| Taste skill (`lint.mjs`, `inspect.mjs`) | visual work | ✓ (`.taste-skill/` output dirs exist from Phase 2) | — | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** sharp at root (not needed).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.5 (`getViteConfig`, happy-dom 21, `experimental_AstroContainer`) + Playwright 1.64.1 + @axe-core/playwright 4.14.0 |
| Config file | `vitest.config.ts` (includes `tests/unit/**/*.test.ts`), `playwright.config.ts` (port 4400, `astro preview --ignore-lock`) |
| Quick run command | `pnpm vitest run tests/unit/projects-*.test.ts tests/unit/sync-*.test.ts` |
| Full suite command | `pnpm lint && pnpm test && pnpm test:e2e && pnpm build:offline && pnpm check:secrets` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | `docs/CONSENT.md` exists and was committed before any sync script | git check (scripted) | `git merge-base --is-ancestor $(git log --diff-filter=A --format=%H -- docs/CONSENT.md | tail -1) $(git log --diff-filter=A --format=%H -- scripts/sync-behance.ts | tail -1)` | ❌ Wave 0 (verification step) |
| DATA-02 | Successful run writes snapshot + hashed covers, GCs old covers, prints count/notice/checklist | integration (fake fetch, temp root) | `pnpm vitest run tests/unit/sync-run.test.ts -t "success"` | ❌ Wave 0 |
| DATA-02 | Real run produced `origin: "behance-sync"`, 7 projects, 7 covers. Git size recorded | manual-once + assertion | `node -e "const s=require('./src/data/behance/snapshot.json');if(s.origin!=='behance-sync'||s.projects.length<1)process.exit(1)"` + `du -ch src/assets/projects src/data/behance` | ❌ (phase gate) |
| DATA-03 | Challenge-only, empty list, `hasMore:true`, shrink, one project failing, bad cover bytes, cross-host redirect → throws, previous snapshot + covers byte-identical | integration | `pnpm vitest run tests/unit/sync-run.test.ts -t "fails"` | ❌ Wave 0 |
| DATA-03 | Parsers: store extraction, challenge detection, keywords → fields, cover pick on the real 14-entry list, magic-byte sniff | unit | `pnpm vitest run tests/unit/sync-parse.test.ts` | ❌ Wave 0 |
| DATA-03 | CLI loads under plain Node (extension hygiene) | smoke | `node scripts/sync-behance.ts --help` (exit 0, no network) | ❌ Wave 0 |
| DATA-04 | Build with network blocked succeeds, 0 attempts, no CDN URLs in dist | smoke | `pnpm build:offline` | ❌ Wave 0 |
| DATA-04 | Corrupt/empty snapshot fails the build | unit (schema) | `pnpm vitest run tests/unit/projects-snapshot.test.ts` (SnapshotSchema rejects `[]`, missing fields; adapter throws on missing cover) | ❌ Wave 0 |
| DATA-05 | hidden excluded; featured pinned; order reorders; category override; coverAlt override + fallback; unknown id throws; dup slug throws (incl. hidden); typo key rejected | unit | `pnpm vitest run tests/unit/projects-overrides.test.ts` | ❌ Wave 0 |
| DATA-05 | Override change appears on the site | e2e | `pnpm test:e2e -g "projects"` (asserts override titles/categories from `project-overrides.json` render) | ❌ Wave 0 |
| DATA-06 | Components/pages never import `sources/**` | lint | `pnpm lint` (ESLint `no-restricted-imports` in `src/components/**`, `src/pages/**`) + grep `grep -rn "sources/" src/components src/pages` = 0 | ❌ Wave 0 (eslint rule) |
| HOME-06 | `selectHomeProjects`: featured first by order/date, fill latest, max 3, hidden excluded | unit | `pnpm vitest run tests/unit/projects-select.test.ts` | ❌ Wave 0 |
| HOME-06 | Home shows 3 cards in expected order with hrefs `/projects/<slug>/` (EN) and `/es/projects/<slug>/` (ES), See all → `/projects/` | e2e | `pnpm test:e2e -g "latest work"` | ❌ Wave 0 |
| PROJ-01 | `/projects/` and `/es/projects/` list all visible projects newest first, localized titles, html lang, canonical/hreflang, aria-current nav, axe clean, 320 px no overflow, keyboard order | e2e | `pnpm test:e2e -g "projects page"` + updated `a11y.spec.ts`, `layout.spec.ts`, `seo.spec.ts` | ❌ Wave 0 (a11y/layout/seo specs exist; extend) |
| PROJ-01 | ProjectCard compact vs full render (tools/summary only in full; lang wrapper on fallback title; alt never "Image may contain") | unit (AstroContainer) | `pnpm vitest run tests/unit/project-card.test.ts` | ❌ Wave 0 |
| — | Dictionary parity for new keys | unit | existing `tests/unit/i18n.test.ts` / `dictionary-types.test.ts` | ✅ |

### Sampling Rate
- **Per task commit:** the quick run command above, plus `pnpm lint` when imports or files moved
- **Per wave merge:** `pnpm lint && pnpm test && pnpm test:e2e`
- **Phase gate:** full suite including `pnpm build:offline`, the `origin === "behance-sync"` assertion, the recorded git size, and the consent-ancestry check, before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/fixtures/behance/` — synthetic `profile.html` (store with 2–3 projects, `hasMore` variants), `challenge.html` (copy of the real 453 B shape), `project-<id>.html` (minimal store with tools/tags/1 ImageModule/1 unknown `__typename`), `cover.png` (tiny valid PNG), `not-image.bin`. **Do not commit the real 600 KB pages.**
- [ ] `tests/unit/sync-parse.test.ts`, `tests/unit/sync-run.test.ts` (temp dir via `fs.mkdtemp` under `tmp/`, fake `fetch` returning `Response` objects, `sleep: async () => {}`)
- [ ] `tests/unit/projects-snapshot.test.ts`, `projects-overrides.test.ts`, `projects-select.test.ts`, `project-slug.test.ts`, `project-card.test.ts`
- [ ] `scripts/offline-guard.ts`, `scripts/assert-offline.ts`, `build:offline` script
- [ ] ESLint `no-restricted-imports` block for `src/components/**` and `src/pages/**`
- [ ] e2e: `tests/e2e/projects.spec.ts` (new). Extend `a11y.spec.ts` (pages list + keyboard orders), `layout.spec.ts` (320 px on `/projects/`), `seo.spec.ts` (projects head)

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No credentials used (D-03) |
| V3 Session Management | no | Static site |
| V4 Access Control | no | — |
| V5 Input Validation | **yes** | Zod on every scraped structure (raw, snapshot) and the overrides file. Ids constrained to `^\d+$`. Slugs constrained to `^[a-z0-9]+(-[a-z0-9]+)*$` |
| V6 Cryptography | minimal | `node:crypto` sha256 only for content-addressed file names (not security) |
| V10/V12 Files & Resources | **yes** | Cover filenames built only from validated digits + hex hash + sniffed extension (no path traversal from scraped strings). Download size cap. Host allowlist. `redirect: 'error'` |
| V14 Configuration / supply chain | yes | Zero new dependencies. Sync never runs in CI or Worker (D-04) |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stored XSS via scraped title or text | Tampering | Astro `{}` interpolation auto-escapes (verified `&quot;`). No `set:html` with Behance data. TextModule HTML is stored inert; Phase 4 must sanitize before rendering |
| Path traversal via scraped id/slug in file writes | Tampering | Never use the scraped `slug`/`name` in file paths. Use only `^\d+$` ids + hash |
| SSRF / unexpected host via redirects or URLs in JSON | Spoofing | Allowlist `www.behance.net`, `mir-s3-cdn-cf.behance.net`. `redirect: 'error'`. The `original` cover redirects to `mir-cdn.behance.net`, so don't use it |
| Poisoned or partial data replacing good data | Tampering / DoS | Gates G1–G9, staging, atomic rename, shrink guard |
| Oversized response exhausting memory | DoS | Cap HTML at ~5 MB and covers at 10 MB (check `content-length` and the actual byte length) |
| ToS/abuse signal from automation | Repudiation / legal | Manual runs only, ~2 s spacing, fixed honest browser UA, consent documented (DATA-01), link back to Behance (footer already) |

## Sources

### Primary (HIGH confidence)
- Live probe 2026-10-17: profile `https://www.behance.net/martifernand7` (200, 618 KB, store, 7 projects, `hasMore:false`), `/gallery/238078789/Cabreras-motos-Posts` (403 challenge 453 B → replay 200 565 KB), CDN HEAD `max_808` (200 `image/png` 301,334 B) and `original` (302 → `mir-cdn.behance.net`). Saved HTML analyzed offline.
- Spike in a scratch copy (`/tmp/p3spike`, Astro 7.4.0): direct JSON import + `astro/zod` + `import.meta.glob` eager covers; `astro build --force` under a network-blocking preload (0 attempts with `ASTRO_TELEMETRY_DISABLED=1`; only telemetry otherwise); corrupt / empty / missing snapshot → exit 1; Vitest reads the same module; `astro check` 0 errors; `getRelativeLocaleUrl` outputs.
- Local checks: `astro/zod` importable from plain Node; `process.features.typescript === 'strip'`; strictest tsconfig flags; sharp not root-resolvable; `fs.rename` file-replace and dir `ENOTEMPTY`; prettier on stringify output.
- https://nodejs.org/api/typescript.html — type stripping defaults, `.ts` extension requirement, unsupported syntax.
- https://docs.astro.build/en/recipes/dynamically-importing-images/ — `import.meta.glob<{ default: ImageMetadata }>` pattern.
- https://docs.astro.build/en/reference/content-loader-reference/ — `file()` `parser` option. Silent on `image()`/`filePath` for `file()`.
- https://tailwindcss.com/docs/hover-focus-and-other-states — `nth-*` / `nth-[3n+1]` variants.
- Phase 2 RESEARCH (`02-RESEARCH.md` Pitfalls 1, 3, 4, 6, 7, 9) — `file()` swallowing, `getCollection` order and Vitest emptiness, keyboard test.

### Secondary (MEDIUM confidence)
- `.planning/research/STACK.md` §1 (2026-10-15 probes: module types, alt text, keywords heuristic, robots, Adobe terms).

### Tertiary (LOW confidence)
- Durability of the challenge replay beyond today (no official source exists).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH. No new packages, and all behavior was verified locally.
- Architecture: HIGH. The read path and offline build were verified by spike, and the sync commit protocol by fs experiments. The gate list is a design recommendation (MEDIUM for completeness).
- Pitfalls: HIGH for the verified ones (`file()`, telemetry, cover variants, extension hygiene, prettier sample). MEDIUM for challenge durability.

**Research date:** 2026-10-17
**Valid until:** about 7 days for the Behance-specific facts (the undocumented store shape can change without notice). About 30 days for the toolchain findings.
