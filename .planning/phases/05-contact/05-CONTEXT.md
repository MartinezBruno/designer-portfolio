# Phase 5: Contact - Context

**Gathered:** 2026-10-19
**Status:** Ready for planning

<domain>
## Phase Boundary

A potential client can send Martina a message from a new Contact section on Home (`/#contact`, `/es/#contact`), in English or Spanish. The form has name, email, message, and an optional service. Service cards link to the form with their service pre-selected (HOME-08). Spam is blocked by a honeypot plus Cloudflare Turnstile, verified server-side. Feedback is localized and announced to screen readers, and typed text survives a failure. Submissions go through a mailer interface: the console provider logs the email in the local v1 build, and a Resend provider is ready behind the same interface. Without JavaScript, the visitor gets a `mailto:` fallback (CONT-01..05, HOME-08).

Not in scope: deployment, real email delivery (DEPLOY-02), auto-reply emails, rate-limiting infrastructure, extra form fields (budget, timeline, attachments).

</domain>

<decisions>
## Implementation Decisions

### Section layout & placement
- **D-01: The form lives in a new Contact section at the end of Home**, directly above the footer. That section takes the `id="contact"` anchor, so the existing `/#contact` links (hero CTA, header nav, Phase 4 detail-page CTA) reach the form without changes.
- **D-02: The section has two columns on desktop and stacks on mobile.** One column holds a short headline/invitation, her direct email (`mailto:`), and her socials. The other holds the form. That mailto doubles as the no-JS fallback (D-12).
- **D-03: The footer stays as it is (email, socials, copyright) on every page. Only its `id="contact"` moves** to the new section (`SiteFooter.astro:22`).
- **D-04: Every "Contact" link on every page goes to Home's form**: `/#contact` (EN) and `/es/#contact` (ES), built with `getRelativeLocaleUrl(locale, '/')`. Today some links are a bare `#contact`, which would scroll to the footer on non-Home pages: the header nav (`SiteHeader.astro:53`), the Projects empty-state CTA (`ProjectsView.astro:36`), and the hero (`Hero.astro:32`, which is fine on Home but should match). Update the keyboard-order and nav e2e tests.

### Service pre-selection (HOME-08)
- **D-05: Each service card gets an explicit text link with an arrow at the bottom** (draft copy: EN "Ask about this", ES "Consultar", final wording up to the UI-SPEC). The whole card is not clickable. The link's accessible name must say which service it is (e.g., visually hidden service title), so four identical "Ask about this" links aren't ambiguous. `ServiceCard.astro` stops being non-interactive. Update its header comment and add one tab stop per card to the keyboard-order e2e test.
- **D-06: The service field is a chip-style radio group** (`<fieldset>` + `<legend>`, native radio inputs styled as pills). All options are visible at once.
- **D-07: The service is optional.** The options are the 4 services (in the Phase 2 order, with labels from the localized service titles) plus **"Not sure yet / Something else"** (ES draft "Aún no lo sé / Otra cosa"). That extra option is selected by default when there's no pre-selection.
- **D-08: Pre-selection uses a query param plus the anchor**: `/?service=<id>#contact` (and `/es/?service=<id>#contact`), where `<id>` is one of the stable Phase 2 ids (`graphic-design`, `web-design`, `branding`, `social-media`). A small script reads the param and checks the matching radio. It ignores unknown values and falls back to the default. Links are shareable and work from any page. Without JS the link still jumps to `#contact`, but the form is hidden (D-12), so no pre-selection is needed there.

### Submit & feedback flow
- **D-09: Required fields are name, email, and message.** The message has a short minimum (about 10 characters). The service is optional (D-07). The server enforces length caps (draft: name ≤ 100, email ≤ 254, message ≤ 5000). The client shows matching `maxlength`/hints. Exact numbers are Claude's discretion.
- **D-10: Validation timing:** nothing shows while the visitor first types. On submit, show an error summary plus per-field messages (linked with `aria-describedby`, `aria-invalid`) and move focus to the first invalid field. After that first submit, each field re-validates live as it's corrected. All messages are localized EN/ES. The server validates with the same rules (Zod via `astro/zod`), and the server's verdict is final.
- **D-11: Success replaces the form with a thank-you panel.** Draft copy: EN "Thanks, {name}! I'll get back to you within 48 hours." / ES "¡Gracias, {name}! Te respondo en menos de 48 horas." Mark it `TODO(martina)` so she can confirm the 48 h promise. Focus moves to the panel heading, and the message is announced through a live region. A "Send another message" button restores an empty form.
- **D-12: No-JS behavior:** the form is hidden, and a clear "Email me at …" `mailto:` block is shown instead. Turnstile needs JS, so a no-JS submit would always fail. Home stays fully static and prerendered. The form markup is revealed only when JS runs (progressive enhancement), so no-JS visitors never type a message they can't send.
- **D-13: Turnstile runs in managed mode with a compact widget**, placed near the submit button and themed to match light/dark. Use Cloudflare's dummy test keys in dev/CI. The token is verified server-side via `siteverify`. Reset the widget after any failed attempt so Retry works.
- **D-14: Failure keeps every field exactly as typed.** A localized error appears near submit (draft: "Couldn't send your message. Try again, or email me directly at …"). It offers Retry and a **mailto link prefilled with what they typed**: the subject includes the service and the body includes the message. The body is URL-encoded and truncated safely so the link stays within practical length limits. This covers network, server, and Turnstile failures. A honeypot hit is rejected server-side. Whether the client shows a bot a "success" or the generic error is Claude's discretion; follow security research.
- **D-15: While sending, the submit button is disabled and shows "Sending…" / "Enviando…"** to prevent double submits. No rate limiter in v1. Turnstile plus the honeypot cover abuse locally.

### Email content & delivery
- **D-16: The email to Martina is always in Spanish** (labels, subject, framing), because her own copy is Spanish. It states which site language the visitor used (EN/ES) so she knows how to reply. The message body is passed through exactly as typed.
- **D-17: The subject is service plus name.** Example: `Nuevo mensaje web — Branding — Ana López`. Use `Sin especificar` when no service was chosen. Strip CR/LF from user values in the subject (header-injection safety).
- **D-18: The email is plain text only** (no HTML template), with `reply_to` set to the visitor's email so she can just hit Reply. The console provider logs exactly the same payload (to, reply_to, subject, text) that the Resend provider would send.
- **D-19: No auto-reply to the visitor.** The on-page thank-you panel is the confirmation.
- **D-20: The provider is chosen by an env var: `MAILER=console|resend`, default `console`**, read via `astro:env/server`. The local v1 build never sends real email. `MAILER=resend` requires `RESEND_API_KEY`, and fails loudly (a clear error, never a silent fallback to console) if it's missing.
- **D-21: The recipient comes from a server-only env var `CONTACT_TO`**, not from the public `site.email`. In console mode a placeholder is fine. Mark the real address `TODO(martina)`, and note that the Resend test sender (`onboarding@resend.dev`) can only deliver to the Resend account owner's address. Secrets go in `.dev.vars` (already gitignored and covered by `pnpm check:secrets`). Add a committed `.dev.vars.example` (or `.env.example`) with placeholder names only.

### Claude's Discretion
- The headline and invitation copy for the contact section (EN source of our draft plus ES, both `TODO(martina)`), and the final link text on the cards.
- The exact length caps and minimum message length (D-09).
- The honeypot field name and hiding technique, and whether to add a minimum time-to-submit check (PITFALLS §11 suggests one).
- The visual design of the chips, error states, thank-you panel, and Turnstile placement, decided in the UI-SPEC with the taste skill (required by PROJECT.md). Keep `#0F70B7` contrast rules from Phase 2 (D-15..D-17).
- What a honeypot-flagged bot sees on the client (D-14).
- The server mechanism (Astro Action vs. one on-demand API route) and adapter wiring: research decides. Pages stay prerendered.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope & requirements
- `.planning/ROADMAP.md` §Phase 5 — goal, success criteria, and the research flag (Astro Actions under static output with `@astrojs/cloudflare` 14 on workerd dev, Turnstile test-key values, Resend test-sender constraint)
- `.planning/REQUIREMENTS.md` — CONT-01..05, HOME-08; DEPLOY-02 (real delivery) stays v2
- `.planning/PROJECT.md` — constraints: taste skill required for all visual work, pre-approved GSD commits, measure, don't add deps until needed, Cloudflare Workers target

### Prior decisions
- `.planning/phases/02-homepage-story/02-CONTEXT.md` — D-05 (stable service ids used by pre-selection), D-07 (service titles), D-15..D-17 (accent `#0F70B7` and contrast/focus rules)
- `.planning/phases/04-project-detail-discovery/04-CONTEXT.md` — D-15 (detail-page contact CTA already targets `/#contact`)

### Research
- `.planning/research/STACK.md` §"Contact form on Cloudflare" — Actions + Turnstile (no npm dep) + Resend, `reply_to`, `astro:env/server`, Resend test-sender limit, Email Routing alternative
- `.planning/research/PITFALLS.md` — Pitfall 10 (secrets, runtime, output mode on Cloudflare), Pitfall 11 (spam + feedback states), focus management for in-page `#contact` links (~line 152), contact checklist (~line 413)
- `.planning/research/ARCHITECTURE.md` — overall structure for the on-demand route alongside prerendered pages

### Design
- `.planning/phases/02-homepage-story/02-UI-SPEC.md` — tokens, typography, service card style the new link must fit
- `.planning/phases/04-project-detail-discovery/04-UI-SPEC.md` — contact band styling, consistent with the new section

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/ServiceCard.astro` / `src/components/sections/FeaturedServices.astro` — cards get the D-05 link; `ServiceView` from `src/lib/content/home.ts` needs to carry the service `id`
- `src/data/services.json` — service ids, order, and localized titles (radio labels for D-07)
- `src/components/ui/ButtonLink.astro`, `IconLink.astro` (new-tab hint pattern), `src/components/global/SiteFooter.astro` (mailto + socials markup to reuse in the section's side column)
- `src/data/site.ts` — public `site.email` (placeholder, `TODO(martina)`) for the visible mailto; not the server recipient (D-21)
- `src/lib/motion/lifecycle.ts` — register the form-enhancement and pre-selection scripts with `AbortController` cleanup, like `src/lib/ui/tooltips.ts` does, so they survive the Phase 7 `<ClientRouter />`
- `src/i18n/ui.en.ts` / `ui.es.ts` + `src/i18n/t.ts` (`interpolate`) — all new strings, including validation messages; a missing ES key already fails type-check
- `scripts/check-secrets.ts` — already scans `.env`/`.dev.vars` values against `dist/`

### Established Patterns
- Thin pages → shared views (`HomeView.astro`) with a `locale` prop; sections are prop-driven
- Pure, unit-testable builders in `src/lib/` (e.g., `home.ts`) — put validation schema, subject/body formatting, and mailto-prefill building in pure modules with Vitest coverage
- Tabler icons as explicit SVG imports; Tailwind only; TypeScript strictest; `motion-safe:` for any motion
- Offline build (`build:offline`, `assert-offline.ts`): the build must not call Turnstile or Resend

### Integration Points
- `src/components/views/HomeView.astro` — add the Contact section after `ToolsRow`
- `SiteHeader.astro:53`, `Hero.astro:32`, `ProjectsView.astro:36` — move to locale-aware `/#contact` (D-04); `SiteFooter.astro:22` loses the id (D-03)
- `astro.config.*` — currently no adapter; Phase 5 adds `@astrojs/cloudflare` (+ `wrangler`) and `env` schema; keep all existing pages prerendered and recheck the offline build and image service (`imageService: 'compile'`)
- Playwright e2e — form flows with Turnstile test keys, no-JS fallback, pre-selection, keyboard order, axe in both locales

</code_context>

<specifics>
## Specific Ideas

- Chips should make the pre-selected service obvious the moment the visitor lands from a card.
- The thank-you panel names the visitor and promises a reply within 48 hours (to be confirmed by Martina).
- Martina's inbox subject line should be scannable: `Nuevo mensaje web — <Servicio> — <Nombre>`.

</specifics>

<deferred>
## Deferred Ideas

- Auto-reply confirmation email to the visitor: needs a verified sending domain, and it's an abuse vector. Revisit with DEPLOY-02.
- Per-IP rate limiting (Cloudflare rate-limiting binding): revisit at deploy if spam gets past Turnstile.
- HTML-branded notification email: plain text is enough for v1.

</deferred>

---

*Phase: 05-contact*
*Context gathered: 2026-10-19*
