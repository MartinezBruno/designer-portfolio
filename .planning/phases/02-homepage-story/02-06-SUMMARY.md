---
phase: 02-homepage-story
plan: 06
subsystem: home-ui
tags: [tools, tooltip, a11y, wcag-1.4.13, eslint]
requires: ["02-01 (ToolView, toolIconKeys)", "02-02 (tools.heading dictionary key)", "src/lib/motion lifecycle"]
provides: ["initToolTooltips(doc)", "ToolIcon.astro", "ToolsRow.astro", "file-scoped tabindex lint override"]
affects: ["02-07 (HomeView wiring)", "02-08 (e2e tooltip/keyboard/overflow)"]
tech-stack:
  added: []
  patterns: ["AbortController-scoped listeners registered via lifecycle", "name-as-label role=img with aria-hidden visual tooltip", "Tailwind group-data-* variants for JS state"]
key-files:
  created:
    - src/lib/ui/tooltips.ts
    - src/components/ui/ToolIcon.astro
    - src/components/sections/ToolsRow.astro
    - tests/unit/tool-tooltips.test.ts
    - tests/unit/tools-row.test.ts
  modified:
    - eslint.config.js
decisions:
  - "Lint override uses the registered key astro/jsx-a11y/no-noninteractive-tabindex (eslint-plugin-astro re-namespaces the jsx-a11y-x rule), scoped to ToolsRow.astro with roles ['img']"
  - "Tooltip script lives in src/lib/ui (not motion) and only toggles data-open/data-dismissed"
metrics:
  duration: ~6min
  completed: 2026-10-16
requirements: [HOME-05]
---

# Phase 2 Plan 06: Tools Row Summary

Five icon-only, keyboard-focusable `role="img"` tool tiles named by an sr-only span, with an aria-hidden ink/surface tooltip shown by CSS on hover/focus-visible and by a lifecycle-registered script on tap, with Esc dismissal and one tooltip at a time (WCAG 1.4.13).

## Tasks

| Task | Name | Commits | Files |
| ---- | ---- | ------- | ----- |
| 1 | initToolTooltips behavior (TDD) | ab6104b (RED), 1eb9b28 (GREEN) | src/lib/ui/tooltips.ts, tests/unit/tool-tooltips.test.ts |
| 2 | ToolIcon, ToolsRow, lint override (TDD) | b67d60d (RED), 0940c09 (GREEN) | src/components/ui/ToolIcon.astro, src/components/sections/ToolsRow.astro, tests/unit/tools-row.test.ts, eslint.config.js |

## Required records

- **(a) Did the lint rule fire without the override?** Yes. `pnpm exec eslint src/components/sections/ToolsRow.astro` reported `` `tabIndex` should only be declared on interactive elements  astro/jsx-a11y/no-noninteractive-tabindex `` at the tile span. With the file-scoped override `['error', { roles: ['img'], tags: [] }]`, `pnpm lint` exits 0.
- **(b) PointerEvent construction path in happy-dom:** the native path, `new PointerEvent('pointerup', { bubbles: true, pointerType })`. happy-dom honors `pointerType` from the init dict (touch/pen taps toggle and a mouse tap does not), so the `Object.defineProperty` fallback was not needed.

## Verification

- `pnpm vitest run tests/unit/tool-tooltips.test.ts tests/unit/tools-row.test.ts`: 16/16 passed.
- `pnpm test`: 12 files, 95 tests passed.
- `pnpm lint` (astro check + eslint + prettier): 0 errors.
- All acceptance greps match (AbortController 1, Escape 1, no aria/textContent/innerHTML in tooltips.ts, `satisfies Record<ToolIconKey` 1, `brand-adobe.svg` 1, `lifecycle.register(initToolTooltips)` 1, `role="img"` 1, no describedby/tooltip/list roles, no eslint-disable, `set:html` count in src 1).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] ESLint rule key**
- **Found during:** Task 2
- **Issue:** The plan named the rule `jsx-a11y-x/no-noninteractive-tabindex`. The flat config built by `astro.configs['jsx-a11y-strict']` registers it as `astro/jsx-a11y/no-noninteractive-tabindex`, so an override using the plan's key would have had no effect.
- **Fix:** I wrote the override with the registered key. The options and the file scope are unchanged from the plan.
- **Files modified:** eslint.config.js
- **Commit:** 0940c09

**2. [Rule 1 - Minor] Comment wording**
- **Found during:** Task 2
- **Issue:** The header comment in ToolsRow.astro contained the literal `role="img"`, which made the acceptance grep count 2 instead of 1.
- **Fix:** I reworded the comment to "image role".
- **Commit:** 0940c09

**3. Extra test**
- I added a test that a pointerdown on a tile does not close its own tooltip. It guards the outside-tap branch.

## Notes for 02-07

- **HomeView wiring:** render `<ToolsRow tools={home.tools} locale={locale} />`. The component carries its own `<script>`, which imports `lifecycle` from `src/lib/motion` (index.ts, unchanged here) and calls `lifecycle.register(initToolTooltips)`. No other bootstrap is needed.
- **Pending check (UI-SPEC [Inference]):** confirm that the compiled CSS emits the `group-data-dismissed/tool:invisible!` and `opacity-0!` variants with `!important`. That check needs the section rendered on a built page, so it was not run in this plan.

## Known Stubs

None.

## Threat Flags

None. The surface matches the threat model (T-02-14, T-02-15 and T-02-16 are all mitigated as planned).

## Self-Check: PASSED

- All 5 created files and eslint.config.js are present.
- Commits ab6104b, 1eb9b28, b67d60d and 0940c09 are in the log.
