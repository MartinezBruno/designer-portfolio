# Phase 07 deferred items

## Found during 07-20 (out of scope, not fixed)

- **tests/e2e/smooth-scroll.spec.ts:136 "keyboard: PageDown, Space, End and Home scroll natively" fails on the wave-3 base build (dda1a57).** After `End`, `scrollHeight - innerHeight - ceil(scrollY)` is 6 px, but the test allows at most 2. It reproduces 3/3 with the base `nav-focus.ts` and 5/5 with the 07-20 fix, so 07-20 did not cause it. [Inference] The page height probably changes after `End` lands, for example the lazy contact form mounting inside the 07-18 height reserve. Not verified; the next step is to compare the reserve height with the mounted form height at 1440x900.

## Resolved in 07-21

- **smooth-scroll End (above): fixed.** Cause: the real compact Turnstile widget is an inline 150x140 iframe; the slot's inherited 24 px line box added a 6 px descent, so the slot became 146 px against its 140 px reserve and the page grew 6 px after `End`. The 07-18 e2e missed it because its fake widget had no height. Fix 1cebe5d (`leading-[0]` on `[data-turnstile]`), regression e2e dc51612 (`contact-lazy.spec.ts -g "07-21"`). End test 5/5 in isolation and green in the full run.
