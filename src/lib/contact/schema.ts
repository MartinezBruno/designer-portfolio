/**
 * Server-side contact schema (CONT-01, D-09, D-10). SERVER ONLY: never import this from browser
 * code, it pulls in zod. The browser validator mirrors these rules through fields.ts + errors.ts.
 *
 * Every error message is a dictionary key from CONTACT_ERRORS, never a zod English default:
 * empty form values arrive as null, so each `z.string()` carries its own `error`.
 * The honeypot is accepted here as any short string and checked in submitContact, so a bot gets
 * no field-level hint that the field is a trap.
 */
import { z } from 'astro/zod';
import { locales } from '../../i18n/config';
import { CONTACT_ERRORS } from './errors';
import { EMAIL_PATTERN, HONEYPOT, LIMITS, SERVICE_CHOICES, TURNSTILE_FIELD } from './fields';

/** Turnstile tokens are at most 2048 characters (Cloudflare docs). */
const TOKEN_MAX = 2048;
const HONEYPOT_MAX = 500;

export const contactSchema = z.object({
  name: z
    .string({ error: CONTACT_ERRORS.nameRequired })
    .trim()
    .min(1, { error: CONTACT_ERRORS.nameRequired, abort: true })
    .max(LIMITS.name, { error: CONTACT_ERRORS.nameTooLong }),
  // Trim first, then validate the trimmed value as an email (same regex as the browser).
  email: z
    .string({ error: CONTACT_ERRORS.emailInvalid })
    .trim()
    .pipe(
      z
        .email({ pattern: EMAIL_PATTERN, error: CONTACT_ERRORS.emailInvalid })
        .max(LIMITS.email, { error: CONTACT_ERRORS.emailTooLong }),
    ),
  message: z
    .string({ error: CONTACT_ERRORS.messageRequired })
    .trim()
    .min(1, { error: CONTACT_ERRORS.messageRequired, abort: true })
    .min(LIMITS.messageMin, { error: CONTACT_ERRORS.messageShort })
    .max(LIMITS.messageMax, { error: CONTACT_ERRORS.messageTooLong }),
  // Unknown, missing or empty service means "not specified".
  service: z.enum(SERVICE_CHOICES).catch('other'),
  locale: z.enum(locales),
  [HONEYPOT]: z.string().max(HONEYPOT_MAX).nullish(),
  [TURNSTILE_FIELD]: z.string().max(TOKEN_MAX).nullish(),
});

export type ContactInput = z.output<typeof contactSchema>;
