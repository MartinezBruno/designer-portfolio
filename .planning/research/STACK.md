# Stack Research

**Domain:** Motion-rich, bilingual (EN/ES) graphic-designer portfolio, Behance-sourced projects, Cloudflare-hosted
**Researched:** 2026-10-15
**Confidence:** HIGH for the core stack (versions checked against npm today and tested in a throwaway Astro 7.4 build). MEDIUM for Behance data access: it works today and was tested end to end, but it relies on undocumented page internals.

> Labels follow the user's verification rules. **[Verified]** means I tested it directly in this session, with the method noted. **[Documented]** means it comes from official docs. **[Inference]**, **[Unverified]** and **[Proposed]** are used where they apply.

---

## 0. TL;DR (prescriptive)

| Concern | Decision |
|---|---|
| Framework | **Astro 7.4** (static output by default), **TypeScript 6.0.x pinned** (not 7), `astro/tsconfigs/strictest` |
| Styles | **Tailwind CSS 4.3 via `@tailwindcss/vite`** (the official route; the old `@astrojs/tailwind` is gone) |
| i18n | Built-in Astro i18n: `locales: ['en','es']`, `defaultLocale: 'en'`, `prefixDefaultLocale: false` |
| Behance | **Build-time scrape of the public profile and project pages' embedded JSON**, normalized into a **committed JSON snapshot**, exposed through a **custom Content Layer loader**, and merged with **local bilingual overrides**. The official API is not usable. RSS is too thin. |
| Motion | **GSAP 3.15** (core + ScrollTrigger + SplitText, all free now), **Lenis 1.3**, and **Astro `<ClientRouter />`** for page transitions. Add **OGL** only if WebGL image distortion is needed. |
| Contact | **Astro Actions** on **@astrojs/cloudflare 14** (Workers, not Pages), **Cloudflare Turnstile** (plain script plus `fetch` siteverify, no npm dependency), **Resend** for email |
| Images | `astro:assets` `<Image>`/`<Picture>` with `image.remotePatterns` for `mir-s3-cdn-cf.behance.net`. Images are optimized at build and self-hosted. Cloudflare adapter `imageService: 'compile'`. |
| Icons | `@tabler/icons` raw SVGs imported per icon as **Astro SVG components**: `import IconArrowRight from '@tabler/icons/outline/arrow-right.svg'` |
| Quality | Vitest 5, Playwright 1.64 plus `@axe-core/playwright`, ESLint 10 plus `eslint-plugin-astro` 3 plus `typescript-eslint` 8, Prettier 3 plus the astro and tailwind plugins, `astro check` |

---

## 1. Behance data access (CRITICAL)

### 1.1 What I actually tested (2026-10-15, from this machine)

| Source | Request | Result | Status |
|---|---|---|---|
| **Official API v2** | `GET https://api.behance.net/v2/users/martifernand7/projects?client_id=test` | `403 {"message":"A client or user is required"}` | [Verified] The endpoint exists but needs a valid key. |
| **API key issuance** | Web search: Adobe community threads 2021–2024 | Adobe staff (2021): "API unavailable due to technical migration… hope to make it available on adobe.io". Users in 2024 report `behance.net/dev` is dead. No newer official statement found. | [Documented in community, not official] **Treat new keys as unobtainable.** "I didn't find an official 2026 statement" is not proof keys can never be issued. |
| **RSS** | `GET https://www.behance.net/feeds/user?username=martifernand7` (browser UA) | `200 application/rss+xml`, **7 items**: title, link, guid, pubDate, **one 404px cover image**. No tags, tools, fields, or modules. Items are **not strictly date-sorted** (2023-08 appears before 2023-11). | [Verified] |
| **Profile page HTML** | `GET https://www.behance.net/martifernand7` | `200`, 618 KB. It contains `<script type="application/json" id="beconfig-store_state">` with `profile.activeSection.work.profileProjects`, an array of **7 projects** with `hasMore: false`. Each project has `id`, `name`, `slug`, `url`, `publishedOn`, `modifiedOn` (unix), `covers.allAvailable[]` (WEBP and JPG at 115–808px plus original), `colors {r,g,b}`, `stats {views, appreciations}`, `privacyLevel`, `publishStatus`. Also profile data: `occupation`, `location`, banner, avatar, stats. | [Verified]. It works with Node's default `fetch` UA and with a browser UA. Plain `curl/8` UA gets **400**. |
| **Project page HTML** | `GET https://www.behance.net/gallery/{id}/{slug}` | First request: **403** with a tiny JS challenge page that sets `js_challenge_value=<hex>` and reloads. Replaying with `Cookie: js_challenge_value=<hex>` and the same browser UA returns **200** (500 KB–1.2 MB) containing `beconfig-store_state`. | [Verified] All 7 projects were fetched from Node 24 `fetch` and from curl, 2 s apart. It **fails** if the UA differs between the challenge and the replay. |
| **Project JSON contents** | `project.project` in the store | `name`, `description` (empty for all 7 of her projects), `publishedOn`, `canvasWidth` (1400), `stylesInline` (Behance CSS), **`tags[]`** (`{id,title}`, 5–10 per project), **`tools[]`** (`{id,title}`: Figma, Adobe Illustrator, Adobe Photoshop), **`license`** (`no-use`), `colors`, `covers`, and **`allModules[]`** | [Verified] |
| **Module types seen** | across 7 projects | `ImageModule` (src, `imageSizes.allAvailable[]` up to 1920 px `source`/`fs`, plus `_webp` variants, width, height, `fullBleed`, `caption`, `altText`), `TextModule` (`text` is **HTML with inline styles/fonts/colors**, `alignment`), `MediaCollectionModule` (`components[]` grid of images), `EmbedModule` (`fluidEmbed` iframe HTML, e.g. a Figma prototype) | [Verified] Unknown types (video, audio, 3D) could appear in future projects. The loader must have a fallback. |
| **Creative fields** | Not in the store JSON. Present in `<meta name="keywords">` as `tools + tags + fields` concatenated in that order. | Derived fields per project: Graphic Design, Web Design, Illustration, Interaction Design. | [Verified] It works for all 7, but it is a **positional heuristic**, so it is fragile. |
| **Alt text** | `ImageModule.altText` | Auto-generated, for example `"Image may contain: bottle, fruit and food"`, and missing on many modules (0/2 to 42/68). | [Verified] **Not usable** as-is for accessibility. Needs local overrides. |
| **Embed** | `GET /embed/project/{id}` | 200, no challenge, but only cover and title. No modules. | [Verified] Not useful. |
| **Image CDN** | `HEAD mir-s3-cdn-cf.behance.net/...png` | 200, `cache-control: max-age=2628000`, `cross-origin-resource-policy: cross-origin`. No auth, no challenge. | [Verified] Build-time download and optimization works. Tested via `astro:assets`: 89 kB PNG became a 40 kB WebP. |
| **robots.txt** | `/robots.txt` | `User-agent: *` disallows `/v2/`, `/v3/` (internal GraphQL), and some search params. **Profile and `/gallery/` pages are not disallowed** for generic agents. AI-training bots are disallowed. | [Verified] |
| **Adobe Terms** (behance.net/misc/terms redirects to adobe.com/legal/terms.html) | §6.6 "access … by any means other than the interface we provide or authorize", §6.18 "use any data mining or similar data gathering and extraction methods…", §4.2 "[you] retain all rights and ownership of your Content" | [Documented] |

### 1.2 Answers to the four sub-questions

| Need | Feasible? | How |
|---|---|---|
| (a) Full project list | **Yes** | Profile `profileProjects` (7/7, `hasMore:false`). RSS also has 7 and can serve as a cross-check or fallback. |
| (b) Latest 3 | **Yes** | Sort by `publishedOn` desc ourselves. **Do not trust feed order**; it was verified to be unsorted. |
| (c) Full content for mirrored detail pages | **Yes** | Project page `allModules[]` gives images in all sizes, text HTML, image grids, and embeds. |
| (d) Filter metadata | **Partial** | **Tools** (reliable, structured), **tags** (reliable but noisy and duplicated, e.g. "ux"/"UX"/"user experience"), **year/date** (reliable), **creative fields** (only through the keywords-meta heuristic). Recommended filter dimensions: **Field/Category** (curated locally, seeded from the heuristic), **Tool**, **Year**, plus free-text search over title and tags. |

### 1.3 Recommended approach: "Snapshot hybrid" — confidence MEDIUM

[Proposed]
1. **`scripts/sync-behance.ts`** (run with `pnpm sync:behance`, Node 24 `fetch`, no dependencies):
   - Fetch the profile, then parse `beconfig-store_state` to get the project list.
   - For each project: fetch with a browser UA, read `js_challenge_value`, replay with the cookie, parse the store, and normalize to our own typed shape (`id, slug, title, publishedAt, cover, tools[], tags[], fieldsGuess[], modules[]`).
   - Sanitize `TextModule.text` with **sanitize-html**. Allow `a, p, br, strong, em, ul, ol, li`. Drop all `style`/`class`, add `rel="noopener"` to links. Behance's inline colors (for example `#fafafa` text meant for a dark canvas) would break our design.
   - Validate with **Zod** (the `astro/zod` re-export) and **fail loudly** on schema drift.
   - Write **`src/data/behance/snapshot.json`** and **commit it**.
   - Be polite: about 2 s between requests, and only a handful of requests per sync (8 for her portfolio).
2. **Custom Content Layer loader** (`src/lib/behance/loader.ts`, object loader with a `schema`) that reads the snapshot into a `projects` collection. [Verified] An inline loader that fetched the live profile ran inside `astro build` on Astro 7.4 and returned 7 entries. Reading a committed snapshot is the safer default, because the build never depends on Behance being reachable.
3. **Local overrides collection** (`src/content/project-overrides/*.yaml` or `.md` via `glob()`), keyed by Behance `id`. It holds `featured`, `order`, `title.es`, `summary.en/.es`, curated `category`, `altText` per module id, and `hidden`. This is needed because Behance content is **single-language** (her text mixes "Sitio web oficial / Official website"), **descriptions are empty**, and **alt texts are machine-generated**. The overrides are what make the bilingual, accessible requirement achievable.
4. **Images:** keep Behance CDN URLs in the snapshot and let `astro:assets` download and optimize them at build (self-hosted output). [Inference] This removes runtime hotlinking and protects the site if Behance URLs rot. Measure build time: about 150 source images, roughly 3–5 widths each.
5. **Refresh cadence:** v1 runs the sync manually before a build. Later options are a scheduled GitHub Action that runs the sync and opens a PR, or a Cloudflare deploy hook. **Never scrape at runtime** from a Worker: Cloudflare egress IPs are more likely to be challenged, and runtime scraping adds latency and ToS exposure.

**ToS position (not legal advice):** [Inference] The content is Martina's own (§4.2), the volume is tiny, and robots.txt allows these paths. However, §6.6 and §6.18 forbid automated extraction, so the risk is non-zero. The worst realistic outcome is that the scrape gets blocked, not legal action against a creator mirroring her own portfolio, but that is speculation. **Mitigations:** the committed snapshot means a block never breaks the site. Get Martina's explicit consent. The overrides schema allows full manual entry (paste images and text) as a zero-scrape fallback. Link back to each Behance project ("View on Behance").

**Rejected options**
- **Official API:** no key obtainable (above).
- **RSS only:** no modules, tags, or tools, and a 404 px cover only. It can't power detail pages or filters. Keep it as an optional sanity check.
- **Third-party scrapers (Apify "Behance scraper" actors etc.):** [Unverified, not tested] They are paid, add a vendor, and face the same ToS exposure. No benefit over a 100-line script.
- **Headless browser (Playwright) scraping:** unnecessary today because the JS challenge is a static cookie replay. Keep it as **plan B** if Behance hardens the challenge. Playwright is already a dev dependency for e2e tests.
- **Purely manual content:** a viable fallback, but it loses the user's "Behance as single source of truth" goal.

**Known fragility (flag for PITFALLS / phase research):** the store key paths (`profile.activeSection.work.profileProjects`, `project.project.allModules`), the challenge mechanism, the keywords-meta field order, and profile pagination (only 7 projects today; behavior above roughly 12–24 projects with `hasMore:true` is **untested** and would likely need the `/v3/graphql` endpoint, which robots.txt disallows).

---

## 2. Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended | Confidence |
|---|---|---|---|---|
| **astro** | `7.4.0` (latest, released 2026-10-15; v7.0 GA 2026-06-22) | Framework, static output | User convention. Content Layer, i18n, Actions, ClientRouter and assets are all first-party. v7 brings Vite 8, the Rust compiler as default, and Sätteri Markdown. | HIGH [Verified npm, built] |
| **Node.js** | `>=22.22.0` (Astro 7 `engines`); local machine has 24.15 | Runtime | Required by Astro 7 | HIGH [Verified npm] |
| **typescript** | **`~6.0.3` (pin)** | Type checking | **Do NOT take TS 7.0.2 (npm `latest`)**: `@astrojs/check@0.9.10` peers `typescript ^5 \|\| ^6`, and `typescript-eslint@8.71` peers `typescript <6.1.0`. | HIGH [Verified npm peers; `astro check` passed with 6.0.3] |
| **tailwindcss + @tailwindcss/vite** | `4.3.3` | Styling (only allowed solution) | The official Tailwind-for-Astro path is the Vite plugin plus `@import "tailwindcss"`. `pnpm astro add tailwind` produces the same setup. CSS-first config with `@theme`. | HIGH [Documented tailwindcss.com; Verified build] |
| **@astrojs/cloudflare** | `14.4.0` (peers `astro ^7.4`, `wrangler ^4.125`) | Adapter for on-demand routes (contact Action) | **Targets Cloudflare Workers (static assets plus Worker). Pages support was removed.** `astro dev` runs in workerd via the Cloudflare Vite plugin. | HIGH [Documented docs.astro.build] |
| **wrangler** | `4.151.0` | CF local/dev/deploy, secrets | Peer of the adapter. Secrets go in `.dev.vars` locally and `wrangler secret put` in production. | HIGH |
| **zod** | via `astro/zod` (Astro bundles zod `^4.6`) | Schemas (content, actions, snapshot) | Don't install zod separately. Astro 6+ deprecated `z` from `astro:content` in favor of `astro/zod`. Zod 4 syntax: `z.email()`, `error:` instead of `message:`. | HIGH [Documented v6 upgrade] |

### Astro configuration specifics

```js
// astro.config.mjs  [Verified: built OK on astro 7.4.0, without the adapter]
import { defineConfig, envField } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare'; // add in the contact-form phase

export default defineConfig({
  site: 'https://<tbd>',
  i18n: {
    locales: ['en', 'es'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: false }, // "/" = en, "/es/..." = es
  },
  image: {
    remotePatterns: [{ protocol: 'https', hostname: 'mir-s3-cdn-cf.behance.net' }],
    // leave image.responsiveStyles false with Tailwind 4 (docs recommend this)
  },
  adapter: cloudflare({ imageService: 'compile' }), // build-time optimization, no paid Images binding
  env: {
    schema: {
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret' }),
      TURNSTILE_SECRET_KEY: envField.string({ context: 'server', access: 'secret' }),
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({ context: 'client', access: 'public' }),
      CONTACT_TO_EMAIL: envField.string({ context: 'server', access: 'secret' }),
    },
  },
  vite: { plugins: [tailwindcss()] },
});
```

- **i18n** [Documented]: Put pages in `src/pages/` (en) and `src/pages/es/` (folder name must equal the locale). Use `getRelativeLocaleUrl(locale, path)` from `astro:i18n` and `Astro.currentLocale`. In Astro 6+, `redirectToDefaultLocale` defaults to `false`. [Proposed] To avoid duplicating every page, keep thin route files that render shared `src/views/*.astro` with a `locale` prop. UI strings go in typed dictionaries (`src/i18n/en.ts`, `es.ts` with `satisfies` checks). **No i18n library is needed.**
- **Astro 7 gotchas** [Documented v7 upgrade]: The Rust compiler **errors on invalid HTML** (unclosed tags, `<div>` inside `<p>`). `compressHTML` now defaults to `'jsx'`, which can eat whitespace between inline elements; use `{" "}`. `src/fetch.ts` is a reserved filename. `@astrojs/markdown-remark` is no longer installed by default. Astro 6 removed `<ViewTransitions />` (use `<ClientRouter />`), removed legacy collections, and made the **Fonts API stable**, which is useful for self-hosting her brand fonts.
- **tsconfig**: `{"extends": "astro/tsconfigs/strictest"}` [Verified, 0 errors with `astro check`]. It is stricter than "strict" and in line with "avoid any/unknown".

### Supporting Libraries (add only in the phase that needs them)

| Library | Version | Purpose | When to Use | Confidence |
|---|---|---|---|---|
| **gsap** | `3.15.0` | Timelines, scroll reveals, magnetic buttons, cursor follower, text splitting, pinned or parallax sections | Motion phase. Import `gsap`, `gsap/ScrollTrigger`, `gsap/SplitText`. **All plugins are free for commercial use** under the Webflow "Standard License". The only restriction is building no-code visual animation tools that compete with Webflow. | HIGH [Documented gsap.com/standard-license] |
| **lenis** | `1.3.27` | Smooth inertial scroll, drives parallax | Motion phase. `respectReducedMotion` defaults to `true`. Wire it to ScrollTrigger: `lenis.on('scroll', ScrollTrigger.update)`, `gsap.ticker.add(t => lenis.raf(t*1000))`, `gsap.ticker.lagSmoothing(0)`. Import `lenis/dist/lenis.css`. Use `anchors: true`. | HIGH [Documented Lenis README] |
| **@tabler/icons** | `3.49.0` | Icons | First UI phase. Raw SVGs, `exports: {"./*": "./icons/*"}`. | HIGH [Verified build] |
| **resend** | `6.33.0` | Send contact email | Contact phase. Alternatively call `fetch('https://api.resend.com/emails')` directly and skip the dependency, which fits "don't add deps until needed". | MEDIUM |
| **sanitize-html** + **@types/sanitize-html** | `2.18.1` / `2.16.2` | Clean Behance TextModule HTML at sync time | Behance sync phase (used by the script only, never shipped to the client) | MEDIUM |
| **ogl** | `1.0.11` | Minimal WebGL for image hover distortion (displacement shader) | **Only if** CSS, SVG `feDisplacementMap` and GSAP effects aren't enough. Measured about **14 KB gz** for Renderer, Program, Mesh, Triangle and Texture versus Three.js at hundreds of KB. | MEDIUM [Verified size] |
| **@astrojs/sitemap** | `3.7.4` | Sitemap with i18n alternates | SEO/polish phase | HIGH |

**Measured bundle sizes** [Verified with esbuild --minify plus gzip -9, real package versions]:

| Import | gzip |
|---|---|
| gsap core | 28.3 KB |
| gsap + ScrollTrigger | 46.2 KB |
| gsap + ScrollTrigger + SplitText | 49.3 KB |
| lenis | 5.5 KB |
| motion `animate` (full, v14.3) | 26.1 KB |
| motion/mini `animate` + `inView` + `scroll` | 7.6 KB |
| motion `inView` only | 0.6 KB |
| ogl (subset) | 14.2 KB |

[Inference] GSAP + ScrollTrigger + SplitText + Lenis comes to about 55 KB gz. That is acceptable for a deliberately motion-heavy portfolio if it is loaded as one deferred module script and nothing else heavy ships. Measure real page JS in the motion phase (AGENTS.md: "measure, don't guess").

### Motion architecture

[Proposed]
- **GSAP + ScrollTrigger + SplitText** handle reveals, staggered text, pinning and parallax. Use `gsap.matchMedia()` with `(prefers-reduced-motion: no-preference)` so every motion tween is created only when motion is allowed, and is auto-reverted when that changes. Use `gsap.context()`/`matchMedia` reverts for cleanup.
- **Lenis** provides smooth scroll. It turns itself off for reduced-motion users by default.
- **Cursor, magnetic buttons, image hover:** GSAP `quickTo()` driven by pointer events, gated by `(hover: hover) and (pointer: fine)` and reduced motion. Image distortion starts with CSS transforms, `clip-path` and an SVG displacement filter. OGL is optional.
- **Page transitions: Astro `<ClientRouter />`** [Documented]. It disables animations automatically under reduced motion, uses `fallback="animate"` for browsers without View Transitions, and `transition:persist` keeps the custom cursor and Lenis root alive across navigations. **The cost is lifecycle discipline:** bundled scripts run only once, so init must happen on `astro:page-load` and all ScrollTriggers and SplitText instances must be killed on `astro:before-swap`. Otherwise you get leaks and duplicate triggers (flag for PITFALLS).
- **Simple reveals** that don't need GSAP can use CSS `animation-timeline: view()` progressively, behind `@supports` and `prefers-reduced-motion`.

### Contact form on Cloudflare

[Proposed]
- **Astro Actions** (`src/actions/index.ts`, `defineAction({ accept: 'form', input: z.object({ name, email: z.email(), message, 'cf-turnstile-response': z.string() }) })`).
  - [Documented] A no-JS `<form action={actions.contact}>` requires the **page to be on-demand rendered**. Static pages can call `actions.contact(formData)` from client script.
  - **Recommendation:** keep the homepage static and submit via JS (`fetch`/`actions`) for progressive enhancement. Optionally add an on-demand `/contact` fallback route.
  - Actions are public endpoints, so validate everything server-side.
- **Turnstile:** load `https://challenges.cloudflare.com/turnstile/v0/api.js` and add the `cf-turnstile` div. Server side, `POST https://challenges.cloudflare.com/turnstile/v0/siteverify` with `secret`, `response` and optional `remoteip` (`CF-Connecting-IP`). Tokens are single-use with a 300 s TTL [Documented]. Use Cloudflare's dummy test keys in dev/CI. [Unverified exact values; get them from developers.cloudflare.com/turnstile/troubleshooting/testing/] Also add a honeypot field. **No npm package needed.**
- **Email: Resend** (free tier is 3,000/month and 100/day [Documented resend.com/pricing]). Until she has a verified domain, sending from `onboarding@resend.dev` works **only to the Resend account owner's email** [Documented, Resend KB]. For a contact form that only emails her, that works if the Resend account is created with her address. Verify her custom domain later for deliverability and reply-to branding. Set `reply_to` to the visitor's email.
- **Alternative later:** the Cloudflare **Email Routing `send_email` binding** to a *verified destination address* is free [Documented, but only once she has a domain on Cloudflare with Email Routing]. Use `env.EMAIL.send({to, from, subject, text})`. **Cloudflare Email Service** (arbitrary recipients) is still **beta and needs Workers Paid** [Documented developers.cloudflare.com/email-service, 2026], so it is not recommended for v1.
- Secrets are accessed via `astro:env/server` (preferred, typed) or `import { env } from 'cloudflare:workers'`.

### Images

- [Verified] `<Image src="https://mir-s3-cdn-cf.behance.net/...">` with `remotePatterns` is downloaded and converted to WebP at build and served from `/_astro/`. Use `<Picture formats={['avif','webp']}>` for hero and cover images, and supply `width`/`height` from the snapshot's module metadata to avoid CLS.
- Cloudflare adapter `imageService`: default is `'cloudflare-binding'` (Images binding, runtime). **Use `'compile'`**, which does build-time transforms for prerendered pages and passthrough for on-demand pages. All image pages are static, so no Cloudflare Images plan is needed. [Documented; not tested with the adapter installed]
- The Astro image cache lives in `node_modules/.astro` and revalidates via ETag/Last-Modified [Documented]. CI builds without a cache will re-download every Behance image. Measure this.

### Icons (Tabler, explicit imports, no barrels)

```astro
---
import IconArrowRight from '@tabler/icons/outline/arrow-right.svg';
import IconBrandBehance from '@tabler/icons/outline/brand-behance.svg';
---
<IconArrowRight class="size-6" aria-hidden="true" stroke-width={1.5} />
```

[Verified on Astro 7.4] The import resolves from `node_modules`, the SVG is inlined in the HTML, `stroke="currentColor"` makes it Tailwind-colorable, and props override attributes. Type it as `SvgComponent` (since Astro 5.14). Zero runtime JavaScript. Decorative icons get `aria-hidden="true"`. Icon-only buttons need an `aria-label` on the button.

### Development Tools

| Tool | Version | Purpose | Notes |
|---|---|---|---|
| **@astrojs/check** | `0.9.10` | `astro check` type-checking of `.astro` files | Requires TS ≤6. Run it in `pnpm lint` and CI. |
| **vitest** | `5.0.5` | Unit tests (snapshot normalizer, sanitizer, i18n helpers, filter logic, action validation) | Peers `vite ^8`, matching Astro 7. Use `getViteConfig()` from `astro/config`. Use `experimental_AstroContainer` from `astro/container` for component render tests. [Documented; Vitest 5 plus Astro 7 together is not yet tested] |
| **@playwright/test** | `1.64.1` | E2E against `astro preview` (`webServer`) | Test the language toggle, routes, filters, the form (Turnstile test keys), and `reducedMotion: 'reduce'` emulation. |
| **@axe-core/playwright** | `4.14.0` | Automated a11y checks per page/locale | Accessibility is non-negotiable per PROJECT.md. |
| **eslint** + **eslint-plugin-astro** + **typescript-eslint** + **@eslint/js** + **globals** | `10.12.0` / `3.2.1` / `8.71.2` / `10.0.1` / `17.13.0` | Linting | eslint-plugin-astro 3 peers eslint ≥10 and typescript-eslint ≥8.61. Enable its `jsx-a11y` config (peer `eslint-plugin-jsx-a11y 6.10.2`). |
| **prettier** + **prettier-plugin-astro** + **prettier-plugin-tailwindcss** | `3.9.10` / `1.1.1` / `0.8.1` | Formatting and Tailwind class sorting | Put the tailwind plugin last in `plugins`. |

---

## 3. Installation

[Proposed]

```bash
# Scaffold (AGENTS.md convention)
pnpm create astro@latest designer-portfolio   # choose: empty/minimal template, TypeScript "strictest"
pnpm add -D typescript@~6.0.3 @astrojs/check  # pin TS 6; do NOT let TS 7 in
pnpm astro add tailwind                        # -> tailwindcss + @tailwindcss/vite, global.css
pnpm approve-builds                            # pnpm 10/11 blocks postinstall (sharp, esbuild, workerd)

# Phase: UI shell
pnpm add @tabler/icons

# Phase: Behance sync (script-only deps)
pnpm add -D sanitize-html @types/sanitize-html

# Phase: Motion
pnpm add gsap lenis
# pnpm add ogl   # only if WebGL hover distortion is chosen

# Phase: Contact form
pnpm astro add cloudflare                      # -> @astrojs/cloudflare + wrangler
pnpm add resend                                # or plain fetch to the Resend REST API

# Quality tooling (phase 1)
pnpm add -D vitest @playwright/test @axe-core/playwright \
  eslint @eslint/js typescript-eslint eslint-plugin-astro eslint-plugin-jsx-a11y globals \
  prettier prettier-plugin-astro prettier-plugin-tailwindcss
pnpm exec playwright install --with-deps chromium

# Polish
pnpm astro add sitemap
```

---

## 4. Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|---|---|---|
| Scraped snapshot + overrides | Official Behance API | Only if Adobe reopens key issuance (no evidence of that in 2026) |
| Scraped snapshot + overrides | RSS feed | If you only ever need title, link, date and a small cover (no detail pages or filters) |
| Scraped snapshot + overrides | Fully manual content collection | If Behance blocks the scrape or Martina prefers not to rely on it. The schema is the same, so it is a drop-in. |
| GSAP + ScrollTrigger | Motion (`motion` 14.3) | A lighter site with simple reveals only. motion/mini + inView + scroll is 7.6 KB gz versus GSAP's 46 KB, but there is no SplitText, no pinning, and a weaker timeline story. **Don't ship both.** |
| GSAP + Lenis | GSAP ScrollSmoother | If you want everything inside GSAP. ScrollSmoother needs a wrapper/content DOM structure that complicates ClientRouter swaps. Lenis is lighter (5.5 KB) and has built-in reduced-motion handling. |
| `<ClientRouter />` | Native cross-document view transitions (`@view-transition { navigation: auto; }`, no JS) | If you drop persistent cursor/Lenis state and accept browser-support gaps. Simpler lifecycle (every navigation is a full page load). Revisit in the motion phase. |
| OGL | Three.js 0.186 | Real 3D scenes. Overkill for an image displacement hover. |
| Resend | Cloudflare `send_email` (Email Routing) | Once her domain is on Cloudflare with Email Routing. It is free and removes a vendor. |
| Resend | Formspree / Web3Forms / Basin | If you want zero server code. It conflicts with the Cloudflare/Actions direction and adds third-party branding or limits. |
| ESLint + Prettier | Biome 2.5 | Biome's Astro support is still **experimental** (needs `html.experimentalFullSupportEnabled`, and there are known false positives in `.astro`) [Documented biomejs.dev]. Revisit later. |
| Astro built-in i18n + typed dictionaries | astro-i18next / paraglide | Only if the string count explodes. Two locales and a small site don't justify a dependency. |

---

## 5. What NOT to Use

| Avoid | Why | Use Instead |
|---|---|---|
| `@astrojs/tailwind` | Legacy Tailwind 3 integration; the official Tailwind docs now use the Vite plugin | `@tailwindcss/vite` |
| TypeScript 7.x (current npm `latest`) | Breaks `@astrojs/check` and `typescript-eslint` peer ranges | `typescript@~6.0.3` |
| `<ViewTransitions />` | Removed in Astro 6 | `<ClientRouter />` from `astro:transitions` |
| Cloudflare **Pages** target | Removed from current `@astrojs/cloudflare` per adapter docs | Cloudflare **Workers** with static assets |
| Runtime (Worker-side) Behance scraping | Challenge or IP blocks, latency, ToS exposure, site breaks when Behance changes | Build-time sync into a committed snapshot |
| Rendering Behance `TextModule.text` raw with `set:html` | Inline fonts and colors clash with our design. Unsanitized third-party HTML is an XSS risk. | sanitize-html at sync time |
| Behance auto alt text ("Image may contain: …") | Poor accessibility, and English-only | Local `altText` overrides per locale |
| Hotlinking Behance CDN `<img>` at runtime | Depends on Behance URLs, no optimization | `astro:assets` build-time download and optimization |
| `@tabler/icons-react`/`-svelte` or any barrel `import { IconX } from '@tabler/icons-*'` | Pulls in a UI framework, violates "no barrels" | Per-file SVG imports as Astro components |
| `astro-icon` + `@iconify-json/tabler` | Adds deps and an indirection layer. Name strings aren't explicit imports. | Native Astro SVG components |
| Club GSAP `.npmrc` / private registry tokens | Obsolete. All plugins ship in the public `gsap` package. | `pnpm add gsap` |
| `@studio-freight/lenis` | Old package name | `lenis` |
| Loading both GSAP and Motion | About 75 KB gz of overlapping capability | Pick GSAP |
| Cloudflare Email Service (beta, Workers Paid) for v1 | Beta, paid plan | Resend, later Email Routing `send_email` |
| `@astrojs/db` | Removed in Astro 7 | Not needed |

---

## 6. Stack Patterns by Variant

**If Behance blocks or hardens the challenge (403 persists after cookie replay):**
- Switch `sync-behance.ts` to Playwright (already a dev dependency): load the page in headless Chromium and read `#beconfig-store_state`.
- Because the snapshot is committed, the site keeps building in the meantime.

**If her project count grows past one profile page (`hasMore: true`):**
- Needs a pagination investigation. Likely the `/v3/graphql` endpoint, which robots.txt disallows, or the RSS feed for the list (its item cap is unknown). Flag for research when it happens.

**If she gets a custom domain on Cloudflare:**
- Verify the domain in Resend (better deliverability), or move to the Email Routing `send_email` binding to her verified address (free).

**If the motion JS budget is exceeded after measuring:**
- Drop SplitText (use CSS line masks), lazy-load GSAP only on pages and sections that need it, and use CSS scroll-driven animations for basic reveals.

---

## 7. Version Compatibility

| Package A | Compatible With | Notes |
|---|---|---|
| astro@7.4.0 | vite ^8.3.4 (bundled), zod ^4.6.6 (bundled), node ≥22.22.0 | [Verified npm] |
| @astrojs/cloudflare@14.4.0 | astro ^7.4.0, wrangler ^4.125.0 | Adapter 15 is in beta. Stay on 14. |
| @tailwindcss/vite@4.3.3 | vite ^5–^8 | OK with Astro 7's Vite 8 [Verified build] |
| @astrojs/check@0.9.10 | typescript ^5 \|\| ^6 | **Not TS 7** |
| typescript-eslint@8.71.2 | typescript >=4.8.4 <6.1.0, eslint ^8.57–^10 | **Not TS 7** |
| eslint-plugin-astro@3.2.1 | eslint ≥10, typescript-eslint ≥8.61, node ^22.22.3 / ^24.16 / ≥26.3 | Node 24.15 (local) is **below 24.16**, so engines may warn. Upgrade Node to ≥24.16. [Verified npm engines] |
| vitest@5.0.5 | vite ^6.4–^8, node ^22.12 / ^24 / ≥26 | getViteConfig with Astro 7 is untested by me |
| pnpm 11.0.8 (local) | — | Requires `pnpm approve-builds` for sharp/esbuild/workerd postinstall [Verified] |

---

## Sources

**Tested directly (HIGH, [Verified] 2026-10-15):** curl and Node 24 `fetch` against `behance.net/martifernand7`, `/feeds/user?username=martifernand7`, `/gallery/{id}/{slug}` (x7), `/embed/project/{id}`, `api.behance.net/v2/...`, `mir-s3-cdn-cf.behance.net`, `behance.net/robots.txt`. A throwaway Astro 7.4.0 build with Tailwind 4.3.3, a live Behance loader, a Tabler SVG import, and a remote `<Image>` (`astro check`: 0 errors with TS 6.0.3). esbuild bundle-size measurements. `npm view` for all versions and peers.

**Official docs (HIGH/MEDIUM):**
- https://docs.astro.build/en/guides/upgrade-to/v7/ and /v6/
- https://docs.astro.build/en/reference/content-loader-reference/
- https://docs.astro.build/en/guides/internationalization/
- https://docs.astro.build/en/guides/images/ (remotePatterns, SVG components)
- https://docs.astro.build/en/guides/view-transitions/
- https://docs.astro.build/en/guides/actions/
- https://docs.astro.build/en/guides/integrations-guide/cloudflare/
- https://docs.astro.build/en/guides/testing/
- https://tailwindcss.com/docs/installation/framework-guides/astro
- https://gsap.com/standard-license
- https://github.com/darkroomengineering/lenis
- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- https://developers.cloudflare.com/email-service/
- https://developers.cloudflare.com/email-routing/email-workers/send-email-workers/
- https://resend.com/pricing
- https://resend.com/docs/knowledge-base/403-error-resend-dev-domain
- https://biomejs.dev/internals/language-support/
- https://www.adobe.com/legal/terms.html (Behance terms redirect here)

**Community (LOW, used only for API status):**
- https://experienceleaguecommunities.adobe.com/adobe-developer-20/where-can-i-find-behance-api-144990
- https://experienceleaguecommunities.adobe.com/adobe-developer-20/how-can-i-obtain-an-api-key-or-access-to-behance-s-api-for-integrating-behance-posts-into-our-website-145170
- https://blog.cloudflare.com/email-service/ (Email Service beta timeline)
