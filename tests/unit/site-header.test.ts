import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import SiteHeader from '../../src/components/global/SiteHeader.astro';
import { en } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';

async function render(locale: 'en' | 'es', pathname: string): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(SiteHeader, { props: { locale, pathname } });
}

function navHtml(html: string, label: string): string {
  const match = new RegExp(`<nav[^>]*aria-label="${label}"[^>]*>[\\s\\S]*?</nav>`).exec(html);
  expect(match).not.toBeNull();
  return match?.[0] ?? '';
}

function linkTag(html: string, href: string): string {
  const match = new RegExp(`<a[^>]*href="${href}"[^>]*>`).exec(html);
  expect(match).not.toBeNull();
  return match?.[0] ?? '';
}

function classTokens(tag: string | undefined): string[] {
  return /class="([^"]*)"/.exec(tag ?? '')?.[1]?.split(/\s+/) ?? [];
}

const dicts = { en, es } as const;

describe('SiteHeader', () => {
  it.each([
    ['en', '/projects/'],
    ['es', '/es/projects/'],
  ] as const)('on %s %s marks Projects as the current page', async (locale, path) => {
    const nav = navHtml(await render(locale, path), dicts[locale]['nav.label']);
    expect(linkTag(nav, path)).toContain('aria-current="page"');
  });

  it.each([
    ['en', '/', '/projects/'],
    ['es', '/es/', '/es/projects/'],
  ] as const)('on %s %s leaves Projects without aria-current', async (locale, path, href) => {
    const nav = navHtml(await render(locale, path), dicts[locale]['nav.label']);
    expect(linkTag(nav, href)).not.toContain('aria-current');
  });

  it.each([
    ['en', '/projects/'],
    ['es', '/es/projects/'],
  ] as const)('%s nav lists Projects (%s) before Contact', async (locale, href) => {
    const dict = dicts[locale];
    const nav = navHtml(await render(locale, locale === 'en' ? '/' : '/es/'), dict['nav.label']);
    const projectsAt = nav.indexOf(`href="${href}"`);
    const contactAt = nav.indexOf('href="#contact"');
    expect(projectsAt).toBeGreaterThan(-1);
    expect(contactAt).toBeGreaterThan(projectsAt);
    expect(nav).toContain(dict['nav.projects']);
    expect(nav).toContain(dict['nav.contact']);
    expect(nav).toContain('<ul');
  });

  it('uses two rows below sm and one 64px row from sm', async () => {
    const html = await render('en', '/');
    const [, headerTag, wrapperTag] = /(<header[^>]*>)\s*(<div[^>]*>)/.exec(html) ?? [];
    const header = classTokens(headerTag);
    expect(header).toContain('sm:h-16');
    expect(header).not.toContain('h-16');

    const wrapper = classTokens(wrapperTag);
    expect(wrapper).toContain('flex-wrap');
    expect(wrapper).toContain('sm:flex-nowrap');

    const group = classTokens(/<div[^>]*class="[^"]*\bbasis-full\b[^"]*"[^>]*>/.exec(html)?.[0]);
    expect(group).toContain('basis-full');
    expect(group).toContain('sm:basis-auto');
  });
});
