---
phase: 04-project-detail-discovery
plan: 10
subsystem: project-detail
tags: [embed, facade, privacy, security, a11y, e2e, figma]
requires: [04-09 module stack and ProjectModule dispatcher, 04-03 embed allowlist (providerForUrl)]
provides:
  - initEmbedFacades(doc) client module (src/lib/ui/embed-facade.ts)
  - EmbedFacade.astro (click-to-load facade, lifecycle-registered script)
  - embed branch of ProjectModule.astro routed to EmbedFacade
affects: [04-11 phase sign-off (manual Figma load check, phase-wide taste gate)]
tech-stack:
  added: []
  patterns:
    - click-to-load third-party iframe built with createElement and setters, allowlist re-checked on the client
    - Playwright page.route stub for third-party embed origins; request-host log for privacy
key-files:
  created:
    - src/lib/ui/embed-facade.ts
    - src/components/project/EmbedFacade.astro
    - tests/unit/embed-facade.test.ts
  modified:
    - src/components/project/ProjectModule.astro
    - tests/unit/project-modules.test.ts
    - tests/e2e/project-detail.spec.ts
    - tests/e2e/a11y.spec.ts
decisions:
  - allowfullscreen is set both as the property and as an empty attribute, so the markup is explicit whatever the engine reflects
  - referrerpolicy and sandbox go through setAttribute (happy-dom does not reflect referrerPolicy)
  - Keyboard-order module steps are derived from the snapshot's content order (prose links parsed from text HTML, facade button + fallback link for embeds), not hard-coded
metrics:
  duration: ~25min
  completed: 2026-10-17
---

# Phase 4 Plan 10: Embed Facade Summary

The portfolio-web page now shows a flat "Interactive prototype" field that makes no request to Figma until the visitor clicks "Load interactive prototype". The click swaps in a sandboxed iframe, re-checked against the embed allowlist, and moves focus into it. Without JS, the label, the note and the "View the prototype on Behance" link remain.

## What was built

**Task 1: `initEmbedFacades(doc)`** (`src/lib/ui/embed-facade.ts`). It follows the marquee pattern:
- It returns `undefined` when there is no facade, and uses one AbortController for cleanup.
- Init removes `hidden` from each `[data-embed-load]`.
- On click it re-checks `data-src` with `providerForUrl`. A non-allowlisted src is ignored and the button stays.
- If the src passes, it builds the iframe with `createElement` and setters:
  - `src` and `title`
  - `sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"`
  - `allow="fullscreen"` and `allowfullscreen`
  - `referrerpolicy="strict-origin-when-cross-origin"`
  - classes `block size-full focus-visible:outline-2 focus-visible:outline-accent`
- The facade drops `min-h-64 p-6 sm:p-8 sm:aspect-video sm:min-h-0` and gains `aspect-video`. Then it runs `replaceChildren(iframe)` and `iframe.focus()`.
- There is no `innerHTML` anywhere in the module (grep count 0).

The 12 unit tests cover:
- no facade
- reveal on init
- the full iframe contract and focus
- six rejected sources: another host, a lookalike host, `http:`, `javascript:`, URLs with credentials, and an empty src
- cleanup
- 10 lifecycle remount cycles
- a source-text check for `innerHTML`

**Task 2: `EmbedFacade.astro`** uses the UI-SPEC markup verbatim:
- an 800px wrapper and a flat `bg-surface-alt` field
- a label, and a note interpolated with the provider name
- a hidden ink pill button with the `player-play` Tabler icon (explicit import)
- an `ExternalTextLink` fallback
- no iframe, no preconnect and no thumbnail
- `<script>` runs `lifecycle.register(initEmbedFacades)`

`ProjectModule.astro` routes `embed` to it. `project-modules.test.ts` replaces the 04-09 "unknown note for embeds" test with three tests:
- the facade has a hidden `type="button"` with `bg-ink` and no `bg-accent`, no `<iframe`, no preconnect and no unknown note
- the Figma URL appears exactly once, inside `data-src`
- the localized ES fallback link has `target`/`rel`

**Task 3: e2e**
- **04-09 embed-fallback assertion replaced.** "shows the Behance note in place of an embed until the facade (D-08)" is now "shows the click-to-load facade for an embed, never the unknown note (D-07)":
  - When `hasEmbed` is true, exactly one `[data-embed-facade]` is in the stack, the `detail.unknown.body` note is absent, the button is visible and the fallback link is correct.
  - When `hasEmbed` is false, there is no facade.
  - `hasEmbed` in the helper is unchanged.
- New per-page test on all 14 detail pages: every `a[target=_blank]` has `noopener` and `noreferrer`, and its accessible name ends with the new-tab hint.
- New `embed facade (en|es)` block, for each `hasEmbed` page:
  - **Privacy:** the page is loaded and scrolled to the bottom, then networkidle. The request host set equals exactly the preview origin, and the Figma route sees no hit.
  - **Activation:** `embed.figma.com/**` is routed to a stub. The test checks that there is exactly one child iframe with the src, a non-empty title, the sandbox, allow, allowfullscreen and referrerpolicy. It checks the `aspect-video` swap, that `document.activeElement` is the IFRAME, and that the fallback link stays visible.
  - **No-JS** (`javaScriptEnabled: false`): the button is hidden, and the label and Behance link are visible with no iframe.
- `a11y.spec.ts`:
  - Detail-page Tab-order tests on portfolio-web and website-instablogs, EN and ES, with steps built from the dictionaries and helper/snapshot data. The order is: skip, wordmark, Projects, Contact, EN, ES, View on Behance, then the module steps, then Let's work together, Previous, Next tile (`::after` ring), footer email, footer Behance.
  - axe after activation on portfolio-web EN/ES, with motion on and under `reducedMotion: 'reduce'`, with Figma stubbed. The axe runs before activation were already in place (`detailPages`).

## Verification

- `pnpm lint`: astro check 0/0/0, eslint clean, Prettier clean.
- `pnpm test`: 42 files, 648 tests passed.
- `pnpm build`: 20 pages.
- `pnpm exec playwright test tests/e2e/project-detail.spec.ts tests/e2e/a11y.spec.ts`: 263 passed.
- Acceptance greps:
  - `innerHTML` in embed-facade.ts: 0. `providerForUrl`: 2.
  - `lifecycle.register(initEmbedFacades)`: 1. `bg-accent` in EmbedFacade.astro: 0. `<iframe` in EmbedFacade.astro: 0.
  - `embed.figma.com` and `data-embed-facade` are both present in project-detail.spec.ts.
  - Every `hasEmbed` use in project-detail.spec.ts pairs with `data-embed-facade`.
- Built HTML of `dist/projects/portfolio-web/index.html`: the only `figma` occurrence is the `data-src` attribute.

## Taste gate (CLAUDE.md)

- `lint.mjs src/components/project`: 9 files, **0 FAIL, 0 WARN**.
- `inspect.mjs`, run against `astro preview` on port 4423:

| Page | FAIL | WARN |
|------|------|------|
| /projects/portfolio-web/ | still-page | hairline, palette-cream, first-action, no-footage |
| /es/projects/portfolio-web/ | still-page | hairline, palette-cream, first-action, no-footage |

- Accepted per the UI-SPEC Verification: `still-page` (D-04, no motion yet), and the pre-existing `hairline`, `palette-cream` and `no-footage`.
- `first-action` is the same WARN 04-09 recorded for the user's 04-11 sign-off. The contact button sits after the module stack in the locked UI-SPEC order. The facade does not change it.
- No new code was raised by the facade.

Screenshot critique. The facade blocks were captured at 1440/768/390 in EN and ES, at rest, with keyboard focus on the button, and after activation with a stubbed frame (`tmp/taste-04-10/`, gitignored):
- The field is flat `#efe9e0` (`bg-surface-alt`) with no border, shadow or rounding. It reads as a quiet tone step from the cream page.
- The load button is an ink pill (`#1a1714`) with cream text and the play icon. There is no accent, and the page keeps one accent action (the contact band). The focus ring is visible around the pill at 390.
- The label, note, button and Behance link are left-aligned and bottom-anchored in the field. At 390 the ES copy fits on one line per element with no overflow (`scrollWidth` equals the viewport at all widths).
- Box: 752×423 at 1440 and 720×405 at 768, both 16:9 from `sm`. At 390 it is 358×256, which is the `min-h-64` floor. After activation it is 358×201, 16:9 at all widths, as specified.

## Deviations from Plan

### Auto-fixed Issues

1. **[Rule 3 - Blocking] Source-text test path under happy-dom.** `new URL(..., import.meta.url)` is not a `file:` URL in the happy-dom environment. The `innerHTML` source check now reads from `process.cwd()`. Commit fcb97f8.
2. **[Rule 1 - Bug] `referrerPolicy` property not reflected in happy-dom.** It is now set with `setAttribute('referrerpolicy', …)`, which is equivalent in browsers and verified in Chromium by the e2e. Commit fcb97f8.

### Additions within plan scope

- The unit tests also reject a lookalike host (`embed.figma.com.evil.example`), URLs with credentials, and an empty src. The unit tests also check that the facade binds once across 10 lifecycle remounts.
- An `at least one embed page` guard is in both specs, so a snapshot without an embed fails loudly instead of skipping silently.

### TDD notes

- Task 1 followed RED (3ab4808) and then GREEN (fcb97f8).
- Task 3 is marked tdd, but its e2e tests target behaviour shipped in Tasks 1–2, so they passed on their first run. There is no separate failing commit for Task 3, as in 04-09.

## Known Stubs

None in this plan. The manual check that the real Figma prototype loads and responds inside the reduced sandbox (UI-SPEC [Assumption], T-04-22 / A6) belongs to 04-11. CI never loads Figma.

## Threat model coverage

- **T-04-02:** client `providerForUrl` re-check, `createElement` and setters, no `innerHTML`. Unit-tested with `javascript:`, `http:`, another host, a lookalike host and credentials.
- **T-04-06:** no iframe, preconnect or thumbnail in the markup. The e2e request-host log shows only the local origin before the click.
- **T-04-22:** sandbox limited to the four tokens, plus `referrerpolicy`. Asserted in the unit and e2e tests.
- **T-04-03:** rel and the new-tab name are asserted on every `target=_blank` link on all detail pages.

## Self-Check: PASSED

- The files exist: src/lib/ui/embed-facade.ts, src/components/project/EmbedFacade.astro and tests/unit/embed-facade.test.ts.
- Commits 3ab4808, fcb97f8, a47d983 and 02fc35e are in `git log`.
