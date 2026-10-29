---
phase: 05-contact
plan: 08
subsystem: contact
tags: [contact, e2e, taste, measurements, phase-gate]
requires:
  - phase: 05-01..05-07
    provides: "adapter, secrets gate, contact section, mailers, Action, JS form, validation/failure, pre-select"
provides:
  - "tests/e2e/contact-states.spec.ts: every contact state in EN/ES at 1440 and 390, screenshots, 320px overflow, h2 lines, single accent fill"
  - "Filled 05-VALIDATION.md per-task map"
affects: [phase-05 sign-off]
tech-stack:
  added: []
  patterns:
    - "State-gate spec: screenshot + layout contract re-checked in every state"
key-files:
  created:
    - tests/e2e/contact-states.spec.ts
  modified:
    - src/components/contact/ContactForm.astro
    - .planning/phases/05-contact/05-VALIDATION.md
key-decisions:
  - "Success body uses Tailwind `wrap-anywhere` (overflow-wrap: anywhere) instead of `break-words`; only `anywhere` shrinks min-content, so a long unbroken name no longer widens the grid at 320px"
  - "The sending-state request is held by a gate released after the checks (3 s fallback) instead of a fixed 3 s delay, so the screenshot and layout checks always run while pending"
  - "nyquist_compliant stays false until the 05-08-02 sign-off row is green"
requirements-completed: []
duration: about 45 min
completed: 2026-10-28
---

# Phase 5 Plan 08: Phase gate (states, measurements, taste) Summary

**Task 1 is done. A new state spec drives the Contact section through initial, pre-selected, validation, sending, failure, success and no-JS states in EN and ES at 1440 and 390. In each state it saves a screenshot and checks: no overflow at 320, the h2 in 2 lines or fewer at 320/390/768/1440, and the submit as the only accent fill. It found one real bug, which is fixed: a 100-character name in the success panel widened the page to 670px at 320. The full gate is green. Task 2 (user sign-off) was approved on 2026-10-28.**

## Task Commits

1. `2ef2f09` fix(05-08): wrap long names in success panel
2. `e98d272` test(05-08): add contact state coverage spec
3. docs commit with this SUMMARY and 05-VALIDATION.md (see git log)

Task 2 (checkpoint:human-verify) has not run. The user's verdict is still to be appended.

## Gate results (2026-10-22, main working tree)

| Gate | Result |
|---|---|
| `pnpm lint` | astro check 0 errors / 0 warnings / 0 hints; ESLint clean; Prettier clean |
| `pnpm test` | 56 files, **905/905** pass |
| `pnpm test:e2e` (in `pnpm verify`) | build + **559/559** pass, all `@network` tests included, **no flakes this run** |
| `pnpm check:secrets` | `secrets check ok (1005 dist files scanned)` |
| `pnpm build:offline` | `offline build ok (0 network attempts, 78 text files scanned, 20 html)`, first attempt (1 attempt) |
| `contact-states.spec.ts` alone | 30/30 pass; `.taste-skill/contact-states/` holds **30 PNGs** (28 state shots + 2 long-name shots at 320) |

## Measurements

### Home module scripts (`dist/client/index.html` and `dist/client/es/index.html` are identical)

| Script | Raw B | Gzip B | 05-05 gzip |
|---|---|---|---|
| `BaseLayout…DXAl1XW_.js` | 29 | 109 | 109 |
| `RolesMarquee…C_1bRBzR.js` | 453 | 355 | 355 |
| `ToolsRow…CxashT3e.js` | 1,002 | 506 | 506 |
| `ServiceChips…EJNYJ192.js` (new in 05-07) | 441 | 391 | — |
| `ContactForm…bKkQcquN.js` | 16,998 | 6,616 | 5,222 |
| **Entry total** | 18,923 | **7,977** | 6,192 |
| Shared chunk `motion.fiA7hLNr.js` | 1,176 | 551 | 551 |
| Shared chunk `fields.DkLWqSTB.js` (new) | 338 | 262 | — |
| **Entries + chunks** | | **8,790** | 6,743 |

The contact feature's JS cost on Home is **7,269 B gzip**: ContactForm 6,616 + ServiceChips 391 + fields 262. At 05-05 it was 5,222. The growth comes from 05-06 (validation mirror, mailto builder, failure handling) and 05-07 (pre-select). Cloudflare's `api.js` is third-party, loaded lazily and not counted.

### Turnstile requests and load timing (preview on 4321, Chromium, 1440x900)

- JS Home load at the top of the page, after 3 s idle: **0 requests** to challenges.cloudflare.com on `/` and `/es/`. After scrolling to `#contact`: 4 requests (api.js plus the widget).
- Window `load` timing:
  - Landing on `/#contact`: DCL 25 ms, load 484 ms. On `/es/#contact`: DCL 27 ms, load 527 ms.
  - At the top: about 24 ms for both.
  - So on a `#contact` landing, Turnstile's api.js delays `load` by about 0.5 s here. 05-05 measured about 1.8 s. [Inference] The difference likely comes from network and cache conditions (warm cache in this run). This is an observation, not a regression.

## Taste gate

**How it ran:** this subagent has no Skill tool, so `taste-skill:taste-skill` could not be invoked. Instead I read SKILL.md and `references/critique.md` directly and ran `lint.mjs` and `inspect.mjs` from `/Users/bmartinez/.claude/plugins/cache/taste-skill/taste-skill/2.0.0/skills/taste-skill/scripts/`.

### lint.mjs `src/components src/pages`

```
FAIL [hairline] src/components/global/SiteHeader.astro:30  border-b
WARN [outlined-box] src/components/sections/ToolsRow.astro:21  border
RESULT: 1 FAIL, 1 WARN
```

Both findings were there before this phase and are accepted (03-05, 04-11, 04-12, 05-02, 05-05). There are **no findings** in `src/components/contact/*`, `ServiceCard.astro` or `SocialLinks.astro`.

### inspect.mjs (`/` and `/es/`, preview on 4321, stopped afterwards and confirmed gone)

The codes are identical for EN and ES:
- FAIL `icon-cards` (services row, accepted)
- FAIL `still-page` (motion arrives in Phases 6–7, accepted)
- WARN `hairline` (header, accepted)
- WARN `palette-cream` (accepted)
- WARN `no-footage` (accepted)

**None** of the must-not-appear codes showed up: headline-lines, eyebrow, micro-label, shadow, gradient, outlined-box, card-rows, overflow, clipped-text, contrast, grey-body, size-count, font-count, empty-screens.

Other measurements:
- Hero: 2 lines at 1440/768/390.
- Sizes: 14/16/20/24/36/112.
- Two families.
- 3.3 screens.

Screenshots: EN in `.taste-skill/inspect-p5-en/`, ES in `.taste-skill/inspect/` (gitignored).

### Critique (critique.md shape, scoped to the Contact section)

```
ROUND 1
Seen in one second: the blue "Send message" pill under a sand form field block.
Idea (one sentence): a calm, direct "tell me about your project" form that carries the site's pill/sand system, with the services from the cards as chips.
Live thing: the form itself (chips pre-selected from a service card, live validation, named success).
Layout words by section: hero=split / marquee=band / services=grid / latest=grid / tools=row / contact=split / footer=band
Scores: design 6.5 · usability 8 · creativity 6 · content 6 → overall 6.8
Caps applied: inspect FAIL (still-page, icon-cards) → overall ≤ 6.0 on the page as a whole; still-page → design ≤ 7. Contact section on its own ≈ 6.8.
Top three problems (most visible first):
1. At 1440 the left column (heading, intro, email, Bē) ends about 200px down, while the form runs about 900px. That leaves a hole under the invitation in the initial, validation and failure states (en-1440-initial/-validation). Fix (later, motion/polish phase): make the left column sticky, or set the h2 larger so it holds the column.
2. "Not sure yet / Something else" (ES "Aún no lo sé / Otra cosa") wraps alone onto a second chip row at 1440. The default, checked chip ends up as an orphan below the four services (all 1440 shots). Fix: the shorter label already raised as UI-SPEC Open Question 2 ("Something else" / "Otra cosa"), so all five fit on one row.
3. The h2 is 36px against a 112px hero. It holds as a section heading (the Phase 3 scale), but the contact moment has no larger type. Consider this with problem 1 in the polish phase.
```

**UI-SPEC screenshot-review bullets:**

- **h2 in 2 lines or fewer at 390.** PASS. EN "Tell me about / your project" and ES "Cuéntame tu / proyecto" each take 2 lines. The e2e also asserts this at 320/390/768/1440 in every state.
- **The checked chip is the only ink-filled shape, and it is obvious on arrival from a card.** PASS. `en-390-preselected` shows Branding ink-filled with a check icon. All other chips are outlined. The other ink shape is the success panel's "Send another message" button, which appears only after the form is hidden.
- **Fields read as fields, with no boxes.** PASS. Fields have a sand fill and a 2px bottom border, and the form has no outer box.
- **The submit is the only accent fill in every state.** PASS. The e2e asserts it in every JS state (initial, preselected, validation, sending, failure). In success there is no accent at all. In no-JS the only accent is the "Email me" button, because the form is not rendered.
- **Errors carry text and an icon.** PASS. The summary has an alert icon and linked messages. Field errors have an icon and text plus a danger bottom border. The failure title has an icon.
- **The Turnstile slot doesn't jump.** PASS. The slot is reserved at `min-h-[140px] w-[150px]`. In some element screenshots the iframe hasn't painted yet (en-390-preselected, en-1440-validation), but the space is held, so nothing shifts. The red "For testing only" strip comes from Cloudflare's test sitekey and goes away with the real key (DEPLOY-02).
- **The success panel leaves no empty screen at 1440.** PASS. `en-1440-success` shows a compact sand panel beside the invitation, with no empty screen.
- **Screenshot artifact, not a layout bug.** In the 390 and 320 element screenshots taller than the viewport, the sticky header is stitched in mid-section (es-390-failure, en-320-success-long-name). This is how Playwright captures elements with a sticky header. The 320 overflow assertion and the full-page inspect sheets show no overlap.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Long unbroken name overflowed the page at 320px**
- **Found during:** Task 1 (new state spec)
- **Issue:** The success body used `break-words` (`overflow-wrap: break-word`), which does not reduce min-content width. A 100-character name stretched the grid column, and `scrollWidth` was 670 at 320 in EN and ES.
- **Fix:** Changed to `wrap-anywhere` (`overflow-wrap: anywhere`). Afterwards `scrollWidth` is ≤ 320 and the name wraps inside the panel (`en-320-success-long-name.png`).
- **Files modified:** src/components/contact/ContactForm.astro
- **Commit:** 2ef2f09

**2. [Rule 1 - Test robustness] The accent-fill check is polled**
- **Found during:** Task 1
- **Issue:** Right after the click, the submit is still fading back from its `hover:bg-accent/90` tint (150 ms colour transition). A single read missed it in the failure state.
- **Fix:** The pointer is parked at (0,0) and the check uses `expect.poll`. The assertion was not weakened: it still requires exactly `['submit']`.
- **Commit:** e98d272

**3. Sending state is held by a gate rather than a fixed 3 s delay**
- Holding the request with a gate makes sure the screenshot and layout checks run while the request is still pending. A 3 s fallback still releases the request. The test asserts `aria-disabled` before and after the checks, then the success panel.

## Known Stubs (intentional, tracked)

- All new EN/ES `contact.*` copy is `TODO(martina)`. That includes the 48-hour promise (D-11), "Ask about this" / "Consultar", and the long "Not sure yet / Something else" chip label.
- `site.email` is the placeholder `hello@martinafernandez.example`. It feeds the direct link, the no-JS block, the failure mailto and the Turnstile error note.
- `CONTACT_TO` is blank in local `.dev.vars` on purpose. `CONTACT_FROM` still needs Martina's verified sender.
- `TODO(deploy)`: the real Turnstile sitekey/secret (the test keys show "For testing only") and the Resend domain. Both are deferred to DEPLOY-02.

## Open items for the checkpoint

1. Taste problem 1: the hole under the left column at 1440 (sticky or larger invitation column). Proposed for the motion/polish phase.
2. Taste problem 2: shorten the "other" chip label so all chips fit on one row (UI-SPEC Open Question 2, Martina's copy decision).
3. Taste problem 3: the scale of the contact h2 (polish phase).
4. Accepted taste findings remain: still-page, icon-cards, hairline, palette-cream, no-footage.
5. `nyquist_compliant` in 05-VALIDATION.md should be set to `true` after sign-off.

## Sign-off

**Approved** by the user on 2026-10-28 (reply: "approved"). Task 2 is complete. The open taste items above are carried to the polish phase.

## Self-Check: PASSED

- FOUND: tests/e2e/contact-states.spec.ts
- FOUND: .planning/phases/05-contact/05-VALIDATION.md (no `_TBD by planner_` row)
- FOUND: commit 2ef2f09, commit e98d272
- FOUND: 30 PNGs in .taste-skill/contact-states/
