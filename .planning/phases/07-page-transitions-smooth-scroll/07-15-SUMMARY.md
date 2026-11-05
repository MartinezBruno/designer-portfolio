---
phase: 07-page-transitions-smooth-scroll
plan: 15
subsystem: contact / bundle budget
tags: [perf, lazy-loading, contact-form, a11y, gap-closure]
requires: ["07-11", "07-12", "07-13"]
provides:
  - "createLazyContactForm(load): PageInit (eager, small)"
  - "contactFormInit lazy boot chunk"
  - "openContactForm e2e helper"
affects:
  - src/components/contact/ContactForm.astro
  - tests/e2e (contact, anchors, a11y)
tech-stack:
  added: []
  patterns:
    - "On-demand PageInit loader: IntersectionObserver (rootMargin 0px 0px 100% 0px) + capture focusin/pointerdown on one AbortController, dead flag, one retry"
key-files:
  created:
    - src/lib/ui/contact-form-loader.ts
    - src/lib/ui/contact-form-boot.ts
    - tests/unit/contact-form-loader.test.ts
    - tests/e2e/helpers/contact.ts
    - tests/e2e/contact-lazy.spec.ts
  modified:
    - src/components/contact/ContactForm.astro
    - tests/e2e/contact.spec.ts
    - tests/e2e/anchors.spec.ts
    - tests/e2e/a11y.spec.ts
decisions:
  - "Contact form controller loads on demand; EAGER_CEILING_GZIP stays 22_000"
  - "Loader hands focus to the form when the focused mailto link is hidden on mount"
  - "Task 3 (cursor/tooltips deferral) not needed: max eager 17,562 B"
metrics:
  duration: "~15 min"
  completed: 2026-11-04
  tasks: 3 (Task 3 gate check only)
  files: 9
---

# Phase 7 Plan 15: Lazy Contact Form Controller Summary

The contact form controller (Actions client, Turnstile loader, validation UI) now loads through a small eager loader. It loads when `#contact` comes within one viewport, on the first focusin or pointerdown inside the section, or at once for `#contact` / `?service=`. That drops Home's eager JS from 23,229 B to 17,562 B gzip -9. The 22,000 B ceiling is unchanged.

## Tasks

| Task | Name | Commits |
| ---- | ---- | ------- |
| 1 | Lazy loader and boot chunk (TDD) | cda2648 (RED), b308cbe (GREEN), 1bb3c3a (Rule 2 fix) |
| 2 | e2e on-demand proof and contact spec updates | 1aaf4b7 |
| 3 | Gate check (conditional deferrals) | none needed |

## Bundle numbers (gzip -9, `node scripts/measure-bundle.ts`)

| Route | Before (base ee0a3d5) | After |
| ----- | --------------------- | ----- |
| `/`, `/es/` | 23,229 B (OVER, +1,229) | 17,562 B |
| `/projects/portfolio-web/`, `/es/projects/portfolio-web/` | 15,923 B | 16,069 B |
| every other page (404, projects index, other details, EN and ES) | 15,248 B | 15,394 B |

- Max: 17,562 B on `/`, so there is **4,438 B of headroom**. `measure:bundle` reports "bundle check ok" on all 20 pages.
- The orchestrator context quoted 23,010 B for `/` before this plan. The fresh base build measured 23,229 B, and the before column uses that measured value.
- [Inference] Non-Home pages rose by 146 B. That is likely chunk regrouping: shared lifecycle code now sits in a separate shared chunk (9 eager files instead of 8). I did not check which module moved. All of those pages stay at least 5,900 B under the ceiling.
- `EAGER_CEILING_GZIP = 22_000` is unchanged, and `git diff ee0a3d5 -- scripts/measure-bundle.ts` is empty.

## Task 3

Task 3 was not needed: max eager 17,562 B, headroom 4,438 B, on route `/`. Only step 1 (the gate check) ran. None of the six Task 3 files (cursor-loader, tooltips-loader, CursorFollower.astro, ToolsRow.astro and their tests) were created or changed.

## Verification

- Unit: `pnpm vitest run tests/unit` gave 71 files and 1,276 tests passing. `contact-form-loader.test.ts` has 11 tests: the 7 plan behaviours, plus a retry cap, two focus-handoff cases, and a pointerdown trigger.
- e2e: contact-lazy, contact, contact-states, contact-preselect, a11y, anchors, transitions and navigation-leaks gave **194 passed, 0 failed**. They ran against a temporary uncommitted Playwright config on port 4415, which was deleted afterwards.
- `pnpm lint` (astro check, eslint, prettier) exits 0.
- `pnpm build && node scripts/measure-bundle.ts` reports bundle check ok.
- I did not run the taste-skill: this plan makes no visual or design change.

## Spec changes (Task 2)

- No `expect(` line was removed or moved (`git diff -U0 tests/e2e | grep '^-.*expect('` is empty). Every change only adds an open step:
  - `contact.spec.ts`: "form replaces the no-JS block" calls `openContactForm` after `goto`.
  - `anchors.spec.ts`: the 07-11 Ask test scrolls `#contact` into view before it reaches `#contact-message`.
  - `a11y.spec.ts`: the Home keyboard Tab-order tests (normal and reduced motion) call `openContactAndReturnToTop` before the Tab walk.
- Not changed, because they were green with the lazy loader: `contact-states.spec.ts`, `contact-preselect.spec.ts` (they open at `#contact` / `?service=` or scroll first), `transitions.spec.ts` (already scrolls), and a11y line ~77 (`goto('#contact')` loads at once).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Accessibility] Keyboard focus was lost when the controller mounted**
- **Found during:** Task 2. The `/es/` keyboard Tab-order e2e failed with focus on `A` where `INPUT` was expected.
- **Issue:** Tabbing onto the mailto link in `[data-contact-nojs]` is itself a load trigger (focusin). When the controller mounted, it hid that block while the link had focus, so a keyboard user dropped to `<body>`.
- **Fix:** Before mounting, the loader records whether focus is inside the mailto block. If the block is hidden after mount and the form is visible, it focuses the checked service radio, or else the first field.
- **Files modified:** src/lib/ui/contact-form-loader.ts, tests/unit/contact-form-loader.test.ts
- **Commit:** 1bb3c3a

**2. [Rule 3 - Blocking] Worktree base reset**
- The worktree started on 234dcb2, not the expected base ee0a3d5. It was reset to ee0a3d5 by the sanctioned startup step before any work began.

## Threat model

- T-07-33: the Turnstile, honeypot and siteverify path is unchanged. contact-states and contact e2e (@network) are green.
- T-07-34: a rejected load is logged and hides nothing (unit test). The mailto block stays visible until mount (contact-lazy e2e).
- T-07-36: `contact-form-boot.ts` imports only `astro:actions` and `astro:env/client`. The eslint boundary passes.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: src/lib/ui/contact-form-loader.ts, src/lib/ui/contact-form-boot.ts, tests/unit/contact-form-loader.test.ts, tests/e2e/helpers/contact.ts, tests/e2e/contact-lazy.spec.ts
- FOUND commits: cda2648, b308cbe, 1bb3c3a, 1aaf4b7
