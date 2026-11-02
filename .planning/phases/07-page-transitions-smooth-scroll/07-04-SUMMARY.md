---
phase: 07-page-transitions-smooth-scroll
plan: 04
subsystem: motion
tags: [view-transitions, client-router, entrance-hold, back-forward, reduced-motion, vestibular, taste-skill]
requires:
  - bindNavigation, data-wipe (07-01, 07-02)
  - durations.wipe, wipeRelease (07-02)
  - bindNavFocus waitForRelease option (07-01)
  - persisted cursor host (07-03)
provides:
  - "bindNavigation(doc, deps?) -> { unbind, waitForRelease } (NavigationHandle)"
  - "html[data-vt] on the arriving document while a transition holds it"
  - "release at 70% of --t-wipe after ready, or finished, capped at 1200 ms (RELEASE_CAP_MS)"
  - "bindToAstro(lifecycle, doc, { waitForRelease }) with a navigation-token guard"
  - "wipe rate limit: WIPE_LIMIT 3 per WIPE_WINDOW_MS 1100"
  - "D-15 restored-position rules in reveal.ts and hero.ts"
  - "capture item 6 in transitions-capture.spec.ts"
affects: [07-05, 07-06, 07-10]
tech-stack:
  added: []
  patterns:
    - Release gate promise shared by the lifecycle mount and nav focus
    - Owner-guarded attribute (data-vt) so a superseded transition never clears its successor's
    - The running transition is tracked until finished, separately from the release
    - Layout reads for restored-position rules only when scrollY > 0
key-files:
  created: []
  modified:
    - src/lib/motion/navigation.ts
    - src/lib/motion/lifecycle.ts
    - src/lib/motion/index.ts
    - src/lib/motion/reveal.ts
    - src/lib/motion/hero.ts
    - src/styles/global.css
    - tests/unit/motion-navigation.test.ts
    - tests/unit/lifecycle.test.ts
    - tests/unit/motion-reveal.test.ts
    - tests/unit/motion-hero.test.ts
    - tests/e2e/transitions.spec.ts
    - tests/e2e/transitions-capture.spec.ts
decisions:
  - A fourth wipe inside 1.1 s is skipped in before-swap (instant cut, no panel), because router aborts alone measured five passes in 0.9 s
  - D-18 skips the running transition until it finishes, not only during the hold
  - The restored-position rules (D-15) run only when scrollY > 0, so a fresh load reads no layout and behaves exactly as before
  - The budget e2e gates the text entrances the UI-SPEC table models; image shutters and Detail are logged with a regression guard, not resolved (user decision)
metrics:
  duration: ~20 min
  completed: 2026-11-02
  tasks: 3
  files: 12
---

# Phase 7 Plan 04: Arrival after the wipe Summary

The arriving page now holds still under the ink. While a soft navigation's view transition runs, `html[data-vt]` keeps the hero keyframes paused, and the page lifecycle (reveals, GSAP, toggles) has not mounted. At release, 392 ms after `ready` under `on` (or when the transition finishes, capped at 1200 ms after the swap), the hold is removed, the lifecycle mounts and focus moves to the h1.

Back/forward lands on the stored scroll position. Entrances above that position never replay, and a hero that is scrolled past counts as played.

Rapid clicking is capped at three wipe passes in any second. Switching to `reduced` during a transition finishes it at once.

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Release gate, delayed mount, live-toggle skip, hero hold CSS (unit RED then GREEN) | 80c55ea |
| 2 | Restored-position reveals and hero (unit RED then GREEN) | ba9d9e8 |
| 3a | Fixes found by the Task 3 e2e: wipe rate limit, skip until finished (unit RED then GREEN) | b3b7b56 |
| 3b | E2E for hold, budget, back, flash limit and D-18; capture item 6 | e0db3cd |

## Verification

- Unit RED: Task 1 had 28 failing cases before the implementation. Task 2 had 2. The Task 3 fixes had 1 and then 1.
- `pnpm lint`: astro check reports 0 errors and 0 warnings, and eslint and prettier are clean.
- `pnpm test`: 68 files, 1151 tests pass. Before this plan there were 1121.
- E2E against this plan's build, on its own port 4441 through a scratch config outside the repo: `transitions`, `transitions-reduced`, `motion-hero`, `motion-reveal` and `navigation-leaks` gave **71/71 passed**, including the `@network` Turnstile case. The leak test from 07-03 is still green. The seven 07-04 cases passed 18/18 with `--repeat-each=3`.
- Capture: `CAPTURE_TRANSITIONS=1` passed 44/44, including 8 new item-6 PNGs (`6-{release,settle}-{en,es}-{1440,390}.png`).
- Acceptance greps: `skipTransition` and `1200` appear in navigation.ts. `waitForRelease` appears twice in index.ts. `html[data-vt]` appears in global.css. `D-15` appears in both reveal.ts and hero.ts. transitions.spec has titles starting "hold", "budget", "back…", "flash limit" and "toggle".

### Settled budget (click to settled, prefetched and cached, Desktop Chrome 1280x720)

"Text" means the elements the UI-SPEC table models. "All" means every above-the-fold entrance, including image shutters. Click to `ready` measured 37 to 42 ms in every case.

| Page | Text | All above-fold | UI-SPEC estimate | Gate |
|------|------|----------------|------------------|------|
| Home | 631 ms (the hero lines; the CSS hero has no data-reveal text) | **1415 ms** | ~1.35 s, accepted exception | logged only |
| Projects | **1182 ms** | 1382 ms | ~1.11 s, at most 1.2 s | text at most 1300, passes |
| Detail via card | **1380 ms** | 1380 ms | ~1.23 s, about 1.2 s or less | at most 1450 (regression guard) |
| Detail (EN/ES switch) | **1381 ms** | 1381 ms | ~1.23 s | at most 1450 (regression guard) |

The table's arithmetic misses two things. A per-element frame trace showed both:
1. On Projects, the last element at rest is the first card's picture scale (`scale` 700 ms after a 200 ms delay). It ends about 900 ms after release, later than the h1 and intro the table models.
2. On Detail, the Phase 6 metadata stagger (summary, category, tools, Behance link) ends about 950 ms after release, against the table's ~840 ms.

**Open item for the user:** Detail and all above-the-fold settles run about 150 to 200 ms over the UI-SPEC target. The UI-SPEC names a shorter `--t-wipe` (480 ms) as the lever. Shortening the Phase 6 card shutter or the metadata stagger would be the other option. Both are design-token decisions, so this plan did not make either. It records the numbers and guards against regression.

## Taste skill (CLAUDE.md design gate)

There is no Skill tool, so I read SKILL.md, `references/motion.md` and `references/critique.md` directly. This is the case "a component or a single section, not a page": no draw, the existing design is matched, and the house rules and motion laws apply. The plan changes motion timing only and adds no visual elements. The hold and release are timing, and the wipe cap only removes passes.

**lint.mjs** (`src/styles src/layouts src/components/global src/lib/motion`, 25 files): 1 FAIL, 0 WARN. The FAIL is `[hairline] SiteHeader.astro:34 border-b`, the same pre-existing one that 07-02 recorded and that UI-SPEC accepts. Nothing new was flagged.

**inspect.mjs** (own preview, port 4443, this plan's build): the results match the 07-02 baseline exactly, so nothing regressed.
- `/projects/website-instablogs/`: FAIL `still-page` with 5 elements, the same count as Phases 6 and 07-02 (accepted artefact). WARN `hairline`, `palette-cream`, `first-action`, `no-footage`.
- `/projects/`: FAIL `focal-point` and FAIL `empty-screens` (accepted Phase 3 and 06-10 items), plus the same 4 WARNs.
- `/`: FAIL `icon-cards` (Phase 2, accepted), plus the same 4 WARNs.

**Captures, item 6** (all 8 PNGs reviewed, in `.taste-skill/transitions/`, gitignored):

```
ROUND 1 (item 6, transition review, not a page)
Seen in one second: the InstaBlogs title over its yellow cover, ink leaving at the bottom.
Idea (one sentence): the page arrives only once the ink has uncovered it.
Live thing: n/a.
Layout words by frame: release = title + cover, metadata held / settle = full intro block
Scores: not scored. The page-level score belongs to the 07-10 full inspect pass.
Caps applied: none new.
```

- **Nothing on the arriving page animates while still covered: PASS.** At release the panel is frozen at 70% and covers the bottom of the viewport (about y 747 to 900 at 1440, and about 700 to 844 at 390). Every metadata element (summary, category, tools, View on Behance) sits in its armed start state. None is mid-rise or half-faded, and nothing under the ink is moving. The title and cover are already at rest because they are not entrance elements. The ES 390 and EN 1440 frames are the same in structure.
- **The entrances play after release, as on a fresh load: PASS.** The settle frames show the full intro block in place at both widths and in both locales. There is no clipping and no leftover offset.
- **Note:** the blue dot visible in the 1440 and 390 frames is the persisted custom cursor from 07-03 at the last pointer position. It is expected under Desktop Chrome's fine pointer and was not introduced by this plan.

No FAIL needed a fix in this plan's files.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Rapid clicking produced five wipe passes in 0.9 s**
- **Found during:** Task 3 (flash-limit e2e)
- **Issue:** the UI-SPEC `[Inference]` was that router aborts keep rapid clicking at three flashes per second or fewer. The e2e measured ready times of 0, 226, 444, 657 and 892 ms, which is five passes. That breaks the must-have and WCAG 2.3.1.
- **Fix:** `markWipe` counts wipe passes at the swap. A fourth inside `WIPE_WINDOW_MS` (1100 ms, which leaves 100 ms of margin because the count is taken at the swap, just before `ready`) is skipped with `skipTransition()` inside the update callback. No pseudo-elements are built, so the swap is an instant cut with no panel. `reduced` crossfades are never limited. After the fix the measured times were 0, 215 and 435 ms, and the final page settles with h1 focus and no `data-vt` or `data-wipe`.
- **Files modified:** src/lib/motion/navigation.ts, tests/unit/motion-navigation.test.ts
- **Commit:** b3b7b56

**2. [Rule 1 - Bug] A toggle press after release did not finish the running transition (D-18)**
- **Found during:** Task 3 (toggle e2e)
- **Issue:** the skip used the release-gate entry, which is cleared at release (ready + 392 ms). The wipe keeps running until about ready + 560 ms, so a press in that window found nothing to skip. The transition ran on and finished 338 ms after the press.
- **Fix:** a separate `running` reference holds the transition until `finished`. Changing away from `on` skips it. The unit test covers a press after release and no skip after finish.
- **Files modified:** src/lib/motion/navigation.ts, tests/unit/motion-navigation.test.ts
- **Commit:** b3b7b56

**3. [Rule 1 - Bug] The plan's "at ready click the motion toggle" cannot happen**
- **Found during:** Task 3
- **Issue:** the arriving header's toggle is page-scoped (`lifecycle.register(initMotionToggle)`), so it is not bound until release. A view transition also takes hit testing, so neither a pointer press nor a programmatic click can switch motion at `ready`.
- **Fix:** D-18 is now proven by two tests. In the first, the toggle is pressed at release (the first moment it can be pressed); the transition must finish within 250 ms of the press and before its natural end. In the second, the OS reduced-motion setting is switched during the hold through `emulateMedia` (the app-scoped gate path); `motion:change` must land mid-transition, `finished` must follow within 250 ms, and no `data-vt` or `data-wipe` may remain.
- **Files modified:** tests/e2e/transitions.spec.ts
- **Commit:** e0db3cd

**4. [Rule 1 - Bug] `getBoundingClientRect().bottom <= 0` alone would mark everything as above the viewport in happy-dom**
- **Found during:** Task 2
- **Issue:** happy-dom returns all-zero rects, so the plain rule would show every element instantly in the existing fixtures. In a real browser it would also read layout on every fresh load.
- **Fix:** the D-15 rules apply only when `scrollY > 0`. At scroll 0 nothing can be above the viewport, so first-load behaviour is unchanged by construction, and a unit case proves it.
- **Commit:** ba9d9e8

**5. [Scope] Budget gate split into text and full above-fold settles**
- See "Settled budget" above. Projects meets the plan's 1300 ms gate on the modeled text. Detail (1380 ms) cannot meet it without a design-token change, so it carries a 1450 ms regression guard and is recorded as an open item. The test logs both numbers on every run.
- **Commit:** e0db3cd

**6. [Process] Verification commands ran in the worktree, not the main checkout**
- The plan's `<verify>` blocks `cd` into the main repo path. All runs used this worktree, and Playwright used a scratch config on port 4441 so it did not collide with the parallel 07-05 executor. The scratch config was not committed.

## Known Stubs

None.

## Threat Flags

None. No new network, auth, file or schema surface. T-07-10 (1200 ms cap plus unit test for never-settling promises), T-07-11 (navigation-token guard plus unit test) and T-07-12 (wipe rate limit plus e2e) are mitigated.

## Self-Check: PASSED

- FOUND: src/lib/motion/navigation.ts, src/lib/motion/lifecycle.ts, src/lib/motion/index.ts, src/lib/motion/reveal.ts, src/lib/motion/hero.ts, src/styles/global.css
- FOUND: tests/unit/motion-navigation.test.ts, tests/unit/lifecycle.test.ts, tests/unit/motion-reveal.test.ts, tests/unit/motion-hero.test.ts, tests/e2e/transitions.spec.ts, tests/e2e/transitions-capture.spec.ts
- FOUND commits: 80c55ea, ba9d9e8, b3b7b56, e0db3cd
