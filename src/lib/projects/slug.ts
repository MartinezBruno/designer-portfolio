// Slug rule (D-08), shared by the site and scripts/sync-behance.ts. Erasable TypeScript only.

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Apostrophes and quotes join words ("Cabrera´s" -> "cabreras") instead of splitting them.
const QUOTES = /[´'’"“”]/g;
const MARKS = /\p{M}/gu;
const NON_ALPHANUMERIC = /[^a-z0-9]+/g;
const EDGE_DASHES = /^-+|-+$/g;

export function toSlug(input: string): string {
  const slug = input
    .replace(QUOTES, '')
    .normalize('NFKD')
    .replace(MARKS, '')
    .toLowerCase()
    .replace(NON_ALPHANUMERIC, '-')
    .replace(EDGE_DASHES, '');
  if (slug === '') {
    throw new Error(
      `projects: empty slug from "${input}". Add a "slug" override in src/data/project-overrides.json`,
    );
  }
  return slug;
}
