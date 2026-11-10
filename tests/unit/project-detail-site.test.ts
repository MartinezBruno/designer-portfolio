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

describe('toDetailView modules', () => {
  const wide = { ...portrait, width: 1400, height: 700 };
  const tall = { ...portrait, width: 900, height: 1200 };
  const square = { ...portrait, width: 500, height: 500 };
  const modules: Project['modules'] = [
    { kind: 'image', image: { id: '10', image: wide }, fullBleed: true, caption: '' },
    {
      kind: 'collection',
      images: [
        { id: '20', image: wide },
        { id: '21', image: tall },
        { id: '22', image: square },
      ],
    },
    { kind: 'text', html: '<p>Hecho por <a href="https://example.com">Martina</a></p>' },
    { kind: 'image', image: { id: '30', image: tall }, fullBleed: false, caption: 'Pie' },
  ];

  type View = ReturnType<typeof toDetailView>;
  type ImageView = Extract<View['modules'][number], { kind: 'image' }>;
  type CollectionView = Extract<View['modules'][number], { kind: 'collection' }>;

  function alts(view: View): string[] {
    return view.modules.flatMap((module) => {
      if (module.kind === 'image') return [module.alt];
      if (module.kind === 'collection') return module.rows.flat().map((item) => item.alt);
      return [];
    });
  }

  function eagers(view: View): boolean[] {
    return view.modules.flatMap((module) => {
      if (module.kind === 'image') return [module.eager];
      if (module.kind === 'collection') return module.rows.flat().map((item) => item.eager);
      return [];
    });
  }

  function byKind<K extends View['modules'][number]['kind']>(view: View, kind: K) {
    return view.modules.filter(
      (module): module is Extract<View['modules'][number], { kind: K }> => module.kind === kind,
    );
  }

  it('numbers fallback alts across images and collection items in DOM order', () => {
    const en = toDetailView(project({ modules }), 'en', categoryTitles, toolIcons, none);
    expect(alts(en)).toEqual(
      [1, 2, 3, 4, 5].map((n) => `Cabrera´s motos, Posts — image ${String(n)} of 5`),
    );
    const es = toDetailView(project({ modules }), 'es', categoryTitles, toolIcons, none);
    expect(alts(es)).toEqual(
      [1, 2, 3, 4, 5].map((n) => `Cabrera´s motos, Posts — imagen ${String(n)} de 5`),
    );
    expect(eagers(en)).toEqual([true, false, false, false, false]);
  });

  it('makes the first collection item eager when the stack starts with a collection', () => {
    const view = toDetailView(
      project({ modules: modules.slice(1) }),
      'en',
      categoryTitles,
      toolIcons,
      none,
    );
    expect(eagers(view)).toEqual([true, false, false, false]);
  });

  it('replaces only the overridden image alt, in the matching locale', () => {
    const moduleAlt = { '21': { en: 'A tall poster', es: 'Un póster alto' } };
    const en = toDetailView(project({ modules, moduleAlt }), 'en', categoryTitles, toolIcons, none);
    const es = toDetailView(project({ modules, moduleAlt }), 'es', categoryTitles, toolIcons, none);
    expect(alts(en)[2]).toBe('A tall poster');
    expect(alts(es)[2]).toBe('Un póster alto');
    expect(alts(en)[1]).toBe('Cabrera´s motos, Posts — image 2 of 5');
    expect(alts(en)[3]).toBe('Cabrera´s motos, Posts — image 4 of 5');
  });

  it('never uses Behance auto alt text', () => {
    const view = toDetailView(project({ modules }), 'en', categoryTitles, toolIcons, none);
    for (const alt of alts(view)) expect(alt).not.toContain('Image may contain');
  });

  it('maps image fields: widths, full bleed, caption and caption lang', () => {
    const en = toDetailView(project({ modules }), 'en', categoryTitles, toolIcons, none);
    const [first, last] = byKind(en, 'image') as ImageView[];
    expect(first).toMatchObject({
      image: wide,
      widths: [640, 768, 960, 1400],
      fullBleed: true,
      caption: null,
      captionLang: null,
    });
    expect(last).toMatchObject({
      image: tall,
      widths: [640, 768],
      fullBleed: false,
      caption: 'Pie',
      captionLang: 'es',
    });
    const es = toDetailView(project({ modules }), 'es', categoryTitles, toolIcons, none);
    expect((byKind(es, 'image') as ImageView[])[1]?.captionLang).toBeNull();
  });

  it('builds justified collection rows with ratio and share-based sizes', () => {
    const view = toDetailView(project({ modules }), 'en', categoryTitles, toolIcons, none);
    const [collection] = byKind(view, 'collection') as CollectionView[];
    expect(collection?.rows.map((row) => row.length)).toEqual([3]);
    const row = collection?.rows[0] ?? [];
    expect(row.map((item) => item.ratio)).toEqual([2, 0.75, 1]);
    expect(row.map((item) => item.widths)).toEqual([[640, 768, 960, 1400], [640, 768], [500]]);
    // share = ratio / 3.75
    expect(row[0]?.sizes).toBe('(min-width: 1400px) 747px, (min-width: 640px) 53vw, 100vw');
    expect(row[1]?.sizes).toBe('(min-width: 1400px) 280px, (min-width: 640px) 20vw, 100vw');
  });

  it('splits a collection of 5 into rows of 3 and 2 and rounds ratios to 4 decimals', () => {
    const odd = { ...portrait, width: 1000, height: 3000 };
    const images = Array.from({ length: 5 }, (_, index) => ({
      id: String(40 + index),
      image: odd,
    }));
    const view = toDetailView(
      project({ modules: [{ kind: 'collection', images }] }),
      'en',
      categoryTitles,
      toolIcons,
      none,
    );
    const [collection] = byKind(view, 'collection') as CollectionView[];
    expect(collection?.rows.map((row) => row.length)).toEqual([3, 2]);
    expect(collection?.rows[0]?.[0]?.ratio).toBe(0.3333);
  });

  it('marks text Spanish on en pages, not on es pages, and injects the localized hint', () => {
    const en = toDetailView(project({ modules }), 'en', categoryTitles, toolIcons, none);
    const es = toDetailView(project({ modules }), 'es', categoryTitles, toolIcons, none);
    const [enText] = byKind(en, 'text');
    const [esText] = byKind(es, 'text');
    expect(enText?.lang).toBe('es');
    expect(esText?.lang).toBeNull();
    expect(enText?.html).toBe(
      '<p>Hecho por <a href="https://example.com">Martina<span class="sr-only" lang="en">(opens in a new tab)</span></a></p>',
    );
    expect(esText?.html).toContain(
      '<span class="sr-only" lang="es">(se abre en una pestaña nueva)</span></a>',
    );
  });

  it('builds the embed view with the provider name and localized iframe title', () => {
    const src = 'https://embed.figma.com/proto/abc';
    const view = toDetailView(
      project({ modules: [{ kind: 'embed', provider: 'figma', src }] }),
      'en',
      categoryTitles,
      toolIcons,
      none,
    );
    expect(view.modules).toEqual([
      {
        kind: 'embed',
        provider: 'figma',
        providerName: 'Figma',
        src,
        iframeTitle: 'Cabrera´s motos, Posts — interactive Figma prototype',
      },
    ]);
  });

  describe('stack side entrance (D-11a)', () => {
    const img = (id: string): Project['modules'][number] => ({
      kind: 'image',
      image: { id, image: wide },
      fullBleed: true,
      caption: '',
    });
    const pair: Project['modules'][number] = {
      kind: 'collection',
      images: [
        { id: '90', image: wide },
        { id: '91', image: tall },
      ],
    };
    const entrances = (view: View): ('left' | 'right' | null)[] =>
      (byKind(view, 'image') as ImageView[]).map((module) => module.entrance);
    const build = (overrides: Partial<Project>): View =>
      toDetailView(project(overrides), 'en', categoryTitles, toolIcons, none);

    it('keeps the eager image static and alternates the rest from the left', () => {
      expect(entrances(build({ modules: [img('1'), img('2'), img('3')] }))).toEqual([
        null,
        'left',
        'right',
      ]);
    });

    it('never resets the alternation after a collection, which has no entrance', () => {
      const view = build({ modules: [img('1'), pair, img('2'), img('3')] });
      expect(entrances(view)).toEqual([null, 'left', 'right']);
      const [collection] = byKind(view, 'collection');
      expect(collection).not.toHaveProperty('entrance');
    });

    it('does not count opted-out images', () => {
      const view = build({
        modules: [img('1'), img('2'), img('3'), img('4')],
        stackMotion: ['3'],
      });
      expect(entrances(view)).toEqual([null, 'left', null, 'right']);
    });

    it('keeps every image static when the project opts out', () => {
      const view = build({ modules: [img('1'), img('2'), img('3')], stackMotion: false });
      expect(entrances(view)).toEqual([null, null, null]);
    });

    it('starts at left when the eager image sits in a leading collection', () => {
      expect(entrances(build({ modules: [pair, img('2'), img('3')] }))).toEqual(['left', 'right']);
    });
  });

  describe('collection cell drift (07-14, Q5)', () => {
    const img = (id: string): Project['modules'][number] => ({
      kind: 'image',
      image: { id, image: wide },
      fullBleed: true,
      caption: '',
    });
    const grid: Project['modules'][number] = {
      kind: 'collection',
      images: [
        { id: '90', image: wide },
        { id: '91', image: tall },
        { id: '92', image: wide },
      ],
    };
    const build = (overrides: Partial<Project>): View =>
      toDetailView(project(overrides), 'en', categoryTitles, toolIcons, none);
    const drifts = (view: View): boolean[] =>
      (byKind(view, 'collection') as CollectionView[]).flatMap((module) =>
        module.rows.flat().map((item) => item.drift),
      );

    it('drifts every cell except the eager one', () => {
      expect(drifts(build({ modules: [grid, img('2')] }))).toEqual([false, true, true]);
      expect(drifts(build({ modules: [img('1'), grid] }))).toEqual([true, true, true]);
    });

    it('keeps every cell static when the project opts out', () => {
      expect(drifts(build({ modules: [img('1'), grid], stackMotion: false }))).toEqual([
        false,
        false,
        false,
      ]);
    });

    it('keeps a listed cell static and its neighbours drifting', () => {
      expect(drifts(build({ modules: [img('1'), grid], stackMotion: ['91'] }))).toEqual([
        true,
        false,
        true,
      ]);
    });

    it('does not count drifting cells toward the image alternation', () => {
      const view = build({ modules: [img('1'), img('2'), grid, img('3')] });
      expect((byKind(view, 'image') as ImageView[]).map((module) => module.entrance)).toEqual([
        null,
        'left',
        'right',
      ]);
    });
  });

  it('keeps unknown modules and gives a project with zero modules one unknown note', () => {
    const unknown = toDetailView(
      project({ modules: [{ kind: 'unknown' }] }),
      'en',
      categoryTitles,
      toolIcons,
      none,
    );
    expect(unknown.modules).toEqual([{ kind: 'unknown' }]);
    const empty = toDetailView(project(), 'en', categoryTitles, toolIcons, none);
    expect(empty.modules).toEqual([{ kind: 'unknown' }]);
  });
});
