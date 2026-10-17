import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import portrait from '../../src/assets/hero/portrait.png';
import ProjectCard from '../../src/components/ui/ProjectCard.astro';
import type { TileSize } from '../../src/lib/projects/layout';
import type { ProjectCardView } from '../../src/lib/projects/model';

const baseProject: ProjectCardView = {
  slug: 'brand-refresh',
  href: '/projects/brand-refresh/',
  title: 'Brand Refresh',
  titleLang: null,
  category: 'Branding',
  tools: ['Figma', 'Adobe Illustrator'],
  summary: 'A full identity refresh for a local bakery.',
  cover: portrait,
  coverAlt: 'Cover of Brand Refresh',
};

interface RenderOptions {
  project?: Partial<ProjectCardView>;
  variant?: 'compact' | 'full';
  size?: TileSize;
  eager?: boolean;
}

async function render(options: RenderOptions = {}): Promise<string> {
  const container = await AstroContainer.create();
  const variant = options.variant ?? 'full';
  return container.renderToString(ProjectCard, {
    props: {
      project: { ...baseProject, ...options.project },
      variant,
      headingLevel: variant === 'full' ? 2 : 3,
      locale: 'en',
      size: options.size ?? 'large',
      eager: options.eager ?? false,
    },
  });
}

function classTokens(tag: string): string[] {
  const match = /class="([^"]*)"/.exec(tag);
  return match?.[1]?.split(/\s+/) ?? [];
}

function rootTag(html: string): string {
  return /^<li[^>]*>/.exec(html.trim())?.[0] ?? '';
}

function mediaTag(html: string): string {
  return /<article[^>]*>\s*(<div[^>]*>)/.exec(html)?.[1] ?? '';
}

describe('project card full variant', () => {
  it('renders one link, an h2, the summary, joined tools and a dt per meta item', async () => {
    const html = await render();
    expect(html.match(/<a /g)).toHaveLength(1);
    expect(html).toContain('<h2');
    expect(html).toContain(baseProject.summary);
    expect(html).toContain('Figma, Adobe Illustrator');
    expect(html.match(/<dt/g)).toHaveLength(2);
    expect(html).not.toContain('<time');
  });
});

describe('project card compact variant', () => {
  it('renders an h3 with category but no summary, tools or date', async () => {
    const html = await render({ variant: 'compact' });
    expect(html).toContain('<h3');
    expect(html).not.toContain('<h2');
    expect(html).not.toContain(baseProject.summary);
    expect(html).not.toContain('Figma');
    expect(html).toContain('Branding');
    expect(html).not.toContain('<time');
    expect(html.match(/<a /g)).toHaveLength(1);
  });
});

describe('project card title language', () => {
  it('wraps a fallback title in lang="es"', async () => {
    const html = await render({ project: { titleLang: 'es', title: 'Marca' } });
    expect(html).toMatch(/<span lang="es">Marca<\/span>/);
  });

  it('renders no lang attribute inside the link for a localized title', async () => {
    const html = await render();
    const link = /<a [\s\S]*?<\/a>/.exec(html)?.[0] ?? '';
    expect(link).not.toBe('');
    expect(link).not.toContain('lang=');
  });
});

describe('project card loading', () => {
  it('is eager with high fetch priority when eager', async () => {
    const html = await render({ eager: true });
    expect(html).toContain('loading="eager"');
    expect(html).toContain('fetchpriority="high"');
  });

  it('is lazy without fetchpriority otherwise', async () => {
    const html = await render({ eager: false });
    expect(html).toContain('loading="lazy"');
    expect(html).not.toContain('fetchpriority');
  });

  it('passes intrinsic width and height to the img', async () => {
    const html = await render();
    const img = /<img[^>]*>/.exec(html)?.[0] ?? '';
    expect(img).toMatch(/width="\d+"/);
    expect(img).toMatch(/height="\d+"/);
  });
});

describe('project card size', () => {
  it('large spans 7 columns with a 5/4 cover', async () => {
    const html = await render({ size: 'large' });
    expect(classTokens(rootTag(html))).toContain('md:col-span-7');
    expect(classTokens(rootTag(html))).not.toContain('md:col-start-6');
    expect(classTokens(mediaTag(html))).toContain('aspect-[5/4]');
    expect(classTokens(mediaTag(html))).not.toContain('md:aspect-[7/8]');
  });

  it('small spans 5 columns with a 7/8 cover from md', async () => {
    const html = await render({ size: 'small' });
    expect(classTokens(rootTag(html))).toContain('md:col-span-5');
    expect(classTokens(mediaTag(html))).toEqual(
      expect.arrayContaining(['aspect-[5/4]', 'md:aspect-[7/8]']),
    );
  });

  it('large-end spans 7 columns starting at column 6', async () => {
    const html = await render({ size: 'large-end' });
    expect(classTokens(rootTag(html))).toEqual(
      expect.arrayContaining(['md:col-span-7', 'md:col-start-6']),
    );
    expect(classTokens(mediaTag(html))).toContain('aspect-[5/4]');
  });

  it('third spans 4 columns with an uncropped 5/4 cover', async () => {
    const html = await render({ size: 'third' });
    expect(classTokens(rootTag(html))).toContain('md:col-span-4');
    expect(classTokens(rootTag(html))).not.toContain('md:col-start-6');
    expect(classTokens(mediaTag(html))).toContain('aspect-[5/4]');
    expect(classTokens(mediaTag(html))).not.toContain('md:aspect-[7/8]');
  });

  it('sets responsive sizes per tile size', async () => {
    expect(await render({ size: 'large' })).toContain(
      'sizes="(min-width: 1152px) 625px, (min-width: 768px) 57vw, 100vw"',
    );
    expect(await render({ size: 'small' })).toContain(
      'sizes="(min-width: 1152px) 440px, (min-width: 768px) 40vw, 100vw"',
    );
    expect(await render({ size: 'third' })).toContain(
      'sizes="(min-width: 1152px) 347px, (min-width: 768px) 31vw, 100vw"',
    );
  });
});

describe('project card safety', () => {
  it('escapes a hostile title (T-03-06)', async () => {
    const html = await render({ project: { title: '<script>x</script>' } });
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script');
  });

  it.each(['full', 'compact'] as const)('%s never renders forbidden patterns', async (variant) => {
    for (const size of ['large', 'small', 'large-end', 'third'] as const) {
      const html = await render({ variant, size });
      for (const forbidden of [
        'Image may contain',
        'rounded-',
        'line-clamp',
        'transition',
        'grid-flow-dense',
        'order-',
      ]) {
        expect(html).not.toContain(forbidden);
      }
    }
  });
});
