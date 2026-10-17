---
phase: 02-homepage-story
reviewed: 2026-10-16T21:50:00Z
depth: standard
files_reviewed: 37
files_reviewed_list:
  - .gitignore
  - eslint.config.js
  - src/components/sections/FeaturedServices.astro
  - src/components/sections/Hero.astro
  - src/components/sections/RolesMarquee.astro
  - src/components/sections/ToolsRow.astro
  - src/components/ui/AvailabilityBadge.astro
  - src/components/ui/ServiceCard.astro
  - src/components/ui/ServiceIcon.astro
  - src/components/ui/ToolIcon.astro
  - src/components/views/HomeView.astro
  - src/content.config.ts
  - src/data/profile.json
  - src/data/roles.json
  - src/data/services.json
  - src/data/site.ts
  - src/data/tools.json
  - src/i18n/ui.en.ts
  - src/i18n/ui.es.ts
  - src/lib/content/home.ts
  - src/lib/content/icons.ts
  - src/lib/content/queries.ts
  - src/lib/motion/index.ts
  - src/lib/motion/marquee.ts
  - src/lib/ui/tooltips.ts
  - src/styles/global.css
  - tests/e2e/a11y.spec.ts
  - tests/e2e/home-story.spec.ts
  - tests/e2e/home.spec.ts
  - tests/e2e/layout.spec.ts
  - tests/e2e/skeleton.spec.ts
  - tests/unit/availability-badge.test.ts
  - tests/unit/content-home.test.ts
  - tests/unit/featured-services.test.ts
  - tests/unit/marquee-toggle.test.ts
  - tests/unit/roles-marquee.test.ts
  - tests/unit/tool-tooltips.test.ts
  - tests/unit/tools-row.test.ts
findings:
  critical: 0
  warning: 4
  info: 7
  total: 11
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-10-16T21:50:00Z
**Depth:** standard
**Files Reviewed:** 37
**Status:** issues_found

## Summary

I reviewed the Phase 2 homepage story: the hero, the roles marquee with its pause toggle, the services grid, the tools row with tooltips, the content collections and query layer, the i18n keys, and the tests. For context I also read the helpers they call: `src/lib/motion/lifecycle.ts`, `src/lib/motion/gate.ts`, `src/layouts/BaseLayout.astro` and `src/i18n/t.ts`.

Verified by running them: `pnpm vitest run` passes (16 files, 122 tests). `pnpm lint` reports 0 errors and 0 warnings from astro check, and Prettier is clean. I did not run the e2e tests.

What holds up:
- **Listener cleanup with ClientRouter.** `marquee.ts` and `tooltips.ts` both register every listener through one `AbortController`. `bindToAstro` unmounts on `astro:before-swap` and remounts on `astro:page-load`. Listeners on `document` are aborted on unmount, so they cannot pile up. The unit tests cover 10 unmount/mount cycles.
- **Content schema and queries.** They are correct.
- **i18n keys.** The `en` and `es` dictionaries have the same keys. This is enforced by `satisfies Dictionary` and by a unit test.

There are no blockers. The main concerns are the accessibility behaviour of the marquee pause control and of the tooltips:
- The marquee toggle's `aria-pressed` state can contradict what is on screen.
- The toggle cannot be discovered by touch users.
- If the reduced-motion setting changes after page load, the gate leaves the roles band clipped.
- Hovering one tile hides the tooltip of the tile that has keyboard focus.

## Warnings

### WR-01: Marquee `aria-pressed` contradicts the visible state; keyboard and mouse users cannot see a resume take effect

**File:** `src/components/sections/RolesMarquee.astro:20`, `src/lib/motion/marquee.ts:19-21`
**Issue:** The track is paused by any of three independent CSS conditions: `group-hover`, `group-has-[[data-marquee-toggle]:focus-visible]` and `group-data-paused`. The toggle only controls the third one.
- **Keyboard:** the button has focus-visible whenever a keyboard user operates it. Pressing Space or Enter to resume sets `aria-pressed="false"` and the screen reader announces "not pressed". The band stays paused until focus leaves.
- **Mouse:** the pointer is always over the band when clicking, so a click to resume never resumes anything visibly while the pointer stays there.

The control's state and its effect are decoupled, which misleads assistive tech users (WCAG 4.1.2 state accuracy; 2.2.2 mechanism feedback). The e2e test `marquee: animates and the invisible band toggle pauses it` (`tests/e2e/home-story.spec.ts:99-103`) checks `aria-pressed` after Space/Enter but never checks `animationPlayState`, so it hides this gap.
**Fix:** Make the explicit toggle the only thing that decides the paused state while it is engaged. Hover and focus should pause only when the user has not chosen "playing". Track the explicit choice on the section and override the hover/focus pause with it:
```ts
// marquee.ts
const paused = button.getAttribute('aria-pressed') !== 'true';
button.setAttribute('aria-pressed', String(paused));
root?.toggleAttribute('data-paused', paused);
root?.toggleAttribute('data-playing', !paused); // explicit resume
```
```html
<!-- copyClasses: let an explicit resume win over hover/focus -->
group-data-playing:[animation-play-state:running]!
```
Alternatively, drop the hover/focus pause and rely only on the toggle. Then extend the e2e test to assert `animationPlayState === 'running'` after resuming while the button is still focused.

### WR-02: The invisible full-band pause button cannot be discovered by touch and sighted users

**File:** `src/components/sections/RolesMarquee.astro:53-59`
**Issue:** The WCAG 2.2.2 pause mechanism is an empty, transparent `<button>` over the whole band. Each user group meets a different problem:
- **Mouse users:** hovering pauses, so this is fine.
- **Touch users:** nothing on screen (no icon, label, cursor or hint) shows that tapping pauses the motion.
- **Accidental taps:** any tap meant for the text, such as reading or selecting, silently toggles the state. The overlay also blocks text selection of the roles.
- **Sighted keyboard users:** they get a white outline around the whole band with no visible label, so the purpose of the tab stop is unclear (WCAG 2.4.6 / 3.3.2 spirit).

[Inference] 2.2.2 requires a mechanism to be available. An undiscoverable mechanism meets the letter of the rule but not its intent for touch users, who are the main audience for a portfolio. This was a recorded user decision (02-08 checkpoint), so treat this as a risk to re-confirm rather than a regression.
**Fix:** Keep the overlay, but give it a visible affordance that appears at least on `:focus-visible`, and ideally always on touch (`@media (hover: none)`). A small pause/play glyph in a corner of the band is enough (Tabler `player-pause` / `player-play`, aria-hidden, swapped on `aria-pressed`). Also add `select-none` to the band so that taps do not start a selection.

### WR-03: A reduced-motion change after load leaves the band clipped and the pause button live

**File:** `src/styles/global.css:2`, `src/components/sections/RolesMarquee.astro:20,43,58`, `src/lib/motion/gate.ts:21` (`onMotionPreferenceChange` is never wired up)
**Issue:** `data-motion` is resolved only once, by the blocking inline script. If the user turns on "reduce motion" while the page is open:
1. `motion-reduce:animate-none` stops the animation.
2. The `motion-on:` variants still apply: `flex-nowrap`, `justify-around`, `px-0`, the second copy is shown, and the pause button is shown.

The result is a static, non-wrapping row inside `overflow-hidden`. At phone widths most of the roles are cut off, plus a pause button that controls nothing. `onMotionPreferenceChange` exists in `gate.ts` but nothing calls it (`grep` finds only its definition).
**Fix:** Keep `html[data-motion]` in sync. Register it in `src/lib/motion/index.ts`:
```ts
import { onMotionPreferenceChange } from './gate';
onMotionPreferenceChange(window, (state) => {
  document.documentElement.dataset['motion'] = state;
});
```
Alternatively, add `motion-reduce:` counterparts (`motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:px-4`, `motion-reduce:hidden` on the duplicate list and the button) so the static layout holds without JS re-evaluation.

### WR-04: Hovering another tile hides the tooltip of the keyboard-focused tile (WCAG 1.4.13 "persistent")

**File:** `src/lib/ui/tooltips.ts:17-24,27-33`
**Issue:** `focusOn` runs on `pointerenter`. It sets `data-dismissed` on every other tile, including the one that currently has keyboard focus. When the mouse pointer merely passes over a different tile (incidental movement, not a dismissal), the focused tile's tooltip disappears. It stays hidden, and the tile's inverted colours stay reverted, until focus leaves and comes back.

1.4.13 requires focus-triggered content to remain visible until the focus trigger is removed, the user explicitly dismisses it, or it becomes invalid. Pointer movement over a neighbour is none of these.
**Fix:** When the pointer leaves, hand visibility back to the focused tile, or do not dismiss the focused tile on a pointer enter:
```ts
tile.addEventListener('pointerleave', () => {
  const active = doc.activeElement;
  if (active instanceof HTMLElement && active !== tile && tiles.includes(active)) {
    active.removeAttribute('data-dismissed');
  }
}, { signal });
```
Then add a unit test: focus A, then pointerenter and pointerleave on B, and check that A is not dismissed.

## Info

### IN-01: The duplicate list carries conflicting `flex` and `hidden` utilities

**File:** `src/components/sections/RolesMarquee.astro:19-20,43`
**Issue:** `copyClasses` starts with `flex`, and the duplicate `<ul>` adds `hidden motion-on:flex`. Both base utilities set `display`. Whether the list is hidden depends on the order in which Tailwind emits `.flex` and `.hidden`, not on the markup. The e2e test currently confirms that it is hidden, but this breaks easily.
**Fix:** Move `flex` out of the shared string. Use `flex` on the first copy and `hidden motion-on:flex` on the second.

### IN-02: The Escape handler acts globally and unconditionally

**File:** `src/lib/ui/tooltips.ts:65-75`
**Issue:** Every Escape anywhere on the page marks all tiles `data-dismissed`. This happens even when no tooltip is visible and even if another component (a future mobile menu or dialog) already handled the key. There is no `event.defaultPrevented` check.
**Fix:** Return early when `event.defaultPrevented` is set, and act only when a tile is open, hovered (`:hover`) or focused.

### IN-03: Without JavaScript, tooltips cannot be dismissed

**File:** `src/components/sections/ToolsRow.astro:17-18`
**Issue:** Without JS, the CSS hover and focus-visible tooltip cannot be dismissed with Esc. The bubble (bottom-full, about 36px tall) can overlap the heading 32px above it. 1.4.13 "dismissible" applies when content obscures other content. This is an accepted progressive-enhancement trade-off, but it is undocumented.
**Fix:** Document the trade-off in the component comment, or increase the heading-to-row gap so the bubble never overlaps other content.

### IN-04: The schema does not enforce en/es parity for service items

**File:** `src/content.config.ts:15-18`
**Issue:** `localizedList` validates each locale on its own. A missing bullet in one language passes `astro check` and the build. Only the hard-coded `[4, 5, 6, 3]` unit test catches it, and that test breaks on every legitimate content edit.
**Fix:** `localizedList.refine((v) => v.en.length === v.es.length, { error: 'en/es item counts differ' })`, and drop the hard-coded counts from the test.

### IN-05: The entry interfaces duplicate the zod schema by hand

**File:** `src/lib/content/home.ts:12-34`
**Issue:** `RoleEntry`, `ServiceEntry`, `ToolEntry` and `ProfileEntry` restate the schema shapes. Structural typing at `queries.ts` catches gross drift. New optional fields, or narrower types such as `order` being an int, are not reflected.
**Fix:** Export the zod schemas from a module free of `astro:content` and derive the types with `z.infer`, keeping `home.ts` testable under Vitest.

### IN-06: Edge anchoring of tooltips only handles a single row

**File:** `src/components/sections/ToolsRow.astro:26-31`
**Issue:** `anchor()` pins only index 0 and the last index. If a sixth tool is added, or gaps grow, the `flex-wrap` row wraps. The first and last tiles of each visual row then get centred tooltips that can overflow a 320px viewport.
**Fix:** Keep the tool count capped and assert it (like `assertCount` for services), or position the tooltips at runtime.

### IN-07: Two motion gates are used side by side

**File:** `src/components/sections/ToolsRow.astro:18,21`, `src/components/sections/RolesMarquee.astro:20`
**Issue:** The tile and tooltip transitions use `motion-safe:` (the media query). The marquee uses `motion-on:` (`html[data-motion]`) together with `motion-reduce:`. Phase 6 plans a stored user override (MOTN-08) that will write only `data-motion`, so `motion-safe:` transitions will ignore it.
**Fix:** Use `motion-on:` consistently for every motion-gated utility.

---

_Reviewed: 2026-10-16T21:50:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
