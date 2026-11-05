---
phase: 07-page-transitions-smooth-scroll
verified: 2026-11-04T00:00:00Z
status: gaps_found
score: 3/4 roadmap truths verified (SC2 partial)
gaps:
  - truth: "Keyboard users keep working: anchor links and skip link move focus without losing state (SC2)"
    status: failed
    reason: "CR-01 (07-REVIEW.md): nav-focus.ts:166 replaceState rewrites ?service= behind the ClientRouter, desyncing its originalLocation. A second Ask-about-this click or the skip link then soft-navigates Home onto itself, wipes the page and loses the typed message. Code confirmed present. Not covered by the e2e test."
    artifacts:
      - path: "src/lib/motion/nav-focus.ts"
        issue: "history.replaceState changes the search part of the URL; router same-page check compares against stale originalLocation"
    missing:
      - "Keep the search part unchanged (update only the hash) or take over all same-pathname hash clicks locally when ?service= is present"
      - "e2e: Ask, type a message, Ask again, press skip link, assert marker/vtCount/message unchanged"
  - truth: "After navigation focus moves to the new page at release, never earlier or lost (SC1)"
    status: partial
    reason: "WR-01: nav-focus onPageLoad has no stale-navigation token, so overlapping navigations can focus early. WR-03: focus target not checked for focusability, so focus can fall to body."
    artifacts:
      - path: "src/lib/motion/nav-focus.ts"
        issue: "lines 193-199 and 17-39"
    missing:
      - "navToken guard as in lifecycle.ts"
      - "tabindex=-1 fallback or fall through to main h1/#main"
  - truth: "Anchor glide never lands focus on an abandoned target (SC2)"
    status: partial
    reason: "WR-02: pending glide and inline scroll-behavior smooth are not cancelled on popstate or before-preparation, so Back can glide and then focus the old anchor."
    artifacts:
      - path: "src/lib/motion/nav-focus.ts"
        issue: "cancelPending only on new click or unbind"
    missing:
      - "cancelPending on popstate and astro:before-preparation"
  - truth: "Phase gate: eager JS stays under 22,000 B ceiling (07-10 / bundle guard)"
    status: failed
    reason: "07-10-SUMMARY records 23,010 B against the 22,000 B ceiling and pnpm measure:bundle exits 1 (user kept the ceiling and chose to defer deferrable chunks). I did not re-run the script (timeout binary absent in this environment); relied on the summary figure. WR-04: the gate only measures / and /es/."
    artifacts:
      - path: "scripts/measure-bundle.ts"
        issue: "PAGES lists only the two home pages"
    missing:
      - "Lazy-load deferrable eager chunks (ContactForm 6,652 B first) until exit 0"
      - "Measure detail, projects and 404 routes too"
  - truth: "Open items the user flagged at the 07-10 checkpoint"
    status: failed
    reason: "Per 07-10-SUMMARY Gaps for closure: --t-wipe to 480 ms, CollectionModule grid motion, morph without ghosting and without difference blend, touch latency (cold-cache median 538.5 ms), and manual Safari 26 / Firefox 159 / VoiceOver (Q6) / morph engine fallback (Q7) / real Figma embed wheel UAT are all pending. They are user decisions, not deferred to a later phase."
    artifacts: []
    missing:
      - "Implement the four fixes, then run the manual UAT"
deferred: []
human_verification:
  - test: "Safari 26 and Firefox 159: wipe, morph, back wipe, parallax, Lenis glide, find bar"
    expected: "Transitions, parallax and smooth scroll work or degrade gracefully; find-in-page still works"
    why_human: "Cross-browser visual behavior"
  - test: "VoiceOver: navigate between pages"
    expected: "New page title/h1 announced once, no double announcement"
    why_human: "Screen reader behavior"
  - test: "Real Figma embed wheel scroll on a detail page"
    expected: "Wheel scrolls the page, never stuck in the embed"
    why_human: "External service"
---

# Phase 7: Page Transitions & Smooth Scroll Verification Report

**Phase Goal:** Moving through the site feels fluid: animated page transitions, inertial scrolling, and parallax. Keyboard users, screen-reader users, and find-in-page all keep working, and animations never leak between pages.
**Status:** gaps_found
**Re-verification:** No, initial verification
**Method note:** I read 07-REVIEW.md, 07-10-SUMMARY.md and 07-VALIDATION.md, and I spot-checked the code (nav-focus.ts replaceState, CSS parallax, the leak spec, and the presence of dist/ and the motion modules). I did not re-run the e2e suite or the bundle script. Test counts (lint 0, 1242/1242 unit) are from the caller.

## Observable Truths

| # | Truth (ROADMAP SC) | Status | Evidence |
|---|---|---|---|
| 1 | Animated transition; focus moves to new page; title updates | PARTIAL | Navigation, tokens, lifecycle and nav-focus modules exist; the validation map shows green e2e (transitions.spec.ts). Focus timing and lost-focus edge cases open (WR-01, WR-03). |
| 2 | Smooth/inertial scroll with parallax; keyboard, anchors (focus) and find-in-page work | FAILED (BLOCKER) | smooth-scroll.ts, load-lenis.ts and CSS `animation-timeline` parallax exist (global.css:457). But CR-01 breaks the skip link and a repeat anchor click after Ask-about-this, and it loses typed state. WR-02 adds a stale-focus problem on Back. |
| 3 | 10-navigation test shows constant listener/ScrollTrigger counts | VERIFIED | tests/e2e/navigation-leaks.spec.ts (10 counted navigations plus warm-up, CDP counts per URL); validation map green. |
| 4 | Reduced motion and the Phase 6 toggle disable transitions, smooth scroll, parallax | VERIFIED (automated) | transitions-reduced.spec.ts and smooth-scroll.spec.ts are green per the validation map; parallax is gated on `[data-motion='on']` (global.css:458). Browser UAT pending. |

**Score:** 2 verified, 1 partial, 1 failed.

## Requirements Coverage

| Requirement | Description | Status | Evidence |
|---|---|---|---|
| MOTN-05 | Animated transitions; focus moves and title updates | PARTIAL | The core works. The focus races and the lost-focus case remain (WR-01, WR-03), and the wipe length, morph quality and touch latency items are open. |
| MOTN-06 | Smooth scroll plus parallax without breaking keyboard, anchors or find-in-page | BLOCKED | CR-01, WR-02. |
| MOTN-09 | No leaks or duplication across navigations | SATISFIED | navigation-leaks.spec.ts. |

All three IDs (MOTN-05, MOTN-06, MOTN-09) appear in REQUIREMENTS.md, and no extra IDs are orphaned for Phase 7. The REQUIREMENTS.md checkboxes are still unchecked.

## Anti-Patterns and Review Findings

| Item | Severity | Impact |
|---|---|---|
| CR-01 replaceState desync (nav-focus.ts:166) | BLOCKER | Skip link or repeat Ask click reloads Home and loses the typed message |
| WR-01 no navToken in nav-focus | WARNING | Early or wrong focus on overlapping navigations |
| WR-02 glide not cancelled on history traversal | WARNING | Back can glide and focus a stale anchor |
| WR-03 focus target not checked for focusability | WARNING | Focus can drop to body |
| WR-04 bundle gate only measures `/` and `/es/` | WARNING | Ceiling not enforced on other routes |
| IN-01 morph span left in h1 | INFO | DOM differs between soft nav and full load |
| Eager JS 23,010 B > 22,000 B (per SUMMARY) | BLOCKER for the gate | `pnpm measure:bundle` exits 1 |

## Human Verification Required

1. Safari 26 and Firefox 159 for the wipe, morph, back wipe, parallax, Lenis glide and find bar.
2. VoiceOver for a double announcement (Q6), the morph engine fallback (Q7), and the real Figma embed wheel.

These are deliberately held until after the fixes.

## Gaps Summary

Most of the phase is built and automated tests are green: transitions, the cursor, Lenis, parallax and the leak contract. The goal's keyboard promise is not met. CR-01 is a real, code-confirmed defect that breaks the skip link and loses user input. Focus handling (WR-01 to WR-03) needs hardening. The bundle ceiling check fails at 23,010 B, and the user-listed fixes (--t-wipe 480 ms, CollectionModule motion, morph ghosting and blend, touch latency) and the manual UAT are still outstanding. No later milestone phase covers these, so nothing is deferred. Run `/gsd:plan-phase 7 --gaps`.

_Verified: 2026-11-04_
_Verifier: Claude (gsd-verifier)_
