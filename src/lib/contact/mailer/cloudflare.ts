// Cloudflare Email provider for the contact mailer port: the `send_email` Worker binding (EMAIL in
// wrangler.jsonc) through Email Routing. Primary deploy mailer (MAILER=cloudflare).
//
// Invariants:
// - Fixed sender: CLOUDFLARE_FROM is the only `from`, and wrangler.jsonc restricts the binding to
//   that sender and to one verified destination (tests/unit/contact-mailer-cloudflare.test.ts pins
//   the parity). The recipient comes only from CONTACT_TO, never from visitor input (D-21).
// - Plain text only (D-18): the message carries `text`, never `html`, attachments or headers.
// - No SDK and no `cloudflare:workers` import here: the binding is injected, so tests use a fake.
// - Errors never carry visitor data or the provider's message (it may echo addresses); only the
//   original error's `name` survives, because submit.ts logs mailer errors to Worker logs.
import type { ContactEmail, Mailer } from './types';

export const CLOUDFLARE_FROM = {
  name: 'Web Martina Fernandez',
  email: 'web@martifernandez.com',
} as const;

/** The builder form of `send_email`'s `send()` (the documented subset this mailer uses). */
export interface CloudflareEmailMessage {
  from: { email: string; name: string };
  to: string;
  replyTo: string;
  subject: string;
  text: string;
}

/** Structural type for the `send_email` binding (no @cloudflare/workers-types dependency). */
export interface SendEmailBinding {
  send(message: CloudflareEmailMessage): Promise<unknown>;
}

export function isSendEmailBinding(value: unknown): value is SendEmailBinding {
  return (
    typeof value === 'object' &&
    value !== null &&
    'send' in value &&
    typeof value.send === 'function'
  );
}

export function buildCloudflareMessage(email: ContactEmail): CloudflareEmailMessage {
  return {
    from: { email: CLOUDFLARE_FROM.email, name: CLOUDFLARE_FROM.name },
    to: email.to,
    replyTo: email.replyTo,
    subject: email.subject,
    text: email.text,
  };
}

export function createCloudflareMailer(options: { binding: SendEmailBinding; to: string }): Mailer {
  const { binding, to } = options;
  return {
    name: 'cloudflare',
    to,
    async send(email) {
      try {
        await binding.send(buildCloudflareMessage(email));
      } catch (error) {
        const name = error instanceof Error ? error.name : 'unknown';
        // No `cause` on purpose: the provider error may echo the visitor's address (T-q261110voa-02).
        // eslint-disable-next-line preserve-caught-error -- dropping the cause is the point
        throw new Error(`cloudflare email send failed (${name})`);
      }
    },
  };
}
