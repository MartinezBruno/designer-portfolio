---
phase: 01-bilingual-walking-skeleton
verified: 2026-10-16T12:00:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open / and /es/ in a real browser at desktop and mobile widths"
    expected: "Hero (greeting, title, description, portrait) looks as designed; header, footer, and skip-link focus ring are visually correct (WR-02: skip link may lack horizontal padding when focused)"
    why_human: "Visual appearance and focus styling cannot be verified by grep or axe"
  - test: "Review Spanish copy and placeholder values (site URL, email) with Martina"
    expected: "Spanish text is acceptable; martinafernandez.example and hello@martinafernandez.example are replaced before deploy"
    why_human: "Content and brand decisions. Copy is marked as a draft (QUAL-03) and the placeholders are only marked by TODO comments (WR-04)."
---

# Phase 1: Bilingual Walking Skeleton Verification Report

**Phase Goal:** A visitor can open a real, accessible site in English at `/` or Spanish at `/es/`, switch languages, and see Martina's hero immediately. The developer has every quality gate working, plus the motion gate and lifecycle registry.
**Status:** human_needed (all automated truths verified; only visual and content review remains)
**Re-verification:** No, initial verification

## Observable Truths

| # | Truth (ROADMAP SC) | Status | Evidence |
|---|---|---|---|
| 1 | `pnpm dev/build/lint/test` and Playwright + axe pass; secrets check clean | VERIFIED | I ran `pnpm verify` myself and it exited 0. Lint (astro check, eslint, prettier) passed. Vitest passed 55/55 in 9 files. Playwright passed 43/43, including axe on `/`, `/es/`, `/does-not-exist` and `/es/404/`. `check:secrets` printed "secrets check ok (18 dist files scanned)". `.gitignore` covers `.env`, `.env.*` and keeps `!.env.example`. No secret files are present in the working tree or `dist/`. `pnpm dev` was not run (see Human Verification). |
| 2 | Hero at `/` and `/es/` without JS; shared header, footer with email and socials, skip link, Tabler inline SVG | VERIFIED | `home.spec.ts` ("hero without JavaScript") passes for both locales. `layout.spec.ts` confirms the footer has an email and a Behance link, and that the raw HTML has inline `<svg>` elements that are aria-hidden. The skip link e2e passes. Only 4 pages are built (`/`, `/es/`, `/404`, `/es/404/`). |
| 3 | EN / ES toggle lands on the equivalent page; browser language never redirects | VERIFIED | `i18n.spec.ts` covers `/`→`/es/`, `/es/`→`/`, and "browser prefers Spanish: / is never redirected". The 404 toggle goes to the home of the other language. The built `dist/index.html` has toggle links with `hreflang` and `aria-current`. |
| 4 | Correct `html lang`, canonical, hreflang (en, es, x-default), localized title/description/OG; missing ES key fails type-check/tests | VERIFIED | `dist/index.html` has `<html lang="en">`, a self canonical, and en, es and x-default alternates. `seo.spec.ts` passes for both locales. `ui.es.ts` ends with `as const satisfies Dictionary`, where `Dictionary = Record<UIKey, string>`, so `astro check` fails on a missing key. `dictionary-types.test.ts` also exists. |
| 5 | Localized 404 with link home; `data-motion="off"` with reduced motion or no JS and content visible; gate and registry with unit tests | VERIFIED | `not-found.spec.ts` passes for `/does-not-exist` and `/es/does-not-exist`. `motion.spec.ts` covers no-JS, reduced-motion and normal modes for both locales. `BaseLayout.astro` hard-codes `data-motion="off"`, and the gate flips it to "on". `src/lib/motion/{gate,lifecycle,index}.ts` exist and are covered by `motion-gate.test.ts` and `lifecycle.test.ts`. |

**Score:** 5/5

## Requirements Coverage

All 12 IDs appear in the plan frontmatter and map to Phase 1 in REQUIREMENTS.md. There are no orphans.

| Requirement | Plan(s) | Status |
|---|---|---|
| FND-01 | 01-01, 01-05 | SATISFIED. `pnpm verify` is green. |
| FND-02 | 01-01, 01-05 | SATISFIED. Playwright and axe pass (43 tests). |
| FND-03 | 01-03 | SATISFIED. Per-icon SVGs render inline with no client JS (footer icon e2e). |
| FND-04 | 01-01 | SATISFIED with a caveat. See the CR-01 assessment below. |
| I18N-01 | 01-01, 01-02 | SATISFIED |
| I18N-02 | 01-02 | SATISFIED |
| I18N-03 | 01-02 | SATISFIED |
| I18N-04 | 01-04 | SATISFIED |
| I18N-05 | 01-02 | SATISFIED |
| I18N-06 | 01-02, 01-03, 01-05 | SATISFIED |
| I18N-07 | 01-04 | SATISFIED. The root `404.html` is localized and has a home link. |
| HOME-01 | 01-03, 01-05 | SATISFIED |

## Advisory Review Assessment

**CR-01 (secrets value scan only reads `.env` and `.dev.vars`): WARNING, not a blocker for SC1.**

- I confirmed `scripts/check-secrets.ts:9` limits value scanning to those two files. The tracked-file check and the dist-file check use `isSecretPath`, which covers every `.env.*` variant.
- FND-04 requires that secrets are git-ignored and absent from the built output. Both conditions hold: `.env.*` is git-ignored, no secret files exist, and `dist/` is clean. The gate also fails if any secret file is tracked or copied to `dist/`.
- The gap is limited to the value-content scan, which is defense in depth. It could miss a value that a build inlines from `.env.production` or `.env.local`. No such values exist today, so SC1 is met. I recommend fixing it before the Contact and Cloudflare phases add real secrets. The same applies to WR-01, which is the parser's handling of inline comments and quotes.

**WR-03 (`/es/404/` served as 200): WARNING, does not undermine SC5.**

- SC5 requires that a nonexistent URL shows a localized 404 with a home link. The e2e tests confirm this for `/does-not-exist` and `/es/does-not-exist` (the Spanish cross-link is shown).
- The extra `/es/404/` page is `noindex`. The e2e comment already marks the host-level Spanish 404 as a deploy-time item. Fix it during the Cloudflare deploy phase (a `dist/es/404.html` or `not_found_handling` setup).

**Other warnings:** WR-02 (skip link padding on focus) is cosmetic and axe passes. WR-04 (`.example` placeholder domain and email in canonical, hreflang and `mailto`) must be resolved before launch. None of these block the phase goal.

## Anti-Patterns

I made no source changes and did not scan files exhaustively. The review reports no TBD, FIXME or XXX debt markers. Placeholders are marked with TODO comments, which is a warning-level item (WR-04).

## Human Verification Required

1. **Visual check of `/` and `/es/`** (desktop and mobile). Expected: the hero, header, footer and focus ring look right, and the skip link has sensible padding.
2. **Run `pnpm dev`** and open both locales. I did not start a server. The build and preview e2e tests passed, but the dev server was not exercised.
3. **Content review.** The Spanish copy is a draft, and the site URL and email are placeholders.

## Gaps Summary

There are no blocking gaps. The phase goal is achieved in the code. I ran the full `pnpm verify` chain and it passed. Status is `human_needed` because of the visual and content checks above. Carry CR-01, WR-01, WR-03 and WR-04 forward as follow-up items for later phases.

---

_Verified: 2026-10-16T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
