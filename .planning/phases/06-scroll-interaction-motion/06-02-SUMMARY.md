---
phase: 06-scroll-interaction-motion
plan: 02
subsystem: motion-tooling
tags: [gsap, bundle-size, performance, lazy-loading]
requires: []
provides:
  - "pnpm measure:bundle (eager/lazy gzip -9 report for / and /es/, GreenSock eager gate)"
  - "scripts/bundle.ts pure helpers (parseEntryScripts, staticImports, dynamicImports, collectEager)"
  - "gsap@3.15.0 exact-pinned runtime dependency"
  - "src/lib/motion/load-gsap.ts (loadGsap, createGsapLoader, GsapModules)"
affects: [06-03, 06-04, 06-05, 06-06, 06-07, 06-08, 06-09, 06-10]
tech-stack:
  added: [gsap@3.15.0]
  patterns:
    - "CLI + pure-helper split for build scripts (as with check-secrets)"
    - "Injected importer for async third-party loaders (as with ContactFormDeps.loadTurnstile)"
key-files:
  created:
    - scripts/bundle.ts
    - scripts/measure-bundle.ts
    - src/lib/motion/load-gsap.ts
    - tests/unit/measure-bundle.test.ts
    - tests/unit/motion-load-gsap.test.ts
  modified:
    - package.json
    - pnpm-lock.yaml
decisions:
  - "Re-measured Phase 5 homepage baseline: 8,536 B gzip -9 eager JS on / and /es/ (this replaces the stale 8,809 B in the UI-SPEC)"
  - "registerPlugin(SplitText) runs inside createGsapLoader, not the default importer, so the register-once behaviour is unit-testable with a fake importer"
  - "gsap@3.15.0 approved by the user on 2026-10-29 at the blocking package-legitimacy checkpoint"
metrics:
  duration: "~10 min of execution, plus the approval wait"
  completed: 2026-10-29
  tasks: 3
  files: 7
---

# Phase 6 Plan 02: Bundle Baseline, GSAP Pin and Lazy Loader Summary

`pnpm measure:bundle` reports the eager and lazy JS sizes (gzip -9) for `/` and `/es/` and fails when GreenSock code appears in an eagerly loaded chunk. The Phase 5 baseline is recorded as 8,536 B gzip -9. `gsap@3.15.0` is exact-pinned after the user approved it. `src/lib/motion/load-gsap.ts` is the single place in `src/` that imports gsap: it loads GSAP and SplitText through dynamic `import()`, memoises the load, registers SplitText once and allows a retry after a failure.

## Task 1: gsap approval (blocking checkpoint)

- **Resolution:** the user approved installing `gsap@3.15.0` (exact pin) on 2026-10-29, through the orchestrator's approval prompt.
- **Registry facts at approval time** (`npm view gsap@3.15.0`):
  - repository: `git+https://github.com/greensock/GSAP.git`
  - maintainer: `greensock <info@greensock.com>`
  - license: Standard "no charge" license
  - scripts: none (no postinstall)
- **Install:** `pnpm add gsap@3.15.0 --save-exact`. `package.json` now has `"gsap": "3.15.0"`.

## Phase 5 baseline (clean build, 2026-10-29, before any Phase 6 motion code)

Command: `pnpm build && pnpm measure:bundle`.

| Page | Module entries | Eager files | Eager raw | Eager gzip -9 | Lazy |
|------|------|------|------|------|------|
| `/` | 5 | 7 | 20,471 B | **8,536 B** | 0 files |
| `/es/` | 5 | 7 | 20,471 B | **8,536 B** | 0 files |

Eager files on `/` (identical on `/es/`):

| File | Raw | gzip -9 |
|------|------|------|
| ContactForm.astro script (BoOL05r8) | 17,018 B | 6,634 B |
| motion.fiA7hLNr.js | 1,176 B | 529 B |
| ToolsRow.astro script | 1,002 B | 449 B |
| RolesMarquee.astro script | 453 B | 295 B |
| ServiceChips.astro script | 441 B | 325 B |
| fields.kXQ_onmu.js | 352 B | 255 B |
| BaseLayout.astro script | 29 B | 49 B |

## Post-install measurement (after gsap and load-gsap.ts)

The numbers are unchanged: `/` and `/es/` are both 7 eager files, 20,471 B raw, **8,536 B gzip -9**, with 0 lazy files. The script prints "bundle check ok (no GreenSock in eager chunks)" and exits 0. This is expected: nothing imports `loadGsap` yet, so the build emits no gsap chunk. The first consumer (a later plan) should show gsap as a **lazy** chunk while the eager total stays where it is.

## Verification

- `pnpm vitest run tests/unit/measure-bundle.test.ts tests/unit/motion-load-gsap.test.ts`: 12 tests pass.
- `pnpm test`: 59 files, 943 tests pass.
- `pnpm check` and `pnpm lint`: 0 errors and 0 warnings; Prettier is clean.
- `pnpm build && pnpm measure:bundle`: exits 0.
- `grep -rln "from 'gsap\|import('gsap" src | grep -v load-gsap.ts` prints nothing.
- `astro check` resolved the `gsap/SplitText` types under `strictest` without any extra configuration.

## Commits

| Task | Commit | Message |
|------|------|------|
| 2 RED | f589c56 | test(06-02): add failing bundle helper tests |
| 2 GREEN | 6a09861 | feat(06-02): add bundle measurement script |
| 3 install | 0da0dad | chore(06-02): pin gsap 3.15.0 |
| 3 RED | cc79950 | test(06-02): add failing gsap loader tests |
| 3 GREEN | 4438dfb | feat(06-02): add lazy memoised gsap loader |

## Deviations from Plan

1. **Task order:** Task 2 ran before the Task 1 checkpoint. It needs no new package, and running it first meant the baseline came from a clean Phase 5 build. Nothing was installed before the approval.
2. **Where SplitText is registered:** `registerPlugin(SplitText)` runs in `createGsapLoader` after the importer resolves, not in the default importer. The plan's behaviour list requires that a fake importer sees exactly one `registerPlugin` call, and this placement is what makes that testable. The effect at runtime is the same.
3. **Retry guard:** the rejection handler clears the memo only if it still holds the failed attempt (`loading === attempt`), so a slow failure cannot wipe out a newer load.

## TDD Gate Compliance

Task 2 has a RED commit (f589c56) followed by GREEN (6a09861). Task 3 has a RED commit (cc79950) followed by GREEN (4438dfb). No refactor commits were needed.

## Known Stubs

None. `loadGsap` has no consumers yet by design; later Phase 6 plans will use it.

## Self-Check: PASSED

- scripts/bundle.ts, scripts/measure-bundle.ts, src/lib/motion/load-gsap.ts and both test files exist.
- Commits f589c56, 6a09861, 0da0dad, cc79950 and 4438dfb are present in the branch history.
