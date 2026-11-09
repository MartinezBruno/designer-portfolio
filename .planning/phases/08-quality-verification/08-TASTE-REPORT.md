# 08-07 Taste Gate Report: redesign (D-20, report only)

- **Date:** 2026-11-06
- **Code under test:** `69d8bc6` (the redesign merge `ff5bf7c` plus the Phase 8 wave 1 test and tracking commits; no `src/` change after `ff5bf7c` other than wave 1)
- **Build:** `pnpm build` (exit 0), then `node scripts/e2e-preview-env.ts`, then `pnpm astro preview --port 4483 --ignore-lock` (this worktree's private port)
- **Skill:** taste-skill 2.0.0 (`~/.claude/plugins/cache/taste-skill/taste-skill/2.0.0/skills/taste-skill/`). The Skill tool was not available to this executor, so `SKILL.md` and `references/critique.md` were read directly and applied (same as 07-18 and 07-21).
- **Scope:** report only. No `src/` file was changed (`git diff --quiet -- src` passes).
- **Screenshots:** everything is under `.taste-skill/08-07/` (gitignored, so it is not committed). Inspect sheets are in `.taste-skill/08-07/<page>/`. The footer captures and re-check probes are in `.taste-skill/08-07/footer/`.

Labels: **[Verified]** means measured or seen in a screenshot in this run. **[Inference]** means deduced from those measurements and not proven.

## 1. lint.mjs

| Command | Files | Result |
| --- | --- | --- |
| `lint.mjs src/components src/pages src/layouts src/styles` (plan scope) | 49 | **0 FAIL, 0 WARN** |
| `lint.mjs` on the same folders plus `src/lib/motion src/lib/ui` (the 07-21 scope) | 74 | **0 FAIL, 0 WARN** |

Against 07-21: the accepted `hairline` FAIL (SiteHeader.astro:34) and `outlined-box` WARN (ToolsRow.astro:21) are **gone** after the redesign. There is one `taste-skill-ignore` in source, ServiceChips.astro:28: "2px radio-chip boundary (WCAG 1.4.11), not a 1px box". It is justified and kept. [Verified]

## 2. inspect.mjs: URL x width

Run with `inspect.mjs <url> --out .taste-skill/08-07/<page> --widths 1440,390`. inspect lists its findings against the first width (1440). A code that also fails at 390 is tagged `alsoAt: [390]` in `report.json`. The 390 column lists those codes, and then the 390 measurements that would trigger a rule if they failed: headline lines, horizontal overflow, broken images and console errors.

The plan's list gives 10 URLs but says "12", so `/es/does-not-exist` and `/404/` were added to cover both 404 routes in both locales.

Detail pages come from `expectedDetails()`. The only project with an embed is `portfolio-web`. The first one without an embed is `cabreras-motos-posts`.

| # | URL | Width | Codes | New vs 07-21 baseline | Screenshots |
| - | --- | ----- | ----- | --------------------- | ----------- |
| 1 | `/` | 1440 | WARN `size-count` (11 sizes), WARN `first-action`, WARN `no-footage` | **Improved.** 07-21 had FAIL `icon-cards` and WARN `hairline`, `palette-cream`, `first-action`, `no-footage`. icon-cards, hairline and palette-cream are cleared. `size-count` WARN is **new** | `en-home/desktop-fold.jpg`, `desktop-page-01.jpg`, `desktop-page-02.jpg` |
| 1 | `/` | 390 | WARN `first-action`. h1 2 lines, overflow 0, broken images 0, console errors 0 | same as 07-21 (first-action) | `en-home/mobile-fold.jpg`, `mobile-page-01.jpg`, `mobile-page-02.jpg` |
| 2 | `/es/` | 1440 | **FAIL `empty-screens`** (screens 2, 3; screen 3 fill 0.19 against EN 0.20), WARN `size-count`, `first-action`, `no-footage` | icon-cards, hairline and palette-cream cleared. `empty-screens` is **new vs 07-21** but is the accepted Phase 3 Home code (section 6). `size-count` is new | `es-home/desktop-fold.jpg`, `desktop-page-01.jpg`, `desktop-page-02.jpg` |
| 2 | `/es/` | 390 | WARN `first-action`. h1 2 lines, overflow 0, broken 0, errors 0 | same | `es-home/mobile-fold.jpg`, `mobile-page-01.jpg`, `mobile-page-02.jpg` |
| 3 | `/projects/` | 1440 | **FAIL `empty-screens`** (4 of 5), WARN `first-action`, `no-footage` | Not in 07-21. Against the Phase 3 baseline (FAIL focal-point, still-page, empty-screens; WARN hairline, palette-cream, first-action, no-footage), **focal-point, still-page, hairline and palette-cream are cleared**. empty-screens was accepted | `en-projects/desktop-fold.jpg`, `desktop-page-01.jpg`, `desktop-page-02.jpg` |
| 3 | `/projects/` | 390 | WARN `first-action`. h1 1 line, overflow 0, broken 0, errors 0 | same | `en-projects/mobile-fold.jpg`, `mobile-page-01.jpg` |
| 4 | `/es/projects/` | 1440 | **FAIL `empty-screens`** (4 of 5), WARN `first-action`, `no-footage` | as row 3 | `es-projects/desktop-fold.jpg`, `desktop-page-01.jpg`, `desktop-page-02.jpg` |
| 4 | `/es/projects/` | 390 | WARN `first-action`. h1 1 line, overflow 0, broken 0, errors 0 | same | `es-projects/mobile-fold.jpg`, `mobile-page-01.jpg` |
| 5 | `/projects/portfolio-web/` (embed) | 1440 | **FAIL `still-page`** (6 moved), WARN `first-action`, `no-footage` | Not in 07-21. still-page on long detail pages was accepted in 06-04 (17.3 screens, past the inspector's walk) | `en-detail-embed/desktop-fold.jpg`, `desktop-page-01..03.jpg` |
| 5 | `/projects/portfolio-web/` | 390 | WARN `first-action`. h1 1 line, overflow 0, broken 0, errors 0 | same | `en-detail-embed/mobile-fold.jpg`, `mobile-page-01.jpg` |
| 6 | `/es/projects/portfolio-web/` (embed) | 1440 | **FAIL `still-page`** (6 moved), WARN `first-action`, `no-footage` | as row 5 | `es-detail-embed/desktop-fold.jpg`, `desktop-page-01..03.jpg` |
| 6 | `/es/projects/portfolio-web/` | 390 | WARN `first-action`. h1 1 line, overflow 0, broken 0, errors 0 | same | `es-detail-embed/mobile-fold.jpg`, `mobile-page-01.jpg` |
| 7 | `/projects/cabreras-motos-posts/` (no embed) | 1440 | WARN `still-page` (14 moved), WARN `first-action`, `no-footage` | Same as 06 (Cabrera's: WARN still-page at 13, accepted, D-04) | `en-detail-noembed/desktop-fold.jpg`, `desktop-page-01..03.jpg` |
| 7 | `/projects/cabreras-motos-posts/` | 390 | WARN `first-action`. h1 2 lines, overflow 0, broken 0, errors 0 | same | `en-detail-noembed/mobile-fold.jpg`, `mobile-page-01.jpg` |
| 8 | `/es/projects/cabreras-motos-posts/` (no embed) | 1440 | WARN `still-page` (15 moved), WARN `first-action`, `no-footage` | as row 7 | `es-detail-noembed/desktop-fold.jpg`, `desktop-page-01..03.jpg` |
| 8 | `/es/projects/cabreras-motos-posts/` | 390 | WARN `first-action`. h1 2 lines, overflow 0, broken 0, errors 0 | same | `es-detail-noembed/mobile-fold.jpg`, `mobile-page-01.jpg` |
| 9 | `/does-not-exist` (HTTP 404) | 1440 | **FAIL `few-pictures`** (0), **FAIL `still-page`** (0 moved), WARN `first-action`, `no-footage` | **First gate run on the 404 page type** (no earlier baseline) | `en-404-unknown/desktop-fold.jpg`, `desktop-page-01.jpg` |
| 9 | `/does-not-exist` | 390 | WARN `first-action`. h1 1 line, overflow 0, broken 0, errors 0 | first run | `en-404-unknown/mobile-fold.jpg`, `mobile-page-01.jpg` |
| 10 | `/es/does-not-exist` (HTTP 404) | 1440 | **FAIL `few-pictures`**, **FAIL `still-page`**, WARN `first-action`, `no-footage` | first run | `es-404-unknown/desktop-fold.jpg`, `desktop-page-01.jpg` |
| 10 | `/es/does-not-exist` | 390 | WARN `first-action`. h1 2 lines, overflow 0, broken 0, errors 0 | first run | `es-404-unknown/mobile-fold.jpg`, `mobile-page-01.jpg` |
| 11 | `/404/` (HTTP 404) | 1440 | **FAIL `few-pictures`**, **FAIL `still-page`**, WARN `first-action`, `no-footage` | first run | `en-404/desktop-fold.jpg`, `desktop-page-01.jpg` |
| 11 | `/404/` | 390 | WARN `first-action`. h1 1 line, overflow 0, broken 0, errors 0 | first run | `en-404/mobile-fold.jpg`, `mobile-page-01.jpg` |
| 12 | `/es/404/` (HTTP 404) | 1440 | **FAIL `few-pictures`**, **FAIL `still-page`**, WARN `first-action`, `no-footage` | first run | `es-404/desktop-fold.jpg`, `desktop-page-01.jpg` |
| 12 | `/es/404/` | 390 | WARN `first-action`. h1 2 lines, overflow 0, broken 0, errors 0 | first run | `es-404/mobile-fold.jpg`, `mobile-page-01.jpg` |

Across all 24 rows [Verified]:
- No headline runs over 2 lines (`over2Lines` is 0 everywhere).
- Horizontal overflow is 0.
- Broken images: 0.
- Console errors: 0.
- No inspect finding concerns contrast, eyebrows, monospace, numbering, gradients, shadows or glass.

`first-action` note [Inference]: the home and 404 first screens do have a filled pill CTA, 56 px tall ("Let's work together" in `en-home/desktop-fold.jpg`, "Back to home" in `en-404-unknown/desktop-page-01.jpg`), yet inspect still raises the WARN. The inspector seems not to count these pill links as the primary button. This is the same WARN carried since Phase 3.

## 3. Screenshots reviewed

Every 1440 and 390 sheet listed in the table was opened and reviewed: `desktop-fold`, `desktop-page-*`, `mobile-fold` and `mobile-page-*` for all 12 pages. On top of those:

**Footer band** (`#0f70b7`, decorative name `text-[10.4vw]`, `aria-hidden="true"`), captured with Playwright. Animations were disabled and the mouse was parked at 0,0, following the contact-states.spec.ts convention:

| Capture | Name size | Text span vs container | Doc overflow-x |
| --- | --- | --- | --- |
| `.taste-skill/08-07/footer/footer-en-1440.png` | 149.76px | 57 to 1310 inside 64 to 1376 | 0 |
| `.taste-skill/08-07/footer/footer-es-1440.png` | 149.76px | 57 to 1310 inside 64 to 1376 | 0 |
| `.taste-skill/08-07/footer/footer-en-390.png` | 40.56px | 14 to 354 inside 16 to 374 | 0 |
| `.taste-skill/08-07/footer/footer-es-390.png` | 40.56px | 14 to 354 inside 16 to 374 | 0 |

The footer also appears in the inspect sheets (`en-home/desktop-page-02.jpg` and `mobile-page-02.jpg`, the matching `es-home` sheets, and the last tile of every other page).

Footer results [Verified]:
- The name is never clipped: whitespace-nowrap inside `overflow-hidden` still fits at both widths.
- White on `#0f70b7` is 5.22:1, which passes AA for the small © line too.
- The name is `aria-hidden`, so screen readers don't hear it twice.
- EN and ES are identical: the name isn't translated, and the heading changes from "Let's talk" to "Hablemos".

**Re-check probes** (in `.taste-skill/08-07/footer/`):
- `recheck-home-{en,es}-purov-390.png`, `recheck-projects-{en,es}-sistema-390.png`
- `purov-probe-{390,1440,768}-*.png`
- `purov-jump-*`, `purov-reload-*`, `purov-back-*`, `purov-{cta-click,deep-link,keyboard-end}-*`
- `services-{en,es}-1440.png`

Colour contrast of the tokens, computed with WCAG relative luminance [Verified]:

| Pair | Ratio |
| --- | --- |
| ink-muted `#565b61` on white | 6.85:1 |
| ink-muted on surface-alt `#f2f3f5` | 6.17:1 |
| white on accent `#0f70b7` | 5.22:1 |
| ink on surface-alt | 17.0:1 |

## 4. Critique (references/critique.md format)

```
ROUND 1
Seen in one second: "Hi, I'm Martina." at 168px beside her round portrait, over the blue roles band
Idea (one sentence): the designer's own Behance work leads every route, framed by a single blue (#0f70b7) that returns as the footer band carrying her name at full width
Live thing: the contact form, with service chips preselected by "Ask about this"
Layout words by section: hero=split / roles=band / work=grid / services=index / tools=row / contact=split / footer=full-bleed name
Scores: design 7 · usability 7.5 · creativity 6.5 · content 7 → overall 7.1 (before caps)
Caps applied: inspect FAILs remain (empty-screens on /projects/ and /es/; few-pictures + still-page on the 404s; still-page on the embed detail) → overall capped at 6.0. No live-thing cap (the contact form counts). Fewer than four real pictures on the 404s (0) → design ≤ 6.5 on that page type.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. The PuroV cover is a blank white block on the 390 home sheet, EN and ES (en-home/mobile-page-01.jpg, tile 3; recheck-home-en-purov-390.png): the card's clip-path mask stays at inset(0 0 100%) when the card's top is already above the viewport on an instant jump. Fix: open the mask on any intersection, not only when the top enters (A11Y-01, fix plan if confirmed).
2. The 404 is a centred text stack with no picture and no motion (en-404-unknown/desktop-page-01.jpg, es-404/mobile-page-01.jpg). It reads as a utility page, not part of the portfolio. Fix: one of her covers or the portrait plus a left-aligned layout (T-04; taste, deferred).
3. The footer's full-width name stops 66px short of the right margin that the email link above aligns to (footer-en-1440.png), so the close looks almost-but-not-quite edge to edge. Fix: size the name to the container (fit-text or a slightly larger vw) (T-01; taste, deferred).
```

## 5. Findings

### Accessibility defects (fix plan needed)

| ID | URL | Width | Locale | Screenshot | Finding |
| --- | --- | --- | --- | --- | --- |
| A11Y-01 (candidate, low severity; user to confirm or reject) | `/` and `/es/` (Latest work cards). The same card component is on `/projects/` | 390 and 1440 | EN and ES | `.taste-skill/08-07/en-home/mobile-page-01.jpg` (tile 3), `.taste-skill/08-07/es-home/mobile-page-01.jpg` (tile 3), `.taste-skill/08-07/footer/recheck-home-en-purov-390.png`, `.taste-skill/08-07/footer/purov-probe-390-no-preference.png` | A work card's cover mask (`div.overflow-clip`, `clip-path: inset(0 0 100%)`) stays closed, so the image is invisible while the card is on screen, whenever the card's top is already above the viewport at an instant scroll jump. |

How A11Y-01 was reproduced [Verified]:
- **Reproduces 3/3 runs** with `scrollIntoViewIfNeeded` (390: PuroV at y=-9; 1440: all three cards at y=-62) and in the inspect sheets.
- **Masks open** under wheel scrolling, reload with scroll restore, back navigation, the hero CTA click, the End key, and a centred jump.
- **Deep-link `/#contact` then wheel back up:** Cabrera's card stayed closed at y=-294 with 154 px of it visible.
- **Reduced motion:** unaffected (`clip-path: none`).

Classed as accessibility because visible content is not perceivable. [Inference] Real readers reach it rarely (deep links, then scrolling up). The user may reclassify it as a visual item.

### Performance defects (fix plan needed)

None found by this gate [Verified within its scope]:
- No broken images or console errors on any of the 24 runs.
- No horizontal overflow.
- No failed requests in the probes.

This gate does not measure bundle size, LCP or CLS. Those belong to the Phase 8 Lighthouse and bundle plans, and no claim is made here.

### Visual taste items (for the user, not fixed in Phase 8)

| ID | URL | Width | Locale | Screenshot | Finding |
| --- | --- | --- | --- | --- | --- |
| T-01 | every page (footer) | 1440 (and 390) | EN and ES | `.taste-skill/08-07/footer/footer-en-1440.png`, `footer-es-1440.png`, `footer-en-390.png`, `footer-es-390.png` | The decorative 10.4vw name ends at x=1310 against a 1376 right margin (66 px short; 20 px short at 390), so the "name returns at full width" close does not reach the edge that the email link above it aligns to. |
| T-02 | `/`, `/projects/` (cards) | 1440 and 390 | EN and ES | `.taste-skill/08-07/en-home/desktop-page-01.jpg` (tile 2), `footer/purov-probe-1440-no-preference.png` | Card covers are upscaled about 1.75x vertically: the 4/5 portrait crop draws a landscape source (natural 440x344 at 1440, 389x305 at 390) into a 449x607 / 387x522 image box (parallax overscan), so covers look soft. [Inference] The `sizes` value assumes a width match, not the portrait crop. |
| T-03 | `/`, `/es/` | 1440 | EN and ES | `.taste-skill/08-07/en-home/desktop-page-01.jpg` | 11 font sizes are in use (14 to 168 px), against the skill's ceiling of about five (`size-count` WARN, new since the redesign). |
| T-04 | `/does-not-exist`, `/es/does-not-exist`, `/404/`, `/es/404/` | 1440 and 390 | EN and ES | `.taste-skill/08-07/en-404-unknown/desktop-page-01.jpg`, `.taste-skill/08-07/es-404/mobile-page-01.jpg` | The 404 page is a fully centred text stack ("404", heading, sentence, pill, language link) with no picture and nothing moving (`few-pictures` and `still-page` FAILs). It breaks "centre at most one moment" and reads as a utility page. |
| T-05 | `/`, `/es/` | 1440 | EN and ES | `.taste-skill/08-07/en-home/desktop-fold.jpg`, `footer/services-en-1440.png` | The home has large rests: a white band under the roles marquee on the fold, and an empty left column beside the services list once its heading scrolls away. ES screen 3 fill is 0.19 (FAIL threshold 0.20), EN is 0.20. Covered by the accepted `empty-screens` (section 6), but listed because the redesign tipped ES over the line. |
| T-06 | all pages | 1440 and 390 | EN and ES | `.taste-skill/08-07/en-projects/desktop-fold.jpg`, `en-detail-embed/desktop-fold.jpg` | `first-action` WARN: /projects/ and the detail first screens have no button. On home and 404 the pill exists but the inspector does not count it (section 2). Baseline WARN since Phase 3. |
| T-07 | all pages | 1440 | EN and ES | — | `no-footage` WARN: no video anywhere. Baseline WARN since Phase 3, and her Behance content has no clips. |

Not findings (test artefacts) [Verified]:
- The red "For testing only" Turnstile banner (`en-home/desktop-page-02.jpg`, `mobile-page-01.jpg`) comes from the preview's dummy key, as in 07-21.
- The blue dot in `services-en-1440.png` is the custom cursor at the parked probe position.
- The `/projects/` 390 Visual system cover that was blank in `en-projects/mobile-page-01.jpg` (tile 4) rendered on re-check (`recheck-projects-en-sistema-390.png`) and in the ES sheet. It was capture timing in the inspector.

### Accepted (not reopened)

| Code / item | Where | Status in this run |
| --- | --- | --- |
| `icon-cards` (Phase 2/3 services cards) | `/`, `/es/` | **No longer reported**: the redesign's services index cleared it |
| `focal-point` (Phase 3) | `/projects/`, `/es/projects/` | **No longer reported**: the 168 px h1 cleared it |
| `empty-screens` (Phase 3, Home and /projects/) | `/projects/`, `/es/projects/` (4 of 5), `/es/` (2 of 6) | Still FAIL. Accepted, not reopened (see T-05 for the taste note) |
| PuroV 7/8 crop | PuroV cover on `/`, `/projects/` and the detail "next" card (`en-home/desktop-page-01.jpg` tile 2, `en-detail-noembed/desktop-page-03.jpg`) | Still visible (the "PuroV" logotype is cut at the card edge). Accepted, not reopened |
| Pre-Phase-3 FAILs (`still-page` on long detail pages: 06-04 InstaBlogs/PuroV precedent, inspector walks 11 screens; `few-pictures` on sistema-visual) | `/projects/portfolio-web/` and `/es/` (still-page FAIL, 6 moved, 17.3 screens) | Accepted precedent, not reopened |
| Lint `hairline` (SiteHeader) / `outlined-box` (ToolsRow) | — | **Cleared**: lint is 0/0 |

## 6. Process

- Build/e2e lock `tmp/build-e2e.lock` was held from `pnpm build` until the last probe and the preview stopped, then released.
- The preview processes from this worktree (astro preview and workerd) were killed afterwards. Port 4483 returns 000.
- Probe scripts are scratch files in `tmp/` (gitignored, not committed).

## 7. User decision (2026-11-06, checkpoint Task 2)

| Item | Decision | Follow-up |
| --- | --- | --- |
| A11Y-01: work-card cover mask stays closed after an instant jump | **Confirmed accessibility defect: "Confirm, fix later"** | Gap item for a later `/gsd:plan-phase 8 --gaps` plan. Not fixed in 08-07 |
| T-01: footer name ends 66 px short of the right margin | **Deferred, logged** | Taste follow-up after Phase 8 |
| T-02: soft, upscaled card covers (portrait crop of a landscape source) | **Deferred, logged** | Taste follow-up after Phase 8 |
| T-04: bare, centred 404 (no picture, no motion) | **Deferred, logged** | Taste follow-up after Phase 8 |
| T-03, T-05, T-06, T-07 | Seen, **not logged** | None |
| Performance defects | None reported | None |
