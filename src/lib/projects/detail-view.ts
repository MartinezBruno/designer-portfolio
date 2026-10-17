/**
 * Detail-page helpers that are pure and Node-safe: shared by the site and the e2e helpers, so this
 * file has no astro:* imports and uses `.ts` value imports only.
 */

/**
 * Next and previous project for `slug` in an already sorted, visible-only list (D-13). Pass
 * `sortProjects(...)` output so hidden projects can never be a neighbour. Wraps around both ways.
 * With 1 project there are no neighbours; with 2 only `next` is set (the other project), so the
 * page never links the same project twice.
 */
export function neighbours<T extends { slug: string }>(
  sorted: readonly T[],
  slug: string,
): { next: T | null; previous: T | null } {
  const index = sorted.findIndex((entry) => entry.slug === slug);
  if (index === -1) {
    throw new Error(
      `projects: no visible project with slug "${slug}". Check src/data/project-overrides.json`,
    );
  }
  const count = sorted.length;
  if (count < 2) return { next: null, previous: null };
  const next = sorted[(index + 1) % count] ?? null;
  if (count === 2) return { next, previous: null };
  const previous = sorted[(index - 1 + count) % count] ?? null;
  return { next, previous };
}
