---
phase: 07-page-transitions-smooth-scroll
plan: 02
subsystem: motion
tags: [view-transitions, ink-wipe, reduced-motion, client-router, taste-skill]
requires:
  - bindNavigation (07-01)
  - softNavigate, waitForNavigationIdle (07-01)
provides:
  - CSS tokens --t-wipe (560ms), --wipe-release (0.7), --t-nav-fade (320ms)
  - durations.wipe = 0.56 and wipeRelease = 0.7 (src/lib/motion/tokens.ts)
  - "[data-wipe-panel] element (BaseLayout) named `wipe` under 'on'"
  - "[data-site-header] hook named `site-header` under 'on' and 'reduced'"
  - "html[data-wipe='out'] on the arriving document during a transition"
  - All ::view-transition-* CSS, including the z-order for project-title (07-06) and cursor (07-03)
affects: [07-03, 07-04, 07-06, 07-10]
tech-stack:
  added: []
  patterns:
    - Native same-document View Transition CSS keyed off html[data-motion], no transition:* directives
    - Arriving-state attribute set in astro:before-swap, cleared on viewTransition.finished (owner-guarded) and at the next before-preparation
    - Opt-in paused-frame capture spec (startViewTransition wrapper, pause plus currentTime)
key-files:
  created:
    - tests/e2e/transitions-capture.spec.ts
  modified:
    - src/styles/global.css
    - src/lib/motion/tokens.ts
    - src/lib/motion/navigation.ts
    - src/layouts/BaseLayout.astro
    - src/components/global/SiteHeader.astro
    - tests/unit/motion-tokens.test.ts
    - tests/unit/motion-navigation.test.ts
    - tests/e2e/transitions.spec.ts
    - tests/e2e/transitions-reduced.spec.ts
decisions:
  - The roots switch with per-keyframe steps(1, jump-start) at 50% (compiled to step-start), not the UA crossfade
  - The wipe's old and new images have animation none, because both are the same solid sheet and only the group travels
  - Only the transition that set data-wipe may clear it (wipeOwner guard), so an aborted transition cannot clear its successor's marker
  - The still header is proven through computed view-transition-name plus zero header animations, because animation none leaves no entry in getAnimations()
metrics:
  duration: ~45 min
  completed: 2026-11-02
  tasks: 3
  files: 10
---

# Phase 7 Plan 02: Ink wipe and reduced crossfade Summary

Under `on`, every soft navigation now shows one flat ink panel pass. It enters from the top and exits at the bottom, and a back traverse reverses it. The pages switch in one step while the panel covers them, and the header stays still. Under `reduced` the pages crossfade over 320ms with no panel. All of it is plain View Transition CSS on top of the 07-01 router.

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Failing e2e for the wipe, the still header and the reduced crossfade (RED) | e3f0e8e |
| 2 | Tokens, panel, header name, VT CSS, data-wipe handling (unit RED then GREEN, one commit) | 1d323e1 |
| 3 | Opt-in paused-frame capture spec plus taste review | 6ecfef9 |

## Verification

- RED: before Task 2, the three wipe cases (Home -> Projects, EN/ES, back) and the reduced 320ms case failed. The four 07-01 cases still passed.
- Unit RED: before the implementation, 4 new unit cases failed (tokens, data-wipe set, cleared on finish, cleared on the next preparation).
- `pnpm lint`: 0 errors and 0 warnings (astro check, eslint, prettier).
- `pnpm test`: 68 files, 1121 tests passed. The previous count was 1115; this plan adds 6.
- `transitions.spec.ts` + `transitions-reduced.spec.ts`: 8/8 passed, including the `@network` Turnstile case.
- Full e2e (`E2E_OFFLINE=1`, against the Task 2 build): 653 passed, 33 skipped, 0 failed.
- Acceptance greps: `--t-wipe: 560ms`, `--wipe-release: 0.7` and `--t-nav-fade: 320ms` each appear once. `data-wipe-panel` appears once in BaseLayout, with `aria-hidden="true"`. `data-site-header` appears once in SiteHeader. `grep -nE "ease-in|transition-all|display:\s*none|visibility:\s*hidden" src/styles/global.css` finds nothing.
- Built CSS checked in `dist/client/_astro/*.css`: the `html[data-motion=on]::view-transition-*` rules and `@keyframes vt-root-out` come through intact. Lightning CSS writes the step as `step-start`.
- `data-astro-transition` survives `swapRootAttributes`: it is in `NON_OVERRIDABLE_ASTRO_ATTRS` and is set before `startViewTransition`. Both snapshots therefore see the direction, so it did not need copying in before-swap.

## Taste skill (CLAUDE.md design gate)

I read SKILL.md, `references/motion.md` and `references/critique.md` directly, because there is no Skill tool. This is the skill's "single section, not a page" case: no draw, existing design matched.

**lint.mjs** (`src/styles src/layouts src/components/global src/lib/motion`, 25 files): 1 FAIL, 0 WARN. The FAIL is `[hairline]` at `SiteHeader.astro:34 border-b`. It existed before this plan: linting the base-commit copy of SiteHeader.astro gives the same FAIL. UI-SPEC accepts it ("The header's existing bottom border stays as is"), so it was not removed and no `taste-skill-ignore` was added. The line was touched only to add `data-site-header`. There are no `ease-in`, `transition-all` or other WARNs in the changed files.

**inspect.mjs** (own preview on port 4417, built from this plan's code): every code it reported was already known and accepted before this phase.
- `/` and `/es/`: FAIL `icon-cards` (Phase 2, accepted). WARN `hairline`, `palette-cream`, `first-action`, `no-footage`.
- `/projects/`: FAIL `focal-point` (Phase 3 composition) and FAIL `empty-screens` (Phase 6 card-overlay artefact, accepted at 06-10). Same 4 WARNs.
- `/projects/website-instablogs/`: FAIL `still-page`, 5 elements. That is the same number as Phase 6 (accepted artefact), so there is no regression. Same 4 WARNs.
- There is no `covered-text`, `overflow`, `clipped-text`, `gradient`, `shadow` or `glass`, so the parked panel is invisible to the inspector.

**Captures** (`CAPTURE_TRANSITIONS=1`, 40 PNGs in `.taste-skill/transitions/`, all reviewed):
- Item 1: `1-{forward,back}-{en,es}-{1440,390}-{25,50,70,100}.png` (32 files)
- Item 4: `4-{en,es}-{1440,390}-50.png` (EN->ES and ES->EN on InstaBlogs)
- Item 5: `5-{en,es}-{1440,390}-50.png`

### Critique, ROUND 1 (against the UI-SPEC wipe review bullets)

```
ROUND 1
Seen in one second: a single dark sheet dropping past the page below a still header.
Idea (one sentence): the ink of the site's type becomes a curtain that cuts between pages.
Live thing: n/a (transition review, not a page).
Layout words by frame: 25%=leading edge / 50%=full ink / 70%=reveal / 100%=arrived
Scores: not scored. The page-level score belongs to the 07-10 full inspect pass.
Caps applied: none new.
```

- **One flat pass, no frame where old and new overlap under the ink: PASS.** At 25% only the old page shows, with the ink edge about 95px down at 1440. At 50% the content area is solid ink at both widths. At 70% only the new page shows, with the ink leaving at the bottom. The back frames are the mirror image (ink enters at the bottom and leaves at the top). There is no translucent or blended frame anywhere. The panel has no border, radius, shadow or gradient.
- **The header never moves, fades or flickers, in either locale: PASS.** Its position and opacity are the same in all 40 frames. On the language switch (item 4) its labels and `aria-current` are already switched at 50%, as the spec says ("labels change instantly at the start"). At 25% of a link navigation the arriving `aria-current` (Projects underlined) already shows, for the same reason.
- **`reduced` shows only fades, no panel: PASS.** At 50% under `--ease-reveal`, items 5 show a root crossfade with the new page mostly in and no ink anywhere.
- **Note, accepted: at 390 the 25% frame shows no ink.** At 25% the leading edge sits at about 11% of the viewport (93px), which is still behind the 89px two-row mobile header. The ink appears between 25% and 50%. This matches the UI-SPEC timeline numbers, so nothing was changed.
- **Out of scope for this plan, owned by 07-04:** the arriving page's entrances play while the panel still covers part of the page. Examples are the hero mask mid-rise in `1-back-*-70` and the second Projects card mid-shutter in `1-forward-*-100`. The UI-SPEC bullet "nothing on the arriving page animates while still covered" is the 07-04 entrance hold (`--wipe-release`). This plan only provides the token.

No FAIL needed a fix in the owning files.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Header proof in the e2e**
- **Found during:** Task 1
- **Issue:** The plan asked that the recorded pseudos include `::view-transition-group(site-header)`. The required `animation: none` on that group means it never appears in `document.getAnimations()`, so that assertion could never pass alongside the "no header animation" rule.
- **Fix:** The recorder also collects every element's computed `view-transition-name` at `ready`. The test asserts `site-header` is named and that zero animations touch it.
- **Files modified:** tests/e2e/transitions.spec.ts, tests/e2e/transitions-reduced.spec.ts
- **Commit:** e3f0e8e

**2. [Rule 1 - Bug] Duplicate root animations in the reduced recorder**
- **Found during:** Task 1 (RED run)
- **Issue:** The UA pairs each root fade with a `plus-lighter` blend animation, so each root pseudo appears twice.
- **Fix:** The test compares the unique set of root pseudos and checks that every entry is 320ms.
- **Commit:** e3f0e8e

**3. [Rule 2 - Correctness] Owner guard on the data-wipe clear**
- **Found during:** Task 2
- **Issue:** If a superseded transition's `finished` promise settled after the next transition's swap, it would clear the successor's `data-wipe` mid-wipe.
- **Fix:** `wipeOwner` tracks the transition that set the marker. Only that transition clears it, and before-preparation resets it.
- **Commit:** 1d323e1

**4. [Rule 3 - Blocking] Worktree base**
- The worktree started at 234dcb2, which is behind the required base 4b0d66a. It was reset to 4b0d66a following the branch-check instructions before any work began.

### Notes

- The wipe's `::view-transition-old/new(wipe)` images have `animation: none`. Only the group travels. Both images are the same solid sheet, so dropping the UA crossfade rules out any translucent frame.
- `html[data-motion='on']::view-transition-group(root)` also runs over `--t-wipe`, and the reduced group runs over `--t-nav-fade`, so the whole transition ends together.
- The plan's verify commands `cd` into the main checkout. Every command here ran inside this worktree instead.
- The capture spec pauses each animation at a fraction of its own duration, so item 5 (reduced, 320ms) and items 1 and 4 (560ms) share one helper. The 100% frame is taken 1ms before the end so the frame still belongs to the transition.
- Not measured here: the UI-SPEC "click-to-wipe-start on throttled Fast 4G Pixel 7" figure. No task in this plan asks for it, so it is left for the phase-level pass.

## Threat Model Coverage

- T-07-05: the panel is `aria-hidden="true"`, `pointer-events: none` and named only under `on`. At rest it is parked at `translate: 0 -100%`, and it has `opacity: 0 !important` in print. `reduced` is opacity-only. The inspector reports no `covered-text`, and the axe e2e (part of the full suite) stays green.
- T-07-06 (accepted): `data-wipe` only ever holds the constant `'out'`.

## Known Stubs

None.

## Self-Check: PASSED

- The created file `tests/e2e/transitions-capture.spec.ts` and all 9 modified files exist.
- Commits e3f0e8e, 1d323e1 and 6ecfef9 are on branch `worktree-agent-ac56fd15c923e975c` (checked with `git log`).
