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

// Module shapes the content normalizer reads (module-content.ts). Raw width/height are the 600px
// display size and are never trusted; altText is never read (Phase 3 D-15).
export const RawImageSizesSchema = z.looseObject({
  allAvailable: z.array(
    z.looseObject({
      url: z.string(),
      width: z.number().nullable().optional(),
      type: z.string().optional(),
    }),
  ),
});

export const RawImageModuleSchema = z.looseObject({
  __typename: z.literal('ImageModule'),
  id: behanceId,
  fullBleed: z.union([z.literal(0), z.literal(1), z.boolean()]).optional(),
  caption: z.string().optional(),
  captionPlain: z.string().optional(),
  imageSizes: RawImageSizesSchema,
});

export const RawCollectionModuleSchema = z.looseObject({
  __typename: z.literal('MediaCollectionModule'),
  id: behanceId,
  components: z.array(z.looseObject({ id: behanceId, imageSizes: RawImageSizesSchema })).min(1),
});

export const RawTextModuleSchema = z.looseObject({
  __typename: z.literal('TextModule'),
  id: behanceId,
  text: z.string(),
});

export const RawEmbedModuleSchema = z.looseObject({
  __typename: z.literal('EmbedModule'),
  id: behanceId,
  originalEmbed: z.string().optional(),
  fluidEmbed: z.string().optional(),
});

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
