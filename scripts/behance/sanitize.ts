// Behance TextModule and EmbedModule HTML cleaning at sync time. Erasable TypeScript only (Node
// type stripping runs it). The ONLY importer of sanitize-html: the dependency never reaches the
// site or the client bundle (D-02). Stored text HTML is a sanitizer fixed point, so a test can
// assert sanitizeText(stored) === stored on the committed snapshot. The localized new-tab hint is
// injected at render, never stored here.
import sanitizeHtml from 'sanitize-html';

const ALIGN = [/^(left|right|center|justify)$/];

export const TEXT_OPTIONS: sanitizeHtml.IOptions = {
  // `span` is intentionally absent: with the default disallowedTagsMode 'discard' the tag is
  // dropped and its text kept, which unwraps Behance's colour/font/size span nests.
  allowedTags: ['p', 'div', 'br', 'a', 'strong', 'b', 'em', 'i'],
  allowedAttributes: { a: ['href', 'target', 'rel'], div: ['style'], p: ['style'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  allowedStyles: { div: { 'text-align': ALIGN }, p: { 'text-align': ALIGN } },
  transformTags: {
    // Default merge (no third argument): passing `false` replaces attribs and drops href.
    a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
    h1: 'p',
    h2: 'p',
    h3: 'p',
    h4: 'p',
    h5: 'p',
    h6: 'p',
  },
  // Unwrap any link whose href was stripped (javascript:, data:, protocol-relative).
  exclusiveFilter: (frame) => (frame.tag === 'a' && !frame.attribs['href'] ? 'excludeTag' : false),
};

/** The pure sanitize-html call with TEXT_OPTIONS. */
export function sanitizeText(html: string): string {
  return sanitizeHtml(html, TEXT_OPTIONS);
}

const LEADING_EMPTY = /^\s*<(div|p)(?:\s[^>]*)?>\s*(?:<br \/>\s*)*<\/\1>/;
const TRAILING_EMPTY = /<(div|p)(?:\s[^>]*)?>\s*(?:<br \/>\s*)*<\/\1>\s*$/;

/** sanitizeText, then trims leading and trailing empty blocks (`<div><br /></div>`). */
export function cleanTextHtml(html: string): string {
  let out = sanitizeText(html).trim();
  let previous = '';
  while (out !== previous) {
    previous = out;
    out = out.replace(LEADING_EMPTY, '').replace(TRAILING_EMPTY, '').trim();
  }
  return out;
}

/** The entities sanitize-html writes when it escapes text (its escapeHtml), and their characters. */
const ESCAPED: Readonly<Record<string, string>> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
};

/**
 * A Behance caption as plain text: every tag is dropped (its text kept, `<br>` becomes a space),
 * entities are decoded by the HTML parser, and whitespace is collapsed. The result is rendered as
 * an escaped text node, so it must not carry markup or entities a visitor would see literally.
 */
export function plainCaption(html: string): string {
  return sanitizeHtml(html, { allowedTags: ['br'], allowedAttributes: {} })
    .replace(/<br \/>/g, ' ')
    .replace(/&(?:amp|lt|gt|quot);/g, (entity) => ESCAPED[entity] ?? entity)
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The first iframe's src, decoded by the HTML parser (no regex parsing of HTML). Null when there
 * is no iframe, no src, or the src does not parse as an absolute URL. The allowlist check is the
 * caller's job (providerForUrl).
 */
export function extractEmbedSrc(html: string): string | null {
  const found: string[] = [];
  sanitizeHtml(html, {
    allowedTags: ['iframe'],
    allowedAttributes: { iframe: ['src'] },
    transformTags: {
      iframe: (tagName, attribs) => {
        const src = attribs['src'];
        if (src !== undefined && src !== '') found.push(src);
        return { tagName, attribs };
      },
    },
  });
  const src = found[0];
  return src !== undefined && URL.canParse(src) ? src : null;
}
