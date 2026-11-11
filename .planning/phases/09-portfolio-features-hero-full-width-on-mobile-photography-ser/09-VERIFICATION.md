---
phase: 09-portfolio-features-hero-full-width-on-mobile-photography-ser
verified: 2026-11-10T22:00:00Z
status: human_needed
score: 4/4 roadmap success criteria verified (SC1 LCP via accepted miss D-20)
overrides_applied: 0
re_verification: false
human_verification:
  - test: "Martina reviews the Spanish copy (Fotografia service, filter chips, status region, hero)"
    expected: "Copy approved or corrected; 08-SPANISH-REVIEW.md is regenerated and clean"
    why_human: "Native-language and brand-voice judgement"
  - test: "Measure production Home mobile LCP after deploy, with Cloudflare compression"
    expected: "Close to the Brotli-proxy 2.1-2.26 s and at or under 2,500 ms"
    why_human: "Needs a deployed site (D-20 follow-up)"
  - test: "Eyeball hero at 390px and 640px+, /projects/ chips in EN and ES"
    expected: "Full-width 4:5 arch on phones, unchanged from 640px, chips filter in place"
    why_human: "Visual quality"
---

# Phase 9 Verification

**Goal:** Phones get a full-width hero portrait, Photography appears wherever services do, and visitors can filter /projects/ by category in EN and ES, with a11y, motion and performance budgets holding.
**Final src commit:** `cc64ecd` (confirmed with `git log -1 --format=%h -- src`).
**Method:** recorded evidence (11 PLAN/SUMMARY pairs, 09-CONTEXT, 09-REVIEW, 09-LIGHTHOUSE, 09-11-SUMMARY, 09-VALIDATION) plus static code checks. Playwright, builds, preview and Lighthouse were not run by this verifier. `pnpm test`: 77 files, 1,426 tests passed. `pnpm lint`: 0 errors, 0 warnings, 3 hints, Prettier clean. No unreferenced TBD/FIXME/XXX in text source files.

## Success criteria

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | 390px full-width 4:5 arch; layout unchanged from 640px; Home LCP <= 2,500 ms | VERIFIED for layout; LCP is an ACCEPTED MISS (D-20) | `src/components/sections/Hero.astro`: `w-full`, `aspect-[4/5] sm:aspect-[3/4]`, `sm:w-44 lg:w-64` keep desktop sizing, phone-sized srcset widths `[256,448,640,768,1024]`. 09-LIGHTHOUSE.md "Re-measure (post-review fixes, cc64ecd)": Home median 2,933 ms, CLS 0, detail 2,633 ms |
| 2 | Photography (EN/ES) in Home services, contact chips, `?service=photography`, action accepts it | VERIFIED | `src/data/services.json` id `photography` ("Photography"/"Fotografia", 4 items per language); `src/lib/contact/fields.ts` `SERVICE_IDS` includes `photography` (drives the action schema and chips); `src/lib/ui/service-preselect.ts` + `service-param`; drift unit test passes |
| 3 | Category chips on /projects/ and /es/projects/, All, empty hidden, `?category=` deep-link and in-place update, polite count, kbd/RM/axe pass | VERIFIED (static + recorded e2e) | `CategoryFilter.astro` has `role="status"` region; wired in `ProjectsView.astro`; logic in `src/lib/projects/{category-param,category-prefilter,filter}.ts`, `src/lib/ui/category-filter.ts`; 09-REVIEW WR-01/WR-02 fixed (`da00585`, `cc64ecd`); 09-11 re-gate: 841 e2e passed, 117 skipped (`@network`) |
| 4 | Taste lint/inspect reviewed; lint, unit, e2e green; eager JS <= 22,000 B | VERIFIED | Lint and 1,426 unit passed here; 09-11 re-gate `pnpm verify` exit 0; `measure:bundle` max 18,015 B on `/` (D-19 accepted 18,0xx B); taste lint 0 FAIL |

## Requirements

| ID | Verdict | Evidence |
|---|---|---|
| HOME-09 | SATISFIED with accepted miss | Layout verified in code. LCP 2,933 ms against 2,500 ms is a user-accepted miss (D-20, 09-LIGHTHOUSE "Accepted miss sign-off"); Brotli proxy 2,109/2,259/2,259 ms. 09-09/09-10 gap-closure levers were dropped by user decision (09-10 intentionally skipped) |
| HOME-10 | SATISFIED | Criterion 2 evidence |
| PROJ-04 | SATISFIED | Criterion 3 evidence; chips from curated categories, All, empty hidden |
| PROJ-07 | SATISFIED | `?category=` parse with unknown-to-All fallback, replaceState, polite status, hash-link handling (09-04, WR-01) |

No orphaned requirements: REQUIREMENTS.md maps exactly these four IDs to Phase 9.

## Accepted items (not gaps)

1. Home mobile LCP 2,933 ms vs 2,500 ms budget (D-20); production with compression still to be measured.
2. First-run `@network` failures were Turnstile latency (token empty / siteverify slow); 60/60 on re-run at `cc64ecd` and in scratch worktrees; Home HTML is byte-identical to `bda5a84` after hash normalisation.
3. New taste inspect `still-page` WARN at 1440 on hard-loaded filtered /projects/, caused by the WR-02 first-paint prefilter.
4. Home eager JS 18,0xx B under 22,000 B (D-19).

## Warnings and notes

- **WARNING (bookkeeping):** 09-VALIDATION.md's Approval line still cites `bda5a84` (09-11 deliberately did not move it after the re-gate stopped for a user decision). Update it to `cc64ecd` when the user's acceptance of items 2 and 3 is recorded.
- The taste inspect `/projects/?category=web-design` page also shows FAIL `few-pictures` and `empty-screens` plus WARN `first-action`, `no-footage`; recorded as known and identical in nature to prior accepted runs (09-11-SUMMARY).
- Info items IN-01..IN-04 from 09-REVIEW remain open and advisory.

## Human verification required

1. Martina's Spanish copy review (Fotografia, chips, status text). **Done: approved by the user, 2026-11-10.**
2. Post-deploy production Home mobile LCP with compression (D-20 follow-up).
3. Visual check of hero at 390px and 640px+, and of the filter chips in EN and ES.

## Gaps

None. Status is `human_needed` because the three items above cannot be verified programmatically.

_Verifier: Claude (gsd-verifier)_
