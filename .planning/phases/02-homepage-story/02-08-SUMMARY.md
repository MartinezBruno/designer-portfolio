---
phase: 02-homepage-story
plan: 08
subsystem: homepage
tags: [a11y, e2e, playwright, axe, layout, marquee, tooltips, hero, checkpoint-feedback]
requires:
  - phase: 02-07
    provides: HomeView with all story sections, home-story.spec.ts, keyboard-order probe with expectedOrderFor/keyboardCases
provides:
  - axe clean on / and /es/ with motion on, under reduced motion and with a tool tooltip open
  - reduced-motion keyboard order checks in both locales
  - 320px overflow checks with each tooltip shown and the full-bleed band
  - marquee track-fill checks at 1280/1920/2560
  - compact roles band with an invisible pause control (hover, keyboard focus, tap)
  - tool tiles that invert colors while their tooltip shows
  - real circular hero portrait (321x324 PNG with alpha) capped at 256/320px
affects: [phase-03]
tech-stack:
  added: []
  patterns:
    - "Invisible full-band toggle: transparent absolute inset-0 button that is a sibling of the lists, white inset focus outline"
    - "Pause on keyboard focus via group-has-[[data-marquee-toggle]:focus-visible] (focus-visible, not focus-within, so a second tap resumes)"
    - "State inversion tied to tooltip visibility: hover/focus-visible/data-open on, data-dismissed:*! off"
key-files:
  created:
    - src/assets/hero/portrait.png
  modified:
    - tests/e2e/a11y.spec.ts
    - tests/e2e/layout.spec.ts
    - tests/e2e/home-story.spec.ts
    - tests/e2e/home.spec.ts
    - tests/unit/roles-marquee.test.ts
    - tests/unit/tools-row.test.ts
    - src/components/sections/RolesMarquee.astro
    - src/components/sections/ToolsRow.astro
    - src/components/sections/Hero.astro
    - src/lib/motion/marquee.ts
    - src/i18n/ui.en.ts
    - src/i18n/ui.es.ts
  deleted:
    - src/assets/hero/portrait.jpg
requirements: [HOME-02, HOME-03, HOME-05]
decisions:
  - "Roles band pause is an invisible full-band button (hover, keyboard focus, tap) instead of a visible play/pause button. It keeps HOME-03 and WCAG 2.2.2"
  - "Roles band is about half its old size: motion-on text-3xl, py-4, size-5 asterisk"
  - "Tool tiles invert to bg-ink/text-surface whenever their tooltip shows (hover, focus, tap) and revert on Esc dismissal"
  - "Hero portrait is a circle for now (circle now, larger later), capped at 256px mobile / 320px desktop until an uncropped photo of 1000px or more is supplied"
  - "Hero alt restored to the UI-SPEC wording once the real photo shipped"
metrics:
  duration: ~45min (including two checkpoint feedback rounds)
  completed: 2026-10-16
  tasks: 3
  files: 14
---

# Phase 2 Plan 08: Accessibility and Layout Sweep Summary

This plan closes phase 2 with an accessibility and layout sweep. The new e2e tests check four things:

- axe is clean under reduced motion and with a tool tooltip open.
- The keyboard order is correct under reduced motion in both locales.
- Nothing overflows at 320px while a tooltip is shown.
- The marquee loop fills its track at wide viewports.

Task 3 is the human visual check. The user approved it after two feedback rounds:

- Round 1: a compact roles band with an invisible pause control, and tool tiles that invert their colors.
- Round 2: Martina's real hero photo, shown as a circle.

## Tasks

| Task | Name | Outcome |
|---|---|---|
| 1 | Cover reduced motion and tooltips in axe | Done |
| 2 | Check tooltip overflow and track fill | Done |
| 3 | Human visual check (checkpoint:human-verify) | Approved after two feedback rounds |

## Commits

| Hash | Message |
|---|---|
| 95c3baf | test(02-08): cover reduced motion and tooltips in axe |
| f6ba662 | test(02-08): check tooltip overflow and track fill |
| 7b2129b | fix(02-08): shrink roles band and hide pause button |
| 153e8d7 | fix(02-08): invert tool tile colors on hover |
| dc67781 | test(02-08): cover band pause and tile inversion |
| daef88b | feat(02-08): use real circular hero portrait |
| 57337db | test(02-08): assert circular capped hero portrait |

## Deviations from Plan

### User-requested changes (from the Task 3 checkpoint)

**1. Invisible pause control on the roles band**
- **Feedback:** "roles band, lets reduce its size and remove the play/pause button".
- **Change:**
  - The visible pause button and its two icons are removed, along with the IconPlayerPause and IconPlayerPlay imports.
  - `[data-marquee-toggle]` is now an empty, transparent `<button type="button">` laid over the whole band (`absolute inset-0`).
  - It is a sibling of the two lists, not wrapped around them. The role list semantics stay intact, and each role is still announced once.
  - It keeps the fixed `roles.pause` label and `aria-pressed`.
  - The band pauses in three ways: on hover, on keyboard focus (`group-has-[[data-marquee-toggle]:focus-visible]`), and when `data-paused` is set by click, tap, Space or Enter.
  - The focus outline is white and inset by 4px, so it is not clipped (D-17).
  - With reduced motion or no JavaScript, the button stays hidden and the list is static.
- **Rationale:**
  - Keyboard, touch and screen-reader users can still pause, so HOME-03 and WCAG 2.2.2 (Pause, Stop, Hide) keep passing.
  - The visual is cleaner, which is what the user asked for.
  - Focus-visible is used instead of focus-within so that a second tap actually resumes the band on touch devices.
  - Accepted trade-off: the overlay blocks selecting the role text.
- **Also:** in the a11y Tab-order test, the toggle is still the BUTTON tab stop.

**2. Roles band size about halved**
- **Change:**
  - Text with motion on goes from text-5xl (48px) to text-3xl (30px).
  - Band padding goes from py-8 to py-4.
  - The asterisk goes from size-6 to size-5.
  - The gap between asterisk and text goes from gap-6 to gap-4, to match the smaller text.
  - The static (no-motion) list stays text-2xl.
  - `--marquee-gap` is unchanged at 2rem; the track-fill checks show it was not needed.
- **Rationale:** the user asked for a smaller band and chose "About half".

**3. Tool tiles invert while their tooltip shows**
- **Feedback:** "tools, also on hover/touch. lets invert the icon colors".
- **Change:**
  - Tiles switch to `bg-ink text-surface border-ink` on `hover:`, `focus-visible:` and `data-open:` (tap).
  - `data-dismissed:*!` restores the resting colors, so when Esc hides the tooltip the tile reverts too.
  - The color transition only runs under `motion-safe:` (150ms).
  - The tooltip itself is unchanged.
- **Rationale:** the inversion is tied to tooltip visibility, as the user chose with "Hover, tap and focus".

**4. Real circular hero portrait ("Circle now, larger later")**
- **Change:**
  - The user supplied a 321x324 RGBA PNG, already cropped to a circle with transparent corners. It is now `src/assets/hero/portrait.png`.
  - The placeholder `portrait.jpg` was used only by Hero.astro, so it is deleted.
  - The image classes are now `mx-auto aspect-square w-full max-w-64 rounded-full object-contain lg:max-w-80`, with width/height 321/324. The 4:5 crop, the `object-cover` crop and the grey `bg-surface-alt` placeholder fill are gone.
  - The image keeps the AVIF/WebP formats, eager loading and `fetchpriority="high"`.
  - The TODO comment now reads `TODO(martina): supply the original uncropped photo at >=1000px so the hero portrait can grow`.
- **Alt text [Rule 1 - correctness]:**
  - `hero.imageAlt` said "Placeholder image…" / "Imagen provisional…", which is wrong for the real photo.
  - The existing TODO in the dictionaries said to restore the UI-SPEC alt once the real portrait replaced the placeholder.
  - The alt is now "Portrait of Martina Fernandez" / "Retrato de Martina Fernandez", and those TODOs are removed.
- **Rationale:**
  - The source is only 321px wide, so the image is capped close to that size to avoid heavy upscaling.
  - `object-contain` keeps the 321x324 source from being cropped or stretched in a square box. The extra 3px are transparent.

### Auto-fixed Issues

**1. [Rule 1 - Test bug] Tapped-tile color read during the transition**
- **Found during:** the round 1 e2e run.
- **Issue:** the test read the tapped tile's background while the 150ms color transition was still running.
- **Fix:** the assertion now uses `expect.poll`.
- **Commit:** dc67781.

## Measurements

All measured in Playwright Chromium against the built preview on port 4412.

**Marquee track fill** (after the size change; copy A width vs track width, 1px tolerance):

| Path | Viewport | Track | Copy A | Band height |
|---|---|---|---|---|
| / | 1280 | 1280 | 1280.0 | 63.19px |
| / | 1920 | 1920 | 1920.0 | 63.19px |
| / | 2560 | 2560 | 2560.0 | 63.19px |
| /es/ | 1280 | 1280 | 1280.0 | 63.19px |
| /es/ | 1920 | 1920 | 1920.0 | 63.19px |
| /es/ | 2560 | 2560 | 2560.0 | 63.19px |

**Band height:**
- New height: 63.19px.
- Old height: about 112px (py-8 is 64px plus a 48px line). [Inference] I calculated this and did not measure it.
- The pause overlay is the same size as the band, so the tap target is at least 44px.

**Contrast** (WCAG formula, from the theme tokens):

| Pair | Ratio | Requirement |
|---|---|---|
| Icon on an inverted tile: surface #faf7f2 on ink #1a1714 | 16.7:1 | 3:1 (non-text) |
| Accent focus ring #0f70b7 vs page #faf7f2 | 4.89:1 | 3:1 |
| Accent focus ring vs ink tile | 3.42:1 | 3:1 |
| White band outline vs accent #0f70b7 | 5.22:1 | 3:1 |

**Hero portrait** (DPR 2):

| Viewport | Rendered (CSS px) | Source served | Device px needed | Upscale |
|---|---|---|---|---|
| 375 | 256x256 | AVIF 321x324 | ~512 | ~1.6x |
| 1280 | 320x320 | AVIF 321x324 | ~640 | ~2x |

- At DPR 2 the image looks slightly soft. A screenshot shows no blockiness, and the corners show the page color (#faf7f2), so the AVIF keeps its transparency.
- At DPR 1 there is no upscaling.
- File sizes in the build:
  - AVIF: 5.5 KB.
  - WebP: 8.5 KB.
  - `<img>` fallback: a re-encoded PNG at 142 KB, larger than the 99 KB source. Only browsers without AVIF/WebP support download it.

## Gate Results

- `pnpm lint` (astro check, eslint, prettier --check): 0 errors, 0 warnings.
- `pnpm test`: 16 files and 121 tests passed.
- `pnpm check:secrets`: ok.
- E2E: 88 of 88 passed. I ran them through a temporary config copy on port 4412 with CI=1, then deleted it and did not commit it.
- `pnpm build`: done at the end. The preview on :4411 serves the final build.

## Known Stubs

- `src/components/sections/Hero.astro`, the `TODO(martina): supply the original uncropped photo at >=1000px so the hero portrait can grow` comment. This is intentional: the portrait stays capped at 256/320px until a larger source exists. The decision was "circle now, larger later".

## Threat Flags

None. There are no new network endpoints, auth paths or trust-boundary inputs. The new asset is a static image that is optimized at build time.

## Self-Check: PASSED

- Files: src/assets/hero/portrait.png, src/components/sections/Hero.astro, src/components/sections/RolesMarquee.astro, src/components/sections/ToolsRow.astro, tests/e2e/a11y.spec.ts, tests/e2e/layout.spec.ts, tests/e2e/home-story.spec.ts and tests/e2e/home.spec.ts all exist.
- src/assets/hero/portrait.jpg is absent, as intended.
- Commits 95c3baf, f6ba662, 7b2129b, 153e8d7, dc67781, daef88b and 57337db are all in git history.
