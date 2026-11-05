# Phase 07 deferred items

## Found during 07-20 (out of scope, not fixed)

- **tests/e2e/smooth-scroll.spec.ts:136 "keyboard: PageDown, Space, End and Home scroll natively" fails on the wave-3 base build (dda1a57).** After `End`, `scrollHeight - innerHeight - ceil(scrollY)` is 6 px, but the test allows at most 2. It reproduces 3/3 with the base `nav-focus.ts` and 5/5 with the 07-20 fix, so 07-20 did not cause it. [Inference] The page height probably changes after `End` lands, for example the lazy contact form mounting inside the 07-18 height reserve. Not verified; the next step is to compare the reserve height with the mounted form height at 1440x900.
