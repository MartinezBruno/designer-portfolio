import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import portrait from '../../src/assets/hero/portrait.png';
import ProjectCard from '../../src/components/ui/ProjectCard.astro';
import { sizesFor, tileSizes, type TileSize } from '../../src/lib/projects/layout';
import type { ProjectCardView } from '../../src/lib/projects/model';

const baseProject: ProjectCardView = {
  slug: 'brand-refresh',
  href: '/projects/brand-refresh/',
  title: 'Brand Refresh',
  titleLang: null,
  category: 'Branding',
  categoryId: 'branding',
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

const tileVariants = [
  'group/tile',
  'md:data-[tile=large]:col-span-7',
  'md:data-[tile=small]:col-span-5',
  'md:data-[tile=large-end]:col-span-8',
  'md:data-[tile=large-end]:col-start-3',
  'md:data-[tile=third]:col-span-4',
];
const frameAspect = [
  'aspect-[5/4]',
  'md:group-data-[tile=small]/tile:aspect-[7/8]',
  'group-data-[tile=third]/tile:aspect-[4/5]',
];

describe('project card size (data-tile, 09-05 PROJ-04)', () => {
  it.each(tileSizes)('%s sets data-tile and the same literal variant classes', async (size) => {
    const html = await render({ size });
    const root = rootTag(html);
    expect(root).toContain(`data-tile="${size}"`);
    expect(classTokens(root)).toEqual(expect.arrayContaining(tileVariants));
    expect(classTokens(root)).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/^md:col-(?:span|start)-/)]),
    );
    expect(classTokens(mediaTag(html))).toEqual(expect.arrayContaining(frameAspect));
  });

  it('exposes the category id for the filter', async () => {
    const html = await render({ size: 'small', project: { categoryId: 'web-design' } });
    const root = rootTag(html);
    expect(root).toContain('data-tile="small"');
    expect(root).toContain('data-category="web-design"');
  });

  it('renders an empty data-category when the project has no category', async () => {
    const html = await render({ project: { categoryId: null } });
    expect(rootTag(html)).toMatch(/data-category=""/);
  });

  it.each(tileSizes)('%s sets responsive sizes from layout.ts sizesFor', async (size) => {
    const html = await render({ size });
    const img = /<img[^>]*>/.exec(html)?.[0] ?? '';
    expect(img).toContain(`sizes="${sizesFor[size]}"`);
    for (const source of html.match(/<source[^>]*>/g) ?? []) {
      expect(source).toContain(`sizes="${sizesFor[size]}"`);
    }
  });

  it('keeps the historical sizes strings', async () => {
    expect(await render({ size: 'large' })).toContain(
      'sizes="(min-width: 1408px) 790px, (min-width: 768px) 57vw, 100vw"',
    );
    expect(await render({ size: 'small' })).toContain(
      'sizes="(min-width: 1408px) 560px, (min-width: 768px) 40vw, 100vw"',
    );
    expect(await render({ size: 'third' })).toContain(
      'sizes="(min-width: 1408px) 440px, (min-width: 768px) 31vw, 100vw"',
    );
  });
});

describe('project card reveal hooks', () => {
  it('never shutters the eager (LCP) cover', async () => {
    const html = await render({ eager: true });
    expect(html).not.toContain('data-reveal="shutter"');
    expect(mediaTag(html)).not.toContain('data-reveal');
  });

  it('shutters a lazy cover frame exactly once', async () => {
    const html = await render({ eager: false });
    expect(html.match(/data-reveal="shutter"/g)).toHaveLength(1);
    expect(mediaTag(html)).toContain('data-reveal="shutter"');
  });

  it.each([true, false])('settles one text block (eager: %s)', async (eager) => {
    const html = await render({ eager });
    expect(html.match(/data-reveal="settle"/g)).toHaveLength(1);
    expect(html).not.toContain('data-reveal="lines"');
  });
});

describe('project card hover hooks (Phase 6 MOTN-04)', () => {
  it.each(['full', 'compact'] as const)(
    '%s marks the article, one picture mat and the image',
    async (variant) => {
      for (const eager of [true, false]) {
        const html = await render({ variant, eager });
        expect(html).toMatch(/<article[^>]*\bdata-card\b[^>]*data-cursor="view"/);
        expect(html.match(/data-cursor="view"/g)).toHaveLength(1);
        expect(html.match(/data-card-mat/g)).toHaveLength(1);
        expect(html).toMatch(/<picture[^>]*data-card-mat/);
        expect(html).toMatch(/<picture[^>]*class="block size-full"/);
        expect(html).toMatch(/<img[^>]*data-card-image/);
        expect(html).toMatch(/<img[^>]*class="size-full object-cover object-center"/);
      }
    },
  );

  it('keeps title, summary and meta visible at rest (D-08)', async () => {
    const html = await render();
    const hiddenAtRest = /(?:^|\s)(?:opacity-0|invisible|hidden|sr-only)(?:\s|$)/;
    const tags = [/<h2[^>]*>/, /<p[^>]*>/, /<dl[^>]*>/].map((re) => re.exec(html)?.[0] ?? '');
    for (const tag of tags) {
      expect(tag).not.toBe('');
      expect(classTokens(tag).join(' ')).not.toMatch(hiddenAtRest);
    }
    expect(html).toContain('Brand Refresh');
    expect(html).toContain(baseProject.summary);
    expect(html).toContain('Branding');
    expect(html).toContain('Figma, Adobe Illustrator');
  });
});

describe('project card parallax hooks (07-08 MOTN-06)', () => {
  it('a lazy card has an overflow-clip parallax frame and a parallax image', async () => {
    const html = await render({ eager: false });
    const frame = mediaTag(html);
    expect(frame).toContain('data-parallax-frame');
    expect(classTokens(frame)).toContain('overflow-clip');
    expect(classTokens(frame)).not.toContain('overflow-hidden');
    expect(html).toMatch(/<img[^>]*\bdata-parallax\b(?!-)/);
    expect(html.match(/data-parallax-frame/g)).toHaveLength(1);
    expect(html.match(/data-parallax(?!-)/g)).toHaveLength(1);
  });

  it('the eager (LCP) cover never moves', async () => {
    const html = await render({ eager: true });
    expect(html).not.toContain('data-parallax');
    expect(classTokens(mediaTag(html))).toContain('overflow-clip');
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
