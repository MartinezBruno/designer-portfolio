/**
 * Detail-page helpers that are pure and Node-safe: shared by the site and the e2e helpers, so this
 * file imports no Astro virtual modules and uses `.ts` value imports only.
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

/**
 * Row lengths for a collection of `count` components (D-10): one row up to 3, then rows of 3,
 * and when the remainder is 1 the last two rows become 2 + 2. Never a row of 1 (except a
 * single-component collection) and never 4 or more.
 */
export function collectionRows(count: number): number[] {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`collectionRows: expected a positive integer, got ${String(count)}`);
  }
  if (count <= 3) return [count];
  const remainder = count % 3;
  const threes = Math.floor(count / 3);
  if (remainder === 0) return Array.from({ length: threes }, () => 3);
  if (remainder === 2) return [...Array.from({ length: threes }, () => 3), 2];
  return [...Array.from({ length: threes - 1 }, () => 3), 2, 2];
}

const MODULE_WIDTHS = [640, 960, 1400] as const;

/** Responsive widths up to the stored width, never upscaling (D-06). */
export function moduleWidths(width: number): number[] {
  const widths = MODULE_WIDTHS.filter((candidate) => candidate <= width);
  return widths.length > 0 ? widths : [width];
}

/** `sizes` for a collection item that takes `share` (0..1] of its row from `sm` up. */
export function collectionItemSizes(share: number): string {
  const px = Math.round(1400 * share);
  const vw = Math.round(100 * share);
  return `(min-width: 1400px) ${String(px)}px, (min-width: 640px) ${String(vw)}vw, 100vw`;
}

const HTML_ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escapes text for use inside HTML element content or a quoted attribute. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

/**
 * Adds the localized sr-only new-tab hint before every `</a>` of sync-sanitized text-module HTML.
 * The hint is escaped, so a dictionary string can never inject markup (T-04-01).
 */
export function injectNewTabHint(html: string, hint: string, locale: string): string {
  const span = `<span class="sr-only" lang="${escapeHtml(locale)}">${escapeHtml(hint)}</span>`;
  return html.replaceAll('</a>', `${span}</a>`);
}
