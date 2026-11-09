---
phase: 08-quality-verification
verified: 2026-11-09T00:00:00Z
status: gaps_found
score: 1/3 roadmap success criteria verified (QUAL-03 met; QUAL-01 and QUAL-02 unmet)
overrides_applied: 0
gaps:
  - truth: "Mobile Lighthouse results for Home and a heavy detail page are recorded against the budget (LCP < 2.5 s, CLS < 0.1, homepage JS ~100 KB gz); regressions are fixed or documented (QUAL-01)"
    status: failed
    reason: "Measurement is recorded (08-LIGHTHOUSE.md) but LCP misses budget on both pages: Home median 3,189 ms, heaviest detail (/projects/website-reciclick/) 3,637 ms vs < 2,500 ms. The user chose 'fix' for both, so the regression is neither fixed nor accepted as documented. CLS 0, TBT 0 and JS 60,022 B gz pass."
    artifacts:
      - path: ".planning/phases/08-quality-verification/08-LIGHTHOUSE.md"
        issue: "LCP miss on Home and detail; no fix plan executed; no re-measure"
    missing:
      - "Fix Home LCP: LCP element is hero lead <p data-hero-lead>, element render delay ~1,012 ms observed (text hidden or animated at load; check motion gate/SplitText reveal and render-blocking BaseLayout CSS 54.7 KB)"
      - "Fix detail LCP: LCP element is first project image; observed LCP is only 74 ms, so the simulated 3.6 s is dominated by the shared render-blocking CSS, fonts and JS payload; all 7 detail pages measured 3.4-4.0 s"
      - "Re-run mobile Lighthouse (pinned 13.6.0, median of 5, Home + heaviest detail) after the fix and update 08-LIGHTHOUSE.md; re-run pnpm measure:bundle"
  - truth: "Every page passes axe in EN and ES and is fully usable by keyboard alone (QUAL-02)"
    status: failed
    reason: "Axe sweep and keyboard journeys exist and passed in the hermetic gate (791 passed, 0 failed), and the manual Tab pass was approved. But (a) A11Y-01, a user-confirmed accessibility defect (work-card cover mask stays clip-path inset(0 0 100%) so the image is invisible while on screen after an instant jump), is unfixed; (b) the @network keyboard-journeys.spec.ts:275 contact journey failed 1 of 60 and is recorded as a gap; (c) the review's WR-01 shows the marquee pause control's first activation resumes motion for hover/focus users, which weakens the WCAG 2.2.2 pause mechanism."
    artifacts:
      - path: "src/components/ui (work card / Latest work cover mask)"
        issue: "A11Y-01: mask opens only when the card's top enters the viewport"
      - path: "tests/e2e/keyboard-journeys.spec.ts"
        issue: "Line ~275 test fills the form before the Turnstile widget finishes loading (WR-03); flaky under parallel load"
      - path: "src/lib/motion/marquee.ts"
        issue: "Lines 41-45: aria-pressed = explicit ?? (hovered || focused); WR-01 unfixed"
    missing:
      - "Open work-card cover mask on any intersection (not only top entering); add a regression test using scrollIntoViewIfNeeded / deep-link then scroll up at 390 and 1440"
      - "Stabilise the @network contact journey: wait for the Turnstile widget before typing (WR-03); re-run @network 60/60"
      - "Resolve WR-01: expose only the explicit user choice in aria-pressed and make the first activation always pause (or record an explicit decision to accept); update the tests that encode the current behaviour (home-story.spec.ts, keyboard-journeys.spec.ts:157-162)"
      - "Re-run the full gate after the fixes (src will change)"
  - truth: "Server-rendered ES 404 does not consume request-controlled path (hardening, not a must-have blocker)"
    status: partial
    reason: "WR-02 unfixed: BaseLayout.astro:27 uses Astro.url.pathname, and src/pages/es/404.astro is prerender=false, so the request path reaches SeoHead/SiteHeader/LanguageSwitcher. No exploitable path found by the review; documented invariant is false."
    artifacts:
      - path: "src/layouts/BaseLayout.astro"
        issue: "pathname = Astro.url.pathname for kind notFound"
    missing:
      - "Pin the pathname for notFound pages (review fix), update SeoHead/NotFoundView comments"
deferred: []
---

# Phase 8: Quality Verification Report

**Phase Goal:** The finished v1 local build is shown, by measurement, to be fast, accessible in both languages, and ready for Martina to review the Spanish copy.
**Verified:** 2026-11-09
**Status:** gaps_found
**Re-verification:** No, initial verification

I did not run Lighthouse, servers or the full e2e suite. Gate evidence comes from 08-09 (commit e257bb5); only docs changed afterward (`git log -- src` last commit is 3424e61, which predates the gate).

## Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Mobile Lighthouse for Home and heavy detail recorded against budget; regressions fixed or documented | FAILED (BLOCKER) | 08-LIGHTHOUSE.md records pinned LH 13.6.0, median of 5. Home LCP 3,189 ms and detail 3,637 ms exceed 2,500 ms. User chose "fix", no fix landed. CLS 0, TBT 0, JS 60,022 B gz pass. No override exists. |
| 2 | Every page passes axe in EN and ES and is keyboard usable (form, filters, toggles, nav) | FAILED (BLOCKER) | a11y-sweep and keyboard-journeys specs exist and passed in the hermetic gate. Open: A11Y-01 (confirmed defect), @network contact journey failed 1/60, WR-01 pause-control semantics. |
| 3 | Every copy string has a Spanish draft marked for review, listed in one place | VERIFIED | 08-SPANISH-REVIEW.md is generated by scripts/spanish-review.ts, every row "draft, for Martina's review", with sections for UI dictionary and others, scope note on Behance content (I18N-09, v2). Freshness is covered by tests/unit/spanish-review.test.ts; gate step 7 showed no diff (reported in 08-09). |

**Score:** 1/3

## Requirements Coverage

| Requirement | Source Plans | Status | Evidence |
|-------------|--------------|--------|----------|
| QUAL-01 | 08-07, 08-08, 08-09 | BLOCKED | LCP budget missed on both measured pages; fix plan pending; REQUIREMENTS.md still unchecked (correct) |
| QUAL-02 | 08-01, 02, 03, 04, 06, 07, 09 | BLOCKED | A11Y-01, @network flake, WR-01 open; REQUIREMENTS.md unchecked (correct) |
| QUAL-03 | 08-05, 08-09 | SATISFIED | Spanish review file and coverage/freshness test. REQUIREMENTS.md still shows QUAL-03 `[ ]`/Pending and should be ticked by the orchestrator |

All three IDs are claimed by plans; no orphaned Phase 8 requirements.

## Review warnings vs must-haves

- WR-01 (marquee aria-pressed): code at src/lib/motion/marquee.ts:41-45 still ties aria-pressed to hover/focus. Affects QUAL-02 (usable by keyboard, pause mechanism). Counted as a gap.
- WR-02 (/es/404 pathname): confirmed unfixed at src/layouts/BaseLayout.astro:27. Hardening only; no must-have fails. Listed as partial.
- WR-03 (flake cause): matches the open @network failure. Counted under QUAL-02.

## Human checks done

08-06 manual Tab pass approved by user 2026-11-09; 08-07 taste decisions recorded (T-01, T-02, T-04 deferred as taste follow-ups, out of Phase 8 scope).

## Gaps Summary

Two roadmap criteria are unmet. QUAL-01 needs a performance fix and re-measure (Home LCP element is the hero lead text with ~1 s render delay; detail pages are held back by the shared render-blocking CSS, fonts and JS), then a Lighthouse re-run. QUAL-02 needs the A11Y-01 mask fix, a stable @network contact journey (WR-03), and a decision or fix on WR-01. After those changes, re-run the full gate and Lighthouse because src will change. QUAL-03 is complete.

_Verified: 2026-11-09_
_Verifier: Claude (gsd-verifier)_
