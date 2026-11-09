/**
 * Schema for src/data/project-overrides.json (DATA-05), keyed by Behance id. Node-safe (astro/zod
 * only, .ts value imports) so scripts/sync-behance.ts and the e2e helpers apply the same rules.
 *
 * TODO(martina): every value in src/data/project-overrides.json is a draft, listed in 08-SPANISH-REVIEW.md
 * (.planning/phases/08-quality-verification/) because JSON has no comments (same as content.config.ts).
 */
import { z } from 'astro/zod';
import { locales } from '../../i18n/config.ts';
import { categoryIds } from './model.ts';
import { SLUG_PATTERN } from './slug.ts';

export const localized = z.object({ en: z.string().min(1), es: z.string().min(1) });

// Title length (max 32) is checked in validateOverrides so the message names id and locale.
export const OverrideSchema = z.strictObject({
  slug: z.string().regex(SLUG_PATTERN).optional(),
  title: localized.optional(),
  summary: localized.optional(),
  coverAlt: localized.optional(),
  category: z.enum(categoryIds).optional(),
  featured: z.boolean().optional(),
  order: z.number().int().optional(),
  hidden: z.boolean().optional(),
  contentLang: z.enum(locales).optional(),
  // Per-image alt text keyed by image id (D-09). Unknown keys and the 125-character limit are
  // checked in validateOverrides, against the snapshot's image ids.
  moduleAlt: z.record(z.string().regex(/^\d+$/), localized).optional(),
  // 07 D-11a: opt out of the detail-stack side entrance: false = whole project, list = image ids.
  // Unknown ids are checked in validateOverrides, against the snapshot's image ids.
  stackMotion: z.union([z.literal(false), z.array(z.string().regex(/^\d+$/))]).optional(),
});

export const OverridesSchema = z.record(z.string().regex(/^\d+$/), OverrideSchema);

export type Override = z.infer<typeof OverrideSchema>;
export type Overrides = z.infer<typeof OverridesSchema>;

/** Parses the overrides file, throwing a one-line developer message for the first issue. */
export function parseOverrides(raw: Parameters<typeof OverridesSchema.parse>[0]): Overrides {
  const result = OverridesSchema.safeParse(raw, { reportInput: true });
  if (result.success) return result.data;

  const issue = result.error.issues[0];
  const path = issue?.path.map(String) ?? [];
  const [id, field] = path;
  if (issue !== undefined && path.length === 2 && field === 'category') {
    throw new Error(
      `project-overrides: invalid category "${String(issue.input)}" for ${id}. Use one of ${categoryIds.join(', ')}`,
    );
  }
  const where = path.length === 0 ? 'root' : path.join('.');
  throw new Error(
    `project-overrides: ${where}: ${issue?.message ?? 'invalid'}. Fix src/data/project-overrides.json`,
  );
}
