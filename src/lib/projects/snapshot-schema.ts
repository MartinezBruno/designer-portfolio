// Shared by scripts/sync-behance.ts (Node type stripping) and the site build. Erasable TypeScript
// only, .ts extensions on value imports.
import { z } from 'astro/zod';

/** `<digits>-<12 hex>.<ext>`: no scraped string ever reaches a file path (T-03-05). */
export const COVER_FILE = /^\d+-[0-9a-f]{12}\.(png|jpg|webp)$/;

const TaxonomySchema = z.strictObject({ id: z.int(), title: z.string() });

/**
 * https URL on one exact host, with no credentials. The snapshot is a committed, hand-editable
 * file, so a bare z.url() (which accepts javascript:, data: and file: URLs) is not enough for a
 * field the site may render as a link (T-03-05).
 */
function httpsUrlOn(host: RegExp) {
  return z.url({ protocol: /^https$/, hostname: host }).refine((value) => {
    const url = new URL(value);
    return url.username === '' && url.password === '';
  }, 'URL must not contain credentials');
}

/** Behance pages: the profile and project galleries. */
const BehancePageUrl = httpsUrlOn(/^www\.behance\.net$/);
/** The Behance image CDN host the sync downloads covers from. */
const BehanceCdnUrl = httpsUrlOn(/^mir-s3-cdn-cf\.behance\.net$/);

/** `<digits>-<12 hex>.webp`: module images are always stored as WebP (T-04-04). */
export const MODULE_FILE = /^\d+-[0-9a-f]{12}\.webp$/;

/** One stored module image. width/height are the real pixel size read from the stored bytes. */
export const ImageRefSchema = z.strictObject({
  /** ImageModule id or collection component id (the moduleAlt override key). */
  id: z.string().regex(/^\d+$/),
  file: z.string().regex(MODULE_FILE),
  width: z.int().positive().max(1400),
  height: z.int().positive(),
  sourceUrl: BehanceCdnUrl,
});

const ALIGN_STYLE = /^ style="text-align:(left|right|center|justify);?"$/;
const PLAIN_TAG = /^<(\/(p|div|a|strong|b|em|i)|p|div|br \/|strong|b|em|i)>$/;
const LINK_OPEN = /^<a((?: [a-z]+="[^"<>]*")+)>$/;
const LINK_ATTR = / ([a-z]+)="([^"<>]*)"/g;
const LINK_HREF = /^(https?:|mailto:)/i;

/** One tag of the sanitized grammar (scripts/behance/sanitize.ts TEXT_OPTIONS output). */
function isStoredTag(tag: string): boolean {
  if (PLAIN_TAG.test(tag)) return true;
  const block = /^<(p|div)(.*)>$/.exec(tag);
  if (block !== null) return ALIGN_STYLE.test(block[2] ?? '');
  const link = LINK_OPEN.exec(tag);
  if (link === null) return false;
  const attrs = new Map([...(link[1] ?? '').matchAll(LINK_ATTR)].map((m) => [m[1], m[2] ?? '']));
  return (
    attrs.size === 3 &&
    LINK_HREF.test(attrs.get('href') ?? '') &&
    attrs.get('target') === '_blank' &&
    attrs.get('rel') === 'noopener noreferrer'
  );
}

/**
 * True when `html` is in the sanitizer's stored grammar: only TEXT_OPTIONS tags and attributes,
 * http(s)/mailto links, and no `<` or `>` outside a tag. sanitize-html cannot run on the site (D-02),
 * so this dependency-free check makes the build fail closed on a hand-edited or badly merged
 * snapshot. The sanitizer fixed-point test stays the primary guard.
 */
export function isStoredTextHtml(html: string): boolean {
  const tags = html.match(/<[^<>]*>/g) ?? [];
  return tags.every(isStoredTag) && !/[<>]/.test(html.replace(/<[^<>]*>/g, ''));
}

/** Text HTML injected unescaped by TextModule.astro: must already be in sanitized form. */
const StoredTextHtml = z
  .string()
  .refine(isStoredTextHtml, 'text html is not in sanitized form; re-run pnpm sync:behance');

/** Source-agnostic project content, normalized at sync time. Text HTML is already sanitized. */
export const ContentSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('image'),
    image: ImageRefSchema,
    fullBleed: z.boolean(),
    caption: z.string(),
  }),
  z.strictObject({ kind: z.literal('collection'), images: z.array(ImageRefSchema).min(1) }),
  z.strictObject({ kind: z.literal('text'), html: StoredTextHtml }),
  z.strictObject({
    kind: z.literal('embed'),
    provider: z.enum(['figma']),
    src: httpsUrlOn(/^embed\.figma\.com$/),
  }),
  z.strictObject({ kind: z.literal('unknown'), type: z.string() }),
]);

export type ImageRef = z.infer<typeof ImageRefSchema>;

export type ContentEntry = z.infer<typeof ContentSchema>;

/** Image ids in DOM order: each image entry, then each collection's images in order. */
export function contentImageIds(content: readonly ContentEntry[]): string[] {
  return content.flatMap((entry) => {
    if (entry.kind === 'image') return [entry.image.id];
    if (entry.kind === 'collection') return entry.images.map((image) => image.id);
    return [];
  });
}

export const SnapshotProjectSchema = z.strictObject({
  id: z.string().regex(/^\d+$/),
  /** The Behance slug, as published. The site slug is derived with toSlug. */
  slug: z.string().min(1),
  name: z.string().min(1),
  url: BehancePageUrl,
  /** Unix seconds. */
  publishedOn: z.int().positive(),
  modifiedOn: z.int().nullable(),
  description: z.string(),
  tags: z.array(TaxonomySchema),
  tools: z.array(TaxonomySchema),
  /** Derived creative fields: a curation checklist only, never a runtime category. */
  fields: z.array(z.string()),
  canvasWidth: z.int().nullable(),
  cover: z.strictObject({
    file: z.string().regex(COVER_FILE),
    sourceUrl: BehanceCdnUrl,
    width: z.int().nullable(),
  }),
  /** Full module JSON, kept for the mirrored detail pages. */
  modules: z.array(z.looseObject({ __typename: z.string() })),
  /** Normalized, sanitized content (D-05, D-08). Required since the 04-08 re-sync. */
  content: z.array(ContentSchema),
});

export const SnapshotSchema = z.strictObject({
  version: z.literal(1),
  origin: z.enum(['seed', 'behance-sync']),
  syncedAt: z.iso.datetime(),
  profile: z.strictObject({ username: z.string().min(1), url: BehancePageUrl }),
  projects: z
    .array(SnapshotProjectSchema)
    .min(1)
    .superRefine((projects, ctx) => {
      // Overrides are keyed by id, so two entries with one id would render twice with one override.
      const seen = new Set<string>();
      for (const [index, project] of projects.entries()) {
        if (seen.has(project.id)) {
          ctx.addIssue({
            code: 'custom',
            path: [index, 'id'],
            message: `duplicate project id ${project.id}`,
          });
        }
        seen.add(project.id);
      }
    }),
});

export type Snapshot = z.infer<typeof SnapshotSchema>;

export type SnapshotProject = Snapshot['projects'][number];

export function parseSnapshot(raw: Parameters<typeof SnapshotSchema.parse>[0]): Snapshot {
  const result = SnapshotSchema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    const where = issue === undefined ? 'root' : issue.path.map(String).join('.') || 'root';
    const message = issue?.message ?? 'unknown error';
    throw new Error(
      `snapshot: invalid or missing src/data/behance/snapshot.json (${where}: ${message}). Re-run pnpm sync:behance or restore it from git`,
    );
  }
  return result.data;
}
