/**
 * Picks the contact mailer from env (D-20). Fails loudly: MAILER=resend without its key or
 * recipient throws instead of falling back to console. The recipient comes only from
 * CONTACT_TO, never from visitor input (D-21, T-05-10).
 */
import { createConsoleMailer } from './console';
import { createResendMailer } from './resend';
import type { Mailer } from './types';

export type { ContactEmail, Mailer } from './types';

export interface MailerEnv {
  MAILER: 'console' | 'resend';
  CONTACT_TO: string | undefined;
  RESEND_API_KEY: string | undefined;
}

/** Recipient shown in console logs when CONTACT_TO is not set. Never delivered anywhere. */
export const CONSOLE_PLACEHOLDER_TO = 'inbox@example.invalid';

function present(value: string | undefined): string | undefined {
  return value === undefined || value === '' ? undefined : value;
}

export function createMailer(env: MailerEnv, fetchFn: typeof fetch): Mailer {
  const to = present(env.CONTACT_TO);
  if (env.MAILER === 'resend') {
    const apiKey = present(env.RESEND_API_KEY);
    if (apiKey === undefined) throw new Error('MAILER=resend requires RESEND_API_KEY');
    if (to === undefined) throw new Error('MAILER=resend requires CONTACT_TO');
    return createResendMailer({ apiKey, to, fetchFn });
  }
  return createConsoleMailer(to ?? CONSOLE_PLACEHOLDER_TO);
}
