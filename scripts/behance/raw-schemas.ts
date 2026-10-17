// Zod schemas for the raw Behance store slices the sync reads.
// Erasable TypeScript only (Node type stripping runs it).
// Loose objects: Behance adds fields freely; only the fields we use are validated.
import { z } from 'astro/zod';

const unixSeconds = z.number().int();
const behanceId = z.union([z.number().int(), z.string()]);

export const RawCoverSchema = z.object({
  url: z.string(),
  width: z.number().nullable(),
  type: z.string(),
});

export const RawProfileProjectSchema = z.looseObject({
  id: z.number().int(),
  slug: z.string(),
  name: z.string(),
  url: z.string(),
  publishedOn: unixSeconds,
  modifiedOn: unixSeconds.optional(),
  covers: z.looseObject({ allAvailable: z.array(RawCoverSchema) }),
});

export const RawProfileStoreSchema = z.looseObject({
  profile: z.looseObject({
    activeSection: z.looseObject({
      work: z.looseObject({
        profileProjects: z.array(RawProfileProjectSchema),
        hasMore: z.boolean(),
      }),
    }),
  }),
});

const RawLabelSchema = z.object({ id: behanceId, title: z.string() });

export const RawModuleSchema = z.looseObject({ __typename: z.string() });

export const RawProjectSchema = z.looseObject({
  id: z.number().int(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  url: z.string(),
  publishedOn: unixSeconds,
  canvasWidth: z.number().int().nullable().optional(),
  tags: z.array(RawLabelSchema),
  tools: z.array(RawLabelSchema),
  allModules: z.array(RawModuleSchema),
});

export const RawProjectStoreSchema = z.looseObject({
  project: z.looseObject({ project: RawProjectSchema }),
});

export type RawCover = z.infer<typeof RawCoverSchema>;
export type RawProfileProject = z.infer<typeof RawProfileProjectSchema>;
export type RawProject = z.infer<typeof RawProjectSchema>;
export type RawModule = z.infer<typeof RawModuleSchema>;
