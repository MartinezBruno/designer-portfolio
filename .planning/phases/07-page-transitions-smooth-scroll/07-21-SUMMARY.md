---
phase: 07-page-transitions-smooth-scroll
plan: 21
subsystem: quality-gate
tags: [gap-closure, layout-shift, regression, bundle, taste-gate, turnstile]
requires: ["07-18", "07-19", "07-20", "07-12"]
provides:
  - Gate evidence that the layout-shift gap is closed on the combined 07-18..07-20 result
  - Turnstile slot that holds its 140 px reserve once the real widget renders
  - 07-VALIDATION.md rows 07-18-T1..07-21-T1
affects:
  - src/components/contact/ContactForm.astro
  - tests/e2e/contact-lazy.spec.ts
  - tests/unit/contact-section.test.ts
tech-stack:
  added: []
  patterns:
    - "A slot that hosts an inline iframe gets leading-[0], so no line-box descent is added under the iframe"
    - "Fakes for third-party widgets copy the real widget's size and anatomy, not just its presence"
key-files:
  created:
    - .planning/phases/07-page-transitions-smooth-scroll/07-21-SUMMARY.md
  modified:
    - src/components/contact/ContactForm.astro
    - tests/e2e/contact-lazy.spec.ts
    - tests/unit/contact-section.test.ts
    - .planning/phases/07-page-transitions-smooth-scroll/07-VALIDATION.md
    - .planning/phases/07-page-transitions-smooth-scroll/deferred-items.md
decisions:
  - "The smooth-scroll End failure was a 6 px Turnstile slot overflow (146 vs 140 px), not a flake. It was fixed as a Rule 1 deviation, and the 2 px tolerance was kept"
  - "Two @network token timeouts in run 2 count as transient: 30/30 on rerun, then a clean full run 3"
metrics:
  duration: ~45 min
  completed: 2026-11-05
  tasks: 1
  files: 5
---

# Phase 7 Plan 21: Layout-shift gap closure gate Summary

On the combined 07-18..07-20 result, the lazy contact form no longer moves the page when it mounts. The gate found one remaining 6 px growth: the real Turnstile widget overflowed its 140 px slot. That is now fixed (1cebe5d), the final `pnpm verify` passed (807 e2e, 0 failed, every `@network` test ran) and all other gates passed.

## Tasks

| Task | Name | Commits |
| ---- | ---- | ------- |
| 1 | Full regression, layout-shift assertions, bundle gate, taste gate, validation map | dc51612 (RED test), 1cebe5d (fix), c45269c (docs) |

## Step 1: Regression (`pnpm verify`)

| Run | Tree | Result |
| --- | ---- | ------ |
| 1 | base 9e0ddf7 | astro check 0 errors, eslint + prettier clean, 71 files / 1,308 unit tests. E2E: **802 passed / 117 skipped / 1 failed**. The failure was `smooth-scroll.spec.ts:136` keyboard End, 6 px short of the bottom (limit 2). Every `@network` test passed, so the network was reachable. |
| 2 | after 1cebe5d | lint and unit as above. E2E: 805 passed / 117 skipped / 2 failed. Both failures were `@network` tests that waited 15 s for a Turnstile token: `contact-states.spec.ts:116` "pre-selected on en-1440" and `contact.spec.ts:181` "/ success". On rerun both passed 30/30 (`--repeat-each 5`), and every `@network` test in contact and contact-states passed 108/108 (`--repeat-each 2`). |
| 3 | after 1cebe5d | **exit 0**. astro check 0 errors, eslint + prettier clean, 1,308 unit tests, **807 e2e passed / 117 skipped / 0 failed** (including all `@network` tests), `secrets check ok (1018 dist files scanned)`. |

`E2E_OFFLINE` was not needed because challenges.cloudflare.com was reachable in every run.

### Root cause of the End failure (the 07-20 deferred item)

- I measured it with one-off Playwright probes against `astro preview` (scratch scripts, not committed). At 1280x720, the size of the default Desktop Chrome project, the page was 2,998 px tall at load. When the form mounted and the real widget rendered, it grew to **3,004 px**, after `End` had already landed. The reserve itself was correct: the hidden form was 681.59 px tall before the mount and 687.59 px after.
- The whole 6 px came from `[data-turnstile]`. It is 140 px before the mount (`min-h-[140px]` with the loading note). With the real compact widget it was **146 px**. The widget is a 150x140 iframe inside a closed shadow root. An inline iframe sits on the text baseline, so the inherited 24 px line box added a 6 px descent under it. 1440x900 (`/`) and 390x844 (`/es/`) showed the same 140 to 146 px.
- The 07-18 e2e did not catch this because its fake widget is an empty div with no height.
- **Fix (Rule 1):** `leading-[0]` on the slot. The loading note sets its own leading with `text-sm`. With this CSS injected, the probe measured the real widget's slot at 140 px and the page at 2,998 px. The screenshots show the widget whole, nothing cropped.
- **Regression tests:** a new `07-21` describe in `contact-lazy.spec.ts`. Its fake widget copies the real one: an inline 150x140 iframe in a closed shadow root. It covers 1280x720 `/`, 1440x900 `/` and `/es/`, and 390x844 `/`. On the old markup all 4 failed with `slot 140 -> 146`; after the fix all 4 pass. A unit test also asserts the `leading-[0]` token.
- The keyboard End test passed **5/5 in isolation** after the fix (`-g "End" --repeat-each 5`) and passed in full run 3. Its 2 px tolerance was not changed.

## Step 2: Layout-shift assertions

- `pnpm exec playwright test tests/e2e/contact-lazy.spec.ts -g "07-18" --repeat-each 3`: **21/21 passed**. That is 7 tests x 3: 1440x900 and 390x844 on `/` and `/es/`, the reduced-motion case, and two no-JS cases.
- The deltas below come from a probe that held the lazy chunk until the reader was at the bottom, then released it and let the **real** Turnstile test-key widget render:

| Viewport | Path | footer docTop | footer viewTop | scrollHeight |
| -------- | ---- | ------------- | -------------- | ------------ |
| 1440x900 | `/` | 0 px | 0 px | 0 px (2,998) |
| 1440x900 | `/es/` | 0 px | 0 px | 0 px (2,998) |
| 390x844 | `/` | 0 px | 0 px | 0 px (5,660) |
| 390x844 | `/es/` | 0 px | 0 px | 0 px (5,766) |
| 1280x720 | `/` and `/es/` | 0 px | 0 px | 0 px (2,998) |

All of these are within the 1 px limit.

## Step 3: MOTN-09

- `pnpm exec playwright test tests/e2e/navigation-leaks.spec.ts --repeat-each 2`: **2/2 passed**. Listener and ScrollTrigger counts stay constant over 10 navigations, including the press listeners added by 07-19.

## Step 4: Bundle (`node scripts/measure-bundle.ts`, after the run 3 build)

`bundle check ok`, 20 pages.

| Route group | Eager gzip -9 | vs 07-17 |
| ----------- | ------------- | -------- |
| `/`, `/es/` | **17,918 B** (4,082 B under 22,000) | +278 B vs 17,640 B |
| `/projects/portfolio-web/`, ES | 16,258 B | +108 B vs 16,150 B |
| other 16 pages | 15,584 B | +109 B vs 15,475 B |

- [Inference] The growth comes from the 07-19 loader (17,813 B at 07-19) and the 07-20 nav-focus changes. The 07-21 fix is a Tailwind class, so it adds CSS only and no JS.
- `git diff f108903 -- scripts/measure-bundle.ts` is empty, and `EAGER_CEILING_GZIP = 22_000` is unchanged.

## Step 5: Taste gate

- **Skill:** the Skill tool was not exposed to this executor, so I read `SKILL.md` and `references/critique.md` directly and applied them (see Deviations).
- **lint.mjs** `src/components src/pages src/layouts src/styles src/lib/motion src/lib/ui` (76 files): FAIL `hairline` SiteHeader.astro:34 and WARN `outlined-box` ToolsRow.astro:21. Both are the same as in 07-10 and 07-17 and were already accepted. The changed ContactForm.astro adds no finding.
- **inspect.mjs** (preview on 4321, output in `.taste-skill/inspect-07-21/{en,es}/`):

| URL | Codes | vs 07-17 |
| --- | ----- | -------- |
| `/` | FAIL `icon-cards`; WARN `hairline`, `palette-cream`, `first-action`, `no-footage` | same (accepted) |
| `/es/` | FAIL `icon-cards`; WARN `hairline`, `palette-cream`, `first-action`, `no-footage` | same (accepted) |

**No new FAIL.**

- **Screenshots reviewed:**
  - inspect `en/desktop-page-01.jpg`, `en/desktop-fold.jpg`, `es/mobile-page-01.jpg`, `es/mobile-fold.jpg`. These show the real test-key widget at its full 150x140 and nothing clipped. The 390 ES shot shows "¡Operación exitosa!".
  - `CAPTURE_CONTACT=1` (7/7 passed), 8 shots in `.taste-skill/inspect/07-18/`: `1440x900-en-pre`, `1440x900-en-post`, `1440x900-es-pre`, `1440x900-es-post`, `390x844-en-pre`, `390x844-en-post`, `390x844-es-pre`, `390x844-es-post`.

```
ROUND 1
Seen in one second: "Tell me about your project" beside the blue Email me / Send message pill
Idea (one sentence): a designer's own work, framed by ink page turns, leads every route (unchanged by this plan)
Live thing: the contact form (service chips preselected by "Ask about this")
Layout words by section: hero=split / services=grid / work=grid / tools=row / contact=split
Scores: design 7 · usability 7.5 · creativity 7 · content 7 → overall 7.1
Caps applied: inspect FAIL icon-cards on Home (accepted since Phase 3) caps overall at 6.0
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. Pre-mount reserve (390x844-es-pre, 1440x900-en-pre): about 790 px / 450 px of empty ground under the mailto block while the chunk is in flight. This is the accepted 07-18 trade-off. The near-view trigger usually mounts before the reader arrives. No change.
2. Post-mount with the hermetic fake widget (1440x900-en-post, 390x844-es-post): the empty 140 px Turnstile slot leaves a gap beside or above Send message. It is a test-only artefact: the real widget fills the slot exactly (inspect desktop-page-01, mobile-page-01). No change.
3. Test-key widget (inspect desktop-page-01): the red "For testing only" Cloudflare banner sits in the widget. It comes from the preview's dummy key, and production uses the real site key. No change.
```

## Step 6: Validation map

- Added rows `07-18-T1`, `07-18-T2`, `07-19-T1`, `07-19-T2`, `07-20-T1`, `07-20-T2` and `07-21-T1`. `grep -c` prints 7.
- Updated the 07-10-T1 budget row to the 17,918 B max eager.
- No existing rows were deleted or rewritten.
- Marked the deferred End item in deferred-items.md as resolved.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The Turnstile slot outgrew its 140 px reserve once the real widget rendered**
- **Found during:** Task 1, step 1 (`pnpm verify` run 1, smooth-scroll End test, as the prior-wave note predicted)
- **Issue:** the compact widget's inline iframe sat on a 24 px line box, which made the slot 146 px. The page grew 6 px after the form and widget appeared, below the reader. The 07-18 fake widget had no height, so its tests could not see this.
- **Fix:** `leading-[0]` on `[data-turnstile]` in ContactForm.astro. Added a real-anatomy fake widget e2e (4 cases) and a unit assertion for the class.
- **Files modified:** src/components/contact/ContactForm.astro, tests/e2e/contact-lazy.spec.ts, tests/unit/contact-section.test.ts
- **Commits:** dc51612 (RED, 4/4 failed with `slot 140 -> 146`), 1cebe5d (GREEN)
- **Note:** the plan listed only 07-VALIDATION.md under `files_modified`. The orchestrator's prior-wave instructions allowed this source fix if the defect proved small and clearly scoped, which it was.

**2. Taste skill applied by reading, not through the Skill tool**
- The Skill tool was not available in this executor environment, as in 07-18. I read SKILL.md and critique.md directly, ran lint.mjs and inspect.mjs as specified, and reviewed the screenshots.

### Environment

- The worktree started on an old phase-05 commit (234dcb2). As the branch check required, I reset it to the expected base 9e0ddf7 before doing any work.
- Dependencies were installed with `pnpm install --frozen-lockfile`. No package was added.

## Known Stubs

None.

## Threat Flags

None. The fix is one CSS class on existing markup. The validation docs contain only numbers and commands, and `check:secrets` passed.
