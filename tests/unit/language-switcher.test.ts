import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import LanguageSwitcher from '../../src/components/global/LanguageSwitcher.astro';

async function render(locale: 'en' | 'es', pathname: string): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(LanguageSwitcher, { props: { locale, pathname } });
}

function linkTag(html: string, hreflang: string): string {
  const match = new RegExp(`<a[^>]*hreflang="${hreflang}"[^>]*>`).exec(html);
  expect(match).not.toBeNull();
  return match?.[0] ?? '';
}

describe('LanguageSwitcher', () => {
  it('on /es/ marks ES as current and links EN to /', async () => {
    const html = await render('es', '/es/');
    expect(html).toContain('aria-label="Idioma"');
    expect(linkTag(html, 'es')).toContain('aria-current="true"');
    const enLink = linkTag(html, 'en');
    expect(enLink).toContain('href="/"');
    expect(enLink).toContain('lang="en"');
    expect(enLink).toContain('aria-label="English"');
    expect(enLink).not.toContain('aria-current');
  });

  it('on / links ES to /es/', async () => {
    const html = await render('en', '/');
    expect(html).toContain('aria-label="Language"');
    const esLink = linkTag(html, 'es');
    expect(esLink).toContain('href="/es/"');
    expect(esLink).toContain('aria-label="Español"');
    expect(linkTag(html, 'en')).toContain('aria-current="true"');
  });

  it('ships no script, button or select', async () => {
    const html = await render('en', '/');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<button');
    expect(html).not.toContain('<select');
  });
});
