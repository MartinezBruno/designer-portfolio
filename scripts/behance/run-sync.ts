// Behance sync orchestration. Erasable TypeScript only (Node type stripping runs it).
// Every dependency is injected so the whole run is tested with a fake fetch and temp dirs.
//
// Gates, in order. Any failure throws a SyncError and leaves the previous snapshot.json, every
// existing cover and every existing module image untouched: nothing under paths.snapshot,
// paths.coversDir or paths.modulesDir is written before G7. A failure after G7's snapshot rename
// (cover or module GC, G9) throws a SyncError with `committed: true`.
//   G1   profile page: store present, list valid, at least 1 project, hasMore false
//   G1b  shrink guard: fewer projects than the previous snapshot fails unless allowFewer
//   G2   challenge: a page that never yields the store (status, repeated challenge)
//   G3   project page: store valid and for the id we asked for
//   G4   cover: allowlisted CDN host, image/* content type, real image bytes, size limits
//   G4m  module images: every image of every project through the variant chain (module-images.ts),
//        or reused from the previous snapshot when unchanged; content normalized (module-content.ts)
//   G5   the new snapshot passes the site's SnapshotSchema and keeps the profile's count
//   G6   body sanity: page size limits (inside fetchStorePage)
//   G7   commit: covers and module images copy-if-absent, one atomic snapshot rename, then a
//        separate GC per set (fs-commit.ts)
//   G8   overrides: the build's parseOverrides + validateOverrides against the new projects
//   G9   report: count, module image size, the 8+ notice (D-06), unknown-type and embed warnings
//        (D-08), missing-overrides checklist; never a failure
//
// Requests: public pages and the image CDN only, no credentials (D-03). deps.sleep(2000) runs
// before every Behance request after the first, covers and module images included (D-04);
// fetchStorePage adds its own 2 s wait before a challenge replay. A module image is reused without
// a request when the previous snapshot has the same image id, its sourceUrl is still among the
// current candidates, and the committed file exists with bytes matching its hash-based name.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseOverrides } from '../../src/lib/projects/overrides-schema.ts';
import type { Overrides } from '../../src/lib/projects/overrides-schema.ts';
import {
  missingModuleAlts,
  missingOverrides,
  validateOverrides,
} from '../../src/lib/projects/projects.ts';
import { contentImageIds, parseSnapshot } from '../../src/lib/projects/snapshot-schema.ts';
import type {
  ContentEntry,
  ImageRef,
  Snapshot,
  SnapshotProject,
} from '../../src/lib/projects/snapshot-schema.ts';
import { coverFileName, pickCover } from './covers.ts';
import { postCommitError, SyncError } from './errors.ts';
import { fetchCover, fetchStorePage } from './fetch-page.ts';
import type { FetchDeps } from './fetch-page.ts';
import {
  commitSync,
  createStaging,
  removeStaging,
  writeStagedCover,
  writeStagedModule,
  writeStagedSnapshot,
} from './fs-commit.ts';
import { planModuleImages, toContent } from './module-content.ts';
import type { ImagePlan } from './module-content.ts';
import { downloadModuleImage, moduleFileName } from './module-images.ts';
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
    /** Committed module images (src/assets/projects/modules in the CLI). */
    modulesDir: string;
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
  modulesAdded: string[];
  modulesRemoved: string[];
  /** Bytes of the module image files this run added to modulesDir. */
  moduleBytesAdded: number;
  checklist: string[];
  notices: string[];
}

const USERNAME = 'martifernand7';
const REQUEST_SPACING_MS = 2000;
const NOTICE_AT = 8;
const BYTES_PER_MB = 1048576;

interface PreviousSnapshot {
  count: number;
  /** Module images of the previous snapshot by image id, for reuse. */
  images: ReadonlyMap<string, ImageRef>;
}

interface StoredImage {
  ref: ImageRef;
  bytes: Uint8Array;
}

/** Every stored image of a content list, in DOM order. */
function contentImages(content: readonly ContentEntry[]): ImageRef[] {
  return content.flatMap((entry) => {
    if (entry.kind === 'image') return [entry.image];
    if (entry.kind === 'collection') return entry.images;
    return [];
  });
}

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

/**
 * The previous snapshot's project count (0 when there is none) and its module images. An
 * unreadable snapshot fails G1b unless allowFewer, which treats it as empty.
 */
async function readPrevious(deps: SyncDeps): Promise<PreviousSnapshot> {
  const none: PreviousSnapshot = { count: 0, images: new Map() };
  const file = await readJson(join(deps.paths.root, deps.paths.snapshot));
  if (!file.found) return none;
  let snapshot: Snapshot;
  try {
    snapshot = parseSnapshot(JSON.parse(file.json));
  } catch (error) {
    if (deps.allowFewer) return none;
    throw new SyncError(
      'G1b',
      `previous snapshot ${deps.paths.snapshot} is unreadable (${error instanceof Error ? error.message : String(error)}). Restore it from git, or re-run with --allow-fewer to replace it`,
    );
  }
  const images = new Map<string, ImageRef>();
  for (const project of snapshot.projects) {
    for (const image of contentImages(project.content ?? [])) images.set(image.id, image);
  }
  return { count: snapshot.projects.length, images };
}

/**
 * The committed copy of an unchanged module image, or null when it must be downloaded: the
 * previous ref's sourceUrl must still be a candidate, and the file must exist with bytes that
 * match its hash-based name (a truncated or edited file is downloaded again).
 */
async function reusable(
  previous: ImageRef | undefined,
  plan: ImagePlan,
  deps: SyncDeps,
): Promise<StoredImage | null> {
  if (previous === undefined || !plan.candidates.includes(previous.sourceUrl)) return null;
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(
      await readFile(join(deps.paths.root, deps.paths.modulesDir, previous.file)),
    );
  } catch (error) {
    if (error instanceof Error && isMissingFile(error)) return null;
    throw error;
  }
  if (moduleFileName(plan.id, bytes) !== previous.file) return null;
  return { ref: previous, bytes };
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
    const previous = await readPrevious(deps);
    const before = previous.count;

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
    const moduleWarnings: string[] = [];
    const stagedModuleBytes = new Map<string, number>();
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
      // G4m
      const ref = { id: entry.id, slug: entry.slug };
      const images = new Map<string, ImageRef>();
      for (const plan of planModuleImages(project.allModules, ref)) {
        const image =
          (await reusable(previous.images.get(plan.id), plan, deps)) ??
          (await downloadModuleImage(plan, paced, ref));
        await writeStagedModule(root, stagingDir, image.ref.file, image.bytes);
        stagedModuleBytes.set(image.ref.file, image.bytes.byteLength);
        images.set(plan.id, image.ref);
      }
      const { content, warnings } = toContent(project.allModules, images, ref);
      moduleWarnings.push(...warnings);
      projects.push(
        toSnapshotProject(
          entry,
          project,
          fields,
          { file, sourceUrl: picked.url, width: picked.width },
          content,
        ),
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
      imageIds: contentImageIds(project.content ?? []),
    }));
    try {
      validateOverrides(sources, overrides);
    } catch (error) {
      throw new SyncError('G8', error instanceof Error ? error.message : String(error));
    }

    // G7
    await writeStagedSnapshot(root, stagingDir, snapshot);
    const { added, removed, modulesAdded, modulesRemoved } = await commitSync({
      root,
      stagingDir,
      snapshot: deps.paths.snapshot,
      coversDir: deps.paths.coversDir,
      referenced: new Set(snapshot.projects.map((project) => project.cover.file)),
      modulesDir: deps.paths.modulesDir,
      // Exactly the files the new content references: module GC removes every other one.
      referencedModules: new Set(
        snapshot.projects.flatMap((project) =>
          contentImages(project.content ?? []).map((image) => image.file),
        ),
      ),
    });
    committed = true;

    // G9
    const moduleBytesAdded = modulesAdded.reduce(
      (sum, name) => sum + (stagedModuleBytes.get(name) ?? 0),
      0,
    );
    const notices: string[] = [];
    if (count >= NOTICE_AT) {
      notices.push(`sync:behance: ${count} projects. Revisit filters and search (PROJ-04..07).`);
    }
    notices.push(...moduleWarnings);
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
    // D-09: a notice only, never a failure.
    for (const entry of missingModuleAlts(sources, overrides)) {
      if (entry.missing === 0) continue;
      checklist.push(
        `missing module alts for ${entry.id} (${entry.slug}): ${entry.missing} of ${entry.total} images. Add moduleAlt entries in src/data/project-overrides.json. TODO(martina)`,
      );
    }

    deps.log(`sync:behance: ${count} projects`);
    deps.log(
      `sync:behance: module images: ${modulesAdded.length} files, ${(moduleBytesAdded / BYTES_PER_MB).toFixed(2)} MB added`,
    );
    for (const line of [...notices, ...checklist]) deps.log(line);

    return {
      count,
      coversAdded: added,
      coversRemoved: removed,
      modulesAdded,
      modulesRemoved,
      moduleBytesAdded,
      checklist,
      notices,
    };
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
