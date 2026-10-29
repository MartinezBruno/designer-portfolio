import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import portrait from '../../src/assets/hero/portrait.png';
import NextProjectTeaser from '../../src/components/project/NextProjectTeaser.astro';
import ProjectContactBand from '../../src/components/project/ProjectContactBand.astro';
import type { Locale } from '../../src/i18n/config';
import type { TeaserView } from '../../src/lib/projects/model';

const next: TeaserView = {
  slug: 'portfolio-web',
  href: '/projects/portfolio-web/',
  title: 'Portfolio website',
  titleLang: null,
  cover: portrait,
  coverAlt: 'Portfolio website — cover',
};

const previous: TeaserView = {
  slug: 'sistema-visual',
  href: '/projects/sistema-visual/',
  title: 'Visual system',
  titleLang: null,
  cover: portrait,
  coverAlt: 'Visual system — cover',
};

async function band(locale: Locale): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(ProjectContactBand, { props: { locale } });
}

async function teaser(props: {
  next?: TeaserView;
  previous?: TeaserView | null;
  locale?: Locale;
}): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(NextProjectTeaser, {
    props: {
      next: props.next ?? next,
      previous: props.previous === undefined ? previous : props.previous,
      locale: props.locale ?? 'en',
    },
  });
}

function anchors(html: string): string[] {
  return html.match(/<a\b[^>]*>[\s\S]*?<\/a>/g) ?? [];
}

function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

describe('ProjectContactBand', () => {
  it('links the accent button to the Home contact section in English', async () => {
    const html = await band('en');
    const links = anchors(html);
    expect(links).toHaveLength(1);
    expect(links[0]).toContain('href="/#contact"');
    expect(links[0]).toContain('bg-accent');
    expect(text(links[0] ?? '')).toBe("Let's work together");
    expect(html).toContain('aria-labelledby="project-cta-title"');
    expect(html).toMatch(/<h2[^>]*id="project-cta-title"[^>]*>\s*Need something like this\?/);
    expect(html).toContain('bg-surface-alt');
  });

  it('links to the Spanish Home contact section on es', async () => {
    const html = await band('es');
    const links = anchors(html);
    expect(links[0]).toContain('href="/es/#contact"');
    expect(text(links[0] ?? '')).toBe('Trabajemos juntos');
  });

  it('moves only the band contents: h2 lines, body and button wrapper settle', async () => {
    const html = await band('en');
    expect(html).toMatch(/<h2[^>]*data-reveal="lines"/);
    expect(html).toMatch(/<p[^>]*data-reveal="settle"[^>]*data-reveal-delay="140"/);
    expect(html).toMatch(/<div data-reveal="settle" data-reveal-delay="210">\s*<a /);
    const section = /<section[^>]*>/.exec(html)?.[0] ?? '';
    expect(section).not.toContain('data-reveal');
    const field = /<section[^>]*>\s*<div[^>]*>/.exec(html)?.[0] ?? '';
    expect(field).not.toContain('data-reveal');
    for (const link of html.match(/<a [^>]*>/g) ?? []) {
      expect(link).not.toContain('data-reveal');
    }
  });

  it('hides the arrow icon from assistive technology', async () => {
    const html = await band('en');
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
  });
});

describe('NextProjectTeaser', () => {
  it('renders one stretched tile link named "Next project: <title>"', async () => {
    const html = await teaser({});
    const stretched = anchors(html).filter((a) => a.includes('after:absolute'));
    expect(stretched).toHaveLength(1);
    const tile = stretched[0] ?? '';
    expect(tile).toContain('href="/projects/portfolio-web/"');
    expect(tile).toMatch(/^<a[^>]*>\s*<span class="sr-only">Next project:<\/span>/);
    expect(text(tile)).toBe('Next project: Portfolio website');
    expect(html).toMatch(/<h3[^>]*text-4xl/);
    expect(html).toContain('alt="Portfolio website — cover"');
  });

  it('renders the Previous link with its title', async () => {
    const html = await teaser({});
    const prev = anchors(html).find((a) => a.includes('href="/projects/sistema-visual/"'));
    expect(prev).toBeDefined();
    expect(text(prev ?? '')).toBe('Previous: Visual system');
    expect(prev).not.toContain('after:absolute');
  });

  it('keeps heading, Previous, then tile in DOM order', async () => {
    const html = await teaser({});
    const heading = html.indexOf('id="next-project-title"');
    const prev = html.indexOf('href="/projects/sistema-visual/"');
    const tile = html.indexOf('href="/projects/portfolio-web/"');
    expect(heading).toBeGreaterThan(-1);
    expect(heading).toBeLessThan(prev);
    expect(prev).toBeLessThan(tile);
  });

  it('omits the Previous link when there is no previous project', async () => {
    const html = await teaser({ previous: null });
    expect(anchors(html)).toHaveLength(1);
    expect(html).not.toContain('Previous:');
  });

  it('marks fallback titles with their source language', async () => {
    const html = await teaser({
      next: { ...next, title: 'Portfolio web', titleLang: 'es' },
      previous: { ...previous, title: 'Sistema visual', titleLang: 'es' },
    });
    expect(html).toContain('<span lang="es">Portfolio web</span>');
    expect(html).toContain('<span lang="es">Sistema visual</span>');
  });

  it('localizes the labels on es', async () => {
    const html = await teaser({ locale: 'es' });
    expect(html).toContain('Siguiente proyecto');
    expect(html).toContain('Anterior:');
  });

  it('reveals heading, Previous wrapper, cover shutter and title (Phase 6 D-04)', async () => {
    const html = await teaser({});
    expect(html).toMatch(/<h2[^>]*data-reveal="lines"/);
    expect(html).toMatch(
      /<div data-reveal="settle" data-reveal-delay="140">\s*<a[^>]*href="\/projects\/sistema-visual\/"/,
    );
    expect(html).toMatch(
      /<div[^>]*data-reveal="shutter"[^>]*data-reveal-delay="140"[^>]*>\s*<picture/,
    );
    expect(html).toMatch(/<h3[^>]*data-reveal="settle"[^>]*data-reveal-delay="210"/);
    expect(html).not.toMatch(/<h3[^>]*data-reveal="lines"/);
    for (const link of html.match(/<a\b[^>]*>/g) ?? []) {
      expect(link).not.toContain('data-reveal');
    }
    const without = await teaser({ previous: null });
    expect(without).not.toContain('<div data-reveal="settle" data-reveal-delay="140">');
  });

  it('uses no accent fill', async () => {
    const html = await teaser({});
    expect(html).not.toContain('bg-accent');
  });
});
