import { getCollection, getEntry } from 'astro:content';
import type { Locale } from '../../i18n/config';
import {
  buildRoles,
  buildServices,
  buildTools,
  resolveAvailability,
  type HomeContent,
} from './home';

/**
 * The only content collection reader. A thrown guard (wrong count, missing availability) fails
 * `astro build` instead of shipping a partial homepage (verified end to end in plan 02-07).
 */
export async function getHomeContent(locale: Locale): Promise<HomeContent> {
  const [roles, services, tools, availability] = await Promise.all([
    getCollection('roles'),
    getCollection('services'),
    getCollection('tools'),
    getEntry('profile', 'availability'),
  ]);

  return {
    available: resolveAvailability(availability),
    roles: buildRoles(roles, locale),
    services: buildServices(services, locale),
    tools: buildTools(tools),
  };
}
