---
phase: 03-real-behance-work
plan: 09
subsystem: behance-data
tags: [behance, sync, snapshot, overrides, taste-gate, content]
requires:
  - 03-08 (pnpm sync:behance with gates G1-G9)
  - 03-05 (Home latest work)
  - 03-04 (overrides schema, drafted titles and categories)
  - 03-03 (projects grid, 7/8 small tile)
provides:
  - real Behance snapshot (origin behance-sync, 7 projects) and 7 real covers
  - curated overrides (category, summary, coverAlt) for all 7 projects
  - D-21 measurements (git size, build time) with real covers
  - real-imagery taste gate results for /, /es/, /projects/, /es/projects/
affects:
  - 03-10 (origin === "behance-sync" check can now pass)
tech-stack:
  added: []
  patterns:
    - e2e expectations derived from snapshot + overrides (helper now exposes coverAlt)
key-files:
  created:
    - .planning/phases/03-real-behance-work/03-09-SUMMARY.md
  modified:
    - src/data/behance/snapshot.json
    - src/assets/projects/ (7 seed covers removed, 7 real covers added)
    - src/data/project-overrides.json
    - tests/unit/projects-snapshot.test.ts
    - tests/e2e/helpers/projects.ts
    - tests/e2e/projects.spec.ts
    - tests/e2e/layout.spec.ts
decisions:
  - "Live sync run once with user go-ahead (run-now); 7 projects, so PROJ-04..07 stay N/A (D-05/D-06)"
  - "PuroV and Mart get the checklist suggestion graphic-design; the other 5 keep their 03-04 categories because tags/fields clearly support them"
  - "focal-point (/projects/) and empty-screens (Home, /projects/) still FAIL with real covers; recorded for the user, grid/heading/UI-SPEC unchanged"
  - "PuroV cover crops its wordmark at the 7/8 small tile; recorded as a fix candidate, not fixed"
metrics:
  duration: ~7 min (Tasks 2-3)
  completed: 2026-10-17
  tasks: 3
  files: 21
---

# Phase 3 Plan 09: Real Behance sync and curated overrides Summary

One manual `pnpm sync:behance` run replaced the seed with Martina's 7 real Behance projects and covers (origin `behance-sync`). All 7 overrides now have a category, EN/ES summaries and cover alt text written from the real covers and tags (all `TODO(martina)`). The taste gate was re-run with the real covers.

## User decisions (verbatim, Task 1)

- Live sync: **"run-now (Recommended)"**. The user approved the one manual live `pnpm sync:behance` run, with network access to www.behance.net and mir-s3-cdn-cf.behance.net for that one command only.
- Consent date: **"Today (2026-10-17)"**. The orchestrator filled it into docs/CONSENT.md and committed it (d1d278d).
- Focal-point question: **"Re-check after real covers"**. Results are in the taste gate below. Grid, heading size and UI-SPEC were not changed.

Preconditions (checked again before the run): the consent commit exists (`6331404`), `CI` is unset, `node scripts/sync-behance.ts --help` exits 0, and src/data/behance plus src/assets/projects were clean.

## Sync output

The run took about 20 s. The sandbox did not block network access, so I did not need to disable it. It was the only Behance request batch in this plan: no retry, no curl probing.

Verbatim from tmp/sync-run.log:

```
sync:behance: 7 projects
missing overrides for 238078789 (cabreras-motos-posts): coverAlt
missing overrides for 227934855 (purov): category (suggested: graphic-design), coverAlt
missing overrides for 226450035 (website-reciclick): coverAlt
missing overrides for 202447185 (portfolio-web): coverAlt
missing overrides for 185594991 (sistema-visual): coverAlt
missing overrides for 176799549 (website-instablogs): coverAlt
missing overrides for 172473551 (mart): category (suggested: graphic-design), coverAlt
sync:behance: done. Review the diff (src/data/behance, src/assets/projects) and commit it.
```

- Count line: `sync:behance: 7 projects`. No 8+ notice, so D-05 is settled at 7 and PROJ-04..07 stay N/A (D-06).
- No unknown-module warnings were printed.
- Verify script: `real snapshot ok`. Origin is `behance-sync`, there are 7 projects, the ids equal the 7 known ids (newest first), and every `cover.file` exists.
- `ls src/assets/projects | grep -cE '^[0-9]+-[0-9a-f]{12}\.(png|jpg|webp)$'` returns 7. None of the 7 seed file names remain (all 7 were garbage-collected by the sync). All covers are 808×632 PNG.
- `syncedAt` is 2026-10-17T16:53:03.638Z.

## Measurements

| Metric | Seed (before) | Real (after) |
|--------|---------------|--------------|
| `du -ch src/assets/projects src/data/behance` | 28K + 4.0K = **32K** | 2.1M + 856K = **3.0M** |
| Blob bytes in git tree (`git ls-tree -r -l`) | 21,104 | **2,850,762** |
| Cover files | 7 × 2,451 B | 7 files, 156 KB to 528 KB (largest: Sistema visual) |

- `git diff --stat` for the sync commit: 8 files changed, 22,268 insertions(+), 58 deletions(-) (the snapshot grew by 22,326 lines, and 7 binary seed covers went from 2,451 B to 0). With the 7 added covers and the test update, the commit totals 16 files changed, 22,276 insertions(+), 66 deletions(-).
- `time pnpm build` wall time with real covers:
  - First build after the sync: **2.92 s**.
  - With the image cache deleted (`rm -rf node_modules/.astro/assets`): **2.55 s**.
  - `astro build --force` with a warm image cache: **0.93 s**.
  - Each build produces 6 pages and 44 webp/avif images in dist/_astro. dist is 7.9 MB.
- `pnpm build:offline`: ok, 0 network attempts. The real covers are local, so the build makes no remote image requests.

## Overrides curated (Task 3)

| Id | Project | Category chosen | Suggested by heuristic (`suggestCategory(fields)`) | Reason |
|----|---------|-----------------|----------------------------------------------|--------|
| 238078789 | Cabrera's Motos | social-media (kept) | graphic-design | The tags (Posteos Redes Sociales, Social media post, instagram, Stories design) and the cover (a grid of feed posts) clearly contradict the generic field |
| 227934855 | PuroV | graphic-design | graphic-design (checklist) | The plan says the suggestion decides. Note: every tag is identity/logo, so `branding` is an alternative for Martina |
| 226450035 | Reciclick | web-design (kept) | graphic-design | Fields include Web Design, and the tags include Website, UI/UX |
| 202447185 | Portfolio web | web-design (kept) | web-design | Matches |
| 185594991 | Sistema visual | branding (kept) | graphic-design | Tags: Brand Design, identidade visual, identidadvisual, marca |
| 176799549 | InstaBlogs | web-design (kept) | graphic-design | Fields include Web Design, and the tags include Website, Responsive Design |
| 172473551 | Mart | graphic-design | graphic-design (checklist) | The plan says the suggestion decides. Tags: brand identity, Logotype (so `branding` is an alternative) |

None of the 5 categories drafted in 03-04 changed. Titles are unchanged (all are 32 characters or fewer). No `featured`, `order` or `hidden` were set.

Summaries (at most 90 characters) and coverAlt (at most 125 characters) were written only from what the covers and tags show. No clients, results or claims were invented. The longest strings are summary 84 characters (202447185 es) and alt 121 characters (185594991 es). The verify script prints `overrides curated`.

## Taste gate with real covers

The skill is taste-skill 2.0.0 (`.../taste-skill/2.0.0/skills/taste-skill/scripts`). I ran `pnpm build`, then served the preview on **port 4324**. I confirmed it was my build: the served HTML contained the new PuroV summary and cover alt. inspect.mjs ran at 1440/768/390, and I stopped the preview afterwards. Port 4321 is the user's own `astro dev` session (pid 78996, started on Oct 16), which I left running.

| Page | Report | Codes |
|------|--------|-------|
| `/` | .taste-skill/inspect-p3-final-home/report.json | FAIL icon-cards, still-page, empty-screens; WARN hairline, palette-cream, no-footage |
| `/es/` | .taste-skill/inspect-p3-final-es-home/report.json | identical to `/` |
| `/projects/` | .taste-skill/inspect-p3-final-projects/report.json | FAIL focal-point, still-page, empty-screens; WARN hairline, palette-cream, first-action, no-footage |
| `/es/projects/` | .taste-skill/inspect-p3-final-es-projects/report.json | identical to `/projects/` |

Compared with the baseline `.taste-skill/inspect/report.json` (Home) and the Phase 3 runs in 03-03/03-05, **no new FAIL or WARN appeared**. `few-pictures` stays cleared on Home.

What you asked me to re-check:
- **`focal-point` on /projects/: still FAIL** with the real covers. The message is unchanged: "the largest type is 48px (3.3vw) and no single picture holds a third of the viewport". The first L tile at 1440 is still about 625×500. Real imagery does not change the geometry the rule measures. Not fixed, as instructed.
- **`empty-screens` on Home: still FAIL**, screens 2 and 3 of 4 at 1440 (the same screens as in 03-05). Real covers did not clear it. In the screenshot, the third Latest work tile (`large-end`) still leaves the left 5 columns of its row empty. Not fixed.
- `empty-screens` on /projects/ is also still FAIL, screens 1, 2 and 3 of 4 (the same count as in 03-03).

Screenshots reviewed: projects desktop fold and page, projects tablet page, ES projects mobile fold, home desktop page. Crop findings at the 7/8 small tile (md+):
- **PuroV (227934855)**: the wordmark spans almost the full cover width, so the 7/8 crop cuts off the left of the "P" and the right of the "V". **This is a fix candidate.** `object-left`/`object-right` would only move the cut to the other side. A real fix needs a different crop or an uncropped treatment for this tile. Left for your decision. Rhythm and aspect are unchanged.
- **Sistema visual (185594991)**: the left poster title "Conectar con las miradas" loses its first letters, but most of that was already cut off in Behance's own cover crop. Minor.
- **InstaBlogs (176799549)**: the edges of the tablet and phone mockups are clipped. The main monitor and headline are fine. Minor.
- **Cabrera's Motos and Reciclick** (large 5/4 and small tiles) and **Mart** read well.
- 390px: tiles are single column and the copy wraps cleanly. No horizontal overflow was reported.

## Verification

- `pnpm lint`: 0 errors (astro check, eslint, prettier).
- `pnpm test`: 32 files, 356 tests passed.
- `pnpm test:e2e` (full wave gate): 165/165 passed. The filtered `-g "projects page|projects grid|latest work"` run passed 42/42 after the sync.
- `pnpm build:offline`: ok.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Snapshot unit tests hard-coded the seed origin**
- **Found during:** Task 2
- **Issue:** `tests/unit/projects-snapshot.test.ts` expected `origin === 'seed'` (2 failures after the real sync).
- **Fix:** the tests now assert the committed snapshot has `behance-sync` (the describe block was renamed to "committed snapshot"). The ids, names and cover checks are unchanged and still pass.
- **Commit:** f35fada

**2. [Rule 1 - Bug] Cover-alt e2e test asserted the fallback alt**
- **Found during:** Task 3
- **Issue:** `projects.spec.ts` expected the first tile's alt to be `{title} — cover`. Curated `coverAlt` (D-15) replaces that fallback by design.
- **Fix:** the e2e helper now exposes `coverAlt`. The test compares every tile's alt with the override, falling back to the template when there is none. It is stricter than before (all 7 tiles instead of the first only).
- **Commit:** d26e8a6

**3. [Rule 1 - Test assumption] Sticky-header focus test measured the tile, not the focused control**
- **Found during:** Task 3 (full e2e)
- **Issue:** at 390px, Shift+Tab from the footer reaches the Mart link with the page at maximum scroll. The real two-line summary makes the tile taller, so the cover's top is 37px under the 89px header. The focused link (y 356–384) is fully visible, so the page cannot scroll further and WCAG 2.4.11 is still met. The old assertion only held for the one-line seed summary.
- **Fix:** the test now asserts that the focused link's top is at or below the header's bottom, and that the tile is not entirely hidden. I measured with a temporary probe spec, which was deleted.
- **Commit:** d26e8a6
- **For the user:** if you want the whole last tile clear of the header at maximum scroll, that needs more bottom space on the page, which is a layout change. I did not make it.

## Known Stubs

Every value written in Task 3 is `TODO(martina)` and needs her review (JSON cannot hold comments, so they are tracked here):
- `category` for all 7, especially PuroV and Mart (heuristic `graphic-design` vs tag-based `branding`).
- `summary.en/es` for all 7. These are uncertain:
  - 185594991: "contemporary dance degree programme" is read from the small poster text (Licenciatura de Danza Contemporánea).
  - 226450035: "a community about recycling" is read from the landing copy.
  - 202447185: "a developer's portfolio" comes from the mockup. The visible name on it is not used.
- `coverAlt.en/es` for all 7, which describe the covers as I see them.
- Titles from 03-04 are unchanged and remain `TODO(martina)`.

## Threat Flags

None. The live run used only the two allowlisted hosts through the 03-08 gates (T-03-27). Consent was checked first, and there was a single run with no retry (T-03-28). Only public portfolio content was ingested (T-03-29).

## Commits

- d1d278d docs(03-09): record consent date (orchestrator, Task 1 precondition)
- f35fada feat(03-09): sync real behance snapshot
- d26e8a6 docs(03-09): curate project overrides

## Self-Check: PASSED

All key files, the 4 taste reports and commits d1d278d, f35fada, d26e8a6 exist.
