import { describe, expect, it } from 'vitest';
import { neighbours } from '../../src/lib/projects/detail-view';
import type { OrderFields } from '../../src/lib/projects/model';
import { sortProjects } from '../../src/lib/projects/projects';

interface Item extends OrderFields {
  slug: string;
}

/** `count` visible items, newest first after sortProjects (publishedOn descends with the index). */
function items(count: number): Item[] {
  return Array.from({ length: count }, (_, index) => ({
    id: String(index + 1),
    slug: `p${String(index + 1)}`,
    publishedOn: 1_700_000_000 - index * 1000,
    order: null,
    featured: false,
    hidden: false,
  }));
}

function slugs(pair: { next: Item | null; previous: Item | null }) {
  return { next: pair.next?.slug ?? null, previous: pair.previous?.slug ?? null };
}

describe('neighbours', () => {
  const seven = sortProjects(items(7));

  it('returns the adjacent projects for a middle slug', () => {
    expect(slugs(neighbours(seven, 'p4'))).toEqual({ next: 'p5', previous: 'p3' });
  });

  it('wraps the last project to the first for next', () => {
    expect(slugs(neighbours(seven, 'p7'))).toEqual({ next: 'p1', previous: 'p6' });
  });

  it('wraps the first project to the last for previous', () => {
    expect(slugs(neighbours(seven, 'p1'))).toEqual({ next: 'p2', previous: 'p7' });
  });

  it('wraps both ways with 3 projects', () => {
    const three = sortProjects(items(3));
    expect(slugs(neighbours(three, 'p1'))).toEqual({ next: 'p2', previous: 'p3' });
    expect(slugs(neighbours(three, 'p3'))).toEqual({ next: 'p1', previous: 'p2' });
  });

  it('gives only a next project with 2 projects', () => {
    const two = sortProjects(items(2));
    expect(slugs(neighbours(two, 'p1'))).toEqual({ next: 'p2', previous: null });
    expect(slugs(neighbours(two, 'p2'))).toEqual({ next: 'p1', previous: null });
  });

  it('gives no neighbours with 1 project', () => {
    expect(slugs(neighbours(sortProjects(items(1)), 'p1'))).toEqual({
      next: null,
      previous: null,
    });
  });

  it('throws on an unknown slug, naming it', () => {
    expect(() => neighbours(seven, 'missing-slug')).toThrow(/missing-slug/);
  });

  it('follows sortProjects order and never returns a hidden project', () => {
    const source = items(4).map((item) => {
      if (item.slug === 'p2') return { ...item, hidden: true };
      if (item.slug === 'p4') return { ...item, order: 1 };
      return item;
    });
    const sorted = sortProjects(source);
    expect(sorted.map((item) => item.slug)).toEqual(['p4', 'p1', 'p3']);
    for (const item of sorted) {
      const pair = neighbours(sorted, item.slug);
      expect(pair.next?.slug).not.toBe('p2');
      expect(pair.previous?.slug).not.toBe('p2');
    }
    expect(slugs(neighbours(sorted, 'p4'))).toEqual({ next: 'p1', previous: 'p3' });
    expect(slugs(neighbours(sorted, 'p3'))).toEqual({ next: 'p4', previous: 'p1' });
    expect(() => neighbours(sorted, 'p2')).toThrow(/p2/);
  });
});
