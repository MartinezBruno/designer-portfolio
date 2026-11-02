# Phase 7: Page Transitions & Smooth Scroll - Context

**Gathered:** 2026-11-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 7 makes moving through the site feel fluid. It adds animated page transitions, including a title morph from project cards into detail pages, inertial smooth scrolling on desktop, and gentle parallax on project imagery. It covers Home, Projects and project detail pages in EN and ES. After every navigation, focus moves to the new page and the title updates. Keyboard scrolling, anchor links (which move focus) and find-in-page keep working. An automated test navigates 10 times and must show constant listener and ScrollTrigger counts. Reduced motion and the Phase 6 toggle also turn off transitions, smooth scroll and parallax (MOTN-05, MOTN-06, MOTN-09).

**Not in this phase:** WebGL/displacement effects (MOTN-10, v2). The measured performance budget and the full axe/keyboard pass belong to Phase 8, but this phase must still keep the Phase 6 a11y/e2e suites green and record the bundle delta.

</domain>

<decisions>
## Implementation Decisions

### Transition style
- **D-01: Panel wipe.** A solid **ink (dark)** panel sweeps across the content area, then uncovers the new page. It extends the Phase 6 shutter/clip vocabulary. Accent stays reserved for interaction cues.
- **D-02: Card → detail uses a title morph.** When a visitor opens a project from a card (Home `compact`, Projects `full`, or `NextProjectTeaser`), the card's **title** morphs into the detail page's intro `<h1>` as a shared element (`view-transition-name` or equivalent). The cover image does **not** morph, because Phase 4 chose "no cover repeat" on the detail page (`ProjectIntro.astro:8`) and that stays. The panel wipe covers everything else. Each name must be unique per page, so only the clicked card's title gets it.
- **D-03: The EN/ES language switch uses the same wipe.** Every same-site navigation animates. `<html lang>`, the title, canonical and hreflang must be correct after the swap (Phase 1 SEO/i18n tests must still pass).
- **D-04: In `reduced` motion, navigation uses a short opacity crossfade**, with no panel movement and no morph. This matches Phase 6 D-14 ("reduced = opacity-only fades"). In `off` (no JS / no matchMedia), navigation is a plain full page load.
- **D-05: The header persists and only the content area wipes.** The site header (nav, EN/ES switcher, motion toggle) stays in place across navigations. The cursor follower persists too and must not duplicate. The motion state and the toggle's state survive navigations without flicker.

### Smooth scroll
- **D-06: Subtle inertia.** A light glide (Lenis lerp around 0.1, final value tuned in UI-SPEC/taste review). It should feel premium, never floaty or laggy for fast scrollers.
- **D-07: Smooth scroll only on desktop / fine pointer.** Touch devices keep native momentum scrolling (Lenis `syncTouch` off). Smooth scroll runs only in the `on` motion state. In `reduced` and `off`, scrolling is native (SC4).
- **D-08: Content anchors glide; the skip link jumps.** In-page anchors (for example a CTA to `#contact`) glide with Lenis and move focus to the target when the glide finishes (MOTN-06). The skip-to-content link always jumps instantly and moves focus. Keyboard scrolling (arrows, Page Up/Down, Space, Home/End) and find-in-page must keep working.

### Parallax
- **D-09: Parallax targets: project card covers** (Home and Projects), **the detail image stack**, and **the Next-project teaser thumbnail**. The **hero portrait does not** get parallax.
- **D-10: Gentle strength**, about 5–10% travel inside each image's clipped frame. Use transform only, with no layout shift (CLS) and minimal overscan, so her work is barely cropped.
- **D-11: Detail stack: per-image drift inside each frame, gentle.** Each image moves inside its own frame, so the seamless edge-to-edge stack never opens gaps (Phase 4 D-01). The user accepts that seams between consecutive images may shift slightly at gentle travel. **Verify visually with the taste skill on real projects (for example InstaBlogs and Cabrera's).** If a seam visibly breaks, remove stack parallax for that case rather than raising the travel.
- **D-12: Parallax runs on touch too**, driven by native scroll position (no Lenis on touch). It's active only in the `on` motion state and off in `reduced` and `off`.
- **D-13: Card parallax must coexist with the Phase 6 mat/zoom hover** on the same `<picture>` (Phase 6 D-06, and the "one transition declaration per layer" rule from 06-06). Use a separate transform layer or property so the hover scale, the reveal shutter and the parallax translate never fight.

### Arrival & back navigation
- **D-14: Focus goes to the new page's `<h1>` after navigation.** Use `tabindex="-1"`, with no visible ring on programmatic focus. Screen readers announce the page name right away, and the next Tab continues into the content. The document title updates (SC1). Pages without a visible h1 (if any) need a defined fallback. The planner checks the 404 and every view.
- **D-15: Back/forward restores the scroll position, and the transition still plays.** Lenis, the parallax positions and reveal state re-sync at the restored position, with no jump and no stale offsets.
- **D-16: Phase 6 entrance motion plays after the wipe.** When the wipe uncovers the new page, the hero sequence (Home) or heading line-split and the above-fold reveals play as they do on a fresh load. Total navigation-to-settled time should stay tight (target ≤ about 1.2 s). Phase 6 D-03 still applies: no preloader, and the LCP is not delayed by hidden content.

### Lifecycle (from requirements, restated as locked)
- **D-17: No leaks across navigations.** Every effect (reveals, splits, cursor, magnetic, marquee, toggle, Lenis, parallax, transition hooks) registers through the lifecycle registry and is torn down on `astro:before-swap` (or the equivalent for the chosen router). An automated e2e test navigates 10 times across Home, Projects and detail pages (and EN/ES) and asserts constant listener counts, ScrollTrigger counts (or equivalent parallax instance counts) and no duplicated animations (SC3, MOTN-09). Persisted elements (header, cursor) must not double-register.
- **D-18: Runtime motion-toggle changes take effect live.** Switching to `reduced` stops Lenis and parallax and swaps the transition to the crossfade without a reload. This extends Phase 6 D-17.

### Claude's Discretion
- **Router choice:** `<ClientRouter />` vs native cross-document view transitions (`@view-transition`). The ROADMAP flags this for research. Either works if D-01–D-05 and D-14–D-17 hold. D-05 (persistent header and cursor) and D-15 point toward ClientRouter with `transition:persist`, but research decides, considering Safari/Firefox support and fallbacks (`fallback="animate"` or equivalent) and the bundle.
- **Embeds (Figma iframes) under smooth scroll:** the user said "You decide". Research picks the fix (for example `data-lenis-prevent`, pausing near embeds, or relying on the existing click-to-load facade). The constraint is that the page must never feel stuck or swallow the wheel over an embed.
- **Parallax engine:** GSAP ScrollTrigger (already a dependency, lazy-loaded) vs a lightweight custom rAF/IO driver vs CSS `animation-timeline: view()`. Measure, and keep GSAP lazy (`scripts/measure-bundle.ts` must keep GSAP out of eager chunks).
- Wipe direction, duration, easing, and the exact Lenis lerp and parallax travel within the bounds above. These are tuned in UI-SPEC with the taste skill.
- How the `view-transition-name` gets assigned only to the clicked card's title, and how the morph behaves when the detail h1 is split by SplitText (Phase 6 D-01).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope & requirements
- `.planning/ROADMAP.md` §"Phase 7: Page Transitions & Smooth Scroll": goal, SC1–SC4, and the research flag (router choice, scroll restoration, Safari/Firefox, bundle)
- `.planning/REQUIREMENTS.md` §"Motion (MOTN)": MOTN-05, MOTN-06, MOTN-09 (and MOTN-10 as v2/out of scope)
- `.planning/PROJECT.md` §Constraints: accessibility is non-negotiable, measure performance, the taste skill is required for all visual/motion work, and the commit rules

### Stack & pitfalls (research)
- `CLAUDE.md` / `.planning/research/STACK.md` §"Motion architecture" and §"Alternatives Considered": Lenis 1.3 wiring (`lenis.on('scroll', ScrollTrigger.update)`, `gsap.ticker`, `anchors: true`, `respectReducedMotion`), ClientRouter lifecycle discipline, and native cross-document VT as the alternative
- `.planning/research/PITFALLS.md` §Pitfall 5 (GSAP + Lenis + ClientRouter lifecycle: double init, leaks, stale ScrollTriggers), §Pitfall 6 (smooth scroll breaking anchors, keyboard, focus, nested scroll), §Pitfall 7 (LCP/CLS/INP), §Pitfall 8 (reduced motion), §Pitfall 12 (i18n switcher/hreflang)
- `.planning/research/ARCHITECTURE.md` §"Pattern 5: Motion runtime = gate + lifecycle registry + declarative hooks"

### Prior phase decisions this phase touches
- `.planning/phases/06-scroll-interaction-motion/06-CONTEXT.md`: D-01 (line split), D-03 (hero sequence, no preloader), D-06 (card mat/zoom hover), D-09–D-13 (cursor/magnetic), D-14–D-18 (three motion states, toggle, persistence)
- `.planning/phases/06-scroll-interaction-motion/06-UI-SPEC.md`: Phase 6 motion vocabulary, tokens, easing (the Phase 7 UI-SPEC extends it)
- `.planning/phases/06-scroll-interaction-motion/06-VERIFICATION.md`: what Phase 6 verified, and the baselines to keep green
- `.planning/phases/04-project-detail-discovery/04-CONTEXT.md`: D-01 (seamless image stack, no gaps), D-14 (Next-project teaser), "no cover repeat" on the detail intro
- `.planning/phases/03-real-behance-work/03-CONTEXT.md`: D-19 (no hover-only info, single tab stop cards)
- `.planning/phases/01-*/` SEO/i18n decisions (01-04: buildSeo, hreflang, x-default): must stay correct after client-side swaps

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/motion/lifecycle.ts`: `createLifecycle` / `bindToAstro`. It already listens for `astro:page-load` (mount) and `astro:before-swap` (unmount), and its comment anticipates the Phase 7 router. It has idempotent mount/unmount, error isolation, and an `activeCleanups` counter that the leak test can use.
- `src/lib/motion/index.ts`: the page-scoped `lifecycle` singleton plus `syncMotionGate`. Under a client router this module runs once, so its "page-scoped" assumption must be revisited (persisted listeners vs per-page effects).
- `src/lib/motion/gate.ts`: `applyMotionGate` (the self-contained inline head script), the three states and the stored override. On a client-side swap, `html[data-motion]` must survive or be re-applied before the new content paints.
- `src/lib/motion/events.ts`: `onMotionChange` / `dispatchMotionChange` / `currentMotionState`. Lenis and parallax subscribe here for live toggling (D-18).
- `src/lib/motion/load-gsap.ts`: the lazy GSAP + SplitText loader. ScrollTrigger (if chosen) should join this lazy loader. `scripts/measure-bundle.ts` fails if GSAP lands in an eager chunk.
- `src/lib/motion/reveal.ts`: the IntersectionObserver + CSS reveal (not ScrollTrigger). Its observers must re-arm per page.
- `src/lib/motion/hero.ts`, `split-lines.ts`: the entrance sequence and line split that D-16 chains after the wipe.
- `src/lib/motion/cursor.ts`, `magnetic.ts`: the cursor follower that must persist without duplicating (D-05).
- `src/components/project/EmbedFacade.astro`: a click-to-load facade for embeds, relevant to the embed and smooth-scroll discretion item.
- `src/lib/ui/contact-form.ts:34`: already notes that a later ClientRouter navigation reuses elements. Turnstile and the form state must survive swaps.

### Established Patterns
- `html[data-motion]` defaults to `off` in the markup (`src/layouts/BaseLayout.astro:29`, which also sets `scroll-pt-24 sm:scroll-pt-20` scroll padding that anchor glides must respect).
- `motion-on:` / reduced Tailwind variants in `src/styles/global.css`. There is one transition declaration per layer per state, and the card `<picture data-card-mat>` already carries the clip-path, reveal scale and hover transitions (D-13).
- h1s live in `src/components/sections/Hero.astro:31`, `src/components/project/ProjectIntro.astro:20`, `src/components/views/ProjectsView.astro:23` and `src/components/views/NotFoundView.astro:28`. These are the focus targets for D-14 and the morph target for D-02.
- Typed EN/ES dictionaries (`src/i18n/en.ts`, `es.ts` with `satisfies`). Any new announcement strings must exist in both.

### Integration Points
- `src/layouts/BaseLayout.astro`: router mount point, persisted header and cursor, transition panel element.
- `src/components/global/SiteHeader.astro`, `LanguageSwitcher.astro`, `MotionToggle.astro`: the persisted shell (D-05) and the language-switch transition (D-03).
- `src/components/ui/ProjectCard.astro` and `src/components/project/NextProjectTeaser.astro`: morph source titles and parallax covers. `src/components/project/ImageModule.astro` / `CollectionModule.astro`: stack parallax.
- Tests: `tests/e2e/motion*.spec.ts`, `a11y.spec.ts` (with `settleReveals`/`settleMotion` helpers), `i18n.spec.ts`, `seo.spec.ts`, `layout.spec.ts`, and the keyboard-order test. Add the 10-navigation leak test (SC3), focus/title-after-navigation tests (SC1), anchor/keyboard/find-in-page checks (SC2), and reduced/toggle checks (SC4). Unit tests sit alongside `tests/unit/`.

</code_context>

<specifics>
## Specific Ideas

- The signature moment is opening a project: the card title flies into the detail heading while the ink panel sweeps.
- The ink panel echoes the Phase 6 shutter reveals, so the motion language stays one family.
- The inertia is "subtle premium", not "awards-site floaty".
- Seam integrity in the detail stack matters more than parallax drama. Drop the effect before cropping her compositions visibly.

</specifics>

<deferred>
## Deferred Ideas

None. The discussion stayed within phase scope.

</deferred>

---

*Phase: 07-page-transitions-smooth-scroll*
*Context gathered: 2026-11-02*
