import { sizesFor, tileSize, type TileSize } from './layout';

/** Tile sizes per visible count: `rhythm[n]` is the D-18 rhythm for `n` visible cards. */
export type PrefilterRhythm = readonly (readonly TileSize[])[];

/**
 * Hard-load pre-filter for a shared `/projects/?category=<id>` link (09-REVIEW WR-02). The client
 * module is deferred, so without this the browser painted all seven cards and then collapsed the
 * grid: a measured CLS of 0.25 to 0.42. A blocking inline script right after the grid runs this
 * before the first paint; the module later re-applies the same state (idempotent).
 *
 * MUST stay self-contained (no imports, no outer-scope references): it is stringified into the
 * inline script by `categoryPrefilterInline`, like the BaseLayout motion gate. The selectors and
 * the parse rules mirror `parseCategoryParam` and `applyCategory`; tests/unit/category-prefilter
 * guards the drift. The URL value is only compared with the rendered radio values: it never
 * reaches a selector, an id or any HTML (T-09-07). Anything but exactly one rendered, non-empty
 * value leaves the server-rendered All grid alone.
 */
export function prefilterCategory(
  doc: Document,
  search: string,
  rhythm: readonly (readonly string[])[],
  sizes: Readonly<Record<string, string>>,
): void {
  const root = doc.querySelector('[data-project-filter]');
  if (root === null) return;
  const values = new URLSearchParams(search).getAll('category');
  if (values.length !== 1) return;
  const value = values[0];
  if (value === undefined || value === '') return;
  let radio: HTMLInputElement | null = null;
  for (const input of root.querySelectorAll<HTMLInputElement>('input[name="category"]')) {
    if (input.getAttribute('type') === 'radio' && input.value === value) radio = input;
  }
  if (radio === null) return;
  const items = doc.querySelectorAll<HTMLElement>('[data-project-grid] > li[data-tile]');
  const visible: HTMLElement[] = [];
  for (const li of items) {
    const show = li.getAttribute('data-category') === value;
    li.hidden = !show;
    if (show) visible.push(li);
  }
  const tiles = rhythm[visible.length] ?? [];
  visible.forEach((li, index) => {
    const tile = tiles[index];
    if (tile === undefined) return;
    li.setAttribute('data-tile', tile);
    const size = sizes[tile];
    if (size === undefined) return;
    for (const el of li.querySelectorAll('source, img')) el.setAttribute('sizes', size);
  });
  radio.checked = true;
}

/** The D-18 rhythm for every visible count from 0 to `count`. */
export function prefilterRhythm(count: number): PrefilterRhythm {
  return Array.from({ length: count + 1 }, (_, n) =>
    Array.from({ length: n }, (_, index) => tileSize(index, n)),
  );
}

/**
 * Build-time constant for the inline script after the grid: the stringified function plus the
 * rhythm table and `sizesFor` as JSON. Never contains user data; `<` is escaped so no value can
 * close the script element.
 */
export function categoryPrefilterInline(count: number): string {
  const data = JSON.stringify([prefilterRhythm(count), sizesFor]).replace(/</g, '\\u003c');
  return `(function(){var d=${data};(${prefilterCategory.toString()})(document,location.search,d[0],d[1]);})();`;
}
