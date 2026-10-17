---
phase: 03-real-behance-work
reviewed: 2026-10-17T14:30:00Z
depth: standard
files_reviewed: 63
files_reviewed_list:
  - .gitignore
  - .prettierignore
  - docs/CONSENT.md
  - eslint.config.js
  - package.json
  - scripts/assert-offline.ts
  - scripts/behance/covers.ts
  - scripts/behance/errors.ts
  - scripts/behance/fetch-page.ts
  - scripts/behance/fs-commit.ts
  - scripts/behance/normalize.ts
  - scripts/behance/parse.ts
  - scripts/behance/raw-schemas.ts
  - scripts/behance/run-sync.ts
  - scripts/offline-guard.ts
  - scripts/offline.ts
  - scripts/sync-behance.ts
  - src/components/global/SiteHeader.astro
  - src/components/sections/LatestWork.astro
  - src/components/ui/ProjectCard.astro
  - src/components/ui/ProjectGrid.astro
  - src/components/views/HomeView.astro
  - src/components/views/ProjectsView.astro
  - src/data/project-overrides.json
  - src/i18n/ui.en.ts
  - src/i18n/ui.es.ts
  - src/layouts/BaseLayout.astro
  - src/lib/content/queries.ts
  - src/lib/projects/card-view.ts
  - src/lib/projects/layout.ts
  - src/lib/projects/local-overrides.ts
  - src/lib/projects/model.ts
  - src/lib/projects/overrides-schema.ts
  - src/lib/projects/projects.ts
  - src/lib/projects/slug.ts
  - src/lib/projects/snapshot-schema.ts
  - src/lib/projects/sources/behance-snapshot.ts
  - src/pages/es/projects/index.astro
  - src/pages/projects/index.astro
  - tests/e2e/a11y.spec.ts
  - tests/e2e/helpers/projects.ts
  - tests/e2e/home-latest-work.spec.ts
  - tests/e2e/home.spec.ts
  - tests/e2e/layout.spec.ts
  - tests/e2e/motion.spec.ts
  - tests/e2e/projects-grid.spec.ts
  - tests/e2e/projects.spec.ts
  - tests/unit/latest-work.test.ts
  - tests/unit/offline.test.ts
  - tests/unit/project-card-view.test.ts
  - tests/unit/project-card.test.ts
  - tests/unit/project-slug.test.ts
  - tests/unit/projects-layout.test.ts
  - tests/unit/projects-order.test.ts
  - tests/unit/projects-overrides.test.ts
  - tests/unit/projects-select.test.ts
  - tests/unit/projects-snapshot.test.ts
  - tests/unit/site-header.test.ts
  - tests/unit/sync-cli.test.ts
  - tests/unit/sync-commit.test.ts
  - tests/unit/sync-fetch.test.ts
  - tests/unit/sync-parse.test.ts
  - tests/unit/sync-run.test.ts
findings:
  critical: 0
  warning: 10
  info: 10
  total: 20
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-10-17T14:30:00Z
**Depth:** standard
**Files Reviewed:** 63
**Status:** issues_found

## Summary

I reviewed the Behance sync (`scripts/behance/*`, `scripts/sync-behance.ts`), the offline build gate (`scripts/offline*.ts`, `scripts/assert-offline.ts`), the project model, schemas and query layer, the new Astro components and pages, and the related tests. Source files got a full read. Test files got a lighter read, aimed at weak assertions and untested failure paths.

**What holds up (verified by reading the code, and by running the 6 sync/project unit test files: 129 tests pass):**
- Remote data never reaches a file path. Cover names are `<digits>-<sha256 12>.<ext>` and are checked in three places (`coverFileName`, `assertCoverName`, `COVER_FILE` in the snapshot schema).
- Both page and CDN requests use an https host allowlist and `redirect: 'error'`.
- Both size limits (content-length and actual bytes) are enforced.
- Covers need an `image/*` content type and a magic-byte match.
- The challenge cookie only accepts hex (`[0-9a-f]{32,}`), so a header cannot be injected through it.
- Nothing under `paths.snapshot` or `paths.coversDir` is written before G7.
- Rendering is safe. Titles, summaries, alt text, tools and category labels are all Astro text or attribute expressions, which Astro escapes. The only `set:html` in `src/` is still the build-time motion-gate constant (`src/layouts/BaseLayout.astro:29`).

**Main concerns:**
- The offline guard can be bypassed in ways I verified by probe: named `dns` imports, `dns/promises`, `dns.resolve*` and worker threads are not covered.
- The CLI tells the developer "The previous snapshot was left untouched" even when the failure happened after the snapshot was replaced.
- A cover copy cut off partway can leave a corrupt cover file that later runs never repair.
- `z.url()` accepts `javascript:`, `data:` and `file:` URLs (verified). Phase 4's "link back to Behance" is not safe until the schema is tightened.

No BLOCKER-level defects were found.

## Warnings

### WR-01: The offline guard misses named `dns` imports, `dns/promises` and the `dns.resolve*` family

**File:** `scripts/offline-guard.ts:62-74`
**Issue:** The guard replaces only the `lookup` property of the default `node:dns` export (`Object.assign(dns, { lookup: offlineLookup })`). I verified this with `node --import=./scripts/offline-guard.ts`:
- `import { lookup } from 'node:dns'` still gets the original function. ESM named bindings of builtins are not updated without `module.syncBuiltinESMExports()`.
- `dns.promises.lookup` and `node:dns/promises` are unpatched.
- `dns.resolve4`, `resolveAny` and the rest (c-ares over UDP, which never touches `net.Socket.prototype.connect`) are unpatched.
- `dgram` is not blocked either.

Any dependency that resolves names this way sends real DNS traffic during `build:offline` and records nothing in the log. `assert-offline.ts` then reports "0 network attempts", so the DATA-04 gate can pass falsely.
**Fix:**
```ts
import dnsPromises from 'node:dns/promises';
import { syncBuiltinESMExports } from 'node:module';

const blockedAsync = (name: string) => async (host: string) => {
  note(`dns ${name} ${host}`);
  throw Object.assign(new Error(`getaddrinfo ENOTFOUND ${host}`), { code: 'ENOTFOUND' });
};
for (const name of ['lookup', 'resolve', 'resolve4', 'resolve6', 'resolveAny', 'resolveCname', 'resolveTxt', 'resolveSrv', 'resolveMx', 'resolveNs'] as const) {
  Object.assign(dnsPromises, { [name]: blockedAsync(name) });
}
// also patch the callback dns.resolve* family and dns.Resolver.prototype, block dgram.createSocket
syncBuiltinESMExports(); // propagate to `import { lookup } from 'node:dns'`
```
Add a unit or integration test that loads the guard and asserts these entry points are replaced.

### WR-02: Worker threads run with no offline guard

**File:** `scripts/offline-guard.ts:1-3`, `package.json` (`build:offline`)
**Issue:** `--import` preloads run in the main thread and in child processes, but not in `worker_threads` workers. I verified this with a probe: inside a `Worker` started under the guard, `net.Socket.prototype.connect` is the original (not the named `connect` wrapper), and `globalThis.fetch` is the native undici fetch. Any network use from a worker (Vite/Rolldown plugin workers, image-processing pools, tinypool) is neither blocked nor logged. That is a second false-pass path for DATA-04.
**Fix:** In the guard, wrap `worker_threads.Worker` so every worker loads the guard first. One option is to prepend `--import=<absolute guard path>` to `execArgv`. Another is to inject the guard through `new Worker(..., { execArgv: [...process.execArgv, '--import', guardUrl] })` by patching the `Worker` constructor. Document what remains uncovered (native addons, non-Node subprocesses). Add an integration test that starts a worker under the guard and asserts a `fetch` inside it is logged.

### WR-03: The guard log path is relative, and a stale log can satisfy the gate

**File:** `scripts/offline-guard.ts:11-23`, `scripts/assert-offline.ts:8,17-20`
**Issue:**
1. `log` defaults to the relative `tmp/offline-guard.log`, and `mkdirSync` runs only once at load. If any guarded process (main or child) runs with, or changes to, a different cwd, `appendFileSync` either writes a log that `assert-offline.ts` never reads, or throws `ENOENT` inside the patched `fetch` or `connect`. In both cases the attempt goes unrecorded.
2. `assert-offline.ts` only checks that the log exists. It does not check that the log came from this build. Running `node scripts/assert-offline.ts` against an old empty log, or a build where the guard was never preloaded (for example `NODE_OPTIONS` overridden by the environment or a wrapper), passes.
3. If `OFFLINE_GUARD_ACTIVE=1` leaks into the developer's shell, the log is never truncated. That fails closed, but the message is confusing.

**Fix:** Resolve the path once and export it:
```ts
const log = resolve(process.env['OFFLINE_GUARD_LOG'] ?? 'tmp/offline-guard.log');
process.env['OFFLINE_GUARD_LOG'] = log;
```
Also write a header line with a run nonce, such as `# guard <pid> <iso time>`, when truncating. Have `assert-offline.ts` require that header, and require it to be newer than `dist/`'s mtime. Ignore lines starting with `#` in `readAttempts`.

### WR-04: The CLI says the snapshot was untouched for failures after it was replaced

**File:** `scripts/sync-behance.ts:57-60`, `scripts/behance/run-sync.ts:216-259`, `scripts/behance/fs-commit.ts:108-118`
**Issue:** Every error that reaches the CLI is printed with the suffix `The previous snapshot was left untouched.`. Some errors can only happen after the atomic rename at `fs-commit.ts:110`, by which point the new snapshot is live:
- The GC `readdir` or `rm` at `fs-commit.ts:114-117` (EPERM, EBUSY, a file locked by an editor or indexer).
- The G9 report code, or `deps.log`.
- `removeStaging` in the `finally` block.

The developer is told the old data is intact when it has been replaced, and the run exits 1. They may then restore or re-commit the wrong state.
**Fix:** Mark the commit point and change the message after it:
```ts
// run-sync.ts
let committed = false;
...
const { added, removed } = await commitSync(...);
committed = true;
...
} catch (error) {
  if (committed) throw new SyncError('G7', `snapshot was written, but a post-commit step failed: ${msg(error)}`);
  throw error;
}
```
In `sync-behance.ts`, print `UNTOUCHED` only when `!(error instanceof SyncError && error.gate === 'G7-post')` (or a dedicated `committed` flag on the error). Add a `sync-run` test where GC `rm` fails after the rename.

### WR-05: A partially copied cover is kept forever and treated as valid

**File:** `scripts/behance/fs-commit.ts:4-7,88-106`
**Issue:** `copyFile(..., COPYFILE_EXCL)` writes straight to the final name in `coversDir`. It is not atomic. If the process is killed or the disk fills mid-copy, a truncated `<id>-<hash>.png` is left under its content-hash name. On every later run:
- The pre-flight (`exists(join(covers, name))`) accepts it.
- `COPYFILE_EXCL` returns `EEXIST`, which is swallowed.
- The new snapshot references it.

The header comment says "an equal name means equal bytes", but nothing ever re-checks the bytes, so a corrupt cover can be committed and shipped. The build may fail opaquely, or render a broken image.
**Fix:** Copy to a temporary name in `coversDir` (for example `.<name>.partial`), then `link(tmp, final)` (fails with EEXIST and never replaces) and `unlink(tmp)`. Alternatively, on `EEXIST`, hash the existing file and fail (or replace it) when the digest prefix does not match the name:
```ts
const existing = await readFile(join(covers, name));
const digest = createHash('sha256').update(existing).digest('hex').slice(0, 12);
if (!name.includes(`-${digest}.`)) throw new Error(`cover ${name} on disk does not match its hash`);
```

### WR-06: Snapshot URL fields accept `javascript:`, `data:` and `file:` schemes

**File:** `src/lib/projects/snapshot-schema.ts:15,27,38`, `src/lib/projects/model.ts:26`, `src/lib/projects/sources/behance-snapshot.ts:30`
**Issue:** `url`, `cover.sourceUrl` and `profile.url` use bare `z.url()`. I verified with `astro/zod` that it accepts `javascript:alert(1)`, `data:text/html,x` and `file:///etc/passwd`. The sync only fetches allowlisted https hosts, but the schema is the site's build-time trust boundary for a committed, hand-editable file (`origin: 'seed'` exists for hand-written data). `project.url` already flows into `SourceProject.sourceUrl`, and D-04 requires a "link back to Behance". The day that link is rendered as `href={sourceUrl}`, a crafted snapshot becomes stored XSS. The schema claims to be strict but does not constrain the field that matters.
**Fix:**
```ts
const behancePage = z.url({ protocol: /^https$/, hostname: /^www\.behance\.net$/ });
const behanceCdn = z.url({ protocol: /^https$/, hostname: /^mir-s3-cdn-cf\.behance\.net$/ });
// url: behancePage, profile.url: behancePage, cover.sourceUrl: behanceCdn
```
Add negative tests for `javascript:` and foreign hosts in `projects-snapshot.test.ts`.

### WR-07: The CDN-reference gate scans only `.html` and misses encoded URLs

**File:** `scripts/assert-offline.ts:35-38`, `scripts/offline.ts:5`
**Issue:** `findCdnReferences` runs only on `dist/**/*.html`, and its regex requires a literal `//` before the host. These all pass the gate:
- CSS or JS bundles in `dist/_astro/*.css|*.js` (for example a `background-image: url(https://mir-s3-cdn-cf...)`).
- `sitemap*.xml` and JSON files.
- URL-encoded references such as `/_image?href=https%3A%2F%2Fmir-s3-cdn-cf.behance.net%2F...`, the form Astro uses for unoptimized or remote image endpoints.
- JSON-escaped `https:\/\/mir-...`.

Each of these is a runtime dependency on Behance, which DATA-04 forbids.
**Fix:** Scan every text file in `dist/` (`.html`, `.css`, `.js`, `.mjs`, `.json`, `.xml`, `.svg`, `.txt`). Match the host names themselves rather than the `//host` prefix, for example `/(?:mir-s3-cdn-cf|mir-cdn)\.behance\.net/`. Run the regex over `decodeURIComponent`-safe and `\/`-unescaped variants. Add test cases for encoded and CSS references.

### WR-08: The unknown-flag CLI test can trigger a live sync against the real repo

**File:** `tests/unit/sync-cli.test.ts:10-18,35-40`
**Issue:** `run()` removes `CI` from the environment, and the `--bogus` case does not set it back. The script's `cwd` is the repo root, and `runSync` writes `src/data/behance/snapshot.json` and `src/assets/projects/` there. If a regression ever lets an unknown flag through (for example someone adds a flag and changes the filter), this unit test makes real network requests to Behance and can overwrite committed data. That breaks the "no case reaches runSync" promise in the header comment and the D-04 "manual runs only" rule.
**Fix:** Unknown-flag validation runs before the CI check, so pass `CI: '1'` in every case that is not meant to sync. The current assertions still hold:
```ts
const result = run(['--bogus'], { CI: '1' });
```
Optionally, add a guard env var (for example `SYNC_BEHANCE_DRY=1`) that makes `sync-behance.ts` exit before `runSync`.

### WR-09: Duplicate project ids are not rejected

**File:** `src/lib/projects/snapshot-schema.ts:34-40`, `scripts/behance/run-sync.ts:172-189`
**Issue:**
- `SnapshotSchema` and `parseProfileStore` never check that `projects[].id` values are unique.
- Overrides are keyed by id, and `validateOverrides` only checks slug uniqueness.

So a snapshot with two entries sharing an id but with different slugs passes G5, G8 and the site build. Such a snapshot can come from a Behance list glitch where the slug was edited between pages, or from a hand edit. The site then renders the project twice, and both copies get the same override. When the slugs match, the build does fail, but with a misleading "duplicate slug ... add a slug override" message.
**Fix:**
```ts
projects: z.array(SnapshotProjectSchema).min(1).superRefine((list, ctx) => {
  const seen = new Set<string>();
  for (const [index, p] of list.entries()) {
    if (seen.has(p.id)) ctx.addIssue({ code: 'custom', path: [index, 'id'], message: `duplicate project id ${p.id}` });
    seen.add(p.id);
  }
}),
```
Also fail G1 in `parseProfileStore` on duplicate ids.

### WR-10: An error from `removeStaging` in `finally` hides the real sync failure

**File:** `scripts/behance/run-sync.ts:257-259`
**Issue:** If `removeStaging` throws (EPERM, EBUSY on Windows or with a locked file), the `finally` block replaces the original `SyncError`, which carries the gate and the actionable plan-B message, with an unrelated fs error. On a successful run the same throw turns success into exit 1, and combined with WR-04 the CLI then reports "untouched".
**Fix:**
```ts
} finally {
  await removeStaging(root, stagingDir).catch((error: Error) => {
    deps.log(`sync:behance: could not remove staging dir ${stagingDir}: ${error.message}`);
  });
}
```

## Info

### IN-01: The challenge replay waits 4 s, and the test cannot tell

**File:** `scripts/behance/fetch-page.ts:138`, `scripts/behance/run-sync.ts:150`
**Issue:** `fetchStorePage` sleeps 2000 ms before the replay, and then the `paced` wrapper sleeps another 2000 ms. The run-sync test only checks that the event just before each fetch is a sleep, so `[sleep, sleep, fetch]` passes. This is harmless but undocumented, and it doubles the challenge delay.
**Fix:** Decide on one pacing owner. Either skip the inner sleep when the caller paces, or assert the exact event sequence in the test.

### IN-02: Tie-break ordering differs between the sync and the site

**File:** `scripts/behance/run-sync.ts:124`, `src/lib/projects/projects.ts:127,132`
**Issue:** The sync sorts equal `publishedOn` values numerically (length first). `sortProjects` and `newestFirst` use `localeCompare`, where `"9" > "10"`. This only matters for identical timestamps, but the two orders can disagree.
**Fix:** Share one numeric id comparator, for example `a.id.length - b.id.length || (a.id < b.id ? -1 : 1)`.

### IN-03: `localized` is not strict and accepts whitespace-only strings

**File:** `src/lib/projects/overrides-schema.ts:13`
**Issue:** `z.object` drops unknown keys without error, so a misplaced `"fr"` or a typo'd extra key is ignored, unlike the strict `OverrideSchema`. `min(1)` accepts `" "`, which would render a blank title or alt.
**Fix:** `z.strictObject({ en: z.string().trim().min(1), es: z.string().trim().min(1) })`.

### IN-04: The comment says `Number(label.id)` yields NaN for non-numeric ids, but `""` becomes 0

**File:** `scripts/behance/normalize.ts:18-23`
**Issue:** `Number('')` is `0`, `Number(' 12 ')` is `12`, and `Number('0x1A')` is `26`. All pass `z.int()`, which contradicts the comment that a non-numeric id fails G5.
**Fix:** Use `/^\d+$/.test(label.id) ? Number(label.id) : Number.NaN`.

### IN-05: The code departs from AGENTS.md typing conventions

**File:** `scripts/behance/parse.ts:60`, `src/lib/projects/card-view.ts:46-47`
**Issue:**
- `parseJson` returns `unknown`. This is reasonable at a parse boundary, but it is not documented as an exception to AGENTS.md.
- `{} as Record<CategoryId, string>` is a type assertion.
- `titles.get(id) ?? id` is a dead fallback after the missing-id check.

**Fix:** Build the record with `Object.fromEntries(categoryIds.map(...))` behind a typed helper. Note the `unknown` exception in a comment.

### IN-06: The e2e expectations reuse the site's ordering code and copy the card-view logic

**File:** `tests/e2e/helpers/projects.ts:35-63`
**Issue:**
- `expectedProjects` and `expectedHome` call the same `sortProjects` and `selectHomeProjects` the build uses. An ordering bug would therefore appear in both the page and the expectation, so e2e cannot catch it (unit tests are the only coverage).
- `titleLang` and slug logic are copied from `card-view.ts` and `projects.ts`, so the copies can drift apart.
- `coverAlt` returns `null` for the fallback, so the D-15 fallback alt is never checked end to end.

**Fix:** Pin the expected order of the 7 committed ids as a literal list in at least one e2e test, and assert the fallback alt string.

### IN-07: Raw TextModule and EmbedModule HTML is stored unsanitized

**File:** `scripts/behance/normalize.ts:44`, `src/lib/projects/snapshot-schema.ts:31`
**Issue:** `modules` keeps Behance HTML (`text`, `fluidEmbed` iframes) as is. Nothing renders it in Phase 3, but there is no marker in the schema or model that it is untrusted. Phase 4 must sanitize it at sync time before any `set:html`.
**Fix:** Add a `// UNTRUSTED HTML: sanitize before rendering (Phase 4)` note on the `modules` schema. Consider a test that forbids `set:html` on module fields.

### IN-08: The fallback cover alt mixes languages

**File:** `src/lib/projects/card-view.ts:30`
**Issue:** With no override, the EN alt becomes for example "Cabrera´s motos, Posts — cover": a Spanish title inside an English string, with no `lang` (an `alt` attribute cannot carry one). Screen readers mispronounce it. All 7 projects currently have overrides, so this is latent.
**Fix:** Accept it and document it, or use a neutral fallback such as `t('projects.coverAltGeneric')` when `project.title === null && project.contentLang !== locale`.

### IN-09: The DATA-06 import restriction leaves out `src/layouts/**`

**File:** `eslint.config.js:31-47`
**Issue:** The rule covers `src/components/**` and `src/pages/**` only. A layout could import `lib/projects/sources/*` without a lint error.
**Fix:** Add `'src/layouts/**'` to `files`.

### IN-10: The cover minimum-size check is off by one against its message

**File:** `scripts/behance/fetch-page.ts:174`
**Issue:** `bytes.byteLength <= MIN_COVER_BYTES` rejects a cover of exactly 1024 bytes, while the test and plan wording say "under 1 KB".
**Fix:** Use `<` so the check matches "under 1 KB".

---

_Reviewed: 2026-10-17T14:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
