// Regenerates every raster icon from public/favicon.svg (sketch 002 variant E). Run after editing
// the SVG: `pnpm build:favicons`. The "m" is outlined from Bricolage Grotesque wght 800 (fontTools),
// so the SVG renders without fonts and sharp/librsvg draws it exactly as browsers do.
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { encodeIco, maskableSvg, tileSvg } from './favicons.ts';

const PUBLIC = 'public';
const source = readFileSync(`${PUBLIC}/favicon.svg`, 'utf8');

async function png(svg: string, size: number, opaque = false): Promise<Buffer> {
  // Render at the target size directly (density scales the 32-unit viewBox) so small sizes stay crisp.
  let image = sharp(Buffer.from(svg), { density: (72 * size) / 32 }).resize(size, size);
  if (opaque) image = image.flatten({ background: '#ffffff' }).removeAlpha();
  return image.png({ compressionLevel: 9 }).toBuffer();
}

const ico = encodeIco([
  { size: 16, png: await png(source, 16) },
  { size: 32, png: await png(source, 32) },
]);
writeFileSync(`${PUBLIC}/favicon.ico`, ico);
writeFileSync(`${PUBLIC}/apple-touch-icon.png`, await png(tileSvg(source), 180, true));
writeFileSync(`${PUBLIC}/icon-192.png`, await png(source, 192));
writeFileSync(`${PUBLIC}/icon-512.png`, await png(source, 512));
writeFileSync(`${PUBLIC}/icon-maskable-512.png`, await png(maskableSvg(source), 512, true));
console.log(
  'favicons: wrote favicon.ico (16, 32), apple-touch-icon.png, icon-192/512, icon-maskable-512',
);
