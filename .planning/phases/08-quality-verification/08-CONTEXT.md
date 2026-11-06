# Phase 8: Quality Verification - Context

**Gathered:** 2026-11-06
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase shows, by measurement, that the finished local v1 build is fast, accessible in EN and ES, and has its Spanish copy ready for Martina to review (QUAL-01, QUAL-02, QUAL-03). It also closes selected v1.0 milestone-audit debt (D-15..D-20) so a re-run of the audit comes back clean.

Out of scope: deploying, real domain/email/Turnstile/Resend wiring (v2 DEPLOY), new features, and redesign work. Taste findings are reported, not fixed (D-20).

</domain>

<decisions>
## Implementation Decisions

### Lighthouse measurement (QUAL-01)
- **D-01: Measure locally.** Run Lighthouse in **mobile** mode (default simulated throttling) against `astro preview` of the production build. No deploy.
- **D-02: One-off run by the agent, no new dependency.** The executor runs a **pinned** `pnpm dlx lighthouse@<exact version>`. Nothing is added to `package.json`, no measurement script is committed, and it is not part of `pnpm verify`. Raw JSON reports stay out of git (scratch or a gitignored dir). The committed artifact is the Markdown report (D-06).
- **D-03: Median of 5 runs per page**, with the spread (min/max) recorded next to the median.
- **D-04: Measure Home `/` and the heaviest project detail page, EN only.** Pick the heaviest detail page **by measured page weight** (bytes transferred / image weight across all 7 EN detail pages), not by guess. Record how it was chosen.
- **D-05: Measure the default `on` motion state only** (Lighthouse emulates no reduced-motion preference). This is the worst case: lazy GSAP, Lenis and reveals.
- **D-06: Budget and handling of misses.** The locked budget is **LCP < 2.5 s, CLS < 0.1, TBT < 200 ms, homepage JS ≈ 100 KB gzip total**. The existing per-page eager ceiling of 22,000 B gzip (`scripts/measure-bundle.ts`) still holds. A miss gets a fix plan. If a miss can't be fixed (for example an unavoidable large Behance image), document it with the measured cause (LCP element, its phase breakdown, the offending resource) and **get the user's sign-off at a checkpoint**. The report in the phase dir records, per page: the median and spread for LCP, CLS, TBT, FCP, SI and the performance score; the LCP element; total and JS transferred KB; `pnpm measure:bundle` output; the Lighthouse version and the machine/Node context. The user reviews the numbers at a checkpoint.

### Accessibility and keyboard (QUAL-02)
- **D-07: The axe sweep covers every built route.** Derive the page list from the build output or the snapshot/helpers (`expectedDetails`), not a hand list. That means Home, Projects, all 7 detail pages, and both 404 pages, in EN and ES. Adding a project automatically adds it to the sweep. Replace or extend the 3-slug sample (`AXE_DETAIL_SLUGS`) in `tests/e2e/a11y.spec.ts`.
- **D-08: Every page is checked in all three motion states, `on`, `reduced` and `off`**, about 54 axe runs with the same WCAG 2.2 AA tag set as today. Keep runtime reasonable through the planner's choice of sharding or parallelism.
- **D-09: Keyboard proof is automated journeys plus a manual checklist.** The Playwright keyboard journeys must cover: skip link, header nav, the EN/ES switch, the motion toggle, marquee pause, card → detail → next/previous project, the embed click-to-load facade, the service "Ask about this" → preselected contact form, and the full contact form (fill, validation error path with focus to the first invalid field, success panel, "Send another"). Plus a **short human checkpoint**: real Tab through each page type in EN and ES, focus always visible, no traps, and focus lands on the h1 after navigation (Phase 7 D-14). A screen-reader (VoiceOver) pass is **not** required.
- **D-10: Fix marquee WR-01** (Phase 2 review). `aria-pressed` must always match the real paused state, including the hover/focus pause (WCAG 4.1.2).
- **D-11: Fix marquee WR-03** (Phase 2 review). Toggling reduced motion after load must not leave the band clipped or the pause control live when there is nothing to pause.
- **D-12: The marquee pause control stays invisible** (the user's Phase 2 decision is kept). Fix only its semantics. When focused it must still show a visible focus indicator. Do not add a visible pause button. WR-02 stays an accepted user decision.

### Spanish review list (QUAL-03)
- **D-13 (Claude's discretion, the user did not discuss this area):** Produce one reviewer-facing file in the phase dir, for example `08-SPANISH-REVIEW.md`, that holds **every piece of site copy** as an `key/location | EN | ES | status` table. The status column starts at "draft, for Martina's review". It covers the UI dictionaries (`src/i18n/ui.en.ts` / `ui.es.ts`), localized `src/data/*.json` (profile, roles, services, tools), `src/data/project-overrides.json`, the 404 copy, SEO titles and descriptions, and the contact email copy (Spanish-only, Phase 5 D-16). Generate it with a script or a test helper so it stays in sync and can't miss keys. Whether that generator is committed is the planner's call (prefer a small test asserting full coverage). **Non-copy `TODO(martina)` items** (real domain, real address, uncropped hero photo, verified sending domain) go in a separate short list in the same file. Every scattered `TODO(martina)` copy comment should point to this single file.
- **D-14:** The Behance project titles and bodies are **not** translated (I18N-09 is v2). The review file states that.

### Audit debt folded in
- **D-15: Remove the HOME-04 dead icon data.** Delete the orphaned `ServiceIcon.astro`, the unused `icon` prop on `ServiceCard`, `icon` in the services content schema, and its values in `services.json`. Fix the stale tooltip comment in `src/lib/motion/index.ts`. Tests must stay green.
- **D-16: Re-check the specs trimmed by the redesign merge** (ff5bf7c: `home-story.spec.ts` lost about 92 lines and `a11y.spec.ts` about 60). Compare against the pre-merge versions in git. For each removed assertion, decide whether it is still valid after the redesign (HOME-02/03/07, MOTN-01/04). If it is, restore it. If not, note why. Tooltip assertions are intentionally gone.
- **D-17: Make `/es/404/` return HTTP 404** (Phase 1 WR-03). Today it is served as a 200 page. Verify against `astro preview` (Workers/workerd) at minimum. Keep the localized 404 content and the e2e tests.
- **D-18: Fix the skip-link focus padding** (Phase 1 WR-02). The skip link keeps its horizontal padding when focused.
- **D-19: One planning-docs task.** Set 06-VERIFICATION status to passed (06-HUMAN-UAT passed 3/3), tick HOME-02/03/04/05/07 in REQUIREMENTS.md, and fix `completed_phases` in STATE.md, so `/gsd-audit-milestone` re-runs cleanly.
- **D-20: Run the taste-skill gate on the redesign, report only.** Run `taste-skill` `lint.mjs` and `inspect.mjs` on every page type at 1440 and 390, and review the screenshots, including the footer's decorative 10vw name on the `#0f70b7` band. Record the findings. Fix only items that are accessibility or performance defects. Visual taste items go to the user as a list. Previously accepted FAILs (icon-cards, focal-point, empty-screens, the PuroV crop) are not reopened.

### Claude's Discretion
- The Spanish review list format, generator and location (D-13).
- How to find the heaviest detail page (D-04), and the exact pinned Lighthouse version (D-02).
- Sharding or parallelism of the ~54-run axe sweep (D-08), and the structure of the keyboard journey specs (D-09).
- The mechanism for `/es/404/` returning 404 on Workers (D-17), which research decides.
- Plan and wave breakdown. Follow the memory "post-merge gate has no e2e": any plan that touches CSS (skip link, marquee) runs the relevant scroll/contact/marquee e2e specs in that plan, not just in the final gate.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` §Phase 8 — goal and the 3 success criteria
- `.planning/REQUIREMENTS.md` — QUAL-01, QUAL-02, QUAL-03; I18N-09 (v2, project-content translation out of scope)
- `.planning/PROJECT.md` — constraints (taste skill required, measure-don't-guess, accessibility non-negotiable), the "We draft Spanish translations" decision
- `.planning/v1.0-MILESTONE-AUDIT.md` — the source of every audit-debt item folded in (D-15..D-20)

### Performance
- `.planning/research/PITFALLS.md` §perf budget (around lines 190 and 414) — the proposed LCP/CLS/JS budget and "Lighthouse mobile run recorded" checklist item
- `scripts/measure-bundle.ts` and `scripts/bundle.ts` — eager-JS ceiling of 22,000 B and the GSAP/Lenis eager-marker checks
- `.planning/phases/07-page-transitions-smooth-scroll/07-CONTEXT.md` — Phase 7 motion/lazy-loading decisions that shape what loads eagerly

### Accessibility
- `tests/e2e/a11y.spec.ts` — the current axe sweep (sample of 3 detail slugs, V-18 motion-state cases), to extend
- `tests/e2e/helpers/projects.ts`, `helpers/motion.ts`, `helpers/contact.ts`, `helpers/navigation.ts` — page lists, `settleMotion`, `openContactForm`
- `.planning/phases/02-homepage-story/02-REVIEW.md` §WR-01, §WR-02, §WR-03 — marquee defects
- `.planning/phases/01-bilingual-walking-skeleton/01-REVIEW.md` §WR-02 (skip link), §WR-03 (es 404 status)
- `.planning/phases/06-scroll-interaction-motion/06-CONTEXT.md` — three motion states (D-14..D-18)

### Spanish copy
- `src/i18n/ui.en.ts`, `src/i18n/ui.es.ts` — UI dictionaries with TODO(martina) section markers
- `src/data/*.json`, `src/data/project-overrides.json`, `src/data/site.ts`, `src/content.config.ts` — localized content and the non-copy TODO(martina) items
- `.planning/phases/05-contact/05-CONTEXT.md` D-16..D-18 — Spanish-only email copy

### Design gate
- The `taste-skill:taste-skill` skill (`lint.mjs`, `inspect.mjs`), required by PROJECT.md for visual checks

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tests/e2e/a11y.spec.ts` already has the AxeBuilder WCAG 2.2 AA tag set, `settleMotion`, and motion-state cases, so it can be generalized to every route and state.
- `expectedDetails(locale)` / `expectedProjects` in `tests/e2e/helpers/projects.ts` resolve visible projects from the snapshot plus overrides, which makes them the source for the every-page list.
- `pnpm measure:bundle` reports per-page eager and lazy JS with gzip. Reuse its output in the Lighthouse report.
- There are 35 existing e2e specs, including `contact-*`, `nav-feedback`, `transitions`, `anchors` and `not-found`, so the keyboard journeys can reuse their helpers.

### Established Patterns
- Motion states are set through `html[data-motion]` = `on|reduced|off`. The toggle persists in localStorage, and the OS reduced-motion setting maps to `reduced`.
- Dictionaries use `satisfies`, so a missing ES key fails type-check (I18N-05). The review-list generator can rely on key parity.
- JSON content can't hold comments, so the TODO(martina) note for data lives in `src/content.config.ts`.

### Integration Points
- `ServiceCard.astro` / `ServiceIcon.astro`, the services schema in `src/content.config.ts`, and `src/data/services.json` (D-15).
- The marquee component from Phase 2 (roles band) (D-10..D-12).
- The skip link in the base layout or header (D-18).
- `src/pages/es/404.astro` plus Cloudflare adapter routing (D-17).

</code_context>

<specifics>
## Specific Ideas

- The Lighthouse runs are a one-off measurement with recorded evidence, not a CI gate. The user explicitly declined a committed script.
- The heaviest detail page must be justified by measured weight.
- The marquee stays invisible-but-accessible. Do not reopen that design decision.

</specifics>

<deferred>
## Deferred Ideas

- A deployed (Cloudflare Workers preview) Lighthouse run, for when DEPLOY lands in v2.
- A VoiceOver/screen-reader manual pass, not required for v1.
- Visual taste fixes from the D-20 report, for the user to triage after this phase.

</deferred>

---

*Phase: 08-quality-verification*
*Context gathered: 2026-11-06*
