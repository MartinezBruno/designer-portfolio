# Phase 6: Scroll & Interaction Motion - Context

**Gathered:** 2026-10-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 6 adds scroll reveals, masked line-split headlines, a short hero load sequence, a custom cursor follower with magnetic buttons, a shared hover/focus effect for project imagery, a reduced-motion fallback that uses opacity fades only, and an on-page motion toggle in the header. It covers Home, Projects and project detail pages in EN and ES. All effects register through the Phase 1 lifecycle registry, and the homepage JS bundle size is measured and recorded (MOTN-01, 02, 03, 04, 07, 08).

**Not in this phase (Phase 7):** page transitions, smooth/inertial scroll (Lenis), parallax (including the detail-page image stack), and the 10-navigation leak test. WebGL distortion (MOTN-10) is v2.

</domain>

<decisions>
## Implementation Decisions

### Reveals & text splits
- **D-01: Headlines split by line behind a mask.** Each line slides up from behind an overflow mask, with no word or character splitting. Screen readers must get the intact heading text (`aria-label` on the heading or `aria-hidden` split spans, whichever SplitText/research recommends). This must survive long Spanish headings and re-wrapping on resize.
- **D-02: Reveals play once.** Each element animates the first time it enters the viewport and then stays put. Nothing re-hides or replays on scroll-back.
- **D-03: The hero plays a short sequence on load, not on scroll.** The headline line split, a portrait unmask and the CTA run within about 1 s and start immediately. The content is already rendered: no preloader, no blank frame, and LCP is not delayed. Never hide the hero with JS-dependent CSS that would stay hidden if the script fails.
- **D-04: [AMENDS Phase 4 D-04] Detail pages get reveals in Phase 6.** The intro band title gets the line split, and text modules, the metadata row, the contact band and the Next-project teaser get reveals. The seamless module image stack stays static, so no gaps flash between edge-to-edge images (Phase 4 D-01). Its parallax is Phase 7. Update the Phase 4 D-04 wording or reference in the plan.
- **D-05: Content stays visible without JS.** The initial hidden state may only apply under `html[data-motion]` states set by the gate. With JS disabled or failing, everything is visible (SC1, MOTN-01).

### Project imagery hover
- **D-06: The effect is a slow zoom plus an inset clip.** The cover scales to about 1.05 while its frame clips inward slightly, like a mat. Use transform and clip-path only, with no layout shift.
- **D-07: Keyboard focus gets the same effect.** `focus-visible` on the stretched title link triggers the image effect, for example through `group-has-[:focus-visible]`. The existing underline and focus outline stay.
- **D-08: One shared effect for all project imagery links**: ProjectCard `compact` (Home), ProjectCard `full` (Projects) and `NextProjectTeaser` (detail). No information exists only on hover (Phase 3 D-19).

### Cursor & magnetic
- **D-09: The cursor is a small accent dot with a contextual label.** It follows the pointer with a slight lag (GSAP `quickTo`). Over project imagery links it grows into a pill reading **"View" / "Ver"**, a localized dictionary key. The cursor element is decorative (`aria-hidden`, `pointer-events: none`).
- **D-10: Only one label ("View" on projects).** Over any other link or button the dot just grows slightly, with no text.
- **D-11: The native cursor stays.** The custom cursor is an extra follower, and `cursor: none` is never set.
- **D-12: Magnetic elements are the primary pill CTAs and the social icon links.** That includes the hero CTA, contact submit, "See all projects", "View on Behance" and the footer/contact social icons. Nav links, inline text links and the language/motion toggles stay still.
- **D-13: The cursor and magnetic effects are gated** by `(hover: hover) and (pointer: fine)` **and** full motion (`on`). On touch devices and in reduced/off states the native behavior is unchanged and no follower element is shown (SC2).

### Motion states & toggle
- **D-14: The gate gets three states: `on`, `reduced`, `off`.**
  - `on`: full motion.
  - `reduced`: opacity-only fades for reveals and splits. No translation, scaling, clip wipes, cursor, magnetic pull, or card zoom (MOTN-07). The marquee stays static, as it is today under reduced motion.
  - `off`: everything static and visible. This is the no-JS / no-matchMedia default, unchanged from Phase 1.
  - OS `prefers-reduced-motion: reduce` resolves to `reduced`.
  - Update `applyMotionGate`, the `motion-on:` variant users (the marquee currently treats anything other than `on` as static), `syncMotionGate`, and the unit/e2e tests (`tests/unit/motion-gate.test.ts`, `tests/e2e/motion.spec.ts`). Exact variant naming is the planner's call.
- **D-15: Toggle "off" gives the same experience as OS reduced motion.** Toggle off resolves to `reduced`, not fully static, so there is one fallback experience to build and test.
- **D-16: The toggle sits in the header next to the EN/ES switcher on every page.** It is a small icon button with an accessible name and `aria-pressed`, localized EN/ES, and it fits the mobile header. Icon and wording come from the UI-SPEC (Tabler icon, explicit import).
- **D-17: The toggle choice persists in `localStorage`, and the blocking head gate reads it before paint**, so later pages never flash motion. Wrap reads and writes in try/catch, and fall back to the OS setting when storage is unavailable. The gate script must stay self-contained, and the stored value is validated against the allowed values, never interpolated. Toggling at runtime must tear down or start effects live through the lifecycle registry, without a reload.
- **D-18: The toggle can only reduce motion.** When the OS asks for reduced motion, the toggle shows the reduced state and cannot switch full motion on. Show it as disabled or pressed with a short hint, per the UI-SPEC. A stored "on" never overrides the OS setting.

### Claude's Discretion
- **The visual vocabulary for section reveals** (user said "You decide"): masked/clip wipes, soft fade-up, or a mix per section. The UI-SPEC decides with the taste skill. Lean editorial and avoid the generic fade-up-everything look.
- Easing, durations, stagger and trigger thresholds.
- Library choice within the research stack: GSAP core + ScrollTrigger + SplitText, gated by `gsap.matchMedia()`, is the default. A CSS-first implementation (for example the card hover is pure CSS, and simple fades may use CSS) is welcome where it cuts JS. Don't ship both GSAP and Motion.
- Whether GSAP loads lazily or per page. The homepage bundle must be measured and recorded (SC5). No hard budget number was set, so record the baseline from Phase 5 against the new size.
- How the cursor label pill animates and how much the dot grows over links.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope & requirements
- `.planning/ROADMAP.md` §"Phase 6: Scroll & Interaction Motion" — goal and success criteria SC1–SC5
- `.planning/REQUIREMENTS.md` §"Motion (MOTN)" — MOTN-01..04, 07, 08 (and MOTN-10 as v2/out of scope)
- `.planning/PROJECT.md` §Constraints — accessibility is non-negotiable, measure performance, the taste skill is required for all design work, and the commit rules

### Stack & pitfalls (research)
- `CLAUDE.md` / `.planning/research/STACK.md` §"Motion architecture" and the bundle-size table — GSAP 3.15 + ScrollTrigger + SplitText, `gsap.matchMedia()`, `quickTo()` cursor, CSS `animation-timeline: view()` option
- `.planning/research/PITFALLS.md` §Pitfall 5 (lifecycle double init/leaks), §Pitfall 8 (reduced motion as an afterthought), §Pitfall 9 (cursor/hover on touch devices), §"GSAP licensing and plugins"
- `.planning/research/ARCHITECTURE.md` §"Pattern 5: Motion runtime = gate + lifecycle registry + declarative hooks"

### Prior phase decisions this phase touches
- `.planning/phases/04-project-detail-discovery/04-CONTEXT.md` — D-01 (seamless image stack), **D-04 (amended by D-04 here)**, D-14 (Next-project teaser)
- `.planning/phases/03-real-behance-work/03-CONTEXT.md` — D-19 (no hover-only info, single tab stop cards)
- `.planning/phases/02-homepage-story/02-CONTEXT.md` — marquee reduced-motion/pause behavior (HOME-03), accent `#0F70B7` contrast rules

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/motion/gate.ts`: `applyMotionGate` (stringified into the blocking head script via `motionGateInline`; must stay self-contained), `onMotionPreferenceChange`, and `syncMotionGate`. Its header comment already anticipates the Phase 6 stored override. Extend it to three states plus the stored override.
- `src/lib/motion/lifecycle.ts`: `createLifecycle`/`bindToAstro`. It isolates errors and runs idempotent mount/unmount. Every Phase 6 effect registers here.
- `src/lib/motion/index.ts`: the page-scoped `lifecycle` singleton, imported once by `src/layouts/BaseLayout.astro:54`.
- `src/lib/motion/marquee.ts`: an example of a registered effect using the `AbortController` cleanup pattern.
- `src/styles/global.css:2`: the `motion-on` custom variant. Add matching variants for the new state(s).
- `src/lib/ui/button-classes.ts`: the pill CTA classes, which identify magnetic targets.
- `src/components/ui/SocialLinks.astro` and `src/components/ui/IconLink.astro`: social icon links, which are magnetic targets.
- `src/components/global/LanguageSwitcher.astro` and `src/components/global/SiteHeader.astro`: where the motion toggle goes.

### Established Patterns
- `html[data-motion]` defaults to `off` in the markup (`BaseLayout.astro:28`), and the inline gate upgrades it before stylesheets load.
- Effects use `motion-safe:`/`motion-on:` Tailwind variants for CSS-only motion.
- Cards use `group/card` with a stretched `after:` title link (`src/components/ui/ProjectCard.astro`, `src/components/project/NextProjectTeaser.astro`), which is the hook for the shared hover/focus effect.
- Dictionaries in `src/i18n/en.ts`/`es.ts` are typed with `satisfies`. New keys (cursor "View", toggle labels and hint) must exist in both, or type-check fails.

### Integration Points
- Home sections (`src/components/sections/*`, `src/components/contact/ContactSection.astro`), `ProjectsView.astro`/`ProjectGrid.astro`, and detail components (`ProjectIntro.astro`, `TextModule.astro`, `ProjectContactBand.astro`, `NextProjectTeaser.astro`) need declarative reveal/split hooks (data attributes).
- Tests: `tests/unit/motion-gate.test.ts`, `tests/unit/roles-marquee.test.ts`, `tests/e2e/motion.spec.ts`, `tests/e2e/a11y.spec.ts`, `tests/e2e/layout.spec.ts`, and the keyboard-order e2e test, which gains the toggle tab stop.
- Phase 7 will add a ClientRouter, so effects must not assume a full page load. They have to clean up via the registry.

</code_context>

<specifics>
## Specific Ideas

- The cursor pill reads "View" / "Ver" over project imagery only.
- The hero sequence must feel instant, under about 1 s, with no preloader. REQUIREMENTS lists a full-screen preloader as an anti-pattern.
- The card effect reads as a "mat" inset with a slow zoom: elegant, not gimmicky.

</specifics>

<deferred>
## Deferred Ideas

- Contextual "Open ↗" cursor labels on external links. Not chosen; could revisit in polish.
- SVG/WebGL displacement hover. Remains MOTN-10 (v2).
- Detail-page image-stack reveals and parallax. Phase 7.

</deferred>

---

*Phase: 06-scroll-interaction-motion*
*Context gathered: 2026-10-29*
