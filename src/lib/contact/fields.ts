/**
 * Contact form constants shared by the server schema (05-04) and the browser script (05-05).
 * Client-safe on purpose: it must never import zod (about 22.7 KB gzip in the browser)
 * or any i18n dictionary.
 */

/** Field length limits (D-09, confirmed in UI-SPEC). */
export const LIMITS = { name: 100, email: 254, messageMin: 10, messageMax: 5000 } as const;

/** Service ids in src/data/services.json `order` order. A unit test guards against drift. */
export const SERVICE_IDS = [
  'graphic-design',
  'web-design',
  'branding',
  'social-media',
  'photography',
] as const;

export type ServiceId = (typeof SERVICE_IDS)[number];

/** Every value the service chips can submit. `other` means "not specified". */
export const SERVICE_CHOICES = [...SERVICE_IDS, 'other'] as const;

export type ServiceChoice = (typeof SERVICE_CHOICES)[number];

export function isServiceChoice(value: string | null | undefined): value is ServiceChoice {
  return SERVICE_CHOICES.some((choice) => choice === value);
}

/**
 * Copy of zod 4.6.7 `z.regexes.email`, so client and server validate with the identical regex
 * without shipping zod to the browser. The parity test in contact-fields.test.ts guards it.
 */
export const EMAIL_PATTERN =
  // eslint-disable-next-line no-useless-escape -- keep the escapes so .source matches zod byte for byte
  /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;

/** Hidden honeypot input name. Checked in submitContact, never through the schema. */
export const HONEYPOT = 'extra_info';

/** Name of the hidden input Turnstile creates inside its container. */
export const TURNSTILE_FIELD = 'cf-turnstile-response';

/** Turnstile widget `action`; siteverify verdicts must echo it (WR-03). */
export const TURNSTILE_ACTION = 'contact';

/** Text fields that can carry a validation error. */
export const FIELD_NAMES = ['name', 'email', 'message'] as const;

export type FieldName = (typeof FIELD_NAMES)[number];
