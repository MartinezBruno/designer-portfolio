# Phase 8 — Lighthouse performance report (QUAL-01)

Mobile Lighthouse with default simulated throttling, run against `astro preview` of the production build (D-01). Tool: one-off pinned `pnpm dlx lighthouse@13.6.0` (D-02). The user approved the package on 2026-11-09. It was not added to package.json, the lockfile or the scripts. Raw JSON is in the gitignored `tmp/lighthouse/`.

The sections from "Context" to "Misses" below are the original 08-08 measurement on src `3424e61`. They are superseded by "Re-measure (08-17)", which follows directly, and are kept for comparison.

## Re-measure (08-17)

The same D-01..D-06 protocol, re-run on the final gap-closure src commit (after 08-10..08-16). Nothing else was changed for the measurement (`git diff --quiet -- src` was true). Raw JSON is in the gitignored `tmp/lighthouse/` (`select-*.json`, `home-1..5.json`, `detail-1..5.json`, plus the informational `r17diag-*` and `r17br-*` runs). The throwaway summarizers (`summarize.mjs`, `r17-sum.mjs`) are not committed (D-02).

### Context (08-17)

| Item | Value |
|---|---|
| Date | 2026-11-10 (protocol runs 13:50–13:53 UTC) |
| Commit measured | `e96db32` (`git log -1 --format=%h -- src`; the merge that brought in 08-15's `082c1a5`, after 08-16's `24a112e` and `32f4566`). HEAD was `61d3a43` (docs only after `e96db32`). `git status --porcelain -- src` was empty |
| Lighthouse | 13.6.0 (`pnpm dlx lighthouse@13.6.0`) |
| Chrome | Google Chrome 157.0.8103.51 (`/Applications/Google Chrome.app`), `--headless=new`. lhr userAgent `HeadlessChrome/157.0.0.0`. 08-08 ran on Chrome 156 |
| Node | v24.15.0 |
| Machine | Apple M5, macOS 27.0.1 |
| benchmarkIndex | selection 4,664.5–4,701.5; Home 4,677.5–4,699.5; detail 4,692.5–4,712 |
| Settings | formFactor `mobile`, throttlingMethod `simulate` (rtt 150 ms, 1,638.4 kbps, CPU slowdown 4x). No preset. Fresh temporary profile per run, so motion stays at the default `on` (D-05) |
| Preview | `pnpm install --frozen-lockfile && pnpm build && node scripts/e2e-preview-env.ts && pnpm astro preview --port 4485 --ignore-lock`, under the `tmp/build-e2e.lock` lock for the whole build-and-measure span |
| Quiet machine | `pgrep -fl "playwright\|astro (dev\|preview)\|lighthouse"` showed only this plan's preview on 4485 (0.0% CPU). No other Playwright, Lighthouse, build or dev process. Runs strictly sequential |
| Compression | `curl -sI -H 'Accept-Encoding: br, gzip'` on `/_astro/gsap.DLHyXJrb.js`, `/` and `/_astro/BaseLayout.Nhm1AjyW.css`: **no `content-encoding`** on any of them. As in 08-08, the local preview serves text uncompressed, so the simulated metrics are pessimistic compared with a compressing host |

### Heaviest-page selection (08-17, D-04)

One run per EN detail href from `expectedDetails('en')`, ranked by `audits['total-byte-weight'].numericValue`. Image KB is the sum of `network-requests` transferSize for resourceType `Image`.

| Rank | EN detail page | total-byte-weight (KB) | Image (KB) | Requests | LCP (ms, single run) | Score |
|---|---|---|---|---|---|---|
| 1 | **/projects/website-reciclick/** | **498.4** | 198.5 | 26 | 2,633 | 97 |
| 2 | /projects/cabreras-motos-posts/ | 493.3 | 203.0 | 23 | 3,160 | 93 |
| 3 | /projects/purov/ | 493.0 | 187.1 | 28 | 2,559 | 97 |
| 4 | /projects/website-instablogs/ | 476.8 | 113.0 | 25 | 2,859 | 95 |
| 5 | /projects/sistema-visual/ | 438.3 | 151.9 | 18 | 3,232 | 93 |
| 6 | /projects/portfolio-web/ | 430.1 | 133.2 | 24 | 2,560 | 97 |
| 7 | /projects/mart/ | 427.0 | 129.9 | 29 | 2,557 | 97 |

Selected page: `/projects/website-reciclick/`, chosen by measured total-byte-weight (the same page as in 08-08, now by a 5.1 KB margin over cabreras-motos-posts). The 08-16 768w candidate lowered every page's image bytes. The single selection runs range from 2,557 to 3,232 ms, so the detail result below is not specific to the heaviest page: 3 of 7 pages measured 2,557–2,560 in their single run and 2 measured 3,160–3,232. Those single runs are not medians.

### Results (08-17, D-03: 5 runs per page)

#### Home `/`

| Metric | Median | Min | Max | Budget | Result |
|---|---|---|---|---|---|
| LCP (ms) | 1,207 | 1,207 | 1,208 | < 2,500 | **pass** |
| CLS | 0.000 | 0.000 | 0.000 | < 0.1 | pass |
| TBT (ms) | 0 | 0 | 0 | < 200 | pass |
| FCP (ms) | 1,207 | 1,207 | 1,208 | — | (info) |
| SI (ms) | 1,207 | 1,207 | 1,208 | — | (info) |
| Performance score | 100 | 100 | 100 | — | (info) |

Runs (LCP ms): 1207, 1207, 1207, 1208, 1207.

#### Heaviest detail `/projects/website-reciclick/`

| Metric | Median | Min | Max | Budget | Result |
|---|---|---|---|---|---|
| LCP (ms) | 2,633 | 2,558 | 2,634 | < 2,500 | **miss (+133 ms)** |
| CLS | 0.000 | 0.000 | 0.000 | < 0.1 | pass |
| TBT (ms) | 0 | 0 | 0 | < 200 | pass |
| FCP (ms) | 1,058 | 1,058 | 1,059 | — | (info) |
| SI (ms) | 1,058 | 1,058 | 1,059 | — | (info) |
| Performance score | 97 | 97 | 97 | — | (info) |

Runs (LCP ms): 2633, 2634, 2558, 2634, 2633.

#### JS budgets

| Budget | Measured | Result |
|---|---|---|
| Homepage JS about 100 KB gzip | eager 17,958 B + lazy 42,361 B = **60,319 B gzip -9 (58.9 KiB)** from measure:bundle | pass |
| Eager ≤ 22,000 B per page | max 17,958 B on `/` and `/es/`; detail pages 15,884–16,558 B | pass |

The eager total grew by 297 B on `/` since 08-08, mainly from the 08-16 deferral in `load-gsap` (+170 B gz) and BaseLayout's script (+133 B gz). GSAP stays out of every eager chunk.

### LCP element and breakdown (08-17, median-LCP run)

| Page | Run | LCP element | Observed LCP | Breakdown (observed) | Simulated LCP |
|---|---|---|---|---|---|
| Home | home-5 | `main#main > section.mx-auto > div.grid > p.text-ink`: `<p data-hero-lead class="text-ink text-lead max-w-[46ch] text-pretty lg:col-span-6 lg:pt-2">` | 50 ms | TTFB 3 ms; element render delay 47 ms | 1,207 ms (= simulated FCP) |
| Detail | detail-1 | `div.mx-auto > div.w-full > picture.block > img.bg-surface-alt`: `/_astro/1325566467-e3adcb99f55f.lYtbH9Dw_kVYXy.avif`, `loading="eager" fetchpriority="high"`, 1400×788, 10.1 KB, alt "Reciclick website — image 1 of 17" | 57 ms | TTFB 3 ms; resource load delay 9 ms; resource load duration 11 ms; element render delay 34 ms | 2,633 ms |

The Home LCP is still the hero lead, but it is now reported at first paint (observed 42–63 ms in all 5 runs, compared with about 1,010 ms in 08-08), so simulated LCP equals simulated FCP. On the detail page `lcp-discovery-insight` passes (score 1) and `image-delivery-insight` now passes too (score 1, it scored 0.5 in 08-14). `render-blocking-insight` still estimates 304 ms for `BaseLayout.Nhm1AjyW.css` on both pages.

### Transfer (08-17, median-LCP run, uncompressed local preview)

| Page | Total (KB) | JS (KB) | Image (KB) | Font (KB) | CSS (KB) | HTML (KB) | Requests |
|---|---|---|---|---|---|---|---|
| Home (home-5) | 443.2 | 124.1 | 113.1 | 88.2 | 55.2 | 61.7 | 24 |
| Detail (detail-1) | 498.4 | 119.0 | 198.5 | 88.2 | 55.2 | 36.6 | 26 |

Home's total is higher than 08-08's median run (337.3 KB) because the three Latest-work AVIFs (about 105 KB) loaded in this run. 08-14 showed that Home's image count varies by run. It no longer affects Home LCP, because LCP now happens at first paint. On the detail page the image total fell from 270.8 to 198.5 KB (the 08-16 768w candidate). `gsap.DLHyXJrb.js` (68.7 KB) and `SplitText` now start at 57–64 ms on the detail page and 57–77 ms on Home, after the first painted frame that follows `load` (observed `load` 36–53 ms; 08-16). On Home they start after observed LCP in all 5 runs. On the detail page they start after observed LCP in 4 of 5 runs (detail-3: 64 ms vs observed LCP 66 ms).

### pnpm measure:bundle (08-17, verbatim)

```text
$ node scripts/measure-bundle.ts
/ (8 module entry scripts)
  eager: 13 files, 44765 B raw, 17958 B gzip -9
    /_astro/ClientRouter.astro_astro_type_script_index_0_lang.uY2hE7yU.js       16401 B     5590 B gz
    /_astro/client.ChiJXsfH.js                                                     24 B       44 B gz
    /_astro/MotionToggle.astro_astro_type_script_index_0_lang.CQdvkYz3.js        1123 B      548 B gz
    /_astro/tokens.--l_3Od3.js                                                    460 B      309 B gz
    /_astro/motion.DdhpH_oj.js                                                   9887 B     3611 B gz
    /_astro/Hero.astro_astro_type_script_index_0_lang.DIXncoe4.js                 882 B      505 B gz
    /_astro/RolesMarquee.astro_astro_type_script_index_0_lang.CPHtMsOr.js         877 B      483 B gz
    /_astro/ServiceChips.astro_astro_type_script_index_0_lang.of5m-_lC.js          57 B       77 B gz
    /_astro/ContactForm.astro_astro_type_script_index_0_lang.D5UZs5pj.js         1966 B     1009 B gz
    /_astro/preload-helper.DHhhL8Zf.js                                           1665 B      852 B gz
    /_astro/CursorFollower.astro_astro_type_script_index_0_lang.Db_2AtGz.js      2369 B     1097 B gz
    /_astro/load-gsap.C4xI3dII.js                                                 716 B      457 B gz
    /_astro/BaseLayout.astro_astro_type_script_index_0_lang.BYz8N5VD.js          8338 B     3376 B gz
  lazy: 4 files, 112713 B raw, 42361 B gzip -9
    /_astro/contact-form-boot.BHC2S-qq.js                                       17039 B     6648 B gz
    /_astro/gsap.DLHyXJrb.js                                                    69964 B    27107 B gz
    /_astro/SplitText.CNCJHyhB.js                                                7064 B     3256 B gz
    /_astro/lenis.CZma2zI-.js                                                   18646 B     5350 B gz
  eager ceiling: 17958 / 22000 B gzip -9
/404.html: eager 9 files, 15884 B gzip -9 (lazy 3 files)
/es/ (8 module entry scripts)
  eager: 13 files, 44765 B raw, 17958 B gzip -9
    (identical file list to /)
  lazy: 4 files, 112713 B raw, 42361 B gzip -9
    (identical file list to /)
  eager ceiling: 17958 / 22000 B gzip -9
/es/projects/: eager 9 files, 15884 B gzip -9 (lazy 3 files)
/es/projects/cabreras-motos-posts/: eager 9 files, 15884 B gzip -9 (lazy 3 files)
/es/projects/mart/: eager 9 files, 15884 B gzip -9 (lazy 3 files)
/es/projects/portfolio-web/: eager 10 files, 16558 B gzip -9 (lazy 3 files)
/es/projects/purov/: eager 9 files, 15884 B gzip -9 (lazy 3 files)
/es/projects/sistema-visual/: eager 9 files, 15884 B gzip -9 (lazy 3 files)
/es/projects/website-instablogs/: eager 9 files, 15884 B gzip -9 (lazy 3 files)
/es/projects/website-reciclick/: eager 9 files, 15884 B gzip -9 (lazy 3 files)
/projects/: eager 9 files, 15884 B gzip -9 (lazy 3 files)
/projects/cabreras-motos-posts/: eager 9 files, 15884 B gzip -9 (lazy 3 files)
/projects/mart/: eager 9 files, 15884 B gzip -9 (lazy 3 files)
/projects/portfolio-web/: eager 10 files, 16558 B gzip -9 (lazy 3 files)
/projects/purov/: eager 9 files, 15884 B gzip -9 (lazy 3 files)
/projects/sistema-visual/: eager 9 files, 15884 B gzip -9 (lazy 3 files)
/projects/website-instablogs/: eager 9 files, 15884 B gzip -9 (lazy 3 files)
/projects/website-reciclick/: eager 9 files, 15884 B gzip -9 (lazy 3 files)

eager JS per page (gzip -9, ceiling 22000 B), largest first:
  /                                     17958 B
  /es/                                  17958 B
  /es/projects/portfolio-web/           16558 B
  /projects/portfolio-web/              16558 B
  /404.html                             15884 B
  /es/projects/                         15884 B
  /es/projects/cabreras-motos-posts/    15884 B
  /es/projects/mart/                    15884 B
  /es/projects/purov/                   15884 B
  /es/projects/sistema-visual/          15884 B
  /es/projects/website-instablogs/      15884 B
  /es/projects/website-reciclick/       15884 B
  /projects/                            15884 B
  /projects/cabreras-motos-posts/       15884 B
  /projects/mart/                       15884 B
  /projects/purov/                      15884 B
  /projects/sistema-visual/             15884 B
  /projects/website-instablogs/         15884 B
  /projects/website-reciclick/          15884 B
  max: 17958 B on / (19 pages)
bundle check ok (no GreenSock or lenisVersion in eager chunks, eager gzip within 22000 B on every built page)
```

Note: the `/es/` per-file list repeats the `/` list byte for byte, so it is shortened here, as in 08-08. The full raw output is in `tmp/lighthouse/measure-bundle.txt`.

### Comparison with 08-08 (medians)

| Page | Metric | 08-08 median | 08-17 median | Delta |
|---|---|---|---|---|
| Home | LCP (ms) | 3,189 | 1,207 | **−1,982** |
| Home | CLS | 0.000 | 0.000 | 0 |
| Home | TBT (ms) | 0 | 0 | 0 |
| Home | FCP (ms) | 1,208 | 1,207 | −1 |
| Home | SI (ms) | 1,288 | 1,207 | −81 |
| Home | Score | 93 | 100 | +7 |
| Detail (website-reciclick) | LCP (ms) | 3,637 | 2,633 | **−1,004** |
| Detail (website-reciclick) | CLS | 0.000 | 0.000 | 0 |
| Detail (website-reciclick) | TBT (ms) | 0 | 0 | 0 |
| Detail (website-reciclick) | FCP (ms) | 1,059 | 1,058 | −1 |
| Detail (website-reciclick) | SI (ms) | 1,059 | 1,058 | −1 |
| Detail (website-reciclick) | Score | 90 | 97 | +7 |
| JS | Homepage JS gz (B) | 60,022 | 60,319 | +297 |
| JS | Max eager gz (B) | 17,661 | 17,958 | +297 |

What changed since 08-08 (src): 08-13 arch portrait, 08-15 slide-only hero lead (no opacity animation on `[data-hero-lead]`), 08-16 GSAP/SplitText deferred to load → one painted frame → idle, and the 768w detail image candidate. The 08-14 C2 prediction (Home 1,209, detail 2,559, medians of 3) holds for Home. For the detail page, 4 of 5 runs landed on the 2,633–2,634 mode that C2 had in 1 of 3 runs. The cause is described under "Re-measure misses (08-17)".

Informational, not part of the D-01 measurement: through the same throwaway Brotli q5 proxy as 08-08 and 08-14 (`tmp/lighthouse/br-proxy.mjs`, port 4486, in front of this build), Home measured **761 / 757 / 762** and the detail page **2,260 / 1,889 / 2,262** (median 2,260), CLS 0, TBT 0. This approximates Cloudflare's edge compression. It is not a deployed measurement.

## Context

| Item | Value |
|---|---|
| Date | 2026-11-09 (runs finished 13:17 UTC) |
| Commit measured | worktree base `e0a98b6`. Latest src commit is `3424e61` (`git log -1 --format=%h -- src`), so src/ is identical to main at measurement time |
| Lighthouse | 13.6.0 (`pnpm dlx lighthouse@13.6.0`) |
| Chrome | Google Chrome 156.0.8078.80 (`/Applications/Google Chrome.app`, found automatically by Lighthouse), `--headless=new`. lhr userAgent `HeadlessChrome/156.0.0.0` |
| Node | v24.15.0 |
| Machine | Apple M5, macOS 27.0.1 |
| benchmarkIndex | Home 4650–4669, detail 4647.5–4670.5 (per-run values in the raw JSON) |
| Settings | formFactor `mobile`, throttlingMethod `simulate` (rtt 150 ms, 1,638.4 kbps, CPU slowdown 4x). No preset. A fresh temporary profile per run, so motion stays at the default `on` (D-05) |
| Preview | `pnpm build && node scripts/e2e-preview-env.ts && pnpm astro preview --port 4485 --ignore-lock` |
| Quiet machine | `pgrep -fl "playwright\|astro (dev\|preview)\|lighthouse"` showed only one idle `astro preview --port 4321` started from the main checkout (not this executor; 0.0% CPU; left running). No Playwright, Lighthouse or build process from other executors. Lighthouse runs were strictly sequential |
| Compression | `curl -sI -H 'Accept-Encoding: br, gzip'` on `/_astro/gsap.DLHyXJrb.js`, `/` and `/_astro/BaseLayout.B-2hNKl0.css` returned **no `content-encoding`**. Local preview serves every text asset uncompressed, so Lighthouse transfer sizes equal raw bytes and the simulated (Lantern) metrics are pessimistic compared with a compressing host such as Cloudflare. The homepage JS gzip figure below therefore comes from `pnpm measure:bundle` |

## Budget (D-06)

| Metric | Budget |
|---|---|
| LCP | < 2,500 ms |
| CLS | < 0.1 |
| TBT | < 200 ms |
| Homepage JS | about 100 KB gzip total (eager + lazy) |
| Eager JS per page | ≤ 22,000 B gzip -9 (`scripts/measure-bundle.ts` EAGER_CEILING_GZIP) |

FCP, SI and the performance score are recorded for context only. They have no budget.

## Heaviest-page selection (D-04)

One Lighthouse run for each EN detail href from `expectedDetails('en')`. The page was **chosen by measured total-byte-weight**. Image KB is the sum of `network-requests` transferSize where resourceType is `Image`.

| Rank | EN detail page | total-byte-weight (KB) | Image (KB) | Requests | LCP (ms, single run) | Score |
|---|---|---|---|---|---|---|
| 1 | **/projects/website-reciclick/** | **567.6** | 270.8 | 26 | 3,633 | 90 |
| 2 | /projects/purov/ | 554.7 | 252.5 | 28 | 3,770 | 89 |
| 3 | /projects/cabreras-motos-posts/ | 532.9 | 244.4 | 22 | 3,798 | 89 |
| 4 | /projects/website-instablogs/ | 507.3 | 154.4 | 25 | 3,624 | 90 |
| 5 | /projects/sistema-visual/ | 487.6 | 202.4 | 18 | 3,985 | 88 |
| 6 | /projects/portfolio-web/ | 474.6 | 180.0 | 24 | 3,475 | 91 |
| 7 | /projects/mart/ | 466.4 | 171.9 | 29 | 3,410 | 92 |

Selected page: `/projects/website-reciclick/`. All 7 selection runs had LCP between 3.4 and 4.0 s, so the LCP miss below applies to every detail page, not only the heaviest one.

## Results (D-03: 5 runs per page, median / min / max)

### Home `/`

| Metric | Median | Min | Max | Budget | Result |
|---|---|---|---|---|---|
| LCP (ms) | 3,189 | 3,186 | 3,476 | < 2,500 | **miss** |
| CLS | 0.000 | 0.000 | 0.000 | < 0.1 | pass |
| TBT (ms) | 0 | 0 | 0 | < 200 | pass |
| FCP (ms) | 1,208 | 1,208 | 1,209 | — | (info) |
| SI (ms) | 1,288 | 1,283 | 1,413 | — | (info) |
| Performance score | 93 | 91 | 93 | — | (info) |

Runs (LCP ms): 3476, 3186, 3189, 3474, 3187.

### Heaviest detail `/projects/website-reciclick/`

| Metric | Median | Min | Max | Budget | Result |
|---|---|---|---|---|---|
| LCP (ms) | 3,637 | 3,621 | 3,693 | < 2,500 | **miss** |
| CLS | 0.000 | 0.000 | 0.000 | < 0.1 | pass |
| TBT (ms) | 0 | 0 | 0 | < 200 | pass |
| FCP (ms) | 1,059 | 1,057 | 1,061 | — | (info) |
| SI (ms) | 1,059 | 1,057 | 1,061 | — | (info) |
| Performance score | 90 | 90 | 90 | — | (info) |

Runs (LCP ms): 3621, 3693, 3692, 3637, 3625.

### JS budgets

| Budget | Measured | Result |
|---|---|---|
| Homepage JS about 100 KB gzip | eager 17,661 B + lazy 42,361 B = **60,022 B gzip -9 (58.6 KiB)** from measure:bundle | pass |
| Eager ≤ 22,000 B per page | max 17,661 B on `/` and `/es/`; detail pages 15,578–16,252 B | pass |

## LCP element and breakdown (from the median-LCP run)

The breakdown comes from LH 13 `lcp-breakdown-insight`. Its sub-parts are taken from the **observed** (unthrottled) trace. The headline LCP is the **simulated** value.

| Page | Run | LCP element | Observed LCP | Breakdown (observed) | Simulated LCP |
|---|---|---|---|---|---|
| Home | home-3 | `main#main > section.mx-auto > div.grid > p.text-ink`: `<p data-hero-lead class="text-ink text-lead max-w-[46ch] …">` "Graphic designer for web & social media. I design websites, brand visuals and s…" | 1,015 ms | TTFB 3 ms; element render delay 1,012 ms | 3,189 ms |
| Detail | detail-4 | `div.mx-auto > div.w-full > picture.block > img.bg-surface-alt`: `/_astro/1325566467-e3adcb99f55f.lYtbH9Dw_ZGErH6.avif`, `loading="eager" fetchpriority="high"`, 1400×788, 12.9 KB, alt "Reciclick website — image 1 of 17" | 74 ms | TTFB 3 ms; resource load delay 20 ms; resource load duration 9 ms; element render delay 42 ms | 3,637 ms |

`lcp-discovery-insight` passes on the detail page (score 1): the image is discoverable in the HTML and has high fetch priority. On Home it does not apply, because the LCP element is text.

## Transfer (median-LCP run, uncompressed local preview)

| Page | Total (KB) | JS (KB) | Image (KB) | Font (KB) | CSS (KB) | HTML (KB) | Requests |
|---|---|---|---|---|---|---|---|
| Home | 337.3 | 123.4 | 8.9 | 88.2 | 54.7 | 61.1 | 21 |
| Detail | 567.6 | 118.4 | 270.8 | 88.2 | 54.7 | 34.6 | 26 |

The largest requests, which are the same on both pages, are `gsap.DLHyXJrb.js` 68.7 KB (lazy chunk, 27.1 KB gz), `BaseLayout.B-2hNKl0.css` 54.7 KB (render-blocking, about 300 ms estimated FCP saving), two woff2 fonts at 47.5 and 40.7 KB, and the HTML document. On the detail page these are followed by nine below-the-fold `loading="lazy"` AVIFs. They are fetched at Low priority in the first ~50 ms, and the largest is `1295185903-…avif` at 57.1 KB.

## pnpm measure:bundle (verbatim)

```text
$ node scripts/measure-bundle.ts
/ (8 module entry scripts)
  eager: 13 files, 44093 B raw, 17661 B gzip -9
    /_astro/ClientRouter.astro_astro_type_script_index_0_lang.uY2hE7yU.js       16401 B     5590 B gz
    /_astro/client.ChiJXsfH.js                                                     24 B       44 B gz
    /_astro/MotionToggle.astro_astro_type_script_index_0_lang.CQdvkYz3.js        1123 B      548 B gz
    /_astro/tokens.--l_3Od3.js                                                    460 B      309 B gz
    /_astro/motion.DdhpH_oj.js                                                   9887 B     3611 B gz
    /_astro/Hero.astro_astro_type_script_index_0_lang.DIXncoe4.js                 882 B      505 B gz
    /_astro/RolesMarquee.astro_astro_type_script_index_0_lang.Dr8oYcK9.js         888 B      492 B gz
    /_astro/ServiceChips.astro_astro_type_script_index_0_lang.of5m-_lC.js          57 B       77 B gz
    /_astro/ContactForm.astro_astro_type_script_index_0_lang.D5UZs5pj.js         1966 B     1009 B gz
    /_astro/preload-helper.DHhhL8Zf.js                                           1665 B      852 B gz
    /_astro/CursorFollower.astro_astro_type_script_index_0_lang.D3KvzIuW.js      2369 B     1094 B gz
    /_astro/load-gsap.CEuti-AC.js                                                 408 B      287 B gz
    /_astro/BaseLayout.astro_astro_type_script_index_0_lang.vqoxsOxI.js          7963 B     3243 B gz
  lazy: 4 files, 112713 B raw, 42361 B gzip -9
    /_astro/contact-form-boot.BHC2S-qq.js                                       17039 B     6648 B gz
    /_astro/gsap.DLHyXJrb.js                                                    69964 B    27107 B gz
    /_astro/SplitText.CNCJHyhB.js                                                7064 B     3256 B gz
    /_astro/lenis.CZma2zI-.js                                                   18646 B     5350 B gz
  eager ceiling: 17661 / 22000 B gzip -9
/404.html: eager 9 files, 15578 B gzip -9 (lazy 3 files)
/es/ (8 module entry scripts)
  eager: 13 files, 44093 B raw, 17661 B gzip -9
    (identical file list to /)
  lazy: 4 files, 112713 B raw, 42361 B gzip -9
    (identical file list to /)
  eager ceiling: 17661 / 22000 B gzip -9
/es/projects/: eager 9 files, 15578 B gzip -9 (lazy 3 files)
/es/projects/cabreras-motos-posts/: eager 9 files, 15578 B gzip -9 (lazy 3 files)
/es/projects/mart/: eager 9 files, 15578 B gzip -9 (lazy 3 files)
/es/projects/portfolio-web/: eager 10 files, 16252 B gzip -9 (lazy 3 files)
/es/projects/purov/: eager 9 files, 15578 B gzip -9 (lazy 3 files)
/es/projects/sistema-visual/: eager 9 files, 15578 B gzip -9 (lazy 3 files)
/es/projects/website-instablogs/: eager 9 files, 15578 B gzip -9 (lazy 3 files)
/es/projects/website-reciclick/: eager 9 files, 15578 B gzip -9 (lazy 3 files)
/projects/: eager 9 files, 15578 B gzip -9 (lazy 3 files)
/projects/cabreras-motos-posts/: eager 9 files, 15578 B gzip -9 (lazy 3 files)
/projects/mart/: eager 9 files, 15578 B gzip -9 (lazy 3 files)
/projects/portfolio-web/: eager 10 files, 16252 B gzip -9 (lazy 3 files)
/projects/purov/: eager 9 files, 15578 B gzip -9 (lazy 3 files)
/projects/sistema-visual/: eager 9 files, 15578 B gzip -9 (lazy 3 files)
/projects/website-instablogs/: eager 9 files, 15578 B gzip -9 (lazy 3 files)
/projects/website-reciclick/: eager 9 files, 15578 B gzip -9 (lazy 3 files)

eager JS per page (gzip -9, ceiling 22000 B), largest first:
  /                                     17661 B
  /es/                                  17661 B
  /es/projects/portfolio-web/           16252 B
  /projects/portfolio-web/              16252 B
  /404.html                             15578 B
  /es/projects/                         15578 B
  /es/projects/cabreras-motos-posts/    15578 B
  /es/projects/mart/                    15578 B
  /es/projects/purov/                   15578 B
  /es/projects/sistema-visual/          15578 B
  /es/projects/website-instablogs/      15578 B
  /es/projects/website-reciclick/       15578 B
  /projects/                            15578 B
  /projects/cabreras-motos-posts/       15578 B
  /projects/mart/                       15578 B
  /projects/purov/                      15578 B
  /projects/sistema-visual/             15578 B
  /projects/website-instablogs/         15578 B
  /projects/website-reciclick/          15578 B
  max: 17661 B on / (19 pages)
bundle check ok (no GreenSock or lenisVersion in eager chunks, eager gzip within 22000 B on every built page)
```

Note: the `/es/` per-file list repeats the `/` list byte for byte, so it is shortened here. The full raw output is in `tmp/lighthouse/measure-bundle.txt`.

## Supplementary (informational, not the D-01 measurement): compressed transfer

To separate the "no compression on local preview" effect from real page cost, three extra runs per page went through a throwaway local proxy (`tmp/lighthouse/gzip-proxy.mjs`, gitignored, on port 4486). It Brotli-compresses (quality 5) text responses from the same preview. Everything else was identical. This approximates Cloudflare's edge compression, but it is **not** a deployed measurement.

| Page | LCP runs (ms) | FCP (ms) | TBT | CLS | Score | JS transferred (KB) | Total (KB) |
|---|---|---|---|---|---|---|---|
| Home | 2,348 / 2,345 / 2,130 | 759–761 | 0 | 0.000 | 98–99 | 50.9 | 275.2 / 275.2 / 169.3 |
| Detail (website-reciclick) | 2,261 / 2,430 / 2,339 | 759–762 | 0 | 0.000 | 98–99 | 47.6 | 424.7 |

With compression both pages are **under 2.5 s**, but the detail page has only 70–240 ms of headroom. The 169.3 KB total in br-home-3 was not investigated.

## Misses

### Miss 1: Home LCP 3,189 ms median (budget < 2,500 ms)

- **LCP element:** the hero lead paragraph `p[data-hero-lead]` (text), not the portrait.
- **Phase breakdown (observed):** TTFB 3 ms, **element render delay 1,012 ms**. Every network request had finished by about 41 ms (observed), so the delay does not come from the network. The lead paragraph runs the `hero-settle` CSS entrance in motion `on`: it goes from `opacity: 0` to 1 with a 200 ms delay over `--t-settle` 560 ms (`src/styles/global.css` lines 625–627 and 680–688). It only becomes the LCP candidate around 1.0 s.
- **Offending resources:** [Inference, from how Lantern builds its LCP graph] Because observed LCP is late (about 1.0 s), every request started before it falls inside the simulated LCP dependency graph. That includes the lazy `gsap.DLHyXJrb.js` (68.7 KB uncompressed, fetched at about 36 ms), `SplitText` (7.2 KB), the render-blocking `BaseLayout.B-2hNKl0.css` (54.7 KB), two fonts (88.2 KB) and the 61.1 KB HTML. All are uncompressed on the local preview.
- **Measured effect of compression:** with the Brotli proxy, LCP drops to 2.13–2.35 s (pass).
- **Proposed classification:** **fixable → fix plan** (recommended). Make the LCP text paint at full opacity in its first frame instead of fading in from 0, for example a translate-only settle like the headline's "never blank" fallback start values. The alternative is to accept it, given that the compressed approximation passes. Any change to the hero entrance is a design change, so it needs the taste skill.

### Miss 2: Heaviest detail LCP 3,637 ms median (budget < 2,500 ms). It applies to all 7 detail pages (3.4–4.0 s)

- **LCP element:** the first project image, a 12.9 KB AVIF with `loading="eager" fetchpriority="high"` and explicit 1400×788 size. It is already discoverable and prioritized (lcp-discovery passes).
- **Phase breakdown (observed):** TTFB 3 ms, load delay 20 ms, load duration 9 ms, render delay 42 ms (observed LCP 74 ms). The LCP resource itself is not slow.
- **Offending resources:** [Inference, from how Lantern builds its LCP graph] The simulated estimate counts requests that start before observed LCP. In the first ~55 ms the page also requests nine below-the-fold `loading="lazy"` images (Low priority, about 258 KB). They are within Chrome's lazy-load distance threshold for a 412 px-wide viewport. It also requests `gsap` + `SplitText` (75.9 KB uncompressed), fonts (88.2 KB) and the CSS (54.7 KB uncompressed). On a fast local server all of these are in flight before the hero image paints. That is why simulated LCP is about 3.6 s while the image takes 9 ms to load.
- **Measured effect of compression:** with the Brotli proxy, LCP is 2.26–2.43 s (pass, but tight).
- **Proposed classification:** **unfixable as measured locally → needs sign-off**, with an optional fix plan to gain headroom. The main lever is host compression, which Cloudflare applies in production and which `astro preview` lacks. Optional code levers: start the lazy GSAP/SplitText fetch after `load`/idle on detail pages, and reduce how many below-fold images are pulled at load time. The images are Martina's Behance work and are already AVIF at build time.

No other budget row missed: CLS 0, TBT 0, homepage JS 58.6 KiB gz and eager ≤ 17,661 B all pass.

### Re-measure misses (08-17)

08-08 Miss 1 (Home LCP) is **resolved**: 1,207 ms median (range 1,207–1,208), 1,293 ms under budget. CLS, TBT, homepage JS (58.9 KiB gz) and the eager ceiling (max 17,958 B) all pass on both pages. One row still misses.

#### Residual miss: heaviest detail LCP 2,633 ms median (budget < 2,500 ms, +133 ms)

- **Runs:** 2,633 / 2,634 / 2,558 / 2,634 / 2,633. Every run misses; the best is 58 ms over. 08-08 measured 3,637, so the gap closure gained 1,004 ms.
- **LCP element:** unchanged. It is the first project image `1325566467-…lYtbH9Dw_kVYXy.avif` (10.1 KB, `loading="eager" fetchpriority="high"`, 1400×788). lcp-discovery and image-delivery both pass.
- **Observed breakdown (detail-1):** TTFB 3 ms, resource load delay 9 ms, resource load duration 11 ms, element render delay 34 ms (observed LCP 57 ms). The page's own LCP path is fast. The miss is entirely in the simulated (Lantern) estimate.
- **Offending resources, by measurement:**
  1. **Second project image `1321800269-…BcHrslAv_2u7Q0j.avif` (22.7 KB, `loading="lazy"`, inside the 412 px mobile viewport): explains the two modes.** In the four 2,633–2,634 runs, Chrome requested it at **High** priority at 23–27 ms (in-viewport boost). In detail-3 (2,558) it was requested at **Low** priority at 48 ms. Blocking only this image (`--blocked-url-patterns='*1321800269*'`, 3 runs, diagnostic only) gave **2,558 / 2,557 / 2,561**. That reproduces the low mode exactly, with GSAP still loading. [Inference, from Lantern's LCP graph rules in Lighthouse 13] The optimistic LCP graph keeps High-priority non-LCP images and drops Low-priority ones, so the boosted second image adds about 75 ms to the estimate. Note that the 08-16 GSAP deferral is not the cause: GSAP and SplitText start at 57–64 ms, after observed LCP in 4 of 5 runs, and the one run where they start before LCP (detail-3) is the fastest.
  2. **The uncompressed critical path is the remaining ~58 ms.** Even in the low mode (2,558), the page is over budget. 08-14 measured a floor of about 2,480 ms on this preview with every font, lazy image and GSAP request blocked. That floor is HTML 36.6 KB, render-blocking CSS 55.2 KB (`render-blocking-insight` estimates 304 ms) and the High-priority eager module scripts (about 50 KB), all uncompressed by `astro preview` under 150 ms RTT and 1.6 Mbps.
- **Measured effect of compression (informational):** with the Brotli q5 proxy in front of this build, the detail page measures **2,260 / 1,889 / 2,262** (median 2,260, 240 ms under budget). Home measures 757–762.
- **Proposed classification:** **needs sign-off (accept), with its measured cause**, as the recommended option. The budget is met on Home, and the detail page passes with the compression that Cloudflare applies in production. The residual is about 133 ms of simulated LCP on an uncompressed local preview, while the observed LCP is under 70 ms. An optional **fix** exists for the ~75 ms mode: keep the second image out of the High-priority boost, for example with `fetchpriority="low"` on non-first detail images or by keeping it lazy below a taller first image. This lever was not tested in src. The diagnostic block shows it would bring the median to about 2,558, which is **still 58 ms over budget**. On this local preview, no measured lever brings the detail page under 2,500 ms without compression. If "fix" is chosen, it is another `/gsd:plan-phase 8 --gaps` round, and it would also have to tackle the critical path (for example CSS size).

## Sign-off (2026-11-09)

The user reviewed the Results and Misses at the 08-08 Task 3 checkpoint (D-06):

- **Miss 1, Home LCP 3,189 ms:** "Fix (Recommended)". Fix → `/gsd:plan-phase 8 --gaps`. The hero lead `p[data-hero-lead]` must paint at full opacity in its first frame, for example with a slide-only settle. The taste-skill gate applies, and the page is re-measured afterwards.
- **Miss 2, detail LCP 3,637 ms (all 7 EN detail pages 3.4–4.0 s):** "Fix (Recommended)". Fix → `/gsd:plan-phase 8 --gaps`. Defer GSAP/SplitText until after load or idle on detail pages, and/or fetch fewer below-fold images at load, to gain headroom. Re-measured afterwards.
- **All other rows** (CLS, TBT, homepage JS gz, eager ceiling) pass. No sign-off is needed for them.

**Re-measure rule:** both fixes change src/, so this report becomes stale once they land. Re-run it with the same D-01..D-06 protocol on the fix commit: mobile simulated, `pnpm dlx lighthouse@13.6.0`, 7 selection runs, then 5 runs each on Home and the heaviest EN detail page. Its Context must record the new commit, matching `git log -1 --format=%h -- src`. Then re-run the 08-09 full gate, all before Phase 8 is marked complete. Until then, QUAL-01 is measured but **not yet met**.

## Gap-closure diagnosis (08-14)

This section adds to the 08-08 report. It does not replace it. Everything here was measured on the build that includes wave 1 (08-10..08-13), with the same protocol: mobile, simulated throttling (defaults), `pnpm dlx lighthouse@13.6.0`, a fresh profile per run, `astro preview --port 4485`, and strictly sequential runs. Raw JSON is in the gitignored `tmp/lighthouse/diag-*.json`. The throwaway helpers there (`run.sh`, `summarize.mjs`, `early.mjs`, `css-split.mjs`, `probe.mjs`) are not committed.

| Item | Value |
|---|---|
| Date | 2026-11-10 00:08 UTC |
| Commit measured | `f38b9c9` (`git log -1 --format=%h -- src`). HEAD was `620a673` (docs only after f38b9c9) |
| Lighthouse / Chrome | 13.6.0. Chrome is now **157** (lhr `HeadlessChrome/157.0.0.0`). 08-08 ran on 156 |
| benchmarkIndex | 4606.5–4672 |
| Quiet machine | `pgrep -fl "playwright\|astro (dev\|preview)\|lighthouse"` showed only this plan's preview on 4485 |

### Baseline (3 runs per page)

| Page | Runs (simulated LCP, ms) | Median simulated LCP | Observed FCP (median) | Observed LCP (median) | LCP element |
|---|---|---|---|---|---|
| Home `/` | 3,207 / 3,473 / 3,473 | **3,473** | 47 ms | 1,012 ms | `p[data-hero-lead]` (hero lead text), all 3 runs |
| Detail `/projects/website-reciclick/` | 3,690 / 3,694 / 3,555 | **3,690** | 67 ms | 67 ms | first project image `1325566467-…avif` (eager, `fetchpriority="high"`, 13.2 KB), all 3 runs |

CLS 0.000 and TBT 0 in all 6 runs. Home is bimodal, as it was in 08-08 (3,186–3,189 vs 3,473–3,476). The difference is whether the three Latest-work AVIFs start before observed LCP: they did in diag-home-2 and -3 (4 images, 115.8 KB) but not in diag-home-1 (portrait only, 7.4 KB).

**Every request on both pages starts before observed LCP** (`tmp/lighthouse/early.mjs`):

| Page (run) | Requests before observed LCP | Bytes before observed LCP | By type (count, transfer B) |
|---|---|---|---|
| Home (diag-home-2) | 24 / 24 | 453,451 | Document 1 / 63,151; Script 15 / 126,774; Font 2 / 90,268; Stylesheet 1 / 56,412; Image 4 / 115,815; Other 1 / 1,031 |
| Detail (diag-detail-1) | 26 / 26 | 582,044 | Document 1 / 35,453; Script 11 / 121,584; Font 2 / 90,268; Stylesheet 1 / 56,412; Image 10 / 277,296; Other 1 / 1,031 |

On Home the last request starts at 44 ms, but the LCP is at about 1,010 ms. On the detail page the last request starts at 57 ms and the LCP is at 67 ms. [Inference, from Lantern's LCP model in Lighthouse 13] The simulated LCP averages an optimistic graph (render-blocking requests, High-priority scripts and the LCP image) and a pessimistic graph (every request that starts before observed LCP). So the lazy GSAP chunks count in both graphs, and the fonts and below-fold images count in the pessimistic graph.

### (a) Which element is the Home LCP now?

It is still the **hero lead `p[data-hero-lead]`** in all 3 Lighthouse runs (lcp-breakdown: TTFB 3 ms, **element render delay 1,009 ms**, run diag-home-2). The 08-13 arch portrait (`portrait.BrseJGMn_D6CNL.avif`, 7.4 KB, High priority, loaded 13–24 ms) becomes an LCP candidate early but is smaller. In the CDP probe (Playwright Chromium, Pixel 7 emulation, unthrottled) the portrait's LCP entry is 21,844 px² at 28–64 ms, and the lead's is 36,822 px². So **if the lead paints in the first frame, the lead (not the portrait) is the LCP, and it is reported at first paint.**

### (b) When does the hero lead first paint at non-zero opacity?

From the probe (rAF sampling of the lead's computed opacity and a `largest-contentful-paint` PerformanceObserver; two runs):

| Event | Run 1 | Run 2 |
|---|---|---|
| `hero-settle` animation start | 22 ms | 22 ms |
| First frame with opacity > 0 | 223 ms (0.00026) | 241 ms (0.13) |
| Opacity reaches 1 | 791 ms | 791 ms |
| `data-hero-played` set (portrait shutter ends: 120 + 840 ms) | 992 ms | 989 ms |
| LCP entry for `p[data-hero-lead]` | **1,012 ms** | **1,008 ms** |

The lead is not reported when it first becomes visible (about 220 ms) or when its fade ends (791 ms). It is reported on the first paint after `createHeroPlayed` (src/lib/motion/hero.ts) sets `data-hero-played`, which removes the `hero-settle` animation. [Inference] While the opacity animation runs, Chrome does not count the text as an LCP candidate, so the entry only lands after the animation is removed. **So the whole ~1,009 ms element render delay comes from the hero entrance:** 200 ms of delay at opacity 0, 560 ms of fade (`--t-settle`), then about 200 ms more waiting for the portrait shutter to finish before `data-hero-played` removes the animation. None of it comes from the network (all requests end by 47 ms). A first-frame, full-opacity lead (L1) removes the opacity animation from the LCP element entirely.

### (c) Which code path requests the lazy chunks?

CDP probe: `Network.requestWillBeSent` initiator stacks with `Debugger.setAsyncCallStackDepth(32)`, Pixel 7 emulation with touch (`(pointer: fine)` is false, as in Lighthouse mobile). The chunk names were mapped back to source through the built code:

| Chunk | Home | Detail | Initiator (built frame → source) |
|---|---|---|---|
| `gsap.DLHyXJrb.js` | requested (Lighthouse: 38–69 ms) | requested (34–45 ms) | `importGsap` (load-gsap chunk `n`) ← `createGsapLoader` closure (`t`) ← **`ensureGsap` in `createReveal`** (src/lib/motion/reveal.ts line 355, built `V`), called at mount by `if (waitingLines.size > 0) ensureGsap()` (reveal.ts line 382) ← `lifecycle.register(createReveal({ …, loadGsap }))` in src/lib/motion/effects.ts line 10 |
| `SplitText.CNCJHyhB.js` | requested (same time) | requested (same time) | same stack (second `import()` inside `importGsap`'s `Promise.all`) |
| `lenis.*.js` | **not requested** | **not requested** | `createSmoothScroll` only loads it for a fine pointer. It is absent from every Lighthouse run and from the touch probe |

`waitingLines` is non-empty on both pages because each has a `data-reveal="lines"` heading: LatestWork.astro line 26 (and ToolsRow, FeaturedServices, ContactSection) on Home, and ProjectIntro.astro line 23 (and NextProjectTeaser, ProjectContactBand) on the detail page. Cursor and magnetic (cursor.ts, magnetic.ts) never call `loadGsap` here, because the pointer is coarse. **L3 (lenis deferral) does not qualify:** lenis is never requested before observed LCP in Lighthouse mobile.

### (d) What is in the render-blocking BaseLayout CSS?

`BaseLayout.CgC1t_iK.css`: **56,117 B raw, 10,747 B gzip -9** (56,412 B transferred uncompressed). Split by top-level block (`tmp/lighthouse/css-split.mjs`; gzip sizes are each part compressed alone):

| Part | Raw B | gzip -9 B (alone) |
|---|---|---|
| Tailwind `@layer utilities` | 35,736 | 6,471 |
| global.css custom rules, unlayered (motion, hero, view transitions, reveal, stack, contact reserve…) | 8,600 | ~1,640 |
| Tailwind `@layer base` (preflight + global.css `@layer base`) | 4,169 | 1,413 |
| `@property` registrations | 2,892 | 399 |
| `@layer theme` (tokens) | 1,942 | 791 |
| `@layer properties` fallback (header) | 1,344 | 487 |
| `@keyframes` (15, all from global.css) | 1,071 | 387 |
| lenis rules (smooth-scroll.css) | 344 | 180 |
| `@font-face` | **0** | 0 |

The `@font-face` rules are not in this file: `<Font>` inlines them in the HTML head (2 `<style>` blocks, 534 + 599 B), and the two woff2 files are preloaded. Lighthouse reports `render-blocking-insight` savings of 280–304 ms for this stylesheet. `unused-css-rules` reports about 12 KiB unused per page, but that is spread across utilities used by other pages, not a removable block, so **no unused-CSS block was found to remove.** The stylesheet is the largest render-blocking request and sits in both Lantern graphs, so **L5 (`inlineStylesheets: 'always'`) qualifies** for measurement.

### (e) Which below-fold detail images start before observed LCP?

All 10 non-LCP images on the detail page start at 51–57 ms, before observed LCP (45–72 ms), in all 3 runs:

| Image | Priority | Transfer B | image-delivery-insight |
|---|---|---|---|
| `1321800269-…BcHrslAv_ZPYkzL.avif` (2nd image) | High (in viewport) | 30,574 | **960×470 delivered for 721×353 displayed**, waste 13,206 B |
| `1295185927-…avif` | Low (lazy) | 14,657 | — |
| `1295185905-…avif` | Low | 20,651 | — |
| `1295185933-…avif` | Low | 27,968 | — |
| `1295185907-…avif` | Low | 17,057 | — |
| `1295185909-…avif` | Low | 17,803 | — |
| `1295185931-…avif` | Low | 32,045 | **960×1129 for 721×848**, waste 13,847 B |
| `1295185903-…avif` | Low | 58,491 | **960×1985 for 721×1491**, waste 25,376 B |
| `1295185929-…avif` | Low | 44,872 | **960×1084 for 721×814**, waste 19,439 B |

Total 264,118 B for the 10 non-LCP images (9 lazy Low ones: 233,544 B). The cause of the oversizing: the 412 px viewport at DPR 1.75 needs 721 px, and `moduleWidths()` (src/lib/projects/detail-view.ts, `MODULE_WIDTHS = [640, 960, 1400]`) has no candidate between 640 and 960, so `sizes="… 100vw"` picks 960w. image-delivery-insight scores 0.5 and estimates 71,868 B of waste on these 4 images. **L4 (an intermediate width candidate) qualifies.** [Inference] The lazy images are fetched immediately because the unthrottled Lighthouse load runs on a fast connection, so Chrome's lazy-load distance threshold covers them. Making them smaller lowers the byte cost but does not stop them starting before LCP.

### Lever experiments (Task 2)

Each lever was a temporary working-tree patch. For each one: `pnpm build`, restart the preview on 4485, run 3 pinned Lighthouse runs per affected page, then `git checkout -- src astro.config.ts`. **No experiment was committed.** Baseline = the 3-run medians above (Home 3,473 ms, detail 3,690 ms). Raw JSON: `tmp/lighthouse/<lever>-<page>-<n>.json`.

| Lever | Page | Patch summary | Runs (simulated LCP, ms) | Median simulated LCP | Delta vs baseline | Observed LCP (median) | CLS (max) |
|---|---|---|---|---|---|---|---|
| L1 | Home | global.css: `[data-hero-lead]` uses a new translate-only `hero-slide` keyframe (`translate: 0 16px` → `none`, no opacity), same `--t-settle`, `--ease-reveal`, 200 ms delay; the CTA keeps `hero-settle` | 1,209 / 1,209 / 1,208 | **1,209** | **−2,264** | 42 ms (LCP element still `p[data-hero-lead]`, render delay 59 ms) | 0 |
| L1 | Detail | same patch (the detail page has no hero) | 3,625 / 2,584 / 3,699 | 3,625 | −65 (noise) | 59 ms | 0 |
| L2 | Home | load-gsap.ts: `createGsapLoader(() => afterLoadIdle().then(importGsap))`, where `afterLoadIdle` = window `load` (or `readyState === 'complete'`), then `requestIdleCallback` (timeout 1000 ms, `setTimeout` fallback) | 3,410 / 3,403 / 3,407 | 3,407 | −66 | 1,021 ms | 0 |
| L2 | Detail | same | 3,620 / 3,552 / 3,551 | 3,552 | −138 | 61 ms | 0 |
| L2b | Home | L2 plus one painted frame after `load`: `load` → `requestAnimationFrame` → `setTimeout 0` → `requestIdleCallback` (timeout 1000 ms) → `importGsap` | 3,412 / 3,402 / 3,181 | 3,402 | −71 | 1,018 ms | 0 |
| L2b | Detail | same | 2,642 / 2,558 / 2,560 | **2,560** | **−1,130** | 46 ms | 0 |
| L3 | — | not run: lenis is never requested in Lighthouse mobile (answer (c)) | — | — | — | — | — |
| L4 | Detail | detail-view.ts: `MODULE_WIDTHS = [640, 768, 960, 1400]` (adds a 768w candidate; 768/412 = 1.86 ≥ DPR 1.75) | 3,406 / 3,405 / 3,406 | 3,406 | −284 | 64 ms | 0 |
| L5 | Home | astro.config.ts: `build: { inlineStylesheets: 'always' }` | 3,632 / 3,629 / 3,632 | 3,632 | **+159 (harm)** | 1,009 ms | 0 |
| L5 | Detail | same | 3,918 / 3,917 / 3,996 | 3,918 | **+228 (harm)** | 61 ms | 0 |
| C1 = L1+L2+L4 | Home | union of the levers that gained ≥ 100 ms, with L2 as written | 1,210 / 1,208 / 1,209 | 1,209 | −2,264 | 65 ms | 0 |
| C1 = L1+L2+L4 | Detail | same | 2,635 / 3,400 / 2,634 | 2,635 | −1,055 | 53 ms | 0 |
| **C2 = L1+L2b+L4** | Home | union with L2b instead of L2 | 1,210 / 1,209 / 1,208 | **1,209** | **−2,264** | 48 ms | 0 |
| **C2 = L1+L2b+L4** | Detail | same | 2,635 / 2,559 / 2,559 | **2,559** | **−1,131** | 61 ms | 0 |
| C3 = L1+L2b | Home | C2 without L4 | 1,212 / 1,208 / 1,208 | 1,208 | −2,265 | 66 ms | 0 |
| C3 = L1+L2b | Detail | same | 2,637 / 2,558 / 2,647 | 2,637 | −1,053 | 64 ms | 0 |

TBT was 0–4 ms in every run. `pnpm measure:bundle` printed "bundle check ok" with C1 (max eager 17,922 B on `/`), C2 and C3 (max eager 17,945 B on `/`) applied. The eager `load-gsap` chunk grows by about 280 B gzip, and GSAP stays out of eager chunks.

What the numbers show:

- **L1 removes the Home miss by itself.** With the lead at full opacity in its first frame, observed LCP drops from about 1,010 ms to 40–62 ms (the lead, at first paint). Simulated LCP then equals simulated FCP (1,208–1,209 ms), so nothing after first paint counts any more. L4 and L2b do not change Home.
- **L2 as written is a race on the detail page.** Window `load` fires at 33–57 ms here (lazy images do not delay it), which is at or before the image LCP paint (45–72 ms). So "after load plus idle" still requests GSAP before observed LCP in some runs. C1 detail was bimodal: 2,634 / 2,635 when GSAP started after LCP, 3,400 when it started before. **L2b** (wait for one painted frame after `load`, then idle) moved the GSAP request to 59–63 ms, which in Lantern terms falls after LCP in every run. Alone it is worth −1,130 ms on the detail page. On Home it barely matters (−71), because there GSAP starts long before the 1 s lead LCP whatever we do.
- **L4 helps only a little once L2b is in.** Alone it gains −284 ms (the 10 images go from 264,118 to 203,249 B, and `image-delivery-insight` passes). On top of L1+L2b it lowers the detail median from 2,637 to 2,559 (2 of 3 runs at 2,558–2,559 vs 2 of 3 at 2,637–2,647).
- **L5 is harmful.** Inlining the stylesheet grows the HTML from 63 to 175 KB (Home) and from 35 to 147 KB (detail), uncompressed. Every page now carries the full CSS in its document, and simulated FCP rises by about 300 ms on both pages.

Diagnostic bounds (not levers, no src change). Lighthouse `--blocked-url-patterns` on the C2 build, detail page, 3 runs each:

| Blocked on top of C2 | Median simulated LCP |
|---|---|
| the 9 lazy below-fold AVIFs (`*1295185*`) | 2,632 |
| both woff2 fonts | 2,484 (simulated FCP rises to 1,509) |
| `gsap.*` + `SplitText*` | 2,558 |
| all of the above together | **2,482** |

So on the uncompressed local preview, **no combination of non-critical requests gets the detail page under 2,400 ms**. Even with every font, lazy image and GSAP request blocked, simulated LCP stays at about 2,480 ms. The rest is the critical path itself: uncompressed HTML (37 KB), render-blocking CSS (56 KB), the High-priority eager module scripts and the LCP image, under 150 ms RTT and 1.6 Mbps.

Compression check (informational, the same method as the 08-08 Supplementary section): a throwaway Brotli q5 proxy (`tmp/lighthouse/br-proxy.mjs`, port 4486) in front of the C2 preview gave **Home 761 / 759 / 760 (median 760) and detail 2,259 / 2,258 / 2,259 (median 2,259)**, CLS 0. This approximates Cloudflare's edge compression. It is not a deployed measurement.

Machine note: at 00:21:01 UTC an `astro dev` process started from the main checkout (not by this plan; 0.0% CPU, left running). It overlapped the X4, compression, L2b, L1-detail and C3 runs. Their benchmarkIndex (4,590–4,676) is in the same range as the earlier runs (4,606–4,705), and L2b/C3 reproduce C2's detail numbers. So [Inference] it had no measurable effect.

### Chosen levers

**No lever set reaches the 2,400 ms target on the detail page on the uncompressed local preview.** The best combination is **C2 = L1 + L2b + L4: Home 1,209 ms (median of 3), detail 2,559 ms (median of 3)**, CLS 0, bundle check ok. Home clears 2,400 ms by a wide margin. The detail page beats its 3,690 ms baseline by 1,131 ms, but it is still 59 ms over the 2,500 ms budget and 159 ms over the 2,400 ms target. Per D-06, the residual detail miss goes to the user at the **08-17 checkpoint**, with its measured cause: the critical path is uncompressed on local preview, and the floor is about 2,480 ms even with every non-critical request blocked. Under Brotli the same build measures 2,259 ms.

| Lever | Fix plan | Files | Why chosen |
|---|---|---|---|
| **L1** | **08-15** | src/styles/global.css (the `[data-hero-lead]` rule plus a translate-only keyframe; the CTA keeps `hero-settle`) | User-directed. Home −2,264 ms, which alone clears the Home miss. The taste-skill gate applies to the new entrance |
| **L2 (L2b form)** | **08-16** | src/lib/motion/load-gsap.ts (wrap `importGsap` inside `createGsapLoader`: `load` → one painted frame (`requestAnimationFrame` → `setTimeout 0`) → `requestIdleCallback` timeout 1000 ms, `setTimeout` fallback) | User-directed. The plain "load + idle" form is a race on the detail page (one run at 3,400). Adding the painted frame makes it hold in all 3 runs: detail −1,130 ms alone |
| **L4** | **08-16** | src/lib/projects/detail-view.ts (`MODULE_WIDTHS = [640, 768, 960, 1400]`) and its unit tests | Best combination: −78 ms on top of L1+L2b (2,637 → 2,559), −284 ms alone. It also removes the 71.9 KB of waste that image-delivery-insight flags |

Not chosen: **L3** (lenis is never requested in Lighthouse mobile) and **L5** (`inlineStylesheets: 'always'` is +159 ms on Home and +228 ms on detail; no unused-CSS block was found to remove).

Notes for the fix plans:

- 08-16 (L2b): the detail page's `ProjectIntro` title and Home's lines headings wait for GSAP before they rise. Deferring the import past the first painted frame makes them wait a little longer, and the existing 1.5 s failsafe still applies. Re-run the motion/reveal e2e specs to check that no lines heading stays hidden.
- 08-15 (L1): the LCP element stays the lead. A slide that keeps full opacity from the first frame is what drops observed LCP from about 1,010 ms to about 50 ms. Any variant the taste gate prefers must not animate opacity on `[data-hero-lead]`.

## How to reproduce

```bash
pnpm install --frozen-lockfile
pnpm build
mkdir -p tmp/lighthouse && pnpm measure:bundle > tmp/lighthouse/measure-bundle.txt
node scripts/e2e-preview-env.ts && pnpm astro preview --port 4485 --ignore-lock   # separate terminal
# one run (repeat: select-<slug> x7 for every EN detail page, home-1..5 for /, detail-1..5 for the heaviest)
pnpm dlx lighthouse@13.6.0 http://localhost:4485/ --only-categories=performance \
  --output=json --output-path=tmp/lighthouse/home-1.json --chrome-flags="--headless=new" --quiet
curl -sI -H 'Accept-Encoding: br, gzip' http://localhost:4485/_astro/gsap.DLHyXJrb.js   # compression check
```

Medians, min and max were computed from `audits['largest-contentful-paint' | 'cumulative-layout-shift' | 'total-blocking-time' | 'first-contentful-paint' | 'speed-index'].numericValue` and `categories.performance.score`. The LCP element and breakdown come from `audits['lcp-breakdown-insight']`, and per-type transfer from `audits['network-requests']`. The summary scripts (`tmp/lighthouse/summarize.mjs`, `rank.mjs`) are throwaway and not committed (D-02).
