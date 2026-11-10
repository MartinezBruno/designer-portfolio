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
