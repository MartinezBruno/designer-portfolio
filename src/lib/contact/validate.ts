/**
 * Browser mirror of the server contact schema (schema.ts, D-10). It shares LIMITS, EMAIL_PATTERN
 * and CONTACT_ERRORS with the schema and never imports zod, so the client bundle stays small. It
 * only drives the UX: the server verdict is final. The parity table in contact-validate.test.ts
 * keeps both in step, check for check and in the same order.
 */
import { CONTACT_ERRORS, type ContactErrorKey } from './errors';
import { EMAIL_PATTERN, LIMITS, type FieldName } from './fields';

export interface ContactValues {
  name: string;
  email: string;
  message: string;
}

/** The first error per field, as a dictionary key. A missing field means it is valid. */
export type FieldErrors = Partial<Record<FieldName, ContactErrorKey>>;

function nameError(raw: string): ContactErrorKey | undefined {
  const name = raw.trim();
  if (name.length < 1) return CONTACT_ERRORS.nameRequired;
  if (name.length > LIMITS.name) return CONTACT_ERRORS.nameTooLong;
  return undefined;
}

// The schema checks the pattern before the length, so a long malformed address is "invalid".
function emailError(raw: string): ContactErrorKey | undefined {
  const email = raw.trim();
  if (!EMAIL_PATTERN.test(email)) return CONTACT_ERRORS.emailInvalid;
  if (email.length > LIMITS.email) return CONTACT_ERRORS.emailTooLong;
  return undefined;
}

function messageError(raw: string): ContactErrorKey | undefined {
  const message = raw.trim();
  if (message.length < 1) return CONTACT_ERRORS.messageRequired;
  if (message.length < LIMITS.messageMin) return CONTACT_ERRORS.messageShort;
  if (message.length > LIMITS.messageMax) return CONTACT_ERRORS.messageTooLong;
  return undefined;
}

const CHECKS: Readonly<Record<FieldName, (raw: string) => ContactErrorKey | undefined>> = {
  name: nameError,
  email: emailError,
  message: messageError,
};

export function validateContact(values: ContactValues): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of ['name', 'email', 'message'] as const) {
    const error = CHECKS[field](values[field]);
    if (error !== undefined) errors[field] = error;
  }
  return errors;
}
