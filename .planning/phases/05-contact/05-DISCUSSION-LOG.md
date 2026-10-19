# Phase 5: Contact - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-19
**Phase:** 05-contact
**Areas discussed:** Section layout & placement, Service pre-selection, Submit & feedback flow, Email content & delivery

---

## Section layout & placement

| Question | Options | Selected |
|----------|---------|----------|
| Where should the form live? | New Home section above footer / Merge into footer / Separate /contact page | New Home section |
| What sits beside the form? | Pitch + direct email / Form only, centered / You decide | Pitch + direct email |
| Footer change? | Keep footer, drop its #contact id / Slim the footer / You decide | Keep footer, drop id |
| Header Contact target on non-Home pages? | Always Home's form / Stay on page (footer) | Always Home's form |

**Notes:** All recommended options chosen.

---

## Service pre-selection

| Question | Options | Selected |
|----------|---------|----------|
| How does a card lead to the form? | Explicit link in each card / Whole card clickable | Explicit link |
| Field type? | Chip radio group / Native select | Chip radio group |
| Required? | Optional + "Not sure yet" / Required, 4 only / Required, 4 + Other | Optional + "Not sure yet" |
| Mechanism? | Query param + anchor / Anchor + JS click handler / You decide | Query param + anchor |

---

## Submit & feedback flow

| Question | Options | Selected |
|----------|---------|----------|
| No-JS behavior? | Form hidden, mailto shown / Form visible + mailto note / Real no-JS POST | Form hidden, mailto shown |
| Success? | Replace form with thank-you panel / Inline message, form cleared | Thank-you panel |
| Validation timing? | On submit then live per field / On blur / Submit only | On submit then live |
| Turnstile? | Managed compact near submit / Invisible / You decide | Managed compact |
| Failure? | Retry + mailto escape / Retry only | Retry + mailto escape |
| Prefill mailto on failure? | Yes, subject + body / No, plain mailto | Yes |
| Abuse limits? | Length caps + disable while sending / Also rate limiter | Length caps + disable |
| Required fields? | Name, email, message / Email + message only | Name, email, message |

---

## Email content & delivery

| Question | Options | Selected |
|----------|---------|----------|
| Email language? | Always Spanish + note visitor locale / Visitor's locale / Always English | Always Spanish + locale note |
| Subject? | Service + name / Fixed subject | Service + name |
| Body? | Plain text + reply-to / HTML + text + reply-to | Plain text + reply-to |
| Auto-reply? | No, on-page only / Yes, after deploy | No |
| Provider selection? | Env var, console default / Auto: Resend if key present | Env var, console default |
| Recipient? | Env var CONTACT_TO / Reuse site.email | CONTACT_TO |
| Reply promise? | Generic "soon" / Specific "within 48 hours" | **Specific: within 48 hours** (only non-recommended pick) |

---

## Claude's Discretion

- Section headline/invitation copy and card link wording
- Exact length caps and message minimum
- Honeypot technique and optional time-to-submit check
- Visual design of chips, errors, panel, Turnstile placement (UI-SPEC + taste skill)
- Client response for honeypot-flagged bots
- Server mechanism (Action vs on-demand route): research decides

## Deferred Ideas

- Auto-reply email to visitor (with DEPLOY-02)
- Per-IP rate limiting at deploy
- HTML-branded notification email
