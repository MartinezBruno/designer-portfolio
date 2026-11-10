/**
 * Reads and writes the Projects category filter in the URL (`?category=<id>`, PROJ-07, D-14a).
 * Pure and client-safe: no imports at all, so both Astro and the client filter script can use it.
 * The value is attacker-controllable (shared links, history entries), so it is allow-listed
 * against the categories the page actually rendered: exactly one allow-listed value wins, anything
 * else (missing, empty, `all`, wrong case, unknown, unrendered or repeated) falls back to All.
 */

/** The All radio's value (UI-SPEC): no category, every card shown, no `category` param. */
export const ALL_CATEGORIES = '';

export function parseCategoryParam(search: string, allowed: readonly string[]): string {
  const values = new URLSearchParams(search).getAll('category');
  if (values.length !== 1) return ALL_CATEGORIES;
  const [value] = values;
  if (value === undefined || value === '') return ALL_CATEGORIES;
  return allowed.includes(value) ? value : ALL_CATEGORIES;
}

/**
 * `href` with its `category` param set to `id`, or removed for All. Built with the URL API from
 * the current location, so origin, path, other params and the hash are kept as they are.
 */
export function withCategory(href: string, id: string): string {
  const url = new URL(href);
  if (id === ALL_CATEGORIES) url.searchParams.delete('category');
  else url.searchParams.set('category', id);
  return url.href;
}
