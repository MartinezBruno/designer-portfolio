# Phase 8 — Lighthouse performance report (QUAL-01)

Mobile Lighthouse with default simulated throttling, run against `astro preview` of the production build (D-01). Tool: one-off pinned `pnpm dlx lighthouse@13.6.0` (D-02). The user approved the package on 2026-11-09. It was not added to package.json, the lockfile or the scripts. Raw JSON is in the gitignored `tmp/lighthouse/`.

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

## Sign-off (2026-11-09)

The user reviewed the Results and Misses at the 08-08 Task 3 checkpoint (D-06):

- **Miss 1, Home LCP 3,189 ms:** "Fix (Recommended)". Fix → `/gsd:plan-phase 8 --gaps`. The hero lead `p[data-hero-lead]` must paint at full opacity in its first frame, for example with a slide-only settle. The taste-skill gate applies, and the page is re-measured afterwards.
- **Miss 2, detail LCP 3,637 ms (all 7 EN detail pages 3.4–4.0 s):** "Fix (Recommended)". Fix → `/gsd:plan-phase 8 --gaps`. Defer GSAP/SplitText until after load or idle on detail pages, and/or fetch fewer below-fold images at load, to gain headroom. Re-measured afterwards.
- **All other rows** (CLS, TBT, homepage JS gz, eager ceiling) pass. No sign-off is needed for them.

**Re-measure rule:** both fixes change src/, so this report becomes stale once they land. Re-run it with the same D-01..D-06 protocol on the fix commit: mobile simulated, `pnpm dlx lighthouse@13.6.0`, 7 selection runs, then 5 runs each on Home and the heaviest EN detail page. Its Context must record the new commit, matching `git log -1 --format=%h -- src`. Then re-run the 08-09 full gate, all before Phase 8 is marked complete. Until then, QUAL-01 is measured but **not yet met**.

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
