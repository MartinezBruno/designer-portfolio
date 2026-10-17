import { getCollection, getEntry } from 'astro:content';
import type { Locale } from '../../i18n/config';
import { buildCategoryTitles, toCardView } from '../projects/card-view';
import { overrides } from '../projects/local-overrides';
import type { Project, ProjectCardView } from '../projects/model';
import { applyOverrides, selectHomeProjects, sortProjects } from '../projects/projects';
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
let cachedProjects: Project[] | null = null;

/** Every project (hidden included) with the local overrides merged in, built once per process. */
function loadProjects(): Project[] {
  if (getSnapshotOrigin() === 'seed' && !seedWarned) {
    seedWarned = true;
    console.warn(
      'projects: snapshot origin is "seed" (placeholder covers). Run pnpm sync:behance before shipping',
    );
  }
  cachedProjects ??= applyOverrides(getSourceProjects(), overrides);
  return cachedProjects;
}

/**
 * The single project entry point for views (D-23): components and pages read projects only
 * through these functions and the model types, never the source adapter (lint-enforced, DATA-06).
 * Visible projects come back sorted (explicit order, then newest first) as card views.
 */
export async function getAllProjects(locale: Locale): Promise<ProjectCardView[]> {
  const categoryTitles = buildCategoryTitles(await getCollection('services'), locale);
  return sortProjects(loadProjects()).map((project) => toCardView(project, locale, categoryTitles));
}

/** Home "Latest work" (D-17): featured first, then newest, at most 3, hidden excluded. */
export async function getLatestProjects(locale: Locale): Promise<ProjectCardView[]> {
  const categoryTitles = buildCategoryTitles(await getCollection('services'), locale);
  const latest = selectHomeProjects(loadProjects(), 3);
  if (latest.length === 0) {
    console.warn(
      'projects: every project is hidden, so the Home latest-work section is omitted. Check src/data/project-overrides.json',
    );
  }
  return latest.map((project) => toCardView(project, locale, categoryTitles));
}
