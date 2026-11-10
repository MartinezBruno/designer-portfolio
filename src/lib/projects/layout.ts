/**
 * Projects grid rhythm (D-18). Tile size comes from position only, never from CSS nth-* rules, so
 * DOM order, tab order and visual order stay newest first. `third` is the even row used where the
 * count is fixed (Home "Latest work", max 3): every tile spans 4 of the 12 columns.
 */
export const tileSizes = ['large', 'small', 'large-end', 'third'] as const;
export type TileSize = (typeof tileSizes)[number];

/**
 * Responsive `sizes` per tile. Shared by ProjectCard (build time) and the client category filter,
 * which rewrites `sizes` when filtering changes a card's tile.
 */
export const sizesFor: Readonly<Record<TileSize, string>> = {
  large: '(min-width: 1408px) 790px, (min-width: 768px) 57vw, 100vw',
  small: '(min-width: 1408px) 560px, (min-width: 768px) 40vw, 100vw',
  'large-end': '(min-width: 1408px) 888px, (min-width: 768px) 66vw, 100vw',
  third: '(min-width: 1408px) 440px, (min-width: 768px) 31vw, 100vw',
};

const cycle: readonly TileSize[] = ['large', 'small', 'small', 'large'];

/**
 * Size of the tile at `index` in a grid of `count` tiles: `large, small, small, large` repeating,
 * and a lone last tile on an odd count above 1 pushed to the right edge (`large-end`).
 */
export function tileSize(index: number, count: number): TileSize {
  if (!Number.isInteger(index) || index < 0 || index >= count) {
    throw new Error(
      `projects: tileSize index ${String(index)} out of range for ${String(count)} tiles`,
    );
  }
  if (count > 1 && count % 2 === 1 && index === count - 1) return 'large-end';
  return cycle[index % cycle.length] ?? 'large';
}
