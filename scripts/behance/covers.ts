// Cover selection, image sniffing and file naming. Erasable TypeScript only (Node type stripping runs it).
// Covers are chosen by an explicit rule, never by array position, and named only from trusted parts.
import { createHash } from 'node:crypto';
import { SyncError } from './errors.ts';
import type { RawCover } from './raw-schemas.ts';

export type ImageExt = 'png' | 'jpg' | 'webp';

const PREFERRED_VARIANT = '/projects/max_808/';
const DIGITS = /^\d+$/;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP = [0x57, 0x45, 0x42, 0x50];

function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return '';
  }
}

function isWebp(cover: RawCover): boolean {
  return cover.type.toUpperCase() === 'WEBP' || pathOf(cover.url).includes('_webp/');
}

/**
 * Picks the non-WEBP `max_808` cover; falls back to the largest finite-width non-WEBP entry.
 * The `original` variant (null width, cross-host redirect) is never selected. Gate G4 when none fits.
 */
export function pickCover(entries: readonly RawCover[]): RawCover {
  const candidates = entries.filter((cover) => !isWebp(cover));
  const preferred = candidates.find((cover) => pathOf(cover.url).includes(PREFERRED_VARIANT));
  if (preferred !== undefined) return preferred;

  let best: RawCover | null = null;
  for (const cover of candidates) {
    const width = cover.width;
    if (width === null || !Number.isFinite(width) || width <= 0) continue;
    if (best === null || width > (best.width ?? 0)) best = cover;
  }
  if (best === null) {
    throw new SyncError('G4', 'no usable cover: no non-WEBP entry with a finite width');
  }
  return best;
}

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

/** Detects PNG, JPEG or WEBP by magic bytes; null for anything else. */
export function sniffImage(bytes: Uint8Array): ImageExt | null {
  if (bytes.length >= PNG_SIGNATURE.length && startsWith(bytes, PNG_SIGNATURE)) return 'png';
  if (bytes.length >= JPEG_SIGNATURE.length && startsWith(bytes, JPEG_SIGNATURE)) return 'jpg';
  if (bytes.length >= 12 && startsWith(bytes, RIFF) && startsWith(bytes, WEBP, 8)) return 'webp';
  return null;
}

/** `<id>-<sha256 hex first 12>.<ext>`; the id must be digits only (no scraped text in paths). */
export function coverFileName(id: string, bytes: Uint8Array, ext: ImageExt): string {
  if (!DIGITS.test(id)) {
    throw new SyncError('G4', `cover id must be digits only, got ${JSON.stringify(id)}`);
  }
  if (ext !== 'png' && ext !== 'jpg' && ext !== 'webp') {
    throw new SyncError('G4', `unsupported cover extension ${JSON.stringify(ext)}`);
  }
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
  return `${id}-${hash}.${ext}`;
}
