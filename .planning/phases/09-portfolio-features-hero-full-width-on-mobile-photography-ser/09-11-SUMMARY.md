---
phase: 09-portfolio-features-hero-full-width-on-mobile-photography-ser
plan: 11
subsystem: quality-gate
status: passed
tags: [phase-gate, taste, lighthouse, lcp, re-gate]
requires:
  - phase: 09-08
    provides: verify, @network, bundle, Spanish review and LCP evidence on src bda5a84
  - phase: 09-09
    provides: LCP lever bound and the stop gate that led to D-20
provides:
  - final taste gate on src bda5a84 (5 URLs x 3 widths, critique)
  - "Re-measure (09-11)" pointer section in 09-LIGHTHOUSE.md
  - 09-VALIDATION.md manual LCP (accepted miss D-20) and taste rows marked done
affects: [phase-9-verify-work]
tech-stack:
  added: []
  patterns: []
key-files:
  created:
    - .planning/phases/09-portfolio-features-hero-full-width-on-mobile-photography-ser/09-11-SUMMARY.md
  modified:
    - .planning/phases/09-portfolio-features-hero-full-width-on-mobile-photography-ser/09-LIGHTHOUSE.md
    - .planning/phases/09-portfolio-features-hero-full-width-on-mobile-photography-ser/09-VALIDATION.md
key-decisions:
  - "Tasks 1-2 not re-run: src is still bda5a84, so the 09-08 verify/@network/bundle/Spanish-review and Lighthouse evidence is the final-commit evidence (orchestrator amendment after D-20)"
  - "Home LCP is recorded as an accepted miss (D-20, 2,933 ms against 2,500 ms), not as a pass. The budget is unchanged"
  - "Final taste gate passed with only pre-existing findings. No src fix, so W-5 did not trigger"
metrics:
  duration: 6min
  completed: 2026-11-10
---

# Phase 9 Plan 11: Final re-gate Summary

**Final re-gate passed on src `bda5a84`. Home LCP is an accepted miss (D-20), not a pass.** Tasks 1 and 2 reuse the 09-08 evidence on the same src commit. Task 3, the final taste gate, ran on all 5 URLs at 1440, 768 and 390. It found nothing new and needed no src fix.

## Status by task

| Task | Result | Commit |
|---|---|---|
| 1. Verify, @network, bundle, Spanish review | Satisfied by 09-08 Task 1 on the same src `bda5a84`. Not re-run. VALIDATION Approval line names the final src commit | `2160082` |
| 2. Home LCP re-measure | Satisfied by 09-08 Task 2 on `bda5a84`. Not re-run. Pointer section "Re-measure (09-11)" added. LCP row marked "accepted miss (D-20)" | `ac1c86b` |
| 3. Final taste gate | **Passed** (only pre-existing findings). Critique below | `4d7ca77` |

## Tasks 1-2: evidence pointers (no re-run)

- `git log -1 --format=%h -- src` = **`bda5a84`**, and `git status --porcelain -- src` was empty at the start and the end of the plan. 09-10 was dropped (D-20), and no plan changed src after 09-08.
- Task 1 evidence (09-08-SUMMARY.md "Task 1: automated gates", commit `2c71bc8`):
  - `E2E_OFFLINE=1 pnpm verify` exit 0, with 1,407 unit and 833 e2e tests passed.
  - `@network` exit 0, with 60 tests passed.
  - `measure:bundle` printed "bundle check ok". `/` and `/es/` are 18,024 B, `/projects/` and `/es/projects/` are 17,975 B, and the max is 18,024 B against a 22,000 B ceiling. D-19 accepts `/` at 18,024 B, so the delta is 0 B.
  - The Spanish review was regenerated and is fresh. Logs are `tmp/09-08-verify.log`, `tmp/09-08-network.log` and `tmp/09-08-bundle.txt`.
- Task 2 evidence (09-LIGHTHOUSE.md first section, commit `2ad821b`, with the D-20 sign-off):
  - Home median **2,933 ms**, CLS 0.000.
  - Heaviest EN detail `/projects/website-reciclick/` median **2,633 ms**. That is +0 ms against the accepted 2,633 ms, within the +100 ms allowance.
  - The new "Re-measure (09-11)" section points to these runs and states the result as an accepted miss.

## Task 3: final taste gate

The phase base commit is **`06adfbd`**. The skill files were read directly from `~/.claude/plugins/cache/taste-skill/taste-skill/2.0.0/skills/taste-skill/`: SKILL.md, references/critique.md, and the lint and inspect scripts.

### lint.mjs

- It ran on all 16 lintable src files in `git diff --name-only 06adfbd..HEAD -- src` (`services.json` is not scanned). Result: **0 FAIL**, 1 WARN. The WARN is `em-dash`: 14 dashes, all pre-existing in `ui.en.ts` and `ui.es.ts`. Log: `tmp/09-11-lint.log`.
- The plan's verify list has 6 files: Hero, LatestWork, CategoryFilter, ProjectsView, ProjectCard and ProjectGrid. Result: **0 FAIL, 0 WARN**.

### inspect.mjs

It ran on preview port 4418 at 1440, 768 and 390, under the lock, with no Playwright or Lighthouse run active.

| URL | Result | Findings | Status |
|---|---|---|---|
| `/` | 1 FAIL, 3 WARN | FAIL `empty-screens` @1440 (screens 2, 3). WARN `size-count` (11), `first-action`, `no-footage` | Identical to 08-13, 08-15 and 09-01. Pre-existing |
| `/es/` | 1 FAIL, 3 WARN | Same as `/` | Pre-existing |
| `/projects/` | 1 FAIL, 2 WARN | FAIL `empty-screens` @1440 (4 of 5). WARN `first-action`, `no-footage` | Pre-existing since Phase 8. The inspector measures before the reveal shutters open (09-07) |
| `/es/projects/` | 1 FAIL, 2 WARN | Same as `/projects/` | Pre-existing |
| `/projects/?category=web-design` | 2 FAIL, 2 WARN | FAIL `few-pictures` (3 projects by design), `empty-screens` @1440 (2 of 4). WARN `first-action`, `no-footage` | Known, by design (09-07) |

No FAIL is new. No src fix was made, so the W-5 re-run did not apply.

Screenshots and reports are in the gitignored folder `tmp/taste-09-11/{home,es-home,projects,es-projects,web-design}/`. Each folder has `desktop-fold.jpg`, `desktop-page-0N.jpg`, `tablet-fold.jpg`, `tablet-page-01.jpg`, `mobile-fold.jpg`, `mobile-page-0N.jpg` and `report.json`. The logs are `tmp/taste-09-11/<name>.log`.

### Screenshot review

- **`/` and `/es/` at 390** (`home/mobile-fold.jpg`, `home/mobile-page-01.jpg`, `es-home/mobile-page-01.jpg`):
  - The blue semicircle arch runs full width (4:5) above the headline.
  - The hair edge reads cleanly against the field. I saw no halo or hard rim at JPEG resolution (D-05).
  - "Hi, I'm Martina." / "Hola, soy Martina." is set on two lines on the first screen, with the lead paragraph starting below it.
  - The 5th service (Photography / Fotografía) appears on Home with 4 items and its "Ask about this" / "Consultar" link. The contact radios include Photography / Fotografía.
  - Latest work shows all three covers (Cabrera's Motos, PuroV, Reciclick) after scroll. The covers load on first paint, with no blank frame.
- **`/` at 1440** (`home/desktop-page-01.jpg`): the desktop hero is unchanged (3:4 arch on the right). The services grid lists 5 services.
- **`/projects/`** (`projects/desktop-fold.jpg`, `projects/mobile-page-01.jpg`):
  - The chip row reads All, Graphic design, Web design, Branding, Social media. Photography is hidden because it has 0 projects.
  - The chips share the left edge with the title and lead.
  - At 390 the chips wrap to two rows with even gaps, with no clipping and no sideways scroll.
- **`/projects/?category=web-design`** (`web-design/desktop-page-01.jpg`):
  - "Web design" is selected (filled).
  - Three projects show (Reciclick, Portfolio website, InstaBlogs) in a 2+1 rhythm with no holes. The third tile is centred-offset as the layout intends.
- Preview-only artifact: the Turnstile test widget ("For testing only") appears because the preview uses Cloudflare test keys. Production is not affected.

### Critique

```
ROUND 1 (final gate, src bda5a84)
Seen in one second: Martina's portrait in the blue arch (phone) / "Hi, I'm Martina." (desktop).
Idea (one sentence): The designer herself, framed in her brand-blue arch, introduces work that is hers alone; the blue then carries the marquee and the footer.
Live thing: the category chips on /projects/ (filter + deep link), and the service chips preselecting the contact form.
Layout words by section: hero=split (desktop) / stacked portrait (phone) / marquee=band / latest work=grid / services=list / tools=list on field / contact=form / footer=colour field.
Scores: design 7 · usability 8 · creativity 7 · content 7 → overall 7.3
Caps applied: inspector FAIL (empty-screens, pre-existing since Phase 8; few-pictures on the filtered page by design) caps overall at 6.0 if taken literally. Recorded as a known, accepted finding, as in 08-TASTE-REPORT and 09-07, not a new regression.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. Services and Tools at 1440 leave wide empty ground under "What I can do for you" (home/desktop-page-01.jpg, screens 2-3). Fix later: a colour field or larger item type. Pre-existing Phase 3/8 layout, outside Phase 9 scope.
2. The Home first screen has no filled primary button at 390: "Let's work together" sits below the fold on the phone (home/mobile-page-01.jpg, frame 2). Pre-existing first-action WARN. Fix later: consider a smaller arch height or moving the CTA up. That is a D-01/D-02 trade-off, so it is not changed here.
3. On the filtered page (web-design/desktop-page-01.jpg) the single third tile leaves the right half of its row empty. This is the intended visible-subset rhythm (09-07), and the few-pictures FAIL comes from having only 3 Web design projects.
```

[Inference] The scores are my judgement from the screenshots, not a measurement. Remaining under 7.5 is stated plainly, per critique.md section 6. Problems 1-2 pre-date Phase 9.

## Deviations from Plan

- **Tasks 1-2 not re-run**, as the orchestrator amendment after D-20 requires (src = `bda5a84`). The plan text's "Home median ≤ 2,500 ms" truth is superseded by D-20: it is recorded as an accepted miss, and the budget is unchanged.
- **VALIDATION manual table:** I added a `Status` column so the rows can be marked done. The Photography copy row is marked "pending Martina's review (not a gate)".
- The first lint invocation passed the file list as one argument (zsh does not word-split). I re-ran it via `xargs`, and that result is the one recorded. There are no other deviations.

## Lock usage

- `tmp/build-e2e.lock` was free. It was acquired at 23:02:14 UTC for `pnpm build` (exit 0), `e2e-preview-env`, the preview on 4418 and the five inspect runs.
- The preview (pid 24036) was killed by pid because it was started with `--ignore-lock`. Afterwards `lsof -i :4400 -i :4418 -i :4485` was empty and no `astro preview` was running.
- The lock was released at about 23:04:31 UTC. No stale lock was removed.

## Notes for the phase end

- `/security-review` runs once for the phase, scoped to the phase base commit **`06adfbd`** (not origin/main), per the user's memory.
- The user reviews the phase commit list once at phase end.
- D-20 follow-up: measure production Home LCP with compression after deploy.
- Phase 9 is ready for `/gsd:verify-work`.

## Self-Check: PASSED

- FOUND: 09-LIGHTHOUSE.md "Re-measure (09-11)" (grep count 1); `lighthouse@13.6.0` (count 4)
- FOUND: 09-VALIDATION.md LCP row "accepted miss (D-20)" and taste row "done"
- FOUND: commits `2160082`, `ac1c86b`, `4d7ca77`
- FOUND: lock released (`tmp/build-e2e.lock` absent); ports 4400/4418/4485 free
- FOUND: `git status --porcelain -- src` empty
