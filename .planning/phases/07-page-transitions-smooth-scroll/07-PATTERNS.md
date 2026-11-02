# Phase 7: Page Transitions & Smooth Scroll - Pattern Map

**Mapped:** 2026-11-02
**Files analyzed:** 41 (15 new, 26 modified)
**Analogs found:** 38 / 41

Label legend (user global rules): excerpts below are **[Verified]**: read from the working tree on 2026-11-02 with line numbers. Anything marked **[Proposed]** is a mapping suggestion for the planner. It has not been implemented.

Phase 6 is the main precedent. Its conventions still hold: inits registered on `lifecycle`, an AbortController per init, injected deps for tests, CSS-only motion gated on `[data-motion='on']`, and GSAP kept behind a lazy loader. See `.planning/phases/06-scroll-interaction-motion/06-PATTERNS.md` §"Shared Patterns".

## File Classification

### New files

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `src/lib/motion/navigation.ts` | utility (app-scope hooks) | event-driven (`astro:before-preparation` / `before-swap` / `after-swap`) | `src/lib/motion/lifecycle.ts` `bindToAstro` (L65-79) + `src/lib/motion/toggle.ts` | role-match |
| `src/lib/motion/nav-focus.ts` | utility (focus manager) | event-driven | `src/lib/ui/service-preselect.ts` (safe `getElementById`) + `src/lib/motion/hero.ts` (one-shot listeners) | partial |
| `src/lib/motion/smooth-scroll.ts` | effect (page-scoped `PageInit`) | event-driven (media query + `motion:change`) | `src/lib/motion/cursor.ts` | exact |
| `src/lib/motion/load-lenis.ts` | utility (lazy loader) | request-response (dynamic import) | `src/lib/motion/load-gsap.ts` | exact |
| `tests/unit/motion-navigation.test.ts` | test | event-driven | `tests/unit/lifecycle.test.ts` (`bindToAstro` block L117+) | role-match |
| `tests/unit/nav-focus.test.ts` | test | — | `tests/unit/lifecycle.test.ts` / `motion-cursor.test.ts` | role-match |
| `tests/unit/smooth-scroll.test.ts` | test | — | `tests/unit/motion-cursor.test.ts` | exact |
| `tests/unit/motion-load-lenis.test.ts` (optional if the loader is generic) | test | — | `tests/unit/motion-load-gsap.test.ts` | exact |
| `tests/e2e/helpers/navigation.ts` | test helper | — | `tests/e2e/helpers/motion.ts` | role-match |
| `tests/e2e/transitions.spec.ts` | e2e | — | `tests/e2e/motion-toggle.spec.ts` | role-match |
| `tests/e2e/transitions-reduced.spec.ts` | e2e | — | `tests/e2e/motion-toggle.spec.ts` | role-match |
| `tests/e2e/smooth-scroll.spec.ts` | e2e | — | `tests/e2e/i18n.spec.ts` (skip link, L65-71) + `motion-toggle.spec.ts` | role-match |
| `tests/e2e/parallax.spec.ts` | e2e | — | `tests/e2e/motion-hover.spec.ts` / `motion-toggle.spec.ts` | role-match |
| `tests/e2e/navigation-leaks.spec.ts` | e2e (CDP) | — | none in repo. Use RESEARCH §"Leak counting via CDP" | no analog |
| `tests/e2e/transitions-capture.spec.ts` (taste screenshots, opt-in) | e2e capture | — | `tests/e2e/motion-states.spec.ts` | exact |

### Modified files

| Modified File | Role | Change | Closest Analog / Precedent |
|---------------|------|--------|----------------------------|
| `src/layouts/BaseLayout.astro` | layout | `<ClientRouter fallback="swap" />`, wipe panel div, app-scope import, cursor persist host | itself (L29, L47-58) |
| `src/lib/motion/lifecycle.ts` | utility | optional mount gate ("ready" promise / delayed mount after VT release) | itself (L65-79) |
| `src/lib/motion/index.ts` | registration | add app-scope hooks registered once | itself (L1-13) |
| `src/lib/motion/cursor.ts` | effect | move to app scope; layer appended into a persisted host; locale label resync | itself (L43-178) |
| `src/components/global/CursorFollower.astro` | component | persist host element `data-astro-transition-persist="cursor"`; registration moves | itself (L22-53) |
| `src/styles/global.css` | config (CSS) | VT CSS, wipe/morph/crossfade, `html[data-vt]` hold, parallax timelines, Lenis base rules, new tokens, h1 no-ring | itself (L56-66 tokens, L74-160 reveal, L196-241 card layers, L263-283 hero) |
| `src/lib/motion/tokens.ts` | config | `wipe`, `navFade` if mirrored for JS | itself (L6-13) |
| `tests/unit/motion-tokens.test.ts` | test | assert new `--t-wipe`, `--t-nav-fade`, `--wipe-release` | itself (L7-21) |
| `src/components/global/SiteHeader.astro` | component | hook for `view-transition-name: site-header` (attr or class) | itself (L34) |
| `src/components/global/SkipLink.astro` | component | add `data-skip-link` | itself (L12-17) |
| `src/components/global/MotionToggle.astro` | component | none expected (aria-pressed synced from `navigation.ts` before swap) | — |
| `src/components/ui/ProjectCard.astro` | component | frame `overflow-hidden` → `overflow-clip` + `data-parallax-frame`; img `data-parallax` (not on eager); fit-content title span for morph | itself (L56-90) |
| `src/components/project/NextProjectTeaser.astro` | component | same as ProjectCard (frame L56-60, title L76-88) | `ProjectCard.astro` |
| `src/components/project/ImageModule.astro` | component | new per-image `overflow-clip` frame with aspect ratio, `data-parallax`; opt-out flag | `ProjectCard.astro` frame (L56) |
| `src/components/project/ProjectIntro.astro` | component | h1 `tabindex="-1"`; inner fit-content span as morph target | itself (L20-29) |
| `src/components/sections/Hero.astro` | component | h1 `tabindex="-1"` (L31) | — |
| `src/components/views/ProjectsView.astro` | component | h1 `tabindex="-1"` (L23) | — |
| `src/components/views/NotFoundView.astro` | component | h1 `tabindex="-1"` (L28) | — |
| `src/components/contact/ContactSection.astro` | component | `tabindex="-1"` on `#contact` (L30-34) | `<main id="main" tabindex="-1">` in BaseLayout L50 |
| `src/components/sections/FeaturedServices.astro` + `src/lib/ui/service-preselect.ts` | component + utility | "Ask about this" `/?service=<id>#contact` must not swap Home onto itself | `service-preselect.ts` (L11-17) |
| `src/lib/projects/overrides-schema.ts` + `src/data/project-overrides.json` | model / data | per-project or per-module parallax opt-out (D-11) | `moduleAlt` field (L26-28) |
| `src/lib/projects/model.ts` / `detail-view.ts` | model | carry the opt-out into the image `ModuleView` | `ModuleView` image variant (model.ts L103-108) |
| `scripts/measure-bundle.ts` | script (file-I/O) | `lenisVersion` marker, eager ceiling | itself (L13, L66-70) |
| `tests/unit/measure-bundle.test.ts` | test | cover the new marker / ceiling if extracted into `scripts/bundle.ts` | itself |
| `tests/e2e/helpers/motion.ts` | test helper | `settleMotion` also waits for `data-vt` / `data-astro-transition` to clear | itself (L21-53) |
| `package.json` | config | `lenis@1.3.27` (exact pin, like `"gsap": "3.15.0"` L31) | itself |

## Pattern Assignments

### `src/lib/motion/load-lenis.ts` (utility, lazy dynamic import)

**Analog:** `src/lib/motion/load-gsap.ts` (whole file, 38 lines). Copy it 1:1. The only change is no `registerPlugin` step.

**Header-comment contract** (L1-3). Keep the same "only module that references the specifier" rule for `'lenis'`:
```ts
// The only module in src/ that references the 'gsap' specifier. GSAP core and SplitText load lazily
// through dynamic import(), so they land in a separate chunk that is fetched only when an effect asks
// for it (scripts/measure-bundle.ts fails the build check if GSAP ever turns up in an eager chunk).
import type { gsap } from 'gsap';
```

**Memoised loader with retry on failure** (L17-31):
```ts
export function createGsapLoader(importer: () => Promise<GsapModules>): () => Promise<GsapModules> {
  let loading: Promise<GsapModules> | undefined;
  return () => {
    if (loading !== undefined) return loading;
    const attempt = importer().then((modules) => {
      modules.gsap.registerPlugin(modules.SplitText);
      return modules;
    });
    loading = attempt;
    attempt.catch(() => {
      if (loading === attempt) loading = undefined;
    });
    return attempt;
  };
}

async function importGsap(): Promise<GsapModules> {
  const [core, split] = await Promise.all([import('gsap'), import('gsap/SplitText')]);
  return { gsap: core.gsap, SplitText: split.SplitText };
}

export const loadGsap = createGsapLoader(importGsap);
```
[Proposed] `createLenisLoader(importer: () => Promise<typeof Lenis>)` → `export const loadLenis = createLenisLoader(() => import('lenis').then((m) => m.default));`. Use a type-only import (`import type Lenis from 'lenis'`) so nothing pulls Lenis eagerly. Do **not** import `lenis/dist/lenis.css`. Its four rules are copied into `global.css` (UI-SPEC "Smooth Scroll").

---

### `src/lib/motion/smooth-scroll.ts` (page-scoped effect, event-driven)

**Analog:** `src/lib/motion/cursor.ts` (exact: fine pointer + forced colours + `on` gating, lazy-loaded library, start/stop "session" that follows the media queries and `motion:change` live).

**Imports + deps interface** (cursor.ts L1-15):
```ts
import { currentMotionState, onMotionChange } from './events';
import type { PageInit } from './lifecycle';
import type { GsapModules } from './load-gsap';
import { eases } from './tokens';

/** Everything the follower needs from outside the DOM, injected so unit tests can drive it. */
export interface CursorDeps {
  matchMedia(query: string): MediaQueryList;
  loadGsap(): Promise<GsapModules>;
}

const FINE_POINTER = '(hover: hover) and (pointer: fine)';
const FORCED_COLORS = '(forced-colors: active)';
```
[Proposed] `SmoothScrollDeps { matchMedia; loadLenis(): Promise<LenisCtor> }`. The research's "injected Lenis factory" maps onto `loadLenis`.

**Session start/stop that follows state live** (cursor.ts L43-60, L151-177):
```ts
export function createCursor(deps: CursorDeps): PageInit {
  return (doc) => {
    const template = doc.querySelector<HTMLTemplateElement>('template[data-cursor-template]');
    if (!template) return undefined;

    const win = doc.defaultView;
    const ac = new AbortController();
    const fine = deps.matchMedia(FINE_POINTER);
    const forced = deps.matchMedia(FORCED_COLORS);
    let stopSession: (() => void) | undefined;

    const allowed = (): boolean =>
      fine.matches && !forced.matches && currentMotionState(doc) === 'on';

    const startSession = (): (() => void) => {
      const session = new AbortController();
      const { signal } = session;
      ...
      deps
        .loadGsap()
        .then(({ gsap }) => {
          if (signal.aborted) return;
          ...
        })
        .catch(() => {
          // (comment line elided) — failed load leaves native behaviour
        });

      return () => {
        session.abort();
        ctx?.revert();
        layer?.remove();
      };
    };

    const sync = (): void => {
      if (allowed()) {
        stopSession ??= startSession();
      } else if (stopSession) {
        stopSession();
        stopSession = undefined;
      }
    };

    fine.addEventListener('change', sync, { signal: ac.signal });
    forced.addEventListener('change', sync, { signal: ac.signal });
    onMotionChange(doc, sync, ac.signal);
    sync();

    return () => {
      ac.abort();
      stopSession?.();
      stopSession = undefined;
    };
  };
}
```
[Proposed] Inside `startSession`, `.then((Lenis) => { if (signal.aborted) return; lenis = new Lenis({ lerp: 0.12, smoothWheel: true, syncTouch: false, wheelMultiplier: 1, anchors: false, stopInertiaOnNavigate: true, autoRaf: true }); })`, and the stop function does `session.abort(); lenis?.destroy();`. The `if (signal.aborted) return` guard after the async load is what stops a late-resolving import from creating a Lenis after unmount (leak test SC3). Option values come from UI-SPEC "Smooth Scroll".

**Registration** goes with the other page effects in `src/lib/motion/effects.ts` (L7-16):
```ts
// GSAP stays behind the lazy loader: magnetic only fetches it for a fine pointer under 'on'.
lifecycle.register(createMagnetic({ matchMedia: (q) => window.matchMedia(q), loadGsap }));
```
→ `lifecycle.register(createSmoothScroll({ matchMedia: (q) => window.matchMedia(q), loadLenis }));`

---

### `src/lib/motion/navigation.ts` (app-scope hooks, event-driven)

**Analog 1:** `src/lib/motion/lifecycle.ts` `bindToAstro` (L59-79). This is the existing pattern for raw Astro event names plus a returned unbind:
```ts
/**
 * Mounts immediately (module scripts are deferred, so the DOM is parsed) and follows
 * Astro navigation events. Those only fire once a ClientRouter exists (Phase 7); without
 * it 'astro:page-load' never fires and the immediate mount covers the page.
 * Raw event names: Astro 7 removed the TRANSITION_* helper constants.
 */
export function bindToAstro(lifecycle: Lifecycle, doc: Document): () => void {
  const onLoad = (): void => {
    lifecycle.mount();
  };
  const onBeforeSwap = (): void => {
    lifecycle.unmount();
  };
  lifecycle.mount();
  doc.addEventListener('astro:page-load', onLoad);
  doc.addEventListener('astro:before-swap', onBeforeSwap);
  return () => {
    doc.removeEventListener('astro:page-load', onLoad);
    doc.removeEventListener('astro:before-swap', onBeforeSwap);
  };
}
```
Follow it: take `(doc, deps)` and return an unbind (for unit tests). Use raw `'astro:before-preparation'` / `'astro:before-swap'` / `'astro:after-swap'` strings. [Proposed] Type the events with the `TransitionBeforeSwapEvent` / `TransitionBeforePreparationEvent` types from `astro:transitions/client` (type-only import). Alternatively, declare them in a `DocumentEventMap` augmentation like `events.ts` L3-7:
```ts
declare global {
  interface DocumentEventMap {
    'motion:change': CustomEvent<{ state: MotionState }>;
  }
}
```

**Analog 2:** `src/lib/motion/toggle.ts` L24-35 is the sync logic to mirror onto `event.newDocument` before swap (Pitfall 2, toggle icon flicker):
```ts
const sync = (): void => {
  button.setAttribute('aria-pressed', String(currentMotionState(doc) === 'reduced'));
  ...
```
[Proposed] In before-swap: `newDocument.querySelector('[data-motion-toggle]')?.setAttribute('aria-pressed', String(currentMotionState(doc) === 'reduced'))`. Also copy `data-motion` (RESEARCH Pattern 1, verbatim):
```ts
document.addEventListener('astro:before-swap', (event) => {
  const state = document.documentElement.dataset['motion'];
  if (state) event.newDocument.documentElement.dataset['motion'] = state;
});
```
Read the state through `currentMotionState(doc)` (events.ts L33-37), never raw dataset parsing elsewhere:
```ts
export function currentMotionState(doc: Document): MotionState {
  const value = doc.documentElement.dataset['motion'];
  return value === 'on' || value === 'reduced' ? value : 'off';
}
```
The `off` opt-out (RESEARCH "Opt out of soft navigation in `off`") uses the same helper.

**Title-naming target selectors:** card source is `[data-card]` (ProjectCard.astro L55, NextProjectTeaser.astro L51-54). The arriving target is `#project-title` (ProjectIntro.astro L20-21). Use `getElementById`, never `querySelector(hash)` (RESEARCH Security V5).

**Reveal marker for the morph target** reuses the reveal.ts attributes (reveal.ts L187-190):
```ts
const showInstantly = (el: HTMLElement): void => {
  el.setAttribute('data-revealed', '');
  el.setAttribute('data-reveal-instant', '');
};
```
Set both on the new document's `#project-title` in before-swap. The CSS at global.css L139-145 already makes `[data-reveal-instant]` land with `transition: none`.

---

### `src/lib/motion/nav-focus.ts` (focus manager, event-driven)

**Analog (safe id lookup):** `src/lib/ui/service-preselect.ts` L11-17:
```ts
export function initServicePreselect(doc: Document): Cleanup | undefined {
  if (doc.querySelector('input[name="service"]') === null) return undefined;
  const choice = parseServiceParam(doc.defaultView?.location.search ?? '');
  const radio = doc.getElementById(`contact-service-${choice}`);
  if (radio instanceof HTMLInputElement && radio.type === 'radio') radio.checked = true;
  return undefined;
}
```
[Proposed] Copy the "parse then `getElementById` then `instanceof` guard" shape for the hash target: `decodeURIComponent(location.hash.slice(1))` in try/catch → `doc.getElementById(id)` → `instanceof HTMLElement` → `.focus({ preventScroll: true })`. Fallback order is hash target → `main h1` → `#main` (BaseLayout L50 already has `tabindex="-1"`).

**One-shot listener + AbortController** (hero.ts L36-65): the scrollend anchor-focus hook should abort its listener after firing, like `done()` here:
```ts
const ac = new AbortController();
const done = (): void => {
  markPlayed();
  ac.abort();
};
...
target.addEventListener('animationend', settle, { signal: ac.signal });
...
onMotionChange(doc, done, ac.signal);
```

**Skip-link exclusion:** the selector is `a[data-skip-link]` (to be added on SkipLink.astro L12-13, currently `href="#main"` with no data attribute).

---

### `src/lib/motion/index.ts` (registration, app scope)

**Analog:** itself (L1-13):
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
[Proposed] Under ClientRouter this module runs once per session (RESEARCH Pattern 2). Add the app-scope calls (`bindNavigation(document, …)`, `bindNavFocus(document, …)`) next to `syncMotionGate`, and fix the "Page-scoped" comments to say "app-scoped (runs once per session under ClientRouter)". If `bindToAstro` gains a release gate (mount after VT release, capped at 1200 ms), keep the immediate first-load mount in L72 unchanged. `tests/unit/lifecycle.test.ts` L117-139 covers it.

---

### `src/lib/motion/lifecycle.ts` (modify: delayed mount)

**Analog:** itself. The existing `mount()` is idempotent (L37-41) and `register()` runs late inits when mounted (L33-36). A delayed mount therefore only needs to change *when* `onLoad` calls `lifecycle.mount()` (L66-68). [Proposed] Pass an optional `waitForRelease(): Promise<void>` into `bindToAstro`, used only for `astro:page-load` after a swap. Keep the error-isolation `run` (L23-30) untouched.

---

### `src/lib/motion/cursor.ts` + `src/components/global/CursorFollower.astro` (persist across swaps)

**Analog:** themselves. The layer is appended to `doc.body` (cursor.ts L114: `doc.body.append(fragment);`), and the body is replaced on swap. [Proposed] Append into a host element in CursorFollower.astro that carries the raw attribute `data-astro-transition-persist="cursor"` (not the `transition:persist` directive, RESEARCH Pattern 3) and `view-transition-name: cursor` under `on`. Registration currently lives in the component script (CursorFollower.astro L47-53):
```astro
<script>
  import { lifecycle } from '../../lib/motion';
  import { createCursor } from '../../lib/motion/cursor';
  import { loadGsap } from '../../lib/motion/load-gsap';
  // GSAP stays behind the lazy loader: it is only fetched once the follower is allowed to mount.
  lifecycle.register(createCursor({ matchMedia: (q) => window.matchMedia(q), loadGsap }));
</script>
```
It must move to app scope (mounted once, never unmounted). Otherwise each before-swap destroys the session and the leak test sees churn. The pill label is build-time text inside the `<template>` (CursorFollower.astro L37-42). On an EN↔ES swap the persisted layer keeps the old label. [Proposed] Re-copy `[data-cursor-pill]` text from the new document's template in before-swap (RESEARCH Security table "Stale persisted DOM").

---

### `src/layouts/BaseLayout.astro` (layout)

**Analog:** itself. The insertion points:
- L2-11 imports: add `import { ClientRouter } from 'astro:transitions';`.
- L29 `<html lang={locale} data-motion="off" class="scroll-pt-24 sm:scroll-pt-20">`: keep `data-motion="off"` as the markup default (no-JS safety). Navigation.ts carries the live value.
- L33-34 inline gate: `<script is:inline set:html={motionGateInline} />`. Put `<ClientRouter fallback="swap" />` **after** this gate so the gate still runs first on hard loads.
- L47-58 body: add the wipe panel `<div data-wipe-panel aria-hidden="true"></div>` outside `<main>` (UI-SPEC "The panel"). The module script L55-58 stays the single motion entry:
```astro
<script>
  import '../lib/motion';
  import '../lib/motion/effects';
</script>
```
- Use **no** `transition:*` directives anywhere (they inject the OS-only `animation:none!important`, RESEARCH Pattern 3).

---

### `src/styles/global.css` (CSS: tokens, VT, parallax, Lenis, focus)

**Analog:** itself. Copy these conventions:

**Tokens block** (L56-66). Add `--t-wipe: 560ms; --t-nav-fade: 320ms; --wipe-release: 0.7;` and the parallax tokens here:
```css
/* Motion durations (UI-SPEC "Motion Tokens"); tokens.ts mirrors the GSAP ones in seconds. */
:root {
  --t-press: 140ms;
  ...
  --t-hero: 720ms;
}
```

**State gating selector style.** Every motion rule is prefixed `[data-motion='on']` / `[data-motion='reduced']` (L81-107). There are also custom variants for Tailwind classes (L2-6):
```css
@custom-variant motion-on (&:where([data-motion='on'], [data-motion='on'] *));
@custom-variant motion-reduced (&:where([data-motion='reduced'], [data-motion='reduced'] *));
```
VT pseudo-elements hang off `html`, so write them as `html[data-motion='on']::view-transition-group(wipe)` (RESEARCH Pattern 3).

**Card layer ownership** (L196-216). Parallax must add `translate` on the `<img>` without adding a second `transition` declaration to that layer:
```css
[data-motion='on'] [data-card-mat] {
  clip-path: inset(0);
  transition:
    clip-path 280ms var(--ease-reveal),
    scale 900ms var(--ease-soft) var(--reveal-delay, 0ms);
}
...
[data-motion='on'] [data-card-image] {
  transition: scale 490ms var(--ease-soft);
}
```
Parallax uses `animation` (scroll-linked) on the img, not `transition`, so the "one transition declaration per layer" rule (Pitfall 12) holds.

**Hero hold under `html[data-vt]`.** The hero keyframes are L263-283 (`[data-motion='on'] [data-hero]:not([data-hero-played]) …`). [Proposed] Add `html[data-vt] [data-hero]:not([data-hero-played]) :is([data-hero-line-inner], picture[data-hero-portrait], picture[data-hero-portrait] img, [data-hero-lead], [data-hero-cta]) { animation-play-state: paused; }`. `hero.ts` `stillAnimating()` (L10-14) treats paused as not-finished, which is correct.

**Keyframe style** (L290-324): `from`/`to` with individual `translate` / `scale` properties, an explicit end value, and a comment explaining any non-obvious end state. Copy this for `@keyframes parallax`.

**Print block** (L167-182): [Proposed] Add `[data-parallax] { animation: none !important; translate: none !important; }` inside the existing `@media print`. Reason [Inference]: paper must get the unscrolled box.

**Constraints enforced by `tests/unit/motion-tokens.test.ts` L33-36:**
```ts
it('has a reveal failsafe keyframe and never hides with visibility/display', () => {
  expect(css).toContain('@keyframes reveal-failsafe');
  expect(css).not.toMatch(/visibility:\s*hidden|display:\s*none/);
});
```
**Important:** UI-SPEC Open Question 6 suggests hiding `.astro-route-announcer` with `display:none` if it proves noisy. That would fail this test, so use a different technique or update the test deliberately. The taste lint also forbids the substrings `ease-in` / `ease-in-out` anywhere, including comments (UI-SPEC "Motion Tokens").

---

### `src/lib/motion/tokens.ts` + `tests/unit/motion-tokens.test.ts`

**Analog:** itself (tokens.ts L6-13; test L7-21). The test derives every `durations` key from `--t-<key>` with the regex `--t-${name}:\s*(\d+)ms`. If `wipe: 0.56` is added to `durations`, the CSS name must be `--t-wipe` exactly. `--t-nav-fade` is CSS-only. Add a "CSS-only" assertion next to the existing one:
```ts
it('defines the CSS-only fade and hero durations', () => {
  expect(cssMs('fade')).toBe(320);
  expect(cssMs('hero')).toBe(720);
});
```
`--wipe-release` is unitless, so it needs its own `toContain` assertion.

---

### `src/components/ui/ProjectCard.astro` (parallax frame + morph source)

**Analog:** itself.

**Frame** (L56): `<div class:list={['bg-surface-alt overflow-hidden', aspectClasses[size]]} {...shutter}>`. Change it to `overflow-clip` and add `data-parallax-frame` only when `!eager`. Use the existing conditional-spread idiom (L48-51):
```ts
// Spread so lazy covers carry no fetchpriority attribute at all (exactOptionalPropertyTypes).
const priority = eager ? { fetchpriority: 'high' as const } : {};
// The eager cover is the LCP image: it is never clipped or hidden, so it gets no shutter.
const shutter = eager ? {} : { 'data-reveal': 'shutter' as const };
```
→ `const parallax = eager ? {} : { 'data-parallax-frame': '' };`. The `<Picture>` passes the img attribute the same way `data-card-image` is passed today (L72).

**Morph source** (L80-89). The title link is the stretched `<a>` with `after:inset-0`. Put a `<span data-morph-title class="inline-block w-fit">` *inside* the `<a>`, wrapping the existing `lang` span branch, so `lang` stays untouched (UI-SPEC Title Morph "`lang` titles"):
```astro
<a href={project.href} class="… after:absolute after:inset-0 after:content-[''] …">
  {project.titleLang === null ? (
    project.title
  ) : (
    <span lang={project.titleLang}>{project.title}</span>
  )}
</a>
```

### `src/components/project/NextProjectTeaser.astro`

**Analog:** `ProjectCard.astro` (same markup family). The frame is L56-60 (`data-reveal="shutter" … class="bg-surface-alt aspect-[5/4] overflow-hidden"`) and the title link is L81-87. Note the `sr-only` prefix span at L85: the morph span must wrap **only** the visible title, not the `detail.next.srPrefix` text.

### `src/components/project/ImageModule.astro` (detail stack parallax)

**Analog:** `ProjectCard.astro` frame (L56) for the clip frame, and its own two render branches (L25-41 no caption, L42-66 figure). Both `<Picture>` calls need the same new frame. [Proposed] Factor the frame into a const class string to keep "literal class strings so Tailwind can see them" (L14-19):
```ts
// Literal class strings so Tailwind can see them (UI-SPEC ImageModule).
const frameClasses = {
  bleed: 'w-full',
  padded: 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8',
} as const;
```
Aspect ratio comes from `image.width` / `image.height` (already passed at L33-34) via an inline `style={`aspect-ratio: ${image.width} / ${image.height}`}`. That keeps the stack's exact height, so there is no CLS. Skip parallax when `eager` (LCP) or when the D-11 opt-out is set.

### `src/lib/projects/overrides-schema.ts` (D-11 opt-out data)

**Analog:** the `moduleAlt` field (L26-28), which is keyed by image id:
```ts
// Per-image alt text keyed by image id (D-09). Unknown keys and the 125-character limit are
// checked in validateOverrides, against the snapshot's image ids.
moduleAlt: z.record(z.string().regex(/^\d+$/), localized).optional(),
```
[Proposed] `parallax: z.union([z.literal(false), z.array(z.string().regex(/^\d+$/))]).optional()`, which allows project-level off or a list of module ids that are off. The schema is `z.strictObject`, so an unknown key would fail the build. The field must be added here before any JSON edit.

### h1 focus targets (`Hero.astro` L31, `ProjectsView.astro` L23-27, `ProjectIntro.astro` L20-23, `NotFoundView.astro` L28)

**Analog:** `<main id="main" tabindex="-1">` (BaseLayout L50). Add `tabindex="-1"` to each h1. `ProjectIntro`'s h1 is also the morph target and has `data-reveal="lines"`:
```astro
<h1
  id="project-title"
  data-reveal="lines"
  class="font-display text-ink text-4xl font-semibold tracking-tight text-pretty"
>
```
The inner fit-content span for the morph must not break `split-lines.ts` (it only splits when it can, per the global.css L123-129 comment: "A lines heading that is not split (it wraps a link…) keeps the fade"). [Inference] An inline-block span may change SplitText line detection. Verify in the motion-reveal e2e.

### `src/components/contact/ContactSection.astro` (anchor target)

L30-34 already has `id="contact"` and `scroll-mt-24`. Add `tabindex="-1"`. The no-ring CSS rule must cover it along with the h1s (UI-SPEC "Anchors and the skip link").

### `src/components/sections/FeaturedServices.astro` L39 + `src/lib/ui/service-preselect.ts`

The link is `href={`${getRelativeLocaleUrl(locale, '/')}?service=${service.id}#contact`}`. The router sees a different search string, so it would soft-navigate Home onto itself. [Proposed] Do not use `data-astro-reload`: it forces a full load, which also discards a typed message. Instead, add a capture-phase click hook in `nav-focus.ts` that, for same-pathname links with `#contact`, calls `preventDefault`, runs the preselect logic from `initServicePreselect` (refactor to accept the search string as a parameter instead of reading `location.search`), and glides. RESEARCH Pitfall 4 forbids hand-rolled `pushState`, so the planner decides URL handling. `tests/unit/service-preselect.test.ts` and `tests/e2e/contact-preselect.spec.ts` are the existing tests to extend.

---

### `scripts/measure-bundle.ts` (script, file-I/O)

**Analog:** itself. Marker constant (L13) and eager scan loop (L66-70):
```ts
const GSAP_MARKER = 'GreenSock';
...
for (const path of eager) {
  if (read(path).toString('utf8').includes(GSAP_MARKER)) {
    problems.push(`gsap loads eagerly on ${page.route}: ${path} contains "${GSAP_MARKER}"`);
  }
}
```
[Proposed] Turn this into a marker list `[{ name: 'gsap', marker: 'GreenSock' }, { name: 'lenis', marker: 'lenisVersion' }]`. Add an eager gzip ceiling check: sum `eager.map(measure)` gzip and push a problem when it is over `EAGER_CEILING_GZIP` (22,000 B, pending user confirmation). Also update the final OK line (L78). Any pure helper that is extracted goes into `scripts/bundle.ts` (erasable TS only, L1-2 comment) and gets tested in `tests/unit/measure-bundle.test.ts`, which already fixtures a `/* GreenSock */` chunk (L49-53).

---

### Unit tests

**`tests/unit/smooth-scroll.test.ts`.** Analog `tests/unit/motion-cursor.test.ts`: happy-dom pragma, `FakeMediaQueryList` for fine/forced, stub loader, `dispatchMotionChange` for live switching (L1-10):
```ts
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCursor, type CursorDeps } from '../../src/lib/motion/cursor';
import { dispatchMotionChange } from '../../src/lib/motion/events';
import { createLifecycle } from '../../src/lib/motion/lifecycle';
import type { GsapModules } from '../../src/lib/motion/load-gsap';
import { FakeMediaQueryList } from './helpers/fake-media';

const FINE = '(hover: hover) and (pointer: fine)';
const FORCED = '(forced-colors: active)';
```
The stub-library pattern is `makeGsap()` (L46-65): `vi.fn()` constructors/methods cast through `unknown`. Copy it as `makeLenis()`, returning a class whose `destroy` is a `vi.fn()`. Assert: created only for fine + `on`; not created for touch, reduced, off or forced colours; `destroy` on unmount and on `motion:change` to `reduced`; re-created on change back to `on`; no instance when unmount happens before the loader resolves.

**`tests/unit/motion-navigation.test.ts` / `nav-focus.test.ts`.** Analog `tests/unit/lifecycle.test.ts` `bindToAstro` block (L117-139), which dispatches raw Astro events:
```ts
document.dispatchEvent(new Event('astro:page-load'));
...
document.dispatchEvent(new Event('astro:before-swap'));
```
For before-swap, build a fake event carrying `newDocument` from `new DOMParser().parseFromString(html, 'text/html')` (RESEARCH Wave 0 gaps). Use `mockMatchMedia` / `withoutMatchMedia` from `tests/unit/helpers/fake-media.ts` (L41-69) for the `off` opt-out case.

**`tests/unit/motion-load-lenis.test.ts`.** Copy `tests/unit/motion-load-gsap.test.ts` (memoise / retry cases L12-49), minus the `registerPlugin` case.

---

### E2E tests

**`tests/e2e/helpers/navigation.ts`.** Analog `tests/e2e/helpers/motion.ts`: same export style (one documented async helper taking `page`) and the same `expect.poll(…, { timeout: 5000 })` and `page.evaluate` rAF idioms (L36-46). [Proposed] `softNavigate(page, linkLocator)` clicks a real link, then waits for `html:not([data-vt])` and for `document.getAnimations()` on VT pseudos to finish. `listenerCounts(cdp)` is copied verbatim from RESEARCH §"Leak counting via CDP".

**`tests/e2e/helpers/motion.ts` `settleMotion` (modify).** Add the `data-vt` / `data-astro-transition` wait before the existing rAF step (L40-45). Every a11y and motion spec already calls it (e.g. `a11y.spec.ts` L62, L396), so the change propagates.

**`tests/e2e/transitions.spec.ts`, `transitions-reduced.spec.ts`, `smooth-scroll.spec.ts`, `parallax.spec.ts`.** Analog `tests/e2e/motion-toggle.spec.ts`:
- console/pageerror collector (L9-16): `collectErrors(page)`. Reuse it in every new spec.
- `declare global { interface Window { … } }` plus `page.addInitScript` recording (L18-41). This is the pattern for wrapping `document.startViewTransition` to count calls, and for stubbing `matchMedia` away for the `off` case:
```ts
async function recordMotionWrites(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__motionWrites = [];
    new MutationObserver((records) => { … }).observe(document, { attributes: true, subtree: true, attributeFilter: ['data-motion'] });
  });
}
```
- `window.__marker = 1` (L52-54) proves "no reload". Reuse it to prove a soft navigation (marker survives), and its absence proves a full load in `off`.
- Dictionary-driven locators: `page.getByRole('button', { name: en['motion.toggle'], exact: true })` (L59), importing `en`/`es` from `src/i18n/ui.en` / `ui.es` (L2-3).
- Skip-link assertion style: `tests/e2e/i18n.spec.ts` L65-71 (`await expect(page.locator('#main')).toBeFocused();`).
- Detail slug and project helpers: `tests/e2e/helpers/projects.ts` (`expectedDetails`, used in motion-states.spec.ts L6). Never hard-code slugs other than the existing `DETAIL_SLUG = 'website-instablogs'` precedent (motion-states.spec.ts L36).

**`tests/e2e/transitions-capture.spec.ts` (taste screenshots).** Analog `tests/e2e/motion-states.spec.ts` L8-41: opt-in env flag, `test.skip(!CAPTURE, …)`, an `OUT` dir under `.taste-skill/`, and `LOCALES` / `WIDTHS` consts:
```ts
const CAPTURE = process.env['CAPTURE_MOTION_STATES'] === '1';
test.skip(!CAPTURE, 'set CAPTURE_MOTION_STATES=1 to capture the motion-state screenshots');
const OUT = '.taste-skill/motion-states';
if (CAPTURE) mkdirSync(OUT, { recursive: true });
```
→ `CAPTURE_TRANSITIONS=1`, `OUT = '.taste-skill/transitions'` (UI-SPEC Verification list 1-8).

**Playwright config:** `playwright.config.ts` runs Chromium only (`devices['Desktop Chrome']`) against `astro preview` on port 4400. Touch-emulation tests need a per-test `test.use({ hasTouch: true, isMobile: true })` or a context with `devices['Pixel 7']`. There is no existing analog in the repo [Verified grep: none found in the files read].

## Shared Patterns

### Lifecycle registration + AbortController cleanup
**Source:** `src/lib/motion/toggle.ts` L21-22, L70-72; `cursor.ts` L49, L172-177.
**Apply to:** `smooth-scroll.ts`, and any page-scoped hook added in this phase.
```ts
const ac = new AbortController();
const { signal } = ac;
… addEventListener(…, { signal });
onMotionChange(doc, sync, signal);
return () => {
  ac.abort();
};
```
Inits return `undefined` when their markup is absent (cursor.ts L45-46, service-preselect.ts L12). This is required under ClientRouter, because every init registered so far runs on every later page (RESEARCH Pattern 2).

### App scope vs page scope
**Source:** `src/lib/motion/index.ts` (module runs once) vs `lifecycle.register` (per page).
**Apply to:** navigation.ts, nav-focus.ts, cursor go app-scope (bound once in index.ts). smooth-scroll.ts and everything else stays page-scope.

### Dependency injection for tests
**Source:** `CursorDeps` (cursor.ts L7-10), `MagneticDeps` (magnetic.ts L10-15), and the call sites in `effects.ts` L16 / CursorFollower.astro L52 (`matchMedia: (q) => window.matchMedia(q)`).
**Apply to:** smooth-scroll.ts (`loadLenis`), navigation.ts (`win`, timers, `skipTransition` if exposed).

### Motion gating
**Source:** `currentMotionState` (events.ts L33-37); the CSS `[data-motion='on']` prefix (global.css L81+); `motion-on:` variant (L2).
**Apply to:** every new JS and CSS rule. Never use `motion-safe:` for new motion (global.css L3-4 comment: "New motion never uses motion-safe:, which ignores the toggle").

### Conditional attributes under `exactOptionalPropertyTypes`
**Source:** ProjectCard.astro L48-51, ImageModule.astro L20-22 (`const priority = eager ? { fetchpriority: 'high' as const } : {};`).
**Apply to:** `data-parallax-frame` / `data-parallax` on cards, teaser and image modules (excluded on eager/LCP).

### Safe DOM lookup
**Source:** service-preselect.ts L14-15 (`getElementById` + `instanceof` guard).
**Apply to:** hash focus, `#project-title` naming. Never `querySelector(location.hash)`.

### Lazy heavy libraries
**Source:** `load-gsap.ts` plus the `measure-bundle.ts` marker check.
**Apply to:** Lenis (`load-lenis.ts`, `lenisVersion` marker).

### Comment style
Every module opens with a JSDoc that names the requirement and decision IDs (e.g. toggle.ts L8-14 "MOTN-08, D-15..D-18"). New files should cite MOTN-05/06/09 and the 07 D-numbers the same way.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `tests/e2e/navigation-leaks.spec.ts` | e2e (CDP) | — | No spec uses `context.newCDPSession`. Use RESEARCH §"Leak counting via CDP" and §Pitfall 6 (warm-up cycle, compare per URL). |
| View Transition CSS (`::view-transition-*`, wipe panel) in `global.css` | CSS | — | No VT CSS exists yet. Use RESEARCH Pattern 3/4 and UI-SPEC "Navigation Transition" / "Title Morph" timelines. Keep the file's existing selector and comment conventions. |
| CSS scroll-driven parallax (`view-timeline`) | CSS | — | No scroll-timeline CSS exists yet. Use RESEARCH Pattern 7 (named timeline on an `overflow: clip` frame, since `overflow: hidden` gets stuck). |

## Metadata

**Analog search scope:** `src/lib/motion/`, `src/lib/ui/`, `src/lib/projects/`, `src/components/{global,ui,project,sections,views,contact}/`, `src/layouts/`, `src/styles/global.css`, `scripts/`, `tests/unit/`, `tests/e2e/`, `playwright.config.ts`, `package.json`, `06-PATTERNS.md` (headings only)
**Files scanned:** ~45 (about 30 read in full or in part)
**Pattern extraction date:** 2026-11-02
