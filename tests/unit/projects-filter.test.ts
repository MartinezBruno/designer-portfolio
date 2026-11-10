import { describe, expect, it } from 'vitest';
import {
  buildCategoryChips,
  visibleTiles,
  type CategorizedCard,
} from '../../src/lib/projects/filter';
import type { TileSize } from '../../src/lib/projects/layout';

const graphic: CategorizedCard = { categoryId: 'graphic-design', category: 'Graphic design' };
const web: CategorizedCard = { categoryId: 'web-design', category: 'Web design' };
const branding: CategorizedCard = { categoryId: 'branding', category: 'Branding' };
const social: CategorizedCard = { categoryId: 'social-media', category: 'Social media' };
const none: CategorizedCard = { categoryId: null, category: null };

// D-17 curation, newest first.
const d17: readonly CategorizedCard[] = [social, graphic, web, web, graphic, branding, web];

describe('buildCategoryChips', () => {
  it('builds chips in services.json order with counts and card labels', () => {
    expect(buildCategoryChips(d17)).toEqual([
      { id: 'graphic-design', label: 'Graphic design', count: 2 },
      { id: 'web-design', label: 'Web design', count: 3 },
      { id: 'branding', label: 'Branding', count: 1 },
      { id: 'social-media', label: 'Social media', count: 1 },
    ]);
  });

  it('skips empty categories and uncategorised cards', () => {
    expect(buildCategoryChips([none, web, none, branding])).toEqual([
      { id: 'web-design', label: 'Web design', count: 1 },
      { id: 'branding', label: 'Branding', count: 1 },
    ]);
  });

  it.each<readonly [string, readonly CategorizedCard[]]>([
    ['one non-empty category', [web, web, none]],
    ['only uncategorised cards', [none, none]],
    ['zero cards', []],
  ])('renders no chip row for %s', (_label, cards) => {
    expect(buildCategoryChips(cards)).toEqual([]);
  });

  it('throws when a categorised card has no title', () => {
    expect(() => buildCategoryChips([{ categoryId: 'branding', category: null }, web])).toThrow(
      'projects: category branding has no title',
    );
  });
});

describe('visibleTiles', () => {
  it.each<readonly [number, readonly TileSize[]]>([
    [0, []],
    [1, ['large']],
    [2, ['large', 'small']],
    [3, ['large', 'small', 'large-end']],
    [7, ['large', 'small', 'small', 'large', 'large', 'small', 'large-end']],
  ])('count %i follows the grid rhythm', (count, expected) => {
    expect(visibleTiles(count)).toEqual(expected);
  });
});
