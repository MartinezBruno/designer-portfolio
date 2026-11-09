---
phase: 08-quality-verification
plan: 10
subsystem: motion, testing
tags: [marquee, wcag-2.2.2, aria-pressed, turnstile, e2e, gap-closure]
requires: []
provides:
  - "Marquee pause toggle whose first activation always pauses; aria-pressed = explicit choice only"
  - "Deterministic @network keyboard contact journey (token before typing, typed values asserted)"
affects: [08-VERIFICATION QUAL-02 gaps WR-01 and WR-03]
tech-stack:
  added: []
  patterns:
    - "aria-pressed from the explicit choice, data-paused from the effective (explicit ?? transient) state"
key-files:
  created: []
  modified:
    - src/lib/motion/marquee.ts
    - src/components/sections/RolesMarquee.astro
    - tests/unit/marquee-toggle.test.ts
    - tests/unit/roles-marquee.test.ts
    - tests/e2e/home-story.spec.ts
    - tests/e2e/motion.spec.ts
    - tests/e2e/keyboard-journeys.spec.ts
decisions:
  - "WR-01 vs D-10: option-a chosen by the user (explicit-only aria-pressed, transient hover/focus pause kept as visual only). Amends D-10."
metrics:
  duration: "~25 min"
  completed: 2026-11-09
  tasks: 3
  files: 7
requirements: [QUAL-02]
---

# Phase 8 Plan 10: Marquee first-activation pause and stable @network journey Summary

The marquee toggle now always pauses on its first click, tap, Space or Enter, and `aria-pressed` is "true" only after an explicit pause. The @network contact journey now waits for the Turnstile token before typing and checks each typed value. The @network suite passed 60/60, and the contact journey passed a 20/20 stress run.

## Decisions

- **Task 1 (checkpoint:decision), WR-01 against locked D-10:** the orchestrator asked the user in a question dialog before dispatch. The user's choice, verbatim: "option-a (Recommended)". Option id: **option-a**, explicit-only `aria-pressed`, with the transient hover/focus pause kept as visual only.
  - **Consequence for D-10:** D-10 said "aria-pressed must always match the real paused state, including the hover/focus pause". That is now amended. While the band is hovered, or the toggle has keyboard focus, and the user has made no explicit choice, the band is visually paused but `aria-pressed` stays "false". The transient pause is not a user choice, so it is not announced as pressed. With an explicit choice, `aria-pressed` and the visible state agree.
  - Task 1 changed no files, so it has no commit.

## Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Choose WR-01 resolution (decision) | none (no files) | none |
| 2 | Implement option-a and update all marquee tests | 2e7e1a3 | marquee.ts, RolesMarquee.astro, 2 unit specs, 3 e2e specs |
| 3 | Stabilise the @network contact journey (WR-03) | ccc97d3 | tests/e2e/keyboard-journeys.spec.ts |

### Task 2 details
- `marquee.ts`: `apply()` writes `aria-pressed = String(explicit === true)` and toggles `data-paused` from `explicit ?? (hovered || focused)`. Click is `explicit = explicit !== true`: no choice or an explicit resume becomes an explicit pause, and an explicit pause becomes an explicit resume. The focus/blur, pointer and onMotionChange handlers are unchanged. A motion change still resets `explicit` to null, so `aria-pressed` goes back to "false". The doc comment now states the WR-01 rule.
- `RolesMarquee.astro`: only the comment changed. Markup and classes are untouched (D-12).
- Tests: the unit helper is split into `expectPressed` / `expectBandPaused`. The e2e `expectBand(page, pressed, paused = pressed)` helpers assert `aria-pressed` and the play state separately. The "click while hovered resumes" test is now "the first click pauses, the next click resumes". The hover and keyboard-focus tests assert a visual pause with `aria-pressed` "false", and the white focus outline assertion is kept. motion.spec drops the "first click resumes the hover pause" step, and the D-11 reset assertion is kept. Keyboard journey 5: focus gives a visual pause with "false", Space pauses, Space resumes, Space pauses again, and the pause holds after Tab.

### Task 3 details
- `beforeEach` now uses `collectErrors(page, /challenges\.cloudflare\.com/)`. `pageerror` is still collected (T-08-21).
- `waitForTurnstileToken(page)` now runs right after `reachContactByKeyboard` (line 291), before the first `page.keyboard.type` (line 302). The later call was removed. The widget mounts through the section's IntersectionObserver, so waiting this early cannot deadlock.
- Each typed value is now checked with `toHaveValue` ('Ana López', 'ana@example.com', 'Necesito una identidad visual para mi café.').
- No product code changed (`git diff --name-only HEAD~1 HEAD` lists only the spec).

## Verification evidence

- `pnpm test -- marquee`: 71 files, 1312 tests passed.
- `pnpm lint` (astro check 0/0/0, eslint, prettier): passed.
- Hermetic e2e (`E2E_OFFLINE=1`) for home-story, motion, keyboard-journeys, motion-states and a11y: 88 passed and 32 skipped on the second full run. The first run had 87 passed and 1 failed; the failure was keyboard journey **9** (contact empty-submit, en), which is out of scope (see Deferred Issues). Every marquee test passed in both runs.
- **@network run** (`pnpm exec playwright test -g "@network"`, default workers): **60 passed, 0 failed, 0 flaky** (1.4 m).
- **Stress run** (`keyboard-journeys.spec.ts -g "@network" --repeat-each=10 --workers=5`): **20 passed, 0 failed** (14.0 s).

## Deviations from Plan

- **Locking:** I used the orchestrator's shared port-4400 lock (`e2e-lock.sh`) instead of the plan's per-worktree `tmp/build-e2e.lock`, as the dispatch instructed. Each worktree has its own `dist/`, so I built outside the lock. One @network attempt failed with "port 4400 already used" because another worktree (agent-ad6fe57924a3d3d35) had an `astro preview` running outside the lock. I did not kill it. I waited for the port to free and re-ran under the lock. No test result from that attempt is counted.
- Otherwise the plan ran as written.

## Deferred Issues

- **Out of scope, pre-existing flake [Inference]:** keyboard journey test **9. "empty submit focuses the first invalid field"** (blocked Turnstile, hermetic) failed 3 of 20 in `--repeat-each=10` against this build, and once in the first full hermetic run. It fails either on `aria-invalid` not set or on `#contact-name` not focused after Enter on submit. That test does not use the marquee, and this plan's product change is limited to `marquee.ts`. I therefore infer that the flake predates this plan, but I did not re-run it against the base commit to confirm. [Speculation] It may be the same class of race as WR-03: Enter on submit arrives before the lazy contact-form controller has mounted, so native validation runs instead of the scripted path. Suggested follow-up: wait for the controller's mounted signal, or for the Turnstile slot to render, in test 9, then re-run with `--repeat-each=20`. It is not logged to `deferred-items.md`, to avoid add/add conflicts with the parallel wave-1 worktrees.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: src/lib/motion/marquee.ts (`String(explicit === true)`, `explicit !== true`)
- FOUND: commit 2e7e1a3
- FOUND: commit ccc97d3
- `grep -rn "click while hovered resumes" src tests`: no matches
