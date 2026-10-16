# Architecture Research

**Domain:** Motion-rich, bilingual (EN/ES) designer portfolio. Astro, Tailwind, projects sourced from Behance, Cloudflare hosting target.
**Researched:** 2026-10-15
**Confidence:** MEDIUM-HIGH. Astro and Cloudflare platform facts come from the official docs. Folder layout and motion lifecycle are recommended patterns and are labeled as such.

> Labeling follows the user's conventions. **[Documented]** means confirmed in official docs fetched today. **[Inference]**, **[Proposed]** and **[Unverified]** mean what they say. Every architectural recommendation here is **[Proposed]** until implemented and tested.

---

## 0. Platform facts that shape the architecture (verified 2026-10-15)

| Fact | Status | Source |
|------|--------|--------|
| Latest `astro` on npm is **7.4.0**. Astro 7 moves to Vite 8, makes the Rust compiler the default (it rejects unclosed tags), and sets `compressHTML` default to `'jsx'` | [Documented] npm + v7 upgrade guide | npm, docs.astro.build/en/guides/upgrade-to/v7/ |
| Astro 7 removed the `astro:transitions` helper internals (`TRANSITION_*` constants, `isTransitionBeforeSwapEvent()` and similar). **Use the raw event names** (`'astro:page-load'`, `'astro:before-swap'`) | [Documented] | v7 upgrade guide |
| Output modes are `'static'` (the default) and `'server'`. **`'hybrid'` no longer exists.** A static site opts individual routes into on-demand rendering with `export const prerender = false`, which **requires an adapter** | [Documented] | docs.astro.build/en/guides/on-demand-rendering/ |
| `@astrojs/cloudflare` is at **14.4.0**. **Cloudflare Pages support was removed in v13, so target Cloudflare Workers (static assets + Worker).** Static files are served first and unmatched requests fall through to the Worker | [Documented] | docs.astro.build/en/guides/integrations-guide/cloudflare/ |
| Read secrets with `import { env } from 'cloudflare:workers'` or `astro:env`. `Astro.locals.runtime` was removed. Local secrets go in `.dev.vars` | [Documented] | same |
| `astro dev` runs on `workerd` through the Cloudflare Vite plugin. CommonJS-only dependencies can break. `prerenderEnvironment` can be set to `'node'` | [Documented] | same |
| The adapter's default `imageService` is `cloudflare-binding`. A `compile` option does build-time transforms for prerendered routes | [Documented] | same |
| Content Layer object loaders get `store`, `meta`, `logger`, `parseData`, `generateDigest`, `renderMarkdown`. `meta` **persists between builds**. `store.set` skips an entry when its digest is unchanged. Live loaders exist (added in 6.0) | [Documented] | docs.astro.build/en/reference/content-loader-reference/ |
| Actions use `defineAction`, `accept: 'form'` and `import { z } from 'astro/zod'`. They can be called from a `<script>`. **Calling an action from an HTML form `action=` attribute requires that page to be on-demand rendered** | [Documented] | docs.astro.build/en/guides/actions/ |
| Actions endpoints run on demand when an adapter is present, even under `output: 'static'` | [Inference] MEDIUM. The docs don't say this explicitly. Confirm with a spike in the contact phase | — |
| ClientRouter lifecycle: `before-preparation`, `after-preparation`, `before-swap`, `after-swap`, `page-load`. **Bundled module scripts run only once.** Inline scripts can re-run, and `data-astro-rerun` forces it. ClientRouter disables VT animations under `prefers-reduced-motion` | [Documented] | docs.astro.build/en/guides/view-transitions/ |
| i18n: with `prefixDefaultLocale: false`, English lives at `/` and Spanish at `/es/`. `Astro.currentLocale` works on prerendered pages. Helpers: `getRelativeLocaleUrl`, `getAbsoluteLocaleUrl(List)`. **Astro has no built-in UI string dictionary** | [Documented] | docs.astro.build/en/guides/internationalization/ |
| Workers Builds has **Deploy Hooks** (launched 2026-04-01). POSTing to the hook URL triggers a build. A Cron-Trigger Worker can call it. Repeated triggers are deduplicated | [Documented] | developers.cloudflare.com/changelog/2026-04-01-deploy-hooks |
| Cloudflare Email Service: a `send_email` binding lets a Worker send mail with `env.EMAIL.send()`. It needs an onboarded sender domain. Sending to arbitrary recipients needs the paid plan. It may still be beta | [Documented]/MEDIUM | developers.cloudflare.com/email-routing/send-email/ |
| `@tabler/icons` (3.49.0) ships raw SVGs (`exports: './*' -> './icons/*'`). There is **no** official `@tabler/icons-astro` package on npm | [Verified] by `npm view` | npm |

---

## Standard Architecture

### System Overview

```
┌──────────────────────────── BUILD TIME (Node/workerd, CI) ─────────────────────────────┐
│                                                                                         │
│  Behance (RSS / HTML / API)        Local content (YAML/MD)       i18n dictionaries      │
│        │                                  │                        (src/i18n/*.ts)      │
│        ▼                                  ▼                              │              │
│  ┌──────────────────┐   fail   ┌───────────────────┐                     │              │
│  │ Source adapter   │────────▶ │ Snapshot (JSON,   │                     │              │
│  │ (behance.ts)     │          │ committed to git) │                     │              │
│  └────────┬─────────┘          └─────────┬─────────┘                     │              │
│           └──────────┬───────────────────┘                               │              │
│                      ▼                                                   │              │
│        ┌───────────────────────────┐   ┌───────────────────────────┐     │              │
│        │ Normalizer → Project model│   │ Content collections:      │     │              │
│        │ (Zod schema, sanitize HTML│   │ services, tools, profile  │     │              │
│        │  slugify, image metadata) │   │ (per-locale fields)       │     │              │
│        └────────────┬──────────────┘   └─────────────┬─────────────┘     │              │
│                     ▼                                ▼                   ▼              │
│        ┌──────────────────────────────────────────────────────────────────────┐         │
│        │ Astro Content Layer data store  (getCollection / getEntry)           │         │
│        └──────────────────────────────┬───────────────────────────────────────┘         │
│                                       ▼                                                 │
│        ┌──────────────────────────────────────────────────────────────────────┐         │
│        │ Pages (thin locale wrappers) → Page views → Sections → UI primitives │         │
│        │ + search index JSON (projects list, prerendered endpoint)            │         │
│        └──────────────────────────────┬───────────────────────────────────────┘         │
└───────────────────────────────────────┼─────────────────────────────────────────────────┘
                                        ▼  dist/ (static HTML/CSS/JS/images) + _worker.js
┌──────────────────────────── RUNTIME (Cloudflare Workers) ──────────────────────────────┐
│  Static assets (99% of requests)            Worker (only on-demand routes)              │
│  /, /es/, /projects/*, /es/projects/*        /_actions/contact  ──▶ Turnstile verify    │
│                                                                 ──▶ Mailer port         │
│                                                                      (CF Email/Resend)  │
└─────────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────── BROWSER ───────────────────────────────────────────────────┐
│  ClientRouter (view transitions)                                                        │
│  Motion runtime: lifecycle registry ← reduced-motion gate                               │
│     ├─ smooth scroll + parallax   ├─ scroll reveals   ├─ cursor / magnetic / hover      │
│  Feature scripts: language switcher, project search/filter, contact form submit         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation | Talks to |
|-----------|----------------|------------------------|----------|
| **Project model** (`src/lib/projects/model.ts`) | Single source-agnostic shape for a project. Owns nothing Behance-specific | Zod schema + inferred TS type | Imported by everything that reads projects |
| **Source adapters** (`src/lib/projects/sources/*`) | Fetch raw data from one source and map it to `Project` | One file per source: `behance.ts`, `snapshot.ts`, `fixtures.ts`. Each implements a `ProjectSource` interface | Behance (network), filesystem (snapshot) |
| **Project loader** (`src/lib/projects/loader.ts`) | Astro Content Layer object loader. Picks a source, applies the fallback chain, writes to `store` with digests | `{ name, load(ctx) }`, registered in `src/content.config.ts` | Adapters → Content Layer |
| **Snapshot sync script** (`scripts/sync-behance.ts`) | Pull live data and write `src/data/projects.snapshot.json` (committed) | `pnpm sync:projects`. Reuses the same adapter + normalizer | Behance adapter, filesystem |
| **Content collections** (`src/content.config.ts`) | `projects` (custom loader), `services`, `tools`, `profile` (`file()`/`glob()` loaders, per-locale fields) | Astro Content Layer | Data files, loader |
| **i18n module** (`src/i18n/`) | Locale list, typed UI dictionaries, `t()` helper, route mapping (`alternateUrl`) | Plain TS + `astro:i18n` helpers | Layouts, components, language switcher |
| **Layouts** (`src/layouts/`) | HTML shell: `<html lang>`, head/SEO/hreflang, ClientRouter, global header/footer, motion bootstrap | `BaseLayout.astro`, `ProjectLayout.astro` | i18n, motion runtime, components |
| **Page wrappers** (`src/pages/**`) | Routing only: resolve locale, `getStaticPaths`, render a view | 3–10 line `.astro` files, duplicated per locale | Views |
| **Views** (`src/components/views/`) | Compose sections for one page type. Locale-agnostic (locale passed as prop) | `HomeView.astro`, `ProjectsView.astro`, `ProjectDetailView.astro` | Sections, collections |
| **Sections** (`src/components/sections/`) | One homepage/page block each: Hero, RolesMarquee, FeaturedServices, ToolsGrid, LatestProjects, ContactSection | `.astro`, server-rendered, emit `data-*` motion hooks | UI primitives |
| **UI primitives** (`src/components/ui/`) | Button, Link, Icon wrappers, Tag, ProjectCard, Image wrapper | Small `.astro` components, Tailwind only | — |
| **Project content renderers** (`src/components/project/`) | Render `Project.modules[]` (image / text / grid / embed) | One component per module type + `ModuleRenderer.astro` switch | Project model |
| **Motion runtime** (`src/lib/motion/`) | Reduced-motion gate, page lifecycle registry, effect modules | Vanilla TS, imported by `<script>` tags. No framework islands | DOM `data-*` hooks, ClientRouter events |
| **Feature scripts** (`src/scripts/` or co-located `<script>`) | Search/filter, contact submit, language switcher persistence | Vanilla TS modules registered with the lifecycle registry | Search index JSON, `astro:actions` |
| **Contact action** (`src/actions/index.ts`) | Validate input, check honeypot/Turnstile, call the mailer | `defineAction({ accept: 'form', input: z.object(...) })` | Mailer port, Turnstile |
| **Mailer port** (`src/lib/mail/`) | Interface `sendContact(msg)`. Implementations: `cloudflare-email.ts`, `resend.ts`, `console.ts` (dev) | Selected by env | External email provider |

---

## Recommended Project Structure

```
designer-portfolio/
├── astro.config.ts                # i18n, adapter (added in contact phase), image domains
├── wrangler.jsonc                 # added with adapter; send_email binding, vars
├── .dev.vars                      # local secrets (gitignored)
├── scripts/
│   └── sync-projects.ts           # pnpm sync:projects → refresh committed snapshot
├── public/                        # favicons, og fallback, _headers / _redirects if needed
└── src/
    ├── content.config.ts          # collections: projects (custom loader), services, tools, profile
    ├── actions/
    │   └── index.ts               # export const server = { contact: defineAction(...) }
    ├── data/                      # authored content + snapshot (not code)
    │   ├── projects.snapshot.json # last-good normalized Project[] (committed)
    │   ├── services.yaml          # 4 featured services, { en, es } fields
    │   ├── tools.yaml             # apps she uses (+ logo asset refs)
    │   └── profile.yaml           # name, title, bio, roles for marquee, { en, es }
    ├── assets/                    # images processed by astro:assets (portrait, tool logos)
    ├── i18n/
    │   ├── config.ts              # locales = ['en','es'] as const, defaultLocale
    │   ├── ui.en.ts               # source dictionary (as const)
    │   ├── ui.es.ts               # satisfies Dictionary (type-checked completeness)
    │   ├── t.ts                   # useTranslations(locale) → t(key)
    │   └── routes.ts              # localizePath / alternateUrl / stripLocale
    ├── lib/
    │   ├── projects/
    │   │   ├── model.ts           # ProjectSchema (Zod) + type Project
    │   │   ├── source.ts          # interface ProjectSource { fetchAll(): Promise<Project[]> }
    │   │   ├── sources/
    │   │   │   ├── behance.ts     # raw fetch + map (approach decided by data research)
    │   │   │   ├── snapshot.ts    # read src/data/projects.snapshot.json
    │   │   │   └── fixtures.ts    # deterministic fake data for UI dev + tests
    │   │   ├── normalize.ts       # sanitize HTML, slugify, dedupe, sort by date
    │   │   ├── loader.ts          # Content Layer loader with fallback chain
    │   │   └── queries.ts         # getLatestProjects(n), getFacets(), getProjectBySlug()
    │   ├── motion/
    │   │   ├── gate.ts            # prefersReducedMotion(), onMotionPreferenceChange()
    │   │   ├── lifecycle.ts       # onPage(init → cleanup) registry bound to astro events
    │   │   ├── smooth-scroll.ts   # Lenis (or equiv) + parallax driver
    │   │   ├── reveal.ts          # IntersectionObserver-driven [data-reveal]
    │   │   ├── cursor.ts          # custom cursor (persisted element)
    │   │   ├── magnetic.ts        # [data-magnetic]
    │   │   └── marquee.ts         # only if CSS-only marquee is insufficient
    │   ├── mail/
    │   │   ├── mailer.ts          # interface + factory
    │   │   └── providers/{cloudflare-email,resend,console}.ts
    │   └── seo.ts                 # canonical, hreflang, og builders
    ├── utils/                     # pure, framework-free helpers (slugify, dates, cn)
    ├── layouts/
    │   ├── BaseLayout.astro
    │   └── ProjectLayout.astro
    ├── components/
    │   ├── ui/                    # Button, IconLink, Tag, ProjectCard, Picture, VisuallyHidden
    │   ├── icons/                 # thin wrappers only if needed; prefer direct SVG imports
    │   ├── global/                # SiteHeader, SiteFooter, LanguageSwitcher, SkipLink, Cursor
    │   ├── sections/              # Hero, RolesMarquee, FeaturedServices, ToolsGrid,
    │   │                          # LatestProjects, ContactSection
    │   ├── project/               # ModuleRenderer, ImageModule, TextModule, GridModule, EmbedModule
    │   ├── projects/              # ProjectGrid, ProjectFilters, SearchBox, EmptyState
    │   ├── contact/               # ContactForm, FormField, FormStatus
    │   └── views/                 # HomeView, ProjectsView, ProjectDetailView, NotFoundView
    ├── pages/
    │   ├── index.astro            # <HomeView locale="en" />
    │   ├── projects/index.astro
    │   ├── projects/[slug].astro
    │   ├── projects.json.ts       # prerendered search index (optional; or inline JSON)
    │   ├── 404.astro
    │   └── es/
    │       ├── index.astro        # <HomeView locale="es" />
    │       ├── projects/index.astro
    │       └── projects/[slug].astro
    └── styles/
        └── global.css             # @import "tailwindcss"; @theme tokens; reduced-motion base
```

### Structure Rationale

- **`lib/projects/` is a hexagon in miniature.** `model.ts` is the core and `sources/*` are adapters. UI code imports only `Project` and `queries.ts`, never `sources/behance.ts`. Swapping RSS for scraping, the API, or local MD touches one file. [Proposed]
- **`data/` vs `lib/`:** authored content and the snapshot are data, not code, so Martina's reviewable copy (services, bio, translations of static content) sits together in YAML with `{ en, es }` fields. [Proposed]
- **Thin page wrappers + `views/`:** Astro's i18n routing is file-based. With `prefixDefaultLocale: false`, Spanish needs real files under `src/pages/es/`. Keeping wrappers to a few lines makes the duplication harmless. A `[...lang]` catch-all is possible, but it fights i18n helpers and makes 404 handling murkier. [Inference]
- **`components/` split by role (ui / global / sections / project / projects / contact / views):** this follows the AGENTS.md rule of small single-responsibility components in clear folders. `sections/` maps 1:1 to requirements, which makes phase planning trivial.
- **Motion in `lib/motion/` as vanilla TS, not islands.** None of the effects need component state or a framework runtime. Astro `<script>` modules are bundled, deduped and cached. A React/Svelte island would add a runtime for no benefit, and AGENTS.md says not to add dependencies until needed. [Proposed]
- **No `src/pages/api/contact.ts` + `fetch` pattern.** Astro Actions give typed input/output and Zod validation for free. Use an API endpoint only if the Actions-on-static spike fails. [Proposed]

---

## Architectural Patterns

### Pattern 1: Static-first output with a single on-demand surface

**What:** Keep `output: 'static'` (the default). Every page is prerendered. Add `@astrojs/cloudflare` only when the contact form arrives. The only Worker-executed code is the contact Action (`/_actions/*`).
**When to use:** Content that changes when she posts on Behance (weekly at most), not per request.
**Trade-offs:**
- Pros: near-zero runtime cost and attack surface. Behance is never hit by visitor traffic. Pages are cacheable at the edge. A v1 local build works without any Cloudflare account. Behance being down never affects visitors.
- Cons: new Behance work appears only after a rebuild, so there is refresh latency (see Pattern 3).
- **Rejected: runtime fetching / live loaders for projects.** It would hit Behance per request (or need KV caching), expose the site to Behance outages, rate limits and bot blocking at request time, and make the detail pages SSR. That is worse for performance and adds no visible benefit at this content cadence. [Proposed]

```ts
// astro.config.ts  (contact phase)
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://example.com',              // required for hreflang/canonical absolute URLs
  // output: 'static' is the default; do not set 'server'
  adapter: cloudflare({ imageService: 'compile' }), // build-time image transforms for prerendered pages
  i18n: {
    locales: ['en', 'es'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: false },
  },
  image: { domains: ['mir-s3-cdn-cf.behance.net'] }, // [Unverified] confirm the actual Behance CDN host
  vite: { plugins: [tailwindcss()] },
});
```

### Pattern 2: Source-agnostic Project model + adapter + fallback chain

**What:** The domain type is defined once. Adapters map raw source data into it. The loader tries sources in order and fails soft.

```ts
// src/lib/projects/model.ts
import { z } from 'astro/zod';

const ImageRef = z.object({ src: z.string().url(), width: z.number(), height: z.number(), alt: z.string() });

export const ProjectModule = z.discriminatedUnion('type', [
  z.object({ type: z.literal('image'), image: ImageRef, caption: z.string().optional() }),
  z.object({ type: z.literal('text'), html: z.string() }),           // already sanitized
  z.object({ type: z.literal('grid'), images: z.array(ImageRef) }),
  z.object({ type: z.literal('embed'), provider: z.string(), url: z.string().url() }),
]);

export const ProjectSchema = z.object({
  id: z.string(),                 // stable source id → also Content Layer entry id
  slug: z.string(),
  title: z.string(),
  summary: z.string().optional(),
  publishedAt: z.coerce.date(),
  cover: ImageRef,
  fields: z.array(z.string()).default([]),   // Behance "creative fields" if exposed
  tools: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  modules: z.array(ProjectModule).default([]),
  sourceUrl: z.string().url(),
  contentLang: z.enum(['en', 'es', 'und']).default('und'), // Behance text kept in original language
});
export type Project = z.infer<typeof ProjectSchema>;
```

```ts
// src/lib/projects/loader.ts (sketch)
import type { Loader } from 'astro/loaders';
import { ProjectSchema } from './model';
import { behanceSource } from './sources/behance';
import { snapshotSource } from './sources/snapshot';
import { fixturesSource } from './sources/fixtures';

export function projectsLoader(opts: { mode: 'live' | 'snapshot' | 'fixtures' }): Loader {
  return {
    name: 'projects',
    schema: ProjectSchema,
    async load({ store, parseData, generateDigest, logger, meta }) {
      const chain = opts.mode === 'fixtures' ? [fixturesSource]
                  : opts.mode === 'snapshot' ? [snapshotSource]
                  : [behanceSource, snapshotSource];
      let projects;
      for (const source of chain) {
        try { projects = await source.fetchAll({ timeoutMs: 15_000 }); break; }
        catch (err) { logger.warn(`${source.name} failed: ${String(err)}. Falling back.`); }
      }
      if (!projects?.length) throw new Error('No project source succeeded'); // only if snapshot is also missing
      store.clear();
      for (const p of projects) {
        const data = await parseData({ id: p.id, data: p });
        store.set({ id: p.id, data, digest: generateDigest(data) });
      }
      meta.set('lastSource', chain[0].name);
    },
  };
}
```

**When to use:** Always here. The Behance access method is the project's biggest unknown, and it may change later if Behance blocks scraping.
**Trade-offs:** about 3 extra small files. In exchange, builds never fail because Behance is unreachable, UI development can start on fixtures before the data approach is decided, and tests run offline and deterministically.
**Mode selection:** use an env var `PROJECTS_SOURCE=live|snapshot|fixtures`. Default to `snapshot` for `pnpm dev` (fast, offline) and `live` in CI builds. [Proposed]

### Pattern 3: Refresh = rebuild (snapshot-first, deploy hook later)

**What:** There are two ways new Behance work reaches the site.
1. **Manual (v1):** run `pnpm sync:projects`, which writes the snapshot JSON. Then commit. The commit triggers a build when deployment exists. The diff is reviewable, and it works even if Behance blocks CI IPs.
2. **Automated (post-v1, when deployed):** a tiny separate Worker with a Cron Trigger (e.g. daily) POSTs to a **Workers Builds Deploy Hook** [Documented]. The build runs the loader in `live` mode and falls back to the committed snapshot on failure.

**Trade-offs:** the snapshot can go stale if live fetch keeps failing silently. Mitigate by logging `lastSource` and failing CI only if the snapshot is older than N days (optional). [Proposed]
**Note:** `meta` persists between builds [Documented], but CI build caches on Workers Builds are not guaranteed to keep `.astro/`. Do not rely on the data store as the fallback. **The committed snapshot is the fallback.** [Inference]

### Pattern 4: i18n as three distinct content classes

| Content class | Where it lives | Mechanism |
|---------------|----------------|-----------|
| **UI strings** (nav, buttons, form labels, a11y labels, section headings) | `src/i18n/ui.en.ts` + `ui.es.ts` | Typed dictionary. `ui.es.ts` uses `satisfies Record<keyof typeof en, string>`, so a missing translation is a **type error** and fails `astro check` |
| **Localized static content** (bio, title, 4 services, tool descriptions, marquee roles) | `src/data/*.yaml` with `{ en: ..., es: ... }` per field, loaded via `file()` collections | Zod schema `localized = z.object({ en: z.string(), es: z.string() })`. The view picks `entry.data.title[locale]` |
| **Behance project content** (titles, descriptions, text modules) | Project collection | **Not translated.** Rendered as-is, wrapped in `lang={project.contentLang}` when known, so screen readers pronounce it correctly. UI chrome around it is still translated |

**Routing / switcher:**
- Use the same slugs and the same path segments in both locales (`/projects/x`, `/es/projects/x`). The switcher is then a pure prefix swap: `alternateUrl(currentPath, targetLocale)` built on `getRelativeLocaleUrl(target, stripLocale(path))`. Translated segments (`/es/proyectos/`) would need a route map. Defer that unless SEO demands it. [Proposed]
- `BaseLayout` emits `<link rel="alternate" hreflang="en|es|x-default">` with `getAbsoluteLocaleUrlList` (needs `site`). It sets `<html lang={Astro.currentLocale}>`.
- The switcher is a plain `<a href>` (works without JS, crawlable) with `hreflang` and `lang` attributes. Optionally save the choice in `localStorage`, but **never auto-redirect** based on `navigator.language` on a static site, because it breaks shareable URLs. [Proposed]
- Keep dates/numbers locale-aware via `Intl.DateTimeFormat(locale)` in `utils/format.ts`.

```ts
// src/i18n/t.ts
import en from './ui.en';
import es from './ui.es';
const dict = { en, es } as const;
export type Locale = keyof typeof dict;
export type UIKey = keyof typeof en;
export const useTranslations = (locale: Locale) => (key: UIKey) => dict[locale][key];
```

### Pattern 5: Motion runtime = gate + lifecycle registry + declarative hooks

**What:** Markup declares intent with data attributes (`data-reveal`, `data-parallax="0.2"`, `data-magnetic`, `data-hover="distort"`). A single motion runtime discovers them per page, inits effects and keeps their cleanups. Sections never contain animation code.

```ts
// src/lib/motion/gate.ts
const mq = typeof window !== 'undefined' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
export const motionAllowed = () => !mq?.matches;
export const onMotionChange = (cb: (allowed: boolean) => void) =>
  mq?.addEventListener('change', () => cb(motionAllowed()));

// src/lib/motion/lifecycle.ts
type Cleanup = () => void;
type Init = (root: Document) => Cleanup | void;
const inits: Init[] = [];
let cleanups: Cleanup[] = [];

export function onPage(init: Init) { inits.push(init); }

function mount() { cleanups = inits.map((fn) => fn(document)).filter(Boolean) as Cleanup[]; }
function unmount() { cleanups.forEach((c) => c()); cleanups = []; }

document.addEventListener('astro:page-load', mount);   // fires on first load AND each navigation
document.addEventListener('astro:before-swap', unmount); // old DOM still present: kill observers/tweens
```

**Rules:** [Proposed]
1. **One registry, one entry point.** `BaseLayout` has a single `<script>` importing `lib/motion/index.ts`, which registers all effects. Bundled module scripts run once [Documented], so registration happens once and the lifecycle events drive per-page work.
2. **Gate is checked inside each effect's init**, not at import time. On a `change` of `prefers-reduced-motion`, call `unmount(); mount();` so effects re-evaluate live.
3. **Reduced motion means disable, not just speed up.** No smooth scroll hijack, no parallax, no cursor follower, no magnetic offsets. Reveals become instant (content visible). Keep only opacity fades of ≤200ms if any. ClientRouter already disables VT animations under reduced motion [Documented].
4. **No-JS / failed-JS safety:** initial hidden states for reveals must apply only when `html` has `data-motion="on"`. A tiny **inline** `<script is:inline>` in `<head>` sets that before first paint if JS runs and motion is allowed. **ClientRouter replaces `<html>` attributes on swap** [Inference, to verify in spike], so re-apply in `astro:after-swap`.
5. **Persisted elements:** the custom cursor and header live outside the swap with `transition:persist`. They init once (guard with a module-level flag) and are not torn down per page.
6. **Smooth scroll:** destroy and recreate the scroll instance per page (in the registry), or call `scrollTo(0, { immediate: true })` + `resize()` on `page-load`. Otherwise ClientRouter's scroll restoration and the inertial scroller fight. [Inference, verify in motion phase]
7. **Avoid layout thrash:** animate only `transform`/`opacity`. Use IntersectionObserver for reveals (no scroll listeners). Run a single rAF loop shared by parallax/cursor/magnetic. Read layout (`getBoundingClientRect`) once on init/resize, never inside the rAF write path. Use `will-change` only during active animation. Give every image intrinsic `width`/`height` (astro:assets does this) so reveals don't shift layout.
8. **Page transitions** use ClientRouter + `transition:name` for shared elements (project card cover → detail hero). Native cross-document VT (`@view-transition { navigation: auto }`) is a simpler alternative with no lifecycle complexity, because every navigation is a full load. Browser coverage differs, though, and persisted cursor/scroll state is lost. **Recommend ClientRouter**, with the registry designed so switching is cheap. [Proposed. Browser support for cross-document VT is LOW confidence, re-check in the motion phase]

### Pattern 6: Client-side search/filter over a build-time index

**What:** The projects page renders **all** cards server-side (SEO, no-JS works). A small vanilla script reads `data-fields`, `data-tools` and `data-title` attributes (or an inline `<script type="application/json">` index), filters by toggling `hidden`, and syncs state to the URL query (`?field=branding&q=logo`) so filtered views are shareable. It announces the result count via an `aria-live` region.
**When to use:** under roughly 200 projects (a personal Behance profile). No search library is needed. Add a fuzzy lib only if measured UX demands it. [Proposed]
**Dependency:** facets exist only for metadata Behance actually exposes. The `fields/tools/tags` arrays in the model default to `[]`, so the filter UI hides facets with no values.

### Pattern 7: Contact form via Action + mailer port

**What:** `ContactForm.astro` is a real `<form method="POST">` with labelled fields, a honeypot and a Turnstile widget. A client script intercepts submit and calls `actions.contact(formData)`. It shows inline errors from `isInputError(error)` and moves focus to the first invalid field or the status message. The Action validates (Zod), verifies Turnstile server-side, then calls `mailer.sendContact()`.
**Implications for output mode:** the page stays **prerendered**. The docs say form-attribute action calls need an on-demand page, so use the **script call path** and degrade with a `mailto:` fallback inside `<noscript>`. The alternative is to make only the contact submission target an on-demand endpoint `prerender = false` that redirects back with `?sent=1`. [Proposed]
**Why a mailer port:** v1 is local-only, with no domain onboarded for Cloudflare Email Service. `console` provider in dev, `cloudflare-email` (binding, no API key) or `resend` in production. Picking the provider then becomes a deploy-time decision. [Proposed]

---

## Data Flow

### Build-time content flow (one direction, top to bottom)

```
Behance ──fetch──▶ behance.ts (raw → Project) ─┐
                                               ├─▶ loader.ts ─parseData/digest─▶ Content Layer store
snapshot.json ──read──▶ snapshot.ts ───────────┘        (fallback)
                                                                 │
src/data/*.yaml ──file() loader──▶ services/tools/profile ───────┤
                                                                 ▼
                                     lib/projects/queries.ts (latest 3, facets, by slug)
                                                                 │
           pages/*.astro (locale) ──props──▶ views ──props──▶ sections ──props──▶ ui
                                                 ▲
                         i18n/t.ts (UI strings) ─┘
```

- Data flows **down only**, via props. Components never call `getCollection` except views/queries. That keeps sections testable with the Container API.
- `scripts/sync-projects.ts` is the **only writer** of `projects.snapshot.json`. The loader only reads it.

### Runtime flows

1. **Navigation:** click → ClientRouter fetches the static HTML → `before-swap` (motion `unmount`) → DOM swap → `after-swap` (re-apply `data-motion`) → `page-load` (motion `mount`, feature scripts init).
2. **Language switch:** a plain link to `alternateUrl(path, target)` → normal navigation. `<html lang>` updates from the new document.
3. **Filter:** input/change → filter script → toggles card visibility + `history.replaceState(?query)` → aria-live count.
4. **Contact:** submit → `actions.contact(FormData)` → Worker: Zod → Turnstile verify → mailer → `{ data } | { error }` → UI status + focus management.
5. **Refresh (post-v1):** Cron Worker → Deploy Hook → Workers Build → loader (live → snapshot) → new static deploy.

### State management

There is no global client state store. The only state is URL query (filters), DOM (form), and module-level motion registry state. Do not add a state library. [Proposed]

---

## Suggested Build Order (dependency-driven)

```
1 Foundation ─▶ 2 Layout+i18n ─▶ 3 Data layer (fixtures) ─▶ 4 Home static sections
                       │                    │                        │
                       │                    ▼                        ▼
                       │            5 Projects list/detail ─▶ 6 Behance adapter + snapshot
                       ▼                                             │
              7 Contact (adapter, Action, mailer) ◀──────────────────┘ (independent; can run parallel to 5/6)
                                     │
                                     ▼
                       8 Motion runtime + effects ─▶ 9 A11y/perf hardening + measurement
                                                       └▶ (post-v1) Deploy + cron refresh
```

| # | Phase | Delivers | Depends on | Why here |
|---|-------|----------|-----------|----------|
| 1 | Foundation | `pnpm create astro`, TS strict, Tailwind v4 via `@tailwindcss/vite`, ESLint, Vitest, `astro check`, design tokens in `@theme` | — | Quality gates from AGENTS.md must exist before code |
| 2 | Layout shell + i18n plumbing | `BaseLayout` (lang, hreflang, SEO, skip link, ClientRouter), header/footer, `LanguageSwitcher`, i18n config/dictionaries/`routes.ts`, EN+ES page wrappers, **motion gate + lifecycle registry skeleton + `data-motion` head script** | 1 | Every page and component needs `locale` + `t()`. Retrofitting i18n is the costliest change. Putting the motion lifecycle skeleton in early means every later script registers through it |
| 3 | Project model + fixtures | `model.ts`, `source.ts`, `fixtures.ts`, `loader.ts` (fixtures mode), `queries.ts`, unit tests | 1 | Unblocks all project UI **before** the Behance approach is settled |
| 4 | Homepage static sections | Hero, RolesMarquee (CSS marquee), FeaturedServices, ToolsGrid, LatestProjects (fixtures), YAML content collections, ES drafts | 2, 3 | Mostly content. Emit `data-*` motion hooks now, animate later |
| 5 | Projects list + detail | ProjectGrid/Card, ModuleRenderer + module components, detail pages via `getStaticPaths` for both locales, search/filter script | 3 (+2) | Module renderer shape depends only on the model |
| 6 | Behance adapter + snapshot | `behance.ts` per data research, `normalize.ts` (HTML sanitize, image metadata), `sync-projects` script, committed snapshot, fallback tests (simulated network failure) | 3, research outcome | Isolated behind the model, so it can change without touching phases 4–5. Real data may reveal model gaps, so do it before motion polish |
| 7 | Contact | `@astrojs/cloudflare` adapter, `wrangler.jsonc`, Action, mailer port (console provider for v1), Turnstile (test keys), form UX + a11y | 2 | The first on-demand surface. Spike first to confirm Actions work under static output + `astro dev` on workerd |
| 8 | Motion | Smooth scroll + parallax, reveals, cursor (persisted), magnetic buttons, image hover, shared-element page transitions, reduced-motion behaviour | 2 (registry), 4, 5 (stable markup) | Animating unstable markup means rework. The registry from phase 2 makes this additive |
| 9 | Hardening | Lighthouse/bundle measurement, image weights, keyboard/screen-reader pass, reduced-motion audit, 404, OG images | all | "Measure, don't guess" (AGENTS.md) |
| — | Post-v1 | Workers deploy, domain, Email Service onboarding, Cron → Deploy Hook refresh | 6, 7 | Out of scope for v1 per PROJECT.md |

**Parallelizable:** 7 can run alongside 5/6. 4 and 5 can overlap once 3 lands.
**Research flags:** phase 6 (Behance access method, image CDN host, HTML structure), phase 7 (Actions on static + workerd dev spike), phase 8 (smooth-scroll ↔ ClientRouter interplay, cross-document VT support).

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Portfolio traffic (0–10k visits/month) | Static assets on Workers. The Worker runs only on contact submissions. Free tier is likely sufficient [Inference]. Nothing to change |
| Spike (shared on social, 100k/day) | Still static. The only risk is contact spam: Turnstile + per-IP rate limit (Workers Rate Limiting binding or KV) |
| Many projects (>200) or huge images | Build time grows because remote images are optimized at build. Switch to using Behance CDN size variants directly (no transform) or `cloudflare` runtime image resizing. Paginate the list page |

### Scaling priorities

1. **First bottleneck: build time and image weight**, not traffic. Each Behance project can have dozens of large images, and `imageService: 'compile'` processes all of them on every build. Measure in phase 6. If it's slow, render detail-page images with Behance-provided sizes plus explicit `width`/`height`, and optimize only covers. [Inference]
2. **Second: JS weight from motion libs.** Load heavy effects (cursor, distortion hovers) only when motion is allowed and the pointer is fine (`matchMedia('(pointer: fine)')`), via dynamic `import()` inside the gate. [Proposed]

---

## Anti-Patterns

### Anti-Pattern 1: Components importing the Behance adapter directly
**What people do:** call `fetchBehance()` inside `LatestProjects.astro` or the page.
**Why it's wrong:** it couples UI to an unstable source, multiplies network calls per build, and leaves no fallback. Changing the source then means touching every page.
**Do this instead:** go through the Content Layer collection and `queries.ts`. Only `sources/*` knows Behance exists.

### Anti-Pattern 2: `output: 'server'` because "there's a form"
**What people do:** switch the whole site to SSR to get one endpoint.
**Why it's wrong:** every page becomes a Worker invocation, Behance data has to be fetched or cached at runtime, and the result is slower and costlier.
**Do this instead:** static output + adapter. Only the Action/endpoint runs on demand.

### Anti-Pattern 3: Animation code scattered in section components with `DOMContentLoaded`
**What people do:** each component has its own `<script>` with `DOMContentLoaded` / `window.onscroll`.
**Why it's wrong:** under ClientRouter, `DOMContentLoaded` doesn't fire on navigation and bundled scripts run once [Documented]. Effects silently die after the first navigation, or they stack listeners and leak. Reduced-motion checks also get duplicated inconsistently.
**Do this instead:** declarative `data-*` hooks + the central registry bound to `astro:page-load` / `astro:before-swap`.

### Anti-Pattern 4: Hiding content by default for reveal animations
**What people do:** `.reveal { opacity: 0 }` in CSS, with JS fading it in.
**Why it's wrong:** with no JS, a JS error, or reduced motion handled late, content stays invisible. That's an a11y and SEO failure.
**Do this instead:** hidden states apply only under `html[data-motion="on"]`, set by an inline head script that runs only when motion is allowed.

### Anti-Pattern 5: Translating Behance content or duplicating projects per locale
**What people do:** create `projects/en/*` and `projects/es/*`, or machine-translate project text.
**Why it's wrong:** it doubles the maintenance and contradicts "Behance is the single source of truth" (PROJECT.md).
**Do this instead:** one project collection. Locale only changes the UI chrome. Mark project text with `lang` when known.

### Anti-Pattern 6: Rendering raw Behance HTML with `set:html`
**What people do:** inject scraped/API HTML directly.
**Why it's wrong:** it brings in XSS risk, inline styles that break the design, and broken heading hierarchy.
**Do this instead:** sanitize at build time in `normalize.ts` to an allowlist (p, a, strong, em, ul/ol/li, h3/h4 remapped), store the sanitized HTML in the model, and only then `set:html`.

### Anti-Pattern 7: Icon barrel imports
**What people do:** `import { IconX } from '@tabler/icons-react'` (pulls React plus a barrel).
**Do this instead:** import the SVG file directly as an Astro SVG component: `import IconArrowRight from '@tabler/icons/outline/arrow-right.svg';` then `<IconArrowRight aria-hidden="true" class="size-5" />`. This is an explicit import with no framework runtime. [Proposed. The package `exports` map `./*` → `./icons/*` is verified. Confirm the Astro SVG component import works with node_modules SVGs in phase 1]

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Behance | Build-time only, via `sources/behance.ts` + committed snapshot | Access method TBD by data research. Use a timeout + UA header. Expect bot protection from CI IPs [Unverified] |
| Behance image CDN | `<Image>`/`<Picture>` with `image.domains`, or direct `<img>` with known sizes | Confirm the CDN hostname and the available size variants from real data |
| Cloudflare Workers (static assets + Worker) | `@astrojs/cloudflare` v14 | Not Pages (unsupported since adapter v13) [Documented] |
| Workers Builds Deploy Hook + Cron Worker | POST to the hook URL from a `scheduled()` handler | Post-v1. Treat the hook URL as a secret |
| Email (Cloudflare Email Service / Resend) | Behind the `Mailer` interface, called from the Action | CF needs an onboarded domain + possibly the paid plan for arbitrary recipients. Her own address as the only destination can be restricted via `allowed_destination_addresses` |
| Cloudflare Turnstile | Widget in the form + server verify in the Action | Use test site keys locally |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `sources/*` ↔ `loader.ts` | `ProjectSource.fetchAll(): Promise<Project[]>` | Adapters already return normalized `Project`. The loader validates again via `parseData` |
| Content Layer ↔ views | `queries.ts` functions only | Keeps sorting/limits ("latest 3") in one place and makes it testable |
| views ↔ sections ↔ ui | Props (typed via `interface Props`), locale passed explicitly | No `Astro.currentLocale` deep in leaves. Read it once in the page wrapper |
| Markup ↔ motion runtime | `data-*` attributes (a documented contract) | Sections stay animation-free |
| Motion runtime ↔ ClientRouter | `astro:page-load`, `astro:before-swap`, `astro:after-swap` events | Raw event names (Astro 7 removed the helpers) |
| Contact form script ↔ server | `astro:actions` typed RPC | Errors are mapped to field-level messages via `isInputError` |
| i18n ↔ everything | `useTranslations(locale)`, `alternateUrl()` | Missing ES keys are compile-time errors |

---

## Sources

- Astro on-demand rendering: https://docs.astro.build/en/guides/on-demand-rendering/ (HIGH)
- Astro Cloudflare adapter (v14.4.0, Pages removed in v13, env access, image services, workerd dev): https://docs.astro.build/en/guides/integrations-guide/cloudflare/ (HIGH)
- Astro Content Loader API: https://docs.astro.build/en/reference/content-loader-reference/ (HIGH)
- Astro Actions: https://docs.astro.build/en/guides/actions/ (HIGH; Actions-on-static behaviour MEDIUM/inferred)
- Astro View Transitions / ClientRouter lifecycle: https://docs.astro.build/en/guides/view-transitions/ (HIGH)
- Astro i18n routing: https://docs.astro.build/en/guides/internationalization/ (HIGH)
- Astro v7 upgrade guide: https://docs.astro.build/en/guides/upgrade-to/v7/ (HIGH)
- Workers Builds Deploy Hooks: https://developers.cloudflare.com/workers/ci-cd/builds/deploy-hooks and https://developers.cloudflare.com/changelog/2026-04-01-deploy-hooks (HIGH)
- Cloudflare Email sending from Workers: https://developers.cloudflare.com/email-routing/send-email/ (MEDIUM; beta/plan status to re-check), https://flaviocopes.com/cloudflare-email-service (LOW)
- npm registry checks (2026-10-15): astro 7.4.0, @astrojs/cloudflare 14.4.0, tailwindcss/@tailwindcss/vite 4.3.3, @tabler/icons 3.49.0 (no `@tabler/icons-astro`), lenis 1.3.27, gsap 3.15.0, motion 14.3.0, wrangler 4.151.0 (HIGH)

---
*Architecture research for: bilingual motion-rich Astro designer portfolio (Behance-sourced, Cloudflare Workers target)*
*Researched: 2026-10-15*
