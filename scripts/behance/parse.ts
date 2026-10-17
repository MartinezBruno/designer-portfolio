// Raw Behance page parsing. Erasable TypeScript only (Node type stripping runs it).
// Reads only the two islands we need (store JSON, keywords meta) and validates them with Zod.
// Every failure is a named SyncError gate; nothing is guessed.
import type { z } from 'astro/zod';
import type { CategoryId } from '../../src/lib/projects/model.ts';
import { SyncError } from './errors.ts';
import { RawProfileStoreSchema, RawProjectStoreSchema } from './raw-schemas.ts';
import type { RawCover, RawModule } from './raw-schemas.ts';

const STORE = /<script[^>]*id="beconfig-store_state"[^>]*>([\s\S]*?)<\/script>/;
const KEYWORDS = /<meta name="keywords" content="([^"]*)"/;
const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&lt;': '<',
  '&gt;': '>',
};

export interface ProfileProject {
  id: string;
  slug: string;
  name: string;
  url: string;
  publishedOn: number;
  modifiedOn: number | null;
  covers: RawCover[];
}

export interface ProfileStore {
  projects: ProfileProject[];
  hasMore: false;
}

export interface Label {
  id: string;
  title: string;
}

export interface ProjectStore {
  id: string;
  slug: string;
  name: string;
  description: string;
  url: string;
  publishedOn: number;
  canvasWidth: number | null;
  tags: Label[];
  tools: Label[];
  allModules: RawModule[];
}

function storeText(html: string, gate: string): string {
  const match = STORE.exec(html);
  const text = match?.[1];
  if (text === undefined) throw new SyncError(gate, 'no beconfig-store_state script in page');
  return text;
}

function parseJson(text: string, gate: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new SyncError(gate, `beconfig-store_state is not valid JSON (${reason})`);
  }
}

function describeIssues(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
}

const toLabel = (label: { id: number | string; title: string }): Label => ({
  id: String(label.id),
  title: label.title,
});

/** Returns the raw JSON text of the `beconfig-store_state` script. Gate G1 when absent. */
export function extractStore(html: string): string {
  return storeText(html, 'G1');
}

/** Parses the profile page store into the project list. Gate G1 on any shape problem. */
export function parseProfileStore(html: string): ProfileStore {
  const result = RawProfileStoreSchema.safeParse(parseJson(storeText(html, 'G1'), 'G1'));
  if (!result.success) {
    throw new SyncError('G1', `profile store invalid: ${describeIssues(result.error)}`);
  }
  const work = result.data.profile.activeSection.work;
  if (work.hasMore) {
    throw new SyncError(
      'G1',
      'profile has more than one page (hasMore: true); pagination is not supported, see plan B in .planning/research/STACK.md §1.3',
    );
  }
  if (work.profileProjects.length < 1) {
    throw new SyncError('G1', `expected at least 1 project, got ${work.profileProjects.length}`);
  }
  const projects = work.profileProjects.map((project) => ({
    id: String(project.id),
    slug: project.slug,
    name: project.name,
    url: project.url,
    publishedOn: project.publishedOn,
    modifiedOn: project.modifiedOn ?? null,
    covers: project.covers.allAvailable,
  }));
  const seen = new Set<string>();
  for (const project of projects) {
    if (seen.has(project.id)) {
      throw new SyncError(
        'G1',
        `profile lists project id ${project.id} more than once; re-run the sync once Behance lists each project once`,
      );
    }
    seen.add(project.id);
  }
  return { projects, hasMore: false };
}

/** Parses a project page store and checks it is the project we asked for. Gate G3. */
export function parseProjectStore(html: string, expectedId: string): ProjectStore {
  const result = RawProjectStoreSchema.safeParse(parseJson(storeText(html, 'G3'), 'G3'));
  if (!result.success) {
    throw new SyncError('G3', `project store invalid: ${describeIssues(result.error)}`);
  }
  const project = result.data.project.project;
  const id = String(project.id);
  if (id !== expectedId) {
    throw new SyncError('G3', `id mismatch: expected ${expectedId}, page has ${id}`);
  }
  return {
    id,
    slug: project.slug,
    name: project.name,
    description: project.description,
    url: project.url,
    publishedOn: project.publishedOn,
    canvasWidth: project.canvasWidth ?? null,
    tags: project.tags.map(toLabel),
    tools: project.tools.map(toLabel),
    allModules: project.allModules,
  };
}

/** Keywords meta as a trimmed list (tools, then tags, then creative fields). Empty when absent. */
export function keywordsMeta(html: string): string[] {
  const content = KEYWORDS.exec(html)?.[1];
  if (content === undefined) return [];
  return content
    .replace(/&amp;|&quot;|&#39;|&lt;|&gt;/g, (entity) => ENTITIES[entity] ?? entity)
    .split(',')
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword !== '');
}

/**
 * Creative fields = keywords after the leading tools and tags (positional heuristic, Pitfall 11).
 * For the sync checklist only; never a runtime category.
 */
export function deriveFields(
  keywords: readonly string[],
  toolsCount: number,
  tagsCount: number,
): string[] {
  if (!Number.isInteger(toolsCount) || !Number.isInteger(tagsCount)) return [];
  if (toolsCount < 0 || tagsCount < 0) return [];
  return keywords
    .slice(toolsCount + tagsCount)
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword !== '');
}

// A Map, not an object literal: field text is scraped, so "constructor" must not hit a prototype key.
const FIELD_CATEGORIES: ReadonlyMap<string, CategoryId> = new Map<string, CategoryId>([
  ['graphic design', 'graphic-design'],
  ['web design', 'web-design'],
  ['interaction design', 'web-design'],
  ['ui/ux', 'web-design'],
  ['branding', 'branding'],
  ['visual identity', 'branding'],
  ['advertising', 'social-media'],
  ['social media', 'social-media'],
]);

/**
 * Suggested curated category for the sync checklist (D-22): the first creative field, in field
 * order, that maps to a category. Case-insensitive and trimmed. Never applied automatically.
 */
export function suggestCategory(fields: readonly string[]): CategoryId | null {
  for (const field of fields) {
    const category = FIELD_CATEGORIES.get(field.trim().toLowerCase());
    if (category !== undefined) return category;
  }
  return null;
}
