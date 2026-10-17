import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { chmod, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { COMMITTED, failureMessage, SyncError, UNTOUCHED } from '../../scripts/behance/errors.ts';
import { runSync, type SyncDeps, type SyncReport } from '../../scripts/behance/run-sync.ts';
import {
  ContentSchema,
  COVER_FILE,
  MODULE_FILE,
  parseSnapshot,
} from '../../src/lib/projects/snapshot-schema.ts';
import type { Snapshot, SnapshotProject } from '../../src/lib/projects/snapshot-schema.ts';

const fixture = (name: string): Buffer =>
  readFileSync(new URL(`../fixtures/behance/${name}`, import.meta.url));

const PROFILE_HTML = fixture('profile.html').toString('utf8');
const PROJECT_HTML = fixture('project.html').toString('utf8');
const CHALLENGE_HTML = fixture('challenge.html').toString('utf8');
const COVER_PNG = new Uint8Array(fixture('cover.png'));
const NOT_IMAGE = new Uint8Array(fixture('not-image.bin'));
const MODULE_WEBP = new Uint8Array(fixture('module.webp'));

const REPO_TMP = fileURLToPath(new URL('../../tmp/', import.meta.url));
const PROFILE_URL = 'https://www.behance.net/martifernand7';
const NOW = new Date('2026-10-17T12:00:00Z');

const PATHS = {
  snapshot: 'src/data/behance/snapshot.json',
  coversDir: 'src/assets/projects',
  modulesDir: 'src/assets/projects/modules',
  stagingDir: 'tmp/staging',
  overrides: 'src/data/project-overrides.json',
};

const STORE_SCRIPT = /(<script[^>]*id="beconfig-store_state"[^>]*>)([\s\S]*?)(<\/script>)/;

type FixtureProject = Record<string, string | number | object>;

interface ProfileStoreShape {
  profile: {
    activeSection: { work: { profileProjects: FixtureProject[]; hasMore: boolean } };
  };
}

function storeOf(html: string): ProfileStoreShape {
  const json = STORE_SCRIPT.exec(html)?.[2];
  if (json === undefined) throw new Error('fixture has no store');
  return JSON.parse(json) as ProfileStoreShape;
}

function withStore(html: string, store: ProfileStoreShape): string {
  return html.replace(
    STORE_SCRIPT,
    (_m, open: string, _json: string, close: string) => `${open}${JSON.stringify(store)}${close}`,
  );
}

/** Profile page listing `ids`, each a copy of fixture project 1001 with its id swapped in. */
function profileWith(ids: readonly string[], edit?: (store: ProfileStoreShape) => void): string {
  const store = storeOf(PROFILE_HTML);
  const template = JSON.stringify(store.profile.activeSection.work.profileProjects[0]);
  store.profile.activeSection.work.profileProjects = ids.map((id, index) => ({
    ...(JSON.parse(template.replaceAll('1001', id)) as FixtureProject),
    id: Number(id),
    slug: `project-${id}`,
    url: `https://www.behance.net/gallery/${id}/project-${id}`,
    publishedOn: 1690000000 + index * 1000,
  }));
  edit?.(store);
  return withStore(PROFILE_HTML, store);
}

const projectPage = (id: string): string => PROJECT_HTML.replaceAll('1001', id);

interface ProjectStoreShape {
  project: { project: { allModules: object[] } };
}

/** Project page for `id` with `extra` modules appended after the fixture's own modules. */
function projectPageWith(id: string, extra: readonly object[]): string {
  const page = projectPage(id);
  const json = STORE_SCRIPT.exec(page)?.[2];
  if (json === undefined) throw new Error('fixture has no store');
  const store = JSON.parse(json) as ProjectStoreShape;
  store.project.project.allModules.push(...extra);
  return page.replace(
    STORE_SCRIPT,
    (_m, open: string, _json: string, close: string) => `${open}${JSON.stringify(store)}${close}`,
  );
}

const MODULE_PATH = '/project_modules/';
const moduleUrl = (variant: string, id: string): string =>
  `https://mir-s3-cdn-cf.behance.net/project_modules/${variant}/abcdef${id}.png`;

interface Reply {
  status: number;
  body: string | Uint8Array;
  type?: string;
}

interface FakeOptions {
  profile?: string;
  project?: (id: string, attempt: number) => Reply;
  cover?: Uint8Array;
  /** Module image replies; the default serves module.webp for every variant. */
  module?: (url: string) => Reply;
  alwaysChallenge?: boolean;
}

type Event = { kind: 'fetch'; url: string } | { kind: 'sleep'; ms: number };

function html(body: string, status = 200): Reply {
  return { status, body, type: 'text/html' };
}

function makeFetch(options: FakeOptions, events: Event[]): typeof globalThis.fetch {
  const attempts = new Map<string, number>();
  const route = (url: string): Reply => {
    if (options.alwaysChallenge === true) return html(CHALLENGE_HTML, 403);
    if (url === PROFILE_URL) return html(options.profile ?? PROFILE_HTML);
    const gallery = /^https:\/\/www\.behance\.net\/gallery\/(\d+)\//.exec(url);
    if (gallery?.[1] !== undefined) {
      const id = gallery[1];
      const attempt = (attempts.get(id) ?? 0) + 1;
      attempts.set(id, attempt);
      if (options.project !== undefined) return options.project(id, attempt);
      // First request per project is challenged, the replay succeeds.
      return attempt === 1 ? html(CHALLENGE_HTML, 403) : html(projectPage(id));
    }
    if (url.startsWith('https://mir-s3-cdn-cf.behance.net/') && url.includes(MODULE_PATH)) {
      if (options.module !== undefined) return options.module(url);
      return { status: 200, body: MODULE_WEBP, type: 'image/webp' };
    }
    if (url.startsWith('https://mir-s3-cdn-cf.behance.net/')) {
      return { status: 200, body: options.cover ?? COVER_PNG, type: 'image/png' };
    }
    return html('not found', 404);
  };
  const fake = async (input: string | URL | Request): Promise<Response> => {
    const url = String(input);
    events.push({ kind: 'fetch', url });
    const reply = route(url);
    const body = typeof reply.body === 'string' ? reply.body : reply.body.slice();
    return new Response(body, {
      status: reply.status,
      headers: { 'content-type': reply.type ?? 'text/html' },
    });
  };
  return fake as typeof globalThis.fetch;
}

let root = '';

interface Harness {
  deps: SyncDeps;
  events: Event[];
  lines: string[];
}

function harness(options: FakeOptions = {}, allowFewer = false): Harness {
  const events: Event[] = [];
  const lines: string[] = [];
  const deps: SyncDeps = {
    fetch: makeFetch(options, events),
    sleep: async (ms: number) => {
      events.push({ kind: 'sleep', ms });
    },
    log: (line: string) => {
      lines.push(line);
    },
    paths: { root, ...PATHS },
    now: () => NOW,
    allowFewer,
    profileUrl: PROFILE_URL,
  };
  return { deps, events, lines };
}

function seedProject(id: string, publishedOn: number): SnapshotProject {
  return {
    id,
    slug: `seed-${id}`,
    name: `Seed ${id}`,
    url: `https://www.behance.net/gallery/${id}/seed-${id}`,
    publishedOn,
    modifiedOn: null,
    description: '',
    tags: [],
    tools: [],
    fields: [],
    canvasWidth: null,
    cover: {
      file: `${id}-${id.padStart(12, '0')}.png`,
      sourceUrl: `https://mir-s3-cdn-cf.behance.net/projects/max_808/${id}.png`,
      width: 808,
    },
    modules: [],
  };
}

async function seed(count: number, overrides = '{}\n'): Promise<void> {
  const projects = Array.from({ length: count }, (_, index) =>
    seedProject(String(9001 + index), 1600000000 + index),
  );
  const snapshot: Snapshot = {
    version: 1,
    origin: 'seed',
    syncedAt: '2026-10-01T00:00:00.000Z',
    profile: { username: 'martifernand7', url: PROFILE_URL },
    projects,
  };
  await mkdir(join(root, 'src/data/behance'), { recursive: true });
  await mkdir(join(root, PATHS.coversDir), { recursive: true });
  await mkdir(join(root, PATHS.modulesDir), { recursive: true });
  await writeFile(join(root, PATHS.snapshot), `${JSON.stringify(snapshot, null, 2)}\n`);
  await writeFile(join(root, PATHS.overrides), overrides);
  for (const project of projects) {
    await writeFile(join(root, PATHS.coversDir, project.cover.file), `old cover ${project.id}`);
  }
  await writeFile(join(root, PATHS.modulesDir, OLD_MODULE), 'old module image');
}

/** A module image no new snapshot references: GC removes it after a successful run. */
const OLD_MODULE = '9001-000000009001.webp';

/** sha256 of the snapshot and of every file in the covers and modules dirs. */
async function fingerprint(): Promise<Record<string, string>> {
  const hash = async (path: string) =>
    createHash('sha256')
      .update(await readFile(join(root, path)))
      .digest('hex');
  const result: Record<string, string> = { [PATHS.snapshot]: await hash(PATHS.snapshot) };
  for (const dir of [PATHS.coversDir, PATHS.modulesDir]) {
    const entries = await readdir(join(root, dir), { withFileTypes: true }).catch(() => []);
    const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
    for (const name of files.sort()) {
      const path = `${dir}/${name}`;
      result[path] = await hash(path);
    }
  }
  return result;
}

async function moduleFiles(): Promise<string[]> {
  const names = await readdir(join(root, PATHS.modulesDir)).catch((): string[] => []);
  return names.filter((name) => MODULE_FILE.test(name)).sort();
}

function contentFiles(snapshot: Snapshot): string[] {
  return snapshot.projects
    .flatMap((project) =>
      (project.content ?? []).flatMap((entry) => {
        if (entry.kind === 'image') return [entry.image.file];
        if (entry.kind === 'collection') return entry.images.map((image) => image.file);
        return [];
      }),
    )
    .sort();
}

const moduleFetches = (events: readonly Event[]): string[] =>
  events.flatMap((event) =>
    event.kind === 'fetch' && event.url.includes(MODULE_PATH) ? [event.url] : [],
  );

async function readSnapshot(): Promise<Snapshot> {
  return parseSnapshot(JSON.parse(await readFile(join(root, PATHS.snapshot), 'utf8')));
}

async function stagingExists(): Promise<boolean> {
  return stat(join(root, PATHS.stagingDir)).then(
    () => true,
    () => false,
  );
}

beforeEach(async () => {
  await mkdir(REPO_TMP, { recursive: true });
  root = await mkdtemp(join(REPO_TMP, 'sync-run-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('runSync', () => {
  describe('success', () => {
    it('success: writes a behance-sync snapshot, new covers, removes old covers and reports', async () => {
      await seed(3);
      const { deps, lines } = harness();
      const report: SyncReport = await runSync(deps);
      const snapshot = await readSnapshot();

      expect(snapshot.origin).toBe('behance-sync');
      expect(snapshot.syncedAt).toBe('2026-10-17T12:00:00.000Z');
      expect(snapshot.profile).toEqual({ username: 'martifernand7', url: PROFILE_URL });
      expect(snapshot.projects.map((project) => project.id)).toEqual(['1003', '1002', '1001']);

      const covers = await readdir(join(root, PATHS.coversDir));
      for (const project of snapshot.projects) {
        expect(project.modules.length).toBeGreaterThan(0);
        expect(project.tags).toEqual([
          { id: 11, title: 'tag a ' },
          { id: 12, title: 'tag b' },
        ]);
        expect(project.tools).toEqual([{ id: 21, title: 'Adobe Photoshop' }]);
        expect(project.fields).toEqual(['Graphic Design']);
        expect(project.canvasWidth).toBe(1400);
        expect(project.cover.file).toMatch(COVER_FILE);
        expect(project.cover.file.startsWith(`${project.id}-`)).toBe(true);
        expect(project.cover.sourceUrl).toBe(
          `https://mir-s3-cdn-cf.behance.net/projects/max_808/abcdef${project.id}.${project.id}.0.0.1400.1095.png`,
        );
        expect(project.cover.width).toBe(808);
        expect(covers).toContain(project.cover.file);
      }
      expect(covers.filter((name) => COVER_FILE.test(name)).sort()).toEqual(
        snapshot.projects.map((project) => project.cover.file).sort(),
      );

      expect(report.count).toBe(3);
      expect(report.coversAdded).toHaveLength(3);
      expect(report.coversRemoved.sort()).toEqual([
        '9001-000000009001.png',
        '9002-000000009002.png',
        '9003-000000009003.png',
      ]);
      expect(report.checklist).toEqual([
        'missing overrides for 1003 (project-3): title, category (suggested: graphic-design), summary, coverAlt',
        'missing overrides for 1002 (project-2): title, category (suggested: graphic-design), summary, coverAlt',
        'missing overrides for 1001 (project-1): title, category (suggested: graphic-design), summary, coverAlt',
      ]);
      expect(lines).toContain('sync:behance: 3 projects');
      for (const line of report.checklist) expect(lines).toContain(line);
      expect(await stagingExists()).toBe(false);
    });

    it('success: keeps the profile fields, modifiedOn and the description', async () => {
      await seed(3);
      await runSync(harness().deps);
      const project = (await readSnapshot()).projects.find((entry) => entry.id === '1001');
      expect(project).toMatchObject({
        slug: 'project-1',
        name: 'Project 1',
        url: 'https://www.behance.net/gallery/1001/project-1',
        publishedOn: 1690001000,
        modifiedOn: 1690001500,
        description: '',
      });
    });

    it('success: writes the snapshot with a fixed key order and a trailing newline', async () => {
      await seed(3);
      await runSync(harness().deps);
      const text = await readFile(join(root, PATHS.snapshot), 'utf8');
      expect(text.endsWith('}\n')).toBe(true);
      const first = (JSON.parse(text) as Snapshot).projects[0];
      expect(Object.keys(first ?? {})).toEqual([
        'id',
        'slug',
        'name',
        'url',
        'publishedOn',
        'modifiedOn',
        'description',
        'tags',
        'tools',
        'fields',
        'canvasWidth',
        'cover',
        'modules',
        'content',
      ]);
    });

    it('success: prints the 8+ projects notice without failing', async () => {
      await seed(3);
      const ids = ['1001', '1002', '1003', '1004', '1005', '1006', '1007', '1008'];
      const { deps, lines } = harness({ profile: profileWith(ids) });
      const report = await runSync(deps);
      const notice = 'sync:behance: 8 projects. Revisit filters and search (PROJ-04..07).';
      expect(report.count).toBe(8);
      expect(report.notices).toContain(notice);
      expect(lines).toContain(notice);
      expect((await readSnapshot()).projects).toHaveLength(8);
    });

    it('success: warns on unknown module types and keeps the module', async () => {
      await seed(3);
      const { deps, lines } = harness();
      await runSync(deps);
      expect(lines).toContain(
        'sync:behance: unknown module type "FutureModule" in 1001 (project-1). It renders the Behance fallback note.',
      );
      expect(lines.some((line) => line.includes('Phase 4 must render a fallback'))).toBe(false);
      const project = (await readSnapshot()).projects.find((entry) => entry.id === '1001');
      expect(project?.modules.map((module) => module.__typename)).toEqual([
        'ImageModule',
        'FutureModule',
      ]);
      expect(project?.content?.at(-1)).toEqual({ kind: 'unknown', type: 'FutureModule' });
    });

    it('success: warns on a non-allowlisted embed and normalizes text and collections', async () => {
      await seed(3);
      const extra = (id: string): object[] => [
        {
          __typename: 'MediaCollectionModule',
          id: 7701,
          components: ['1', '2'].map((n) => ({
            id: Number(`77${n}${id}`),
            imageSizes: { allAvailable: [{ url: moduleUrl('1400_webp', `${n}x${id}`) }] },
          })),
        },
        {
          __typename: 'TextModule',
          id: 7702,
          text: '<div style="color:red"><span>Hello</span> <b>world</b></div>',
        },
        {
          __typename: 'EmbedModule',
          id: 7703,
          originalEmbed: '<iframe src="https://evil.example/frame"></iframe>',
        },
      ];
      const { deps, lines } = harness({
        project: (id, attempt) =>
          attempt === 1 ? html(CHALLENGE_HTML, 403) : html(projectPageWith(id, extra(id))),
      });
      const report = await runSync(deps);
      expect(lines).toContain(
        'sync:behance: embed origin "https://evil.example" in 1002 (project-2) is not allowlisted. It renders the Behance fallback note. Add it to the embed allowlist in src/lib/projects/ if it is safe.',
      );
      const snapshot = await readSnapshot();
      const content = snapshot.projects.find((entry) => entry.id === '1002')?.content ?? [];
      expect(content.map((entry) => entry.kind)).toEqual([
        'image',
        'unknown',
        'collection',
        'text',
        'unknown',
      ]);
      const text = content.find((entry) => entry.kind === 'text');
      expect(text?.kind === 'text' ? text.html : '').not.toMatch(/style|span/);
      // 3 projects x (1 image + 2 collection images)
      expect(report.modulesAdded).toHaveLength(9);
      expect(await moduleFiles()).toEqual(contentFiles(snapshot));
    });

    it('success: writes content and commits exactly the referenced module images', async () => {
      await seed(3);
      const { deps, lines } = harness();
      const report = await runSync(deps);
      const snapshot = await readSnapshot();
      for (const project of snapshot.projects) {
        expect(ContentSchema.array().parse(project.content)).toEqual(project.content);
        const first = project.content?.[0];
        expect(first).toEqual({
          kind: 'image',
          image: {
            id: `555${project.id}`,
            file: expect.stringMatching(new RegExp(`^555${project.id}-[0-9a-f]{12}[.]webp$`)),
            width: 256,
            height: 192,
            sourceUrl: moduleUrl('1400_webp', project.id),
          },
          fullBleed: false,
          caption: '',
        });
      }
      const files = contentFiles(snapshot);
      expect(files).toHaveLength(3);
      expect(await moduleFiles()).toEqual(files);
      for (const file of files) {
        const stored = await readFile(join(root, PATHS.modulesDir, file));
        expect(new Uint8Array(stored)).toEqual(MODULE_WEBP);
      }
      expect([...report.modulesAdded].sort()).toEqual(files);
      expect(report.modulesRemoved).toEqual([OLD_MODULE]);
      expect(report.moduleBytesAdded).toBe(3 * MODULE_WEBP.byteLength);
      const mb = ((3 * MODULE_WEBP.byteLength) / 1048576).toFixed(2);
      expect(lines).toContain(`sync:behance: module images: 3 files, ${mb} MB added`);
    });

    it('success: falls back to the next variant on a 404 and stores WebP', async () => {
      await seed(3);
      const { deps } = harness({
        module: (url) =>
          url.includes('/1400_webp/')
            ? html('not found', 404)
            : { status: 200, body: COVER_PNG, type: 'image/png' },
      });
      await runSync(deps);
      const snapshot = await readSnapshot();
      for (const project of snapshot.projects) {
        const first = project.content?.[0];
        expect(first?.kind === 'image' ? first.image.sourceUrl : null).toBe(
          moduleUrl('1400', project.id),
        );
      }
      const files = await moduleFiles();
      expect(files).toHaveLength(3);
      for (const file of files) {
        const bytes = await readFile(join(root, PATHS.modulesDir, file));
        expect(bytes.subarray(0, 4).toString('latin1')).toBe('RIFF');
        expect(bytes.subarray(8, 12).toString('latin1')).toBe('WEBP');
      }
    });

    it('success: a re-sync reuses unchanged module images without a request and keeps them', async () => {
      await seed(3);
      await runSync(harness().deps);
      const files = await moduleFiles();
      const before = await fingerprint();
      const second = harness();
      const report = await runSync(second.deps);
      expect(moduleFetches(second.events)).toEqual([]);
      expect(report.modulesAdded).toEqual([]);
      expect(report.modulesRemoved).toEqual([]);
      expect(report.moduleBytesAdded).toBe(0);
      expect(second.lines).toContain('sync:behance: module images: 0 files, 0.00 MB added');
      // Module GC keeps every image the new snapshot references.
      expect(await moduleFiles()).toEqual(files);
      const after = await fingerprint();
      for (const file of files) {
        const path = `${PATHS.modulesDir}/${file}`;
        expect(after[path]).toBe(before[path]);
      }
    });

    it('success: a re-sync downloads a module image whose file is missing or corrupt', async () => {
      await seed(3);
      await runSync(harness().deps);
      const [missing, corrupt] = await moduleFiles();
      if (missing === undefined || corrupt === undefined) throw new Error('expected module files');
      await rm(join(root, PATHS.modulesDir, missing));
      await writeFile(join(root, PATHS.modulesDir, corrupt), 'truncated');
      const second = harness();
      const report = await runSync(second.deps);
      expect(moduleFetches(second.events)).toHaveLength(2);
      expect([...report.modulesAdded].sort()).toEqual([missing, corrupt].sort());
      const stored = await readFile(join(root, PATHS.modulesDir, corrupt));
      expect(new Uint8Array(stored)).toEqual(MODULE_WEBP);
    });

    it('success: sleeps 2000 ms before every Behance request after the first', async () => {
      await seed(3);
      const { deps, events } = harness();
      await runSync(deps);
      expect(events[0]?.kind).toBe('fetch');
      const fetches = events.filter((event) => event.kind === 'fetch');
      // profile + 3 x (challenge + replay) + 3 covers + 3 module images
      expect(fetches).toHaveLength(13);
      expect(moduleFetches(events)).toHaveLength(3);
      events.forEach((event, index) => {
        if (event.kind !== 'fetch' || index === 0) return;
        expect(events[index - 1]).toEqual({ kind: 'sleep', ms: 2000 });
      });
    });

    it('success: --allow-fewer accepts a shrinking profile', async () => {
      await seed(4);
      const report = await runSync(harness({}, true).deps);
      expect(report.count).toBe(3);
      expect((await readSnapshot()).projects).toHaveLength(3);
    });

    it('success: a missing previous snapshot counts as 0 projects', async () => {
      await mkdir(join(root, 'src/data'), { recursive: true });
      await writeFile(join(root, PATHS.overrides), '{}\n');
      const report = await runSync(harness().deps);
      expect(report.count).toBe(3);
    });

    it('success: a second identical run adds and removes no covers', async () => {
      await seed(3);
      await runSync(harness().deps);
      const before = await fingerprint();
      const report = await runSync(harness().deps);
      expect(report.coversAdded).toEqual([]);
      expect(report.coversRemoved).toEqual([]);
      const after = await fingerprint();
      expect(Object.keys(after)).toEqual(Object.keys(before));
    });
  });

  describe('fails', () => {
    async function expectRefused(
      options: FakeOptions,
      gate: string,
      text: string | RegExp,
      setup: () => Promise<void> = () => seed(3),
    ): Promise<void> {
      await setup();
      const before = await fingerprint();
      const error = await runSync(harness(options).deps).then(
        () => null,
        (caught: Error) => caught,
      );
      expect(error).toBeInstanceOf(SyncError);
      if (error instanceof SyncError) {
        expect(error.gate).toBe(gate);
        expect(error.message).toMatch(text);
      }
      expect(await fingerprint()).toEqual(before);
      expect(await stagingExists()).toBe(false);
    }

    it('fails on challenge-only responses (G2)', async () => {
      await expectRefused({ alwaysChallenge: true }, 'G2', /challenge repeated/);
    });

    it('fails on an empty profile list (G1)', async () => {
      const profile = profileWith([]);
      await expectRefused({ profile }, 'G1', /expected at least 1 project, got 0/);
    });

    it('fails on hasMore true (G1)', async () => {
      const profile = profileWith(['1001', '1002', '1003'], (store) => {
        store.profile.activeSection.work.hasMore = true;
      });
      await expectRefused({ profile }, 'G1', /hasMore/);
    });

    it('fails on a shrinking count without --allow-fewer (G1b)', async () => {
      await expectRefused(
        {},
        'G1b',
        'expected at least 4 projects, got 3. Re-run with --allow-fewer if projects were removed on Behance',
        () => seed(4),
      );
    });

    it('fails when one project page returns 500 (G2)', async () => {
      const project = (id: string): Reply =>
        id === '1002' ? html('server error', 500) : html(projectPage(id));
      await expectRefused({ project }, 'G2', /gallery\/1002\/.*status 500/);
    });

    it('fails on cover bytes that are not an image (G4)', async () => {
      await expectRefused({ cover: NOT_IMAGE }, 'G4', /not an image/);
    });

    it('fails on a cover URL outside the CDN allowlist (G4)', async () => {
      const profile = profileWith(['1001', '1002', '1003'], (store) => {
        const projects = store.profile.activeSection.work.profileProjects;
        store.profile.activeSection.work.profileProjects = projects.map(
          (project) =>
            JSON.parse(
              JSON.stringify(project).replaceAll(
                'mir-s3-cdn-cf.behance.net',
                'mir-cdn.behance.net',
              ),
            ) as FixtureProject,
        );
      });
      await expectRefused({ profile }, 'G4', /host not allowed/);
    });

    it('fails on an unreadable previous snapshot without --allow-fewer (G1b)', async () => {
      await expectRefused({}, 'G1b', /previous snapshot .* is unreadable/, async () => {
        await seed(3);
        await writeFile(join(root, PATHS.snapshot), '{"version":1}\n');
      });
    });

    it('fails on overrides with an unknown id (G8)', async () => {
      await expectRefused({}, 'G8', /unknown Behance id 999/, () =>
        seed(3, '{ "999": { "featured": true } }\n'),
      );
    });

    it('fails when every variant of one module image is unavailable (G4m)', async () => {
      const module = (url: string): Reply =>
        url.includes('abcdef1002')
          ? html('not found', 404)
          : { status: 200, body: MODULE_WEBP, type: 'image/webp' };
      await expectRefused({ module }, 'G4m', /could not download module image 5551002 for 1002/);
      const error = await runSync(harness({ module }).deps).then(
        () => null,
        (caught: Error) => caught,
      );
      const message = failureMessage(error ?? 'no error');
      expect(message).toContain('could not download module image');
      expect(message).toContain('The previous snapshot was left untouched.');
      expect(await moduleFiles()).toEqual([OLD_MODULE]);
    });

    it('fails on module image bytes that are not an image (G4m)', async () => {
      const module = (): Reply => ({ status: 200, body: NOT_IMAGE, type: 'image/webp' });
      await expectRefused({ module }, 'G4m', /not an image/);
    });

    it('fails on a raw project whose publishedOn is a string (G3)', async () => {
      const project = (id: string): Reply =>
        html(projectPage(id).replace('"publishedOn":1691000000', '"publishedOn":"1691000000"'));
      await expectRefused({ project }, 'G3', /publishedOn/);
    });
  });

  describe('fails after the commit point', () => {
    async function expectCommittedFailure(deps: SyncDeps, text: RegExp): Promise<void> {
      const error = await runSync(deps).then(
        () => null,
        (caught: Error) => caught,
      );
      expect(error).toBeInstanceOf(SyncError);
      if (error instanceof SyncError) {
        expect(error.gate).toBe('G7');
        expect(error.committed).toBe(true);
        expect(error.message).toMatch(/snapshot was written, but a post-commit step failed/);
        expect(error.message).toMatch(text);
        expect(failureMessage(error)).toContain(COMMITTED);
        expect(failureMessage(error)).not.toContain(UNTOUCHED);
      }
      // The new snapshot is live.
      expect((await readSnapshot()).origin).toBe('behance-sync');
      expect(await stagingExists()).toBe(false);
    }

    it('reports a cover GC failure after the rename as committed', async () => {
      await seed(3);
      // A directory with a cover name: GC's rm (not recursive) cannot remove it.
      await mkdir(join(root, PATHS.coversDir, '9999-ffffffffffff.png'));
      await expectCommittedFailure(harness().deps, /9999-ffffffffffff\.png/);
    });

    it('reports a G9 report failure as committed', async () => {
      await seed(3);
      const { deps } = harness();
      deps.log = () => {
        throw new Error('stdout closed');
      };
      await expectCommittedFailure(deps, /stdout closed/);
    });
  });
});

// Root ignores directory permissions, so the cleanup failure cannot be simulated there.
const canDenyWrites = process.getuid?.() !== 0;

describe.runIf(canDenyWrites)('runSync when the staging dir cannot be removed', () => {
  const staging = (): string => join(root, 'tmp');

  /** Makes staging's parent read-only once the run reaches the covers, so cleanup fails. */
  function lockStagingParent(deps: SyncDeps): void {
    const fetch = deps.fetch;
    deps.fetch = async (input, init) => {
      if (String(input).startsWith('https://mir-s3-cdn-cf.behance.net/')) {
        await chmod(staging(), 0o555);
      }
      return fetch(input, init);
    };
  }

  afterEach(async () => {
    await chmod(staging(), 0o755).catch(() => undefined);
  });

  it('keeps the original sync error and logs the cleanup failure', async () => {
    await seed(3);
    const { deps, lines } = harness({ cover: NOT_IMAGE });
    lockStagingParent(deps);
    const error = await runSync(deps).then(
      () => null,
      (caught: Error) => caught,
    );
    expect(error).toBeInstanceOf(SyncError);
    expect(error instanceof SyncError && error.gate).toBe('G4');
    expect(error?.message).toMatch(/not an image/);
    expect(lines.some((line) => line.includes('could not remove staging dir tmp/staging'))).toBe(
      true,
    );
  });

  it('still succeeds when only the cleanup fails', async () => {
    await seed(3);
    const { deps, lines } = harness();
    lockStagingParent(deps);
    const report = await runSync(deps);
    expect(report.count).toBe(3);
    expect((await readSnapshot()).origin).toBe('behance-sync');
    expect(lines.some((line) => line.includes('could not remove staging dir tmp/staging'))).toBe(
      true,
    );
  });
});

describe('failureMessage', () => {
  it('says the previous snapshot is untouched for a failure before the commit point', () => {
    expect(failureMessage(new SyncError('G2', 'challenge repeated'))).toBe(
      `sync:behance: [G2] challenge repeated. ${UNTOUCHED}`,
    );
    expect(failureMessage('boom')).toBe(`sync:behance: boom. ${UNTOUCHED}`);
  });

  it('says the new snapshot was written for a committed failure', () => {
    const error = new SyncError('G7', 'gc failed', { committed: true });
    expect(failureMessage(error)).toBe(`sync:behance: [G7] gc failed. ${COMMITTED}`);
  });
});
