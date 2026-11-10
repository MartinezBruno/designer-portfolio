// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  categoryPrefilterInline,
  prefilterCategory,
  prefilterRhythm,
} from '../../src/lib/projects/category-prefilter';
import { sizesFor, tileSize, type TileSize } from '../../src/lib/projects/layout';
import { applyCategory } from '../../src/lib/ui/category-filter';

// 09-REVIEW WR-02: the blocking inline pre-filter must leave the DOM exactly as applyCategory does
// (drift guard), and must ignore every URL value that is not one rendered radio.

const CATEGORIES = ['graphic-design', 'web-design', 'branding', 'social-media'] as const;
const CARDS = [
  'social-media',
  'graphic-design',
  'web-design',
  'web-design',
  'graphic-design',
  'branding',
  'web-design',
];

function fixture(): string {
  const radios = [
    `<input type="radio" name="category" id="projects-filter-all" value="" checked>`,
    ...CATEGORIES.map(
      (id) => `<input type="radio" name="category" id="projects-filter-${id}" value="${id}">`,
    ),
  ].join('');
  const items = CARDS.map((category, index) => {
    const tile = tileSize(index, CARDS.length);
    return `<li data-tile="${tile}" data-category="${category}"><picture><source sizes="${sizesFor[tile]}"><img alt="" sizes="${sizesFor[tile]}"></picture></li>`;
  }).join('');
  return `<fieldset data-project-filter>${radios}</fieldset><ul data-project-grid>${items}</ul>`;
}

function snapshot(doc: Document): unknown {
  const checked = doc.querySelector<HTMLInputElement>('input[name="category"]:checked');
  return {
    checked: checked?.id ?? null,
    items: [...doc.querySelectorAll<HTMLElement>('[data-project-grid] > li')].map((li) => ({
      hidden: li.hidden,
      tile: li.getAttribute('data-tile'),
      sizes: [...li.querySelectorAll('source, img')].map((el) => el.getAttribute('sizes')),
    })),
  };
}

function fresh(): Document {
  const doc = document.implementation.createHTMLDocument('');
  doc.body.innerHTML = fixture();
  return doc;
}

const rhythm = prefilterRhythm(CARDS.length);

afterEach(() => {
  document.body.innerHTML = '';
});

describe('prefilterCategory', () => {
  it('builds the D-18 rhythm for every visible count', () => {
    expect(rhythm).toHaveLength(CARDS.length + 1);
    expect(rhythm[0]).toEqual([]);
    expect(rhythm[1]).toEqual(['large']);
    expect(rhythm[3]).toEqual(['large', 'small', 'large-end']);
    const seven: readonly TileSize[] = rhythm[7] ?? [];
    expect(seven).toEqual(['large', 'small', 'small', 'large', 'large', 'small', 'large-end']);
  });

  for (const id of CATEGORIES) {
    it(`matches applyCategory for ?category=${id}`, () => {
      const expected = fresh();
      applyCategory(expected, id);
      const actual = fresh();
      prefilterCategory(actual, `?category=${id}`, rhythm, sizesFor);
      expect(snapshot(actual)).toEqual(snapshot(expected));
    });
  }

  for (const search of [
    '',
    '?category=',
    '?category=bogus',
    '?category=Branding',
    '?category=photography',
    '?category=branding&category=branding',
    '?category=%22%5D%2Cbody',
    '?category=%3Cscript%3E',
  ]) {
    it(`leaves the All grid untouched for "${search}"`, () => {
      const doc = fresh();
      const before = snapshot(doc);
      prefilterCategory(doc, search, rhythm, sizesFor);
      expect(snapshot(doc)).toEqual(before);
    });
  }

  it('does nothing on a page without the filter', () => {
    const doc = document.implementation.createHTMLDocument('');
    doc.body.innerHTML =
      '<ul data-project-grid><li data-tile="large" data-category="branding"></li></ul>';
    prefilterCategory(doc, '?category=branding', rhythm, sizesFor);
    expect(doc.querySelector('li')?.hidden).toBe(false);
  });
});

describe('categoryPrefilterInline', () => {
  it('is self-contained and filters the live document when evaluated', () => {
    document.body.innerHTML = fixture();
    window.history.replaceState(null, '', '/projects/?category=web-design');
    const expected = fresh();
    applyCategory(expected, 'web-design');
    // Same mechanism as the browser: the string runs with only the global scope.
    new Function(categoryPrefilterInline(CARDS.length))();
    expect(snapshot(document)).toEqual(snapshot(expected));
    window.history.replaceState(null, '', '/');
  });

  it('never lets a value close the script element', () => {
    expect(categoryPrefilterInline(CARDS.length)).not.toContain('</');
  });

  it('runs right after the grid in ProjectsView, only with the chip row', () => {
    const view = readFileSync(resolve('src/components/views/ProjectsView.astro'), 'utf8');
    expect(view).toMatch(
      /<ProjectGrid[^>]*\/>\s*\{chips\.length > 0 && <script is:inline set:html=\{prefilter\} \/>\}/,
    );
  });
});
