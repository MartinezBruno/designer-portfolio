import { describe, expect, it } from 'vitest';
import { CONTACT_ERRORS } from '../../src/lib/contact/errors';
import { FIELD_NAMES } from '../../src/lib/contact/fields';
import { contactSchema } from '../../src/lib/contact/schema';
import { validateContact, type ContactValues } from '../../src/lib/contact/validate';

const valid: ContactValues = {
  name: 'Ana',
  email: 'ana@example.com',
  message: 'Necesito una identidad visual.',
};

// 255 characters, matches EMAIL_PATTERN: too long, not malformed.
const longEmail = `${'a'.repeat(64)}@${'b'.repeat(60)}.${'c'.repeat(60)}.${'d'.repeat(64)}.com`;

describe('validateContact', () => {
  it('reports every empty field with its required key', () => {
    expect(validateContact({ name: '', email: '', message: '' })).toEqual({
      name: CONTACT_ERRORS.nameRequired,
      email: CONTACT_ERRORS.emailInvalid,
      message: CONTACT_ERRORS.messageRequired,
    });
  });

  it('checks the name after trimming and caps it at 100', () => {
    expect(validateContact({ ...valid, name: '   ' }).name).toBe(CONTACT_ERRORS.nameRequired);
    expect(validateContact({ ...valid, name: 'a'.repeat(101) }).name).toBe(
      CONTACT_ERRORS.nameTooLong,
    );
    expect(validateContact({ ...valid, name: ` ${'a'.repeat(100)} ` }).name).toBeUndefined();
  });

  it('trims the email, rejects malformed ones and caps the length', () => {
    expect(validateContact({ ...valid, email: '  ana@example.com ' }).email).toBeUndefined();
    expect(validateContact({ ...valid, email: 'a@b' }).email).toBe(CONTACT_ERRORS.emailInvalid);
    expect(longEmail).toHaveLength(255);
    expect(validateContact({ ...valid, email: longEmail }).email).toBe(CONTACT_ERRORS.emailTooLong);
  });

  it('checks the message length after trimming', () => {
    expect(validateContact({ ...valid, message: '  123456789  ' }).message).toBe(
      CONTACT_ERRORS.messageShort,
    );
    expect(validateContact({ ...valid, message: 'a'.repeat(5001) }).message).toBe(
      CONTACT_ERRORS.messageTooLong,
    );
    expect(validateContact({ ...valid, message: '\n\t ' }).message).toBe(
      CONTACT_ERRORS.messageRequired,
    );
  });

  it('returns no errors for a valid set', () => {
    expect(validateContact(valid)).toEqual({});
  });
});

// Parity with the server schema (D-10): the browser mirror reports the schema's first issue per
// field, and nothing where the schema reports nothing.
const parity: ReadonlyArray<readonly [string, ContactValues]> = [
  ['all empty', { name: '', email: '', message: '' }],
  ['all whitespace', { name: '  ', email: ' ', message: '   ' }],
  ['valid', valid],
  ['unicode name', { ...valid, name: 'José Núñez-Ołeś 李' }],
  ['emoji name', { ...valid, name: 'Ana 🎨' }],
  ['name at 100', { ...valid, name: 'ñ'.repeat(100) }],
  ['name at 101', { ...valid, name: 'a'.repeat(101) }],
  ['padded email', { ...valid, email: '  ana@example.com ' }],
  ['plus email', { ...valid, email: 'ana+portfolio@example.co.uk' }],
  ['no domain dot', { ...valid, email: 'a@b' }],
  ['no at', { ...valid, email: 'ana.example.com' }],
  ['double at', { ...valid, email: 'ana@@example.com' }],
  ['space inside email', { ...valid, email: 'ana lopez@example.com' }],
  ['CRLF in email', { ...valid, email: 'ana@example.com\r\nBcc: x@y.zz' }],
  ['LF inside email', { ...valid, email: 'ana@exa\nmple.com' }],
  ['email at 255', { ...valid, email: longEmail }],
  ['email at 255 and malformed', { ...valid, email: `${'a'.repeat(251)}@b.c` }],
  ['message at 9', { ...valid, message: '123456789' }],
  ['message at 10 padded', { ...valid, message: '  1234567890  ' }],
  ['message at 5000', { ...valid, message: 'a'.repeat(5000) }],
  ['message at 5001', { ...valid, message: 'a'.repeat(5001) }],
  ['multiline message', { ...valid, message: 'Línea uno\r\nLínea dos' }],
];

function schemaFirstIssues(values: ContactValues): Partial<Record<string, string>> {
  const result = contactSchema.safeParse({ ...values, service: 'other', locale: 'en' });
  const first: Partial<Record<string, string>> = {};
  if (result.success) return first;
  for (const issue of result.error.issues) {
    const key = String(issue.path[0]);
    first[key] ??= issue.message;
  }
  return first;
}

describe('validateContact parity with contactSchema', () => {
  it('has at least 15 fixtures', () => {
    expect(parity.length).toBeGreaterThanOrEqual(15);
  });

  for (const [label, values] of parity) {
    it(`agrees on "${label}"`, () => {
      const server = schemaFirstIssues(values);
      const client = validateContact(values);
      for (const field of FIELD_NAMES) {
        expect(client[field], field).toBe(server[field]);
      }
    });
  }
});
