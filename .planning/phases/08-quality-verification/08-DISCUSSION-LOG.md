# Phase 8: Quality Verification - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-11-06
**Phase:** 08-quality-verification
**Areas discussed:** Lighthouse method, A11y/keyboard scope, Audit debt to fold in

---

## Lighthouse method

| Question | Options | Selected |
|---|---|---|
| Where to measure | Local preview / Deployed preview / Both | Local preview |
| Runs | Median of 5 / Median of 3 / Single | Median of 5 |
| Pages | Home + heaviest detail EN / same EN+ES / every route type EN+ES | Home + heaviest detail, EN |
| Budget misses | Fix, document unfixable / Hard gate / Record only | Fix, document if not fixable |
| Motion state | on only / on + reduced | on only |
| Recording | Script + report / Script + verify / One-off manual | One-off manual run |
| Who runs | Agent via pnpm dlx / User in DevTools | Agent via pnpm dlx |

**Notes:** No new dependency and no committed script.

---

## A11y/keyboard scope

| Question | Options | Selected |
|---|---|---|
| Axe pages | All built routes / keep 3 representative details | All built routes |
| Axe motion states | on+reduced+off everywhere / on everywhere + sample | on + reduced + off on every page |
| Keyboard proof | Automated + manual checklist / Automated only / + screen reader | Automated + manual checklist |
| Marquee WR-01/WR-03 | Fix both / Verify first / Leave | Fix both |
| Marquee pause control | Keep invisible, fix semantics / Visible button / You decide | Keep invisible, fix semantics |

---

## Audit debt to fold in

| Question | Options | Selected |
|---|---|---|
| Code debt (multi) | HOME-04 dead icon / Re-check trimmed specs / es 404 status / Skip-link padding | All four |
| Doc hygiene | One docs task / Leave for complete-milestone | One docs task |
| Taste gate on redesign merge | Run, report only / Run and fix FAILs / Skip | Run it, report only |

---

## Claude's Discretion

- The Spanish review list (area not selected): format, generator and scope proposed by Claude, and the user accepted by moving to context.
- The heaviest-page selection method, the pinned Lighthouse version, axe sharding, the es-404 mechanism, and plan breakdown.

## Deferred Ideas

- A deployed Lighthouse run (v2 DEPLOY)
- A VoiceOver pass
- Visual taste fixes from the D-20 report
