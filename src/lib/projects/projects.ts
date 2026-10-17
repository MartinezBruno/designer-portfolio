/**
 * Pure build, guard and sort functions for projects. Kept free of any source and of Astro
 * virtual modules so the site and scripts/sync-behance.ts (Node type stripping) share the
 * same rules. Erasable TypeScript only, .ts extensions on value imports.
 */
import type { OrderFields, Project, SourceProject } from './model.ts';
import { toSlug } from './slug.ts';

/** Builds a Project per source with every curated field unset. Returns new objects. */
export function toProjects(sources: readonly SourceProject[]): Project[] {
  return sources.map((source) => ({
    id: source.id,
    sourceSlug: source.sourceSlug,
    sourceTitle: source.sourceTitle,
    sourceUrl: source.sourceUrl,
    publishedOn: source.publishedOn,
    tools: [...source.tools],
    cover: source.cover,
    slug: toSlug(source.sourceSlug),
    title: null,
    summary: null,
    coverAlt: null,
    category: null,
    order: null,
    featured: false,
    hidden: false,
    // Her Behance copy is written in Spanish.
    contentLang: 'es',
  }));
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
