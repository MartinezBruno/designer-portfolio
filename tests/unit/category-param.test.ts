import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ALL_CATEGORIES,
  parseCategoryParam,
  withCategory,
} from '../../src/lib/projects/category-param';

const ALLOWED = ['web-design', 'branding'] as const;

describe('parseCategoryParam', () => {
  it('returns an allow-listed category id', () => {
    expect(parseCategoryParam('?category=web-design', ALLOWED)).toBe('web-design');
    expect(parseCategoryParam('?a=1&category=branding', ALLOWED)).toBe('branding');
  });

  it('accepts a search string without the leading ?', () => {
    expect(parseCategoryParam('category=branding', ALLOWED)).toBe('branding');
  });

  it('uses the empty string for All', () => {
    expect(ALL_CATEGORIES).toBe('');
  });

  it.each([
    [''],
    ['?category='],
    ['?category=all'],
    ['?category=Web-Design'],
    ['?category=photography'],
    ['?category=x&category=web-design'],
    ['?category=web-design&category=web-design'],
    ['?service=web-design'],
    ['?category=%3Cscript%3E'],
    ['?category=x"],body'],
  ])('falls back to All for %j', (search) => {
    expect(parseCategoryParam(search, ALLOWED)).toBe(ALL_CATEGORIES);
  });

  it('falls back to All when nothing is allowed', () => {
    expect(parseCategoryParam('?category=web-design', [])).toBe(ALL_CATEGORIES);
  });

  it('imports nothing', () => {
    const source = readFileSync(resolve('src/lib/projects/category-param.ts'), 'utf8');
    const imports = [...source.matchAll(/from '([^']+)'/g)].map((m) => m[1]);
    expect(imports).toEqual([]);
  });
});

describe('withCategory', () => {
  it('sets the param and keeps other params and the hash', () => {
    expect(withCategory('https://a.test/projects/?a=1#main', 'branding')).toBe(
      'https://a.test/projects/?a=1&category=branding#main',
    );
  });

  it('replaces an existing value', () => {
    expect(withCategory('https://a.test/projects/?category=branding', 'web-design')).toBe(
      'https://a.test/projects/?category=web-design',
    );
  });

  it('removes the param for All', () => {
    expect(withCategory('https://a.test/projects/?a=1&category=branding#main', '')).toBe(
      'https://a.test/projects/?a=1#main',
    );
    expect(withCategory('https://a.test/projects/?category=branding', '')).toBe(
      'https://a.test/projects/',
    );
  });

  it('collapses repeated values', () => {
    expect(withCategory('https://a.test/projects/?category=x&category=y', 'branding')).toBe(
      'https://a.test/projects/?category=branding',
    );
  });

  it('never changes the origin or path', () => {
    const next = new URL(withCategory('https://a.test/es/projects/?category=//evil.test', ''));
    expect(next.origin).toBe('https://a.test');
    expect(next.pathname).toBe('/es/projects/');
  });
});
