---
phase: 07
slug: page-transitions-smooth-scroll
status: verified
threats_open: 0
asvs_level: 1
created: 2026-11-06
---

# Phase 07 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Threat IDs are reused across plans, so every threat is keyed `{plan}/{id}` (e.g. `07-08/T-07-21` vs `07-11/T-07-21`).

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| URL fragment / search -> DOM | `location.hash`, link `href` hashes and `?service=` come from shareable links (attacker-controllable). They are used for element lookup, focus and chip preselect | Untrusted text, low sensitivity |
| Router-fetched document -> live DOM | ClientRouter parses the same-origin prerendered HTML and swaps it in. Our before-swap hooks write into `newDocument` | Same-origin static HTML |
| Build-time data -> build | `src/data/project-overrides.json` (`stackMotion`) feeds the build | Repo-controlled config |
| npm registry -> bundle | New runtime dependency `lenis@1.3.27` | Third-party code |
| Lazy chunk -> client | Contact controller, Lenis and GSAP chunks are loaded on demand | Same-origin JS. Boot imports only the public Turnstile site key |
| Browser -> contact Action (unchanged in phase 7) | Turnstile token, honeypot and form fields go to the server, which runs siteverify | PII (name, email, message) |

---

## Threat Register

Evidence was verified on 2026-11-06 by reading the code and running the targeted unit suites: `pnpm vitest run` on nav-focus, service-preselect, contact-service-param, motion-navigation, lifecycle, motion-cursor, smooth-scroll, contact-form-loader, projects-overrides, motion-tokens and measure-bundle gave **11 files, 284 tests passed**. E2E specs were confirmed to exist and to assert the stated property. They were not re-run in this audit; their green status comes from 07-VALIDATION.md.

| Threat ID | Category | Component | Disposition | Mitigation / Evidence | Status |
|-----------|----------|-----------|-------------|------------|--------|
| 07-01/T-07-01 | Tampering | nav-focus pickFocusTarget | mitigate | `src/lib/motion/nav-focus.ts:19-31`: decodeURIComponent is in a try/catch, the lookup uses `getElementById` and `instanceof HTMLElement`, and `querySelector(hash)` is never called. Unit test `'#a,body'` is at `tests/unit/nav-focus.test.ts:60-63` | closed |
| 07-01/T-07-02 | Tampering | navigation.ts before-swap | mitigate | `navigation.ts:186` writes the constant `'out'`, `:205` writes a boolean string and `:212` writes `''`. `:198-201` copies the live `data-motion`, which only `gate.ts:38` writes, from a narrowed `MotionState`. No URL text is written. Note: `carryMotionState` does not re-narrow with `currentMotionState`. It relies on the gate being the only writer | closed |
| 07-01/T-07-03 | Spoofing | ClientRouter fetch | accept | See the Accepted Risks Log, AR-07-01 | closed |
| 07-01/T-07-04 | DoS | contact form under router | mitigate | e2e `tests/e2e/transitions.spec.ts:180` "Home -> Projects -> Home keeps the contact form Turnstile working @network". `preventDefault` is at `src/lib/ui/contact-form.ts:439,512` | closed |
| 07-02/T-07-05 | DoS (a11y) | wipe panel | mitigate | Markup is `src/layouts/BaseLayout.astro:60` with `aria-hidden="true"`. `global.css:213-219` sets `pointer-events: none` and parks the panel at `translate: 0 -100%`. `:220-222` names it only under `data-motion='on'`. `:361-366` makes reduced a root crossfade only. `:386-388` sets print `opacity: 0 !important` | closed |
| 07-02/T-07-06 | Tampering | `data-wipe` attribute | accept | AR-07-02 | closed |
| 07-03/T-07-07 | InfoDisc | persisted cursor pill | mitigate | `src/lib/motion/cursor.ts:39-43` reads the template label from the arriving doc, and `:147-156` re-syncs it on every `astro:before-swap`. Unit tests are at `tests/unit/motion-cursor.test.ts:423,438` | closed |
| 07-03/T-07-08 | Tampering | label copy | mitigate | `cursor.ts:152-153` uses only `pill.textContent = label`. No `innerHTML` exists anywhere in `src/` (grep returned 0) | closed |
| 07-03/T-07-09 | DoS | listener leaks | mitigate | `CursorFollower.astro:56` sets `data-astro-transition-persist`, and the app-scope script at `:60-67` mounts once. The CDP leak test at `tests/e2e/navigation-leaks.spec.ts:150-200` does 12 counted navigations and asserts that per-URL listener and animation counts are equal | closed |
| 07-04/T-07-10 | DoS | release gate | mitigate | `navigation.ts:52` sets `RELEASE_CAP_MS = 1200` and `:229` arms the cap timer. The CSS failsafe is at `global.css:166-173` (1500 ms). Unit tests at `tests/unit/motion-navigation.test.ts:233,257` cover the case where neither `ready` nor `finished` settles | closed |
| 07-04/T-07-11 | DoS | bindToAstro stale mount | mitigate | `src/lib/motion/lifecycle.ts:82-96` holds the navToken guard. Unit test `tests/unit/lifecycle.test.ts:187` checks that a stale release never mounts | closed |
| 07-04/T-07-12 | DoS (vestibular) | rapid navigation | mitigate | `navigation.ts:61-62,177-185` applies `WIPE_LIMIT`/`WIPE_WINDOW_MS` and calls skipTransition. e2e `transitions.spec.ts:620-665` asserts `toBeLessThanOrEqual(3)` | closed |
| 07-05/T-07-SC | Tampering (supply chain) | `pnpm add lenis` | mitigate | `package.json:32` pins `"lenis": "1.3.27"` exactly. `pnpm-lock.yaml:1929,4752` is tracked and was committed in cf3c8d8. `node_modules/lenis/package.json` has no pre/install/postinstall scripts. User approval is recorded in 07-05-SUMMARY:55 | closed |
| 07-05/T-07-13 | DoS (scroll trap) | Lenis over embeds | mitigate | `src/styles/smooth-scroll.css:26-28` sets `.lenis.lenis-smooth iframe { pointer-events: none }`. `smooth-scroll.ts:22` has `syncTouch: false`. Keyboard and find e2e are at `smooth-scroll.spec.ts:136,168`. The manual Figma wheel UAT was approved (07-17-SUMMARY:107) | closed |
| 07-05/T-07-14 | DoS (a11y) | Lenis reduced/off/forced | mitigate | `smooth-scroll.ts:45-50` gates on fine pointer, `!forced` and `'on'`. `:69,84-85` destroys on change. Unit tests are at `smooth-scroll.test.ts:129,145,158`. e2e at `smooth-scroll.spec.ts:183,269-299` | closed |
| 07-06/T-07-15 | Tampering | morph wrapper | mitigate | `navigation.ts:97-107`: nodes move via `append(...nodes)`, the name is the constant `MORPH_NAME` (`:86`), and `:301` uses `getElementById('project-title')`. Grep found 0 `innerHTML` in `src/` | closed |
| 07-06/T-07-16 | DoS | duplicate VT names | mitigate | `navigation.ts:276` clears at the next before-preparation and `:262-267,307-316` clears on finish. Only the clicked card title link is named (`:279-283`). e2e zero-at-rest checks are at `transitions.spec.ts:751,780` and `navigation-leaks.spec.ts:123` | closed |
| 07-07/T-07-17 | Tampering | anchor hook hash lookup | mitigate | `nav-focus.ts:237` uses `hashTarget()` (same guarded lookup as T-07-01). Selector-like payload unit test is at `nav-focus.test.ts:466-482` | closed |
| 07-07/T-07-18 | Tampering | `?service=` | mitigate | `nav-focus.ts:247` calls `applyServicePreselect` (`service-preselect.ts:11-16`), which goes to `parseServiceParam` (`service-param.ts:9-14`, allow-list). Injection unit tests are at `service-preselect.test.ts:109` and `nav-focus.test.ts:549` | closed |
| 07-07/T-07-19 | Spoofing | history manipulation | mitigate | `nav-focus.ts:236` requires the same origin and pathname. `:252` calls `replaceState(view.history.state, …)`. Grep for `pushState` in `src/` returned 0. The unit test spies `pushState` not called (`nav-focus.test.ts:519-536`) | closed |
| 07-07/T-07-20 | DoS (focus loss) | focus wait | mitigate | `nav-focus.ts:79-105` waits for `scrollend` or a bounded 1200 ms timer or 2 rAF, and every listener sits on a local AbortController. Unit test `nav-focus.test.ts:284` covers the 1200 ms fallback | closed |
| 07-08/T-07-21 | DoS (vestibular) | parallax | mitigate | `global.css:491-494,547-555` sets `--px-travel: 3.5%`, so total travel is 7% (<8%). `:508-526` gates it on `[data-motion='on']` and `@supports`. Print resets at `:389-395`. e2e checks `translate: none` at `parallax.spec.ts:164,310+` | closed |
| 07-08/T-07-22 | DoS (layout) | overscan | mitigate | Frames use `overflow-clip` (`ProjectCard.astro:61`, `NextProjectTeaser.astro:64`). Overscan exists only inside the 'on' block (`global.css:517-526`). e2e at `parallax.spec.ts:271-302` covers equal heights and no horizontal overflow | closed |
| 07-09/T-07-23 | Tampering | overrides `stackMotion` | mitigate | `src/lib/projects/overrides-schema.ts:16,31` uses `strictObject` and `literal(false)` or digit-string ids. `projects.ts:46-55` checks unknown ids and is called at `:106`. Unit tests are at `projects-overrides.test.ts:108-128` | closed |
| 07-09/T-07-24 | Tampering | inline aspect-ratio | accept | AR-07-03 | closed |
| 07-09/T-07-25 | DoS (vestibular) | stack side entrance | mitigate | `global.css:569-586` sets 7% one-way travel ending at `0 0`. `:529-538` gates it on 'on' and `@supports`. Print resets at `:397-400`. e2e at `stack-entrance.spec.ts:148,361,368,390` and `motion-tokens.test.ts:118-161` | closed |
| 07-09/T-07-26 | DoS (layout) | horizontal translate | mitigate | `StackFrame.astro:17` uses `overflow-clip`. e2e at `stack-entrance.spec.ts:305,322-333` checks equal stack height and `scrollWidth <= clientWidth` at 390 and 1440 | closed |
| 07-10/T-07-25 | Repudiation | phase evidence | mitigate | 07-VALIDATION.md rows 44-85 each name the exact command and result. UAT notes are recorded verbatim (07-17-SUMMARY:107) | closed |
| 07-10/T-07-26 | InfoDisc | screenshots | accept | AR-07-04. `.gitignore:37` contains `.taste-skill/`, verified with `git check-ignore` | closed |
| 07-10/T-07-27 | EoP | phase-wide code changes | mitigate | `/security-review` ran 2026-11-06 over `git diff 612645a..ff5bf7c` (code only: `.planning/`, `tests/`, `*.md`, lockfile excluded; 58 files, +2624/-403). **No findings.** See Security Review Record | closed |
| 07-11/T-07-21 | Tampering | focusWithFallback/ensureFocusable | mitigate | `nav-focus.ts:57-66`: the primary comes only from `hashTarget`/`pickFocusTarget`. `:48-50` writes only the constant `'-1'`. Unit tests are at `nav-focus.test.ts:610-649` | closed |
| 07-11/T-07-22 | Spoofing | replaceState service branch | mitigate | `nav-focus.ts:250-252` builds `new URL(here.href)`, replaces only the hash and passes `history.state` through. `pushState` grep returned 0. Unit tests are at `nav-focus.test.ts:519-536,564-589` | closed |
| 07-11/T-07-23 | DoS (lost input/focus) | same-page desync | mitigate | Search is never rewritten (`nav-focus.ts:250-252`). The navToken check is at `:283-298`. Cancel on popstate and before-preparation is at `:155-168,265-266`. The fallback chain is at `:57-66`. Unit tests are at `nav-focus.test.ts:118,413,436,564`, and e2e at `anchors.spec.ts:127,319` | closed |
| 07-11/T-07-24 | Tampering | `?service=` value | accept | AR-07-05 | closed |
| 07-12/T-07-25 | Tampering (gate bypass) | route discovery | mitigate | `scripts/measure-bundle.ts:19` holds `REQUIRED_ROUTES`. `:88` fails on an empty page list and `:91-92` on a missing route. `:140-142` exits with 1 | closed |
| 07-12/T-07-26 | InfoDisc | script output | accept | AR-07-06 | closed |
| 07-13/T-07-27 | Tampering | unwrap #project-title | mitigate | `navigation.ts:110-112` calls `span.replaceWith(...span.childNodes)`. `:314` has the `isConnected` guard | closed |
| 07-13/T-07-28 | DoS (vestibular) | shorter wipe | mitigate | `navigation.ts:61-62` keeps `WIPE_LIMIT = 3` and `WIPE_WINDOW_MS = 1100`. The flash-limit e2e is at `transitions.spec.ts:620` | closed |
| 07-13/T-07-29 | InfoDisc | captures | accept | AR-07-07 | closed |
| 07-14/T-07-30 | Tampering | stackMotion ids | mitigate | `projects.ts:46-55` checks against `imageIds`, and `snapshot-schema.ts:101-107` includes collection image ids. Cells use the same `optedOut` set (`detail-view-site.ts:51,92`) | closed |
| 07-14/T-07-31 | DoS (vestibular/jank) | grid drift | mitigate | `global.css:503-506` sets travel 1.3% (≤2.6% total), CSS only, 'on' only under `@supports`. e2e `collection-motion.spec.ts:216,225,235,245` checks reduced, off and print. The leak spec visits `website-instablogs` (`navigation-leaks.spec.ts:12`) | closed |
| 07-14/T-07-32 | InfoDisc | none | accept | AR-07-08 | closed |
| 07-15/T-07-33 | Spoofing (spam) | lazy controller | mitigate | Server unchanged since phase 05 (last commits f108f95, 9e70b65). `submit.ts:42` has the honeypot and `:46-50` runs siteverify. The client renders the widget (`contact-form.ts:256`) and blocks submit without a token (`:445-446`) | closed |
| 07-15/T-07-34 | DoS (no contact) | chunk load failure | mitigate | `contact-form-loader.ts:98-106` logs on rejection and hides nothing. The block is hidden only by the mounted controller. Unit test is at `contact-form-loader.test.ts:255,278` | closed |
| 07-15/T-07-35 | Tampering | `?service=` trigger | accept | AR-07-09. `contact-form-loader.ts:138` reads `has('service')` only | closed |
| 07-15/T-07-43 | DoS (missing affordance) | cursor/tooltip deferral | mitigate | Not applicable as built. The conditional Task 3 was not executed (07-15-SUMMARY:68), and cursor-loader and tooltips-loader do not exist. Remaining properties hold: `src/` contains no `cursor: none`, and the ToolsRow tooltips were replaced by visible text (`ToolsRow.astro:5-8`) | closed |
| 07-15/T-07-36 | InfoDisc | boot chunk | mitigate | `src/lib/ui/contact-form-boot.ts:4-5` imports only `astro:actions` and `astro:env/client`. `eslint.config.js:55-78` restricts `astro/zod` and `astro:env/server` in `src/lib/ui/**` | closed |
| 07-16/T-07-37 | Tampering | markPressed | mitigate | `navigation.ts:334-343` calls `setAttribute('data-nav-pressed', '')` on `closest('a')` only | closed |
| 07-16/T-07-38 | DoS (stuck UI) | pressed marker | mitigate | `navigation.ts:335` clears on the next before-preparation and `:349` on before-swap. `:65,342` sets the 3000 ms timer. `:358-361` clears on unbind. Unit tests are at `motion-navigation.test.ts:761,781`, and e2e at `nav-feedback.spec.ts:86,122,223` | closed |
| 07-16/T-07-39 | Spoofing/exposure | test gzip proxy | accept | AR-07-10 | closed |
| 07-17/T-07-40 | InfoDisc | build output | mitigate | `package.json:22`: `verify` ends with `pnpm check:secrets` (`scripts/check-secrets.ts` scans dist for tracked secret files and local secret values). The 07-21 run recorded "secrets ok (1,018 files)" | closed |
| 07-17/T-07-41 | Tampering (gate bypass) | bundle ceiling | mitigate | `measure-bundle.ts:30` has `EAGER_CEILING_GZIP = 22_000`. `git log -S` shows one introduction (6ec3ddd) and no change since | closed |
| 07-17/T-07-42 | Repudiation | phase commits | mitigate | Commit-list review evidenced (07-17-SUMMARY:107, "approved", 100 commits 8151deb~1..f108903). `/security-review` ran 2026-11-06 over `git diff 612645a..ff5bf7c` (code only: `.planning/`, `tests/`, `*.md`, lockfile excluded; 58 files, +2624/-403). **No findings.** See Security Review Record | closed |
| 07-18/T-07-40 | Spoofing/Tampering (UI redress) | invisible form under no-JS block | mitigate | `global.css:712-719` sets `visibility: hidden` on the pre-mount form, and `:707-710` gives the no-JS block `z-index: 1` | closed |
| 07-18/T-07-41 | DoS (contact availability) | no-JS fallback | mitigate | `global.css:702-703` gates on `@media (scripting: enabled)` and `[data-contact-nojs]:not([hidden])`. No-JS e2e is at `contact-lazy.spec.ts:250-259` | closed |
| 07-18/T-07-42 | InfoDisc | hidden form pre-mount | accept | AR-07-11 | closed |
| 07-18/T-07-43 | Tampering (supply chain) | dependencies | accept | AR-07-12 | closed |
| 07-19/T-07-44 | DoS (contact availability) | deferred mount | mitigate | `contact-form-loader.ts:7` sets `PRESS_CAP_MS = 1000` and `:93` arms it. A failed load leaves the mailto visible (`:98-106`). Unit tests are at `contact-form-loader.test.ts:255,331` | closed |
| 07-19/T-07-45 | Tampering (misdirected click) | mount during click | mitigate | `contact-form-loader.ts:122-128` flushes the mount in a 0 ms task after `pointerup`/`pointercancel`. Unit test is at `contact-form-loader.test.ts:304` | closed |
| 07-19/T-07-46 | DoS (leak) | listeners/timer | mitigate | A separate `press` AbortController (`contact-form-loader.ts:43`) is aborted on mount (`:66`), on final failure (`:104`) and on cleanup (`:156`). The timer is cleared at `:157`. Unit tests are at `contact-form-loader.test.ts:364,377` | closed |
| 07-19/T-07-47 | Tampering (supply chain) | dependencies | accept | AR-07-13 | closed |
| 07-20/T-07-48 | DoS (leak) | scroll listener | mitigate | `nav-focus.ts:202` uses `{ once: true, signal: entry.ac.signal }`. The signal is aborted on landing (`:208`) and on cancel (`:165`). Coverage note: the navigation-leaks e2e only does cross-page soft navigations, not same-page anchors, so the claimed e2e coverage does not exercise this listener. The unit tests at `nav-focus.test.ts:295-330` do | closed |
| 07-20/T-07-49 | Tampering | hash text | accept | AR-07-14. Confirmed: `nav-focus.ts:159` uses `hashTarget` (getElementById) | closed |
| 07-20/T-07-50 | Tampering (supply chain) | dependencies | accept | AR-07-15 | closed |
| 07-21/T-07-51 | InfoDisc | validation docs | mitigate | `check:secrets` is in `verify` (`package.json:22`). Regex scan of the phase dir (Resend `re_`, Turnstile `0x4AAA`, `sk_`, PEM, AKIA, `KEY=value`) found 0 hits. The `.dev.vars` values checked against the phase dir found 0 hits (counts only, values not printed) | closed |
| 07-21/T-07-52 | Repudiation (false green) | gate evidence | mitigate | 07-VALIDATION.md:85 and 07-21-SUMMARY:53-55 name the command and the run for each result. `@network` was marked green only on run 3, where every `@network` test executed. Row 75/78 marks the IPv6-blocked runs ⚠️ (not green) and records the user decision (C) | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-07-01 | 07-01/T-07-03 | The ClientRouter only soft-navigates same-origin URLs and falls back to a full load cross-origin. All pages are static | Plan 07-01 threat model (user-approved plan) | 2026-11-06 |
| AR-07-02 | 07-02/T-07-06 | `data-wipe` is a constant (`'out'`) written by our own code, with no external input (`navigation.ts:186`) | Plan 07-02 | 2026-11-06 |
| AR-07-03 | 07-09/T-07-24 | Inline `aspect-ratio` values are build-time image metadata integers, not user input. No CSP restricts inline styles | Plan 07-09 | 2026-11-06 |
| AR-07-04 | 07-10/T-07-26 | Taste-skill screenshots stay in the gitignored `.taste-skill/` (`.gitignore:37`) and contain only public site content | Plan 07-10 | 2026-11-06 |
| AR-07-05 | 07-11/T-07-24 | `?service=` path unchanged. It is still allow-listed by `applyServicePreselect` -> `parseServiceParam` (07-07/T-07-18) | Plan 07-11 | 2026-11-06 |
| AR-07-06 | 07-12/T-07-26 | measure-bundle prints only file paths and sizes of public build assets | Plan 07-12 | 2026-11-06 |
| AR-07-07 | 07-13/T-07-29 | Captures are local test artefacts of public pages | Plan 07-13 | 2026-11-06 |
| AR-07-08 | 07-14/T-07-32 | Static public images only, no new data flows | Plan 07-14 | 2026-11-06 |
| AR-07-09 | 07-15/T-07-35 | The loader reads only `has('service')` for timing. The value is handled by the 07-07 allow-list | Plan 07-15 | 2026-11-06 |
| AR-07-10 | 07-16/T-07-39 | The test gzip proxy binds to localhost in the test process only, is closed in afterAll and never ships | Plan 07-16 | 2026-11-06 |
| AR-07-11 | 07-18/T-07-42 | The hidden pre-mount form is static, non-sensitive markup already in the HTML. `visibility: hidden` keeps it out of the a11y tree | Plan 07-18 | 2026-11-06 |
| AR-07-12 | 07-18/T-07-43 | No package added | Plan 07-18 | 2026-11-06 |
| AR-07-13 | 07-19/T-07-47 | No package added | Plan 07-19 | 2026-11-06 |
| AR-07-14 | 07-20/T-07-49 | Hash text is unchanged and looked up with getElementById only. No selector is built from the hash | Plan 07-20 | 2026-11-06 |
| AR-07-15 | 07-20/T-07-50 | No package added | Plan 07-20 | 2026-11-06 |

*Accepted risks do not resurface in future audit runs.*

---

## Open Items

None. 07-10/T-07-27 and 07-17/T-07-42 were closed on 2026-11-06 by the `/security-review` run recorded below.

## Security Review Record

- **Date:** 2026-11-06
- **Scope:** `git diff 612645a..ff5bf7c -- . ':!.planning/' ':!tests/' ':!*.md' ':!pnpm-lock.yaml'` (58 files, +2624/-403). 612645a is the parent of the first phase-7 commit. The default origin/main diff was empty because HEAD equals origin/main.
- **Result:** no HIGH or MEDIUM findings, so no candidates needed false-positive filtering.
- **Flows traced:** `location.hash` → `hashTarget` (getElementById only); the same-page anchor handler (same-origin, same-pathname, `replaceState` changes only the hash); `?service=` → `parseServiceParam` allow-list; the contact loader's hash/search checks (comparison only, static import path); `contact-form-boot.ts` (imports only `PUBLIC_TURNSTILE_SITE_KEY`); router `newDocument` writes (constants only, nodes moved and never re-parsed); the cursor label (`textContent` from a build-time template); the `stackMotion` schema and unknown-id check; new sinks (no new `set:html`/`innerHTML`/eval); `scripts/measure-bundle.ts` (local files only); new links (build-time config).
- **Note:** an earlier `/security-review` run, scoped from f4b3fb2 and reported clean, happened on 2026-11-05 according to session memory. It was never recorded in the phase docs, so this run is the evidence of record.

## Informational (not threats in the register)

- No `## Threat Flags` entry in any 07-xx SUMMARY declares new attack surface. 07-04, 07-05, 07-07, 07-08, 07-09, 07-14 and 07-21 all say "None" and map to registered IDs. **Unregistered flags: none.**
- 07-REVIEW.md WR-01 (height reserve also applies in print) and WR-02 (reserve stays on after both chunk loads fail) remain unfixed in `global.css:700-720`. They are layout and UX issues: the mailto block stays visible and on top in both cases, so 07-18/T-07-41 and 07-19/T-07-44 still hold.
- 07-20/T-07-48: the claimed e2e coverage (navigation-leaks) does not exercise same-page anchors. Unit coverage exists.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-06 | 66 (51 mitigate, 15 accept) | 64 | 2 | gsd-security-auditor (State B, first audit) |
| 2026-11-06 | 66 | 66 | 0 | `/security-review` (phase-scoped, no findings) closed 07-10/T-07-27 and 07-17/T-07-42 |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-06
