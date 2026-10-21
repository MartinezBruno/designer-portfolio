import { z } from 'astro/zod';
import { describe, expect, it } from 'vitest';
import services from '../../src/data/services.json';
import {
  EMAIL_PATTERN,
  FIELD_NAMES,
  HONEYPOT,
  LIMITS,
  SERVICE_CHOICES,
  SERVICE_IDS,
  TURNSTILE_FIELD,
  isServiceChoice,
} from '../../src/lib/contact/fields';

describe('SERVICE_IDS', () => {
  it('matches the ids in src/data/services.json in order (drift guard)', () => {
    const ids = [...services].sort((a, b) => a.order - b.order).map((service) => service.id);
    expect([...SERVICE_IDS]).toEqual(ids);
  });

  it('SERVICE_CHOICES is SERVICE_IDS plus other, last', () => {
    expect([...SERVICE_CHOICES]).toEqual([...SERVICE_IDS, 'other']);
  });
});

describe('EMAIL_PATTERN', () => {
  it('is the same regex as zod z.regexes.email (parity guard)', () => {
    expect(EMAIL_PATTERN.source).toBe(z.regexes.email.source);
    expect(EMAIL_PATTERN.flags).toBe(z.regexes.email.flags);
  });
});

describe('isServiceChoice', () => {
  it.each(['branding', 'other', 'graphic-design', 'web-design', 'social-media'])(
    'accepts %s',
    (value) => {
      expect(isServiceChoice(value)).toBe(true);
    },
  );

  it.each(['Branding', '', 'logo', null, undefined])('rejects %s', (value) => {
    expect(isServiceChoice(value)).toBe(false);
  });
});

describe('constants', () => {
  it('LIMITS has the D-09 values', () => {
    expect(LIMITS).toEqual({ name: 100, email: 254, messageMin: 10, messageMax: 5000 });
  });

  it('field names', () => {
    expect(HONEYPOT).toBe('extra_info');
    expect(TURNSTILE_FIELD).toBe('cf-turnstile-response');
    expect([...FIELD_NAMES]).toEqual(['name', 'email', 'message']);
  });
});
