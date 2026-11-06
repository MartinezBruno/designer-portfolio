# Phase 8: Quality Verification - Pattern Map

**Mapped:** 2026-11-06
**Files analyzed:** 24 new or modified files (plus 3 planning docs for D-19)
**Analogs found:** 22 / 24

All line numbers were read on 2026-11-06 at commit `cf15eaf`. [Verified] means read directly in the file. [Inference] marks conclusions drawn from those reads.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `tests/e2e/a11y.spec.ts` (modify: every route x 3 motion states, D-07/D-08) | test (e2e) | request-response | itself (lines 60-79, 410-541) | exact |
| `tests/e2e/helpers/routes.ts` (new, optional: every-built-route list) | test helper | transform | `tests/e2e/helpers/projects.ts` + `scripts/bundle.ts` `pagesFromHtmlFiles` | exact |
| `tests/e2e/keyboard-journeys.spec.ts` (new, D-09) | test (e2e) | event-driven | `tests/e2e/a11y.spec.ts` `tabAndExpect` + `contact.spec.ts` + `contact-preselect.spec.ts` + `anchors.spec.ts` | role-match |
| `src/components/sections/RolesMarquee.astro` (modify, D-10/D-11/D-12) | component | event-driven | itself | exact |
| `src/lib/motion/marquee.ts` (modify, D-10/D-11) | utility (client effect) | event-driven | itself + `src/lib/motion/events.ts` `onMotionChange` | exact |
| `tests/unit/marquee-toggle.test.ts` (modify) | test (unit, happy-dom) | event-driven | itself | exact |
| `tests/e2e/home-story.spec.ts` (modify: marquee semantics, D-10; restored assertions, D-16) | test (e2e) | event-driven | itself lines 75-155 | exact |
| `tests/e2e/motion.spec.ts` (modify: WR-03 live switch, D-11) | test (e2e) | event-driven | itself lines 160-197 | exact |
| `src/components/global/SkipLink.astro` (modify, D-18) | component | request-response | itself | exact |
| `tests/e2e/anchors.spec.ts` (modify: skip-link padding assertion, D-18) | test (e2e) | request-response | itself lines 240-247 | exact |
| `src/pages/es/404.astro` + build/routing config (modify, D-17) | route / config | request-response | `scripts/e2e-preview-env.ts` (post-build step), `astro.config.ts`, `wrangler.jsonc` | partial |
| `tests/e2e/not-found.spec.ts` (modify, D-17) | test (e2e) | request-response | itself lines 16-59 | exact |
| `src/components/ui/ServiceIcon.astro` (delete, D-15) | component | n/a | n/a | n/a |
| `src/components/ui/ServiceCard.astro` (modify, D-15) | component | transform | itself | exact |
| `src/components/sections/FeaturedServices.astro` (modify, D-15) | component | transform | itself line 40 | exact |
| `src/content.config.ts` (modify, D-15 + D-13 pointer) | config (schema) | CRUD (content) | itself lines 25-33 | exact |
| `src/data/services.json` (modify, D-15) | model (data) | CRUD (content) | itself | exact |
| `src/lib/content/icons.ts` (modify, D-15) | utility | transform | itself | exact |
| `src/lib/content/home.ts` (modify, D-15) | service (pure) | transform | itself lines 17-41, 95-102 | exact |
| `tests/unit/content-home.test.ts` (modify, D-15) | test (unit) | transform | itself lines 69-74, 136-171 | exact |
| `src/lib/motion/index.ts` (modify comment, D-15) | utility | n/a | itself line 7 | exact |
| `tests/unit/spanish-review.test.ts` (new, D-13) | test (unit) | transform / file-I/O | `tests/unit/content-home.test.ts` + `src/lib/contact/strings.ts` (key enumeration) | role-match |
| `scripts/spanish-review.ts` or test-helper generator (new, optional, D-13) | utility (script) | file-I/O | `scripts/e2e-preview-env.ts`, `scripts/measure-bundle.ts` | role-match |
| `.planning/phases/08-quality-verification/08-SPANISH-REVIEW.md` (new, D-13) | doc (generated) | batch | none | no analog |
| `.planning/phases/08-quality-verification/08-LIGHTHOUSE.md` (new, D-06) | doc (report) | batch | `pnpm measure:bundle` output | no analog |
| `.planning/phases/06-*/06-VERIFICATION.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md` (modify, D-19) | doc | n/a | their own frontmatter | exact |

---

## Pattern Assignments

### `tests/e2e/a11y.spec.ts` (test, request-response): every route, 3 motion states

**Analog:** itself. [Verified]

**Imports** (lines 1-17):
```typescript
import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import snapshot from '../../src/data/behance/snapshot.json' with { type: 'json' };
import { site } from '../../src/data/site';
import services from '../../src/data/services.json' with { type: 'json' };
import { interpolate } from '../../src/i18n/t';
import { en, type Dictionary } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';
import { expectedDetails, expectedHome, expectedProjects, type ExpectedDetail, type ExpectedProject } from './helpers/projects';
import { openContactForm } from './helpers/contact';
import { settleMotion } from './helpers/motion';
```

**The code to replace** (lines 19-21, 34-44, 60-68): `AXE_DETAIL_SLUGS` is a hand-picked 3-slug sample, and `pages` is a hand list:
```typescript
const AXE_DETAIL_SLUGS = ['website-instablogs', 'portfolio-web', 'sistema-visual'] as const;
...
const pages = ['/', '/es/', '/projects/', '/es/projects/', '/does-not-exist', '/es/404/', ...detailPages];
```
[Proposed] Replace it with `(['en','es'] as const).flatMap(l => expectedDetails(l).map(d => d.href))` plus the 4 index routes and both 404s (`/does-not-exist`, `/es/does-not-exist` or `/es/404/`, depending on the D-17 result). `motionStateCases` (lines 46-58) should cover the same full list.

**One axe run per state, the 3 existing patterns to generalize:**

- `on` (lines 494-502):
```typescript
test(`${path} has zero axe violations in 'on' after every reveal settled`, async ({ page }) => {
  await page.goto(path);
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
  await settleMotion(page, { scrollThrough: true });
  const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  expect(violations).toEqual([]);
});
```
- `reduced` (lines 410-412 + 456-464): a `test.describe` block with `test.use({ reducedMotion: 'reduce' })`, then the same body, asserting `data-motion` = `'reduced'`.
- `off` (lines 511-541): `gotoWithoutSiteScripts(page, path)` (it strips `<script>` and aborts script requests), asserts `data-motion` = `'off'`, and asserts `[data-reveal-armed], [data-revealed]` has count 0. axe cannot run with `javaScriptEnabled: false`, so keep this helper.

**Tag set** (line 220): `const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];`. Lines 75-76 and 93-94 still inline the same array, so consolidate them onto `AXE_TAGS`.

**Runtime and sharding:** [Verified] `playwright.config.ts` has a single `chromium` project and no `fullyParallel` or `workers` setting, so files run in parallel and tests within a file run serially. [Proposed] Put the 54-run sweep in its own file (for example `tests/e2e/a11y-sweep.spec.ts`), or use `test.describe.configure({ mode: 'parallel' })`, so it doesn't serialize behind the keyboard tests in `a11y.spec.ts`.

**Keep:** the `@network` widget tests (lines 83-97), the embed-facade axe runs (lines 375-408), the OS-locked tooltip runs (lines 466-489), and the mid-reveal sample (lines 562-586).

---

### `tests/e2e/helpers/routes.ts` (new, optional): source of every built route

**Analog 1:** `tests/e2e/helpers/projects.ts`. This is the convention for a helper derived from the snapshot that Playwright does not collect (header comment, lines 1-3). It imports with `../../../src/...` paths and the `.ts` extension (lines 4-11):
```typescript
import overridesRaw from '../../../src/data/project-overrides.json' with { type: 'json' };
import { neighbours } from '../../../src/lib/projects/detail-view.ts';
```
`expectedDetails(locale)` (lines 137-160) returns the hidden-filtered detail pages in `/projects` order, each with `href`, `slug` and `hasEmbed`.

**Analog 2 (derived from the build):** `scripts/bundle.ts` lines 128-140, already unit-tested in `tests/unit/measure-bundle.test.ts`:
```typescript
export function pagesFromHtmlFiles(paths: readonly string[]): MeasuredPage[] {
  return paths
    .map((path) => path.replaceAll('\\', '/'))
    .filter((html) => html.endsWith('.html'))
    .map((html) => {
      if (html === 'index.html') return { route: '/', html };
      if (html.endsWith('/index.html')) return { route: `/${html.slice(0, -'index.html'.length)}`, html };
      return { route: `/${html}`, html };
    })
    .sort((a, b) => a.route.localeCompare(b.route));
}
```
[Verified] `dist/client` currently contains `404.html`, `index.html`, `projects/`, `es/index.html`, `es/projects/` and `es/404/index.html`. [Proposed] Get the list from `expectedDetails` (D-07 names it, and it works without a build at collection time). Optionally, add a guard test that the `pagesFromHtmlFiles(readdir(dist/client))` route set equals the helper set, so a new route type cannot be missed.

---

### `tests/e2e/keyboard-journeys.spec.ts` (new, D-09): automated keyboard journeys

**Tab-step assertion with a visible-focus check:** copy `tabAndExpect` + `Step` from `tests/e2e/a11y.spec.ts` lines 104-115 and 222-267. Better, move them into `tests/e2e/helpers/keyboard.ts` so both specs share one copy. It reads the accessible name from aria-labelledby, aria-label, `<label>` or text, and checks the `outline`, `::after` or label outline.

**Header steps** (a11y.spec.ts lines 142-153): skip link, wordmark, Projects, Contact, EN, ES, motion toggle (`tag: 'BUTTON'`).

**Skip link to `#main`** (`tests/e2e/anchors.spec.ts` lines 240-247):
```typescript
await page.goto('/');
await page.keyboard.press('Tab');
const skip = page.getByRole('link', { name: en['a11y.skipToContent'], exact: true });
await expect(skip).toBeFocused();
await page.keyboard.press('Enter');
await expect(page.locator('#main')).toBeFocused();
```

**Real :focus-visible on a target** (`tests/e2e/home-story.spec.ts` lines 29-40, `tabUntil`):
```typescript
async function tabUntil(page: Page, selector: string): Promise<void> {
  for (let presses = 0; presses < 30; presses += 1) {
    await page.keyboard.press('Tab');
    const matched = await page.evaluate((sel) => document.activeElement?.matches(sel) ?? false, selector);
    if (matched) return;
  }
  throw new Error(`Tab never reached ${selector} within 30 presses`);
}
```

**Card to detail, focus on h1 after navigation:** `softNavigate(page, link)` from `tests/e2e/helpers/navigation.ts` lines 43-60, then `await expect(page.locator('main h1')).toBeFocused();` (the pattern used in `tests/e2e/transitions.spec.ts` lines 122, 456 and 616). Next and previous hrefs come from `expectedDetails(locale)[i].next/previous` (helpers/projects.ts lines 81-82).

**Embed facade by keyboard:** `activateFacade` in a11y.spec.ts lines 376-386 stubs Figma with `page.route('https://embed.figma.com/**', ...)` and asserts that focus moves to `IFRAME`. For the journey, press Enter on the focused button instead of `.click()`.

**Service "Ask about this" leads to a preselected form:** `tests/e2e/contact-preselect.spec.ts` lines 1-40 (the `cardLinks` name builder, and `blockTurnstile`, which keeps the test hermetic):
```typescript
async function blockTurnstile(page: Page): Promise<void> {
  await page.route('https://challenges.cloudflare.com/**', (route) => route.abort());
}
```
Then assert `page.locator('#contact-service-${id}')).toBeChecked()` (contact-states.spec.ts line 120).

**Contact validation, with focus on the first invalid field** (`tests/e2e/contact.spec.ts` lines 355-369): submit empty, then each field gets `aria-invalid="true"`, `#contact-${field}-error` is visible, and `await expect(page.locator('#contact-name')).toBeFocused();`.

**Success panel and "Send another"** (`tests/e2e/contact.spec.ts` lines 195-214): the success `heading level 3` gets focus, then the button `dict['contact.success.again']` restores an empty form and puts focus on the name field. These need a real Turnstile token (`waitForTurnstileToken`, contact-states.spec.ts lines 27-31), so the success part **must carry `@network`** in its title (playwright.config.ts lines 12-15). The validation path can stay hermetic.

**Dual-locale loop** (contact-preselect.spec.ts lines 10-13):
```typescript
const cases = [
  { locale: 'en', prefix: '/', dict: en },
  { locale: 'es', prefix: '/es/', dict: es },
] as const;
```

---

### `src/components/sections/RolesMarquee.astro` + `src/lib/motion/marquee.ts` (D-10, D-11, D-12)

**Current state** [Verified, important for the planner]: part of WR-01 has **already shipped**. `marquee.ts` lines 19-26 set `data-playing` on an explicit resume, and `copyClasses` (RolesMarquee.astro line 23) contains `group-data-playing:[animation-play-state:running]!`. The remaining gap: **before the user's first click**, `group-hover:` and `group-has-[[data-marquee-toggle]:focus-visible]:` pause the band while `aria-pressed="false"`. `tests/e2e/home-story.spec.ts` lines 139-155 currently **assert that contradiction** ("keyboard focus pauses the band ... aria-pressed false ... paused"), and lines 130-137 assert the hover pause. D-10 has to change these tests too.

**Current classes** (RolesMarquee.astro lines 22-23):
```typescript
const copyClasses =
  'flex min-w-full flex-wrap items-center justify-center gap-x-[var(--marquee-gap)] gap-y-2 px-4 sm:px-6 lg:px-8 motion-on:shrink-0 motion-on:flex-nowrap motion-on:justify-around motion-on:px-0 motion-on:animate-marquee motion-reduce:animate-none group-hover:[animation-play-state:paused] group-has-[[data-marquee-toggle]:focus-visible]:[animation-play-state:paused] group-data-paused:[animation-play-state:paused] group-data-playing:[animation-play-state:running]!';
```

**Button** (lines 64-70). Keep it invisible (D-12) and keep the focus outline:
```astro
<button type="button" data-marquee-toggle aria-pressed="false" aria-label={t('roles.pause')}
  class="absolute inset-0 hidden cursor-pointer bg-transparent focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-accent-ink motion-on:block"></button>
```

**Controller pattern** (marquee.ts lines 10-34): an AbortController signal per mount, and a returned `Cleanup` registered through `lifecycle.register(initMarqueeToggles)` (RolesMarquee.astro lines 73-77). [Proposed] One option for D-10: the controller syncs `aria-pressed` with the transient pause, setting it on pointerenter/focus and clearing it on leave/blur unless the user made an explicit choice. The other option is to drop the hover/focus pause. The planner chooses.

**Live motion-state hook for D-11:** `src/lib/motion/events.ts` lines 14-26:
```typescript
export function onMotionChange(doc: Document, cb: (state: MotionState) => void, signal: AbortSignal): void {
  doc.addEventListener('motion:change', (event): void => { cb(event.detail.state); }, { signal });
}
```
Pass it the same `ac.signal` as the click listener. `currentMotionState(doc)` is at lines 34-37. [Verified] `syncMotionGate` is already wired in `src/lib/motion/index.ts` line 22, so `html[data-motion]` already follows OS changes. `tests/e2e/motion.spec.ts` lines 160-197 already assert copyB hidden, toggle hidden, `flexWrap: 'wrap'` and no clipped roles after `emulateMedia({ reducedMotion: 'reduce' })`. [Inference] Most of WR-03 may already pass. What is left is resetting `aria-pressed`, `data-paused` and `data-playing`, and any focus on the now-hidden button, when the state leaves `on`. Run motion.spec.ts first to confirm.

**Unit test analog** (`tests/unit/marquee-toggle.test.ts` lines 1-6, 22-29): `// @vitest-environment happy-dom`, an HTML `FIXTURE` string, and `beforeEach` that sets `document.body.innerHTML`. Dispatch motion changes with `dispatchMotionChange(document, 'reduced')` from `events.ts` line 29. Keep the 10-cycle idempotence test (lines 92-109).

**E2E analog for the visible play state:** home-story.spec.ts lines 42-47 (`style(copyA(page), 'animationPlayState')`) and 75-128.

---

### `src/components/global/SkipLink.astro` (D-18)

**Current** (line 15) [Verified]:
```
class="sr-only bg-surface-alt text-ink inline-flex min-h-11 items-center px-4 text-sm font-semibold focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus-visible:outline-2 ..."
```
The fix from 01-REVIEW WR-02 is to add `focus:px-4`, because `focus:not-sr-only` resets padding to 0 and comes after `px-4` in the CSS. **Test:** extend `tests/e2e/anchors.spec.ts` lines 240-247 (Tab once, skip link focused) with `expect(await skip.evaluate(el => getComputedStyle(el).paddingLeft)).toBe('16px')`. Per the memory "post-merge gate has no e2e", the plan that edits this CSS must run `anchors.spec.ts` and `a11y.spec.ts` itself.

---

### `src/pages/es/404.astro` + Workers routing (D-17)

**Page** (lines 1-16) [Verified]: `BaseLayout locale="es" kind="notFound"` + `NotFoundView locale="es" showAltLocale={false}`. Keep the content as it is.

**Build facts** [Verified]: `dist/client/es/404/index.html` exists, and there is no `dist/client/es/404.html`. `dist/server/wrangler.json` has `"assets":{"binding":"ASSETS","directory":"../client"}` and **no `not_found_handling`**. The root `wrangler.jsonc` only holds `name` and `compatibility_date`, and the adapter fills in `main` and `assets` at build. [Verified via not-found.spec.ts lines 5-6, 37-42] `/es/does-not-exist` already returns 404 with Spanish content through the adapter's Worker, so only the direct `/es/404/` URL returns 200.

**Post-build step analog** (if research picks a dist rename or move): `scripts/e2e-preview-env.ts` lines 6-24 (`existsSync` guard on `dist/...`, `process.exit(1)` with a "run pnpm build first" message, a single write). It runs inside the playwright `webServer.command` (playwright.config.ts line 20), and `pnpm test:e2e` is `astro build && playwright test`. A new post-build step must also be wired into `build` in `package.json`, or it never reaches a deploy.

**Config analog** (if research picks an adapter or route option): `astro.config.ts` adapter block `cloudflare({ imageService: 'compile', prerenderEnvironment: 'node' })`. Note the `process.env['VITEST']` stub branch: a config change must not break Vitest's `getViteConfig`.

**Test** (`tests/e2e/not-found.spec.ts` lines 37-42, the status-assert pattern):
```typescript
const response = await page.goto('/es/does-not-exist');
expect(response?.status()).toBe(404);
```
Add the same assertion for `/es/404/`, keeping the content checks at lines 45-58. Update the header comment (lines 5-6).

---

### D-15: remove the dead service icon data

[Verified] Full reference set from `grep ServiceIcon|icon`:

| File | Lines | Change |
|---|---|---|
| `src/components/ui/ServiceIcon.astro` | all | delete (no importer: `grep` finds no `import ServiceIcon`) |
| `src/components/ui/ServiceCard.astro` | 12 (`import type { ServiceIconKey }`), 17 (`icon: ServiceIconKey;`) | remove both. Line 22 already ignores `icon`. |
| `src/components/sections/FeaturedServices.astro` | 40 (`icon={service.icon}`) | remove the prop |
| `src/content.config.ts` | 10 (`serviceIconKeys` import), 29 (`icon: z.enum(serviceIconKeys),`) | remove both. Keep `toolIconKeys` (tools still use it, line 40). |
| `src/data/services.json` | 5, 25, 47, 71 (`"icon": ...`) | remove |
| `src/lib/content/icons.ts` | 1-4 | remove `serviceIconKeys` / `ServiceIconKey`, and update the comment on line 1 (it names ServiceIcon) |
| `src/lib/content/home.ts` | 8, 21, 38, 98 | remove `ServiceIconKey` and the `icon` fields from `ServiceEntry`, `ServiceView` and `buildServices` |
| `tests/unit/content-home.test.ts` | 18 (import), 69-74 (icon test), 140/149/158/167 (fixture `icon:`) | remove. [Proposed] Replace the icon test with "services have no icon field", copying the shape of lines 76-80: |

```typescript
it('services have no description field', () => {
  for (const service of services) {
    expect(Object.keys(service)).not.toContain('description');
  }
});
```
| `src/lib/motion/index.ts` | 7 (`Phase 2 marquee toggle and tool tooltips`) | remove "and tool tooltips" (they were removed in the redesign) |

Gates: `pnpm check` (`astro check` catches leftover `icon` prop types), `pnpm test`, and `home-story.spec.ts` + `contact-preselect.spec.ts` (service cards).

---

### `tests/unit/spanish-review.test.ts` + generator (D-13)

**Key enumeration analog:** `src/lib/contact/strings.ts` lines 16-19. It filters `Object.keys(en)` with a type guard and `Object.hasOwn`:
```typescript
const isContactKey = (key: string): key is ContactUIKey =>
  key.startsWith('contact.') && Object.hasOwn(en, key);
const CONTACT_KEYS: readonly ContactUIKey[] = Object.keys(en).filter(isContactKey);
```
**Dictionary typing** (`src/i18n/ui.en.ts` tail): `export type UIKey = keyof typeof en; export type Dictionary = Record<UIKey, string>;`. `ui.es.ts` ends with `} as const satisfies Dictionary;`, so key parity is enforced at type-check time (`tests/unit/dictionary-types.test.ts` lines 1-8 pins it).

**JSON import convention in unit tests** (`tests/unit/content-home.test.ts` lines 1-5, plain imports with no `with` clause under Vitest):
```typescript
import profile from '../../src/data/profile.json';
import roles from '../../src/data/roles.json';
import services from '../../src/data/services.json';
import tools from '../../src/data/tools.json';
```
Overrides are parsed with `parseOverrides(overridesRaw)` from `src/lib/projects/overrides-schema.ts` (see helpers/projects.ts lines 9, 30).

**Copy sources to cover** [Verified]:
- `src/i18n/ui.en.ts` / `ui.es.ts`: all UI keys, including SEO (`meta.home.*`, `meta.404.*`, `meta.projects.*`, `meta.project.*`) and the 404 copy (`notFound.*`).
- `src/data/roles.json`: `label.{en,es}`.
- `src/data/services.json`: `title.{en,es}`, `items.{en,es}[]`.
- `src/data/tools.json`: `name` only (brand names, not localized). List them as "not translated".
- `src/data/profile.json`: `{ "availability": { "available": true } }`. No copy, because the badge text is the dictionary key `availability.open`.
- `src/data/project-overrides.json`: per project, `title`, `summary`, `coverAlt` and `moduleAlt[id]`, each `{en,es}`.
- Contact email (Spanish only): hard-coded in `src/lib/contact/email.ts` lines 24-28 (`UNSPECIFIED = 'Sin especificar'`, `SITE_LANGUAGE`), line 49 (subject `Nuevo mensaje web — ...`) and lines 50-58 (`Nombre:`, `Email:`, `Servicio:`, `Idioma del sitio:`, `Mensaje:`). [Proposed] Export these as constants, or have the test assert the generated file contains each literal, so a copy edit breaks the coverage test.

**Non-copy TODO(martina) items** [Verified via grep]: `src/data/site.ts:17` (real domain), `:19` (real address), `src/components/sections/Hero.astro:10` (uncropped photo), `src/lib/contact/mailer/resend.ts:12` (verified sending domain), `astro.config.ts` fonts block (brand fonts pending). The copy TODO comments that need to point to `08-SPANISH-REVIEW.md` are in `src/i18n/ui.en.ts` lines 2, 7, 19, 53, 71, 113; `src/i18n/ui.es.ts` lines 1, 8, 20, 57, 75, 120; `src/content.config.ts` lines 1-6; `src/lib/projects/overrides-schema.ts:5`; `scripts/behance/run-sync.ts:354`.

**Script analog** (if the generator is a committed script): `scripts/measure-bundle.ts` lines 1-8 (a header comment explaining when to run it, `node:` imports, `.ts` extension imports run directly by `node`), wired in `package.json` as `"measure:bundle": "node scripts/measure-bundle.ts"`. [Proposed] Prefer a pure `buildSpanishReview(): string` function in `scripts/`, unit-tested the way `scripts/bundle.ts` is tested by `tests/unit/measure-bundle.test.ts` (import from `'../../scripts/bundle.ts'`). The coverage test then asserts every `UIKey` and data path appears in the output, and that the committed `08-SPANISH-REVIEW.md` equals the regenerated output.

---

### D-16: trimmed specs (pre-merge parent `eced448`, redesign parent `97b04b5`)

[Verified by `git diff eced448 ff5bf7c`] Every removed hunk relates to tools tooltips or icons:

| Spec | Removed | Still valid after redesign? |
|---|---|---|
| `home-story.spec.ts` @@-17 | `INK`, `SURFACE` constants | only used by the removed tool tests |
| `home-story.spec.ts` @@-163 | "tools: tiles invert colors on hover and keyboard focus" | No. The tools are now plain visible text with no tab stop. The current test asserts `[tabindex], a, button` count 0 and no `[data-tooltip]`. |
| `home-story.spec.ts` @@-206 | "five icon-only tiles named by brand" (role img names, tooltip show/Esc/hover) | Replaced by the visible-text name assertion, which is equivalent coverage of HOME-05 |
| `home-story.spec.ts` @@-277 | "tools tap on touch" describe | No, there are no tooltips |
| `home-story.spec.ts` @@-367 | the no-JS block checked `getByRole('img')` per tool | Replaced by `[data-tool]` text checks (current lines 298-306) |
| `a11y.spec.ts` | `tools.json` import, `toolSteps` (5 tool tab stops), 2 tooltip tests (axe with tooltip open, WCAG 1.4.13 persistence) | No. The tools are not focusable. The Tab order was also reordered (work before services, current lines 179-187). |

[Inference] No marquee (HOME-02/03), badge (HOME-07) or MOTN-01/04 assertion was removed by the merge. The D-16 task can likely close as "no restoration needed, documented", plus confirming that HOME-07 (badge) coverage still exists in `home.spec.ts` / `home-story.spec.ts`. The planner should have the executor re-run `git diff eced448 ff5bf7c -- tests/e2e/` to check for other trimmed specs. Only these 2 were named.

---

### D-19: planning docs

- `06-VERIFICATION.md` frontmatter line 4: `status: human_needed`, change to `passed`.
- `REQUIREMENTS.md` lines 30-33 and 35: `- [ ] **HOME-02**` etc., change to `- [x]`. The traceability table rows at lines 130-133 (and HOME-07) say `Pending`.
- `STATE.md` frontmatter: `completed_phases: 7`, `percent: 88`. [Unverified] The correct value depends on what the audit expects. Read `.planning/v1.0-MILESTONE-AUDIT.md` before editing.

---

## Shared Patterns

### Motion-state test setup
**Source:** `tests/e2e/helpers/motion.ts` `settleMotion(page, { scrollThrough?: boolean })` (lines 23-72). **Apply to:** every axe run and every screenshot. Always assert the state first: `await expect(page.locator('html')).toHaveAttribute('data-motion', <state>)`. `reduced` uses `test.use({ reducedMotion: 'reduce' })`. A live switch uses `page.emulateMedia({ reducedMotion })` (motion.spec.ts line 169). `off` uses `gotoWithoutSiteScripts` (a11y.spec.ts lines 511-527).

### Console-error guard
**Source:** `tests/e2e/home-story.spec.ts` lines 20-27 (`collectErrors`) with `afterEach(() => expect(errors).toEqual([]))` (lines 62-64). **Apply to:** new journey specs.

### Hermetic vs network tests
**Source:** `playwright.config.ts` lines 12-15 (`grepInvert: /@network/` under `E2E_OFFLINE`), `blockTurnstile` (contact-preselect.spec.ts). **Apply to:** keyboard journeys. Only the contact success and "Send another" paths need `@network`.

### Client effect lifecycle
**Source:** `src/lib/motion/marquee.ts` (AbortController + `Cleanup`), registered with `lifecycle.register(...)` in the component `<script>`. **Apply to:** any marquee change. Never add listeners outside the signal (the leak specs in `navigation-leaks.spec.ts` count them).

### Dual-locale dictionaries in tests
**Source:** `import { en, type Dictionary } from '../../src/i18n/ui.en'; import { es } from '../../src/i18n/ui.es';`. Every label assertion uses `dict['key']`, never a literal. **Apply to:** all new specs.

### Gitignored scratch output
**Source:** `.gitignore` has `tmp/`, `.taste-skill/`, `test-results/`. **Apply to:** raw Lighthouse JSON (D-02) and go in `tmp/lighthouse/`, and taste-skill output (D-20) is already in `.taste-skill/`. The screenshot convention is `contact-states.spec.ts` lines 12, 41-48 (`SHOTS = '.taste-skill/...'`, `animations: 'disabled'`, park the mouse at 0,0).

### Bundle numbers for the Lighthouse report
**Source:** `pnpm measure:bundle` (`scripts/measure-bundle.ts`, `EAGER_CEILING_GZIP = 22_000` at line 30). It reads `dist/client`, so run it after `pnpm build`. Paste its output into `08-LIGHTHOUSE.md`. The heaviest detail page (D-04) can be ranked by summing the file sizes of each `dist/client/projects/*/index.html` plus the `/_astro/*` images it references. [Proposed] Alternatively, use Lighthouse's `total-byte-weight` audit across all 7 pages, which is the measured approach D-04 asks for.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `08-SPANISH-REVIEW.md` | generated doc | batch | No generated review docs exist yet. Use the D-13 table format `key/location \| EN \| ES \| status`. |
| `08-LIGHTHOUSE.md` | report | batch | No Lighthouse runs exist in the repo. D-02 forbids a committed script. The fields are listed in D-06. |
| D-17 routing mechanism | config | request-response | No existing post-build dist rewrite or `not_found_handling` config. Research must pick one, and the result must be verified against `astro preview` (workerd). |

## Metadata

**Analog search scope:** `tests/e2e/**`, `tests/unit/**`, `src/components/**`, `src/lib/{motion,content,contact}/**`, `src/i18n/**`, `src/data/**`, `src/pages/**`, `scripts/**`, `astro.config.ts`, `wrangler.jsonc`, `playwright.config.ts`, `vitest.config.ts`, `dist/client` + `dist/server/wrangler.json` (existing build), git `eced448..ff5bf7c`
**Files scanned:** ~45
**Pattern extraction date:** 2026-11-06
