# Phase 7: Page Transitions & Smooth Scroll - Research

**Researched:** 2026-11-02
**Domain:** Astro 7 `<ClientRouter />` + View Transitions API, Lenis smooth scroll, CSS scroll-driven parallax, focus management, lifecycle leak testing
**Confidence:** HIGH for router behaviour, bundle numbers and browser support (verified in installed source, a scratch build, Playwright probes and MDN browser-compat-data). MEDIUM for the exact wipe/morph choreography (one Chromium prototype only, so Safari and Firefox are not yet observed).

Label legend (user global rules): **[Verified]** = observed in this session by build, probe or source read. **[Documented]** = official docs or BCD. **[Inference]** = deduced from verified facts. **[Unverified]/[ASSUMED]** = not confirmed. **[Proposed]** = recommendation that has not been implemented yet.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Transition style
- **D-01: Panel wipe.** A solid **ink (dark)** panel sweeps across the content area, then uncovers the new page. It extends the Phase 6 shutter/clip vocabulary. Accent stays reserved for interaction cues.
- **D-02: Card → detail uses a title morph.** When a visitor opens a project from a card (Home `compact`, Projects `full`, or `NextProjectTeaser`), the card's **title** morphs into the detail page's intro `<h1>` as a shared element (`view-transition-name` or equivalent). The cover image does **not** morph, because Phase 4 chose "no cover repeat" on the detail page (`ProjectIntro.astro:8`) and that stays. The panel wipe covers everything else. Each name must be unique per page, so only the clicked card's title gets it.
- **D-03: The EN/ES language switch uses the same wipe.** Every same-site navigation animates. `<html lang>`, the title, canonical and hreflang must be correct after the swap (Phase 1 SEO/i18n tests must still pass).
- **D-04: In `reduced` motion, navigation uses a short opacity crossfade**, with no panel movement and no morph. This matches Phase 6 D-14 ("reduced = opacity-only fades"). In `off` (no JS / no matchMedia), navigation is a plain full page load.
- **D-05: The header persists and only the content area wipes.** The site header (nav, EN/ES switcher, motion toggle) stays in place across navigations. The cursor follower persists too and must not duplicate. The motion state and the toggle's state survive navigations without flicker.

#### Smooth scroll
- **D-06: Subtle inertia.** A light glide (Lenis lerp around 0.1, final value tuned in UI-SPEC/taste review). It should feel premium, never floaty or laggy for fast scrollers.
- **D-07: Smooth scroll only on desktop / fine pointer.** Touch devices keep native momentum scrolling (Lenis `syncTouch` off). Smooth scroll runs only in the `on` motion state. In `reduced` and `off`, scrolling is native (SC4).
- **D-08: Content anchors glide; the skip link jumps.** In-page anchors (for example a CTA to `#contact`) glide with Lenis and move focus to the target when the glide finishes (MOTN-06). The skip-to-content link always jumps instantly and moves focus. Keyboard scrolling (arrows, Page Up/Down, Space, Home/End) and find-in-page must keep working.

#### Parallax
- **D-09: Parallax targets: project card covers** (Home and Projects), **the detail image stack**, and **the Next-project teaser thumbnail**. The **hero portrait does not** get parallax.
- **D-10: Gentle strength**, about 5–10% travel inside each image's clipped frame. Use transform only, with no layout shift (CLS) and minimal overscan, so her work is barely cropped.
- **D-11: Detail stack: per-image drift inside each frame, gentle.** Each image moves inside its own frame, so the seamless edge-to-edge stack never opens gaps (Phase 4 D-01). The user accepts that seams between consecutive images may shift slightly at gentle travel. **Verify visually with the taste skill on real projects (for example InstaBlogs and Cabrera's).** If a seam visibly breaks, remove stack parallax for that case rather than raising the travel.
- **D-12: Parallax runs on touch too**, driven by native scroll position (no Lenis on touch). It's active only in the `on` motion state and off in `reduced` and `off`.
- **D-13: Card parallax must coexist with the Phase 6 mat/zoom hover** on the same `<picture>` (Phase 6 D-06, and the "one transition declaration per layer" rule from 06-06). Use a separate transform layer or property so the hover scale, the reveal shutter and the parallax translate never fight.

#### Arrival & back navigation
- **D-14: Focus goes to the new page's `<h1>` after navigation.** Use `tabindex="-1"`, with no visible ring on programmatic focus. Screen readers announce the page name right away, and the next Tab continues into the content. The document title updates (SC1). Pages without a visible h1 (if any) need a defined fallback. The planner checks the 404 and every view.
- **D-15: Back/forward restores the scroll position, and the transition still plays.** Lenis, the parallax positions and reveal state re-sync at the restored position, with no jump and no stale offsets.
- **D-16: Phase 6 entrance motion plays after the wipe.** When the wipe uncovers the new page, the hero sequence (Home) or heading line-split and the above-fold reveals play as they do on a fresh load. Total navigation-to-settled time should stay tight (target ≤ about 1.2 s). Phase 6 D-03 still applies: no preloader, and the LCP is not delayed by hidden content.

#### Lifecycle (from requirements, restated as locked)
- **D-17: No leaks across navigations.** Every effect (reveals, splits, cursor, magnetic, marquee, toggle, Lenis, parallax, transition hooks) registers through the lifecycle registry and is torn down on `astro:before-swap` (or the equivalent for the chosen router). An automated e2e test navigates 10 times across Home, Projects and detail pages (and EN/ES) and asserts constant listener counts, ScrollTrigger counts (or equivalent parallax instance counts) and no duplicated animations (SC3, MOTN-09). Persisted elements (header, cursor) must not double-register.
- **D-18: Runtime motion-toggle changes take effect live.** Switching to `reduced` stops Lenis and parallax and swaps the transition to the crossfade without a reload. This extends Phase 6 D-17.

### Claude's Discretion
- **Router choice:** `<ClientRouter />` vs native cross-document view transitions (`@view-transition`). The ROADMAP flags this for research. Either works if D-01–D-05 and D-14–D-17 hold. D-05 (persistent header and cursor) and D-15 point toward ClientRouter with `transition:persist`, but research decides, considering Safari/Firefox support and fallbacks (`fallback="animate"` or equivalent) and the bundle.
- **Embeds (Figma iframes) under smooth scroll:** the user said "You decide". Research picks the fix (for example `data-lenis-prevent`, pausing near embeds, or relying on the existing click-to-load facade). The constraint is that the page must never feel stuck or swallow the wheel over an embed.
- **Parallax engine:** GSAP ScrollTrigger (already a dependency, lazy-loaded) vs a lightweight custom rAF/IO driver vs CSS `animation-timeline: view()`. Measure, and keep GSAP lazy (`scripts/measure-bundle.ts` must keep GSAP out of eager chunks).
- Wipe direction, duration, easing, and the exact Lenis lerp and parallax travel within the bounds above. These are tuned in UI-SPEC with the taste skill.
- How the `view-transition-name` gets assigned only to the clicked card's title, and how the morph behaves when the detail h1 is split by SplitText (Phase 6 D-01).

### Deferred Ideas (OUT OF SCOPE)
None. The discussion stayed within phase scope. (Also out of phase per the CONTEXT boundary: WebGL/displacement effects (MOTN-10, v2), and the measured performance budget plus the full axe/keyboard pass, which belong to Phase 8.)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MOTN-05 | Visitor sees animated page transitions; after navigation focus moves to the new page and its title updates | `<ClientRouter />` with native same-document View Transitions, now supported by all three current engines (§Router decision). A wipe panel built as a named VT group was verified in a Chromium prototype (§Pattern 3). Title, `lang`, canonical and hreflang already update correctly after a soft swap [Verified probe]. Focus does **not** move by itself; it stays on `<body>` [Verified probe], so a focus manager is required (§Pattern 5). |
| MOTN-06 | Smooth/inertial scrolling with parallax, without breaking keyboard scrolling, anchor links (which move focus) or find-in-page | Lenis 1.3.27 lazy-loaded, page-scoped, fine pointer and `on` only (§Pattern 6). Do not use Lenis `anchors`, because it collides with ClientRouter's hash handling (§Pitfall 4). Parallax uses CSS scroll-driven animations (0 B JS), now in Chrome, Safari 26 and Firefox 159 (§Pattern 7). Anchor focus uses `tabindex="-1"` targets plus a scrollend focus hook. |
| MOTN-09 | Animations don't leak or duplicate across navigations (10× constant listener/trigger counts) | The existing lifecycle registry already holds steady per URL under ClientRouter: window 20 listeners, document 58 (/projects/), 54 (detail), 93 (home), cleanups constant and one cursor layer, across 10 navigations [Verified probe, after the data-motion fix]. Use the CDP `DOMDebugger.getEventListeners` method for the e2e (§Validation). |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Astro 7.4 + TypeScript `~6.0.3` strictest + Tailwind 4 via `@tailwindcss/vite`. pnpm only.
- **Dependencies: don't add until needed.** This phase needs exactly one new runtime dependency, `lenis@1.3.27`. Parallax needs none (CSS). The router is first-party (`astro:transitions`).
- `<ViewTransitions />` is removed. Use `<ClientRouter />` from `astro:transitions`.
- `@studio-freight/lenis` is the old name. Use `lenis`.
- Don't ship both GSAP and Motion. Keep GSAP lazy (`scripts/measure-bundle.ts` fails on "GreenSock" in eager chunks).
- Accessibility is non-negotiable. Motion must degrade with reduced motion and with the Phase 6 toggle.
- Performance: measure, don't guess. Record the bundle delta.
- Quality gates: no type, lint or test failures. Add tests when behaviour changes.
- **Taste skill required** for every visual/motion change (UI-SPEC, wipe, morph, lerp, parallax travel): run `lint.mjs` and `inspect.mjs`, and review screenshots.
- Tabler icons by explicit per-file import (not expected to be needed here).
- GSD commits are pre-approved: Conventional Commits, scope = plan/phase id, **no Claude/co-author attribution**. `/security-review` runs once per phase.
- Global rules: label unverified claims and never present inferences as fact.

## Summary

**Router decision: use `<ClientRouter />`, not native cross-document view transitions.** The evidence is browser support plus the locked decisions. MDN browser-compat-data (v8.1.8, 2026-11-02) shows same-document `document.startViewTransition` in Chrome 111, Safari 18 and **Firefox 144**. Cross-document `@view-transition` and `pagereveal` are in Chrome 126 and Safari 18.2 but are **still unsupported in Firefox** [Documented: BCD]. ClientRouter runs on top of the same-document API, so it animates in all three current engines. Native MPA transitions would leave Firefox with plain loads, and they cannot keep the header DOM, the cursor or Lenis alive (D-05). The usual argument against ClientRouter is lifecycle discipline. That risk is already mostly paid for: the Phase 1/6 lifecycle registry was built for this. In a scratch build of the real site, 10 ClientRouter navigations across Home, Projects, a detail page and EN/ES kept listener counts and cleanup counts constant per URL [Verified].

**Two real bugs appear the moment ClientRouter is added, and the plan must fix them first.** (1) Astro's swap copies **all `<html>` attributes from the incoming document**, and the markup default is `data-motion="off"`. The inline head gate is not re-run because ClientRouter deduplicates inline scripts by text. So after the first soft navigation the site silently drops to `off` motion [Verified probe: `after-swap: off`]. Fix: in `astro:before-swap`, copy the live `data-motion` onto `event.newDocument.documentElement`. (2) Focus stays on `<body>` after a swap [Verified], so D-14 needs an explicit focus manager. Astro's built-in route announcer does announce the new `document.title` via `aria-live="assertive"` [Verified source + probe].

**Parallax should be pure CSS scroll-driven animation, and Lenis should be lazy.** Scroll-driven animations (`animation-timeline: view()`) are in Chrome 115, Safari 26 and Firefox 159. Firefox 159 is the *current* release (2026-10-27) [Documented: BCD], so all three engines have them now. The CSS approach costs 0 B of JS, cannot leak, and follows the motion toggle live through the existing `motion-on:` variant. It uses the independent `translate` property, so it never fights the Phase 6 `scale`/`clip-path` hover (D-13). ScrollTrigger would add **17.5 KB gzip** lazily [Verified: esbuild + gzip -9] plus Lenis wiring and teardown. Measured costs: ClientRouter adds **+5,655 B gzip eager** (14,643 → 20,298 B on `/` and `/es/`) [Verified build], which breaks the Phase 6 eager ceiling of 14,680 B, so a new Phase 7 ceiling must be set. Lenis is **5,419 B gzip** and should load lazily, like GSAP.

**Primary recommendation:** Add `<ClientRouter fallback="swap" />` with no `transition:*` directives. Carry `data-motion` across swaps. Build the wipe and the title morph in hand-written VT CSS keyed off `html[data-motion]`. Delay page-scope lifecycle mount until the transition finishes. Lazy-load a page-scoped Lenis for fine pointers under `on`. Do parallax in CSS with a named `view-timeline` on each frame.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Soft navigation (fetch, swap, history, scroll restore, prefetch) | Browser / Client (`astro:transitions` router) | CDN / Static (prerendered HTML) | All pages stay prerendered. The router fetches same-origin static HTML. |
| Wipe and title morph animation | Browser / Client (CSS on VT pseudo-elements) | — | Native View Transitions. JS only assigns names and attributes. |
| Motion-state continuity across swaps | Browser / Client (before-swap hook) | Frontend build (inline head gate stays the first-load source) | The swap replaces `<html>` attributes, so the client must re-assert them. |
| Focus and announcement after navigation | Browser / Client | — | Pure DOM focus management. Astro's announcer already exists. |
| Smooth scroll | Browser / Client (Lenis, lazy) | — | Fine pointer and `on` only. Native elsewhere. |
| Parallax | Browser / Client (CSS scroll timelines) | — | Compositor-driven. No JS. |
| Leak detection | Test tier (Playwright + CDP) | — | `DOMDebugger.getEventListeners` counts real listeners. |

## Router Decision: ClientRouter vs native cross-document VT

| Criterion | `<ClientRouter />` | Native `@view-transition { navigation: auto }` |
|---|---|---|
| Chrome / Edge | Native VT (111+) [Documented] | Yes (126+) [Documented] |
| Safari | Native VT (18+) [Documented] | Yes (18.2+) [Documented] |
| **Firefox (current 159)** | **Native VT (144+)** [Documented] | **No** (`@view-transition` and `pagereveal` unsupported) [Documented: BCD 2026-11-02] |
| D-05 header/cursor persist | Header can be re-rendered under a static named VT group. The cursor can persist via `data-astro-transition-persist`. | Header can look static via a VT name, but the cursor, Lenis and JS state die on every load. |
| D-15 back/forward + transition | Router restores `history.state.scrollY` and animates traverse with `data-astro-transition="back"` [Verified source] | The browser restores scroll. bfcache restores interact with `pagereveal` [Unverified]. |
| D-14 focus to h1 | Manual (focus stays on body) [Verified] | Native load starts focus at the top. h1 focus would need same-site detection. |
| SC3 leak risk | Real. The lifecycle registry already handles it [Verified probe]. | Trivially none (fresh documents) |
| Eager JS | **+5,655 B gz** (router + prefetch) [Verified] | ≈0 B |
| Safari swipe-back | Router skips its animation when `hasUAVisualTransition` [Verified source] | Browser-handled |

**Verdict [Proposed, HIGH confidence]:** use ClientRouter. Firefox support for D-01–D-03 and the persistent-state decisions outweigh 5.6 KB, and the leak class of bugs is already contained by the lifecycle registry.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `astro:transitions` `<ClientRouter />` | ships with astro 7.4.0 (installed; 7.4.5 is the latest patch, and no upgrade is needed) | Soft navigation, VT orchestration, scroll restoration, route announcer, hover prefetch | First-party. Source read in `node_modules/astro/dist/transitions/*` [Verified] |
| View Transitions API (same-document) | Chrome 111 / Safari 18 / Firefox 144 | Wipe and morph rendering | Baseline 2025 (Oct 2025) [Documented: MDN + BCD] |
| CSS scroll-driven animations (`view-timeline`, `animation-timeline`) | Chrome 115 / Safari 26 / Firefox 159 | Parallax | 0 KB JS, compositor-driven [Documented: BCD] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lenis` | 1.3.27 (latest, published 2026-10-29) | Inertial wheel smoothing | Dynamic `import()` only when `(hover: hover) and (pointer: fine)` and `data-motion="on"` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS scroll timelines | GSAP ScrollTrigger (already installed) | +17,471 B gz lazy (gsap+ST 45,084 vs gsap 27,613) [Verified], plus `lenis.on('scroll', ScrollTrigger.update)` wiring, refresh-after-swap and kill-on-swap. Only worth it if Safari < 26 parallax matters. |
| CSS scroll timelines | Custom rAF/IntersectionObserver driver | ~1 KB eager JS, a main-thread `getBoundingClientRect` per frame, and its own teardown. No benefit now that all engines ship timelines. |
| Lenis | No smooth scroll | Violates D-06 |
| Lenis `anchors: true` | Router-native hash nav + focus hook | See Pitfall 4: Lenis anchors run alongside ClientRouter's own hash handling. |

**Installation:**
```bash
pnpm add lenis@1.3.27
```

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| lenis | npm | v1.x since 2023 (latest 1.3.27, published 2026-10-29) | not checked | github.com/darkroomengineering/lenis [Verified: `npm view repository.url`] | not run | Approved. Named in project CLAUDE.md/STACK.md. No `postinstall` script [Verified: `npm view lenis scripts.postinstall` empty]. Tag [ASSUMED] per protocol because slopcheck was not run, so the planner should keep a quick human-verify on the install task. |

**Packages removed:** none. **Packages flagged [SUS]:** none.

## Architecture Patterns

### System Architecture Diagram

```
 click <a> / popstate / form            (prefetch on hover: same-origin HTML cached)
        │
        ▼
 [ClientRouter click handler on document, bubble]
        │  same-page #hash? ──yes──▶ router moveToLocation → native fragment nav
        │                                   │  (temporary smooth scroll-behavior if 'on' & not skip link)
        │                                   └─▶ scrollend → anchor-focus hook focuses target
        ▼ no
 astro:before-preparation ──(our hook)── state 'off'? → preventDefault → full page load (D-04)
        │                               sourceElement in [data-card]? → name its title "project-title"
        ▼                               stop Lenis inertia
 fetch HTML → DOMParser newDocument
        ▼
 document.startViewTransition( update ) ── old snapshot captured (panel off-left, card title named)
        │
        ├─ astro:before-swap ──(our hooks)── copy html[data-motion] → newDocument   ← BUG FIX
        │                                    set html[data-vt] (holds hero/reveals), name #project-title,
        │                                    mark arriving h1 revealed if morphing; sync toggle aria-pressed
        │                                    page lifecycle.unmount() (reveals, Lenis, parallax-free, cursor? no)
        ├─ swap <html> attrs, <head>, <body>; persisted [data-astro-transition-persist] nodes moved
        ├─ scrollTo(0) or scrollTo(history.state.scrollY)   (traverse restores)
        └─ astro:after-swap
        ▼
 new snapshot (live) → VT animations: wipe group sweeps, title group morphs (z above wipe), header static
        ▼
 runScripts (new page-only module scripts register inits) → astro:page-load
        ▼
 await viewTransition.finished (capped) → remove html[data-vt] → page lifecycle.mount()
        │                                   (reveals, splits, hero marker, Lenis (lazy), marquee, contact…)
        └─ focus manager: h1[tabindex=-1].focus({preventScroll:true})  (or hash target)
```

### Recommended Project Structure
```
src/lib/motion/
├── lifecycle.ts        # + optional "ready" gate for mount (await VT finished)
├── index.ts            # page lifecycle + NEW app-scope hooks registered once
├── navigation.ts       # NEW: before-preparation/before-swap/after-swap hooks (motion carry, names, data-vt, 'off' opt-out)
├── nav-focus.ts        # NEW: focus h1 / hash target after soft nav; anchor-focus on scrollend
├── smooth-scroll.ts    # NEW: page-scoped Lenis factory (injected import for tests), live toggle
├── load-lenis.ts       # NEW: lazy loader (mirrors load-gsap.ts)
└── cursor.ts           # moves to app scope with a persisted layer host (D-05)
src/styles/global.css   # VT CSS (wipe, morph, reduced crossfade), parallax timelines, Lenis base rules
src/layouts/BaseLayout.astro  # <ClientRouter fallback="swap" />, wipe panel element, header VT name
scripts/measure-bundle.ts     # + Lenis marker ("lenisVersion") must stay out of eager chunks; new ceiling
```

### Pattern 1: Carry motion state across swaps (MUST land first)
**What:** `swapRootAttributes` removes every `<html>` attribute and copies the new document's [Verified: `swap-functions.js`]. The new document says `data-motion="off"`, and the inline gate script is not re-executed because `detectScriptExecuted` keys inline scripts by `textContent` [Verified]. Lenis classes on `<html>` are wiped the same way.
```ts
// Source: verified against node_modules/astro/dist/transitions/swap-functions.js + probe
document.addEventListener('astro:before-swap', (event) => {
  const state = document.documentElement.dataset['motion'];
  if (state) event.newDocument.documentElement.dataset['motion'] = state;
});
```
Register this **once** (app scope), not in the page lifecycle. With this patch the probe kept `motion: 'on'` across 10 navigations [Verified].

### Pattern 2: Two lifecycle scopes
- **App scope (mount once, never unmount):** motion-carry hook, navigation hooks, focus manager, anchor-focus hook, `syncMotionGate` (already once), and the **cursor follower** (D-05: its layer goes into an element carrying the raw attribute `data-astro-transition-persist="cursor"`, so the swap moves it instead of destroying it).
- **Page scope (existing `lifecycle` singleton):** reveals and splits, hero marker, magnetic, marquee, tooltips, contact form, embeds, **Lenis**. Unmount on `astro:before-swap` (already wired).
- How module scripts behave under ClientRouter [Verified source]: each bundled `<script>` runs **once per session**, the first time a page containing it is visited. `lifecycle.register()` keeps the init in a global list, so after Home is visited once the Hero init runs on every page and bails when `[data-hero]` is absent. That is correct as long as every init queries the fresh `doc` and returns `undefined` when its markup is missing (all current inits do).
- **Mount timing for D-16:** `astro:page-load` fires after the swap and after new scripts load, **while VT animations are still running** [Verified source: `updateCallbackDone.finally(runScripts → onPageLoad)`]. Gate `lifecycle.mount()` on `viewTransition.finished`, which is available as `event.viewTransition` on `astro:before-swap`, with a ~1.2 s cap. On the first load there is no transition, so mount stays immediate. CSS-driven hero keyframes start on DOM insertion, so hold them with `html[data-vt] [data-hero…] { animation-play-state: paused }` until the wipe is done. `hero.ts`'s `stillAnimating()` treats paused as running, which is correct.

### Pattern 3: Wipe panel as a named VT group (verified in Chromium)
**What:** A fixed, full-content-area ink element with `view-transition-name: wipe`. In the **old** state it sits off-screen on one side, and in the **new** state off-screen on the other. The UA group animation interpolates its transform, so the panel sweeps across [Verified: prototype screenshot at 50% shows the panel covering the viewport]. Content swaps underneath. The header gets its own name (`site-header`) with `animation: none` and a z-index above the wipe, so it stays put (D-05).
```css
/* [Proposed] — durations/easing from UI-SPEC */
[data-wipe-panel] { position: fixed; inset: 0; background: var(--color-ink); translate: -100% 0; pointer-events: none; }
html[data-motion='on'] [data-wipe-panel] { view-transition-name: wipe; }
html[data-wipe='out'] [data-wipe-panel] { translate: 100% 0; }            /* set on newDocument in before-swap, removed after finished */
html[data-astro-transition='back'] …                                      /* router sets direction attr: reverse the sweep */
::view-transition-group(wipe) { animation-duration: var(--t-wipe); animation-timing-function: var(--ease-travel); }
::view-transition-group(project-title) { z-index: 100; }                 /* title flies above the ink [Verified Chromium] */
html[data-motion='reduced']::view-transition-old(root),
html[data-motion='reduced']::view-transition-new(root) { animation-duration: 200ms; } /* D-04 crossfade, no names assigned */
```
**Why no `transition:*` directives:** any `transition:persist`/`transition:animate` directive makes Astro inject `viewtransitions.css`, which contains `@media (prefers-reduced-motion){ ::view-transition-*(*){animation:none!important} }` [Verified: built CSS contains it only after adding a directive]. That would kill the D-04 crossfade for OS-reduced users while toggle-reduced users still get it, an inconsistency. Use the **raw attribute** `data-astro-transition-persist="…"` where persistence is needed (the swap code keys on that attribute [Verified source]). [Inference] This is a private-ish attribute contract. Pin it with an e2e test.

### Pattern 4: Title morph (D-02)
- In `astro:before-preparation`, `event.sourceElement` is the clicked link [Verified source]. If it is inside `[data-card]`, set `style.viewTransitionName = 'project-title'` on a **`fit-content` inline-block span** inside the card title (not on the stretched `<a>`, whose `::after` covers the tile).
- In `astro:before-swap`, set the same name on `newDocument.getElementById('project-title')` (or its inner span), and mark that h1 `data-revealed data-reveal-instant` so the Phase 6 SplitText rise does not replay after the morph lands.
- Clear both names when `finished` resolves. A duplicate `view-transition-name` aborts the whole transition [Documented: VT spec behaviour; ASSUMED for exact error type], so assign names only to the clicked card.
- Back from detail to list (optional): sourceElement is null on popstate. Match the card by `href === from.pathname` in the new document.
- Font-size and aspect differences make the snapshot scale. Keep both named boxes `width: fit-content`, and verify with the taste skill. [Unverified in Safari/Firefox.]

### Pattern 5: Focus after navigation (D-14) and anchors (D-08)
- After a soft nav, focus stays on BODY [Verified]. In the app scope, on `astro:after-swap` record `navigated = true`. After the page is mounted, if `location.hash` resolves to an element, focus that. Otherwise focus `main h1` (fallback `#main`, which already has `tabindex="-1"`). Use `{ preventScroll: true }` so traverse-restored scroll is untouched.
- Give each h1 `tabindex="-1"` (Hero, ProjectsView, ProjectIntro, NotFoundView; every view has one [Verified grep]). CSS: `h1[tabindex='-1']:focus { outline: none }`. `:focus-visible` can match programmatic focus after keyboard activation, so suppress it on these non-interactive targets.
- Astro's announcer (`.astro-route-announcer`, `aria-live=assertive`, title after 60 ms) already exists [Verified]. Focusing the h1 also makes screen readers read it, so there may be a double announcement. Check with VoiceOver (open question).
- Skip link: ClientRouter intercepts `#main` but performs a native fragment navigation. Chromium still focused `MAIN#main` [Verified probe]. Keep it instant: never add smooth behaviour for it (mark it `data-skip-link`).
- Content anchors: router hash nav leaves focus on BODY for `#contact` [Verified probe]. Add `tabindex="-1"` on anchor-target sections. Then a capture-phase click hook (same-page hash, not the skip link, state `on`) sets `document.documentElement.style.scrollBehavior = 'smooth'` for that navigation only, waits for `scrollend` (Lenis re-dispatches a synthetic `scrollend` when its own glide ends [Verified source]), focuses the target with `preventScroll`, and restores `scrollBehavior`. **Never set `scroll-behavior: smooth` globally**: the router restores history with `scrollTo(x, y)`, which honours CSS smooth, so back navigation would visibly glide from 0 [Verified source: `moveToLocation`].

### Pattern 6: Lenis, page-scoped and lazy (D-06, D-07, D-18)
```ts
// [Proposed] options verified against lenis@1.3.27 dist/lenis.d.ts and constructor defaults
const lenis = new Lenis({
  lerp: 0.1,                  // UI-SPEC tunes
  smoothWheel: true,
  syncTouch: false,           // default false [Verified]
  anchors: false,             // see Pitfall 4
  stopInertiaOnNavigate: true,// reset on internal cross-path link click [Verified source]
  autoRaf: true,              // no GSAP ticker needed without ScrollTrigger; destroy() cancels the rAF [Verified]
});
```
- Create it on page mount only when `matchMedia('(hover: hover) and (pointer: fine)')` matches and the state is `on`. `destroy()` it on unmount and on `motion:change` to non-`on` (D-18). Re-create it on change back to `on`.
- Page-scoped is correct for D-15: the constructor sets `targetScroll = animatedScroll = actualScroll` [Verified source line 474], so a Lenis built after the router's scroll restore starts at the restored position. No `scrollTo(0)` hack is needed.
- `destroy()` removes its listeners and classes [Verified source], which keeps the CDP leak count stable.
- Copy the four `lenis.css` rules into `global.css` (`html.lenis{height:auto}`, `.lenis-stopped{overflow:clip}`, `[data-lenis-prevent]{overscroll-behavior:contain}`, `.lenis.lenis-smooth iframe{pointer-events:none}`) rather than importing CSS from the lazy chunk.
- **Embeds (discretion):** keep the existing click-to-load facade. Lenis's own `.lenis-smooth iframe { pointer-events:none }` rule means a smooth glide never stalls over an iframe. When idle, a loaded Figma iframe receives the wheel natively, as it would without Lenis. No `data-lenis-prevent` is needed. [Inference] Verify manually on a detail page with an embed.

### Pattern 7: CSS parallax with named view timelines (D-09–D-13)
```css
/* [Proposed]; mechanism verified in Chromium prototype */
@supports (animation-timeline: view()) {
  [data-motion='on'] [data-parallax-frame] { view-timeline-name: --px; }
  [data-motion='on'] [data-parallax-frame] [data-parallax] {
    animation: parallax linear both;
    animation-timeline: --px;
  }
}
@keyframes parallax { from { translate: 0 calc(var(--px-travel) * -1); } to { translate: 0 var(--px-travel); } }
/* overscan: the image is taller than its frame by 2× travel, offset by -travel (no CLS: the frame keeps its aspect-ratio box) */
```
- **Pitfall verified:** `animation-timeline: view()` on an image inside an `overflow: hidden` frame **stays stuck**, because `overflow:hidden` makes the frame the scroll container. Measured `translate` was constant at every scroll position [Verified]. A named `view-timeline` on the frame, or `overflow: clip`, works [Verified].
- Animate the **`translate` property** on the `<img>`. Phase 6 uses `scale` on the img (hover) and `scale` + `clip-path` on the `<picture>` mat [Verified global.css]. Individual transform properties compose, so nothing fights (D-13).
- The toggle and reduced motion are handled by the `[data-motion='on']` selector, live, with no JS (D-12, D-18). Touch works natively (D-12). Lenis scrolls the real document, so timelines follow it [Inference].
- Detail stack (D-11): images are natural-height `h-auto w-full` with no frame today [Verified]. Wrap each image in a frame with `overflow: clip` and give the image a small overscan. That crops a little, which D-11 accepts. Check seams with the taste skill on InstaBlogs and Cabrera's, and drop parallax per module if a seam breaks.
- The LCP (eager) card and the hero portrait stay excluded.

### Anti-Patterns to Avoid
- **`transition:persist` / `transition:animate` directives:** they inject OS-only `animation:none!important` (Pattern 3).
- **`transition:persist` on the header:** header content is locale- and page-specific (nav labels in ES, the language switcher href points at the *current* page's alternate, `aria-current`). Persisting it would ship stale links and English labels after EN→ES. Re-render it and keep it visually static with a VT name.
- **A global `scroll-behavior: smooth`:** it breaks the router's history scroll restore (Pattern 5).
- **Lenis `anchors: true` with ClientRouter** (Pitfall 4).
- **Hot-wiring ScrollTrigger** for parallax that CSS already does.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SPA navigation, history, scroll restore, prefetch | Custom fetch/swap router | `<ClientRouter />` | It handles traverse direction, Safari swipe (`hasUAVisualTransition`), abort races, script dedup and the announcer [Verified source] |
| Screenshot cross-fade/morph | DOM cloning + FLIP | View Transitions pseudo-elements | Compositor snapshots, now in all engines |
| Parallax driver | rAF + getBoundingClientRect loop | CSS `view-timeline` | 0 JS, no leak surface |
| Wheel smoothing | Custom wheel lerp | Lenis | Edge cases: trackpads, nested scroll, `scrollend`, iframes |
| Leak counting | Monkeypatched addEventListener | CDP `DOMDebugger.getEventListeners` | It sees listeners added before patches and handles AbortSignal removal [Verified probe] |

## Common Pitfalls

### Pitfall 1: Motion state silently resets to `off` after the first soft navigation
**What goes wrong:** All Phase 6 motion stops after one click. **Why:** the `<html>` attribute swap plus the inline gate not re-running [Verified]. **Avoid:** Pattern 1, landed before anything else. **Warning sign:** `astro:after-swap` sees `data-motion="off"`.

### Pitfall 2: Toggle icon flicker after swap
**What goes wrong:** `MotionToggle` markup defaults to `aria-pressed="false"`, and its icon is CSS-keyed on `aria-pressed` [Verified]. Its init runs at page-load, *after* the new VT snapshot is captured, so a `reduced` user sees the wrong icon briefly. **Avoid:** in before-swap, set `aria-pressed` on the new document's `[data-motion-toggle]` from the current state.

### Pitfall 3: Entrance motion runs hidden under the panel
**What goes wrong:** the new VT snapshot is live, so CSS hero keyframes and reveal transitions start on insertion and finish under the ink. **Avoid:** `html[data-vt]` hold plus mount after `finished` (Pattern 2). Cap the wait so a skipped or aborted transition never strands content. The Phase 6 1.5 s failsafe still applies.

### Pitfall 4: Lenis `anchors` vs ClientRouter hash handling
**What goes wrong:** ClientRouter's document-level click handler `preventDefault`s same-page hash links and performs `location.href = to.href`, a native jump [Verified source]. Lenis's `onClick` sits on `window` and does not check `defaultPrevented` [Verified source], so it also starts a glide from the old animated position. [Inference] The result is a jump-then-glide flicker. **Avoid:** `anchors: false` plus Pattern 5. Don't hand-roll `pushState` for hashes either: router popstate logic relies on its own `history.state.index` and `originalLocation` [Verified source].

### Pitfall 5: Parallax stuck inside `overflow: hidden`
See Pattern 7 [Verified]. The card and teaser frames currently use `overflow-hidden` [Verified grep].

### Pitfall 6: Leak test false positives on the first visit
**What goes wrong:** the first visit to Home showed 103 document listeners. Later visits to Home/ES Home showed 93. The window count went 7 → 20 after the first navigation, then stayed flat [Verified probe]. One-time script loads (router listeners, the Turnstile script `load`/`error`) explain this [Inference]. **Avoid:** do one warm-up cycle, then assert equality **per URL** across revisits, not across different pages.

### Pitfall 7: Bundle ceiling breach
ClientRouter alone is +5,655 B gz eager [Verified], and Phase 6 left 37 B of headroom. Set a Phase 7 eager ceiling explicitly (open question) and add a Lenis marker (`lenisVersion`, present in the minified bundle [Verified]) to `measure-bundle.ts` so Lenis stays lazy.

### Pitfall 8: Duplicate `view-transition-name`
Two elements with the same name abort the transition [ASSUMED: spec behaviour, exact error not verified here]. Only the clicked card's title gets `project-title`. Clear names on `finished`, including when a newer navigation aborts the old one.

### Pitfall 9: `off` state still soft-navigates
With JS on but no `matchMedia` (state `off`), ClientRouter would still intercept. **Avoid:** `preventDefault()` in `astro:before-preparation` when the state is `off`. The router then does `location.href = to.href`, a full load [Verified source] (D-04).

### Pitfall 10: Turnstile script element removed on swap
`loadTurnstileScript` appends to `<head>` [Verified]. `swapHeadElements` removes head nodes absent from the new document [Verified source]. The `win.turnstile` early return covers the loaded case, and the contact cleanup already calls `api.remove(widgetId)` [Verified]. A navigation *while* the script is loading is an edge case [Inference: the script still executes]. Cover it with one e2e: Home → Projects → Home, and the form still renders the widget.

## Code Examples

### Leak counting via CDP (verified working in this session)
```ts
// Source: verified probe against the scratch build (Chromium 1248)
const cdp = await context.newCDPSession(page);
async function listenerCounts() {
  const out: Record<string, number> = {};
  for (const expr of ['window', 'document'] as const) {
    const { result } = await cdp.send('Runtime.evaluate', { expression: expr });
    const { listeners } = await cdp.send('DOMDebugger.getEventListeners', {
      objectId: result.objectId!, depth: expr === 'document' ? -1 : 0, pierce: true,
    });
    out[expr] = listeners.length;
  }
  return out;
}
```

### Opt out of soft navigation in `off`
```ts
// Source: router.js — prepEvent.defaultPrevented → location.href = to.href
document.addEventListener('astro:before-preparation', (event) => {
  if (currentMotionState(document) === 'off') event.preventDefault();
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `<ViewTransitions />` | `<ClientRouter />` | Astro 6 removal (per STACK.md) | Use ClientRouter |
| VT = Chromium only | Same-doc VT in all engines | Firefox 144 (2025-10-14) [Documented] | ClientRouter animates everywhere |
| Scroll timelines = Chromium only | Chrome 115, Safari 26, Firefox 159 | Firefox 159 = 2026-10-27 [Documented: BCD] | CSS parallax viable. Gate with `@supports`. |
| PITFALLS.md Pitfall 5 "prefer native cross-doc VT" | Superseded by this research | Firefox still lacks cross-doc VT [Documented] | Use ClientRouter |
| PITFALLS.md Pitfall 6 "Lenis anchors: { offset }" | Superseded | Conflicts with router hash nav [Verified source] | Use Pattern 5 |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Wipe-group + z-indexed title morph behaves the same in Safari 18+/26 and Firefox 144+ as in Chromium | Pattern 3/4 | The choreography needs per-engine CSS tweaks. Mitigate with a Wave 0 spike and manual UAT in Safari and Firefox. |
| A2 | The raw `data-astro-transition-persist` attribute remains supported (not a documented API) | Pattern 2/3 | The cursor would stop persisting after an Astro upgrade. Pin with an e2e test. |
| A3 | Native fragment navigation focuses `tabindex="-1"` targets in Safari/Firefox as it does in Chromium | Pattern 5 | Anchor focus would rely solely on the scrollend hook. Keep the explicit `focus()`. |
| A4 | Duplicate VT names abort the transition | Pitfall 8 | Low. The guard is cheap either way. |
| A5 | Figma iframes don't trap the page when Lenis is idle | Pattern 6 | Add `data-lenis-prevent`-style handling or pause Lenis over activated embeds. |
| A6 | `lenis` package legitimacy (slopcheck not run) | Audit | Low (named in CLAUDE.md, source repo verified, no postinstall). Human-verify at install. |
| A7 | Lenis-driven scroll updates CSS view timelines smoothly | Pattern 7 | Visible stepping. Check in taste review. |

## Open Questions

1. **New eager JS ceiling for Phase 7.** Known: the baseline is 14,643 B. The router adds 5,655 B, and glue code is expected at ~1–2 KB [Inference]. Recommendation: the planner proposes ≈ 22,000 B gz (eager), with Lenis and GSAP lazy, and asks the user to confirm. QUAL-01's ~100 KB homepage target leaves room.
2. **Double screen-reader announcement** (Astro's assertive title announcer plus h1 focus). Recommendation: keep both by default and test with VoiceOver in UAT. If it is noisy, hide `.astro-route-announcer` with `display:none` so the h1 focus alone announces the page (D-14 wording supports h1 focus).
3. **Hash target on cross-page navigation** (for example `/projects/` → `/#contact`): focus the hash target instead of the h1, and land instantly rather than gliding after the wipe. Recommendation: yes. This is a planner/UI-SPEC call.
4. **Should the wipe play on the EN/ES switch when the visitor is on the same logical page?** D-03 says yes. No conflict was found. The SEO head updates correctly [Verified].
5. **Cross-browser e2e:** only Chromium is installed for Playwright [Verified]. Recommendation: keep CI on Chromium, and add manual UAT steps for Safari 26 and Firefox 159 (wipe, morph, parallax, Lenis).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | build | ✓ | 24.15.0 | — |
| pnpm | install | ✓ | 12.14 (used offline in scratch) | — |
| Astro ClientRouter | MOTN-05 | ✓ (bundled) | astro 7.4.0 | — |
| lenis | MOTN-06 | ✗ (not installed) | 1.3.27 on npm | Install in this phase |
| Playwright Chromium | e2e | ✓ | chromium-1248 | — |
| Playwright WebKit/Firefox | cross-engine e2e | ✗ | — | Manual UAT in Safari and Firefox |
| Chrome DevTools Protocol | leak test | ✓ (Chromium) | — | — |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.5 (happy-dom 21) + Playwright 1.64.1 (Chromium) + @axe-core/playwright 4.14 |
| Config file | `vitest.config.ts`, `playwright.config.ts` (port 4400, `astro preview`) |
| Quick run command | `pnpm vitest run tests/unit/<file>.test.ts` |
| E2E single file | `pnpm build && pnpm exec playwright test tests/e2e/<file>.spec.ts` (server build ≈ 50 s) |
| Full suite command | `pnpm verify` (lint, unit, build + e2e, secrets) plus `pnpm measure:bundle` |

### Phase Requirements → Test Map
| Req / SC | Behavior | Test Type | Automated Command | File Exists? |
|----------|----------|-----------|-------------------|-------------|
| MOTN-05 / SC1 | `data-motion` survives swap (on and reduced) | unit + e2e | `vitest run tests/unit/motion-navigation.test.ts`; e2e asserts `html[data-motion]` after 3 navigations | ❌ Wave 0 |
| MOTN-05 / SC1 | A VT runs on navigation under `on` (wrap `document.startViewTransition` in `addInitScript` and count calls; mid-flight `getAnimations()` includes `::view-transition-group(wipe)`) | e2e | `playwright test tests/e2e/transitions.spec.ts` | ❌ Wave 0 |
| MOTN-05 / SC1 | Focus on new h1 (`document.activeElement` is `main h1`), title updated, `lang`/canonical/hreflang correct after EN/ES switch | e2e | same file | ❌ Wave 0 |
| MOTN-05 | Card click names exactly one element `project-title` in old and new state, and the h1 does not replay the line rise | unit (fake events) + e2e | `tests/unit/motion-navigation.test.ts` | ❌ Wave 0 |
| MOTN-06 / SC2 | Lenis active (`html.lenis`) only for fine pointer + `on`; absent on touch emulation, reduced and off | e2e | `playwright test tests/e2e/smooth-scroll.spec.ts` | ❌ Wave 0 |
| MOTN-06 / SC2 | PageDown/Space/End change `scrollY`; Tab order unchanged | e2e | same | ❌ Wave 0 |
| MOTN-06 / SC2 | `#contact` link: URL hash set, `activeElement` is the target after scrollend; skip link focuses `#main` instantly | e2e (+ existing `i18n.spec.ts` skip test) | same | ❌ Wave 0 |
| MOTN-06 / SC2 | Find-in-page proxy: Chromium's non-standard `window.find('…')` scrolls to the match and Lenis does not snap back (`scrollY` stable 500 ms later). Real find bar is manual. | e2e + manual | same | ❌ Wave 0 |
| MOTN-06 | Parallax: computed `translate` on `[data-parallax]` changes between two scroll positions under `on`, and is `none` under reduced/off and after a live toggle | e2e | `playwright test tests/e2e/parallax.spec.ts` | ❌ Wave 0 |
| MOTN-06 / D-15 | Back restores `scrollY` (±2 px) and reveals in view are revealed; Lenis present | e2e | `transitions.spec.ts` | ❌ Wave 0 |
| MOTN-09 / SC3 | 10 navigations (Home, Projects, detail, ES Home, ES Projects…) after a warm-up cycle: CDP window/document listener counts equal per URL; `[data-cursor-layer]` count is 1; `.split-line-mask` 0 after settle; `document.getAnimations()` count equal per URL; parallax ViewTimeline animation count equals `[data-parallax]` count | e2e | `playwright test tests/e2e/navigation-leaks.spec.ts` | ❌ Wave 0 |
| SC4 | `reducedMotion: 'reduce'` and the toggle: no `wipe`/`project-title` pseudo animations (root crossfade only), no `html.lenis`, parallax `none`; toggle switch live without reload stops Lenis | e2e | `playwright test tests/e2e/transitions-reduced.spec.ts` | ❌ Wave 0 |
| SC4 / D-04 | `off` (stub `matchMedia` undefined via initScript) gives a full page load (navigation entry type `navigate`, `performance.getEntriesByType('navigation')` changes) | e2e | same | ❌ Wave 0 |
| Budget | eager ≤ new ceiling; no "GreenSock" or "lenisVersion" in eager chunks | script | `pnpm build && pnpm measure:bundle` | ✅ (extend) |
| Regression | Phase 1–6 suites (seo, i18n, a11y with `settleMotion`, motion-*) still green under the router | e2e | `pnpm test:e2e` | ✅ |

### Sampling Rate
- **Per task commit:** the touched unit file(s) via `pnpm vitest run …`, plus `pnpm check`.
- **Per wave merge:** `pnpm build && pnpm exec playwright test tests/e2e/{transitions,smooth-scroll,parallax,navigation-leaks,transitions-reduced}.spec.ts` plus `pnpm measure:bundle`.
- **Phase gate:** `pnpm verify` green, the taste skill `lint.mjs`/`inspect.mjs` plus screenshots reviewed, and manual Safari/Firefox UAT before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `tests/unit/motion-navigation.test.ts`: before-swap carry, toggle aria sync, title naming/clearing, `off` opt-out (fake `astro:*` events with a `newDocument` from `DOMParser`)
- [ ] `tests/unit/nav-focus.test.ts`: h1/hash/main fallback selection, no focus on first load
- [ ] `tests/unit/smooth-scroll.test.ts`: injected Lenis factory, created only for fine + on, destroyed on unmount and on `motion:change`
- [ ] `tests/e2e/helpers/navigation.ts`: `softNavigate(page, href)` (click a real link, then wait for `astro:page-load` + VT finished), CDP listener counter
- [ ] e2e specs listed above
- [ ] `settleMotion` helper: also wait for `document.documentElement` to lose `data-vt` / `data-astro-transition`
- [ ] Wave 0 **spike** (scratch, deleted after): wipe + morph CSS in the real layout, screenshots in Chromium, and manual Safari/Firefox check (A1)

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | minimal | VT names and attributes are constants. Never derive `view-transition-name` or selectors from URL/hash text without `CSS.escape` / `getElementById` (hash → `document.getElementById(decodeURIComponent(hash.slice(1)))`, never `querySelector(hash)`). |
| V6 Cryptography | no | — |
| V14 Config | yes | Router fetches same-origin only (it falls back to a full load cross-origin [Verified source]). Prefetch is same-origin HTML. No new secrets. |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Selector injection via `location.hash` in focus code | Tampering | `getElementById` with a decoded id, try/catch on decode |
| Contact form intercepted by router as a soft POST | Tampering/DoS | The form handler already `preventDefault`s [Verified]. Optionally add `data-astro-reload` on `<form>` to opt it out explicitly. |
| Stale persisted DOM leaking previous page data (cursor label) | Info disclosure | Cursor label is build-time, locale-specific: re-sync the label text on swap when the locale changes [Inference: the persisted layer would otherwise keep the old locale's "View" label] |

## Sources

### Primary (HIGH confidence)
- `node_modules/astro/dist/transitions/{router,swap-functions,events}.js`, `astro/components/ClientRouter.astro`, `viewtransitions.css`, `dist/core/compile/compile.js` (astro 7.4.0): swap semantics, script dedup, focus, announcer, scroll restore, prefetch default, hash handling, `hasUAVisualTransition`, when VT CSS is injected
- `lenis@1.3.27` `dist/lenis.mjs`, `lenis.d.ts`, `lenis.css`: options, defaults, `destroy`, anchors click logic, `scrollend` re-dispatch, iframe rule
- MDN browser-compat-data 8.1.8 (unpkg, timestamp 2026-11-02): `Document.startViewTransition`, `@view-transition`, `pagereveal`, `animation-timeline(.view)`, `view-transition-class`, `ViewTransition.types`, Firefox/Safari release dates
- Scratch builds + Playwright probes (this session): bundle deltas, data-motion reset, focus, title/lang/SEO after swap, 10-navigation listener counts, skip link, hash focus, back scroll restore, overflow-hidden timeline bug, VT wipe/title z-order screenshot
- https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition (Baseline 2025, Oct 2025)
- https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline

### Secondary (MEDIUM confidence)
- https://developer.chrome.com/docs/web-platform/view-transitions/cross-document (Firefox: cross-doc unsupported, consistent with BCD)
- https://developer.chrome.com/docs/css-ui/scroll-driven-animations (Safari 26 support)

### Tertiary (LOW confidence)
- https://www.buildmvpfast.com/blog/css-scroll-driven-animations-replace-js-2026 (Firefox flag history; superseded by BCD showing 159)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH (versions from the registry, sizes measured, support from BCD)
- Architecture: HIGH for router/lifecycle (source + probes). MEDIUM for wipe/morph choreography (Chromium-only prototype).
- Pitfalls: HIGH (most reproduced in probes)

**Research date:** 2026-11-02
**Valid until:** 2026-12-02 (browser support is moving fast; recheck BCD for Firefox/Safari VT changes)
