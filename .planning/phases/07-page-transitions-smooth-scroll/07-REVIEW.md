---
phase: 07-page-transitions-smooth-scroll
reviewed: 2026-11-04T00:00:00Z
depth: standard
files_reviewed: 66
files_reviewed_list:
  - scripts/bundle.ts
  - scripts/measure-bundle.ts
  - src/components/contact/ContactSection.astro
  - src/components/global/CursorFollower.astro
  - src/components/global/SiteHeader.astro
  - src/components/global/SkipLink.astro
  - src/components/project/ImageModule.astro
  - src/components/project/NextProjectTeaser.astro
  - src/components/project/ProjectIntro.astro
  - src/components/project/ProjectModule.astro
  - src/components/project/StackFrame.astro
  - src/components/sections/Hero.astro
  - src/components/ui/ProjectCard.astro
  - src/components/views/NotFoundView.astro
  - src/components/views/ProjectsView.astro
  - src/data/project-overrides.json
  - src/layouts/BaseLayout.astro
  - src/lib/motion/cursor.ts
  - src/lib/motion/effects.ts
  - src/lib/motion/hero.ts
  - src/lib/motion/index.ts
  - src/lib/motion/lifecycle.ts
  - src/lib/motion/load-lenis.ts
  - src/lib/motion/nav-focus.ts
  - src/lib/motion/navigation.ts
  - src/lib/motion/reveal.ts
  - src/lib/motion/smooth-scroll.ts
  - src/lib/motion/tokens.ts
  - src/lib/projects/detail-view-site.ts
  - src/lib/projects/model.ts
  - src/lib/projects/overrides-schema.ts
  - src/lib/projects/projects.ts
  - src/lib/ui/service-preselect.ts
  - src/styles/global.css
  - src/styles/smooth-scroll.css
  - tests/e2e/anchors.spec.ts
  - tests/e2e/contact-preselect.spec.ts
  - tests/e2e/helpers/motion.ts
  - tests/e2e/helpers/navigation.ts
  - tests/e2e/motion-hover.spec.ts
  - tests/e2e/motion-pointer.spec.ts
  - tests/e2e/navigation-leaks.spec.ts
  - tests/e2e/parallax.spec.ts
  - tests/e2e/smooth-scroll.spec.ts
  - tests/e2e/stack-entrance.spec.ts
  - tests/e2e/transitions-capture.spec.ts
  - tests/e2e/transitions-reduced.spec.ts
  - tests/e2e/transitions.spec.ts
  - tests/unit/lifecycle.test.ts
  - tests/unit/measure-bundle.test.ts
  - tests/unit/motion-cursor.test.ts
  - tests/unit/motion-hero.test.ts
  - tests/unit/motion-load-lenis.test.ts
  - tests/unit/motion-navigation.test.ts
  - tests/unit/motion-reveal.test.ts
  - tests/unit/motion-tokens.test.ts
  - tests/unit/nav-focus.test.ts
  - tests/unit/picture-format.test.ts
  - tests/unit/project-card-view.test.ts
  - tests/unit/project-card.test.ts
  - tests/unit/project-detail-site.test.ts
  - tests/unit/project-modules.test.ts
  - tests/unit/projects-order.test.ts
  - tests/unit/projects-overrides.test.ts
  - tests/unit/service-preselect.test.ts
  - tests/unit/smooth-scroll.test.ts
findings:
  critical: 1
  warning: 4
  info: 1
  total: 6
status: issues_found
---

# Phase 7: Code Review Report

**Reviewed:** 2026-11-04
**Depth:** standard
**Files Reviewed:** 66
**Status:** issues_found

## Narrative Findings (AI reviewer)

## Summary

I read all of the phase 7 source in full: the router hooks (`navigation.ts`), nav and anchor focus (`nav-focus.ts`), the lifecycle release gate, Lenis smooth scroll, the persistent cursor, the parallax and stack-entrance CSS, the override schema and the bundle measurement script. I also checked them against the installed `astro/dist/transitions/router.js`, `astro/components/ClientRouter.astro` and `lenis/dist/lenis.mjs`.

The page-scoped cleanup holds up. Lenis is destroyed on before-swap, the cursor uses delegated listeners with an AbortSignal, and the lifecycle mount is guarded by a navigation token. The hash lookup uses `getElementById` only, and the pill label is written with `textContent` only. No XSS or injection paths were found.

The main defect is in the same-page "Ask about this" path. It rewrites the URL behind the ClientRouter's back, and that breaks later same-page navigation. Smaller issues are a missing stale-navigation guard in nav focus, a pending inline `scroll-behavior: smooth` that survives history traversal, a focus fallback that can silently fail, and a bundle gate that only measures two routes.

The known open gaps listed in the brief (eager JS over the ceiling, `--t-wipe` length, morph ghosting, CollectionModule grid motion, cold-cache touch latency) are left out on purpose.

Verification labels: findings marked [Inference] come from tracing the router source. They were not reproduced in a browser.

## Critical Issues

### CR-01: The service-link `replaceState` puts the URL out of step with the router, so later in-page clicks swap Home onto itself and lose the typed message

**File:** `src/lib/motion/nav-focus.ts:159-170`
**Issue:** [Inference, traced in `node_modules/astro/dist/transitions/router.js` lines 7, 159, 451, 472] The ClientRouter decides "same page" by comparing the target URL with its private `originalLocation`, not with `location`:

- `navigate()` calls `transition("forward", originalLocation, new URL(href))`.
- `samePage()` compares `pathname` and `search`.

The service branch calls `view.history.replaceState(view.history.state, '', url.href)`. That changes `location.search` to `?service=<id>`, but `originalLocation` keeps the old search (for example `''`). After that:

1. **Clicking the same "Ask about this" link a second time.** `url.search === here.search`, so the hook takes the plain branch and hands the click to the router. The router sees `''` and `?service=<id>`, decides it is not the same page, and runs a full soft navigation: it fetches Home, swaps it onto itself and plays the wipe. The visitor's typed message is lost, which is the exact outcome the branch was written to prevent (07-07).
2. **The skip link (`href="#main"`).** It resolves to `/?service=<id>#main`, so the same thing happens: a skip-link press swaps the whole page and wipes the form.
3. **History.** Back or forward onto the rewritten entry also compares against a stale `originalLocation` and can trigger a swap instead of a scroll.

The e2e test (`tests/e2e/anchors.spec.ts:233`) only covers a single click, so this path is not tested.

**Fix:** Do not change the search part of the URL behind the router. The chip is already checked locally, so keep the current search and update only the hash:
```ts
// keep router's notion of "same page" intact: only the fragment changes
const next = new URL(here.href);
next.hash = url.hash;
view.history.replaceState(view.history.state, '', next.href);
```
Another option is to take over every same-pathname hash click locally (`preventDefault`, scroll, focus) whenever `here.search !== ''` contains `service`, so the router never compares against the stale location. Add an e2e test: Ask, type a message, Ask again, press the skip link, then assert `__marker`, `__vtCount` and the message value are unchanged.

## Warnings

### WR-01: Nav focus has no stale-navigation guard and can focus the next page while it is still under the ink

**File:** `src/lib/motion/nav-focus.ts:193-199`
**Issue:** `onPageLoad` awaits `waitForRelease()` and then focuses whatever page is live. Suppose navigation B starts before navigation A is released. B's view transition skips A's, A's `finished` settles, and A's release resolves. A's handler then focuses `pickFocusTarget(doc, …)`, which may already be B's h1 while B's wipe is still running and `data-vt` is set. That breaks D-14 ("at release, never earlier") and makes screen readers announce early. `bindToAstro` guards the same race with `navToken` (lifecycle.ts:90-93), but nav-focus does not.
**Fix:** Use the same token pattern:
```ts
let token = 0;
doc.addEventListener('astro:before-swap', () => { token += 1; }, { signal });
async function onPageLoad() {
  if (!navigated) return;
  navigated = false;
  const mine = token;
  await (options.waitForRelease?.() ?? Promise.resolve());
  if (signal.aborted || mine !== token) return;
  pickFocusTarget(...)?.focus({ preventScroll: true });
}
```

### WR-02: A pending anchor glide is not cancelled by history traversal, so a later back press can glide and focus the abandoned target

**File:** `src/lib/motion/nav-focus.ts:100-180`
**Issue:** [Inference] Under `on`, the plain branch leaves the inline `html.style.scrollBehavior = 'smooth'` in place for up to 1200 ms (`GLIDE_FOCUS_FALLBACK_MS`). `cancelPending` only runs on a new click or on unbind. If the visitor presses Back during the glide, the router restores the previous position with `scrollTo(historyState.scrollX, historyState.scrollY)` (router.js:170). That call passes no `behavior`, so it glides instead of jumping, against the "never set smooth in CSS because the router restores history with scrollTo" rule in the same file. The pending `land()` then resolves on that `scrollend` and moves focus to the anchor the visitor just navigated away from.
**Fix:** Cancel on any router or history navigation:
```ts
view.addEventListener('popstate', cancelPending, { signal });
doc.addEventListener('astro:before-preparation', cancelPending, { signal });
```
(For the `view` reference, bind with `doc.defaultView` inside `bindAnchorFocus`.)

### WR-03: The focus target is never checked for focusability, so focus can be silently lost

**File:** `src/lib/motion/nav-focus.ts:17-39` and `nav-focus.ts:126`, `nav-focus.ts:198`
**Issue:** `pickFocusTarget` returns the hash element as soon as it exists, and the anchor hook calls `target.focus()` on it directly. If the id belongs to an element with no `tabindex` and no native focusability (any `id` on a div, span or section other than `#contact`, reached through history traversal or a link added later), `focus()` does nothing. It also does not fall back to `main h1` or `#main`. After a swap the previously focused node has been removed, so focus drops to `<body>`. The file comment ("All three carry `tabindex="-1"`") and T-07-20 ("focus is never lost") are only true for today's markup.
**Fix:** Fall through when the hash element can't take focus, or make it focusable:
```ts
const focusable = (el: HTMLElement) => el.tabIndex >= 0 || el.hasAttribute('tabindex') || el.matches('a[href],button,input,select,textarea');
const fromHash = hashTarget(doc, hash);
if (fromHash) {
  if (!focusable(fromHash)) fromHash.setAttribute('tabindex', '-1');
  return fromHash;
}
```

### WR-04: The bundle gate only measures `/` and `/es/`, so the eager ceiling and lazy-library markers are not enforced on other routes

**File:** `scripts/measure-bundle.ts:10-13`
**Issue:** `PAGES` lists only the two home pages. Project detail pages, `/projects/` and the 404 page load different module entries. Detail pages, for example, load project and contact-band scripts, and under ClientRouter they are often the first page a visitor lands on. A GSAP or Lenis import that becomes eager only on those routes, or an eager total over 22,000 B there, passes the check. The phase relies on this script as its "measure, don't guess" quality gate (CLAUDE.md).
**Fix:** List the HTML files under `dist/client` (or at least one detail page per locale, `/projects/`, `/es/projects/` and `404.html`), and run the marker and ceiling checks for each one.

## Info

### IN-01: The morph wrapper stays in the landed h1, so the title DOM differs between a soft arrival and a full load

**File:** `src/lib/motion/navigation.ts:245-250`, `navigation.ts:283-288`
**Issue:** After the morph, `#project-title` keeps a `span[data-morph-title]` with inline `display:inline-block; width:fit-content`. The span exists only when the visitor arrived through a card click. The same page loaded directly, or reached by Back, has bare text. An inline-block box changes how `text-pretty` wraps and how line boxes are measured, so the h1 can wrap differently depending on how the visitor got there, and later DOM-dependent code (SplitText, tests) sees two shapes.
**Fix:** Unwrap the target too, once the transition finishes and after a frame, so the end state matches a full load. Alternatively, document the two shapes and cover both in a unit test.

---

_Reviewed: 2026-11-04_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
