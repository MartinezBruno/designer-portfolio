import { describe, expect, it } from 'vitest';
import { interpolate as fromInterpolate } from '../../src/i18n/interpolate';
import { interpolate as fromT } from '../../src/i18n/t';
import { en } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';
import { resolveContactStrings } from '../../src/lib/contact/strings';

describe('resolveContactStrings', () => {
  it('returns every contact.* key of the dictionary', () => {
    const strings = resolveContactStrings('es', 'x@y.z');
    const expected = Object.keys(es)
      .filter((key) => key.startsWith('contact.'))
      .sort();
    expect(Object.keys(strings).sort()).toEqual(expected);
    expect(expected.length).toBeGreaterThan(30);
  });

  it('fills {min}, {max} and {email} on the server', () => {
    const strings = resolveContactStrings('es', 'x@y.z');
    expect(strings['contact.message.hint']).toContain('10');
    expect(strings['contact.error.messageShort']).toContain('10');
    expect(strings['contact.error.nameTooLong']).toContain('100');
    expect(strings['contact.error.emailTooLong']).toContain('254');
    expect(strings['contact.error.messageTooLong']).toContain('5000');
    expect(strings['contact.turnstile.error']).toContain('x@y.z');
    expect(strings['contact.failure.body']).toContain('x@y.z');
    for (const value of Object.values(strings)) {
      expect(value).not.toMatch(/\{(min|max|email)\}/);
    }
  });

  it('leaves {name} and {service} for the client', () => {
    const strings = resolveContactStrings('es', 'x@y.z');
    expect(strings['contact.success.body']).toContain('{name}');
    expect(strings['contact.mailto.subject']).toContain('{service}');
    expect(strings['contact.mailto.subject']).toContain('{name}');
  });

  it('uses the requested locale', () => {
    expect(resolveContactStrings('en', 'x@y.z')['contact.submit']).toBe(en['contact.submit']);
    expect(resolveContactStrings('es', 'x@y.z')['contact.submit']).toBe(es['contact.submit']);
  });
});

describe('interpolate', () => {
  it('is the same function from interpolate.ts and t.ts', () => {
    expect(fromT).toBe(fromInterpolate);
  });
});
