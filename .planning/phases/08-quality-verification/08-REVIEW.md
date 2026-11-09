---
phase: 08-quality-verification
reviewed: 2026-11-09T00:00:00Z
depth: standard
files_reviewed: 34
files_reviewed_list:
  - package.json
  - scripts/spanish-review.ts
  - src/components/global/SkipLink.astro
  - src/components/sections/FeaturedServices.astro
  - src/components/sections/RolesMarquee.astro
  - src/components/ui/ServiceCard.astro
  - src/content.config.ts
  - src/data/services.json
  - src/i18n/ui.en.ts
  - src/i18n/ui.es.ts
  - src/lib/contact/email.ts
  - src/lib/content/home.ts
  - src/lib/content/icons.ts
  - src/lib/motion/index.ts
  - src/lib/motion/marquee.ts
  - src/lib/projects/overrides-schema.ts
  - src/pages/es/404.astro
  - tests/e2e/a11y-sweep.spec.ts
  - tests/e2e/a11y.spec.ts
  - tests/e2e/anchors.spec.ts
  - tests/e2e/helpers/axe.ts
  - tests/e2e/helpers/keyboard.ts
  - tests/e2e/helpers/routes.ts
  - tests/e2e/home-story.spec.ts
  - tests/e2e/keyboard-journeys.spec.ts
  - tests/e2e/motion.spec.ts
  - tests/e2e/not-found.spec.ts
  - tests/unit/contact-section.test.ts
  - tests/unit/content-home.test.ts
  - tests/unit/featured-services.test.ts
  - tests/unit/marquee-toggle.test.ts
  - tests/unit/project-card-view.test.ts
  - tests/unit/roles-marquee.test.ts
  - tests/unit/spanish-review.test.ts
findings:
  critical: 0
  warning: 3
  info: 7
  total: 10
status: issues_found
---

# Phase 8: Code Review Report

**Reviewed:** 2026-11-09
**Depth:** standard
**Files Reviewed:** 34
**Status:** issues_found

## Summary

I reviewed the changes in `2c2c8c5..HEAD`: the marquee pause controller rewrite (WR-01/WR-03), the on-demand Spanish 404, removal of the service icons, the Spanish review generator and its freshness test, the shared e2e helpers, the axe sweep and the keyboard journey spec. I did not run builds or servers. Statements about runtime behaviour come from reading the code and are labelled.

No blockers. The service icon removal is complete: nothing still references `ServiceIcon`, `serviceIconKeys` or `data-playing`. The `EMAIL_COPY_ES` refactor produces the same output, and a fixture test pins it. The `NON_COPY_TODOS` line numbers match the current files (checked by hand, and the unit test also checks them).

Main concerns:
1. The new marquee controller announces "pressed" as soon as the pointer hovers or keyboard focus lands. As a result, the first activation of a button labelled "Pause roles animation" starts the animation instead of pausing it.
2. The on-demand ES 404 now feeds a request-controlled `Astro.url.pathname` into the layout. That breaks a documented "never request input" invariant.
3. I found a concrete, timing-dependent cause for the known `@network` keyboard-journey flake in the test itself.

## Warnings

### WR-01: Marquee "Pause" button is announced as pressed on hover/focus, so the first press resumes the animation

**File:** `src/lib/motion/marquee.ts:43-48, 50-57, 59-75, 77-94`
**Issue:** `isPaused()` is `explicit ?? (hovered || focused)`, and `apply()` writes that value to `aria-pressed`. This is what happens now:
- A keyboard or screen-reader user tabs onto the button (`aria-label="Pause roles animation"`). On focus it becomes `aria-pressed="true"`, so it is announced as "Pause roles animation, toggle button, pressed" before the user has done anything. Pressing Space then sets `explicit = false` and the animation starts. A button labelled Pause, operated once, resumes motion.
- A mouse user always hovers before clicking, so the first click on the band also resumes. Pausing takes two clicks. The old controller paused on the first click.

The tests encode this on purpose (`home-story.spec.ts` "a click while hovered resumes", `keyboard-journeys.spec.ts:157-162`). The aria/visual consistency goal (WR-01) is met. The cost is that the control's label and the effect of its first activation no longer match for every non-touch user. [Inference] For WCAG 2.2.2, "a mechanism to pause" that resumes on its first use is a usability regression for exactly the users the mechanism is for. The transient hover/focus pause is a courtesy, not a user choice, so it should not be shown as the toggle's pressed state.
**Fix:** Keep the transient pause visual-only and expose only the explicit choice in `aria-pressed`. Make the first activation always pause:
```ts
const apply = (): void => {
  const paused = explicit ?? (hovered || focused);
  button.setAttribute('aria-pressed', String(explicit === true)); // user's choice only
  root?.toggleAttribute('data-paused', paused);                   // visual state
};
button.addEventListener('click', () => {
  explicit = explicit !== true; // null/false -> pause, true -> resume
  apply();
}, { signal });
```
If the aria/visual coupling must stay strict, then drop the hover and focus pause entirely. Do not let the transient state drive `aria-pressed`. Either way, update the e2e and unit expectations in `home-story.spec.ts`, `keyboard-journeys.spec.ts` (test 5), `motion.spec.ts:168-172` and `marquee-toggle.test.ts`.

### WR-02: On-demand ES 404 now feeds request-controlled `Astro.url.pathname` into the layout, breaking the "never request input" invariant

**File:** `src/pages/es/404.astro:8` (with `src/layouts/BaseLayout.astro:27`, `src/components/global/SiteHeader.astro:18-20`, `src/components/global/SeoHead.astro:7`)
**Issue:** Before this change every page was prerendered, so `Astro.url.pathname` was always a build-time constant. `SeoHead.astro:7` documents that guarantee ("URLs come only from astro.config `site` and the build-time pathname (never request input)"), and `NotFoundView.astro` adds "the 404 never reads or echoes the requested URL". With `prerender = false`, the Worker renders `/es/404.astro` for every `/es/*` miss, and `BaseLayout` passes the visitor's actual request path to `SeoHead`, `SiteHeader` (`stripLocale` → `isHome`/`isProjects` → `aria-current`) and `LanguageSwitcher`.

Today `buildSeo` and `LanguageSwitcher` ignore the pathname for `kind === 'notFound'`, and Astro escapes attributes. [Inference] So I found no exploitable path now. But the documented invariant is false, nothing enforces it, and any future use of `pathname` on a shared component would silently reflect attacker-chosen input on a live Worker response. The EN 404 (prerendered) and the ES 404 (on demand) also now receive different `pathname` values for the same `kind`.
**Fix:** Pin the pathname for 404s in the layout so the invariant holds whatever the render mode:
```astro
// BaseLayout.astro
const pathname = kind === 'notFound' ? `/${locale === 'en' ? '' : 'es/'}404/` : Astro.url.pathname;
```
Then update the `SeoHead.astro:7` and `NotFoundView.astro:9` comments to describe the on-demand ES 404.

### WR-03: Concrete race behind the `@network` flake at keyboard-journeys.spec.ts:275 — the form is filled while the Turnstile widget is still loading

**File:** `tests/e2e/keyboard-journeys.spec.ts:281-300`
**Issue:** The recorded failure is "`#contact-message` not focused after Tab" (line 297). The test fills name, email and message with `keyboard.type` right after `reachContactByKeyboard`. It only waits for the Turnstile token afterwards, at line 300.

The contact controller calls `ensureWidget()` when the form comes into view (`src/lib/ui/contact-form.ts:245-285`). That loads `challenges.cloudflare.com/turnstile/v0/api.js` over the real network, then runs `slot.replaceChildren()` and `turnstile.render(...)`, which inserts a cross-origin iframe. Under 5 parallel workers this lands inside the typing window at a random moment.

[Inference] If the widget's iframe takes focus during render or challenge (a known Turnstile behaviour in some modes; [Unverified] for the test sitekey in compact mode), the following happens:
- the rest of the email keystrokes go nowhere;
- the next Tab moves out of the iframe, not from `#contact-email`;
- `#contact-message` is never focused.

This matches the evidence: the failure is network-dependent, happens only under load, and passes 3/3 in isolation. Two other points:
- The test never asserts the typed values, so a focus steal during typing is invisible until the next focus assertion.
- `collectErrors(page)` in this describe has no ignore pattern. Any console error logged from the Turnstile frame (for example its Private Access Token 401) would also fail the `afterEach`, which is a second flake source in the same test.
**Fix:** Wait for the widget to settle before the keyboard fill, assert the values, and ignore Turnstile's own console noise:
```ts
await open(page, prefix);
await reachContactByKeyboard(page, prefix);
await waitForTurnstileToken(page);          // move up from line 300
...
await page.keyboard.type('ana@example.com');
await expect(page.locator('#contact-email')).toHaveValue('ana@example.com');
```
and in the `@network` `beforeEach`: `errors = collectErrors(page, /challenges\.cloudflare\.com/);`.

## Info

### IN-01: Sweep guard keeps a dead `/es/404/` exclusion, so it no longer guards the D-17 fix

**File:** `tests/e2e/a11y-sweep.spec.ts:19`
**Issue:** `es/404` is no longer prerendered, so `dist/client/es/404/index.html` should not exist and the `'/es/404/'` entry in `NOT_FOUND_FILES` never matches. If someone later removes `prerender = false`, the guard silently excludes the reintroduced static file. The only thing that would catch it is the status assertion in `not-found.spec.ts`.
**Fix:** Remove `'/es/404/'` from `NOT_FOUND_FILES` and assert `existsSync(join(DIST_CLIENT, 'es/404/index.html'))` is `false`.

### IN-02: Stale comments about what is on demand / which 404 answers `/es/*`

**File:** `astro.config.ts:11` ("the adapter adds one on-demand Worker for /_actions/*"), `src/components/views/NotFoundView.astro:9` ("The root 404.html answers every miss (including /es/*)"), `src/components/global/LanguageSwitcher.astro:19` ("the prerendered pathname is /404/")
**Issue:** All three contradict the new on-demand ES 404 and the comment in `not-found.spec.ts:5-9`.
**Fix:** Update the comments to say that the ES 404 is rendered on demand by the Worker.

### IN-03: `REVIEW_PATH` is cwd-relative

**File:** `scripts/spanish-review.ts:17, 229`; `tests/unit/spanish-review.test.ts:108`
**Issue:** If `node scripts/spanish-review.ts` runs from any directory other than the repo root, the review file is written somewhere else. The freshness test depends on cwd in the same way.
**Fix:** Resolve the path from the script location: `fileURLToPath(new URL('../.planning/phases/08-quality-verification/08-SPANISH-REVIEW.md', import.meta.url))`.

### IN-04: `NON_COPY_TODOS` range entry is never location-checked

**File:** `scripts/spanish-review.ts:42`; `tests/unit/spanish-review.test.ts:168-169`
**Issue:** `src/data/site.ts:18-20` does not match `/^(.+):(\d+)$/`, so the test skips it with `continue`. If `site.ts` is edited, this pointer drifts without any test failing.
**Fix:** Accept `:(\d+)(?:-(\d+))?` in the test and check that the range contains a `TODO(martina)` line.

### IN-05: Spanish-review test checks rows against the same `escapeCell` it is testing

**File:** `tests/unit/spanish-review.test.ts:30-32`
**Issue:** `expectRow` builds the expected row with the generator's own `escapeCell`, so a bug in escaping (pipes, newlines, CR) can't fail the test. `escapeCell` itself also leaves `\r` in place.
**Fix:** Add a direct unit test (`escapeCell('a|b\r\nc')` → `'a\\|b<br>c'`) and normalise `\r\n` before the `\n` replacement.

### IN-06: Weak replacement test for the icon removal

**File:** `tests/unit/content-home.test.ts:69-73`
**Issue:** "services have no icon field" only checks the raw JSON. The schema (`content.config.ts`) strips unknown keys anyway, so this test protects nothing important. It reads like a placeholder for the deleted test.
**Fix:** Drop it, or assert something about behaviour (for example, that `buildServices` output keys are exactly `['id','title','items']`).

### IN-07: Motion-change handler blurs the marquee toggle to `<body>`

**File:** `src/lib/motion/marquee.ts:96-104`
**Issue:** When the OS reduced-motion setting changes while the toggle has focus, `button.blur()` drops focus to `<body>`. The toggle becomes `display:none` anyway, but a keyboard user loses their place.
**Fix:** Move focus to a stable neighbour instead (for example, focus the section heading `#roles-title` with `tabindex="-1"`, or use the existing `focusWithFallback` helper).

---

_Reviewed: 2026-11-09_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
