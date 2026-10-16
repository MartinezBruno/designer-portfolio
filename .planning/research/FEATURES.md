# Feature Research

**Domain:** Graphic designer / creative services portfolio site (motion-rich, bilingual EN/ES, Behance-sourced projects)
**Researched:** 2026-10-15
**Confidence:** MEDIUM overall
- HIGH: i18n/SEO guidance from Google Search Central; WCAG motion criteria from W3C.
- MEDIUM: Behance metadata dimensions (Behance Help Center plus third-party scraper schemas agree).
- LOW to MEDIUM: "what clients expect" and portfolio conventions. This comes from design blogs and platform guides (opinion, not data) plus pattern knowledge from Awwwards-style sites.

> Labeling convention, per the user's global rules: claims that aren't directly sourced are tagged `[Inference]`, `[Based on patterns]` or `[Unverified]`. Every feature below is `[Proposed]` until it is built and tested.

---

## Who the site is for (this drives every call below)

Primary visitor: **a potential client** (a small business, a brand, or an agency hiring a freelancer). They judge quickly. Sources say reviewers "may only spend a few minutes" on a portfolio. They want three things: (1) relevance to what they need, (2) proof of quality, (3) an easy way to get in touch. Secondary visitors are recruiters and art directors, who care more about craft and process.

Consequence: motion and "wow" support the core value ("feel her design sensibility"). They must **never** slow down the path from landing → seeing work → contacting her.

---

## Feature Landscape

### Table Stakes (Users Expect These)

#### Global / cross-cutting

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Persistent header with nav (Home sections, Projects, Contact) + language switcher | Visitors need orientation and a visible way out of any page | LOW | Sticky or reveal-on-scroll-up. Nav anchors to homepage sections must also work from other pages (`/#contact`, `/es/#contact`). |
| Clear primary CTA ("Let's work together" / "Hablemos") reachable from every page | The whole site exists to convert visitors into inquiries | LOW | In the header and the footer. Scrolls or links to the contact section. |
| Footer with contact email, social links (Behance, Instagram, LinkedIn), copyright | Expected fallback contact path. Some clients prefer email to forms. | LOW | A `mailto:` link is the fallback if the form fails. Tabler icons via explicit imports. |
| Responsive, mobile-first layout | A large share of first visits come from links on phones (Instagram bio, WhatsApp) `[Inference]` | MEDIUM | Motion has to be re-tuned for touch: no cursor effects and lighter parallax on mobile. |
| Fast first paint with optimized images | Image-heavy portfolios are often slow. Low-res or slow images are a top cited portfolio failure. | MEDIUM | Astro `<Image>`/`<Picture>` with AVIF/WebP, explicit width/height (no CLS), lazy-load below the fold, LCP hero image eager + `fetchpriority="high"`. Measure with Lighthouse (per AGENTS.md: measure, don't guess). |
| Semantic HTML + keyboard navigation + visible focus | Required by the project ("non-negotiable") | MEDIUM | One `<h1>` per page, landmarks (`header`/`main`/`footer`/`nav`), skip link, `:focus-visible` styles that survive the custom design. |
| `prefers-reduced-motion` support | WCAG techniques C39/SCR40. Vestibular safety. | MEDIUM | See the "Accessibility for motion-heavy sites" section below. Has to be designed in from the start, not added at the end. |
| Per-page `<title>`, meta description, canonical, Open Graph + Twitter card | Links get shared on WhatsApp, LinkedIn and Instagram DMs. A blank preview looks broken. | LOW | One shared `<SEO>` head component, localized per locale. |
| `hreflang` alternates (en, es, x-default) on every page | Google recommends hreflang when languages live on separate URLs | LOW | Astro i18n **does not** output hreflang automatically (not documented on the Astro i18n guide page). Generate it in the layout from `getRelativeLocaleUrl`/`getAbsoluteLocaleUrl`. Needs `site` set in the Astro config. |
| `<html lang>` set per locale | A11y (screen reader pronunciation) + SEO | LOW | `lang="en"` / `lang="es"`. |
| sitemap.xml + robots.txt | Basic discoverability | LOW | `@astrojs/sitemap` supports i18n alternates. Add it only when needed (per AGENTS.md). Deploy is out of v1 scope, but it costs almost nothing. |
| Custom 404 page (localized) | A broken link that lands on a default error page feels amateur | LOW | Astro builds a single `404.astro`. Detect the locale from the path client-side, or show both languages. Keep the site chrome, links to Home + Projects, and one playful on-brand touch. |
| Favicon set + theme color | Polish signal for a designer | LOW | SVG favicon + apple-touch-icon. |

#### Homepage sections (as planned)

| Section | Table-stakes expectations | Complexity | Notes |
|---------|---------------------------|------------|-------|
| **Hero** (greeting, title, description, image) | Says in about 5 seconds **who she is + what she does + one CTA**. The image is a real photo or signature artwork, not stock. The `<h1>` holds name + role. The text is readable before any animation finishes. | MEDIUM | The hero image is the LCP element, so don't hide it behind a JS-gated intro animation. A text-split reveal is fine if the text is in the DOM and visible with JS off. Add one primary CTA (contact) and one secondary (see work). |
| **Roles marquee** | Infinite horizontal ticker of roles ("Web Design · Social Media Manager · Branding ·..."). Has become a common portfolio idiom `[Based on patterns]`. | LOW | **WCAG 2.2.2 (Level A) applies**: auto-moving content that runs more than 5 seconds next to other content needs a pause mechanism. Do this: CSS animation, pause on hover/focus, a visible pause button (or treat it as decorative), and **stop it entirely under reduced-motion** (show a static wrapped list). Duplicated items get `aria-hidden="true"` so screen readers read the roles once. Use a semantic `<ul>`. |
| **4 featured services** | Each card: title, 1–2 line outcome-focused description, maybe an icon/illustration. Clients scan for "can she do what I need?" | LOW | Cards are a natural place for hover/tilt motion. If they don't link anywhere, don't make them look clickable. If they do link, the target could be a pre-filled contact form ("I'm interested in: Web Design") (see differentiators). |
| **Tools / apps** | Logo grid or row of tools (Figma, Photoshop, Illustrator, Canva, CapCut, Meta Business Suite...) with visible names | LOW | Logos need an accessible name (`alt`/visible label). Watch brand-asset licensing: use official logos as-is, don't recolor. Optional: a second marquee. If so, apply the same 2.2.2 rules, and avoid two competing marquees on one screen. |
| **Latest 3 projects** | Cover image, title, creative field/category, link to detail page, "See all projects" link | MEDIUM | Depends on the Behance data pipeline. Sort by published date. **Needs a fallback** if the data is missing (see Empty/Error states). Covers keep a consistent aspect ratio (Behance covers are typically 4:3 or close, `[Unverified]` for her account) so the grid doesn't jump. |
| **Contact form** | Name, email, message (+ optional service/budget select), labeled fields, inline validation, clear success and error states, spam protection, a `mailto:` fallback | MEDIUM–HIGH | Needs a backend (Cloudflare Worker/Pages Function + email provider, or a form service). Accessibility: real `<label>`s, `aria-describedby` for errors, focus moves to the first error or to the success message, `aria-live` status. Spam: honeypot + Cloudflare Turnstile. Localized validation messages. v1 is a local build, so confirm the backend can run locally (wrangler dev) or stub it. |

#### Projects page (`/projects`, `/es/proyectos` or `/es/projects`)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Grid of all projects with cover, title, category | The core "browse her work" job | LOW–MEDIUM | Static generation from build-time data. Responsive grid. Hover reveal (title/field) has to be available on focus and on touch too, not only on hover. |
| Projects sorted newest first | Freshness signal. Matches Behance's own ordering. | LOW | Behance exposes a published date. |
| Link out to the Behance profile | Social proof (appreciations/followers) and an official source | LOW | "View on Behance" in the header of the page and on each detail page. |

#### Project detail page (`/projects/[slug]`)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Mirror of the Behance project modules in order: images, text blocks, embeds/videos, grids | User decision. Clients expect to see the full case study, not just the cover. | HIGH | Behance projects are built from "modules" (image, text, media embed, grid/photo-grid). The renderer needs a component per module type. Text modules carry rich HTML: sanitize it and re-style it with Tailwind `prose`-like styles. Image modules can be very tall (stacked long-form artboards are common), so lazy-load them and serve responsive sizes. |
| Project header: title, creative fields, tools used, date, short description | Context. "Visuals without context" is a commonly cited portfolio mistake. | LOW–MEDIUM | All of these exist as Behance metadata (see the filter section). Tools/fields show as chips that can link back to the filtered Projects page. |
| Next / previous project navigation | Keeps people browsing instead of bouncing back | LOW | Ordered by date. Wraps around. |
| "View on Behance" link + CTA to contact | Credibility + conversion at peak interest | LOW | |
| Images have alt text | A11y | MEDIUM | Behance images often have **no meaningful alt text** `[Inference]`. Fallback: `alt` = project title + "image N of M", or a local override map for key images. Mark purely decorative images `alt=""`. |
| Per-project OG image | Shared project links should preview *that* project | LOW–MEDIUM | Simplest: use the Behance cover (downloaded/proxied and resized to 1200×630 at build). Better: a generated branded OG card (see differentiators). |

#### Bilingual UX

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Language switcher visible in the header on every page | Google recommends links to other language versions on all pages | LOW | **Use text, not flags** ("EN / ES", or "English / Español"). Flags stand for countries, and Spanish is spoken in 20+ countries. Show both options inline (a 2-option toggle), not a dropdown. Use each language's own name in `aria-label`/`lang` attributes (`<a lang="es" hreflang="es">Español</a>`). Mark the current one with `aria-current="true"`. |
| Switcher keeps the **same page** (not back to home) | Being dropped back on the homepage when switching languages is a known UX failure | LOW–MEDIUM | Map the current route to its counterpart. Project slugs should be identical in both locales (Behance slug), with only the UI chrome translated. |
| URL-prefix routing (`/` EN, `/es/` ES) | Decided in PROJECT.md. Shareable, crawlable. | LOW | Astro i18n with `prefixDefaultLocale: false`. |
| **No automatic redirect** based on `Accept-Language`/IP | Google explicitly advises against auto-redirecting by guessed language. It also stops crawlers and users from reaching every version. | — | Anti-feature, see below. Respect explicit choice instead. |
| Remember an explicit choice | Returning visitors who picked ES shouldn't land in EN | LOW–MEDIUM | Store the choice (cookie/localStorage) only when the user clicks the switcher. On a later visit to `/` (static site, no server in v1), show a small non-blocking "¿Ver en español?" banner, or do a client-side redirect *only from the bare root* when a stored preference exists. Prefer the banner: it is safe for SEO and never traps anyone. A deep link always wins over the stored preference. |
| Behance content stays in its original language | Behance project text is single-language (whatever she wrote) | — | **Important scope decision**: project text from Behance can't be auto-translated reliably. In ES mode, translate the UI chrome only, and show project text as-is, optionally with a small "Project description in English" note. Optional later: a local translation override file per project. |
| Localized dates/numbers | Polish | LOW | `Intl.DateTimeFormat(locale)`. |

#### Empty / error / loading states (Behance-dependent)

| State | Expected behavior | Complexity | Notes |
|-------|-------------------|------------|-------|
| Behance fetch fails **at build** | Build should **not** silently ship an empty portfolio | MEDIUM | Commit a **snapshot** of the last good data (JSON + downloaded images) in the repo, and fall back to it. Log a loud warning. Optional: fail the build if both live fetch and snapshot are missing. This is the main resilience mechanism. |
| Behance images hotlinked and blocked / 404 at runtime | Never show broken image icons | MEDIUM | Download and optimize images at build into the site's assets rather than hotlinking the Behance CDN `[Inference: hotlinking risks blocking + no image optimization]`. If hotlinking is unavoidable, use `onerror` → styled placeholder. |
| Zero projects in a filter result | Friendly "No projects match — clear filters" with a one-click reset | LOW | Localized. Announced via `aria-live="polite"` with a result count ("6 projects"). |
| Latest-3 section with fewer than 3 projects | Layout still balanced | LOW | Grid adapts. Hide the section if 0 and keep the "See on Behance" link. |
| Loading states | With static generation there's **no data loading** for projects, which is the main reason to build statically | LOW | Real loading UI is only needed for: the contact form submit (button spinner + disabled + `aria-busy`), image fade-in (blur-up / dominant-color placeholder), and page transitions. **Don't** build a fake full-screen "preloader" counting to 100% (see anti-features). |
| Contact form failure | Clear error with the `mailto:` fallback shown inline | LOW | Keep the user's typed message, never clear it on failure. |
| JS disabled / JS error | Content still visible and navigable | MEDIUM | Scroll-reveal must not start elements at `opacity:0` in CSS without a JS-applied class. Otherwise a JS failure leaves a blank page. Pattern: `html.js .reveal { opacity:0 }`. |

---

### Differentiators (Competitive Advantage)

These line up with the core value: "immediately feel her design sensibility through a striking, animated experience."

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Signature motion system** (scroll reveals, text splits, parallax, smooth/inertial scroll) | This is the product's main differentiator. It shows taste, not just skill. | HIGH | Pick a small set of consistent motion "tokens" (durations, easings, stagger) and apply them everywhere. Consistency reads as craft, and randomness reads as template. Smooth scroll (e.g. Lenis) must turn off under reduced-motion and must not break anchor links, keyboard scrolling or find-in-page. |
| **Custom cursor + magnetic buttons + image hover effects** | Playful, memorable, typical of award-style portfolios `[Based on patterns]` | MEDIUM | Pointer-fine devices only (`@media (hover:hover) and (pointer:fine)`). The native cursor remains, or the custom cursor clearly shows the hotspot. Off under reduced-motion. Never the only cue for an interactive element. |
| **Page transitions** | App-like, continuous feel between Home → Projects → Detail | MEDIUM | Astro View Transitions (`<ClientRouter />`) / native cross-document View Transitions. Shared-element morph from a project card cover → detail hero is a strong "wow" at low cost. Must handle focus (move focus to `<main>`/`<h1>` after navigation) and announce the new page title. Cross-fade only under reduced-motion. |
| **Filter chips that link from detail pages** | Click "Branding" on a project → see all branding work. Turns metadata into navigation. | LOW | Needs filter state in the URL (`?field=branding`). |
| **Service → contact pre-fill** | Clicking a service card's CTA opens the contact form with that service pre-selected. Fewer steps for the client. | LOW | Query param or in-page state. Ties services to conversion. |
| **Branded per-project OG images** | Shared links look designed. A designer's link previews *are* portfolio pieces. | MEDIUM | Generate at build (Satori/`@vercel/og`-style or `astro-og-canvas`): cover crop + project title + her mark. Fallback: cover image. |
| **Dominant-color / blur placeholders for images** | Smooth, polished image loading on an image-heavy site | LOW–MEDIUM | Extract at build. Background color on the image wrapper. |
| **Short "about" / personality block** (photo, 2–3 lines, location/timezone, availability) | Sources: clients want to know if they'd enjoy working with you. Skipping an about section is a common mistake. | LOW | Can live inside the hero/description. A light "Available for projects — Oct 2026" badge is a strong conversion cue `[Based on patterns]`. Must be easy to update (a content constant). |
| **Testimonials / client logos** | Social proof for client-facing freelancers | LOW (if content exists) | Not in the current plan. Only add it if she has real quotes. Fake or placeholder proof is worse than none. Flag as an open question for the client. |
| **Localized slugs for static pages** (`/es/proyectos`) | Feels native to Spanish speakers | LOW–MEDIUM | Optional. Adds route-mapping work to the switcher. Keeping `/es/projects` is acceptable. |
| **Keyboard-accessible "motion off" toggle** in the UI | Goes beyond the OS setting (WCAG technique "Gx: allowing users to set a preference that prevents animation"). Shows a11y care. | LOW–MEDIUM | Persist in localStorage. It drives the same code path as `prefers-reduced-motion`. Good fallback for users who don't know about the OS setting. |

---

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full-screen preloader / "0–100%" intro animation | Looks "Awwwards". Hides loading. | Delays LCP and content. Annoying on repeat visits. Keeps time-pressed clients from the work. On a static site there's nothing to load anyway. | A fast hero entrance (under ~1s, text visible immediately), only on first visit per session at most. |
| Scroll-jacking (custom snap/step scrolling, hijacked wheel) | Cinematic storytelling | Breaks keyboard, trackpad, screen readers and find-in-page. Disorienting. Makes vestibular issues worse. | Lenis-style smooth scroll that keeps native scroll semantics, or plain native scroll. Off under reduced-motion. |
| Auto-redirect by browser language / IP | "Spanish visitors should see Spanish" | Google explicitly advises against it. Crawlers (mostly US-based) and users can't reach every version. Traps people. | A visible switcher + remembered explicit choice + an optional suggestion banner. |
| Flags in the language switcher | Visual shorthand | Flags = countries, not languages. Which flag for Spanish? Spain? Argentina? | "EN / ES" text toggle. |
| Machine-translating Behance project text at build/runtime | Full Spanish experience | Quality risk on her professional copy. API dependency/cost. Wrong translations misrepresent her. | Translate UI chrome only. Optional manual per-project override file reviewed by her (v1.x). |
| Heavy faceted search (multi-select facets, counts, sort options, full-text index, pagination) on a 10–50 item catalog | "Search + filter" in the brief | Overkill. More UI than content. Empty-result dead ends. Search engine deps (Pagefind/Fuse) add weight for little gain. | Single-select category chips + optional simple client-side text match on title. Everything fits on one page, no pagination. |
| Infinite scroll / pagination on Projects | Convention from big sites | With 10–50 items, all projects fit on one page. Infinite scroll breaks the footer and back-button position. | Render everything statically. Lazy-load images. |
| Live client-side fetch of Behance on every visit | "Always up to date" | No public API key path (per PROJECT.md, `[Unverified]`). CORS/blocking. Slow. Fragile. Leaves an empty page when Behance changes. | Build-time fetch + committed snapshot. Rebuild to refresh (later: scheduled rebuild on Cloudflare). |
| Hotlinking Behance CDN images | Zero storage effort | Can break (referrer checks, URL changes). No AVIF/WebP resizing. Third-party request on every image. | Download at build and optimize through Astro assets. |
| Embedding Behance via iframe for the detail page | Fast "mirror" | Not styled within the site (requirement says "styled within the site"). Heavy. Poor a11y/SEO. | Parse modules and render them natively. |
| Autoplaying background video with sound / carousels that auto-advance | "Dynamic" | WCAG 2.2.2. Distracting. Data cost on mobile. | Static or click-to-play media. Muted loops only if paused under reduced-motion and given a pause control. |
| Motion that gates content (text invisible until scroll triggers, under reduced-motion or with no JS) | Dramatic reveals | Blank sections for JS errors, reduced-motion users, crawlers and print. | Progressive enhancement: content visible by default, motion added on top. |
| Custom cursor that *replaces* the native cursor on all devices | Signature look | Unusable on touch. Lag. Hides the hotspot. | Pointer-fine only, keep it as an enhancement layered on top of the native cursor. |
| Gimmicky "skill bars" (Photoshop 90%) for tools | Common template element | Meaningless numbers. Clients don't trust self-ratings `[Based on patterns]`. | A logo grid with names, optionally grouped (Design / Social / Web). |
| Blog / CMS / admin | "Content marketing" | Out of scope (PROJECT.md). Maintenance burden. | Behance is the content source. Static copy in i18n files. |
| Cookie banner by default | Fear of compliance | No cookies needed if there's no analytics/tracking and the language preference uses localStorage `[Inference — confirm with privacy requirements if analytics are added]` | Avoid tracking in v1. If analytics are added later, use a cookieless option. |

---

## Search & Filter: Recommendation for a 10–50 Project Catalog

### What Behance exposes per project (filter candidates)

Per the Behance Help Center, a project has a **Creative Field** (selected at publish, up to 3 `[Unverified exact limit]`), **Project Tags** and **Tools Used**. The lightbox view displays "the user-added Tools, Creative Fields, and Tags". Third-party Behance scrapers expose `fields`, `tools`, `tags`, `published_on`, plus stats (views, appreciations, comments). **The exact availability depends on the data-source approach chosen in the Stack research.**

| Dimension | Source on Behance | Usefulness for clients | Recommendation |
|-----------|-------------------|------------------------|----------------|
| **Creative field / category** (Graphic Design, Branding, Web Design, Social Media, Illustration...) | `fields` (curated Behance list) | HIGH. Maps directly to "do you do what I need?" | **Primary filter. Single-select chips** with an "All" default. Optionally normalize Behance fields into her own 4–6 categories that match her services (e.g. map "Graphic Design" + "Advertising" → "Social Media"). A local mapping table gives control over labels and translation. |
| **Tools** (Figma, Photoshop, Illustrator...) | `tools` | LOW–MEDIUM for clients (they care about outcomes, not software). Higher for recruiters. | **Display only** as chips on cards/detail pages. Not a v1 filter. Optional secondary filter later if the catalog grows. |
| **Year** | `published_on` | LOW. With about 50 items, newest-first sorting already covers recency. | **Don't filter.** Show the year on cards. Optional year group headings. |
| **Tags** | `tags` (free-form, inconsistent) | LOW. Noisy, unbounded vocabulary. | **Not a filter.** Can feed the text search. |
| **Client / industry** | Not structured on Behance `[Inference]` | MEDIUM | Not available without a local metadata overlay. Defer. |

### Minimal good UX (recommended v1)

1. **A row of category chips** above the grid: `All · Branding · Social Media · Web Design · ...` (generated from data and **only categories with ≥1 project**, so no empty-result dead ends). Single-select. Uses `aria-pressed` buttons or a radio group. Shows a count only if cheap (`Branding (7)`).
2. **Optional text search** (title + tags + fields), a simple client-side `includes()` on lower-cased, accent-stripped strings (important for ES: "diseño" vs "diseno"). No library needed at this scale.
3. **URL state**: `?category=branding&q=logo`, so links can be shared and the back button works, and detail-page chips can link into a filtered view.
4. **Live result count** in an `aria-live="polite"` region ("Showing 7 of 23 projects").
5. **Empty state** with a "Clear filters" button.
6. **Animated re-layout** when filtering (FLIP / View Transitions). Instant under reduced-motion.
7. **Progressive enhancement**: without JS, all projects show (filter UI hidden or rendered as links).
8. All **filtering runs client-side on the statically rendered list**. No server.

Complexity: LOW–MEDIUM. Skip it if the catalog has fewer than about 8 projects or only 1–2 categories: a curated grid is better there. **Check her actual Behance project count and field spread before committing.**

---

## Accessibility Expectations for a Motion-Heavy Site

| Requirement | Standard | Implementation |
|-------------|----------|----------------|
| Respect `prefers-reduced-motion: reduce` | WCAG 2.3.3 (AAA) techniques C39 (CSS) / SCR40 (JS) | One central `motion` util in `lib/` that reads the media query **and listens for changes**. All JS animation (GSAP/Motion/Lenis) checks it. CSS: global `@media (prefers-reduced-motion: reduce)` override. Reduced ≠ removed: keep opacity fades, drop translation/scale/parallax/smooth scroll/cursor effects. |
| Auto-moving content gets a pause mechanism | WCAG 2.2.2 Pause, Stop, Hide (Level **A**, so required) | Marquee(s): pause on hover/focus + a pause button, or stop under reduced-motion. Auto-playing media: controls. |
| No flashing more than 3 times per second | WCAG 2.3.1 (A) | Watch glitch/strobe hover effects. |
| Content not dependent on animation | 2.3.3 understanding: reducing animation must not block access to content | Content visible by default. Animations are enhancements. |
| Focus management on client-side navigation | WCAG 2.4.3 Focus Order | With View Transitions/ClientRouter: after a swap, focus `<h1>` or `<main>` and update `document.title`. Astro's router announces the page title `[Unverified — check current Astro docs during implementation]`. |
| Hover effects also reachable via keyboard/touch | WCAG 1.4.13, 2.1.1 | Card hover reveals mirror on `:focus-visible`. Info isn't hover-only. |
| Smooth scroll doesn't break native behaviors | 2.1.1 Keyboard | Test Space/PageDown/Home/End, anchor links, find-in-page, and the skip link with Lenis on. |
| Contrast over imagery / animated backgrounds | WCAG 1.4.3 | Text over hero image/parallax layers needs a scrim. Test both themes if there's dark mode. |
| Marquee is screen-reader friendly | Best practice | One real list; visual duplicates `aria-hidden`. |
| Target size for magnetic buttons | WCAG 2.5.8 (AA in 2.2) | Magnetic displacement must not move the target out from under the pointer or below 24×24px. |

---

## Feature Dependencies

```
Behance data pipeline (build-time fetch + snapshot + image download)
    ├──requires──> Data-source decision (STACK research)
    ├──enables──> Latest 3 projects (homepage)
    ├──enables──> Projects page grid
    │                 └──enables──> Search/filter (needs fields/tags metadata)
    │                                   └──enhanced by──> Category mapping table (local)
    ├──enables──> Project detail page (module renderer)
    │                 ├──enables──> Next/prev navigation
    │                 ├──enables──> Per-project OG images
    │                 └──enables──> Filter chips linking to Projects page
    └──enables──> Empty/error fallbacks (snapshot)

i18n foundation (Astro i18n config, translation dictionaries, locale-aware link helper)
    ├──required by──> Every page and component with UI text
    ├──required by──> Language switcher (same-page mapping)
    ├──required by──> SEO head (hreflang, og:locale, html lang)
    └──required by──> Localized 404, form validation messages

Layout shell (header/nav/footer, SEO head, skip link)
    └──required by──> All pages

Motion foundation (reduced-motion util, motion tokens, progressive-enhancement reveal pattern)
    ├──required by──> Scroll reveals, marquee, parallax, smooth scroll
    ├──required by──> Cursor/magnetic effects
    └──required by──> Page transitions (+ focus management)

Contact backend (Cloudflare Worker/Function + email provider + Turnstile)
    └──required by──> Contact form (working send)
Service cards ──enhances──> Contact form (pre-fill)

Smooth scroll (Lenis) ──conflicts──> Scroll-jacking/snap sections
Smooth scroll ──must coordinate with──> View Transitions (reset scroll / re-init on navigation)
Custom cursor ──conflicts──> touch devices (gate by pointer:fine)
Two simultaneous marquees (roles + tools) ──conflicts──> visual calm / 2.2.2 burden
```

### Dependency Notes

- **Everything project-related requires the Behance pipeline.** Build homepage sections and the Projects UI against a typed local fixture (a JSON with the same shape) first, so UI work doesn't wait on the data-source decision.
- **i18n must come before content components.** Adding locale support afterward means touching every string and link. Set up the dictionaries + `t()`/link helpers in the foundation phase.
- **The motion foundation must come before motion features.** The reduced-motion util, progressive-enhancement reveal pattern, and motion tokens belong in the foundation. Adding a11y later on top of GSAP/Lenis code is a common rewrite trigger.
- **Page transitions + smooth scroll + scroll-triggered animations interact.** With Astro's ClientRouter, scripts don't re-run on navigation by default (`astro:page-load` events are needed), and ScrollTrigger/Lenis instances must be destroyed and recreated. Put them in the same phase or later.
- **Filter depends on actual metadata quality.** Verify her projects' fields before designing the filter UI.
- **The contact form is independent of Behance** and can be built in parallel. Its backend depends on the Cloudflare/local-dev decision.

---

## MVP Definition

### Launch With (v1)

- [ ] Layout shell: header/nav, EN/ES text switcher (same-page mapping), footer with email + socials, skip link. Reason: navigation and language choice on every page.
- [ ] i18n foundation + hreflang/x-default + `html lang` + per-page meta/OG. Reason: required by the bilingual decision and needed for shareable links.
- [ ] Motion foundation with reduced-motion and progressive enhancement. Reason: an accessibility non-negotiable that's expensive to retrofit.
- [ ] Hero (h1 name+role, description, image, 2 CTAs). Reason: the first impression.
- [ ] Roles marquee (pause on hover/focus, static under reduced-motion, SR-friendly). Reason: planned section, WCAG 2.2.2.
- [ ] 4 services + tools grid. Reason: answers "can she do what I need?"
- [ ] Behance pipeline with committed snapshot + local image optimization. Reason: all project features depend on it, and the snapshot gives resilience.
- [ ] Latest 3 projects + Projects page (all, newest first). Reason: the core job.
- [ ] Project detail renderer (image/text/embed modules), metadata header, next/prev, Behance link, contact CTA. Reason: requirement, and it shows depth of work.
- [ ] Contact form with validation, honeypot/Turnstile, success/error states, mailto fallback. Reason: conversion.
- [ ] Localized 404. Reason: cheap polish.
- [ ] Scroll reveals + page transitions (with focus management) + image hover effects. Reason: the core-value differentiator.

### Add After Validation (v1.x)

- [ ] Category filter chips + optional text search with URL state. Add once the actual project count/fields are confirmed (if there are more than about 8 projects and at least 3 categories). The brief calls it "a plus".
- [ ] Custom cursor + magnetic buttons. Add after the core motion is stable and measured (perf budget).
- [ ] Smooth/inertial scroll + parallax. Add once the View Transitions interplay is solved. Highest a11y/perf risk among the motion features.
- [ ] Branded generated OG images. Use the cover-image OG until then.
- [ ] Remembered language preference + suggestion banner.
- [ ] Service → contact pre-fill.
- [ ] In-UI "reduce motion" toggle.

> Note: smooth scroll/parallax/cursor are listed as Active requirements in PROJECT.md. They can still ship in v1. The split above only suggests building them **after** the foundation is stable, as later phases, not deferring them past v1.

### Future Consideration (v2+)

- [ ] Manual Spanish overrides for Behance project text. Defer because of the content workload on the client.
- [ ] Testimonials/client logos. Only once real content exists.
- [ ] Scheduled rebuilds to refresh Behance data. Requires deployment (out of v1 scope).
- [ ] Tools/year as secondary filters. Only if the catalog grows past about 50.
- [ ] Analytics (cookieless). After deployment.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Layout shell + nav + footer | HIGH | LOW | P1 |
| i18n foundation + switcher + hreflang | HIGH | MEDIUM | P1 |
| Motion foundation (reduced-motion, PE reveals) | HIGH | MEDIUM | P1 |
| Hero | HIGH | MEDIUM | P1 |
| Roles marquee (accessible) | MEDIUM | LOW | P1 |
| Services (4) | HIGH | LOW | P1 |
| Tools grid | MEDIUM | LOW | P1 |
| Behance pipeline + snapshot | HIGH | HIGH | P1 |
| Latest 3 projects | HIGH | LOW (after pipeline) | P1 |
| Projects page grid | HIGH | LOW (after pipeline) | P1 |
| Project detail module renderer | HIGH | HIGH | P1 |
| Contact form + backend + spam protection | HIGH | MEDIUM–HIGH | P1 |
| SEO meta + per-project OG (cover-based) | MEDIUM | LOW | P1 |
| Localized 404 | LOW | LOW | P1 |
| Scroll reveals + page transitions | HIGH (core value) | MEDIUM | P1 |
| Image hover effects | MEDIUM | LOW–MEDIUM | P1 |
| Category filter + search (URL state) | MEDIUM | LOW–MEDIUM | P2 |
| Smooth scroll + parallax | MEDIUM | MEDIUM–HIGH | P2 |
| Custom cursor + magnetic buttons | MEDIUM | MEDIUM | P2 |
| Remembered language pref + banner | LOW–MEDIUM | LOW | P2 |
| Branded generated OG images | LOW–MEDIUM | MEDIUM | P2 |
| Service → contact pre-fill | LOW–MEDIUM | LOW | P2 |
| In-UI motion toggle | LOW–MEDIUM | LOW | P2 |
| Spanish overrides for project text | LOW | MEDIUM (content) | P3 |
| Testimonials | MEDIUM | LOW (needs content) | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

`[Based on patterns]`: general knowledge of common portfolio approaches, not a fresh audit of specific sites.

| Feature | Behance profile itself | Template portfolio (Squarespace/Framer/Webflow template) | Award-style custom portfolio (Awwwards SOTD type) | Our Approach |
|---------|------------------------|-----------------------------------|-----------------------------------------------|--------------|
| Project browsing | Grid, newest first, no category filter on a personal profile `[Unverified]` | Grid, sometimes category tabs | Curated list/grid, often hover-preview images | Grid + category chips (v1.x), newest first |
| Project detail | Long vertical module stack | Gallery + text | Custom case-study layouts | Mirror Behance modules, restyled, + metadata header + next/prev |
| Motion | Minimal | Template defaults | Heavy (WebGL, smooth scroll, cursor, transitions) | Heavy but structured, reduced-motion safe, no preloader/scroll-jacking |
| Bilingual | Platform UI only | Often absent or plugin-based | Rare | Native URL-prefixed EN/ES with hreflang and same-page switching |
| Contact | Behance messaging (requires account) | Form | Often only mailto | Form + mailto fallback |
| Personality/about | Profile sidebar | About page | Strong hero statement | Hero with photo + statement + availability |

---

## Open Questions for Requirements

1. How many projects are on her Behance, and which creative fields do they use? This determines whether the filter is worth building in v1.
2. Does she have testimonials or client logos?
3. Should the Spanish site show project text in English (recommended v1) or does she want to supply translations?
4. Which email delivery provider for the contact form, and does it need to work in the local build or can it be stubbed for v1?
5. Availability badge: does she want to show it?

---

## Sources

- Google Search Central, Managing multi-regional and multilingual sites (no auto-redirect, links to other language versions on all pages, hreflang): https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites (HIGH)
- Astro i18n guide (prefixDefaultLocale, getRelativeLocaleUrl, fallback; no hreflang mention): https://docs.astro.build/en/guides/internationalization/ (HIGH)
- W3C Understanding SC 2.3.3 Animation from Interactions (C39, SCR40, Gx techniques; parallax example): https://w3c.github.io/wcag/understanding/animation-from-interactions (HIGH)
- Hidde de Vries, Meeting 2.2.2 Pause, Stop, Hide with prefers-reduced-motion: https://hidde.blog/meeting-2-22-pause-stop-hide-with-prefers-reduced-motion/ (MEDIUM)
- Behance Help Center, Create a Project (creative field + tags at publish): https://help.behance.net/hc/en-us/articles/204483684 (MEDIUM)
- Behance Help Center, Search/filter creative work (Tools, Creative Fields, Tags shown in lightbox): https://help.behance.net/hc/en-us/articles/204483864-Guide-Search-Filter-Creative-Work (MEDIUM)
- Apify Behance scraper schema (fields/tools/tags per project; third-party): https://apify.com/scrapers_lat/behance-scraper (LOW–MEDIUM)
- SimpleLocalize, Flags in language selectors / language selector best practices: https://simplelocalize.io/blog/posts/flags-as-language-in-language-selector/ , https://simplelocalize.io/blog/posts/language-selector-best-practices/ (MEDIUM)
- Lingo.dev, remembering language selection (cookie for explicit choice; URL stays the source of truth): https://lingo.dev/en/nextjs-pages-router-i18n/remember-language-selection (LOW–MEDIUM)
- Portfolio expectations/mistakes: Built In https://builtin.com/design-ux/graphic-design-portfolio , Dribbble https://dribbble.com/stories/2021/05/18/5-design-portfolio-mistakes-that-ll-send-clients-running-in-the-wrong-direction , Upwork https://www.upwork.com/resources/how-to-build-graphic-design-portfolio (LOW–MEDIUM, opinion)

---
*Feature research for: graphic designer portfolio (motion-rich, bilingual, Behance-sourced)*
*Researched: 2026-10-15*
