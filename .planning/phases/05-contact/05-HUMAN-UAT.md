---
status: partial
phase: 05-contact
source: [05-VERIFICATION.md]
started: 2026-10-29T00:46:25Z
updated: 2026-10-29T00:46:25Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Real Turnstile keys in production
expected: Build uses a real PUBLIC_TURNSTILE_SITE_KEY; TURNSTILE_SECRET_KEY is set as a Worker secret; the widget shows no "For testing only" strip and a real send passes siteverify.
result: [pending]

### 2. Resend delivery to Martina
expected: MAILER=resend, RESEND_API_KEY, CONTACT_TO and CONTACT_FROM are set (Worker secrets) with a verified Resend sending domain; a real submission arrives in Martina's inbox with reply-to set to the visitor.
result: [pending]

### 3. site.url set to the real domain
expected: site.url is the production domain (plus any www / workers.dev aliases in the allowed hostnames); a real send does not fail with hostname-mismatch.
result: [pending]

### 4. CONTACT_ALLOW_TEST_CONFIG absent in production
expected: The flag is never set on the deployed Worker; a deploy with test keys or MAILER=console shows the failure block, never a false success.
result: [pending]

### 5. Martina's copy, email and domain
expected: All TODO(martina) strings (including the 48-hour reply promise), site.email and the domain are reviewed and replaced by Martina.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
