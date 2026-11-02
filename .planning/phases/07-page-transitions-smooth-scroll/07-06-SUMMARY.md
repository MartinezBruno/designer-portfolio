---
phase: 07-page-transitions-smooth-scroll
plan: 06
subsystem: motion / navigation
tags: [view-transitions, morph, astro-client-router, a11y, taste-skill]
requires:
  - 07-04 (bindNavigation handle, release gate, data-wipe/data-vt lifecycle)
  - 07-02 (ink wipe, project-title stacking slot z-index 3)
provides:
  - card title -> detail h1 view-transition morph under 'on' (MOTN-05, D-02)
  - MORPH_NAME and wrapForMorph exports in src/lib/motion/navigation.ts
  - capture items 2 and 3 in tests/e2e/transitions-capture.spec.ts
affects:
  - src/lib/motion/navigation.ts
  - src/styles/global.css
tech-stack:
  added: []
  patterns:
    - click-time inline-block wrapper named in astro:before-preparation (no static markup change)
    - arriving h1 wrapped and marked data-revealed data-reveal-instant in astro:before-swap
    - names cleared on transition.finished (fulfilled or rejected) and at the next before-preparation
key-files:
  created:
    - .planning/phases/07-page-transitions-smooth-scroll/07-06-SUMMARY.md
  modified:
    - src/lib/motion/navigation.ts
    - src/styles/global.css
    - tests/unit/motion-navigation.test.ts
    - tests/e2e/transitions.spec.ts
    - tests/e2e/transitions-capture.spec.ts
decisions:
  - "Source wrapper is unwrapped on clear, so an aborted navigation gives the card its bare title back (hover underline intact). The h1 wrapper stays and only loses its name, so the landed title keeps the exact box of the new snapshot and nothing reflows at the end"
  - "A card title link qualifies only if it is inside [data-card] and inside a heading, so any future non-title link in a card never morphs"
  - "No view transition (fallback swap) or a motion change away from 'on' before the swap: the source name is cleared and the h1 is not marked instant"
  - "The difference-blend tint over cover images (the title crosses its own cover early in the flight) is recorded for the user and 07-10 UAT, not changed: the UI-SPEC fixes the blend and the --ease-travel path"
metrics:
  duration: ~16 min
  completed: 2026-11-02
  tasks: 3
  files: 5
requirements: [MOTN-05]
---

# Phase 7 Plan 06: Card Title Morph Summary

Under full motion, opening a project from a Home compact card, a Projects full card or the Next-project teaser now flies the clicked card's title into the detail h1 above the ink panel. It uses a `project-title` view-transition name that is assigned at click time to a fit-content inline-block wrapper, inverted and difference-blended, with a 30% to 70% crossfade. The receiving h1 lands already revealed with no line split, and no name is left behind afterwards.

## What was built

- **`navigation.ts`** (07 D-02, UI-SPEC "Title Morph", Research Pattern 4 and Pitfall 8):
  - `wrapForMorph(el, skip)` moves the qualifying child nodes into a `span[data-morph-title]`. The span has inline `display: inline-block`, `width: fit-content` and `view-transition-name: project-title`. It is created through `el.ownerDocument`, so it also works on the router's DOMParser document. Nodes are moved, never re-parsed (T-07-15).
  - `nameMorphSource` (before-preparation) runs `clearMorph()` first. Then, only under `on` and when not prevented, it wraps the title link from `event.sourceElement.closest('[data-card]')`. The link must sit in a heading. The teaser's `.sr-only` prefix and the whitespace next to it stay outside the wrapper.
  - `nameMorphTarget` (before-swap) wraps `newDocument.getElementById('project-title')`, adds `data-revealed` and `data-reveal-instant`, and clears both names on `transition.finished`, whether it fulfils or rejects.
- **`global.css`** (under `html[data-motion='on']`): the group gets `--t-wipe` with `--ease-travel` and `mix-blend-mode: difference`. Both images get `filter: invert(1)`. The `morph-out` and `morph-in` linear keyframes run 30% to 70%. The UA `block-size: auto` is kept. The existing `z-index: 3` stacking slot from 07-02 is unchanged.
- **Tests:**
  - 14 new unit cases (44 in the file in total).
  - A 6-case e2e `describe('morph')`:
    - Projects, Home and teaser morphs, each checking one name per state, the group pseudo, the instant h1, no `.split-line-mask` and 0 names at rest.
    - No morph for a nav link, EN/ES, back, or reduced motion.
    - The hovered card title still has its underline, with no atomic wrapper at rest.
  - Capture items 2 and 3.

## Verification

| Check | Result |
|---|---|
| `pnpm vitest run tests/unit/motion-navigation.test.ts` | 44/44 passed [Verified] |
| `pnpm test` (full) | 1179/1179 passed [Verified] |
| `pnpm lint` (astro check, eslint, prettier) | clean [Verified] |
| RED gate: `playwright -g morph` before Task 2 | 3 morph cases failed, 3 guard cases passed [Verified] |
| transitions, transitions-reduced, motion-reveal, navigation-leaks | 62/62 passed [Verified] |
| Full offline e2e (port 4451 scratch config, `@network` excluded) | 676 passed, 0 failed, 89 skipped [Verified] |
| Acceptance greps | `getElementById('project-title')` 1, `data-reveal-instant` 2, `mix-blend-mode: difference` 1, `data-morph-title` 0 in ProjectCard, NextProjectTeaser and ProjectIntro, no `ease-in` [Verified] |

**Timing** (budget test, 3 runs, click to settled text):

| Navigation | Run times | Notes |
|---|---|---|
| Detail via card | 1379 / 1381 / 1365 ms | 07-04 baseline about 1.38 s, guard 1450 ms: no regression |
| Detail via language switch | 1362 to 1382 ms | |
| Projects | 1165 to 1181 ms | |
| Home | text 627 to 646 ms, all 1411 ms | |

[Verified by: budget test annotations] The morph does not shorten Detail. The h1 lands instantly, but the settle time is still bounded by the Phase 6 metadata stagger, so the open budget item from 07-04 stands.

## Taste-skill review (design gate)

taste-skill SKILL.md, `references/motion.md` and `references/critique.md` were read directly (there is no Skill tool in this executor).

- **lint.mjs** `src/styles src/lib/motion` (20 files): 0 FAIL, 0 WARN [Verified].
- **inspect.mjs** (own preview on port 4451, this plan's build):
  - `/projects/website-instablogs/`: FAIL `still-page` (5 elements), WARN `hairline`, `palette-cream`, `first-action`, `no-footage`. This is identical to the 07-02, 07-04 and 07-05 records (accepted artefacts), so there is no regression [Verified].
  - `/projects/`: FAIL `focal-point`, `empty-screens`, plus the same 4 WARNs. Both FAILs are the pre-existing measurement artefact documented in 06-08-SUMMARY. This plan changes nothing at rest (CSS only targets VT pseudo-elements; JS only acts on navigation events) [Inference from the diff scope; I did not re-run inspect against the base build].
  - The inspector loads pages fresh, so it never sees the morph. The morph was reviewed through the captures.
- **Captures** (`CAPTURE_TRANSITIONS=1`, 56/56 passed). The PNGs are in `.taste-skill/transitions/`, which is gitignored:
  - Item 2: `2-{instablogs|longest-es}-{en|es}-{1440|390}-{0|30|50|70|100}.png` (40 files). The longest ES title is computed at capture time from the overrides and resolves to "Posts para Cabrera's Motos".
  - Item 3: `3-{en|es}-{1440|390}-50.png` (4 files).

Critique per UI-SPEC review bullet (judged on the screenshots):

| UI-SPEC bullet | Result |
|---|---|
| Readable over ink | Pass. At 50% the title is light grey on the ink at 1440 and 390, in both languages. |
| Readable over surface | Pass. At 0%, 70% and 100% the title is near-ink on the surface. |
| No underline or focus ring in the snapshot | Pass. The 0% frames show the bare title even though the pointer is over the link. |
| No stretch | Pass. The glyph proportions hold at 30%, 50% and 70%. |
| Lands exactly on the h1, no jump | Pass. The 100% frame puts the h1 at x=176 / y=147 (1440 EN), the same as the settled page `6-settle-en-1440`. |
| Line-count change covered by the crossfade | Pass, as specified. At 390 the one-line "Posts para Cabrera's Motos" becomes a two-line h1, and at 50% both images overlap. |
| Chromium blend result | Renders correctly. The fallback (no title name) was **not** needed. |

```
ROUND 1 (morph frames only)
Seen in one second: the project name sliding up into the dark sweep, then sitting as the page heading.
Idea (one sentence): the thing you clicked is the thing you arrive at (motion.md §2: "shows where something came from").
Live thing: n/a for a transition (page-level live thing unchanged).
Layout words: n/a (transition frames).
Scores (motion moment only): design 7.5 · usability 8 · creativity 7.5 · content n/a.
Caps applied: none from this moment (page caps from inspect are pre-existing).
Top three problems:
1. 2-longest-es-*-30.png, 2-instablogs-en-1440-30.png: early in the flight the title crosses its own
   card cover before the panel reaches it, and the difference blend tints it (cyan over the red
   Cabrera's cover, blue over the yellow InstaBlogs cover). It is legible at 1440 but weak at 390
   over red. It is transient (about 0.1 to 0.2 s). Fix options are user decisions because they change
   the UI-SPEC contract: (a) a `linear()` easing that holds the group until the panel covers the card,
   (b) start the crossfade earlier, (c) accept it.
2. 2-*-50.png, 3-*-50.png: mid-crossfade, the two text images overlap as a doubled or ghosted title.
   This is specified (30-70% crossfade, accepted by UI-SPEC "Line count") and reads as motion blur at
   speed. Not changed.
3. None further a stranger would notice. The cursor dot rides along unchanged (07-03).
```

Not fixed in this plan: problem 1 needs a contract change (path and timing, or colour) and goes to the user and 07-10 UAT. Problem 2 is the specified behaviour. **Safari 26 / Firefox 159 blend checks remain a 07-10 manual UAT step**, because only Chromium is installed for Playwright.

## Deviations from Plan

### Auto-fixed Issues

None. The plan was executed as written, with these refinements, which are within its "Claude's discretion" (D-02, how the name is assigned):

- **Restore on clear.** The source wrapper is unwrapped on clear rather than having its style property cleared, so an aborted navigation leaves the card markup exactly as it was (the hover underline stays intact). The h1 wrapper only loses its name, to avoid a reflow at landing. Unit tests cover both.
- **Heading guard.** The title link must sit inside a heading as well as inside `[data-card]`.
- **No-transition guard.** A fallback swap with no view transition clears the name and does not mark the h1 instant, because there is no morph to hide a line rise behind.

### Environment

- The worktree started at `234dcb2`, which is not a descendant of the expected base `6327cfb`. It was reset to `6327cfb` per the `worktree_branch_check` before any work.
- The commit attribution trailer from the session reminder was **not** added. The user's global CLAUDE.md ("NEVER add Claude as co-author") and the orchestrator instructions both forbid it.

## Known Stubs

None.

## TDD Gate Compliance

- RED: `802061f test(07-06): add failing title morph e2e`. 3 morph cases failed for the expected reason (no `::view-transition-group(project-title)`).
- GREEN: `bd0f762 feat(07-06): morph card title into detail h1`. The unit tests were written first in that task, then the implementation.

## Commits

| Task | Commit | Message |
|---|---|---|
| 1 | 802061f | test(07-06): add failing title morph e2e |
| 2 | bd0f762 | feat(07-06): morph card title into detail h1 |
| 3 | 1326d77 | test(07-06): capture title morph frames |

## Self-Check: PASSED

- FOUND: src/lib/motion/navigation.ts, src/styles/global.css, tests/unit/motion-navigation.test.ts, tests/e2e/transitions.spec.ts, tests/e2e/transitions-capture.spec.ts
- FOUND commits: 802061f, bd0f762, 1326d77
