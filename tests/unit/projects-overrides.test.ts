import { describe, expect, it } from 'vitest';
import portrait from '../../src/assets/hero/portrait.png';
import committed from '../../src/data/project-overrides.json';
import snapshot from '../../src/data/behance/snapshot.json';
import type { SourceProject } from '../../src/lib/projects/model';
import { parseOverrides, type Overrides } from '../../src/lib/projects/overrides-schema';
import {
  applyOverrides,
  missingModuleAlts,
  missingOverrides,
  sortProjects,
  validateOverrides,
} from '../../src/lib/projects/projects';
import { contentImageIds, parseSnapshot } from '../../src/lib/projects/snapshot-schema';

const FIX_SUFFIX = '. Fix src/data/project-overrides.json';

function source(
  id: string,
  sourceSlug: string,
  publishedOn: number,
  imageIds: readonly string[] = [],
): SourceProject {
  return {
    id,
    sourceSlug,
    sourceTitle: `Title ${id}`,
    sourceUrl: `https://www.behance.net/gallery/${id}/${sourceSlug}`,
    publishedOn,
    tools: ['Figma'],
    cover: portrait,
    imageIds,
    modules: [],
  };
}

const sources = [
  source('238078789', 'Cabreras-motos-Posts', 1762478100, ['1450079099', '1450079100']),
  source('227934855', 'PuroV', 1749658367, ['1350000001', '1350000002', '1350000003']),
  source('172473551', 'Mart', 1686103564),
];

const alt = (en: string, es = en): { en: string; es: string } => ({ en, es });

describe('parseOverrides', () => {
  it('accepts an empty object', () => {
    expect(parseOverrides({})).toEqual({});
  });

  it('accepts the committed file', () => {
    const parsed = parseOverrides(committed);
    expect(Object.keys(parsed)).toHaveLength(7);
  });

  it('rejects a non-digit Behance id key', () => {
    expect(() => parseOverrides({ abc: {} })).toThrow(
      /^project-overrides: .+\. Fix src\/data\/project-overrides\.json$/,
    );
  });

  it('rejects an unknown field (strict object)', () => {
    let message = '';
    try {
      parseOverrides({ '238078789': { catgory: 'branding' } });
    } catch (error) {
      if (error instanceof Error) message = error.message;
    }
    expect(message.startsWith('project-overrides: 238078789: ')).toBe(true);
    expect(message.endsWith(FIX_SUFFIX)).toBe(true);
    expect(message).toContain('catgory');
  });

  it('rejects an invalid category with the UI-SPEC message', () => {
    expect(() => parseOverrides({ '238078789': { category: 'illustration' } })).toThrow(
      'project-overrides: invalid category "illustration" for 238078789. Use one of graphic-design, web-design, branding, social-media',
    );
  });

  it('rejects a slug that does not match the slug pattern', () => {
    expect(() => parseOverrides({ '238078789': { slug: 'Bad Slug' } })).toThrow(
      /^project-overrides: 238078789\.slug: .+\. Fix src\/data\/project-overrides\.json$/,
    );
  });

  it('rejects a title without es', () => {
    expect(() => parseOverrides({ '238078789': { title: { en: 'Posts' } } })).toThrow(
      /^project-overrides: 238078789\.title\.es: .+\. Fix src\/data\/project-overrides\.json$/,
    );
  });

  it('accepts a moduleAlt map keyed by image id', () => {
    const parsed = parseOverrides({
      '238078789': { moduleAlt: { '1450079099': { en: 'A poster', es: 'Un póster' } } },
    });
    expect(parsed['238078789']?.moduleAlt).toEqual({
      '1450079099': { en: 'A poster', es: 'Un póster' },
    });
  });

  it('rejects a non-digit moduleAlt key', () => {
    expect(() =>
      parseOverrides({ '238078789': { moduleAlt: { hero: { en: 'A', es: 'B' } } } }),
    ).toThrow(
      /^project-overrides: 238078789\.moduleAlt\.hero: .+\. Fix src\/data\/project-overrides\.json$/,
    );
  });

  it('accepts stackMotion false, an id list, an empty list and absence (D-11a)', () => {
    expect(parseOverrides({ '238078789': { stackMotion: false } })['238078789']?.stackMotion).toBe(
      false,
    );
    expect(
      parseOverrides({ '238078789': { stackMotion: ['123', '456'] } })['238078789']?.stackMotion,
    ).toEqual(['123', '456']);
    expect(parseOverrides({ '238078789': { stackMotion: [] } })['238078789']?.stackMotion).toEqual(
      [],
    );
    expect(parseOverrides({ '238078789': {} })['238078789']?.stackMotion).toBeUndefined();
  });

  it('rejects stackMotion true', () => {
    expect(() => parseOverrides({ '238078789': { stackMotion: true } })).toThrow(
      /^project-overrides: 238078789\.stackMotion: .+\. Fix src\/data\/project-overrides\.json$/,
    );
  });

  it('rejects a non-digit stackMotion id', () => {
    expect(() => parseOverrides({ '238078789': { stackMotion: ['abc'] } })).toThrow(
      /^project-overrides: 238078789\.stackMotion/,
    );
  });

  it('rejects a moduleAlt value without es', () => {
    expect(() =>
      parseOverrides({ '238078789': { moduleAlt: { '1450079099': { en: 'A' } } } }),
    ).toThrow(/^project-overrides: 238078789\.moduleAlt\.1450079099\.es: /);
  });
});

describe('validateOverrides', () => {
  it('passes for known ids and unique slugs', () => {
    expect(() =>
      validateOverrides(sources, { '238078789': { title: { en: 'Posts', es: 'Posts' } } }),
    ).not.toThrow();
  });

  it('throws on an unknown Behance id', () => {
    expect(() => validateOverrides(sources, { '999': {} })).toThrow(
      'project-overrides: unknown Behance id 999. Remove it or fix the id in src/data/project-overrides.json',
    );
  });

  it('throws on a title over 32 characters naming the locale', () => {
    const long = 'x'.repeat(33);
    expect(() =>
      validateOverrides(sources, { '238078789': { title: { en: 'Short', es: long } } }),
    ).toThrow(
      'project-overrides: title.es for 238078789 is 33 characters (max 32). Shorten it in src/data/project-overrides.json',
    );
  });

  it('accepts a title of exactly 32 characters', () => {
    const edge = 'x'.repeat(32);
    expect(() =>
      validateOverrides(sources, { '238078789': { title: { en: edge, es: edge } } }),
    ).not.toThrow();
  });

  it('throws when a slug override collides with a derived slug', () => {
    expect(() => validateOverrides(sources, { '238078789': { slug: 'mart' } })).toThrow(
      'projects: duplicate slug "mart" (238078789, 172473551). Add a "slug" override to one of them',
    );
  });

  it('throws on a slug collision even when one project is hidden', () => {
    expect(() =>
      validateOverrides(sources, {
        '172473551': { hidden: true },
        '238078789': { slug: 'mart' },
      }),
    ).toThrow('projects: duplicate slug "mart"');
  });

  it('validates the committed file against the seed snapshot', () => {
    const seedSources = parseSnapshot(snapshot).projects.map((project) => ({
      id: project.id,
      sourceSlug: project.slug,
      imageIds: contentImageIds(project.content),
    }));
    expect(() => validateOverrides(seedSources, parseOverrides(committed))).not.toThrow();
  });

  it('accepts moduleAlt keys that match the project images', () => {
    expect(() =>
      validateOverrides(sources, {
        '238078789': { moduleAlt: { '1450079099': alt('A poster', 'Un póster') } },
      }),
    ).not.toThrow();
  });

  it('throws on a moduleAlt key that matches no image of that project', () => {
    // 1350000001 belongs to another project.
    expect(() =>
      validateOverrides(sources, { '238078789': { moduleAlt: { '1350000001': alt('A') } } }),
    ).toThrow(
      'project-overrides: moduleAlt key 1350000001 for 238078789 matches no image in the snapshot. Fix or remove it in src/data/project-overrides.json',
    );
  });

  it('throws on a moduleAlt value over 125 characters naming the locale and key', () => {
    const long = 'x'.repeat(126);
    expect(() =>
      validateOverrides(sources, {
        '238078789': { moduleAlt: { '1450079100': alt('Short', long) } },
      }),
    ).toThrow(
      'project-overrides: moduleAlt.es for 238078789/1450079100 is 126 characters (max 125). Shorten it in src/data/project-overrides.json',
    );
  });

  it('counts moduleAlt length by code points', () => {
    const edge = '🌶'.repeat(125);
    expect(() =>
      validateOverrides(sources, { '238078789': { moduleAlt: { '1450079099': alt(edge) } } }),
    ).not.toThrow();
    expect(() =>
      validateOverrides(sources, {
        '238078789': { moduleAlt: { '1450079099': alt(`${edge}🌶`) } },
      }),
    ).toThrow('moduleAlt.en for 238078789/1450079099 is 126 characters (max 125)');
  });
});

describe('validateOverrides stackMotion', () => {
  it('accepts stackMotion ids that match the project images', () => {
    expect(() =>
      validateOverrides(sources, { '238078789': { stackMotion: ['1450079100'] } }),
    ).not.toThrow();
    expect(() => validateOverrides(sources, { '238078789': { stackMotion: false } })).not.toThrow();
  });

  it('throws on a stackMotion id that matches no image, even without moduleAlt', () => {
    expect(() =>
      validateOverrides(sources, { '238078789': { stackMotion: ['1350000001'] } }),
    ).toThrow(
      'project-overrides: stackMotion id 1350000001 for 238078789 matches no image in the snapshot. Fix or remove it in src/data/project-overrides.json',
    );
  });

  it('checks stackMotion ids alongside moduleAlt', () => {
    expect(() =>
      validateOverrides(sources, {
        '238078789': {
          moduleAlt: { '1450079099': alt('A') },
          stackMotion: ['999'],
        },
      }),
    ).toThrow('project-overrides: stackMotion id 999 for 238078789');
  });
});

describe('missingModuleAlts', () => {
  it('counts the images without a moduleAlt entry per project', () => {
    const result = missingModuleAlts(sources, {
      '238078789': { moduleAlt: { '1450079099': alt('A'), '1450079100': alt('B') } },
      '227934855': { slug: 'puro-v', moduleAlt: { '1350000002': alt('C') } },
    });
    expect(result).toEqual([
      { id: '238078789', slug: 'cabreras-motos-posts', missing: 0, total: 2 },
      { id: '227934855', slug: 'puro-v', missing: 2, total: 3 },
      { id: '172473551', slug: 'mart', missing: 0, total: 0 },
    ]);
  });

  it('treats a project without overrides as missing every image', () => {
    const [first] = missingModuleAlts(sources, {});
    expect(first).toEqual({ id: '238078789', slug: 'cabreras-motos-posts', missing: 2, total: 2 });
  });
});

describe('applyOverrides', () => {
  const overrides: Overrides = {
    '238078789': {
      slug: 'cabreras-motos',
      title: { en: 'Social posts', es: 'Posts' },
      summary: { en: 'Posts for a shop.', es: 'Posts para una tienda.' },
      coverAlt: { en: 'A motorbike', es: 'Una moto' },
      category: 'social-media',
      featured: true,
      order: 2,
      contentLang: 'en',
    },
    '227934855': { hidden: true },
  };

  it('copies every curated field and replaces the slug', () => {
    const [first] = applyOverrides(sources, overrides);
    expect(first).toEqual({
      ...sources[0],
      slug: 'cabreras-motos',
      title: { en: 'Social posts', es: 'Posts' },
      summary: { en: 'Posts for a shop.', es: 'Posts para una tienda.' },
      coverAlt: { en: 'A motorbike', es: 'Una moto' },
      category: 'social-media',
      featured: true,
      hidden: false,
      order: 2,
      contentLang: 'en',
      moduleAlt: {},
      stackMotion: [],
    });
  });

  it('gives projects without an entry the defaults', () => {
    const projects = applyOverrides(sources, overrides);
    expect(projects[2]).toEqual({
      ...sources[2],
      slug: 'mart',
      title: null,
      summary: null,
      coverAlt: null,
      category: null,
      featured: false,
      hidden: false,
      order: null,
      contentLang: 'es',
      moduleAlt: {},
      stackMotion: [],
    });
  });

  it('copies moduleAlt entry by entry into a fresh object', () => {
    const moduleAlt = { '1450079099': alt('A poster', 'Un póster') };
    const withAlt: Overrides = { '238078789': { moduleAlt } };
    const [first] = applyOverrides(sources, withAlt);
    expect(first?.moduleAlt).toEqual(moduleAlt);
    expect(first?.moduleAlt).not.toBe(moduleAlt);
    expect(first?.moduleAlt['1450079099']).not.toBe(moduleAlt['1450079099']);
  });

  it('copies stackMotion: false, a fresh id list, or [] when absent (D-11a)', () => {
    const ids = ['1450079100'];
    const listed = applyOverrides(sources, { '238078789': { stackMotion: ids } });
    expect(listed[0]?.stackMotion).toEqual(ids);
    expect(listed[0]?.stackMotion).not.toBe(ids);
    expect(listed[1]?.stackMotion).toEqual([]);
    const off = applyOverrides(sources, { '238078789': { stackMotion: false } });
    expect(off[0]?.stackMotion).toBe(false);
  });

  it('hidden projects are excluded by sortProjects', () => {
    const visible = sortProjects(applyOverrides(sources, overrides));
    expect(visible.map((project) => project.id)).toEqual(['238078789', '172473551']);
  });

  it('never leaves undefined-valued properties', () => {
    for (const project of applyOverrides(sources, { '227934855': { hidden: true } })) {
      for (const value of Object.values(project)) expect(value).not.toBeUndefined();
    }
  });

  it('returns new objects and does not mutate the input', () => {
    const fingerprint = (): string =>
      JSON.stringify([sources.map((item) => [item.id, item.sourceSlug, item.tools]), overrides]);
    const before = fingerprint();
    const projects = applyOverrides(sources, overrides);
    expect(projects[0]).not.toBe(sources[0]);
    expect(projects[0]?.tools).not.toBe(sources[0]?.tools);
    expect(projects[0]?.title).not.toBe(overrides['238078789']?.title);
    expect(fingerprint()).toBe(before);
  });

  it('validates before merging', () => {
    expect(() => applyOverrides(sources, { '999': {} })).toThrow('unknown Behance id 999');
  });
});

describe('missingOverrides', () => {
  it('lists the absent fields per source project', () => {
    const result = missingOverrides(sources, {
      '238078789': {
        title: { en: 'Posts', es: 'Posts' },
        category: 'social-media',
        summary: { en: 'Posts.', es: 'Posts.' },
        coverAlt: { en: 'A bike', es: 'Una moto' },
      },
      '227934855': { title: { en: 'PuroV', es: 'PuroV' } },
    });
    expect(result).toEqual([
      { id: '238078789', slug: 'cabreras-motos-posts', missing: [] },
      { id: '227934855', slug: 'purov', missing: ['category', 'summary', 'coverAlt'] },
      { id: '172473551', slug: 'mart', missing: ['title', 'category', 'summary', 'coverAlt'] },
    ]);
  });

  it('uses the slug override when present', () => {
    const [first] = missingOverrides(sources, { '238078789': { slug: 'motos' } });
    expect(first?.slug).toBe('motos');
  });
});
