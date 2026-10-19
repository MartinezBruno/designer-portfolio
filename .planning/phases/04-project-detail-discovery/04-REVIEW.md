---
phase: 04-project-detail-discovery
reviewed: 2026-10-19T13:21:39Z
depth: standard
files_reviewed: 67
files_reviewed_list:
  - scripts/behance/errors.ts
  - scripts/behance/fetch-page.ts
  - scripts/behance/fs-commit.ts
  - scripts/behance/module-content.ts
  - scripts/behance/module-images.ts
  - scripts/behance/normalize.ts
  - scripts/behance/raw-schemas.ts
  - scripts/behance/run-sync.ts
  - scripts/behance/sanitize.ts
  - scripts/sync-behance.ts
  - src/components/global/SeoHead.astro
  - src/components/project/CollectionModule.astro
  - src/components/project/EmbedFacade.astro
  - src/components/project/ImageModule.astro
  - src/components/project/NextProjectTeaser.astro
  - src/components/project/ProjectContactBand.astro
  - src/components/project/ProjectIntro.astro
  - src/components/project/ProjectModule.astro
  - src/components/project/TextModule.astro
  - src/components/project/UnknownModule.astro
  - src/components/sections/Hero.astro
  - src/components/ui/ExternalTextLink.astro
  - src/components/ui/ProjectCard.astro
  - src/components/ui/ToolIcon.astro
  - src/components/views/ProjectDetailView.astro
  - src/i18n/ui.en.ts
  - src/i18n/ui.es.ts
  - src/layouts/BaseLayout.astro
  - src/lib/content/queries.ts
  - src/lib/projects/detail-view-site.ts
  - src/lib/projects/detail-view.ts
  - src/lib/projects/embeds.ts
  - src/lib/projects/model.ts
  - src/lib/projects/overrides-schema.ts
  - src/lib/projects/projects.ts
  - src/lib/projects/snapshot-schema.ts
  - src/lib/projects/sources/behance-snapshot.ts
  - src/lib/seo.ts
  - src/lib/ui/embed-facade.ts
  - src/lib/ui/picture-format.ts
  - src/pages/es/projects/[slug].astro
  - src/pages/projects/[slug].astro
  - src/styles/global.css
  - tests/e2e/a11y.spec.ts
  - tests/e2e/helpers/projects.ts
  - tests/e2e/home-latest-work.spec.ts
  - tests/e2e/home.spec.ts
  - tests/e2e/project-detail.spec.ts
  - tests/e2e/projects.spec.ts
  - tests/e2e/seo.spec.ts
  - tests/unit/embed-facade.test.ts
  - tests/unit/picture-format.test.ts
  - tests/unit/project-card-view.test.ts
  - tests/unit/project-closing.test.ts
  - tests/unit/project-detail-site.test.ts
  - tests/unit/project-detail-view.test.ts
  - tests/unit/project-intro.test.ts
  - tests/unit/project-modules.test.ts
  - tests/unit/projects-order.test.ts
  - tests/unit/projects-overrides.test.ts
  - tests/unit/projects-snapshot.test.ts
  - tests/unit/seo.test.ts
  - tests/unit/sync-commit.test.ts
  - tests/unit/sync-module-images.test.ts
  - tests/unit/sync-modules.test.ts
  - tests/unit/sync-run.test.ts
  - tests/unit/sync-sanitize.test.ts
findings:
  critical: 0
  warning: 5
  info: 10
  total: 15
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-10-19T11:21:47Z (plans 01-11); 2026-10-19T13:21:39Z (incremental, plan 04-12)
**Depth:** standard
**Files Reviewed:** 67
**Status:** issues_found

## Narrative Findings (AI reviewer)

## Summary

The review scope was the phase 4 diff (`9ff8869..HEAD`): the sync pipeline (fetch guard, module-image download and WebP storage, content normalization, staging, commit and GC), the detail-page view builders and components, the embed facade, and the tests.

**Verified by direct probing.** Node ran the real modules (`scripts/behance/sanitize.ts`, `src/lib/projects/embeds.ts`, `src/lib/projects/detail-view.ts`) against adversarial inputs:
- `cleanTextHtml` removes `javascript:` links (including the entity-obfuscated form), protocol-relative links, event handlers, non-`text-align` styles, `script`, `style` and `textarea`. Every output is a sanitizer fixed point.
- `providerForUrl` rejects lookalike hosts, userinfo and the trailing-dot host.
- WHATWG URL normalization collapses `/project_modules/%2e%2e/%2e%2e/x` to `/v1/x`, so the `startsWith` path check on the mir-cdn redirect target cannot be bypassed with dot segments.

The single-hop redirect guard (protocol, exact host, empty port and credentials, path prefix, second hop refused) is correct and well covered in `tests/unit/sync-module-images.test.ts`.

No BLOCKER-level defect was found. The warnings are:
- latent data-loss and robustness gaps in the sync scripts (GC regex overlap, host-unfiltered candidates, `??` on an empty string),
- a likely caption-field mismatch,
- an XSS defense for `set:html` that is enforced only by a unit test and never at build time.

## Warnings

### WR-01: Cover GC regex also matches module-image names, so the "can never delete a module image" guarantee depends on directory layout only

**File:** `scripts/behance/fs-commit.ts:3-7, 175-185, 195-214`
**Issue:** `COVER_FILE` (`^\d+-[0-9a-f]{12}\.(png|jpg|webp)$`) matches every `MODULE_FILE` name (`^\d+-[0-9a-f]{12}\.webp$`). `commitSync` is an exported function that takes `coversDir` and `modulesDir` as arbitrary inputs. If `modulesDir === coversDir`, or a future refactor points both at one directory, step (3) runs `collect(covers)` first. That step deletes every module image, because none of them are in `input.referenced`. It runs after the snapshot rename, so the live snapshot then references deleted files and the next `astro build` fails in `moduleImageFor`. The header claims "a cover GC can never delete a module image". Only the CLI's hard-coded paths make that true, not the function.
**Fix:** Enforce the invariant in `commitSync` before pre-flight:
```ts
const coversAbs = resolve(input.root, input.coversDir);
const modulesAbs = resolve(input.root, input.modulesDir);
if (coversAbs === modulesAbs) {
  throw new Error('modulesDir must differ from coversDir (shared GC would delete module images)');
}
```
A second, additive option: make the cover GC also skip names in `input.referencedModules`.

### WR-02: Image candidates are not filtered by allowlisted host, so one off-CDN variant aborts the whole sync instead of falling through

**File:** `scripts/behance/module-content.ts:83-97` (with `scripts/behance/fetch-page.ts:230`)
**Issue:** `planOf` matches candidates by path segment only (`pathOf(entry.url).includes('/project_modules/1400_webp/')`). It never checks the host. `fetchModuleImage` then calls `assertAllowed(url, CDN_HOSTS, 'G4m')`, which throws instead of returning `skip`. Suppose Behance starts listing a variant directly on `mir-cdn.behance.net` (the redirect target the code already sees) or on another host. The first such candidate then kills the run, even when a later allowlisted candidate exists. That contradicts the documented "404 or non-image moves to the next one" fallback chain. [Verified] Today every `allAvailable` URL in the committed snapshot is on `mir-s3-cdn-cf.behance.net`, so the defect is latent.
**Fix:** Filter in `planOf` so that only fetchable candidates are planned, and keep the hard guard in `fetchModuleImage`:
```ts
const CDN_HOST = 'mir-s3-cdn-cf.behance.net';
const match = image.imageSizes.allAvailable.find((entry) => {
  if (!URL.canParse(entry.url)) return false;
  const u = new URL(entry.url);
  return u.protocol === 'https:' && u.hostname === CDN_HOST && u.pathname.includes(segment);
});
```
Export the host from `fetch-page.ts` so the two lists stay in sync.

### WR-03: An empty `originalEmbed` blocks the `fluidEmbed` fallback

**File:** `scripts/behance/module-content.ts:178`
**Issue:** `parsed.data.originalEmbed ?? parsed.data.fluidEmbed ?? ''` only falls back on `undefined` or `null`. When Behance sends `originalEmbed: ""`, which the raw schema accepts as `z.string().optional()`, `extractEmbedSrc('')` returns null. A valid Figma iframe in `fluidEmbed` is then dropped to `unknown` with a misleading "origin unparsable is not allowlisted" warning.
**Fix:**
```ts
const src =
  extractEmbedSrc(parsed.data.originalEmbed ?? '') ??
  extractEmbedSrc(parsed.data.fluidEmbed ?? '');
```

### WR-04: Image captions are taken from Behance's `caption` field and rendered as plain text

**File:** `scripts/behance/raw-schemas.ts:56`, `scripts/behance/module-content.ts:151-156`, `src/components/project/ImageModule.astro:63`
**Issue:** [Inference] The committed `EmbedModule` JSON carries both `caption` and `captionPlain`. That suggests `caption` is Behance's rich (HTML) caption and `captionPlain` is the text form. The sync stores `caption` unsanitized, and `ImageModule.astro` renders it as an escaped text node. A caption with `<b>`, `<br>` or `&amp;` would show literal markup or entities to visitors. This is not XSS, because Astro escapes text content. [Unverified] No `ImageModule` in the current snapshot has a non-empty caption, so the real shape could not be observed.
**Fix:** Prefer `captionPlain` when present, otherwise strip markup at sync time:
```ts
caption: z.string().optional(), captionPlain: z.string().optional(),
// ...
caption: (captionPlain ?? sanitizeHtml(caption ?? '', { allowedTags: [], allowedAttributes: {} })).trim(),
```
Add a unit test with an HTML caption.

### WR-05: `set:html` trusts `snapshot.json` text HTML at build time, and the sanitizer invariant is enforced only by a unit test

**File:** `src/components/project/TextModule.astro:24`, `src/lib/projects/snapshot-schema.ts:49`
**Issue:** `snapshot-schema.ts` says explicitly that the snapshot is "a committed, hand-editable file" (T-03-05), and it hardens every URL field for that reason. The text entry, however, is `z.string()`, and `TextModule` injects it with `set:html`. The only guard is `tests/unit/projects-snapshot.test.ts:203` (sanitizer fixed point). `astro build` does not run it, so a hand edit, a bad merge-conflict resolution, or a build on a branch that skipped tests ships whatever HTML is in the file. sanitize-html cannot be imported on the site (D-02), but a dependency-free structural check can.
**Fix:** Add a build-time refine on the text entry that rejects anything outside the stored grammar:
```ts
const ALLOWED_TAG = /^<\/?(p|div|br|a|strong|b|em|i)(\s[^<>]*)?\s*\/?>$/;
const TextHtml = z.string().refine(
  (html) =>
    (html.match(/<[^>]*>/g) ?? []).every((tag) => ALLOWED_TAG.test(tag)) &&
    !/\son\w+\s*=|javascript:|<script|<style|<iframe/i.test(html),
  'text html is not in sanitized form; re-run pnpm sync:behance',
);
```
Then use `html: TextHtml` in `ContentSchema`. The real sanitizer and the fixed-point test stay the primary guard. This makes the build fail closed.

## Info

### IN-01: `getProjectDetail` is a dead export

**File:** `src/lib/content/queries.ts:97-113`
**Issue:** It has no caller in `src/` or `tests/`. The detail routes use `getProjectPaths`. It duplicates the `loadDetails` logic and could drift.
**Fix:** Remove it, or route `getProjectPaths` through it.

### IN-02: `mailto:` links get `target="_blank"` and the "opens in a new tab" hint

**File:** `scripts/behance/sanitize.ts:20`, `src/lib/projects/detail-view.ts:79-82`
**Issue:** [Verified by probe] `<a href="mailto:a@b.c">` becomes `target="_blank" rel=…`, and `injectNewTabHint` appends "(opens in a new tab)". For a mail link that announcement is inaccurate for screen-reader users.
**Fix:** Use a transform function that sets `target`/`rel` only for http(s) hrefs. Make `injectNewTabHint` insert the hint only into anchors carrying `target="_blank"`.

### IN-03: The injected new-tab hint has no separator from the link text

**File:** `src/lib/projects/detail-view.ts:80-81`
**Issue:** The output is `Figma<span class="sr-only">(opens in a new tab)</span>`. Some screen readers announce the name as one run ("Figma(opens…"). `ExternalTextLink` depends on template whitespace for the same separation.
**Fix:** Prefix the span content with a space: `> ${escapeHtml(hint)}`.

### IN-04: The comment in ProjectModule misstates where non-allowlisted embeds are dropped

**File:** `src/components/project/ProjectModule.astro:37`
**Issue:** The comment says a non-allowlisted embed becomes `unknown` "at view-build time". `toModuleViews` (`detail-view-site.ts:94-106`) does no allowlist check. The guarantee actually comes from the sync (`module-content.ts:179-187`) and `ContentSchema`'s `z.enum(['figma'])` plus the host-locked URL. A future maintainer could rely on a check that does not exist.
**Fix:** Correct the comment, or add the re-check in `toModuleViews` (`providerForUrl(module.src) === null ? { kind: 'unknown' } : …`).

### IN-05: The embed allowlist ignores the port

**File:** `src/lib/projects/embeds.ts:17-18` (and the `httpsUrlOn` host regex in `snapshot-schema.ts:15-20`)
**Issue:** [Verified by probe] `providerForUrl('https://embed.figma.com:8443/x')` returns `'figma'`. The risk is low (same host), but the redirect guard in `fetch-page.ts:211` does require `port === ''`, so the two guards are inconsistent.
**Fix:** Add `url.port !== ''` to the rejection condition in `providerForUrl` and to the `httpsUrlOn` refine.

### IN-06: `removeStaging` runs a recursive forced delete with no guard on `stagingDir`

**File:** `scripts/behance/fs-commit.ts:241-243`
**Issue:** `rm(join(root, stagingDir), { recursive: true, force: true })`: an empty or `'.'` `stagingDir` deletes `root` (the repo). The CLI hard-codes a timestamped `tmp/` path, so this is not reachable today. The function is exported and runs in `runSync`'s `finally`.
**Fix:** Assert that `resolve(root, stagingDir)` is strictly inside `resolve(root, 'tmp')` before deleting.

### IN-07: `cleanTextHtml` does not trim nested empty blocks

**File:** `scripts/behance/sanitize.ts:37-38`
**Issue:** [Verified by probe] `<div><div><br></div></div>hello` keeps `<div><div><br /></div></div>`, because the regexes only match a single empty block level. Behance often nests divs, so leading or trailing spacing can survive.
**Fix:** Loop an inner-first pass (`/<(div|p)(?:\s[^>]*)?>\s*(?:<br \/>\s*)*<\/\1>/g` on edges), or test for empty blocks with a text-content check.

### IN-08: The e2e expectation helper re-implements override merging, despite its "cannot drift" claim

**File:** `tests/e2e/helpers/projects.ts:1-3, 37-58`
**Issue:** `rows()` re-derives `slug`, `title`, `titleLang` and `contentLang` by hand instead of calling `applyOverrides` (which is Node-safe). If the site's rule changes, both sides can change in step, and the e2e test then confirms the wrong behavior.
**Fix:** Build the rows from `applyOverrides(...)` output (with a stub cover/modules), or drop the "cannot drift" wording.

## Incremental review: 04-12 (gap closure)

**Scope:** `git diff 0878a28..HEAD` for the 04-12 files only. Depth: standard.

Files reviewed:
- `src/lib/ui/picture-format.ts` (new)
- `tests/unit/picture-format.test.ts` (new)
- `src/components/project/ImageModule.astro`
- `src/components/project/CollectionModule.astro`
- `src/components/project/NextProjectTeaser.astro`
- `src/components/ui/ProjectCard.astro`
- `src/components/sections/Hero.astro`
- `tests/e2e/home.spec.ts`

**What was checked:**
- [Verified by reading `node_modules/astro/components/Picture.astro`] `formats` makes one `<source>` per entry. `fallbackFormat` sets the `<img>` format and replaces the `png` default. So `{ formats: ['avif'], fallbackFormat: 'webp' }` gives one AVIF source plus a WebP `<img>`, with no PNG.
- [Verified on the existing `dist/index.html`] The hero and the project cards render `<source type="image/avif">` plus an `<img>` whose `src` and `srcset` are `.webp`. `dist/_astro` holds 457 AVIF and 457 WebP files and no PNG. The e2e regex `/\.webp(\?|$)/` matches the hashed build URL (`/_astro/portrait.RtVae4IC_ZT4bSK.webp`), and Playwright runs against `astro preview` of the build, so this assertion holds.
- In every call site, the spread comes before the explicit props. No later prop or spread sets `formats` or `fallbackFormat`, so nothing overrides the policy.
- [Verified by running it] `pnpm vitest run tests/unit/picture-format.test.ts` gives 4/4 passing.

No BLOCKER or WARNING was found in 04-12. The two new Info items are below.

### IN-09: Pinning `fallbackFormat` turns off Astro's original-format fallback for GIF/SVG/JPEG sources

**File:** `src/lib/ui/picture-format.ts:4-7`
**Issue:** `Picture.astro` keeps the original format as the `<img>` fallback for `gif`, `svg`, `jpg` and `jpeg` imports, but only when `fallbackFormat` is unset (`if (!fallbackFormat && ... specialFormatsFallback.includes(...))`). Because the shared policy always sets `fallbackFormat: 'webp'`, an animated GIF would get a static WebP `<img>`, and an SVG would be rasterized. This is latent today. `src/assets` contains only PNG and WebP, module images are always stored as WebP, and the cover GC regex allows only `png|jpg|webp`. (WebP is also a better fallback than JPEG.) But nothing documents or enforces the constraint, so a future GIF or SVG asset would lose animation or vectors with no warning. JPEG is not a problem here.
**Fix:** Document the constraint next to the constant, for example `// Raster PNG/JPEG/WebP sources only: GIF/SVG must not use this policy (fallbackFormat overrides Astro's original-format fallback).`, or add a unit assertion that every image imported by a `<Picture>` user is png/jpg/webp.

### IN-10: The guard test matches spread and `<Picture>` counts per file, not per element

**File:** `tests/unit/picture-format.test.ts:67-75`
**Issue:** The test only checks that each file has as many `{...pictureFormat}` spreads as `<Picture` tags. A file where one `<Picture>` has the spread twice and another has none still passes (it would get Astro's `['webp']` + PNG default, which is the regression 04-12 fixes). A `<Picture` inside a comment also counts toward both totals. The rendered-markup tests cover only `ImageModule` (the `caption === null` branch) and `ProjectCard`, so they don't catch this either.
**Fix:** Split each file on `<Picture\b` and check that every element body, up to its closing `/>`, contains exactly one `{...pictureFormat}`:
```ts
for (const body of text.split(/<Picture\b/).slice(1)) {
  const element = body.slice(0, body.indexOf('/>'));
  expect(element.match(/\{\.\.\.pictureFormat\}/g)?.length ?? 0, file).toBe(1);
}
```

---

_Reviewed: 2026-10-19T11:21:47Z (plans 01-11); 2026-10-19T13:21:39Z (incremental 04-12)_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
