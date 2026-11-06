/**
 * Pure sort, guard and localize functions for the homepage content collections. Kept free of
 * the content collection runtime (collection reads return [] under Vitest) so every rule here
 * is unit-testable.
 * HomeView is the only caller, through getHomeContent in queries.ts.
 */
import type { Locale } from '../../i18n/config';
import type { ToolIconKey } from './icons';

export type Localized<T> = Record<Locale, T>;

export interface RoleEntry {
  id: string;
  data: { order: number; label: Localized<string> };
}

export interface ServiceEntry {
  id: string;
  data: {
    order: number;
    title: Localized<string>;
    items: Localized<string[]>;
  };
}

export interface ToolEntry {
  id: string;
  data: { order: number; name: string; icon: ToolIconKey };
}

export interface ProfileEntry {
  data: { available: boolean };
}

export interface ServiceView {
  id: string;
  title: string;
  items: string[];
}

export interface ToolView {
  id: string;
  name: string;
  icon: ToolIconKey;
}

export interface HomeContent {
  available: boolean;
  roles: string[];
  services: ServiceView[];
  tools: ToolView[];
}

/** Returns a new array sorted by `data.order`, ties broken by id. Never mutates the input. */
export function sortByOrder<T extends { id: string; data: { order: number } }>(
  entries: readonly T[],
): T[] {
  return [...entries].sort((a, b) => a.data.order - b.data.order || a.id.localeCompare(b.id));
}

export function assertCount<T>(
  entries: readonly T[],
  expected: number,
  name: string,
): readonly T[] {
  if (entries.length !== expected) {
    throw new Error(
      `${name}: expected exactly ${expected} entries, got ${entries.length}. Fix src/data/${name}.json`,
    );
  }
  return entries;
}

export function assertNonEmpty<T>(entries: readonly T[], name: string): readonly T[] {
  if (entries.length === 0) {
    throw new Error(`${name}: expected at least 1 entry, got 0. Fix src/data/${name}.json`);
  }
  return entries;
}

export function resolveAvailability(entry: ProfileEntry | undefined): boolean {
  if (entry === undefined) {
    throw new Error('profile: missing "availability" entry. Fix src/data/profile.json');
  }
  return entry.data.available;
}

export function buildRoles(entries: readonly RoleEntry[], locale: Locale): string[] {
  return sortByOrder(assertNonEmpty(entries, 'roles')).map((entry) => entry.data.label[locale]);
}

/** HOME-04: the services grid holds exactly 4 cards. */
export function buildServices(entries: readonly ServiceEntry[], locale: Locale): ServiceView[] {
  return sortByOrder(assertCount(entries, 4, 'services')).map((entry) => ({
    id: entry.id,
    title: entry.data.title[locale],
    items: [...entry.data.items[locale]],
  }));
}

export function buildTools(entries: readonly ToolEntry[]): ToolView[] {
  return sortByOrder(assertNonEmpty(entries, 'tools')).map((entry) => ({
    id: entry.id,
    name: entry.data.name,
    icon: entry.data.icon,
  }));
}
