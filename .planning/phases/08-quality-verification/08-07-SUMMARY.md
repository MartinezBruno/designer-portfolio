---
phase: 08-quality-verification
plan: 07
subsystem: design-qa
tags: [taste-gate, d-20, report-only, a11y, footer, redesign]
requires:
  - 08-01, 08-02, 08-03 (wave 1 merged at 69d8bc6)
provides:
  - classified taste-gate record for the ff5bf7c redesign (12 URLs x 1440/390, EN and ES)
  - footer band (#0f70b7, decorative 10.4vw name) visual review at both widths and locales
  - one confirmed a11y gap item (A11Y-01) for a /gsd:plan-phase 8 --gaps plan
affects:
  - .planning/phases/08-quality-verification/08-TASTE-REPORT.md
tech-stack:
  added: []
  patterns:
    - "Taste gate as report only: findings are sorted into a11y, perf, taste and accepted. Only a11y/perf defects become gap plans"
key-files:
  created:
    - .planning/phases/08-quality-verification/08-TASTE-REPORT.md
    - .planning/phases/08-quality-verification/08-07-SUMMARY.md
  modified: []
decisions:
  - "D-20: A11Y-01 (work-card cover mask stays closed when the card's top is above the viewport at an instant jump) is a confirmed accessibility defect, fixed later by a Phase 8 gap plan, not in 08-07"
  - "D-20: Taste items T-01 (footer name right edge), T-02 (soft upscaled card covers) and T-04 (bare centred 404) are logged as deferred follow-ups. T-03, T-05, T-06 and T-07 are recorded as seen, with no follow-up"
metrics:
  completed: 2026-11-06
  tasks: 2
  files: 2
---

# Phase 8 Plan 07: Taste gate on the redesign Summary

The taste-skill gate ran on the redesign merged outside GSD (ff5bf7c), as a report only. It closes the milestone audit's "taste gate not shown to have run on the redesign" and "footer name not visually reviewed" items (D-20).

lint.mjs reports 0 FAIL and 0 WARN, which clears the old hairline and outlined-box findings. inspect.mjs ran on all 12 page/locale URLs at 1440 and 390. On all 24 runs there was no headline over 2 lines, no overflow, no broken images and no console errors. I reviewed every screenshot. The footer band was captured in EN and ES at both widths: the name is never clipped, the band text is 5.22:1, and the name is aria-hidden. The user has triaged the findings (see User decision).

## Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Run the taste gate on every page type, write the classified report | ec52932 | 08-TASTE-REPORT.md |
| 2 | User reviews the findings list (checkpoint) | this docs commit | 08-TASTE-REPORT.md (section 7), 08-07-SUMMARY.md |

## Results (details in 08-TASTE-REPORT.md)

- **Accessibility defects:** A11Y-01. A card's cover image stays invisible because its clip-path mask stays at `inset(0 0 100%)` when an instant jump lands the card with its top above the viewport. It reproduced 3/3 with a programmatic jump at 390 and 1440, and with the `/#contact` deep link followed by scrolling up. It did not reproduce with the wheel, reload, back navigation, the CTA, the End key, or under reduced motion.
- **Performance defects:** none within this gate's scope. Lighthouse and bundle size are covered by other Phase 8 plans.
- **Visual taste items:** T-01 to T-07.
- **Accepted (not reopened):** icon-cards (now cleared), focal-point (now cleared), empty-screens (still FAIL on /projects/ and /es/), the PuroV crop, and still-page on long detail pages (06-04 precedent).
- **Critique ROUND 1:** design 7, usability 7.5, creativity 6.5, content 7, which gives 7.1 before caps and 6.0 after the inspect-FAIL cap.

## User decision

- **Confirmed defects:** A11Y-01, "Confirm, fix later". It is queued for a later `/gsd:plan-phase 8 --gaps` plan and was not fixed here (D-20, report only).
- **Taste items deferred and logged for later:** T-01 (the footer name ends 66 px short of the right margin), T-02 (card covers upscaled about 1.75x look soft) and T-04 (the bare, centred 404 with no picture and no motion).
- **Seen, not logged:** T-03 (11 font sizes), T-05 (empty areas on Home), T-06 (`first-action` WARN) and T-07 (`no-footage` WARN).
- **Performance defects:** none.

## Deviations from Plan

1. **[Rule 3 - Blocking] The Skill tool was not available.** I read SKILL.md and references/critique.md directly, applied them, and ran lint.mjs and inspect.mjs as specified. 07-18 and 07-21 did the same.
2. **Preview port was 4483, not the plan's 4430.** The orchestrator assigned 4483 as this worktree's private port.
3. **12 URLs instead of the 10 the plan listed.** The list held 10 although the plan said "12", so I added `/es/does-not-exist` and `/404/` to cover both 404 routes in both locales.
4. **Worktree base corrected.** The worktree started at ff5bf7c. I reset it to the expected base 69d8bc6 per the worktree_branch_check, before any work.
5. **Extra Playwright probes** (scratch in the gitignored tmp/) re-checked blank cards and the faint text in the services list. This separated inspector capture timing (the /projects/ Visual system cover, the services reveal) from the real A11Y-01 behaviour.

No `src/` file was changed.

## Known Stubs

None. This plan changes documentation only.

## Self-Check: PASSED

- FOUND: .planning/phases/08-quality-verification/08-TASTE-REPORT.md
- FOUND: .planning/phases/08-quality-verification/08-07-SUMMARY.md
- FOUND: commit ec52932
- `git diff --quiet -- src` passes. No preview processes from this worktree are running.
