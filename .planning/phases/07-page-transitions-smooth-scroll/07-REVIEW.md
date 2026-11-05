---
phase: 07-page-transitions-smooth-scroll
reviewed: 2026-11-05T23:55:57Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - src/components/contact/ContactForm.astro
  - src/lib/motion/nav-focus.ts
  - src/lib/ui/contact-form-loader.ts
  - src/styles/global.css
  - tests/e2e/anchors.spec.ts
  - tests/e2e/contact-lazy.spec.ts
  - tests/unit/contact-form-loader.test.ts
  - tests/unit/contact-section.test.ts
  - tests/unit/motion-tokens.test.ts
  - tests/unit/nav-focus.test.ts
findings:
  critical: 0
  warning: 2
  info: 4
  total: 6
status: issues_found
---

# Phase 7: Code Review Report (gap-closure review, plans 07-18 to 07-21)

**Reviewed:** 2026-11-05T23:55:57Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Narrative Findings (AI reviewer)

## Summary

This review covers the diff `5876569..HEAD` for the ten files changed by the four gap-closure plans: the contact form height reserve (07-18, `global.css` and the e2e), the loader focus and press fixes (07-19, `contact-form-loader.ts`), the early `scroll-behavior` restore and the history re-pin (07-20, `nav-focus.ts`), and the Turnstile slot `leading-[0]` (07-21, `ContactForm.astro`), plus the narrowed hide guard in `motion-tokens.test.ts`. The uncommitted `src/assets/hero/portrait.png` change was ignored as instructed.

What I checked beyond the diff: the ClientRouter source the re-pin depends on (`node_modules/astro/dist/transitions/router.js`, `moveToLocation` at lines 133-190, `transition` at 259-284, `onPopState` at 453-472 and the listener registration at 491), the layout order that fixes the `popstate` listener order (`src/layouts/BaseLayout.astro`: `<ClientRouter />` at line 39, the body script at line 62), the markup the new `:has()` rules target (`ContactSection.astro`: `[data-contact-nojs]`, `form[data-contact-form]` and `[data-contact-success]` are all direct children of `[data-contact-column]`, which carries no `display` utility), Tailwind's preflight (`[hidden]` rule is in `@layer base`, so the base-layer `!important` override is correctly placed) and the built CSS (`@property --tw-leading { inherits: false }`, so `leading-[0]` on the slot does not leak into the `text-sm` note). Verified by running: `vitest run` on the four changed unit files (126 passed), `eslint` on all ten files (clean), `astro check` (0 errors). Labels: [Inference] means traced through source, not reproduced in a browser.

No critical issues. The three prior findings this wave targeted are resolved (table below). The two warnings are both side effects of the new height reserve: it applies under print media, and it stays on when the lazy chunk never loads. The rest are info items.

## Prior findings addressed by this wave

| ID (previous report) | Status | Evidence |
|---|---|---|
| WR-01: Back during an anchor glide still glides | **Resolved** | `nav-focus.ts:194-203` restores the inline `scroll-behavior` on the first `scroll` event, so the router's history `scrollTo` (two-argument form, honours CSS `scroll-behavior`) no longer glides. `nav-focus.ts:166-184` re-pins the router's restored position one frame later for the Chromium one-frame leak. Covered by `tests/e2e/anchors.spec.ts:127-171` (y back within 1 px two frames after `popstate`, no landing focus) and four unit tests. |
| WR-02: Focus handoff picks the first service chip | **Resolved** | `contact-form-loader.ts:68-73` queries `input[name="service"]:checked` first, then the first non-radio field. `tests/unit/contact-form-loader.test.ts:186-208` has the radios in the real order and asserts the checked one. |
| IN-02: `pointerdown` trigger swallows a tap on the mailto button | **Resolved** | `contact-form-loader.ts:110-129, 91-93`: a press inside `[data-contact-nojs]` defers the mount to a 0 ms task after `pointerup`/`pointercancel` (so after the `click`), capped at 1000 ms. Seven unit tests cover the orderings. |
| Known gap (a): Home grows when the lazy form loads | **Resolved** | `global.css:684-704` lays the `[hidden]` form out invisibly in the same grid cell as the no-JS block while that block shows; `ContactForm.astro:137` removes the 6 px line-box descent under the inline widget iframe. Covered by `tests/e2e/contact-lazy.spec.ts:113-365` (footer and `scrollHeight` deltas within 1 px at 1440 and 390, both locales, reduced, no-JS, and a real-size widget fake). |

Carried over unchanged and not re-reviewed (outside this wave's scope, still open as recorded in the previous report): IN-01 (retry after a failed chunk load, unhandled `init` throw), IN-03 (`ensureFocusable` leaves `tabindex="-1"` for good), IN-04 (`stackMotion` id list), IN-05 (bundle gate required routes), IN-06 (URL vs checked chip after CR-01), IN-07 (wipe-skip timing margins).

## Warnings

### WR-01: The contact height reserve also applies on paper, so printing Home before the form mounts leaves a blank block

**File:** `src/styles/global.css:684-704`
**Issue:** [Inference] The reserve is gated on `@media (scripting: enabled)` only. Print media does not turn scripting off, so when a visitor prints (or saves as PDF) without having scrolled near `#contact`, the no-JS block is still visible, the `:has()` rules still match, and the `[hidden]` form is laid out at `visibility: hidden` in the same cell. The contact column then prints at the form's height (several hundred px per the earlier measurements: 450 px at 1440, 793 px at 390) with nothing in it below the "Email me" block. Before 07-18 the printed column was just the mailto block. The project keeps a print block in this very file (`global.css:360-387`, from the 06 review) precisely so paper gets a correct layout, and the e2e cannot see this because it never emulates print.
**Fix:** Scope the reserve to screens:
```css
@layer base {
  @media screen and (scripting: enabled) {
    /* unchanged rules */
  }
}
```
Add a `page.emulateMedia({ media: 'print' })` case to the 07-18 no-shift describe that asserts the column extent equals the no-JS block height (the same measurement as the existing no-JS test at `contact-lazy.spec.ts:254-281`).

### WR-02: When both chunk loads fail, the reserve never comes off, so the page keeps a form-sized blank area for the rest of the session

**File:** `src/styles/global.css:686`; `src/lib/ui/contact-form-loader.ts:98-106`
**Issue:** [Inference] The reserve matches as long as `[data-contact-nojs]` is not `[hidden]`, and the only thing that hides it is the controller mounting. After `MAX_ATTEMPTS` failures the loader logs, calls `stopTriggers()` and `press.abort()`, and leaves the no-JS block up, which is the right fallback for reaching Martina. But nothing tells the CSS that no mount is coming, so the invisible form keeps the column at the form's height and the visitor sees a large empty gap under the mailto block. A hashed-chunk 404 after a redeploy (HTML still cached, `contact-form-boot.<hash>.js` gone) is the realistic way to hit this, and the previous report's IN-01 already noted that the retry cannot recover from it. Before 07-18 this failure mode was visually clean.
**Fix:** Let the loader switch the reserve off on final failure and make the CSS honour it:
```ts
// contact-form-loader.ts, in the rejection branch
if (attempts >= MAX_ATTEMPTS) {
  stopTriggers();
  press.abort();
  region.querySelector('[data-contact-column]')?.setAttribute('data-contact-reserve', 'off');
}
```
```css
[data-contact-column]:not([data-contact-reserve='off']):has(> [data-contact-nojs]:not([hidden])) { ... }
```
(apply the same `:not(...)` to the three child rules). Add a unit case to "does not retry more than once after failures" that asserts the attribute, and an e2e case that aborts the chunk route twice and checks the column extent equals the no-JS block height.

## Info

### IN-01: The re-pin relies on the router's `popstate` listener being registered first, and that is only enforced by markup order

**File:** `src/lib/motion/nav-focus.ts:166-184`
**Issue:** `repinAfterTraversal` reads the live `scrollX`/`scrollY` at cancel time and assumes they are the router's restored position. That holds today because `<ClientRouter />` (`BaseLayout.astro:39`) registers its listener before the body script (`BaseLayout.astro:62`) binds this one, and the router calls `scrollTo` synchronously inside `moveToLocation` before its first `await` (`router.js:170`). If the order ever flips (script moved, or Astro changes how hoisted scripts are ordered), the handler captures the mid-glide offset and one frame later pins the page *to that offset*, actively undoing the router's restore. The unit test cannot see this (it dispatches `popstate` with only this listener bound); only the e2e proves the order.
**Fix:** Take the position from the entry the router just restored rather than from the viewport: `const state = view.history.state as { scrollX?: number; scrollY?: number } | null; const left = state?.scrollX ?? view.scrollX; const top = state?.scrollY ?? view.scrollY;`. The file already depends on the router's state object (`nav-focus.ts:252`), so this adds no new coupling, and it makes the re-pin correct in either listener order.

### IN-02: The press cap timer is scheduled on top of a pending 0 ms flush, leaving an orphan timer in one interleaving

**File:** `src/lib/ui/contact-form-loader.ts:91-93, 122-126`
**Issue:** If `pointerup` fires while the chunk is still loading, `release` schedules `flushPress` at 0 ms. If the load then resolves before that task runs, `pressed` is still `true`, so the resolve path writes `pressTimer = win.setTimeout(flushPress, PRESS_CAP_MS)` without clearing the 0 ms timer, whose id is now lost. It works by ordering: the 0 ms task fires first and clears the cap. But if `cleanup` runs in between, it clears only the cap; the orphan 0 ms task still runs `flushPress` after teardown (harmless today because `deferredMount` was cleared, but it is exactly the kind of post-cleanup callback the "cleanup while the mount is deferred" test tries to rule out, and that test does not cover this interleaving).
**Fix:** Only arm the cap when nothing is already scheduled, or clear first:
```ts
if (pressed && win) {
  deferredMount = () => mount(init);
  win.clearTimeout(pressTimer);
  pressTimer = win.setTimeout(flushPress, PRESS_CAP_MS);
}
```
and add a unit case: press, `pointerup`, resolve, `cleanup()`, then `expect(vi.getTimerCount()).toBe(0)`.

### IN-03: The keyboard focus handoff also runs after a pointer press, without `preventScroll`

**File:** `src/lib/ui/contact-form-loader.ts:63-74`
**Issue:** The handoff exists for "a keyboard user who tabbed onto the mailto link". On the new deferred path the mount runs 0 ms after a mouse click on that link, and in Chromium and Firefox a clicked link is the active element, so `hadFocus` is `true` and focus is moved into the checked radio (an `sr-only` input) with `.focus()` and no `preventScroll`. The pointer user just opened their mail client and gets an unrequested focus move and a possible small scroll; Safari (links do not take focus on click) behaves differently. Not an a11y violation, but inconsistent and not what the comment describes.
**Fix:** Pass the origin through: `deferredMount = () => mount(init, { fromPress: true })` and skip the handoff (or use `focus({ preventScroll: true })`) when `fromPress`.

### IN-04: The hide guard accepts any selector that merely ends with `form[data-contact-form][hidden]`, and its name no longer matches what it checks

**File:** `tests/unit/motion-tokens.test.ts:41-50`
**Issue:** The allow-list is `/form\[data-contact-form\]\[hidden\]$/` on the innermost selector. A selector list such as `[data-reveal], form[data-contact-form][hidden] { visibility: hidden }` or a copy of the rule placed outside the `(scripting: enabled)` block and the `:has()` guard would pass. The test is still titled "never hides with visibility/display" while it now permits one hide.
**Fix:** Match the whole guarded selector and pin the count:
```ts
const hides = [...code.matchAll(/visibility:\s*hidden|display:\s*none/g)];
expect(hides).toHaveLength(1);
expect(selectorAt(code, hides[0].index)).toMatch(
  /^\[data-contact-column\]:has\(> \[data-contact-nojs\]:not\(\[hidden\]\)\)\s*> form\[data-contact-form\]\[hidden\]$/,
);
```
and rename the test to "hides only the parked contact form (07-18 reserve)".

---

_Reviewed: 2026-11-05T23:55:57Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
