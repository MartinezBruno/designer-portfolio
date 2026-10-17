---
phase: 02-homepage-story
plan: 04
subsystem: homepage-roles
tags: [marquee, a11y, motion, wcag-2.2.2, lifecycle]
requires:
  - 02-01 (dictionary keys roles.heading / roles.pause)
  - 02-02 (motion-on variant, animate-marquee utility, accent tokens)
provides:
  - initMarqueeToggles(doc) pause toggle registered via the lifecycle singleton
  - RolesMarquee.astro section (Props { roles: readonly string[]; locale: Locale })
affects:
  - 02-07 (wires RolesMarquee into HomeView and runs E2E for animation, reduced motion, no-JS, focus color)
tech-stack:
  added: []
  patterns:
    - AbortController-based listener cleanup returned to the lifecycle registry
    - Fixed-label aria-pressed toggle (APG) driving a data-paused attribute read by group-data-paused CSS
    - Two-copy marquee with aria-hidden duplicate that is display:none unless motion-on
key-files:
  created:
    - src/lib/motion/marquee.ts
    - src/components/sections/RolesMarquee.astro
    - tests/unit/marquee-toggle.test.ts
    - tests/unit/roles-marquee.test.ts
  modified:
    - src/lib/motion/index.ts (line-3 comment only)
decisions:
  - Pause state is not persisted; a reload resumes the marquee (UI-SPEC default)
  - Toggle label never changes; state is exposed only through aria-pressed
metrics:
  duration: ~5 min
  completed: 2026-10-16
  tasks: 2
  files: 5
---

# Phase 2 Plan 04: Roles Marquee Summary

Full-bleed #0F70B7 roles band with a two-copy CSS marquee, a fixed-label `aria-pressed` pause toggle (WCAG 2.2.2) wired through the Phase 1 lifecycle registry with AbortController cleanup, and a static wrapped list fallback when motion is off.

## What was built

- `src/lib/motion/marquee.ts`: `initMarqueeToggles(doc): Cleanup | undefined`. Returns `undefined` when no `[data-marquee-toggle]` exists; otherwise one `AbortController` covers every button's click listener. Each click flips `aria-pressed` and toggles `data-paused` on the closest `[data-marquee]`. `aria-label` is never touched.
- `src/components/sections/RolesMarquee.astro`: `<section data-marquee aria-labelledby="roles-title">` on `bg-accent text-accent-ink`, no `max-w-` (full bleed, D-16). It has an sr-only h2, copy A `<ul>` (exposed to AT) and copy B `<ul aria-hidden="true">` (`hidden motion-on:flex`), both sharing the extracted `copyClasses`/`itemClasses`. Asterisk separators are decorative SVGs. The pause button is `hidden motion-on:inline-flex` with `focus-visible:outline-accent-ink` (white ring, D-17), and its play and pause icons swap through `group-data-paused`. The bundled script calls `lifecycle.register(initMarqueeToggles)`.
- `src/lib/motion/index.ts`: the comment now says Phase 2 registers the marquee toggle and tool tooltips through the singleton. No code changed.

## Commits

| Task | Type | Hash | Message |
|------|------|------|---------|
| 1 RED | test | 308381a | test(02-04): add failing marquee toggle tests |
| 1 GREEN | feat | e6bc23a | feat(02-04): add marquee pause toggle |
| 2 RED | test | 6742b55 | test(02-04): add failing roles marquee render tests |
| 2 GREEN | feat | 037683c | feat(02-04): add roles marquee band |

## Verification

- [Verified] `pnpm vitest run tests/unit/marquee-toggle.test.ts tests/unit/roles-marquee.test.ts`: 12/12 pass. The marquee-toggle file covers toggle state, the fixed label, cleanup and 10-cycle idempotency (one click after the cycles gives `aria-pressed="true"`).
- [Verified] Full `pnpm test`: 12 files and 91 tests pass.
- [Verified] `pnpm lint` (astro check, eslint, prettier): 0 errors.
- [Verified] All acceptance greps match the plan. The script registration, the `outline-accent-ink` ring and `bg-accent` are present. There is no bare `outline-accent`, no `role="list"`, no `max-w-`, no `aria-label` in marquee.ts and no `| void`. AbortController appears once in marquee.ts.
- [Unverified] Real animation, hover pause, reduced-motion and no-JS fallback and the focus ring color have not been browser-tested. Plan 02-07 does that once the section is wired into HomeView.

## TDD Gate Compliance

Both tasks have a `test(...)` RED commit followed by a `feat(...)` GREEN commit. Both RED runs failed because the module did not exist yet. No refactor commits were needed.

## Deviations from Plan

None. The plan was executed as written. Prettier reformatted the component's JSX layout, and the tests assert class tokens rather than their order.

Per the orchestrator's instructions, commits were made directly without the per-commit confirmation prompt in the plan's commit_protocol, and without attribution lines.

## Threat surface

T-02-09: role strings render through auto-escaped `{role}` expressions, with no `set:html`. T-02-10: AbortController cleanup is covered by the 10-cycle test. No new surface beyond the threat model.

## Self-Check: PASSED

- FOUND: src/lib/motion/marquee.ts, src/components/sections/RolesMarquee.astro, tests/unit/marquee-toggle.test.ts, tests/unit/roles-marquee.test.ts
- FOUND commits: 308381a, e6bc23a, 6742b55, 037683c
