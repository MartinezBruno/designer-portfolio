---
phase: 08-quality-verification
plan: 06
subsystem: testing-a11y
tags: [a11y, keyboard, e2e, playwright, qual-02, d-09]
requires:
  - 08-01 (marquee pause controller)
  - 08-02 (skip link, /es/404/)
  - 08-04 (helpers/axe.ts, trimmed a11y.spec.ts)
provides:
  - tests/e2e/helpers/keyboard.ts (Step, headerSteps, projectsHrefFor, tabAndExpect, tabUntil)
  - dual-locale keyboard-only journeys for every D-09 item
  - signed-off manual Tab pass in EN and ES
affects:
  - tests/e2e/a11y.spec.ts
tech-stack:
  added: []
  patterns:
    - "Keyboard journeys use page.keyboard only: no .click() and no .focus()"
    - "tabUntil(selector, { max, reverse }) as the shared way to reach a control by real keyboard focus"
    - "Turnstile blocked for hermetic contact journeys; only the success journey carries @network"
key-files:
  created:
    - tests/e2e/helpers/keyboard.ts
    - tests/e2e/keyboard-journeys.spec.ts
  modified:
    - tests/e2e/a11y.spec.ts
decisions:
  - "D-09 marquee journey asserts the 08-01 contract: keyboard focus pauses, Space resumes, Space pauses, and the explicit pause holds after Tab"
  - "PROJ-04..07 filters are N/A at 7 projects (fewer than 8): no filter controls exist, so there is nothing to test"
metrics:
  duration: ~10 min automated, plus the manual pass
  completed: 2026-11-09
  tasks: 3
  files: 3
---

# Phase 8 Plan 06: Keyboard-only journeys in EN and ES Summary

Every D-09 interactive journey is now covered by a keyboard-only Playwright test in EN and ES. The tests use a shared keyboard helper (visible-focus checks plus `tabUntil`). The user also did a manual Tab pass in both languages and approved it.

## What was built

- **tests/e2e/helpers/keyboard.ts**: `Step`, `headerSteps`, `projectsHrefFor` and `tabAndExpect` moved out of a11y.spec.ts. `tabUntil` is new and takes a configurable maximum and an optional reverse (Shift+Tab). a11y.spec.ts imports them and behaves exactly as before.
- **tests/e2e/keyboard-journeys.spec.ts** (10 journeys per locale, with a console-error guard on each):
  1. The skip link takes focus to `#main`.
  2. Header nav: every stop shows visible focus (`tabAndExpect`).
  3. The language switch lands on the equivalent page in the other locale, with `lang` set and `main h1` focused.
  4. The motion toggle cycles on → reduced → on with Enter and Space. It keeps focus and its focus ring stays visible.
  5. Marquee: focus pauses it, Space resumes, Space pauses again, and the pause holds after Tab moves away (`aria-pressed` and the animation play state are checked together).
  6. Projects card → detail → next → previous, with `main h1` focused after each navigation.
  7. On the embed facade, Enter loads the (stubbed) Figma iframe and focus moves into the IFRAME.
  8. "Ask about this" checks `#contact-service-<id>`, the section is in view and focused, and the next Tab stays inside #contact (Turnstile blocked).
  9. Submitting the empty form sets `aria-invalid="true"` on name, email and message, shows `#contact-name-error` and focuses `#contact-name` (Turnstile blocked).
  10. `@network`: select a service with ArrowRight, type the fields, wait for a real test-key token, and send. Focus lands on the success h3. "Send another message" brings back an empty form with "other" checked and focus on name.

## Automated results (2026-11-09, fresh `pnpm build`, private port 4484)

| Run | Result |
|-----|--------|
| `E2E_OFFLINE=1` keyboard-journeys.spec.ts + a11y.spec.ts | 46/46 passed (18 journeys + 28 a11y) |
| keyboard-journeys.spec.ts `-g "@network"` | 2/2 passed (EN, ES) |
| `pnpm exec eslint tests/e2e` | clean |
| `pnpm check` | 0 errors, 0 warnings, 0 hints |
| Prettier on the three files | clean |

## Filters (PROJ-04..07)

N/A. There are 7 projects, fewer than the 8 needed for filters, so the Projects page renders no filter controls and there is nothing to test. I recorded this here on purpose so the gap is visible.

## Manual Tab pass

- **Result:** approved by the user on 2026-11-09, with no issues reported (their reply: "aprroved").
- **Scope:** EN and ES, keyboard only (Tab, Shift+Tab, Enter, Space, arrow keys). For each page the user checked three things: focus always visible, no traps, and focus on the page heading after following a link.
  1. `/`: skip link, header, marquee band, latest work, services "Ask about this", contact form, footer
  2. `/projects/`: header and every card
  3. One detail page (for example `/projects/portfolio-web/`): previous/next, the prototype "load" button, the Behance link
  4. `/does-not-exist`: the home link
  5. The same in Spanish: `/es/`, `/es/projects/`, one `/es/projects/...` page, `/es/404/`
- No screen reader was used (D-09).

## Deviations from Plan

1. **[Rule 1 - Test expectation] Marquee journey follows the 08-01 controller.** The plan said "Space gives aria-pressed 'true'". Under 08-01, keyboard focus alone already pauses the band, so the test asserts focus pauses, Space resumes, Space pauses again, and the pause holds after Tab. This matches home-story.spec.ts. Test-only, no site code changed. Commit f60185b.
2. **[Rule 3 - Reuse] `headerSteps` and `projectsHrefFor` also moved** to helpers/keyboard.ts, alongside the planned `Step` and `tabAndExpect`, so journey 2 can reuse the header order. a11y.spec.ts imports them. Commit f60185b.
3. **[Rule 1 - Test hygiene] The console-error guard ignores the deliberately blocked Turnstile.** The blocked-Turnstile journeys skip `challenges.cloudflare.com` / `net::ERR_FAILED` resource logs, because the test aborts that request on purpose. Every other console or page error still fails the test. Commit 8837f77.
4. **[Rule 3 - Blocking] Worktree base reset.** The executor worktree started at ff5bf7c instead of the expected base, so it was hard-reset to f504901 per the branch-check protocol. The tree was clean before the reset.

No keyboard defect was found in site code, and no `src/` file changed.

## Threat model

- T-08-11: the @network run went through `scripts/e2e-preview-env.ts` (console mailer, Turnstile test keys). No real email was sent.
- T-08-12: the @network journey ran as its own command and passed. It is reported separately above.

## Known Stubs

None.

## Commits

- f60185b: test(08-06): add keyboard nav and project journeys
- 8837f77: test(08-06): add keyboard contact form journeys

## Self-Check: PASSED

- FOUND: tests/e2e/helpers/keyboard.ts
- FOUND: tests/e2e/keyboard-journeys.spec.ts
- FOUND: f60185b
- FOUND: 8837f77
