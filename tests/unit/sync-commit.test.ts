import { mkdir, mkdtemp, readFile, readdir, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  commitSync,
  createStaging,
  removeStaging,
  writeStagedCover,
  writeStagedSnapshot,
} from '../../scripts/behance/fs-commit.ts';
import { SyncError } from '../../scripts/behance/errors.ts';

const REPO_TMP = fileURLToPath(new URL('../../tmp/', import.meta.url));

const STAGING = 'tmp/staging';
const SNAPSHOT = 'data/snapshot.json';
const COVERS = 'covers';

const OLD_A = '9001-aaaaaaaaaaaa.png';
const OLD_B = '9002-bbbbbbbbbbbb.png';
const NEW_C = '1001-cccccccccccc.png';

let root = '';

beforeEach(async () => {
  await mkdir(REPO_TMP, { recursive: true });
  root = await mkdtemp(join(REPO_TMP, 'sync-commit-'));
  await mkdir(join(root, 'data'), { recursive: true });
  await mkdir(join(root, COVERS), { recursive: true });
  await writeFile(join(root, SNAPSHOT), '{"previous":true}\n');
  await writeFile(join(root, COVERS, OLD_A), 'old a');
  await writeFile(join(root, COVERS, OLD_B), 'old b');
  await writeFile(join(root, COVERS, '.gitkeep'), '');
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('staging', () => {
  it('creates the staging dir and writes covers and a pretty snapshot into it', async () => {
    await createStaging(root, STAGING);
    await writeStagedCover(root, STAGING, NEW_C, new Uint8Array([1, 2, 3]));
    await writeStagedSnapshot(root, STAGING, { version: 1, list: [1] });

    expect([...(await readFile(join(root, STAGING, NEW_C)))]).toEqual([1, 2, 3]);
    expect(await readFile(join(root, STAGING, 'snapshot.json'), 'utf8')).toBe(
      `${JSON.stringify({ version: 1, list: [1] }, null, 2)}\n`,
    );
  });

  it('refuses a cover name that is not a COVER_FILE name', async () => {
    await createStaging(root, STAGING);
    await expect(
      writeStagedCover(root, STAGING, '../escape.png', new Uint8Array([1])),
    ).rejects.toThrow(/cover file name/);
  });

  it('removeStaging deletes the dir and is safe to call twice', async () => {
    await createStaging(root, STAGING);
    await writeStagedCover(root, STAGING, NEW_C, new Uint8Array([1]));
    await removeStaging(root, STAGING);
    await removeStaging(root, STAGING);
    await expect(stat(join(root, STAGING))).rejects.toThrow();
  });
});

describe('commitSync', () => {
  it('copies new covers, renames the snapshot over the target and removes unreferenced covers', async () => {
    await createStaging(root, STAGING);
    await writeStagedCover(root, STAGING, NEW_C, new Uint8Array([7, 7]));
    await writeStagedSnapshot(root, STAGING, { next: true });

    const result = await commitSync({
      root,
      stagingDir: STAGING,
      snapshot: SNAPSHOT,
      coversDir: COVERS,
      referenced: new Set([NEW_C, OLD_A]),
    });

    expect(result).toEqual({ added: [NEW_C], removed: [OLD_B] });
    expect(JSON.parse(await readFile(join(root, SNAPSHOT), 'utf8'))).toEqual({ next: true });
    expect((await readdir(join(root, COVERS))).sort()).toEqual(['.gitkeep', NEW_C, OLD_A].sort());
    expect([...(await readFile(join(root, COVERS, NEW_C)))]).toEqual([7, 7]);
    // The staged snapshot moved (rename), it was not copied.
    await expect(stat(join(root, STAGING, 'snapshot.json'))).rejects.toThrow();
  });

  it('never overwrites an existing same-named cover (bytes and mtime unchanged)', async () => {
    const past = new Date('2020-01-01T00:00:00Z');
    await utimes(join(root, COVERS, OLD_A), past, past);
    const before = await stat(join(root, COVERS, OLD_A));

    await createStaging(root, STAGING);
    await writeStagedCover(root, STAGING, OLD_A, new Uint8Array([9, 9, 9]));
    await writeStagedSnapshot(root, STAGING, { next: true });

    const result = await commitSync({
      root,
      stagingDir: STAGING,
      snapshot: SNAPSHOT,
      coversDir: COVERS,
      referenced: new Set([OLD_A]),
    });

    const after = await stat(join(root, COVERS, OLD_A));
    expect(result.added).toEqual([]);
    expect(await readFile(join(root, COVERS, OLD_A), 'utf8')).toBe('old a');
    expect(after.mtimeMs).toBe(before.mtimeMs);
  });

  it('leaves non-cover files alone and never deletes a referenced cover', async () => {
    await writeFile(join(root, COVERS, 'notes.txt'), 'keep');
    await createStaging(root, STAGING);
    await writeStagedSnapshot(root, STAGING, { next: true });

    const result = await commitSync({
      root,
      stagingDir: STAGING,
      snapshot: SNAPSHOT,
      coversDir: COVERS,
      referenced: new Set([OLD_A, OLD_B]),
    });

    expect(result).toEqual({ added: [], removed: [] });
    expect((await readdir(join(root, COVERS))).sort()).toEqual(
      ['.gitkeep', OLD_A, OLD_B, 'notes.txt'].sort(),
    );
  });

  it('reports a GC failure after the rename as a committed SyncError', async () => {
    await mkdir(join(root, COVERS, '9003-dddddddddddd.png'));
    await createStaging(root, STAGING);
    await writeStagedSnapshot(root, STAGING, { next: true });

    const error = await commitSync({
      root,
      stagingDir: STAGING,
      snapshot: SNAPSHOT,
      coversDir: COVERS,
      referenced: new Set([OLD_A]),
    }).then(
      () => null,
      (caught: Error) => caught,
    );

    expect(error).toBeInstanceOf(SyncError);
    expect(error instanceof SyncError && error.committed).toBe(true);
    expect(JSON.parse(await readFile(join(root, SNAPSHOT), 'utf8'))).toEqual({ next: true });
  });

  it('fails before touching the snapshot when a referenced cover is in neither place', async () => {
    await createStaging(root, STAGING);
    await writeStagedSnapshot(root, STAGING, { next: true });

    await expect(
      commitSync({
        root,
        stagingDir: STAGING,
        snapshot: SNAPSHOT,
        coversDir: COVERS,
        referenced: new Set([NEW_C]),
      }),
    ).rejects.toThrow(/1001-cccccccccccc\.png/);
    expect(await readFile(join(root, SNAPSHOT), 'utf8')).toBe('{"previous":true}\n');
    expect((await readdir(join(root, COVERS))).sort()).toEqual(['.gitkeep', OLD_A, OLD_B].sort());
  });
});
