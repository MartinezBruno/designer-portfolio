import { describe, expect, it } from 'vitest';
import { sizesFor, tileSize, tileSizes, type TileSize } from '../../src/lib/projects/layout';

const sequences: ReadonlyArray<readonly [number, readonly TileSize[]]> = [
  [1, ['large']],
  [2, ['large', 'small']],
  [3, ['large', 'small', 'large-end']],
  [4, ['large', 'small', 'small', 'large']],
  [5, ['large', 'small', 'small', 'large', 'large-end']],
  [6, ['large', 'small', 'small', 'large', 'large', 'small']],
  [7, ['large', 'small', 'small', 'large', 'large', 'small', 'large-end']],
];

describe('tileSize', () => {
  it('exposes the three tile sizes', () => {
    expect(tileSizes).toEqual(['large', 'small', 'large-end', 'third']);
  });

  it.each(sequences)('count %i follows the fixed rhythm', (count, expected) => {
    const sizes = Array.from({ length: count }, (_, index) => tileSize(index, count));
    expect(sizes).toEqual(expected);
  });

  it.each([
    [-1, 3],
    [3, 3],
    [0, 0],
  ])('throws for index %i of %i tiles', (index, count) => {
    expect(() => tileSize(index, count)).toThrow(
      `projects: tileSize index ${String(index)} out of range for ${String(count)} tiles`,
    );
  });
});

describe('sizesFor', () => {
  it('has one sizes string per tile size, shared by ProjectCard and the client filter', () => {
    expect(Object.keys(sizesFor).sort()).toEqual([...tileSizes].sort());
    expect(sizesFor).toEqual({
      large: '(min-width: 1408px) 790px, (min-width: 768px) 57vw, 100vw',
      small: '(min-width: 1408px) 560px, (min-width: 768px) 40vw, 100vw',
      'large-end': '(min-width: 1408px) 888px, (min-width: 768px) 66vw, 100vw',
      third: '(min-width: 1408px) 440px, (min-width: 768px) 31vw, 100vw',
    });
  });
});
