// Console provider for the contact mailer port: the v1 default and the local/e2e mailer (D-20).
// It logs exactly the payload Resend would receive (D-18) and sends nothing.
// Local only: the log contains the visitor's name, email and message (PII) by design for v1
// console mode (T-05-12). Production uses MAILER=resend.
import { buildResendBody } from './resend';
import type { Mailer } from './types';

export type ConsoleLog = (label: string, payload: string) => void;

const defaultLog: ConsoleLog = (label, payload) => {
  console.info(label, payload);
};

export function createConsoleMailer(to: string, log: ConsoleLog = defaultLog): Mailer {
  return {
    name: 'console',
    to,
    send(email) {
      log('[contact] email', JSON.stringify(buildResendBody(email), null, 2));
      return Promise.resolve();
    },
  };
}
