// Pure helpers for the favicon build. Erasable TypeScript only (Node type stripping runs it).
// public/favicon.svg is the source of truth: a white disc, the outlined "m" and the blue dot
// (sketch 002 variant E). The tile and maskable variants are derived from it here.

const DISC = /<circle cx="16" cy="16" r="16" fill="#fff"\/>/;
const TILE = '<rect width="32" height="32" fill="#fff"/>';

// Full-bleed white square with the same glyph and dot (apple-touch-icon; iOS rounds the corners).
export function tileSvg(source: string): string {
  if (!DISC.test(source)) throw new Error('favicon.svg: white disc element not found');
  return source.replace(DISC, TILE);
}

// Maskable: full-bleed white square, mark scaled to 80% around the centre so the whole disc
// (radius 0.4 of the icon) sits inside the 80% safe-zone circle.
export function maskableSvg(source: string): string {
  const tile = tileSvg(source);
  const open = tile.indexOf(TILE) + TILE.length;
  const close = tile.lastIndexOf('</svg>');
  return `${tile.slice(0, open)}<g transform="translate(3.2 3.2) scale(0.8)">${tile.slice(open, close)}</g>${tile.slice(close)}`;
}

// ICO container with PNG-compressed entries (supported by every browser that reads favicon.ico).
export function encodeIco(images: readonly { size: number; png: Uint8Array }[]): Uint8Array {
  const headerSize = 6 + 16 * images.length;
  const total = headerSize + images.reduce((sum, image) => sum + image.png.length, 0);
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, images.length, true);
  let offset = headerSize;
  images.forEach((image, index) => {
    const entry = 6 + 16 * index;
    view.setUint8(entry, image.size >= 256 ? 0 : image.size);
    view.setUint8(entry + 1, image.size >= 256 ? 0 : image.size);
    view.setUint8(entry + 2, 0);
    view.setUint8(entry + 3, 0);
    view.setUint16(entry + 4, 1, true);
    view.setUint16(entry + 6, 32, true);
    view.setUint32(entry + 8, image.png.length, true);
    view.setUint32(entry + 12, offset, true);
    out.set(image.png, offset);
    offset += image.png.length;
  });
  return out;
}

export function readIcoSizes(ico: Uint8Array): number[] {
  const view = new DataView(ico.buffer, ico.byteOffset, ico.byteLength);
  if (view.getUint16(0, true) !== 0 || view.getUint16(2, true) !== 1) throw new Error('not an ICO');
  const count = view.getUint16(4, true);
  return Array.from({ length: count }, (_, index) => view.getUint8(6 + 16 * index) || 256);
}
