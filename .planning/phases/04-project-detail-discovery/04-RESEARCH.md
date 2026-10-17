# Phase 4: Project Detail & Discovery - Research

**Researched:** 2026-10-17
**Domain:** Astro 7 static detail pages built from a committed Behance snapshot: sync extension (module images and sanitized text), typed module rendering, a click-to-load embed facade, next/previous navigation, and recording discovery as N/A
**Confidence:** HIGH. Most claims were measured in this session against the repo, the committed snapshot and the live Behance CDN (HEAD requests only, plus one sample download).

## Summary

**The branch is settled.** The committed snapshot has **7 projects** [VERIFIED: `src/data/behance/snapshot.json`, `origin: "behance-sync"`, read 2026-10-17]. That matches Phase 3 D-05 and `03-VERIFICATION.md` SC1 ("Snapshot has 7 projects, so PROJ-04..07 are N/A"). This phase therefore:
- builds detail pages (PROJ-02, PROJ-03)
- records PROJ-04..07 as N/A, with no filter UI (D-16)
- amends PROJ-06 to drop the year filter (D-17)

No filter or search research is needed.

**The core work is in three places:**
1. **Extend `pnpm sync:behance`** to:
   - download the 154 module images
   - sanitize the 4 TextModules
   - extract and allowlist embed `src`
   - write a typed, normalized `content` array per project into the snapshot
2. **Give the site adapter a source-agnostic module union**, which the query layer turns into a localized `ProjectDetailView`.
3. **Build small Astro components per module kind** (the UI-SPEC already fixes their markup).

**Two measured findings change the plan materially:**
- **Git size is about 15–16 MB, not 150–300 MB.** I measured 148/154 `1400_webp` CDN variants by HEAD: **15.22 MB total** (largest 1.27 MB). The other 6 need a fallback (next point). [VERIFIED: live CDN HEAD, 2026-10-17]
- **The variant list lies for 6 images.** For 6 PuroV ImageModules (project `227934855`), `1400_webp` is listed in `allAvailable` but returns **404 (JSON body)**. For all 6, the `1400` PNG variant returns 200. [VERIFIED: live CDN HEAD]
  - The sync therefore needs an **ordered candidate chain**: try variants, treat a 404 as "try the next", and only fail when all of them fail.
  - It also needs **local re-encoding** (`sharp`) for non-WebP fallbacks.

**Primary recommendation:**
- Normalize modules **at sync time** into a strict, Zod-validated `content` union stored in the snapshot.
- Commit module images as WebP under a **separate** directory, `src/assets/projects/modules/`. A separate directory is required, because the existing cover GC would delete them otherwise.
- Render through `astro:assets` `<Picture>`.
- Sanitize text with `sanitize-html` 2.18.1 at sync, plus a unit test that the committed HTML is a fixed point of the sanitizer.
- Inject the Figma iframe only from a lifecycle-registered client script.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Canvas fidelity
- **D-01: Seamless stack.** Module images run edge to edge with no gaps, honouring Behance `fullBleed` (nearly every module has it set: 67/68 in InstaBlogs, 6/6 in Cabrera's). They sit in a centred column capped near Behance's 1400px `canvasWidth`. Her compositions flow from one image into the next, so do not add card frames, gaps or rounded corners between images.
- **D-02: Text modules are stripped to site typography.** Keep the structure: paragraphs, line breaks, links, bold/italic and `text-align`. Drop inline `color`, `font-family` and `font-size` (they were picked for her dark Behance canvases, for example `#ffffff` and `#f8f5c2`). Text renders in site fonts and theme colours in both light and dark mode. The HTML must be sanitized with an allowlist, preferably **at sync time** as a script-only dependency so nothing ships to the client (`research/STACK.md` recommends `sanitize-html`). Adding it is now justified, which resolves the Phase 3 discretion item. Never use raw `set:html` on unsanitized Behance HTML. Links stay external with `rel="noopener noreferrer"` and open in a new tab, with the existing new-tab hint pattern.
- **D-03: Canvas background = site theme background token.** There is no per-project background colour and no `canvasBg` override.
- **D-04: No motion on the detail page in this phase.** Scroll reveals and parallax for the image stack belong to Phase 7, through the existing motion gate.

#### Images & embeds
- **D-05: Module images are committed, re-encoded at sync.** `pnpm sync:behance` downloads each module image (ImageModule plus every MediaCollection component, 154 in total today), re-encodes it to a modern format (WebP/AVIF, final choice is the planner's) and commits it next to the covers. The build must stay offline from a fresh clone. The plan **measures and records** the added git size; `[Unverified]` the PNG-originals estimate was 150–300 MB, which is why originals are not committed. The previous good snapshot and images stay untouched on any sync failure (DATA-03).
- **D-06: Max width 1400px**, matching `canvasWidth`. Responsive srcset sizes go downward from there via `astro:assets`. Image dimensions come from the snapshot to avoid layout shift.
- **D-07: Embeds use a click-to-load facade.** A poster/placeholder with an accessible "Load interactive prototype" button (localized). The `<iframe>` (Figma today, in Portfolio-web) is injected only on activation. Before the click, no third-party request is made. Only an allowlist of embed origins is accepted (e.g. `embed.figma.com`); any other embed falls back as in D-08. The iframe gets a `title` and sensible `sandbox`/`allow` attributes.
- **D-08: Unknown module types render a quiet localized note**, roughly "This part is best viewed on Behance", linking to the project's Behance URL. The sync already warns about unknown types (`scripts/behance/run-sync.ts:243`); keep that warning.
- **D-09: Module alt text is an optional per-image override, otherwise derived.** Add an optional `moduleAlt` map keyed by module id (or component id for collection images) with `{ en, es }` values in `src/data/project-overrides.json`. Without one, alt is derived from the localized title, e.g. "Reciclick website — image 3 of 17". Behance auto alt is never used (Phase 3 D-15). The sync's missing-overrides checklist lists missing module alts as `TODO(martina)` (a notice only; the build passes).
- **D-10: MediaCollection modules render as a responsive grid**: 2–3 columns that collapse on mobile. The taste skill and UI-SPEC set the exact columns.

#### Page frame & metadata
- **D-11: The page opens with a title-first intro band**: the large localized title (from overrides, wrapped in the content `lang` when it falls back to Behance), the localized summary when present, then a metadata row with the category, tools and "View on Behance" link. The image stack follows straight after. The cover is **not** repeated as a hero.
- **D-12: Tools reuse `ToolIcon` with a visible name** (same icons as the Home ToolsRow). Behance tool names already match `src/data/tools.json` names. An unmatched tool shows its name only, so no normalization layer is needed unless the planner finds a mismatch. No project date anywhere (user decision 2026-10-17).
- **D-13: Next/prev follow the Projects-page order and wrap around.** Order is newest first with `order` overrides, the same query as `/projects`. The last project's "next" goes to the first, and the first project's "previous" goes to the last. Hidden projects are excluded.
- **D-14: Page end has a big "Next project" teaser**, a large block with the next project's cover thumbnail and title, plus a smaller "previous" text link. The visuals are tuned by UI-SPEC and the taste skill.
- **D-15: The contact CTA links to Home `#contact`**: `/#contact` and `/es/#contact`, the same target as the header nav. It goes live when Phase 5 lands, with no change needed here.

#### Discovery (PROJ-04..07)
- **D-16: PROJ-04..07 are recorded N/A** in REQUIREMENTS.md and VERIFICATION, with Phase 3 D-05 (7 projects, live profile and RSS on 2026-10-16) as evidence. The Projects page gets no filter or search UI. The sync's ≥8 notice (Phase 3 D-06) remains the revisit trigger.
- **D-17: [AMENDS PROJ-06] The year filter is dropped.** If filters are ever built, PROJ-06 filters by tool only, because a year filter would expose the dates the user chose to hide. Update REQUIREMENTS.md PROJ-06 and ROADMAP Phase 4 SC3 wording accordingly.

#### Phase-3 cleanup this phase owns
- Remove the three `TODO(phase-4)` D-09 link-check skips: `tests/e2e/projects.spec.ts:38`, `tests/e2e/a11y.spec.ts:38`, `tests/e2e/home-latest-work.spec.ts:61`. Also update the `src/components/ui/ProjectCard.astro:5` comment. Card links must now resolve.

### Claude's Discretion
- Exact image encoding (WebP vs AVIF, quality) and the storage path for module images, within D-05/D-06.
- The sanitizer library and its exact allowlist, within D-02.
- The module-renderer component structure: for example a `ProjectModule` dispatcher with `ImageModule`/`TextModule`/`CollectionModule`/`EmbedFacade`/`UnknownModule`, following the AGENTS.md small-component rule.
- Per-page SEO: title, description from the summary, and OG image from the cover. Reuse `buildSeo`/`SeoHead` and the hreflang/canonical pattern.
- Fallback copy wording, facade poster design, the next-project teaser visuals, and the column count in the collection grid: all through UI-SPEC and the taste skill.

### Deferred Ideas (OUT OF SCOPE)
- Scroll reveals and parallax on the detail image stack belong to Phase 7 (motion).
- Per-project canvas background colour (`canvasBg` override) was offered and not chosen.
- Drafting all 154 bilingual module alts was offered and not chosen. Missing alts go to the sync checklist as `TODO(martina)` for gradual filling.
- Filters/search (PROJ-04..07) wait until the sync reports 8 or more projects.
</user_constraints>

**Approved UI contract:** `04-UI-SPEC.md` (status: approved) fixes markup, classes, copy keys, the a11y contract and the taste-skill gate. The plan must implement it as written. This research adds only what the UI-SPEC does not cover: data, sync, security and test architecture. Where this research refines a UI-SPEC detail, it says so explicitly.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROJ-02 | Visitor can open a project detail page that mirrors its Behance content (images, text, grids, embeds) in the original language, with a safe fallback for unknown content types | Pattern 1 (sync normalization into the `content` union), Pattern 2 (module images with a variant fallback chain), Pattern 3 (sanitizer, verified on all 4 real modules), Pattern 5 (embed facade), Pattern 4 (adapter and query layer), `getStaticPaths` routes, Pitfalls 1–6 |
| PROJ-03 | Visitor sees project metadata (tools, category; no date), a "View on Behance" link, next/previous links, and a contact CTA | `ProjectDetailView` builder, `neighbours()` wrap helper, tool to icon map from the `tools` collection (names match, verified), `ExternalTextLink`, `ButtonLink` to `/#contact`, `buildSeo` `og:image` extension |
| PROJ-04 | *(conditional ≥8)* Category chips | **N/A**: 7 projects [VERIFIED: snapshot]. Record in REQUIREMENTS/VERIFICATION. A regression e2e asserts no filter UI |
| PROJ-05 | *(conditional ≥8)* Accent-insensitive search | **N/A** (same evidence) |
| PROJ-06 | *(conditional ≥8)* Filter by tool and by year | **N/A**. **Amend the text** to "by tool" only (D-17), and also ROADMAP SC3 |
| PROJ-07 | *(conditional ≥8)* URL state, announced count, clear filters | **N/A** (same evidence). The sync's ≥8 notice (`run-sync.ts:232`) stays as the trigger |
</phase_requirements>

## Project Constraints (from CLAUDE.md / AGENTS.md)

- **Stack:** Astro 7.4 + TypeScript `~6.0.3` (`astro/tsconfigs/strictest`), with no `any`/`unknown`. Tailwind 4.3 only, so no `<style>` blocks and no `@apply` (UI-SPEC adds one data-driven inline `--ar` custom property). pnpm for everything.
- **Icons:** `@tabler/icons` per-file SVG imports (e.g. `@tabler/icons/outline/player-play.svg`), never barrels.
- **No dependency until needed.** This phase justifies `sanitize-html` + `@types/sanitize-html` (D-02) and a direct `sharp` devDependency (see Standard Stack). Nothing else.
- **Quality gates:** `pnpm lint` (`astro check && eslint . && prettier --check .`), `pnpm test`, `pnpm test:e2e`. No type, lint or test failures. Add tests when behaviour changes.
- **Accessibility is mandatory:** semantic HTML, ARIA where needed, managed focus (the facade moves focus to the iframe).
- **Measure, don't guess:** record git size added, build time (cold and warm), and `dist/` size.
- **Taste skill gate is required** for all visual work: `lint.mjs` + `inspect.mjs` + a screenshot review (the commands are in UI-SPEC §Verification).
- **GSD commits are pre-approved:** Conventional Commits, lowercase, imperative, under 50 chars, scope = plan/phase id, **no Claude/co-author attribution**. `/security-review` runs once at phase end.
- **DATA-06 lint rule:** `src/components/**` and `src/pages/**` must not import `**/sources/**` (`eslint.config.js:31-47`).
- **Global CLAUDE.md:** label unverified claims (`[Inference]`, `[Unverified]`, `[Assumption]`). Never present inferred content as fact.
- **Sync guardrails (Phase 3 D-03/D-04):** manual runs only, refuses in CI, public pages + allowlisted CDN only, 2 s spacing, `redirect: 'error'`, fail loudly and leave the previous snapshot untouched.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Fetch module images, pick variant, re-encode | Sync script (Node, dev machine) | — | D-05: build must stay offline. Behance is never contacted at build or runtime |
| Sanitize TextModule HTML | Sync script | Unit test (fixed-point check on the committed snapshot) | D-02: script-only dependency, nothing ships to the client |
| Embed `src` extraction + origin allowlist | Sync script (extract + warn) | Build (Zod host-pinned URL) + client (re-check before inject) | Defense in depth, since the snapshot is a hand-editable committed file (T-03-05 precedent) |
| Snapshot schema validation | Build (module scope, `parseSnapshot`) | Sync G5 | Existing pattern: any violation fails `astro build` |
| Source-agnostic module union | `src/lib/projects/sources/behance-snapshot.ts` → `model.ts` types | — | DATA-06: UI never sees Behance shapes |
| Localization (alt, titles, lang, copy) + next/prev | Query layer (`src/lib/content/queries.ts` + `src/lib/projects/*` pure helpers) | — | Existing `toCardView` pattern; pure helpers are unit-testable |
| Static route generation | Astro pages (`getStaticPaths`, SSG) | — | All pages prerendered; no server runtime |
| Image optimization (srcset, AVIF/WebP) | Build (`astro:assets` + sharp) | — | Existing cover pattern |
| Embed activation | Browser (lifecycle-registered script) | — | The only client JS added; progressive enhancement |

## Standard Stack

### Core (already installed, no change)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| astro | 7.4.0 | SSG, `getStaticPaths`, `astro:assets` `<Picture>`/`getImage` | [VERIFIED: package.json; `getImage` exported in `node_modules/astro/client.d.ts`] |
| astro/zod (zod 4) | bundled | Snapshot `content` union, `moduleAlt` schema | [VERIFIED: existing `snapshot-schema.ts`] |
| tailwindcss | 4.3.3 | `sm:grow-(--ar)` collection rows | `grow-(<custom-property>)` compiles to `flex-grow: var(<custom-property>)` [CITED: tailwindcss.com/docs/flex-grow] |
| @tabler/icons | 3.49.0 | `arrow-left`, `player-play` (new imports) | [VERIFIED: UI-SPEC icon inventory checked files exist] |
| vitest / @playwright/test / @axe-core/playwright / happy-dom | 5.0.5 / 1.64.1 / 4.14.0 / 21.0.3 | Unit, e2e, a11y, DOM tests for the facade script | [VERIFIED: package.json; 414 unit tests passing in 1.5 s] |

### New (this phase)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sanitize-html | 2.18.1 (published 2026-10-14) | Allowlist sanitizer for TextModule HTML, and embed `<iframe src>` parsing | Imported **only** from `scripts/behance/*` and its tests. `[ASSUMED]` per the legitimacy gate (slopcheck unavailable), but named in project `research/STACK.md` and repo `apostrophecms/apostrophe` |
| @types/sanitize-html | 2.16.2 | Types (strictest TS) | devDependency |
| sharp | **0.35.5 (exact, the same version Astro already resolved)** | Re-encode non-WebP fallbacks to WebP at sync; read real pixel dimensions | Already in the store as Astro's **optionalDependency** (`astro/package.json` `"sharp": "^0.35.4"`) [VERIFIED]. pnpm does not hoist it, so `scripts/` cannot `import 'sharp'` until it is a direct devDependency `[Inference: pnpm strict node_modules layout; `ls node_modules` shows no top-level sharp]`. Pinning 0.35.5 reuses the installed binary (`@img/sharp-darwin-arm64@0.35.5`) |

**Version note:** sanitize-html 2.18.1 is 3 days old. If the user prefers a release that has had time in the wild, `2.18.0` (2026-09-30) is the alternative. The allowlist behaviour below was verified on **2.18.1**.

**Installation:**
```bash
pnpm add -D sanitize-html@2.18.1 @types/sanitize-html@2.16.2 sharp@0.35.5
```
(pnpm 11 may require `pnpm approve-builds` for sharp. The STACK notes this already happened for Astro's copy [CITED: research/STACK.md §7]. Verify with `node -e "import('sharp').then(s=>console.log(s.default.versions))"` after install.)

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| sanitize-html | DOMPurify + jsdom | Needs a DOM in Node and is heavier. sanitize-html is server-native and is the STACK.md pick |
| sharp re-encode for fallbacks | Commit the 6 fallback `1400` PNGs as-is (~1.4 MB) and let `astro:assets` transcode | Avoids the sharp dependency but breaks D-05's "re-encoded to a modern format". Not recommended |
| Storing Behance's WebP bytes as-is | Always re-encode everything with sharp | Double lossy encode, and committed bytes change whenever the sharp version changes, so hash names churn. Pass-through is recommended (see Pattern 2) |
| Separate `content` array in the snapshot | Render from raw `modules` at build | It would put Behance shape knowledge and sanitize-html into the site build, violating D-02's "script-only" preference and DATA-06 |

## Package Legitimacy Audit

slopcheck **could not be installed or run** in this environment (`command -v slopcheck` was empty after a pip attempt). Per protocol, every package is `[ASSUMED]`, and the planner should gate the install behind a `checkpoint:human-verify` task.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| sanitize-html | npm | 2.x line, years old; 2.18.1 published 2026-10-14 | not measured | github.com/apostrophecms/apostrophe (`packages/sanitize-html`) [VERIFIED: `npm view repository.url`] | unavailable | `[ASSUMED]`. Approved pending human verify. No `postinstall` script [VERIFIED: `npm view scripts.postinstall` empty] |
| @types/sanitize-html | npm | DefinitelyTyped | not measured | DefinitelyTyped | unavailable | `[ASSUMED]`. Approved pending human verify |
| sharp | npm | many years | not measured | github.com/lovell/sharp [VERIFIED] | unavailable | `[ASSUMED]`, but **already installed** as Astro's optional dependency at this exact version. Adding it changes only the manifest. No `install` script in 0.35.5 [VERIFIED: `npm view sharp scripts.install` empty] |

**Packages removed due to slopcheck [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** none. slopcheck was unavailable, so all are `[ASSUMED]` and gated.

## Architecture Patterns

### System Architecture Diagram

```
 (manual, dev machine)                                    (build, offline)                         (browser)
 pnpm sync:behance
   │
   ├─ G1 profile page ──► 7 projects
   ├─ per project: G2/G3 project page ──► raw allModules
   │     ├─ cover (existing G4)
   │     ├─ NEW G4m: for each ImageModule / collection component
   │     │     candidate chain 1400_webp → 1400 → max_1200_webp → max_1200 → fs_webp → fs
   │     │     404 / non-image ⇒ try next ; all fail ⇒ SyncError (snapshot untouched)
   │     │     WebP ⇒ keep bytes ; PNG/JPG ⇒ sharp → WebP (≤1400w)
   │     │     name = <imageId>-<sha12>.webp  → staging/modules/
   │     ├─ NEW TextModule ⇒ sanitize-html allowlist ⇒ clean html
   │     ├─ NEW EmbedModule ⇒ parse iframe src ⇒ allowlist? embed : unknown(+warn)
   │     └─ other __typename ⇒ unknown(+existing warn)
   ├─ G5 SnapshotSchema (now with strict `content` union) ──► fail ⇒ untouched
   ├─ G8 overrides incl. moduleAlt keys must match snapshot image ids
   ├─ G7 commit: covers dir + modules dir (copy-if-absent), atomic snapshot rename, GC per dir
   └─ G9 report: count, ≥8 notice, unknown/embed warnings, moduleAlt TODO checklist, "N files, X MB"
                                   │
                     src/data/behance/snapshot.json + src/assets/projects/modules/*.webp (committed)
                                   │
                                   ▼
   behance-snapshot.ts (parse at module scope; import.meta.glob modules/*.webp eager)
        └─► SourceProject.modules: SourceModule[] (ImageMetadata resolved; missing file ⇒ throw)
                 │
   queries.ts getProjectDetail(locale, slug) / getProjectPaths()
        ├─ applyOverrides (+moduleAlt) ─ sortProjects (visible only) ─ neighbours(wrap)
        └─► ProjectDetailView { title, titleLang, summary, category, tools[{name,icon}], modules: ModuleView[], next, previous, seo }
                 │
   pages/projects/[slug].astro  &  pages/es/projects/[slug].astro  (getStaticPaths)
        └─► ProjectDetailView.astro ─► ProjectModule dispatcher ─► Image | Text(set:html sanitized) | Collection | EmbedFacade | Unknown
                 │                                                                    │
            dist/ static HTML + /_astro/*.avif|webp                                    ▼
                                                                    lifecycle.register(initEmbedFacades)
                                                                    click ⇒ re-check host ⇒ inject <iframe sandbox title> ⇒ focus
```

### Recommended Project Structure (new and changed files)
```
scripts/behance/
├── module-images.ts      # NEW: candidate chain, fetch via fetchCover-like guard, sharp re-encode, naming
├── module-content.ts     # NEW: raw module → content union (image/collection/text/embed/unknown)
├── sanitize.ts           # NEW: sanitize-html options + cleanTextHtml(); the ONLY sanitize-html importer
├── fs-commit.ts          # CHANGED: second dir (modules) with its own referenced set + GC
└── run-sync.ts           # CHANGED: wire G4m, report sizes, moduleAlt checklist
src/lib/projects/
├── snapshot-schema.ts    # CHANGED: MODULE_FILE regex, strict `content` union per project
├── overrides-schema.ts   # CHANGED: optional moduleAlt record
├── projects.ts           # CHANGED: validate moduleAlt keys/lengths; missingModuleAlts()
├── model.ts              # CHANGED: SourceModule, ModuleView, ProjectDetailView, TeaserView types
├── embeds.ts             # NEW: EMBED_PROVIDERS allowlist (Node-safe; shared by sync, site, client)
├── detail-view.ts        # NEW: toDetailView, imageAlt numbering, collectionRows, neighbours (pure)
└── sources/behance-snapshot.ts  # CHANGED: resolve module ImageMetadata via import.meta.glob
src/lib/ui/embed-facade.ts       # NEW client: initEmbedFacades(doc) → Cleanup
src/lib/content/queries.ts       # CHANGED: getProjectPaths(locale), getProjectDetail(locale, slug)
src/lib/seo.ts + SeoHead.astro   # CHANGED: optional og:image (absolute URL)
src/components/ui/ExternalTextLink.astro, ToolIcon.astro (size prop)
src/components/project/          # NEW (or ui/): ProjectModule, ImageModule, TextModule, CollectionModule, EmbedFacade, UnknownModule, NextProjectTeaser, ProjectIntro
src/components/views/ProjectDetailView.astro
src/pages/projects/[slug].astro, src/pages/es/projects/[slug].astro
src/assets/projects/modules/*.webp   # NEW committed images (~15–16 MB)
```

### Pattern 1: Normalize at sync, validate strictly at build
**What:** The sync writes, per project, a new `content` array next to the raw `modules` (kept for audit, as today). The site reads only `content`.

**Proposed Zod shape** `[Proposed]`:
```ts
// src/lib/projects/snapshot-schema.ts (erasable TS, astro/zod)
export const MODULE_FILE = /^\d+-[0-9a-f]{12}\.webp$/;
const ImageRef = z.strictObject({
  id: z.string().regex(/^\d+$/),          // ImageModule id or collection component id (moduleAlt key)
  file: z.string().regex(MODULE_FILE),
  width: z.int().positive().max(1400),    // real pixel size read from the stored bytes
  height: z.int().positive(),
  sourceUrl: BehanceCdnUrl,               // existing host-pinned helper
});
const ContentSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('image'), image: ImageRef, fullBleed: z.boolean(), caption: z.string() }),
  z.strictObject({ kind: z.literal('collection'), images: z.array(ImageRef).min(1) }),
  z.strictObject({ kind: z.literal('text'), html: z.string() }),          // already sanitized
  z.strictObject({ kind: z.literal('embed'), provider: z.enum(['figma']), src: httpsUrlOn(/^embed\.figma\.com$/) }),
  z.strictObject({ kind: z.literal('unknown'), type: z.string() }),
]);
// SnapshotProjectSchema gains: content: z.array(ContentSchema)
```
- **Snapshot version:** bump `version` to `z.literal(2)`, or keep 1 and make `content` required. Either way the committed snapshot must be regenerated **in the same plan** as the schema change, or `astro build` fails at module scope. `[Inference: parseSnapshot runs at module scope in behance-snapshot.ts:9]`
- **Sequencing:** the schema/sync code and the live re-sync must land before (or with) the site adapter change. Otherwise the build is red in between.

### Pattern 2: Module image download with a variant fallback chain
**Measured facts** [VERIFIED 2026-10-17]:
- 154 images: 127 ImageModule (all `fullBleed: 1`) + 27 collection components across 9 MediaCollectionModules.
- Image ids are unique (168 distinct ids, counting modules and components).
- Every image lists a `1400_webp` variant declared at width 1400. No original is under 1400px.
- HEAD of all 154 `1400_webp`: **148 → 200 `image/webp`**, 15.22 MB total, max 1.27 MB. **6 → 404 `application/json`**, all PuroV `227934855` ImageModules (`1450079099`, `1450079097`, `1450079089`, `1450083065`, `1450083063`, `1450083061`). For each of them the `1400` (PNG) variant → 200.
- One sample `1400_webp` downloaded: real 1400×2036 VP8. That matches the declared component height.
- **ImageModule `width`/`height` in the raw JSON are the 600px `disp` size, not the stored size.** Example: `width: 600, height: 320` while `size_1400` is 1400×747. Never use raw `width`/`height` for intrinsic dimensions. Read them from the downloaded bytes (`sharp(bytes).metadata()`).

**Recommended rule** `[Proposed]`:
1. Candidates, in order, picked by path segment (never by array position, mirroring `pickCover`): `1400_webp`, `1400`, `max_1200_webp`, `max_1200`, `fs_webp`, `fs`.
2. For each candidate, use the same guards as `fetchCover`: host allowlist, `redirect: 'error'`, `image/*`, size cap, magic-byte sniff. **A 404 or non-image moves to the next candidate.** Network errors and oversize bodies fail the whole sync, as they do today.
3. WebP bytes with width ≤ 1400 → stored as-is. PNG/JPG → `sharp(bytes).resize({ width: 1400, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer()`. The quality value is `[Assumption]` and should be tuned by eye on one PuroV image.
4. Name it `<imageId>-<sha256(storedBytes)[0..12]>.webp`, so no scraped text ever reaches a path.
5. Pacing: requests go through the existing `paced` fetch (2 s spacing). That means about 180 requests ≈ **6–7 minutes** per run `[Inference: 1 profile + 7 pages (+ challenge replays) + 7 covers + 154 images + ~6 fallbacks, × 2 s]`.
   - **Optimization, recommended:** reuse an image without downloading when the previous snapshot has the same `sourceUrl` for that id **and** the file exists on disk. That makes re-syncs fast and polite.
   - Lowering the spacing for CDN-only requests is a user decision, because D-04 says "every Behance request". Do not change it silently.

**Measured cost of build-time transforms** [VERIFIED: sharp 0.35.5 on Apple M5, a 1400×2036 image]: about 650 ms per image for the 6 outputs (`[640, 960, 1400] × [avif, webp]`), with AVIF taking about 80% of that. 154 images ≈ **~100 s serial** on a cold cache. The warm build today is 1.3 s (the asset cache is in `node_modules/.astro`). Measure the real cold build with `rm -rf node_modules/.astro && time pnpm build` and record it. If CI cold builds are too slow, drop AVIF for module images only; that is a planner/user call.

### Pattern 3: Sanitizer allowlist (verified)
I verified this in an isolated temp install of sanitize-html 2.18.1 against **all 4 real TextModules** and 11 XSS fixtures. All 4 outputs were idempotent (`clean(clean(x)) === clean(x)`).
```ts
// scripts/behance/sanitize.ts  — Source: sanitize-html README (allowedStyles, transformTags, exclusiveFilter) + local verification 2026-10-17
import sanitizeHtml from 'sanitize-html';
const ALIGN = [/^(left|right|center|justify)$/];
export const TEXT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'div', 'br', 'a', 'strong', 'b', 'em', 'i', 'span'],
  allowedAttributes: { a: ['href', 'target', 'rel'], div: ['style'], p: ['style'], span: ['data-newtab-hint'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  allowedStyles: { div: { 'text-align': ALIGN }, p: { 'text-align': ALIGN } },
  transformTags: {
    // DEFAULT merge (3rd arg omitted). Passing `false` REPLACES attribs and silently DROPS href (verified).
    a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
    h1: 'p', h2: 'p', h3: 'p', h4: 'p', h5: 'p', h6: 'p',
  },
  // Unwrap Behance's attribute-less <span> nests and any <a> whose href was stripped (javascript:, //host).
  exclusiveFilter: (frame) =>
    (frame.tag === 'span' && !('data-newtab-hint' in frame.attribs)) ||
    (frame.tag === 'a' && !frame.attribs['href'])
      ? 'excludeTag'
      : false,
};
```
**Verified outputs:**
- PuroV → `<div style="text-align:center"><a href="https://www.figma.com/design/…" target="_blank" rel="noopener noreferrer">Figma</a></div><div style="text-align:center"><br /></div>`
- InstaBlogs → its link is kept with `target`/`rel`. Colours, fonts, sizes and classes are all gone.

**XSS fixtures:**
- `<img onerror>`, `<script>`, `<iframe>` and `<svg>` are removed.
- `javascript:` and protocol-relative `//evil.com` links are unwrapped to plain text.
- `background:url(javascript:…)` is dropped and only `text-align` is kept.

**Gaps the plan must handle:**
- **Trailing and leading empty blocks** (`<div …><br /></div>`, which PuroV ends with) are not removed by the options above. Trim them after sanitizing with a small anchored regex on the sanitized string, then re-run the fixed-point test.
- **`h1`–`h6` → `p > strong`** (UI-SPEC) is not expressible with `transformTags` alone, since it only renames. Options: (a) accept `h* → p` (no snapshot module has headings [VERIFIED]), or (b) map `h* → strong` and rely on Behance wrapping headings in blocks. Recommend (a), and record it as a refinement of the UI-SPEC.
- **New-tab hint token:** the UI-SPEC wants `<span data-newtab-hint></span>` injected before each `</a>` at sync. sanitize-html cannot inject children. Do it as a post-sanitize string step (`html.replaceAll('</a>', '<span data-newtab-hint></span></a>')`). This is safe because sanitized output escapes `<` in text, so a literal `</a>` only appears as a real closing tag `[Inference: htmlparser2 entity encoding, decodeEntities: true default]`. Keep `span[data-newtab-hint]` in the allowlist so the **sanitizer alone** stays idempotent on stored HTML. The test is `sanitize(stored) === stored`, **not** `clean(stored) === stored`, because the token step is not idempotent.
  - Simpler alternative, recommended if the planner agrees: skip the token at sync, and have `TextModule.astro` replace `</a>` with `<span class="sr-only" lang="{locale}">{escaped hint}</span></a>` at render. Either way, the render-time replacement must HTML-escape the dictionary string.
- **`<br />`** is emitted in XHTML style. That is harmless in HTML5, and `set:html` content is not parsed by Astro's Rust compiler `[Inference]`.

### Pattern 4: Adapter → model → query layer (DATA-06)
- `SourceProject` gains `modules: readonly SourceModule[]`, where `SourceModule` is a source-agnostic union holding a resolved `ImageMetadata`:
  ```ts
  type SourceImage = { id: string; image: ImageMetadata };
  type SourceModule =
    | { kind: 'image'; img: SourceImage; fullBleed: boolean; caption: string }
    | { kind: 'collection'; images: readonly SourceImage[] }
    | { kind: 'text'; html: string }
    | { kind: 'embed'; provider: 'figma'; src: string }
    | { kind: 'unknown' };
  ```
- `behance-snapshot.ts` adds a second glob, `import.meta.glob<{ default: ImageMetadata }>('/src/assets/projects/modules/*.webp', { eager: true })`. A missing file throws with the same message style as `coverFor`. The existing cover glob is non-recursive (`/src/assets/projects/*.{…}`), so it will not pick up `modules/` [VERIFIED: glob pattern in behance-snapshot.ts:11].
- **Intrinsic dimensions come from `ImageMetadata`** (Astro reads them from the file). This satisfies D-06's "dimensions from the snapshot" in spirit. The snapshot `width`/`height` are also checked against it in a unit test, so the two cannot drift.
- `queries.ts` adds:
  - `getProjectPaths(locale)`: returns `{ params: { slug }, props: { detail } }[]` for **visible** projects only.
  - `getProjectDetail(locale, slug)`
  - Both reuse `loadProjects()` + `sortProjects()`, so the order equals `/projects` (D-13).
- Pure helpers in `src/lib/projects/detail-view.ts` (no `astro:*` imports, so they are Node-testable):
  - `neighbours(sorted, slug) → { next, previous }`. 1 project: both null. 2 projects: next only (UI-SPEC table). 3 or more: both, wrapping.
  - `imageAltFor(override, locale, title, n, total)`, with `n`/`total` counted in DOM order across images and collection components.
  - `collectionRows(n)` → row sizes. For 1–3: `[n]`. For 4: `[2,2]`. For 5: `[3,2]`. In general, rows of 3, and a remainder of 1 is fixed with 2+2.
  - `toolIcon(name, tools)` → `ToolIconKey | null`. Map from the `tools` collection (`name → icon`). Behance tool titles in the snapshot (`Adobe Photoshop`, `Adobe Illustrator`, `Figma`) all match `tools.json` names [VERIFIED].
- `toDetailView` lives in a site-only file, like `card-view.ts`, because it uses `astro:i18n` for hrefs.

### Pattern 5: Embed facade (progressive enhancement, lifecycle-registered)
```astro
<!-- EmbedFacade.astro: markup per UI-SPEC; script registers through the page lifecycle -->
<script>
  import { lifecycle } from '../../lib/motion';
  import { initEmbedFacades } from '../../lib/ui/embed-facade';
  lifecycle.register(initEmbedFacades);
</script>
```
This follows the existing pattern in `RolesMarquee.astro:65-69` [VERIFIED].

`initEmbedFacades(doc)` does the following:
- finds `[data-embed-facade]`
- un-hides `[data-embed-load]`
- binds `click` with an `AbortController` signal (the `marquee.ts` pattern)
- on click:
  1. **re-validates** `new URL(dataset.src)`: `protocol === 'https:'` and the hostname is in `EMBED_PROVIDERS` (shared from `src/lib/projects/embeds.ts`)
  2. creates the iframe with `src`, `title`, `sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"`, `allow="fullscreen"`, `allowfullscreen`, `referrerpolicy="strict-origin-when-cross-origin"`
  3. replaces the children
  4. calls `iframe.focus()`
- returns a cleanup that calls `ac.abort()`

Build the iframe with `document.createElement` and property setters, **never** `innerHTML` with the src.

**Embed src extraction at sync:** Behance stores the iframe as HTML strings (`originalEmbed`, `fluidEmbed`), with `&amp;` entities in `src` [VERIFIED: snapshot]. Parse with sanitize-html's parser rather than a regex: `sanitizeHtml(originalEmbed, { allowedTags: ['iframe'], allowedAttributes: { iframe: ['src'] }, allowedIframeHostnames: [...], transformTags: { iframe: (tag, attribs) => { captured = attribs.src; return { tagName: tag, attribs } } } })`. Then `new URL(captured)` and check the hostname. `[Inference: the parser decodes entities by default (decodeEntities: true, cited README), so attribs.src is decoded]`. Cover this with a unit test on the real Portfolio-web module (expected src `https://embed.figma.com/proto/l6Tt6mne6t9K2TjqphmvRE/portfolio-bruno?node-id=457-78&scaling=…`).

### Pattern 6: Routes
```astro
---
// src/pages/projects/[slug].astro (ES twin passes 'es')
import BaseLayout from '../../layouts/BaseLayout.astro';
import ProjectDetailView from '../../components/views/ProjectDetailView.astro';
import { getProjectPaths } from '../../lib/content/queries';
export async function getStaticPaths() { return getProjectPaths('en'); }
const { detail } = Astro.props;
---
<BaseLayout locale="en" title={detail.seo.title} description={detail.seo.description} ogImage={detail.seo.ogImage}>
  <ProjectDetailView locale="en" detail={detail} />
</BaseLayout>
```
- `getStaticPaths` runs in its own scope and may only use imports, not top-level variables `[CITED: docs.astro.build routing reference; standard Astro behaviour]`.
- The built URL format is `/projects/<slug>/` (directory format; existing cards already emit trailing-slash hrefs) [VERIFIED: `dist/projects/index.html` hrefs].
- **`og:image`:** in the page or view, `const og = await getImage({ src: detail.cover, width: 1200, format: 'jpg' })`, then pass `new URL(og.src, Astro.site).href` into `BaseLayout` → `SeoHead`. Add an optional `image?: string` to `SeoInput`/`SeoTags.og` in `src/lib/seo.ts` and extend `seo.test.ts`. Format `jpg` is chosen for broad OG crawler support `[ASSUMED]`.

### Anti-Patterns to Avoid
- **Putting module images in `src/assets/projects/` (the covers dir).** `commitSync` GC deletes every `COVER_FILE`-matching name not referenced by covers. `<digits>-<12hex>.webp` matches `COVER_FILE`, so **every module image would be deleted on the first sync** [VERIFIED: fs-commit.ts:140-145 + snapshot-schema.ts:6]. Use `modules/` with its own GC pass.
- **Trusting raw `ImageModule.width/height`.** They are `disp` sizes (600px).
- **Trusting `allAvailable` to mean "exists on the CDN".** 6/154 listed `1400_webp` variants 404.
- **Sanitizing at build or render, or `set:html` on `modules[].text`.** Only `content[].html` (sanitized at sync) may reach `set:html`, and only in `TextModule.astro`.
- **Wrapping the whole module stack in `lang={contentLang}`.** It mislabels alt text and UI copy (UI-SPEC §Module stack).
- **Using `innerHTML` to build the iframe**, or loading any Figma resource (preconnect, thumbnail) before the click.
- **Calling the source adapter from components or pages.** ESLint DATA-06 will fail.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML sanitizing | Regex stripping of tags and styles | `sanitize-html` with an allowlist | Entity, nesting, `javascript:` and CSS `url()` edge cases (verified fixtures above) |
| Parsing an iframe `src` out of an HTML string | Regex + manual `&amp;` decode | sanitize-html parser (`transformTags` capture) + `new URL` | Entity decoding and attribute quoting |
| Image re-encoding and dimensions | Manual WebP/PNG header parsing for size | `sharp(...).metadata()` / `.webp()` | Already a transitive dependency at the same version |
| Responsive srcset / AVIF | Hand-built `<picture>` | `astro:assets` `<Picture formats widths sizes>` | Existing cover pattern; hashing, caching, intrinsic dimensions |
| Absolute OG image URL | String concatenation of `/_astro/...` | `getImage()` + `new URL(src, Astro.site)` | Hashed asset paths |
| Next/prev ordering | A second sort | `sortProjects()` (already used by `/projects`) | D-13 requires the identical order |
| Atomic writes | New write logic | Extend `fs-commit.ts` (partial file + rename, copy-if-absent, GC) | Proven by 19 `sync-run` tests and the live run |

**Key insight:** every hard part (sanitizing, image encoding, atomic commit, ordering) already has either a library or a tested in-repo helper. The new code is wiring plus small pure functions.

## Runtime State Inventory

This is not a rename phase, but the sync mutates committed state, so the relevant categories are listed:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `src/data/behance/snapshot.json` (874 KB, 7 projects, no `content` field yet) | A **data migration by live re-sync**, once the code lands (needs network + user go-ahead, like the Phase 3 03-09 `checkpoint:decision`) |
| Live service config | None. No external service holds project state (no CMS, no Worker deployed yet) | none |
| OS-registered state | None | none |
| Secrets/env vars | None. The sync uses no credentials (D-03) | none |
| Build artifacts | `node_modules/.astro` asset cache (warm build 1.3 s); `dist/` 7.9 MB today | Measure a cold build after adding 154 images; `dist/` will grow `[Inference: ~154 × ~180 KB of variants ≈ 25–30 MB]`, so measure it |

## Common Pitfalls

### Pitfall 1: Cover GC deletes module images
**What goes wrong:** the first successful sync removes all module images.
**Why it happens:** `COVER_FILE` matches `<id>-<hash>.webp`, and the GC scans `coversDir`.
**How to avoid:** use a separate `modulesDir`, a separate `referenced` set, and a GC regex scoped to that dir. Add a `sync-commit` test: "module images survive a cover GC" and "unreferenced module images are removed".
**Warning signs:** `coversRemoved` lists ~154 names.

### Pitfall 2: Listed variants that 404
**What goes wrong:** the sync fails on PuroV, or commits a JSON error body.
**How to avoid:** use the candidate chain. A 404 or non-`image/*` moves to the next candidate. Keep the magic-byte sniff. Add a test with a fake fetch that 404s `1400_webp` and serves `1400` PNG → stored as WebP.

### Pitfall 3: Wrong intrinsic dimensions → CLS
**What goes wrong:** using `ImageModule.width/height` (600×320) gives wrong aspect ratios.
**How to avoid:** use the dimensions from the stored file (sharp metadata at sync; `ImageMetadata` at build). Add a unit test that every `content` image's `width/height` equals its imported `ImageMetadata`.

### Pitfall 4: `simpleTransform(..., false)` drops href
**What goes wrong:** every prose link loses its href (verified locally).
**How to avoid:** omit the third argument. A unit test asserts the InstaBlogs href survives.

### Pitfall 5: Build red between schema change and re-sync
**What goes wrong:** the strict `content` field is required, but the committed snapshot lacks it.
**How to avoid:** in the same plan, either (a) run the live sync, or (b) make the adapter and schema changes land after a plan that commits the regenerated snapshot. Never commit a schema the current snapshot fails. Tests that parse the real snapshot (`projects-snapshot.test.ts`) catch it.

### Pitfall 6: Third-party requests before activation
**What goes wrong:** the facade leaks a request to Figma before the click, through preconnect or a poster image.
**How to avoid:** Playwright `page.on('request')` collects hosts on load; assert there are none outside `localhost:4400`. On click, `page.route('https://embed.figma.com/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>x</title>' }))`, so tests never hit the real network.

### Pitfall 7: Astro 7 Rust compiler rejects invalid HTML
**What goes wrong:** the build errors on `<div>` inside `<p>` and similar.
**How to avoid:** `ExternalTextLink` is wrapped in `<p>` in the UI-SPEC, and it is an inline `<a>`, which is fine. Never put block content from `set:html` inside a `<p>`, so the TextModule root must be a `<div>` (as the UI-SPEC says) [CITED: research/STACK.md Astro 7 gotchas].

### Pitfall 8: `lang` on mixed-language text
All 7 projects have `contentLang = 'es'` (default) [VERIFIED: overrides have no `contentLang`]. On EN pages, TextModule roots get `lang="es"`; on ES pages, no attribute. Two modules are bilingual ("¡Gracias! / Thanks!"). This is accepted per UI-SPEC Open Question 3.

### Pitfall 9: Stale e2e link skips
Removing the three `TODO(phase-4)` skips means the tests now **follow** links and expect 200 for all 7 × 2 detail URLs. `tests/e2e/a11y.spec.ts` `projectSteps` currently asserts href only. Update it to navigate, or add a dedicated resolution test.

## Code Examples

### `neighbours` (pure, D-13 + UI-SPEC table)
```ts
// src/lib/projects/detail-view.ts  [Proposed]
export function neighbours<T extends { slug: string }>(
  sorted: readonly T[],
  slug: string,
): { next: T | null; previous: T | null } {
  const index = sorted.findIndex((p) => p.slug === slug);
  if (index === -1) throw new Error(`projects: no visible project with slug "${slug}"`);
  const n = sorted.length;
  if (n < 2) return { next: null, previous: null };
  const next = sorted[(index + 1) % n] ?? null;
  const previous = n === 2 ? null : (sorted[(index - 1 + n) % n] ?? null);
  return { next, previous };
}
```

### `collectionRows` (UI-SPEC rule)
```ts
// [Proposed] 1-3 → [n]; 4 → [2,2]; 5 → [3,2]; 7 → [3,2,2]; remainder 1 becomes 2+2
export function collectionRows(count: number): number[] {
  if (!Number.isInteger(count) || count < 1) throw new Error(`collectionRows: invalid count ${count}`);
  if (count <= 3) return [count];
  const rows = Array<number>(Math.floor(count / 3)).fill(3);
  const rest = count % 3;
  if (rest === 2) rows.push(2);
  if (rest === 1) { rows.pop(); rows.push(2, 2); }
  return rows;
}
```
Real collection sizes are 2–5 components [VERIFIED: UI-SPEC/snapshot].

### moduleAlt override schema
```ts
// overrides-schema.ts  [Proposed]
moduleAlt: z.record(z.string().regex(/^\d+$/), localized).optional(),
// projects.ts validateOverrides: each key must be an image id in that project's content
// (fail: "project-overrides: moduleAlt key {key} for {id} matches no image in the snapshot…"),
// each value ≤125 chars per locale (UI-SPEC developer copy).
```
`validateOverrides` currently receives only `{id, sourceSlug}`. It must also receive per-project image ids, in both the site and the sync (G8). Change the `SourceRef` type accordingly.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Phase 3 sync: covers only, raw modules | Normalized `content` + module images | This phase | Snapshot schema change, plus a re-sync |
| Hotlink Behance CDN / `remotePatterns` | Committed local images through `astro:assets` | Phase 3 decision | Offline build preserved (`build:offline` + `assert-offline.ts`) |
| `<ViewTransitions />` | `<ClientRouter />` (Phase 7) | Astro 6 | The facade uses the lifecycle registry so it survives future swaps |

**Deprecated/outdated:**
- `.planning/research/STACK.md` mentions module images "up to 1920px" and a 150–300 MB estimate. Both are superseded by D-06 (1400px) and the 15.22 MB measurement.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | slopcheck unavailable, so all 3 packages `[ASSUMED]` | Package audit | Low. sharp is already installed and sanitize-html is in STACK.md. Needs a human-verify checkpoint |
| A2 | pnpm strict layout means `scripts/` cannot import sharp without a direct dependency | Standard Stack | Low. If it is wrong, adding the dependency is still harmless |
| A3 | WebP quality 82 for re-encoded fallbacks | Pattern 2 | Visual only. Tune by eye on PuroV |
| A4 | sanitize-html parser decodes `&amp;` in `attribs.src` | Pattern 5 | Embed src would be wrong. A unit test on the real module catches it |
| A5 | A post-sanitize `</a>` replace is safe (text `<` is escaped) | Pattern 3 | XSS-adjacent. Mitigated by the fixed-point and XSS unit tests |
| A6 | Figma prototype works with the sandbox minus `allow-forms`/`allow-pointer-lock` | Pattern 5 | Prototype unresponsive. Manual check per UI-SPEC; add back only the needed token |
| A7 | `og:image` as JPG 1200w is broadly supported | Pattern 6 | Low. SEO polish only |
| A8 | ~6–7 min sync duration at 2 s spacing | Pattern 2 | The run just takes longer. The id + sourceUrl reuse reduces it |
| A9 | `dist/` grows ~25–30 MB; cold build ~100 s+ | Runtime inventory | CI time. Measure and record (AGENTS.md) |

## Open Questions

1. **Spacing for CDN image requests**
   - What we know: D-04 requires 2 s between Behance requests. The CDN is CloudFront/S3 with no challenge.
   - What's unclear: whether the user accepts a shorter interval for `mir-s3-cdn-cf` image GETs.
   - Recommendation: keep 2 s (about 6–7 min per run) and add id + sourceUrl reuse. Ask only if the run time bothers the user.
2. **Fixed-point test vs. hint-token injection**
   - What we know: the UI-SPEC puts the token in at sync.
   - What's unclear: the planner's preference.
   - Recommendation: inject the hint at render in `TextModule.astro`, and keep the snapshot HTML a pure sanitizer output. That gives a simpler invariant: `sanitize(html) === html`.
3. **`h* → p > strong`**
   - What we know: this is not natively expressible, and no module has headings today.
   - Recommendation: use `h* → p` and record the deviation in the plan SUMMARY.
4. **AVIF for module images**
   - What we know: AVIF is about 80% of the transform time, but about 40% smaller than WebP at 1400w (37 KB vs 60 KB in the sample).
   - Recommendation: keep `['avif','webp']` (UI-SPEC). Measure the cold build. Revisit only if CI time hurts.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | sync script (type stripping), build | ✓ | 24.15.0 | — |
| pnpm | everything | ✓ | 11.0.8 | — |
| sharp (+ libvips darwin-arm64) | sync re-encode, astro:assets | ✓ (as Astro's optional dependency) | 0.35.5 | — |
| Network to `www.behance.net` + `mir-s3-cdn-cf.behance.net` | live re-sync (one manual run) | ✓ (HEAD verified 2026-10-17) | — | None. The re-sync needs a user go-ahead checkpoint |
| Playwright Chromium | e2e | ✓ (existing suites) | 1.64.1 | — |
| taste-skill scripts | design gate | path in UI-SPEC (`~/.claude/plugins/marketplaces/taste-skill/...`) | — | not verified in this session `[Unverified]` |

**Missing dependencies with no fallback:** none.
**Blocking at execution time:** the live re-sync needs network access and the user's go-ahead (Phase 3 precedent: 03-09 `checkpoint:decision`).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.5 (`getViteConfig`, `tests/unit/**/*.test.ts`, AstroContainer for components, happy-dom available) + Playwright 1.64.1 against `astro preview` on port 4400 + @axe-core/playwright 4.14.0 |
| Config file | `vitest.config.ts`, `playwright.config.ts` |
| Quick run command | `pnpm vitest run tests/unit/<file>.test.ts` (whole suite: 414 tests in ~1.5 s) |
| Full suite command | `pnpm lint && pnpm test && pnpm test:e2e` (or `pnpm verify`, which also runs `check:secrets`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROJ-02 | Sanitizer: allowlist, 4 real modules, XSS fixtures, href kept, idempotent | unit | `pnpm vitest run tests/unit/sync-sanitize.test.ts` | ❌ Wave 0 |
| PROJ-02 | Committed snapshot `content[].html` is a fixed point of the sanitizer (hand-edit guard) | unit | `pnpm vitest run tests/unit/projects-snapshot.test.ts` | ✅ extend |
| PROJ-02 | Module normalization: image/collection/text/embed/unknown; non-allowlisted embed → unknown + warning; real Portfolio-web src extracted | unit | `pnpm vitest run tests/unit/sync-modules.test.ts` | ❌ Wave 0 |
| PROJ-02 | Variant chain: 404 `1400_webp` → `1400` PNG → stored WebP ≤1400w; all fail → SyncError, old snapshot and images untouched | unit (fake fetch, temp dirs) | `pnpm vitest run tests/unit/sync-run.test.ts` | ✅ extend |
| PROJ-02 | Commit: module dir copy-if-absent, separate GC, covers GC never touches modules | unit | `pnpm vitest run tests/unit/sync-commit.test.ts` | ✅ extend |
| PROJ-02 | Snapshot schema: MODULE_FILE, strict union, host-pinned embed URL rejects others | unit | `pnpm vitest run tests/unit/projects-snapshot.test.ts` | ✅ extend |
| PROJ-02 | Every `content` image file exists and its dimensions equal ImageMetadata | unit | `pnpm vitest run tests/unit/projects-snapshot.test.ts` | ✅ extend |
| PROJ-02 | moduleAlt schema: unknown key fails, >125 chars fails, missing → checklist notice | unit | `pnpm vitest run tests/unit/projects-overrides.test.ts` | ✅ extend |
| PROJ-02 | Alt derivation + DOM-order numbering; never "Image may contain" | unit | `pnpm vitest run tests/unit/project-detail-view.test.ts` | ❌ Wave 0 |
| PROJ-02 | `collectionRows` table | unit | same file | ❌ Wave 0 |
| PROJ-02 | Components render: TextModule (`lang` only when it differs, hint injected and escaped), ImageModule (width/height, eager first), EmbedFacade (button `hidden`, no `<iframe>`, no figma URL outside `data-src`), UnknownModule (Behance link with rel) | unit (AstroContainer) | `pnpm vitest run tests/unit/project-modules.test.ts` | ❌ Wave 0 |
| PROJ-02 | Facade script: un-hides button, click injects sandboxed iframe with title, focus moves, rejects non-allowlisted src, cleanup aborts | unit (happy-dom) | `pnpm vitest run tests/unit/embed-facade.test.ts` | ❌ Wave 0 |
| PROJ-02 | All 7 × 2 detail pages 200; TextModule `lang`; no `behance.net` in img/srcset; no request to a non-local host before click; after click iframe focused (Figma routed to a stub); JS-off button hidden | e2e | `pnpm build && pnpm exec playwright test tests/e2e/project-detail.spec.ts` | ❌ Wave 0 |
| PROJ-02/03 | axe 0 violations on instablogs, portfolio-web (before and after activation), sistema-visual, EN+ES, motion on and reduced | e2e | `pnpm exec playwright test tests/e2e/a11y.spec.ts` | ✅ extend |
| PROJ-03 | `neighbours` wrap, 1/2/3+ cases, hidden excluded, same order as `sortProjects` | unit | `pnpm vitest run tests/unit/project-detail-view.test.ts` | ❌ Wave 0 |
| PROJ-03 | Tool → icon map (matched/unmatched), `ToolIcon size="sm"` → `size-5` | unit | `pnpm vitest run tests/unit/tools-row.test.ts` (or new) | ✅ extend |
| PROJ-03 | `buildSeo` emits `og:image` when given; no date in any meta | unit | `pnpm vitest run tests/unit/seo.test.ts` | ✅ extend |
| PROJ-03 | Detail page shows category, tools, "View on Behance" (rel, new-tab hint), contact CTA → `/#contact` / `/es/#contact`, next/prev hrefs resolve 200 and wrap; h1/h2 ≤2 lines at 320/390/768/1440; no overflow at 320; visual order = DOM order | e2e | `pnpm exec playwright test tests/e2e/project-detail.spec.ts` | ❌ Wave 0 |
| PROJ-03 | Card links on `/`, `/projects/` (EN/ES) resolve 200 (D-09 skips removed) | e2e | `pnpm exec playwright test tests/e2e/projects.spec.ts tests/e2e/home-latest-work.spec.ts tests/e2e/a11y.spec.ts` | ✅ edit |
| PROJ-04..07 | N/A recorded: REQUIREMENTS shows N/A with evidence; PROJ-06 says "by tool"; Projects page has no `role="search"`, `input[type=search]`, filter chips or live result count | e2e regression + doc grep | `pnpm exec playwright test tests/e2e/projects.spec.ts -g "no filter"` and `grep -n "PROJ-0[4-7]" .planning/REQUIREMENTS.md` | ✅ extend |
| D-05 | Added git size and module count recorded | manual + sync output (`module images: N files, X MB added`) | `du -sh src/assets/projects/modules` | — |
| UI gate | taste `lint.mjs` / `inspect.mjs` + screenshot critique | manual (taste skill) | commands in UI-SPEC §Verification | — |

**e2e expectation helper:** extend `tests/e2e/helpers/projects.ts` (Node-safe, reads snapshot + overrides) with `expectedDetail(locale, slug)`: image count, text-module count, embed presence, next/prev slugs from `sortProjects`. That way e2e expectations cannot drift from the data, which is the existing pattern.

### Sampling Rate
- **Per task commit:** `pnpm vitest run <touched test files>` + `pnpm exec astro check` for `.astro` changes
- **Per wave merge:** `pnpm lint && pnpm test`; `pnpm test:e2e` after any page/component wave
- **Phase gate:** `pnpm verify` green + `pnpm build:offline` green (offline build with the 154 new images) + taste gate before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/sync-sanitize.test.ts`: sanitizer fixtures (4 real modules copied as fixtures + XSS set)
- [ ] `tests/unit/sync-modules.test.ts`: content normalization + embed extraction
- [ ] `tests/unit/project-detail-view.test.ts`: `neighbours`, `collectionRows`, alt numbering, tool icons
- [ ] `tests/unit/project-modules.test.ts`: AstroContainer renders of the module components
- [ ] `tests/unit/embed-facade.test.ts`: happy-dom (check how existing `marquee-toggle.test.ts` sets up the DOM)
- [ ] `tests/e2e/project-detail.spec.ts` + `helpers/projects.ts` `expectedDetail`
- [ ] Fixtures: a small PNG and a small WebP in `tests/fixtures/behance/` for the variant-chain test (`cover.png` exists; add `module.webp`)
- [ ] No framework install needed

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | static site, no auth |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation / Output Encoding | **yes** | Zod strict schemas (snapshot `content`, `moduleAlt`); sanitize-html allowlist; `{}` interpolation everywhere except the one sanitized `set:html` |
| V6 Cryptography | no (sha256 only for file naming, via `node:crypto`) | — |
| V12 Files and Resources | **yes** | Host-allowlisted downloads, `redirect: 'error'`, size caps, magic-byte sniff, names from digits + hash only |
| V14 Configuration / third-party content | **yes** | iframe sandbox + allowlist + click-to-load; `rel="noopener noreferrer"` |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stored XSS via TextModule HTML (Behance or a hand-edited snapshot) | Tampering | Sanitize at sync + fixed-point unit test on the committed snapshot + only one `set:html` site (grep-asserted, as T-03-02) |
| Malicious embed src (`javascript:`, other origins) | Tampering / Elevation | Sync allowlist → Zod host-pinned https URL → client re-check before `iframe.src`; `createElement`, never `innerHTML` |
| Reverse tabnabbing from prose and external links | Spoofing | `rel="noopener noreferrer"` set by the sanitizer transform; e2e asserts every `target=_blank` |
| Path traversal / arbitrary file write from scraped names | Tampering | `MODULE_FILE` regex; ids must be digits; hash names (existing T-03-05 pattern) |
| SSRF / unexpected hosts in the sync | Info disclosure | Existing `assertAllowed` CDN allowlist + `redirect: 'error'` for every candidate |
| Privacy leak to Figma before consent | Info disclosure | No third-party request before click (e2e request log) |
| DoS through huge images | DoS | Existing 10 MB cap (`MAX_COVER_BYTES`); max observed module image 1.27 MB |

## Sources

### Primary (HIGH confidence)
- Repo code read 2026-10-17: `scripts/behance/{run-sync,fetch-page,fs-commit,covers,normalize}.ts`, `src/lib/projects/*`, `src/lib/content/queries.ts`, `src/lib/seo.ts`, `src/lib/motion/{lifecycle,index,marquee}.ts`, `src/components/**`, `eslint.config.js`, `package.json`, test configs
- `src/data/behance/snapshot.json`: module counts, variants, ids, text and embed HTML (scripted analysis)
- Live CDN: HEAD of 154 `1400_webp` variants + all variants of the 6 failures; one sample download (`sips`/`file`: 1400×2036 VP8)
- Local verification of sanitize-html 2.18.1 options (4 real modules + 11 XSS fixtures); sharp 0.35.5 encode benchmark
- npm registry: sanitize-html 2.18.1 (repo, dependencies, publish times, no postinstall), @types/sanitize-html 2.16.2, sharp 0.35.5
- `astro/dist/runtime/server/render/util.js` `toStyleString` (custom properties pass through unchanged)
- https://tailwindcss.com/docs/flex-grow (`grow-(<custom-property>)`)
- sanitize-html README (github.com/apostrophecms/apostrophe/packages/sanitize-html): allowedStyles, transformTags/simpleTransform merge, exclusiveFilter `excludeTag`, disallowedTagsMode

### Secondary (MEDIUM confidence)
- `.planning/research/STACK.md` (Astro 7 gotchas, Behance CDN behaviour, sharp `approve-builds`)
- Phase 3 artifacts: `03-CONTEXT.md` (D-05, D-06, D-09, D-21), `03-VERIFICATION.md` SC1, `03-SECURITY.md` T-03-01..09, `03-09-SUMMARY.md` (live-sync checkpoint precedent)

### Tertiary (LOW confidence)
- None used for recommendations.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH. Versions come from the registry and installed files; the only gap is slopcheck being unavailable.
- Architecture: HIGH. It follows existing tested in-repo patterns, and the GC and dimension pitfalls were verified in code and data.
- Pitfalls: HIGH. The 404 variants, the `disp` dimensions, the GC regex collision and the `simpleTransform` merge were each reproduced or measured.
- Performance numbers: MEDIUM. They come from a single-image benchmark and HEAD sizes. Cold build and `dist/` size must be measured after the change.

**Research date:** 2026-10-17
**Valid until:** 2026-11-16 for the code and libraries. CDN variant availability can change at any time, so the sync must keep the fallback chain regardless.
