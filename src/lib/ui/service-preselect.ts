import type { Cleanup } from '../motion/lifecycle';
import { parseServiceParam } from '../contact/service-param';

/**
 * Checks the service chip named by `search` (`?service=<id>`, HOME-08, D-08). The id comes from
 * the allow-list in parseServiceParam, so only an existing radio can be picked; anything else
 * falls back to `other`, as on a full load. Checking one radio unchecks the rest through native
 * grouping. Shared by the page-load path below and the same-page "Ask about this" hook in
 * nav-focus.ts (07-07), which applies the link's search without a page swap.
 */
export function applyServicePreselect(doc: Document, search: string): void {
  if (doc.querySelector('input[name="service"]') === null) return;
  const choice = parseServiceParam(search);
  const radio = doc.getElementById(`contact-service-${choice}`);
  if (radio instanceof HTMLInputElement && radio.type === 'radio') radio.checked = true;
}

/**
 * Pre-selects the chip from the current URL on page load, so a visitor who arrives through a
 * card's "Ask about this" link lands with that service checked. Focus is never moved here:
 * nav-focus.ts focuses #contact after a soft navigation or a same-page anchor. Adds no
 * listeners, so no cleanup.
 */
export function initServicePreselect(doc: Document): Cleanup | undefined {
  applyServicePreselect(doc, doc.defaultView?.location.search ?? '');
  return undefined;
}
