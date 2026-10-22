import { describe, expect, it } from 'vitest';
import { buildPrefilledMailto, MAILTO_MAX_LENGTH } from '../../src/lib/contact/mailto';

const to = 'a@b.co';

function decodedBody(href: string): string {
  const body = new URL(href).searchParams.get('body');
  return body ?? '';
}

describe('buildPrefilledMailto', () => {
  it('caps at 1800 by default', () => {
    expect(MAILTO_MAX_LENGTH).toBe(1800);
  });

  it('encodes subject and body with %20 and CRLF line breaks', () => {
    expect(
      buildPrefilledMailto({ to, subject: 'Branding: message from Ana', body: 'Hola\nMundo' }),
    ).toBe('mailto:a@b.co?subject=Branding%3A%20message%20from%20Ana&body=Hola%0D%0AMundo');
  });

  it('normalizes CRLF, CR and LF to %0D%0A', () => {
    const href = buildPrefilledMailto({ to, subject: 's', body: 'a\r\nb\rc\nd' });
    expect(href).toBe('mailto:a@b.co?subject=s&body=a%0D%0Ab%0D%0Ac%0D%0Ad');
    expect(href).not.toContain('+');
  });

  it('encodes characters that would break the query', () => {
    const href = buildPrefilledMailto({ to, subject: 'a&b=c?', body: '50% #1 & más' });
    expect(href).toBe('mailto:a@b.co?subject=a%26b%3Dc%3F&body=50%25%20%231%20%26%20m%C3%A1s');
  });

  it('truncates a long body to fit and ends it with an ellipsis', () => {
    const body = 'Una idea más. '.repeat(400);
    const href = buildPrefilledMailto({ to, subject: 'Branding: message from Ana', body });
    expect(href.length).toBeLessThanOrEqual(MAILTO_MAX_LENGTH);
    expect(() => decodeURIComponent(href)).not.toThrow();
    const decoded = decodeURIComponent(href);
    expect(decoded.endsWith('…')).toBe(true);
    // As much of the body as fits: one more code point would overflow.
    expect(href.length).toBeGreaterThan(MAILTO_MAX_LENGTH - 12);
  });

  it('honours a custom maxLength', () => {
    const href = buildPrefilledMailto({ to, subject: 's', body: 'x'.repeat(500), maxLength: 100 });
    expect(href.length).toBeLessThanOrEqual(100);
    expect(decodedBody(href).endsWith('…')).toBe(true);
  });

  it('never splits a surrogate pair', () => {
    const body = '🎨'.repeat(1000);
    const href = buildPrefilledMailto({ to, subject: 's', body });
    expect(href.length).toBeLessThanOrEqual(MAILTO_MAX_LENGTH);
    const decoded = decodeURIComponent(href);
    expect(encodeURIComponent(decoded)).toBeTypeOf('string');
    const text = decodedBody(href);
    expect(text.endsWith('…')).toBe(true);
    expect([...text.slice(0, -1)].every((char) => char === '🎨')).toBe(true);
  });

  it('leaves a short body untouched', () => {
    const href = buildPrefilledMailto({ to, subject: 's', body: 'Hola' });
    expect(decodedBody(href)).toBe('Hola');
  });

  it('drops the body when even an empty one does not fit', () => {
    const subject = 'S'.repeat(200);
    // 222 characters without the body; `&body=…` alone would need 15 more.
    const href = buildPrefilledMailto({ to, subject, body: 'Hola', maxLength: 225 });
    expect(href).toBe(`mailto:${to}?subject=${subject}`);
    expect(href.length).toBeLessThanOrEqual(225);
  });
});
