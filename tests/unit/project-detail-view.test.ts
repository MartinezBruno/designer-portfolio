import { describe, expect, it } from 'vitest';
import {
  collectionItemSizes,
  collectionRows,
  escapeHtml,
  injectNewTabHint,
  moduleWidths,
  neighbours,
} from '../../src/lib/projects/detail-view';
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

describe('collectionRows', () => {
  it.each([
    [1, [1]],
    [2, [2]],
    [3, [3]],
    [4, [2, 2]],
    [5, [3, 2]],
    [6, [3, 3]],
    [7, [3, 2, 2]],
    [8, [3, 3, 2]],
  ])('splits %i components into rows %j', (count, rows) => {
    expect(collectionRows(count)).toEqual(rows);
  });

  it('never makes a row of 1 or of 4+ from 2 components up', () => {
    for (let count = 2; count <= 30; count += 1) {
      const rows = collectionRows(count);
      expect(rows.reduce((sum, row) => sum + row, 0)).toBe(count);
      for (const row of rows) expect([2, 3]).toContain(row);
    }
  });

  it.each([0, -1, 2.5])('throws on %d', (count) => {
    expect(() => collectionRows(count)).toThrow();
  });
});

describe('moduleWidths', () => {
  it('caps the widths at the stored width, never upscaling', () => {
    expect(moduleWidths(1400)).toEqual([640, 960, 1400]);
    expect(moduleWidths(900)).toEqual([640]);
    expect(moduleWidths(500)).toEqual([500]);
  });
});

describe('collectionItemSizes', () => {
  it('builds sizes from the row share', () => {
    expect(collectionItemSizes(0.5)).toBe(
      '(min-width: 1400px) 700px, (min-width: 640px) 50vw, 100vw',
    );
    expect(collectionItemSizes(1 / 3)).toBe(
      '(min-width: 1400px) 467px, (min-width: 640px) 33vw, 100vw',
    );
  });
});

describe('injectNewTabHint', () => {
  it('adds the escaped sr-only hint before every closing anchor', () => {
    const html = '<p><a href="https://a.test">A</a> and <a href="https://b.test">B</a></p>';
    const span = '<span class="sr-only" lang="en">&lt;x&gt; &amp; &quot;y&quot;</span>';
    expect(injectNewTabHint(html, '<x> & "y"', 'en')).toBe(
      `<p><a href="https://a.test">A${span}</a> and <a href="https://b.test">B${span}</a></p>`,
    );
  });

  it('leaves html without links unchanged', () => {
    const html = '<div style="text-align: center">Plain <strong>text</strong></div>';
    expect(injectNewTabHint(html, '(opens in a new tab)', 'es')).toBe(html);
  });
});

describe('escapeHtml', () => {
  it('escapes the html special characters', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;',
    );
  });
});
