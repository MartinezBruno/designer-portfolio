---
phase: 07-page-transitions-smooth-scroll
verified: 2026-11-05T00:00:00Z
status: gaps_found
score: 4/4 roadmap truths verified; 1 user-logged open gap (layout shift) remains
re_verification:
  previous_status: gaps_found
  previous_score: 2/4 verified (SC1 partial, SC2 failed)
  gaps_closed:
    - "CR-01 skip link / repeat Ask click soft-navigates Home and loses typed message (nav-focus.ts now changes only the hash)"
    - "WR-01 (old) no stale-navigation token in nav-focus (navToken added)"
    - "WR-02 (old) abandoned anchor target focused after Back (popstate and before-preparation cancel pending landing)"
    - "WR-03 (old) focus target not checked for focusability (ensureFocusable / focusWithFallback)"
    - "WR-04 (old) bundle gate only measured / and /es/ (now every built page)"
    - "Eager JS over 22,000 B ceiling (now 17,640 B max)"
    - "--t-wipe 480 ms, morph ghosting/blend, morph wrapper left in h1 (IN-01), collection drift, touch pressed feedback"
    - "Manual UAT (Safari 26, Firefox 159, VoiceOver, Figma wheel, real phone) approved by user at 07-17"
  gaps_remaining:
    - "Lazy contact form layout shift"
  regressions: []
gaps:
  - truth: "Moving through the site feels fluid; a visitor reading below #contact does not see content jump"
    status: failed
    reason: "User decision (A) at the 07-17 checkpoint: the lazily loaded contact form grows Home by 450 px (1440) / 793 px (390) when its chunk loads. A visitor already below #contact sees the footer jump. Introduced by 07-15 (lazy form) to meet the bundle ceiling, with no reserved height. Logged by the user as an open gap."
    artifacts:
      - path: "src/components/contact/ContactForm.astro"
        issue: "No height reserved for the form region before the lazy chunk mounts"
      - path: "src/lib/ui/contact-form-loader.ts"
        issue: "Triggers load on intent or proximity, but the region has no min-height matching the form"
    missing:
      - "Reserve the form's height in the region (per breakpoint, or measured/aspect placeholder) so mounting adds no layout shift"
      - "e2e or CLS check: scroll below #contact, trigger the load, assert footer top unchanged (+/- 1 px) at 1440 and 390"
    plan_with: "/gsd-plan-phase 7 --gaps"
advisory:
  - id: WR-01 (07-REVIEW)
    file: "src/lib/motion/nav-focus.ts:217-225"
    classification: "advisory, not a gap"
  - id: WR-02 (07-REVIEW)
    file: "src/lib/ui/contact-form-loader.ts:56-58"
    classification: "advisory, small fix recommended in the gap plan"
deferred: []
human_verification: []
---

# Phase 7: Page Transitions & Smooth Scroll Verification Report (re-verification)

**Phase Goal:** Moving through the site feels fluid: animated page transitions, inertial scrolling, and parallax. Keyboard users, screen-reader users, and find-in-page all keep working, and animations never leak between pages.
**Verified:** 2026-11-05
**Status:** gaps_found (one user-logged open gap; no roadmap truth failed)
**Re-verification:** Yes, after gap-closure plans 07-11..07-17

## What I checked myself

- Read the previous report (gaps: CR-01, WR-01 to WR-04, bundle 23,010 B, open user items) and 07-REVIEW.md (re-review, 0 critical).
- Read `src/lib/motion/nav-focus.ts`: CR-01 fix is present (lines 205-211 only set `next.hash`, so the router's `originalLocation.search` stays in sync). `navToken` bumped on before-swap and checked after release (lines 241-261). `popstate` and `astro:before-preparation` call `cancelPending` (lines 224-225). `ensureFocusable` and `focusWithFallback` exist.
- Re-ran `node scripts/measure-bundle.ts`: "bundle check ok", max 17,640 B on `/` across 20 pages (every built page now measured), ceiling 22,000. Earlier failing figure of 23,010 B is closed.
- `tests/e2e/anchors.spec.ts` contains the CR-01 scenario (skip-link coverage present); `collection-motion.spec.ts`, `contact-lazy.spec.ts`, `nav-feedback.spec.ts` exist.
- Did not re-run the e2e suite. Orchestrator reports build, 1,292 unit tests and lint green, and a full `pnpm verify` at 07-17 with one flaky End-key e2e (passes alone) and @network Turnstile run 1 accepted by the user.

## Observable Truths

| # | Truth (ROADMAP SC) | Status | Evidence |
|---|---|---|---|
| 1 | Animated transition; focus moves to the new page at release; title updates | VERIFIED | navigation.ts/lifecycle.ts/nav-focus.ts present; navToken guard, focusability fallback; wipe 480 ms; morph unwrapped; user UAT approved (Safari, Firefox, VoiceOver) |
| 2 | Smooth/inertial scroll and parallax; keyboard, anchors (focus) and find-in-page keep working | VERIFIED | CR-01 closed in code and covered by e2e; Lenis and CSS parallax present; keyboard CR-01 scenario and Figma wheel approved by user. Residual items WR-01/WR-02 are advisory (below) |
| 3 | 10-navigation test keeps listener/trigger counts constant | VERIFIED | tests/e2e/navigation-leaks.spec.ts unchanged and green per validation |
| 4 | Reduced motion and the Phase 6 toggle disable transitions, smooth scroll, parallax | VERIFIED | transitions-reduced / smooth-scroll / motion-toggle specs; parallax gated on `[data-motion='on']`; smooth scroll-behavior only set when state is `on` |

**Score:** 4/4 roadmap truths verified. One open gap (layout shift) logged by the user.

## Requirements Coverage

| Requirement | Status | Evidence |
|---|---|---|
| MOTN-05 | SATISFIED | Truth 1 |
| MOTN-06 | SATISFIED | Truth 2 (CR-01 closed) |
| MOTN-09 | SATISFIED | Truth 3 |

All three IDs appear in PLAN frontmatter (MOTN-05 in 13 occurrences, MOTN-06 in 10, MOTN-09 in 7), are defined in REQUIREMENTS.md (lines 71, 72, 75; traceability rows 159, 160, 163 "Phase 7 / Complete"), and no other ID is mapped to Phase 7. No orphans.

## Open Gap

1. **Lazy contact form layout shift (user decision A).** Home grows 450 px (1440) / 793 px (390) when the form chunk loads; a visitor already below #contact sees the footer jump. This undercuts "fluid" and is a regression introduced by 07-15's deferral. Fix: reserve the form's height. Plan via `/gsd-plan-phase 7 --gaps`.

## Assessment of 07-REVIEW warnings

**WR-01 (Back during an anchor glide still glides; nav-focus.ts:217-225): advisory, not a gap.**
Evidence: the review marks it [Inference] and not reproduced. It only occurs under motion state `on` (smooth is never set under reduced or off, so the reduced-motion truth is unaffected), within a window of up to 1200 ms after an anchor click, and only on a Back press in that window. Focus is no longer moved to the abandoned target (that half of the old WR-02 is closed and unit-tested), the scroll position is still restored correctly, and no state is lost. It is cosmetic motion, not a break of keyboard, find-in-page or restore. Suggested fix (restore scroll-behavior on first frame) can ride along in the gap plan; add an e2e only if reproduced.

**WR-02 (contact-form-loader focus handoff picks the first radio; contact-form-loader.ts:56-58): advisory, with a small fix recommended.**
Evidence: I confirmed the selector list at lines 56-58 returns the first match in document order, so the first service radio (unchecked) wins over the checked one, because `ServiceChips.astro:43` checks `other` and the chips come first in the form. Scope is narrow: only a keyboard user who focused the mailto fallback link while the chunk was still loading. Focus is not lost (it lands on a real control in the form), but the announced state is wrong, and CLAUDE.md treats accessibility as non-negotiable. It does not break the phase's named keyboard promises (anchors, skip link, scroll keys, page-transition focus), since it belongs to the contact form's lazy loading, not to scroll/transition focus. Not a phase-goal blocker, but it is a two-line fix, so I recommend folding it into the same gap plan as the layout-shift fix (query `:checked` first, then fall back; add a checked radio to the unit fixture).

Other review items IN-01..IN-07 are info only and are not gaps.

## Anti-Patterns

No TBD/FIXME/XXX introduced that I found in the reviewed nav-focus and loader files. User-accepted items: taste inspect FAILs (icon-cards, focal-point, empty-screens), one flaky End-key e2e (passes in isolation), @network run 1 accepted, grid drift reduced to 1.5%/1.3% by user decision.

## Human Verification

None outstanding. The user approved the 07-17 manual UAT (recorded in 07-VALIDATION.md); not re-requested.

## Gaps Summary

All previous gaps are closed: CR-01 and the nav-focus hardening are in code with e2e coverage, the bundle gate is green on every page (17,640 B vs 22,000 B), the wipe, morph, drift and pressed-feedback fixes landed, and manual UAT was signed off. One open gap remains by user decision: the lazy contact form causes a 450/793 px layout jump. Status is therefore `gaps_found` and the next step is `/gsd-plan-phase 7 --gaps`, bundling the small WR-02 selector fix and optionally the WR-01 rAF restore.

_Verified: 2026-11-05_
_Verifier: Claude (gsd-verifier)_
