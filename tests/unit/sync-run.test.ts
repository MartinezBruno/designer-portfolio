import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SyncError } from '../../scripts/behance/errors.ts';
import { runSync, type SyncDeps, type SyncReport } from '../../scripts/behance/run-sync.ts';
import { COVER_FILE, parseSnapshot } from '../../src/lib/projects/snapshot-schema.ts';
import type { Snapshot, SnapshotProject } from '../../src/lib/projects/snapshot-schema.ts';

const fixture = (name: string): Buffer =>
  readFileSync(new URL(`../fixtures/behance/${name}`, import.meta.url));

const PROFILE_HTML = fixture('profile.html').toString('utf8');
const PROJECT_HTML = fixture('project.html').toString('utf8');
const CHALLENGE_HTML = fixture('challenge.html').toString('utf8');
const COVER_PNG = new Uint8Array(fixture('cover.png'));
const NOT_IMAGE = new Uint8Array(fixture('not-image.bin'));

const REPO_TMP = fileURLToPath(new URL('../../tmp/', import.meta.url));
const PROFILE_URL = 'https://www.behance.net/martifernand7';
const NOW = new Date('2026-10-17T12:00:00Z');

const PATHS = {
  snapshot: 'src/data/behance/snapshot.json',
  coversDir: 'src/assets/projects',
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
    publishedOn: 1690000000 + index * 1000,
  }));
  edit?.(store);
  return withStore(PROFILE_HTML, store);
}

const projectPage = (id: string): string => PROJECT_HTML.replaceAll('1001', id);

interface Reply {
  status: number;
  body: string | Uint8Array;
  type?: string;
}

interface FakeOptions {
  profile?: string;
  project?: (id: string, attempt: number) => Reply;
  cover?: Uint8Array;
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
      sourceUrl: `https://www.behance.net/gallery/${id}/seed-${id}`,
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
  await writeFile(join(root, PATHS.snapshot), `${JSON.stringify(snapshot, null, 2)}\n`);
  await writeFile(join(root, PATHS.overrides), overrides);
  for (const project of projects) {
    await writeFile(join(root, PATHS.coversDir, project.cover.file), `old cover ${project.id}`);
  }
}

/** sha256 of the snapshot and of every file in the covers dir. */
async function fingerprint(): Promise<Record<string, string>> {
  const hash = async (path: string) =>
    createHash('sha256')
      .update(await readFile(join(root, path)))
      .digest('hex');
  const result: Record<string, string> = { [PATHS.snapshot]: await hash(PATHS.snapshot) };
  for (const name of (await readdir(join(root, PATHS.coversDir))).sort()) {
    const path = `${PATHS.coversDir}/${name}`;
    result[path] = await hash(path);
  }
  return result;
}

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
      expect(covers.sort()).toEqual(snapshot.projects.map((project) => project.cover.file).sort());

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
        'sync:behance: project 1001 has unknown module type FutureModule (kept as raw JSON; Phase 4 must render a fallback)',
      );
      const project = (await readSnapshot()).projects.find((entry) => entry.id === '1001');
      expect(project?.modules.map((module) => module.__typename)).toEqual([
        'ImageModule',
        'FutureModule',
      ]);
    });

    it('success: sleeps 2000 ms before every Behance request after the first', async () => {
      await seed(3);
      const { deps, events } = harness();
      await runSync(deps);
      expect(events[0]?.kind).toBe('fetch');
      const fetches = events.filter((event) => event.kind === 'fetch');
      // profile + 3 x (challenge + replay) + 3 covers
      expect(fetches).toHaveLength(10);
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
              JSON.stringify(project).replaceAll('mir-s3-cdn-cf.behance.net', 'mir-cdn.behance.net'),
            ) as FixtureProject,
        );
      });
      await expectRefused({ profile }, 'G4', /host not allowed/);
    });

    it('fails on overrides with an unknown id (G8)', async () => {
      await expectRefused({}, 'G8', /unknown Behance id 999/, () =>
        seed(3, '{ "999": { "featured": true } }\n'),
      );
    });

    it('fails on a raw project whose publishedOn is a string (G3)', async () => {
      const project = (id: string): Reply =>
        html(projectPage(id).replace('"publishedOn":1691000000', '"publishedOn":"1691000000"'));
      await expectRefused({ project }, 'G3', /publishedOn/);
    });
  });
});
