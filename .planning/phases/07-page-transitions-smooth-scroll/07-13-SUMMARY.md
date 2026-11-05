---
phase: 07-page-transitions-smooth-scroll
plan: 13
subsystem: motion
tags: [view-transitions, ink-wipe, title-morph, gap-closure, MOTN-05]
requires: [07-10 checkpoint decisions (Q2, morph soft findings), 07-REVIEW IN-01]
provides:
  - "--t-wipe 480ms / durations.wipe 0.48 (release at 336 ms)"
  - "plain-ink, non-overlapping project-title hand-off (45-50% out, 50-55% in)"
  - "landed #project-title unwrapped one frame after the transition settles (IN-01)"
affects: [src/styles/global.css, src/lib/motion/tokens.ts, src/lib/motion/navigation.ts, 07-UI-SPEC]
tech-stack:
  added: []
  patterns: ["injectable requestAnimationFrame dep in bindNavigation for deterministic unit tests"]
key-files:
  created: []
  modified:
    - src/styles/global.css
    - src/lib/motion/tokens.ts
    - src/lib/motion/navigation.ts
    - tests/unit/motion-tokens.test.ts
    - tests/unit/motion-navigation.test.ts
    - tests/e2e/transitions.spec.ts
    - tests/e2e/transitions-capture.spec.ts
    - .planning/phases/07-page-transitions-smooth-scroll/07-UI-SPEC.md
decisions:
  - "Morph hand-off at 45/50/55%: old gone by 50%, new from 50% to 55%; the swap falls while the panel covers the viewport, so it is never seen"
  - "Detail settle regression guard stays 1450 ms (measured max 1316 + 100, rounded up to 50 = 1450)"
  - "bindNavigation takes an optional requestAnimationFrame dep (default window.requestAnimationFrame)"
metrics:
  duration: ~45 min
  completed: 2026-11-04
  tasks: 3
  files: 8
---

# Phase 7 Plan 13: 480 ms wipe and plain-ink morph hand-off Summary

The ink wipe now lasts 480 ms and releases the arriving page at 336 ms. The card-to-detail title morph is plain ink: no difference blend and no invert. The old and new title images hand off without overlapping (old opaque to 45% and gone by 50%; new hidden to 50% and opaque from 55%). The landed h1 is unwrapped one frame after the transition settles, so its DOM matches a full load (IN-01).

## Tasks

| # | Task | Commits |
|---|------|---------|
| 1 | --t-wipe 480 ms everywhere | `acc2cc2` test (RED), `75ace2d` feat (GREEN) |
| 2 | Morph without ghosting or blend, IN-01 unwrap | `ee6bc62` test (RED), `83d21fb` fix (GREEN) |
| 3 | Taste gate and UI-SPEC amendment | `ef9b073` docs |

## What changed

- **Tokens:** `--t-wipe: 480ms` in global.css, `durations.wipe: 0.48` in tokens.ts. `--wipe-release: 0.7`, `RELEASE_CAP_MS = 1200`, `WIPE_LIMIT = 3` and `WIPE_WINDOW_MS = 1100` are unchanged. Three 480 ms passes still fit the vestibular window, and the flash-limit e2e is green.
- **Morph CSS:** removed `mix-blend-mode: difference` from the group and `filter: invert(1)` from the images. New keyframes: `morph-out` 1 → 45%, 0 from 50%; `morph-in` 0 → 50%, 1 from 55%. The comment cites the 07-10 decision and records that the title is ink on ink over the panel by design.
- **navigation.ts:** `nameMorphTarget` unwraps `entry.target` once the transition settles (finished, skipped or aborted), after one `requestAnimationFrame`, and only if the target `isConnected` (T-07-27: the nodes are moved with `replaceWith(...childNodes)` and never re-parsed). `clearMorph` and its doc comment are updated. The name is removed at once; the wrapper goes one frame later. `morph === entry` still clears the state exactly once.
- **Tests:**
  - Unit, CSS contract: no `mix-blend-mode` or `invert(` in project-title rules, and the first `morph-out` 0-stop is ≤ the last `morph-in` 0-stop, within 40-60%.
  - Unit, navigation: three new cases (unwrap after finished + frame with the same `lang` node; aborted transition; skipped transition). Release timing moved from 392 to 336.
  - e2e: `RELEASE_MIN_MS` 380 → 324. D-18 toggle bound `< 520` → `< 460` (the natural end is now ready + 480). OS-switch bound `< 560` → `< 480`. `expectMorph` now asserts 0 `[data-morph-title]` after idle. New 11-sample hand-off test (pauses the project-title animations at `ready`, seeks 0..duration, asserts `min(old, new) === 0` at every sample, group `mix-blend-mode` is `normal`, image `filter` is `none`).
- **Captures:** `MORPH_FRACTIONS` gains 0.45 and 0.55, so both sides of the hand-off are reviewed. Capture times were already relative to each animation's duration, with no ms literals.

## Home and detail settle measurements (Task 1, 5 runs, 480 ms wipe)

| Run | Home text / all | Projects text | Detail via card | Detail (EN/ES switch) |
|-----|-----------------|---------------|-----------------|-----------------------|
| 1 | 564 / 1347 | 1097 | 1314 | 1313 |
| 2 | 560 / 1344 | 1116 | 1315 | 1314 |
| 3 | 565 / 1348 | 1116 | 1314 | 1315 |
| 4 | 560 / 1343 | 1115 | 1312 | 1315 |
| 5 | 562 / 1346 | 1131 | 1313 | 1316 |

Click to ready was 36-46 ms. The gated values are Projects text (≤ 1300) and the two detail paths (≤ 1450). The measured detail max is 1316, and 1316 + 100 rounded up to 50 is 1450, so the guard stays at 1450 (the plan's cap). Against the D-16 target of about 1.2 s, detail is about 1.31 s (down from about 1.38 s at 560 ms). Home all above-fold is about 1.35 s, still logged only as the accepted exception. [Inference] Home's above-fold "all" is bounded by the hero image shutter, not by the wipe, which is why it barely moved.

## Taste gate (taste-skill: SKILL.md steps 7-9, references/motion.md, references/critique.md)

**Captures** (`CAPTURE_TRANSITIONS=1`: 77 passed, 56 `2-*` files, all from this run). Verdicts:

| Capture | Verdict |
|---------|---------|
| `2-instablogs-en-1440-30` | Pass. A single plain-ink title, with no blue tint over the InstaBlogs cover (the 07-10 finding is fixed) |
| `2-instablogs-en-1440-45` | Pass. The old title is over the ink panel, ink on ink and almost invisible (accepted by user decision) |
| `2-instablogs-en-1440-55` | Pass. Only the new h1-sized title shows, in the uncovered top band. No doubled title |
| `2-instablogs-en-1440-70` | Pass. A single title near its landing spot |
| `2-instablogs-es-390-30` | Pass. A single title, plain ink |
| `2-longest-es-es-390-30` | Pass, with a soft note. The one-line card title sits partly over the red/black cover and its legibility drops there. It is plain ink by user decision, and no copy is doubled |
| `2-longest-es-es-390-55` / `-70` | Pass. Only the two-line h1 title shows, and nothing stretches |
| `3-es-390-50` | Pass. Both images are hidden at exactly 50% under the full panel, so there is no doubled frame |
| `1-forward-en-1440-70` | Pass. Still one flat pass with no old/new overlap. The arriving entrances are held |
| `6-release-en-1440`, `6-settle-en-1440` | Pass. The title lands where the settled h1 sits, and nothing animates under the panel |

**IN-01 reflow check** (a one-off Playwright measurement, not committed): the text line boxes and the height of `#project-title` just before and two frames after the unwrap, for the longest title.

| Case | Before → After |
|------|----------------|
| en 1440 | `176,126,473 h=39.59` → identical |
| es 1440 | `176,126,453 h=39.59` → identical |
| en 390 (2 lines) | `16,151,269 / 16,191,197 h=79.19` → identical |
| es 390 (2 lines) | `16,151,176 / 16,191,269 h=79.19` → identical |

**lint.mjs:**
- `src/styles src/lib/motion` (20 files): 0 FAIL, 0 WARN.
- All of `src`: 1 FAIL (`hairline` SiteHeader.astro:34, pre-existing and accepted) and 2 WARN (`outlined-box` ToolsRow.astro:21, accepted; `em-dash` with 16 in all files, all pre-existing).
- This plan adds no em dashes and no new findings.

**inspect.mjs** (preview on 4513; output in `.taste-skill/inspect-07-13/`). Moving elements at 1440/768/390, with 07-10 in brackets:

| URL | Moving | Codes |
|-----|--------|-------|
| `/` | 37/37/38 (37/37/38) | FAIL `icon-cards` (accepted). WARN `hairline`, `palette-cream`, `first-action`, `no-footage` (accepted) |
| `/projects/` | 27/27/27 (27/27/27) | FAIL `focal-point`, `empty-screens` (pre-existing, accepted). Same WARNs |
| `/projects/website-instablogs/` | 6/6/6 (6/6/6) | FAIL `still-page` (accepted artefact). Same WARNs |

`still-page` did not regress, and no URL reports `overflow`, `clipped-text` or `covered-text`. I reviewed the desktop and mobile fold screenshots for `/` and the InstaBlogs detail page: static pages are unchanged, as expected, because this plan only touches transitions.

```
ROUND 1 (07-13, transition-scoped)
Seen in one second: the ink panel sweeping, and one title flying into the heading
Idea (one sentence): a designer's own work, framed by ink page turns, leads every route
Live thing: the ink wipe and title flight between pages; the motion toggle
Scores: design 7 · usability 7.5 · creativity 7 · content 7 → overall 7.1
Caps applied: inspect FAILs on Home and Projects (pre-existing) cap overall at 6.0
Top three problems:
1. Card title over a dark cover reads faintly in flight at 30% (2-longest-es-es-390-30): accepted, plain ink by user decision
2. Title is ink on ink over the panel at 45% (2-*-45): accepted by design, and the hand-off is hidden there
3. Home services row reads as icon cards (inspect icon-cards): pre-existing, accepted at Phase 3
```

## UI-SPEC amendment

07-UI-SPEC.md is amended with dated 07-13 notes, and the replaced text is struck through rather than deleted. The amended places are:
- Motion Tokens: `--t-wipe` 480ms, release 336ms.
- Timeline: times rescaled to 120/240/288/336/480.
- Color: plain ink, and the 11.59:1 row is struck.
- Title Morph: the hand-off at 45/50/55%, plain ink, and the IN-01 unwrap with the reflow measurement.
- Arrival: release at 336 ms, with the measured settle numbers.
- Vestibular: 480ms.
- Capture list: adds 45% and 55%.
- Open Questions 2 and 7: marked resolved.

## Deviations from Plan

1. **[Rule 3 - Blocking] Private Playwright port.** `playwright.config.ts` pins port 4400 with `reuseExistingServer: false`, and the parallel worktree agents (07-11, 07-12) would collide on it. I ran every e2e with an uncommitted copy of the config on port 4413 (`playwright.w13.config.ts`), then deleted it. The committed config is unchanged.
2. **[Rule 1 - Bug] D-18 toggle bound.** The plan only named `toBeLessThan(560)` → 480. The neighbouring `finishedAt - readyAt < 520` would no longer tell a skip apart from the natural end (now ready + 480), so it became `< 460`. It passed 5/5 repeats.
3. **Home settle guard location.** The plan described a Home guard at about line 537. In the code, Home is logged only (`home.all > 0`), and the 1450 ms guards apply to the two detail paths. I applied the measured-max rule to those: it gives 1450, so they stay at 1450. The comment now records the 480 ms measurements.
4. **Capture fractions.** I added 0.45 and 0.55 to `MORPH_FRACTIONS` (Task 3 allows capture changes) so both sides of the hand-off are reviewed. That gives 56 `2-*` files, above the ≥ 40 criterion.
5. **Verify commands.** The plan's verify commands `cd` into the main checkout. I ran them inside this worktree instead.

## Notes

- One full e2e run under heavy machine load (8.2 min, other agents building) had 3 timing failures (a 120 s timeout and two arrival-record checks). The immediate re-run passed 22/22 in 39.9 s, and the timing-sensitive tests (D-18 ×2, hold, hand-off) passed 20/20 with `--repeat-each 5`. [Inference] The failures came from load, not from this change.
- Final state: unit 1247/1247 across 70 files. e2e transitions, transitions-reduced and navigation-leaks: 22/22. Capture spec: 77/77. `pnpm lint`: 0 errors, 0 warnings, Prettier clean.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: src/styles/global.css (`--t-wipe: 480ms;`, no `mix-blend-mode: difference`, no `invert(1)`)
- FOUND: src/lib/motion/tokens.ts (`wipe: 0.48`)
- FOUND: commits acc2cc2, 75ace2d, ee6bc62, 83d21fb, ef9b073
