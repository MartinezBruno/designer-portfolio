---
phase: 06-scroll-interaction-motion
reviewed: 2026-11-02T00:00:00Z
depth: standard
files_reviewed: 40
files_reviewed_list:
  - package.json
  - scripts/bundle.ts
  - scripts/measure-bundle.ts
  - src/components/contact/ContactForm.astro
  - src/components/contact/ContactSection.astro
  - src/components/global/CursorFollower.astro
  - src/components/global/MotionToggle.astro
  - src/components/global/SiteHeader.astro
  - src/components/project/NextProjectTeaser.astro
  - src/components/project/ProjectContactBand.astro
  - src/components/project/ProjectIntro.astro
  - src/components/project/TextModule.astro
  - src/components/sections/FeaturedServices.astro
  - src/components/sections/Hero.astro
  - src/components/sections/LatestWork.astro
  - src/components/sections/ToolsRow.astro
  - src/components/ui/ButtonLink.astro
  - src/components/ui/ExternalTextLink.astro
  - src/components/ui/IconLink.astro
  - src/components/ui/ProjectCard.astro
  - src/components/ui/ProjectGrid.astro
  - src/components/ui/ServiceCard.astro
  - src/components/views/ProjectDetailView.astro
  - src/components/views/ProjectsView.astro
  - src/i18n/ui.en.ts
  - src/i18n/ui.es.ts
  - src/layouts/BaseLayout.astro
  - src/lib/motion/cursor.ts
  - src/lib/motion/effects.ts
  - src/lib/motion/events.ts
  - src/lib/motion/gate.ts
  - src/lib/motion/hero.ts
  - src/lib/motion/load-gsap.ts
  - src/lib/motion/magnetic.ts
  - src/lib/motion/reveal.ts
  - src/lib/motion/split-lines.ts
  - src/lib/motion/toggle.ts
  - src/lib/motion/tokens.ts
  - src/lib/ui/button-classes.ts
  - src/styles/global.css
findings:
  critical: 1
  warning: 6
  info: 6
  total: 13
status: issues_found
---

# Phase 6: Code Review Report

**Reviewed:** 2026-11-02
**Depth:** standard
**Files Reviewed:** 40
**Status:** issues_found

## Summary

I reviewed the Phase 6 motion layer (`git diff a3d6a4c..HEAD`): the three-state gate and toggle, IntersectionObserver reveals with the CSS failsafe, the CSS hero sequence, the hover mat, and the lazy GSAP effects (magnetic, SplitText lines, cursor follower).

The lifecycle side is mostly sound:
- Every listener uses an AbortController signal.
- Async GSAP continuations check `signal.aborted`.
- The shared loader forgets a rejected attempt.
- Cursor and magnetic sessions start and stop in place on `motion:change` and on media-query changes.
- No raw `innerHTML` was found. The two `set:html` sinks are a build-time constant and the Behance HTML, which is sanitized at sync time.
- localStorage access is inside try/catch, both in the inline gate and in the toggle write.

The problems are in geometry and timing:
- Magnetic hit-zones are measured while their ancestors are still transformed by the reveal and hero animations (CR-01).
- Some reveal paths can leave content armed and invisible with no way to show it (WR-01, WR-03, WR-04, WR-07).
- The card-focus rule catches the whole detail-page `<article>` (WR-02).
- Two clocks are measured from navigation start but compared against CSS animation time (WR-05).

## Critical Issues

### CR-01: Magnetic rects are measured while ancestors are still translated, so zones and centres stay offset after the reveal

**File:** `src/lib/motion/magnetic.ts:115-122`, `src/lib/motion/magnetic.ts:163-181`
**Issue:** `measure()` uses `getBoundingClientRect()`, which includes ancestor transforms, including the individual `translate` property. It runs once when GSAP resolves, then again only on `resize`, `load`, `fonts.ready` and body ResizeObserver callbacks. At that moment the magnetic targets usually sit inside elements that are still moved by motion:
- `LatestWork` "See all": inside `p[data-reveal="settle"]`, which has `translate: 0 20px` until it is revealed.
- The contact submit: inside the `[data-contact-column][data-reveal="settle"]` column.
- `ProjectContactBand` CTA: inside `div[data-reveal="settle"]`.
- "View on Behance": inside `p[data-reveal="settle"]`.
- The Hero CTA: inside `[data-hero-cta]`, which runs `hero-settle` (16px translate) from 280ms to 840ms.

When these elements are later revealed or finish animating, only the transform changes. Layout and body size stay the same, so nothing triggers a remeasure, and the stored rect stays about 20px (16px for the hero) below the real position. The result is predictable:
- With the pointer exactly at a link's visual centre, the computed offset is `(−20)·0.3 = −6`, the full link cap. The face is pulled to its limit while the pointer is centred.
- The activation zone reaches about 44px below the control but only about 4px above it.

This breaks the D-12 behaviour for every below-the-fold magnetic target. It is also nondeterministic for the hero CTA, depending on when the GSAP chunk resolves.
**Fix:** Measure layout boxes without transforms, or remeasure when the transforms settle. Simplest is a debounced remeasure on transition and animation end:
```ts
// inside the session, after measure():
const settle = (event: Event): void => {
  const t = event.target;
  if (t instanceof Element && (t.matches('[data-reveal]') || t.closest('[data-hero]'))) remeasureSoon();
};
doc.addEventListener('transitionend', settle, { passive: true, signal });
doc.addEventListener('animationend', settle, { passive: true, signal });
```
Alternatively, compute an untransformed page box by walking `offsetParent` and summing `offsetLeft` and `offsetTop`, so ancestor `translate` never enters the rect. Add a unit or e2e test that hovers a target's centre after its parent reveals and expects an offset of about 0.

## Warnings

### WR-01: Lines headings armed after GSAP loads skip the mount-time viewport pass, so they can stay invisible on the first screen

**File:** `src/lib/motion/reveal.ts:136-141`, `src/lib/motion/reveal.ts:222-234`
**Issue:** Under `'on'`, `lines` headings go into `waitingLines` instead of `toArm`, so `mountPass.observe()` never sees them. When GSAP resolves, `armWaiting()` arms them and observes them only with the trigger observer (`rootMargin: '0px 0px -12% 0px'`). A lines heading already on screen but inside the bottom 12% of the viewport is set to `data-reveal-armed`, which turns off the CSS failsafe. Its first observer entry is not intersecting, so it stays at `opacity: 0` until the user scrolls. If the page cannot scroll, or the user never scrolls, it stays hidden for good (`scrollend` never fires). This is the same bug the 06-10 mount pass fixed, still present for the lines path.
**Fix:** Give armed waiting lines the same one-shot pass. For example, create a fresh zero-margin observer in `armWaiting`:
```ts
const pass = deps.createObserver((entries) => {
  pass.disconnect();
  const batch = entries.filter((e) => e.isIntersecting && pending.has(e.target as HTMLElement))
    .map((e) => e.target as HTMLElement);
  if (batch.length > 0) revealBatch(batch);
}, { rootMargin: '0px', threshold: 0 });
// observe each newly armed el with both `observer` and `pass`; disconnect `pass` in cleanup
```

### WR-02: The focus rule's `closest('article')` matches the whole detail page and reveals every module at once

**File:** `src/lib/motion/reveal.ts:200-201` (with `src/components/views/ProjectDetailView.astro:20`)
**Issue:** The focusin handler is meant for project cards: "every part of its card". It uses `event.target.closest('article')`, but `ProjectDetailView` wraps the intro and the whole module stack in `<article aria-labelledby="project-title">`. On a detail page, the first Tab into the article (for example "View on Behance", or any link or embed button in a module) finishes every pending reveal in the article with `data-reveal-instant`. That includes all TextModules further down the page. Keyboard users lose the scroll reveals, and the result does not match the stated contract.
**Fix:** Scope the rule to the card marker that already exists:
```ts
const card = event.target.closest('[data-card]');
```

### WR-03: If `splitAndRise` throws, the heading stays armed and invisible

**File:** `src/lib/motion/reveal.ts:107-117`, `src/lib/motion/split-lines.ts:39-66`
**Issue:** `finish()` takes the element out of `pending` and unobserves it before calling `splitAndRise` inside `ctx.add`. `data-revealed` is set only inside SplitText's `onSplit`. If `SplitText.create` or `gsap.from` throws (an unexpected DOM shape, a GSAP plugin error), the heading stays in this state:
- it keeps `data-reveal-armed`, so the failsafe is off;
- it never gets `data-revealed`;
- it is no longer pending, so focus, `scrollend` and motion changes can't reach it.

It stays at `opacity: 0` for good. [Inference] I did not find a specific input that makes SplitText throw. The issue is the missing fallback for the "nothing may stay hidden" rule (D-05).
**Fix:**
```ts
try {
  ctx?.add(() => { splits.add(splitAndRise(el, mods)); });
  return;
} catch {
  // fall through to the CSS reveal
}
el.style.setProperty('--reveal-delay', `${String(delay)}ms`);
el.setAttribute('data-revealed', '');
```

### WR-04: Armed but unrevealed content prints blank

**File:** `src/styles/global.css` (reveal hidden-state rules, the `[data-motion='on'] [data-reveal=...]:not([data-revealed])` and `[data-motion='reduced'] [data-reveal]:not([data-revealed])` blocks)
**Issue:** The hidden start states apply in every media, including print. Content that is armed but not yet revealed has `opacity: 0` and `clip-path: inset(0 0 100% 0)` and no failsafe. This covers everything below the fold the visitor has not scrolled to: text modules, the contact band, the teaser and cards. Printing a project page, or saving it as PDF, drops all of it.
**Fix:**
```css
@media print {
  [data-reveal], [data-reveal] picture {
    opacity: 1 !important; translate: none !important;
    clip-path: none !important; scale: none !important; animation: none !important;
  }
}
```

### WR-05: Hero and reveal timing compare navigation-start time with CSS animation time

**File:** `src/lib/motion/hero.ts:27-34`, `src/lib/motion/reveal.ts:130-131`
**Issue:** `createHeroPlayed` marks the hero played at mount when `performance.now() >= 1000`. The CSS sequence starts at first style resolution, not at navigation start. On a slow load (first paint around 600ms, module scripts around 1000ms) the hero is still mid-animation. `data-hero-played` removes the `:not([data-hero-played])` keyframes, so the headline, lead, CTA and portrait snap to their end state partway through the sequence. The same assumption sits behind `FAILSAFE_MS` in `shownByFailsafe`. That direction is safe (it only reveals early), but it will be wrong for every soft navigation once Phase 7 adds `<ClientRouter />`, because `performance.now()` keeps growing across swaps.
**Fix:** Ask the elements instead of the clock. In `hero.ts`:
```ts
const running = [...pending].some((el) =>
  el.getAnimations().some((a) => a.playState === 'running' || a.playState === 'pending'));
if (!running) { markPlayed(); return undefined; }
```
Also handle `animationcancel` the same way as `animationend`. For Phase 7, record a per-mount start time instead of using `performance.now()` since navigation.

### WR-06: Above-the-fold `h1`s are hidden until the GSAP chunk arrives (up to 1.5s)

**File:** `src/components/views/ProjectsView.astro:23-28`, `src/components/project/ProjectIntro.astro:20-30`, `src/lib/motion/reveal.ts:136-141`
**Issue:** Under `'on'`, a `lines` heading has `opacity: 0` and waits for `loadGsap()`. Only the CSS failsafe at 1500ms shows it without GSAP. Both the Projects page title and the detail-page title are first-screen and likely LCP candidates. The phase already exempts the eager LCP cover from the shutter (`ProjectCard.astro:50-51`) and gives the hero a never-blank first frame (D-03), but the page `h1` gets no such exemption. On a slow or failed chunk fetch, the main heading is blank for up to 1.5s.
**Fix:** Use `data-reveal="settle"` for the page `h1`s, or render first-screen lines headings visible and split them without a hidden pre-state, matching the LCP exemption already given to the eager cover.

### WR-07: Reveals near the page end depend on `scrollend`, and armed elements have no failsafe

**File:** `src/lib/motion/reveal.ts:206-216`, `src/styles/global.css` (failsafe rule `:not([data-reveal-armed], [data-revealed])`)
**Issue:** After an element is armed, its only ways to become visible are:
- the trigger observer;
- focus;
- the `scrollend` bottom-of-page check.

An element whose top stays inside the bottom 12% of the viewport even at maximum scroll depends entirely on `scrollend`. [Unverified] `scrollend` support in Safari/WebKit was limited or missing for a long time; I did not confirm the current status. Where it is missing, such an element stays hidden for good. Today this depends on whether the footer is taller than 12% of the viewport, which nobody controls on purpose.
**Fix:** Also run the bottom-of-page check from a throttled `scroll` listener, or when `scrollend` is not supported (`'onscrollend' in win`). Or add a second observer with no bottom margin for elements within one viewport of the document end.

## Info

### IN-01: The toggle renders `aria-pressed="false"` before the script syncs it

**File:** `src/components/global/MotionToggle.astro:25-30`
**Issue:** The root becomes visible at first paint through `motion-js`, but `aria-pressed` and the icon only update once the deferred module runs. When the stored preference is `reduced`, the sparkles icon flashes and the pressed state is briefly wrong.
**Fix:** Have the inline gate also set `aria-pressed`, or hide the root until the toggle script adds a `data-ready` attribute.

### IN-02: Magnetic cleanup leaves an inline transform on every face

**File:** `src/lib/motion/magnetic.ts:191-195`
**Issue:** `gsapApi.set(faces, {x:0, y:0})` runs after `ctx.revert()`, so it writes `transform: translate(0px, 0px)` outside the context. The faces keep a permanent transform, which also creates a stacking context and a containing block, after any on→reduced switch. The revert already resets the faces.
**Fix:** Drop the `set`, or follow it with `gsap.set(faces, { clearProps: 'transform' })`.

### IN-03: The bundle check only sees external module scripts on two routes

**File:** `scripts/bundle.ts:15-25`, `scripts/measure-bundle.ts:9-12`
**Issue:** `parseEntryScripts` ignores inline `<script type="module">` bodies. Astro inlines small hoisted scripts, and an inline import of a GSAP-bearing chunk would not be detected. Only `/` and `/es/` are checked; projects and detail pages are not. The current build emits only external module scripts, so this risk is latent for now.
**Fix:** Parse imports from inline module script bodies as entry code, and add the projects and detail routes to `PAGES`.

### IN-04: The motion preference does not sync across tabs

**File:** `src/lib/motion/gate.ts:83-93`
**Issue:** Nothing listens for `storage` events, so toggling in one tab leaves the other open tabs in the old state until they reload.
**Fix:** In `syncMotionGate`, add `win.addEventListener('storage', (e) => { if (e.key === MOTION_STORAGE_KEY) resolveAndNotify(doc, win); })`.

### IN-05: Focus does not reveal a lines heading that is still waiting for GSAP

**File:** `src/lib/motion/reveal.ts:198-199`
**Issue:** `closest(PENDING)` matches a waiting heading, but `finish()` returns early because the heading is not in `pending`. No current lines heading contains a focusable element, so this is latent.
**Fix:** In the focusin handler, also call `showInstantly` for elements in `waitingLines`, and delete them from the set.

### IN-06: The Phase 6 copy is unconfirmed

**File:** `src/i18n/ui.en.ts:113`, `src/i18n/ui.es.ts:120`
**Issue:** `TODO(martina)` comments cover the cursor label, the toggle name and the OS hint in both locales.
**Fix:** Get the copy confirmed before release.

---

_Reviewed: 2026-11-02_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
