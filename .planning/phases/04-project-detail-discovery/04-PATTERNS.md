# Phase 4: Project Detail & Discovery - Pattern Map

**Mapped:** 2026-10-17
**Files analyzed:** 47 new/modified files (code, tests, data, docs)
**Analogs found:** 44 / 47. All excerpts below were read from the repo on 2026-10-17, with line numbers.

> Labels follow the global CLAUDE.md rules. Line numbers are verified. Anything marked `[Proposed]` is the pattern to apply, not existing code.

## File Classification

### Sync (scripts/, Node type stripping, erasable TS only)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `scripts/behance/module-images.ts` (NEW) | utility (download + re-encode) | file-I/O / request-response | `scripts/behance/covers.ts` + `fetchCover` in `scripts/behance/fetch-page.ts:155-180` | exact |
| `scripts/behance/module-content.ts` (NEW) | transform | transform (raw module to `content` union) | `scripts/behance/normalize.ts` | exact |
| `scripts/behance/sanitize.ts` (NEW) | utility | transform | `scripts/behance/covers.ts` (pure, SyncError-throwing helpers) | role-match. Sanitizer options come from RESEARCH Pattern 3 |
| `scripts/behance/fs-commit.ts` (MOD) | utility | file-I/O (atomic commit + GC) | itself (lines 99-151) | exact |
| `scripts/behance/run-sync.ts` (MOD) | orchestrator | batch | itself (lines 144-272) | exact |
| `scripts/behance/errors.ts` (MOD, optional) | utility | — | itself. `COMMITTED` message must mention `src/assets/projects/modules` | exact |
| `scripts/sync-behance.ts` (MOD) | CLI config | — | itself, lines 46-56 (`paths`) | exact |
| `scripts/behance/raw-schemas.ts` (MOD, optional) | model (Zod, loose) | — | itself, `RawCoverSchema` lines 9-13 | exact |

### Data layer (src/lib, shared by site and sync)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/lib/projects/snapshot-schema.ts` (MOD) | model (Zod strict) | validation | itself, lines 5-49 | exact |
| `src/lib/projects/overrides-schema.ts` (MOD) | model (Zod) | validation | itself, lines 13-26 | exact |
| `src/lib/projects/projects.ts` (MOD) | service (pure) | transform / validation | itself, `validateOverrides` lines 24-45, `missingOverrides` lines 86-98 | exact |
| `src/lib/projects/model.ts` (MOD) | model (types) | — | itself, `SourceProject` / `ProjectCardView` lines 22-51 | exact |
| `src/lib/projects/embeds.ts` (NEW) | config (const allowlist) | — | `src/lib/content/icons.ts` (`as const` tuple + derived type) | role-match |
| `src/lib/projects/detail-view.ts` (NEW, pure) | utility | transform | `src/lib/projects/layout.ts` (`tileSize`) | exact |
| `src/lib/projects/detail-view-site.ts` or a `toDetailView` in a site-only file (NEW) | service (view builder) | transform | `src/lib/projects/card-view.ts` | exact |
| `src/lib/projects/sources/behance-snapshot.ts` (MOD) | adapter | file-I/O (glob) | itself, lines 11-34 | exact |
| `src/lib/content/queries.ts` (MOD) | service (query) | request-response (build) | itself, `getAllProjects` lines 56-59 | exact |
| `src/lib/seo.ts` (MOD) | utility (pure) | transform | itself | exact |
| `src/lib/ui/embed-facade.ts` (NEW) | client script | event-driven | `src/lib/motion/marquee.ts` | exact |

### UI (src/components, src/pages)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/pages/projects/[slug].astro` (NEW) | route | SSG | `src/pages/projects/index.astro` | role-match (adds `getStaticPaths`) |
| `src/pages/es/projects/[slug].astro` (NEW) | route | SSG | `src/pages/es/projects/index.astro` | role-match |
| `src/components/views/ProjectDetailView.astro` (NEW) | view | request-response | `src/components/views/ProjectsView.astro` | exact |
| `src/components/project/ProjectIntro.astro` (NEW) | component | — | `src/components/ui/ProjectCard.astro` lines 68-102 (`dl` meta) | role-match |
| `src/components/project/ProjectModule.astro` (NEW dispatcher) | component | — | `src/components/ui/ToolIcon.astro` (typed map dispatch) | partial |
| `src/components/project/ImageModule.astro` (NEW) | component | — | `src/components/ui/ProjectCard.astro` lines 47-66 (`<Picture>`) | exact |
| `src/components/project/CollectionModule.astro` (NEW) | component | — | `ProjectCard.astro` `<Picture>` + `layout.ts` row helper | role-match |
| `src/components/project/TextModule.astro` (NEW) | component | — | `src/layouts/BaseLayout.astro:29` (the only `set:html`) | partial |
| `src/components/project/EmbedFacade.astro` (NEW) | component + script | event-driven | `src/components/sections/RolesMarquee.astro` lines 57-69 | exact |
| `src/components/project/UnknownModule.astro` (NEW) | component | — | `ProjectsView.astro` lines 29-42 (empty-state block) | role-match |
| `src/components/project/NextProjectTeaser.astro` (NEW) | component | — | `src/components/ui/ProjectCard.astro` | exact |
| `src/components/ui/ExternalTextLink.astro` (NEW) | component | — | `src/components/ui/IconLink.astro` | exact |
| `src/components/ui/ToolIcon.astro` (MOD: `size` prop) | component | — | itself, plus the `sizeClasses` literal map in `ProjectCard.astro:29-34` | exact |
| `src/components/global/SeoHead.astro` (MOD: `og:image`) | component | — | itself, line 23 | exact |
| `src/layouts/BaseLayout.astro` (MOD: `ogImage?` prop) | layout | — | itself, lines 12-36 | exact |
| `src/components/ui/ProjectCard.astro` (MOD: comment line 5) | component | — | itself | exact |
| `src/i18n/ui.en.ts`, `src/i18n/ui.es.ts` (MOD) | config (dictionary) | — | themselves | exact |
| `src/styles/global.css` (MOD: `--text-4xl`) | config (tokens) | — | itself, lines 17-25 | exact |

### Tests, fixtures, data, docs

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `tests/unit/sync-sanitize.test.ts` (NEW) | test (unit) | — | `tests/unit/sync-parse.test.ts` / fixture loader in `sync-run.test.ts:12-19` | role-match |
| `tests/unit/sync-modules.test.ts` (NEW) | test (unit) | — | same | role-match |
| `tests/unit/sync-run.test.ts` (MOD) | test (fake fetch, temp dirs) | — | itself | exact |
| `tests/unit/sync-commit.test.ts` (MOD) | test (temp dirs) | — | itself, lines 1-40 | exact |
| `tests/unit/projects-snapshot.test.ts` (MOD) | test | — | itself | exact |
| `tests/unit/projects-overrides.test.ts` (MOD) | test | — | itself | exact |
| `tests/unit/project-detail-view.test.ts` (NEW) | test (pure) | — | `tests/unit/projects-layout.test.ts`, `project-card-view.test.ts` | exact |
| `tests/unit/project-modules.test.ts` (NEW) | test (AstroContainer) | — | `tests/unit/project-card.test.ts` | exact |
| `tests/unit/embed-facade.test.ts` (NEW) | test (happy-dom) | — | `tests/unit/marquee-toggle.test.ts` | exact |
| `tests/unit/seo.test.ts`, `tools-row.test.ts` (MOD) | test | — | themselves | exact |
| `tests/e2e/project-detail.spec.ts` (NEW) | test (e2e) | — | `tests/e2e/projects.spec.ts` | exact |
| `tests/e2e/helpers/projects.ts` (MOD: `expectedDetail`) | test helper | — | itself | exact |
| `tests/e2e/projects.spec.ts`, `a11y.spec.ts`, `home-latest-work.spec.ts` (MOD: drop skips) | test (e2e) | — | themselves | exact |
| `tests/fixtures/behance/module.webp` (NEW) | fixture | — | `tests/fixtures/behance/cover.png` | exact |
| `src/data/behance/snapshot.json` (REGENERATED by live sync) | data | — | — | n/a |
| `src/assets/projects/modules/*.webp` (NEW, committed) | asset | — | `src/assets/projects/*.png` | exact |
| `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md` (MOD: D-16/D-17) | docs | — | — | n/a |

---

## Pattern Assignments

### `scripts/behance/module-images.ts` (utility, file-I/O)

**Analogs:** `scripts/behance/covers.ts` (naming, sniffing) and `scripts/behance/fetch-page.ts` (`fetchCover`, guards).

**File header + imports convention** (`covers.ts` lines 1-5). Erasable TS, `.ts` value imports, `SyncError` for every failure:
```ts
// Cover selection, image sniffing and file naming. Erasable TypeScript only (Node type stripping runs it).
// Covers are chosen by an explicit rule, never by array position, and named only from trusted parts.
import { createHash } from 'node:crypto';
import { SyncError } from './errors.ts';
import type { RawCover } from './raw-schemas.ts';
```

**Variant picked by path segment, never by array position** (`covers.ts` lines 16-35). Copy the `pathOf` helper and the `includes('/projects/max_808/')` idea for the candidate chain `1400_webp → 1400 → max_1200_webp → max_1200 → fs_webp → fs`:
```ts
function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return '';
  }
}
...
  const preferred = candidates.find((cover) => pathOf(cover.url).includes(PREFERRED_VARIANT));
```

**Hash naming** (`covers.ts` lines 61-71). The module name is `<imageId>-<sha12>.webp`, computed on the **stored** bytes (after any re-encode):
```ts
export function coverFileName(id: string, bytes: Uint8Array, ext: ImageExt): string {
  if (!DIGITS.test(id)) {
    throw new SyncError('G4', `cover id must be digits only, got ${JSON.stringify(id)}`);
  }
  ...
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
  return `${id}-${hash}.${ext}`;
}
```

**Download guards** (`fetch-page.ts` lines 155-180). The new fetch must reuse `assertAllowed(url, CDN_HOSTS, …)`, `request(...)` with `redirect: 'error'`, `readCapped(…, MAX_COVER_BYTES, …)` and `sniffImage`. **Difference:** a status 404 or a non-`image/*` content type must return a "try next candidate" result instead of throwing (RESEARCH Pitfall 2). Network errors and oversize bodies still throw.
```ts
export async function fetchCover(url: string, deps: FetchDeps): Promise<{ bytes: Uint8Array; ext: ImageExt }> {
  assertAllowed(url, CDN_HOSTS, 'G4');
  const res = await request(url, deps, 'G4', { headers: { 'user-agent': BEHANCE_UA }, redirect: 'error' });
  if (res.status !== 200) {
    await res.body?.cancel();
    throw new SyncError('G4', `${url}: status ${res.status}`);
  }
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('image/')) {
    await res.body?.cancel();
    throw new SyncError('G4', `${url}: content-type ${JSON.stringify(contentType)} is not image/*`);
  }
  const bytes = await readCapped(res, MAX_COVER_BYTES, 'G4', url);
  ...
  const ext = sniffImage(bytes);
```
`[Inference]` `assertAllowed`, `request` and `readCapped` are module-private today (lines 34, 46, 64). Either export them from `fetch-page.ts` or add a sibling `fetchModuleImage` in `fetch-page.ts` itself. The second option keeps every network guard in one file.

**Re-encode** (no in-repo analog): `[Proposed, RESEARCH Pattern 2]` `sharp(bytes).resize({ width: 1400, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer()`, and `sharp(bytes).metadata()` for the real width and height. The sharp import should be isolated in this one file, the same way `sanitize.ts` is the only `sanitize-html` importer.

---

### `scripts/behance/module-content.ts` (transform)

**Analog:** `scripts/behance/normalize.ts` lines 1-46.

**Header convention** (lines 1-8). The file opens with a comment block that explains the field sources and the fixed key order:
```ts
// Raw Behance data -> one SnapshotProject. Erasable TypeScript only (Node type stripping runs it).
//
// Keys are written in one fixed order so snapshot diffs stay reviewable (Pitfall 7). ...
import type { SnapshotProject } from '../../src/lib/projects/snapshot-schema.ts';
import type { Label, ProfileProject, ProjectStore } from './parse.ts';
```

**Explicit key order + types from the site schema** (lines 25-46). `toSnapshotProject` gains a `content` argument. Raw `modules` stay as they are, for audit:
```ts
export function toSnapshotProject(profile, project, fields, cover): SnapshotProject {
  return {
    id: profile.id,
    ...
    cover: { file: cover.file, sourceUrl: cover.sourceUrl, width: cover.width },
    modules: project.allModules,
  };
}
```
The new mapper should return the `z.infer` content type exported from `snapshot-schema.ts`, so G5 validates the same shape.

**Unknown types** reuse the `KNOWN_MODULES` set in `run-sync.ts:77-82`. Move it into `module-content.ts` and export it, so the G9 warning and the normalizer share it.

---

### `scripts/behance/sanitize.ts` (utility, transform)

**Analog for shape:** `covers.ts`: a pure exported function, a module-level constant config, no I/O.
**Options:** copy RESEARCH Pattern 3 verbatim (`TEXT_OPTIONS`, `simpleTransform` **without** the third arg, `exclusiveFilter`), and add the trailing/leading empty-block trim. This must be the **only** file that imports `sanitize-html`. `[Proposed]` Enforce that with a grep in a test, the same way the single-`set:html` grep is enforced (T-03-02).

---

### `scripts/behance/fs-commit.ts` (MOD, file-I/O)

**Analog:** itself. **Do not put modules in `coversDir`.** The GC at lines 138-145 deletes every `COVER_FILE` name it does not reference, and `<id>-<hash>.webp` matches `COVER_FILE` (`snapshot-schema.ts:6`):
```ts
    for (const name of (await readdir(covers)).sort()) {
      const stale = PARTIAL_FILE.test(name);
      if (!stale && (!COVER_FILE.test(name) || input.referenced.has(name))) continue;
      await rm(join(covers, name));
      if (!stale) removed.push(name);
    }
```
**Pattern to copy for the second directory:**
- `CommitInput` (lines 41-47) gains `modulesDir` + `referencedModules`.
- Repeat the pre-flight check (lines 106-111), the partial-copy-then-rename step (lines 113-129) and the GC step (lines 135-148) for `modulesDir`, with its own `MODULE_FILE` regex.
- Keep the step order: (1) copy covers **and** modules, (2) the single atomic snapshot rename (lines 131-133), (3) GC both directories inside the `postCommitError` try.

The staged writer at lines 78-86 (`writeStagedCover` + `assertCoverName`) is the model for `writeStagedModule`, which asserts `MODULE_FILE` and writes to `staging/modules/`.

---

### `scripts/behance/run-sync.ts` (MOD, orchestrator)

**Analog:** itself.
- Gate list in the header comment (lines 4-21): add the line `G4m module images` and document it.
- `SyncDeps.paths` (lines 54-60): add `modulesDir: string`. Then update `scripts/sync-behance.ts:46-52` and `tests/unit/sync-run.test.ts:25-30` `PATHS`.
- `SyncReport` (lines 66-72): add `modulesAdded`/`modulesRemoved` and the size line (`module images: {count} files, {MB} MB added`).
- Per-project loop (lines 176-193): insert G4m after the cover, using the same `paced` fetch (lines 148-155). That keeps the 2 s spacing (D-04).
- G8 (lines 208-217): `sources` must also carry the per-project image ids for the `moduleAlt` key check.
- G7 (lines 220-228): pass `referencedModules` built from `snapshot.projects.flatMap(content images)`.
- G9 (lines 235-246): **keep** the unknown-module warning. Reword it to the UI-SPEC developer copy (`It renders the Behance fallback note.`), add the embed-not-allowlisted warning, and add the `missing module alts … TODO(martina)` checklist line next to the existing `missingOverrides` checklist (lines 248-256).
- Error wrapping pattern (lines 262-271): unchanged.

`[Proposed]` Image reuse (RESEARCH Pattern 2.5) reads the previous snapshot the same way `previousCount` does (lines 98-110).

---

### `src/lib/projects/snapshot-schema.ts` (MOD, model)

**Analog:** itself. Header (lines 1-2): erasable TS, used by sync and site.
```ts
/** `<digits>-<12 hex>.<ext>`: no scraped string ever reaches a file path (T-03-05). */
export const COVER_FILE = /^\d+-[0-9a-f]{12}\.(png|jpg|webp)$/;
...
function httpsUrlOn(host: RegExp) {
  return z.url({ protocol: /^https$/, hostname: host }).refine((value) => {
    const url = new URL(value);
    return url.username === '' && url.password === '';
  }, 'URL must not contain credentials');
}
const BehancePageUrl = httpsUrlOn(/^www\.behance\.net$/);
const BehanceCdnUrl = httpsUrlOn(/^mir-s3-cdn-cf\.behance\.net$/);
```
- Add `MODULE_FILE` next to `COVER_FILE`.
- Add the `ContentSchema` discriminated union (RESEARCH Pattern 1), using `z.strictObject` like `SnapshotProjectSchema` (line 27) and `httpsUrlOn(/^embed\.figma\.com$/)` for the embed src.
- Add `content: z.array(ContentSchema)` to `SnapshotProjectSchema` (after `modules`, line 48).
- `SnapshotSchema.version` (line 52) stays `z.literal(1)` or becomes `z.literal(2)`. Either way, regenerate the snapshot in the same plan (RESEARCH Pitfall 5).
- `[Proposed]` The duplicate-id `superRefine` pattern (lines 59-72) is the model for a "duplicate image id inside a project" check, which keeps `moduleAlt` keys unambiguous.
- The error wording in `parseSnapshot` (lines 79-89) stays unchanged.

---

### `src/lib/projects/overrides-schema.ts` + `projects.ts` (MOD)

**Schema analog** (`overrides-schema.ts` lines 13-28):
```ts
export const localized = z.object({ en: z.string().min(1), es: z.string().min(1) });
export const OverrideSchema = z.strictObject({
  slug: ..., title: localized.optional(), summary: localized.optional(), coverAlt: localized.optional(),
  ...
  contentLang: z.enum(locales).optional(),
});
export const OverridesSchema = z.record(z.string().regex(/^\d+$/), OverrideSchema);
```
Add `moduleAlt: z.record(z.string().regex(/^\d+$/), localized).optional()`. Keep length checks out of the schema, as the comment at line 15 says. They belong in `validateOverrides`, so the message can name the id and the locale.

**Validation analog** (`projects.ts` lines 13, 24-45). `SourceRef` gains `imageIds: readonly string[]`. Copy the title-length loop for the 125-character `moduleAlt` limit, and the unknown-id error for unknown keys:
```ts
type SourceRef = { id: string; sourceSlug: string };
...
    for (const locale of locales) {
      const length = [...override.title[locale]].length;
      if (length > TITLE_MAX) {
        throw new Error(
          `project-overrides: title.${locale} for ${id} is ${length} characters (max ${TITLE_MAX}). Shorten it in src/data/project-overrides.json`,
        );
      }
    }
```
**Checklist analog:** `missingOverrides` (lines 86-98) is the model for `missingModuleAlts(sources, overrides) → { id, slug, missing: number, total: number }[]`.
**Apply analog:** `applyOverrides` (lines 55-79) sets every field explicitly (`copyLocalized`, `?? null`). Add `modules` the same way, plus `moduleAlt` (copy each record entry; never spread Zod optionals).

---

### `src/lib/projects/model.ts` (MOD, types)

**Analog:** itself (lines 1-4 header: erasable TS, `import type { ImageMetadata } from 'astro'`). Add `SourceModule`, `ModuleView`, `TeaserView` and `ProjectDetailView` as plain interfaces and unions, with no optional properties (UI-SPEC "no optional properties"; matches `ProjectCardView` lines 42-51 using `| null`). `SourceProject` (lines 22-31) gains `modules: readonly SourceModule[]`, and `Project` inherits it.

---

### `src/lib/projects/detail-view.ts` (NEW, pure utility)

**Analog:** `src/lib/projects/layout.ts` lines 1-23: a JSDoc header explaining the rule, a pure function, and a thrown developer error on invalid input:
```ts
export function tileSize(index: number, count: number): TileSize {
  if (!Number.isInteger(index) || index < 0 || index >= count) {
    throw new Error(
      `projects: tileSize index ${String(index)} out of range for ${String(count)} tiles`,
    );
  }
  if (count > 1 && count % 2 === 1 && index === count - 1) return 'large-end';
  return cycle[index % cycle.length] ?? 'large';
}
```
Put `neighbours`, `collectionRows` and `imageAltFor` here (RESEARCH "Code Examples"). No `astro:*` imports, so it stays Node-testable. `[Proposed]` Use `.ts` extensions on value imports if `tests/e2e/helpers/projects.ts` will import it, as `projects.ts` does (lines 6-9).

### Site-only `toDetailView` (NEW)

**Analog:** `src/lib/projects/card-view.ts` lines 1-32. Copy the header comment ("Site-only… scripts/ must never import this file"), the `useTranslations` + `interpolate` usage, `getRelativeLocaleUrl(locale, \`projects/${slug}\`)` for hrefs, and the `titleLang` rule:
```ts
  const title = project.title?.[locale] ?? project.sourceTitle;
  return {
    slug: project.slug,
    href: getRelativeLocaleUrl(locale, `projects/${project.slug}`),
    title,
    // An override is written per locale; a fallback title keeps its source language (D-10).
    titleLang:
      project.title !== null || project.contentLang === locale ? null : project.contentLang,
    ...
    // Never Behance's auto alt text (D-15).
    coverAlt: project.coverAlt?.[locale] ?? interpolate(t('projects.coverAlt'), { title }),
  };
```
`toCardView` can be reused to build `TeaserView` (next/previous), since it already has `href`, `title`, `titleLang`, `cover` and `coverAlt`.

---

### `src/lib/projects/sources/behance-snapshot.ts` (MOD, adapter)

**Analog:** itself, lines 11-34. Copy the glob and resolver pair for `modules/`:
```ts
const covers = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/projects/*.{png,jpg,jpeg,webp}',
  { eager: true },
);

function coverFor(file: string): ImageMetadata {
  const cover = covers[`/src/assets/projects/${file}`];
  if (cover === undefined) {
    throw new Error(
      `snapshot: missing cover file ${file} in src/assets/projects/. Re-run pnpm sync:behance or restore it from git`,
    );
  }
  return cover.default;
}
```
The new glob is `'/src/assets/projects/modules/*.webp'`, with a `moduleImageFor(file)` that uses the same message style. The `sourceProjects` map (lines 26-34) gains `modules: project.content.map(...)`. This file stays the **only** Behance-aware site module (header lines 1-3).

---

### `src/lib/content/queries.ts` (MOD, query)

**Analog:** itself, lines 39-59:
```ts
function loadProjects(): Project[] {
  ...
  cachedProjects ??= applyOverrides(getSourceProjects(), overrides);
  return cachedProjects;
}

export async function getAllProjects(locale: Locale): Promise<ProjectCardView[]> {
  const categoryTitles = buildCategoryTitles(await getCollection('services'), locale);
  return sortProjects(loadProjects()).map((project) => toCardView(project, locale, categoryTitles));
}
```
Add `getProjectPaths(locale)` and `getProjectDetail(locale, slug)`. Both must reuse `sortProjects(loadProjects())`, so the order matches `/projects` (D-13). Build the tool icon map from `await getCollection('tools')` (`name → icon`). The data shape is in `src/data/tools.json` (`{ id, order, name, icon }`), and `buildTools` (`src/lib/content/home.ts:104-110`) already maps `entry.data.name` / `entry.data.icon`.

---

### `src/lib/seo.ts` + `SeoHead.astro` + `BaseLayout.astro` (MOD, og:image)

- `seo.ts` lines 7-29: add `image?: string` to `SeoInput` and `image?: string` to `SeoTags.og`. Pass it through in both branches (lines 43-65). The optional-field style follows `canonical?` / `url?`.
- `SeoHead.astro` line 23: copy the conditional meta line:
```astro
{seo.og.url && <meta property="og:url" content={seo.og.url} />}
```
- `BaseLayout.astro` lines 12-19 (`Props` with a defaulted `kind`) and lines 30-36 (`<SeoHead …>`): add `ogImage?: string` and forward it. `[Inference]` Under `exactOptionalPropertyTypes` (strictest), forward it with a conditional spread, like `ProjectCard.astro:47-48`:
```ts
// Spread so lazy covers carry no fetchpriority attribute at all (exactOptionalPropertyTypes).
const priority = eager ? { fetchpriority: 'high' as const } : {};
```

---

### `src/lib/ui/embed-facade.ts` (NEW, client, event-driven)

**Analog:** `src/lib/motion/marquee.ts` lines 1-34. Copy the signature, the early `undefined` return, the `AbortController`, and the cleanup:
```ts
import type { Cleanup } from './lifecycle';

export function initMarqueeToggles(doc: Document): Cleanup | undefined {
  const buttons = doc.querySelectorAll<HTMLButtonElement>('[data-marquee-toggle]');
  if (buttons.length === 0) return undefined;

  const ac = new AbortController();
  for (const button of buttons) {
    const root = button.closest<HTMLElement>('[data-marquee]');
    button.addEventListener('click', () => { ... }, { signal: ac.signal });
  }
  return () => {
    ac.abort();
  };
}
```
The import becomes `import type { Cleanup } from '../motion/lifecycle';`. The allowlist re-check imports `EMBED_PROVIDERS` from `src/lib/projects/embeds.ts`. Build the iframe with `document.createElement` and property setters, never `innerHTML` (RESEARCH Pattern 5).

---

### `src/lib/projects/embeds.ts` (NEW, const config)

**Analog:** `src/lib/content/icons.ts` lines 1-8:
```ts
export const toolIconKeys = ['illustrator', 'indesign', 'photoshop', 'figma', 'lightroom'] as const;
export type ToolIconKey = (typeof toolIconKeys)[number];
```
`[Proposed]` `export const EMBED_PROVIDERS = { figma: { host: 'embed.figma.com', name: 'Figma' } } as const;` plus derived `EmbedProvider` type and a pure `providerForUrl(src): EmbedProvider | null`. It must stay Node-safe (no `astro:*` imports) because the sync, the site and the client bundle all use it.

---

### `src/pages/projects/[slug].astro` + `src/pages/es/projects/[slug].astro` (NEW, routes)

**Analog:** `src/pages/projects/index.astro` lines 1-15 (and the ES twin with `../../../` paths and `'es'`):
```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import ProjectsView from '../../components/views/ProjectsView.astro';
import { useTranslations } from '../../i18n/t';

const t = useTranslations('en');
---

<BaseLayout locale="en" title={t('meta.projects.title')} description={t('meta.projects.description')}>
  <ProjectsView locale="en" />
</BaseLayout>
```
Add `export async function getStaticPaths() { return getProjectPaths('en'); }` (RESEARCH Pattern 6). Import only from `../../lib/content/queries`. ESLint `eslint.config.js:31-47` fails any `**/sources/**` import from `src/pages/**` or `src/components/**`.

---

### `src/components/views/ProjectDetailView.astro` (NEW, view)

**Analog:** `src/components/views/ProjectsView.astro` lines 1-25:
```astro
---
import ProjectGrid from '../ui/ProjectGrid.astro';
import { getAllProjects } from '../../lib/content/queries';
import { useTranslations, type Locale } from '../../i18n/t';

interface Props {
  locale: Locale;
}

// ProjectsView is the only project reader for this page; the grid and cards stay prop-driven.
const { locale } = Astro.props;
const t = useTranslations(locale);
---
<section aria-labelledby="projects-title" class="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-16 sm:px-6 lg:px-8">
```
Here the view receives `detail` as a prop (from `getStaticPaths` props) instead of calling the query. Children stay prop-driven. DOM order follows UI-SPEC "Page frame": `article` (intro + stack), then the contact `section`, then the teaser `section`.

**Contact band button** reuses `ButtonLink.astro` (lines 1-16), with a default slot for the label and `slot="icon"` for `arrow-right`.

---

### `src/components/project/ImageModule.astro` + `CollectionModule.astro` (NEW)

**Analog:** `src/components/ui/ProjectCard.astro` lines 47-66:
```astro
// Spread so lazy covers carry no fetchpriority attribute at all (exactOptionalPropertyTypes).
const priority = eager ? { fetchpriority: 'high' as const } : {};
---
      <Picture
        src={project.cover}
        alt={project.coverAlt}
        formats={['avif', 'webp']}
        widths={[404, 640, 808]}
        sizes={sizesFor[size]}
        width={project.cover.width}
        height={project.cover.height}
        loading={eager ? 'eager' : 'lazy'}
        {...priority}
        decoding="async"
        class="size-full object-cover object-center"
      />
```
Changes for modules (per UI-SPEC):
- `widths` = `[640, 960, 1400]` filtered to ≤ `image.width`
- `sizes="(min-width: 1400px) 1400px, 100vw"`
- class `block h-auto w-full bg-surface-alt` (no `object-cover`, no crop)
- collection items set `style={{ '--ar': ratio }}` plus `sm:basis-0 sm:grow-(--ar)`. The UI-SPEC lists this as the only inline-style exception.

**Literal class maps** for Tailwind visibility (`ProjectCard.astro` lines 28-34) are the pattern for any per-variant class, such as `fullBleed` vs padded.

---

### `src/components/project/TextModule.astro` (NEW)

**Only in-repo `set:html` analog:** `src/layouts/BaseLayout.astro:28-29`:
```astro
<!-- Blocking motion gate before any stylesheet: build-time constant, never user data. -->
<script is:inline set:html={motionGateInline} />
```
Copy the convention of a comment that justifies the `set:html` on the line above it ("sanitized at sync by scripts/behance/sanitize.ts; never raw Behance HTML"). The root `<div>` classes come verbatim from UI-SPEC §TextModule. Put `lang` on the root only when `contentLang !== locale`. Render-time hint injection must HTML-escape `t('a11y.newTab')` (RESEARCH Pattern 3).

---

### `src/components/project/EmbedFacade.astro` (NEW, component + script)

**Analog:** `src/components/sections/RolesMarquee.astro` lines 57-69. A JS-only control is rendered in markup, and the script registers through the lifecycle:
```astro
  <button
    type="button"
    data-marquee-toggle
    aria-pressed="false"
    aria-label={t('roles.pause')}
    class="absolute inset-0 hidden ... motion-on:block"
  ></button>
</section>

<script>
  import { lifecycle } from '../../lib/motion';
  import { initMarqueeToggles } from '../../lib/motion/marquee';
  lifecycle.register(initMarqueeToggles);
</script>
```
For the facade, the button carries the `hidden` attribute (UI-SPEC), and `initEmbedFacades` removes it. The script import paths from `src/components/project/` are `../../lib/motion` and `../../lib/ui/embed-facade`. Button classes are copied from `ButtonLink.astro` line 12, with `bg-ink text-surface hover:bg-ink/90` replacing the accent.

---

### `src/components/ui/ExternalTextLink.astro` (NEW)

**Analog:** `src/components/ui/IconLink.astro` lines 1-25:
```astro
---
import IconArrowUpRight from '@tabler/icons/outline/arrow-up-right.svg';

// External icon-only link (44x44). ... rel blocks reverse tabnabbing (T-03-01).
interface Props {
  href: string;
  label: string;
  newTabHint: string;
}
const { href, label, newTabHint } = Astro.props;
---
<a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label} ${newTabHint}`} class="...">
  <slot />
  <span class="sr-only">{newTabHint}</span>
  <IconArrowUpRight aria-hidden="true" focusable="false" class="size-4" />
</a>
```
Differences:
- no `aria-label`, because the visible slot text is the name
- the classes are the text-link string from `ProjectsView.astro:37`: `text-ink decoration-accent focus-visible:outline-accent inline-flex min-h-11 items-center gap-2 text-base font-semibold decoration-2 underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-2 focus-visible:outline-offset-2`
- `[Proposed]` take `locale` and call `t('a11y.newTab')` inside, or keep the `newTabHint` prop as IconLink does. Either is consistent with the codebase.

The "Previous" link in the teaser uses the same class string (UI-SPEC), plus `arrow-left`.

---

### `src/components/ui/ToolIcon.astro` (MOD)

**Analog:** itself, lines 10-26, plus the literal-map idiom:
```astro
interface Props {
  name: ToolIconKey;
}
const icons = { ... } as const satisfies Record<ToolIconKey, typeof IconBrandFigma>;
const Icon = icons[Astro.props.name];
---
<Icon aria-hidden="true" focusable="false" class="size-8" />
```
`[Proposed]` Add `size?: 'lg' | 'sm'` with `const sizeClasses = { lg: 'size-8', sm: 'size-5' } as const satisfies Record<'lg' | 'sm', string>;`. The default `'lg'` keeps ToolsRow unchanged.

---

### `src/components/project/NextProjectTeaser.astro` (NEW)

**Analog:** `src/components/ui/ProjectCard.astro` lines 52-85. Copy the `group/card relative` article, the `bg-surface-alt aspect-[5/4] overflow-hidden` cover box, the `large` `sizes` string (line 42), and the stretched title link class (line 77):
```astro
<a
  href={project.href}
  class="text-ink decoration-accent group-hover/card:underline focus-visible:after:outline-accent decoration-2 underline-offset-4 outline-hidden after:absolute after:inset-0 after:content-[''] focus-visible:underline focus-visible:after:outline-2 focus-visible:after:outline-offset-4"
>
  {project.titleLang === null ? project.title : <span lang={project.titleLang}>{project.title}</span>}
</a>
```
Not a `<li>` (UI-SPEC). `[Proposed]` If the cover markup is duplicated, extract `ProjectCover.astro` (UI-SPEC allows this).

### `src/components/project/ProjectIntro.astro` (NEW)

**Analog:** `ProjectCard.astro` lines 86-102 (the `dl` + `dt`/`dd` meta with `t('projects.meta.category')` / `t('projects.meta.tools')`). On the detail page the `<dt>` is visible (`text-sm text-ink-muted`) instead of `sr-only`. The h1 `span[lang]` fallback is the same as the title link above.

### `src/components/project/UnknownModule.astro` (NEW)

**Analog:** `ProjectsView.astro` lines 29-42 (a quiet text block followed by a `<p>`-wrapped text link). Use `ExternalTextLink` for the link.

---

### `src/i18n/ui.en.ts` / `ui.es.ts` (MOD)

**Analog:** itself, lines 1-56. Flat dotted keys, `as const`, a `TODO(martina)` comment above each new copy group (lines 7, 19), and `{token}` placeholders resolved with `interpolate` (`src/i18n/t.ts:16-21`). `ui.es.ts` must match the keys (`Dictionary = Record<UIKey, string>`, line 56). The key list is in UI-SPEC §Copywriting.

### `src/styles/global.css` (MOD)

**Analog:** lines 17-25. Add `--text-4xl: 2.25rem; --text-4xl--line-height: 1.1;` between `--text-2xl` and `--text-5xl`, since `--text-*: initial` resets the scale (line 17).

---

### Tests

**`tests/unit/embed-facade.test.ts`**: copy `tests/unit/marquee-toggle.test.ts` lines 1-50. The `// @vitest-environment happy-dom` pragma goes on line 1, followed by the `FIXTURE` string, `beforeEach` setting `document.body.innerHTML`, typed getters that throw on a missing fixture, a "returns undefined when there is none" case, and `cleanup?.()`.

**`tests/unit/project-modules.test.ts`**: copy `tests/unit/project-card.test.ts` lines 1-50: `experimental_AstroContainer`, `portrait` from `src/assets/hero/portrait.png` as the test `ImageMetadata`, a `render(options)` helper using `container.renderToString(Component, { props })`, and the `classTokens` / `rootTag` regex helpers.

**`tests/unit/project-detail-view.test.ts`**: the pure-function style of `tests/unit/projects-layout.test.ts`. Build fixtures with a `project(overrides: Partial<Project>)` factory, like `tests/unit/project-card-view.test.ts` lines 7-26.

**`tests/unit/sync-run.test.ts` (extend)**: the fixture loader (lines 12-19), `REPO_TMP` temp roots (line 21), and the `PATHS` object (lines 25-30, add `modulesDir`). The fake fetch replies are `{ status, body, type }` (`Reply`, lines 71-75). Add a reply table keyed by CDN path that 404s `1400_webp` and serves `cover.png` for `1400`.

**`tests/unit/sync-commit.test.ts` (extend)**: the `beforeEach` seeding at lines 24-36 (old files + `.gitkeep`). Add a `modules` dir with OLD/NEW module names, then assert "a cover GC never removes modules" and "unreferenced modules are removed".

**`tests/unit/sync-sanitize.test.ts`, `sync-modules.test.ts`**: use the fixture loader from `sync-run.test.ts:12-13` (`readFileSync(new URL('../fixtures/behance/…', import.meta.url))`). Real module HTML can be copied from `src/data/behance/snapshot.json` into fixtures, or imported directly the way `projects-snapshot.test.ts:3` imports `committed`.

**`tests/e2e/helpers/projects.ts` (extend)**: Node-safe imports with `with { type: 'json' }` and `.ts` extensions (lines 4-9). Expectations derive from `sortProjects` (lines 58-60). `expectedDetail(locale, slug)` follows the same pattern, using `neighbours` from `detail-view.ts` (it must use `.ts`-extension imports and contain no `astro:*` imports).

**`tests/e2e/project-detail.spec.ts` (NEW)**: copy the `tests/e2e/projects.spec.ts` structure from lines 1-40: imports of `AxeBuilder`, `site`, `interpolate`, `en`/`es`, and the helpers; the `cases` array per locale; a `for … test.describe` loop; `page.goto` with a status 200 check; `toHaveAttribute('lang', …)`.

**Skip removals** (verified locations):
- `tests/e2e/projects.spec.ts:38`, in "lists every project newest first with detail links". The hrefs are only compared, so add a follow/200 check.
- `tests/e2e/a11y.spec.ts:38-39`: the comment above `projectSteps` (lines 40-47) says "asserted by href, never followed". Update that comment, then navigate or add a resolution test. Also add the detail paths to the `pages` axe list (line 9).
- `tests/e2e/home-latest-work.spec.ts:61-62`: the same comment pair, with links asserted at lines 63-67.
- `src/components/ui/ProjectCard.astro:5-6`: the "until then the links 404 by design" sentence.

---

## Shared Patterns

### Erasable TS + `.ts` value imports (anything imported by `scripts/` or e2e helpers)
**Source:** `src/lib/projects/projects.ts` lines 1-9, `snapshot-schema.ts` lines 1-2.
**Apply to:** `snapshot-schema.ts`, `overrides-schema.ts`, `projects.ts`, `model.ts`, `embeds.ts`, `detail-view.ts`, every `scripts/behance/*.ts` file.
```ts
/**
 * Pure build, guard and sort functions for projects. Kept free of any source and of Astro
 * virtual modules so the site and scripts/sync-behance.ts (Node type stripping) share the
 * same rules. Erasable TypeScript only, .ts extensions on value imports.
 */
import { locales } from '../../i18n/config.ts';
import type { Localized, OrderFields, Project, SourceProject } from './model.ts';
```
Site-only files (`card-view.ts`, `queries.ts`, the `toDetailView` file) use extensionless imports and may use `astro:i18n` / `astro:content`.

### Sync failures
**Source:** `scripts/behance/errors.ts` lines 6-36.
**Apply to:** every new sync module. Throw `new SyncError('<gate>', message)` before G7. After the snapshot rename, errors are wrapped by `postCommitError`. The CLI prints them through `failureMessage`, so the previous snapshot is reported as untouched (DATA-03).

### Fail-loud build errors (problem + file + fix)
**Source:** `behance-snapshot.ts:19-21`, `projects.ts:28-30`, `overrides-schema.ts:47-49`.
**Apply to:** the module-file resolver, the `moduleAlt` validation and the `neighbours` "no visible slug" error. Format: `<area>: <problem>. <fix in file>`.

### Host-pinned URLs and allowlists (defense in depth)
**Source:** `snapshot-schema.ts:15-25` (`httpsUrlOn`), `fetch-page.ts:22-23, 34-44` (`assertAllowed`, `CDN_HOSTS`).
**Apply to:** the embed src (schema), module image downloads (sync), and the facade client re-check.

### Data boundary (DATA-06)
**Source:** `eslint.config.js:31-47`, `queries.ts:51-55` doc comment.
**Apply to:** every new `.astro` file. Import only `lib/content/queries` and the `lib/projects/model` / pure helper types, never `sources/`.

### Localized title fallback with `lang`
**Source:** `card-view.ts:17-24` (data) and `ProjectCard.astro:79-83` (markup).
**Apply to:** the h1, the next-project h3, the "Previous" link and the `<title>`.

### New-tab external link
**Source:** `IconLink.astro:15-25` (`target="_blank" rel="noopener noreferrer"` + `sr-only` hint from `t('a11y.newTab')` + `arrow-up-right size-4 aria-hidden`).
**Apply to:** `ExternalTextLink`, and through it "View on Behance", the facade fallback and the unknown-module link. Prose links get `rel` from the sanitizer transform.

### Client behaviour through the lifecycle
**Source:** `RolesMarquee.astro:65-69` + `lib/motion/marquee.ts` + `lib/motion/lifecycle.ts:3` (`PageInit = (doc) => Cleanup | undefined`).
**Apply to:** `EmbedFacade.astro` / `embed-facade.ts`. `BaseLayout.astro:48-50` already imports `../lib/motion` on every page.

### Tailwind literal class maps
**Source:** `ProjectCard.astro:28-46`, `ToolIcon.astro:14-20` (`as const satisfies Record<…>`).
**Apply to:** `ToolIcon` size, image `fullBleed` variants, and any per-kind class choice. No string-built class names, no `<style>`, no `@apply`.

### Thin bilingual pages
**Source:** `src/pages/projects/index.astro` vs `src/pages/es/projects/index.astro`: identical bodies except `'en'`/`'es'` and the relative depth.
**Apply to:** both `[slug].astro` routes.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `scripts/behance/sanitize.ts` (option body) | utility | transform | No HTML sanitizing exists in the repo. Use RESEARCH Pattern 3 (verified against sanitize-html 2.18.1). The file shape follows `covers.ts` |
| sharp re-encode inside `module-images.ts` | utility | file-I/O | sharp is not imported anywhere in `src/` or `scripts/` today. Use RESEARCH Pattern 2 step 3 |
| `getStaticPaths` in the `[slug].astro` routes | route | SSG | There are no dynamic routes yet (only `index.astro` and `404.astro` pages). Use RESEARCH Pattern 6 |

---

## Metadata

**Analog search scope:** `scripts/`, `scripts/behance/`, `src/lib/**`, `src/components/**`, `src/pages/**`, `src/layouts/`, `src/i18n/`, `src/styles/`, `src/data/`, `tests/unit/`, `tests/e2e/`, `eslint.config.js`, `package.json`
**Files scanned:** about 45 read in full or in part
**Project skills:** none (`.claude/skills` and `.agents/skills` absent)
**Pattern extraction date:** 2026-10-17
