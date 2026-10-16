# Phase 2: Homepage Story - Research

**Researched:** 2026-10-16
**Domain:** Astro 7.4 Content Layer (`file()` collections), accessible CSS marquee (WCAG 2.2.2), Tailwind v4 custom variants, static homepage sections in EN/ES
**Confidence:** HIGH. Every load-bearing mechanism below was run in a throwaway spike copy of this repo, using the repo's own `node_modules` (Astro 7.4.0, Tailwind 4.3.3, Playwright 1.64.1). The content values themselves (her real roles, services and tools) are unknown, so that part is LOW.

> **Labeling convention (user CLAUDE.md):** `[VERIFIED: ...]` means I ran it in this session. `[CITED: url]` means it comes from official docs. `[ASSUMED]` / `[Inference]` / `[Proposed]` mean unverified. Every file layout and component design here is `[Proposed]` until a plan implements and tests it.

<user_constraints>
## User Constraints (from CONTEXT.md)

**No CONTEXT.md exists for Phase 2.** The user chose to continue without discuss-phase. Nothing is locked beyond the project-level constraints below. Everything else is Claude's discretion and is researched and recommended in this document.

### Locked Decisions
None from discuss-phase. The project-level locks still apply (PROJECT.md, STATE.md, Phase 1 SKELETON.md):
- Astro 7.4.0 static output, TypeScript `~6.0.3` strictest, Tailwind 4.3.3 via `@tailwindcss/vite`, pnpm
- Tabler icons as explicit per-file SVG imports, with no barrels and no `astro-icon`
- URL-prefix i18n (`/` EN, `/es/` ES). Locale is always passed as a prop and never sniffed.
- UI strings live in typed dictionaries (`src/i18n/ui.en.ts` / `ui.es.ts`, `satisfies Dictionary`)
- Motion goes through the Phase 1 motion gate (`html[data-motion]`) and lifecycle registry (`src/lib/motion`)
- Phase 1 UI-SPEC tokens: 4 font sizes only (`text-sm/base/2xl/5xl`), weights 400/600 only, an exhaustive accent-usage list, 44px touch targets, and the focus ring `outline-2 outline-offset-2 outline-accent`

### Claude's Discretion
Everything in this phase's scope: content file format and location, component split, marquee technique, pause control design, badge placement, and test strategy.

### Deferred Ideas (OUT OF SCOPE)
- HOME-06 (latest 3 Behance projects) is Phase 3. HOME-08 (service card links to the pre-selected contact form) is Phase 5. **Service cards must NOT look clickable in Phase 2** (FEATURES.md: "If they don't link anywhere, don't make them look clickable").
- GSAP, Lenis, reveals and the motion toggle UI (MOTN-08) belong to Phases 6–7. The marquee must work with **CSS only plus a tiny toggle script**.
- A second marquee for tools. FEATURES.md says to avoid "two competing marquees on one screen", so tools are a static grid.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HOME-02 | Visitor sees a marquee of all the roles/jobs she does | `roles` collection (`src/data/roles.json`) plus the `RolesMarquee` section. CSS marquee pattern (Pattern 3), verified in the spike |
| HOME-03 | Marquee pauses (hover/focus or control), is static under reduced motion, and screen readers hear each role once | `motion-on` custom variant tied to `html[data-motion]` (Pattern 2). Persistent `aria-pressed` pause button (Pattern 4). `aria-hidden` clone, verified with an ariaSnapshot that lists each role once |
| HOME-04 | Visitor sees her 4 most featured services | `services` collection plus `assertCount(…, 4)` guard (Pattern 5) plus `FeaturedServices` section. Non-interactive cards |
| HOME-05 | Visitor sees the apps/tools she uses | `tools` collection plus `ToolsGrid`, with a visible name always present and an optional Tabler brand icon from a typed key map (Pattern 6) |
| HOME-07 | "Available for projects" badge whose state she controls via content | `profile` collection entry `availability` with `{ "available": boolean }`, two localized labels in the dictionary, and `AvailabilityBadge` (Pattern 7). Spike: a non-boolean value fails `astro build` and `astro check` |
</phase_requirements>

## Project Constraints (from CLAUDE.md / AGENTS.md)

| Directive | Source | Impact on this phase |
|---|---|---|
| pnpm for everything | AGENTS.md | `pnpm build`, `pnpm vitest run …`, `pnpm exec playwright …` |
| Strict TypeScript. Avoid `any`/`unknown`. Prefer inference | AGENTS.md | Content types come from `astro/zod` schemas through `CollectionEntry<'services'>`. Test fixtures are typed, with no `as unknown as` casts (Phase 1 precedent: 01-05 deviation #3) |
| Tailwind is the only styling solution. Don't duplicate classes, extract components instead | AGENTS.md | Marquee keyframes go in `@theme` in `src/styles/global.css`. No `<style>` blocks. Use a `ServiceCard`/`ToolItem` component instead of repeating class strings |
| Tabler icons, explicit imports, never barrels | AGENTS.md, FND-03 | Use a per-file `import IconX from '@tabler/icons/outline/x.svg'` inside a typed map component. A map of explicit imports is not a barrel (no re-export index) `[Inference]` |
| Accessibility is mandatory: semantic HTML, ARIA where needed, managed focus | AGENTS.md | WCAG 2.2.2 pause mechanism, `aria-hidden` clone, `aria-pressed` toggle, h2/h3 hierarchy |
| Add/update tests when behavior changes. No type, lint or test errors. Run `pnpm lint` after moving files | AGENTS.md | The keyboard-order test in `tests/e2e/a11y.spec.ts` **will break** and must be updated (see Pitfall 6) |
| Measure, don't guess performance | AGENTS.md | Record dist JS/CSS/HTML byte sizes before and after, as Phase 1 summaries did. Make no perf claims |
| Don't add dependencies until needed | PROJECT.md | **This phase needs zero new packages** (verified: everything ships with Astro, Tailwind and Tabler) |
| Commits: ask user to confirm the message, Conventional Commits, no Claude co-author | user CLAUDE.md | Executor must propose commit messages for approval |
| Label unverified claims | user CLAUDE.md | Applied throughout this document |
| Start work through GSD commands | project CLAUDE.md | Normal GSD flow |

## Summary

Phase 2 adds four static homepage blocks to the Phase 1 skeleton: a roles marquee, 4 featured services, a tools grid and an availability badge. All four are server-rendered from **localized content files** loaded through Astro 7's built-in Content Layer `file()` loader with `astro/zod` schemas. Each localized field is `{ en, es }`, so a missing Spanish value **fails `astro build` and `astro check` with exit 1** (verified in the spike). That carries Phase 1's "missing Spanish key fails type-check" guarantee (I18N-05) over to content. Section headings and badge/button labels are UI strings and go in the existing typed dictionaries.

The marquee is CSS-only animation plus one tiny toggle script. The key design move, verified in the spike, is a Tailwind v4 custom variant `motion-on` bound to the Phase 1 `html[data-motion="on"]` gate. The marquee animates and shows its `aria-hidden` duplicate **only** when JS ran and reduced motion is not requested. With no JS or with reduced motion, it renders as a static wrapped list with no duplicate and no pause button. Phase 6's motion toggle (MOTN-08) will stop it for free because it flips the same attribute. WCAG 2.2.2 requires a real pause mechanism. W3C says that pausing only while focused "restarts as soon as the user moves the focus away" and does not count. So hover/focus pause is a nicety, and a persistent `aria-pressed` toggle button is the conformance mechanism.

Three non-obvious, verified hazards shape the plan. (1) The `file()` loader **swallows YAML/JSON parse errors and missing files**: it logs `[ERROR]`, exits 0 and keeps serving **stale cached data** from `.astro/`. (2) `getCollection()` **does not preserve file order**, so you must sort by an explicit `order` field. (3) `getCollection()` **returns `[]` inside Vitest**, so sections must receive plain data as props, and only e2e covers the real collection wiring. These three are why the recommendation is **JSON content files** (Vitest can import them directly, which catches syntax errors and lets e2e assert against the source of truth with no new dependency) plus **count guards** in a pure query layer.

**Primary recommendation:** Use four `file()` JSON collections in `src/data/` (`roles`, `services`, `tools`, `profile`) with `{ en, es }` Zod fields and an `order` field. A pure `src/lib/content/home.ts` sorts, guards counts and localizes into plain view models. `HomeView` fetches and passes props to four small sections. The marquee is CSS keyframes under a `motion-on` variant with a lifecycle-registered `aria-pressed` pause button. Add no new packages.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Roles/services/tools/availability content | Build time (Content Layer, `src/data/*.json`) | — | Static site. Content is validated by Zod at build, and no runtime fetch exists |
| Localization of content | Build time (query layer `src/lib/content/home.ts`) | — | Picks `field[locale]` once, so components receive plain strings |
| Section markup (roles list, cards, grid, badge) | Static HTML (Astro components, SSG) | — | Must render with JS off (Phase 1 contract: content visible without JS) |
| Marquee motion | Browser CSS (`@keyframes` under `motion-on` variant) | Inline head gate (Phase 1) | Zero JS for the animation itself. The gate decides on/off before first paint |
| Marquee pause control | Browser JS (tiny module registered in the lifecycle registry) | CSS (`group-data-paused`) | A button that toggles state needs JS. CSS reads the state attribute |
| Reduced motion / no-JS fallback | Inline head gate (`data-motion="off"`) | CSS `motion-reduce:animate-none` as backup | Gate covers load time. The media-query backup covers a live OS change mid-session |

## Standard Stack

### Core (all already installed, versions from `package.json`)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| astro | 7.4.0 | `defineCollection` from `astro:content`, `file()` from `astro/loaders`, `z` from `astro/zod` | First-party Content Layer. `file()` parses `.json`, `.yml/.yaml` and `.toml` `[VERIFIED: node_modules/astro/dist/content/loaders/file.js]` `[CITED: docs.astro.build/en/reference/content-loader-reference/]` |
| astro/zod (zod 4.6.7 re-export) | bundled | Content schemas | `import { z } from 'astro:content'` is **deprecated** in Astro 7. Use `astro/zod` `[VERIFIED: node_modules/astro/types/content.d.ts @deprecated]` |
| tailwindcss / @tailwindcss/vite | 4.3.3 | `@custom-variant`, `@theme` `--animate-*` + `@keyframes`, arbitrary `[animation-play-state:paused]` | All three compiled and behaved correctly at runtime in the spike `[VERIFIED: spike build + Playwright]` `[CITED: tailwindcss.com/docs/adding-custom-styles, tailwindcss.com/docs/animation]` |
| @tabler/icons | 3.49.0 | Service icons and tool brand icons | Already approved and installed. Present: `brand-figma`, `brand-adobe-photoshop`, `brand-adobe-illustrator`, `brand-adobe-indesign`, `brand-adobe-premiere`, `brand-adobe-after-effects`, `brand-adobe-xd`, `brand-meta`, `brand-instagram`, `brand-tiktok`, `brand-notion`, `brand-framer`, `brand-webflow`, `brand-wordpress`, `brand-wix`, `brand-pinterest`, `brand-sketch`, `brand-blender`, `brand-openai`, `player-pause`, `player-play`, `apps`, `layout`, `palette`, `brush`, `speakerphone`, `typography`, `vector`, `color-swatch`, `camera`, `movie`, `point` (filled too). **Absent: `brand-canva`, `brand-capcut`** `[VERIFIED: ls node_modules/@tabler/icons/icons/outline]` |
| happy-dom | 21.0.3 | Unit-testing the marquee toggle init/cleanup | Already a devDependency (01-05) |
| @playwright/test + @axe-core/playwright | 1.64.1 / 4.14.0 | e2e, reduced-motion emulation, no-JS, axe, `ariaSnapshot()` | Already in use |

### Supporting
None. **No new packages.**

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| JSON content files | YAML (ARCHITECTURE.md's `[Proposed]` choice) | YAML is friendlier to hand-edit and allows `# TODO(martina)` comments. But there's no YAML parser at the project root (`yaml` is only a transitive dependency of astro and isn't resolvable under pnpm, verified), so tests can't import the source without adding `yaml` as a devDependency. YAML parse errors are also silently swallowed at build (Pitfall 1). Pick YAML only if the user prefers editing ergonomics, and then add `yaml` as an approved devDependency for tests |
| Content Layer collections | Plain TS modules (`src/data/services.ts`, `as const satisfies`) like `site.ts` | Gives compile-time errors and no stale cache. But Phase 1 SKELETON and ARCHITECTURE planned Content Layer for "Phase 2 content files". JSON is closer to "content, no code change" (success criterion 3), and Phase 3 builds on the same collections config |
| CSS marquee | GSAP/JS marquee (`lib/motion/marquee.ts`) | Adds a dependency in the wrong phase. CSS covers loop, pause and reduced motion, as the spike showed |
| `aria-pressed` toggle with a fixed label | Label swap "Pause"/"Play" without `aria-pressed` | Both are valid per APG. The fixed label is simpler to test and is APG's recommended toggle form `[CITED: w3.org/WAI/ARIA/apg/patterns/button/]` |

**Installation:** none.

**Version verification:** no new packages, so the registry check isn't applicable. Installed versions were read from `package.json`. Node v24.15.0, pnpm 11.0.8 `[VERIFIED: node --version, pnpm --version]`.

## Package Legitimacy Audit

No external packages are installed in this phase. The audit is not applicable, and slopcheck was not run because there is nothing to check.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| *(none)* | — | — | — | — | — | — |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none
*If the planner switches to YAML and adds `yaml` for tests, that package must go through the legitimacy gate and a `checkpoint:human-verify` before install.*

## Architecture Patterns

### System Architecture Diagram

```
 BUILD TIME                                                                    BROWSER
 ──────────                                                                    ───────
 src/data/roles.json ─┐
 src/data/services.json ─┤  file() loader      Zod schema           getCollection()
 src/data/tools.json ─┼──► (parse JSON) ──► ({en,es} required, ──► (unordered entries)
 src/data/profile.json ─┘   ⚠ parse error =    order:int, icon enum)   │
                            log + exit 0       ✗ invalid → build exit 1 │
                                                                        ▼
                                          src/lib/content/home.ts (pure)
                                          sortByOrder → assertCount → localize(locale)
                                          ✗ wrong count → throw → build exit 1
                                                                        │ plain view models
                                                                        ▼
  pages/index.astro (en) ─┐                                   HomeView.astro
  pages/es/index.astro (es)┴──locale prop──►  Hero(+AvailabilityBadge) → RolesMarquee →
                                              FeaturedServices → ToolsGrid
                                                                        │ static HTML + CSS
                                                                        ▼
                         <head> inline gate: matchMedia(reduce)? ──► html[data-motion=on|off]
                                                                        │
                                   ┌──────────── on ────────────────────┴──── off (no JS / reduce) ──┐
                                   ▼                                                                 ▼
                    clone <ul aria-hidden> shown, animate-marquee,                 single wrapped <ul>, no clone,
                    pause button shown ──click──► lifecycle-registered             no animation, no button
                    toggle: aria-pressed + root[data-paused] → CSS paused
```

### Recommended Project Structure (new and changed files) `[Proposed]`
```
src/
├── content.config.ts              # NEW: collections roles, services, tools, profile (file() + astro/zod)
├── data/
│   ├── site.ts                    # existing
│   ├── roles.json                 # NEW: [{ id, order, label:{en,es} }]
│   ├── services.json              # NEW: exactly 4 × { id, order, icon, title:{en,es}, description:{en,es} }
│   ├── tools.json                 # NEW: [{ id, order, name, icon? }] (brand names aren't translated)
│   └── profile.json               # NEW: { "availability": { "available": true } }
├── lib/
│   ├── content/
│   │   ├── icons.ts               # NEW: serviceIconKeys / toolIconKeys `as const` tuples (shared by schema + components)
│   │   ├── home.ts                # NEW: pure sortByOrder, assertCount, localize* → view models (unit-tested)
│   │   └── queries.ts             # NEW: thin getCollection/getEntry wrappers → home.ts (e2e-covered only)
│   └── motion/
│       └── marquee.ts             # NEW: initMarqueeToggles(doc): Cleanup (pure DOM, happy-dom tested)
├── components/
│   ├── sections/
│   │   ├── RolesMarquee.astro     # NEW: props { roles: string[]; locale } + <script> registering marquee.ts
│   │   ├── FeaturedServices.astro # NEW: props { services: ServiceView[]; locale }
│   │   └── ToolsGrid.astro        # NEW: props { tools: ToolView[]; locale }
│   ├── ui/
│   │   ├── AvailabilityBadge.astro# NEW: props { available: boolean; locale }
│   │   ├── ServiceCard.astro      # NEW: one card (non-interactive)
│   │   ├── ServiceIcon.astro      # NEW: typed explicit-import map keyed by ServiceIconKey
│   │   └── ToolIcon.astro         # NEW: typed explicit-import map keyed by ToolIconKey
│   └── views/HomeView.astro       # CHANGED: fetches via queries.ts, composes sections
├── components/sections/Hero.astro # CHANGED: receives `available` and renders AvailabilityBadge
├── i18n/ui.en.ts / ui.es.ts       # CHANGED: new keys (section headings, pause label, badge states)
└── styles/global.css              # CHANGED: @custom-variant motion-on, --animate-marquee + @keyframes
tests/
├── unit/content-home.test.ts      # NEW
├── unit/marquee-toggle.test.ts    # NEW (happy-dom)
├── unit/home-sections.test.ts     # NEW (AstroContainer renders with props)
├── e2e/home-story.spec.ts         # NEW
└── e2e/a11y.spec.ts               # CHANGED: keyboard order includes the pause button
```

### Pattern 1: Localized `file()` collections with `astro/zod`
**What:** One JSON file per collection. Every human-language field is `{ en, es }` and both are required. Use an explicit `order` integer.
**When:** For all Phase 2 content.
```ts
// src/content.config.ts. Verified in spike (astro build + astro check, 0 errors)
import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod'; // NOT from 'astro:content' (deprecated in Astro 7)
import { serviceIconKeys, toolIconKeys } from './lib/content/icons';

const localized = z.object({ en: z.string().min(1), es: z.string().min(1) });

const roles = defineCollection({
  loader: file('src/data/roles.json'),
  schema: z.object({ order: z.number().int(), label: localized }),
});
const services = defineCollection({
  loader: file('src/data/services.json'),
  schema: z.object({
    order: z.number().int(),
    icon: z.enum(serviceIconKeys),
    title: localized,
    description: localized,
  }),
});
const tools = defineCollection({
  loader: file('src/data/tools.json'),
  schema: z.object({ order: z.number().int(), name: z.string().min(1), icon: z.enum(toolIconKeys).optional() }),
});
const profile = defineCollection({
  loader: file('src/data/profile.json'), // object form: top-level keys become entry ids
  schema: z.object({ available: z.boolean() }),
});

export const collections = { roles, services, tools, profile };
```
Array files need a unique `id` per item. In object form the keys are the ids `[CITED: docs.astro.build/en/reference/content-loader-reference/]` `[VERIFIED: file.js source]`. Use stable kebab-case service `id`s (`web-design`, `social-media`…), because Phase 5 (HOME-08) will key the contact-form pre-selection on them `[Inference]`.

### Pattern 2: `motion-on` custom variant bound to the Phase 1 gate
```css
/* src/styles/global.css. Verified: compiles to .motion-on\:x:where([data-motion=on],[data-motion=on] *) */
@custom-variant motion-on (&:where([data-motion='on'], [data-motion='on'] *));

@theme {
  --animate-marquee: marquee 40s linear infinite; /* duration is a UI-SPEC decision */
  @keyframes marquee {
    to {
      transform: translateX(calc(-100% - var(--marquee-gap)));
    }
  }
}
```
`hidden motion-on:flex` correctly shows the element only when the gate is on. The variant rule is emitted after the base utility and wins at equal specificity `[VERIFIED: Playwright computed style in spike]`. This doesn't break the Phase 1 rule "no CSS hides content under any data-motion value", because it only hides the **duplicate**, never real content.

### Pattern 3: Seamless CSS marquee (two equal copies, each animated)
Use Ryan Mulligan's layout: a flex container with `overflow-hidden` and a `gap`, two children with `shrink-0 min-w-full justify-around gap-[var(--marquee-gap)]`, and each child animated to `translateX(calc(-100% - gap))` `[CITED: ryanmulligan.dev/blog/css-marquee/]`. `min-w-full` sizes each copy to at least the container width, so short role lists don't leave a blank gap `[CITED: same]`.
```astro
---
// src/components/sections/RolesMarquee.astro (sketch). Classes are illustrative; the UI-SPEC finalizes them
import IconPlayerPause from '@tabler/icons/outline/player-pause.svg';
import IconPlayerPlay from '@tabler/icons/outline/player-play.svg';
import { useTranslations, type Locale } from '../../i18n/t';
interface Props { roles: readonly string[]; locale: Locale }
const { roles, locale } = Astro.props;
const t = useTranslations(locale);
const copy = 'flex shrink-0 min-w-full flex-wrap justify-around gap-x-[var(--marquee-gap)] gap-y-2 motion-on:flex-nowrap motion-on:animate-marquee motion-reduce:animate-none group-hover:[animation-play-state:paused] group-data-paused:[animation-play-state:paused]';
---
<section aria-labelledby="roles-title" class="group [--marquee-gap:2rem]" data-marquee>
  <h2 id="roles-title" class="sr-only">{t('roles.heading')}</h2>
  <button type="button" aria-pressed="false" data-marquee-toggle
          aria-label={t('roles.pause')}
          class="hidden motion-on:inline-flex min-h-11 min-w-11 items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
    <IconPlayerPause aria-hidden="true" focusable="false" class="size-5 group-data-paused:hidden" />
    <IconPlayerPlay aria-hidden="true" focusable="false" class="hidden size-5 group-data-paused:block" />
  </button>
  <div class="flex gap-[var(--marquee-gap)] overflow-hidden">
    <ul class={copy}>{roles.map((r) => <li>{r}</li>)}</ul>
    <ul class:list={[copy, 'hidden motion-on:flex']} aria-hidden="true">{roles.map((r) => <li>{r}</li>)}</ul>
  </div>
</section>
<script>
  import { lifecycle } from '../../lib/motion';
  import { initMarqueeToggles } from '../../lib/motion/marquee';
  lifecycle.register(initMarqueeToggles);
</script>
```
Spike results `[VERIFIED: Playwright, Chromium]`: with motion on, the clone is visible, `animationName === 'marquee'`, and setting `data-paused` gives `animationPlayState === 'paused'`. At 320px `scrollWidth - clientWidth === 0` and axe reports 0 violations. `ariaSnapshot()` shows `list → listitem` once plus the button. Under `reducedMotion: 'reduce'` and with `javaScriptEnabled: false`, the clone and button are hidden and `animationName === 'none'`.

Note: `group-hover:` compiles inside `@media (hover:hover)`, so touch devices never hover-pause, which is one more reason the button is required `[VERIFIED: compiled CSS]`. `group-focus-within:` pausing only matters if the marquee contains focusable items. It doesn't (roles are plain text), so it's optional.

### Pattern 4: Pause toggle as a pure, lifecycle-registered DOM function
```ts
// src/lib/motion/marquee.ts. Unit-testable with happy-dom; signature matches PageInit from lifecycle.ts
import type { Cleanup } from './lifecycle';

export function initMarqueeToggles(doc: Document): Cleanup | undefined {
  const buttons = [...doc.querySelectorAll<HTMLButtonElement>('[data-marquee-toggle]')];
  if (buttons.length === 0) return undefined;
  const ac = new AbortController();
  for (const button of buttons) {
    const root = button.closest<HTMLElement>('[data-marquee]');
    button.addEventListener('click', () => {
      const paused = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(paused));
      root?.toggleAttribute('data-paused', paused);
    }, { signal: ac.signal });
  }
  return () => ac.abort();
}
```
- **Keep the label fixed** ("Pause roles animation" / "Pausar animación de roles") and convey state only through `aria-pressed`. APG: "it is critical the label on a toggle does not change when its state changes" `[CITED: w3.org/WAI/ARIA/apg/patterns/button/]`. Visual icon swap is fine, because the icons are `aria-hidden`.
- When the component script and `BaseLayout` both import `src/lib/motion`, Vite emits one shared `motion.*.js` chunk, so there is **one** lifecycle singleton `[VERIFIED: spike dist/_astro listing, the before-swap handler appears once]`. The homepage will now ship external JS files where Phase 1 had 0. Measure and record the sizes; don't assert.

### Pattern 5: Pure query layer (sort, guard, localize)
```ts
// src/lib/content/home.ts. No astro:content import, so Vitest can test it with fixtures
import type { Locale } from '../../i18n/config';
interface Ordered { id: string; data: { order: number } }
export function sortByOrder<T extends Ordered>(entries: readonly T[]): T[] {
  return [...entries].sort((a, b) => a.data.order - b.data.order || a.id.localeCompare(b.id));
}
export function assertCount<T>(entries: readonly T[], expected: number, name: string): readonly T[] {
  if (entries.length !== expected) throw new Error(`${name}: expected exactly ${expected} entries, got ${entries.length}`);
  return entries;
}
export function assertNonEmpty<T>(entries: readonly T[], name: string): readonly T[] { /* throw on 0 */ }
// localizeServices(entries, locale) → { id, icon, title, description }[] etc.
```
`queries.ts` calls `getCollection('services')` and hands the result to `home.ts`. A thrown error in page frontmatter fails `astro build` `[ASSUMED: standard Astro behavior, not re-run in spike]`.

### Pattern 6: Typed icon maps (explicit imports, no barrel)
Put the key tuples in a plain TS module that both `content.config.ts` (via `z.enum`) and the icon component import. The component map uses `satisfies Record<Key, typeof IconX>`, so a key without an icon is a type error `[VERIFIED: spike astro check 0 errors; importing ./lib/content/icons.ts from content.config.ts works]`.
```astro
---
import IconLayout from '@tabler/icons/outline/layout.svg';
// …one explicit import per key
import type { ServiceIconKey } from '../../lib/content/icons';
interface Props { name: ServiceIconKey }
const icons = { layout: IconLayout /* , … */ } as const satisfies Record<ServiceIconKey, typeof IconLayout>;
const Icon = icons[Astro.props.name];
---
<Icon aria-hidden="true" focusable="false" class="size-6" />
```
Tools: the **visible text name is mandatory**, and the icon is optional decoration. Tools without a Tabler brand icon (Canva, CapCut are absent) render with no icon or a generic `apps` icon. Don't hand-draw brand logos.

### Pattern 7: Availability badge = static text, not a live region
- The data is `profile.json` → `{ "availability": { "available": true } }`. `getEntry('profile', 'availability')` gives `data.available` `[VERIFIED: spike object-form file() + getEntry]`. Flipping the value changes the rendered state after rebuild, with no code change (SC3).
- Use two dictionary keys, e.g. `availability.open` ("Available for projects" / "Disponible para proyectos") and `availability.closed` (drafts, `[ASSUMED]` copy). Render a `<p>` with the text and a decorative status dot (`aria-hidden`). **State must be carried by text, not color** (WCAG 1.4.1) `[ASSUMED: standard WCAG reading]`.
- **Don't** use `role="status"`/`aria-live`. It's static page content and not an update `[Inference]`.
- **Don't** add an infinite pulsing dot. An infinitely repeating animation is "moving/blinking" content over 5s and would need its own pause (WCAG 2.2.2). If the UI-SPEC wants a pulse, make it `motion-on:` with a finite iteration count `[Inference from CITED 2.2.2 text]`.
- Placement: inside the Hero, above the greeting, as a small pill (conversion cue next to the CTA, per FEATURES.md) `[Proposed]`. It must not delay or displace the h1/portrait LCP (HOME-01 contract). Use no `accent` color (accent list is exhaustive). It needs a new token, e.g. `--color-success`, to be set in the Phase 2 UI-SPEC.

### Anti-Patterns to Avoid
- **Fetching collections inside section components:** this breaks Vitest container tests, since `getCollection` returns `[]` there (verified). Fetch in `HomeView` (or `queries.ts`) and pass props.
- **Relying on file order:** `getCollection` returned `social, web-design` for a file listing `web-design, social` (verified). Always `sortByOrder`.
- **Hover-only or focus-only pause:** not a WCAG 2.2.2 mechanism `[CITED: w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html]`.
- **Changing both the label and `aria-pressed`:** pick one (APG).
- **`role="list"` on every `<ul>`:** eslint `jsx-a11y-strict` may flag redundant roles. Only add it if a real VoiceOver regression is shown `[ASSUMED]`.
- **Clickable-looking service cards:** no hover lift or cursor-pointer until Phase 5 makes them links.
- **Global `* { animation: none }` for reduced motion:** use the gate plus a per-element `motion-reduce:animate-none` (PITFALLS.md).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Content parsing and validation | Custom JSON/YAML reader + manual checks | `file()` loader + `astro/zod` schema | Typed `CollectionEntry`, build-time failure on bad data (verified), and JSON schemas are generated in `.astro/collections/*.schema.json` for editor hints (verified) |
| Reduced-motion and no-JS detection | New matchMedia listeners per component | Phase 1 `html[data-motion]` gate + `motion-on` variant | One source of truth that Phase 6's toggle will drive |
| Script lifecycle / idempotency | Ad-hoc `DOMContentLoaded` listeners | `lifecycle.register(init)` from `src/lib/motion` | Survives Phase 7 ClientRouter navigations without leaks (MOTN-09) |
| Brand logos | Hand-drawn SVGs | Tabler `brand-*` icons where they exist, otherwise text only | Licensing and consistency |
| Marquee loop math | JS width measurement / `requestAnimationFrame` | CSS two-copy pattern | No layout thrash and zero JS for motion |

**Key insight:** the gate, the lifecycle registry and the typed dictionaries from Phase 1 already solve the hard parts. Phase 2 should be almost pure markup plus content plus one 20-line script.

## Common Pitfalls

### Pitfall 1: `file()` swallows parse errors and missing files, and keeps stale data
**What goes wrong:** A JSON/YAML syntax error or a renamed/missing data file makes `astro build` and `astro check` **exit 0**. They only log `[ERROR] [file-loader] Error reading data…` / `File not found…`. Without `--force`, the page keeps rendering the **previous cached entries** from `.astro/` `[VERIFIED: spike, exit=0 and stale HTML]`. With `astro build --force` the collection becomes **empty**, and the build still exits 0 `[VERIFIED]`.
**Why:** `file.js` wraps read and parse in try/catch → `logger.error` → `return` `[VERIFIED: source]`. Official docs don't mention this `[CITED: content-loader-reference, silent on errors]`.
**How to avoid:** (a) count guards in `home.ts` (`assertCount(services, 4)`, `assertNonEmpty(roles/tools)`, and a throw if the `availability` entry is missing), which turn an empty collection into a build failure. (b) Unit tests that `import` each JSON file directly, so a syntax error fails `pnpm test` `[VERIFIED: Vitest fails with "EOF while parsing"]`. (c) Optionally use `astro build --force` in `test:e2e` so e2e never sees stale cache. That's the planner's call. It costs a content re-sync but no image re-optimization, since image caches are separate `[ASSUMED]`.
**Warning signs:** `[ERROR] [file-loader]` lines in build output that's otherwise green.

### Pitfall 2: Schema violations DO fail loudly, and that's the safety net to rely on
Missing `es`, a non-boolean `available`, or an unknown `icon` key → `InvalidContentEntryDataError`, and both `astro build` and `astro check` (so `pnpm lint`) exit 1 `[VERIFIED: spike]`. Make every localized field required (`min(1)`), never `.optional()`.

### Pitfall 3: `getCollection` order is not file order
Seen in the spike: entries came back in a different order than the file `[VERIFIED]`. Use an `order` field plus `sortByOrder`, with id as the tie-breaker.

### Pitfall 4: `getCollection` is empty inside Vitest
`getViteConfig` resolves `astro:content`, but the data store isn't populated during `vitest run`, so it returns `[]` `[VERIFIED: spike test expected 2, got 0]`. Unit tests must target pure functions (`home.ts`) and prop-driven components (AstroContainer). Real wiring is covered in e2e.

### Pitfall 5: Hover/focus pause alone fails WCAG 2.2.2
W3C: motion that "restarts as soon as the user moves the focus away" is not "a mechanism for the user to pause" `[CITED: w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html]`. The roadmap SC1 says "pauses on hover/focus **or via a control**". Implement the control (persistent toggle). Hover-pause is a bonus.

### Pitfall 6: The existing keyboard-order e2e test will break
`tests/e2e/a11y.spec.ts` hard-codes the tab order and returns `null` for any focused element that isn't an `HTMLAnchorElement` `[VERIFIED: read file]`. The new pause `<button>` (visible by default in Playwright: JS on, no reduced motion → `data-motion="on"`) adds a tab stop after the hero CTA. Update the expected order and accept `HTMLButtonElement`. Services, tools and the badge add **no** tab stops (non-interactive).

### Pitfall 7: Playwright silently reuses whatever is on port 4321
`playwright.config.ts` has `reuseExistingServer: !isCI`. During this research, a user process was already listening on 4321, and the spike's tests ran against **that** server, not the fresh build, which gave false failures `[VERIFIED: lsof + spike]`. The executor must make sure no stale `astro dev/preview` is on 4321 before `pnpm test:e2e`. Otherwise e2e may test old code (false passes are possible too).

### Pitfall 8: Horizontal overflow at 320px
The marquee track is wider than the viewport by design. It must be clipped by `overflow-hidden` on the flex container. `tests/e2e/layout.spec.ts` asserts `scrollWidth <= 320` on `/` and `/es/` `[VERIFIED: read file; spike measured 0 overflow]`.

### Pitfall 9: Typography and color contract drift
Only `text-sm/base/2xl/5xl` compile (Phase 1 reset `--text-*: initial`). `text-lg`, `text-3xl` and similar **silently produce no CSS** `[VERIFIED in 01-01 SUMMARY]`. Accent is reserved for an exhaustive list, so the badge dot and pause button must not use `accent` (except the focus ring). Role text size, section heading size and the success color must come from the Phase 2 UI-SPEC.

### Pitfall 10: Spanish strings run 15–25% longer
Card titles and descriptions must wrap with no `truncate` and no fixed heights (Phase 1 UI-SPEC rule) `[Based on patterns]`.

## Code Examples

### Test: content files parse and match counts (catches Pitfall 1)
```ts
// tests/unit/content-home.test.ts. JSON import verified in spike under strictest tsconfig
import { describe, expect, it } from 'vitest';
import services from '../../src/data/services.json';
import { assertCount, sortByOrder } from '../../src/lib/content/home';

describe('services content', () => {
  it('has exactly 4 featured services, each localized', () => {
    expect(services).toHaveLength(4);
    for (const s of services) {
      expect(s.title.en && s.title.es && s.description.en && s.description.es).toBeTruthy();
    }
  });
  it('assertCount throws on the wrong count', () => {
    expect(() => assertCount([], 4, 'services')).toThrow(/exactly 4/);
  });
});
```

### e2e: marquee contract (pattern proven in spike)
```ts
// tests/e2e/home-story.spec.ts (excerpt)
const clone = '[data-marquee] ul[aria-hidden="true"]';
test('roles announced once; pause button pauses', async ({ page }) => {
  await page.goto('/');
  const marquee = page.locator('[data-marquee]');
  await expect(marquee.getByRole('listitem')).toHaveCount(roles.length); // aria-hidden clone excluded
  const toggle = marquee.getByRole('button', { name: en['roles.pause'] });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  const state = await marquee.locator('ul').first().evaluate((el) => getComputedStyle(el).animationPlayState);
  expect(state).toBe('paused');
});
test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('static, no clone, no button', async ({ page }) => {
    await page.goto('/es/');
    await expect(page.locator(clone)).toBeHidden();
    await expect(page.locator('[data-marquee-toggle]')).toBeHidden();
  });
});
```

### e2e: availability badge follows the content value (SC3)
```ts
import profile from '../../src/data/profile.json';
const expected = profile.availability.available ? dict['availability.open'] : dict['availability.closed'];
await expect(page.getByText(expected, { exact: true })).toBeVisible();
```
Pair it with a unit render test of `AvailabilityBadge` for **both** `available: true/false`, plus a one-time manual check during execution: flip the value, run `pnpm build`, grep `dist/index.html`, revert, and record it in the SUMMARY.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `import { z } from 'astro:content'` | `import { z } from 'astro/zod'` (zod v4) | Astro 6/7 (deprecated, removal planned) | Use `astro/zod` in `content.config.ts` `[VERIFIED: types @deprecated]` |
| `src/content/config.ts` + legacy `type: 'data'` collections | `src/content.config.ts` + `loader: file()/glob()` | Astro 5 → legacy removed in 6 | Only the loader API is available `[VERIFIED: astro/dist/content/utils.js references content.config.*]` |
| `tailwind.config.js` `theme.extend.animation/keyframes` | `@theme { --animate-*; @keyframes … }` in CSS | Tailwind v4 | Tokens live in `global.css` only `[CITED: tailwindcss.com/docs/animation]` |
| `addVariant()` JS plugin | `@custom-variant name (selector);` | Tailwind v4 | Shorthand form verified `[CITED: tailwindcss.com/docs/adding-custom-styles]` |

**Deprecated/outdated:** `astro:content` `z` export (deprecated), and the `@astrojs/tailwind` integration (already avoided in Phase 1).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Martina's real roles, 4 services and tools list are not in the repo. Phase 2 ships `TODO(martina)` drafts (e.g. roles: Web design, Social media management, Branding, Graphic design, Content creation, UI design; tools: Figma, Photoshop, Illustrator, Canva, CapCut, Meta Business Suite) | Open Questions | Low technical risk (content-only swap). The visible copy will be wrong until she supplies it |
| A2 | Spanish drafts for roles, services and badge (e.g. "Disponible para proyectos" / "Sin disponibilidad por ahora") | Pattern 7 | Copy review needed (QUAL-03) |
| A3 | A thrown error in `HomeView`/`queries.ts` frontmatter fails `astro build` | Pattern 5 | If not, count guards wouldn't block bad builds. Verify with one RED run during execution |
| A4 | `astro build --force` doesn't re-run image optimization (separate cache) | Pitfall 1 | Only build time is affected |
| A5 | A map of explicit per-file icon imports doesn't violate "no barrels" | Pattern 6 | If the user disagrees, inline the imports in each component |
| A6 | Badge goes in the Hero, above the greeting | Pattern 7 | UI-SPEC may move it. Only placement changes |
| A7 | Using a Tabler `brand-*` mark next to a visible tool name is acceptable nominative trademark use | Pattern 6 | If not, use text-only tool chips |
| A8 | JSON (not YAML) is acceptable to the user for content files | Alternatives | If YAML is required, add a `yaml` devDependency (legitimacy gate) or drop the direct-import tests |

## Open Questions

1. **Real content from Martina (roles, 4 services with descriptions, tools, current availability)**
   - Known: PROJECT.md says her copy is "ready", but it isn't in the repo. The Figma reference may contain it (not accessible here, so unverified).
   - Unclear: the exact lists and wording.
   - Recommendation: ship `TODO(martina)` drafts in the JSON files and track them in the SUMMARY "Known Stubs". JSON has no comments, so put the TODO note in `content.config.ts` and the README.
2. **Off-state badge: show "not available" text, or hide the badge?**
   - Recommendation: render both states (SC3 says "flips its state"). The UI-SPEC decides the copy.
3. **Marquee speed and visual scale**
   - Recommendation: the UI-SPEC sets the duration (suggest 30–60s per loop, `[ASSUMED]`) and the role text size (one of the 4 allowed sizes).
4. **Add `--force` to `test:e2e`'s build?**
   - Recommendation: yes for e2e determinism, unless the planner prefers relying on count guards plus JSON-import unit tests alone.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | build/test | ✓ | v24.15.0 | — |
| pnpm | everything | ✓ | 11.0.8 | — |
| Astro / Tailwind / Tabler / Playwright Chromium | build, e2e | ✓ (installed) | 7.4.0 / 4.3.3 / 3.49.0 / 1.64.1 | — |
| Free port 4321 for Playwright webServer | e2e | ⚠ a user process was listening on 4321 during research | — | Stop the stale server before `pnpm test:e2e` (Pitfall 7) |

**Missing dependencies with no fallback:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.5 (+ happy-dom 21.0.3, `experimental_AstroContainer`), Playwright 1.64.1 + @axe-core/playwright 4.14.0 |
| Config file | `vitest.config.ts` (`getViteConfig`, `tests/unit/**/*.test.ts`), `playwright.config.ts` (`astro preview --ignore-lock`, port 4321) |
| Quick run command | `pnpm vitest run tests/unit/content-home.test.ts tests/unit/marquee-toggle.test.ts tests/unit/home-sections.test.ts` |
| Full suite command | `pnpm verify` (lint incl. astro check → vitest → build + playwright → secrets) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HOME-02 | Every role in `roles.json` renders once, in order, in EN at `/` and ES at `/es/` | e2e | `pnpm build && pnpm exec playwright test tests/e2e/home-story.spec.ts -g "roles"` | ❌ Wave 0 |
| HOME-02 | `RolesMarquee` renders a `<ul>` plus an `aria-hidden` clone from props | unit | `pnpm vitest run tests/unit/home-sections.test.ts` | ❌ Wave 0 |
| HOME-03 | Pause button toggles `aria-pressed` and `data-paused`. Cleanup removes listeners (idempotent over 10 mounts) | unit (happy-dom) | `pnpm vitest run tests/unit/marquee-toggle.test.ts` | ❌ Wave 0 |
| HOME-03 | Motion on: clone visible, `animationName=marquee`. Click → `animationPlayState=paused` | e2e | `pnpm exec playwright test tests/e2e/home-story.spec.ts -g "marquee"` | ❌ Wave 0 |
| HOME-03 | `reducedMotion: 'reduce'` and `javaScriptEnabled: false`: clone and button hidden, `animationName=none`, roles visible | e2e | same spec, `-g "static"` | ❌ Wave 0 |
| HOME-03 | Screen reader hears each role once: `getByRole('listitem')` count in the marquee equals roles length | e2e | same spec | ❌ Wave 0 |
| HOME-04 | Exactly 4 services. `assertCount` throws otherwise. JSON parses | unit | `pnpm vitest run tests/unit/content-home.test.ts` | ❌ Wave 0 |
| HOME-04 | 4 service cards with h3 titles matching `services.json` per locale, no links inside | e2e | `… home-story.spec.ts -g "services"` | ❌ Wave 0 |
| HOME-05 | Each tool's visible name renders. Icons `aria-hidden` | e2e + unit | `… -g "tools"` / `home-sections.test.ts` | ❌ Wave 0 |
| HOME-07 | Badge renders the open/closed dictionary string for `available: true/false` | unit | `pnpm vitest run tests/unit/home-sections.test.ts -t "badge"` | ❌ Wave 0 |
| HOME-07 | Badge text on `/` and `/es/` equals the dictionary string selected by `profile.json` | e2e | `… -g "availability"` | ❌ Wave 0 |
| HOME-07 | Flip value → rebuild → state flips (no code change) | manual-once (recorded in SUMMARY) | `pnpm build && grep` on `dist/index.html` | n/a |
| SC4 | axe 0 violations on `/`, `/es/` with new sections | e2e | `pnpm exec playwright test tests/e2e/a11y.spec.ts` | ✅ (covers new markup automatically) |
| SC4 | Keyboard order includes the pause button after the hero CTA | e2e | same file | ✅ needs update (Pitfall 6) |
| SC4 | No horizontal overflow at 320px | e2e | `pnpm exec playwright test tests/e2e/layout.spec.ts` | ✅ |
| I18N-05 carry-over | Missing `es` in content fails the build | covered by `astro check` in `pnpm lint` (verified exit 1) | `pnpm lint` | ✅ (gate exists) |

### Sampling Rate
- **Per task commit:** quick unit command + `pnpm lint`
- **Per wave merge:** `pnpm test && pnpm test:e2e`
- **Phase gate:** `pnpm verify` green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/content-home.test.ts`: JSON imports, counts, `sortByOrder`/`assertCount`/localize
- [ ] `tests/unit/marquee-toggle.test.ts`: happy-dom DOM fixture for `initMarqueeToggles`
- [ ] `tests/unit/home-sections.test.ts`: AstroContainer renders of RolesMarquee, FeaturedServices, ToolsGrid, AvailabilityBadge (props only)
- [ ] `tests/e2e/home-story.spec.ts`: EN/ES content, marquee on/reduced/no-JS, badge
- [ ] Update `tests/e2e/a11y.spec.ts` keyboard order (button support)
- No framework install needed.

## Security Domain

Static content, no user input, no new network surface. `security_enforcement` is not set in config (treated as enabled).

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes (build-time content) | `astro/zod` schemas on every collection; render via Astro `{}` expressions (auto-escaped). **No `set:html`** for content (Phase 1 rule: the only `set:html` is `motionGateInline`) |
| V6 Cryptography | no | — |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| HTML injection via content strings | Tampering | Auto-escaped expressions. Grep acceptance: `set:html` count in `src/` stays 1 |
| Supply chain via new packages | Tampering | None added |

## Sources

### Primary (HIGH confidence)
- Spike in scratchpad copy of this repo (Astro 7.4.0, Tailwind 4.3.3, Playwright 1.64.1 Chromium), 2026-10-16: YAML/JSON `file()` collections, schema failure exit codes, swallowed parse errors with stale cache, `--force` behavior, `getCollection` order, Vitest empty collections, JSON direct import, Tailwind `@custom-variant`/`@theme` keyframes/arbitrary play-state, runtime cascade, reduced-motion/no-JS, 320px overflow, axe, ariaSnapshot, shared `motion` chunk
- `node_modules/astro/dist/content/loaders/file.js` (source), `node_modules/astro/types/content.d.ts` (`z` deprecation), `node_modules/astro/client.d.ts` (`*.svg` → `SvgComponent & ImageMetadata`)
- https://docs.astro.build/en/reference/content-loader-reference/ (file loader formats, id/object forms, parser option)
- https://tailwindcss.com/docs/adding-custom-styles (`@custom-variant` shorthand)
- https://tailwindcss.com/docs/animation (`--animate-*` + `@keyframes` in `@theme`, no play-state utility)
- https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html (2.2.2 text; focus-only pause is not a mechanism)
- https://www.w3.org/WAI/ARIA/apg/patterns/button/ (toggle label must not change)

### Secondary (MEDIUM confidence)
- https://ryanmulligan.dev/blog/css-marquee/ (two-copy marquee layout, `calc(-100% - gap)`, aria-hidden duplicate)
- `.planning/research/FEATURES.md`, `ARCHITECTURE.md`, `PITFALLS.md` (project research, 2026-10-15)

### Tertiary (LOW confidence)
- Draft role, service and tool lists and Spanish copy (A1, A2): placeholders only

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH. No new packages, and all APIs were exercised in the spike
- Architecture: HIGH for mechanics (verified), MEDIUM for component split and placement (`[Proposed]`, UI-SPEC may adjust)
- Pitfalls: HIGH. Pitfalls 1–4, 6–8 reproduced or read directly. Pitfall 5 cited from W3C

**Research date:** 2026-10-16
**Valid until:** 2026-11-15 (Astro and Tailwind minor releases could change loader error handling)
