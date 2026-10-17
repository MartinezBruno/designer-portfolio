import { mkdir, mkdtemp, readFile, readdir, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  commitSync,
  createStaging,
  removeStaging,
  writeStagedCover,
  writeStagedModule,
  writeStagedSnapshot,
} from '../../scripts/behance/fs-commit.ts';
import { SyncError } from '../../scripts/behance/errors.ts';

const REPO_TMP = fileURLToPath(new URL('../../tmp/', import.meta.url));

const STAGING = 'tmp/staging';
const SNAPSHOT = 'data/snapshot.json';
const COVERS = 'covers';
// Same layout as the repo: modules live in a subdirectory of the covers dir.
const MODULES = 'covers/modules';
const NO_MODULES: ReadonlySet<string> = new Set();
const NO_MODULE_CHANGES = { modulesAdded: [], modulesRemoved: [] };

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
      modulesDir: MODULES,
      referencedModules: NO_MODULES,
      referenced: new Set([NEW_C, OLD_A]),
    });

    expect(result).toEqual({ added: [NEW_C], removed: [OLD_B], ...NO_MODULE_CHANGES });
    expect(JSON.parse(await readFile(join(root, SNAPSHOT), 'utf8'))).toEqual({ next: true });
    expect((await readdir(join(root, COVERS))).sort()).toEqual(['.gitkeep', NEW_C, OLD_A].sort());
    expect([...(await readFile(join(root, COVERS, NEW_C)))]).toEqual([7, 7]);
    // The staged snapshot moved (rename), it was not copied.
    await expect(stat(join(root, STAGING, 'snapshot.json'))).rejects.toThrow();
  });

  it('never rewrites an existing same-named cover with the same bytes (mtime unchanged)', async () => {
    const past = new Date('2020-01-01T00:00:00Z');
    await utimes(join(root, COVERS, OLD_A), past, past);
    const before = await stat(join(root, COVERS, OLD_A));

    await createStaging(root, STAGING);
    await writeStagedCover(root, STAGING, OLD_A, new TextEncoder().encode('old a'));
    await writeStagedSnapshot(root, STAGING, { next: true });

    const result = await commitSync({
      root,
      stagingDir: STAGING,
      snapshot: SNAPSHOT,
      coversDir: COVERS,
      modulesDir: MODULES,
      referencedModules: NO_MODULES,
      referenced: new Set([OLD_A]),
    });

    const after = await stat(join(root, COVERS, OLD_A));
    expect(result.added).toEqual([]);
    expect(await readFile(join(root, COVERS, OLD_A), 'utf8')).toBe('old a');
    expect(after.mtimeMs).toBe(before.mtimeMs);
  });

  it('replaces a truncated same-named cover with the staged bytes', async () => {
    // A copy cut off partway by an earlier run: same name, fewer bytes.
    await writeFile(join(root, COVERS, NEW_C), new Uint8Array([7]));
    await createStaging(root, STAGING);
    await writeStagedCover(root, STAGING, NEW_C, new Uint8Array([7, 7, 7, 7]));
    await writeStagedSnapshot(root, STAGING, { next: true });

    const result = await commitSync({
      root,
      stagingDir: STAGING,
      snapshot: SNAPSHOT,
      coversDir: COVERS,
      modulesDir: MODULES,
      referencedModules: NO_MODULES,
      referenced: new Set([NEW_C]),
    });

    expect(result.added).toEqual([NEW_C]);
    expect([...(await readFile(join(root, COVERS, NEW_C)))]).toEqual([7, 7, 7, 7]);
  });

  it('copies through a partial file and removes partial leftovers of a killed run', async () => {
    const leftover = `.${OLD_B}.partial`;
    await writeFile(join(root, COVERS, leftover), 'cut off');
    await writeFile(join(root, COVERS, `.${NEW_C}.partial`), 'cut off');
    await createStaging(root, STAGING);
    await writeStagedCover(root, STAGING, NEW_C, new Uint8Array([5, 5]));
    await writeStagedSnapshot(root, STAGING, { next: true });

    const result = await commitSync({
      root,
      stagingDir: STAGING,
      snapshot: SNAPSHOT,
      coversDir: COVERS,
      modulesDir: MODULES,
      referencedModules: NO_MODULES,
      referenced: new Set([NEW_C, OLD_A, OLD_B]),
    });

    expect(result).toEqual({ added: [NEW_C], removed: [], ...NO_MODULE_CHANGES });
    expect([...(await readFile(join(root, COVERS, NEW_C)))]).toEqual([5, 5]);
    expect((await readdir(join(root, COVERS))).sort()).toEqual(
      ['.gitkeep', NEW_C, OLD_A, OLD_B].sort(),
    );
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
      modulesDir: MODULES,
      referencedModules: NO_MODULES,
      referenced: new Set([OLD_A, OLD_B]),
    });

    expect(result).toEqual({ added: [], removed: [], ...NO_MODULE_CHANGES });
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
      modulesDir: MODULES,
      referencedModules: NO_MODULES,
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
        modulesDir: MODULES,
        referencedModules: NO_MODULES,
        referenced: new Set([NEW_C]),
      }),
    ).rejects.toThrow(/1001-cccccccccccc\.png/);
    expect(await readFile(join(root, SNAPSHOT), 'utf8')).toBe('{"previous":true}\n');
    expect((await readdir(join(root, COVERS))).sort()).toEqual(['.gitkeep', OLD_A, OLD_B].sort());
  });
});

describe('module images', () => {
  // Module names also match COVER_FILE (webp is a valid cover extension).
  const MOD_OLD = '5001-aaaaaaaaaaaa.webp';
  const MOD_GONE = '5002-bbbbbbbbbbbb.webp';
  const MOD_NEW = '5003-cccccccccccc.webp';

  const commit = (referencedModules: ReadonlySet<string>, referenced = new Set([OLD_A, OLD_B])) =>
    commitSync({
      root,
      stagingDir: STAGING,
      snapshot: SNAPSHOT,
      coversDir: COVERS,
      referenced,
      modulesDir: MODULES,
      referencedModules,
    });

  const listModules = async (): Promise<string[]> => (await readdir(join(root, MODULES))).sort();

  beforeEach(async () => {
    await mkdir(join(root, MODULES), { recursive: true });
    await writeFile(join(root, MODULES, MOD_OLD), 'old module');
    await writeFile(join(root, MODULES, MOD_GONE), 'gone module');
    await writeFile(join(root, MODULES, '.gitkeep'), '');
  });

  it('writeStagedModule writes into staging/modules', async () => {
    await createStaging(root, STAGING);
    await writeStagedModule(root, STAGING, MOD_NEW, new Uint8Array([4, 2]));
    expect([...(await readFile(join(root, STAGING, 'modules', MOD_NEW)))]).toEqual([4, 2]);
  });

  it('writeStagedModule rejects names that are not MODULE_FILE names', async () => {
    await createStaging(root, STAGING);
    for (const name of ['../x.webp', 'abc-123.webp', '5001-aaaaaaaaaaaa.png']) {
      await expect(writeStagedModule(root, STAGING, name, new Uint8Array([1]))).rejects.toThrow(
        /module image file name/,
      );
    }
    await expect(stat(join(root, 'x.webp'))).rejects.toThrow();
  });

  it('copies staged module images, keeps present ones and reports modulesAdded', async () => {
    const past = new Date('2020-01-01T00:00:00Z');
    await utimes(join(root, MODULES, MOD_OLD), past, past);
    const before = await stat(join(root, MODULES, MOD_OLD));
    await createStaging(root, STAGING);
    await writeStagedModule(root, STAGING, MOD_NEW, new Uint8Array([9, 9]));
    await writeStagedModule(root, STAGING, MOD_OLD, new TextEncoder().encode('old module'));
    await writeStagedSnapshot(root, STAGING, { next: true });

    const result = await commit(new Set([MOD_NEW, MOD_OLD]));

    expect(result.modulesAdded).toEqual([MOD_NEW]);
    expect([...(await readFile(join(root, MODULES, MOD_NEW)))]).toEqual([9, 9]);
    expect((await stat(join(root, MODULES, MOD_OLD))).mtimeMs).toBe(before.mtimeMs);
  });

  it('accepts a referenced module image that is present but not staged (copy-if-absent)', async () => {
    await createStaging(root, STAGING);
    await writeStagedSnapshot(root, STAGING, { next: true });

    const result = await commit(new Set([MOD_OLD, MOD_GONE]));

    expect(result.modulesAdded).toEqual([]);
    expect(result.modulesRemoved).toEqual([]);
    expect(await listModules()).toEqual(['.gitkeep', MOD_OLD, MOD_GONE].sort());
  });

  it('fails pre-flight before any write when a referenced module image is missing', async () => {
    await createStaging(root, STAGING);
    await writeStagedCover(root, STAGING, NEW_C, new Uint8Array([1]));
    await writeStagedModule(root, STAGING, MOD_NEW, new Uint8Array([1]));
    await writeStagedSnapshot(root, STAGING, { next: true });

    await expect(
      commit(new Set([MOD_NEW, '5999-ffffffffffff.webp']), new Set([NEW_C])),
    ).rejects.toThrow(/5999-ffffffffffff\.webp/);
    expect(await readFile(join(root, SNAPSHOT), 'utf8')).toBe('{"previous":true}\n');
    expect((await readdir(join(root, COVERS))).sort()).toEqual(
      ['.gitkeep', OLD_A, OLD_B, 'modules'].sort(),
    );
    expect(await listModules()).toEqual(['.gitkeep', MOD_OLD, MOD_GONE].sort());
  });

  it('unreferenced module images are removed after the rename', async () => {
    await writeFile(join(root, MODULES, `.${MOD_NEW}.partial`), 'cut off');
    await writeFile(join(root, MODULES, 'notes.txt'), 'keep');
    await createStaging(root, STAGING);
    await writeStagedSnapshot(root, STAGING, { next: true });

    const result = await commit(new Set([MOD_OLD]));

    expect(result.modulesRemoved).toEqual([MOD_GONE]);
    expect(JSON.parse(await readFile(join(root, SNAPSHOT), 'utf8'))).toEqual({ next: true });
    expect(await listModules()).toEqual(['.gitkeep', MOD_OLD, 'notes.txt'].sort());
  });

  it('a cover GC never removes module images', async () => {
    await createStaging(root, STAGING);
    await writeStagedSnapshot(root, STAGING, { next: true });

    // No cover references the module names, which all match COVER_FILE too.
    const result = await commit(new Set([MOD_OLD, MOD_GONE]), new Set([OLD_A]));

    expect(result.removed).toEqual([OLD_B]);
    expect(result.modulesRemoved).toEqual([]);
    expect(await listModules()).toEqual(['.gitkeep', MOD_OLD, MOD_GONE].sort());
    expect((await readdir(join(root, COVERS))).sort()).toEqual(
      ['.gitkeep', OLD_A, 'modules'].sort(),
    );
  });

  it('does not create the modules dir when no module image is staged', async () => {
    await rm(join(root, MODULES), { recursive: true });
    await createStaging(root, STAGING);
    await writeStagedSnapshot(root, STAGING, { next: true });

    const result = await commit(NO_MODULES);

    expect(result).toEqual({ added: [], removed: [], ...NO_MODULE_CHANGES });
    await expect(stat(join(root, MODULES))).rejects.toThrow();
  });
});
