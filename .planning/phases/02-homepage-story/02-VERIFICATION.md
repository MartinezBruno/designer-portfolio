---
phase: 02-homepage-story
verified: 2026-10-16T22:00:00Z
status: passed
score: 5/5 requirements verified (HOME-02, HOME-03, HOME-04, HOME-05, HOME-07)
overrides_applied: 0
gaps: []
warnings:
  - "WR-01: aria-pressed can disagree with the visible paused state (hover/focus pause independent of toggle)"
  - "WR-02: invisible pause control has no visual affordance (recorded user decision at 02-08)"
  - "WR-03: reduced-motion toggled after load leaves clipped band (edge case)"
  - "WR-04: tooltip persistence vs WCAG 1.4.13 when hovering another tile"
---

# Phase 02: Homepage Story Verification Report

**Phase Goal:** A visitor on the homepage, in either language, understands what Martina does: her roles, her 4 featured services, the tools she uses, and whether she is available.
**Status:** passed (with 4 non-blocking accessibility warnings carried from 02-REVIEW.md)
**Re-verification:** No, initial verification

## Requirements Coverage (all IDs from PLAN frontmatter accounted for)

| Requirement | Plans | Status | Evidence |
| --- | --- | --- | --- |
| HOME-02 roles marquee | 02-01, 02-03, 02-04, 02-06, 02-07 | SATISFIED | `src/data/roles.json` has 4 roles (EN/ES); `RolesMarquee.astro` renders them from `HomeView` via `getHomeContent(locale)`. |
| HOME-03 pause / static reduced motion / SR once | 02-01, 02-03, 02-04, 02-06 | SATISFIED (see assessment) | Hover pause, keyboard-focus pause and toggle button (`marquee.ts`); motion styles gated by `motion-on:` variant and `motion-reduce:animate-none`; duplicate list has `aria-hidden="true"` so roles are heard once. |
| HOME-04 4 featured services | 02-01, 02-06, 02-07, 02-08 | SATISFIED | `services.json` has 4 entries; `FeaturedServices.astro` renders them in a 4-column grid via `ServiceCard`. |
| HOME-05 tools | 02-01, 02-04, 02-05, 02-06, 02-07 | SATISFIED | `tools.json` has 5 tools; `ToolsRow` rendered in `HomeView`; tooltip logic in `src/lib/ui/tooltips.ts`. |
| HOME-07 availability controlled by content | 02-01, 02-02, 02-06, 02-07 | SATISFIED | `profile.json` `availability.available` flows through `getHomeContent` to `Hero` to `AvailabilityBadge` (plain line below the CTA; renders nothing when false). |

REQUIREMENTS.md maps HOME-02/03/04/05/07 to Phase 2. HOME-06 maps to Phase 3 and is correctly not claimed. No orphaned requirements.

## Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Hero in EN and ES: headline "Hi, I'm / Martina." (ES "Hola, soy"), role line, CTA, circular portrait | VERIFIED | `Hero.astro` reads `hero.greeting` and `site.firstName`; `ui.es.ts` has the ES keys; portrait uses `rounded-full`. |
| 2 | Roles marquee shows all roles in both languages | VERIFIED | Localized `label` in `roles.json`; component renders each role. |
| 3 | Marquee pausable; static under reduced motion; SR hears each role once | VERIFIED | See HOME-03 assessment below. |
| 4 | Exactly 4 featured services | VERIFIED | 4 entries in data; grid renders all. |
| 5 | Tools row shows the tools | VERIFIED | 5 tools rendered; tooltip and inversion behaviour covered by unit tests. |
| 6 | Availability line reflects content flag | VERIFIED | `AvailabilityBadge.astro` is gated on `available`; unit test `availability-badge.test.ts` passes. |

All components are wired through `HomeView.astro` and the data reaches rendering (no hardcoded empty props).

## Behavioral Spot-Checks

| Check | Command | Result | Status |
| --- | --- | --- | --- |
| Unit tests | `pnpm vitest run` | 16 files, 122 tests passed | PASS |
| Build | `pnpm build` | 4 pages built | PASS |
| E2E (temporary config on port 4414, CI=1, config deleted afterwards) | `pnpm playwright test -c <tmp config>` | 100 passed, covers home-story, a11y, layout, skeleton, home in EN and ES | PASS |

Probe execution: none declared by the plans.

## Assessment of Review Warnings against HOME-03 and Accessibility

HOME-03 as written: "pause on hover/focus or control; static under reduced motion; screen readers hear each role once."

- The requirement is satisfied by hover pause and focus pause alone ("or control"). Both exist in CSS (`group-hover`, `group-has-[[data-marquee-toggle]:focus-visible]`) and are exercised by the passing e2e test. The toggle is an additional control. Reduced motion and the single SR reading are verified in code (`motion-on:` gating, `aria-hidden` duplicate).
- **WR-01 (not a blocker):** the toggle's `aria-pressed` can say "not pressed" while hover or focus keeps the band paused. This is a state-accuracy defect (WCAG 4.1.2) in the extra control, not a failure of the pause mechanism. It is worth fixing. On touch devices, sticky `:hover` after a tap may also keep the band paused after a second tap. [Inference] This was not tested on real touch hardware.
- **WR-02 (not a blocker):** the invisible control was a deliberate user decision at 02-08. Hover and focus pausing remain available, and focus shows a visible outline. Re-confirm for touch users.
- **WR-03 (not a blocker):** only affects users who switch reduced-motion on while the page is open. The initial load is correct.
- **WR-04 (not a blocker):** affects tooltip behaviour when mixing keyboard focus and pointer hover. It does not affect HOME-05 delivery (tools are visible with their names). It is a WCAG 1.4.13 refinement.

None of the four makes a must-have fail. All four are recommended follow-ups (a small fix plan or a later accessibility pass).

## Anti-Patterns

| File | Pattern | Severity |
| --- | --- | --- |
| `src/components/sections/Hero.astro:9` and `src/data/site.ts` | `TODO(martina)` placeholders for portrait resolution, real domain and email | Info (content hand-off items, not formal debt markers; no TBD/FIXME/XXX found in the files read) |

## Human Verification

The visual and interaction checks (marquee behaviour, tool-tile inversion, circular portrait, hero typography) were approved by the user at the 02-08 checkpoint and in the follow-up hero change (commits 1f51e50, d107f63). No additional human items are outstanding. Optional: test the marquee tap behaviour on a real touch device (WR-01/WR-02).

## Gaps Summary

No gaps. Phase goal achieved. Carry WR-01 to WR-04 forward as warnings.

---

_Verified: 2026-10-16T22:00:00Z_
_Verifier: Claude (gsd-verifier)_
