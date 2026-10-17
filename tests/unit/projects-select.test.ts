import { describe, expect, it } from 'vitest';
import type { OrderFields } from '../../src/lib/projects/model';
import { selectHomeProjects } from '../../src/lib/projects/projects';

function row(id: string, publishedOn: number, extra: Partial<OrderFields> = {}): OrderFields {
  return {
    id,
    publishedOn,
    order: extra.order ?? null,
    featured: extra.featured ?? false,
    hidden: extra.hidden ?? false,
  };
}

const ids = (projects: readonly OrderFields[]): string[] => projects.map((project) => project.id);

const base = [row('a', 10), row('b', 50), row('c', 30), row('d', 40), row('e', 20)];

describe('selectHomeProjects', () => {
  it('returns the 3 newest when nothing is featured', () => {
    expect(ids(selectHomeProjects(base))).toEqual(['b', 'd', 'c']);
  });

  it('puts one featured old project first, then the 2 newest others', () => {
    const projects = [...base.filter((p) => p.id !== 'a'), row('a', 10, { featured: true })];
    expect(ids(selectHomeProjects(projects))).toEqual(['a', 'b', 'd']);
  });

  it('orders featured projects by order ascending', () => {
    const projects = [
      row('x', 1, { featured: true, order: 2 }),
      row('y', 2, { featured: true, order: 1 }),
      ...base,
    ];
    expect(ids(selectHomeProjects(projects))).toEqual(['y', 'x', 'b']);
  });

  it('puts featured projects without an order after ordered ones, newest first', () => {
    const projects = [
      row('old', 1, { featured: true }),
      row('new', 99, { featured: true }),
      row('ordered', 0, { featured: true, order: 5 }),
      ...base,
    ];
    expect(ids(selectHomeProjects(projects))).toEqual(['ordered', 'new', 'old']);
  });

  it('excludes featured projects that are hidden', () => {
    const projects = [row('gone', 99, { featured: true, hidden: true }), ...base];
    expect(ids(selectHomeProjects(projects))).toEqual(['b', 'd', 'c']);
  });

  it('excludes hidden non-featured projects', () => {
    const projects = base.map((p) => (p.id === 'b' ? row('b', 50, { hidden: true }) : p));
    expect(ids(selectHomeProjects(projects))).toEqual(['d', 'c', 'e']);
  });

  it('returns what exists when fewer than 3 are visible', () => {
    expect(ids(selectHomeProjects([row('a', 1), row('b', 2, { hidden: true })]))).toEqual(['a']);
    expect(selectHomeProjects([])).toEqual([]);
  });

  it('respects the limit param', () => {
    expect(ids(selectHomeProjects(base, 2))).toEqual(['b', 'd']);
    expect(ids(selectHomeProjects(base, 5))).toEqual(['b', 'd', 'c', 'e', 'a']);
  });

  it('breaks publishedOn ties by id', () => {
    expect(ids(selectHomeProjects([row('z', 5), row('m', 5), row('a', 5)]))).toEqual([
      'a',
      'm',
      'z',
    ]);
  });

  it('returns a new array and does not mutate the input', () => {
    const input = [row('a', 1, { featured: true }), row('b', 2)];
    const copy = structuredClone(input);
    const selected = selectHomeProjects(input);
    expect(selected).not.toBe(input);
    expect(input).toEqual(copy);
  });
});
