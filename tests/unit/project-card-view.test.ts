import { describe, expect, it } from 'vitest';
import portrait from '../../src/assets/hero/portrait.png';
import type { ServiceEntry } from '../../src/lib/content/home';
import { buildCategoryTitles, toCardView } from '../../src/lib/projects/card-view';
import { categoryIds, type CategoryId, type Project } from '../../src/lib/projects/model';

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
    modules: [],
    slug: 'cabreras-motos-posts',
    title: null,
    summary: null,
    coverAlt: null,
    category: null,
    order: null,
    featured: false,
    hidden: false,
    contentLang: 'es',
    moduleAlt: {},
    stackMotion: [],
    ...overrides,
  };
}

const categoryTitles: Record<CategoryId, string> = {
  'graphic-design': 'Graphic design',
  'web-design': 'Web design',
  branding: 'Branding',
  'social-media': 'Social media',
};

function service(id: string, en: string, es: string): ServiceEntry {
  return {
    id,
    data: { order: 1, title: { en, es }, items: { en: [], es: [] } },
  };
}

describe('toCardView', () => {
  it('falls back to the Behance title marked as Spanish on en', () => {
    const view = toCardView(project(), 'en', categoryTitles);
    expect(view).toEqual({
      slug: 'cabreras-motos-posts',
      href: '/projects/cabreras-motos-posts/',
      title: 'Cabrera´s motos, Posts',
      titleLang: 'es',
      category: null,
      tools: ['Figma', 'Adobe Photoshop'],
      summary: null,
      cover: portrait,
      coverAlt: 'Cabrera´s motos, Posts — cover',
    });
  });

  it('copies tools instead of aliasing the project array', () => {
    const source = project();
    const view = toCardView(source, 'en', categoryTitles);
    expect(view.tools).not.toBe(source.tools);
  });

  it('drops the lang mark on es, where the content language matches the page', () => {
    const view = toCardView(project(), 'es', categoryTitles);
    expect(view.titleLang).toBeNull();
    expect(view.href).toBe('/es/projects/cabreras-motos-posts/');
    expect(view.coverAlt).toBe('Cabrera´s motos, Posts — portada');
  });

  it('uses the localized title override without a lang mark', () => {
    const title = { en: "Cabrera's Motos social posts", es: "Posts para Cabrera's Motos" };
    const enView = toCardView(project({ title }), 'en', categoryTitles);
    expect(enView.title).toBe(title.en);
    expect(enView.titleLang).toBeNull();
    expect(enView.coverAlt).toBe(`${title.en} — cover`);
    expect(toCardView(project({ title }), 'es', categoryTitles).title).toBe(title.es);
  });

  it('uses the cover alt override', () => {
    const coverAlt = { en: 'Motorbike posts on a phone', es: 'Posts de motos en un móvil' };
    expect(toCardView(project({ coverAlt }), 'en', categoryTitles).coverAlt).toBe(coverAlt.en);
    expect(toCardView(project({ coverAlt }), 'es', categoryTitles).coverAlt).toBe(coverAlt.es);
  });

  it('uses the localized summary', () => {
    const summary = { en: 'Social posts for a bike shop.', es: 'Posts para una tienda de motos.' };
    expect(toCardView(project({ summary }), 'es', categoryTitles).summary).toBe(summary.es);
  });

  it('labels the category with the localized service title', () => {
    const view = toCardView(project({ category: 'web-design' }), 'en', categoryTitles);
    expect(view.category).toBe('Web design');
  });

  it('carries no project date (removed by the user 2026-10-17)', () => {
    expect(toCardView(project(), 'en', categoryTitles)).not.toHaveProperty('year');
  });
});

describe('buildCategoryTitles', () => {
  const entries = [
    service('graphic-design', 'Graphic design', 'Diseño gráfico'),
    service('web-design', 'Web design', 'Diseño web'),
    service('branding', 'Branding', 'Branding'),
    service('social-media', 'Social media', 'Social media'),
  ];

  it('maps every category id to its localized service title', () => {
    expect(buildCategoryTitles(entries, 'es')).toEqual({
      'graphic-design': 'Diseño gráfico',
      'web-design': 'Diseño web',
      branding: 'Branding',
      'social-media': 'Social media',
    });
    expect(Object.keys(buildCategoryTitles(entries, 'en'))).toEqual([...categoryIds]);
  });

  it('throws when a category has no service entry', () => {
    expect(() => buildCategoryTitles(entries.slice(0, 2), 'en')).toThrow(
      'projects: services.json is missing category ids branding, social-media. Fix src/data/services.json',
    );
  });
});
