---
phase: 1
slug: bilingual-walking-skeleton
status: approved-for-execution
nyquist_compliant: true
wave_0_complete: false
created: 2026-10-16
revised: 2026-10-16
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `01-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.5 (+ happy-dom 21.0.3) for unit · Playwright 1.64.1 + @axe-core/playwright 4.14.0 for e2e · `astro check` as type gate |
| **Config file** | none — Wave 0 installs (`vitest.config.ts`, `playwright.config.ts`, `eslint.config.js`, `.prettierrc.json`) |
| **Quick run command** | `pnpm lint && pnpm test` |
| **Full suite command** | `pnpm verify` (= `pnpm lint && pnpm test && pnpm test:e2e && pnpm check:secrets`; `test:e2e` runs `astro build` first) |
| **Estimated runtime** | ~60 seconds (full suite; unit ~0.5 s in research spike) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm lint && pnpm test`
- **After every plan wave:** Run `pnpm verify`
- **Before `/gsd:verify-work`:** `pnpm verify` green + `pnpm dev` smoke (`pnpm astro dev --background` → `curl -sf localhost:4321/ && curl -sf localhost:4321/es/` → `pnpm astro dev stop`)
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

Task IDs use `{plan}-T{n}`.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-T1 | 01-01 | 1 | FND-01 (package approval) | T-01-SC | No install before human legitimacy approval | checkpoint | `test ! -f package.json` (pre-approval) | n/a | ⬜ pending |
| 01-01-T2 | 01-01 | 1 | FND-01, FND-04 | T-01-SC, T-01-01, T-01-02 | `.dev.vars`/`.env.*` ignored, `.env.example` not; CLAUDE.md untouched; pinned versions incl. @types/node | scaffold gate | `test ! -d tmp-scaffold && git diff --quiet CLAUDE.md && pnpm exec astro --version && git check-ignore -q .dev.vars && git check-ignore -q .env.local && ! git check-ignore -q .env.example` | ❌ W0 | ⬜ pending |
| 01-01-T3 | 01-01 | 1 | FND-01, FND-02 | — | — | config gate + RED e2e | `pnpm exec eslint . && pnpm exec prettier --check . && (pnpm test:e2e; test $? -ne 0)` | ❌ W0 | ⬜ pending |
| 01-01-T4 | 01-01 | 1 | FND-01, FND-02, FND-04, I18N-01 | T-01-01 | `check:secrets` fails on planted `dist/.env` | unit + e2e + script | `pnpm lint && pnpm test && pnpm test:e2e && pnpm check:secrets` (+ planted-file negative) | ❌ W0 | ⬜ pending |
| 01-02-T1 | 01-02 | 2 | I18N-02, I18N-03, I18N-06 | T-02-01 | — | RED e2e | `pnpm test:e2e` (expected non-zero) | ❌ | ⬜ pending |
| 01-02-T2 | 01-02 | 2 | I18N-05 | — | — | unit + type | `pnpm test && pnpm lint` (`tests/unit/{i18n,dictionary-types,routes}.test.ts`) | ❌ | ⬜ pending |
| 01-02-T3 | 01-02 | 2 | I18N-02, I18N-03, I18N-06 | T-02-01 | No browser-language reads in `src/` | unit + e2e | `pnpm lint && pnpm test && pnpm test:e2e && pnpm check:secrets` | ❌ | ⬜ pending |
| 01-03-T1 | 01-03 | 3 | HOME-01, FND-03, I18N-06 | T-03-01 | Socials `rel="noopener noreferrer"` asserted | RED e2e | `pnpm test:e2e` (expected non-zero) | ❌ | ⬜ pending |
| 01-03-T2 | 01-03 | 3 | HOME-01, FND-03 | T-03-SC | Fonts from local package files, no CDN; stand-in portrait alt says placeholder | build | `pnpm build && ls dist/_astro/fonts/*.woff2 && pnpm lint && pnpm test` | ❌ | ⬜ pending |
| 01-03-T3 | 01-03 | 3 | HOME-01, FND-03, I18N-06 | T-03-01 | — | unit + e2e | `pnpm lint && pnpm test && pnpm test:e2e && pnpm check:secrets` (`tests/e2e/{home,layout}.spec.ts`, `tests/unit/site-footer.test.ts`) | ❌ | ⬜ pending |
| 01-04-T1 | 01-04 | 4 | I18N-04, I18N-07 | T-04-01 | 404s are `noindex` | RED e2e | `pnpm test:e2e` (expected non-zero) | ❌ | ⬜ pending |
| 01-04-T2 | 01-04 | 4 | I18N-04 | T-04-02 | canonical built only from `site.url` | unit + e2e | `pnpm test && pnpm lint && pnpm build && pnpm exec playwright test tests/e2e/seo.spec.ts` | ❌ | ⬜ pending |
| 01-04-T3 | 01-04 | 4 | I18N-07 | T-04-01 | 404 never echoes request path | unit + e2e | `pnpm lint && pnpm test && pnpm test:e2e && pnpm check:secrets` | ❌ | ⬜ pending |
| 01-05-T1 | 01-05 | 5 | SC5, UI-SPEC a11y | — | — | RED e2e | `pnpm test:e2e` (expected non-zero on `data-motion="on"`) | ❌ | ⬜ pending |
| 01-05-T2 | 01-05 | 5 | SC5 gate + registry | T-05-02, T-05-SC | Failing effect isolated | unit | `pnpm vitest run tests/unit/motion-gate.test.ts tests/unit/lifecycle.test.ts && pnpm lint` | ❌ | ⬜ pending |
| 01-05-T3 | 01-05 | 5 | FND-01, FND-02, HOME-01, I18N-06 | T-05-01 | Single `set:html` (build-time constant); inline head script contains matchMedia + prefers-reduced-motion | full gate | `pnpm verify` + dev smoke | ❌ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Scaffold + configs: `package.json`, `astro.config.ts`, `tsconfig.json`, `.gitignore` additions (`.dev.vars`, `.env.*`), `.nvmrc`, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `vitest.config.ts`, `playwright.config.ts` (webServer command uses `--ignore-lock`)
- [ ] `scripts/check-secrets.ts`
- [ ] `tests/unit/` and `tests/e2e/` with at least one passing test each (`html lang` on `/` and `/es/` + axe on both)
- [ ] `pnpm exec playwright install chromium` (already present on this machine per research)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Secrets check negative case | FND (SC1) | Requires planting a real file temporarily, unless covered by unit test of the matcher | Create `dist/.env` with dummy content → `pnpm check:secrets` must exit non-zero → delete file |
| `pnpm dev` serves both locales | FND-01 (SC1) | Long-running process; scripted smoke above is the automated proxy | Run smoke command from Sampling Rate |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved for execution (plan revision 2026-10-16). `wave_0_complete` stays `false` until Plan 01-01 (Wave 1) finishes with `pnpm verify` green.
