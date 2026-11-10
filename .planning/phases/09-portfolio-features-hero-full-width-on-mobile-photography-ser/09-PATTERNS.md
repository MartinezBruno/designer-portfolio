# Phase 9: Portfolio Features - Pattern Map

**Mapped:** 2026-11-10
**Files analyzed:** 27 (11 new or rewritten source/test files, 16 modified)
**Analogs found:** 27 / 27. Every file has an in-repo analog. Nothing needs a RESEARCH-only pattern.

All excerpts below were read from the working tree on 2026-11-10 (branch `feature/phase-9-features`). Line numbers are current as of that read.

## RESEARCH vs UI-SPEC naming conflicts (the planner must pick one)

These were found while mapping. Both documents are approved, and they disagree on these details. [Proposed] Use the UI-SPEC for names and copy (it is the design contract) and RESEARCH for lifecycle mechanics (it was verified against the router source).

| Topic | RESEARCH.md | UI-SPEC.md | Note |
|---|---|---|---|
| Root marker | `[data-category-filter]` | `[data-project-filter]` + `[data-project-filter-status]` | Pick one. Use it in the before-swap hook, the nav-focus branch and the e2e. |
| Radio id prefix | `projects-category-${id}` | `projects-filter-${id}` | Both avoid a clash with `contact-service-*`. |
| "All" radio value | `value="all"` | `value=""` | The parser's fallback token must match. |
| No-JS hide | `noscript:hidden` | `hidden motion-js:flex` | `motion-js` is an existing custom variant (`src/styles/global.css:6`). The BaseLayout inline gate sets `data-motion` before first paint. |
| Live region strings | `projects.filter.countOne` / `countOther` (`{count}`) | `projects.filter.status.all` / `.one` / `.many` (`{count}`, `{category}`) | UI-SPEC copy is user-facing. Follow it. |
| When to apply URL state | before-swap on `newDocument`, plus a lifecycle init | "init reads the URL on `astro:page-load`" | RESEARCH Pitfall 3 is source-verified: page-load alone flashes all cards and restores the wrong scroll offset. Do both. |
| Hero `widths` | `[256,448,640,768,1024]` | `[256,448,720,960,1200]` | CONTEXT leaves this to the planner. Check it with the D-04 LCP re-measure. |
| Chip transition variant | (not specified) | `motion-on:transition-colors` | The ServiceChips analog uses `motion-safe:`. `global.css:3-4` says new motion never uses `motion-safe:`. |

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/lib/projects/category-param.ts` (NEW) | utility (pure, client-safe) | transform (URL to allow-listed id) | `src/lib/contact/service-param.ts` | exact |
| `src/lib/projects/filter.ts` (NEW) | utility (pure, Node-safe) | transform (cards to chips, visible tiles) | `src/lib/projects/layout.ts` + `src/lib/projects/card-view.ts` `buildCategoryTitles` | role-match |
| `src/lib/ui/category-filter.ts` (NEW) | client module (lifecycle effect + app-scoped hook) | event-driven (change, before-swap) | `src/lib/ui/service-preselect.ts` + `src/lib/ui/embed-facade.ts` + `src/lib/motion/navigation.ts` (newDocument writes) | exact (composite) |
| `src/components/ui/CategoryFilter.astro` (NEW) | component | request-response (SSG render) + client script | `src/components/contact/ServiceChips.astro` | exact |
| `src/lib/ui/chip.ts` (NEW, optional per UI-SPEC) | utility (shared class strings) | n/a | `src/lib/ui/button-classes.ts` | exact |
| `src/components/views/ProjectsView.astro` | view | SSG render | itself (lines 18-57) | modify |
| `src/components/ui/ProjectGrid.astro` | component | SSG render | itself | modify |
| `src/components/ui/ProjectCard.astro` | component | SSG render | itself (`sizeClasses`/`aspectClasses`/`sizesFor`, lines 29-47) | modify |
| `src/lib/projects/layout.ts` | utility | transform | itself (receives the `sizesFor` map per UI-SPEC) | modify |
| `src/lib/projects/model.ts` | model | n/a | itself, line 9 | modify |
| `src/lib/projects/card-view.ts` | service (view builder) | transform | itself, `toCardView` lines 11-32 | modify |
| `src/lib/contact/fields.ts` | config (client-safe constants) | n/a | itself, line 11 | modify |
| `src/lib/content/home.ts` | service (pure builders) | transform | itself, line 93-99 | modify |
| `src/data/services.json` | config/data | n/a | itself (existing entries) | modify |
| `src/i18n/ui.en.ts`, `src/i18n/ui.es.ts` | config (dictionaries) | n/a | the existing `projects.*` keys | modify |
| `src/components/sections/Hero.astro` | component | SSG render | itself, lines 46-64 | modify |
| `src/lib/motion/nav-focus.ts` | client module (app-scoped) | event-driven | itself, `?service=` branch lines 242-256 | modify |
| `scripts/spanish-review.ts` | script/config | batch | itself, `NON_COPY_TODOS` lines 29-35 | modify (only if the Hero TODO line moves) |
| `tests/unit/category-param.test.ts` (NEW) | test (unit) | — | `tests/unit/contact-service-param.test.ts` | exact |
| `tests/unit/projects-filter.test.ts` (NEW) | test (unit) | — | `tests/unit/projects-layout.test.ts` | exact |
| `tests/unit/category-filter.test.ts` (NEW) | test (unit, happy-dom) | — | `tests/unit/service-preselect.test.ts` | exact |
| `tests/e2e/projects-filter.spec.ts` (NEW) | test (e2e) | — | `tests/e2e/contact-preselect.spec.ts` + `tests/e2e/projects.spec.ts` | role-match |
| `tests/e2e/projects.spec.ts` | test (e2e) | — | itself, lines 146-154 (invert) | modify |
| `tests/e2e/home.spec.ts` | test (e2e) | — | itself, `expectArch` lines 85-118 | modify |
| `tests/unit/contact-fields.test.ts` and the other hard-coded-count tests (RESEARCH Pitfall 4 list) | test | — | `contact-fields.test.ts:15-24` drift guard | modify |
| `tests/unit/nav-focus.test.ts` | test | — | itself (`?service=` branch tests) | extend |

---

## Pattern Assignments

### `src/lib/projects/category-param.ts` (utility, transform) — NEW

**Analog:** `src/lib/contact/service-param.ts` (all 14 lines)

```ts
/**
 * Reads the service a visitor asked about from the URL (`?service=<id>`, D-08). Pure and
 * client-safe: no zod, no dictionaries. The value is attacker-controllable (shareable links), so
 * it is allow-listed through `isServiceChoice`; exactly one recognised value wins, anything else
 * (missing, empty, wrong case, unknown or repeated) falls back to `other`.
 */
import { isServiceChoice, type ServiceChoice } from './fields';

export function parseServiceParam(search: string): ServiceChoice {
  const values = new URLSearchParams(search).getAll('service');
  if (values.length !== 1) return 'other';
  const [value] = values;
  return isServiceChoice(value) ? value : 'other';
}
```

**Differences to apply:**
- The allow-list is a parameter (`allowed: readonly string[]`, the rendered radio values), not a module constant. That way `photography` with no projects falls back to All (D-13, D-14).
- The fallback token is `'all'` or `''`, depending on the conflict table above.
- Also export the URL writer (RESEARCH Pattern 4). It must take `Window`/`URL` as arguments so it can be unit-tested.
- Same header-comment style: state "pure and client-safe" and the attacker-controllable note.
- Imports: none, or only `type` imports. The analog test pins the import list (see the test pattern below).

---

### `src/lib/projects/filter.ts` (utility, transform) — NEW

**Analog 1:** `src/lib/projects/layout.ts` (lines 1-23). Pure function with a docstring that names the decision IDs, a typed const tuple, and an error message prefixed `projects:`.

```ts
export const tileSizes = ['large', 'small', 'large-end', 'third'] as const;
export type TileSize = (typeof tileSizes)[number];

const cycle: readonly TileSize[] = ['large', 'small', 'small', 'large'];

export function tileSize(index: number, count: number): TileSize {
  if (!Number.isInteger(index) || index < 0 || index >= count) {
    throw new Error(
      `projects: tileSize index ${String(index)} out of range for ${String(count)} tiles`,
    );
  }
  if (count > 1 && count % 2 === 1 && index === count - 1) return 'large-end';
  return cycle[index % cycle.length] ?? 'large';
}
```

**Analog 2 (iterating categories in services order):** `src/lib/projects/card-view.ts:35-49`

```ts
export function buildCategoryTitles(
  entries: readonly ServiceEntry[],
  locale: Locale,
): Record<CategoryId, string> {
  const titles = new Map(entries.map((entry) => [entry.id, entry.data.title[locale]]));
  const missing = categoryIds.filter((id) => !titles.has(id));
  if (missing.length > 0) {
    throw new Error(
      `projects: services.json is missing category ids ${missing.join(', ')}. Fix src/data/services.json`,
    );
  }
  const result = {} as Record<CategoryId, string>;
  for (const id of categoryIds) result[id] = titles.get(id) ?? id;
  return result;
}
```

**Apply:** `buildCategoryChips(cards, titles)` walks `categoryIds` (which is in services.json `order`, guarded by the drift tests), keeps ids with at least one card, and returns `[]` when fewer than 2 categories are non-empty (UI-SPEC "When the chip row renders"). Keep it Node-safe: no `astro:*` imports, so it is unit-testable like `layout.ts`.

---

### `src/lib/ui/category-filter.ts` (client module, event-driven) — NEW

**Analog 1 (doc-agnostic apply + lifecycle init):** `src/lib/ui/service-preselect.ts` (lines 1-27)

```ts
import type { Cleanup } from '../motion/lifecycle';
import { parseServiceParam } from '../contact/service-param';

export function applyServicePreselect(doc: Document, search: string): void {
  if (doc.querySelector('input[name="service"]') === null) return;
  const choice = parseServiceParam(search);
  const radio = doc.getElementById(`contact-service-${choice}`);
  if (radio instanceof HTMLInputElement && radio.type === 'radio') radio.checked = true;
}

export function initServicePreselect(doc: Document): Cleanup | undefined {
  applyServicePreselect(doc, doc.defaultView?.location.search ?? '');
  return undefined;
}
```

Copy: the `(doc: Document, search: string)` signature, the early return when the markup is absent, `getElementById` with an allow-listed id (never `querySelector` with URL text), the `instanceof HTMLInputElement` guard, and `doc.defaultView?.location.search ?? ''` instead of the `window` global.

**Analog 2 (listener with AbortController cleanup):** `src/lib/ui/embed-facade.ts:21-58`

```ts
export function initEmbedFacades(doc: Document): Cleanup | undefined {
  const facades = doc.querySelectorAll<HTMLElement>('[data-embed-facade]');
  if (facades.length === 0) return undefined;

  const ac = new AbortController();
  for (const facade of facades) {
    const button = facade.querySelector<HTMLButtonElement>('[data-embed-load]');
    if (!button) continue;
    button.hidden = false;
    button.addEventListener(
      'click',
      () => { /* ... */ },
      { signal: ac.signal },
    );
  }

  return () => {
    ac.abort();
  };
}
```

Copy: return `undefined` when the page has no filter, use one `AbortController`, pass `{ signal }` on every listener, and have the cleanup only call `ac.abort()`. Also cancel any running fade timers or animations and remove inline styles in the cleanup (UI-SPEC Filter motion, "Lifecycle").

**Analog 3 (writing to the incoming document in before-swap):** `src/lib/motion/navigation.ts` around lines 185-206

```ts
event.newDocument.documentElement.dataset['wipe'] = 'out';
// ...
function carryMotionState(event: TransitionBeforeSwapEvent): void {
  const live = doc.documentElement.dataset['motion'];
  if (live !== undefined) event.newDocument.documentElement.dataset['motion'] = live;
}

function syncMotionToggle(event: TransitionBeforeSwapEvent): void {
  const toggle = event.newDocument.querySelector('[data-motion-toggle]');
  toggle?.setAttribute('aria-pressed', String(currentMotionState(doc) === 'reduced'));
}
```

Apply: an app-scoped `document.addEventListener('astro:before-swap', …)` registered once when the module is evaluated (RESEARCH "Applying to the incoming document"). It calls the same `applyCategory(event.newDocument, …)` with `event.to.search`.

**Analog 4 (URL write that keeps the router's state):** `src/lib/motion/nav-focus.ts:250-252`

```ts
const next = new URL(here.href);
next.hash = url.hash;
view.history.replaceState(view.history.state, '', next.href);
```

**Reveal interplay (UI-SPEC "Reveal interplay"):** `src/lib/motion/reveal.ts:223-226` marks an element as already shown like this:

```ts
const showInstantly = (el: HTMLElement): void => {
  el.setAttribute('data-revealed', '');
  el.setAttribute('data-reveal-instant', '');
};
```

`showInstantly` is local to `createReveal`, not exported. Write the same two attributes directly on newly visible cards' `[data-reveal]` descendants, or export a helper from reveal.ts.

**Strings without dictionaries:** import only `interpolate` from `src/i18n/interpolate.ts` (dictionary-free by design, lines 1-10). Read the templates from `data-*` attributes on the status `<p>`. Same idea as `data-contact-strings` in `src/components/contact/ContactForm.astro:44`:

```astro
data-contact-strings={JSON.stringify(strings)}
```

**Bundle constraint:** import only `tileSize` (layout.ts), the parser, `interpolate` and `type Cleanup`. Never import gsap, zod, `src/i18n/t.ts` or `ui.*.ts`.

---

### `src/components/ui/CategoryFilter.astro` (component) — NEW

**Analog:** `src/components/contact/ServiceChips.astro` (lines 1-61)

**Imports and props pattern** (lines 9-25):
```astro
import { useTranslations, type Locale } from '../../i18n/t';
import type { ServiceView } from '../../lib/content/home';

interface Props {
  locale: Locale;
  services: readonly ServiceView[];
}

const { locale, services } = Astro.props;
const t = useTranslations(locale);
```

**Chip class** (line 27-28). Per UI-SPEC: drop the icon parts (`gap-2`, `text-left`, `[&>svg]:hidden`, `peer-checked:[&>svg]:block`) and change `motion-safe:` to `motion-on:`. Keep the taste-skill-ignore comment.
```astro
const chip =
  'inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-ink-muted px-4 py-2 text-left text-sm font-semibold text-ink cursor-pointer hover:border-ink [&>svg]:hidden peer-checked:border-ink peer-checked:bg-ink peer-checked:text-surface peer-checked:[&>svg]:block peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent motion-safe:transition-colors motion-safe:duration-150'; // taste-skill-ignore: 2px radio-chip boundary (WCAG 1.4.11), not a 1px box
```

**Radio group markup** (lines 31-53):
```astro
<fieldset class="m-0 min-w-0 border-0 p-0">
  <legend class="text-ink mb-4 text-base font-semibold">…</legend>   <!-- filter: class="sr-only" -->
  <div class="flex flex-wrap gap-2">
    {choices.map((choice) => (
      <div>
        <input type="radio" name="service" id={`contact-service-${choice.id}`} value={choice.id}
               checked={choice.id === 'other'} class="peer sr-only" />
        <label for={`contact-service-${choice.id}`} class={chip}>
          <IconCheck aria-hidden="true" focusable="false" class="size-4" />   <!-- filter: no icon -->
          {choice.label}
        </label>
      </div>
    ))}
  </div>
</fieldset>
```

**Script registration** (lines 55-61). The page-scoped part goes through the lifecycle. The app-scoped before-swap hook runs at module evaluation inside the imported module.
```astro
<script>
  import { lifecycle } from '../../lib/motion';
  import { initServicePreselect } from '../../lib/ui/service-preselect';

  lifecycle.register(initServicePreselect);
</script>
```

Do not wrap the fieldset in a `<form>` (RESEARCH anti-pattern: the ClientRouter intercepts submit).

---

### `src/lib/ui/chip.ts` (shared class strings) — NEW, optional

**Analog:** `src/lib/ui/button-classes.ts` (lines 1-18). Exported `const` literal class strings with a comment on why they are shared:

```ts
// Shared pill button class strings, so links and buttons that look alike never drift apart.
export const inkButton =
  'bg-ink text-surface focus-visible:outline-accent hover:bg-ink/90 inline-flex h-12 items-center gap-2 rounded-full px-6 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-colors motion-safe:duration-150';
```

Tailwind already scans `src/lib/ui/*.ts`, because `button-classes.ts` works today. If ServiceChips moves to the shared base, `contact-section.test.ts` may assert class strings. Check it.

---

### `src/components/views/ProjectsView.astro` (view) — modify

**Analog:** itself. Current structure (lines 15, 18-40):
```astro
const all = await getAllProjects(locale);
---
<section aria-labelledby="projects-title"
  class="mx-auto flex w-full max-w-[88rem] flex-col gap-12 px-4 py-16 sm:px-8 lg:px-12">
  <div class="flex flex-col gap-6"> h1 + intro </div>
  {all.length > 0 ? (
    <ProjectGrid projects={all} variant="full" headingLevel={2} locale={locale} eagerFirst />
  ) : ( …empty state… )}
</section>
```
**Change:** in the non-empty branch, wrap it in `<div class="flex flex-col gap-8">`, render `<CategoryFilter>` only when there are 2 or more chips, then the status `<p>`, then `<ProjectGrid>` (UI-SPEC Placement). Chips are computed here at build time (ProjectsView is "the only project reader for this page", line 11 comment).

---

### `src/components/ui/ProjectGrid.astro` / `ProjectCard.astro` (components) — modify

**Analog:** themselves.

ProjectGrid line 36 (where the size is computed):
```astro
size={layout === 'row' ? 'third' : tileSize(index, projects.length)}
```

ProjectCard lines 29-47 (class maps to convert to `data-tile` variants) and line 58 (`<li>` host):
```astro
const sizeClasses: Record<TileSize, string> = {
  large: 'md:col-span-7',
  small: 'md:col-span-5',
  'large-end': 'md:col-span-8 md:col-start-3',
  third: 'md:col-span-4',
};
const aspectClasses: Record<TileSize, string> = {
  large: 'aspect-[5/4]',
  small: 'aspect-[5/4] md:aspect-[7/8]',
  'large-end': 'aspect-[5/4]',
  third: 'aspect-[4/5]',
};
const sizesFor: Record<TileSize, string> = { … };   // move to layout.ts per UI-SPEC
...
<li class={sizeClasses[size]}>
```
**Change:** emit `data-tile={size}` and `data-category={categoryId}` on the `<li>`, and write the class maps as literal `data-[tile=…]` variants (RESEARCH Pattern 3, Assumption A2. Verify with `pnpm build` and `projects-grid.spec.ts`). Keep the eager/shutter/parallax spreads (lines 49-55) unchanged. The Home `third` row must keep rendering the same way.

---

### `src/lib/projects/model.ts` / `card-view.ts` (model, transform) — modify

`model.ts:8-11`:
```ts
/** Curated categories. Same ids, same order as src/data/services.json. */
export const categoryIds = ['graphic-design', 'web-design', 'branding', 'social-media'] as const;
export type CategoryId = (typeof categoryIds)[number];
```
Append `'photography'`. `ProjectCardView` (lines 70-80) gains `categoryId: CategoryId | null`. `toCardView` (card-view.ts:18-31) sets it next to the existing `category:` line 25:
```ts
category: project.category === null ? null : categoryTitles[project.category],
```
Keep model.ts erasable TS: only type imports plus const tuples (header comment lines 1-2).

---

### `src/lib/contact/fields.ts` / `src/lib/content/home.ts` / `src/data/services.json` — modify

`fields.ts:10-13`:
```ts
/** Service ids in src/data/services.json `order` order. A unit test guards against drift. */
export const SERVICE_IDS = ['graphic-design', 'web-design', 'branding', 'social-media'] as const;
```
Either append `'photography'` or re-export `categoryIds` from `../projects/model`. Header lines 1-5: this file must stay client-safe (no zod, no dictionaries). model.ts has only type imports plus a const, so re-exporting is safe [Inference].

`home.ts:93-99` (the build-breaking assertion):
```ts
/** HOME-04: the services grid holds exactly 4 cards. */
export function buildServices(entries: readonly ServiceEntry[], locale: Locale): ServiceView[] {
  return sortByOrder(assertCount(entries, 4, 'services')).map((entry) => ({
```
Change to `categoryIds.length` and update the docstring (HOME-04 wording).

`services.json`: copy the `social-media` entry shape (lines 65-73) with `"id": "photography", "order": 5`, and use the verbatim D-07 copy.

---

### `src/i18n/ui.en.ts` / `ui.es.ts` (dictionaries) — modify

**Analog:** the existing `projects.*` block (en lines 42-49, es lines 45-53). In ES, add a `// TODO(martina): Phase 9 copy …; review in .planning/phases/08-quality-verification/08-SPANISH-REVIEW.md.` comment above the new keys, like the per-phase markers at es lines 8, 32 and 36. The ES object ends `} as const satisfies Dictionary;`, so a missing key is a type error. Run `pnpm review:spanish` afterwards (Pitfall 5).

---

### `src/components/sections/Hero.astro` (component) — modify

**Analog:** itself, lines 46-64:
```astro
<div class="order-first lg:order-none lg:col-span-3 lg:self-start lg:justify-self-end">
  <Picture
    src={portrait}
    {...pictureFormat}
    alt={t('hero.imageAlt')}
    loading="eager"
    fetchpriority="high"
    width={600}
    height={800}
    widths={[256, 448, 600]}
    sizes="(min-width: 87.5rem) 19rem, (min-width: 64rem) 16rem, (min-width: 40rem) 11rem, 8rem"
    pictureAttributes={{
      'data-hero-portrait': '',
      class:
        'block w-32 sm:w-44 lg:w-64 min-[87.5rem]:w-[19rem] overflow-hidden bg-accent rounded-[50%_50%_1.25rem_1.25rem/37.5%_37.5%_1.25rem_1.25rem]',
    }}
    class="block aspect-[3/4] w-full object-cover object-[50%_6%]"
  />
</div>
```
**Change (UI-SPEC Geometry contract):** `w-32` → `w-full`, a phone radius of `/40%_40%…` with `sm:` restoring `/37.5%…`, `aspect-[4/5] sm:aspect-[3/4]`, the last `sizes` entry → `calc(100vw - 2rem)`, and new `widths`. Keep `width/height` 600×800, `data-hero-portrait`, eager and fetchpriority. Update the HTML comment on line 47 ("3:4 arch").

**Line-pin hazard:** line 10 is `// TODO(martina): supply the original uncropped photo at >=1000px …`, pinned in `scripts/spanish-review.ts:31-33` as `src/components/sections/Hero.astro:10`. If the TODO text or line changes (UI-SPEC asks for new wording), update the `NON_COPY_TODOS` entry and regenerate with `pnpm review:spanish`.

---

### `src/lib/motion/nav-focus.ts` (app-scoped click hook) — modify

**Analog:** its own `?service=` branch, lines 236-256:
```ts
if (url.origin !== here.origin || url.pathname !== here.pathname || url.hash === '') return;
const target = hashTarget(doc, url.hash);
if (!target || target.matches(SKIPPED_TARGETS)) return;

const smooth = currentMotionState(doc) === 'on' && !link.hasAttribute('data-skip-link');

if (url.search !== here.search) {
  // Only the service links are taken over; any other search change stays the router's.
  if (!url.searchParams.has('service')) return;
  event.preventDefault();
  cancelPending();
  applyServicePreselect(doc, url.search);
  const next = new URL(here.href);
  next.hash = url.hash;
  view.history.replaceState(view.history.state, '', next.href);
  target.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant', block: 'start' });
  void land(view, target, smooth, null);
  return;
}
```
**Change (RESEARCH Pitfall 2):** after the filter has rewritten `?category=` with replaceState, the skip link `#main` resolves with the same search as `here`, so it reaches the native-fragment path (lines 258-261). The router then compares against its stale `originalLocation` and swaps the page onto itself. Add a branch, gated on the filter root marker being present, that handles the jump locally like the `?service=` block: `preventDefault`, replaceState with a hash, scrollIntoView, `land()`. Update the docstring bullet list (lines 120-127) in the same style.

---

## Test Patterns

### `tests/unit/category-param.test.ts` — NEW
**Analog:** `tests/unit/contact-service-param.test.ts` (lines 1-33). Copy the `it.each` fallback table (empty, empty value, wrong case, unknown, repeated, unrelated param, encoded `<script>`) and the import-pin test:
```ts
it('imports no zod, astro:env or dictionaries', () => {
  const source = readFileSync(resolve('src/lib/contact/service-param.ts'), 'utf8');
  const imports = [...source.matchAll(/from '([^']+)'/g)].map((m) => m[1]);
  expect(imports).toEqual(['./fields']);
});
```

### `tests/unit/projects-filter.test.ts` — NEW
**Analog:** `tests/unit/projects-layout.test.ts` (lines 1-33). A `sequences` table driven through `it.each`. Reuse it for visible-subset rhythm: 3 → `['large','small','large-end']`, 2 → `['large','small']`, 1 → `['large']`, which matches the UI-SPEC rhythm list.

### `tests/unit/category-filter.test.ts` — NEW
**Analog:** `tests/unit/service-preselect.test.ts` (lines 1-60): `// @vitest-environment happy-dom` on line 1, a string `fixture()` builder of radios, `setSearch` through `window.history.replaceState(null, '', …)`, `afterEach` resetting `document.body.innerHTML` and the URL, and `createLifecycle` imported to test that unmount removes the listener.
```ts
// @vitest-environment happy-dom
import { createLifecycle } from '../../src/lib/motion/lifecycle';
...
function setSearch(search: string): void {
  window.history.replaceState(null, '', `/${search}#contact`);
}
```
For the before-swap path, build a second `Document` (for example `document.implementation.createHTMLDocument()`) and call `applyCategory(newDoc, id)`. The function must not touch `window`.

### `tests/e2e/projects-filter.spec.ts` — NEW
**Analog:** `tests/e2e/contact-preselect.spec.ts` (lines 1-45): a locale `cases` table over `en`/`es` dictionaries, the services list sorted by `order` and imported from JSON (`with { type: 'json' }`), and expected strings built with `interpolate` from `src/i18n/t`. Use the axe setup from `tests/e2e/projects.spec.ts:138-143` (`settleMotion(page)` before `AxeBuilder…withTags(AXE_TAGS)`).

### `tests/e2e/projects.spec.ts:146-154` — invert
```ts
test('has no filter or search UI (PROJ-04..07 N/A, D-16)', async ({ page }) => {
  await page.goto(path);
  await expect(
    page.locator('main').locator('[role="search"], input, select, form, [aria-live], [aria-pressed]'),
  ).toHaveCount(0);
});
```
Replace it with: exactly one radio group, a `role="status"` region, and still no `[role="search"]`, `select` or `form` (PROJ-05/06 stay N/A).

### `tests/e2e/home.spec.ts` `expectArch` (lines 85-118) — modify
It hard-codes the 3:4 ratio (`maxSide * 4 / 3`) and `topLeft === '50% 37.5%'`. The `[375, 128]` case (lines 58-61) and the reduced-motion case (line 75) become full width, 4:5 and `50% 40%`. Parameterize the ratio and radius per width. Keep the `width='600'`/`height='800'` attribute assertions (lines 89-90). The intrinsic size stays the same.

### Drift guard — extend
**Analog:** `tests/unit/contact-fields.test.ts:15-19`
```ts
it('matches the ids in src/data/services.json in order (drift guard)', () => {
  const ids = [...services].sort((a, b) => a.order - b.order).map((service) => service.id);
  expect([...SERVICE_IDS]).toEqual(ids);
});
```
Add the same assertion for `categoryIds` (a three-way guard). The other count-fixture updates are listed in RESEARCH Pitfall 4.

---

## Shared Patterns

### Lifecycle (page-scoped effects)
**Source:** `src/lib/motion/lifecycle.ts:1-3, 77-107`; `src/lib/motion/index.ts:9-18`
**Apply to:** `category-filter.ts`, `CategoryFilter.astro`
```ts
export type Cleanup = () => void;
export type PageInit = (doc: Document) => Cleanup | undefined;
```
`lifecycle.register(init)` mounts on `astro:page-load` after the wipe releases (`waitForRelease`) and unmounts on `astro:before-swap`. Because the mount comes late, anything that must be correct at first paint after a soft nav goes in an app-scoped before-swap listener (the `navigation.ts` pattern), not in the init.

### Allow-listed URL input and safe DOM writes
**Source:** `service-param.ts` (allow-list), `nav-focus.ts:28-29` ("getElementById, never querySelector: the hash is untrusted text"), `embed-facade.ts:14-20` (setters only).
**Apply to:** every place that reads `?category=`. Never `innerHTML`. Use only `textContent`, `dataset` and `hidden`.

### History writes under ClientRouter
**Source:** `nav-focus.ts:248-252` (07-11 CR-01 comment)
**Apply to:** the filter URL write and the new nav-focus branch. Always `replaceState(history.state, '', url)`, never `pushState`.

### Motion variants
**Source:** `src/styles/global.css:2-6`
```css
@custom-variant motion-on (&:where([data-motion='on'], [data-motion='on'] *));
/* … New motion never uses motion-safe:, which ignores the toggle. */
@custom-variant motion-reduced (…);
@custom-variant motion-js (…);
```
**Apply to:** the chip transition (`motion-on:`), the filter fade (gate on `data-motion === 'on'`; `currentMotionState` from `src/lib/motion/events` is how nav-focus.ts:240 reads it), and the no-JS hide (`motion-js:` per UI-SPEC).

### Dictionary-free client strings
**Source:** `src/i18n/interpolate.ts:1-10`, `ContactForm.astro:7,44`
**Apply to:** the live-region templates. Render them into `data-*` at build time and interpolate on the client.

### Spanish copy review
**Source:** `src/i18n/ui.es.ts` TODO(martina) phase markers; `scripts/spanish-review.ts:28-43`
**Apply to:** services.json Photography rows, the new `projects.filter.*` keys, and Hero.astro line 10. Re-run `pnpm review:spanish` after each edit.

## No Analog Found

None. Two parts are only partly covered and depend on RESEARCH:

| File | Gap | Use instead |
|---|---|---|
| `src/lib/ui/category-filter.ts` | No existing module does an opacity fade and staggered rise with CSS transitions and no GSAP | UI-SPEC "Filter motion" table and the motion tokens (`--t-ui`, `--t-settle`, `--ease-*`) in global.css. Reveal stagger cap: `revealDelay` in `src/lib/motion/reveal.ts:104` |
| `ProjectCard.astro` `data-[tile=…]` variants | No existing component switches layout classes through a data attribute | RESEARCH Pattern 3 (Assumption A2. Fallback: export literal class maps from layout.ts and swap tokens) |

## Metadata

**Analog search scope:** `src/lib/{projects,contact,content,ui,motion}`, `src/components/{contact,ui,views,sections}`, `src/i18n`, `src/data`, `src/styles/global.css`, `scripts/spanish-review.ts`, `tests/unit`, `tests/e2e`
**Files scanned:** about 30 read, plus a directory listing of 72 unit and 39 e2e test files
**Pattern extraction date:** 2026-11-10
