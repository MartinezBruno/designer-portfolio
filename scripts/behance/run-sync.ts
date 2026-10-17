// Behance sync orchestration. Erasable TypeScript only (Node type stripping runs it).
// Every dependency is injected so the whole run is tested with a fake fetch and temp dirs.
//
// Gates, in order. Any failure throws a SyncError and leaves the previous snapshot.json and every
// existing cover untouched: nothing under paths.snapshot or paths.coversDir is written before G7.
// A failure after G7's snapshot rename (cover GC, G9) throws a SyncError with `committed: true`.
//   G1   profile page: store present, list valid, at least 1 project, hasMore false
//   G1b  shrink guard: fewer projects than the previous snapshot fails unless allowFewer
//   G2   challenge: a page that never yields the store (status, repeated challenge)
//   G3   project page: store valid and for the id we asked for
//   G4   cover: allowlisted CDN host, image/* content type, real image bytes, size limits
//   G5   the new snapshot passes the site's SnapshotSchema and keeps the profile's count
//   G6   body sanity: page size limits (inside fetchStorePage)
//   G7   commit: covers copy-if-absent, one atomic snapshot rename, cover GC (fs-commit.ts)
//   G8   overrides: the build's parseOverrides + validateOverrides against the new projects
//   G9   report: count, the 8+ notice (D-06), missing-overrides checklist and unknown module
//        warnings (D-22); never a failure
//
// Requests: public pages and the image CDN only, no credentials (D-03). deps.sleep(2000) runs
// before every Behance request after the first (D-04); fetchStorePage adds its own 2 s wait
// before a challenge replay.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseOverrides } from '../../src/lib/projects/overrides-schema.ts';
import type { Overrides } from '../../src/lib/projects/overrides-schema.ts';
import { missingOverrides, validateOverrides } from '../../src/lib/projects/projects.ts';
import { parseSnapshot } from '../../src/lib/projects/snapshot-schema.ts';
import type { Snapshot, SnapshotProject } from '../../src/lib/projects/snapshot-schema.ts';
import { coverFileName, pickCover } from './covers.ts';
import { postCommitError, SyncError } from './errors.ts';
import { fetchCover, fetchStorePage } from './fetch-page.ts';
import type { FetchDeps } from './fetch-page.ts';
import {
  commitSync,
  createStaging,
  removeStaging,
  writeStagedCover,
  writeStagedSnapshot,
} from './fs-commit.ts';
import { toSnapshotProject } from './normalize.ts';
import {
  deriveFields,
  keywordsMeta,
  parseProfileStore,
  parseProjectStore,
  suggestCategory,
} from './parse.ts';

export interface SyncDeps {
  fetch: typeof globalThis.fetch;
  sleep: (ms: number) => Promise<void>;
  log: (line: string) => void;
  /** All relative to root. */
  paths: {
    root: string;
    snapshot: string;
    coversDir: string;
    stagingDir: string;
    overrides: string;
  };
  now: () => Date;
  allowFewer: boolean;
  profileUrl: string;
}

export interface SyncReport {
  count: number;
  coversAdded: string[];
  coversRemoved: string[];
  checklist: string[];
  notices: string[];
}

const USERNAME = 'martifernand7';
const REQUEST_SPACING_MS = 2000;
const NOTICE_AT = 8;
const KNOWN_MODULES: ReadonlySet<string> = new Set([
  'ImageModule',
  'TextModule',
  'MediaCollectionModule',
  'EmbedModule',
]);

function isMissingFile(error: Error): boolean {
  return 'code' in error && error.code === 'ENOENT';
}

async function readJson(path: string): Promise<{ found: false } | { found: true; json: string }> {
  try {
    return { found: true, json: await readFile(path, 'utf8') };
  } catch (error) {
    if (error instanceof Error && isMissingFile(error)) return { found: false };
    throw error;
  }
}

/** Number of projects in the previous snapshot; 0 when there is none. */
async function previousCount(deps: SyncDeps): Promise<number> {
  const file = await readJson(join(deps.paths.root, deps.paths.snapshot));
  if (!file.found) return 0;
  try {
    return parseSnapshot(JSON.parse(file.json)).projects.length;
  } catch (error) {
    if (deps.allowFewer) return 0;
    throw new SyncError(
      'G1b',
      `previous snapshot ${deps.paths.snapshot} is unreadable (${error instanceof Error ? error.message : String(error)}). Restore it from git, or re-run with --allow-fewer to replace it`,
    );
  }
}

async function readOverrides(deps: SyncDeps): Promise<Overrides> {
  const file = await readJson(join(deps.paths.root, deps.paths.overrides));
  if (!file.found) throw new SyncError('G8', `${deps.paths.overrides} not found`);
  try {
    return parseOverrides(JSON.parse(file.json));
  } catch (error) {
    throw new SyncError('G8', error instanceof Error ? error.message : String(error));
  }
}

function compareProjects(a: SnapshotProject, b: SnapshotProject): number {
  if (a.publishedOn !== b.publishedOn) return b.publishedOn - a.publishedOn;
  // Digit-only ids: shorter is smaller, equal length compares as text.
  return a.id.length - b.id.length || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

function validateSnapshot(snapshot: Snapshot, expected: number): Snapshot {
  let valid: Snapshot;
  try {
    valid = parseSnapshot(snapshot);
  } catch (error) {
    throw new SyncError('G5', error instanceof Error ? error.message : String(error));
  }
  if (valid.projects.length !== expected) {
    throw new SyncError(
      'G5',
      `snapshot has ${valid.projects.length} projects, the profile lists ${expected}`,
    );
  }
  return valid;
}

export async function runSync(deps: SyncDeps): Promise<SyncReport> {
  const { root, stagingDir } = deps.paths;
  let requests = 0;
  // D-04: every Behance request after the first waits 2 s.
  const paced: FetchDeps = {
    sleep: deps.sleep,
    fetch: async (input, init) => {
      if (requests > 0) await deps.sleep(REQUEST_SPACING_MS);
      requests += 1;
      return deps.fetch(input, init);
    },
  };

  // Set once commitSync's atomic rename has replaced the snapshot: any later failure is reported
  // as a post-commit error, never as "the previous snapshot was left untouched".
  let committed = false;
  try {
    const before = await previousCount(deps);

    // G1
    const profile = parseProfileStore(await fetchStorePage(deps.profileUrl, paced));
    const count = profile.projects.length;
    // G1b
    if (count < before && !deps.allowFewer) {
      throw new SyncError(
        'G1b',
        `expected at least ${before} projects, got ${count}. Re-run with --allow-fewer if projects were removed on Behance`,
      );
    }

    await createStaging(root, stagingDir);
    const projects: SnapshotProject[] = [];
    for (const entry of profile.projects) {
      // G2, G3, G6
      const html = await fetchStorePage(entry.url, paced);
      const project = parseProjectStore(html, entry.id);
      const fields = deriveFields(keywordsMeta(html), project.tools.length, project.tags.length);
      // G4
      const picked = pickCover(entry.covers);
      const { bytes, ext } = await fetchCover(picked.url, paced);
      const file = coverFileName(entry.id, bytes, ext);
      await writeStagedCover(root, stagingDir, file, bytes);
      projects.push(
        toSnapshotProject(entry, project, fields, {
          file,
          sourceUrl: picked.url,
          width: picked.width,
        }),
      );
    }

    // G5
    const snapshot = validateSnapshot(
      {
        version: 1,
        origin: 'behance-sync',
        syncedAt: deps.now().toISOString(),
        profile: { username: USERNAME, url: deps.profileUrl },
        projects: [...projects].sort(compareProjects),
      },
      count,
    );

    // G8
    const overrides = await readOverrides(deps);
    const sources = snapshot.projects.map((project) => ({
      id: project.id,
      sourceSlug: project.slug,
    }));
    try {
      validateOverrides(sources, overrides);
    } catch (error) {
      throw new SyncError('G8', error instanceof Error ? error.message : String(error));
    }

    // G7
    await writeStagedSnapshot(root, stagingDir, snapshot);
    const { added, removed } = await commitSync({
      root,
      stagingDir,
      snapshot: deps.paths.snapshot,
      coversDir: deps.paths.coversDir,
      referenced: new Set(snapshot.projects.map((project) => project.cover.file)),
      // Placeholder until 04-07 wires module image downloads into the sync.
      modulesDir: join(deps.paths.coversDir, 'modules'),
      referencedModules: new Set(),
    });
    committed = true;

    // G9
    const notices: string[] = [];
    if (count >= NOTICE_AT) {
      notices.push(`sync:behance: ${count} projects. Revisit filters and search (PROJ-04..07).`);
    }
    for (const project of snapshot.projects) {
      const unknown = new Set(
        project.modules
          .map((module) => module.__typename)
          .filter((type) => !KNOWN_MODULES.has(type)),
      );
      for (const type of unknown) {
        notices.push(
          `sync:behance: project ${project.id} has unknown module type ${type} (kept as raw JSON; Phase 4 must render a fallback)`,
        );
      }
    }
    const fieldsById = new Map(snapshot.projects.map((project) => [project.id, project.fields]));
    const checklist = missingOverrides(sources, overrides)
      .filter((entry) => entry.missing.length > 0)
      .map((entry) => {
        const suggested = suggestCategory(fieldsById.get(entry.id) ?? []) ?? 'none';
        const missing = entry.missing.map((field) =>
          field === 'category' ? `category (suggested: ${suggested})` : field,
        );
        return `missing overrides for ${entry.id} (${entry.slug}): ${missing.join(', ')}`;
      });

    deps.log(`sync:behance: ${count} projects`);
    for (const line of [...notices, ...checklist]) deps.log(line);

    return { count, coversAdded: added, coversRemoved: removed, checklist, notices };
  } catch (error) {
    if (committed) throw postCommitError(error instanceof Error ? error : String(error));
    throw error;
  } finally {
    // A cleanup failure (EPERM, EBUSY) must not replace the real error or turn success into a
    // failure: the staging dir is only scratch space under tmp/.
    await removeStaging(root, stagingDir).catch((error: Error) => {
      deps.log(`sync:behance: could not remove staging dir ${stagingDir}: ${error.message}`);
    });
  }
}
