/**
 * Contact field error codes. Each value is a dictionary key (UIKey), so the server schema and
 * the browser validator report the same strings and the page translates them with t().
 * Client-safe on purpose (05-06's validator imports it): no zod, no dictionary values.
 */
import type { UIKey } from '../../i18n/t';

export const CONTACT_ERRORS = {
  nameRequired: 'contact.error.nameRequired',
  nameTooLong: 'contact.error.nameTooLong',
  emailInvalid: 'contact.error.emailInvalid',
  emailTooLong: 'contact.error.emailTooLong',
  messageRequired: 'contact.error.messageRequired',
  messageShort: 'contact.error.messageShort',
  messageTooLong: 'contact.error.messageTooLong',
} as const satisfies Record<string, UIKey>;

export type ContactErrorKey = (typeof CONTACT_ERRORS)[keyof typeof CONTACT_ERRORS];
