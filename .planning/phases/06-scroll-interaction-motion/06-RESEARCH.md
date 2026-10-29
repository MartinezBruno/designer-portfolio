# Phase 6: Scroll & Interaction Motion - Research

**Researched:** 2026-10-29
**Domain:** Client-side motion layer on a static Astro 7 site: a three-state motion gate, IntersectionObserver reveals, GSAP SplitText line masks, a cursor follower, magnetic buttons, CSS hover effects, and an a11y toggle
**Confidence:** HIGH for the codebase facts, GSAP/SplitText behaviour and bundle sizes (all read from source or measured). MEDIUM for browser-behaviour inferences (LCP under clip, axe on fading text), each with a named check.

## Summary

The approved UI-SPEC (`06-UI-SPEC.md`) already fixes almost every visual and behavioural parameter: three motion states, the reveal vocabulary (`lines`/`settle`/`shutter`), tokens, cursor and magnetic numbers, toggle states and copy, and the acceptance tests. What remains for planning is *how to build it safely* on the existing Phase 1 runtime. This research covers that: exact file touch points, the GSAP and SplitText APIs as they behave in the 3.15.0 source, measured bundle cost, and the traps that would break SC1 (content visible without JS) or SC5 (registry and bundle).

The existing runtime is small and good. `src/lib/motion/gate.ts` has a self-contained `applyMotionGate`, stringified into a blocking head script, with a 2-state `on`/`off`. `src/lib/motion/lifecycle.ts` has an error-isolating, idempotent registry with `bindToAstro`. `src/lib/motion/index.ts` holds the page singleton, imported once by `BaseLayout.astro:54`. Every interactive component registers through `lifecycle.register(...)` in its own `<script>`. Phase 6 extends the gate to `on | reduced | off` with a `localStorage` override, and adds a `motion:change` event bus so effects adapt live **without** a page-wide `unmount()/mount()`, which would reset the contact form. It then adds four registered effects: reveals, the cursor, magnetic, and the toggle. Hover is pure CSS.

The one new dependency is `gsap@3.15.0`. It is needed only for SplitText line splits, the `quickTo` cursor and the magnetic pull, and it loads by dynamic `import()` only when `data-motion="on"`. Measured on 2026-10-29 with esbuild ESM minify plus `gzip -9`: core is **27.6 KB**, core plus SplitText is **30.7 KB**, and SplitText alone is 3.5 KB. That is under the UI-SPEC 35 KB lazy budget. Settle and shutter reveals are CSS transitions toggled by attributes, so the `reduced` path and most of the `on` path need no GSAP. ScrollTrigger is not used in Phase 6.

**Primary recommendation:** Build one `src/lib/motion/` module per effect, each a `PageInit` registered on the singleton `lifecycle`. Put all hidden states in `global.css` behind `html[data-motion]` plus a 1.5 s CSS failsafe. Arm an element (remove the failsafe) only once the driver that will reveal it is ready. Resolve motion state in exactly one function, `applyMotionGate`, reused at runtime.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

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

### Deferred Ideas (OUT OF SCOPE)
- Contextual "Open ↗" cursor labels on external links. Not chosen; could revisit in polish.
- SVG/WebGL displacement hover. Remains MOTN-10 (v2).
- Detail-page image-stack reveals and parallax. Phase 7.

**Also out of scope (CONTEXT Phase Boundary):** page transitions, smooth/inertial scroll (Lenis), parallax (including the detail-page image stack), and the 10-navigation leak test (Phase 7).

**Discretion already exercised by the approved UI-SPEC** (treat as locked for planning): the reveal vocabulary (`lines`/`settle`/`shutter` with per-section choreography), all motion tokens, IntersectionObserver triggers with **no ScrollTrigger**, a lazy GSAP import only under `on`, a CSS-only hero and hover, storage key `motion-preference` with value `'reduced'` only, icons `sparkles-2`/`sparkles-2-off`, `aria-disabled` for the OS lock, and the copy keys `cursor.view`, `motion.toggle`, `motion.osLocked`.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MOTN-01 | Visitor sees content animate in as they scroll (reveals), while content stays visible if JavaScript fails | Pattern 3 (reveal runtime + CSS failsafe + "arm only when the driver is ready"), Pitfalls 1, 2, 6, 7, 8; tests V-01..V-05 |
| MOTN-02 | Visitor sees headline text split/reveal animations | Pattern 4 (SplitText 3.15 `lines` + `mask` + `aria`, verified from source), Pitfalls 3, 4; tests V-06, V-07 |
| MOTN-03 | Fine-pointer desktop gets a custom cursor and magnetic buttons; touch devices keep native behaviour | Patterns 5 and 6 (quickTo, page-relative cached rects, shell/face split), Pitfalls 9, 10, 11; tests V-08..V-10 |
| MOTN-04 | Playful image hover effects on project cards | Pattern 7 (CSS only; `pictureAttributes` for `<picture>`, verified in Astro source; Tailwind v4 `hover:` is `@media (hover: hover)`, verified), Pitfall 12; test V-11 |
| MOTN-07 | With `prefers-reduced-motion`, non-essential motion is disabled or replaced by simple fades | Pattern 1 (three-state gate), Pattern 2 (`motion:change` bus), Pitfall 5 (`motion-safe:` ignores the toggle); tests V-12, V-13 |
| MOTN-08 | Visitor can turn animations off with an on-page toggle | Pattern 1 (gate + session fallback when storage throws), Pattern 8 (toggle), Pitfalls 13, 14; tests V-14..V-16 |
| SC5 | All effects register through the lifecycle registry; homepage JS bundle measured and recorded | Pattern 9 (bundle measurement script, gsap marker check); test V-17 |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Astro 7.4 + TypeScript strict (`astro/tsconfigs/strictest`), TypeScript pinned `~6.0.3`. Tailwind 4.3 via `@tailwindcss/vite`. No `<style>` blocks or `@apply` (UI-SPEC upstream rule); motion state CSS lives in `src/styles/global.css`.
- **pnpm** for everything (`pnpm add gsap@3.15.0`).
- **Tabler icons:** explicit per-file SVG imports (`@tabler/icons/outline/sparkles-2.svg`), never barrels.
- **Accessibility is non-negotiable:** heavy motion must degrade gracefully with reduced motion.
- **Performance:** measure, don't guess. Record the homepage bundle.
- **Dependencies:** don't add until needed. Only `gsap` is added in Phase 6. No ScrollTrigger usage, no Lenis, no Motion, no OGL.
- **Quality gates:** no type errors (`astro check`), no lint errors (`eslint`, `prettier --check`), no failing tests (`vitest`, `playwright`). Add tests when behaviour changes. `pnpm verify` runs everything.
- **Taste skill is required** for visual and motion work: apply its rules, run `lint.mjs` and `inspect.mjs`, and review the screenshots (commands are in the UI-SPEC Verification section).
- **Commits during GSD workflows are pre-approved:** Conventional Commits, lowercase, imperative, <50 chars, scope = plan/phase id, no Claude/co-author attribution. `/security-review` runs once per phase before completion.
- **i18n:** every string goes in `src/i18n/ui.en.ts` and `ui.es.ts` (`satisfies`). New keys must exist in both or `astro check` fails.
- **GSD workflow:** edits happen through GSD commands only.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Motion state resolution (`on`/`reduced`/`off`) | Browser, blocking inline head script | Browser runtime module (live changes) | Must run before first paint and before the stylesheet applies. A static site has no server knowledge of OS settings or storage |
| Hidden/visible reveal states, failsafe, hero sequence, card hover | CDN/Static (CSS in `global.css`) | — | CSS works even when every module script fails. That is the only way to satisfy D-05 and the "JS fails after gate" test |
| Reveal triggering (IntersectionObserver, batching, stagger delays) | Browser runtime (`src/lib/motion/reveal.ts`) | — | Needs viewport knowledge. Writes attributes and CSS variables only |
| Line splits | Browser runtime (lazy GSAP + SplitText chunk) | — | Needs measured line boxes after fonts load |
| Cursor follower and magnetic pull | Browser runtime (lazy GSAP) | — | Pointer-driven, fine pointer only |
| Toggle state persistence | Browser (`localStorage`) | — | No backend involvement. The Cloudflare Worker (`/_actions/*`) is untouched |
| Copy (`cursor.view`, `motion.toggle`, `motion.osLocked`) | Build time (Astro SSG dictionaries) | — | Rendered into markup. The cursor label comes from a `data-` attribute or hidden template, not a client dictionary import |
| Bundle measurement | Build tooling (`scripts/`) | — | Reads `dist/client` after `pnpm build` |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| gsap | 3.15.0 (npm `latest`, published 2026-04-13) | `SplitText` line splits with masks, `quickTo` follow tweens, `gsap.context()` cleanup | Locked by CLAUDE.md stack. All plugins are free under the Standard License. SplitText 3.15 has native `mask`, `aria`, `autoSplit`, `onSplit` [VERIFIED: npm registry `npm view gsap`; CITED: gsap.com/docs/v3/Plugins/SplitText] |

Existing, unchanged, used by this phase: `astro@7.4.0`, `tailwindcss@4.3.3`, `@tabler/icons@3.49.0`, `vitest@5.0.5` + `happy-dom@21.0.3`, `@playwright/test@1.64.1`, `@axe-core/playwright@4.14.0` [VERIFIED: package.json].

### Supporting
None. IntersectionObserver, `matchMedia`, `localStorage`, `CustomEvent` and CSS transitions are platform APIs.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| IntersectionObserver reveals | GSAP ScrollTrigger `batch()` | +15–18 KB gz (CLAUDE.md table: core+ST 46.2 vs core 28.3). Nothing in Phase 6 scrubs or pins. Phase 7 parallax adds ScrollTrigger |
| GSAP SplitText | Hand-written line splitter | Line detection across nested `lang` spans, font-swap re-splits, resize re-splits and aria handling are exactly what SplitText 3.13+ solved. See Don't Hand-Roll |
| `gsap.matchMedia()` for the reduced gate | `data-motion` + `motion:change` | `gsap.matchMedia` only sees the OS media query, not the toggle's stored override. Use `data-motion` as the single source of truth (Pattern 2). `window.matchMedia` is still used for `(hover: hover) and (pointer: fine)` and `forced-colors` |
| CSS hero keyframes | GSAP timeline | CSS starts on the first frame and finishes even if every module fails (D-03). GSAP would need JS before anything moves |

**Installation:**
```bash
pnpm add gsap@3.15.0
```
Pin the exact version. The repo pins every dependency exactly [VERIFIED: package.json].

**Version verification:** `npm view gsap version` → `3.15.0`, dist-tag `latest`. `time.modified` 2026-04-13. `sideEffects: false`, `module: index.js`, `exports` with `types`. `scripts.postinstall`: none [VERIFIED: npm registry, 2026-10-29].

### Measured bundle cost [VERIFIED: esbuild 0.28.2 `--bundle --minify --format=esm`, then `gzip -9`, 2026-10-29]
| Import | raw | gzip -9 |
|--------|-----|---------|
| `gsap` core | 70,693 B | **27,616 B** |
| `gsap` + `gsap/SplitText` (registered) | 78,150 B | **30,658 B** |
| `gsap/SplitText` alone | 7,383 B | 3,507 B |

Rolldown (Astro 7's Vite 8 bundler) may differ slightly from esbuild, so re-measure from the real build (Pattern 9). The string `GreenSock` survives minification. Use it as the marker that gsap is absent from eager chunks [VERIFIED: grep on minified output].

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| gsap | npm | 3.x line since 2019, 3.15.0 on 2026-04-13 | [ASSUMED] millions/week (not queried) | github.com/greensock/GSAP (`repository.url` from npm) | unavailable (install blocked by the sandbox) | Approved [ASSUMED]. Named in CLAUDE.md and official gsap.com docs. No postinstall script. Planner adds a `checkpoint:human-verify` before install per protocol |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none
*slopcheck could not be installed at research time, so gsap is tagged `[ASSUMED]` and the planner should gate its install behind a `checkpoint:human-verify` task. The user approved the CLAUDE.md stack, which names gsap 3.15.*

## Architecture Patterns

### System Architecture Diagram

```
HTML request (static, prerendered)
   │
   ▼
<head> blocking inline gate ──reads──► matchMedia(prefers-reduced-motion) ──► localStorage['motion-preference']
   │ writes html[data-motion] = on | reduced | off          (try/catch; only the literal 'reduced' counts)
   ▼
global.css applies ─────────────────────────────────────────────────────────────┐
   │  off      → no reveal selectors match → everything visible                 │
   │  on/red.  → [data-reveal] hidden + 1.5s failsafe keyframe                  │
   │  on       → hero CSS keyframes start on first paint (no JS needed)         │
   ▼                                                                            │
deferred module: src/lib/motion/index.ts (singleton lifecycle, bindToAstro)     │
   │  syncMotionGate: OS change ─┐                                              │
   │  MotionToggle click ────────┼─► applyMotionGate(override) ─► data-motion ──┘ (CSS re-evaluates)
   │                             └─► dispatch 'motion:change' {state}
   ▼
lifecycle.mount() runs registered PageInits (each isolated by try/catch):
   ├─ reveal.ts ── off? return ─ late (>1500ms)? in-view → revealed instantly
   │      ├─ settle/shutter → arm now → IO (rootMargin -12% bottom) → batch → --reveal-delay → [data-revealed] (CSS transition)
   │      └─ lines → on: await loadGsap() → arm → IO → SplitText(lines, mask) → tween → revert
   │                 reduced: arm now → IO → [data-revealed] (opacity fade)
   │                 loadGsap() rejects → reveal remaining lines instantly (never stranded)
   ├─ cursor.ts ── needs on + (hover:hover)(pointer:fine) + !forced-colors → loadGsap → layer on <body>, quickTo x/y
   ├─ magnetic.ts ─ same gate → cache page-relative rects → pointermove → face quickTo (shell never moves)
   ├─ toggle (MotionToggle.astro script) → aria-pressed / aria-disabled sync, click → setMotionPreference
   └─ existing: marquee, tooltips, ContactForm, ServiceChips, EmbedFacade (untouched by motion:change)
         ▲
         └── every effect also listens to 'motion:change' and adapts itself (no page remount)

Project card hover/focus: pure CSS (motion-on: + group-hover/card | group-has-[:focus-visible]/card)
```

### Recommended Project Structure
```
src/lib/motion/
├── gate.ts            # EXTEND: 3 states, storage read, optional override param, MOTION_STORAGE_KEY, setMotionPreference, motion:change dispatch
├── index.ts           # EXTEND: register reveal/cursor/magnetic once (or each component registers its own)
├── lifecycle.ts       # UNCHANGED
├── marquee.ts         # UNCHANGED
├── tokens.ts          # NEW: typed mirror of CSS durations/eases for GSAP (UI-SPEC Motion Tokens)
├── events.ts          # NEW: onMotionChange(doc, cb) helper + DocumentEventMap augmentation for 'motion:change'
├── load-gsap.ts       # NEW: memoised Promise<{ gsap, SplitText }>; the only file that imports gsap (dynamic)
├── reveal.ts          # NEW: initReveals(doc, deps) — IO batching, arming, late-mount rule, lines driver
├── split-lines.ts     # NEW: SplitText wrapper (mask, aria choice, onSplit tween, revert on complete)
├── cursor.ts          # NEW: initCursor(doc, deps)
└── magnetic.ts        # NEW: initMagnetic(doc, deps)
src/components/global/
├── MotionToggle.astro # NEW: button + two icons + tooltip + <script> registering initMotionToggle
└── SiteHeader.astro   # EDIT: place toggle (row 1 right below sm; after languages from sm)
src/lib/ui/button-classes.ts      # EDIT: split primaryButton into shell + face
src/styles/global.css             # EDIT: variants, tokens, reveal states, failsafe, hero keyframes, line-mask rules
scripts/measure-bundle.ts         # NEW: eager-vs-lazy gzip report for '/'
```
Keep `PageInit` functions dependency-injected (observer factory, `now()`, `loadGsap`, `matchMedia`), as `createContactForm(deps)` already does [VERIFIED: ContactForm.astro:228]. happy-dom's `IntersectionObserver` is a no-op stub that never calls back [VERIFIED: node_modules/happy-dom/lib/intersection-observer/IntersectionObserver.js], so unit tests need a fake observer.

### Pattern 1: One resolver for the three-state gate (inline + runtime)
**What:** `applyMotionGate` stays the only resolution logic. It gains an optional `override` parameter so runtime code can resolve with an in-memory session value when storage throws. The inline script calls it with no override.
**Rules:**
- The storage key literal must be **inside** the function body, because `toString()` drops outer scope. Export `MOTION_STORAGE_KEY` separately and unit-test `motionGateInline.includes(MOTION_STORAGE_KEY)` to prevent drift.
- Wrap the **property access** `win.localStorage` in the try, not just `getItem`. In Chrome with cookies blocked, reading `window.localStorage` itself throws `SecurityError` [ASSUMED: standard browser behaviour; covered by the UI-SPEC "storage that throws" e2e test].
- Only the strict literal `'reduced'` counts. Never write the stored value into the DOM.
- OS reduce wins over everything (D-18). Nothing ever stores `'on'`.
```ts
// Source: extends src/lib/motion/gate.ts (Phase 1). MUST stay self-contained.
export type MotionState = 'on' | 'reduced' | 'off';
export const MOTION_STORAGE_KEY = 'motion-preference';

export function applyMotionGate(doc: Document, win: Window, override?: 'reduced' | null): MotionState {
  let state: MotionState = 'off';
  if (typeof win.matchMedia === 'function') {
    state = 'on';
    if (win.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      state = 'reduced';
    } else if (override !== undefined) {
      if (override === 'reduced') state = 'reduced';
    } else {
      try {
        if (win.localStorage.getItem('motion-preference') === 'reduced') state = 'reduced';
      } catch {
        // Storage blocked: the OS setting decides.
      }
    }
  }
  doc.documentElement.dataset['motion'] = state;
  return state;
}
```
`setMotionPreference(doc, win, reduced)` writes or removes the key in try/catch, keeps a module-level `sessionOverride` (used when the write throws), re-resolves via `applyMotionGate(doc, win, sessionOverride ?? undefined)`, and dispatches `motion:change` if the state changed. `syncMotionGate` re-resolves the same way on OS changes, so turning the OS setting off while the toggle is pressed keeps `reduced`.

### Pattern 2: `motion:change` event bus instead of a page remount
**What:** One `CustomEvent<{ state: MotionState }>` on `document`, dispatched only when the resolved state changes. Augment `DocumentEventMap` so listeners are typed (no `any`). Each Phase 6 effect subscribes with the same `AbortController` signal it uses for its other listeners, so lifecycle cleanup removes it.
**Why:** The UI-SPEC forbids `lifecycle.unmount()/mount()` on toggle, because ContactForm, ServiceChips, EmbedFacade and the tooltips share the registry, and a remount would wipe a half-typed message or re-render Turnstile. That supersedes ARCHITECTURE.md Pattern 5 rule 2 ("call unmount(); mount()"), which predates the toggle.
```ts
// src/lib/motion/events.ts
declare global {
  interface DocumentEventMap { 'motion:change': CustomEvent<{ state: MotionState }> }
}
export function onMotionChange(doc: Document, cb: (s: MotionState) => void, signal: AbortSignal): void {
  doc.addEventListener('motion:change', (e) => { cb(e.detail.state); }, { signal });
}
```

### Pattern 3: Reveal runtime — attributes in, CSS does the moving
**What:** `[data-reveal="lines|settle|shutter"]` is authored in markup. CSS owns the hidden, armed and revealed states. JS only adds `data-reveal-armed`, sets `--reveal-delay`, and adds `data-revealed`.
**Rules (in order):**
1. `off` → return `undefined`. Nothing matches in CSS.
2. **Late mount:** if `now() > 1500`, read rects once (a layout read at mount is fine). In-view elements go straight to `data-revealed` plus an instant marker (no transition). Only below-fold elements get armed.
3. **Arm only when the driver is ready.** `settle`/`shutter` (CSS-driven) and all `reduced`-state elements arm at mount. `lines` under `on` stay under the failsafe until `loadGsap()` resolves, then arm. If `loadGsap()` rejects, mark every unrevealed `lines` element `data-revealed` with the instant marker. A heading must never be armed with nothing able to reveal it.
4. **One IntersectionObserver**, `rootMargin: '0px 0px -12% 0px'`, `threshold: 0`. Unobserve on reveal (D-02). Entries from one callback form a batch. Sort them by DOM order (`compareDocumentPosition`) and assign delays per UI-SPEC: authored base offset (`data-reveal-delay="140"`), then 70/80/90 ms steps capped at the 5th item, so no wait exceeds 280 ms.
5. **Keyboard focus reveals immediately:** a delegated `focusin` handler adds `data-revealed` to the nearest unrevealed `[data-reveal]` ancestor (instant). Otherwise a Tab into a below-fold card shows a focus ring on an opacity-0 tile for a frame or more (WCAG 2.4.7). Playwright's `toBeVisible()` treats `opacity:0` as visible, so the existing keyboard tests would not catch this [CITED: playwright.dev/docs/actionability "Visible"].
6. **On `motion:change` → reduced:** finish GSAP line tweens (`tl.progress(1)`), revert splits, and let CSS switch the transition to opacity-only. Waiting elements keep their attribute and use the reduced CSS path. **→ on:** nothing replays. Load GSAP if needed for still-waiting `lines`.
7. Cleanup: `observer.disconnect()`, abort listeners, `ctx.revert()` for GSAP work, remove `--reveal-delay`. Do **not** remove `data-revealed` (D-02, and Phase 7 swaps replace the DOM anyway).

```css
/* src/styles/global.css — sketch. Names follow the UI-SPEC proposal; the planner may rename. */
@custom-variant motion-reduced (&:where([data-motion='reduced'], [data-motion='reduced'] *));
@custom-variant motion-js (&:where([data-motion='on'], [data-motion='reduced'], [data-motion='on'] *, [data-motion='reduced'] *));

:root { --t-fade: 320ms; --t-settle: 560ms; --t-line: 640ms; --t-shutter: 720ms; /* … UI-SPEC tokens … */ }

/* Hidden start states: ONLY under on/reduced, ONLY opacity/translate/scale/clip-path (never visibility/display). */
[data-motion='on'] [data-reveal='settle']:not([data-revealed]) { opacity: 0; translate: 0 var(--reveal-travel, 20px); }
[data-motion='on'] [data-reveal='shutter']:not([data-revealed]) { clip-path: inset(0 0 100% 0); }
[data-motion='on'] [data-reveal='shutter']:not([data-revealed]) picture { scale: 1.08; }
[data-motion='on'] [data-reveal='lines']:not([data-revealed]) { opacity: 0; }
[data-motion='reduced'] [data-reveal]:not([data-revealed]) { opacity: 0; }

/* Failsafe: unarmed elements show themselves after 1.5s even if no module ever runs. */
:is([data-motion='on'], [data-motion='reduced']) [data-reveal]:not([data-reveal-armed], [data-revealed]),
[data-motion='on'] [data-reveal='shutter']:not([data-reveal-armed], [data-revealed]) picture {
  animation: reveal-failsafe 1ms linear 1500ms forwards;
}
@keyframes reveal-failsafe { to { opacity: 1; translate: none; scale: none; clip-path: inset(0); } }
```
CSS animations sit above normal inline declarations in the cascade, so the failsafe would beat GSAP inline styles. That is why arming removes it before any tween [CITED: CSS Cascade 5, origin order "animation" over author normal].

### Pattern 4: SplitText line masks (verified against the 3.15.0 source)
**Facts read from `gsap/SplitText.js` 3.15.0 [VERIFIED: source in npm tarball]:**
- `aria` defaults to `"auto"`: it sets `aria-label` = trimmed `textContent` on the split element and `aria-hidden="true"` on each generated line. `"hidden"` hides everything. `"none"` adds nothing.
- `mask: 'lines'` clones each line element (same tag and class, class suffixed `-mask`) and sets inline `style.overflow = "clip"`.
- Line wrappers get inline `display: block`. The default `tag` is `div`. Use `tag: 'span'` so headings keep phrasing content (Astro 7's compiler errors on invalid HTML).
- `autoSplit: true` re-splits on `document.fonts` `loadingdone` and on width changes (ResizeObserver, 200 ms debounce). The tween returned from `onSplit` is saved, and its progress is carried over to the new split.
- `revert()` restores the original `innerHTML`, `aria-label` and `aria-hidden`, kills the observers, and calls `anim.revert()` on the saved tween.
- The instance registers itself with the active `gsap.context`, so `ctx.revert()` reverts splits created inside it [VERIFIED: `_context(this)` in the constructor].
- `deepSlice: true` (default) subdivides nested inline elements, for example the detail h1 `<span lang>`, across lines.

**Recipe:**
```ts
// src/lib/motion/split-lines.ts — sketch
const hasLang = heading.querySelector('[lang]') !== null;
const split = SplitText.create(heading, {
  type: 'lines',
  mask: 'lines',
  tag: 'span',
  linesClass: 'split-line',          // masks become .split-line-mask
  aria: hasLang ? 'none' : 'auto',   // UI-SPEC: keep the lang span's language for AT
  autoSplit: true,
  onSplit(self) {
    for (const m of self.masks) { m.style.overflow = ''; m.style.overflowY = 'clip'; } // see Pitfall 4
    heading.toggleAttribute('data-revealed', true);  // same task as the from-tween's immediate render: no flash
    return gsap.from(self.lines, {
      yPercent: 110, duration: tokens.line, ease: 'power4.out', stagger: 0.08,
      onComplete: () => { split.revert(); },          // plain text again for find-in-page and resize
    });
  },
});
```
`gsap.from` renders its start state immediately (default `immediateRender` for from-tweens), so splitting, the from-state and `data-revealed` all happen in one task and no unhidden-but-unmasked frame paints [ASSUMED: GSAP from() default immediateRender; confirm in the mid-reveal screenshot].

### Pattern 5: Cursor follower
- Mount only when `matchMedia('(hover: hover) and (pointer: fine)').matches && data-motion === 'on' && !matchMedia('(forced-colors: active)').matches`. Listen to `change` on both queries plus `motion:change`, and mount or unmount the layer live.
- The `cursor.view` label must reach the client without importing a dictionary. Render it at build time into the toggle or layout markup (for example `data-cursor-label={t('cursor.view')}` on `<body>`, or a `<template>` holding the layer), then clone it.
- Use `gsap.quickTo(dot, 'x', { duration: 0.25, ease: 'power2.out' })` and the same for `y`. Create them inside `gsap.context()` and call `ctx.revert()` on cleanup. Its own docs say every tween created inside the context function, or via `ctx.add`, is reverted [CITED: gsap.com/docs/v3/GSAP/gsap.context()]. Async callbacks after `await loadGsap()` must use `ctx.add(...)`.
- Use one passive `pointermove` on `document` that only calls `xTo(e.clientX)` / `yTo(e.clientY)`, plus delegated `pointerover`/`pointerout` with `closest('[data-cursor="view"]')`, `closest('a[href],button,[role="button"],summary,label[for]')` and `closest('input,textarea,select,iframe')`. No layout reads in handlers.
- The layer is `position: fixed; inset: 0; overflow: clip; pointer-events: none; aria-hidden="true"`, appended to `<body>`. No `cursor: none` anywhere (D-11).

### Pattern 6: Magnetic — shell stays, face moves
- `button-classes.ts` exports `primaryShell` (layout, `h-12`, `rounded-full`, focus outline) and `primaryFace` (fill, padding, label, hover fill, `motion-on:active:scale-[0.97]`). `ButtonLink`, the contact submit, `ExternalTextLink` (for "View on Behance") and the LatestWork "See all projects" link get an inner `span[data-magnetic-face]`. `IconLink` gets the face wrapper too.
- **The activation zone extends 24 px beyond the box**, so `pointerenter` on the shell cannot detect entry. Cache **page-relative** rects (`rect.left + scrollX`, etc.) for every `[data-magnetic]` at mount, on `resize`, on `load`, after `document.fonts.ready`, and from a debounced `ResizeObserver` on `document.body`. Hit-test `e.pageX/pageY` against the expanded rects in `pointermove`. Viewport-relative rects go stale on scroll [ASSUMED: standard DOM geometry; e2e V-09 checks after scrolling].
- The face moves by GSAP `x/y` (the `transform` property). The press uses Tailwind v4 `scale-*`, which emits the separate CSS `scale` property, so the two never overwrite each other [VERIFIED: tailwindcss/dist/lib.mjs emits `scale: var(--tw-scale-x) var(--tw-scale-y)`; `transition-transform` covers `transform, translate, scale, rotate`].
- Release back to `0`. On `motion:change` → reduced, call `gsap.set(face, { x: 0, y: 0 })` and abort the listeners.

### Pattern 7: Card hover is CSS only
- Astro's `<Picture>` keeps `class` on `<img>`. Style the `<picture>` (the mat layer) with `pictureAttributes={{ class: 'block size-full …' }}` [VERIFIED: node_modules/astro/components/Picture.astro lines 41–51, 136–151].
- Trigger: `motion-on:group-hover/card:…` and `motion-on:group-has-[:focus-visible]/card:…`. Tailwind v4 compiles `hover:` to `&:hover` inside `@media (hover: hover)` [VERIFIED: tailwindcss/dist/lib.mjs], so a tap on touch never sticks the zoom.
- **Asymmetric durations** (enter 400/700 ms, leave 280/490 ms): the `transition` that applies is the one on the *destination* state. Put the leave durations on the rest-state rule and the enter durations on the hover/focus rule.
- The `<picture>` owns both the hover `clip-path` and the shutter reveal `scale`. Declare **one** combined `transition` for it in `global.css`, because separate utility and reveal `transition` declarations replace each other (see Pitfall 12).
- Add `data-cursor="view"` to `article.group/card` in `ProjectCard.astro` and `NextProjectTeaser.astro`.

### Pattern 8: Motion toggle
- `MotionToggle.astro` holds a `<button type="button" data-motion-toggle aria-pressed>` with both Tabler icons (always in the DOM, swapped by `aria-pressed` variants), the `aria-hidden` tooltip, and an sr-only hint node for `aria-describedby` in the OS-locked state. Hide it with `hidden motion-js:inline-flex` (D-05: it doesn't render without JS or `matchMedia`).
- Its `<script>` registers `initMotionToggle` on `lifecycle`. On mount it syncs `aria-pressed` and `aria-disabled` from `data-motion` plus OS reduce. On click it does nothing if `aria-disabled="true"`, otherwise calls `setMotionPreference`. It listens to `motion:change` to re-sync (OS change unlock or lock). Esc hides the tooltip, reusing the `ToolsRow` dismissed pattern [VERIFIED: src/lib/ui/tooltips.ts exists; reuse its approach].
- The initial server-rendered `aria-pressed="false"` is wrong for `reduced` users until the module runs. Acceptable: the button is the last header item and the module runs right after parsing. The e2e test asserts the post-load state.

### Pattern 9: Bundle measurement (SC5)
`scripts/measure-bundle.ts` (Node 24 runs `.ts` directly, like the existing `scripts/*.ts` [VERIFIED: package.json scripts]):
1. Parse `dist/client/index.html` (and `/es/`) for `<script type="module" src>`.
2. Recursively follow **static** `import … from"./x.js"` specifiers in `dist/client/_astro/*.js` (ignore `import(`).
3. Report each eager file's raw size and `zlib.gzipSync(buf, { level: 9 })` size, the eager total, and separately every chunk reached only by dynamic import.
4. Fail (exit 1) if any eager file contains `GreenSock`.
Baseline: the UI-SPEC records 8,809 B gzip -9 eager on `/` from a 2026-10-28 build. Re-measure from a clean build at the phase start. Today `/` loads 5 module scripts, all importing the shared `motion.*.js` chunk [VERIFIED: dist/client/index.html and import grep].

### Anti-Patterns to Avoid
- **`gsap.matchMedia('(prefers-reduced-motion: no-preference)')` as the motion gate:** it ignores the toggle. Gate on `data-motion`.
- **`visibility: hidden` / `display: none` as a reveal start state:** these remove content from find-in-page, the a11y tree and tab order. Use opacity, translate, scale and clip-path only.
- **Calling `lifecycle.unmount(); lifecycle.mount()` on toggle:** it resets the contact form and Turnstile.
- **`data-reveal` on the same element as `data-magnetic`, or on an element the hover transforms:** one property per layer (UI-SPEC).
- **Splitting headings that contain links** (card titles, the Next h3): `aria:'auto'` strips link semantics [CITED: gsap.com SplitText docs "will not honor the semantics or functionality of nested elements"]. These settle instead.
- **`transition-all`, `ease-in`, `scale-0`, `animate-pulse`, `h-screen`:** taste `lint.mjs` WARNs [VERIFIED: lint.mjs rule table lines 51–55]. Note that the `ease-in` regex also matches comments and token names like `--ease-in`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Splitting text into measured lines | A custom range/rect line splitter | `SplitText` (`type:'lines'`, `mask:'lines'`, `autoSplit`) | Nested `lang` spans across lines (deepSlice), font-swap and resize re-splits that keep tween progress, aria handling, revert. All verified in source |
| Pointer-follow smoothing | rAF lerp loop | `gsap.quickTo` | Reuses one tween per property, with ease and duration control, killed by `ctx.revert()` |
| Animation cleanup bookkeeping | Arrays of tweens | `gsap.context()` + `ctx.add()` + `ctx.revert()` | Reverts tweens and SplitText instances created inside it |
| Scroll position polling | `scroll` listeners + `getBoundingClientRect` | `IntersectionObserver` | No main-thread work per scroll frame (ARCHITECTURE rule 7) |
| Hover-capable detection | UA sniffing / `ontouchstart` | `matchMedia('(hover: hover) and (pointer: fine)')` + `change` listener | Hybrid devices switch at runtime (Pitfall 9) |
| Listener cleanup | Manual `removeEventListener` pairs | One `AbortController` per effect (the existing `marquee.ts` pattern) | Already the codebase convention |

**Key insight:** the risky part of this phase isn't the animation. It is the *state* machinery: the gate, arming, failsafe, live switching and cleanup. Keep those in small pure-ish functions with injected dependencies and test them exhaustively. Leave measuring and tweening to GSAP and the browser.

## Common Pitfalls

### Pitfall 1: Armed element with no driver (stranded hidden content)
**What goes wrong:** An element loses its failsafe (armed) but the thing that would reveal it never runs: the GSAP chunk 404s, an IO callback never fires, or an effect throws after arming.
**How to avoid:** Arm per driver readiness (Pattern 3 rule 3). Handle `loadGsap()` rejection. Arm inside the same try block that creates the observer. Add the e2e "JS fails after gate" test, which aborts `**/_astro/**/*.js` (the inline gate still runs because it is inline) and expects every `[data-reveal]` at opacity 1 by 1.6 s, plus a variant that aborts only the gsap chunk.
**Warning signs:** `empty-screens` from `inspect.mjs`. A heading missing in a throttled-network run.

### Pitfall 2: Bottom-of-page elements that never cross the trigger line
**What goes wrong:** With `rootMargin` bottom −12%, an element whose top can never rise above 88% of the viewport (the last item on a short page, or a tall viewport) never reveals.
**How to avoid:** Footer height currently makes this unlikely, but test it. The e2e test scrolls to the bottom at 1440×900 **and** 1440×1600 and expects every `[data-reveal]` to have `data-revealed`. If it fails, also reveal pending elements on `scrollend` when `scrollY + innerHeight >= scrollHeight - 2`.

### Pitfall 3: Accessible name drift during a split
**What goes wrong:** `aria:'auto'` sets `aria-label` from `textContent`. Headings with sr-only prefixes or `lang` spans change meaning or lose language.
**How to avoid:** Use `aria:'none'` when the heading contains `[lang]` (UI-SPEC). Never split headings containing links. The e2e test compares `accessibleName` before, during (+200 ms) and after the reveal, EN and ES, at 390 and 1440. `revert()` restores the original `aria-label`/`aria-hidden` [VERIFIED: `_revertOriginal` in source].

### Pitfall 4: Line masks clip glyph overhangs horizontally
**What goes wrong:** SplitText sets inline `overflow: clip` on masks, which clips both axes. The hero has `-ml-[0.04em]` and `-0.04em` tracking at display size, so left side bearings and descenders can clip (`clipped-text` in the inspector).
**How to avoid:** Clip only the vertical axis: `overflow-x: visible; overflow-y: clip`. Mixing `visible` and `clip` is allowed, because `clip` does not force the other axis to compute to `auto` the way `hidden` does [CITED: CSS Overflow 3, overflow-x/overflow-y computed values]. For SplitText masks, override the inline style in `onSplit` (Pattern 4). For the hero CSS masks, author it directly. Keep the UI-SPEC `padding-block: 0.1em; margin-block: -0.1em`.

### Pitfall 5: `motion-safe:` and `motion-reduce:` ignore the toggle
**What goes wrong:** Tailwind `motion-safe:`/`motion-reduce:` read only the OS media query. Under toggle-`reduced`, existing `motion-safe:transition-colors` utilities and `motion-safe:animate-spin` (the contact submit spinner) still run [VERIFIED: grep of src].
**How to avoid:** Colour transitions and the busy spinner are not vestibular motion, so leave them (record the decision). Every *new* Phase 6 motion uses `motion-on:` (or the new variants), never `motion-safe:`. The marquee already uses `motion-on:` and becomes static under `reduced`, because the variant matches only `on` [VERIFIED: RolesMarquee.astro:23].

### Pitfall 6: Late-mount visible-to-hidden flash
**What goes wrong:** On a slow connection the failsafe shows content at 1.5 s, then the module mounts, arms the element, and it blinks out and back.
**How to avoid:** Apply the UI-SPEC late-mount rule using `performance.now()` (inject `now` for tests). Below-fold elements may be armed late; that is invisible.

### Pitfall 7: Focus on a not-yet-revealed element
See Pattern 3 rule 5. The test tabs to the first Home project card from the hero without scrolling, then checks the card's computed opacity is 1 within one animation frame of focus.

### Pitfall 8: Hero LCP under clip/transform
**What goes wrong:** The h1 lines start at `translateY(110%)` inside a clip, and the portrait at `clip-path: inset(100% 0 0 0)`. Chrome may not report them as painted until partly visible, which shifts LCP [ASSUMED: needs measurement].
**How to avoid:** Use the UI-SPEC LCP gate (on vs reduced medians within 100 ms, 5 runs, 2 viewports) with the documented fallback start values. The first Projects card cover is never hidden (UI-SPEC).

### Pitfall 9: The cursor layer causes horizontal scroll or covers text
**How to avoid:** Make the layer `fixed inset-0 overflow-clip pointer-events-none`. Move the dot via `transform` only. The e2e test checks `scrollWidth <= innerWidth` with the pointer at the right edge, and that a click through the pill navigates.

### Pitfall 10: Stale magnetic geometry
See Pattern 6. Viewport rects cached at `pointerenter` are wrong after scroll, and fonts or images shift layout after mount.

### Pitfall 11: Touch emulation gaps in tests
**What goes wrong:** Desktop Chrome in Playwright reports `(hover: hover) and (pointer: fine)`. Only device profiles with `hasTouch`/`isMobile` (for example `devices['Pixel 7']`) flip it [ASSUMED: Playwright/Chromium emulation behaviour].
**How to avoid:** In the touch test, first assert `matchMedia('(pointer: coarse)').matches === true` so the test proves its own precondition.

### Pitfall 12: Competing `transition` declarations on one element
**What goes wrong:** The `transition` shorthand is not additive. A Tailwind `transition-[clip-path]` utility on `<picture>` and the shutter reveal rule's `transition: scale …` replace each other, so either the hover or the reveal snaps.
**How to avoid:** Give each layer element exactly one `transition` declaration per state in `global.css` (or one combined arbitrary utility) that lists every property it animates.

### Pitfall 13: Storage throws → the toggle silently does nothing
**What goes wrong:** If `setItem` throws and the runtime re-reads storage to resolve, the state never changes.
**How to avoid:** Use the session override (Pattern 1). Test with an `Object.defineProperty(window, 'localStorage', { get() { throw … } })` init script: pressing the toggle still switches to `reduced` on that page, and there are zero console errors.

### Pitfall 14: Existing tests encode the old two-state gate
`tests/unit/motion-gate.test.ts` expects `'off'` for OS reduce, and `tests/e2e/motion.spec.ts` expects `data-motion="off"` under `reducedMotion: 'reduce'` and after a live `emulateMedia` change [VERIFIED: read both files]. These must change to `'reduced'` in the same plan that changes the gate, or the suite goes red. Also: `a11y.spec.ts` `headerSteps` gains the toggle after ES [VERIFIED: a11y.spec.ts:119–128], and `contact-form.test.ts` / `contact.spec.ts` may select submit-button children, so check them when the face span is added.

### Pitfall 15 (forward-looking, Phase 7): ClientRouter swaps `<html>` attributes
`<ClientRouter />` copies the incoming document's root attributes, which would reset `data-motion="off"` [ASSUMED: ARCHITECTURE rule 4 also marks this as inference]. Phase 6 should not rely on a full page load: keep the resolver callable (`applyMotionGate`) so Phase 7 can re-apply it on `astro:after-swap`. The cursor layer appended to `<body>` must be removed by cleanup (`astro:before-swap` → `unmount`).

### Pitfall 16: axe colour-contrast on mid-fade text
axe blends partial opacity into its contrast calculation, so a "mid-reveal" axe run at 200 ms may flag fading text [ASSUMED]. Run the UI-SPEC mid-reveal axe sample. If it flags only elements without `data-revealed` or still transitioning, record that as transient (WCAG evaluates the settled state) and run the strict axe pass after `transitionend`. Raise it rather than suppress it silently.

## Code Examples

### Lazy, memoised GSAP loader (the only gsap import site)
```ts
// src/lib/motion/load-gsap.ts
// Source: gsap.com/docs/v3/Installation (explicit registerPlugin prevents tree-shaking the plugin)
type Gsap = typeof import('gsap')['gsap'];
type Split = typeof import('gsap/SplitText')['SplitText'];
let loading: Promise<{ gsap: Gsap; SplitText: Split }> | undefined;

export function loadGsap(): Promise<{ gsap: Gsap; SplitText: Split }> {
  loading ??= Promise.all([import('gsap'), import('gsap/SplitText')]).then(([g, s]) => {
    g.gsap.registerPlugin(s.SplitText);
    return { gsap: g.gsap, SplitText: s.SplitText };
  });
  loading.catch(() => { loading = undefined; }); // allow a retry on a later mount
  return loading;
}
```
The `gsap/SplitText` import path follows the installation page's plugin pattern (`gsap/DrawSVGPlugin`), and `SplitText.js` exists at the package root [VERIFIED: npm tarball listing]. Confirm the `types/` entry resolves under `strictest` in the first task (`astro check`).

### Registered effect skeleton (matches marquee.ts conventions)
```ts
// src/lib/motion/cursor.ts — shape only
import type { Cleanup } from './lifecycle';
export interface CursorDeps { matchMedia: (q: string) => MediaQueryList; loadGsap: typeof loadGsap; }
export function initCursor(doc: Document, deps: CursorDeps): Cleanup | undefined {
  const ac = new AbortController();
  let teardownLayer: (() => void) | undefined;
  const evaluate = (): void => { /* mount/unmount layer by fine && data-motion==='on' && !forced */ };
  deps.matchMedia('(hover: hover) and (pointer: fine)').addEventListener('change', evaluate, { signal: ac.signal });
  deps.matchMedia('(forced-colors: active)').addEventListener('change', evaluate, { signal: ac.signal });
  onMotionChange(doc, evaluate, ac.signal);
  evaluate();
  return () => { ac.abort(); teardownLayer?.(); };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SplitText as a paid Club plugin with manual masks and aria | Free in the public `gsap` package. Built-in `mask`, `aria`, `autoSplit`, `onSplit` | GSAP 3.13 (2025) rewrite; 3.15.0 current | No `.npmrc` token. No hand-written mask wrappers |
| `@media (prefers-reduced-motion)` only | User-facing toggle + OS setting, resolved before paint | WCAG 2.3.3 practice | Needs an attribute gate (`data-motion`), not media variants |
| Tailwind 3 `hover:` sticky on touch | Tailwind v4 `hover:` inside `@media (hover: hover)` | Tailwind 4.0 | Card zoom never sticks after a tap [VERIFIED] |
| Tailwind 3 `scale-*` via `transform` | Tailwind v4 uses separate `scale`/`translate` properties | Tailwind 4.0 | CSS press scale and GSAP `x/y` compose [VERIFIED] |

**Deprecated/outdated:** `@studio-freight/lenis`, Club GSAP registry tokens, `<ViewTransitions />` (CLAUDE.md "What NOT to Use"). None are needed here.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | gsap is legitimate and safe (slopcheck unavailable) | Package Legitimacy Audit | Low. Named in CLAUDE.md, official docs, real GitHub repo, no postinstall. Human checkpoint before install |
| A2 | Reading `window.localStorage` can itself throw (cookies blocked) | Pattern 1 | Low. The try already wraps it |
| A3 | `gsap.from()` immediate render avoids a flash between split and tween | Pattern 4 | Medium. A one-frame flash of unmasked lines; caught by the mid-reveal screenshot |
| A4 | Clipped/transformed hero text delays the LCP candidate | Pitfall 8 | Medium. LCP regression; the UI-SPEC gate measures it and has a fallback |
| A5 | Playwright device profiles flip `(pointer: coarse)` | Pitfall 11 | Low. The test asserts its precondition |
| A6 | ClientRouter resets `<html>` attributes on swap | Pitfall 15 | Phase 7 only |
| A7 | axe flags partially faded text in mid-reveal runs | Pitfall 16 | Low. Test design adjustment |
| A8 | Tailwind v4 accepts `group-has-[:focus-visible]/card:` combined with `motion-on:` | Pattern 7 | Low. Check the compiled CSS in the first hover task (grep `dist` CSS for `:has(:focus-visible)`) |
| A9 | Page-relative rect caching is sufficient for magnetic hit-testing | Pattern 6 | Low. V-09 tests after scroll |

## Open Questions

1. **Where does the `cursor.view` label live in markup?**
   - What we know: client code must not import the dictionaries (t.ts comment: client code should avoid bundling them).
   - Recommendation: a `data-cursor-label` attribute on `<body>` set in `BaseLayout`, or a `<template data-cursor-template>`. Planner picks one.
2. **One BaseLayout script or per-component scripts for the new effects?**
   - What we know: both work. Astro emits one module per component script, and all share the `motion` chunk.
   - Recommendation: register reveal, cursor and magnetic from `src/lib/motion/index.ts`-adjacent `effects.ts`, imported by the BaseLayout script (one place, every page). Register the toggle from `MotionToggle.astro`. The bundle script measures both.
3. **Inherited UI-SPEC open questions** (copy review, toggle position below `sm`, icon choice, hover duration feel, 64 px spacing) are non-blocking and go to the user at review.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | build, scripts | ✓ | 24.15.0 (eslint-plugin-astro engines prefer ≥24.16; already accepted at 01-01) | — |
| pnpm | install | ✓ | 12.14.0 | — |
| Playwright + Chromium | e2e, screenshots, LCP | ✓ | 1.64.1, chromium-1248 cached | — |
| taste-skill scripts | `lint.mjs`, `inspect.mjs` | ✓ | 2.0.0 at `~/.claude/plugins/cache/taste-skill/taste-skill/2.0.0/skills/taste-skill/scripts/` | marketplace copy |
| npm registry access | `pnpm add gsap` | ✓ (`npm view` worked) | — | — |
| slopcheck | package audit | ✗ (install blocked by sandbox) | — | Human checkpoint before install |

**Missing dependencies with no fallback:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.5 (happy-dom 21 via `// @vitest-environment happy-dom`); Playwright 1.64.1 + @axe-core/playwright 4.14.0 |
| Config file | `vitest.config.ts` (getViteConfig, `tests/unit/**/*.test.ts`); `playwright.config.ts` (port 4400, preview of `dist`, Desktop Chrome project) |
| Quick run command | `pnpm vitest run tests/unit/motion-*.test.ts` |
| Full suite command | `pnpm verify` (lint + unit + build + e2e + secrets) |

### Phase Requirements → Test Map
| ID | Req | Behavior | Type | Automated Command | File Exists? |
|----|-----|----------|------|-------------------|-------------|
| V-01 | MOTN-01 | Gate truth table: no matchMedia→off; OS reduce→reduced (even with nothing stored); stored `'reduced'`→reduced; bogus stored value→on; storage throws→OS; override param wins over storage; inline string contains key and is self-contained | unit | `pnpm vitest run tests/unit/motion-gate.test.ts` | ✅ (update) |
| V-02 | MOTN-01 | JS disabled: `data-motion=off`, every `[data-reveal]` computed opacity 1, translate/transform none, clip-path none/inset(0) on `/`, `/es/`, `/projects/`, `/es/projects/`, one detail per locale | e2e | `pnpm playwright test tests/e2e/motion.spec.ts -g "without JavaScript"` | ✅ (extend) |
| V-03 | MOTN-01 | JS fails after gate: abort `**/_astro/**/*.js` → all `[data-reveal]` opacity 1 by 1.6 s; abort only the gsap chunk → lines headings revealed | e2e | `pnpm playwright test tests/e2e/motion-reveal.spec.ts -g "fails"` | ❌ Wave 0 |
| V-04 | MOTN-01 | Reveal runtime: arming per driver, late-mount rule (`now`>1500), batch ordering and delay caps, once only (unobserve), focusin reveal, loadGsap rejection reveals lines, cleanup disconnects | unit (fake IO, fake now, fake loader) | `pnpm vitest run tests/unit/motion-reveal.test.ts` | ❌ Wave 0 |
| V-05 | MOTN-01 | Scroll to bottom at 1440×900 and 1440×1600 → every `[data-reveal]` has `data-revealed`; scroll back up → none re-hidden | e2e | `pnpm playwright test tests/e2e/motion-reveal.spec.ts -g "scroll"` | ❌ Wave 0 |
| V-06 | MOTN-02 | Split heading accessible name equals original text before, during (+200 ms) and after; detail h1 keeps `[lang]`; after reveal the heading has no `.split-line` children | e2e | `pnpm playwright test tests/e2e/motion-reveal.spec.ts -g "split"` | ❌ Wave 0 |
| V-07 | MOTN-02 | split-lines wrapper chooses `aria:'none'` with `[lang]`, refuses headings containing `a`, sets the mask overflow axes | unit (stub SplitText) | `pnpm vitest run tests/unit/motion-split.test.ts` | ❌ Wave 0 |
| V-08 | MOTN-03 | 1440 mouse: layer exists, `aria-hidden`, `pointer-events:none`; pill visible over a tile; click through navigates; `scrollWidth<=innerWidth` at the right edge; no `cursor:none` in computed styles | e2e | `pnpm playwright test tests/e2e/motion-pointer.spec.ts` | ❌ Wave 0 |
| V-09 | MOTN-03 | Magnetic: face moves ≤8/6 px after pointer near a target (also after scrolling); shell rect unchanged; face back to 0 on leave and on toggle | e2e + unit (`magnetic.test.ts` clamp/zone math) | `pnpm playwright test tests/e2e/motion-pointer.spec.ts -g magnetic` / `pnpm vitest run tests/unit/motion-magnetic.test.ts` | ❌ Wave 0 |
| V-10 | MOTN-03 | Pixel 7 / iPhone 14 profiles: precondition `(pointer: coarse)`; no follower layer; faces `transform:none` after taps | e2e | `pnpm playwright test tests/e2e/motion-pointer.spec.ts -g touch` | ❌ Wave 0 |
| V-11 | MOTN-04 | Hover and keyboard focus on a tile → `<picture>` clip-path `inset(12px)`, `<img>` scale ≈1.05 after transition; card bounding box unchanged; `reduced` → no change; title, category and summary visible at rest | e2e | `pnpm playwright test tests/e2e/motion-hover.spec.ts` | ❌ Wave 0 |
| V-12 | MOTN-07 | `reducedMotion:'reduce'`: `data-motion=reduced`; during reveals no `[data-reveal]` ever has a non-none transform/translate (sampled each rAF for 1 s while scrolling); no follower; marquee static; toggle pressed + `aria-disabled` | e2e | `pnpm playwright test tests/e2e/motion.spec.ts -g reduce` | ✅ (update off→reduced) |
| V-13 | MOTN-07 | Live OS change on→reduce→on keeps working; with a stored `'reduced'`, OS back to no-preference stays reduced | e2e | `pnpm playwright test tests/e2e/motion.spec.ts -g "after load"` | ✅ (update) |
| V-14 | MOTN-08 | Toggle on `/`: press → `data-motion=reduced` with no reload (a `window` marker survives); a typed contact message is unchanged; the next page loads reduced before paint (`addInitScript` captures `data-motion` at DOMContentLoaded); release → next page `on` | e2e | `pnpm playwright test tests/e2e/motion-toggle.spec.ts` | ❌ Wave 0 |
| V-15 | MOTN-08 | Bogus stored value `'<img src=x>'` → `on`, never in the DOM; storage getter throws → OS fallback, toggle still works this page, zero console errors | e2e | `pnpm playwright test tests/e2e/motion-toggle.spec.ts -g storage` | ❌ Wave 0 |
| V-16 | MOTN-08 | Keyboard order includes the toggle after ES on every page type, EN/ES; toggle unit (aria sync, aria-disabled click no-op, motion:change re-sync); dictionary keys exist in both locales | e2e + unit | `pnpm playwright test tests/e2e/a11y.spec.ts` / `pnpm vitest run tests/unit/motion-toggle.test.ts tests/unit/site-header.test.ts` | ✅ a11y (extend) / ❌ toggle unit |
| V-17 | SC5 | `node scripts/measure-bundle.ts` prints eager vs lazy gzip for `/` and exits non-zero if `GreenSock` is in an eager chunk; numbers recorded in SUMMARY against the re-measured baseline | script (post-build) | `pnpm build && node scripts/measure-bundle.ts` | ❌ Wave 0 |
| V-18 | all | axe zero violations in on (settled), reduced, OS-locked tooltip open, and JS off on all audited pages; mid-reveal sample per Pitfall 16 | e2e | `pnpm playwright test tests/e2e/a11y.spec.ts` | ✅ (extend) |
| V-19 | SC5 | Every new effect registered via `lifecycle.register`; `lifecycle.unmount()` leaves no follower layer, no observer and no listeners (spy on add/remove counts) | unit | `pnpm vitest run tests/unit/motion-*.test.ts` | ❌ Wave 0 |
| — | taste | `lint.mjs` and `inspect.mjs` gates plus the screenshot review (UI-SPEC Verification) | manual-assisted | commands in UI-SPEC | n/a |
| — | perf | LCP gate on vs reduced (UI-SPEC) | e2e-measurement | `pnpm playwright test tests/e2e/motion-lcp.spec.ts` (record, not CI-blocking) | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm vitest run tests/unit/motion-*.test.ts && pnpm check`
- **Per wave merge:** `pnpm build && pnpm playwright test tests/e2e/motion*.spec.ts tests/e2e/a11y.spec.ts`
- **Phase gate:** `pnpm verify` green, `node scripts/measure-bundle.ts` recorded, taste gates run, before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/motion-reveal.test.ts`, `motion-split.test.ts`, `motion-magnetic.test.ts`, `motion-cursor.test.ts`, `motion-toggle.test.ts`, plus a shared fake `IntersectionObserver` / `MediaQueryList` helper (extract `FakeMediaQueryList` from `motion-gate.test.ts` into `tests/unit/helpers/`)
- [ ] `tests/e2e/motion-reveal.spec.ts`, `motion-pointer.spec.ts` (needs `test.use({ ...devices['Pixel 7'] })` blocks), `motion-hover.spec.ts`, `motion-toggle.spec.ts`, `motion-lcp.spec.ts`
- [ ] `scripts/measure-bundle.ts`
- [ ] Update `tests/unit/motion-gate.test.ts`, `tests/e2e/motion.spec.ts`, `tests/e2e/a11y.spec.ts` (`headerSteps`) in the same plans that change the behaviour

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes (client storage value) | Strict equality against the literal `'reduced'`; the value is never interpolated, parsed or written to the DOM |
| V6 Cryptography | no | — |
| V14 Configuration / supply chain | yes | Exact-pinned `gsap@3.15.0`, no postinstall, human checkpoint (slopcheck unavailable) |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Tampered `localStorage` value injected into the inline gate or DOM | Tampering / XSS | The gate compares only; `motionGateInline` stays a build-time constant (the only `set:html` in `src/`, per 01-05); e2e V-15 |
| `innerHTML` writes when building the cursor layer | XSS | Build with `createElement`/`textContent`, or clone a build-time `<template>`. The label comes from the build-time dictionary, never the URL or storage |
| SplitText `innerHTML` restore on heading content | Tampering | Headings are build-time text. Never split sanitized Behance `TextModule` HTML (UI-SPEC: text modules settle as one block) |
| Third-party script supply chain (gsap) | Tampering | Self-hosted via the bundle (no CDN), pinned version, lazy chunk |

## Sources

### Primary (HIGH confidence)
- `gsap@3.15.0` npm tarball `SplitText.js` source: aria, mask, autoSplit, onSplit, revert, context registration (read 2026-10-29)
- npm registry `npm view gsap` (version, dist-tags, exports, sideEffects, postinstall)
- esbuild 0.28.2 + gzip -9 measurement of gsap core and SplitText (scratchpad, 2026-10-29)
- https://gsap.com/docs/v3/Plugins/SplitText/ (config options, aria caveat on nested links, autoSplit/fonts)
- https://gsap.com/docs/v3/GSAP/gsap.quickTo()/ and https://gsap.com/docs/v3/GSAP/gsap.context()/
- https://gsap.com/docs/v3/Installation/ (ESM imports, registerPlugin and tree shaking)
- Codebase: `src/lib/motion/*`, `BaseLayout.astro`, `global.css`, `button-classes.ts`, `ProjectCard.astro`, `NextProjectTeaser.astro`, `Hero.astro`, `SiteHeader.astro`, `IconLink.astro`, `ExternalTextLink.astro`, `ContactForm.astro`, tests, `playwright.config.ts`, `vitest.config.ts`, `dist/client/index.html`
- `node_modules/astro/components/Picture.astro` (`pictureAttributes`), `node_modules/tailwindcss/dist/lib.mjs` (hover media, scale property, transition-transform list), happy-dom IntersectionObserver stub
- taste-skill `lint.mjs` rule table

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` Pattern 5, `PITFALLS.md` §5, 8, 9 (project research, partly inference; rule 2 superseded by the UI-SPEC)
- CSS Cascade 5 (animation origin) and CSS Overflow 3 (`clip` + `visible` axes), cited from the specs (not fetched this session)
- Playwright actionability docs (opacity:0 counts as visible), cited from documentation knowledge

### Tertiary (LOW confidence)
- LCP behaviour for clipped elements, axe opacity blending, and ClientRouter root-attribute swaps: all flagged in the Assumptions Log with checks

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH. One package, verified on the registry, sizes measured.
- Architecture: HIGH. Built on the read codebase and the approved UI-SPEC; the patterns are concrete.
- Pitfalls: MEDIUM-HIGH. Most are verified from source or tests. A3, A4 and A7 need measurement during execution.

**Research date:** 2026-10-29
**Valid until:** 2026-11-28 (stable stack; re-check if gsap publishes 3.16)
