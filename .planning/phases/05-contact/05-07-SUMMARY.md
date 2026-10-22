---
phase: 05-contact
plan: 07
subsystem: ui
tags: [contact, services, preselect, a11y, e2e, tdd, home-08]
requires:
  - phase: 05-02
    provides: "services.ask / services.askTarget dictionary keys, Contact section #contact"
  - phase: 05-05
    provides: "ServiceChips radios (contact-service-<id>, other checked), Turnstile loads on ?service="
  - phase: 05-06
    provides: "contact form validation and failure block (unchanged here)"
provides:
  - "ServiceCard.astro: 'Ask about this' / 'Consultar' text link (props href, locale)"
  - "FeaturedServices.astro: href = getRelativeLocaleUrl(locale, '/') + ?service=<id>#contact"
  - "src/lib/contact/service-param.ts: parseServiceParam(search): ServiceChoice"
  - "src/lib/ui/service-preselect.ts: initServicePreselect(doc): Cleanup | undefined"
  - "ServiceChips.astro script: lifecycle.register(initServicePreselect)"
affects: [05-08]
tech-stack:
  added: []
  patterns:
    - "URL query allow-listed through isServiceChoice; only an existing radio id can be picked"
    - "Accessible name carried by one sr-only span with the visible label aria-hidden (avoids Chromium's space before absolutely positioned fragments)"
key-files:
  created:
    - src/lib/contact/service-param.ts
    - src/lib/ui/service-preselect.ts
    - tests/unit/contact-service-param.test.ts
    - tests/unit/service-preselect.test.ts
    - tests/e2e/contact-preselect.spec.ts
  modified:
    - src/components/ui/ServiceCard.astro
    - src/components/sections/FeaturedServices.astro
    - src/components/contact/ServiceChips.astro
    - tests/unit/featured-services.test.ts
    - tests/e2e/a11y.spec.ts
    - tests/e2e/home-story.spec.ts
key-decisions:
  - "Card link markup: <span aria-hidden>{ask}</span><span class=sr-only>{ask}{askTarget}</span>, because the UI-SPEC form ({ask}<span sr-only>: {title}</span>) gives 'Ask about this : Branding' in Chromium"
  - "Research assumption A2 held: fragment navigation to #contact moves the sequential focus start point, so the next Tab enters the section. The tabindex/focus fallback was NOT applied; ContactSection.astro is unchanged and service-preselect.ts has no focus() call"
  - "The pre-select e2e aborts challenges.cloudflare.com requests, so it stays hermetic and carries no @network tag"
requirements-completed: [HOME-08]
duration: about 9 h wall clock, mostly slow lint/test runs under host load
completed: 2026-10-22
---

# Phase 5 Plan 07: Service card "Ask about this" pre-selection Summary

**Every service card now ends with an "Ask about this" / "Consultar" text link to `/?service=<id>#contact` (`/es/…` in Spanish). Its accessible name is "Ask about this: Branding". Following the link opens Home's Contact section with that service's chip checked, and focus is not moved. Unknown, empty or repeated `?service=` values leave "Not sure yet / Something else" checked.**

## Accomplishments

- **ServiceCard.astro**:
  - New props `href` and `locale`.
  - The last child is `<p class="mt-auto">` with the link. The link uses the LatestWork text-link classes verbatim and ends with an aria-hidden `IconArrowRight`.
  - The `<li>` root classes are unchanged, and only the link carries `hover:`.
  - The header comment now says only the explicit link is interactive (D-05).
- **FeaturedServices.astro** builds the href from `getRelativeLocaleUrl(locale, '/')` plus `?service=${service.id}#contact` (D-08). Because the link points at Home, it works from any page.
- **parseServiceParam**:
  - Reads `URLSearchParams(search).getAll('service')`.
  - Exactly one value that `isServiceChoice` accepts is returned; anything else gives `'other'`.
  - The search string works with or without the leading `?`.
- **initServicePreselect**:
  - Returns undefined when there are no service radios.
  - Otherwise it sets `checked` on `#contact-service-<choice>` (native grouping unchecks the rest) and returns undefined, since it adds no listeners.
  - It never calls focus.
  - ServiceChips registers it through `lifecycle.register(initServicePreselect)`.
- **Keyboard order**: a11y.spec now expects 4 card-link stops right after the marquee pause button, in services.json order, for both the normal and reduced-motion runs.

## Task Commits

1. **Task 1 RED** `e9ff8d5` test(05-07): add failing service pre-select e2e. After `pnpm build`, 14 of the 20 pre-select tests failed: card links, card clicks and the next-Tab test, in EN and ES. The 6 fallback tests passed, because `other` is already checked in the HTML.
2. **Task 2 RED** `b51c63c` test(05-07): expect ask about this link on cards (4 failed / 3 passed)
3. **Task 2 GREEN** `07a89cb` feat(05-07): add ask about this link to cards
4. **Task 3 RED** `779d444` test(05-07): add failing service param tests (module did not exist)
5. **Fix** `142ae8d` fix(05-07): keep card link name without stray space
6. **Task 3 GREEN** `d9e6ac9` feat(05-07): pre-select service chip from url

## Verification (run in this worktree)

- `pnpm lint`: astro check 0 errors / 0 warnings / 0 hints; ESLint and Prettier clean.
- `pnpm test`: 56 files, 905 tests pass.
- `pnpm test:e2e`: build plus **529/529 pass** in 1.4 min. That covers every pre-select test in EN and ES, the a11y keyboard order (normal and reduced motion) and home-story.
- `playwright test tests/e2e/contact-preselect.spec.ts --list | grep -c pre-select` = 20.
- Acceptance greps:
  - `Intentionally non-interactive` 0
  - `?service=${service.id}#contact` in FeaturedServices 1 (`grep -F`)
  - `class="mt-auto"` 1
  - `lifecycle.register(initServicePreselect)` 1
  - `focus(` in service-preselect.ts 0
- **Assumption A2: held.** "pre-select: next Tab enters the section" passes in EN and ES without the fallback.

## Taste

The `taste-skill:taste-skill` skill cannot be invoked as a skill from this executor, so I ran its `lint.mjs` directly on `src/components src/pages`:
```
FAIL [hairline] src/components/global/SiteHeader.astro:30  border-b
WARN [outlined-box] src/components/sections/ToolsRow.astro:21  border
RESULT: 1 FAIL, 1 WARN
```
Both findings were there before this plan and were accepted earlier (03-05, 04-11, 04-12, 05-02, 05-05). ServiceCard.astro and ServiceChips.astro have no findings.

I took element screenshots under reduced motion: services at 1440/390 and the chips on `/?service=branding#contact` at 1440/390, in EN and ES. They are in the session scratchpad and not committed.
- The links sit at the bottom of each card (`mt-auto`) and line up across the 4-column row.
- The checked Branding chip is the one ink-filled shape in the fieldset.
- In the 390 element screenshot the sticky header overlays the first card. That comes from Playwright stitching a tall element screenshot, not from the layout.
- The full `inspect.mjs` run and the state screenshots are scheduled for 05-08.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The card link's accessible name had a stray space**
- **Found during:** Task 3 e2e run
- **Issue:** The UI-SPEC markup `{ask}<span class="sr-only">: {title}</span>` gives the name "Ask about this : Graphic design" in Chromium. An absolutely positioned (sr-only) fragment is treated as a block when the name is computed, so a space is inserted before it. I confirmed this with a scratch Chromium probe: the inline, inline-flex and wrapped variants all gave the space.
- **Fix:** `<span aria-hidden="true">{ask}</span><span class="sr-only">{ask}{interpolate(askTarget, { title })}</span>`. The name is exactly "Ask about this: Branding". It still starts with the visible label (WCAG 2.5.3), and what is displayed is unchanged. The unit tests now assert the new structure.
- **Files:** src/components/ui/ServiceCard.astro, tests/unit/featured-services.test.ts
- **Commit:** 142ae8d

**2. [Rule 1 - Bug] home-story e2e still expected a non-interactive services section**
- **Issue:** `tests/e2e/home-story.spec.ts` asserted that the services section has 0 links (a Phase 2 contract that HOME-08 replaces). The file is not in the plan's list.
- **Fix:** It now expects 4 links, with a comment.
- **Commit:** 142ae8d

**3. [Rule 3 - Blocking] Unit tests drive the URL through history.replaceState**
- **Issue:** `window.happyDOM.setURL` failed astro check (ts2339). The import-boundary source test matched the word "zod" in the doc comment.
- **Fix:** The tests use `history.replaceState`. The source tests now assert the exact import list (`./fields`; `../motion/lifecycle` and `../contact/service-param`) and that the source has no `focus(` call.
- **Commit:** d9e6ac9

### Other notes

- I reset the worktree base to `ac255ed` with `git reset --hard`, as the orchestrator's branch check requires. The worktree was clean.
- `.dev.vars` was copied with `CONTACT_TO` left blank.
- ContactSection.astro is unchanged because the A2 fallback was not needed.
- No commit carries co-author or Claude attribution, per project CLAUDE.md.

## Known Stubs

None added. The 05-02 copy stubs (`TODO(martina)` strings, placeholder `site.email`) remain, as before.

## Threat Flags

None beyond the plan's threat model:
- T-05-31: `?service=` is allow-listed by `isServiceChoice` and only used to pick an existing radio id. It never reaches the DOM as text, and unit tests cover `?service=%3Cscript%3E`.
- T-05-32: still the 05-04 server `catch('other')`.

## TDD Gate Compliance

- Task 1 RED `e9ff8d5`; GREEN came in `07a89cb` + `142ae8d` + `d9e6ac9`.
- Task 2 RED `b51c63c`, then GREEN `07a89cb`.
- Task 3 RED `779d444`, then GREEN `d9e6ac9`.
- There are no refactor commits.

## Self-Check: PASSED

- FOUND: src/lib/contact/service-param.ts, src/lib/ui/service-preselect.ts, tests/unit/contact-service-param.test.ts, tests/unit/service-preselect.test.ts, tests/e2e/contact-preselect.spec.ts
- FOUND commits: e9ff8d5, b51c63c, 07a89cb, 779d444, 142ae8d, d9e6ac9
