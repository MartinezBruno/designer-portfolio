# Phase 2: Homepage Story - Pattern Map

**Mapped:** 2026-10-16
**Files analyzed:** 27 (19 new, 8 modified)
**Analogs found:** 24 / 27 (3 have no analog in the codebase; use RESEARCH.md patterns)

**Precedence used for the file list:** CONTEXT.md > UI-SPEC.md > RESEARCH.md. The RESEARCH tree was written before CONTEXT, so these names and shapes are overridden:
- `ToolsGrid.astro` (RESEARCH) becomes **`ToolsRow.astro`** (UI-SPEC).
- `services.json` `description` becomes **`items: { en: string[], es: string[] }`** (D-04).
- `tools.json` `icon` becomes **required**, keys `illustrator | indesign | photoshop | figma | lightroom` (D-13, UI-SPEC).
- **No `availability.closed` key.** The badge renders nothing when `available: false` (D-08).
- New file **`src/lib/ui/tooltips.ts`** plus its unit test (D-14, UI-SPEC Tools row).
- `global.css` swaps `--color-accent` to `#0f70b7` and adds `--color-success` (D-15, UI-SPEC).

All "Analog" excerpts below were read from the repo on 2026-10-16 `[Verified: read]`. Proposed shapes for new files are `[Proposed]`.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/content.config.ts` (NEW) | config | build-time validation | `src/data/site.ts` (typed content + `TODO(martina)`) | partial (no collections exist yet) |
| `src/data/roles.json` (NEW) | content/data | static | `src/data/site.ts` | partial (TS vs JSON) |
| `src/data/services.json` (NEW) | content/data | static | `src/data/site.ts` | partial |
| `src/data/tools.json` (NEW) | content/data | static | `src/data/site.ts` | partial |
| `src/data/profile.json` (NEW) | content/data | static | `src/data/site.ts` | partial |
| `src/lib/content/icons.ts` (NEW) | utility (const tuples + types) | n/a | `src/i18n/config.ts` | exact (same `as const` tuple + derived type) |
| `src/lib/content/home.ts` (NEW) | utility (pure transform) | transform | `src/lib/seo.ts` | role-match (pure, testable, injected deps) |
| `src/lib/content/queries.ts` (NEW) | service (collection reads) | build-time request-response | none | no analog |
| `src/lib/motion/marquee.ts` (NEW) | utility (DOM init) | event-driven | `src/lib/motion/lifecycle.ts` + `gate.ts` `onMotionPreferenceChange` | role-match |
| `src/lib/ui/tooltips.ts` (NEW) | utility (DOM init) | event-driven | same as marquee.ts | role-match |
| `src/components/sections/RolesMarquee.astro` (NEW) | component (section) + client script | static render + event-driven | `src/components/sections/Hero.astro` + `src/layouts/BaseLayout.astro` (script) + `LanguageSwitcher.astro` (`class:list`) | role-match |
| `src/components/sections/FeaturedServices.astro` (NEW) | component (section) | static render | `src/components/sections/Hero.astro` | exact |
| `src/components/sections/ToolsRow.astro` (NEW) | component (section) + client script | static render + event-driven | `Hero.astro` + `SiteFooter.astro` (icon list) | role-match |
| `src/components/ui/AvailabilityBadge.astro` (NEW) | component (ui) | static, conditional | `SiteFooter.astro` conditional `{x && (...)}` + `ButtonLink.astro` | role-match |
| `src/components/ui/ServiceCard.astro` (NEW) | component (ui) | static render | `src/components/ui/ButtonLink.astro` / `IconLink.astro` | role-match |
| `src/components/ui/ServiceIcon.astro` (NEW) | component (ui, typed map) | static | `LanguageSwitcher.astro` (`as const satisfies Record`) + `SiteFooter.astro` (icon imports) | role-match |
| `src/components/ui/ToolIcon.astro` (NEW) | component (ui, typed map) | static | same as ServiceIcon | role-match |
| `src/components/views/HomeView.astro` (MOD) | view (composition, only data reader) | build-time request-response | itself | exact |
| `src/components/sections/Hero.astro` (MOD) | component (section) | static | itself | exact |
| `src/i18n/ui.en.ts` (MOD) | config (dictionary) | n/a | itself | exact |
| `src/i18n/ui.es.ts` (MOD) | config (dictionary) | n/a | itself | exact |
| `src/styles/global.css` (MOD) | config (tokens) | n/a | itself | exact |
| `tests/unit/content-home.test.ts` (NEW) | test (pure functions + JSON import) | n/a | `tests/unit/routes.test.ts` | exact |
| `tests/unit/marquee-toggle.test.ts` (NEW) | test (happy-dom) | n/a | `tests/unit/lifecycle.test.ts` | exact |
| `tests/unit/tool-tooltips.test.ts` (NEW) | test (happy-dom) | n/a | `tests/unit/lifecycle.test.ts` | exact |
| `tests/unit/home-sections.test.ts` (NEW) | test (AstroContainer) | n/a | `tests/unit/site-footer.test.ts` | exact |
| `tests/e2e/home-story.spec.ts` (NEW) | test (e2e) | n/a | `tests/e2e/home.spec.ts` + `tests/e2e/motion.spec.ts` | exact |
| `tests/e2e/a11y.spec.ts` (MOD) | test (e2e) | n/a | itself | exact |
| `tests/e2e/layout.spec.ts` (MOD) | test (e2e) | n/a | itself | exact |

(The test for `tool-tooltips` isn't named in RESEARCH or VALIDATION. The name `tests/unit/tool-tooltips.test.ts` is `[Proposed]`; the planner may fold it into `marquee-toggle.test.ts`.)

---

## Pattern Assignments

### `src/lib/content/icons.ts` (utility, const tuples)

**Analog:** `src/i18n/config.ts` (lines 1-3). A readonly tuple, with the union type derived from it:
```ts
export const locales = ['en', 'es'] as const;

export type Locale = (typeof locales)[number];
```
Apply the same pattern:
```ts
// [Proposed]
export const serviceIconKeys = ['vector', 'layout', 'palette', 'speakerphone'] as const;
export type ServiceIconKey = (typeof serviceIconKeys)[number];
export const toolIconKeys = ['illustrator', 'indesign', 'photoshop', 'figma', 'lightroom'] as const;
export type ToolIconKey = (typeof toolIconKeys)[number];
```
`z.enum(serviceIconKeys)` in `content.config.ts` and the `satisfies Record<ServiceIconKey, …>` in `ServiceIcon.astro` both import from here (RESEARCH Pattern 6, verified in spike).

---

### `src/content.config.ts` (config, build-time validation): NO in-repo analog

There are no collections yet. Use RESEARCH Pattern 1 (lines 194-225) with these CONTEXT amendments:
- `services.schema`: replace `description: localized` with `items: z.object({ en: z.array(z.string().min(1)).min(1), es: z.array(z.string().min(1)).min(1) })` (D-04).
- `tools.schema`: `icon: z.enum(toolIconKeys)` **required**, not `.optional()` (UI-SPEC).
- Import `z` from `astro/zod`, **not** `astro:content` (deprecated).
- Put the `TODO(martina)` review note here as a comment, because JSON has no comments (UI-SPEC Copywriting, D-02).

`TODO(martina)` comment style to copy, from `src/data/site.ts` lines 14-17:
```ts
  // TODO(martina): real domain
  url: 'https://martinafernandez.example',
  // TODO(martina): real address
```

---

### `src/data/{roles,services,tools,profile}.json` (content)

**Analog:** `src/data/site.ts` is the only existing content module (typed and `as const satisfies SiteConfig`). The JSON files can't carry its comments, so the review markers move to `content.config.ts` plus the SUMMARY "Known Stubs".

The exact values come from CONTEXT D-03 (roles), D-05..D-07 (services, order, items), D-12/D-13 (tools), and D-09 (`profile.json` = `{ "availability": { "available": true } }`). UI-SPEC lines 360-390 restate them as tables with `order`, `id` and `icon` columns.

Shape notes:
- Array files: each item needs a unique `id`. `profile.json` is the object form, where the key is the id (`getEntry('profile', 'availability')`).
- Service ids are fixed: `graphic-design`, `web-design`, `branding`, `social-media` (Phase 5 keys on them).

---

### `src/lib/content/home.ts` (utility, pure transform)

**Analog:** `src/lib/seo.ts`

**Imports pattern** (line 1). Relative imports, with a type-only `Locale`:
```ts
import { locales, type Locale } from '../i18n/config';
```
For `src/lib/content/home.ts` this becomes `import type { Locale } from '../../i18n/config';`. Do **not** import `astro:content` here (Vitest returns `[]` for collections, RESEARCH Pitfall 4).

**Pure, dependency-injected function pattern** (lines 33-40). The JSDoc explains why it's pure. Exported interfaces describe outputs:
```ts
/**
 * Pure head-tag builder. `absolute` is injected (routes.absoluteFor in Astro) so this stays
 * testable without astro:i18n. 404s get noindex and no canonical, hreflang or og:url.
 */
export function buildSeo(
  input: SeoInput,
  absolute: (pathname: string, target: Locale) => string,
): SeoTags {
```

**Typed per-locale lookup** (line 31). Use this for localize helpers if a map is needed:
```ts
const ogLocales = { en: 'en_US', es: 'es_ES' } as const satisfies Record<Locale, OgLocale>;
```

Core functions: `sortByOrder`, `assertCount`, `assertNonEmpty`, `localizeRoles/Services/Tools`, from RESEARCH Pattern 5 (lines 305-318). Error messages must match UI-SPEC line 398 verbatim, including the file to fix, for example `services: expected exactly 4 entries, got {n}. Fix src/data/services.json`. View model for services: `{ id, icon, title, items: string[] }` (D-04, not `description`).

Avoid `unknown`/`any` (AGENTS.md). Use generics such as `<T extends { id: string; data: { order: number } }>` as in RESEARCH Pattern 5.

---

### `src/lib/content/queries.ts` (service, build-time reads): NO in-repo analog

Nothing reads `astro:content` today. Use RESEARCH Pattern 5 (line 319). It should be a thin wrapper: `getCollection('roles'|'services'|'tools')` and `getEntry('profile','availability')`, then hand off to `home.ts`. If the `availability` entry is missing, throw the UI-SPEC message `profile: missing "availability" entry. Fix src/data/profile.json`. It is covered by e2e only.

---

### `src/lib/motion/marquee.ts` (utility, event-driven DOM init)

**Analog A:** `src/lib/motion/lifecycle.ts` (lines 1-3). This is the contract the init must satisfy:
```ts
export type Cleanup = () => void;
// Return undefined for no cleanup (void unions are rejected by @typescript-eslint/no-invalid-void-type).
export type PageInit = (doc: Document) => Cleanup | undefined;
```
`initMarqueeToggles(doc: Document): Cleanup | undefined`. Return `undefined` (not `void`) when there are no buttons.

**Analog B:** `src/lib/motion/gate.ts` `onMotionPreferenceChange` (lines 21-33). This is the existing "subscribe, return unsubscribe" shape:
```ts
export function onMotionPreferenceChange(
  win: Window,
  cb: (state: MotionState) => void,
): () => void {
  const mq = win.matchMedia('(prefers-reduced-motion: reduce)');
  const handler = (): void => {
    cb(mq.matches ? 'off' : 'on');
  };
  mq.addEventListener('change', handler);
  return () => {
    mq.removeEventListener('change', handler);
  };
}
```
Phase 2 upgrades the cleanup to a single `AbortController` (`{ signal: ac.signal }` on every listener, `return () => ac.abort();`), as required by CONTEXT D-14 and RESEARCH Pattern 4 (lines 283-299). Keep the explicit `(): void` arrow return types used in gate.ts.

**Registration pattern.** The singleton lives in `src/lib/motion/index.ts` (lines 1-8):
```ts
import { bindToAstro, createLifecycle } from './lifecycle';

// Page-scoped singleton. Motion effects (Phases 6-7) register through it; none in Phase 1.
export const lifecycle = createLifecycle(document, (err) => {
  console.error(err);
});

bindToAstro(lifecycle, document);
```
Update the comment on line 3 now that Phase 2 registers effects.

---

### `src/lib/ui/tooltips.ts` (utility, event-driven DOM init)

**Analogs:** same as `marquee.ts` (`PageInit` signature, AbortController cleanup, registered through `lifecycle` from `src/lib/motion`).

Behavior table: UI-SPEC lines 304-316. It touches only `data-open` and `data-dismissed` on `[data-tool]`. Listeners: `pointerenter`/`focusin` (clear own `data-dismissed`, dismiss the others), `pointerup`/`click` for tap toggle (pointerType touch/pen), document `pointerdown` outside to close, and document `keydown` Escape to dismiss visible tiles. All listeners use one `signal`. The import path from the component script is `../../lib/ui/tooltips` (UI-SPEC permits co-locating in `lib/motion` instead).

---

### `src/components/sections/FeaturedServices.astro` (section, static)

**Analog:** `src/components/sections/Hero.astro`

**Imports + Props + t()** (lines 1-15):
```astro
---
import { Picture } from 'astro:assets';
import IconArrowRight from '@tabler/icons/outline/arrow-right.svg';
import ButtonLink from '../ui/ButtonLink.astro';
import { site } from '../../data/site';
import { useTranslations, type Locale } from '../../i18n/t';
...
interface Props {
  locale: Locale;
}

const t = useTranslations(Astro.props.locale);
---
```
**Section landmark pattern** (line 17 and line 23): `aria-labelledby` points to the heading id, with the container classes the UI-SPEC reuses:
```astro
<section aria-labelledby="hero-title" class="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
...
      <h1 id="hero-title" class="font-display text-5xl font-semibold tracking-tight">
```
For Phase 2 sections, the UI-SPEC (line 198) is: `<section aria-labelledby="{id}-title" class="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">` with **no `py-16`**, because vertical rhythm comes from the HomeView wrapper `flex flex-col gap-16 py-16`. Inner content is `flex flex-col gap-8`. The h2 is `font-display text-2xl font-semibold tracking-tight`.

Props: `{ services: ServiceView[]; locale: Locale }`. **No `getCollection` here** (only HomeView reads data).

---

### `src/components/sections/RolesMarquee.astro` (section + client script)

**Analog A:** `Hero.astro` (imports/Props/`t()` as above).

**Analog B (component-level module script):** `src/layouts/BaseLayout.astro` lines 48-50, the only bundled `<script>` in the repo:
```astro
    <script>
      import '../lib/motion';
    </script>
```
RolesMarquee's script follows RESEARCH Pattern 3 (lines 271-275): `import { lifecycle } from '../../lib/motion'; import { initMarqueeToggles } from '../../lib/motion/marquee'; lifecycle.register(initMarqueeToggles);`. Vite dedupes the `lib/motion` chunk into one singleton (verified in spike).

**Analog C (`class:list` with a shared class constant):** `LanguageSwitcher.astro` lines 45-50:
```astro
            class:list={[
              'inline-flex min-h-11 min-w-11 items-center justify-center text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
              current
                ? 'text-ink underline decoration-2 underline-offset-4'
                : 'text-ink-muted hover:text-ink motion-safe:transition-colors motion-safe:duration-150',
            ]}
```
Use it for the two `<ul>` copies: one `const copyClasses = '…'` in frontmatter (UI-SPEC line 230), then `class:list={[copyClasses, 'hidden motion-on:flex']}` plus `aria-hidden="true"` on copy B.

**Icon usage** (Hero line 32): every decorative icon gets both attributes:
```astro
<IconArrowRight aria-hidden="true" focusable="false" class="size-5" />
```
Use this for `player-pause`, `player-play` and `asterisk`.

**Pause button.** The 44px target pattern comes from `IconLink.astro` line 20 (`inline-flex min-h-11 min-w-11 items-center justify-center … motion-safe:transition-colors motion-safe:duration-150`). **Exception:** use `focus-visible:outline-accent-ink` (white), never `outline-accent`, inside the band (D-17). Full class string: UI-SPEC line 254. The label is fixed `aria-label={t('roles.pause')}`, and state lives only in `aria-pressed`.

**Static-render safety:** `RolesMarquee` must also render inside AstroContainer (unit test). `site-footer.test.ts` asserts `not.toContain('<script')` for the footer. **Do not** copy that assertion for RolesMarquee or ToolsRow, which do ship a script.

---

### `src/components/sections/ToolsRow.astro` (section + client script)

**Analog:** `SiteFooter.astro` lines 34-39. It renders an icon list as `<ul class="flex gap-2"><li>…`:
```astro
    <ul class="flex gap-2">
      <li>
        <IconLink href={socials.behance} label={t('footer.behance')} newTabHint={newTab}>
          <IconBrandBehance aria-hidden="true" focusable="false" class="size-6" />
        </IconLink>
      </li>
```
**sr-only accessible-name pattern:** `IconLink.astro` line 23, `<span class="sr-only">{newTabHint}</span>`. The tool tile uses `<span id="tool-{id}-name" class="sr-only">{name}</span>` referenced by `aria-labelledby`.

**Index-derived classes:** `LanguageSwitcher.astro` lines 31-33 already use the `.map(({…}, index) => …)` index. Reuse it for the tooltip anchor (`index === 0` gives `left-0`, the last index gives `right-0`, otherwise `left-1/2 -translate-x-1/2`, per UI-SPEC line 303):
```astro
    {links.map(({ target, code, href, current }, index) => (
      <>
        {index > 0 && (
```
Tile markup and the tooltip class string: UI-SPEC lines 283-300. The script registers `initToolTooltips` exactly like RolesMarquee.

**LINT RISK (flag for planner)** `[Verified: read node_modules/eslint-plugin-jsx-a11y-x/lib/index.js line 308; Inference: not linted]`. The `jsx-a11y-strict` config (enabled in `eslint.config.js` line 19 via `astro.configs['jsx-a11y-strict']`) sets `'jsx-a11y-x/no-noninteractive-tabindex': 'error'` with **no role exceptions**. The UI-SPEC tile `<span role="img" tabindex="0">` is likely to fail `pnpm lint`. Options: a scoped `eslint-disable-next-line` with a rationale comment, or a rule override in `eslint.config.js` that allows `roles: ['img']`. Decide in the plan and run `pnpm lint` on the first tile commit.

---

### `src/components/ui/AvailabilityBadge.astro` (ui, conditional static)

**Analog:** `SiteFooter.astro` lines 40-46. Conditional rendering that emits nothing when falsy:
```astro
      {socials.instagram && (
        <li>
          ...
        </li>
      )}
```
Apply it as `{available && (<p class="…">…</p>)}`. Render nothing when `false` (D-08). Use no `role="status"` and no `aria-live`. Markup and classes: UI-SPEC line 204. Copy `t('availability.open')` only.

**Small-component header comment style:** `ButtonLink.astro` lines 2-5:
```astro
---
// Accent pill CTA. Reused by the hero and the 404 view. Default slot = label, "icon" slot trails it.
interface Props {
  href: string;
}
```
Props: `{ available: boolean; locale: Locale }`.

---

### `src/components/ui/ServiceCard.astro` (ui, static)

**Analog:** `ButtonLink.astro` / `IconLink.astro`. These are single-responsibility components with destructured props and one class string:
```astro
const { href, label, newTabHint } = Astro.props;
```
The root element is the `<li>` (UI-SPEC line 268): `flex h-full flex-col gap-4 rounded-2xl bg-surface-alt p-6`. Bullets go in `<ul class="list-disc space-y-1 pl-6 text-base text-ink-muted marker:text-ink-muted">`, with `{items.map((item) => <li>{item}</li>)}`. Don't add `role="list"` (`no-redundant-roles` is an error in strict config, verified line 309). Don't use `<a>`, `cursor-pointer` or hover styles.

---

### `src/components/ui/ServiceIcon.astro` / `ToolIcon.astro` (ui, typed icon map)

**Analog A (explicit per-file imports, never barrels):** `SiteFooter.astro` lines 2-5:
```astro
import IconMail from '@tabler/icons/outline/mail.svg';
import IconBrandBehance from '@tabler/icons/outline/brand-behance.svg';
import IconBrandInstagram from '@tabler/icons/outline/brand-instagram.svg';
import IconBrandLinkedin from '@tabler/icons/outline/brand-linkedin.svg';
```
**Analog B (exhaustive typed map):** `LanguageSwitcher.astro` line 16:
```astro
const names = { en: t('lang.en'), es: t('lang.es') } as const satisfies Record<Locale, string>;
```
Combine both into RESEARCH Pattern 6 (lines 323-333): `const icons = { … } as const satisfies Record<ToolIconKey, typeof IconBrandFigma>;`. `lightroom` maps to `@tabler/icons/outline/brand-adobe.svg` (D-13). Sizes: service `size-6`, tool `size-8` (UI-SPEC icon inventory). Always render with `aria-hidden="true" focusable="false"`. A `class` prop pass-through is optional.

---

### `src/components/views/HomeView.astro` (MODIFIED, view)

**Current file** (lines 1-12):
```astro
---
import Hero from '../sections/Hero.astro';
import type { Locale } from '../../i18n/t';

interface Props {
  locale: Locale;
}

const { locale } = Astro.props;
---

<Hero locale={locale} />
```
Change: call `queries.ts` in the frontmatter (top-level `await` is allowed in Astro frontmatter), then render `<Hero locale available />`, `<RolesMarquee …/>`, and `<div class="flex flex-col gap-16 py-16">` with `<FeaturedServices/>` and `<ToolsRow/>` (UI-SPEC lines 185-196). This is the **only** component that touches collections.

---

### `src/components/sections/Hero.astro` (MODIFIED)

Insertion point: the text column at **line 19** (`<div class="flex flex-col gap-6 lg:col-span-7">`). Insert `<AvailabilityBadge available={available} locale={…} />` as the first child, before the greeting `<p>` on line 20 (D-11). Extend `Props` (lines 10-12) with `available: boolean`. The existing `const t = useTranslations(Astro.props.locale);` (line 14) suggests destructuring: `const { locale, available } = Astro.props;`.

Regression guard: `tests/e2e/home.spec.ts` lines 18-27 locate `section[aria-labelledby="hero-title"]` and greeting text. They keep passing if the badge only adds a `<p>`.

---

### `src/i18n/ui.en.ts` / `ui.es.ts` (MODIFIED, dictionaries)

**Pattern (en)**, lines 1-3 and 33-36. The source dictionary is `as const`, and types derive from it:
```ts
// Source dictionary. Every UI string (visible or ARIA) lives here; ui.es.ts must match its keys.
// Hero copy is a draft. TODO(martina): confirm final copy.
export const en = {
...
} as const;

export type UIKey = keyof typeof en;
export type Dictionary = Record<UIKey, string>;
```
**Pattern (es)**, lines 1-4 and 36. The `satisfies Dictionary` check makes a missing key a type error:
```ts
// Spanish is a draft for Martina's review (QUAL-03). Register: "tú", not "usted".
import type { Dictionary } from './ui.en';

export const es = {
...
} as const satisfies Dictionary;
```
Add, grouped by prefix like the existing `hero.*`/`footer.*` blocks: `availability.open`, `roles.heading`, `roles.pause`, `services.heading`, `tools.heading`. Copy is in UI-SPEC lines 347-354. **No `availability.closed`.** Use the inline `// TODO(martina): …` comment style (en line 15) for the new drafts.

---

### `src/styles/global.css` (MODIFIED, tokens)

**Current `@theme`** (lines 1-24). The change points are:
```css
@import 'tailwindcss';

@theme {
  ...
  --color-accent: #4b2ee8;        /* line 11 -> #0f70b7 (D-15) */
  --color-accent-ink: #ffffff;
  --color-danger: #b42318;        /* add --color-success: #1f7a4d; next to it */

  --text-*: initial;              /* only text-sm/base/2xl/5xl compile */
  ...
}
```
Add `@custom-variant motion-on (&:where([data-motion='on'], [data-motion='on'] *));` after the `@import`, and `--animate-marquee` plus `@keyframes marquee` inside `@theme` (RESEARCH Pattern 2, lines 230-241). No `<style>` blocks or `@apply` anywhere.

---

### `tests/unit/content-home.test.ts` (test, pure functions)

**Analog:** `tests/unit/routes.test.ts`. No environment pragma, plain `describe`/`it`/`it.each`, relative `../../src/...` imports (lines 1-14):
```ts
import { describe, expect, it } from 'vitest';
import { absoluteFor, alternatePath, stripLocale } from '../../src/i18n/routes';

describe('stripLocale', () => {
  it.each([
    ['/es/', '/'],
    ...
  ])('%s -> %s', (input, expected) => {
    expect(stripLocale(input)).toBe(expected);
  });
});
```
Add direct JSON imports (`import services from '../../src/data/services.json'`) to catch swallowed parse errors (RESEARCH Pitfall 1, lines 401-418). Assert the `items` arrays (not `description`), the exact D-03 role order, the D-05 service order, and the D-12 tool order. Fixtures must be typed, with no `as unknown as` (Phase 1 precedent).

---

### `tests/unit/marquee-toggle.test.ts` / `tool-tooltips.test.ts` (test, happy-dom)

**Analog:** `tests/unit/lifecycle.test.ts`

**Environment pragma + imports** (lines 1-3):
```ts
// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { bindToAstro, createLifecycle } from '../../src/lib/motion/lifecycle';
```
**Idempotency over 10 cycles** (lines 41-57). Reuse it to prove AbortController cleanup leaves no duplicate listeners after 10 init/cleanup rounds (RESEARCH test map: "idempotent over 10 mounts"):
```ts
  it('keeps activeCleanups constant across 10 unmount/mount cycles', () => {
    const lifecycle = createLifecycle(document);
    ...
    for (let i = 0; i < 10; i += 1) {
      lifecycle.unmount();
      lifecycle.mount();
      expect(lifecycle.activeCleanups).toBe(2);
    }
```
**Teardown pattern:** `tests/unit/motion-gate.test.ts` lines 40-43 (`afterEach` restores mocks and resets `documentElement` state). Do the same with `document.body.innerHTML = ''`.

Event dispatch style: `document.dispatchEvent(new Event('astro:page-load'))` (lifecycle.test line 127). For tooltips use `new KeyboardEvent('keydown', { key: 'Escape' })` and `PointerEvent` / `FocusEvent`. `[Inference]` happy-dom 21 supports these; confirm on the first RED run.

---

### `tests/unit/home-sections.test.ts` (test, AstroContainer)

**Analog:** `tests/unit/site-footer.test.ts` (lines 1-9, plus the svg loop at 38-45):
```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import SiteFooter from '../../src/components/global/SiteFooter.astro';

async function render(locale: 'en' | 'es'): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(SiteFooter, { props: { locale } });
}
...
  it('marks every svg as decorative', async () => {
    const html = await render('en');
    const svgs = html.match(/<svg[^>]*>/g) ?? [];
    ...
      expect(svg).toContain('aria-hidden="true"');
```
**Tag-extraction helper:** `tests/unit/language-switcher.test.ts` lines 15-19 (`linkTag` with RegExp plus a `not.toBeNull()` guard). Reuse it to pull the `<ul aria-hidden="true">` and the `<button data-marquee-toggle>`.

Required cases: badge `available: true` renders `availability.open`, and `available: false` renders **no badge markup** (D-08). Marquee has 2 `<ul>`, the second one `aria-hidden`. Services have 4 `<h3>` and per-card `<li>` counts of 4/5/6/3. Tools have 5 `role="img"` tiles, each with `aria-labelledby` resolving to an sr-only span. Props are passed directly, with no `getCollection` (Pitfall 4).

---

### `tests/e2e/home-story.spec.ts` (test, e2e)

**Analog A:** `tests/e2e/home.spec.ts` lines 1-15. The locale case table, dictionary imports and no-JS describe:
```ts
import { expect, test } from '@playwright/test';
import { site } from '../../src/data/site';
import { en } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';

const cases = [
  ['/', en],
  ['/es/', es],
] as const;

test.describe('hero without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  for (const [path, dict] of cases) {
```
**Analog B:** `tests/e2e/motion.spec.ts` lines 5-12 and 26-28. The console-error collector and reduced-motion describe:
```ts
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}
...
test.describe('motion gate with prefers-reduced-motion: reduce', () => {
  test.use({ reducedMotion: 'reduce' });
```
Extend the case tuple with a locale key (`['/', en, 'en']`) so JSON content can be indexed as `role.label[locale]`. Import the JSON source of truth (RESEARCH lines 445-450). The badge assertion keys on `profile.availability.available`: present with `dict['availability.open']`, or **absent** (`toHaveCount(0)`) when false (D-08). The test names must contain the `-g` tokens from VALIDATION: "roles", "marquee", "static", "services", "tools", "availability". The pause button's focus outline must equal `rgb(255, 255, 255)` (UI-SPEC line 412).

---

### `tests/e2e/a11y.spec.ts` (MODIFIED)

**Current expected order and focus probe** (lines 18-48). Two changes:
1. Insert 6 steps after `hero.cta` (line 25): the pause button (`en['roles.pause']`), then the 5 tool tiles by name (from `tools.json`, mockup order).
2. The evaluator at lines 35-43 returns `null` unless `el instanceof HTMLAnchorElement`:
```ts
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      if (!(el instanceof HTMLAnchorElement)) return null;
      return {
        name: (el.getAttribute('aria-label') ?? el.textContent).replace(/\s+/g, ' ').trim(),
        href: el.getAttribute('href'),
        outline: getComputedStyle(el).outlineStyle,
      };
    });
```
Generalize it to `HTMLElement`, return `tag`/`role` too, and make `href` optional per step. Tile names come from `aria-labelledby`, so read the referenced element's text (e.g. `document.getElementById(el.getAttribute('aria-labelledby'))?.textContent`) or switch to `page.locator(':focus')` with `toHaveAccessibleName`. Also update the comment on line 18 to the UI-SPEC order (line 326). Add a reduced-motion variant that skips the hidden pause button.

---

### `tests/e2e/layout.spec.ts` (MODIFIED)

**Existing 320px overflow probe** (lines 50-54):
```ts
    test('at 320px there is no horizontal overflow and h1 is at most 2 lines', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto(path);
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(320);
```
Add inside the same `for (const [path, dict] of cases)` loop: focus each tool tile in turn at 320px and re-assert `scrollWidth <= 320` (UI-SPEC line 303). Add a separate check that copy A's width is at least the track width at 1280/1920/2560 (UI-SPEC line 232). The existing no-JS svg check (lines 71-79) scopes to `<footer>`, so it's unaffected.

---

## Shared Patterns

### Locale + translations in every component
**Source:** `src/components/sections/Hero.astro` lines 6, 10-14; `src/i18n/t.ts` lines 10-13.
**Apply to:** every new `.astro` component that outputs a UI string.
```ts
import { useTranslations, type Locale } from '../../i18n/t';
interface Props { locale: Locale; }
const t = useTranslations(Astro.props.locale);
```
Use no string literals in markup. Content strings arrive already localized via props. Tool names are passed unchanged.

### Decorative icons
**Source:** `Hero.astro` line 32, `SiteFooter.astro` line 37.
**Apply to:** every Tabler icon in Phase 2.
```astro
<IconX aria-hidden="true" focusable="false" class="size-6" />
```

### Focus ring + 44px targets + motion-safe transitions
**Source:** `IconLink.astro` line 20, `ButtonLink.astro` line 12.
**Apply to:** the pause button and the tool tiles.
```
focus-visible:outline-accent focus-visible:outline-2 focus-visible:outline-offset-2 ... min-h-11 min-w-11 ... motion-safe:transition-colors motion-safe:duration-150
```
Inside the blue band, use `focus-visible:outline-accent-ink` instead (D-17).

### Lifecycle-registered client behavior
**Source:** `src/lib/motion/index.ts` (singleton), `lifecycle.ts` lines 1-3 (`PageInit`), `BaseLayout.astro` lines 48-50 (`<script>` import).
**Apply to:** `marquee.ts`, `tooltips.ts`, and the `<script>` blocks in `RolesMarquee.astro` and `ToolsRow.astro`. Every listener takes `{ signal }`, and the init returns `() => ac.abort()` or `undefined`.

### Exhaustive typed maps (`as const satisfies Record<K, V>`)
**Source:** `LanguageSwitcher.astro` line 16, `seo.ts` line 31, `site.ts` line 21 (`as const satisfies SiteConfig`).
**Apply to:** `ServiceIcon.astro`, `ToolIcon.astro`, and any locale lookup in `home.ts`.

### Content-review markers
**Source:** `src/data/site.ts` lines 14-17, `ui.en.ts` lines 2 and 15, `ui.es.ts` line 1.
**Apply to:** `content.config.ts` (covering the JSON files) and the new dictionary keys. List every polished string in the SUMMARY "Known Stubs" (D-02).

### Security: no `set:html` on content
**Source:** `BaseLayout.astro` line 29 is the single allowed use (`motionGateInline`).
**Apply to:** all new components. Render with `{}` expressions only. Grep acceptance: `set:html` count in `src/` stays 1.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/content.config.ts` | config | build-time validation | No Content Layer collections exist yet. Use RESEARCH Pattern 1 with the D-04/D-13 schema amendments |
| `src/lib/content/queries.ts` | service | build-time reads | Nothing calls `getCollection`/`getEntry` yet. Use RESEARCH Pattern 5 |
| `src/data/*.json` | content | static | No JSON content exists (`site.ts` is the nearest TS sibling). Values come from CONTEXT D-03/D-07/D-12/D-09 |

## Flags for the Planner

1. **Lint risk on tool tiles** `[Verified rule config; Inference on outcome]`: `jsx-a11y-x/no-noninteractive-tabindex` is `error` in the strict preset that `eslint.config.js` enables, and it has no `img` exception. Plan an explicit decision (scoped disable with rationale, or a config override) and verify with `pnpm lint`.
2. **`no-redundant-roles` is `error`** `[Verified]`: don't add `role="list"` to `<ul>`.
3. **`HomeView` becomes async-data-driven.** Unit tests cannot render it with real data (Pitfall 4). Keep section tests prop-driven.
4. **The existing e2e evaluator in `a11y.spec.ts` rejects non-anchors** (lines 35-37). It must be generalized, not just extended.

## Metadata

**Analog search scope:** `src/**` (27 files), `tests/**` (17 files), `eslint.config.js`, `vitest.config.ts`, `tsconfig.json`, `node_modules/eslint-plugin-jsx-a11y-x/lib/index.js` (rule config only)
**Files scanned:** 34
**Pattern extraction date:** 2026-10-16
