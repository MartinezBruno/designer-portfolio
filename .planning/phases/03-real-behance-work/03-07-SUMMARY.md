---
phase: 03-real-behance-work
plan: 07
subsystem: build-tooling
tags: [offline, build, network-guard, data-04]
requires: []
provides:
  - pnpm build:offline (guarded astro build + post-build assertion)
  - scripts/offline.ts pure helpers (findCdnReferences, readAttempts, isIpcConnect)
affects: [03-10 phase gate re-runs build:offline]
tech-stack:
  added: []
  patterns:
    - Node --import preload (type stripping) that monkey-patches fetch, net.Socket.prototype.connect and dns.lookup
key-files:
  created:
    - scripts/offline.ts
    - scripts/offline-guard.ts
    - scripts/assert-offline.ts
    - tests/unit/offline.test.ts
  modified:
    - package.json
    - .gitignore
decisions:
  - isIpcConnect unwraps Node's internal normalized [options, listener] array so net.connect() IPC calls stay allowed
  - Only the first process loading the guard truncates the log (OFFLINE_GUARD_ACTIVE env marker), so child processes inheriting NODE_OPTIONS do not erase earlier attempts
metrics:
  duration: ~5min
  completed: 2026-10-17
requirements: [DATA-04]
---

# Phase 3 Plan 07: Offline Build Gate Summary

`pnpm build:offline` builds the site with fetch, TCP sockets and DNS blocked through a `--import` preload. It then fails if the guard logged any network attempt or if any `dist/**/*.html` references `mir-s3-cdn-cf.behance.net` / `mir-cdn.behance.net`.

## Result

Verified by running `pnpm build:offline` (exit 0):

```
offline build ok (0 network attempts, 4 html files scanned)
```

Negative checks (run by hand, not committed):
- `OFFLINE_GUARD_LOG=tmp/neg.log node --import=./scripts/offline-guard.ts -e "..."` wrote `fetch https://example.com`, `dns behance.net` and `connect example.com:443` to tmp/neg.log. The DNS callback got `ENOTFOUND` and the socket emitted `offline`. `assert-offline.ts` pointed at that log printed `3 network attempts` and exited 1.
- I appended a `https://mir-s3-cdn-cf.behance.net/x.png` img to dist/index.html. `assert-offline.ts` reported the file and URL and exited 1.
- `git check-ignore tmp/offline-guard.log` prints the path.
- `pnpm lint` is clean and `pnpm test` passes (144 tests).

## Tasks

| Task | Commit | Notes |
|------|--------|-------|
| 1 RED | 86fb2f6 | tests/unit/offline.test.ts |
| 1 GREEN | b7c20d5 | scripts/offline.ts |
| 1 fix | 349d0aa | normalized-array connect args, exactOptionalPropertyTypes-compatible ConnectOptions |
| 2 | 57a56d9 | guard, assert-offline, build:offline script, tmp/ in .gitignore |

## Deviations from Plan

**1. [Rule 1 - Bug] isIpcConnect must handle Node's normalized connect arguments**
- **Found during:** Task 2
- **Issue:** `net.connect()` / `net.createConnection()` call `socket.connect([options, listener])` with an array. The plain helper would have treated IPC connections made through `net.connect({ path })` as TCP and destroyed them.
- **Fix:** `ConnectTarget` now includes `readonly ConnectTarget[]`, and `isIpcConnect` unwraps the first element. Added IPC and TCP array test cases.
- **Commit:** 349d0aa

**2. [Rule 3 - Blocking] exactOptionalPropertyTypes**
- **Issue:** `astro check` rejected assigning the wrapped `connect` to `net.Socket.prototype.connect` because `TcpSocketConnectOpts.host` is `string | undefined`.
- **Fix:** I declared the `ConnectOptions` properties as `T | undefined`.
- **Commit:** 349d0aa

**3. [Rule 2] The guard log is truncated only once per build**
- **Issue:** Child processes inherit `NODE_OPTIONS` and load the guard again. Each one would truncate the log.
- **Fix:** An `OFFLINE_GUARD_ACTIVE=1` env marker means only the first process truncates the log. `assert-offline.ts` also fails if the log file is missing.
- **Commit:** 57a56d9

## TDD Gate Compliance

RED (`test(03-07)` 86fb2f6) comes before GREEN (`feat(03-07)` b7c20d5). Both gates are present.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: scripts/offline.ts, scripts/offline-guard.ts, scripts/assert-offline.ts, tests/unit/offline.test.ts
- FOUND commits: 86fb2f6, b7c20d5, 349d0aa, 57a56d9
