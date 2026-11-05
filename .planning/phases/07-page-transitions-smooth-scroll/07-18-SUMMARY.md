---
phase: 07-page-transitions-smooth-scroll
plan: 18
subsystem: contact
tags: [gap-closure, layout-shift, css, e2e, taste-gate]
requires: ["07-15", "07-17"]
provides:
  - Pre-mount height reserve for the lazy contact form (pure CSS, scripting-only)
  - Layout-shift regression e2e (held chunk below #contact) and no-JS no-blank-reserve guard
affects:
  - src/styles/global.css
  - tests/e2e/contact-lazy.spec.ts
tech-stack:
  added: []
  patterns:
    - "Reserve a lazily revealed block's height by stacking it invisibly (visibility: hidden) in the same grid cell as its visible fallback, gated on @media (scripting: enabled) and on the fallback not being [hidden]"
key-files:
  created:
    - .planning/phases/07-page-transitions-smooth-scroll/07-18-SUMMARY.md
  modified:
    - src/styles/global.css
    - tests/e2e/contact-lazy.spec.ts
decisions:
  - "The no-JS e2e measures the contact column's rendered content extent, not its box: from lg the grid stretches the column to the row height (the left column is taller), so box height != mailto block height even on unmodified main"
  - "Accepted trade-off: if the lazy chunk never loads, the mailto block stays on top with a form-height blank area below it"
metrics:
  duration: ~25 min
  completed: 2026-11-05
  tasks: 2
  files: 2
---

# Phase 7 Plan 18: Lazy contact form height reserve Summary

Mounting the lazy contact form no longer moves the footer. Before the mount, the hidden form is laid out invisibly (`visibility: hidden`) in the same grid cell as the visible mailto block. This happens only under `@media (scripting: enabled)` and only while `[data-contact-nojs]` is not hidden, so the column already has the form's real height when the chunk arrives.

## Tasks

| Task | Name | Commits |
| ---- | ---- | ------- |
| 1 | Failing layout-shift e2e and no-JS height test | b540dd1 |
| 2 | Scripting-only pre-mount stack, then taste review | 9fe7895 (fix), 0dbb2bf (capture settle), 96c84d3 (comment wording) |

## RED evidence (Task 1, before the CSS)

Fresh build at base 5876569. Footer document-top delta when the held `contact-form-boot` chunk is released below #contact:

| Case | Delta |
| ---- | ----- |
| 1440x900 `/` | 450 px |
| 1440x900 `/es/` | 450 px |
| 390x844 `/` | 793.19 px |
| 390x844 `/es/` | 793.19 px |
| 390x844 `/` reduced motion | 793.19 px |
| no-JS 1440 / 390 | pass (after the measurement fix below) |

## GREEN (Task 2)

- All 7 `07-18` tests pass. docTop, viewTop and scrollHeight deltas are all within 1 px at 1440x900 and 390x844, on `/` and `/es/`, plus the reduced-motion case. The no-JS column content equals the mailto block height within 1 px.
- Full verify list: `pnpm lint` exit 0 (astro check 0/0/0, eslint, prettier). Playwright contact-lazy, contact, contact-states, contact-preselect, a11y, anchors, transitions-reduced, motion-toggle and motion-pointer (`--grep-invert @network`): **156 passed**. `vitest tests/unit/contact-section.test.ts`: 25 passed.
- The built CSS contains the rule inside `@media (scripting:enabled)` (checked in `dist/client/_astro/BaseLayout.*.css`).

## Bundle

| Measurement | Max eager gzip |
| ----------- | -------------- |
| Baseline (same tree, after Task 1 build, before the global.css edit) | 17,640 B on `/` |
| After the 07-18 CSS | 17,640 B on `/` |

The result is `bundle check ok` (ceiling 22,000 B) with no change, as expected for a CSS-only change.

## Preservation checks

- **No-JS:** `scripting: none` never matches the rule, so the form stays `display: none` and the column is the mailto block's height. The no-JS e2e covers this.
- **Reduced motion / Phase 6 toggle:** the rule does not depend on motion. transitions-reduced and motion-toggle pass unchanged, and the reduced-motion layout-shift case passes.
- **Hit testing and a11y (T-07-40/42):** the form is `visibility: hidden`, and the no-JS block has `position: relative; z-index: 1`. The existing `toBeHidden()` pre-mount assertions and the a11y spec pass.
- **Failure path (T-07-41, accepted):** if the chunk never loads, the mailto block stays visible and on top, with a blank area of form height below it.
- **Known condition:** without a Turnstile site key the controller hides `[data-turnstile]`, which would shrink the mounted form by about 140 px and bring back a small shift. The e2e preview always has the test key, and production requires a key (07-05 deploy guard). This is recorded, not fixed.

## Taste gate

- **Skill:** the plan asks for the `taste-skill:taste-skill` skill via the Skill tool. That tool was not available in this executor environment, so SKILL.md and references/critique.md were read directly and their rules applied (see Deviations).
- **lint.mjs** `src/styles src/components/contact`: `0 FAIL, 0 WARN`.
- **inspect.mjs** (preview on 4321, output in `.taste-skill/inspect-07-18/{en,es}/`):

| URL | Codes | vs 07-17 |
| --- | ----- | -------- |
| `/` | FAIL `icon-cards`; WARN `hairline`, `palette-cream`, `first-action`, `no-footage` | same (accepted) |
| `/es/` | FAIL `icon-cards`; WARN `hairline`, `palette-cream`, `first-action`, `no-footage` | same (accepted) |

**No new FAIL.**

- **CAPTURE_CONTACT screenshots reviewed (8)**, in `.taste-skill/inspect/07-18/`: `1440x900-en-pre`, `1440x900-en-post`, `1440x900-es-pre`, `1440x900-es-post`, `390x844-en-pre`, `390x844-en-post`, `390x844-es-pre`, `390x844-es-post`. Also reviewed: inspect `en/desktop-page-01.jpg` and `en/mobile-page-01.jpg`.

```
ROUND 1
Seen in one second: "Tell me about your project" with the blue Email me / Send message pill
Idea (one sentence): a designer's own work, framed by ink page turns, leads every route (unchanged by this plan)
Live thing: the contact form itself (service chips preselected from "Ask about this")
Layout words by section: hero=split / services=grid / work=grid / tools=row / contact=split
Scores: design 7 · usability 7.5 · creativity 7 · content 7 → overall 7.1
Caps applied: inspect FAIL icon-cards on Home (accepted since Phase 3) caps overall at 6.0
Top three problems (most visible first):
1. Pre-mount 390 (390x844-en-pre / -es-pre): below the mailto block there is about 790 px of empty ground (the reserved form height). It reads as an unfinished section only if the chunk is still in flight. With the IntersectionObserver trigger at rootMargin 100% it usually mounts before the visitor arrives. Recorded as a finding for the user; no placeholder added, per the plan.
2. Pre-mount 1440 (1440x900-en-pre): the same empty area to the right below the "Email me" pill, about 450 px. Same reasoning.
3. Post-mount 1440 (1440x900-en-post): with the fake Turnstile widget, the 140 px Turnstile slot leaves a gap above the Send message button. This existed before 07-18 (the real widget fills it, see desktop-page-01) and is not changed here.
```

Post-mount, the form sits exactly where the blank area was, and the footer does not move (the e2e proves it to within 1 px).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] No-JS height test measured the stretched grid box**
- **Found during:** Task 1 (RED run)
- **Issue:** the plan's `columnBox.height - nojsBox.height <= 1` failed by 111.6 px at 1440 on unmodified main. From lg, `[data-contact-column]` is a grid item that stretches to the row height, and the left invitation column is taller.
- **Fix:** measure the column's rendered content extent instead: from the column's top to the lowest child with client rects. A laid-out invisible form would still push this past the mailto block, so the guard keeps its purpose.
- **Files modified:** tests/e2e/contact-lazy.spec.ts
- **Commit:** b540dd1

**2. [Rule 1 - Bug] CAPTURE_CONTACT shots were taken mid-reveal**
- **Found during:** Task 2 taste review. The first captures showed the contact text faded or missing.
- **Fix:** `captureContact` now calls `settleMotion(page)` after scrolling #contact into view. This is a capture-only path and does not affect the assertions.
- **Commit:** 0dbb2bf (a separate test commit, so the Task 2 fix commit touches only global.css)

**3. Comment wording for the acceptance grep**
- The block comment contained the literal "scripting: enabled", which made `grep -n "scripting: enabled"` print two lines. The comment was reworded. Commit 96c84d3.

**4. Taste skill invoked by reading, not through the Skill tool**
- No Skill tool was exposed to this executor. SKILL.md and critique.md were read directly, and lint.mjs and inspect.mjs were run as specified.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: src/styles/global.css (07-18 block, one `scripting: enabled` line, 4 `:has` selectors)
- FOUND: tests/e2e/contact-lazy.spec.ts (`no layout shift when the lazy form mounts (07-18)`)
- FOUND commits: b540dd1, 9fe7895, 0dbb2bf, 96c84d3
