// Resend provider for the contact mailer port (CONT-04).
//
// Invariants:
// - Fixed host: the only request goes to RESEND_ENDPOINT (api.resend.com). No URL comes from input.
// - Plain text only (D-18): the body carries `text`, never a rich-markup field.
// - Plain fetch, no SDK ("don't add dependencies until needed"). fetch is injected for tests.
// - Errors carry the HTTP status only, never the response body or visitor data (T-05-11).
// - `onboarding@resend.dev` only delivers to the Resend account owner's own address. Until a
//   sending domain is verified, CONTACT_TO must be that address.
import type { ContactEmail, Mailer } from './types';

// TODO(martina): verified sending domain (DEPLOY-02)
export const CONTACT_FROM = 'Web Martina Fernandez <onboarding@resend.dev>';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const TIMEOUT_MS = 8000;

/** The Resend REST body (snake_case `reply_to`; the SDK would use `replyTo`). */
export interface ResendEmailBody {
  from: string;
  to: string[];
  reply_to: string;
  subject: string;
  text: string;
}

export function buildResendBody(email: ContactEmail): ResendEmailBody {
  return {
    from: CONTACT_FROM,
    to: [email.to],
    reply_to: email.replyTo,
    subject: email.subject,
    text: email.text,
  };
}

export interface ResendMailerOptions {
  apiKey: string;
  to: string;
  fetchFn: typeof fetch;
  idempotencyKey?: () => string;
}

export function createResendMailer(options: ResendMailerOptions): Mailer {
  const { apiKey, to, fetchFn } = options;
  const idempotencyKey = options.idempotencyKey ?? (() => crypto.randomUUID());
  return {
    name: 'resend',
    to,
    async send(email) {
      const res = await fetchFn(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey(),
        },
        body: JSON.stringify(buildResendBody(email)),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`resend ${res.status}`);
    },
  };
}
