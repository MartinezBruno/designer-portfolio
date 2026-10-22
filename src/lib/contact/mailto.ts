/**
 * Prefilled mailto for the failure block (CONT-03, D-14). Pure and client-safe. Every component is
 * encodeURIComponent-encoded (spaces as %20, never '+'), line breaks become CRLF (%0D%0A, RFC 6068),
 * and the body is cut by code points so the whole URL stays within `maxLength`: a surrogate pair
 * or a %XX escape is never split, because the cut happens before encoding.
 */

/** Conservative practical cap: some mail handlers choke on mailto URLs near 2 KB. */
export const MAILTO_MAX_LENGTH = 1800;

const ELLIPSIS = '…';

export interface PrefilledMailtoOptions {
  to: string;
  subject: string;
  body: string;
  maxLength?: number;
}

const toCrlf = (text: string): string => text.replace(/\r\n|\r|\n/g, '\r\n');

export function buildPrefilledMailto(options: PrefilledMailtoOptions): string {
  const { to, subject, body, maxLength = MAILTO_MAX_LENGTH } = options;
  const head = `mailto:${to}?subject=${encodeURIComponent(subject)}`;
  const withBody = (text: string): string => `${head}&body=${encodeURIComponent(toCrlf(text))}`;

  const full = withBody(body);
  if (full.length <= maxLength) return full;

  // Binary search for the longest code-point prefix that still fits with the ellipsis.
  const points = Array.from(body);
  let low = 0;
  let high = points.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (withBody(points.slice(0, mid).join('') + ELLIPSIS).length <= maxLength) low = mid;
    else high = mid - 1;
  }

  const cut = withBody(points.slice(0, low).join('') + ELLIPSIS);
  return cut.length <= maxLength ? cut : head;
}
