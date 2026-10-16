---
phase: 01-bilingual-walking-skeleton
reviewed: 2026-10-16T11:45:00Z
depth: standard
files_reviewed: 41
files_reviewed_list:
  - astro.config.ts
  - eslint.config.js
  - package.json
  - playwright.config.ts
  - vitest.config.ts
  - tsconfig.json
  - .gitignore
  - .prettierignore
  - .nvmrc
  - .vscode/launch.json
  - scripts/check-secrets.ts
  - scripts/secrets.ts
  - src/components/global/LanguageSwitcher.astro
  - src/components/global/SeoHead.astro
  - src/components/global/SiteFooter.astro
  - src/components/global/SiteHeader.astro
  - src/components/global/SkipLink.astro
  - src/components/sections/Hero.astro
  - src/components/ui/ButtonLink.astro
  - src/components/ui/IconLink.astro
  - src/components/views/HomeView.astro
  - src/components/views/NotFoundView.astro
  - src/data/site.ts
  - src/i18n/config.ts
  - src/i18n/routes.ts
  - src/i18n/t.ts
  - src/i18n/ui.en.ts
  - src/i18n/ui.es.ts
  - src/layouts/BaseLayout.astro
  - src/lib/motion/gate.ts
  - src/lib/motion/index.ts
  - src/lib/motion/lifecycle.ts
  - src/lib/seo.ts
  - src/pages/404.astro
  - src/pages/es/404.astro
  - src/pages/es/index.astro
  - src/pages/index.astro
  - src/styles/global.css
  - tests/unit/secrets.test.ts
  - tests/e2e/not-found.spec.ts
  - tests/e2e/i18n.spec.ts
findings:
  critical: 1
  warning: 4
  info: 8
  total: 13
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-10-16T11:45:00Z
**Depth:** standard
**Files Reviewed:** 41 (all of src/ and scripts/, plus configs; tests were only checked where they bear on a finding)
**Status:** issues_found

## Summary

The bilingual skeleton is in good shape overall. `vitest run` passed (55/55), `eslint .` reported nothing, and `astro check` gave 0 errors, 0 warnings and 0 hints. I also checked the built `dist/` output. The inline motion-gate script builds into valid code that does not depend on anything else, and the SEO head is correct for both locales.

The main defects are in the secrets gate (`scripts/`). It reads values only from `.env` and `.dev.vars`, while Vite reads more `.env.*` files at build time. Its dotenv parser also produces values that can never match. Both problems make the gate pass when it should fail.

There is one visible accessibility defect: the skip link loses its horizontal padding when it is focused. The Spanish 404 page is built to a location where it is served as a normal 200 page. Placeholder domain and email values have no build-time guard.

Verification legend: findings marked [Verified] were reproduced against `dist/` or by running the code. [Inference] marks a conclusion drawn from reading the code without running it.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: The secrets gate ignores values from `.env.local`, `.env.production` and other `.env.*` files that Vite loads during build

**File:** `scripts/check-secrets.ts:9,30-32`
**Issue:** `LOCAL_SECRET_FILES = ['.env', '.dev.vars']` is the only source of secret values for the dist content scan. During `astro build`, Vite also loads `.env.local`, `.env.production` and `.env.production.local`. Those are the files most likely to hold real production values. Any of their values that gets inlined into `dist/` (for example a mis-prefixed `PUBLIC_*` value, or an `import.meta.env.X` read inside a prerendered page) is never searched for, so `check:secrets` prints "secrets check ok".

The tracked-file check and the dist-file check both use `isSecretPath`, which already treats every one of these files as secret (verified: `isSecretPath('.env.production') === true`). Only the value scan is limited. That gives false assurance for FND-04: the gate runs, but it cannot detect the leak it exists to catch.

The same applies to `.dev.vars.<env>`, which Wrangler loads for named environments. That matters once the Cloudflare adapter is added.
**Fix:** Collect secret value files with the same predicate used everywhere else, excluding the example file.
```ts
const secretValueFiles = readdirSync('.')
  .filter((name) => isSecretPath(name) && statSync(name).isFile());
const secretValues = secretValueFiles.flatMap((file) =>
  parseSecretValues(readFileSync(file, 'utf8')),
);
```
Add a unit test showing that a value from `.env.production` is detected.

## Warnings

### WR-01: `parseSecretValues` returns values that can never match because inline comments and quote stripping are mishandled

**File:** `scripts/secrets.ts:25-28`
**Issue:** [Verified by running the function.] Input `A=supersecret123 # c` gives `"supersecret123 # c"`, and `B="quotedsecret" # c` gives `"\"quotedsecret\" # c"`. dotenv and Vite remove the trailing comment and the quotes, so the real value is `supersecret123`. The scanner instead searches for a string that will never appear in `dist/`, and the leak is missed. Multi-line quoted values (common for PEM keys) have the same problem: the second line keeps a trailing `"`.
**Fix:** For unquoted values, strip `\s+#.*$`. For quoted values, take the text up to the matching closing quote and ignore what follows:
```ts
const raw = line.slice(separator + 1).trim();
const quoted = /^(["'])(.*?)\1/.exec(raw);
return quoted ? quoted[2] ?? '' : raw.replace(/\s+#.*$/, '');
```
Add test cases for inline comments and for a quoted value followed by a comment.

### WR-02: The skip link loses its horizontal padding when focused

**File:** `src/components/global/SkipLink.astro:14`
**Issue:** [Verified in the built CSS.] `focus:not-sr-only` compiles to `.focus\:not-sr-only:focus{...padding:0;...}`. Tailwind emits variant rules after base utilities: in `dist/_astro/*.css`, `.px-4` is at offset 8537 and `.focus\:not-sr-only:focus` at 12361. The focus rule therefore overrides `px-4`, so the visible skip link draws its text against the `bg-surface-alt` edges with no padding. The `min-h-11` box survives, but the intended 16px inline padding does not. This is the first focusable element on every page.
**Fix:** Apply the padding as a focus variant so it comes after `not-sr-only`: `focus:px-4`. Alternatively, drop `sr-only`/`not-sr-only` and use a translate-off-screen pattern (`-translate-y-full focus:translate-y-0`). Add an e2e assertion on the computed `padding-left` when the link is focused.

### WR-03: The Spanish 404 is built as `/es/404/index.html`, so it is served as a 200 page and never as a 404

**File:** `src/pages/es/404.astro:1-16`
**Issue:** [Verified in `dist/`.] Astro gives the 404 special handling only at the root (`dist/404.html`). The Spanish page is emitted as `dist/es/404/index.html`, a normal route that returns HTTP 200 at `/es/404/`, and no host uses it as the not-found response for `/es/*`. The result is an extra 200 page that duplicates the 404 content. `noindex` keeps it out of search results, but it is still a real URL. The e2e comment (`tests/e2e/not-found.spec.ts:5-7`) already calls this a deferred deploy item, yet nothing in the code stops it shipping as-is.
**Fix:** Either set `build.format: 'file'` for this route, or add a post-build step that copies or moves the page to `dist/es/404.html`. Cloudflare Workers static assets with `not_found_handling: "404-page"` resolve the nearest `404.html`. Another option is to delete `src/pages/es/404.astro` until the deploy phase. Add a test that `/es/404/` does not return 200, or that `dist/es/404.html` exists.

### WR-04: Placeholder domain and email reach the canonical, hreflang, og:url and mailto output with no build guard

**File:** `src/data/site.ts:14-17` (used by `astro.config.ts:9`, `src/components/global/SiteFooter.astro:27,31`)
**Issue:** [Verified in `dist/index.html`.] `site: 'https://martinafernandez.example'` is written into every canonical, `hreflang` alternate and `og:url`. The visible contact email is `hello@martinafernandez.example`. The `.example` TLD cannot resolve. If this is deployed, every page gets a canonical URL on a foreign, unreachable host, and the contact link is dead. Only TODO comments mark the placeholder; nothing in `verify` fails on it.
**Fix:** Add a check to `scripts/check-secrets.ts`, or a small `scripts/check-placeholders.ts` called from `verify`/CI, that fails when `dist/**/*.html` contains `.example`. Alternatively, have `astro.config.ts` throw when `process.env.CI` is set and `site.url` ends with `.example`.

## Info

### IN-01: Footer copyright year is fixed at build time

**File:** `src/components/global/SiteFooter.astro:19`
**Issue:** `new Date().getFullYear()` runs during the static build, so the year is out of date until the next rebuild after January 1st.
**Fix:** Accept this (and rebuild on deploy), or note it in the deploy runbook.

### IN-02: English values for `notFound.altLocalePrompt` and `notFound.altLocaleLink` are never rendered and are misleading

**File:** `src/i18n/ui.en.ts:31-32`, `src/components/views/NotFoundView.astro:15,40,45`
**Issue:** These keys are only read through `tEs(...)`. The English strings ("Looking for the English version?") never appear, and they describe the opposite direction from how the keys are used. `src/pages/es/404.astro` passes `showAltLocale={false}`, so no reciprocal English link exists.
**Fix:** Rename the keys to make their direction explicit (for example `notFound.spanishPrompt`), or render the reciprocal English link on the Spanish 404 using `t(...)`.

### IN-03: Sticky header has no `scroll-padding-top`

**File:** `src/styles/global.css` (missing), `src/components/global/SiteHeader.astro:21`
**Issue:** The `h-16` sticky header will cover anchor targets (`#main`, `#contact`, and future section anchors) once sections are tall enough to scroll to the top. Today the hero's `py-16` and the short footer hide the problem. [Inference] It becomes a WCAG 2.4.11 (Focus Not Obscured) risk as sections are added.
**Fix:** Add `html { scroll-padding-top: 4rem; }` in `global.css` (`@layer base`).

### IN-04: `onMotionPreferenceChange` does not guard `matchMedia` and is not wired up

**File:** `src/lib/motion/gate.ts:21-33`
**Issue:** `applyMotionGate` checks `typeof win.matchMedia === 'function'`, but `onMotionPreferenceChange` calls `win.matchMedia(...)` directly and would throw in the same environments. Production code does not call it, so `html[data-motion]` is never updated when the OS setting changes mid-session.
**Fix:** Add the same guard (return a no-op unsubscribe). Wire it to update `data-motion` in `src/lib/motion/index.ts`, or delete it until Phase 6.

### IN-05: The lifecycle registry has no way to unregister, and duplicate registration runs an init twice

**File:** `src/lib/motion/lifecycle.ts:33-36`
**Issue:** `register` appends to `inits` without deduplicating, and `inits` is never pruned. [Inference] Once ClientRouter arrives (Phase 7), page-specific effects will re-run on every later page, and registering the same init twice runs it twice.
**Fix:** Store inits in a `Set<PageInit>` and return an unregister function from `register`.

### IN-06: ESLint applies both browser and Node globals to every file

**File:** `eslint.config.js:20`
**Issue:** Client code in `src/lib/motion/*` can reference `process` or `__dirname`, and `scripts/*` can reference `window`, without lint errors.
**Fix:** Scope the globals by file: `{ files: ['scripts/**', '*.config.*'], languageOptions: { globals: globals.node } }` and `globals.browser` for `src/**`.

### IN-07: `.dev.vars.example` would be flagged as a secret and is also git-ignored

**File:** `scripts/secrets.ts:4`, `.gitignore:21`
**Issue:** [Verified] `isSecretPath('.dev.vars.example') === true`, and `.gitignore` has no `!.dev.vars.example` exception, unlike `.env.example`. A Wrangler example file cannot be committed, and if force-added it would fail the gate.
**Fix:** Extend `ALLOWED` to `/(^|\/)(\.env|\.dev\.vars)\.example$/` and add `!.dev.vars.example` to `.gitignore`.

### IN-08: `--text-*: initial` silently removes every type scale step except four

**File:** `src/styles/global.css:15-23`
**Issue:** Any future `text-xs`, `text-lg`, `text-xl` or `text-3xl` class generates no CSS and gives no warning. The two-locale ternary in `src/lib/seo.ts:42` (`locale === 'en' ? 'es' : 'en'`) is a similarly hard-coded assumption.
**Fix:** Document the allowed scale next to the `@theme` block, or add a lint or unit check. Derive the alternate locale with `locales.find((l) => l !== locale)`.

---

_Reviewed: 2026-10-16T11:45:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
