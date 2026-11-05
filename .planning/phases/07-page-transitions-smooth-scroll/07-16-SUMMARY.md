---
phase: 07-page-transitions-smooth-scroll
plan: 16
subsystem: motion / navigation feedback
tags: [motion, navigation, touch, latency, gap-closure, a11y]
requires: ["07-13", "07-14", "07-15"]
provides:
  - "data-nav-pressed marker (markPressed / clearPressed in navigation.ts, PRESS_TIMEOUT_MS = 3000)"
  - "pressed-state CSS reusing the accent underline and the Phase 6 card mat inset"
  - "cold-gzip touch latency profile (test-only gzip proxy) and the touch-feedback metric"
affects:
  - src/lib/motion/navigation.ts
  - src/styles/global.css
  - tests/e2e/transitions-capture.spec.ts
tech-stack:
  added: []
  patterns:
    - "Navigation feedback on astro:before-preparation via event.sourceElement.closest('a'), cleared on before-swap, next navigation, timeout and unbind"
key-files:
  created:
    - tests/e2e/nav-feedback.spec.ts
  modified:
    - src/lib/motion/navigation.ts
    - src/styles/global.css
    - tests/unit/motion-navigation.test.ts
    - tests/e2e/transitions-capture.spec.ts
    - .planning/phases/07-page-transitions-smooth-scroll/07-UI-SPEC.md
decisions:
  - "Pressed state lives in the eager navigation.ts (+78 to +81 B gzip); nav-pressed.ts budget fallback not needed"
  - "Card cue under 'on' is the mat inset only; the title underline is suppressed by the 07-06 morph wrapper by design"
  - "07-10 touch latency follow-up resolved: cold-gzip median 218.5 ms, feedback at tap time"
metrics:
  duration: "~25 min"
  completed: 2026-11-04
  tasks: 2
  files: 6
---

# Phase 7 Plan 16: Pressed Feedback on Navigation Start Summary

When a soft navigation starts under `on` or `reduced`, the tapped link gets `data-nav-pressed` before the fetch begins. Links show the accent underline. Cards and the teaser show the Phase 6 mat inset. The tap-to-wipe latency was re-measured with a gzip proxy that approximates production compression: the cold median is 218.5 ms.

## Tasks

| Task | Name | Commits |
| ---- | ---- | ------- |
| 1 | Pressed marker on navigation start (TDD) | 786839c (RED unit), 4077c92 (GREEN, CSS, e2e) |
| 2 | Feedback and gzip latency measurement, item 10 captures, UI-SPEC | 93c770a |

## Behaviour

- `markPressed` is registered on `astro:before-preparation` right after `preventOffNavigation`.
  - It first clears any earlier marker.
  - It returns early under `off` (`defaultPrevented`) and when there is no source element (back/forward).
  - Otherwise it writes only the constant `data-nav-pressed=""` on `sourceElement.closest('a')` (T-07-37) and starts a 3000 ms safety timer.
- `clearPressed` runs on `astro:before-swap`, at the next navigation, when the timer fires, and on `unbind` (T-07-38). The e2e checks that exactly one marker exists at before-swap and none after page-load.
- CSS (`global.css`):
  - `a[data-nav-pressed]` gets ink text with a 2px accent underline at offset 4px. This matches the existing aria-current and hover underline.
  - `:is(on, reduced) [data-card]:has([data-nav-pressed]) [data-card-mat]` gets `clip-path: inset(12px)`. No new transition was added: under `on` it uses the mat's existing rest transition, and under `reduced` the mat has none, so the inset is instant.
  - No rule changes transform, translate, scale or layout.

## Bundle (gzip -9, `node scripts/measure-bundle.ts`, exits 0)

| Route | Before (base 82cbad5) | After | Delta | Headroom |
| ----- | --------------------- | ----- | ----- | -------- |
| `/`, `/es/` | 17,562 B | 17,640 B | +78 B | 4,360 B (07-15 left 4,438 B) |
| `/projects/portfolio-web/`, `/es/projects/portfolio-web/` | 16,069 B | 16,150 B | +81 B | 5,850 B |
| every other page (404, projects index, other details, EN and ES) | 15,394 B | 15,475 B | +81 B | 6,525 B |

`EAGER_CEILING_GZIP = 22_000` is unchanged and `scripts/measure-bundle.ts` was not modified. The named fallback was **not applied**, so `src/lib/motion/nav-pressed.ts` does not exist.

## Touch latency (Pixel 7, CDP 150 ms latency, 1.6 Mbps; 10 taps, Home to Projects nav link)

| Profile | Tap -> feedback (median) | Tap -> startViewTransition (median) | Samples (wipe) |
| ------- | ------------------------ | ----------------------------------- | -------------- |
| cold (cache disabled; the plan calls this "disabled") | 1 ms | 537.5 ms | 530, 528, 526, 537, 538, 538, 541, 522, 541, 538 |
| default (cache and touchstart prefetch) | 1 ms | 297.5 ms | 444, 170, 294, 302, 301, 164, 301, 164, 301, 167 |
| cold-gzip (cache disabled, through the gzip proxy) | 1 ms | 218.5 ms | 220, 218, 216, 217, 217, 224, 217, 219, 221, 221 |

- In cold-gzip, the `/projects/` document was 6,511 B on the wire instead of 28,519 B. Every run reported `content-encoding: gzip`.
- The cold uncompressed number (537.5 ms) matches 07-10's 538.5 ms.
- **What the feedback figure measures.** It is the time from `touchstart` to the attribute appearing in the DOM, read by a MutationObserver. Painting happens one frame later (about 16 ms). Playwright's synthetic `tap()` fires touchstart, touchend and click almost together. On a real finger, the click (and so `before-preparation`) comes after touchend, so real tap-to-feedback also includes how long the finger stays down. [Inference] It stays well under 100 ms after the finger lifts, but I did not measure that on a real device.
- The cold-gzip profile is an approximation of Cloudflare's edge compression, not a measurement of it [Unverified]. The site is not deployed.
- The cold-gzip median is under 300 ms, so nothing goes under "Raised with the user". The UI-SPEC marks the 07-10 follow-up as resolved.

## Taste review

- **Item 10 captures** (`.taste-skill/transitions/10-pressed-{nav,card}-{en,es}-390.png`, 4 files, all reviewed):
  - **Nav:** "Projects" / "Proyectos" takes the blue accent underline. It reads as an acknowledged press next to the ink-underlined current locale, not as a loading indicator.
  - **Card:** the cover pulls in to the 12px inset mat, the same state as desktop hover. The title text shows no underline under `on`, because the 07-06 morph wrapper (an inline-block) already holds the title and text-decoration does not reach it. The UI-SPEC Title Morph "Colour" row intends this so the flying snapshot stays plain ink. I kept it, and the UI-SPEC amendment documents it. Under `reduced` there is no wrapper, so the underline shows (e2e asserts `underline`).
- **`lint.mjs src/styles src/lib/motion`:** 0 FAIL, 0 WARN.
- **`inspect.mjs`:** the pressed state is not visible at rest, so these results are about the rest pages; the rest renders were viewed.
  - `/`: 1 FAIL (`icon-cards`), plus 4 WARN (hairline header border, cream palette, first-action, no-footage).
  - `/projects/`: 2 FAIL (`focal-point`, `empty-screens`), plus the same WARN set.
  - All of these existed before this plan. `icon-cards` was already logged in the Phase 3 SUMMARYs. This plan changes no rest-state visuals, so they are out of scope and not fixed here.

## Verification

- `pnpm vitest run tests/unit`: 71 files and 1,292 tests pass. `motion-navigation.test.ts` gained 11 pressed-state tests: marks under on and reduced, the enclosing link, none under off or back, cleared at swap, moves to the next link, cleared at the timeout, a superseded timer, and unbind.
- e2e on a temporary uncommitted config on port 4416, deleted afterwards:
  - `nav-feedback.spec.ts`: 7 passed (1440 and Pixel 7 for nav and card; reduced card with no transform change; reduced nav; off never marks).
  - `transitions`, `navigation-leaks`, `motion-hover` and `transitions-reduced`: 42 passed.
  - The capture run (`touch latency|item 10`): 7 passed.
- `pnpm lint` (astro check, eslint, prettier) exits 0.
- `pnpm build && node scripts/measure-bundle.ts` reports "bundle check ok".

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Unused parameter failed `astro check`**
- **Found during:** Task 2 (`pnpm lint`).
- **Issue:** the `press(page, ...)` helper in `nav-feedback.spec.ts` (committed in Task 1) never used `page`, which caused ts(6133).
- **Fix:** removed the parameter. The spec was re-run and is green.
- **Commit:** 93c770a

**2. [Rule 3 - Blocking] Worktree base reset**
- The worktree started on 234dcb2. The sanctioned startup step reset it to 82cbad5 before any work.

### Notes

- The e2e spec was written together with the GREEN implementation. The separate RED commit covers the unit tests only.
- The plan's "disabled" profile is the existing `cold` profile in the spec. Its name was kept so the 07-10 annotations stay comparable.

## Threat model

- T-07-37: only the constant attribute is written. The unit tests check that the value is `''`.
- T-07-38: four clear paths. The e2e checks that no marker exists after page-load.
- T-07-39: the proxy binds to 127.0.0.1 on an ephemeral port, is closed in `afterAll`, and lives only in an opt-in capture spec.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: tests/e2e/nav-feedback.spec.ts, src/lib/motion/navigation.ts (PRESS_TIMEOUT_MS = 3000, data-nav-pressed), src/styles/global.css (data-nav-pressed, `:has([data-nav-pressed])`)
- FOUND commits: 786839c, 4077c92, 93c770a
- NOT PRESENT (expected): src/lib/motion/nav-pressed.ts
