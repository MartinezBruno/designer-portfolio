// Quick 261110-wv4: the sketch 002 variant E icon set (public/favicon.svg is the source of truth,
// scripts/build-favicons.ts renders the rasters).
import { existsSync, readFileSync } from 'node:fs';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { encodeIco, maskableSvg, readIcoSizes, tileSvg } from '../../scripts/favicons.ts';

const svg = readFileSync('public/favicon.svg', 'utf8');

describe('favicon.svg', () => {
  it('outlines the m as a path, with no <text> or font dependency', () => {
    expect(svg).not.toMatch(/<text|font-family|@font-face/);
    expect(svg).toContain('viewBox="0 0 32 32"');
    expect(svg).toMatch(/<path fill="#111" d="M[^"]+Z"\/>/);
  });

  it('draws the white disc and the blue full stop from sketch E', () => {
    expect(svg).toContain('<circle cx="16" cy="16" r="16" fill="#fff"/>');
    expect(svg).toContain('<circle cx="25.6" cy="21.2" r="2.8" fill="#0f70b7"/>');
  });

  it('keeps coordinates rounded to at most 2 decimals', () => {
    const d = /d="([^"]+)"/.exec(svg)?.[1] ?? '';
    expect(d).not.toMatch(/\.\d{3}/);
  });
});

describe('derived SVG variants', () => {
  it('tileSvg swaps the disc for a full-bleed white square', () => {
    const tile = tileSvg(svg);
    expect(tile).toContain('<rect width="32" height="32" fill="#fff"/>');
    expect(tile).not.toContain('r="16"');
  });

  it('maskableSvg scales the mark to 80% around the centre', () => {
    expect(maskableSvg(svg)).toContain('<g transform="translate(3.2 3.2) scale(0.8)">');
  });

  it('throws when the disc is missing', () => {
    expect(() => tileSvg('<svg></svg>')).toThrow(/disc/);
  });
});

describe('ICO container', () => {
  it('round-trips entry sizes', () => {
    const ico = encodeIco([
      { size: 16, png: new Uint8Array([1, 2]) },
      { size: 256, png: new Uint8Array([3]) },
    ]);
    expect(readIcoSizes(ico)).toEqual([16, 256]);
    expect(ico.length).toBe(6 + 32 + 3);
  });

  it('public/favicon.ico embeds 16 and 32 px PNGs', async () => {
    const ico = readFileSync('public/favicon.ico');
    expect(readIcoSizes(ico)).toEqual([16, 32]);
    const view = new DataView(ico.buffer, ico.byteOffset, ico.byteLength);
    for (const [index, size] of [16, 32].entries()) {
      const length = view.getUint32(6 + 16 * index + 8, true);
      const offset = view.getUint32(6 + 16 * index + 12, true);
      const meta = await sharp(ico.subarray(offset, offset + length)).metadata();
      expect(meta.format).toBe('png');
      expect([meta.width, meta.height]).toEqual([size, size]);
    }
  });
});

describe('raster icons', () => {
  it.each([
    ['public/apple-touch-icon.png', 180],
    ['public/icon-192.png', 192],
    ['public/icon-512.png', 512],
    ['public/icon-maskable-512.png', 512],
  ])('%s is a %i px square PNG', async (path, size) => {
    const meta = await sharp(path).metadata();
    expect(meta.format).toBe('png');
    expect([meta.width, meta.height]).toEqual([size, size]);
  });

  it.each(['public/apple-touch-icon.png', 'public/icon-maskable-512.png'])(
    '%s is opaque (full-bleed, no transparency)',
    async (path) => {
      expect((await sharp(path).metadata()).hasAlpha).toBe(false);
    },
  );
});

describe('site.webmanifest', () => {
  const manifest = JSON.parse(readFileSync('public/site.webmanifest', 'utf8')) as {
    name: string;
    short_name: string;
    icons: { src: string; sizes: string; purpose?: string }[];
  };

  it('names the site and lists any + maskable icons that exist', () => {
    expect(manifest.name).toBe('Martina Fernandez');
    expect(manifest.short_name).toBe('Martina');
    for (const icon of manifest.icons) expect(existsSync(`public${icon.src}`)).toBe(true);
    expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
  });
});
