/**
 * Reads the service a visitor asked about from the URL (`?service=<id>`, D-08). Pure and
 * client-safe: no zod, no dictionaries. The value is attacker-controllable (shareable links), so
 * it is allow-listed through `isServiceChoice`; exactly one recognised value wins, anything else
 * (missing, empty, wrong case, unknown or repeated) falls back to `other`.
 */
import { isServiceChoice, type ServiceChoice } from './fields';

export function parseServiceParam(search: string): ServiceChoice {
  const values = new URLSearchParams(search).getAll('service');
  if (values.length !== 1) return 'other';
  const [value] = values;
  return isServiceChoice(value) ? value : 'other';
}
