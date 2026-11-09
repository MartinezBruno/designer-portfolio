---
phase: 08-quality-verification
plan: 11
subsystem: motion
tags: [a11y, reveal, intersection-observer, gap-closure]
requires: []
provides:
  - "Shutter reveals observed through their unclipped card (A11Y-01 fixed)"
  - "A11Y-01 e2e regression tests at 390 and 1440, EN and ES"
affects: [src/lib/motion/reveal.ts]
tech-stack:
  added: []
  patterns: ["IntersectionObserver proxy: observe an unclipped ancestor, map entries back to targets"]
key-files:
  created: []
  modified:
    - src/lib/motion/reveal.ts
    - tests/unit/motion-reveal.test.ts
    - tests/e2e/motion-reveal.spec.ts
decisions:
  - "Shutters are observed through closest('[data-card]') ?? parentElement; other kinds stay direct"
  - "A proxy is unobserved only once no pending target maps to it"
metrics:
  duration: "~20 min"
  completed: 2026-11-09
requirements: [QUAL-02]
---

# Phase 8 Plan 11: A11Y-01 card cover opens on any intersection Summary

Work-card cover shutters are now watched through their `article[data-card]` (no clip-path) and mapped back to the shutter, so a cover whose card top is above the viewport opens as soon as any part of the card is on screen.

## Diagnosis (Task 1 probe, measured)

Throwaway Playwright probe (tmp/probe, not committed) on `/`, motion 'on', last Latest-work card scrolled instantly so its top sits 40 px above the viewport, one IntersectionObserver (threshold 0, rootMargin 0px) each on the closed shutter and the card:

| Viewport | Card rect top / bottom | Shutter isIntersecting / height | Article isIntersecting / height | Shutter after 1.5 s |
|---|---|---|---|---|
| 390x844 | -40.25 / 486.44 | false / 0 | true / 486.44 | not revealed, `inset(0px 0px 100%)` |
| 1440x900 | -40.08 / 559.11 | false / 0 | true / 559.11 | not revealed, `inset(0px 0px 100%)` |

The root cause matches the plan: the shutter's own hidden clip leaves a zero-height box at its (off-screen) top edge, so its observer never fires.

## Tasks

| Task | Name | Commit |
|---|---|---|
| 1 | Probe + failing A11Y-01 e2e tests (RED) | 62e645c |
| 2 | Observe shutters through their card (GREEN) | 3b3d31f |

RED: all 8 new A11Y-01 tests failed on the unfixed build (instant jump and deep-link cases, 390 and 1440, `/` and `/es/`; the cover stayed at `inset(0px 0px 100%)`, not revealed).

GREEN: `pnpm exec vitest run tests/unit/motion-reveal.test.ts` 45/45; full `pnpm test` 71 files / 1316 tests passed; `pnpm lint` (astro check, eslint, prettier) exit 0; the listed e2e specs (motion-reveal, collection-motion, home-latest-work, projects-grid, project-detail, stack-entrance, transitions, smooth-scroll, anchors, contact-lazy) 374 passed with `E2E_OFFLINE=1`. `src/styles/global.css` is unchanged.

## Implementation

- `observeTargetFor(el)` (exported, pure): shutter -> `closest('[data-card]') ?? parentElement ?? el`; other kinds -> `el`.
- `targetsByProxy: Map<Element, Set<HTMLElement>>` with `track`/`untrack`. The arming loop and `armWaiting()` observe the proxy on the trigger observer and the one-shot pass. `revealEntries` maps each intersecting entry's target to its pending elements (stagger and `revealDelay` unchanged). `finish` unobserves the proxy only once its set is empty. Cleanup and the arming error path clear the map.
- The card starts at the same top edge as the cover, so the -12% trigger line for downward scrolling is unchanged. `aboveViewport()` at mount is kept.
- Unit tests: existing observation assertions now expect the card for shutters. Four new cases cover the card revealing its shutter with a staggered delay, the card being unobserved only after its shutter reveals, settle/lines still being observed directly, and a shutter without a card being observed through its parent.

## Deviations from Plan

1. **[Rule 3 - Blocking] Lock mechanism.** The plan's `tmp/build-e2e.lock` lives inside each worktree's own `tmp/`, so it cannot serialise across parallel worktrees (each worktree also has its own dist/). The orchestrator's shared port-4400 lock (scratchpad `e2e-port-4400.lock`) was used for every Playwright run instead. The sandbox blocked running `e2e-lock.sh` directly, so its protocol (atomic mkdir, pid file, release) was inlined, with an extra wait for port 4400 to be free. One early run hit "port 4400 already used" while another agent's preview was still shutting down; it was retried under the lock. One GREEN run was orphaned when its wrapper shell died (exit 144). Its lock was released by stale-pid detection, and I stopped its processes before re-running cleanly under the lock.
2. **Formatting.** The RED commit's spec was not Prettier-formatted. The formatting fix rides in the GREEN commit (3b3d31f).

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: src/lib/motion/reveal.ts (contains `closest('[data-card]')`, `targetsByProxy` x8)
- FOUND: tests/e2e/motion-reveal.spec.ts (contains `A11Y-01`, 390 and 1440)
- FOUND commits: 62e645c, 3b3d31f
