# Phase 3: Real Behance Work - Pattern Map

**Mapped:** 2026-10-17
**Files analyzed:** 45 new or modified files (some globbed groups count as one row)
**Analogs found:** 38 / 45

Every excerpt below was read from the repo on 2026-10-17. Line numbers refer to the files as they are today. Labels `[Proposed]`, `[Inference]` and `[Assumption]` mark anything that is not a direct copy.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `docs/CONSENT.md` (new) | doc | n/a | none (RESEARCH "Consent note" text) | no analog |
| `package.json` (mod: `sync:behance`, `build:offline`) | config | n/a | `package.json` `check:secrets` script | exact |
| `.prettierignore` (mod: snapshot) | config | n/a | itself | exact |
| `.gitignore` (mod: `tmp/`) | config | n/a | itself | exact |
| `eslint.config.js` (mod: `no-restricted-imports`) | config | n/a | `eslint.config.js` lines 23-28 (file-scoped rule block) | exact |
| `src/data/project-overrides.json` (new) | data | static config | `src/data/profile.json` (keyed object) + `services.json` (`{en,es}` fields) | role-match |
| `src/data/behance/snapshot.json` (new, seed then generated) | data | file-I/O (generated) | `src/data/services.json` | partial |
| `src/assets/projects/<id>-<sha12>.<ext>` (new) | asset | file-I/O | `src/assets/hero/portrait.png` | role-match |
| `src/lib/projects/model.ts` (new) | model/types | n/a | `src/lib/content/icons.ts` + type block of `src/lib/content/home.ts` | exact |
| `src/lib/projects/snapshot-schema.ts` (new) | schema | validation | `src/content.config.ts` (zod part) | role-match |
| `src/lib/projects/overrides-schema.ts` (new) | schema | validation | `src/content.config.ts` lines 12-13 (`localized`) | role-match |
| `src/lib/projects/slug.ts` (new) | utility | transform | `scripts/secrets.ts` (pure, Node-strippable) | role-match |
| `src/lib/projects/projects.ts` (new) | service (pure builders) | transform | `src/lib/content/home.ts` | exact |
| `src/lib/projects/layout.ts` (new, `tileSize`) | utility | transform | `ToolsRow.astro` `anchor()` lines 27-31; `home.ts` guards | role-match |
| `src/lib/projects/sources/behance-snapshot.ts` (new) | adapter | file-I/O (build-time import) | `Hero.astro` line 9 (asset import) + `content-home.test.ts` lines 2-5 (direct JSON import) | partial |
| `src/lib/content/queries.ts` (mod) | query layer | request-response (build) | itself | exact |
| `scripts/sync-behance.ts` (new) | CLI entry | batch | `scripts/check-secrets.ts` | exact |
| `scripts/behance/run-sync.ts` (new) | service (DI) | batch / file-I/O | `scripts/check-secrets.ts` (fs + exit) + `src/lib/seo.ts` (injected dependency) | partial |
| `scripts/behance/fetch-page.ts` (new) | service | request-response (network) | none (RESEARCH "Challenge-aware page fetch") | no analog |
| `scripts/behance/parse.ts` (new) | utility | transform | `scripts/secrets.ts` | role-match |
| `scripts/behance/raw-schemas.ts` (new) | schema | validation | `src/content.config.ts` | role-match |
| `scripts/behance/covers.ts` (new) | utility | transform / file-I/O | `scripts/secrets.ts` | partial |
| `scripts/behance/fs-commit.ts` (new) | service | file-I/O | `scripts/check-secrets.ts` `walk()` lines 11-16 | partial |
| `scripts/offline-guard.ts` (new) | preload hook | event-driven | none (RESEARCH "Offline guard preload") | no analog |
| `scripts/assert-offline.ts` (new) | CLI check | batch | `scripts/check-secrets.ts` | exact |
| `src/components/ui/ProjectCard.astro` (new) | component | render | `src/components/ui/ServiceCard.astro` + `Hero.astro` `<Picture>` | exact |
| `src/components/sections/LatestWork.astro` (new) | component (section) | render | `src/components/sections/FeaturedServices.astro` | exact |
| `src/components/projects/ProjectGrid.astro` (new) | component | render | `FeaturedServices.astro` `<ul>` grid + `ToolsRow.astro` class-string consts | role-match |
| `src/components/views/ProjectsView.astro` (new) | view | request-response (build) | `src/components/views/NotFoundView.astro` + `HomeView.astro` | exact |
| `src/components/views/HomeView.astro` (mod) | view | request-response (build) | itself | exact |
| `src/pages/projects/index.astro` (new) | route | request-response | `src/pages/index.astro` | exact |
| `src/pages/es/projects/index.astro` (new) | route | request-response | `src/pages/es/index.astro` | exact |
| `src/components/global/SiteHeader.astro` (mod) | component | render | itself + `LanguageSwitcher.astro` (`<ul>` nav, `aria-current`) | exact |
| `src/layouts/BaseLayout.astro` (mod: `scroll-pt-*` on `<html>`) | layout | render | itself | exact |
| `src/i18n/ui.en.ts` / `src/i18n/ui.es.ts` (mod) | config (dictionary) | n/a | themselves | exact |
| `tests/unit/projects-overrides.test.ts`, `projects-select.test.ts`, `project-slug.test.ts`, `projects-snapshot.test.ts`, `projects-layout.test.ts` (new) | test | unit | `tests/unit/content-home.test.ts` | exact |
| `tests/unit/project-card.test.ts` (+ optional `latest-work.test.ts`) (new) | test | component render | `tests/unit/featured-services.test.ts` | exact |
| `tests/unit/site-header.test.ts` (optional new) | test | component render | `tests/unit/language-switcher.test.ts` | exact |
| `tests/unit/sync-parse.test.ts`, `sync-run.test.ts` (new) | test | unit / integration | `tests/unit/secrets.test.ts` | role-match |
| `tests/fixtures/behance/*` (new) | test fixture | n/a | none | no analog |
| `tests/e2e/projects.spec.ts` (new) | test | e2e | `tests/e2e/seo.spec.ts` + `tests/e2e/layout.spec.ts` | role-match |
| `tests/e2e/a11y.spec.ts` (mod) | test | e2e | itself | exact |
| `tests/e2e/layout.spec.ts` (mod) | test | e2e | itself | exact |
| `tests/e2e/seo.spec.ts` (mod) | test | e2e | itself | exact |

---

## Pattern Assignments

### `src/lib/projects/projects.ts` (pure builders, transform)

**Analog:** `src/lib/content/home.ts`

**Module header and imports** (lines 1-8). Copy the doc comment style that explains why the module is pure:
```ts
/**
 * Pure sort, guard and localize functions for the homepage content collections. Kept free of
 * the content collection runtime (collection reads return [] under Vitest) so every rule here
 * is unit-testable.
 * HomeView is the only caller, through getHomeContent in queries.ts.
 */
import type { Locale } from '../../i18n/config';
import type { ServiceIconKey, ToolIconKey } from './icons';
```
`[Proposed]` For `projects.ts`, value imports from sibling modules must carry `.ts` extensions (`from './slug.ts'`), because the sync loads this file under plain Node (RESEARCH Pitfall 3). `import type` lines can stay extensionless, but using `.ts` everywhere is the simpler rule. No `astro:*` imports in this file.

**`Localized<T>` type** (line 10). Reuse it instead of redeclaring it:
```ts
export type Localized<T> = Record<Locale, T>;
```
`[Assumption]` Importing it from `../content/home.ts` into Node-loaded code is fine because `home.ts` has only type imports. Alternatively, redeclare it in `model.ts`.

**Non-mutating sort with id tiebreak** (lines 56-61). This is the template for `byOrderThenDateDesc` / `byDateDesc`:
```ts
export function sortByOrder<T extends { id: string; data: { order: number } }>(
  entries: readonly T[],
): T[] {
  return [...entries].sort((a, b) => a.data.order - b.data.order || a.id.localeCompare(b.id));
}
```

**Thrown guards with the "problem + file + fix" message** (lines 63-81). Copy this shape for unknown id, duplicate slug and title length errors. The exact wording is in UI-SPEC "Developer-facing error copy":
```ts
export function assertCount<T>(
  entries: readonly T[],
  expected: number,
  name: string,
): readonly T[] {
  if (entries.length !== expected) {
    throw new Error(
      `${name}: expected exactly ${expected} entries, got ${entries.length}. Fix src/data/${name}.json`,
    );
  }
  return entries;
}
```

**Localized view-model builder** (lines 94-102). This is the template for `toCardView(project, locale, …)`. It returns copies, never input references:
```ts
/** HOME-04: the services grid holds exactly 4 cards. */
export function buildServices(entries: readonly ServiceEntry[], locale: Locale): ServiceView[] {
  return sortByOrder(assertCount(entries, 4, 'services')).map((entry) => ({
    id: entry.id,
    icon: entry.data.icon,
    title: entry.data.title[locale],
    items: [...entry.data.items[locale]],
  }));
}
```
Apply strictest rules here: build `ProjectCardView` with resolved non-optional fields (`summary: string | null`, `category: string | null`, `titleLang: Locale | null`), as UI-SPEC "Data boundary" requires. Do not spread Zod optionals (RESEARCH Pitfall 5).

**Cover alt fallback.** Use the existing `interpolate` from `src/i18n/t.ts` lines 16-21:
```ts
export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (token, name: string) => {
    const value = values[name];
    return value === undefined ? token : String(value);
  });
}
```
`[Inference]` `t.ts` imports the dictionaries, so it is fine on the site side. If the sync's G8 imports `projects.ts` validators under Node, keep `toCardView` (which needs `t`/`interpolate`) out of the Node-loaded path. One way is to put validators in `projects.ts` and the card-view mapper in the queries layer or a separate site-only file.

---

### `src/lib/projects/model.ts` (types and constants)

**Analog:** `src/lib/content/icons.ts` (whole file, 8 lines). It shows the `as const` tuple plus derived union that RESEARCH Pattern 2 requires for `categoryIds`:
```ts
// Icon keys shared by content.config.ts (z.enum) and the ServiceIcon/ToolIcon typed maps.
export const serviceIconKeys = ['vector', 'layout', 'palette', 'speakerphone'] as const;

export type ServiceIconKey = (typeof serviceIconKeys)[number];
```
Apply it as `export const categoryIds = ['graphic-design', 'web-design', 'branding', 'social-media'] as const;`. These ids must equal `src/data/services.json` ids (lines 3, 23, 45, 69). Add a unit test asserting equality, in the style of `content-home.test.ts` lines 48-56.

**Interface/view style:** `home.ts` lines 36-54 (`ServiceView`, `HomeContent`): plain `interface`, no optionals in view types. `ImageMetadata` comes in with `import type { ImageMetadata } from 'astro';`, which is type-only and erased under Node.

---

### `src/lib/projects/snapshot-schema.ts` and `overrides-schema.ts` (schemas)

**Analog:** `src/content.config.ts`

**Zod import** (line 9). Always `astro/zod`, never `astro:content`'s `z`:
```ts
import { z } from 'astro/zod';
```

**Localized helper** (lines 12-13). Reuse it for `title`, `summary` and `coverAlt` overrides, and add `.max(32)` for titles (UI-SPEC Typography):
```ts
// Every localized field is required in both locales: a missing es value fails astro check/build.
const localized = z.object({ en: z.string().min(1), es: z.string().min(1) });
```
`[Proposed]` Export a shared `localized` from a Node-safe module (for example `overrides-schema.ts`) rather than importing `content.config.ts`, which imports `astro:content` and `astro/loaders` (lines 7-8) and cannot load under plain Node.

**Enum from a const tuple** (line 29):
```ts
    icon: z.enum(serviceIconKeys),
```
Apply it as `category: z.enum(categoryIds)`. The overrides object uses `z.strictObject` (RESEARCH Pattern 2), and the snapshot uses `.min(1)` on `projects`.

**Do NOT copy:** `file()` loaders (lines 20-48). RESEARCH Pitfall 1 says the snapshot is read by direct import, not by a collection.

---

### `src/lib/projects/sources/behance-snapshot.ts` (adapter, build-time file-I/O)

**Analogs:**
- direct JSON import with a fail-loud intent: `tests/unit/content-home.test.ts` lines 2-5 and line 20:
  ```ts
  import profile from '../../src/data/profile.json';
  ...
  // Direct JSON imports: the file() loader swallows parse errors, these fail pnpm test instead.
  ```
- local image import feeding `<Picture>`: `src/components/sections/Hero.astro` line 9:
  ```ts
  import portrait from '../../assets/hero/portrait.png';
  ```

No existing file uses `import.meta.glob`. Copy RESEARCH Pattern 1 (lines 264-283) verbatim: an eager glob on the literal string `'/src/assets/projects/*.{png,jpg,jpeg,webp}'`, `SnapshotSchema.parse(raw)` at module scope, and `coverFor()` throwing with the fix in the message. This is the only Behance-aware module on the site side. The ESLint rule below enforces that.

---

### `src/lib/content/queries.ts` (modify, query layer)

**Analog:** itself (whole file, 29 lines).

**Doc comment and export shape** (lines 11-15):
```ts
/**
 * The only content collection reader. A thrown guard (wrong count, missing availability) fails
 * `astro build` instead of shipping a partial homepage (verified end to end in plan 02-07).
 */
export async function getHomeContent(locale: Locale): Promise<HomeContent> {
```
Add `getLatestProjects(locale)` and `getAllProjects(locale)` next to it, delegating to `src/lib/projects/*` (RESEARCH Open Question 5). Keep them `async` for signature parity with `getHomeContent`, even though the snapshot read is synchronous `[Proposed]`.

**Category labels.** D-12 says labels come from the localized service titles. Two options:
- (a) Read `getCollection('services')` here, as lines 16-21 do, and pass an id→title map into the pure builder.
- (b) Import `src/data/services.json` directly in the builder.

`[Proposed]` (a) keeps a single source and keeps the builder pure. In Vitest, pass the map as a fixture, since `getCollection` returns `[]` there (home.ts header comment).

---

### `src/components/ui/ProjectCard.astro` (component)

**Analog:** `src/components/ui/ServiceCard.astro` (whole file) for structure, and `Hero.astro` lines 41-50 for `<Picture>`.

**Frontmatter doc comment, imports and typed Props** (ServiceCard lines 1-17):
```astro
---
/**
 * One featured service card. Intentionally non-interactive until Phase 5 (HOME-08) adds a real
 * destination: ...
 */
import ServiceIcon from './ServiceIcon.astro';
import type { ServiceIconKey } from '../../lib/content/icons';

interface Props {
  title: string;
  items: readonly string[];
  icon: ServiceIconKey;
}

const { title, items, icon } = Astro.props;
---
```
`ProjectCard` imports `type ProjectCardView` from `../../lib/projects/model` (never from `sources/`), `Picture` from `astro:assets`, and `useTranslations` + `type Locale` from `../../i18n/t` for the sr-only `<dt>` labels. Props per UI-SPEC: `project`, `variant`, `headingLevel`, `size`, `eager`, plus `locale` for `t()`.

**`<li>` root plus title/body stack** (ServiceCard lines 19-30). The card root is an `<li>` rendered inside a parent `<ul>`:
```astro
<li class="bg-surface-alt flex h-full flex-col gap-4 rounded-2xl p-6">
  ...
  <div class="flex flex-col gap-2">
    <h3 class="text-ink text-base font-semibold">{title}</h3>
```
Differences required by UI-SPEC: no box classes on the root (no `bg-surface-alt`, `rounded-2xl` or `p-6`), an `<article class="group/card relative flex flex-col gap-4">` inside the `<li>`, a dynamic heading level, and a stretched link.

**Picture usage** (Hero lines 41-50):
```astro
      <Picture
        src={portrait}
        formats={['avif', 'webp']}
        alt={t('hero.imageAlt')}
        loading="eager"
        fetchpriority="high"
        width={321}
        height={324}
        class="mx-auto aspect-square w-full max-w-64 rounded-full object-contain lg:max-w-80"
      />
```
For the card, `width`/`height` come from `cover.width`/`cover.height` (ImageMetadata), plus `widths={[404, 640, 808]}`, a `sizes` literal per tile size, and `loading`/`fetchpriority` from `eager`. With `exactOptionalPropertyTypes`, pass `fetchpriority` conditionally, not as `undefined` `[Inference]`; `astro check` will confirm.

**Literal class-map consts** (ToolsRow lines 17-24 show the convention of naming long class strings in frontmatter and combining them with `class:list`):
```ts
const tileBase =
  'group/tool border-ink/10 bg-surface text-ink focus-visible:outline-accent relative grid size-12 ...';
...
          class:list={[tileBase, tileInverted]}
```
Use the same approach for `sizeClasses: Record<TileSize, string>` and `aspectClasses`, and keep every string literal so Tailwind can see it (UI-SPEC ProjectGrid).

**Fallback `lang` wrapper analog:** NotFoundView line 39 (`<p lang="es" class="text-base">`) and LanguageSwitcher line 42 (`lang={target}`).

---

### `src/components/sections/LatestWork.astro` (section)

**Analog:** `src/components/sections/FeaturedServices.astro` (whole file, 31 lines)

**Doc comment, imports and Props** (lines 1-17):
```astro
---
/**
 * Featured services (HOME-04). Prop-driven: HomeView reads and sorts the collection, this section
 * renders the cards in the order received. ...
 */
import ServiceCard from '../ui/ServiceCard.astro';
import { useTranslations, type Locale } from '../../i18n/t';
import type { ServiceView } from '../../lib/content/home';

interface Props {
  services: readonly ServiceView[];
  locale: Locale;
}

const { services, locale } = Astro.props;
const t = useTranslations(locale);
---
```

**Section shell plus h2** (lines 19-25). Copy the classes exactly, using `aria-labelledby="work-title"`:
```astro
<section
  aria-labelledby="services-title"
  class="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 sm:px-6 lg:px-8"
>
  <h2 id="services-title" class="font-display text-2xl font-semibold tracking-tight">
    {t('services.heading')}
  </h2>
```

**Arrow icon import plus usage** (NotFoundView lines 2-3, 17 and 35):
```astro
import { getRelativeLocaleUrl } from 'astro:i18n';
import IconArrowRight from '@tabler/icons/outline/arrow-right.svg';
...
const home = getRelativeLocaleUrl(locale, '/');
...
      <IconArrowRight aria-hidden="true" focusable="false" class="size-5" />
```
"See all" is a text link, not `ButtonLink` (UI-SPEC). Its focus classes follow NotFoundView line 44: `focus-visible:outline-accent ... underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2`. Omit the whole section when `projects.length === 0` (UI-SPEC count states).

---

### `src/components/projects/ProjectGrid.astro` (grid list)

**Analog:** `FeaturedServices.astro` lines 26-30 (a `<ul>` grid that maps views to `<li>` cards in received order):
```astro
  <ul class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
    {services.map((service) => (
      <ServiceCard title={service.title} items={service.items} icon={service.icon} />
    ))}
  </ul>
```
Swap in the UI-SPEC container `grid grid-cols-1 gap-y-12 md:grid-cols-12 md:gap-x-6`, and use `projects.map((project, index) => <ProjectCard … size={tileSize(index, projects.length)} eager={eagerFirst && index === 0} />)`. Never use `grid-flow-dense`, `order-*` or row-span.

`[Inference]` Directory note: UI-SPEC "Design System" lists `src/components/{ui,global,sections,views}`, while RESEARCH proposes a new `src/components/projects/`. No `projects/` folder exists today. The planner should pick one. `ui/ProjectGrid.astro` fits the existing layout.

---

### `src/lib/projects/layout.ts` (`tileSize`)

**Analog:** `ToolsRow.astro` lines 26-31, a position-based class choice. Move the logic out of the component into a pure, tested function:
```ts
// Edge tiles anchor to their own side so the tooltip never overflows a 320px viewport.
const anchor = (index: number): string => {
  if (index === 0) return 'left-0';
  if (index === tools.length - 1) return 'right-0';
  return 'left-1/2 -translate-x-1/2';
};
```
Return a `'large' | 'small' | 'large-end'` union typed from an `as const` tuple (the icons.ts pattern), using the exact rule in UI-SPEC "ProjectGrid".

---

### `src/components/views/ProjectsView.astro` (view)

**Analogs:** `NotFoundView.astro` (h1 view with a section shell) and `HomeView.astro` (the view is the only content reader).

**View reads data; sections stay prop-driven** (HomeView lines 1-16):
```astro
---
import Hero from '../sections/Hero.astro';
...
import { getHomeContent } from '../../lib/content/queries';
import type { Locale } from '../../i18n/t';

interface Props {
  locale: Locale;
}

// HomeView is the only content reader for the homepage; sections stay prop-driven.
const { locale } = Astro.props;
const { available, roles, services, tools } = await getHomeContent(locale);
---
```

**h1 section shell** (NotFoundView lines 21-31):
```astro
<section
  aria-labelledby="not-found-title"
  class="mx-auto flex max-w-6xl flex-col items-center gap-12 px-4 py-16 text-center sm:px-6 lg:px-8"
>
  ...
  <h1 id="not-found-title" class="font-display text-5xl font-semibold tracking-tight">
    {t('notFound.heading')}
  </h1>
```
Use UI-SPEC classes: `mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-16 sm:px-6 lg:px-8`, left-aligned (no `items-center`/`text-center`), with `id="projects-title"`.

---

### `src/components/views/HomeView.astro` (modify)

**Insertion point** (lines 20-24). Replace the comment on line 20 and insert `<LatestWork>` between lines 22 and 23, inside the existing wrapper:
```astro
<!-- Phase 3 inserts the latest projects between services and tools. -->
<div class="flex flex-col gap-16 py-16">
  <FeaturedServices services={services} locale={locale} />
  <ToolsRow tools={tools} locale={locale} />
</div>
```
Add `const latest = await getLatestProjects(locale);` next to line 15.

---

### `src/pages/projects/index.astro` and `src/pages/es/projects/index.astro` (routes)

**Analogs:** `src/pages/index.astro` and `src/pages/es/index.astro` (11 lines each):
```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import HomeView from '../components/views/HomeView.astro';
import { useTranslations } from '../i18n/t';

const t = useTranslations('en');
---

<BaseLayout locale="en" title={t('meta.home.title')} description={t('meta.home.description')}>
  <HomeView locale="en" />
</BaseLayout>
```
Adjust the relative depth: `src/pages/projects/` needs `../../`, and `src/pages/es/projects/` needs `../../../`. Use `meta.projects.title` / `meta.projects.description`. `kind` defaults to `'page'` (BaseLayout line 19), so omit it. Pages must not import `src/lib/projects/sources/**`.

---

### `src/components/global/SiteHeader.astro` (modify)

**Analog:** itself plus `LanguageSwitcher.astro`.

**Current-page detection** (SiteHeader lines 16-18). Add `isProjects` the same way:
```ts
const { locale, pathname, kind = 'page' } = Astro.props;
const isHome = stripLocale(pathname) === '/';
const t = useTranslations(locale);
```

**Existing nav link classes to duplicate for Projects** (lines 31-38):
```astro
      <nav aria-label={t('nav.label')}>
        <a
          href="#contact"
          class="text-ink focus-visible:outline-accent inline-flex min-h-11 items-center text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {t('nav.contact')}
        </a>
      </nav>
```

**`<ul>` inside nav plus `aria-current` with an ink underline** (LanguageSwitcher lines 29-30, 44-48):
```astro
<nav aria-label={t('lang.label')}>
  <ul class="flex items-center gap-1">
...
            aria-current={current ? 'true' : undefined}
            class:list={[
              '... text-sm font-semibold focus-visible:outline-2 ...',
              current
                ? 'text-ink underline decoration-2 underline-offset-4'
```
UI-SPEC uses `aria-current="page"` (as the wordmark does on line 25) and `aria-[current=page]:underline …` variants. The header two-row layout classes are given verbatim in UI-SPEC "Header nav". They replace lines 21, 22 and 30.

`[Proposed]` Extract a small `NavLink.astro` in `ui/` only if the duplicated class string triggers the "no duplicate classes" rule (AGENTS.md). Otherwise a local `const navLink = '…'` in the frontmatter, as ToolsRow does, is enough.

---

### `src/layouts/BaseLayout.astro` (modify)

Line 24, `<html lang={locale} data-motion="off">`, gains `class="scroll-pt-24 sm:scroll-pt-20"` (UI-SPEC Spacing exceptions). Nothing else changes.

---

### `src/i18n/ui.en.ts` / `ui.es.ts` (modify)

**Analog:** themselves. Group the keys by prefix, as on lines 6-7 and 28-32 of `ui.en.ts`:
```ts
  'nav.label': 'Main',
  'nav.contact': 'Contact',
  ...
  'meta.404.title': 'Page not found — Martina Fernandez',
```
Add the 14 keys from the UI-SPEC "Dictionary keys" table to both files. Put `nav.projects` before `nav.contact`. `ui.es.ts` keeps `satisfies Dictionary` (it imports the type on line 2). Add a `// TODO(martina)` comment on the new block, as on line 17.

---

### `scripts/sync-behance.ts` (CLI entry, batch)

**Analog:** `scripts/check-secrets.ts` (whole file, 52 lines)

**Header comment, Node built-in imports and `.ts`-extension sibling import** (lines 1-6):
```ts
// Secrets gate: run after `astro build`. Fails when secret files are tracked in git,
// copied into dist/, or when values from local secret files appear in dist/.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { isSecretPath, parseSecretValues } from './secrets.ts';
```

**Loud failure and exit code** (lines 18-21, 41-52):
```ts
if (!existsSync(DIST)) {
  console.error('dist/ not found — run pnpm build first');
  process.exit(1);
}
...
if (problems.length > 0) {
  console.error(`secrets check failed:\n${problems.join('\n')}`);
  process.exit(1);
}

console.log(`secrets check ok (${distFiles.length} dist files scanned)`);
```
The entry stays thin. It parses `--help` / `--allow-fewer`, builds real `SyncDeps`, calls `runSync`, catches `SyncError`, and prints `sync:behance: {reason}. The previous snapshot was left untouched.` (UI-SPEC copy) before `process.exit(1)`.

**package.json script** (existing line):
```json
    "check:secrets": "node scripts/check-secrets.ts",
```
Apply it as `"sync:behance": "node scripts/sync-behance.ts"`. `build:offline` is given verbatim in RESEARCH "Offline guard preload".

---

### `scripts/behance/parse.ts`, `covers.ts`, `raw-schemas.ts`, `slug.ts` (pure, Node-strippable)

**Analog:** `scripts/secrets.ts` (whole file, 30 lines)

**Header that states the constraint** (line 1):
```ts
// Pure helpers for the secrets gate. Erasable TypeScript only (Node type stripping runs it).
```

**Module-level regex constants plus small exported pure functions** (lines 3-10):
```ts
const SECRET_FILE = /(^|\/)(\.env(\..+)?|\.dev\.vars(\..+)?)$/;
const ALLOWED = /(^|\/)\.env\.example$/;
const MIN_SECRET_LENGTH = 8;

export function isSecretPath(path: string): boolean {
  const normalized = path.replaceAll('\\', '/');
  return SECRET_FILE.test(normalized) && !ALLOWED.test(normalized);
}
```
Use this for `STORE` / `CHALLENGE` regexes, `extractStore()`, `keywordsMeta()`, `pickCover()` and `sniffImage()`. No enums, namespaces or parameter properties (Node type stripping rejects them).

---

### `scripts/behance/run-sync.ts` and `fs-commit.ts` (DI service, file-I/O)

**Injected-dependency analog:** `src/lib/seo.ts` lines 33-40. A pure function takes the impure dependency as a parameter so it is testable:
```ts
/**
 * Pure head-tag builder. `absolute` is injected (routes.absoluteFor in Astro) so this stays
 * testable without astro:i18n. ...
 */
export function buildSeo(
  input: SeoInput,
  absolute: (pathname: string, target: Locale) => string,
): SeoTags {
```
Scale it up to the `SyncDeps` interface in RESEARCH Pattern 3 (fetch, sleep, log, paths, now, allowFewer).

**Recursive fs walk** (check-secrets lines 11-16). Reuse it for cover GC and `assert-offline.ts`:
```ts
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}
```
Commit protocol: RESEARCH Pattern 4 (staging under `tmp/`, never overwrite covers, single `rename` of `snapshot.json`). `fs/promises` is fine here, since it is not yet used in the repo.

---

### `eslint.config.js` (modify: DATA-06 boundary)

**Analog:** the file-scoped rule block on lines 20-28:
```js
  // Tool tiles are focusable role="img" so keyboard users can reach their tooltip; ...
  {
    files: ['src/components/sections/ToolsRow.astro'],
    rules: {
      'astro/jsx-a11y/no-noninteractive-tabindex': ['error', { roles: ['img'], tags: [] }],
    },
  },
```
Apply it as `{ files: ['src/components/**', 'src/pages/**'], rules: { 'no-restricted-imports': ['error', { patterns: [{ group: ['**/sources/**'], message: '…DATA-06…' }] }] } }`, with a comment that cites D-23. `tmp/` is already in `globalIgnores` (line 14).

---

### Unit tests for pure project logic

**Analog:** `tests/unit/content-home.test.ts`

**Imports: direct JSON plus named builders and types** (lines 1-18):
```ts
import { describe, expect, it } from 'vitest';
import profile from '../../src/data/profile.json';
...
import {
  assertCount,
  ...
  type ToolEntry,
} from '../../src/lib/content/home';
import { serviceIconKeys, toolIconKeys } from '../../src/lib/content/icons';
```

**Typed inline fixtures** (lines 119-127):
```ts
describe('home query layer', () => {
  const roleFixture: RoleEntry[] = [
    { id: 'branding', data: { order: 2, label: { en: 'Branding', es: 'Branding' } } },
    ...
```

**Exact developer-message assertion** (lines 199-204). Use this form for the unknown-id, duplicate-slug and title-length messages:
```ts
    it('throws the developer message on a wrong count', () => {
      expect(() => assertCount([], 4, 'services')).toThrow(
        new Error('services: expected exactly 4 entries, got 0. Fix src/data/services.json'),
      );
    });
```

**No-mutation assertion** (lines 172-181) for the sort and select functions. **`it.each` tables** (lines 211-217) for slug cases.

---

### `tests/unit/project-card.test.ts` (component render)

**Analog:** `tests/unit/featured-services.test.ts`

**Container render helper** (lines 1-23):
```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import ServiceCard from '../../src/components/ui/ServiceCard.astro';
...
async function renderCard(): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(ServiceCard, {
    props: { ... },
  });
}
```

**Class-token helper and forbidden-substring checks** (lines 25-28, 60-72). Reuse them to assert no `rounded-`, no `line-clamp`, exactly one `<a `, and no "Image may contain":
```ts
function classTokens(tag: string): string[] {
  const match = /class="([^"]*)"/.exec(tag);
  return match?.[1]?.split(/\s+/) ?? [];
}
...
    for (const forbidden of ['<a ', 'cursor-pointer', 'hover:', 'line-clamp', ...]) {
      expect(html).not.toContain(forbidden);
    }
```
`[Inference]` The `cover` prop needs an `ImageMetadata`. The simplest fixture is a real import of `src/assets/hero/portrait.png` in the test, because Vitest runs through `getViteConfig` (`vitest.config.ts`). RESEARCH reports `import.meta.glob` of images works in Vitest.

**Header test (optional):** `tests/unit/language-switcher.test.ts` lines 6-19 show a render with `locale`/`pathname` props and a regex-extracted `<a>` tag. Use it to assert that `aria-current="page"` is on Projects only for `/projects/` and `/es/projects/`.

---

### `tests/unit/sync-parse.test.ts` / `sync-run.test.ts`

**Analog:** `tests/unit/secrets.test.ts` (whole file). It imports a Node script module with a `.ts` extension and uses `it.each` tables:
```ts
import { describe, expect, it } from 'vitest';
import { isSecretPath, parseSecretValues } from '../../scripts/secrets.ts';

describe('isSecretPath', () => {
  it.each(['.env', '.env.local', ...])(
    'flags %s as a secret file',
    (path) => {
      expect(isSecretPath(path)).toBe(true);
    },
  );
```
No analog exists for fake `fetch` / temp-dir integration tests. Follow RESEARCH "Wave 0 Gaps": `fs.mkdtemp` under `tmp/`, `Response` objects, and `sleep: async () => {}`. Also add a CLI smoke test (`node scripts/sync-behance.ts --help`), since Vitest hides missing `.ts` extensions (Pitfall 3).

---

### `tests/e2e/a11y.spec.ts` (modify)

**Pages list** (line 8). Add `'/projects/'` and `'/es/projects/'`:
```ts
const pages = ['/', '/es/', '/does-not-exist', '/es/404/'] as const;
```

**Step model and expected order** (lines 22-46). Insert a Projects step before Contact (line 37), and 3 project steps plus "See all" after the BUTTON step (line 41):
```ts
interface Step {
  name: string;
  href?: string;
  tag?: 'BUTTON';
  role?: 'img';
}
...
    { name: site.name, href: homeHref },
    { name: dict['nav.contact'], href: '#contact' },
    ...
    { name: dict['roles.pause'], tag: 'BUTTON' },
    ...toolSteps,
```
`tabAndExpect` (lines 56-81) compares `href` with `toBe`. Project links need a regex match instead (UI-SPEC: `^/(es/)?projects/[a-z0-9-]+/$`, not followed). `[Proposed]` Add an optional `hrefPattern?: RegExp` to `Step`, or derive the expected hrefs from the snapshot plus overrides via `getLatestProjects`. Note that `outline` (line 72) reads the element's own outline, while the tile ring is drawn on `::after` (UI-SPEC). The `not.toBe('none')` check may need `getComputedStyle(el, '::after')` for project links `[Inference]`. The reduced-motion filter on line 112 (`step.tag !== 'BUTTON'`) must keep working.

`keyboardCases` (lines 48-51) gains `/projects/` and `/es/projects/` with their own order function. There is no hero CTA, pause button or tools on those pages.

---

### `tests/e2e/layout.spec.ts` / `seo.spec.ts` (modify) and `projects.spec.ts` (new)

**320px overflow check** (layout.spec lines 50-59). Extend `cases` (lines 7-10) or add a projects loop:
```ts
    test('at 320px there is no horizontal overflow and h1 is at most 2 lines', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto(path);
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(320);
```

**Nav link lookup by accessible name** (layout.spec lines 39-42):
```ts
      const nav = page.getByRole('navigation', { name: dict['nav.label'], exact: true });
      const contact = nav.getByRole('link', { name: dict['nav.contact'], exact: true });
```

**Per-locale case table plus head assertions** (seo.spec lines 6-31). Copy it for the projects pages, with `meta.projects.*` and canonical `${site.url}/projects/` / `${site.url}/es/projects/`:
```ts
const cases = [
  { path: '/', lang: 'en', dict: en, ogLocale: 'en_US', ogAlternate: 'es_ES' },
  { path: '/es/', lang: 'es', dict: es, ogLocale: 'es_ES', ogAlternate: 'en_US' },
] as const;
```
e2e files import JSON with `with { type: 'json' }` (a11y.spec line 4). Use the same form to read `src/data/project-overrides.json` in `projects.spec.ts`.

---

## Shared Patterns

### No string literals in components / dictionary access
**Source:** `src/i18n/t.ts` lines 10-13; used in every component (for example FeaturedServices line 16).
**Apply to:** ProjectCard, LatestWork, ProjectGrid (if it renders any text), ProjectsView, SiteHeader, the pages.
```ts
export function useTranslations(locale: Locale): (key: UIKey) => string {
  const dictionary = dictionaries[locale];
  return (key) => dictionary[key];
}
```

### Locale URLs
**Source:** `astro:i18n` `getRelativeLocaleUrl` (NotFoundView line 17, SiteHeader line 24) and `src/i18n/routes.ts` `stripLocale` (lines 4-7).
**Apply to:** card `href`, "See all", the nav Projects link, `aria-current` detection. Never concatenate `'/es' + path`.

### Focus ring and touch target
**Source:** SiteHeader line 34 / LanguageSwitcher line 46.
**Apply to:** every new link.
```
inline-flex min-h-11 items-center ... focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent
```
The card link draws the ring on `::after` instead (UI-SPEC ProjectCard).

### Icons
**Source:** NotFoundView line 3 and line 35. Per-file Tabler SVG import, `aria-hidden="true" focusable="false"`, `size-5`.
**Apply to:** LatestWork "See all" only. Cards use no icons.

### Fail-loud build guards
**Source:** `home.ts` lines 63-88, with the message format `<name>: <problem>. Fix <file>`.
**Apply to:** snapshot parse errors, override validation, missing cover, duplicate slug. Also apply it to sync gate errors (`SyncError`) with the UI-SPEC wording.

### Node-strippable shared TS
**Source:** `scripts/secrets.ts` line 1 and `scripts/check-secrets.ts` line 6 (`./secrets.ts` extension).
**Apply to:** `src/lib/projects/{model,snapshot-schema,overrides-schema,slug,projects}.ts` and all `scripts/**`. Value imports use `.ts` extensions. No `astro:*` imports, no enums. `allowImportingTsExtensions` comes from `astro/tsconfigs/strictest` (tsconfig.json extends it).

### View is the only data reader
**Source:** HomeView line 13 comment, plus queries.ts as the single entry point.
**Apply to:** ProjectsView and HomeView. Sections and cards get plain props, and nothing imports `sources/**` outside `src/lib/`.

---

## No Analog Found

| File | Role | Data Flow | Reason / what to use instead |
|------|------|-----------|------------------------------|
| `docs/CONSENT.md` | doc | n/a | No `docs/` dir exists. Use the RESEARCH "Consent note (D-01)" text, and commit it before any `scripts/behance*` file |
| `scripts/behance/fetch-page.ts` | service | network request-response | No network code in the repo. Use RESEARCH "Challenge-aware page fetch" |
| `scripts/offline-guard.ts` | preload | event-driven | No Node preload hooks exist. Use RESEARCH "Offline guard preload" |
| `src/lib/projects/sources/behance-snapshot.ts` (glob part) | adapter | file-I/O | No `import.meta.glob` in the repo. Use RESEARCH Pattern 1 |
| `src/data/behance/snapshot.json` | generated data | file-I/O | Generated. Seed by hand (7 known ids and `publishedOn` values from RESEARCH "Verified Behance Facts") with `"origin": "seed"`. Add it to `.prettierignore` |
| `tests/fixtures/behance/*` | fixtures | n/a | No `tests/fixtures/` dir. Synthetic small HTML per RESEARCH "Wave 0 Gaps". Do not commit the real pages |
| `sync-run.test.ts` fake-fetch harness | test | integration | No DI or integration tests today. Follow RESEARCH Pattern 3 and Wave 0 notes |

## Metadata

**Analog search scope:** `src/**`, `scripts/**`, `tests/**`, `eslint.config.js`, `vitest.config.ts`, `playwright.config.ts`, `package.json`, `.prettierignore`, `.gitignore`, `tsconfig.json`
**Files scanned:** about 70 listed, 30 read
**Project skills:** none (`.claude/skills/` and `.agents/skills/` absent). The taste skill is external, and UI-SPEC records its rules.
**Pattern extraction date:** 2026-10-17
