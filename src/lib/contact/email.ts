/**
 * Builds the Spanish plain-text email Martina receives for one submission (D-16, D-17, D-18).
 * Pure: no env, no I/O. Never trust client-built strings: every value that reaches the subject
 * goes through sanitizeHeader, and the recipient comes only from `options.to` (server config).
 */
import type { Locale } from '../../i18n/config';
import type { ServiceChoice, ServiceId } from './fields';
import type { ContactEmail } from './mailer/types';

export interface ContactEmailInput {
  name: string;
  email: string;
  message: string;
  service: ServiceChoice;
  locale: Locale;
}

export interface ContactEmailOptions {
  to: string;
  serviceTitlesEs: Readonly<Record<ServiceId, string>>;
}

const HEADER_MAX = 200;
const UNSPECIFIED = 'Sin especificar';
const SITE_LANGUAGE: Readonly<Record<Locale, string>> = {
  en: 'Inglés (EN)',
  es: 'Español (ES)',
};

/**
 * Makes a value safe for a single-line header: C0 controls (including CR, LF, tab) and DEL
 * become spaces, whitespace runs collapse, the result is trimmed and capped at 200 code points.
 */
export function sanitizeHeader(value: string): string {
  // eslint-disable-next-line no-control-regex -- stripping control characters is the point
  const singleLine = value.replace(/[\u0000-\u001f\u007f]/g, ' ');
  const collapsed = singleLine.replace(/\s+/g, ' ').trim();
  return Array.from(collapsed).slice(0, HEADER_MAX).join('').trim();
}

export function buildContactEmail(
  input: ContactEmailInput,
  options: ContactEmailOptions,
): ContactEmail {
  const name = sanitizeHeader(input.name);
  const serviceLabel = sanitizeHeader(
    input.service === 'other' ? UNSPECIFIED : options.serviceTitlesEs[input.service],
  );
  const subject = sanitizeHeader(`Nuevo mensaje web — ${serviceLabel} — ${name}`);
  const text = [
    `Nombre: ${name}`,
    `Email: ${input.email}`,
    `Servicio: ${serviceLabel}`,
    `Idioma del sitio: ${SITE_LANGUAGE[input.locale]}`,
    '',
    'Mensaje:',
    input.message,
  ].join('\n');

  return { to: options.to, replyTo: input.email, subject, text };
}
