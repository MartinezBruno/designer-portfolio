import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseServiceParam } from '../../src/lib/contact/service-param';

describe('parseServiceParam', () => {
  it('returns an allow-listed service id', () => {
    expect(parseServiceParam('?service=branding')).toBe('branding');
    expect(parseServiceParam('?service=other')).toBe('other');
  });

  it('accepts a search string without the leading ?', () => {
    expect(parseServiceParam('service=web-design')).toBe('web-design');
  });

  it.each([
    [''],
    ['?service='],
    ['?service=Branding'],
    ['?service=unknown'],
    ['?service=branding&service=web-design'],
    ['?x=1'],
    ['?service=%3Cscript%3E'],
  ])('falls back to other for %j', (search) => {
    expect(parseServiceParam(search)).toBe('other');
  });

  it('imports no zod, astro:env or dictionaries', () => {
    const source = readFileSync(resolve('src/lib/contact/service-param.ts'), 'utf8');
    expect(source).not.toMatch(/zod|astro:env|ui\.en|ui\.es|i18n\/t/);
  });
});
