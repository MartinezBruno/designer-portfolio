---
phase: 02-homepage-story
plan: 05
subsystem: homepage-ui
tags: [services, astro, tabler-icons, a11y, tdd]
requires:
  - 02-01 (ServiceIconKey, ServiceView)
  - 02-02 (services.heading dictionary key)
provides:
  - ServiceIcon.astro (typed ServiceIconKey -> Tabler outline icon map)
  - ServiceCard.astro (non-interactive li card with h3 + disc bullet list)
  - FeaturedServices.astro (labelled section, h2, 1/2/4-column grid)
affects:
  - 02-07 (HomeView wiring passes services + locale)
tech-stack:
  added: []
  patterns:
    - "as const satisfies Record<ServiceIconKey, typeof IconLayout> icon map"
    - "prop-driven section, no getCollection (HomeView is the only reader)"
key-files:
  created:
    - src/components/ui/ServiceIcon.astro
    - src/components/ui/ServiceCard.astro
    - src/components/sections/FeaturedServices.astro
    - tests/unit/featured-services.test.ts
  modified: []
decisions:
  - "Native list-disc bullets (keeps list semantics for Safari/VoiceOver, no typed dashes)"
  - "Cards non-interactive in Phase 2: no links, cursor-pointer or hover classes until Phase 5 (HOME-08)"
metrics:
  duration: ~5min
  completed: 2026-10-16
requirements: [HOME-04]
---

# Phase 2 Plan 05: Featured Services Summary

Four non-interactive service cards (icon chip, h3 title, native disc bullet list) rendered in received order inside a labelled `services-title` section with a 1/2/4-column grid, icons resolved through a typed explicit-import Tabler map.

## Tasks

| Task | Name | Commits |
| ---- | ---- | ------- |
| 1 | ServiceIcon typed map and non-interactive ServiceCard | 057914f (RED), 674fe9d (GREEN) |
| 2 | FeaturedServices section with 4-card grid | 5ed35e6 (RED), 4032dea (GREEN) |

## Verification

- `pnpm vitest run tests/unit/featured-services.test.ts`: 7/7 passed (4 service card, 3 section).
- `pnpm test`: 11 files, 86 tests passed.
- `pnpm lint` (astro check, eslint, prettier): 0 errors, 0 warnings.
- Acceptance greps: `satisfies Record<ServiceIconKey` = 1; `@tabler/icons/outline/` = 4, barrel import = 0; interactive/clamp/role patterns in ServiceCard = 0; `getCollection` in FeaturedServices = 0; `aria-labelledby="services-title"` = 1; `lg:grid-cols-4` = 1; `set:html` in src = 1 (unchanged).

## TDD Gate Compliance

RED commits (`test(02-05)`) precede each GREEN commit (`feat(02-05)`) for both tasks. Both RED runs failed on the missing module before implementation. No refactor needed.

## Deviations from Plan

None. The plan executed as written. Prettier's tailwind plugin reordered class tokens (for example `bg-surface-alt flex h-full ...`). Only the order changed, and the tests assert class tokens regardless of order.

## Threat Mitigations

- T-02-12: titles and items are rendered through auto-escaped `{}` expressions. No `set:html` was added.
- T-02-13: no `<a>`, `cursor-pointer` or `hover:` in the card. The tests and the grep gate check this.

## Notes for 02-07

- Render it as `<FeaturedServices services={content.services} locale={locale} />`. The section has no vertical padding, so the HomeView wrapper provides the rhythm.
- HomeView is not modified here, as instructed.

## Self-Check: PASSED

- FOUND: src/components/ui/ServiceIcon.astro, src/components/ui/ServiceCard.astro, src/components/sections/FeaturedServices.astro, tests/unit/featured-services.test.ts
- FOUND commits: 057914f, 674fe9d, 5ed35e6, 4032dea
