// Raw Behance modules -> the source-agnostic content union. Erasable TypeScript only (Node type
// stripping runs it).
//
// planModuleImages lists the images to download, in DOM order (each ImageModule, then each
// collection component), with candidate URLs picked by path segment in IMAGE_VARIANTS order, never
// by array position (the pickCover rule). toContent maps every module to one ContentEntry: text is
// sanitized (sanitize.ts), embeds are allowlisted (embeds.ts), and anything else becomes an
// 'unknown' entry plus a sync warning (D-07, D-08). A known type with an unexpected shape fails
// gate G4m. Behance altText is never read (Phase 3 D-15). The result is validated by ContentSchema.
import type { ContentEntry, ImageRef } from '../../src/lib/projects/snapshot-schema.ts';
import { providerForUrl } from '../../src/lib/projects/embeds.ts';
import { SyncError } from './errors.ts';
import {
  RawCollectionModuleSchema,
  RawEmbedModuleSchema,
  RawImageModuleSchema,
  RawTextModuleSchema,
  type RawModule,
} from './raw-schemas.ts';
import { cleanTextHtml, extractEmbedSrc } from './sanitize.ts';

export const KNOWN_MODULES: ReadonlySet<string> = new Set([
  'ImageModule',
  'TextModule',
  'MediaCollectionModule',
  'EmbedModule',
]);

export const IMAGE_VARIANTS = [
  '1400_webp',
  '1400',
  'max_1200_webp',
  'max_1200',
  'fs_webp',
  'fs',
] as const;

export interface ImagePlan {
  id: string;
  /** Candidate URLs in IMAGE_VARIANTS order; only variants present in allAvailable. */
  candidates: readonly string[];
}

interface ProjectRef {
  id: string;
  slug: string;
}

interface SizedImage {
  id: number | string;
  imageSizes: { allAvailable: { url: string }[] };
}

const DIGITS = /^\d+$/;

function pathOf(url: string): string {
  return URL.canParse(url) ? new URL(url).pathname : '';
}

function where(project: ProjectRef | undefined): string {
  return project === undefined ? '' : ` (${project.slug})`;
}

function shapeError(module: RawModule, project: ProjectRef | undefined): SyncError {
  const id = 'id' in module ? String(module['id']) : '?';
  return new SyncError(
    'G4m',
    `${id}${where(project)}: ${module.__typename} has an unexpected shape`,
  );
}

function imageId(raw: number | string, project: ProjectRef | undefined): string {
  const id = String(raw);
  if (!DIGITS.test(id)) {
    throw new SyncError(
      'G4m',
      `image id must be digits only, got ${JSON.stringify(id)}${where(project)}`,
    );
  }
  return id;
}

function planOf(image: SizedImage, project: ProjectRef | undefined): ImagePlan {
  const id = imageId(image.id, project);
  const candidates: string[] = [];
  for (const variant of IMAGE_VARIANTS) {
    const segment = `/project_modules/${variant}/`;
    const match = image.imageSizes.allAvailable.find((entry) =>
      pathOf(entry.url).includes(segment),
    );
    if (match !== undefined) candidates.push(match.url);
  }
  if (candidates.length === 0) {
    throw new SyncError('G4m', `${id}${where(project)}: no usable image variant`);
  }
  return { id, candidates };
}

/** The images to download, in DOM order. Fails G4m on a malformed image or collection module. */
export function planModuleImages(modules: readonly RawModule[], project?: ProjectRef): ImagePlan[] {
  const plans: ImagePlan[] = [];
  for (const module of modules) {
    if (module.__typename === 'ImageModule') {
      const parsed = RawImageModuleSchema.safeParse(module);
      if (!parsed.success) throw shapeError(module, project);
      plans.push(planOf(parsed.data, project));
    } else if (module.__typename === 'MediaCollectionModule') {
      const parsed = RawCollectionModuleSchema.safeParse(module);
      if (!parsed.success) throw shapeError(module, project);
      for (const component of parsed.data.components) plans.push(planOf(component, project));
    }
  }
  return plans;
}

function stored(
  raw: number | string,
  images: ReadonlyMap<string, ImageRef>,
  project: ProjectRef,
): ImageRef {
  const id = imageId(raw, project);
  const image = images.get(id);
  if (image === undefined) {
    throw new SyncError('G4m', `${project.id} (${project.slug}): image ${id} has no stored file`);
  }
  return image;
}

function originOf(src: string | null): string {
  if (src === null || !URL.canParse(src)) return 'unparsable';
  const url = new URL(src);
  return url.origin === 'null' ? url.protocol : url.origin;
}

/**
 * One ContentEntry per module, in module order, plus the sync warnings for unknown types and
 * non-allowlisted embeds. Throws SyncError('G4m') when an image id is missing from `images`.
 */
export function toContent(
  modules: readonly RawModule[],
  images: ReadonlyMap<string, ImageRef>,
  project: ProjectRef,
): { content: ContentEntry[]; warnings: string[] } {
  const content: ContentEntry[] = [];
  const warnings: string[] = [];
  for (const module of modules) {
    switch (module.__typename) {
      case 'ImageModule': {
        const parsed = RawImageModuleSchema.safeParse(module);
        if (!parsed.success) throw shapeError(module, project);
        const { id, fullBleed, caption } = parsed.data;
        content.push({
          kind: 'image',
          image: stored(id, images, project),
          fullBleed: fullBleed === 1 || fullBleed === true,
          caption: caption ?? '',
        });
        break;
      }
      case 'MediaCollectionModule': {
        const parsed = RawCollectionModuleSchema.safeParse(module);
        if (!parsed.success) throw shapeError(module, project);
        content.push({
          kind: 'collection',
          images: parsed.data.components.map((component) => stored(component.id, images, project)),
        });
        break;
      }
      case 'TextModule': {
        const parsed = RawTextModuleSchema.safeParse(module);
        if (!parsed.success) throw shapeError(module, project);
        content.push({ kind: 'text', html: cleanTextHtml(parsed.data.text) });
        break;
      }
      case 'EmbedModule': {
        const parsed = RawEmbedModuleSchema.safeParse(module);
        if (!parsed.success) throw shapeError(module, project);
        const src = extractEmbedSrc(parsed.data.originalEmbed ?? parsed.data.fluidEmbed ?? '');
        const provider = src === null ? null : providerForUrl(src);
        if (src !== null && provider !== null) {
          content.push({ kind: 'embed', provider, src });
        } else {
          content.push({ kind: 'unknown', type: 'EmbedModule' });
          warnings.push(
            `sync:behance: embed origin "${originOf(src)}" in ${project.id} (${project.slug}) is not allowlisted. It renders the Behance fallback note. Add it to the embed allowlist in src/lib/projects/ if it is safe.`,
          );
        }
        break;
      }
      default: {
        content.push({ kind: 'unknown', type: module.__typename });
        warnings.push(
          `sync:behance: unknown module type "${module.__typename}" in ${project.id} (${project.slug}). It renders the Behance fallback note.`,
        );
      }
    }
  }
  return { content, warnings };
}
