import { describe, expect, it } from 'vitest';
import services from '../../src/data/services.json';
import { buildContactEmail, sanitizeHeader } from '../../src/lib/contact/email';
import type { ContactEmailInput } from '../../src/lib/contact/email';
import type { ServiceId } from '../../src/lib/contact/fields';

const serviceTitlesEs = Object.fromEntries(
  services.map((service) => [service.id, service.title.es]),
) as Record<ServiceId, string>;

const TO = 'inbox@example.invalid';

const base: ContactEmailInput = {
  name: 'Ana López',
  email: 'ana@example.com',
  message: 'Hola\n\nNecesito un logo.',
  service: 'branding',
  locale: 'es',
};

function build(overrides: Partial<ContactEmailInput> = {}) {
  return buildContactEmail({ ...base, ...overrides }, { to: TO, serviceTitlesEs });
}

describe('sanitizeHeader', () => {
  it('turns CR/LF into a single space', () => {
    const out = sanitizeHeader('Ana\r\nBcc: x@y.z');
    expect(out).not.toMatch(/[\r\n]/);
    expect(out).toBe('Ana Bcc: x@y.z');
  });

  it('replaces tabs, C0 controls and DEL with spaces and collapses runs', () => {
    expect(sanitizeHeader('a\tb\u0000c\u001fd\u007fe')).toBe('a b c d e');
    expect(sanitizeHeader('a     b')).toBe('a b');
  });

  it('trims the result', () => {
    expect(sanitizeHeader('  \n Ana \t ')).toBe('Ana');
  });

  it('caps at 200 characters', () => {
    expect(sanitizeHeader('x'.repeat(500))).toHaveLength(200);
  });

  it('caps by code points, never splitting a surrogate pair', () => {
    const out = sanitizeHeader('😀'.repeat(300));
    expect(Array.from(out)).toHaveLength(200);
    expect(out).toBe('😀'.repeat(200));
  });
});

describe('buildContactEmail', () => {
  it('builds the Spanish subject with the service title and name', () => {
    const email = build();
    expect(email.subject).toBe('Nuevo mensaje web — Branding — Ana López');
    expect(email.to).toBe(TO);
    expect(email.replyTo).toBe('ana@example.com');
  });

  it('uses Sin especificar for service other', () => {
    const email = build({ service: 'other' });
    expect(email.subject).toBe('Nuevo mensaje web — Sin especificar — Ana López');
    expect(email.text.split('\n')).toContain('Servicio: Sin especificar');
  });

  it('uses the Spanish service title', () => {
    expect(build({ service: 'web-design' }).subject).toBe(
      'Nuevo mensaje web — Diseño web — Ana López',
    );
  });

  it('writes the Spanish labels and the site language', () => {
    const lines = build().text.split('\n');
    expect(lines).toContain('Nombre: Ana López');
    expect(lines).toContain('Email: ana@example.com');
    expect(lines).toContain('Servicio: Branding');
    expect(lines).toContain('Idioma del sitio: Español (ES)');
    expect(build({ locale: 'en' }).text.split('\n')).toContain('Idioma del sitio: Inglés (EN)');
  });

  it('ends with Mensaje: and the message exactly as typed', () => {
    const message = '  Hola\n\n   Necesito un logo.\n  ';
    const email = build({ message });
    expect(email.text.endsWith(`\nMensaje:\n${message}`)).toBe(true);
  });

  it('never puts a newline from the name into the subject or the Nombre line', () => {
    const email = build({ name: 'Ana\r\nBcc: evil@example.com' });
    expect(email.subject).not.toMatch(/[\r\n]/);
    expect(email.subject).toBe('Nuevo mensaje web — Branding — Ana Bcc: evil@example.com');
    expect(email.text.split('\n')).toContain('Nombre: Ana Bcc: evil@example.com');
  });

  it('caps the whole subject at 200 characters', () => {
    expect(Array.from(build({ name: 'n'.repeat(400) }).subject)).toHaveLength(200);
  });
});
