import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import portrait from '../../src/assets/hero/portrait.png';
import ImageModule from '../../src/components/project/ImageModule.astro';
import ProjectCard from '../../src/components/ui/ProjectCard.astro';
import { pictureFormat } from '../../src/lib/ui/picture-format';

function astroFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return astroFiles(path);
    return entry.name.endsWith('.astro') ? [path] : [];
  });
}

function imgTags(html: string): string[] {
  return html.match(/<img\b[^>]*>/g) ?? [];
}

function sourceTags(html: string): string[] {
  return html.match(/<source\b[^>]*>/g) ?? [];
}

function attr(tag: string, name: string): string {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1] ?? '';
}

// Rendered URLs look like /_image?href=...portrait.png...&f=webp, so the format is
// read from the `f` parameter, never from the file name.
function expectAvifSourceAndWebpImg(html: string): void {
  const sources = sourceTags(html);
  expect(sources).toHaveLength(1);
  expect(sources[0]).toContain('type="image/avif"');
  expect(html).not.toContain('type="image/webp"');
  expect(html).not.toContain('type="image/png"');

  const [img] = imgTags(html);
  expect(img).toBeDefined();
  const src = attr(img ?? '', 'src');
  const srcset = attr(img ?? '', 'srcset');
  expect(src).toMatch(/[?&;]f=webp\b/);
  expect(src).not.toMatch(/[?&;]f=png\b/);
  expect(srcset).toMatch(/[?&;]f=webp\b/);
  expect(srcset).not.toMatch(/[?&;]f=png\b/);
}

describe('pictureFormat policy', () => {
  it('is an avif source with a webp img fallback', () => {
    expect(pictureFormat).toEqual({ formats: ['avif'], fallbackFormat: 'webp' });
  });

  it('is spread on every <Picture> in src and no call site sets formats inline', () => {
    const users = astroFiles('src').filter((file) => readFileSync(file, 'utf8').includes('<Picture'));
    const rel = users.map((file) => relative('.', file).split('\\').join('/')).sort();
    expect(rel).toEqual([
      'src/components/project/CollectionModule.astro',
      'src/components/project/ImageModule.astro',
      'src/components/project/NextProjectTeaser.astro',
      'src/components/sections/Hero.astro',
      'src/components/ui/ProjectCard.astro',
    ]);

    let pictures = 0;
    for (const file of users) {
      const text = readFileSync(file, 'utf8');
      const count = text.match(/<Picture\b/g)?.length ?? 0;
      pictures += count;
      expect(text.match(/\{\.\.\.pictureFormat\}/g)?.length ?? 0, file).toBe(count);
      expect(text, file).not.toContain('formats={');
      expect(text, file).not.toContain('fallbackFormat=');
    }
    expect(pictures).toBe(6);
  });
});

describe('rendered picture markup', () => {
  it('ImageModule renders one avif source and a webp img, no png', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(ImageModule, {
      props: {
        image: portrait,
        alt: 'Mart — image 1 of 3',
        widths: [portrait.width],
        fullBleed: true,
        caption: null,
        captionLang: null,
        eager: false,
      },
    });
    expectAvifSourceAndWebpImg(html);
  });

  it('ProjectCard renders one avif source and a webp img, no png', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(ProjectCard, {
      props: {
        project: {
          slug: 'brand-refresh',
          href: '/projects/brand-refresh/',
          title: 'Brand Refresh',
          titleLang: null,
          category: 'Branding',
          tools: ['Figma'],
          summary: 'A full identity refresh for a local bakery.',
          cover: portrait,
          coverAlt: 'Cover of Brand Refresh',
        },
        variant: 'full',
        headingLevel: 2,
        locale: 'en',
        size: 'large',
        eager: false,
      },
    });
    expectAvifSourceAndWebpImg(html);
  });
});
