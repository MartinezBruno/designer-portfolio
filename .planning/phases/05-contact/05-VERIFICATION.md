---
phase: 05-contact
verified: 2026-10-28T22:00:00Z
status: human_needed
score: 6/6 requirements verified locally; deploy-time items pending
re_verification:
  previous_status: unknown (earlier uncommitted version, pre-fix)
  gaps_closed: [WR-01, WR-02, WR-03, WR-04]
  regressions: []
human_verification:
  - test: "Set real Turnstile site key (build) and secret (Worker secret)"
    expected: "Widget renders for real visitors; siteverify passes with action=contact"
    why_human: "Real Cloudflare keys do not exist locally"
  - test: "Set MAILER=resend, RESEND_API_KEY, CONTACT_TO, CONTACT_FROM and a verified Resend domain (DEPLOY-02)"
    expected: "A submitted message arrives in Martina's inbox with reply_to = visitor"
    why_human: "External service; local build only logs via console mailer"
  - test: "Replace placeholder site.url (martinafernandez.example) with the real domain; add www/workers.dev aliases to the hostnames list if used"
    expected: "Real-secret siteverify no longer fails with hostname-mismatch"
    why_human: "WR-03 binds to new URL(site.url).hostname; with a real secret and the placeholder, every send fails closed"
  - test: "Confirm CONTACT_ALLOW_TEST_CONFIG is NOT set in production Worker env"
    expected: "Console mailer / test keys refused with send_failed in prod"
    why_human: "Deploy pipeline does not exist yet"
  - test: "Martina reviews TODO(martina) copy (Phase 5 contact copy in ui.en.ts / ui.es.ts, site email/domain)"
    expected: "Final wording approved"
    why_human: "Content decision"
---

# Phase 5: Contact Re-Verification Report (after code-review fixes)

**Phase Goal:** A potential client can send Martina a message in either language, including straight from a service card. Spam is blocked, clear feedback, no-JS fallback.
**Status:** human_needed (all local checks pass; only deploy-time items remain)
**Re-verification:** Yes, after fix commits 7d271b4, c882fa6, 9e70b65, f108f95.

## Evidence run by the verifier

| Check | Result |
| --- | --- |
| `pnpm test` (foreground) | 57 files, 931 tests passed |
| `pnpm verify` (foreground) | exit 0; astro check, eslint, prettier, unit, 559 e2e passed (incl. `@network` success and failure specs, axe), `check:secrets` ok (1005 files). No flake, no rerun needed |

## Fix presence (read in code)

| Fix | Evidence | Verdict |
| --- | --- | --- |
| WR-01 CRLF | `src/lib/contact/schema.ts:38` `.overwrite(v => v.replace(/\r\n?/g, '\n'))` before trim and length checks | Present |
| WR-02 Turnstile recovery | `src/lib/ui/contact-form.ts` `widgetFailed` cleared in widget callback (l.265), checked after token read (l.447), reset on "send another" (l.532) | Present |
| WR-03 action/hostname binding | `src/actions/index.ts` builds `TURNSTILE_BINDING` from `TURNSTILE_ACTION` and `new URL(site.url).hostname`, passed to `verifyTurnstile` | Present |
| WR-04 fail closed | `src/lib/contact/deploy-guard.ts` `contactConfigProblem`; called at the start of the handler before `submitContact`; env `CONTACT_ALLOW_TEST_CONFIG` declared in `astro.config.ts:50` | Present |

## WR-04 local path check

The guard only refuses when `CONTACT_ALLOW_TEST_CONFIG` is false. The flag is true in `scripts/e2e-preview-env.ts:12`, in `.env.example:9`, and in the local gitignored `.dev.vars`. All e2e success specs (console mailer plus test keys) pass under `pnpm verify`, so dev, preview and e2e paths are intact. The default is fail closed, which is the intended behavior change to D-20. Note a developer with a `.dev.vars` lacking the flag will see `send_failed` locally; `.env.example` documents it.

## Requirements coverage

| ID | Status | Evidence |
| --- | --- | --- |
| CONT-01 | SATISFIED | Zod schema with localized error keys, shared client/server fixtures; e2e validation specs EN and ES; CRLF parity (WR-01) |
| CONT-02 | SATISFIED locally | Honeypot, server-side siteverify with action/hostname binding; unit and e2e coverage. Real-key behavior is a deploy item |
| CONT-03 | SATISFIED | Success panel, status region, failure block retaining typed text; axe 0 violations in e2e |
| CONT-04 | SATISFIED | Mailer interface, console default, Resend provider ready; env-guarded. Real delivery is DEPLOY-02 |
| CONT-05 | SATISFIED | No-JS mailto block; e2e no-JS specs pass at 1440 and 390, EN and ES, with no Cloudflare request |
| HOME-08 | SATISFIED | Service-card links to `/?service=<id>#contact` and `/es/?service=<id>#contact`, chip preselection; e2e passes |

All six IDs appear in PLAN frontmatter and in REQUIREMENTS.md (still marked Pending in the checkbox and traceability tables; update to Complete when the phase closes). No orphaned requirements. DEPLOY-02 is v2/deferred scope, not Phase 5.

## Deploy consequences (not gaps)

- With a real Turnstile secret and the placeholder `site.url`, every send fails closed with `hostname-mismatch`. Update `site.url` before DEPLOY-02, and add alias hostnames if needed.
- Cloudflare test secrets skip the action/hostname checks by design (live siteverify returns no `action` for them).
- Remaining TODO(martina) markers are copy/domain placeholders, each tagged with a named owner, not unreferenced debt markers (no TBD/FIXME/XXX found in the grep for TODO(martina) scope).

## Gaps

None blocking. Status is human_needed only because of the deploy-time items in the frontmatter.

_Verified: 2026-10-28 | Verifier: Claude (gsd-verifier)_
