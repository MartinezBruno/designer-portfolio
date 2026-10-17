// Staging and commit protocol for the Behance sync (RESEARCH Pattern 4).
// Erasable TypeScript only (Node type stripping runs it). All paths are relative to `root`.
//
// Order inside commitSync:
//   1. Copy each staged cover to a hidden `.<name>.partial` file in coversDir, then rename it to
//      its final name, so a copy cut off partway never sits under a cover name. A cover already
//      on disk under that name is kept untouched when its bytes equal the staged ones. If they
//      differ, the file on disk is a truncated or corrupt copy (the name is the hash of the staged
//      bytes), and the rename replaces it atomically.
//   2. One rename of staging/snapshot.json over the target snapshot.json. This is the ONLY step
//      that changes what the site reads, and rename within one filesystem is atomic.
//   3. Delete COVER_FILE names in coversDir that the new snapshot no longer references, and any
//      `.partial` leftover of a killed run.
//
// A crash between (1) and (2) leaves only extra, unreferenced cover files next to the previous
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
import { COVER_FILE } from '../../src/lib/projects/snapshot-schema.ts';
import { postCommitError } from './errors.ts';

const STAGED_SNAPSHOT = 'snapshot.json';

/** A cover copy in progress (or left over by a killed run): never read by the site. */
const PARTIAL_FILE = /^\.\d+-[0-9a-f]{12}\.(png|jpg|webp)\.partial$/;

const partialName = (name: string): string => `.${name}.partial`;

export interface CommitInput {
  root: string;
  stagingDir: string;
  snapshot: string;
  coversDir: string;
  referenced: ReadonlySet<string>;
}

export interface CommitResult {
  added: string[];
  removed: string[];
}

function assertCoverName(name: string): void {
  if (!COVER_FILE.test(name)) {
    throw new Error(`invalid cover file name ${JSON.stringify(name)} (expected <id>-<hash>.<ext>)`);
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

export async function commitSync(input: CommitInput): Promise<CommitResult> {
  const staging = join(input.root, input.stagingDir);
  const covers = join(input.root, input.coversDir);
  const target = join(input.root, input.snapshot);
  const referenced = [...input.referenced].sort();
  referenced.forEach(assertCoverName);

  // Pre-flight: every referenced cover must be staged or already present, before any write.
  for (const name of referenced) {
    if (!(await exists(join(staging, name))) && !(await exists(join(covers, name)))) {
      throw new Error(`cover ${name} is neither staged nor in ${input.coversDir}`);
    }
  }

  // (1) Covers: copy to a partial file, then rename into place. An intact existing cover is kept.
  await mkdir(covers, { recursive: true });
  const added: string[] = [];
  for (const name of referenced) {
    const staged = join(staging, name);
    if (!(await exists(staged))) continue;
    const final = join(covers, name);
    if ((await exists(final)) && (await sameBytes(staged, final))) continue;
    const partial = join(covers, partialName(name));
    try {
      await copyFile(staged, partial);
      await rename(partial, final);
    } finally {
      await rm(partial, { force: true });
    }
    added.push(name);
  }

  // (2) The single atomic switch of what the site reads.
  await mkdir(dirname(target), { recursive: true });
  await rename(join(staging, STAGED_SNAPSHOT), target);

  // (3) GC: COVER_FILE names the new snapshot no longer references, and stale `.partial` copies
  // (not reported in `removed`). The new snapshot is
  // live from here on, so a failure is reported as a post-commit error.
  const removed: string[] = [];
  try {
    for (const name of (await readdir(covers)).sort()) {
      const stale = PARTIAL_FILE.test(name);
      if (!stale && (!COVER_FILE.test(name) || input.referenced.has(name))) continue;
      await rm(join(covers, name));
      if (!stale) removed.push(name);
    }
  } catch (error) {
    throw postCommitError(error instanceof Error ? error : String(error));
  }

  return { added, removed };
}

export async function removeStaging(root: string, stagingDir: string): Promise<void> {
  await rm(join(root, stagingDir), { recursive: true, force: true });
}
