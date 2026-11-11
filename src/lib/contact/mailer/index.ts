/**
 * Picks the contact mailer from env (D-20). Fails loudly: MAILER=resend without its key, or
 * MAILER=cloudflare without the EMAIL binding, or either without a recipient, throws instead of
 * falling back to console. The recipient comes only from
 * CONTACT_TO, never from visitor input (D-21, T-05-10).
 */
import { createCloudflareMailer, type SendEmailBinding } from './cloudflare';
import { createConsoleMailer } from './console';
import { createResendMailer } from './resend';
import type { Mailer } from './types';

export type { ContactEmail, Mailer } from './types';

export interface MailerEnv {
  MAILER: 'console' | 'resend' | 'cloudflare';
  CONTACT_TO: string | undefined;
  RESEND_API_KEY: string | undefined;
}

/** Recipient shown in console logs when CONTACT_TO is not set. Never delivered anywhere. */
export const CONSOLE_PLACEHOLDER_TO = 'inbox@example.invalid';

function present(value: string | undefined): string | undefined {
  return value === undefined || value === '' ? undefined : value;
}

export interface MailerDeps {
  /** The `send_email` binding (env.EMAIL), resolved by the Action only for MAILER=cloudflare. */
  emailBinding?: SendEmailBinding | undefined;
}

export function createMailer(env: MailerEnv, fetchFn: typeof fetch, deps: MailerDeps = {}): Mailer {
  const to = present(env.CONTACT_TO);
  if (env.MAILER === 'cloudflare') {
    const binding = deps.emailBinding;
    if (binding === undefined) {
      throw new Error('MAILER=cloudflare requires the EMAIL send_email binding');
    }
    if (to === undefined) throw new Error('MAILER=cloudflare requires CONTACT_TO');
    return createCloudflareMailer({ binding, to });
  }
  if (env.MAILER === 'resend') {
    const apiKey = present(env.RESEND_API_KEY);
    if (apiKey === undefined) throw new Error('MAILER=resend requires RESEND_API_KEY');
    if (to === undefined) throw new Error('MAILER=resend requires CONTACT_TO');
    return createResendMailer({ apiKey, to, fetchFn });
  }
  return createConsoleMailer(to ?? CONSOLE_PLACEHOLDER_TO);
}
