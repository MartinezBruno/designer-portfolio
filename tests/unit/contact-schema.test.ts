import { describe, expect, it } from 'vitest';
import { CONTACT_ERRORS } from '../../src/lib/contact/errors';
import { contactSchema } from '../../src/lib/contact/schema';
import { validateContact } from '../../src/lib/contact/validate';

const valid = {
  name: 'Ana',
  email: 'ana@example.com',
  message: 'Necesito una identidad visual.',
  service: 'branding',
  locale: 'es',
  extra_info: null,
  'cf-turnstile-response': 'tok',
};

function issuesFor(input: Record<string, unknown>, path: string): string[] {
  const result = contactSchema.safeParse(input);
  if (result.success) return [];
  return result.error.issues.filter((issue) => issue.path[0] === path).map((i) => i.message);
}

function parse(input: Record<string, unknown>) {
  const result = contactSchema.safeParse(input);
  if (!result.success) throw new Error(JSON.stringify(result.error.issues));
  return result.data;
}

describe('contactSchema name', () => {
  it('requires a name', () => {
    expect(issuesFor({ ...valid, name: null }, 'name')[0]).toBe('contact.error.nameRequired');
    expect(issuesFor({ ...valid, name: '   ' }, 'name')[0]).toBe('contact.error.nameRequired');
  });

  it('caps the name at 100 characters', () => {
    expect(issuesFor({ ...valid, name: 'a'.repeat(101) }, 'name')[0]).toBe(
      'contact.error.nameTooLong',
    );
  });

  it('trims a valid name', () => {
    expect(parse({ ...valid, name: '  Ana  ' }).name).toBe('Ana');
  });
});

describe('contactSchema email', () => {
  it.each([null, '', 'not-an-email', 'a@b.co\r\nBcc: x@y.z'])('rejects %j', (email) => {
    expect(issuesFor({ ...valid, email }, 'email')).toContain('contact.error.emailInvalid');
  });

  it('trims a valid address', () => {
    expect(parse({ ...valid, email: '  ana@example.com  ' }).email).toBe('ana@example.com');
  });

  it('caps the address at 254 characters', () => {
    const email = `${'a'.repeat(68)}@${'b'.repeat(60)}.${'c'.repeat(60)}.${'d'.repeat(60)}.com`;
    expect(email.length).toBe(255);
    expect(issuesFor({ ...valid, email }, 'email')).toContain('contact.error.emailTooLong');
  });
});

describe('contactSchema message', () => {
  it('requires a message and reports only that', () => {
    expect(issuesFor({ ...valid, message: null }, 'message')).toEqual([
      'contact.error.messageRequired',
    ]);
    expect(issuesFor({ ...valid, message: '' }, 'message')).toEqual([
      'contact.error.messageRequired',
    ]);
  });

  it('needs at least 10 characters after trimming', () => {
    expect(issuesFor({ ...valid, message: '  123456789  ' }, 'message')[0]).toBe(
      'contact.error.messageShort',
    );
  });

  it('caps the message at 5000 characters', () => {
    expect(issuesFor({ ...valid, message: 'a'.repeat(5001) }, 'message')[0]).toBe(
      'contact.error.messageTooLong',
    );
  });

  it('counts a multipart CRLF line break as one character, like the browser', async () => {
    // A multi-line message at exactly the limit, as the browser measures it (LF line breaks).
    const lines = Array.from({ length: 50 }, () => 'a'.repeat(99));
    const message = lines.join('\n');
    expect(message.length).toBe(4999);
    const typed = `${message}b`;
    expect(typed.length).toBe(5000);
    expect(validateContact({ name: 'Ana', email: 'ana@example.com', message: typed })).toEqual({});

    // Round-trip through the same multipart encoding the Action client uses.
    const fd = new FormData();
    fd.set('message', typed);
    const wire = await new Response(fd).formData();
    const sent = wire.get('message');
    expect(typeof sent).toBe('string');
    expect(sent).toContain('\r\n');

    const parsed = parse({ ...valid, message: sent });
    expect(parsed.message).toBe(typed);
    expect(issuesFor({ ...valid, message: `${String(sent)}c` }, 'message')[0]).toBe(
      'contact.error.messageTooLong',
    );
  });

  it('normalizes bare CR line breaks to LF', () => {
    expect(parse({ ...valid, message: 'línea uno\rlínea dos' }).message).toBe(
      'línea uno\nlínea dos',
    );
  });
});

describe('contactSchema service and locale', () => {
  it('keeps a known service', () => {
    expect(parse(valid).service).toBe('branding');
  });

  it.each([undefined, null, '', 'Branding'])('falls back to other for %j', (service) => {
    expect(parse({ ...valid, service }).service).toBe('other');
  });

  it('accepts en and es only', () => {
    expect(parse({ ...valid, locale: 'en' }).locale).toBe('en');
    expect(parse({ ...valid, locale: 'es' }).locale).toBe('es');
    expect(contactSchema.safeParse({ ...valid, locale: 'fr' }).success).toBe(false);
  });
});

describe('contactSchema honeypot and token', () => {
  it.each([null, undefined, '', 'x'])('accepts honeypot and token %j', (value) => {
    expect(
      contactSchema.safeParse({ ...valid, extra_info: value, 'cf-turnstile-response': value })
        .success,
    ).toBe(true);
  });

  it('caps the token at 2048 and the honeypot at 500', () => {
    expect(
      contactSchema.safeParse({ ...valid, 'cf-turnstile-response': 'a'.repeat(2049) }).success,
    ).toBe(false);
    expect(contactSchema.safeParse({ ...valid, extra_info: 'a'.repeat(501) }).success).toBe(false);
  });
});

describe('contactSchema messages are dictionary keys', () => {
  const invalid: Record<string, unknown>[] = [
    {},
    { ...valid, name: null, email: null, message: null },
    { ...valid, name: 3, email: 4, message: 5 },
    { ...valid, name: '', email: '', message: '' },
    { ...valid, name: 'a'.repeat(200), email: 'x', message: 'short' },
    { ...valid, message: 'a'.repeat(6000) },
  ];
  const keys: readonly string[] = Object.values(CONTACT_ERRORS);

  it.each(invalid)('only reports CONTACT_ERRORS keys for text fields (%#)', (input) => {
    const result = contactSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (result.success) return;
    const textIssues = result.error.issues.filter((issue) =>
      ['name', 'email', 'message'].includes(String(issue.path[0])),
    );
    expect(textIssues.length).toBeGreaterThan(0);
    for (const issue of textIssues) {
      expect(keys).toContain(issue.message);
      expect(issue.message).not.toContain('Invalid input');
    }
  });
});
