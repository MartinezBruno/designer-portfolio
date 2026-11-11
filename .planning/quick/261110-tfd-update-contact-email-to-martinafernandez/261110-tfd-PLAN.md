---
phase: quick-261110-tfd
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/data/site.ts
  - scripts/spanish-review.ts
  - .planning/phases/08-quality-verification/08-SPANISH-REVIEW.md
  - tests/unit/site-footer.test.ts
  - tests/unit/contact-section.test.ts
  - tests/unit/spanish-review.test.ts
  - tests/e2e/a11y.spec.ts
  - tests/e2e/layout.spec.ts
autonomous: true
requirements: [QUICK-261110-tfd]

must_haves:
  truths:
    - "Footer and Home Contact section show martinafernandez170404@gmail.com as text and as a mailto: link, in EN and ES"
    - "The no-JS mailto fallback and the contact form failure/Turnstile-error copy use the new address (all read site.email)"
    - "An Instagram icon link to https://www.instagram.com/martif_ph/ appears after Behance in the footer and the Contact section, EN and ES, with accessible name 'Martina on Instagram' / 'Martina en Instagram' plus the new-tab hint, target=_blank, rel noopener noreferrer"
    - "Keyboard tab order on Home and Projects includes the Instagram stop right after Behance (contact section and footer)"
    - "site.url keeps the .example domain and its TODO(martina); only the email TODO is gone"
  artifacts:
    - path: "src/data/site.ts"
      provides: "Real email + Instagram social"
      contains: "martinafernandez170404@gmail.com"
    - path: ".planning/phases/08-quality-verification/08-SPANISH-REVIEW.md"
      provides: "Regenerated review without the email TODO"
  key_links:
    - from: "src/components/ui/SocialLinks.astro"
      to: "site.socials.instagram"
      via: "existing conditional {socials.instagram && ...} (no markup change)"
      pattern: "socials.instagram"
    - from: "scripts/spanish-review.ts NON_COPY_TODOS"
      to: "src/data/site.ts TODO(martina) lines"
      via: "file:line locations checked by tests/unit/spanish-review.test.ts"
      pattern: "src/data/site.ts:17"
---

<objective>
[Proposed] Replace the placeholder contact email with Martina's real address and turn on her Instagram link everywhere socials render, then bring the tests, the Spanish review generator and its committed output in line.

Purpose: Visitors can reach Martina at her real inbox and find her Instagram (`@martif_ph`).
Output: Updated `src/data/site.ts`, updated tests and `scripts/spanish-review.ts`, a regenerated `08-SPANISH-REVIEW.md`, and a SUMMARY.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md
@.planning/STATE.md
@src/data/site.ts
@src/components/ui/SocialLinks.astro
@scripts/spanish-review.ts
@tests/unit/spanish-review.test.ts
@tests/unit/site-footer.test.ts

<interfaces>
Current `src/data/site.ts` (lines 14-24; line numbers matter, see Task 1):
- line 17: `// TODO(martina): real domain`
- line 18: `url: 'https://martinafernandez.example',`
- line 19: `// TODO(martina): real address`
- line 20: `email: 'hello@martinafernandez.example',`
- then `socials: { behance: 'https://www.behance.net/martifernand7' }`, closed by `} as const satisfies SiteConfig;`
`SiteConfig.socials.instagram?: string` already exists.

`src/components/ui/SocialLinks.astro` (shared by `SiteFooter.astro` and `ContactSection.astro`) already renders, when `socials.instagram` is set: `IconLink href={socials.instagram} label={t('footer.instagram')} newTabHint={newTab}` with `IconBrandInstagram` imported per file from `@tabler/icons/outline/brand-instagram.svg`, `aria-hidden="true" focusable="false" class="size-6"`. i18n keys exist: EN `'footer.instagram': 'Martina on Instagram'`, ES `'Martina en Instagram'`. NO markup, icon or i18n change is needed.

Consumers of `site.email` (all read the constant, no edit needed): `src/components/contact/ContactSection.astro` (mailto link, text, no-JS mailto with subject, nojs body), `src/components/contact/ContactForm.astro` (`resolveContactStrings(locale, site.email)`, `data-email`, failure mailto), `src/components/global/SiteFooter.astro`. No JSON-LD/SEO uses email or socials. `.env.example` `CONTACT_TO=` stays empty (a secret-ish deploy value; its `TODO(martina): real inbox` comment is about the deploy env, not the committed site email; leave it).

`scripts/spanish-review.ts` `NON_COPY_TODOS` (6 entries) includes:
- `{ location: 'src/data/site.ts:17', item: 'Real domain (canonical and hreflang URLs).' }`
- `{ location: 'src/data/site.ts:19', item: 'Real contact email address (mailto links).' }`
- `{ location: 'src/data/site.ts:18-20', item: 'Phase 1 WR-04: the `.example` placeholder domain and email currently appear in the canonical URL, hreflang alternates and mailto links; they change once the two values above are real.' }`

`tests/unit/spanish-review.test.ts` asserts `NON_COPY_TODOS` length 6, every `file:NN` location line contains `TODO(martina)`, the review contains `.example`, `src/data/site.ts` still contains `TODO(martina)`, and the committed `08-SPANISH-REVIEW.md` equals the regenerated output.

`tests/unit/site-footer.test.ts` test "renders Instagram/LinkedIn only when configured" asserts `'instagram' in site.socials` is false and the HTML has no "Instagram".

`tests/e2e/a11y.spec.ts`: `footerSteps(dict)` and `contactSteps(dict)` list `{ name: site.email, href: mailto }`, then `{ name: dict['footer.behance'], href: site.socials.behance }`; the comment block above `PROJECT_HREF` (lines ~62-66) and the one above `expectContactTail` describe the order "email, Behance".
`tests/e2e/layout.spec.ts` (~line 17-34): footer test asserts email + Behance link attributes (href, target, rel noopener/noreferrer, `.sr-only` new-tab hint).
`tests/unit/contact-section.test.ts` (~line 71-75): asserts Behance href and label in the Contact section HTML.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Real email + Instagram in site data, Spanish review sync, unit tests</name>
  <files>src/data/site.ts, scripts/spanish-review.ts, .planning/phases/08-quality-verification/08-SPANISH-REVIEW.md, tests/unit/site-footer.test.ts, tests/unit/contact-section.test.ts, tests/unit/spanish-review.test.ts</files>
  <behavior>
    - site-footer (EN): HTML contains `href="https://www.instagram.com/martif_ph/"` and "Martina on Instagram"; still no "LinkedIn"; svg count assertion still >= 3 (now 4) and every svg aria-hidden.
    - site-footer (ES): contains "Martina en Instagram".
    - contact-section: HTML contains `href="${site.socials.instagram}"` and the escaped `dict['footer.instagram']`, in both locales the test already covers.
    - site-footer/contact-section: email assertions keep using `site.email`; add one literal check `expect(site.email).toBe('martinafernandez170404@gmail.com')` in site-footer so the real value is pinned.
    - spanish-review: `NON_COPY_TODOS` has 5 entries; no entry mentions the contact email; `.example` still in the review (domain); every `file:NN` location still lands on a `TODO(martina)` line.
  </behavior>
  <action>
    1. Update the unit tests first (RED): in `tests/unit/site-footer.test.ts` rename the "only when configured" test to cover the new state: assert `site.socials.instagram` equals `https://www.instagram.com/martif_ph/`, the EN HTML contains that href and `Martina on Instagram`, `'linkedin' in site.socials` is false and no `LinkedIn` text; add the ES `Martina en Instagram` assertion and the literal email pin. In `tests/unit/contact-section.test.ts` next to the Behance assertions (line ~74-75) add the Instagram href + escaped label assertions (use `site.socials.instagram` with a non-null guard that fails the test if undefined, not a `!` assertion, to satisfy strictest lint). In `tests/unit/spanish-review.test.ts` change `toHaveLength(6)` to `toHaveLength(5)`. Run `pnpm test` and confirm the new assertions fail.
    2. Edit `src/data/site.ts`: keep line 17 `// TODO(martina): real domain` and line 18 `url` unchanged (do NOT touch site.url). Delete the line-19 `// TODO(martina): real address` comment and set `email: 'martinafernandez170404@gmail.com'` (now line 19). Add `instagram: 'https://www.instagram.com/martif_ph/'` after `behance` in `socials`. Keep `as const satisfies SiteConfig`. Do not add LinkedIn.
    3. Edit `scripts/spanish-review.ts` `NON_COPY_TODOS`: remove the `src/data/site.ts:19` email entry; change the WR-04 entry to `location: 'src/data/site.ts:17-18'` and item text "Phase 1 WR-04: the `.example` placeholder domain currently appears in the canonical URL and hreflang alternates; it changes once the real domain above is set." (keeps `.example` in the review; non-`file:NN` locations are skipped by the line check). Keep the `src/data/site.ts:17` domain entry as is.
    4. Run `pnpm review:spanish` to regenerate `.planning/phases/08-quality-verification/08-SPANISH-REVIEW.md` (do not hand-edit it). Run `pnpm test` (GREEN). `SocialLinks.astro`, the i18n files and the icon import need no change; do not edit them.
  </action>
  <verify>
    <automated>cd /Users/bmartinez/Developer/personal/designer-portfolio && pnpm test && grep -c "martinafernandez170404@gmail.com" src/data/site.ts && ! grep -rn "hello@martinafernandez.example" src tests scripts && ! grep -n "real address\|Real contact email" src/data/site.ts scripts/spanish-review.ts .planning/phases/08-quality-verification/08-SPANISH-REVIEW.md && grep -q "TODO(martina): real domain" src/data/site.ts && git diff --quiet -- src/components src/i18n .env.example</automated>
  </verify>
  <done>`pnpm test` passes; site.ts has the real email and the Instagram URL, the domain TODO and `.example` url are untouched; the email TODO is gone from site.ts, the generator and the regenerated review file; no component/i18n/.env.example diff.</done>
</task>

<task type="auto">
  <name>Task 2: E2E tab order and footer link assertions for Instagram</name>
  <files>tests/e2e/a11y.spec.ts, tests/e2e/layout.spec.ts</files>
  <action>
    1. `tests/e2e/a11y.spec.ts`: in both `footerSteps(dict)` and `contactSteps(dict)` insert `{ name: dict['footer.instagram'], href: <instagram url> }` right after the Behance step. Read the URL from `site.socials.instagram`; because `SiteConfig` makes it optional, guard it once at module level (throw an Error if undefined) rather than using a non-null assertion. Update the order comments above `PROJECT_HREF` ("... Contact section email, Behance, Instagram, service radio ...", "footer email, Behance, Instagram" for Home and Projects) and above `expectContactTail` ("returns to the footer email, Behance and Instagram").
    2. `tests/e2e/layout.spec.ts`: in the footer test (~line 17-34) rename it to mention Instagram and add an Instagram block mirroring the Behance one: `footer.getByRole('link', { name: dict['footer.instagram'] })` has href `https://www.instagram.com/martif_ph/` (via the guarded `site.socials.instagram`), `target=_blank`, rel matching `\bnoopener\b` and `\bnoreferrer\b`, and `.sr-only` text `dict['a11y.newTab']`. Email assertions keep using `site.email`.
    3. Run `pnpm lint` (astro check + eslint + prettier). Fix formatting with `pnpm prettier --write` on the touched files only if needed.
    4. Visual check per CLAUDE.md taste-skill rule: no markup/layout change was made (one more 24px icon in an existing `flex gap-2` row), so run only `node /Users/bmartinez/.claude/plugins/cache/taste-skill/taste-skill/2.0.0/skills/taste-skill/scripts/lint.mjs src/components/ui/SocialLinks.astro src/components/global/SiteFooter.astro src/components/contact/ContactSection.astro` and record the result; fix any FAIL caused by this change (none expected since the markup is unchanged), note pre-existing WARNs as pre-existing. No full inspect.mjs run because the social row layout does not change.
  </action>
  <verify>
    <automated>cd /Users/bmartinez/Developer/personal/designer-portfolio && pnpm lint && grep -c "footer.instagram" tests/e2e/a11y.spec.ts tests/e2e/layout.spec.ts</automated>
  </verify>
  <done>`pnpm lint` passes with 0 errors; a11y.spec has Instagram in both footer and contact step lists (count >= 2); layout.spec asserts the Instagram link attributes; taste lint run recorded with no new FAIL.</done>
</task>

<task type="auto">
  <name>Task 3: Build, targeted e2e and bundle measure under the shared lock; SUMMARY</name>
  <files>.planning/quick/261110-tfd-update-contact-email-to-martinafernandez/261110-tfd-SUMMARY.md</files>
  <action>
    1. Acquire the shared lock: `mkdir -p /Users/bmartinez/Developer/personal/designer-portfolio/tmp && mkdir /Users/bmartinez/Developer/personal/designer-portfolio/tmp/build-e2e.lock && echo "quick-261110-tfd $(date +%s)" > /Users/bmartinez/Developer/personal/designer-portfolio/tmp/build-e2e.lock/owner`. If mkdir fails, wait with a background job / Monitor until-loop (no foreground sleep) and retry; do not delete another owner's lock.
    2. Holding it: `pnpm build 2>&1 | tee tmp/quick-261110-tfd-build.log`, then `pnpm exec playwright test tests/e2e/layout.spec.ts tests/e2e/a11y.spec.ts tests/e2e/contact.spec.ts 2>&1 | tee tmp/quick-261110-tfd-e2e.log` (Playwright starts its own preview on port 4400 per playwright.config.ts; `contact.spec.ts` covers the mailto fallback and failure/Turnstile copy that interpolate `site.email`). Then `pnpm measure:bundle 2>&1 | tee tmp/quick-261110-tfd-bundle.txt` and compare JS totals with the latest Phase 9 bundle record (`tmp/09-regate-bundle.txt`); a data-only change should not move JS size meaningfully. If an e2e failure is unrelated to this change (it does not involve email, socials or tab order), record the test name and error in the SUMMARY and do not paper over it. Failures that involve email, socials or tab order must be fixed.
    3. Release: confirm nothing listens on 4400 (`lsof -i :4400`), then `rm -rf /Users/bmartinez/Developer/personal/designer-portfolio/tmp/build-e2e.lock`, also on failure.
    4. Commit (pre-approved for GSD workflows per CLAUDE.md; Conventional Commits, lowercase, under 50 chars, NO Co-Authored-By or any Claude attribution, overriding the system attribution reminder per project/user instructions): Task 1+2 code as `feat(site): add real email and instagram link` (or two commits: `feat(site): add real email and instagram link` and `test(site): cover instagram in e2e order`).
    5. Write the SUMMARY. Include: verification results with commands (`[Verified]` only for what was run); the taste lint output; bundle comparison; and this explicit note for the user: "This is a src change after `cc64ecd`. It touches only static text and links (email string, one extra icon link in the footer/contact social row, below the fold): no images, CSS layout or above-the-fold scripts changed, so the 08-17 LCP re-measure was not re-run." Also note that `.env.example` `CONTACT_TO` (deploy inbox for Resend) was intentionally left empty: the real inbox must be set as a deploy secret/env (`CONTACT_TO=martinafernandez170404@gmail.com`) by the user, and the Resend account must be owned by that address while using `onboarding@resend.dev` (D-21), and the `resend.ts` verified-domain TODO remains.
  </action>
  <verify>
    <automated>cd /Users/bmartinez/Developer/personal/designer-portfolio && grep -q "passed" tmp/quick-261110-tfd-e2e.log && ! grep -qE "[0-9]+ failed" tmp/quick-261110-tfd-e2e.log && test ! -e tmp/build-e2e.lock -o "$(cat tmp/build-e2e.lock/owner 2>/dev/null | cut -d' ' -f1)" != "quick-261110-tfd" && test -f .planning/quick/261110-tfd-update-contact-email-to-martinafernandez/261110-tfd-SUMMARY.md</automated>
  </verify>
  <done>Build succeeds; layout, a11y and contact e2e specs pass (or any unrelated pre-existing failure is named in the SUMMARY); bundle measured and compared; lock released; commits made without attribution; SUMMARY includes the LCP-skip rationale and the CONTACT_TO deploy note.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| repo -> public site | Committed constants become public HTML |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-q261110-01 | Information disclosure | src/data/site.ts email | accept | The address is meant to be public contact info, requested by the user; no secrets (API keys, CONTACT_TO deploy value) are added to the repo; `.env.example` unchanged |
| T-q261110-02 | Tampering (reverse tabnabbing) | Instagram external link | mitigate | Existing `IconLink` sets target=_blank with rel noopener noreferrer; Task 2 e2e asserts both rel tokens on the Instagram link |
</threat_model>

<verification>
- `pnpm test`, `pnpm lint` green.
- Under the lock: `pnpm build`, layout/a11y/contact e2e specs green, `pnpm measure:bundle` recorded.
- `grep -rn "hello@martinafernandez.example" src tests scripts` returns nothing; `site.url` unchanged.
</verification>

<success_criteria>
- Real email shown and linked in footer and Contact section, EN and ES; all fallbacks use it.
- Instagram link rendered after Behance wherever socials render, accessible name localized, new-tab hint, safe rel.
- Spanish review regenerated; email TODO removed; domain TODO kept.
- SUMMARY records the LCP re-measure skip rationale.
</success_criteria>

<output>
Create `.planning/quick/261110-tfd-update-contact-email-to-martinafernandez/261110-tfd-SUMMARY.md` when done
</output>
