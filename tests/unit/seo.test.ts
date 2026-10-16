import { describe, expect, it } from 'vitest';
import type { Locale } from '../../src/i18n/config';
import { stripLocale } from '../../src/i18n/routes';
import { buildSeo } from '../../src/lib/seo';

const fakeAbsolute = (pathname: string, target: Locale): string =>
  `https://x.test${target === 'es' ? '/es' : ''}${stripLocale(pathname)}`;

describe('buildSeo', () => {
  it('builds a self canonical, alternates and OG for an English page', () => {
    const seo = buildSeo(
      { locale: 'en', pathname: '/', kind: 'page', title: 'T', description: 'D' },
      fakeAbsolute,
    );
    expect(seo.canonical).toBe(fakeAbsolute('/', 'en'));
    expect(seo.alternates).toEqual([
      { hreflang: 'en', href: 'https://x.test/' },
      { hreflang: 'es', href: 'https://x.test/es/' },
      { hreflang: 'x-default', href: 'https://x.test/' },
    ]);
    expect(seo.og).toEqual({
      title: 'T',
      description: 'D',
      locale: 'en_US',
      localeAlternate: 'es_ES',
      type: 'website',
      url: seo.canonical,
    });
    expect(seo.robots).toBeUndefined();
  });

  it('localizes canonical and OG locale for a Spanish page', () => {
    const seo = buildSeo(
      { locale: 'es', pathname: '/es/', kind: 'page', title: 'T', description: 'D' },
      fakeAbsolute,
    );
    expect(seo.canonical).toBe(fakeAbsolute('/es/', 'es'));
    expect(seo.canonical).toBe('https://x.test/es/');
    expect(seo.og.locale).toBe('es_ES');
    expect(seo.og.localeAlternate).toBe('en_US');
    expect(seo.og.url).toBe(seo.canonical);
  });

  it('opts 404 pages out of canonical, alternates and og:url and adds noindex', () => {
    const seo = buildSeo(
      { locale: 'en', pathname: '/404/', kind: 'notFound', title: 'NF', description: 'ND' },
      fakeAbsolute,
    );
    expect(seo.robots).toBe('noindex');
    expect(seo.canonical).toBeUndefined();
    expect(seo.alternates).toEqual([]);
    expect(seo.og.url).toBeUndefined();
    expect(seo.title).toBe('NF');
    expect(seo.description).toBe('ND');
    expect(seo.og.title).toBe('NF');
  });

  it('passes the full localized title through unchanged', () => {
    const title = 'Martina Fernandez — Graphic designer';
    const seo = buildSeo(
      { locale: 'en', pathname: '/', kind: 'page', title, description: 'D' },
      fakeAbsolute,
    );
    expect(seo.title).toBe(title);
  });
});
