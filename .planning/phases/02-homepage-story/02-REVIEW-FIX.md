---
phase: 02-homepage-story
fixed_at: 2026-10-16T21:53:30Z
review_path: .planning/phases/02-homepage-story/02-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 3
skipped: 1
status: partial
---

# Phase 02: Code Review Fix Report

**Fixed at:** 2026-10-16T21:53:30Z
**Source review:** .planning/phases/02-homepage-story/02-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (fix_scope: critical_warning, so WR-01 to WR-04)
- Fixed: 3 (WR-01, WR-03, WR-04)
- Skipped: 1 (WR-02, an explicit user decision)

**Commit policy:** The user's global CLAUDE.md requires approval of every commit message, so nothing was staged or committed. All changes are unstaged in the main working tree, and each finding below has a proposed commit message. No isolated worktree was used, because uncommitted changes in a worktree would have been lost when it was removed.

**Gates (run after the final edits):**
- `pnpm lint`: astro check 0 errors and 0 warnings, ESLint clean, Prettier clean.
- `pnpm test`: 16 files and 127 tests pass (122 before this fix run).
- E2E: a temporary Playwright config copy ran on port 4415 with `reuseExistingServer: false` and `CI=1`. 104 of 104 pass. The copy was deleted afterwards and never staged.
- `pnpm build`: completed, so the preview on :4411 serves the fixes.

## Fixed Issues

### WR-01: Marquee `aria-pressed` contradicts the visible state

**Files modified:** `src/lib/motion/marquee.ts`, `src/components/sections/RolesMarquee.astro`, `tests/unit/marquee-toggle.test.ts`, `tests/e2e/home-story.spec.ts`
**Commit:** not committed (proposed: `fix(02): make marquee toggle state match play state`)
**Applied fix:**
- After an explicit resume, the toggle now sets `data-playing` on the section (exclusive with `data-paused`).
- A new utility, `group-data-playing:[animation-play-state:running]!`, overrides the transient hover and focus pause.
- Behaviour:
  - Before any user choice, hover and keyboard focus still pause the band (HOME-03 is kept).
  - When the user chooses "paused", the band is paused.
  - When the user chooses "playing", the band is visibly running even while the pointer is over it or the button has focus.
- The explicit choice lasts until the next toggle (no reload persistence, as before).
- Tests:
  - New unit test for `data-playing`.
  - The e2e test now checks `animationPlayState` against `aria-pressed` after click, click and click with the pointer over the band, then after Space, Enter and Enter with real `:focus-visible` keyboard focus.
- A temporary revert of the CSS override confirmed the new e2e assertion fails without the fix.

**Status:** fixed: requires human verification (this changes state logic).

### WR-03: A reduced-motion change after load leaves the band clipped and the pause button live

**Files modified:** `src/lib/motion/gate.ts`, `src/lib/motion/index.ts`, `src/components/sections/RolesMarquee.astro`, `tests/unit/motion-gate.test.ts`, `tests/e2e/motion.spec.ts`
**Commit:** not committed (proposed: `fix(02): sync motion gate on preference change`)
**Applied fix:**
- Added `syncMotionGate(doc, win)` in `gate.ts`. It wraps the existing `onMotionPreferenceChange`, writes `html[data-motion]`, does nothing without `matchMedia`, and returns an unsubscribe function. It is called once from `src/lib/motion/index.ts`.
- **Additional bug found while writing the e2e test:** the static list never wrapped, even with reduced motion set at load.
  - `shrink-0` sized the `<ul>` to its one-line content width (942px at 375px).
  - "Social media manager" and "Graphic design" were clipped by `overflow-hidden`.
  - The existing static tests only used `toBeVisible`, which passes for clipped elements.
  - Fix: `shrink-0` became `motion-on:shrink-0` in `copyClasses`.
- Tests:
  - Unit tests for `syncMotionGate`: live update, unsubscribe, and no matchMedia.
  - New e2e test at 375px using `page.emulateMedia`. When the setting switches to reduce, it checks that `data-motion` becomes off, the duplicate list and toggle are hidden, `flex-wrap: wrap` applies, `animation-name: none` applies, and every role sits fully inside the band's clip box. Switching back to no-preference turns motion back on.

**Status:** fixed

### WR-04: Hovering another tile hides the tooltip of the keyboard-focused tile

**Files modified:** `src/lib/ui/tooltips.ts`, `tests/unit/tool-tooltips.test.ts`, `tests/e2e/a11y.spec.ts`
**Commit:** not committed (proposed: `fix(02): keep focused tool tooltip on hover`)
**Applied fix:**
- On `pointerenter`, the tile that holds focus (`doc.activeElement`) no longer gets `data-dismissed`.
- Esc (explicit dismissal) and moving focus (`focusin` on another tile) still hide it.
- An Esc-dismissed focused tile stays dismissed when another tile is hovered.
- Tests:
  - Unit tests for persistence on neighbour hover and for Esc still winning.
  - New e2e test in `a11y.spec.ts`: Tab to the first tile, hover tile 3, check that both tooltips are visible, move the pointer away, and check that the focused tooltip is still visible.
- [Inference] When a neighbour is hovered while another tile has focus, both tooltips show at once and may overlap visually, because the tiles are 48px apart and the bubbles are wider. This is the cost of strict 1.4.13 persistence. A visual check is recommended under the taste-skill rule.

**Status:** fixed: requires human verification (visual overlap trade-off).

## Skipped Issues

### WR-02: The invisible full-band pause button cannot be discovered by touch and sighted users

**File:** `src/components/sections/RolesMarquee.astro:53-59`
**Reason:** skipped: user decision. The invisible full-band pause control was explicitly chosen by the user at the 02-08 checkpoint. The band was not changed to a visible button.
**Original issue:** The WCAG 2.2.2 pause mechanism is an empty, transparent overlay with no visible affordance for touch or sighted keyboard users. Accidental taps toggle it, and it blocks text selection.

## Shared-file note for committing

- `src/components/sections/RolesMarquee.astro` is changed by both **WR-01** and **WR-03**:
  - WR-01 adds `group-data-playing:[animation-play-state:running]!` and rewrites the header comment.
  - WR-03 moves `shrink-0` to `motion-on:shrink-0` and extends the "Shared by both copies" comment.
  - Both edits are on the same `copyClasses` string. Split them with `git add -p`, or commit WR-01 and WR-03 together.
- Every other file belongs to exactly one finding.

---

_Fixed: 2026-10-16T21:53:30Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
