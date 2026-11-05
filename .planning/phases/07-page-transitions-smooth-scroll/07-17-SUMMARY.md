---
phase: 07-page-transitions-smooth-scroll
plan: 17
subsystem: quality-gate
tags: [gap-closure, regression, bundle, taste-gate, uat]
requires: ["07-11", "07-12", "07-13", "07-14", "07-15", "07-16"]
provides:
  - Phase 7 gap-closure gate evidence (verify, bundle, taste, manual UAT)
  - 07-VALIDATION.md rows for 07-11..07-17 and manual UAT results
affects:
  - tests/e2e/motion-pointer.spec.ts
  - tests/e2e/motion-toggle.spec.ts
tech-stack:
  added: []
  patterns:
    - e2e specs that touch the contact form open it first (openContactForm), since 07-15 loads it on demand
key-files:
  created:
    - .planning/phases/07-page-transitions-smooth-scroll/07-17-SUMMARY.md
  modified:
    - tests/e2e/motion-pointer.spec.ts
    - tests/e2e/motion-toggle.spec.ts
    - .planning/phases/07-page-transitions-smooth-scroll/07-VALIDATION.md
decisions:
  - "Manual UAT (Safari 26, Firefox 159, VoiceOver Q6, morph fallback Q7, Figma wheel, pressed cue) approved by the user 2026-11-05"
  - "Lazy contact form height jump (+450 px @1440, +793 px @390) is an open Phase 7 gap; fix direction: reserve the form's height"
  - "inspect FAILs icon-cards (Home), focal-point and empty-screens (Projects) stay accepted for the Phase 7 taste gate"
  - "Run 1's 19/19 @network pass accepted; later @network failures were a local IPv6 timeout to challenges.cloudflare.com"
metrics:
  completed: 2026-11-05
  tasks: 2
  files: 3
---

# Phase 7 Plan 17: Final gap-closure gate Summary

All automated gates ran on the combined 07-11..07-16 result, and the user approved the manual UAT. The full run turned up three e2e specs that 07-15's lazy contact form had broken; they are fixed in 7d3ac29. A probe also found a new open gap: the contact form makes Home jump in height when it loads.

## Tasks

| Task | Name | Commits |
| ---- | ---- | ------- |
| 1 | Full regression, bundle gate, taste gate, validation map | 7d3ac29 (fix), f108903 (docs) |
| 2 | Manual UAT checkpoint | resolved: user reply "approved" |

## Regression (`pnpm verify`)

- astro check 0 errors / 0 warnings / 0 hints; eslint and prettier clean.
- Unit: 71 files, **1,292 tests** passed.
- Secrets: `secrets check ok (1018 dist files scanned)`.
- **Run 1** (before the fix): 792 passed / 117 skipped / **3 failed**. All three failed every time (3/3 in isolation):
  - `motion-toggle.spec.ts` "reduces motion without a reload, keeps a typed message…": the message field is not there until the lazy controller loads.
  - `motion-pointer.spec.ts` "the dot grows over a link, hides over the hero CTA and the message field": same cause.
  - `motion-pointer.spec.ts` "a footer social icon pulls (cap 6px) after scrolling": the form mounts while the test scrolls to the footer, and the footer settle-in is a GSAP tween the WAAPI wait does not see. The icon moved 6 px after it was measured.
  - All 19 `@network` tests passed in this run.
- **Run 2** (after 7d3ac29): the 19 `@network` tests failed with `turnstile_error The operation was aborted due to timeout`. The cause was local: `curl -6` to challenges.cloudflare.com timed out at 20 s, while `curl -4` answered in about 0.1 s. No contact code changed. **User decision (C): accept run 1's 19/19 pass.**
- **Hermetic run** (`E2E_OFFLINE=1`, after the fix): 736 passed / 117 skipped / 1 failed:
  - The failure is `smooth-scroll.spec.ts:136` "keyboard: PageDown, Space, End and Home scroll natively": after End, the page is 6 px short of the bottom.
  - It failed in run 2 and in the hermetic run, but passed in run 1 and 5/5 in isolation (`--repeat-each=5`).
  - It is recorded as **flaky** under the plan's rule. [Inference] It is probably a late layout settle near the page bottom under parallel load.

## Bundle (`pnpm build && pnpm measure:bundle`, exit 0)

| Route | Eager gzip -9 | vs 22,000 B |
| ----- | ------------- | ----------- |
| `/`, `/es/` | 17,640 B | 4,360 B under |
| `/projects/portfolio-web/`, `/es/projects/portfolio-web/` | 16,150 B | 5,850 B under |
| other 16 pages (404s, projects index, other details, EN and ES) | 15,475 B | 6,525 B under |

20 pages were measured, max 17,640 B on `/`. No GreenSock or lenisVersion in any eager chunk. `EAGER_CEILING_GZIP = 22_000` is unchanged.

## Taste gate (taste-skill)

- **Captures:** `CAPTURE_TRANSITIONS=1` transitions-capture, items 1-10: 84/84 passed, 359 PNGs in `.taste-skill/transitions/`.
- **lint.mjs** `src/components src/pages src/layouts src/styles src/lib/motion` (68 files): FAIL `hairline` SiteHeader.astro:34, WARN `outlined-box` ToolsRow.astro:21. Both are the same as 07-10 and were already accepted.
- **inspect.mjs** (preview on 4521, output in `.taste-skill/inspect-07-17/`):

| URL | Codes | vs 07-10 |
| --- | ----- | -------- |
| `/` | FAIL `icon-cards` | same (accepted) |
| `/es/` | FAIL `icon-cards` | same (accepted) |
| `/projects/` | FAIL `focal-point`, `empty-screens` | same (accepted) |
| `/projects/website-instablogs/` | 0 FAIL | `still-page` FAIL gone |
| `/es/projects/website-instablogs/` | 0 FAIL | `still-page` FAIL gone |
| `/projects/cabreras-motos-posts/` | 0 FAIL, WARN `still-page` (14 moving) | same count as 07-10 |

Every page also has the WARNs `hairline`, `palette-cream`, `first-action` and `no-footage`, all accepted before. **No new FAIL.** User decision (B): the remaining FAILs stay accepted, so the gate passes.

Screenshots reviewed: Home desktop fold and mobile page, Projects desktop fold, morph frame `2-instablogs-en-1440-55` (one plain-ink title, no doubling), grid `9-instablogs-col1-centred-1440` (seamless; the wireframe nav bars touch the top crop at 1.5%, and the user checked this in UAT), and pressed card `10-pressed-card-en-390` (inset mat).

```
ROUND 2
Seen in one second: "Hi, I'm Martina." and her portrait
Idea (one sentence): a designer's own work, framed by ink page turns, leads every route
Live thing: the ink wipe and plain-ink title flight; grid drift on InstaBlogs
Layout words by section: hero=split / services=grid / work=grid / tools=row / contact=split
Scores: design 7 · usability 7.5 · creativity 7 · content 7 → overall 7.1
Caps applied: inspect FAILs on Home (icon-cards) and Projects (focal-point, empty-screens) cap overall at 6.0
Top three problems:
1. Home services row reads as icon cards (desktop-fold): accepted since Phase 3
2. Projects first screen has no dominant element (projects-en/desktop-fold): accepted
3. InstaBlogs grid: wireframe nav bars still touch the top crop at 1.5% (9-instablogs-col1-centred-1440): user-checked in UAT
```

## Manual UAT (Task 2)

The user's resume signal, word for word: **"approved"**. It covers all 7 steps: Safari 26, Firefox 159 with the Q7 no-morph fallback, VoiceOver Q6 (single announcement), keyboard Ask + skip link, real Figma embed wheel, the pressed cue on touch, and the Phase 7 commit list review (100 commits, 8151deb~1..f108903). The results are recorded in the 07-VALIDATION.md Manual-Only rows.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] e2e specs broken by 07-15's lazy contact form**
- **Found during:** Task 1, `pnpm verify` run 1.
- **Issue:** three specs used or measured around the contact form before the on-demand controller had mounted. 07-15 ran only a subset of specs, so it did not catch them.
- **Fix:**
  - Each spec calls `openContactForm(page)` before using the form or measuring the footer.
  - The footer magnetic test also waits until the icon's box is the same across two reads.
  - No `expect(` line was removed.
- **Verification:** 5/5, 5/5 and 10/10 with `--repeat-each`; both specs 27/27; eslint and prettier clean.
- **Files modified:** tests/e2e/motion-pointer.spec.ts, tests/e2e/motion-toggle.spec.ts
- **Commit:** 7d3ac29

### Environment

- A local IPv6 outage to challenges.cloudflare.com blocked `@network` reruns, and the user accepted the run 1 pass (C). The machine was also under heavy load (load average about 12.7) and slept during the run.

## Open gaps

- **(A) Contact form height jump.** Measured with a one-off probe, not committed:
  - When the 07-15 controller replaces the no-JS block (120 px at 1440, 144 px at 390) with the form (682 px / 937 px), Home grows by **+450 px at 1440 and +793 px at 390**.
  - A visitor below `#contact` when it mounts (End key, footer jump, Back restoring a lower position) sees the footer jump.
  - Fix direction: reserve the form's height. Plan it with `/gsd:plan-phase 7 --gaps`. It is not fixed here, by user decision.

## Carried follow-ups

- 07-11 (not tested): on `/?service=X`, clicking the same-service Ask link after changing the chip does not re-apply X.
- 07-15: non-Home pages grew 146 B (shared chunk split). The focus fix for the mailto-block hide landed outside the plan as 1bb3c3a.
- 07-16: the tap-to-wipe-start cold-gzip median of 218.5 ms comes from a local gzip proxy, not the deployed edge. Card titles show no pressed underline under `on`, by design.
- Flaky: `smooth-scroll.spec.ts:136` End key, 6 px short in two loaded full runs, 5/5 in isolation. [Inference] It may be related to gap (A) or another late settle.
- Accepted: collection drift halved to 1.5% / 1.3% (fe46f68).

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: .planning/phases/07-page-transitions-smooth-scroll/07-VALIDATION.md (`grep -c "07-1[1-6]-T"` = 12, contains 07-17)
- FOUND commits: 7d3ac29, f108903
