import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import SiteFooter from '../../src/components/global/SiteFooter.astro';
import { site } from '../../src/data/site';

async function render(locale: 'en' | 'es'): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(SiteFooter, { props: { locale } });
}

describe('SiteFooter', () => {
  it('renders the English contact block with inline decorative icons', async () => {
    const html = await render('en');
    expect(html).toContain('id="contact"');
    expect(html).toMatch(/<h2[^>]*>[^<]*Let(?:'|&#39;)s talk/);
    expect(html).toContain(`href="mailto:${site.email}"`);
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('(opens in a new tab)');
    expect(html).not.toContain('<script');
  });

  it('renders the Spanish strings', async () => {
    const html = await render('es');
    expect(html).toContain('Hablemos');
    expect(html).toContain('Martina en Behance');
    expect(html).toContain('(se abre en una pestaña nueva)');
  });

  it('renders Instagram/LinkedIn only when configured', async () => {
    const html = await render('en');
    expect('instagram' in site.socials).toBe(false);
    expect('linkedin' in site.socials).toBe(false);
    expect(html).not.toContain('Instagram');
    expect(html).not.toContain('LinkedIn');
  });

  it('marks every svg as decorative', async () => {
    const html = await render('en');
    const svgs = html.match(/<svg[^>]*>/g) ?? [];
    expect(svgs.length).toBeGreaterThanOrEqual(3);
    for (const svg of svgs) {
      expect(svg).toContain('aria-hidden="true"');
    }
  });
});
