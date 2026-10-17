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

type SourceRef = { id: string; sourceSlug: string };

function finalSlug(source: SourceRef, overrides: Overrides): string {
  return overrides[source.id]?.slug ?? toSlug(source.sourceSlug);
}

/**
 * Fails loudly on overrides the build cannot honour: unknown ids, titles over the two-line limit,
 * and duplicate final slugs across every source, hidden ones included (a hidden project keeps its
 * URL reserved).
 */
export function validateOverrides(sources: readonly SourceRef[], overrides: Overrides): void {
  const known = new Set(sources.map((source) => source.id));
  for (const [id, override] of Object.entries(overrides)) {
    if (!known.has(id)) {
      throw new Error(
        `project-overrides: unknown Behance id ${id}. Remove it or fix the id in src/data/project-overrides.json`,
      );
    }
    if (override.title === undefined) continue;
    for (const locale of locales) {
      const length = [...override.title[locale]].length;
      if (length > TITLE_MAX) {
        throw new Error(
          `project-overrides: title.${locale} for ${id} is ${length} characters (max ${TITLE_MAX}). Shorten it in src/data/project-overrides.json`,
        );
      }
    }
  }
  assertUniqueSlugs(
    sources.map((source) => ({ id: source.id, slug: finalSlug(source, overrides) })),
  );
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
