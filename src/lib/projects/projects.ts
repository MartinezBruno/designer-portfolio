/**
 * Pure build, guard and sort functions for projects. Kept free of any source and of Astro
 * virtual modules so the site and scripts/sync-behance.ts (Node type stripping) share the
 * same rules. Erasable TypeScript only, .ts extensions on value imports.
 */
import { locales } from '../../i18n/config.ts';
import type { Localized, OrderFields, Project, SourceProject } from './model.ts';
import type { Overrides } from './overrides-schema.ts';
import { toSlug } from './slug.ts';

const TITLE_MAX = 32;
const MODULE_ALT_MAX = 125;

type SourceRef = { id: string; sourceSlug: string; imageIds: readonly string[] };

function finalSlug(source: SourceRef, overrides: Overrides): string {
  return overrides[source.id]?.slug ?? toSlug(source.sourceSlug);
}

/**
 * Fails loudly on overrides the build cannot honour: unknown ids, titles over the two-line limit,
 * moduleAlt keys and stackMotion ids that match no image of that project, moduleAlt values over
 * 125 characters, and
 * duplicate final slugs across every source, hidden ones included (a hidden project keeps its URL
 * reserved). Lengths are counted in code points.
 */
export function validateOverrides(sources: readonly SourceRef[], overrides: Overrides): void {
  const known = new Map(sources.map((source) => [source.id, source]));
  for (const [id, override] of Object.entries(overrides)) {
    const source = known.get(id);
    if (source === undefined) {
      throw new Error(
        `project-overrides: unknown Behance id ${id}. Remove it or fix the id in src/data/project-overrides.json`,
      );
    }
    if (override.title !== undefined) {
      for (const locale of locales) {
        const length = [...override.title[locale]].length;
        if (length > TITLE_MAX) {
          throw new Error(
            `project-overrides: title.${locale} for ${id} is ${length} characters (max ${TITLE_MAX}). Shorten it in src/data/project-overrides.json`,
          );
        }
      }
    }
    const images = new Set(source.imageIds);
    // Checked before the moduleAlt early continue: a project may set stackMotion alone (D-11a).
    if (Array.isArray(override.stackMotion)) {
      for (const key of override.stackMotion) {
        if (!images.has(key)) {
          throw new Error(
            `project-overrides: stackMotion id ${key} for ${id} matches no image in the snapshot. Fix or remove it in src/data/project-overrides.json`,
          );
        }
      }
    }
    if (override.moduleAlt === undefined) continue;
    for (const [key, value] of Object.entries(override.moduleAlt)) {
      if (!images.has(key)) {
        throw new Error(
          `project-overrides: moduleAlt key ${key} for ${id} matches no image in the snapshot. Fix or remove it in src/data/project-overrides.json`,
        );
      }
      for (const locale of locales) {
        const length = [...value[locale]].length;
        if (length > MODULE_ALT_MAX) {
          throw new Error(
            `project-overrides: moduleAlt.${locale} for ${id}/${key} is ${length} characters (max 125). Shorten it in src/data/project-overrides.json`,
          );
        }
      }
    }
  }
  assertUniqueSlugs(
    sources.map((source) => ({ id: source.id, slug: finalSlug(source, overrides) })),
  );
}

/** A fresh moduleAlt map built entry by entry; `{}` when nothing is curated. */
function copyModuleAlt(
  value: Readonly<Record<string, Localized<string>>> | undefined,
): Record<string, Localized<string>> {
  const result: Record<string, Localized<string>> = {};
  if (value === undefined) return result;
  for (const [id, alt] of Object.entries(value)) {
    result[id] = { en: alt.en, es: alt.es };
  }
  return result;
}

/** `false` (project opted out), a fresh id list, or `[]` when nothing is opted out (D-11a). */
function copyStackMotion(value: false | readonly string[] | undefined): false | string[] {
  if (value === false) return false;
  return value === undefined ? [] : [...value];
}

function copyLocalized(value: Localized<string> | undefined): Localized<string> | null {
  return value === undefined ? null : { en: value.en, es: value.es };
}

/**
 * Validates the overrides, then builds one Project per source. Every field is set explicitly
 * (never spread Zod optionals), so no property is ever undefined. Returns new objects.
 */
export function applyOverrides(sources: readonly SourceProject[], overrides: Overrides): Project[] {
  validateOverrides(sources, overrides);
  return sources.map((source) => {
    const override = overrides[source.id];
    return {
      id: source.id,
      sourceSlug: source.sourceSlug,
      sourceTitle: source.sourceTitle,
      sourceUrl: source.sourceUrl,
      publishedOn: source.publishedOn,
      tools: [...source.tools],
      cover: source.cover,
      imageIds: [...source.imageIds],
      modules: source.modules,
      slug: finalSlug(source, overrides),
      title: copyLocalized(override?.title),
      summary: copyLocalized(override?.summary),
      coverAlt: copyLocalized(override?.coverAlt),
      category: override?.category ?? null,
      order: override?.order ?? null,
      featured: override?.featured ?? false,
      hidden: override?.hidden ?? false,
      // Her Behance copy is written in Spanish.
      contentLang: override?.contentLang ?? 'es',
      moduleAlt: copyModuleAlt(override?.moduleAlt),
      stackMotion: copyStackMotion(override?.stackMotion),
    };
  });
}

const CURATED_FIELDS = ['title', 'category', 'summary', 'coverAlt'] as const;

export type CuratedField = (typeof CURATED_FIELDS)[number];

/** Per source project, which curated fields have no override yet (sync checklist, D-22). */
export function missingOverrides(
  sources: readonly SourceRef[],
  overrides: Overrides,
): { id: string; slug: string; missing: CuratedField[] }[] {
  return sources.map((source) => {
    const override = overrides[source.id];
    return {
      id: source.id,
      slug: finalSlug(source, overrides),
      missing: CURATED_FIELDS.filter((field) => override?.[field] === undefined),
    };
  });
}

/**
 * Per source project, how many content images have no moduleAlt entry yet (sync checklist, D-09).
 * `total` counts every image id, `missing` the ones without a moduleAlt key.
 */
export function missingModuleAlts(
  sources: readonly SourceRef[],
  overrides: Overrides,
): { id: string; slug: string; missing: number; total: number }[] {
  return sources.map((source) => {
    const moduleAlt = overrides[source.id]?.moduleAlt;
    const missing = source.imageIds.filter((imageId) => moduleAlt?.[imageId] === undefined);
    return {
      id: source.id,
      slug: finalSlug(source, overrides),
      missing: missing.length,
      total: source.imageIds.length,
    };
  });
}

export function assertUniqueSlugs<T extends { id: string; slug: string }>(
  projects: readonly T[],
): readonly T[] {
  const seen = new Map<string, string>();
  for (const project of projects) {
    const firstId = seen.get(project.slug);
    if (firstId !== undefined) {
      throw new Error(
        `projects: duplicate slug "${project.slug}" (${firstId}, ${project.id}). Add a "slug" override to one of them`,
      );
    }
    seen.set(project.slug, project.id);
  }
  return projects;
}

/**
 * Drops hidden projects, then sorts: explicit `order` first (ascending), then newest
 * `publishedOn`, then id. Returns a new array; never mutates the input.
 */
export function sortProjects<T extends OrderFields>(projects: readonly T[]): T[] {
  return projects
    .filter((project) => !project.hidden)
    .sort((a, b) => {
      if (a.order !== null && b.order !== null && a.order !== b.order) return a.order - b.order;
      if (a.order !== null && b.order === null) return -1;
      if (a.order === null && b.order !== null) return 1;
      return b.publishedOn - a.publishedOn || a.id.localeCompare(b.id);
    });
}

function newestFirst<T extends OrderFields>(a: T, b: T): number {
  return b.publishedOn - a.publishedOn || a.id.localeCompare(b.id);
}

/**
 * Home selection (D-17): featured projects first (explicit order ascending, unordered last, then
 * newest), then the newest remaining projects, hidden excluded, at most `limit`. With nothing
 * featured this is the `limit` newest. Returns a new array; never mutates the input.
 */
export function selectHomeProjects<T extends OrderFields>(projects: readonly T[], limit = 3): T[] {
  const visible = projects.filter((project) => !project.hidden);
  const featured = visible
    .filter((project) => project.featured)
    .sort((a, b) => {
      if (a.order !== null && b.order !== null && a.order !== b.order) return a.order - b.order;
      if (a.order !== null && b.order === null) return -1;
      if (a.order === null && b.order !== null) return 1;
      return newestFirst(a, b);
    });
  const rest = visible.filter((project) => !project.featured).sort(newestFirst);
  return [...featured, ...rest].slice(0, limit);
}
