import type { Cleanup } from '../motion/lifecycle';
import { parseServiceParam } from '../contact/service-param';

/**
 * Pre-selects the contact form's service chip from `?service=` (HOME-08, D-08), so a visitor who
 * follows a card's "Ask about this" link lands with that service checked. The id comes from the
 * allow-list in parseServiceParam, so only an existing radio can be picked. Checking one radio
 * unchecks the rest through native grouping. Focus is never moved: fragment navigation to
 * #contact already sets the sequential focus start point. Adds no listeners, so no cleanup.
 */
export function initServicePreselect(doc: Document): Cleanup | undefined {
  if (doc.querySelector('input[name="service"]') === null) return undefined;
  const choice = parseServiceParam(doc.defaultView?.location.search ?? '');
  const radio = doc.getElementById(`contact-service-${choice}`);
  if (radio instanceof HTMLInputElement && radio.type === 'radio') radio.checked = true;
  return undefined;
}
