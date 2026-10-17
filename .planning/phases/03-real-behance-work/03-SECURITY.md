---
phase: 03
slug: real-behance-work
status: verified
threats_open: 0
asvs_level: 1
created: 2026-10-17
---

# Phase 03 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Audited at HEAD 206dfc4 (after the WR-01..WR-10 fixes in 24295f1..c2e3d3d). The register was written at plan time (03-01..03-10 PLAN.md `<threat_model>` blocks).
> `status` stays `draft` until the orchestrator records the T-03-31 `/security-review` result. After that, set `status: verified`.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| committed snapshot JSON → build | Data scraped from a third party is read at build and validated before use | Public Behance metadata (low) |
| hand-edited overrides JSON → build | Developer-edited file merged with the scraped data | Curated copy (low) |
| build output → visitor browser | Behance and override strings rendered into static HTML | Public text (low; XSS vector) |
| UI layer → data adapter | Components must not depend on the Behance adapter | Architecture (n/a) |
| Behance HTTP responses → sync process | Untrusted HTML/JSON and image bytes | Untrusted input (medium) |
| scraped URLs → outbound requests | URLs inside the scraped JSON could point anywhere | SSRF vector (medium) |
| sync process → repo working tree | Writes into src/ must be all-or-nothing | Repo integrity (medium) |
| build process → network | The build must not reach Behance or any other host | None allowed |
| phase output → release | Gate before the phase is marked complete | Secrets in dist (high if leaked) |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation / Evidence | Status |
|-----------|----------|-----------|-------------|------------------------|--------|
| T-03-01 | Tampering | sources/behance-snapshot.ts | mitigate | `parseSnapshot(raw)` runs at module scope (src/lib/projects/sources/behance-snapshot.ts:9). Schema: strictObject, id `^\d+$`, `cover.file` regex COVER_FILE, https-only host-pinned URLs with no credentials, duplicate-id superRefine (src/lib/projects/snapshot-schema.ts:6,15-25,27-73). Throws at :79-89 | closed |
| T-03-02 | Tampering (stored XSS) | ProjectCard.astro | mitigate | Title, summary, category, tools and alt are rendered only through `{}` and attribute bindings (src/components/ui/ProjectCard.astro:56,79-99). `grep -rn set:html src` finds exactly 1 match, src/layouts/BaseLayout.astro:29 (the static motion-gate inline script, not project data) | closed |
| T-03-03 | Info disclosure / DoS | adapter + rendered img | mitigate | Covers come only from the local `import.meta.glob('/src/assets/projects/*...')`, and a missing file throws (behance-snapshot.ts:11-24). The e2e test asserts no `behance.net` in img/source src or srcset (tests/e2e/projects.spec.ts:138-147) | closed |
| T-03-04 | Elevation (architecture) | components/pages | mitigate | eslint.config.js:31-47 sets `no-restricted-imports` with group `**/sources/**` for `src/components/**` and `src/pages/**`. Verified during the audit: a violating import piped on stdin as `src/components/ui/Probe.ts` raised the DATA-06 error. The only importer of the adapter is src/lib/content/queries.ts:7 | closed |
| T-03-05 | Spoofing | cover file paths | mitigate | `COVER_FILE = /^\d+-[0-9a-f]{12}\.(png\|jpg\|webp)$/` (snapshot-schema.ts:6), enforced on `cover.file` (:43). The lookup key is built only from the validated name (behance-snapshot.ts:17) | closed |
| T-03-06 | Tampering (XSS) | ProjectCard.astro | mitigate | Only `{}` interpolation. tests/unit/project-card.test.ts:163-165 renders the title `<script>x</script>` and asserts `&lt;script&gt;` is present and `<script` is absent | closed |
| T-03-07 | DoS (UX) | layout / image size | accept | See Accepted Risks AR-03-01 | closed |
| T-03-08 | Tampering | overrides-schema.ts | mitigate | `z.strictObject` (src/lib/projects/overrides-schema.ts:16), slug `SLUG_PATTERN` `^[a-z0-9]+(-[a-z0-9]+)*$` (:17, slug.ts:3), category `z.enum(categoryIds)` (:21), record keys `^\d+$` (:28). Parsed at module scope (src/lib/projects/local-overrides.ts:5) and again in the sync at G8 (scripts/behance/run-sync.ts:112-120) | closed |
| T-03-09 | Tampering (XSS) | override title/summary/coverAlt | mitigate | Same `{}` rendering as T-03-02 (ProjectCard.astro:56,80-87). No `set:html` on project data | closed |
| T-03-10 | DoS | slug collisions | mitigate | `validateOverrides` runs `assertUniqueSlugs` over ALL sources, hidden ones included (src/lib/projects/projects.ts:24-45,100-114). It is called from `applyOverrides` on the build path (:56; src/lib/content/queries.ts:47) and at sync gate G8 (run-sync.ts:213-217) | closed |
| T-03-11 | Tampering (XSS) | LatestWork.astro | mitigate | LatestWork reuses ProjectCard. Its own interpolations are only `t()` strings and `getRelativeLocaleUrl` (src/components/sections/LatestWork.astro:27-41). The `set:html` count is still 1 | closed |
| T-03-12 | Spoofing (UI redress) | header nav links | accept | See AR-03-02 | closed |
| T-03-13 | Spoofing (SSRF) | fetch-page.ts | mitigate | `assertAllowed` requires `https:` and an exact hostname in the allowlist (scripts/behance/fetch-page.ts:22-23,34-44). It runs before every request in `fetchStorePage` (:125) and `fetchCover` (:159). Every request uses `redirect: 'error'` (:128,142,162). The only network path in the sync is `deps.fetch` wrapped by `paced` (run-sync.ts:148-155), and both callers go through these functions (:164,178,183). The `original` variant (null width) is skipped by `pickCover` (covers.ts:32-47). A test covers an off-allowlist cover URL (tests/unit/sync-run.test.ts:436) | closed |
| T-03-14 | Tampering | parse.ts | mitigate | Targeted regexes for the two islands only (`id="beconfig-store_state"` script, keywords meta) at scripts/behance/parse.ts:10-11. JSON.parse and Zod looseObject (raw-schemas.ts:15-54) are wrapped as SyncError G1/G3 (parse.ts:60-67,84-88,122-131), plus an id-match check (:129-131) | closed |
| T-03-15 | DoS | response bodies | mitigate | `MAX_PAGE_BYTES = 5 MB`, `MAX_COVER_BYTES = 10 MB` (fetch-page.ts:28,30). `readCapped` checks the declared content-length (:70-74) and the streamed byte count (:79-88). Used for pages (:100) and covers (:173) | closed |
| T-03-16 | Tampering (path traversal) | covers.ts | mitigate | `coverFileName` requires `^\d+$` for the id, an extension from the png/jpg/webp set, and a sha256 hex[0..12] (scripts/behance/covers.ts:62-71). The extension comes from the sniffed magic bytes (:54-59; fetch-page.ts:177-178). No scraped slug or name is used in a path | closed |
| T-03-17 | Repudiation / legal | consent + requests | mitigate | docs/CONSENT.md was committed in 6331404 (12:28). That is before the fetch code (513a785, 12:33) and the live sync (f35fada, 13:54). Fixed UA `BEHANCE_UA` (fetch-page.ts:14-15) is used on every request. A 2 s wait comes before every request after the first (run-sync.ts:75,151), with a 2 s challenge delay (fetch-page.ts:26,138). Manual runs only: CI refusal (T-03-25), and the only entry point is the `sync:behance` script (package.json:20), with no prebuild hook | closed |
| T-03-18 | Info disclosure | credentials | mitigate | `grep -rniE "password\|token\|login\|credential\|authorization" scripts/behance scripts/sync-behance.ts` matches only "no credentials" comments. The only cookie is the replayed public JS-challenge value (fetch-page.ts:141). No env or secret reads in the sync | closed |
| T-03-19 | Info disclosure | astro telemetry | mitigate | `build:offline` sets `ASTRO_TELEMETRY_DISABLED=1` and preloads the guard (package.json:12). The guard records fetch, socket connect, every DNS API, dgram and Worker attempts (scripts/offline-guard.ts:69-73,76-90,92-138,140-161,163-181). assert-offline fails when any attempt is recorded (scripts/assert-offline.ts:30-37) | closed |
| T-03-20 | Tampering (remote assets) | dist output | mitigate | assert-offline scans every text file in dist (TEXT_EXTENSIONS, not only .html, per WR-07) for both CDN hosts, raw, `\/`-escaped and percent-decoded (scripts/offline.ts:3-46; assert-offline.ts:52-63). It also fails on a stale or missing guard log (:25-28,44-50) | closed |
| T-03-21 | DoS | guard breaking IPC | accept | See AR-03-03. `isIpcConnect` passthrough at offline-guard.ts:83-85 / offline.ts:130 | closed |
| T-03-22 | Tampering (poisoned/partial data) | run-sync.ts | mitigate | G1, G1b, G2-G6, G5 (the site's own `parseSnapshot` plus a count match, run-sync.ts:128-142,196-205) and G8 (:207-217) all run before the G7 `commitSync` (:219-228). The `expectRefused` helper asserts `fingerprint()` is byte-identical and staging is removed on every failure gate (tests/unit/sync-run.test.ts:380-399, used by :401-465) | closed |
| T-03-23 | Tampering (path traversal) | fs-commit.ts | mitigate | `assertCoverName` (COVER_FILE) runs on every staged write (scripts/behance/fs-commit.ts:54-58,84) and every referenced name (:104). GC deletes only COVER_FILE or `PARTIAL_FILE` names (:37,140-145). The staging dir is `tmp/behance-sync/<iso>` (scripts/sync-behance.ts:51) | closed |
| T-03-24 | DoS (data loss) | cover GC | mitigate | GC (step 3) runs only after the atomic snapshot rename (fs-commit.ts:131-133 before 135-148). It skips every name in `referenced` (:142), which is built from the validated new snapshot (run-sync.ts:226). The pre-flight requires every referenced cover to exist before any write (fs-commit.ts:106-111) | closed |
| T-03-25 | Repudiation / ToS | CLI | mitigate | The CLI refuses when `CI` is set to a non-empty value (scripts/sync-behance.ts:31-34), tested at tests/unit/sync-cli.test.ts:28-31. Spacing, UA and consent as in T-03-17 | closed |
| T-03-26 | Tampering (stored XSS, Phase 4) | TextModule HTML | accept | See AR-03-04. Verified that nothing in src/components, src/pages or src/lib/content reads `modules` today | closed |
| T-03-27 | Tampering | live sync output | mitigate | The live run went through `runSync` with all gates (code as in T-03-22). The committed snapshot has `origin: "behance-sync"` and 7 covers, all of which match COVER_FILE (src/assets/projects/*). 03-09-SUMMARY.md:77,89 records the verify script result (`real snapshot ok`) and the `git diff --stat` review. The build re-validates through the T-03-01 schema | closed |
| T-03-28 | Repudiation / legal | live requests | mitigate | Consent commit 6331404 predates f35fada (git log). Single run, no retry: 03-09-SUMMARY.md:55-59. The code has no retry loop, apart from the single challenge replay after 2 s (fetch-page.ts:133-151) | closed |
| T-03-29 | Info disclosure | covers/snapshot | accept | See AR-03-05 | closed |
| T-03-30 | Info disclosure | dist secrets | mitigate | `check:secrets` (package.json:19) runs scripts/check-secrets.ts, which checks git-tracked secret files, secret files in dist, and local secret values found in dist (:23-50). It ran in the 03-10 gate as check 2e (PASS, 03-10-SUMMARY.md:45) | closed |
| T-03-31 | Tampering | phase-wide changes | mitigate (process) | `/security-review` at phase end over `origin/HEAD...main` (79 commits, HEAD 206dfc4): no findings at or above 8/10 confidence (path traversal, SSRF, header injection, deserialization/eval, XSS/URL attributes, image pipeline, offline guard, secrets, package scripts all reviewed) | closed |
| T-03-SC | Tampering | package installs | accept | See AR-03-06. Verified: `git diff 6331404~1 HEAD -- package.json` adds only two scripts and no dependencies; pnpm-lock.yaml is unchanged | closed |

*Status: open · closed · pending-orchestrator (process control, outside the code audit)*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-03-01 | T-03-07 | Covers are static, at most 808 px, with intrinsic width/height (ProjectCard.astro:58-61). No runtime cost, low risk | Plan 03-03 threat model | 2026-10-17 |
| AR-03-02 | T-03-12 | Nav links are static same-origin URLs from `getRelativeLocaleUrl`, with no user input | Plan 03-05 threat model | 2026-10-17 |
| AR-03-03 | T-03-21 | The offline guard lets IPC/local-socket connects through (`isIpcConnect`). A green offline build is the verification. Local-only tool | Plan 03-07 threat model | 2026-10-17 |
| AR-03-04 | T-03-26 | Behance TextModule HTML is stored in `modules` as inert data and not sanitized. Phase 3 never renders it. **Obligation carried to Phase 4: sanitize module HTML before any `set:html`.** The `set:html` count in src must be re-checked then | Plan 03-08 threat model | 2026-10-17 |
| AR-03-05 | T-03-29 | Only public portfolio content that Martina consented to publish (docs/CONSENT.md, DATA-01) | Plan 03-09 threat model | 2026-10-17 |
| AR-03-06 | T-03-SC | No new packages in this phase (RESEARCH Package Legitimacy Audit: none). Confirmed via the package.json / pnpm-lock.yaml diff | Plan 03-06 threat model | 2026-10-17 |

*Accepted risks do not resurface in future audit runs.*

---

## Unregistered Flags

None. Every SUMMARY.md `## Threat Flags` section says "None" or maps to registered IDs (T-03-08..T-03-31).

## Auditor Notes (informational, not findings)

- The register has 32 unique IDs (T-03-01..T-03-31 plus T-03-SC). T-03-03 is declared in both 03-01 and 03-02 and is counted once.
- T-03-14: the island regexes are targeted by the script `id` attribute and the meta `name`, but not `^...$`-anchored. Every extracted value still goes through JSON.parse and Zod, so the declared control holds.
- T-03-19: the guard header states that native addons are not covered (scripts/offline-guard.ts:7). This is a known limit of the control and not a gap in the declared mitigation.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-10-17 | 32 | 31 | 0 (1 pending-orchestrator: T-03-31) | gsd-security-auditor (HEAD 206dfc4) |
| 2026-10-17 | 32 | 32 | 0 | orchestrator: `/security-review` closed T-03-31 (no findings) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter (after the orchestrator records the T-03-31 `/security-review` result)

**Approval:** verified 2026-10-17 (all 32 threats closed; `/security-review` clean)
