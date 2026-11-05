---
phase: 07-page-transitions-smooth-scroll
reviewed: 2026-11-05T00:00:00Z
depth: standard
files_reviewed: 32
files_reviewed_list:
  - scripts/bundle.ts
  - scripts/measure-bundle.ts
  - src/components/contact/ContactForm.astro
  - src/components/project/CollectionModule.astro
  - src/data/project-overrides.json
  - src/lib/motion/nav-focus.ts
  - src/lib/motion/navigation.ts
  - src/lib/motion/tokens.ts
  - src/lib/projects/detail-view-site.ts
  - src/lib/projects/model.ts
  - src/lib/ui/contact-form-boot.ts
  - src/lib/ui/contact-form-loader.ts
  - src/styles/global.css
  - tests/e2e/a11y.spec.ts
  - tests/e2e/anchors.spec.ts
  - tests/e2e/collection-motion.spec.ts
  - tests/e2e/contact-lazy.spec.ts
  - tests/e2e/contact-preselect.spec.ts
  - tests/e2e/contact.spec.ts
  - tests/e2e/helpers/contact.ts
  - tests/e2e/motion-pointer.spec.ts
  - tests/e2e/motion-toggle.spec.ts
  - tests/e2e/nav-feedback.spec.ts
  - tests/e2e/transitions-capture.spec.ts
  - tests/e2e/transitions.spec.ts
  - tests/unit/contact-form-loader.test.ts
  - tests/unit/measure-bundle.test.ts
  - tests/unit/motion-navigation.test.ts
  - tests/unit/motion-tokens.test.ts
  - tests/unit/nav-focus.test.ts
  - tests/unit/project-detail-site.test.ts
  - tests/unit/project-modules.test.ts
findings:
  critical: 0
  warning: 2
  info: 7
  total: 9
status: issues_found
---

# Phase 7: Code Review Report (re-review after gap closure 07-11..07-17)

**Reviewed:** 2026-11-05
**Depth:** standard
**Files Reviewed:** 32
**Status:** issues_found

## Narrative Findings (AI reviewer)

## Summary

This re-review covers the gap-closure diff `eee7f1a..HEAD` for the 32 listed files: the nav-focus fixes (07-11), the morph unwrap and the 480 ms wipe (07-13), collection cell drift (07-14), the lazy contact form loader (07-15), the pressed state (07-16), and the bundle gate that now measures every page. I checked the anchor and popstate paths against the installed `node_modules/astro/dist/transitions/router.js` (lines 133-190, 279-284, 453-472, 487-491). I checked the `stackMotion` override against `src/data/behance/snapshot.json`: all 58 ImageModule ids of project 176799549 are listed and none of its 27 collection cells are, so the data matches the intent.

Five of the six prior findings are resolved and one is partly resolved. I found no critical issues. The two new warnings are the part of WR-02 that is still open (Back during an anchor glide still glides) and a focus handoff in the lazy loader that picks the wrong radio. The rest are info items.

Not raised again, as instructed: (a) Home grows by 450/793 px when the lazy form loads; (b) on `/?service=X`, clicking the Ask link for the same service again does not reapply X.

Labels: [Inference] means the finding was traced through source and not reproduced in a browser.

## Prior findings

| ID | Status | Evidence |
|---|---|---|
| CR-01 (service `replaceState` puts the URL out of step with the router) | **Resolved** | `src/lib/motion/nav-focus.ts:209-211` now changes only the fragment (`next = new URL(here.href); next.hash = url.hash`), so `location.search` stays equal to the router's `originalLocation.search`. Covered by `tests/e2e/anchors.spec.ts:272-318`, which runs Ask, type, Ask again, then the skip link under `on` and `reduced` and asserts the marker, the VT count and the message. |
| WR-01 (nav focus has no stale-navigation guard) | **Resolved** | `nav-focus.ts:241-261`: `navToken` goes up on `astro:before-swap`, and `onPageLoad` returns when `mine !== navToken` after `waitForRelease()`. |
| WR-02 (a pending glide is not cancelled by history traversal) | **Partly resolved** | `nav-focus.ts:143-154, 224-225`: `popstate` and `astro:before-preparation` now cancel the pending landing, so the abandoned target no longer gets focus. The scroll itself still glides on Back, because the router's popstate handler runs before this one. See WR-01 below. |
| WR-03 (focus target never checked for focusability) | **Resolved** | `nav-focus.ts:48-66`: `ensureFocusable` adds `tabindex="-1"` and `focusWithFallback` checks `activeElement` and moves on to `main h1`, then `#main`. Used at `nav-focus.ts:168` and `:258`. A side effect is noted in IN-03. |
| WR-04 (bundle gate only measured `/` and `/es/`) | **Resolved** | `scripts/measure-bundle.ts:121-169` measures every `.html` under `dist/client` through `pagesFromHtmlFiles` (`scripts/bundle.ts:17-29`), and `REQUIRED_ROUTES` guards against an empty build. A small gap is noted in IN-05. |
| IN-01 (morph wrapper left in the landed h1) | **Resolved** | `src/lib/motion/navigation.ts:307-316` unwraps `entry.target` one frame after `transition.finished` settles, guarded by `isConnected`. |

## Warnings

### WR-01: Back during an anchor glide still glides, because the router's popstate handler runs before the cancel (rest of prior WR-02)

**File:** `src/lib/motion/nav-focus.ts:217-225` (with `node_modules/astro/dist/transitions/router.js:170, 453-472, 491`)
**Issue:** [Inference, traced in router source] For a same-page anchor under `on`, the plain branch sets an inline `html.style.scrollBehavior = 'smooth'` (`nav-focus.ts:219`) for up to 1200 ms. The fix restores it in `cancelPending` on `popstate` (`nav-focus.ts:224`). The router, however, adds its own `popstate` listener when its module is evaluated (`router.js:491`). That module comes from the `<ClientRouter />` script in `<head>`, so it is evaluated before `src/lib/motion/index.ts`, which is imported from the body script in `BaseLayout.astro:62-65`. Listeners on the same target run in the order they were added, so on Back:

1. The router's `onPopState` runs first. `transition()` sees `samePage` and calls `moveToLocation` synchronously, which calls `scrollTo(historyState.scrollX, historyState.scrollY)` (`router.js:170`) while the inline `smooth` is still set, so the history restore glides.
2. Only after that does `cancelPending` put the old `scroll-behavior` back. Changing the property does not stop a smooth scroll that has already started.

Focus is no longer moved to the abandoned target, so that half of WR-02 is fixed. But a history traversal still animates, which breaks the rule in this file's own comment ("Never set in CSS, because the router restores history positions with scrollTo", `nav-focus.ts:115-116`). It is also motion the visitor did not ask for. The unit test dispatches `popstate` with only our listener bound, so it cannot catch the ordering.
**Fix:** Keep `smooth` on `html` only until the glide has started, not until it lands. [Inference] An in-progress smooth scroll keeps going after `scroll-behavior` changes, so the anchor still glides, and any later router `scrollTo` (a history traversal) jumps:
```ts
// plain branch, 'on'
cancelPending();
const previous = html.style.scrollBehavior;
html.style.scrollBehavior = 'smooth';
// the router's fragment move starts the glide in this task; put the property back on the first frame
view.requestAnimationFrame(() => { html.style.scrollBehavior = previous; });
void land(view, target, true, null); // landing no longer owns a restore
```
Adding our listener with `capture: true` would not help: both handlers are on `window`, run at target phase, and run in the order they were added. Add an e2e test: click an anchor under `on`, press Back within 200 ms, and check that `scrollY` reaches the restored value within one or two frames.

### WR-02: The lazy loader's focus handoff picks the first service chip, not the checked one

**File:** `src/lib/ui/contact-form-loader.ts:811-816` (lines 51-60 of the new file)
**Issue:** `querySelector` with a selector list returns the **first element in document order** that matches any of the selectors. The list is not a priority list. In `ContactForm.astro` the `ServiceChips` radios are the first inputs in the form, and the checked default is `other`, which is the last chip (`ServiceChips.astro`, `checked={choice.id === 'other'}`). So `input[name="service"]:checked, input:not([type="hidden"]):not([tabindex="-1"]), …` matches the **first, unchecked** radio through the second selector, before the checked chip. A keyboard user who tabbed onto the no-JS mailto button while the chunk was loading lands on, for example, "Web design, radio button, not checked, 1 of 6", while the selected value is "other" (or the `?service=` preselect). That is wrong state for a screen reader, and it does not match the roving-radio convention where focus enters a group on its checked radio. Accessibility is a hard requirement in CLAUDE.md. The unit test fixture (`tests/unit/contact-form-loader.test.ts:36-39`) has no radios, so the test does not catch this.
**Fix:** Query in priority order:
```ts
const next =
  form.querySelector<HTMLElement>('input[name="service"]:checked') ??
  form.querySelector<HTMLElement>(
    'input:not([type="hidden"]):not([tabindex="-1"]):not([name="service"]), textarea, button',
  );
next?.focus();
```
Add two radios (second one `checked`) to the test fixture and assert that the checked one receives focus.

## Info

### IN-01: The retry after a failed chunk load probably does nothing, and a throw from `init` is unhandled

**File:** `src/lib/ui/contact-form-loader.ts:798-824`
**Issue:** [Inference] `MAX_ATTEMPTS = 2` retries `load()`, and `load()` is the same `import('../../lib/ui/contact-form-boot')`. Browsers cache a failed module fetch in the module map, so a second dynamic `import()` of the same specifier usually rejects again without a new network request. The retry the comment and test describe ("retries once on a later trigger") is unlikely to recover in production. The unit test passes because it injects a fresh fake `load`. Separately, if `init(doc)` throws inside the success callback, the rejection is unhandled, `busy` stays `true`, and triggers are already stopped. The visitor keeps the mailto block, which is the correct fallback, but nothing is logged through the `[contact]` path.
**Fix:** Either drop the retry and document "one attempt, mailto stays", or make it a real retry with a cache-busting specifier, which is not possible with a static `import()`, so dropping it is simpler. Wrap `init(doc)` in `try/catch` and log through the same `console.error`.

### IN-02: A `pointerdown` trigger can swallow a tap on the no-JS mailto button

**File:** `src/lib/ui/contact-form-loader.ts:827-829`
**Issue:** [Inference] `pointerdown` anywhere in `#contact`, including the `[data-contact-nojs]` "Email me" button, starts the load. If the chunk resolves between `pointerdown` and `click`, which is likely when it is already in the HTTP cache or prefetched, the controller hides the button under the pointer. The `click` then goes to a common ancestor, and the mailto never opens. In practice the IntersectionObserver usually starts the load a viewport earlier, so this only shows up on slow networks. It is related to known gap (a) but is a separate effect: a lost activation, not a layout shift.
**Fix:** Leave out `pointerdown` targets inside `[data-contact-nojs]` (`if ((e.target as Element).closest('[data-contact-nojs]')) return;`), or wait until after the `click` before hiding the block, for example by having `start` delay `init` by one task when it was triggered by a pointer.

### IN-03: `ensureFocusable` adds `tabindex="-1"` for good, and only `h1`, `main` and `section` suppress the ring

**File:** `src/lib/motion/nav-focus.ts:48-51`; `src/styles/global.css:184`
**Issue:** The attribute is never removed. An `h2` or `div` hash target (for example a future `#work-title`) becomes click-focusable from then on, and `:is(h1, main, section)[tabindex='-1']:focus { outline: none }` does not cover it. A keyboard-triggered programmatic focus can then show a UA focus ring around a heading or block. The file header says these targets "show no ring", which is now only true for those three tags.
**Fix:** Remove the attribute on `blur` when this code added it (`el.addEventListener('blur', () => el.removeAttribute('tabindex'), { once: true })`), or widen the CSS rule to `[tabindex='-1']:focus:not(:focus-visible)` and accept a ring for keyboard users.

### IN-04: `stackMotion` now lists 58 image ids to express "drift only", so new images in that project animate by default

**File:** `src/data/project-overrides.json:87-146`; `src/lib/projects/detail-view-site.ts:687-694`
**Issue:** One opt-out list now controls two behaviours: side entrance for ImageModules and drift for collection cells. To keep InstaBlogs' images still while its collection cells drift, every image id is listed. I verified that all 58 match the snapshot. If Martina adds an image to that project and the snapshot is re-synced, the new id is not in the list, so it gets the side entrance. The build only checks for ids that no longer exist, not for new ones. The overload also means `stackMotion: false` now turns drift off too.
**Fix:** Split the setting (for example `stackMotion: false` together with `collectionDrift: true`), or add a sync-time warning when a project with an explicit list gains unlisted ImageModule ids.

### IN-05: The bundle gate does not require any detail page or the 404 page, and the route appears twice in its messages

**File:** `scripts/measure-bundle.ts:62, 167-168`
**Issue:** `REQUIRED_ROUTES` covers only Home and Projects in both locales. A build that silently produces no detail pages (for example `getStaticPaths` returning `[]` after a bad sync) passes by measuring fewer pages, which is the failure mode the comment on line 61 is meant to prevent. Also, `checkEagerCeiling` already includes the route in its text (`bundle.ts:118`), and the caller now prefixes it again, so the output reads `/: eager JS on / is …`.
**Fix:** Require at least one `/projects/<slug>/` and one `/es/projects/<slug>/` page (for example `pages.some(p => /^\/projects\/[^/]+\/$/.test(p.route))`) and `/404.html`. Then push `ceilingProblem` without the extra prefix.

### IN-06: After CR-01 the URL can show a different service from the checked chip

**File:** `src/lib/motion/nav-focus.ts:201-214`
**Issue:** This was the intended trade-off for CR-01, but it has a visible effect beyond known item (b). On `/?service=X`, clicking the Ask link for service Y checks Y and leaves `?service=X` in the URL. A reload, a shared link, or a Back that comes back to Home after a soft navigation away restores X. On `/`, the Ask click no longer leaves a shareable `?service=` at all. This is not a correctness bug in the submitted form, because the chip is what gets submitted. It is worth recording next to (b) so the follow-up handles both.
**Fix:** Record it with the deferred (b) follow-up. If URL accuracy matters, update the search together with the router through `navigate(url, { history: 'replace' })` from `astro:transitions/client` in a way that skips the swap, or accept that the URL is not the source of truth and document that.

### IN-07: Very small timing margins in the wipe-skip e2e assertions

**File:** `tests/e2e/transitions-capture.spec.ts` (`expect(finishedAt - readyAt).toBeLessThan(460)` and `expect(changeAt - readyAt).toBeLessThan(480)`, around the "arrival after the wipe (07-04)" describe)
**Issue:** With the wipe cut to 480 ms, the gap between "skipped" and "finished naturally" is now 20 ms (it was 40 ms). The press can only land at release (about 336 ms), so a slow CI frame or two will fail the test with no real regression.
**Fix:** Assert the skip directly, for example by checking that the `finished` promise settled while the record's `skipTransition` spy was called, or by comparing against `ready + durations.wipe * 1000 - 1` and relying on the other assertion (`finishedAt - toggleAt <= 250`). Avoid a fixed 460.

---

_Reviewed: 2026-11-05_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
