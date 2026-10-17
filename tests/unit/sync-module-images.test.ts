import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { SyncError } from '../../scripts/behance/errors.ts';
import { sniffImage } from '../../scripts/behance/covers.ts';
import { fetchModuleImage, type FetchDeps } from '../../scripts/behance/fetch-page.ts';
import {
  downloadModuleImage,
  encodeModuleImage,
  moduleFileName,
} from '../../scripts/behance/module-images.ts';
import { MODULE_FILE } from '../../src/lib/projects/snapshot-schema.ts';

const fixture = (name: string): Uint8Array =>
  new Uint8Array(readFileSync(new URL(`../fixtures/behance/${name}`, import.meta.url)));

const coverPng = fixture('cover.png');
const moduleWebp = fixture('module.webp');

const CDN = 'https://mir-s3-cdn-cf.behance.net/project_modules';
const URL_1400_WEBP = `${CDN}/1400_webp/abc123.png`;
const URL_1400 = `${CDN}/1400/abc123.png`;
const URL_FS = `${CDN}/fs/abc123.png`;
const PROJECT = { id: '1001', slug: 'project-1' };

interface FakeReply {
  status: number;
  body?: string | Uint8Array;
  headers?: Record<string, string>;
  reject?: Error;
}

/** Fake fetch keyed by URL; no real network. */
function fakeDeps(routes: Record<string, FakeReply>): {
  deps: FetchDeps;
  calls: string[];
  agents: (string | null)[];
} {
  const calls: string[] = [];
  const agents: (string | null)[] = [];
  const fakeFetch = async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push(url);
    agents.push(new Headers(init?.headers).get('user-agent'));
    // Redirects are never followed by fetch itself; fetchModuleImage checks the one allowed hop.
    expect(init?.redirect).toBe('manual');
    const reply = routes[url];
    if (reply === undefined) throw new Error(`unexpected fetch ${url}`);
    if (reply.reject !== undefined) throw reply.reject;
    const body = typeof reply.body === 'string' ? reply.body : (reply.body?.slice() ?? null);
    return new Response(body, { status: reply.status, headers: reply.headers ?? {} });
  };
  return {
    deps: { fetch: fakeFetch as typeof globalThis.fetch, sleep: async () => {} },
    calls,
    agents,
  };
}

const image = (body: Uint8Array, type = 'image/png'): FakeReply => ({
  status: 200,
  body,
  headers: { 'content-type': type },
});
const redirectTo = (location: string | undefined, status = 302): FakeReply => ({
  status,
  headers: location === undefined ? {} : { location },
});
const RENDITION = 'https://mir-cdn.behance.net/v1/rendition/project_modules';
const HOP_1400_WEBP = `${RENDITION}/1400_webp/abc123.png`;
const notFound: FakeReply = {
  status: 404,
  body: '{"error":"not found"}',
  headers: { 'content-type': 'application/json' },
};

async function caught(run: () => Promise<unknown>): Promise<Error | null> {
  return run().then(
    () => null,
    (error: Error) => error,
  );
}

async function expectSyncError(
  run: () => Promise<unknown>,
  gate: string,
  text: RegExp,
): Promise<void> {
  const error = await caught(run);
  expect(error).toBeInstanceOf(SyncError);
  if (error instanceof SyncError) {
    expect(error.gate).toBe(gate);
    expect(error.message).toMatch(text);
  }
}

async function png(width: number, height: number): Promise<Uint8Array> {
  const buffer = await sharp({
    create: { width, height, channels: 3, background: '#336699' },
  })
    .png()
    .toBuffer();
  return new Uint8Array(buffer);
}

describe('fetchModuleImage', () => {
  it('returns ok with the sniffed extension for a 200 image', async () => {
    const { deps } = fakeDeps({ [URL_1400_WEBP]: image(moduleWebp, 'image/webp') });
    const result = await fetchModuleImage(URL_1400_WEBP, deps);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.ext).toBe('webp');
  });

  it('skips a 404 response', async () => {
    const { deps } = fakeDeps({ [URL_1400_WEBP]: notFound });
    const result = await fetchModuleImage(URL_1400_WEBP, deps);
    expect(result.status).toBe('skip');
    if (result.status === 'skip') expect(result.reason).toMatch(/404/);
  });

  it('skips a 200 non-image response', async () => {
    const { deps } = fakeDeps({
      [URL_1400]: { status: 200, body: '<html></html>', headers: { 'content-type': 'text/html' } },
    });
    const result = await fetchModuleImage(URL_1400, deps);
    expect(result.status).toBe('skip');
  });

  it('throws G4m on any other non-200 status', async () => {
    const { deps } = fakeDeps({ [URL_1400]: { status: 500, body: 'oops' } });
    await expectSyncError(() => fetchModuleImage(URL_1400, deps), 'G4m', /status 500/);
  });

  it('rejects a disallowed host before any fetch', async () => {
    const { deps, calls } = fakeDeps({});
    await expectSyncError(
      () => fetchModuleImage('https://evil.example/project_modules/1400/x.png', deps),
      'G4m',
      /host not allowed/,
    );
    await expectSyncError(
      () => fetchModuleImage('http://mir-s3-cdn-cf.behance.net/project_modules/1400/x.png', deps),
      'G4m',
      /host not allowed/,
    );
    expect(calls).toHaveLength(0);
  });

  it('throws when the request is refused (redirect or network error)', async () => {
    const { deps } = fakeDeps({ [URL_1400]: { status: 0, reject: new TypeError('redirect') } });
    await expectSyncError(() => fetchModuleImage(URL_1400, deps), 'G4m', /request failed/);
  });

  it('throws when the body is over 10 MB', async () => {
    const big = new Uint8Array(10 * 1024 * 1024 + 1);
    big.set(coverPng.subarray(0, 8));
    const { deps } = fakeDeps({ [URL_1400]: image(big) });
    await expectSyncError(() => fetchModuleImage(URL_1400, deps), 'G4m', /too large/);
  });

  it('throws on a tiny body or unknown magic bytes', async () => {
    const { deps } = fakeDeps({
      [URL_1400]: image(new Uint8Array([0x89, 0x50])),
      [URL_FS]: image(new Uint8Array(4096).fill(7)),
    });
    await expectSyncError(() => fetchModuleImage(URL_1400, deps), 'G4m', /too small/);
    await expectSyncError(() => fetchModuleImage(URL_FS, deps), 'G4m', /unknown magic bytes/);
  });
});

describe('fetchModuleImage redirects (one allowed CDN hop)', () => {
  it('follows one 302 to the mir-cdn rendition path with the same UA', async () => {
    const { deps, calls, agents } = fakeDeps({
      [URL_1400_WEBP]: redirectTo(HOP_1400_WEBP),
      [HOP_1400_WEBP]: image(moduleWebp, 'image/webp'),
    });
    const result = await fetchModuleImage(URL_1400_WEBP, deps);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.ext).toBe('webp');
    expect(calls).toEqual([URL_1400_WEBP, HOP_1400_WEBP]);
    expect(agents[1]).toBe(agents[0]);
    expect(agents[0]).not.toBeNull();
  });

  it.each([301, 303, 307, 308])('follows the allowed hop for status %i', async (status) => {
    const { deps } = fakeDeps({
      [URL_1400_WEBP]: redirectTo(HOP_1400_WEBP, status),
      [HOP_1400_WEBP]: image(moduleWebp, 'image/webp'),
    });
    await expect(fetchModuleImage(URL_1400_WEBP, deps)).resolves.toMatchObject({ status: 'ok' });
  });

  it('keeps the final-response checks after the hop', async () => {
    const tiny = `${RENDITION}/1400/tiny.png`;
    const html = `${RENDITION}/1400/html.png`;
    const missing = `${RENDITION}/1400/missing.png`;
    const { deps } = fakeDeps({
      [`${CDN}/1400/tiny.png`]: redirectTo(tiny),
      [tiny]: image(new Uint8Array([0x89, 0x50])),
      [`${CDN}/1400/html.png`]: redirectTo(html),
      [html]: { status: 200, body: '<html></html>', headers: { 'content-type': 'text/html' } },
      [`${CDN}/1400/missing.png`]: redirectTo(missing),
      [missing]: notFound,
    });
    await expectSyncError(() => fetchModuleImage(`${CDN}/1400/tiny.png`, deps), 'G4m', /too small/);
    await expect(fetchModuleImage(`${CDN}/1400/html.png`, deps)).resolves.toMatchObject({
      status: 'skip',
    });
    await expect(fetchModuleImage(`${CDN}/1400/missing.png`, deps)).resolves.toMatchObject({
      status: 'skip',
    });
  });

  it('refuses a second hop', async () => {
    const second = `${RENDITION}/1400_webp/abc123-again.png`;
    const { deps, calls } = fakeDeps({
      [URL_1400_WEBP]: redirectTo(HOP_1400_WEBP),
      [HOP_1400_WEBP]: redirectTo(second),
    });
    await expectSyncError(() => fetchModuleImage(URL_1400_WEBP, deps), 'G4m', /redirect/);
    expect(calls).toEqual([URL_1400_WEBP, HOP_1400_WEBP]);
  });

  it.each([
    ['a foreign host', 'https://evil.example/v1/rendition/project_modules/1400_webp/abc123.png'],
    ['a look-alike host', 'https://mir-cdn.behance.net.evil.example/v1/rendition/project_modules/x.png'],
    ['the source host', 'https://mir-s3-cdn-cf.behance.net/v1/rendition/project_modules/x.png'],
    ['a wrong path', 'https://mir-cdn.behance.net/v1/rendition/projects/1400/abc123.png'],
    ['a path escaping the prefix', 'https://mir-cdn.behance.net/v1/rendition/project_modules/../../x.png'],
    ['plain http', 'http://mir-cdn.behance.net/v1/rendition/project_modules/1400_webp/abc123.png'],
    ['userinfo', 'https://user:pass@mir-cdn.behance.net/v1/rendition/project_modules/x.png'],
    ['a username only', 'https://user@mir-cdn.behance.net/v1/rendition/project_modules/x.png'],
    ['an explicit port', 'https://mir-cdn.behance.net:8443/v1/rendition/project_modules/x.png'],
    ['a relative location', '/v1/rendition/project_modules/1400_webp/abc123.png'],
    ['an unparsable location', 'https://['],
  ])('refuses a redirect to %s without requesting it', async (_label, location) => {
    const { deps, calls } = fakeDeps({ [URL_1400_WEBP]: redirectTo(location) });
    await expectSyncError(() => fetchModuleImage(URL_1400_WEBP, deps), 'G4m', /redirect/);
    expect(calls).toEqual([URL_1400_WEBP]);
  });

  it('refuses a redirect without a Location header', async () => {
    const { deps, calls } = fakeDeps({ [URL_1400_WEBP]: redirectTo(undefined) });
    await expectSyncError(() => fetchModuleImage(URL_1400_WEBP, deps), 'G4m', /redirect/);
    expect(calls).toEqual([URL_1400_WEBP]);
  });

  it('refuses other 3xx statuses', async () => {
    const { deps } = fakeDeps({ [URL_1400_WEBP]: redirectTo(HOP_1400_WEBP, 300) });
    await expectSyncError(() => fetchModuleImage(URL_1400_WEBP, deps), 'G4m', /status 300/);
  });

  it('fails G4m when the hop request itself is refused', async () => {
    const { deps } = fakeDeps({
      [URL_1400_WEBP]: redirectTo(HOP_1400_WEBP),
      [HOP_1400_WEBP]: { status: 0, reject: new TypeError('fetch failed') },
    });
    await expectSyncError(() => fetchModuleImage(URL_1400_WEBP, deps), 'G4m', /request failed/);
  });
});

describe('encodeModuleImage', () => {
  it('downscales a PNG wider than 1400 to exactly 1400 wide WebP', async () => {
    const result = await encodeModuleImage(await png(2000, 1000), 'png');
    expect(sniffImage(result.bytes)).toBe('webp');
    expect(result.width).toBe(1400);
    expect(result.height).toBe(700);
  });

  it('never upscales a narrower PNG', async () => {
    const result = await encodeModuleImage(await png(600, 400), 'png');
    expect(sniffImage(result.bytes)).toBe('webp');
    expect(result.width).toBe(600);
    expect(result.height).toBe(400);
  });

  it('keeps WebP up to 1400 wide byte-identical with its real size', async () => {
    const result = await encodeModuleImage(moduleWebp, 'webp');
    expect(Buffer.from(result.bytes).equals(Buffer.from(moduleWebp))).toBe(true);
    expect(result.width).toBe(256);
    expect(result.height).toBe(192);
  });

  it('re-encodes a WebP wider than 1400', async () => {
    const wide = new Uint8Array(
      await sharp({ create: { width: 1800, height: 900, channels: 3, background: '#000' } })
        .webp()
        .toBuffer(),
    );
    const result = await encodeModuleImage(wide, 'webp');
    expect(result.width).toBe(1400);
    expect(sniffImage(result.bytes)).toBe('webp');
  });
});

describe('moduleFileName', () => {
  it('names files <id>-<hash12>.webp and the hash follows the bytes', () => {
    const a = moduleFileName('555', moduleWebp);
    const b = moduleFileName('555', coverPng);
    expect(a).toMatch(MODULE_FILE);
    expect(a.startsWith('555-')).toBe(true);
    expect(a).not.toBe(b);
  });

  it('rejects a non-digit id', () => {
    expect(() => moduleFileName('../x', moduleWebp)).toThrow(SyncError);
    expect(() => moduleFileName('abc', moduleWebp)).toThrow(SyncError);
  });
});

describe('downloadModuleImage', () => {
  it('falls back to the next variant when the first 404s and stores a WebP', async () => {
    const { deps, calls } = fakeDeps({ [URL_1400_WEBP]: notFound, [URL_1400]: image(coverPng) });
    const { ref, bytes } = await downloadModuleImage(
      { id: '777', candidates: [URL_1400_WEBP, URL_1400] },
      deps,
      PROJECT,
    );
    expect(calls).toEqual([URL_1400_WEBP, URL_1400]);
    expect(sniffImage(bytes)).toBe('webp');
    expect(ref.id).toBe('777');
    expect(ref.sourceUrl).toBe(URL_1400);
    expect(ref.file).toMatch(MODULE_FILE);
    expect(ref.file.startsWith('777-')).toBe(true);
    expect(ref.file).toBe(moduleFileName('777', bytes));
    expect(ref.width).toBeLessThanOrEqual(1400);
    expect(ref.width).toBe(32);
    expect(ref.height).toBe(32);
  });

  it('stores a first-candidate WebP byte-identical with its real size', async () => {
    const { deps, calls } = fakeDeps({ [URL_1400_WEBP]: image(moduleWebp, 'image/webp') });
    const { ref, bytes } = await downloadModuleImage(
      { id: '778', candidates: [URL_1400_WEBP, URL_1400] },
      deps,
      PROJECT,
    );
    expect(calls).toEqual([URL_1400_WEBP]);
    expect(Buffer.from(bytes).equals(Buffer.from(moduleWebp))).toBe(true);
    expect(ref.width).toBe(256);
    expect(ref.height).toBe(192);
  });

  it('fails with G4m naming image, project and slug when every candidate is skipped', async () => {
    const { deps } = fakeDeps({
      [URL_1400_WEBP]: notFound,
      [URL_1400]: { status: 200, body: 'x', headers: { 'content-type': 'text/html' } },
      [URL_FS]: notFound,
    });
    const error = await caught(() =>
      downloadModuleImage(
        { id: '779', candidates: [URL_1400_WEBP, URL_1400, URL_FS] },
        deps,
        PROJECT,
      ),
    );
    expect(error).toBeInstanceOf(SyncError);
    if (error instanceof SyncError) {
      expect(error.gate).toBe('G4m');
      expect(error.message).toMatch(/could not download module image 779 for 1001 \(project-1\)/);
      expect(error.message).toMatch(/404/);
    }
  });

  it('stops on a hard failure instead of trying the next candidate', async () => {
    const { deps, calls } = fakeDeps({
      [URL_1400_WEBP]: { status: 500 },
      [URL_1400]: image(coverPng),
    });
    await expectSyncError(
      () =>
        downloadModuleImage({ id: '780', candidates: [URL_1400_WEBP, URL_1400] }, deps, PROJECT),
      'G4m',
      /status 500/,
    );
    expect(calls).toEqual([URL_1400_WEBP]);
  });
});

describe('sharp import boundary', () => {
  it('only scripts/behance/module-images.ts imports sharp under scripts/ and src/', () => {
    const root = join(new URL('../..', import.meta.url).pathname);
    const importers: string[] = [];
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|mts|js|mjs|astro)$/.test(name)) {
          if (/from ['"]sharp['"]|import\(['"]sharp['"]\)/.test(readFileSync(path, 'utf8'))) {
            importers.push(relative(root, path));
          }
        }
      }
    };
    walk(join(root, 'scripts'));
    walk(join(root, 'src'));
    expect(importers).toEqual(['scripts/behance/module-images.ts']);
  });
});
