import { describe, expect, it } from 'vitest';
import portrait from '../../src/assets/hero/portrait.png';
import type { OrderFields, SourceProject } from '../../src/lib/projects/model';
import { applyOverrides, assertUniqueSlugs, sortProjects } from '../../src/lib/projects/projects';

function source(id: string, sourceSlug: string, publishedOn: number): SourceProject {
  return {
    id,
    sourceSlug,
    sourceTitle: `Title ${id}`,
    sourceUrl: `https://www.behance.net/gallery/${id}/${sourceSlug}`,
    publishedOn,
    tools: ['Figma'],
    cover: portrait,
    imageIds: [],
  };
}

function order(id: string, publishedOn: number, extra: Partial<OrderFields> = {}): OrderFields {
  return {
    id,
    publishedOn,
    order: extra.order ?? null,
    featured: extra.featured ?? false,
    hidden: extra.hidden ?? false,
  };
}

describe('applyOverrides with no overrides', () => {
  const sources = [source('238078789', 'Cabreras-motos-Posts', 1762478100), source('1', 'Mart', 5)];

  it('derives the slug and fills the defaults', () => {
    const [first] = applyOverrides(sources, {});
    expect(first).toEqual({
      ...sources[0],
      slug: 'cabreras-motos-posts',
      title: null,
      summary: null,
      coverAlt: null,
      category: null,
      featured: false,
      hidden: false,
      order: null,
      contentLang: 'es',
    });
  });

  it('returns new objects and does not mutate the input', () => {
    const fingerprint = (): string[] =>
      sources.map((item) => `${item.id}|${item.sourceSlug}|${item.tools.join(',')}`);
    const before = fingerprint();
    const projects = applyOverrides(sources, {});
    expect(projects).toHaveLength(2);
    expect(projects[0]).not.toBe(sources[0]);
    expect(projects[0]?.tools).not.toBe(sources[0]?.tools);
    expect(fingerprint()).toEqual(before);
    expect(Object.keys(sources[0] ?? {})).not.toContain('slug');
  });
});

describe('assertUniqueSlugs', () => {
  it('passes through unique slugs', () => {
    const projects = [
      { id: '1', slug: 'mart' },
      { id: '2', slug: 'purov' },
    ];
    expect(assertUniqueSlugs(projects)).toBe(projects);
  });

  it('throws an actionable message on a duplicate slug', () => {
    expect(() =>
      assertUniqueSlugs([
        { id: '1', slug: 'mart' },
        { id: '2', slug: 'mart' },
      ]),
    ).toThrow('projects: duplicate slug "mart" (1, 2). Add a "slug" override to one of them');
  });
});

describe('sortProjects', () => {
  it('sorts newest publishedOn first, id ascending on ties', () => {
    const sorted = sortProjects([order('b', 10), order('c', 30), order('a', 10), order('d', 20)]);
    expect(sorted.map((project) => project.id)).toEqual(['c', 'd', 'a', 'b']);
  });

  it('puts projects with an explicit order first, ascending', () => {
    const sorted = sortProjects([
      order('new', 100),
      order('second', 1, { order: 2 }),
      order('first', 2, { order: 1 }),
      order('old', 50),
    ]);
    expect(sorted.map((project) => project.id)).toEqual(['first', 'second', 'new', 'old']);
  });

  it('excludes hidden projects', () => {
    const sorted = sortProjects([order('shown', 1), order('gone', 2, { hidden: true })]);
    expect(sorted.map((project) => project.id)).toEqual(['shown']);
  });

  it('returns a new array and does not mutate the input', () => {
    const input = [order('a', 1), order('b', 2)];
    const copy = structuredClone(input);
    const sorted = sortProjects(input);
    expect(sorted).not.toBe(input);
    expect(input).toEqual(copy);
  });
});
