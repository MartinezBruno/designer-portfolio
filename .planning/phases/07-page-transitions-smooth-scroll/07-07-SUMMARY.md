---
phase: 07-page-transitions-smooth-scroll
plan: 07
subsystem: motion
tags: [anchors, focus, skip-link, smooth-scroll, contact, accessibility, reduced-motion]
requires:
  - pickFocusTarget, bindNavFocus with waitForRelease (07-01, 07-04)
  - page-scoped Lenis with anchors false (07-05)
  - currentMotionState (Phase 6)
  - parseServiceParam allow-list (Phase 5)
provides:
  - "same-page anchor hook inside bindNavFocus (capture-phase click, scrollend focus)"
  - "applyServicePreselect(doc, search) in src/lib/ui/service-preselect.ts"
  - "a[data-skip-link] marker on the skip link"
  - "section#contact tabindex=-1 focus target"
  - "tests/e2e/anchors.spec.ts (SC2 anchors, skip link, cross-page hash, Ask about this)"
affects: [07-10]
tech-stack:
  added: []
  patterns:
    - One-navigation inline scroll-behavior on html, restored synchronously on landing or supersede
    - Bounded landing wait (scrollend or 1200 ms / two frames) behind an AbortController
key-files:
  created:
    - tests/e2e/anchors.spec.ts
  modified:
    - src/lib/motion/nav-focus.ts
    - src/lib/ui/service-preselect.ts
    - src/components/global/SkipLink.astro
    - src/components/contact/ContactSection.astro
    - tests/unit/nav-focus.test.ts
    - tests/unit/service-preselect.test.ts
    - tests/e2e/contact-preselect.spec.ts
decisions:
  - The fine-pointer glide is the browser's native smooth fragment scroll, not Lenis scrollTo. UI-SPEC says "Lenis's glide", but the plan's mechanism avoids router/Lenis double handling (Research Pitfall 4). The e2e showed no conflict with Lenis active, so no fallback to Lenis scrollTo was needed.
  - applyServicePreselect keeps the Phase 5 fallback. An unknown or injected ?service= checks "other", the same as a full load. The plan's "changes nothing" wording conflicted with the existing unit and e2e contract.
  - Only same-pathname links that carry ?service= are taken over locally. Any other search change stays with the router.
metrics:
  duration: ~35 min
  completed: 2026-11-02
  tasks: 2
  files: 8
---

# Phase 7 Plan 07: Anchors, skip link and Ask about this Summary

Same-page content anchors (header Contact and the hero CTA on Home) now glide under `on` and jump under `reduced`/`off`. Focus lands on the target when the scroll ends. The skip link is always instant and focuses `#main`. A cross-page hash link (for example /projects/ to /#contact) focuses `#contact` instead of the h1. Home's "Ask about this" links no longer swap Home onto itself: there is no wipe and no hero replay, a typed message survives, the chip is checked, the URL reads `?service=<id>#contact`, and `#contact` takes focus.

## Tasks

| # | Task | Commit |
|---|------|--------|
| 1 | Failing e2e for anchors, skip link, cross-page hash and Ask about this (RED) | `8f4661f` |
| 2 | Anchor hook, `data-skip-link`, `#contact` tabindex, `applyServicePreselect`; unit RED then GREEN | `672ac99` |

## How it works

- `bindNavFocus` now also installs `bindAnchorFocus` on its own AbortController, so `index.ts` is unchanged. It is a capture-phase `click` listener on `document`, so it runs before the ClientRouter's bubble-phase handler.
- It filters out: prevented clicks, non-primary buttons, modifier keys, `target` other than `_self`, `download`, links inside a `form` (the contact error summary), hashes whose target is `input, select, textarea, button, a[href]`, other origins, other pathnames, and hashes that do not resolve. The hash is resolved with the existing decode-in-try plus `getElementById` lookup, never `querySelector` (T-07-17).
- **Same pathname and search:** the router keeps its native fragment navigation, so the URL and history stay router-owned. Under `on` (except for `data-skip-link`) the hook sets `html.style.scrollBehavior = 'smooth'` for that one navigation. The previous inline value is restored on landing, or synchronously if a later click supersedes it. No CSS `scroll-behavior` rule exists.
- **Same pathname, different `?service=`:** `preventDefault()`, `applyServicePreselect(doc, url.search)`, `history.replaceState(history.state, '', url.href)` with the router's own state object (no `pushState`), then `scrollIntoView({ behavior: 'smooth' | 'instant', block: 'start' })`.
- **Landing:** `scrollend` on window, or 1200 ms when smooth, or two frames when instant, whichever comes first. Then `focus({ preventScroll: true })`. Every listener and timer is removed through an AbortController (T-07-20).
- Same-page anchor targets in `src/components` (grep for `href="#` and `}#`): only `#main` (skip link) and `#contact` (Hero, SiteHeader, ProjectContactBand, ProjectsView, FeaturedServices). The `#contact-<field>` error-summary links point at form controls and are excluded.

## Verification

- Unit: `nav-focus` and `service-preselect` went from 10 failing to 45/45 green. The new cases cover smooth set and restore, the 1200 ms fallback, reduced/off two-frame focus, the skip link, supersede, 12 ignore cases (form, control target, link target, cross-page, external, `_blank`, missing id, selector-like hash `#a,body`, meta, ctrl, shift, middle), the Ask path (replaceState with the router's state, no pushState, smooth vs instant `scrollIntoView`, focus at `scrollend`), the injection payload, and unbind. [Verified]
- `pnpm test`: 70 files, 1193 tests pass. [Verified]
- `pnpm lint` (astro check, eslint, prettier): 0 errors, clean. [Verified]
- `pnpm build`: ok. [Verified]
- E2E, scratch config outside the repo, port 4452, this worktree's build:
  - RED before Task 2: 7 of 8 anchors cases failed (no glide: `mid 1789 = end 1789`; no focus on `#contact`; no `data-skip-link`; a view transition counted for Ask about this). [Verified]
  - `anchors.spec.ts` with `--repeat-each=3`: 24/24 passed, with Lenis active under `on` (Desktop Chrome fine pointer). [Verified]
  - `contact-preselect`, `contact-states`, `i18n`, `smooth-scroll`, `navigation-leaks`, `contact`, `a11y`: 123/123 passed after the one test-timing fix below. [Verified]
  - Full hermetic suite (`E2E_OFFLINE=1`): 678 passed, 77 skipped, 0 failed. This includes `transitions.spec` at this worktree's base, without 07-06's parallel edits. [Verified]
- Acceptance greps: `data-skip-link` = 1 in SkipLink.astro. `tabindex="-1"` = 1 in ContactSection.astro. `pushState` = 0 in nav-focus.ts. `replaceState(view.history.state` = 1. `export function applyServicePreselect` = 1. `scrollend` is in nav-focus.ts. `grep -rn "scroll-behavior" src/styles` prints only the 07-05 comment in smooth-scroll.css ("No scroll-behavior rule here, ever") and `overscroll-behavior: contain`. Neither is a `scroll-behavior` rule. [Verified]

## Taste skill (CLAUDE.md design gate)

There is no Skill tool, so I read SKILL.md (§7 Gate, §8 Look, special case "A component or a single section") directly. The plan changes behaviour, not visuals: no draw, the existing design is matched.

- `lint.mjs src/lib/motion/nav-focus.ts src/lib/ui/service-preselect.ts src/components/global/SkipLink.astro src/components/contact/ContactSection.astro`: **0 FAIL, 0 WARN**. [Verified]
- `inspect.mjs http://localhost:4452/` (run from the scratchpad, so no `.taste-skill/` in the repo): FAIL `icon-cards` (Phase 2, accepted). WARN `hairline`, `palette-cream`, `first-action`, `no-footage`. These are identical to the 07-02/07-04/07-05 baseline, so nothing is new. The desktop fold render is unchanged. [Verified]
- **Landing check:** I captured the header Contact glide at 1440 and 390 (scratchpad `landing-1440.png`, `landing-390.png`) and looked at both. `document.activeElement` is `#contact` with computed `outline-style: none` (the 07-01 `section[tabindex='-1']` rule), so there is no ring. The section heading sits clear below the sticky header: its top is 176 px at 1440, which is html `scroll-padding-top` 80 plus the section's `scroll-mt-24` 96, the same stop the native jump used before this plan. The "spam check couldn't load" line in the capture comes from the script aborting Turnstile. [Verified]
- Glide duration: native Chromium smooth scroll. The UI-SPEC's "about 0.9 to 1.2 s" for the fine pointer was not measured. The e2e proves it moves progressively (120 ms sample between start and end). Feel review stays with 07-10 and manual UAT. [Unverified duration]

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug, test] Existing "next Tab enters the section" assumed focus moved at once**
- **Found during:** Task 2 e2e
- **Issue:** `contact-preselect.spec` clicked an Ask link and pressed Tab immediately. Before this plan the router swapped Home and moved focus. Now the link stays on the page and focus lands on `#contact` when the glide ends, as the UI-SPEC requires, so an immediate Tab still left from the clicked card.
- **Fix:** the test now waits for `section#contact` to be focused before pressing Tab. The full-load (cold) `?service=` cases are unchanged and pass.
- **Files modified:** tests/e2e/contact-preselect.spec.ts
- **Commit:** 672ac99

**2. [Plan conflict] `applyServicePreselect` with an unknown or injected id falls back to "other"**
- The plan's behaviour block says the call "changes nothing". The existing Phase 5 unit and e2e cases (`falls back to other`, `?service=unknown … falls back to Not sure yet`) require the fallback. I kept the established contract. The function never throws and only checks allow-listed radios (T-07-18), and a unit case covers `?service=x"],body`.

**3. [Plan wording] Cross-page case uses the header Contact link from /projects/**
- The `ProjectsView` contact link only renders when the project list is empty, which it isn't in the built site. The header "Contact" link from /projects/ is the same `/#contact` href, so the test uses it.

**4. [Setup] Worktree base reset**
- The worktree started at `234dcb2`. Following the setup check, it was reset to the expected base `6327cfb` before any work.

**5. [Process] Verification ran in the worktree**
- The plan's `<verify>` blocks `cd` into the main checkout. All runs used this worktree, and Playwright used a scratch config on port 4452 outside the repo, which was not committed.

## Known limitations

- After an Ask-about-this replace, the router's internal `originalLocation` still holds `/` until its next navigation. A header "Contact" click right after that (different search) is left to the router, which does a native fragment jump without the hook's glide or focus. Back/forward still behave because the router's state object is kept. [Inference from router.js `samePage`/`moveToLocation`. Not covered by an e2e.]
- If the page is already exactly at the target under `on`, no `scrollend` fires, so focus arrives at the 1200 ms fallback.

## Known Stubs

None.

## Threat Flags

None. No new network, auth, file or schema surface. T-07-17 (getElementById only, selector-like hash unit case), T-07-18 (allow-list via applyServicePreselect, injection unit case), T-07-19 (same origin and pathname only, replaceState with the router's state, pushState grep = 0) and T-07-20 (bounded wait, AbortController cleanup, unbind unit case) are mitigated.

## TDD Gate Compliance

`test(07-07)` commit `8f4661f` (e2e RED) is followed by `feat(07-07)` commit `672ac99` (GREEN). The Task 2 unit RED (10 failing) was confirmed locally and committed together with GREEN, per the plan's two-commit structure.

## Self-Check: PASSED

- FOUND: src/lib/motion/nav-focus.ts, src/lib/ui/service-preselect.ts, src/components/global/SkipLink.astro, src/components/contact/ContactSection.astro
- FOUND: tests/unit/nav-focus.test.ts, tests/unit/service-preselect.test.ts, tests/e2e/anchors.spec.ts, tests/e2e/contact-preselect.spec.ts
- FOUND commits: 8f4661f, 672ac99
- STATE.md and ROADMAP.md untouched
