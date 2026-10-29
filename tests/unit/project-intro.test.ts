import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import portrait from '../../src/assets/hero/portrait.png';
import ProjectIntro from '../../src/components/project/ProjectIntro.astro';
import ToolIcon from '../../src/components/ui/ToolIcon.astro';
import type { ProjectDetailView } from '../../src/lib/projects/model';

const baseDetail: ProjectDetailView = {
  slug: 'brand-refresh',
  title: 'Brand Refresh',
  titleLang: null,
  summary: 'A full identity refresh for a local bakery.',
  category: 'Branding',
  tools: [
    { name: 'Figma', icon: 'figma' },
    { name: 'Blender', icon: null },
  ],
  behanceUrl: 'https://www.behance.net/gallery/1/brand-refresh',
  cover: portrait,
  coverAlt: 'Brand Refresh — cover',
  seo: { title: 'Brand Refresh — Martina Fernandez', description: 'A refresh.' },
  next: null,
  previous: null,
  modules: [],
};

async function render(detail: Partial<ProjectDetailView> = {}): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(ProjectIntro, {
    props: { detail: { ...baseDetail, ...detail }, locale: 'en' },
  });
}

function classTokens(tag: string): string[] {
  return /class="([^"]*)"/.exec(tag)?.[1]?.split(/\s+/) ?? [];
}

describe('ProjectIntro', () => {
  it('renders one 36px display h1 with the title', async () => {
    const html = await render();
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    const h1 = /<h1[^>]*>/.exec(html)?.[0] ?? '';
    expect(h1).toContain('id="project-title"');
    expect(classTokens(h1)).toEqual(
      expect.arrayContaining(['font-display', 'text-4xl', 'font-semibold', 'tracking-tight']),
    );
    expect(html).toContain('Brand Refresh');
    expect(html).not.toMatch(/<h1[^>]*>\s*<span lang/);
  });

  it('marks a fallback title with its source language', async () => {
    const html = await render({ title: 'Posts de motos', titleLang: 'es' });
    expect(html).toMatch(/<h1[^>]*>\s*<span lang="es">Posts de motos<\/span>/);
  });

  it('shows visible category and tools labels', async () => {
    const html = await render();
    const dts = [...html.matchAll(/<dt([^>]*)>([^<]*)<\/dt>/g)];
    expect(dts.map((match) => match[2])).toEqual(['Category', 'Tools']);
    for (const match of dts) {
      expect(match[1]).not.toContain('sr-only');
      expect(classTokens(match[1] ?? '')).toEqual(
        expect.arrayContaining(['text-sm', 'text-ink-muted']),
      );
    }
    expect(html).toContain('Branding');
  });

  it('renders matched tools with a 20px icon and unmatched tools as text only', async () => {
    const html = await render();
    const items = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((match) => match[1] ?? '');
    expect(items).toHaveLength(2);
    expect(items[0]).toMatch(/<svg[^>]*class="size-5"/);
    expect(items[0]).toContain('Figma');
    expect(items[1]).not.toContain('<svg');
    expect(items[1]?.trim()).toBe('Blender');
  });

  it('omits empty groups and the summary', async () => {
    const html = await render({ summary: null, category: null, tools: [] });
    expect(html).not.toContain('<dl');
    expect(html).not.toContain(baseDetail.summary);
    expect(html.match(/<p[\s>]/g)).toHaveLength(1);
  });

  it('links to Behance in a new tab with a hint', async () => {
    const html = await render();
    const link = /<a [^>]*>/.exec(html)?.[0] ?? '';
    expect(link).toContain(`href="${baseDetail.behanceUrl}"`);
    expect(link).toContain('target="_blank"');
    expect(link).toContain('rel="noopener noreferrer"');
    expect(link).not.toContain('aria-label');
    expect(html).toContain('View on Behance');
    expect(html).toContain('<span class="sr-only">(opens in a new tab)</span>');
  });

  it('splits the h1 into lines and keeps a lang span intact (Phase 6 D-04)', async () => {
    const h1 = /<h1[^>]*>/.exec(await render())?.[0] ?? '';
    expect(h1).toContain('data-reveal="lines"');
    const marked = await render({ title: 'Posts de motos', titleLang: 'es' });
    expect(marked).toMatch(/<h1[^>]*data-reveal="lines"[^>]*>\s*<span lang="es">Posts de motos/);
  });

  it('settles the summary, each meta group and the Behance row, never the link', async () => {
    const html = await render();
    expect(html).toMatch(/<p[^>]*data-reveal="settle"[^>]*data-reveal-delay="140"[^>]*>\s*A full/);
    expect(html).toMatch(/<dl[^>]*data-reveal-stagger="70"/);
    const groups = html.match(/<div[^>]*data-reveal="settle" data-reveal-delay="210"/g) ?? [];
    expect(groups).toHaveLength(2);
    expect(html).toMatch(/<p data-reveal="settle" data-reveal-delay="350">\s*<a /);
    for (const link of html.match(/<a [^>]*>/g) ?? []) {
      expect(link).not.toContain('data-reveal');
    }
  });

  it('never renders the cover image', async () => {
    const html = await render();
    expect(html).not.toContain('<img');
  });
});

describe('ToolIcon size', () => {
  it('defaults to 32px and renders 20px for sm', async () => {
    const container = await AstroContainer.create();
    const lg = await container.renderToString(ToolIcon, { props: { name: 'figma' } });
    const sm = await container.renderToString(ToolIcon, { props: { name: 'figma', size: 'sm' } });
    expect(lg).toMatch(/<svg[^>]*class="size-8"/);
    expect(sm).toMatch(/<svg[^>]*class="size-5"/);
  });
});
