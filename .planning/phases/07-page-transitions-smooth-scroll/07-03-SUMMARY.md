---
phase: 07-page-transitions-smooth-scroll
plan: 03
subsystem: motion
tags: [client-router, cursor, persistence, leak-test, cdp, i18n]
requires:
  - 07-01 (softNavigate, listenerCounts, ClientRouter)
provides:
  - Persisted cursor host `[data-cursor-host][data-astro-transition-persist="cursor"]` (CursorFollower.astro)
  - App-scope createCursor with before-preparation rest and before-swap label resync (cursor.ts)
  - SC3 leak spec tests/e2e/navigation-leaks.spec.ts (later plans re-run it)
affects: [07-02, 07-05, 07-06, 07-08, 07-09]
tech-stack:
  added: []
  patterns:
    - Persisted host via raw data-astro-transition-persist attribute (not the directive)
    - Leak contract per URL via CDP DOMDebugger.getEventListeners after a warm-up cycle
key-files:
  created:
    - tests/e2e/navigation-leaks.spec.ts
  modified:
    - src/lib/motion/cursor.ts
    - src/components/global/CursorFollower.astro
    - tests/unit/motion-cursor.test.ts
decisions:
  - The persisted host is itself the fixed inset-0 z-50 pointer-events-none overlay, because a view-transition name makes it a stacking context that would otherwise trap the layer under the sticky header (z-40)
  - Router listeners (before-preparation, before-swap) live on the cursor session signal, so they exist only while a layer exists
  - A session started later re-reads the live template, so it clones the current page's locale
  - The leak spec also pins the layer node after warm-up (same node on every page), which is the direct D-05 persistence check and the RED signal
metrics:
  duration: ~20 min
  completed: 2026-11-02
  tasks: 2
  files: 4
---

# Phase 7 Plan 03: Persisted cursor and SC3 navigation leak test Summary

The cursor follower now starts once at app scope and lives in a `data-astro-transition-persist="cursor"` host, so one layer follows the pointer across every soft navigation. Its View pill returns to rest when a navigation starts and takes the arriving page's label (EN "View" / ES "Ver") on before-swap, via `textContent` only. A CDP-based e2e test runs one warm-up cycle and 12 counted navigations across Home, Projects, a detail page and their ES twins, and proves the per-URL listener and animation counts stay constant.

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Failing 10-navigation leak test (CDP) | 7e41fab |
| 2 | App-scope persisted cursor with locale label resync (unit RED then GREEN, one commit) | 9317bcb |

## Leak counts (w = window listeners, d = document listeners, depth -1 pierce, a = `document.getAnimations()`)

### RED (before Task 2)

The test failed on the persistence check: `the persisted cursor layer is the same node` was false on every page, because the layer was appended to the body that the router replaces and re-mounted per page. With that check made soft for one diagnostic run, the counts were already constant (the per-page cursor teardown was clean, only the node churned):

| Path | Visit 1 | Visit 2 |
| ---- | ------- | ------- |
| `/projects/` | w7/d62/a0 | w7/d62/a0 |
| `/projects/website-instablogs/` | w7/d58/a0 | w7/d58/a0 |
| `/es/projects/website-instablogs/` | w7/d58/a0 | w7/d58/a0 |
| `/es/projects/` | w7/d62/a0 | w7/d62/a0 |
| `/es/` | w7/d97/a2 | w7/d97/a2 |
| `/` | w7/d97/a2 | w7/d97/a2 |

### GREEN (after Task 2)

| Path | Visit 1 | Visit 2 |
| ---- | ------- | ------- |
| `/projects/` | w7/d64/a0 | w7/d64/a0 |
| `/projects/website-instablogs/` | w7/d60/a0 | w7/d60/a0 |
| `/es/projects/website-instablogs/` | w7/d60/a0 | w7/d60/a0 |
| `/es/projects/` | w7/d64/a0 | w7/d64/a0 |
| `/es/` | w7/d99/a2 | w7/d99/a2 |
| `/` | w7/d99/a2 | w7/d99/a2 |

The +2 document listeners are the cursor session's `astro:before-preparation` and `astro:before-swap` handlers. On every visit: exactly one `[data-cursor-layer]`, the same node as after warm-up, pill text in the page's locale, zero `.split-line-mask`, zero `project-title` view-transition names, parallax animations equal to `[data-parallax]` count (0 = 0 today), at most one `html.lenis`, zero console errors.

## Verification

- `pnpm lint`: 0 errors (astro check over 236 files, eslint, prettier).
- `pnpm test`: 68 files, 1120 tests passed (motion-cursor: 23, including 5 new).
- Plan verify: `navigation-leaks.spec`, `motion-pointer.spec`, `motion-toggle.spec`: 28 passed.
- Full hermetic e2e (`@network` excluded): 650 passed, 33 skipped, 0 failed.
- Acceptance greps: persist attribute 1, `lifecycle.register` in CursorFollower 0, `doc.body.append` in cursor.ts 0, `innerHTML` in cursor.ts 0.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Host stacking context**
- **Found during:** Task 2
- **Issue:** The plan's host was a plain in-flow div carrying `view-transition-name: cursor` under `on`. [Inference] A view-transition name makes the element a stacking context, so the `fixed z-50` layer inside would be stacked at the host's level, below the sticky header (z-40).
- **Fix:** The host is itself `pointer-events-none fixed inset-0 z-50`, which keeps the Phase 6 stacking. It stays click-through and empty when no session runs.
- **Files modified:** src/components/global/CursorFollower.astro
- **Commit:** 9317bcb

**2. [Rule 2 - Correctness] Later sessions use the live template**
- **Issue:** The init captured the template once. After an EN to ES swap, turning motion off and back on would have cloned the old page's English label.
- **Fix:** The template is re-read at each session start. Covered by the unit test "mounts a later session with the arriving page label".
- **Commit:** 9317bcb

**3. [Rule 3 - Blocking] Worktree base and test port**
- The worktree started at 234dcb2 and was reset to the required base 4b0d66a before any work.
- e2e ran through a scratch Playwright config (same settings, port 4433, `@network` excluded) so it would not collide with the parallel 07-02 executor's preview on 4400. The committed `playwright.config.ts` is unchanged.

### Notes

- **Leak spec additions beyond `<behavior>`:** it pins the layer node after warm-up (D-05 persistence) and checks the pill label per locale (Research Security "stale persisted DOM"). Without the identity check the spec would have passed before Task 2.
- **Counted navigations:** 12 (two full cycles of six), so every URL is visited twice after warm-up.
- **taste-skill not run:** there is no visual change. The layer, dot and pill markup, classes and motion are the same as Phase 6. Only where the layer lives and when it mounts changed. The `cursor` view-transition name only takes effect with 07-02's CSS, and that plan's visual step covers it.

## Threat Model Coverage

- T-07-07: the pill is re-synced from the arriving document's template on every before-swap (unit and e2e per-locale checks).
- T-07-08: `textContent` only. A unit test feeds `<img src=x onerror=...>` and confirms no element is created.
- T-07-09: the cursor is mounted once at app scope, and the CDP leak test asserts constant counts per URL.

## Known Stubs

None.

## Self-Check: PASSED

- tests/e2e/navigation-leaks.spec.ts, src/lib/motion/cursor.ts, src/components/global/CursorFollower.astro and tests/unit/motion-cursor.test.ts exist.
- Commits 7e41fab and 9317bcb are on the branch (`git log`).
