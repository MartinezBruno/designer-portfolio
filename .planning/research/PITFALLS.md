# Pitfalls Research

**Domain:** Motion-rich, bilingual (EN/ES) Astro designer portfolio with projects sourced from Behance, hosted later on Cloudflare
**Researched:** 2026-10-15
**Confidence:** MEDIUM-HIGH. The Behance findings come from live probes run today (HIGH for today's behaviour; they can change without notice). Astro 6, the Cloudflare adapter, and Lenis are checked against official docs. Some motion/LCP details rely on community sources or training data and are labelled.

> **Phase naming used below** [Proposed]. The roadmapper can rename these.
> - **P1 Foundation**: Astro + TS strict + Tailwind v4 + i18n routing + layout shell
> - **P2 Behance data pipeline**: ingest, snapshot, schema, images
> - **P3 Pages & content**: home sections, projects list/filter, detail page
> - **P4 Motion layer**: Lenis, GSAP/ScrollTrigger, transitions, cursor/magnetic, marquee
> - **P5 Contact form**: endpoint, spam protection, email delivery
> - **P6 Hardening**: perf budgets, a11y audit, reduced motion, SEO/hreflang, Cloudflare readiness

---

## Verified Behance facts (live probe, 2026-10-15)

These came from `curl` with a desktop Chrome User-Agent. They are the basis for the Behance pitfalls below.

| Probe | Result | Implication |
|-------|--------|-------------|
| `GET /feeds/user?username=martifernand7` (RSS) | **200**, `application/rss+xml`, **7 items** | RSS works without auth, but returns only 7 items |
| RSS item contents | title, link, guid, pubDate, **one cover `<img>`**. No body text, no categories/fields, no tools | RSS cannot power the detail pages or filtering |
| RSS title encoding | `Cabrera?s motos, Posts`: the apostrophe is **already mangled to `?` in the feed** | Titles taken from RSS can be corrupted at the source |
| `GET /martifernand7` (profile HTML) | **200**, embeds `<script id="beconfig-store_state">` JSON; **14 projects** (`covers`, `publishedOn` present, **no `fields`, no `modules`**) | The profile has twice as many projects as RSS, but it is an undocumented internal JSON shape |
| `GET /martifernand7/projects` | **403 JS challenge** (`document.cookie = "js_challenge_value=..."; location.reload()`) | Bot protection is active on some paths |
| `GET /gallery/<id>/<slug>` (project detail) | **403 JS challenge**, with and without a browser UA | **Plain HTTP fetches cannot reach full project content (images + text modules)** |
| `robots.txt` | Blocks a list of AI crawlers outright. For `*` it disallows `/v2/`, `/v3/` (old API paths) and some search params | The old API paths are explicitly disallowed |
| CDN image `mir-s3-cdn-cf.behance.net/...png` with `Referer: https://example.com/` | **200**, `cache-control: max-age=2628000` (about 30 days), S3 + CloudFront, no referrer block seen | Hotlinking works today. URLs look content-hashed and stable, but this is not contractual |
| Official API | Behance stopped issuing API keys. An Adobe forum reply (2021) cites a "technical migration" and gives no date. A 2024 user report says the dev page is gone | **No official API is available for a new project** |

---

## Critical Pitfalls

### Pitfall 1: Fetching Behance live during the production build (or at request time)

**What goes wrong:**
The build or the server calls Behance (RSS, profile HTML, or gallery pages) on every `astro build` or request. One day Behance changes markup, serves a JS challenge to the build server's IP range (CI and Cloudflare build images are datacenter IPs, the most likely to be challenged), rate-limits, or is down. The build then fails or, worse, **succeeds with 0 projects** and ships an empty portfolio.

**Why it happens:**
"Single source of truth on Behance" (a stated PROJECT.md decision) is read as "fetch at build time". The probe shows gallery pages already sit behind a JS challenge, so this is a current blocker, not a hypothetical one.

**How to avoid:**
- **Snapshot pattern** [Proposed]: a separate `pnpm behance:sync` script fetches Behance data and writes `src/data/behance/projects.json` plus downloaded images into the repo (or `src/assets/behance/`). `astro build` reads **only the local snapshot**, through an Astro content collection with a `file()`/custom loader and a Zod schema.
- The sync script **fails loudly** if a project count drops sharply, required fields are missing, or a challenge page is detected (look for `js_challenge_value` in the body). It must never overwrite a good snapshot with an empty or partial one.
- Treat sync as a manual, human-reviewed step: run it, review the diff, commit. Behance stays the source of truth for *content* while the site keeps building when Behance is unavailable.
- For full detail-page content (gallery modules), plan for one of: (a) a headless-browser sync run locally (Playwright) that passes the JS challenge as a real browser, (b) a hybrid where Martina or we keep a local JSON/MDX per project for text and module order, with Behance supplying covers, list order, and dates, or (c) manual export. **This decision belongs in P2 and needs its own spike.**

**Warning signs:**
- Any `fetch('https://www.behance.net...')` inside `src/pages/**`, `getStaticPaths`, or a loader that runs on every build
- Build output shows a different project count than the last build
- HTML responses of about 453 bytes (the size of the challenge page)

**Phase to address:** P2 (architecture decision before any page work in P3).

---

### Pitfall 2: Building filtering and detail pages on data Behance does not expose

**What goes wrong:**
The team designs search/filter UI by "creative field", "tools", or "tags" and a rich detail page, then finds that RSS has none of it, the profile JSON has no `fields`/`modules`, and gallery pages are blocked. The UI gets rebuilt or filled with fake data.

**Why it happens:**
People assume Behance's public UI data (fields, tools, appreciations) is reachable because it is visible in the browser.

**How to avoid:**
- Define the filter dimensions **after** the P2 spike yields a real data sample. PROJECT.md already defers this, so keep it deferred.
- Design the `Project` schema with **optional** enrichment fields (`categories?`, `tools?`, `client?`). Allow a local override file (`projects.overrides.json`, keyed by Behance project ID) where we hand-tag categories (Web Design, Social Media, Branding...) and write ES/EN summaries. Hand-tagging 14 projects takes minutes and gives better filters than Behance fields would.
- The filter UI should be data-driven: hide a dimension when fewer than 2 values exist.

**Warning signs:** Filter mockups list dimensions nobody has seen in an actual JSON sample.

**Phase to address:** P2 (schema + overrides), P3 (filter UI).

---

### Pitfall 3: Hotlinking Behance CDN images instead of owning them

**What goes wrong:**
Pages use `mir-s3-cdn-cf.behance.net` URLs directly. Images are unoptimized, often multi-MB PNGs (one RSS cover was 92 KB, but project modules are commonly `max_3840`/`source` sizes). LCP suffers, there is no `srcset`, and the site breaks if Behance rotates URLs, deletes a project, or starts enforcing referrer checks. Today's probe shows no referrer block, but nothing guarantees that.

**Why it happens:** It works in dev, and remote images in Astro need extra config.

**How to avoid:**
- In the sync script, **download images to `src/assets/behance/<projectId>/`** and reference them as local imports, so `astro:assets` generates AVIF/WebP + `srcset` at build time. Alternatively, keep them remote but list `image.remotePatterns: [{ protocol: 'https', hostname: 'mir-s3-cdn-cf.behance.net' }]` so `<Image>`/`<Picture>` optimizes them at build time. Local is preferred for resilience.
- Always pass `width`/`height` (or use local imports, which infer them) to prevent CLS.
- Watch for **animated GIFs and video/embed modules** in Behance projects. Sharp converting an animated GIF to WebP/AVIF can drop animation, and embeds (Vimeo/YouTube/Figma iframes) need a separate component plus a privacy-friendly facade. [Unverified] Whether her projects contain these can only be confirmed from the P2 sample.
- Cloudflare note: with the v6 adapter, the default `imageService` is `cloudflare-binding` (runtime). For a mostly static site, set `imageService: 'compile'` so prerendered pages are optimized at build time. Otherwise images depend on a runtime binding.

**Warning signs:** `<img src="https://mir-s3-cdn-cf...">` in built HTML. Lighthouse "Properly size images" / "Serve images in next-gen formats". Page weight over 3 MB on the detail page.

**Phase to address:** P2 (download + schema), P3 (`<Picture>` usage), P6 (measure).

---

### Pitfall 4: Behance ToS / robots exposure from automated scraping

**What goes wrong:**
An automated scraper (especially headless browsers that bypass the JS challenge) may conflict with Adobe/Behance terms. Behance's robots.txt explicitly blocks many AI crawlers and the old `/v2/`, `/v3/` API paths. A scraper run from CI on a schedule looks like abuse and may get the IP or account flagged.

**Why it happens:** Developers assume "it's her own content, so anything goes".

**How to avoid:**
- [Unverified] I did not read the current Adobe/Behance Terms of Use text in this session. **Read it in P2 before choosing a headless approach.**
- Keep automated access minimal: manual, infrequent sync runs from a developer machine, with an identifiable UA and low concurrency. Never run scheduled scraping from CI.
- Prefer sources Behance offers publicly (RSS, profile page) for list data. For detail content, the safest fallback is Martina exporting her own assets and text, since she owns the copyright.
- Credit and link back to the Behance project on every detail page ("View on Behance").

**Warning signs:** A plan that includes cron/scheduled scraping, rotating proxies, or challenge-solving libraries.

**Phase to address:** P2.

---

### Pitfall 5: GSAP + Lenis + Astro `<ClientRouter />` lifecycle bugs (double init, leaks, stale ScrollTriggers)

**What goes wrong:**
With `<ClientRouter />` (SPA-style view transitions):
- Bundled module scripts **run only once** (documented by Astro). Animations set up at the top level don't run on the second page, so they "work only on first load".
- Moving setup to `astro:page-load` without teardown means every navigation **stacks** another Lenis rAF loop, more ScrollTriggers bound to detached DOM, and more `mousemove` listeners. Scrolling gets faster or janky and memory grows.
- ScrollTriggers compute positions before images or fonts load, or before the swap finishes, so pins and reveals fire at wrong offsets.
- Astro restores and resets scroll with `window.scrollTo`, while Lenis keeps its own animated scroll value, so the new page opens mid-scroll or jumps.
- [Inference] Astro swaps `<html>` attributes from the new document, so classes Lenis adds to `<html>` (`lenis`, `lenis-smooth`) can disappear after navigation. A GSAP forum thread reports ScrollSmoother breaking because Astro removes body styles on swap.

**Why it happens:** Code written for MPA page loads gets dropped into an SPA-like router.

**How to avoid:**
- **Opinionated recommendation: don't use `<ClientRouter />` unless a feature truly needs persistent state.** Use **native cross-document view transitions** instead: CSS `@view-transition { navigation: auto; }` plus `view-transition-name`. Every navigation is then a real page load, scripts run fresh, Lenis and GSAP init once per page, and the whole teardown class of bugs goes away. Browsers without support just navigate normally. [Unverified] Exact current browser support (Chromium yes, Safari 18.2+, Firefox status uncertain) should be confirmed in P4.
- If `<ClientRouter />` is used anyway:
  - Put **one** motion bootstrap module behind a `window.__motion` guard. Create everything inside `gsap.context()` (or `gsap.matchMedia()`), and keep handles to Lenis and listeners.
  - On `astro:before-swap`: `ctx.revert()`, `ScrollTrigger.getAll().forEach(t => t.kill())`, `gsap.ticker.remove(rafFn)`, `lenis.destroy()`, and remove `mousemove` listeners.
  - On `astro:page-load`: re-init, `lenis.scrollTo(0, { immediate: true })`, then `ScrollTrigger.refresh()` after `document.fonts.ready` and hero image decode.
  - Note `<ViewTransitions />` and `handleForms` were removed in Astro 6. Use `<ClientRouter />`.
- Wire Lenis to GSAP exactly as the Lenis README says: `lenis.on('scroll', ScrollTrigger.update)`, drive `lenis.raf(time * 1000)` from `gsap.ticker`, `gsap.ticker.lagSmoothing(0)`, `autoRaf: false`. Don't also run a separate rAF loop. Don't add a `scrollerProxy` (Lenis scrolls the document).
- Import `lenis/dist/lenis.css` (the README recommends it).

**Warning signs:**
- Animations work on hard refresh but not after clicking a link
- `ScrollTrigger.getAll().length` grows on each navigation (log it in dev)
- Scroll speed changes after a few navigations
- Chrome DevTools Memory: detached DOM nodes increase per navigation

**Phase to address:** P4 (decide router strategy at P4 start; ideally note it in P1 when the layout is built).

---

### Pitfall 6: Smooth scroll breaking anchors, keyboard, focus, and nested scroll

**What goes wrong:**
- In-page links (`#contact`, skip link) jump without smoothing, or scroll but leave **focus at the top**, so keyboard and screen-reader users lose their place.
- Space, PageDown, and arrow keys feel broken or double-scroll.
- Nested scrollable areas (filter dropdowns, modals, the mobile menu) can't scroll because Lenis captures wheel/touch.
- The open mobile menu still scrolls the page underneath.
- Embedded iframes (Behance/Vimeo embeds) stop smooth scrolling when hovered (a documented Lenis limitation).

**Why it happens:** Smooth-scroll libraries take over native scrolling, and developers test only with a trackpad.

**How to avoid:**
- Enable Lenis `anchors: { offset: <header height> }` and, on complete, **move focus** to the target (`tabindex="-1"` on non-focusable section targets, then `.focus({ preventScroll: true })`).
- Keep a **skip link** as the first focusable element and test it with Lenis on.
- Add `data-lenis-prevent` to scrollable containers (menus, modals, filter panels). Call `lenis.stop()` / `lenis.start()` when overlays open and close.
- Keep `respectReducedMotion: true` (default in Lenis 1.3.x): smoothing is disabled under `prefers-reduced-motion: reduce`.
- Never use CSS `scroll-snap` with Lenis (unsupported; use `lenis/snap` if needed).
- Add `scroll-margin-top` on section targets so non-Lenis paths (reduced motion, JS failure) also clear a sticky header.

**Warning signs:** Tab after clicking "Contact" in the nav goes to the second nav item instead of into the form. Mobile menu scroll moves the page.

**Phase to address:** P4, verified in P6 (keyboard-only pass).

---

### Pitfall 7: Animations destroying LCP, CLS, and INP

**What goes wrong:**
- Hero headline or image starts at `opacity: 0` / `clip-path` hidden and waits for JS to animate in, which delays LCP by hundreds of ms to seconds. [Unverified, training data] Chrome does not count `opacity: 0` elements as LCP candidates until they become visible.
- SplitText-style headline splitting causes a flash of unsplit text, then a reflow (CLS), and screen readers may read letters individually.
- Hero image loaded lazily or without dimensions, or rendered as a CSS background.
- Custom-cursor and magnetic effects run layout reads (`getBoundingClientRect`) on every `mousemove`, and ScrollTrigger callbacks do heavy work, so INP and scroll jank get worse on mid-range hardware.
- Web fonts swap late and shift the display headline.

**Why it happens:** Motion is built on a fast dev MacBook and never measured with throttling.

**How to avoid:**
- **The LCP element is never JS-gated.** Render the hero image visible in HTML via `<Image>`/`<Picture>` with `loading="eager"`, `fetchpriority="high"`, and explicit dimensions. Animate *secondary* elements, or animate from an already-painted state (subtle scale/translate, not opacity 0 to 1). Gate initial hidden states behind a class added by JS (`html.js-motion .reveal { opacity:0 }`) so no-JS and slow-JS users see content.
- For split text: keep the original text in an `aria-label` on the parent and set `aria-hidden` on the split spans. Split only after `document.fonts.ready`.
- Animate only `transform` and `opacity`. Cache rects on `resize`, not on `mousemove`. Batch pointer updates in one rAF (`gsap.quickTo` is built for this).
- Preload the display font, use `font-display: swap` with a size-adjusted fallback (or Astro's fonts API if adopted; [Unverified] check its status in Astro 6).
- Set a **performance budget in P1** (for example LCP < 2.5s and CLS < 0.1 under Lighthouse mobile throttling; JS < ~100 KB gz on the homepage). Measure in P4 and P6, as AGENTS.md says: "No adivinar rendimiento... medir."

**Warning signs:** Lighthouse "Largest Contentful Paint element" shows render delay as the dominant phase. The Performance panel shows long tasks on `mousemove`. CLS above 0 on load.

**Phase to address:** P1 (budget), P3 (hero markup), P4 (motion implementation), P6 (measurement).

---

### Pitfall 8: Treating `prefers-reduced-motion` as an afterthought

**What goes wrong:**
Reduced motion is bolted on at the end with a global `* { animation: none }`. GSAP (JS-driven) ignores it, parallax and smooth scroll keep running, the marquee keeps scrolling, and elements stuck at their hidden initial state stay **invisible** because the reveal animation never runs.

**Why it happens:** CSS-only reduced-motion rules don't affect JS tweens, and hidden "from" states rely on the tween running.

**How to avoid:**
- Build every animation through `gsap.matchMedia()` with `(prefers-reduced-motion: no-preference)` and `(prefers-reduced-motion: reduce)` branches from day one. The reduce branch shows final states, or at most short opacity fades with no movement.
- Lenis: keep `respectReducedMotion` on. Astro's ClientRouter already disables view-transition animations under reduce (documented). Native `@view-transition` should be wrapped in `@media (prefers-reduced-motion: no-preference)`.
- Cursor and magnetic effects: off under reduce.
- **Marquee:** continuous motion over 5s needs a pause mechanism (WCAG 2.2.2 Pause, Stop, Hide). Pause it on hover/focus, stop it under reduce, and set `aria-hidden="true"` on duplicated loop copies so screen readers read the roles list once.
- Test with macOS "Reduce motion" turned on as a P4 exit criterion.

**Warning signs:** Content missing with Reduce Motion enabled. Screen reader reads the marquee roles 2-3 times.

**Phase to address:** P4 (built in from the start), P6 (audit).

---

### Pitfall 9: Cursor effects and hover-dependent interactions on touch devices

**What goes wrong:**
The custom cursor follower sits stuck in a corner on phones. `cursor: none` hides the pointer for trackpad users when JS fails. Image-hover reveals (common in project lists) are unreachable on touch and keyboard. Magnetic buttons shift their hit area so taps miss.

**How to avoid:**
- Init cursor and magnetic effects only when `matchMedia('(hover: hover) and (pointer: fine)').matches` and no reduce preference. Listen for changes (tablets with keyboards, hybrid devices).
- Never hide the native cursor globally. If hiding it, do so only on specific elements and only after the custom cursor has initialized.
- Any information shown on hover (project title, category) must also be visible by default on touch, or shown on `:focus-visible`.
- Magnetic effect: transform an inner element, not the button's own box, so the hit area stays stable. Keep the focus ring visible.

**Warning signs:** A stray circle in the top-left on mobile emulation. Project cards that show no title without hover.

**Phase to address:** P4.

---

### Pitfall 10: Contact form secrets, runtime incompatibility, and output-mode confusion on Cloudflare

**What goes wrong:**
- Email-provider API key ends up in the client bundle (`PUBLIC_` prefix, or client-side `fetch` to the provider).
- `nodemailer`/SMTP is used, which relies on raw TCP and Node `net`/`tls` and fails or behaves unexpectedly in Workers. [Inference] Even with `nodejs_compat`, SMTP libraries are a poor fit.
- The site is built as fully static (`output: 'static'`, no adapter), so the form endpoint doesn't exist, and the gap only shows up at deploy.
- The project plans for "Cloudflare Pages". **The Astro 6 Cloudflare adapter (v13) no longer supports Cloudflare Pages; use Workers (with static assets).** (Official docs.)
- Code uses `Astro.locals.runtime.env`, **removed in Astro 6**. Use `import { env } from 'cloudflare:workers'` or `astro:env`.
- Astro 6 changed `import.meta.env`: values are always inlined and never type-coerced, and non-public vars no longer map to `process.env`. A secret read via `import.meta.env` can get **inlined into the build output**.

**How to avoid:**
- Keep the site static (prerendered pages) with **one on-demand API route** (`export const prerender = false` on `src/pages/api/contact.ts`) under the Cloudflare adapter. Alternatively use an Astro Action marked server-only.
- Declare secrets with `astro:env` schema (`envField.string({ context: 'server', access: 'secret' })`). Local values go in `.dev.vars` (Cloudflare) / `.env`, never committed. Add both to `.gitignore` in P1.
- Send email over **HTTP APIs only**: an HTTP provider such as Resend/Postmark, or Cloudflare Email Routing's `send_email` binding (it can send to a verified destination address, which fits "email Martina"). [Unverified] Confirm current limits and pricing in P5.
- Astro 6 `astro dev` runs on `workerd` (official), so runtime incompatibilities surface locally. Good, because v1 "done" = working local build. Run `wrangler types` after changing `wrangler.jsonc`/`.dev.vars`.

**Warning signs:** `grep -r "RESEND\|API_KEY" dist/` finds matches. The form works in `astro dev` but there's no `_worker`/server entry in build output. Imports of `nodemailer`, `fs`, `net`.

**Phase to address:** P5 (and P1 for `.gitignore`/env schema scaffolding).

---

### Pitfall 11: Contact form spam and missing feedback states

**What goes wrong:**
A public portfolio form gets bot spam within days, and Martina's inbox fills up. The form has no loading, success, or error state, so users double-submit or think it failed. Errors aren't announced to screen readers. The form loses typed text on failure. Server-side validation is missing, so the endpoint is open for abuse as an email relay (for example a `replyTo` header injected from user input).

**How to avoid:**
- **Cloudflare Turnstile** (free, verified server-side on submit) plus a hidden honeypot field plus a minimum time-to-submit check. Validate with Zod on the server (Astro 6 uses Zod 4: `z.email()` not `z.string().email()`; import from `astro/zod`).
- Never put user input into `to`/`from`. Only `replyTo` gets the validated email, and the subject is fixed or sanitized.
- Progressive enhancement: the form works as a plain POST (redirect to a localized success page) and is enhanced with `fetch`. Status messages go in an `aria-live="polite"` region, and focus moves to the error summary or success message. Disable the button while submitting. Keep field values on error.
- Localize all validation and status messages (EN/ES).
- [Proposed] Basic rate limiting (Workers rate-limiting binding or KV counter) when deploying to production.

**Warning signs:** Submitting an empty form shows only browser-native bubbles in English on `/es/`. No visible change after clicking Send.

**Phase to address:** P5.

---

### Pitfall 12: i18n routing errors (switcher, hreflang, dynamic routes, untranslated strings)

**What goes wrong:**
- The language switcher always links to `/` or `/es/`, losing the current page (`/projects/puro-v` should map to `/es/projects/puro-v`, or the localized slug if slugs are localized).
- Project detail routes exist only in one locale, so `/es/projects/[slug]` 404s, or `getStaticPaths` is duplicated and drifts.
- No `<link rel="alternate" hreflang>` or `x-default`; canonical points to the EN page from the ES page (or is missing); `<html lang>` stays `en` on ES pages. Astro does not emit hreflang automatically.
- Hard-coded English strings in components (aria-labels, alt text, button labels, form errors, 404 page, `<title>`/meta description, and the ClientRouter route announcer, which reads `<title>`).
- **Behance content is single-language.** Project titles and descriptions are whatever Martina wrote on Behance (likely Spanish, English, or mixed). The ES page then shows English body text, or vice versa, without a `lang` attribute, so screen readers pronounce it wrong.
- Dates formatted with `toLocaleDateString()` without a locale, which uses the build machine's locale (Cloudflare/CI is usually `en-US`).
- Astro 6 changed the default `i18n.routing.redirectToDefaultLocale` to `false`, and it can only be `true` when `prefixDefaultLocale` is `true` (official upgrade guide). Old tutorials will configure this wrong.

**How to avoid:**
- Config: `defaultLocale: 'en'`, `locales: ['en','es']`, `routing: { prefixDefaultLocale: false }`. Set options explicitly; don't rely on defaults.
- One typed dictionary module (`src/i18n/ui.ts`) with `as const` and a `t(locale, key)` helper typed so a key missing in `es` is a **type error** (strict TS, no `any`). Unit-test that both locales have identical key sets.
- Route pattern: a single page implementation component used by thin `src/pages/projects/[slug].astro` and `src/pages/es/projects/[slug].astro` wrappers, sharing one `getStaticPaths` helper. Or use `src/pages/[...locale]/...` with locale validation. Keep **slugs identical across locales** (derived from the Behance ID + slugified title), which makes the switcher a pure prefix swap.
- Switcher: compute the alternate URL from `Astro.url.pathname` with `getRelativeLocaleUrl` helpers. Use `hreflang` and `lang` attributes on the switcher links.
- A `<SEO>` head component emits canonical (self-referencing per locale), `hreflang="en"`, `hreflang="es"`, `hreflang="x-default"` (→ EN), and `og:locale`. Use `@astrojs/sitemap` with its i18n option.
- Wrap Behance-sourced text in an element with `lang` set to the content's language (override file field `contentLang`). Use local overrides for ES/EN summaries where it matters.
- Use `Intl.DateTimeFormat(locale, {...})` with an explicit locale everywhere. Build-time formatting means the result is fixed in HTML (good).

**Warning signs:** Switching language on a detail page lands on the homepage. `grep -rn '"[A-Z][a-z]\+ [a-z]' src/components` finds hard-coded UI copy. View-source on `/es/` shows `<html lang="en">`.

**Phase to address:** P1 (routing, dictionary, SEO head, switcher), P3 (detail routes in both locales), P6 (hreflang/sitemap validation).

---

## Moderate Pitfalls

### Tailwind v4 + Astro setup gotchas
- **Wrong integration:** `@astrojs/tailwind` is the legacy (v3) integration. For v4, Astro docs recommend the **`@tailwindcss/vite` plugin** (what `pnpm astro add tailwind` sets up now). This still satisfies the "official Astro integration" convention in AGENTS.md, but call it out so nobody installs the old package from an outdated tutorial.
- **No `tailwind.config.js` by default:** v4 is CSS-first (`@import "tailwindcss"; @theme { ... }`). Design tokens (brand colors, display font, easing curves for motion) go in `@theme` in one global CSS file.
- **`@apply` in Astro `<style>` blocks fails** ("Cannot apply unknown utility class") because component styles are processed separately. Fix: `@reference "../styles/global.css";` at the top of the block, or better (and per AGENTS.md "Tailwind is the only styling solution") avoid `@apply` and extract a component.
- **Dynamic class names** built by string concatenation (`` `bg-${color}-500` ``) aren't detected. Use full literal class maps.
- [Unverified] v4's automatic source detection skips gitignored files. If generated data containing class names lives in a gitignored folder, add `@source` explicitly.
- Version alignment: Astro 6 uses Vite 7. Make sure the `@tailwindcss/vite` version supports it (check at P1 install).

### TypeScript strict friction
- `JSON.parse` and scraped data are untyped, which tempts `any` (forbidden by AGENTS.md). Validate the Behance snapshot with a **Zod schema in the content collection** so types are inferred end to end. Astro 6 removed legacy collections: use `src/content.config.ts` with a `loader`, `render(entry)`, and `entry.id` (not `slug`).
- GSAP/Lenis typings: use `gsap.core.Timeline`, `ScrollTrigger` types, and `Lenis` from the package. Don't cast DOM queries blindly: `querySelector<HTMLElement>()` plus a null guard.
- `cloudflare:workers` types come from `wrangler types`. Without it, `env` is untyped.
- Node 22.12+ is required by Astro 6. Pin it via `.nvmrc` / `engines`, or old CI or Cloudflare build images will fail.

### Tabler icons
- [Unverified] Importing from a package root (`@tabler/icons-react`-style barrels) can pull thousands of icons into dev or the bundle. AGENTS.md mandates explicit imports. Prefer per-icon SVG imports (`@tabler/icons/outline/<name>.svg`) rendered as Astro SVG components, or a tiny local `Icon` wrapper. Verify the exact package and approach in P1.

### Behance HTML/text sanitization
- If detail-page text modules are ingested as HTML, sanitize at sync time (allowlist tags, strip inline styles and scripts) before `set:html`. Behance markup carries inline styles that clash with the site's design.
- Fix encoding at ingest: the RSS already ships `?` for `'`. Prefer titles from the profile JSON if they are cleaner, and allow a title override in the overrides file.

### "Latest 3 projects" ordering
- RSS order, profile order (Martina can manually reorder her profile), and `publishedOn` can disagree. Decide explicitly: sort by `publishedOn` desc, with an optional `featured`/`order` override.

### GSAP licensing and plugins
- [Unverified, training data] GSAP became free including all bonus plugins (SplitText, etc.) after the Webflow acquisition (2025). Confirm the license and package name in P4 before relying on SplitText. Otherwise fall back to a small custom splitter.

---

## Minor Pitfalls

- **Marquee duplicated content** read multiple times by screen readers: set `aria-hidden` on clones.
- **Parallax on images inside `overflow:hidden`** containers causing visible edges: scale the image slightly larger than its frame.
- **`will-change` everywhere** increases GPU memory and can blur text: apply it only during active animation.
- **Safari**: Lenis is capped at 60fps (30fps in Low Power Mode). `position: fixed` elements lag on pre-M1 Safari (documented by Lenis). Test the cursor follower and sticky header on Safari.
- **iOS `syncTouch`** in Lenis can misbehave below iOS 16. Leave touch smoothing off (default) on mobile.
- **404 page** exists in only one locale: create `src/pages/404.astro` that detects the `/es/` prefix, or provide both.
- **Open Graph images** for project pages: use Behance covers (downloaded), not the remote URL.
- **Commit large snapshots carefully**: downloaded Behance originals can bloat git. Store resized "max" originals (for example up to 2400px wide), not `source` files.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Live-fetch Behance in `getStaticPaths` | No sync script | Builds break or ship empty when Behance challenges or changes | **Never** (only in a throwaway spike) |
| Hotlink Behance CDN URLs | No image pipeline | No optimization, LCP hit, link rot | Only in the P2 spike before download exists |
| Use RSS as the only data source | Simple, works today | Only 7 of 14 projects, no text, broken titles | Never as the sole source. OK for change detection |
| `<ClientRouter />` with ad-hoc `astro:page-load` handlers | Fancy SPA transitions quickly | Leaks, double init, scroll bugs | Only with a centralized init/teardown module |
| Hard-coded EN strings, "translate later" | Faster P3 | Untranslated UI ships, aria-labels missed | Never: use `t()` from the first component |
| `@apply` in component styles | Familiar CSS | Needs `@reference` everywhere, breaks the "Tailwind only" style | Rarely, e.g. styling sanitized Behance HTML (a `prose`-like wrapper) |
| Skip Turnstile for local v1 | Less setup | Spam on day 1 of deploy | OK for local-only v1 **if** a P5 task makes it a deploy blocker |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Behance RSS | Assuming it lists all projects with content | It returned 7 items (cover + title + date) vs 14 on the profile. Use it for change detection only |
| Behance profile HTML | Parsing DOM selectors | Parse the `beconfig-store_state` JSON, validate with Zod, and fail loudly on shape change. It is undocumented and can break anytime |
| Behance gallery pages | `fetch()` from Node/CI | Returns a 403 JS challenge. Needs a real browser (local Playwright), or manual/hybrid content |
| Behance CDN | Hotlinking full-size images | Download at sync, then `astro:assets` |
| Cloudflare adapter (v13 / Astro 6) | Following Pages-era tutorials, `Astro.locals.runtime` | Workers only. `import { env } from 'cloudflare:workers'`; `imageService: 'compile'` for static images; `nodejs_compat` only if needed |
| Email | SMTP / nodemailer in Workers | HTTP API provider or Cloudflare `send_email` binding |
| Turnstile | Validating only on the client | Verify the token server-side (`siteverify`) in the endpoint |
| GSAP + Lenis | Two rAF loops, `scrollerProxy` | Single `gsap.ticker` drives `lenis.raf`, `lagSmoothing(0)`, `ScrollTrigger.update` on scroll |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Build-time optimization of dozens of large Behance images | `astro build` takes minutes, Cloudflare build timeout | Downsize at sync. Astro caches remote/optimized assets between builds (keep the cache dir in CI) | Around 14 projects × 10-20 images each, a few hundred images |
| One global motion bundle on every page | Homepage JS > 150 KB gz | Load GSAP plugins only where used (dynamic `import()`). Leave the detail page lighter | Immediately on mobile |
| ScrollTrigger per element on a long project page | Scroll jank | `ScrollTrigger.batch()` for reveals. Use CSS scroll-driven animations or IntersectionObserver for simple fades | 50+ triggers |
| Client-side filtering by shipping all project data | Fine at 14 projects | Keep it client-side (tiny data). Don't add a search service | Not a concern below hundreds of projects |
| Unthrottled `mousemove` handlers | INP > 200ms | `gsap.quickTo`, single rAF, cached rects | Mid-range Android, any page with many magnetic elements |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Email API key via `PUBLIC_` var or client fetch | Key theft, spam sent from Martina's account | `astro:env` server secret, server-only endpoint, grep `dist/` in CI |
| Secret read through `import.meta.env` in Astro 6 | Value inlined into built output | Use `astro:env` (`access: 'secret'`) or `cloudflare:workers` env |
| User input in email headers | Header injection / open relay | Fixed `to`/`from`, validated `replyTo`, Zod schema |
| `set:html` with unsanitized Behance HTML | XSS if markup changes or is tampered with in the snapshot | Sanitize at sync with an allowlist |
| Committing `.dev.vars` / `.env` | Leaked secrets in the repo | `.gitignore` in P1, plus a pre-commit secret scan [Proposed] |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Long intro/preloader animation before content | Clients bounce; LCP tanks | Content visible on first paint, motion as enhancement (preloader under 1s or none) |
| Scroll-jacked sections (pinned for many viewport heights) | Users feel trapped, especially on trackpad/touch | Short pins, always skippable, no pinning under reduced motion |
| Hover-only project info | Touch users see bare images | Titles visible by default, hover adds flourish |
| Switcher that resets to the homepage | Spanish-speaking clients lose context | Path-preserving switcher, remembers choice (no auto-redirect by `Accept-Language` without consent) |
| Detail page that is just a wall of Behance images | Weak storytelling, slow | Lead with title, role, tools, short summary (overrides), then optimized gallery, then "View on Behance" |
| Form with no confirmation | Clients unsure the message was sent | Clear success state + localized confirmation copy |

## "Looks Done But Isn't" Checklist

- [ ] **Behance data:** the build passes with networking **disabled**, verifying no live fetches
- [ ] **Behance data:** all 14 (or current count) projects appear, not just the 7 from RSS
- [ ] **Behance titles:** no `?` in place of apostrophes or accents
- [ ] **Images:** no `mir-s3-cdn-cf.behance.net` URLs in `dist/**/*.html` (unless a deliberate decision)
- [ ] **Motion:** navigate Home → Projects → Detail → Back 10 times; `ScrollTrigger.getAll().length` and the Lenis instance count stay constant
- [ ] **Reduced motion:** with macOS Reduce Motion on, all content is visible, the marquee is static, there is no smooth scroll, and no cursor effects
- [ ] **Keyboard:** skip link works; nav anchor links move focus; the focus ring is visible on magnetic buttons; the mobile menu traps and returns focus
- [ ] **Touch:** no custom cursor artifacts in mobile emulation and on a real phone
- [ ] **i18n:** every page exists at `/x` and `/es/x`; the switcher keeps the path; `<html lang>` is correct; hreflang + x-default + self-canonical present; the 404 is localized
- [ ] **i18n:** a typed dictionary key-parity test passes
- [ ] **Contact:** works locally on `astro dev` (workerd); invalid input shows localized, announced errors; the honeypot/Turnstile rejects bots; no secrets in `dist/`
- [ ] **Perf:** Lighthouse mobile run recorded (LCP, CLS, INP/TBT, JS KB) for Home and a heavy detail page, compared to the P1 budget
- [ ] **Quality gates:** `pnpm lint`, `pnpm test`, `astro check` all clean (AGENTS.md)

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Behance starts blocking the sync script | LOW (if snapshot pattern) / HIGH (if live fetch) | Keep shipping from the last snapshot; switch the sync to local Playwright or manual export; add new projects via the overrides file |
| Profile JSON shape changes | LOW-MEDIUM | The Zod failure points at the changed field; update the mapper; the snapshot keeps the site working meanwhile |
| Motion leaks under ClientRouter | MEDIUM | Switch to native cross-document view transitions (remove `<ClientRouter />`), or centralize init/teardown |
| LCP regression from hero animation | LOW | Make the hero image and headline visible in HTML; move entrance motion to secondary elements |
| Secret leaked into the bundle | MEDIUM | Rotate the key immediately; move to `astro:env` secret; add a CI grep check |
| Missing ES strings found late | MEDIUM | Typed dictionary makes them compile errors; batch-translate; Martina reviews |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. Live Behance fetch at build | P2 | Offline build succeeds; sync script refuses partial or empty overwrite |
| 2. Filters on non-existent data | P2 → P3 | Filter dimensions derived from the real snapshot plus overrides |
| 3. Hotlinked / unoptimized images | P2, P3 | No Behance URLs in `dist`; Lighthouse image audits pass |
| 4. ToS / robots exposure | P2 | ToS reviewed and documented; no scheduled scraping |
| 5. GSAP/Lenis/router lifecycle | P4 (router decision noted in P1) | Navigation loop test, stable trigger counts |
| 6. Smooth scroll vs a11y | P4, P6 | Keyboard-only walkthrough |
| 7. LCP/CLS/INP from motion | P1 budget, P3, P4, P6 | Lighthouse mobile vs budget |
| 8. Reduced motion | P4, P6 | Reduce Motion pass: all content visible |
| 9. Touch/cursor | P4 | Mobile emulation + real device |
| 10. Cloudflare runtime / secrets | P1 (env scaffolding), P5 | Works on `astro dev` (workerd); `dist` grep clean |
| 11. Spam + feedback | P5 | Turnstile/honeypot tests; aria-live states |
| 12. i18n routing/SEO | P1, P3, P6 | Key-parity test, hreflang validation, switcher e2e |
| Tailwind v4 setup | P1 | `@tailwindcss/vite` installed, `@theme` tokens, no legacy integration |
| TS strict / Zod content schema | P1, P2 | `astro check` clean, no `any` |

## Sources

**Live probes (HIGH for 2026-10-15 behaviour):**
- `https://www.behance.net/feeds/user?username=martifernand7`: 200 RSS, 7 items, cover-only
- `https://www.behance.net/martifernand7`: 200, `beconfig-store_state` JSON, 14 projects, no fields/modules
- `https://www.behance.net/martifernand7/projects` and `/gallery/238078789/...`: 403 JS challenge
- `https://www.behance.net/robots.txt`: AI-bot block list; `Disallow: /v2/`, `/v3/`
- `mir-s3-cdn-cf.behance.net` cover image: 200 with foreign referer, `max-age=2628000`

**Official documentation (HIGH):**
- [Astro: Upgrade to v6](https://docs.astro.build/en/guides/upgrade-to/v6/): ClientRouter, i18n `redirectToDefaultLocale` default, env inlining, legacy collections removal, Zod 4, Node 22.12+, image service changes
- [Astro: Cloudflare adapter](https://docs.astro.build/en/guides/integrations-guide/cloudflare/): `cloudflare:workers` env, `Astro.locals.runtime` removed, Pages unsupported, `imageService` options, workerd dev, `nodejs_compat`
- [Astro: View transitions](https://docs.astro.build/en/guides/view-transitions/): lifecycle events, module scripts run once, `data-astro-rerun`, reduced-motion handling, route announcer
- [Lenis README](https://github.com/darkroomengineering/lenis) (v1.3.27): `anchors`, `autoRaf`, `prevent`, `data-lenis-prevent`, `respectReducedMotion`, GSAP integration, Safari/iframe/scroll-snap limitations
- [GSAP ScrollTrigger.kill()](https://gsap.com/docs/v3/Plugins/ScrollTrigger/kill()/)
- [Astro: Tailwind guide](https://docs.astro.build/en/guides/integrations-guide/tailwind/): Vite plugin preferred for v4

**Community (MEDIUM/LOW):**
- [GSAP forum: ScrollSmoother + Astro view transitions](https://gsap.com/community/forums/topic/40708-problem-with-scollsmoother-and-astro-view-transitions/): cleanup on swap, body styles removed
- [Tailwind issue #15952](https://github.com/tailwindlabs/tailwindcss/issues/15952): `@apply` in component styles needs `@reference`
- [Adobe community: Where can I find Behance API?](https://experienceleaguecommunities.adobe.com/built-by-developers-207/where-can-i-find-behance-api-144990): API unavailable, "technical migration"
- [WordPress Behance Portfolio Manager plugin](https://wordpress.org/plugins/portfolio-manager-powered-by-behance/): "Behance has stopped issuing API keys"
- [Astro 6 beta announcement](https://astro.build/blog/astro-6-beta/), [InfoQ coverage](https://www.infoq.com/news/2026/02/astro-v6-beta-cloudflare)

**Not verified this session (flagged inline):** Behance/Adobe ToS text, GSAP license status, Chrome LCP opacity rule, native cross-document view transition support in Firefox, Astro fonts API status, Tabler Astro package approach, Cloudflare `send_email` limits.

---
*Pitfalls research for: bilingual motion-rich Astro designer portfolio with Behance-sourced projects*
*Researched: 2026-10-15*
