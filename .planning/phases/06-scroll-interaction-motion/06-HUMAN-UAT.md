---
status: partial
phase: 06-scroll-interaction-motion
source: [06-VERIFICATION.md]
started: 2026-11-02T14:31:48Z
updated: 2026-11-02T14:31:48Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. CR-01: magnetic zones after reveal
expected: Hovering a below-the-fold magnetic control ("See all projects", contact submit, detail contact band, "View on Behance") after its reveal settles pulls relative to its true visual centre; pointer at centre gives ~0 offset.
result: [pending]

### 2. WR-01: late-armed lines headings reveal
expected: A lines heading in the bottom 12% of the first screen, or armed after GSAP loads late, or with reduced toggled while GSAP loads, reveals without needing a scroll.
result: [pending]

### 3. WR-05: hero and failsafe timing on real loads
expected: Hero plays once on a real (incl. throttled) load without snapping to end mid-sequence; reveal failsafe timing correct; switching reduced → on does not replay the hero.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
