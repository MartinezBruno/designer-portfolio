---
phase: 07-page-transitions-smooth-scroll
verified: 2026-11-05T21:00:00Z
status: passed
score: 4/4 roadmap truths verified; previous gap closed
re_verification:
  previous_status: gaps_found
  previous_score: 4/4 roadmap truths, 1 open gap (lazy contact form layout shift)
  gaps_closed:
    - "Lazy contact form layout shift (07-18 reserve; e2e asserts footer delta <= 1 px at 1440 and 390, en and es, plus reduced)"
    - "WR-02 contact-form-loader focus handoff now queries the checked service chip first (07-19)"
    - "Press-deferred mount so a mailto press is not lost (07-19)"
    - "WR-01 Back during anchor glide: inline scroll-behavior restored on first scroll event, history re-pinned (07-20)"
    - "6 px Turnstile slot overflow found by the real widget, fixed in 1cebe5d (07-21)"
  gaps_remaining: []
  regressions: []
gaps: []
deferred: []
human_verification: []
---

# Phase 7: Page Transitions & Smooth Scroll Verification Report (re-verification 2)

**Phase Goal:** Moving through the site feels fluid: animated page transitions, inertial scrolling, and parallax. Keyboard users, screen-reader users, and find-in-page keep working, and animations never leak between pages.
**Verified:** 2026-11-05
**Status:** passed
**Re-verification:** Yes, after gap-closure plans 07-18..07-21

## What I checked myself

- Read the previous report: one open gap (contact form layout shift) plus advisories WR-01/WR-02.
- Ran `pnpm vitest run`: 71 files, 1308 tests, all passed (matches the 07-21 claim).
- Code evidence for each closed item:
  - Reserve: `src/styles/global.css` ~line 675 holds the "Contact form height reserve (07-18)" rule; `tests/e2e/contact-lazy.spec.ts` has the 07-18 block (line 223) and the 07-21 real-widget block (line 282), which exist with taste screenshots wired.
  - WR-02: `src/lib/ui/contact-form-loader.ts` lines 61-69 query `input[name="service"]:checked` before the generic list.
  - WR-01: `src/lib/motion/nav-focus.ts` lines 164-207 restore the inline `scroll-behavior` on the glide's first scroll event and on cancel.
- 07-VALIDATION.md rows 07-18..07-21 are marked green with concrete results (layout-shift 21/21, 0 px deltas with the real Turnstile widget, 807 e2e passed / 0 failed, leak test 2/2, bundle 17,918 B vs 22,000 B ceiling, taste gate no new FAIL). I did not re-run e2e (per instructions); these are recorded results, backed by the test files above.
- No TBD/FIXME/XXX in the loader or nav-focus files.

## Observable Truths

| # | Truth (ROADMAP SC) | Status | Evidence |
|---|---|---|---|
| 1 | Animated transition; focus moves to the new page; title updates | VERIFIED | Unchanged by gap diff except the loader focus handoff; UAT approved at 07-17 (Safari, Firefox, VoiceOver); nav-focus/navigation unit tests green |
| 2 | Smooth/inertial scroll and parallax; keyboard, anchors (focus), find-in-page keep working; no jump from lazy content | VERIFIED | CR-01 closed earlier; WR-01 fixed in 07-20 with unit and anchors e2e; layout-shift gap closed by 07-18 with e2e deltas <= 1 px (0 px measured with the real widget) |
| 3 | 10-navigation test keeps listener/trigger counts constant | VERIFIED | `navigation-leaks.spec.ts` 2/2 after 07-19 added press listeners (removed on mount, failure, cleanup) |
| 4 | Reduced motion and the Phase 6 toggle disable transitions, smooth scroll, parallax | VERIFIED | Specs green in the 07-21 full run; 07-20 only restores a value it set under `on`; reserve test includes the reduced case |

**Score:** 4/4

## Requirements Coverage

| Requirement | Status | Evidence |
|---|---|---|
| MOTN-05 | SATISFIED | Truth 1 |
| MOTN-06 | SATISFIED | Truth 2 |
| MOTN-09 | SATISFIED | Truth 3 |

All three IDs are in the PLAN frontmatter, defined in REQUIREMENTS.md (lines 71, 72, 75; traceability rows 159, 160, 163 "Phase 7 / Complete"). No other ID is mapped to Phase 7; no orphans.

## Anti-Patterns

None blocking. User-accepted items remain: taste inspect FAILs (icon-cards, focal-point, empty-screens), @network run-1 acceptance.

## Human Verification

None outstanding. The 07-17 manual UAT was approved by the user. The gap-closure diff touched the contact loader, a CSS reserve and an anchor-glide scroll-behavior restore. None of these invalidate the Safari/Firefox/VoiceOver/Figma/pressed-cue checks.

## Non-blocking note

07-VALIDATION.md still shows `nyquist_compliant` unset and a Wave 0 line "manual Safari/Firefox pending", both stale bookkeeping. The manual UAT rows record approval. Housekeeping only.

## Gaps Summary

None. The layout-shift gap and both advisories are closed in code, with automated checks that would fail on regression. The phase goal is achieved.

_Verified: 2026-11-05_
_Verifier: Claude (gsd-verifier)_
