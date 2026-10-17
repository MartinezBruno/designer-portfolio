// Shared by scripts/sync-behance.ts (Node type stripping) and the site build. Erasable TypeScript
// only, .ts extensions on value imports.
import { z } from 'astro/zod';

/** `<digits>-<12 hex>.<ext>`: no scraped string ever reaches a file path (T-03-05). */
export const COVER_FILE = /^\d+-[0-9a-f]{12}\.(png|jpg|webp)$/;

const TaxonomySchema = z.strictObject({ id: z.int(), title: z.string() });

export const SnapshotProjectSchema = z.strictObject({
  id: z.string().regex(/^\d+$/),
  /** The Behance slug, as published. The site slug is derived with toSlug. */
  slug: z.string().min(1),
  name: z.string().min(1),
  url: z.url(),
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
    sourceUrl: z.url(),
    width: z.int().nullable(),
  }),
  /** Full module JSON, kept for the mirrored detail pages. */
  modules: z.array(z.looseObject({ __typename: z.string() })),
});

export const SnapshotSchema = z.strictObject({
  version: z.literal(1),
  origin: z.enum(['seed', 'behance-sync']),
  syncedAt: z.iso.datetime(),
  profile: z.strictObject({ username: z.string().min(1), url: z.url() }),
  projects: z.array(SnapshotProjectSchema).min(1),
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
