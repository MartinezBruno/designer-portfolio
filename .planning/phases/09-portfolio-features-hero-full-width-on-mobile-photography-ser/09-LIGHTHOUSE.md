# Phase 9 Lighthouse re-measure (09-08, D-04)

The 08-17 protocol (08-LIGHTHOUSE.md "Re-measure rule"), re-run on the final Phase 9 src commit. Nothing in src/ was changed for the measurement (`git status --porcelain -- src` was empty). Raw JSON is in the gitignored `tmp/lighthouse/` (`p9-select-*.json`, `p9-home-1..5.json`, `p9-detail-1..5.json`, plus the informational `p9br-home-1..3.json`). The throwaway helpers (`p9-sel.sh`, `p9-runs.sh`, `p9-rank.mjs`, `p9-sum.mjs`) are not committed.

**Result: D-04 is not met.** The Home mobile LCP median is **2,933 ms**, over the 2,500 ms budget. 09-08 fails for gap closure (see "Diagnosis" and "Gap closure input").

## Context

| Item | Value |
|---|---|
| Date | 2026-11-10 (selection 16:59–17:00 UTC, protocol runs 17:00–17:02 UTC) |
| Commit measured | `bda5a84` (`git log -1 --format=%h -- src`: "fix(09-07): show every visible card on filter change"). HEAD was `2c71bc8` (docs only after `bda5a84`). `git status --porcelain -- src` was empty |
| Lighthouse | 13.6.0 (`pnpm dlx lighthouse@13.6.0`) |
| Chrome | Google Chrome 157 (`/Applications/Google Chrome.app`), `--headless=new`. lhr userAgent `HeadlessChrome/157.0.0.0`, the same major version as 08-17 |
| Node | v24.15.0 |
| benchmarkIndex | selection 3,357–3,394.5; Home 3,378–3,408.5; detail 3,368–3,398. That is lower than 08-17 (4,664.5–4,712). The machine was slower during this session. Home FCP (1,208) and the detail LCP (2,633) match 08-17 exactly, so the simulated results here do not depend on it |
| Settings | formFactor `mobile`, throttlingMethod `simulate` (rtt 150 ms, 1,638.4 kbps, CPU slowdown 4x). No preset. Fresh temporary profile per run (motion stays at the default `on`) |
| Preview | `pnpm build && node scripts/e2e-preview-env.ts && pnpm astro preview --port 4485 --ignore-lock`, under the `tmp/build-e2e.lock` lock for the whole build-and-measure span |
| Quiet machine | `pgrep -fl "playwright\|astro (dev\|preview)\|lighthouse"` showed only this plan's preview on 4485, before the selection runs and again before the protocol runs. The 09-08 verify and `@network` Playwright runs had finished. All runs were strictly sequential |
| Compression | `curl -sI -H 'Accept-Encoding: br, gzip' http://localhost:4485/` has **no `content-encoding`**. As in 08-08 and 08-17, the local preview serves text uncompressed |

Command per run (as in 08-17):

```bash
pnpm dlx lighthouse@13.6.0 <url> --only-categories=performance \
  --output=json --output-path=tmp/lighthouse/p9-<name>.json --chrome-flags="--headless=new" --quiet
```

## Heaviest-page selection (7 runs, one per EN detail page)

Ranked by `audits['total-byte-weight'].numericValue`. Image KB is the sum of `network-requests` transferSize for resourceType `Image`.

| Rank | EN detail page | total-byte-weight (KB) | Image (KB) | Requests | LCP (ms, single run) | Score |
|---|---|---|---|---|---|---|
| 1 | **/projects/website-reciclick/** | **500.8** | 198.5 | 26 | 2,633 | 97 |
| 2 | /projects/cabreras-motos-posts/ | 495.8 | 203.0 | 23 | 3,635 | 90 |
| 3 | /projects/purov/ | 495.4 | 187.1 | 28 | 2,710 | 96 |
| 4 | /projects/website-instablogs/ | 479.2 | 113.0 | 25 | 2,784 | 96 |
| 5 | /projects/sistema-visual/ | 440.7 | 151.9 | 18 | 3,234 | 93 |
| 6 | /projects/portfolio-web/ | 432.5 | 133.2 | 24 | 2,483 | 98 |
| 7 | /projects/mart/ | 429.4 | 129.9 | 29 | 2,408 | 98 |

Selected page: `/projects/website-reciclick/`, the same as 08-08 and 08-17. Every page is about 2.4 KB heavier than in 08-17 (the larger shared CSS, 55.2 → 57.3 KB), and the image bytes are unchanged.

## Results (5 runs per page)

### Per run

| Run | LCP (ms) | LCP element | FCP (ms) | TBT (ms) | CLS | LCP resource transfer | total-byte-weight (KB) | benchmarkIndex | Score |
|---|---|---|---|---|---|---|---|---|---|
| home-1 | 3,621 | `img.block` hero portrait, `portrait.BrseJGMn_2dXNKl.avif` (768w) | 1,207 | 207 | 0.000 | 32.2 KB | 473.9 | 3,378.5 | 87 |
| home-2 | 2,858 | hero portrait, 768w AVIF | 1,208 | 0 | 0.000 | 32.2 KB | 473.9 | 3,393.5 | 95 |
| home-3 | 2,934 | hero portrait, 768w AVIF | 1,209 | 0 | 0.000 | 32.2 KB | 473.9 | 3,408.5 | 95 |
| home-4 | 2,933 | hero portrait, 768w AVIF | 1,208 | 0 | 0.000 | 32.2 KB | 473.9 | 3,378 | 95 |
| home-5 | 2,933 | hero portrait, 768w AVIF | 1,208 | 0 | 0.000 | 32.2 KB | 473.9 | 3,385.5 | 95 |
| detail-1 | 2,708 | `img.bg-surface-alt`, `1325566467-e3adcb99f55f.lYtbH9Dw_kVYXy.avif` | 1,058 | 0 | 0.000 | 10.1 KB | 500.8 | 3,376.5 | 96 |
| detail-2 | 2,634 | detail image 1 of 17 | 1,059 | 0 | 0.000 | 10.1 KB | 500.8 | 3,368 | 97 |
| detail-3 | 2,633 | detail image 1 of 17 | 1,058 | 0 | 0.000 | 10.1 KB | 500.8 | 3,383.5 | 97 |
| detail-4 | 2,633 | detail image 1 of 17 | 1,058 | 0 | 0.000 | 10.1 KB | 500.8 | 3,398 | 97 |
| detail-5 | 2,633 | detail image 1 of 17 | 1,058 | 0 | 0.000 | 10.1 KB | 500.8 | 3,372 | 97 |

The Home LCP element in every run is `div.grid > div.order-first > picture.block > img.block`, `<img … alt="Portrait of Martina Fernandez" loading="eager" fetchpriority="high" width="600" height="800" class="block aspect-[4/5] sm:aspect-[3/4] w-full object-cover object-[50%_6%]">`. The chosen candidate is `portrait.BrseJGMn_2dXNKl.avif`, the **768w** AVIF (32,659 B on disk). That matches the 09-01 plan's expectation for Lighthouse's 412 px / DPR 1.75 mobile emulation.

### Medians

| Page | Metric | Median | Min | Max | Budget | Result |
|---|---|---|---|---|---|---|
| Home `/` | LCP (ms) | **2,933** | 2,858 | 3,621 | ≤ 2,500 | **miss (+433 ms)** |
| Home `/` | CLS | 0.000 | 0.000 | 0.000 | < 0.1 | pass |
| Home `/` | TBT (ms) | 0 | 0 | 207 | < 200 | pass (median) |
| Home `/` | FCP (ms) | 1,208 | 1,207 | 1,209 | — | (info) |
| Home `/` | Score | 95 | 87 | 95 | — | (info) |
| Detail `/projects/website-reciclick/` | LCP (ms) | 2,633 | 2,633 | 2,708 | ≤ 2,500 | accepted 08-17 miss, unchanged |
| Detail | CLS | 0.000 | 0.000 | 0.000 | < 0.1 | pass |
| Detail | TBT (ms) | 0 | 0 | 0 | < 200 | pass |
| Detail | FCP (ms) | 1,058 | 1,058 | 1,059 | — | (info) |
| Detail | Score | 97 | 96 | 97 | — | (info) |

home-1 is an outlier (TBT 207 ms, LCP 3,621 ms) and is the first run after the selection batch. The other four are 2,858–2,934 ms. Dropping home-1 would not change the result.

### Comparison with 08-17 (medians)

| Page | Metric | 08-17 (`e96db32`) | 09-08 (`bda5a84`) | Delta |
|---|---|---|---|---|
| Home | LCP (ms) | 1,207 | 2,933 | **+1,726** |
| Home | LCP element | hero lead `<p data-hero-lead>` (text, at first paint) | hero portrait `<img>` (768w AVIF) | changed |
| Home | FCP (ms) | 1,207 | 1,208 | +1 |
| Home | CLS | 0.000 | 0.000 | 0 |
| Home | Score | 100 | 95 | −5 |
| Home | total-byte-weight (KB, median run) | 443.2 | 473.9 | +30.7 |
| Detail | LCP (ms) | 2,633 | 2,633 | 0 (no regression) |
| Detail | FCP (ms) | 1,058 | 1,058 | 0 |

The detail page did not regress. Phase 9 did not change detail pages, and its LCP median is identical to the accepted 08-17 value.

## Diagnosis (Home)

The 09-01 full-width hero makes the portrait the largest element on the mobile first screen. It is 412 px wide at 4:5, larger than the lead paragraph. So the Home LCP element moved from text, which Lantern reports at simulated FCP, to an image.

The real (observed) load is fast. In the median run (home-4) the observed LCP is 66 ms: TTFB 3 ms, resource load delay 11 ms, resource load duration 13 ms, element render delay 40 ms. `lcp-discovery-insight` and `image-delivery-insight` both pass (score 1). The portrait is requested at 15 ms with `fetchpriority="high"`.

The simulated cost comes from Lantern's image-LCP model. It charges the LCP with the requests in flight by the time the image is painted, simulated over the 1.6 Mbps link. By observed LCP (66 ms), **473.9 KB had been requested**: Document 65.0, CSS 57.3, fonts 88.2, eager scripts about 50, the 768w portrait 32.2, the three `loading="lazy"` Latest-work AVIFs (65.0 + 24.3 + 16.5 = 105.8 KB), and `gsap` + `SplitText` (75.9 KB). The lazy images start at 33 ms with Low priority, because Chrome's lazy-load distance threshold puts them in range. At 1,638.4 kbps (about 205 KB/s), about 474 KB is roughly 2.3 s of transfer, plus the RTTs. That gives the measured 2.86–2.93 s.

Why the Hero.astro fallback was not applied: the plan allows "the smallest Hero.astro change that addresses the measured cause". The measured cause is the bytes in flight next to the portrait, not the portrait itself. To reach 2,500 ms, about 433 ms ≈ 89 KB has to leave the critical window. The whole portrait is 32.2 KB. Dropping to the 640w candidate would save a few KB (about 35 ms). Any change that removes the image from the LCP race would change the D-01 crop or D-02 order, and the plan forbids that. A Hero.astro change would also invalidate the 09-01 taste evidence without meeting the budget. So no src change was made, and the plan fails for gap closure as Task 2 specifies.

## Informational (not the D-04 measurement)

Through the same throwaway Brotli q5 proxy as 08-08 and 08-17 (`tmp/lighthouse/br-proxy.mjs`, port 4486, in front of this build), Home measured **2,109 / 2,259 / 2,259 ms** (total-byte-weight 299.6 KB, CLS 0). That approximates Cloudflare's edge compression and is under the budget, but it is not a deployed measurement and does not replace the protocol result.

## Gap closure input

Candidate directions, ordered by expected effect. All are [Proposed] and unmeasured:

1. Keep the three Latest-work images (about 106 KB) out of the initial request window on mobile, for example by deferring their `src`/`srcset` until near-viewport via IntersectionObserver, or until after `load`. Chrome's native lazy threshold fetches them at 33 ms.
2. Make sure `gsap` + `SplitText` (75.9 KB) start after the hero image paints on Home in every run (they start at 27–38 ms, before observed LCP in 2 of 5 runs).
3. Reduce render-critical bytes (fonts 88.2 KB, CSS 57.3 KB; `render-blocking-insight` still estimates 304 ms for `BaseLayout.B8QXWSMs.css`).
4. Re-decide D-04 with the user (for example accept the miss as in 08-17, or measure with compression).

Re-measure with this same protocol after any fix. The Re-measure rule from 08-LIGHTHOUSE.md applies: the Context must record the new `git log -1 --format=%h -- src`.

## Gap-closure diagnosis (09-09)

Diagnosis only. No src change was made or committed (`git status --porcelain -- src astro.config.ts` was empty before and after). Raw JSON is in the gitignored `tmp/lighthouse/` (`p9g-base-1..3.json`, `p9g-b1-1..3.json`, `p9g-b2-1..3.json`, `p9g-b3-1..3.json`). The throwaway helpers (`p9g-run.sh`, `p9g-sum.mjs`) are not committed. Leftover `p9g-*` files from an earlier, interrupted attempt were moved to `tmp/lighthouse/p9g-stale/` and not used.

**Result: STOP GATE hit.** With the three Latest-work covers **and** `gsap` + `SplitText` blocked (b3), the Home median simulated LCP is **2,933 ms**, the same as the unblocked baseline (2,934 ms) and above the 2,500 ms budget. The D-18 directions cannot reach the budget even if they work perfectly. Task 2 (lever experiments) was not run. The plan stops for a user decision.

### Context

| Item | Value |
|---|---|
| Date | 2026-11-10, runs 21:52–21:57 UTC |
| Commit measured | `bda5a84` (`git log -1 --format=%h -- src`), HEAD `43984e3` (docs only after `bda5a84`). `git status --porcelain -- src` was empty |
| Lighthouse | 13.6.0 (`pnpm dlx lighthouse@13.6.0`), mobile, simulated throttling (defaults), `--headless=new`, fresh profile per run |
| Chrome | lhr userAgent `HeadlessChrome/157.0.0.0` (all 12 runs) |
| benchmarkIndex | 4,630–4,723.5 (back in the 08-17 range; 09-08 measured 3,357–3,408.5) |
| Quiet machine | `pgrep -fl "playwright\|astro (dev\|preview)\|lighthouse"` showed only this plan's preview on 4485 before each batch. All runs strictly sequential. The machine did not sleep during the runs |
| Preview | `pnpm build && node scripts/e2e-preview-env.ts && pnpm astro preview --port 4485 --ignore-lock`, under `tmp/build-e2e.lock` for the whole build-and-measure span |

Built names used (`dist/client/index.html`, `section[aria-labelledby="work-title"]`, and `dist/client/_astro/`):

- Covers (each file appears only in that section): `238078789-a6d30173b2b6.Cd-p3tn1_{Z1LAFEt,aU4UA,ZXckpx}.avif` and `_{29x0Xi,1l8EIm,Z1LwHuv}.webp`; `227934855-72b3d1e09e7c.c7mUXybz_{Z3mR8t,1T8SrA,K1t6s}.avif` and `_{Z1cqjjD,Z20OEyz,Z3iSXv}.webp`; `226450035-4a481fd9ebe7.USSdEV9g_{OkwL5,Z2ikPrM,1CIS11}.avif` and `_{ZjHTp5,Z187fE1,OouV3}.webp`. Lighthouse requests the `ZXckpx`, `K1t6s` and `1CIS11` AVIFs (65.0 + 24.3 + 16.5 KB).
- Lazy chunks: `gsap.DLHyXJrb.js` (68.7 KB), `SplitText.CNCJHyhB.js` (7.2 KB). Eager: `load-gsap.C4xI3dII.js` (1.0 KB) and `preload-helper.DHhhL8Zf.js` (2.0 KB), statically imported by `BaseLayout.astro_astro_type_script_index_0_lang.BQOSl1wm.js`.

Blocked URL patterns, verbatim (one `--blocked-url-patterns=<pattern>` flag each; `lhr.configSettings.blockedUrlPatterns` confirms the list per run):

| Set | Patterns |
|---|---|
| b1 (covers) | `*238078789-a6d30173b2b6*`, `*227934855-72b3d1e09e7c*`, `*226450035-4a481fd9ebe7*` |
| b2 (GSAP) | `*/_astro/gsap.*`, `*/_astro/SplitText.*` |
| b3 (both) | all five above |

The plan suggested `*gsap*`. That pattern would also block the eager `load-gsap.C4xI3dII.js` chunk, which `BaseLayout`'s script imports statically, so the whole effects module would fail and the bound would measure something else. The narrower `*/_astro/gsap.*` blocks only the lazy GSAP core. Blocked requests show in `network-requests` with transferSize 0.

### Per run

Times are request start (`networkRequestTime`) in ms. "<" / ">" = before / after `observedLargestContentfulPaint`.

| Run | Sim. LCP | FCP | CLS | TBT | observedLoad | observedFCP | observedLCP | Portrait (High, 32.2 KB) | Covers (Low) | gsap / SplitText (High) | Requested before obs. LCP |
|---|---|---|---|---|---|---|---|---|---|---|---|
| base-1 | 2,862 | 1,212 | 0 | 0 | 88 | 93 | 93 | 29.6 < | 91.1–91.5 < (105.8 KB) | 106.9 / 107.0 > | 22/24, 398.2 KB |
| base-2 | 2,934 | 1,209 | 0 | 0 | 42 | 50 | 64 | 13.6 < | 33.4–33.9 < | 63.7 / 63.8 < | 24/24, 474.1 KB |
| base-3 | 2,934 | 1,209 | 0 | 0 | 49 | 47 | 59 | 18.1 < | 35.4–35.7 < | 75.7 / 75.8 > | 22/24, 398.2 KB |
| b1-1 | 2,932 | 1,207 | 0 | 0 | 36 | 40 | 55 | 10.3 < | blocked | 54.4 / 54.5 < | 368.2 KB |
| b1-2 | 2,933 | 1,208 | 0 | 0 | 51 | 58 | 72 | 24.8 < | blocked | 71.9 / 72.0 < | 368.2 KB |
| b1-3 | 2,932 | 1,207 | 0 | 0 | 37 | 49 | 49 | 10.1 < | blocked | 62.5 / 62.6 > | 292.3 KB |
| b2-1 | 2,858 | 1,583 | 0 | 0 | 50 | 70 | 70 | 26.0 < | not requested | blocked | 292.3 KB |
| b2-2 | 2,858 | 1,208 | 0 | 0 | 47 | 60 | 60 | 17.4 < | 56.2–56.6 < | blocked | 398.2 KB |
| b2-3 | 2,933 | 1,208 | 0 | 0 | 41 | 46 | 59 | 13.4 < | 32.1–32.5 < | blocked | 398.2 KB |
| b3-1 | 2,933 | 1,208 | 0 | 0 | 46 | 57 | 68 | 17.9 < | blocked | blocked | 292.3 KB |
| b3-2 | 2,934 | 1,584 | 0 | 0 | 39 | 59 | 59 | 13.2 < | blocked | blocked | 292.3 KB |
| b3-3 | 2,933 | 1,208 | 0 | 0 | 46 | 60 | 60 | 17.8 < | blocked | blocked | 292.3 KB |

The LCP element in all 12 runs is the hero portrait, `div.grid > div.order-first > picture.block > img.block`, `portrait.BrseJGMn_2dXNKl.avif` (768w, 32.2 KB, High). lcp-breakdown (base-2): TTFB 3 ms, load delay 9 ms, load duration 14 ms, render delay 38 ms. `render-blocking-insight` still estimates 304 ms for `BaseLayout.URBydJss.css`.

### Medians

| Set | Runs (sim. LCP, ms) | Median | vs base | Budget 2,500 |
|---|---|---|---|---|
| base (nothing blocked) | 2,862 / 2,934 / 2,934 | **2,934** | — | miss (+434) |
| b1 (covers blocked) | 2,932 / 2,933 / 2,932 | **2,932** | −2 | miss (+432) |
| b2 (gsap + SplitText blocked) | 2,858 / 2,858 / 2,933 | **2,858** | −76 | miss (+358) |
| b3 (both blocked) | 2,933 / 2,934 / 2,933 | **2,933** | −1 | **miss (+433): gate fails** |

CLS 0.000 and TBT 0 in all 12 runs. The base median (2,934) matches 09-08 (2,933) on a faster machine (benchmarkIndex about 4,700 vs about 3,390), so the miss does not depend on machine speed.

### Early-GSAP finding

**GSAP core does not start at 27–38 ms.** The 27–38 ms that 09-08 reported is the eager `load-gsap.C4xI3dII.js` chunk (1.0 KB, High), which `BaseLayout`'s module script imports statically together with `preload-helper`. Re-reading the 09-08 raw files (`p9-home-1..5.json`) confirms this: `load-gsap` starts at 27.3–38.0 ms, but `gsap.DLHyXJrb.js` starts at 55.2–70.5 ms, after `observedLoad` (34–48 ms) in all 5 runs. 09-08 paired the early start time with the gsap + SplitText byte count.

In this plan's base runs:

| Run | observedLoad | gsap start | observedLCP | gsap vs load | gsap vs observed LCP |
|---|---|---|---|---|---|
| base-1 | 88 | 106.9 | 93 | after (+19) | after (+14) |
| base-2 | 42 | 63.7 | 64 | after (+22) | **before (−0.3)** |
| base-3 | 49 | 75.7 | 59 | after (+27) | after (+17) |

So `afterLoadIdle` works as designed: GSAP is always requested after window `load`, one frame and idle. No path bypasses it, and no initiator search was needed. It can still precede observed LCP (base-2, and b1-1/b1-2) because window `load` fires 11–22 ms **before** the hero image paints: the portrait has loaded, but its paint (render delay about 38 ms) comes later. A gate on `img[fetchpriority="high"]` decode (G1) would close that race. b2 shows what it can at most be worth: **−76 ms** (2,858 vs 2,934).

### Early-cover finding

The three Latest-work AVIFs start before `observedLoad` in base-2 (33.4 vs 42) and base-3 (35.4 vs 49), and just after it in base-1 (91.1 vs 88). They start before observed LCP in all 3 runs, with Low priority. **But blocking them changes nothing (b1 median 2,932, −2 ms).** [Inference, from the request data above] Lantern's simulated image LCP here is set by the High/VeryHigh critical set, not by the Low-priority covers: Document 65.0 KB + CSS 57.5 KB (render-blocking) + two preloaded woff2 fonts 88.2 KB + the portrait 32.2 KB + about 47 KB of eager module scripts, which is 292.3 KB, all requested at 13–20 ms (base-2). The b3 runs request exactly those 292.3 KB before observed LCP and still simulate 2,933 ms. So the 09-08 "Diagnosis" explanation (the covers and GSAP bytes in flight cause the miss) is **not confirmed**: those bytes are worth at most about 76 ms.

### Gate decision

**b3 median 2,933 ms > 2,500 ms. Gate failed.** Per the plan, Task 2 (G1, I1, I2 and the combos) was not run, and no lever was chosen for 09-10. Fonts, CSS inlining and Hero changes are outside D-18 and were not tried (L5 inlining was measured harmful in 08-14). The budget was not loosened.

### Chosen levers (09-09)

**Needs user decision. No lever pair chosen.** Measured numbers for the decision: base 2,934 ms, b1 (covers blocked) 2,932 ms, b2 (GSAP blocked) 2,858 ms, b3 (both blocked) 2,933 ms, budget 2,500 ms. The D-18 levers (I1/I2 for the covers, G1 for GSAP) are bounded at about −76 ms, so they cannot close the +433 ms gap.

Options for the user, all [Proposed] and unmeasured in this plan:

1. Accept the Home miss as D-04 was accepted for the detail page in 08-17. The remaining cost is the uncompressed local critical path. Under the 09-08 Brotli proxy, Home measured 2,109–2,259 ms.
2. Allow a direction outside D-18 and measure it as a bound first: for example the two preloaded fonts (88.2 KB, High, in the critical set), or a Hero change that keeps the portrait out of the LCP race on phones (which conflicts with D-01/D-02).
3. Re-define the D-04 measurement (for example measure with compression, as Cloudflare serves it).

## Accepted miss sign-off (D-20)

**Decision (user, 2026-11-10):** "Accept the miss (Recommended)". The Home mobile LCP median of **2,933 ms** on src `bda5a84` (uncompressed local preview, 08-17 protocol) is accepted against the 2,500 ms budget.

- **Why the gap-closure levers were dropped:** 09-09 showed that blocking both D-18 levers (Latest-work covers plus gsap/SplitText) leaves the median at 2,933 ms.
- **Measured with compression:** 2,109 / 2,259 / 2,259 ms through the Brotli proxy (09-08, informational).
- **Detail page:** 2,633 ms, the same as the miss accepted in 08-17.
- **Precedent:** this matches the 08-17 detail-page acceptance.
- **Follow-up:** measure production with compression after deploy.
- **Re-measure rule:** this evidence is valid only while `git log -1 --format=%h -- src` = `bda5a84`. Any later src change needs a re-measure with the same protocol.

## Re-measure (09-11)

**Not re-run: the 09-08 measurement is the final-commit measurement.** On 2026-11-10 (09-11), `git log -1 --format=%h -- src` = `bda5a84` and `git status --porcelain -- src` was empty. That is the same src commit measured above with the full 08-17 protocol (`pnpm dlx lighthouse@13.6.0`, 7 selection runs, then 5 runs on `/` and 5 on `/projects/website-reciclick/`). Under the orchestrator amendment after D-20 and the re-measure rule in "Accepted miss sign-off (D-20)", that evidence stays valid, and no Lighthouse run was made in 09-11. 09-10 was dropped and 09-11 Task 3 made no src fix, so W-5 did not trigger a re-run.

| Item | Value (pointer) |
|---|---|
| src commit | `bda5a84` (unchanged since 09-08) |
| Home mobile LCP median | 2,933 ms (2,858–3,621), CLS 0.000. See "Results (5 runs per page)" above |
| Heaviest EN detail median | `/projects/website-reciclick/` 2,633 ms, CLS 0.000. That is +0 ms against the accepted 2,633 ms (limit +100 ms): pass |
| Comparison | 09-08 2,933 ms (`bda5a84`), the same measurement. 08-17 Home 1,207 ms (lead text LCP, before the 09-01 full-width portrait) |
| Raw JSON | `tmp/lighthouse/p9-home-1..5.json`, `p9-detail-1..5.json`, `p9-select-*.json` (gitignored, from 09-08) |

**Result: D-04 is not met on Home (2,933 ms against 2,500 ms). This is an accepted miss (D-20), not a pass.** The budget is unchanged. The detail page holds at the accepted 2,633 ms. Production with compression is still to be measured after deploy (D-20 follow-up).
