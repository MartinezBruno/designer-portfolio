---
phase: 08-quality-verification
plan: 09
subsystem: planning-docs, quality-gate
tags: [d-19, validation, gate, docs-debt]
requires: [08-01, 08-02, 08-03, 08-04, 08-05, 08-06, 08-07, 08-08]
provides:
  - 08-VALIDATION.md (per-plan rows plus the 7-step combined gate)
  - planning docs synced with the verified state (D-19)
affects:
  - .planning/REQUIREMENTS.md
  - .planning/phases/06-scroll-interaction-motion/06-VERIFICATION.md
tech-stack:
  added: []
  patterns: []
key-files:
  created:
    - .planning/phases/08-quality-verification/08-VALIDATION.md
  modified:
    - .planning/phases/06-scroll-interaction-motion/06-VERIFICATION.md
    - .planning/REQUIREMENTS.md
decisions:
  - "STATE.md completed_phases was left at 7 / percent 88: it already equals the 7 Complete rows in the ROADMAP progress table"
  - "New @network flake keyboard-journeys.spec.ts:275 (EN) is recorded as a gap, not flaky: it is not on the 07-17 accepted list"
  - "QUAL-01 and QUAL-02 stay open pending the gap plans (LCP misses, A11Y-01, new flake). Phase 8 is not ready to complete"
metrics:
  duration: ~20 min
  completed: 2026-11-09
requirements-completed: []
---

# Phase 8 Plan 09: Planning-docs hygiene and the combined Phase 8 gate Summary

The D-19 planning-docs debt is fixed: 06-VERIFICATION is now `passed`, and HOME-02..05 and HOME-07 are ticked. The full gate ran on the combined Phase 8 result. Lint, unit, hermetic e2e (791 passed, 0 failed), secrets, bundle (`bundle check ok`, max eager 17,661 B) and Spanish-review freshness are green. One new @network keyboard-journey flake is recorded as a gap. QUAL-01 and QUAL-02 remain open until the gap plans land.

## Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Planning-docs hygiene (D-19) | e257bb5 | 06-VERIFICATION.md, REQUIREMENTS.md |
| 2 | Full gate plus 08-VALIDATION.md | 9c0739d | 08-VALIDATION.md |

## Task 1

- 06-VERIFICATION.md frontmatter `status: human_needed` was changed to `passed`, and a body line now cites 06-HUMAN-UAT 3/3 (2026-11-02).
- REQUIREMENTS.md: HOME-02, 03, 04, 05 and 07 are `[x]`, and their traceability rows say Complete. QUAL rows are untouched.
- STATE.md: no edit was needed. `completed_phases: 7` and `percent: 88` (7/8 = 87.5, rounded) already match the 7 Complete rows in the ROADMAP progress table.

## Task 2: gate results (main at e257bb5)

| Step | Command | Result |
|------|---------|--------|
| 1 | `pnpm lint` | pass (257 files, 0/0/0; ESLint and Prettier clean) |
| 2 | `pnpm test` | pass (71 files, 1312 tests) |
| 3 | `E2E_OFFLINE=1 pnpm test:e2e` | pass (908 run: 791 passed, 117 skipped, 0 failed, 0 flaky) |
| 4 | `playwright test -g "@network"` | **59/60**. `keyboard-journeys.spec.ts:275` EN failed once (`#contact-message` not focused after Tab). It passed 3/3 in isolation. It is not on the 07-17 list, so it is a **gap** |
| 5 | `pnpm check:secrets` | pass (1017 dist files) |
| 6 | `pnpm measure:bundle` | pass, "bundle check ok", max eager 17,661 B on / |
| 7 | `pnpm review:spanish` plus `git diff --exit-code` | pass (no diff) |

Staleness: 08-LIGHTHOUSE.md measured src commit `3424e61`, and `git log -1 --format=%h -- src` is still `3424e61`. The evidence is current. The gap fixes will change src/, so both Lighthouse and this gate must be re-run after them.

The security review base commit is recorded as **cf15eaf** (`git diff cf15eaf..HEAD`).

## Requirement status (not overstated)

- **QUAL-01: not met.** Home LCP 3,189 ms and detail LCP 3,637 ms miss the 2,500 ms budget, and the user chose "Fix". A gaps plan comes next, then a re-measure.
- **QUAL-02: open.** A11Y-01 is a confirmed defect (gaps plan), and the new @network keyboard-journey flake is a gap.
- **QUAL-03:** Spanish review file is generated and fresh (08-05). This plan does not tick it. The orchestrator handles it after phase verification.

## Deviations from Plan

**1. [Plan rule] Gate step 4 not green.** The @network run had 1 failure out of 60. The plan says "otherwise stop and report it as a gap". No product code was changed, as the plan requires. The failure is recorded in 08-VALIDATION.md and reported here. [Inference] It may be a focus race with the Turnstile iframe or a late hydration step under parallel load (5 workers). It was not investigated further in this plan.

**2. 08-VALIDATION.md `nyquist_compliant: false`.** Four plan tasks are human checkpoints with no automated command (08-06 T3, 08-07 T2, 08-08 T1/T3). Per the plan's rule, the flag must be false.

## Known Stubs

None. This plan changed docs only.

## Self-Check: PASSED

- FOUND: .planning/phases/08-quality-verification/08-VALIDATION.md
- FOUND: e257bb5, 9c0739d
