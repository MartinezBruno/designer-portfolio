import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import portrait from '../../src/assets/hero/portrait.png';
import LatestWork from '../../src/components/sections/LatestWork.astro';
import type { ProjectCardView } from '../../src/lib/projects/model';
import { en } from '../../src/i18n/ui.en';
import { es } from '../../src/i18n/ui.es';

function project(slug: string): ProjectCardView {
  return {
    slug,
    href: `/projects/${slug}/`,
    title: `Title ${slug}`,
    titleLang: null,
    category: 'Branding',
    year: 2024,
    tools: ['Figma'],
    summary: 'A summary that compact cards never show.',
    cover: portrait,
    coverAlt: `Cover of ${slug}`,
  };
}

const three = [project('one'), project('two'), project('three')];

async function render(
  projects: readonly ProjectCardView[],
  locale: 'en' | 'es' = 'en',
): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(LatestWork, { props: { projects, locale } });
}

function seeAllLink(html: string, href: string): string {
  const match = new RegExp(`<a[^>]*href="${href}"[^>]*>[\\s\\S]*?</a>`).exec(html);
  expect(match).not.toBeNull();
  return match?.[0] ?? '';
}

describe('LatestWork', () => {
  it('renders the labelled section with the heading and 3 h3 cards', async () => {
    const html = await render(three);
    expect(html).toContain('aria-labelledby="work-title"');
    expect(html).toMatch(/<h2[^>]*id="work-title"[^>]*>\s*Latest work\s*<\/h2>/);
    expect(html.match(/<h3/g)).toHaveLength(3);
  });

  it('links to /projects/ with See all and an aria-hidden icon (en)', async () => {
    const link = seeAllLink(await render(three), '/projects/');
    expect(link).toContain(en['work.seeAll']);
    expect(link).toMatch(/<svg[^>]*aria-hidden="true"/);
  });

  it('links to /es/projects/ with the Spanish label (es)', async () => {
    const html = await render(three, 'es');
    expect(html).toContain(es['work.heading']);
    expect(seeAllLink(html, '/es/projects/')).toContain(es['work.seeAll']);
  });

  it('lays the cards out as an even row of 4-column tiles', async () => {
    const html = await render(three);
    const tiles = html.match(/<li[^>]*class="[^"]*"/g) ?? [];
    expect(tiles).toHaveLength(3);
    for (const tile of tiles) {
      expect(tile).toContain('md:col-span-4');
      expect(tile).not.toMatch(/md:col-span-[57]|md:col-start-6/);
    }
    expect(html).not.toContain('md:aspect-[7/8]');
  });

  it('renders compact cards without summary or tools', async () => {
    const html = await render(three);
    expect(html).not.toContain('A summary that compact cards never show.');
    expect(html).not.toContain(en['projects.meta.tools']);
  });

  it('renders fewer cards when fewer projects are visible', async () => {
    const html = await render([project('solo')]);
    expect(html.match(/<h3/g)).toHaveLength(1);
    expect(html).toContain(en['work.seeAll']);
  });

  it('renders nothing when there are no projects', async () => {
    const html = await render([]);
    expect(html.trim()).toBe('');
  });
});
