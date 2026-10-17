// Staging and commit protocol for the Behance sync (RESEARCH Pattern 4).
// Erasable TypeScript only (Node type stripping runs it). All paths are relative to `root`.
//
// Covers are staged at `<staging>/<name>` and committed to coversDir. Module images are staged at
// `<staging>/modules/<name>` and committed to modulesDir (a subdirectory of coversDir in the repo,
// src/assets/projects/modules). Each set has its own name regex and its own GC, so a cover GC can
// never delete a module image (RESEARCH Pitfall 1).
//
// Order inside commitSync:
//   0. Pre-flight: every referenced cover and module image is staged or already present. Nothing
//      is written before this passes.
//   1. Copy each staged file to a hidden `.<name>.partial` file in its target dir, then rename it
//      to its final name, so a copy cut off partway never sits under a real name. A file already
//      on disk under that name is kept untouched when its bytes equal the staged ones. If they
//      differ, the file on disk is a truncated or corrupt copy (the name is the hash of the staged
//      bytes), and the rename replaces it atomically.
//   2. One rename of staging/snapshot.json over the target snapshot.json. This is the ONLY step
//      that changes what the site reads, and rename within one filesystem is atomic.
//   3. Delete COVER_FILE names in coversDir and MODULE_FILE names in modulesDir that the new
//      snapshot no longer references, and any `.partial` leftover of a killed run.
//
// A crash between (1) and (2) leaves only extra, unreferenced files next to the previous
// snapshot; the site ignores them and the next successful run's GC removes them. A crash between
// (2) and (3) leaves the same kind of leftovers. Directory renames are not used: renaming a
// staged covers dir over a non-empty coversDir fails with ENOTEMPTY and would not be atomic for
// the snapshot anyway.
import {
  access,
  copyFile,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { COVER_FILE, MODULE_FILE } from '../../src/lib/projects/snapshot-schema.ts';
import { postCommitError } from './errors.ts';

const STAGED_SNAPSHOT = 'snapshot.json';
const STAGED_MODULES = 'modules';

/** A cover copy in progress (or left over by a killed run): never read by the site. */
const PARTIAL_FILE = /^\.\d+-[0-9a-f]{12}\.(png|jpg|webp)\.partial$/;
/** A module image copy in progress (or left over by a killed run). */
const MODULE_PARTIAL_FILE = /^\.\d+-[0-9a-f]{12}\.webp\.partial$/;

const partialName = (name: string): string => `.${name}.partial`;

export interface CommitInput {
  root: string;
  stagingDir: string;
  snapshot: string;
  coversDir: string;
  referenced: ReadonlySet<string>;
  modulesDir: string;
  referencedModules: ReadonlySet<string>;
}

export interface CommitResult {
  added: string[];
  removed: string[];
  modulesAdded: string[];
  modulesRemoved: string[];
}

/** One committed file set: where it is staged, where it goes, and which names belong to it. */
interface FileSet {
  label: string;
  staging: string;
  target: string;
  targetLabel: string;
  names: readonly string[];
  referenced: ReadonlySet<string>;
  file: RegExp;
  partial: RegExp;
}

function assertCoverName(name: string): void {
  if (!COVER_FILE.test(name)) {
    throw new Error(`invalid cover file name ${JSON.stringify(name)} (expected <id>-<hash>.<ext>)`);
  }
}

function assertModuleName(name: string): void {
  if (!MODULE_FILE.test(name)) {
    throw new Error(
      `invalid module image file name ${JSON.stringify(name)} (expected <id>-<hash>.webp)`,
    );
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function sameBytes(a: string, b: string): Promise<boolean> {
  const [left, right] = await Promise.all([readFile(a), readFile(b)]);
  return left.equals(right);
}

export async function createStaging(root: string, stagingDir: string): Promise<void> {
  await mkdir(join(root, stagingDir), { recursive: true });
}

export async function writeStagedCover(
  root: string,
  stagingDir: string,
  name: string,
  bytes: Uint8Array,
): Promise<void> {
  assertCoverName(name);
  await writeFile(join(root, stagingDir, name), bytes);
}

export async function writeStagedModule(
  root: string,
  stagingDir: string,
  name: string,
  bytes: Uint8Array,
): Promise<void> {
  assertModuleName(name);
  const dir = join(root, stagingDir, STAGED_MODULES);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, name), bytes);
}

export async function writeStagedSnapshot(
  root: string,
  stagingDir: string,
  snapshot: object,
): Promise<void> {
  await writeFile(
    join(root, stagingDir, STAGED_SNAPSHOT),
    `${JSON.stringify(snapshot, null, 2)}\n`,
  );
}

async function preflight(set: FileSet): Promise<void> {
  for (const name of set.names) {
    if (!(await exists(join(set.staging, name))) && !(await exists(join(set.target, name)))) {
      throw new Error(`${set.label} ${name} is neither staged nor in ${set.targetLabel}`);
    }
  }
}

/** Copy-if-absent through a partial file. Returns the names actually written. */
async function copyStaged(set: FileSet): Promise<string[]> {
  const added: string[] = [];
  for (const name of set.names) {
    const staged = join(set.staging, name);
    if (!(await exists(staged))) continue;
    await mkdir(set.target, { recursive: true });
    const final = join(set.target, name);
    if ((await exists(final)) && (await sameBytes(staged, final))) continue;
    const partial = join(set.target, partialName(name));
    try {
      await copyFile(staged, partial);
      await rename(partial, final);
    } finally {
      await rm(partial, { force: true });
    }
    added.push(name);
  }
  return added;
}

/** Removes unreferenced names of this set and stale partials (not reported). */
async function collect(set: FileSet): Promise<string[]> {
  if (!(await exists(set.target))) return [];
  const removed: string[] = [];
  for (const name of (await readdir(set.target)).sort()) {
    const stale = set.partial.test(name);
    if (!stale && (!set.file.test(name) || set.referenced.has(name))) continue;
    await rm(join(set.target, name));
    if (!stale) removed.push(name);
  }
  return removed;
}

export async function commitSync(input: CommitInput): Promise<CommitResult> {
  const staging = join(input.root, input.stagingDir);
  const target = join(input.root, input.snapshot);
  const coverNames = [...input.referenced].sort();
  const moduleNames = [...input.referencedModules].sort();
  coverNames.forEach(assertCoverName);
  moduleNames.forEach(assertModuleName);

  const covers: FileSet = {
    label: 'cover',
    staging,
    target: join(input.root, input.coversDir),
    targetLabel: input.coversDir,
    names: coverNames,
    referenced: input.referenced,
    file: COVER_FILE,
    partial: PARTIAL_FILE,
  };
  const modules: FileSet = {
    label: 'module image',
    staging: join(staging, STAGED_MODULES),
    target: join(input.root, input.modulesDir),
    targetLabel: input.modulesDir,
    names: moduleNames,
    referenced: input.referencedModules,
    file: MODULE_FILE,
    partial: MODULE_PARTIAL_FILE,
  };

  // (0) Pre-flight for both sets, before any write.
  await preflight(covers);
  await preflight(modules);

  // (1) Covers, then module images. The covers dir always exists after this step.
  await mkdir(covers.target, { recursive: true });
  const added = await copyStaged(covers);
  const modulesAdded = await copyStaged(modules);

  // (2) The single atomic switch of what the site reads.
  await mkdir(dirname(target), { recursive: true });
  await rename(join(staging, STAGED_SNAPSHOT), target);

  // (3) GC, each set with its own regex and referenced set. The new snapshot is live from here
  // on, so a failure is reported as a post-commit error. The cover GC skips the `modules`
  // directory because it does not match COVER_FILE.
  try {
    const removed = await collect(covers);
    const modulesRemoved = await collect(modules);
    return { added, removed, modulesAdded, modulesRemoved };
  } catch (error) {
    throw postCommitError(error instanceof Error ? error : String(error));
  }
}

export async function removeStaging(root: string, stagingDir: string): Promise<void> {
  await rm(join(root, stagingDir), { recursive: true, force: true });
}
