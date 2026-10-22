/**
 * Server-side only: resolves every `contact.*` dictionary string for one locale, with the
 * render-time tokens already filled ({min} and {max} from LIMITS, {email} from the argument). The
 * form ships the result as JSON in a data attribute, so the browser never bundles the
 * dictionaries. `{name}` and `{service}` stay for the client to fill with what the visitor typed.
 */
import { en } from '../../i18n/ui.en';
import { interpolate } from '../../i18n/interpolate';
import { useTranslations, type Locale, type UIKey } from '../../i18n/t';
import { LIMITS } from './fields';

export type ContactUIKey = Extract<UIKey, `contact.${string}`>;

export type ContactStrings = Readonly<Record<ContactUIKey, string>>;

const isContactKey = (key: string): key is ContactUIKey =>
  key.startsWith('contact.') && Object.hasOwn(en, key);

const CONTACT_KEYS: readonly ContactUIKey[] = Object.keys(en).filter(isContactKey);

// Per-key {max}. Keys without an entry get no {max} value, so their token is left untouched.
const MAX_BY_KEY: Partial<Record<ContactUIKey, number>> = {
  'contact.error.nameTooLong': LIMITS.name,
  'contact.error.emailTooLong': LIMITS.email,
  'contact.error.messageTooLong': LIMITS.messageMax,
};

export function resolveContactStrings(locale: Locale, email: string): ContactStrings {
  const t = useTranslations(locale);
  const resolved: Partial<Record<ContactUIKey, string>> = {};
  for (const key of CONTACT_KEYS) {
    const max = MAX_BY_KEY[key];
    const values: Record<string, string | number> = { min: LIMITS.messageMin, email };
    if (max !== undefined) values['max'] = max;
    resolved[key] = interpolate(t(key), values);
  }
  // Every ContactUIKey is an `en` key, and CONTACT_KEYS lists all of them, so the record is full.
  return resolved as ContactStrings;
}
