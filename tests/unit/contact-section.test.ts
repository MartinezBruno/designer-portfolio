import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import ContactSection from '../../src/components/contact/ContactSection.astro';
import { site } from '../../src/data/site';
import { interpolate } from '../../src/i18n/t';
import { en } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';

async function render(locale: 'en' | 'es'): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(ContactSection, { props: { locale } });
}

function classTokens(tag: string): string[] {
  const match = /class="([^"]*)"/.exec(tag);
  return match?.[1]?.split(/\s+/) ?? [];
}

const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/"/g, '&quot;');

describe.each([
  ['en', en],
  ['es', es],
] as const)('ContactSection (%s)', (locale, dict) => {
  it('renders the section frame labelled by its h2', async () => {
    const html = await render(locale);
    const section = /<section[^>]*>/.exec(html)?.[0] ?? '';
    expect(section).toContain('id="contact"');
    expect(section).toContain('aria-labelledby="contact-title"');
    expect(classTokens(section)).toEqual(expect.arrayContaining(['scroll-mt-24', 'max-w-6xl']));

    const h2 = /<h2[^>]*>([\s\S]*?)<\/h2>/.exec(html);
    expect(h2?.[0]).toContain('id="contact-title"');
    expect(h2?.[1]?.trim()).toBe(escapeHtml(dict['contact.heading']));
    expect(classTokens(h2?.[0] ?? '')).toEqual(
      expect.arrayContaining(['font-display', 'text-4xl', 'font-semibold', 'tracking-tight']),
    );
    expect(html).toContain(escapeHtml(dict['contact.intro']));
  });

  it('lays out two columns from lg', async () => {
    const html = await render(locale);
    expect(html).toContain('lg:grid-cols-12');
    expect(html).toContain('lg:col-span-5');
    expect(html).toMatch(/<div[^>]*lg:col-span-7[^>]*data-contact-column/);
  });

  it('offers the direct email link and the socials', async () => {
    const html = await render(locale);
    expect(html).toContain(`href="mailto:${site.email}"`);
    expect(html).toContain(`href="${site.socials.behance}"`);
    expect(html).toContain(escapeHtml(dict['footer.behance']));
  });

  it('ships the no-JS mailto block visible, without noscript', async () => {
    const html = await render(locale);
    const block = /<div[^>]*data-contact-nojs[^>]*>/.exec(html)?.[0] ?? '';
    expect(block).not.toBe('');
    expect(block).not.toMatch(/\bhidden\b/);
    expect(html).toContain(
      escapeHtml(interpolate(dict['contact.nojs.body'], { email: site.email })),
    );
    const subject = encodeURIComponent(dict['contact.nojs.subject']);
    expect(html).toContain(`href="mailto:${site.email}?subject=${subject}"`);
    expect(html).toContain(escapeHtml(dict['contact.nojs.button']));
    expect(html).not.toContain('<noscript');
    expect(html).not.toContain('challenges.cloudflare.com');
  });
});
