# Phase 6: Scroll & Interaction Motion - Pattern Map

**Mapped:** 2026-10-29
**Files analyzed:** 47 (17 new, 30 modified)
**Analogs found:** 44 / 47 (the other 3 have partial analogs only and use RESEARCH.md patterns)

All excerpts below were read from the working tree at commit `cfadaa8` on 2026-10-29. Line numbers refer to that state. `[Proposed]` marks suggestions about how the planner may apply a pattern. Those suggestions are not verified implementations.

## File Classification

### New files

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `src/lib/motion/events.ts` | utility (typed event bus) | event-driven | `src/lib/motion/gate.ts` `onMotionPreferenceChange` (L21-33) | role-match |
| `src/lib/motion/tokens.ts` | config (typed constants) | n/a | `src/lib/ui/button-classes.ts` (shared constants module) | partial |
| `src/lib/motion/load-gsap.ts` | utility (lazy loader) | request-response (dynamic import) | `src/lib/ui/contact-form.ts` `loadTurnstileScript` (injected loader in `ContactFormDeps`) | partial |
| `src/lib/motion/reveal.ts` | effect (PageInit) | event-driven (IO + focusin + motion:change) | `src/lib/motion/marquee.ts` + `src/lib/ui/contact-form.ts` `createContactForm(deps)` | role-match |
| `src/lib/motion/split-lines.ts` | utility (SplitText wrapper) | transform | none (SplitText is new) | no analog |
| `src/lib/motion/cursor.ts` | effect (PageInit) | event-driven (pointer + media change) | `src/lib/ui/tooltips.ts` (delegated doc listeners, one AbortController) + `src/lib/ui/embed-facade.ts` (createElement-only DOM building) | role-match |
| `src/lib/motion/magnetic.ts` | effect (PageInit) | event-driven (pointer, resize) | `src/lib/ui/tooltips.ts` | role-match |
| `src/lib/motion/toggle.ts` (or inline in `MotionToggle.astro` script) [Proposed] | effect (PageInit) | event-driven (click, keydown) | `src/lib/motion/marquee.ts` (aria-pressed toggle button) + `src/lib/ui/tooltips.ts` (Esc dismiss) | exact |
| `src/lib/motion/effects.ts` [Proposed, RESEARCH Open Q2] | registration module | n/a | `src/lib/motion/index.ts` + component `<script>` registrations | exact |
| `src/components/global/MotionToggle.astro` | component | request-response (build-time i18n) | `src/components/sections/RolesMarquee.astro` (button + aria-pressed + `<script>` registering) + `src/components/sections/ToolsRow.astro` (aria-hidden tooltip) | exact |
| `src/components/global/CursorFollower.astro` [Proposed in UI-SPEC; optional, can be a `<template>` in BaseLayout] | component (build-time template) | n/a | `src/components/global/SkipLink.astro` style (tiny global component) | partial |
| `scripts/measure-bundle.ts` | build script | file-I/O / batch | `scripts/check-secrets.ts` | exact |
| `tests/unit/helpers/fake-media.ts` (+ fake IntersectionObserver) | test helper | n/a | `tests/unit/motion-gate.test.ts` `FakeMediaQueryList` (L10-39) | exact (extract) |
| `tests/unit/motion-reveal.test.ts`, `motion-split.test.ts`, `motion-cursor.test.ts`, `motion-magnetic.test.ts`, `motion-toggle.test.ts` | test (unit, happy-dom) | n/a | `tests/unit/marquee-toggle.test.ts`, `tests/unit/embed-facade.test.ts` | exact |
| `tests/e2e/motion-reveal.spec.ts`, `motion-pointer.spec.ts`, `motion-hover.spec.ts`, `motion-toggle.spec.ts`, `motion-lcp.spec.ts` | test (e2e) | n/a | `tests/e2e/motion.spec.ts` | exact |

### Modified files

| Modified File | Role | Change | Analog / Self | Match Quality |
|---------------|------|--------|---------------|---------------|
| `src/lib/motion/gate.ts` | utility (inline gate) | 3 states, storage read, `override` param, `MOTION_STORAGE_KEY`, `setMotionPreference`, `motion:change` dispatch | self (L1-45) | exact |
| `src/lib/motion/index.ts` | singleton | import effects / keep `syncMotionGate` | self (L1-13) | exact |
| `src/styles/global.css` | config (CSS) | new variants, tokens, reveal states, failsafe, hero keyframes, hover `transition` | self (L2 variant, L36-41 keyframes inside `@theme`) | exact |
| `src/layouts/BaseLayout.astro` | layout | optional `data-cursor-label` on `<body>` or `<template>` | self (L28, L33, L46, L53-55) | exact |
| `src/lib/ui/button-classes.ts` | config (class strings) | split `primaryButton` into `primaryShell` + `primaryFace` | self (L4-5) | exact |
| `src/components/ui/ButtonLink.astro` | component | shell/face markup + `data-magnetic` | self (L12-15) | exact |
| `src/components/contact/ContactForm.astro` | component | submit gets shell/face + `data-magnetic`; form wrapper `data-reveal="settle"` | self (L138-150) | exact |
| `src/components/ui/IconLink.astro` | component | face span + `data-magnetic` | self (L15-25) | exact |
| `src/components/ui/ExternalTextLink.astro` | component | face span + `data-magnetic` (used for "View on Behance") | self (L16-25) | exact |
| `src/components/sections/LatestWork.astro` | component | h2 `lines`; "See all projects" `<p>` settle + link face/`data-magnetic` | self (L26-44) | exact |
| `src/components/ui/ProjectCard.astro` | component | `data-cursor="view"` on article; frame `shutter` (not first eager); `pictureAttributes`; hover classes; text block `settle` | self (L52-105) | exact |
| `src/components/project/NextProjectTeaser.astro` | component | same card treatment + h2 `lines`, Previous `settle`, h3 `settle` | `ProjectCard.astro` | exact |
| `src/components/sections/Hero.astro` | component | CSS hero sequence hooks (line masks with inner spans, picture, lead, CTA row) | self (L27-53) | exact |
| `src/components/sections/FeaturedServices.astro`, `src/components/ui/ServiceCard.astro` | component | h2 `lines`, card `<li>` `settle` | `ToolsRow.astro` markup | exact |
| `src/components/sections/ToolsRow.astro` | component | h2 `lines`, tool `<li>` `settle` (12px travel) | self (L38-62) | exact |
| `src/components/contact/ContactSection.astro` | component | h2 `lines`, intro/email+socials/form `settle` with delays | self | exact |
| `src/components/views/ProjectsView.astro` | view | h1 `lines`, intro `settle`, empty state `settle` | self (L22-44) | exact |
| `src/components/ui/ProjectGrid.astro` | component | pass first-tile flag so first cover gets no `shutter` | self (L26-37, `eager` prop) | exact |
| `src/components/project/ProjectIntro.astro` | component | h1 `lines` (aria none with `[lang]`), summary/meta/Behance `settle` | self (L18-66) | exact |
| `src/components/project/TextModule.astro` | component | root `data-reveal="settle"` | self (L22-26) | exact |
| `src/components/project/ProjectContactBand.astro` | component | h2 `lines`, body `settle`, button wrapper `settle` | self (L17-35) | exact |
| `src/components/views/NotFoundView.astro` | view | CTA magnetic only (via ButtonLink), no reveals | self | exact |
| `src/components/global/SiteHeader.astro` | component | place `<MotionToggle>` (row 1 right below sm; after languages from sm) | self (L30-63) | exact |
| `src/i18n/ui.en.ts`, `src/i18n/ui.es.ts` | config (dictionary) | `cursor.view`, `motion.toggle`, `motion.osLocked` | self (L1-30, `as const` / `satisfies Dictionary`) | exact |
| `package.json` | config | `gsap@3.15.0` exact pin; optional `measure:bundle` script | self (L9-22) | exact |
| `tests/unit/motion-gate.test.ts` | test | `'off'` -> `'reduced'`, storage/override truth table | self | exact |
| `tests/e2e/motion.spec.ts` | test | `off` -> `reduced` expectations, JS-off reveal checks | self (L26-41, L59-109) | exact |
| `tests/e2e/a11y.spec.ts` | test | `headerSteps` gains toggle after ES | self (L119-128) | exact |
| `tests/unit/site-header.test.ts` | test | toggle markup assertions | self (L1-50, AstroContainer) | exact |
| `.planning/phases/04-project-detail-discovery/04-CONTEXT.md` (D-04 amendment note) | docs | reference Phase 6 D-04 | n/a | n/a |

## Pattern Assignments

### `src/lib/motion/gate.ts` (utility, inline gate) — extend in place

**Analog:** itself. Current 2-state version, lines 1-19:
```ts
export type MotionState = 'on' | 'off';

/**
 * Resolves whether motion is allowed and writes it to `html[data-motion]`.
 * MUST stay self-contained (no imports, no outer-scope references): it is stringified
 * into the blocking inline script in BaseLayout's head via `motionGateInline`.
 * Safe default: without matchMedia the state is 'off'.
 * Phase 6 (MOTN-08) may add an optional stored-override parameter; nothing is read from storage here.
 */
export function applyMotionGate(doc: Document, win: Window): MotionState {
  const canQuery = typeof win.matchMedia === 'function';
  const reduce = canQuery && win.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state: MotionState = canQuery && !reduce ? 'on' : 'off';
  doc.documentElement.dataset['motion'] = state;
  return state;
}

/** Build-time constant injected into the inline head script; never contains user data. */
export const motionGateInline = `(${applyMotionGate.toString()})(document, window);`;
```
**Live-sync pattern to extend** (lines 21-45): `onMotionPreferenceChange` currently maps reduce to `'off'` (L27) and `syncMotionGate` writes `dataset['motion']` directly (L42-44). Phase 6 replaces both with a re-resolve through `applyMotionGate(doc, win, sessionOverride ?? undefined)` plus a `motion:change` dispatch when the state changed (RESEARCH Pattern 1).

**Rules to keep:**
- The storage key literal `'motion-preference'` must be inside the function body (stringified via `toString()`), with `MOTION_STORAGE_KEY` exported separately and a unit test asserting `motionGateInline.includes(MOTION_STORAGE_KEY)`.
- `win.localStorage` property access goes inside the `try`.
- The JSDoc comment style and "build-time constant, never user data" comment must stay.

---

### `src/lib/motion/events.ts` (utility, event-driven)

**Analog:** `src/lib/motion/gate.ts` lines 21-33 (subscribe helper returning cleanup):
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
**Deviation:** the new helper takes an `AbortSignal` (matching the `{ signal: ac.signal }` convention in `marquee.ts` L27 and `tooltips.ts` L35) instead of returning a remover. The `DocumentEventMap` augmentation sketch is in RESEARCH Pattern 2. Explicit return types (`: void`) on every arrow function are the codebase convention.

---

### `src/lib/motion/reveal.ts`, `cursor.ts`, `magnetic.ts`, toggle init (effects registered on `lifecycle`)

**Primary analog:** `src/lib/motion/marquee.ts` (full file, 34 lines). Shape to copy:
```ts
import type { Cleanup } from './lifecycle';

/**
 * Wires every `[data-marquee-toggle]` button ...   <- JSDoc explaining the WCAG/UI-SPEC reason
 */
export function initMarqueeToggles(doc: Document): Cleanup | undefined {
  const buttons = doc.querySelectorAll<HTMLButtonElement>('[data-marquee-toggle]');
  if (buttons.length === 0) return undefined;      // <- early return undefined, never void

  const ac = new AbortController();
  for (const button of buttons) {
    const root = button.closest<HTMLElement>('[data-marquee]');
    button.addEventListener(
      'click',
      () => {
        const paused = button.getAttribute('aria-pressed') !== 'true';
        button.setAttribute('aria-pressed', String(paused));
        root?.toggleAttribute('data-paused', paused);
        root?.toggleAttribute('data-playing', !paused);
      },
      { signal: ac.signal },
    );
  }

  return () => {
    ac.abort();
  };
}
```
**Lifecycle types** (`src/lib/motion/lifecycle.ts` L1-3):
```ts
export type Cleanup = () => void;
// Return undefined for no cleanup (void unions are rejected by @typescript-eslint/no-invalid-void-type).
export type PageInit = (doc: Document) => Cleanup | undefined;
```

**Dependency-injection analog for effects that need `now`, `loadGsap`, `matchMedia`, an observer factory:** `src/lib/ui/contact-form.ts` L23-27 and L136-137:
```ts
export interface ContactFormDeps {
  send(data: FormData): Promise<SendResult>;
  siteKey: string;
  loadTurnstile(doc: Document): Promise<TurnstileApi>;
}
...
export function createContactForm(deps: ContactFormDeps): PageInit {
  return (doc: Document): Cleanup | undefined => {
    const form = doc.querySelector<HTMLFormElement>('[data-contact-form]');
    if (!form) return undefined;
```
[Proposed] Use `createReveal(deps): PageInit`, `createCursor(deps): PageInit`, `createMagnetic(deps): PageInit` in the same factory form, so the registration site wires real deps and unit tests pass fakes.

**Delegated document listeners + Esc analog (cursor, magnetic, toggle tooltip):** `src/lib/ui/tooltips.ts` L14-15, L59-78:
```ts
  const ac = new AbortController();
  const { signal } = ac;
  ...
  doc.addEventListener(
    'pointerdown',
    (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest('[data-tool]')) return;
      for (const tile of tiles) tile.removeAttribute('data-open');
    },
    { signal },
  );

  doc.addEventListener(
    'keydown',
    (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      for (const tile of tiles) {
        tile.removeAttribute('data-open');
        tile.setAttribute('data-dismissed', '');
      }
    },
    { signal },
  );
```
The toggle tooltip reuses the `data-dismissed` attribute approach for Esc (UI-SPEC "Tooltip").

**Safe DOM building analog (cursor layer):** `src/lib/ui/embed-facade.ts` L36-48 builds the iframe with `createElement` and setters only, never `innerHTML`:
```ts
        const iframe = doc.createElement('iframe');
        iframe.src = src;
        iframe.title = facade.dataset['title'] ?? '';
        iframe.setAttribute('sandbox', SANDBOX);
        ...
        iframe.classList.add(...IFRAME_CLASSES);
        ...
        facade.replaceChildren(iframe);
```
The cursor layer is built the same way: class arrays as module constants (cf. `IFRAME_CLASSES` L7-12) and the label set with `textContent` from a build-time `data-cursor-label` or `<template>` clone (RESEARCH Security). The cleanup must also remove the layer from `<body>`.

**Unhide-on-init analog (MotionToggle, if JS shows it):** `embed-facade.ts` L29 `button.hidden = false;`. The UI-SPEC instead uses CSS `hidden motion-js:inline-flex`, so no JS unhide is needed. Note this alternative only if the variant approach fails.

---

### `src/lib/motion/index.ts` / `effects.ts` (registration)

**Analog:** `src/lib/motion/index.ts` (full file):
```ts
import { syncMotionGate } from './gate';
import { bindToAstro, createLifecycle } from './lifecycle';

// Page-scoped singleton. Phase 2 registers the marquee toggle and the tool tooltips through it;
// Phases 6-7 add motion effects.
export const lifecycle = createLifecycle(document, (err) => {
  console.error(err);
});

bindToAstro(lifecycle, document);

// Follow reduced-motion changes after load (WR-03). Page-scoped like the lifecycle singleton.
syncMotionGate(document, window);
```
**Per-component registration analog** (`RolesMarquee.astro` L65-69, `ToolsRow.astro` L66-71):
```astro
<script>
  import { lifecycle } from '../../lib/motion';
  import { initMarqueeToggles } from '../../lib/motion/marquee';
  lifecycle.register(initMarqueeToggles);
</script>
```
`BaseLayout.astro` L53-55 imports the singleton once (`import '../lib/motion';`). [Proposed] The page-wide effects (reveal, cursor, magnetic) register from a module imported in that BaseLayout script. The toggle registers from `MotionToggle.astro`'s own `<script>`. Caveat: `bindToAstro` mounts immediately at import (lifecycle.ts L72) and `register` after mount runs the init at once (L33-36), so registration order is not a correctness concern.

**Important:** no module other than `load-gsap.ts` may import `gsap`, and only via dynamic `import()` (RESEARCH Code Examples). `scripts/measure-bundle.ts` enforces this.

---

### `src/lib/motion/load-gsap.ts` (lazy loader)

**Partial analog:** the injected `loadTurnstile(doc): Promise<TurnstileApi>` dependency in `ContactFormDeps` (contact-form.ts L26) is the codebase precedent for "an async third-party loader passed as a dependency so tests can fake it". No dynamic `import()` of an npm package exists yet. Copy the memoised loader verbatim from RESEARCH "Lazy, memoised GSAP loader" and type the deps as `loadGsap: typeof loadGsap`.

---

### `src/lib/motion/split-lines.ts` — no analog

Use RESEARCH Pattern 4 recipe (SplitText `type:'lines'`, `mask:'lines'`, `tag:'span'`, `aria: hasLang ? 'none' : 'auto'`, `autoSplit`, `onSplit` returning the tween, mask `overflowY='clip'`, `revert()` on complete). Follow the codebase conventions only: `import type`, explicit return types, guard and return early for headings that contain `a` (unit test V-07).

---

### `src/components/global/MotionToggle.astro` (component)

**Analog A — button with aria-pressed, hidden without motion, script registration:** `src/components/sections/RolesMarquee.astro` L56-62 and L65-69:
```astro
  <button
    type="button"
    data-marquee-toggle
    aria-pressed="false"
    aria-label={t('roles.pause')}
    class="absolute inset-0 hidden cursor-pointer bg-transparent focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-accent-ink motion-on:block"
  ></button>
```
The `hidden ... motion-on:block` pairing is the precedent for `hidden motion-js:inline-flex`.

**Analog B — 44px icon control classes:** `src/components/ui/IconLink.astro` L20:
```
text-ink hover:text-ink-muted focus-visible:outline-accent inline-flex min-h-11 min-w-11 items-center justify-center gap-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-colors motion-safe:duration-150
```
(UI-SPEC "Element" asks for this same hover.)

**Analog C — aria-hidden tooltip:** `src/components/sections/ToolsRow.astro` L17-18 and L55-59:
```astro
const tooltipBase =
  'pointer-events-auto invisible absolute bottom-full z-10 pb-2 opacity-0 group-hover/tool:visible group-hover/tool:opacity-100 group-focus-visible/tool:visible group-focus-visible/tool:opacity-100 group-data-open/tool:visible group-data-open/tool:opacity-100 group-data-dismissed/tool:invisible! group-data-dismissed/tool:opacity-0! motion-safe:transition-[opacity,visibility] motion-safe:duration-150';
...
          <span aria-hidden="true" data-tooltip class:list={[tooltipBase, anchor(index)]}>
            <span class="bg-ink text-surface block rounded-lg px-2 py-1 text-sm font-semibold whitespace-nowrap">
              {tool.name}
            </span>
          </span>
```
Changes for the toggle: anchor `right-0 top-full pt-2` instead of `bottom-full pb-2`; `w-max max-w-64` instead of `whitespace-nowrap` (the ES hint wraps); the fade uses `motion-on:` (not `motion-safe:`) per RESEARCH Pitfall 5.

**Icon import convention** (`ExternalTextLink.astro` L2, L24):
```astro
import IconArrowUpRight from '@tabler/icons/outline/arrow-up-right.svg';
...
<IconArrowUpRight aria-hidden="true" focusable="false" class="size-4" />
```
-> `import IconSparkles2 from '@tabler/icons/outline/sparkles-2.svg';` and `.../sparkles-2-off.svg`, `class="size-5"`. SVG components take no `hidden` attribute (ContactForm.astro L146 comment), so swap them with classes such as `group-aria-pressed:hidden`.

**Frontmatter/i18n convention** (`LanguageSwitcher.astro` L1-15):
```astro
---
import { useTranslations } from '../../i18n/t';
import type { Locale } from '../../i18n/config';

interface Props {
  locale: Locale;
}

const { locale } = Astro.props;
const t = useTranslations(locale);
---
```

---

### `src/components/global/SiteHeader.astro` (placement)

**Self, lines 30-63.** Row 1 is `<a>` wordmark plus the `div` wrapper (L31). Row 2 is the `div` at L39 holding `<nav>` and `<LanguageSwitcher>` (L61):
```astro
  <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between px-4 sm:h-full sm:flex-nowrap sm:px-6 lg:px-8">
    <a href={...} class="inline-flex min-h-11 items-center text-sm font-semibold ...">{site.name}</a>
    <div class="flex basis-full items-center justify-between gap-2 sm:basis-auto sm:justify-end sm:gap-4">
      <nav aria-label={t('nav.label')}>...</nav>
      <LanguageSwitcher locale={locale} pathname={pathname} kind={kind} />
    </div>
  </div>
```
The layout comment at L23-24 ("DOM order stays wordmark, nav, languages, so visual order equals tab order") must be updated for the toggle exception below `sm` (UI-SPEC Open Q2). [Proposed] The toggle stays last in DOM order. Below `sm` it moves to row 1 with `order-*` utilities on the flex-wrap container, or with an absolutely positioned right slot. The planner should pick one and assert it in a 320px Playwright check.

---

### `src/lib/ui/button-classes.ts` + `ButtonLink.astro` + ContactForm submit (shell/face split)

**Self** (`button-classes.ts` L3-5):
```ts
// Accent pill: the primary call to action (ButtonLink, the contact submit).
export const primaryButton =
  'bg-accent text-accent-ink hover:bg-accent/90 focus-visible:outline-accent inline-flex h-12 items-center gap-2 rounded-full px-6 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-colors motion-safe:duration-150';
```
Split per UI-SPEC: the shell keeps `inline-flex h-12 rounded-full focus-visible:*` with no fill. The face takes `bg-accent text-accent-ink hover:bg-accent/90 inline-flex h-full items-center gap-2 rounded-full px-6 text-sm font-semibold`, the colour transition, and `motion-on:active:scale-[0.97]`. `inkButton` (L8-9) stays unchanged because it is not magnetic.

**Consumers:**
- `ButtonLink.astro` L12-15: `<a href={href} class={primaryButton}><slot /><slot name="icon" /></a>` becomes the shell `<a data-magnetic>` wrapping `<span data-magnetic-face class={primaryFace}>`.
- `ContactForm.astro` L138-150: `<button type="submit" data-contact-submit class:list={[primaryButton, 'aria-disabled:cursor-progress']}>` holds `[data-contact-submit-label]`, `[data-icon-ready]` and `[data-icon-sending]`. Wrap them in the face span. **Test impact:** `tests/unit/contact-form.test.ts` L59 has a fixture without a face span. It should still pass because selectors are attribute-based. `tests/e2e/contact.spec.ts` L448 and `contact-states.spec.ts` L158 use `toHaveText`, which is unaffected by an extra wrapper [Inference]. `tests/unit/contact-section.test.ts` L175 inspects the submit open tag, so check its class assertions.

---

### `IconLink.astro`, `ExternalTextLink.astro`, LatestWork "See all projects" (magnetic text and icon links)

**IconLink** (L15-25):
```astro
<a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label} ${newTabHint}`}
  class="text-ink hover:text-ink-muted focus-visible:outline-accent inline-flex min-h-11 min-w-11 items-center justify-center gap-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-colors motion-safe:duration-150">
  <slot />
  <span class="sr-only">{newTabHint}</span>
  <IconArrowUpRight aria-hidden="true" focusable="false" class="size-4" />
</a>
```
**ExternalTextLink** (L16-25) and **LatestWork** link (L37-43) share the text-link class string:
```
text-ink decoration-accent focus-visible:outline-accent inline-flex min-h-11 items-center gap-2 text-base font-semibold decoration-2 underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-2 focus-visible:outline-offset-2
```
Pattern: add `data-magnetic` on the `<a>` and wrap the inner content in `<span data-magnetic-face class="inline-flex items-center gap-2">`. Underline utilities must reach the text inside the face. Because `text-decoration` propagates to inline children, a face that is `inline-flex` may stop the underline [Inference — verify with a screenshot diff, as UI-SPEC "Verification: at rest the rendered pixels match the Phase 5 build" requires]. Social icons come only through `SocialLinks.astro`, so changing `IconLink` covers the footer and contact usages.

---

### `src/components/ui/ProjectCard.astro` + `NextProjectTeaser.astro` (hover, cursor, shutter)

**Self** (`ProjectCard.astro` L52-68):
```astro
<li class={sizeClasses[size]}>
  <article class="group/card relative flex flex-col gap-4">
    <div class:list={['bg-surface-alt overflow-hidden', aspectClasses[size]]}>
      <Picture
        src={project.cover}
        ...
        loading={eager ? 'eager' : 'lazy'}
        {...priority}
        decoding="async"
        class="size-full object-cover object-center"
      />
    </div>
    <div class="flex flex-col gap-2">
```
**Spread pattern for conditional attributes** (L48-49, exactOptionalPropertyTypes):
```ts
// Spread so lazy covers carry no fetchpriority attribute at all (exactOptionalPropertyTypes).
const priority = eager ? { fetchpriority: 'high' as const } : {};
```
Reuse it: `const shutter = eager ? {} : { 'data-reveal': 'shutter' };` so the first, eager LCP cover is never hidden (UI-SPEC "First card cover: none").

**Stretched link + group hook** (L76-79): `group-hover/card:underline ... after:absolute after:inset-0 after:content-[''] focus-visible:after:outline-2`. The hover and focus image effect hangs off the same `group/card` with `motion-on:group-hover/card:` and `motion-on:group-has-[:focus-visible]/card:` (RESEARCH A8: grep the built CSS for `:has(:focus-visible)`).

**NextProjectTeaser** L48-72 is the same structure (`article.group/card`, `bg-surface-alt aspect-[5/4] overflow-hidden` frame, `Picture class="size-full object-cover object-center"`, h3 stretched link). Apply the identical change. `pictureAttributes={{ class: 'block size-full' }}` goes on both `<Picture>` elements (RESEARCH Pattern 7). Put the single combined `<picture>` transition in `global.css` (Pitfall 12), not as a utility.

**ProjectGrid** (L26-37) already passes `eager={eagerFirst === true && index === 0}`, so no new prop is needed if the shutter spread keys off `eager`.

---

### `src/components/sections/Hero.astro` (CSS-only hero sequence)

**Self** (L27-53):
```astro
      <h1 id="hero-title" class="font-display text-display -ml-[0.04em] font-semibold">
        <span class="block">{t('hero.greeting')}</span> <span class="block">{site.firstName}.</span>
      </h1>
      <p class="text-ink text-lead max-w-[55ch] text-pretty">...</p>
      <div class="flex flex-col items-start gap-x-6 gap-y-4 sm:flex-row sm:flex-wrap sm:items-center">
        <ButtonLink href={contactHref}>...</ButtonLink>
        <AvailabilityBadge available={available} locale={locale} />
      </div>
    ...
      <Picture src={portrait} ... loading="eager" fetchpriority="high" ...
        class="mx-auto aspect-square w-full max-w-64 rounded-full object-contain lg:max-w-80" />
```
Each `<span class="block">` becomes the mask, with an inner moving span. The `{" "}` text node between the spans (L28) must stay so the accessible name keeps its space (CLAUDE.md `compressHTML` gotcha). Add hook attributes (for example `data-hero-line`, `data-hero-portrait`, `data-hero-lead`, `data-hero-cta`) [Proposed names], add `pictureAttributes` for the clip, and put keyframes in `global.css` under `[data-motion='on'] [data-hero]:not([data-hero-played])`. The `data-hero-played` setter is a tiny `animationend` listener registered on `lifecycle`, using the marquee shape.

---

### Section components gaining `data-reveal` hooks

Markup-only edits. The headings that get `data-reveal="lines"` all share the class string `font-display text-2xl font-semibold tracking-tight` (verified in `FeaturedServices.astro` L26, `LatestWork.astro` L26, `ToolsRow.astro` L38, `ProjectsView.astro` L32, `NextProjectTeaser.astro` L25-28, `ProjectContactBand.astro` L20-23). The Projects h1 (`ProjectsView.astro` L23) and the detail h1 (`ProjectIntro.astro` L20-29, with the `<span lang>` variant) also get it. Per-element delays come from an authored `data-reveal-delay="140"` (RESEARCH Pattern 3 rule 4). Where to attach:

| File | Lines | Hook |
|------|-------|------|
| `FeaturedServices.astro` | h2 L26, `<ul>` L29 -> each `<li>` (in `ServiceCard.astro` or the map) | lines / settle |
| `LatestWork.astro` | h2 L26, `<p>` L36 | lines / settle (the `<p>`, not the magnetic `<a>`) |
| `ToolsRow.astro` | h2 L38, `<li class="relative">` L43 | lines / settle with `--reveal-travel:12px` |
| `ContactSection.astro` | h2 L37, `<p>` L43, email+socials block L45, form wrapper | lines / settle 140/210/280 |
| `ProjectsView.astro` | h1 L23, `<p>` L26, empty-state `div` L31 | lines / settle |
| `ProjectIntro.astro` | h1 L20, summary `<p>` L31, each `dl > div` L38/L44, Behance `<p>` L60 | lines / settle (never on the magnetic `ExternalTextLink`) |
| `TextModule.astro` | root `div` L22 | settle (never split; `set:html` content) |
| `ProjectContactBand.astro` | h2 L20, `<p>` L26, and a new wrapper around `ButtonLink` L28 (the button is magnetic) | lines / settle / settle |
| `NextProjectTeaser.astro` | h2 L25, Previous `<a>` L32 (wrap it, since it is not magnetic but sits directly in a flex column), frame L49, h3 L63 | lines / settle / shutter / settle |

Rule from UI-SPEC: never put `data-reveal` on an element with `data-magnetic` or on a hover-transformed layer. The headings containing links (card h2/h3, Next h3) **settle**; they are not split.

---

### `src/styles/global.css` (variants, tokens, reveal CSS)

**Self.** The variant declaration at L2:
```css
@custom-variant motion-on (&:where([data-motion='on'], [data-motion='on'] *));
```
Add `motion-reduced` and `motion-js` beside it in the same form (RESEARCH Pattern 3 sketch). Keyframes inside `@theme` with an `--animate-*` token (L36-41):
```css
  --animate-marquee: marquee 40s linear infinite;
  @keyframes marquee {
    to {
      transform: translateX(calc(-100% - var(--marquee-gap)));
    }
  }
```
Easings go in `@theme` (`--ease-reveal`, `--ease-travel`, `--ease-soft`) so Tailwind emits `ease-reveal` utilities. Durations go in `:root` as `--t-*` (UI-SPEC Motion Tokens). Attribute-selector reveal rules, the failsafe `@keyframes reveal-failsafe`, the hero keyframes and the combined `<picture>` transition go after `@theme` as plain CSS. Lint trap: no `ease-in` text anywhere, including comments and token names (RESEARCH Anti-Patterns).

**Existing consumers of the 2-state gate to re-check:** `RolesMarquee.astro` L23, L46, L61 use `motion-on:` plus `motion-reduce:animate-none`. With the 3-state gate, `reduced` no longer matches `motion-on`, so the marquee stays static. No change is needed there, but `tests/e2e/motion.spec.ts` L79 expectations change from `'off'` to `'reduced'`.

---

### `src/layouts/BaseLayout.astro`

**Self** L28, L33, L46, L53-55:
```astro
<html lang={locale} data-motion="off" class="scroll-pt-24 sm:scroll-pt-20">
  ...
    <!-- Blocking motion gate before any stylesheet: build-time constant, never user data. -->
    <script is:inline set:html={motionGateInline} />
  ...
  <body class="bg-surface text-ink font-sans antialiased">
  ...
    <script>
      import '../lib/motion';
    </script>
```
`data-motion="off"` default and the `set:html` gate stay untouched (it is the only `set:html` besides TextModule). [Proposed] Add `data-cursor-label={t('cursor.view')}` on `<body>`. This needs `useTranslations(locale)` in the frontmatter, imported the same way as in `SiteHeader.astro` L6 and L20. The other option is a `CursorFollower.astro` `<template>`.

---

### `src/i18n/ui.en.ts` / `ui.es.ts`

**Self** (`ui.en.ts` L1-3, L18-22, L113; `ui.es.ts` L120):
```ts
// Source dictionary. Every UI string (visible or ARIA) lives here; ui.es.ts must match its keys.
export const en = {
  ...
  // TODO(martina): confirm Phase 2 copy (badge, section headings, pause label).
  'availability.open': 'Open to new projects',
  'roles.heading': 'What I do',
  'roles.pause': 'Pause roles animation',
  ...
} as const;
```
`ui.es.ts` ends `} as const satisfies Dictionary;`. Add the three keys with a `// TODO(martina): confirm Phase 6 copy (...)` comment, in both files. `tests/unit/dictionary-types.test.ts` already exists and guards key parity.

---

### `scripts/measure-bundle.ts` (build script, file-I/O)

**Analog:** `scripts/check-secrets.ts` L1-27:
```ts
// Secrets gate: run after `astro build`. Fails when secret files are tracked in git,
// copied into dist/, or when values from local secret files appear in dist/.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ... } from './secrets.ts';

const DIST = 'dist';
...
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

if (!existsSync(DIST)) {
  console.error('dist/ not found — run pnpm build first');
  process.exit(1);
}
```
Conventions: header comment saying when to run it, `node:` imports, `.ts` extension on relative imports (Node 24 runs `.ts` directly), pure helpers split into a sibling module (cf. `./secrets.ts`) so they can be unit-tested, and `process.exit(1)` on failure. Register it in `package.json` `scripts` next to `"check:secrets": "node scripts/check-secrets.ts"` (L19) [Proposed: `"measure:bundle"`]. Read `dist/client/index.html` and `dist/client/es/index.html`, and add `zlib.gzipSync(buf, { level: 9 })` (RESEARCH Pattern 9).

---

### Tests

**Unit test shell for an effect** — `tests/unit/marquee-toggle.test.ts` L1-29 and L92-109:
```ts
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createLifecycle } from '../../src/lib/motion/lifecycle';
import { initMarqueeToggles } from '../../src/lib/motion/marquee';

const FIXTURE = `<section data-marquee><button type="button" data-marquee-toggle aria-pressed="false" aria-label="Pause roles animation"></button></section>`;

function getButton(): HTMLButtonElement {
  const button = document.querySelector<HTMLButtonElement>('[data-marquee-toggle]');
  expect(button).not.toBeNull();
  if (!button) throw new Error('fixture button missing');
  return button;
}
...
  it('stays idempotent across 10 lifecycle unmount/mount cycles', () => {
    const lifecycle = createLifecycle(document);
    lifecycle.register(initMarqueeToggles);
    lifecycle.mount();
    for (let i = 0; i < 10; i += 1) {
      lifecycle.unmount();
      lifecycle.mount();
    }
    expect(lifecycle.activeCleanups).toBe(1);
    ...
    lifecycle.unmount();
  });
```
Every new effect test copies the "returns undefined when nothing to do", "stops reacting after cleanup" and "idempotent across 10 cycles" cases (V-19).

**Fake MediaQueryList to extract into `tests/unit/helpers/`** — `tests/unit/motion-gate.test.ts` L10-39:
```ts
class FakeMediaQueryList extends EventTarget implements MediaQueryList {
  readonly media = '(prefers-reduced-motion: reduce)';
  onchange: MediaQueryList['onchange'] = null;
  matches: boolean;
  constructor(matches: boolean) { super(); this.matches = matches; }
  addListener(): void { throw new Error('deprecated addListener must not be used'); }
  removeListener(): void { throw new Error('deprecated removeListener must not be used'); }
  fire(next: boolean): void { this.matches = next; this.dispatchEvent(new Event('change')); }
}

function mockMatchMedia(matches: boolean): FakeMediaQueryList {
  const mql = new FakeMediaQueryList(matches);
  vi.spyOn(window, 'matchMedia').mockReturnValue(mql);
  return mql;
}
```
For cursor and magnetic, which query several media strings, make `media` a constructor arg and dispatch per query with `mockImplementation((q) => map[q])`. The matchMedia-removal pattern (L60-73, `Object.defineProperty(window, 'matchMedia', { value: undefined, ... })` restored in `finally`) is also the model for the "storage getter throws" unit case (`Object.defineProperty(window, 'localStorage', { get() { throw ... } })`). No existing fake IntersectionObserver exists. happy-dom's IO stub never calls back (RESEARCH), so write a new one in the same helper file.

**Existing gate test lines to change (Pitfall 14):** `motion-gate.test.ts` L53-57 (`'off'` -> `'reduced'`), L90-105 (`toHaveBeenCalledWith('off')`), L114-115.

**Astro component render test** — `tests/unit/site-header.test.ts` L1-10:
```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import SiteHeader from '../../src/components/global/SiteHeader.astro';
async function render(locale: 'en' | 'es', pathname: string): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(SiteHeader, { props: { locale, pathname } });
}
```
Use it for MotionToggle markup (aria-pressed default, both icons, `hidden` + `motion-js:inline-flex`, localized name) and for ProjectCard (`data-cursor="view"`, no `data-reveal` on the eager cover).

**E2E** — `tests/e2e/motion.spec.ts` L1-12 (`collectErrors`), L14-24 (`for (const path of paths)` loop), L26-28 (`test.use({ reducedMotion: 'reduce' })`), L43-44 (`test.use({ javaScriptEnabled: false })`), L78-79 (`page.emulateMedia({ reducedMotion: 'reduce' })`). New specs copy this structure. Lines to update: L30-32 and L79 (`'off'` -> `'reduced'`). Playwright config has only a `Desktop Chrome` project (`playwright.config.ts` L11), so touch tests use `test.use({ ...devices['Pixel 7'] })` per describe block. Detail slugs come from `tests/e2e/helpers/projects.ts` (exports expected projects derived from the snapshot), as `a11y.spec.ts` L316 does with `detailFor(...)`.

**Keyboard order** — `tests/e2e/a11y.spec.ts` L119-128:
```ts
function headerSteps(dict: Dictionary, homeHref: string, enHref: string, esHref: string): Step[] {
  return [
    { name: dict['a11y.skipToContent'], href: '#main' },
    { name: site.name, href: homeHref },
    { name: dict['nav.projects'], href: projectsHrefFor(homeHref) },
    { name: dict['nav.contact'], href: `${homeHref}#contact` },
    { name: `EN ${dict['lang.en']}`, href: enHref },
    { name: `ES ${dict['lang.es']}`, href: esHref },
  ];
}
```
Append `{ name: dict['motion.toggle'], tag: 'BUTTON' }`. The `Step` type already supports `tag` (see `contactSteps` L140+ using `tag: 'INPUT'`). It is used at L154, L179 and L316, so all page types inherit it.

## Shared Patterns

### Lifecycle registration + AbortController cleanup
**Source:** `src/lib/motion/marquee.ts` L10-34, `src/lib/motion/lifecycle.ts` L1-3
**Apply to:** reveal, cursor, magnetic, toggle, hero-played setter
- Signature `(doc: Document) => Cleanup | undefined`, returning `undefined` (never `void`) when there is nothing to do.
- One `AbortController` per effect, `{ signal }` on every listener, including the new `motion:change` subscription.
- Register via `lifecycle.register(...)` in an Astro `<script>`. Never call `lifecycle.unmount()/mount()` from the toggle (UI-SPEC Live switching).

### Dependency injection for testability
**Source:** `src/lib/ui/contact-form.ts` L23-27, L136-137; wiring in `ContactForm.astro` L222-228
**Apply to:** reveal (`now`, observer factory, `loadGsap`), cursor and magnetic (`matchMedia`, `loadGsap`)

### Motion gating in CSS
**Source:** `src/styles/global.css` L2, `RolesMarquee.astro` L23/L46/L61
**Apply to:** all new motion CSS. Use `motion-on:` / `motion-reduced:` / `motion-js:`, never `motion-safe:`, for new motion (Pitfall 5). Existing `motion-safe:transition-colors` stays.

### i18n strings
**Source:** `src/i18n/t.ts` L12-15 `useTranslations(locale)`; `ui.en.ts` / `ui.es.ts`
**Apply to:** MotionToggle and the cursor label. Client code must not import the dictionaries (t.ts L7 comment), so the label reaches the client through markup.

### Icons
**Source:** `ExternalTextLink.astro` L2/L24, `Hero.astro` L4/L37
**Apply to:** MotionToggle. Use an explicit per-file `@tabler/icons/outline/*.svg` import with `aria-hidden="true" focusable="false"` and a `size-*` class.

### Conditional attributes under exactOptionalPropertyTypes
**Source:** `ProjectCard.astro` L48-49, `BaseLayout.astro` L22-23, `TextModule.astro` L15-16
**Apply to:** `data-reveal` on the non-eager cover only, `data-reveal-delay`, the optional `aria-describedby` on the toggle

### Focus ring
**Source:** `focus-visible:outline-accent focus-visible:outline-2 focus-visible:outline-offset-2` (every interactive component)
**Apply to:** MotionToggle, and to magnetic shells, where it must stay on the shell and never on the face

### Safe DOM construction
**Source:** `src/lib/ui/embed-facade.ts` L36-48
**Apply to:** the cursor layer. Use `createElement`, `classList.add`, `textContent` and `replaceChildren`, never `innerHTML`.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/lib/motion/split-lines.ts` | utility | transform | No text-splitting or GSAP code exists. Use RESEARCH Pattern 4 |
| `src/lib/motion/load-gsap.ts` | utility | lazy import | No dynamic `import()` of an npm package exists. Use RESEARCH "Lazy, memoised GSAP loader" (the Turnstile loader is only the DI precedent) |
| Fake `IntersectionObserver` test helper | test helper | n/a | No IO usage or fake exists yet (happy-dom's stub never fires) |
| `tests/e2e/motion-lcp.spec.ts` | test (measurement) | n/a | No PerformanceObserver/LCP test exists. Use the UI-SPEC LCP gate description |

## Metadata

**Analog search scope:** `src/lib/motion/`, `src/lib/ui/`, `src/components/**`, `src/layouts/`, `src/styles/`, `src/i18n/`, `scripts/`, `tests/unit/`, `tests/e2e/`, `playwright.config.ts`, `package.json`
**Files scanned:** about 40 read in full or in part
**Pattern extraction date:** 2026-10-29
