---
phase: 07-page-transitions-smooth-scroll
plan: 10
subsystem: quality-gate
tags: [bundle-budget, taste-skill, e2e, captures, validation]
requires:
  - "07-09 (detail stack side entrance, captures items 1-7)"
provides:
  - "measure:bundle guard: gsap + lenis eager markers and the 22,000 B eager gzip ceiling"
  - "capture item 8 (embed glide) and the Pixel 7 Fast 4G touch-latency measurement"
  - "phase taste-gate evidence and the user's checkpoint decisions"
affects:
  - "gap-closure plans for Phase 7 (eager JS cuts, --t-wipe, grid motion, morph, touch latency)"
tech-stack:
  added: []
  patterns:
    - "pure helpers in scripts/bundle.ts (findEagerMarkers, checkEagerCeiling) unit-tested, wired into measure-bundle.ts"
key-files:
  created:
    - .planning/phases/07-page-transitions-smooth-scroll/07-10-SUMMARY.md
  modified:
    - scripts/bundle.ts
    - scripts/measure-bundle.ts
    - tests/unit/measure-bundle.test.ts
    - tests/e2e/transitions-capture.spec.ts
    - .planning/phases/07-page-transitions-smooth-scroll/07-VALIDATION.md
decisions:
  - "Eager ceiling stays at 22,000 B gzip (user, 2026-11-04): cut deferrable eager chunks instead of raising it"
  - "--t-wipe shortened to 480 ms (gap)"
  - "Vertical wipe kept; reverse morph out of v1"
  - "CollectionModule grids get motion (gap)"
  - "Morph: no doubled title mid-flight and no difference blend, plain ink title (gap)"
metrics:
  duration: "~1h45m"
  completed: 2026-11-04
requirements: [MOTN-05, MOTN-06, MOTN-09]
---

# Phase 7 Plan 10: Phase gate (bundle guard, taste gate, checkpoint) Summary

`pnpm measure:bundle` now fails when GreenSock or Lenis code is in an eager chunk, or when eager gzip JS on `/` or `/es/` goes over 22,000 B. The whole suite is green. The full taste gate ran (captures 1-8, lint.mjs, inspect.mjs on 6 URLs), and the user's checkpoint decisions are recorded. The budget is a **known open gap**: eager JS measures 23,010 B, 1,010 B over the ceiling the user confirmed, and is to be closed by loading deferrable chunks on demand.

## Task commits

| Task | Commit | Description |
|---|---|---|
| 1 RED | db64131 | failing tests for `findEagerMarkers` / `checkEagerCeiling` |
| 1 GREEN | 6ec3ddd | helpers in `scripts/bundle.ts`; `EAGER_MARKERS` + `EAGER_CEILING_GZIP` in `measure-bundle.ts` |
| 2 | 906b68b | capture item 8, touch latency, VALIDATION map statuses |
| 3 (decisions) | see final commit | ceiling comment, VALIDATION decisions, this SUMMARY |

## Bundle (`pnpm measure:bundle`, fresh build, gzip -9)

| Measure | `/` | `/es/` |
|---|---|---|
| Phase 6 baseline | 14,643 B | 14,643 B |
| After router (07-01 record) | 20,732 B | 20,732 B |
| 07-05 record | 21,480 B | 21,480 B |
| **Final (07-10)** | **23,010 B** (13 files) | **23,010 B** |
| Delta vs Phase 6 | +8,367 B | +8,367 B |
| Ceiling | 22,000 B: **over by 1,010 B** | same |
| Lazy GSAP | 27,107 B (+ SplitText 3,256 B) | same |
| Lazy Lenis | **5,350 B** (target ≤ 6,000 B) | same |

- Eager chunks, largest first: ContactForm 6,652 B, ClientRouter 5,590 B, BaseLayout 3,233 B, motion 3,201 B, CursorFollower 1,096 B, load-gsap 1,008 B, MotionToggle 549 B, Hero 505 B, ToolsRow 451 B, tokens 307 B, RolesMarquee 297 B, ServiceChips 77 B, client 44 B.
- No `GreenSock` or `lenisVersion` in any eager chunk [Verified].
- +1,530 B came in between 07-05 and 07-10 (plans 07-06 to 07-09). [Unverified] I can't split it per plan, because those builds were not measured on their own.

## Regression

- `pnpm verify` final run: astro check 0 errors, eslint and prettier clean, **1,242 unit**, **771 e2e passed / 110 opt-in skipped**, `secrets check ok (1016 dist files scanned)` [Verified].
- The first full run had one failure: `motion-reveal.spec.ts:491` "split keeps a detail h1 lang span throughout at 390", a 1,500 ms `toBeAttached` timeout in a Phase 6 spec. It did not come back in 10 isolated runs (`--repeat-each=5` at both widths), 219 parallel stress runs (motion-reveal + transitions + stack-entrance, 12 workers) or the next full run. I recorded it as flaky and did not change the test.
- One run in between failed only on prettier formatting of the capture spec. I fixed it before the final run.

## Captures (`CAPTURE_TRANSITIONS=1`, 77/77 pass, 285 PNGs in `.taste-skill/transitions/`)

| Item | Files |
|---|---|
| 1 forward/back wipe 25/50/70/100% | `1-{forward,back}-{en,es}-{1440,390}-{25,50,70,100}.png` (32) |
| 2 morph 0/30/50/70/100% | `2-{instablogs,longest-es}-{en,es}-{1440,390}-{pct}.png` (40) |
| 3 Home compact card morph 50% | `3-{en,es}-{1440,390}-50.png` (4) |
| 4 EN/ES switch 50% | `4-{en,es}-{1440,390}-50.png` (4) |
| 5 reduced crossfade 50% | `5-{en,es}-{1440,390}-50.png` (4) |
| 6 arrival at release and settle | `6-{release,settle}-{en,es}-{1440,390}.png` (8) |
| 7 parallax + stack seams | `7-{home,projects,teaser}-{1440,390}-{entering,centred,leaving}.png` (18), `07-stack-{purov,mart}-seam{N}-{pos}-{w}.png` (174) |
| 8 embed mid-glide | `8-embed-glide-en-1440.png` |

- **Item 8** (`/projects/portfolio-web/`, Figma stubbed): scrollY was 12,720 at the start, 13,120 at +150 ms, 13,120 at rest, and 13,520 after a second notch. Over the cross-origin iframe the wheel chains to the page natively, in one jump with no Lenis glide, and the page is never stuck. Lenis only sees wheel events outside the iframe [Inference]. How the real Figma embed handles the wheel is a manual UAT item.
- Seam captures exist only for PuroV and Mart. The other projects are `stackMotion: false` (07-09 opt-outs).

## Touch latency (Pixel 7, CDP Fast 4G: 150 ms latency, 1.6 Mbps down, 10 taps on the Projects nav link from Home)

| Cache | Median tap → `startViewTransition` | Samples (ms) |
|---|---|---|
| default | **296.5 ms** | 449, 158, 296, 295, 297, 296, 298, 301, 301, 160 |
| disabled (cold) | **538.5 ms: over 300 ms, raised** | 527, 526, 540, 539, 529, 539, 538, 541, 528, 539 |

- Requests after the tap: the router's touchstart prefetch starts at about 2 ms and its click fetch at about 82 ms. Both fetch the uncompressed 28,219 B `/projects/` document and finish at about 540 ms when the cache is cold.
- `astro preview` does not compress. The page is 6,196 B gzip -9, so production on Cloudflare would probably be faster [Unverified, not measured].

## Taste gate (taste-skill: SKILL.md steps 7-9, references/motion.md, references/critique.md)

**lint.mjs** `src/components src/pages src/layouts src/styles src/lib/motion` (68 files): 1 FAIL, 1 WARN.
- FAIL `hairline` at `SiteHeader.astro:34 border-b`. It existed before Phase 7 and the UI-SPEC accepts it ("header border stays"). Phase 7 only added `data-site-header` on that line.
- WARN `outlined-box` at `ToolsRow.astro:21`, a Phase 2 file not touched in Phase 7.
- The Phase 7 source diff (`8151deb~1..HEAD -- src`, 33 files) has no `transition-all`, `ease-in`, `scale-0`, `animate-bounce/ping/pulse` or `h-screen`. `taste-skill-ignore` has 1 entry (ServiceChips, Phase 5), and Phase 7 added none.

**inspect.mjs** (preview on 4521; output in `.taste-skill/inspect-07-10/`). Moving elements are at 1440/768/390, with Phase 6 (06-10) in brackets:

| URL | Moving | Codes |
|---|---|---|
| `/` | 37/37/38 (34/34/35) | FAIL `icon-cards` (accepted) |
| `/es/` | 37/37/39 (34/34/36) | FAIL `icon-cards` (accepted) |
| `/projects/` | 27/27/27 (21/21/21) | FAIL `focal-point`, `empty-screens` (both pre-existing, accepted) |
| `/projects/website-instablogs/` | 6/6/6 (5/5/5) | FAIL `still-page` (accepted artefact) |
| `/projects/cabreras-motos-posts/` | 14/14/15 (13/13/14) | 0 FAIL |
| `/es/projects/website-instablogs/` | 6/6/6 (5/5/5) | FAIL `still-page` (accepted artefact) |

- Every page also shows the WARNs `hairline`, `palette-cream`, `no-footage` (accepted) and `first-action` (accepted artefact).
- `still-page` did not regress on any URL (every count is the same or higher).
- No page reports `overflow` (horizontal overflow is 0 at every width), `clipped-text`, `covered-text`, `empty-screens` (beyond the accepted `/projects/` one), `headline-lines`, `shadow`, `gradient` or `glass`.

**Critique per Phase 7 acceptance bullet** (judged from the captures):

| Bullet | Result |
|---|---|
| Wipe is one flat pass, with no old/new overlap under the ink | Pass (`1-*`, `4-*`) |
| Header never moves, fades or flickers, in both locales | Pass |
| Morph title readable at every sampled frame and lands on the h1 | Pass with soft findings. At 50% the old and new title images overlap as a doubled/ghosted title (`2-*-50`, `3-*-50`). At 30% the difference blend tints the title blue over the InstaBlogs cover (`2-instablogs-en-1440-30`). **User decision: fix both (gap).** |
| Nothing on the arriving page animates while still covered | Pass (`6-release-*`, `6-settle-*`) |
| Card parallax never shows an empty frame edge or crops text | Pass (`7-*`). In the stack, every kept seam settles at 0 and no composition-continuing seam keeps the effect (07-09 data opt-outs) |
| `reduced` shows only fades | Pass (`5-*`: no panel, no morph, no drift) |
| Smooth scroll feels subtle | Final **lerp 0.12**: about 0.6 s settle per notch, a short catch-up rather than a float [Inference]. The hands-on feel is part of the pending manual UAT |

- Overrides recorded: Lenis (D-06) and the cursor follower (Phase 6 D-09) go against motion.md §6. Both are user decisions.
- Capture note: in `2-instablogs-*-30.png` the Visual-system cover is blank in the old-page snapshot. [Inference] It is a lazy image not yet loaded when the frame was captured, not a site defect.

```
ROUND 1
Seen in one second: "Hi, I'm Martina." and her portrait
Idea (one sentence): a designer's own work, framed by ink page turns, leads every route
Live thing: the ink wipe and title flight between pages; the motion toggle
Layout words by section: hero=split / services=grid / work=grid / tools=row / contact=split
Scores: design 7 · usability 7.5 · creativity 7 · content 7 → overall 7.1
Caps applied: inspect FAILs on Home (icon-cards) and Projects (focal-point, empty-screens) cap overall at 6.0
Top three problems:
1. Mid-morph doubled title (2-*-50, 3-*-50): hide the old title before the new one shows (gap)
2. Difference-blend tint over covers (2-instablogs-*-30): plain ink title (gap)
3. Home services row reads as icon cards (inspect icon-cards): pre-existing, accepted at Phase 3
```

## Checkpoint decisions (user, relayed by the orchestrator, 2026-11-04)

- **Q1 eager ceiling:** keep `EAGER_CEILING_GZIP = 22_000`; do not raise it. Directive: "defer anything that can be deferred". Every eager chunk not needed for first paint or interaction loads on demand: ContactForm (6,652 B) first, then whatever in motion/BaseLayout can wait. This is a gap-closure item, not done here.
- **Touch latency** (cold median 538.5 ms): follow-up gap (production compression check and/or immediate touch feedback).
- **Q2:** shorten `--t-wipe` to **480 ms** (gap).
- **Q3:** keep the vertical wipe.
- **Q4:** the reverse morph stays out of v1.
- **Q5:** CollectionModule grids get **motion**, not static (gap).
- **Morph soft findings** (orchestrator decision delegated by the user): fix both. No doubled/ghosted title mid-morph (the old title is hidden before the new one shows), and no difference blend, so the morph title stays plain ink (gap).
- **Q6** (VoiceOver double announcement) and **Q7** (per-engine no-morph fallback): pending manual UAT after the gaps.
- **Manual UAT** (Safari 26, Firefox 159, VoiceOver, real Figma embed wheel, find bar): **not done yet**. The user runs it after the gap fixes land.
- Phase commit review and `/security-review`: due at phase close, after the gaps.

## Gaps for closure

1. **Eager JS under 22,000 B:** lazy-load deferrable eager chunks (ContactForm 6,652 B first, then deferrable parts of motion/BaseLayout) until `pnpm measure:bundle` exits 0. Measured now: 23,010 B.
2. **`--t-wipe` 480 ms** (tokens, CSS, release timing, e2e budgets).
3. **CollectionModule grid motion** (respecting reduced/off and the leak contract).
4. **Morph:** no doubled title mid-flight, and a plain-ink title with no `mix-blend-mode: difference`.
5. **Touch latency follow-up:** check production compression on Cloudflare and/or give immediate feedback on touch (cold-cache median 538.5 ms).
6. **Manual UAT after the fixes:** Safari 26 and Firefox 159 (wipe, morph, back wipe, parallax, Lenis glide, find bar), VoiceOver double announcement (Q6), engine morph fallback (Q7), and the real Figma embed wheel.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 - Blocking] Prettier formatting of the capture spec**
- **Found during:** Task 2 (second `pnpm verify`)
- **Issue:** a scripted edit left the touch-latency loop body unindented.
- **Fix:** `prettier --write`; the third verify run is green.
- **Commit:** 906b68b

### Additions

- The touch-latency measurement runs twice, cold cache and default cache, and records which requests ran after each tap. The plan asked for one profile; one cold number alone would have overstated the delay a real phone sees after prefetch [Inference].
- Item 8 records scrollY at start, +150 ms, rest and after a second notch as annotations, so the "never stuck" claim has numbers behind it.

### Not changed

- The flaky Phase 6 split-heading e2e. It could not be reproduced, so it is out of scope (logged above).

## Known Stubs

None. Item 8 stubs the Figma embed in the capture test only (no network). The site has no stubs.

## Self-Check: PASSED (with one known open gap)

- FOUND: scripts/bundle.ts (`lenisVersion` is referenced in measure-bundle.ts; `findEagerMarkers` and `checkEagerCeiling` are in bundle.ts)
- FOUND: scripts/measure-bundle.ts (`EAGER_CEILING_GZIP` appears 5 times)
- FOUND: tests/e2e/transitions-capture.spec.ts (items 1-8 and touch latency)
- FOUND commits: db64131, 6ec3ddd, 906b68b
- **Known open gap, not a failure:** `pnpm measure:bundle` exits 1 at 23,010 B against the 22,000 B ceiling the user confirmed. Closure is gap item 1.
