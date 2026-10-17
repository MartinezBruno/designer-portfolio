// Module image download, WebP storage and file naming (D-05, D-06). Erasable TypeScript only
// (Node type stripping runs it). This is the ONLY file that imports sharp.
//
// - Candidates are tried in IMAGE_VARIANTS order; a 404 or non-image reply moves to the next one
//   (RESEARCH Pitfall 2). Every other download failure stops the sync (fetchModuleImage guards).
// - WebP up to 1400 px wide is stored as-is; anything else is re-encoded to WebP, max 1400 px wide,
//   never upscaled. width/height always come from the stored bytes, never from Behance's fields.
// - Files are named `<imageId>-<sha256(stored bytes)[0..12]>.webp`: no scraped text in paths.
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import type { ImageRef } from '../../src/lib/projects/snapshot-schema.ts';
import type { ImageExt } from './covers.ts';
import { SyncError } from './errors.ts';
import { fetchModuleImage } from './fetch-page.ts';
import type { FetchDeps } from './fetch-page.ts';
import type { ImagePlan } from './module-content.ts';

const MAX_WIDTH = 1400;
/** [ASSUMED] WebP quality for re-encoded fallbacks; tuned by eye on PuroV in 04-11. */
const WEBP_QUALITY = 82;
const DIGITS = /^\d+$/;

/** Returns WebP bytes no wider than 1400 px with their real pixel size. */
export async function encodeModuleImage(
  bytes: Uint8Array,
  ext: ImageExt,
): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  if (ext === 'webp') {
    const { width, height } = await sharp(bytes).metadata();
    if (width <= MAX_WIDTH) return { bytes, width, height };
  }
  const { data, info } = await sharp(bytes)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer({ resolveWithObject: true });
  return { bytes: new Uint8Array(data), width: info.width, height: info.height };
}

/** `<id>-<sha256 hex first 12>.webp`; the id must be digits only (T-04-04). */
export function moduleFileName(id: string, bytes: Uint8Array): string {
  if (!DIGITS.test(id)) {
    throw new SyncError('G4m', `module image id must be digits only, got ${JSON.stringify(id)}`);
  }
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
  return `${id}-${hash}.webp`;
}

/** Downloads the first available candidate and returns its stored bytes and ImageRef. */
export async function downloadModuleImage(
  plan: ImagePlan,
  deps: FetchDeps,
  project: { id: string; slug: string },
): Promise<{ ref: ImageRef; bytes: Uint8Array }> {
  const reasons: string[] = [];
  for (const url of plan.candidates) {
    const result = await fetchModuleImage(url, deps);
    if (result.status === 'skip') {
      reasons.push(result.reason);
      continue;
    }
    const stored = await encodeModuleImage(result.bytes, result.ext);
    const ref: ImageRef = {
      id: plan.id,
      file: moduleFileName(plan.id, stored.bytes),
      width: stored.width,
      height: stored.height,
      sourceUrl: url,
    };
    return { ref, bytes: stored.bytes };
  }
  throw new SyncError(
    'G4m',
    `could not download module image ${plan.id} for ${project.id} (${project.slug}): ${
      reasons.length > 0 ? reasons.join('; ') : 'no candidates'
    }`,
  );
}
