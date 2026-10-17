import { describe, expect, it } from 'vitest';
import portrait from '../../src/assets/hero/portrait.png';
import type { ToolEntry } from '../../src/lib/content/home';
import { buildToolIcons, toDetailView } from '../../src/lib/projects/detail-view-site';
import type { CategoryId, Project } from '../../src/lib/projects/model';

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: '238078789',
    sourceSlug: 'Cabreras-motos-Posts',
    sourceTitle: 'Cabrera´s motos, Posts',
    sourceUrl: 'https://www.behance.net/gallery/238078789/Cabreras-motos-Posts',
    publishedOn: 1762478100,
    tools: ['Figma', 'Adobe Photoshop'],
    cover: portrait,
    imageIds: [],
    slug: 'cabreras-motos-posts',
    title: null,
    summary: null,
    coverAlt: null,
    category: null,
    order: null,
    featured: false,
    hidden: false,
    contentLang: 'es',
    ...overrides,
  };
}

const categoryTitles: Record<CategoryId, string> = {
  'graphic-design': 'Graphic design',
  'web-design': 'Web design',
  branding: 'Branding',
  'social-media': 'Social media',
};

function tool(id: string, name: string, icon: ToolEntry['data']['icon']): ToolEntry {
  return { id, data: { order: 1, name, icon } };
}

const none = { next: null, previous: null };

const toolIcons = buildToolIcons([
  tool('figma', 'Figma', 'figma'),
  tool('photoshop', 'Adobe Photoshop', 'photoshop'),
]);

describe('buildToolIcons', () => {
  it('maps tool names to icon keys', () => {
    expect(toolIcons.get('Figma')).toBe('figma');
    expect(toolIcons.get('Adobe Photoshop')).toBe('photoshop');
    expect(toolIcons.get('Blender')).toBeUndefined();
  });
});

describe('toDetailView', () => {
  it('falls back to the Behance title marked as Spanish on en', () => {
    const view = toDetailView(project(), 'en', categoryTitles, toolIcons, none);
    expect(view.title).toBe('Cabrera´s motos, Posts');
    expect(view.titleLang).toBe('es');
  });

  it('does not mark a fallback title rendered in its own language', () => {
    const view = toDetailView(project(), 'es', categoryTitles, toolIcons, none);
    expect(view.titleLang).toBeNull();
  });

  it('uses the override title per locale with no lang mark', () => {
    const title = { en: 'Cabrera’s Motos social posts', es: 'Posts para Cabrera’s Motos' };
    const en = toDetailView(project({ title }), 'en', categoryTitles, toolIcons, none);
    const es = toDetailView(project({ title }), 'es', categoryTitles, toolIcons, none);
    expect(en.title).toBe(title.en);
    expect(es.title).toBe(title.es);
    expect(en.titleLang).toBeNull();
    expect(es.titleLang).toBeNull();
  });

  it('localizes summary and category, or returns null', () => {
    const empty = toDetailView(project(), 'en', categoryTitles, toolIcons, none);
    expect(empty.summary).toBeNull();
    expect(empty.category).toBeNull();
    const view = toDetailView(
      project({ summary: { en: 'English summary', es: 'Resumen' }, category: 'branding' }),
      'es',
      { ...categoryTitles, branding: 'Branding ES' },
      toolIcons,
      none,
    );
    expect(view.summary).toBe('Resumen');
    expect(view.category).toBe('Branding ES');
  });

  it('keeps tool order and resolves icons by exact name', () => {
    const view = toDetailView(
      project({ tools: ['Blender', 'Adobe Photoshop', 'Figma'] }),
      'en',
      categoryTitles,
      toolIcons,
      none,
    );
    expect(view.tools).toEqual([
      { name: 'Blender', icon: null },
      { name: 'Adobe Photoshop', icon: 'photoshop' },
      { name: 'Figma', icon: 'figma' },
    ]);
  });

  it('links to the Behance source and keeps the cover', () => {
    const view = toDetailView(project(), 'en', categoryTitles, toolIcons, none);
    expect(view.behanceUrl).toBe('https://www.behance.net/gallery/238078789/Cabreras-motos-Posts');
    expect(view.cover).toBe(portrait);
    expect(view.slug).toBe('cabreras-motos-posts');
  });

  it('uses the curated cover alt or the localized fallback', () => {
    const fallback = toDetailView(project(), 'es', categoryTitles, toolIcons, none);
    expect(fallback.coverAlt).toBe('Cabrera´s motos, Posts — portada');
    const curated = toDetailView(
      project({ coverAlt: { en: 'Motorbike posts', es: 'Posts de motos' } }),
      'en',
      categoryTitles,
      toolIcons,
      none,
    );
    expect(curated.coverAlt).toBe('Motorbike posts');
  });

  it('builds date-free SEO copy from the summary or the fallback', () => {
    const fallback = toDetailView(project(), 'en', categoryTitles, toolIcons, none);
    expect(fallback.seo).toEqual({
      title: 'Cabrera´s motos, Posts — Martina Fernandez',
      description: 'Cabrera´s motos, Posts, a project by Martina Fernandez, graphic designer.',
    });
    const withSummary = toDetailView(
      project({ summary: { en: 'English summary', es: 'Resumen' } }),
      'en',
      categoryTitles,
      toolIcons,
      none,
    );
    expect(withSummary.seo.description).toBe('English summary');
    const year = String(new Date(1762478100 * 1000).getUTCFullYear());
    for (const text of [fallback.seo.title, fallback.seo.description]) {
      expect(text).not.toContain(year);
    }
  });

  it('has no neighbours when given none', () => {
    const view = toDetailView(project(), 'en', categoryTitles, toolIcons, none);
    expect(view.next).toBeNull();
    expect(view.previous).toBeNull();
  });

  it('maps neighbours to localized teaser fields only', () => {
    const next = project({
      id: '2',
      slug: 'portfolio-web',
      sourceTitle: 'Portfolio web',
      title: { en: 'Portfolio website', es: 'Sitio portfolio' },
    });
    const previous = project({ id: '3', slug: 'sistema-visual', sourceTitle: 'Sistema visual' });
    const view = toDetailView(project(), 'en', categoryTitles, toolIcons, { next, previous });
    expect(view.next).toEqual({
      slug: 'portfolio-web',
      href: '/projects/portfolio-web/',
      title: 'Portfolio website',
      titleLang: null,
      cover: portrait,
      coverAlt: 'Portfolio website — cover',
    });
    expect(view.previous).toMatchObject({
      href: '/projects/sistema-visual/',
      title: 'Sistema visual',
      titleLang: 'es',
    });
    const es = toDetailView(project(), 'es', categoryTitles, toolIcons, { next, previous });
    expect(es.next?.href).toBe('/es/projects/portfolio-web/');
    expect(es.next?.title).toBe('Sitio portfolio');
    expect(es.previous?.titleLang).toBeNull();
  });
});
