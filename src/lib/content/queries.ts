import { getCollection, getEntry } from 'astro:content';
import type { Locale } from '../../i18n/config';
import { buildCategoryTitles, toCardView } from '../projects/card-view';
import type { ProjectCardView } from '../projects/model';
import { assertUniqueSlugs, sortProjects, toProjects } from '../projects/projects';
import { getSnapshotOrigin, getSourceProjects } from '../projects/sources/behance-snapshot';
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

let seedWarned = false;

/**
 * The single project entry point for views (D-23): components and pages read projects only
 * through this function and the model types, never the source adapter (lint-enforced, DATA-06).
 * Visible projects come back sorted (explicit order, then newest first) as card views.
 */
export async function getAllProjects(locale: Locale): Promise<ProjectCardView[]> {
  const categoryTitles = buildCategoryTitles(await getCollection('services'), locale);
  if (getSnapshotOrigin() === 'seed' && !seedWarned) {
    seedWarned = true;
    console.warn(
      'projects: snapshot origin is "seed" (placeholder covers). Run pnpm sync:behance before shipping',
    );
  }
  const projects = sortProjects(assertUniqueSlugs(toProjects(getSourceProjects())));
  return projects.map((project) => toCardView(project, locale, categoryTitles));
}
