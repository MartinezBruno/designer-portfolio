import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SyncError } from '../../scripts/behance/errors.ts';
import {
  BEHANCE_UA,
  fetchCover,
  fetchStorePage,
  type FetchDeps,
} from '../../scripts/behance/fetch-page.ts';

const fixture = (name: string): Buffer =>
  readFileSync(new URL(`../fixtures/behance/${name}`, import.meta.url));

const projectHtml = fixture('project.html').toString('utf8');
const challengeHtml = fixture('challenge.html').toString('utf8');
const coverPng = new Uint8Array(fixture('cover.png'));
const notImage = new Uint8Array(fixture('not-image.bin'));
const CHALLENGE_HEX = /js_challenge_value=([0-9a-f]+)/.exec(challengeHtml)?.[1] ?? '';

const PAGE_URL = 'https://www.behance.net/gallery/1001/project-1';
const COVER_URL = 'https://mir-s3-cdn-cf.behance.net/projects/max_808/abcdef1001.1001.png';

interface FakeReply {
  status: number;
  body?: string | Uint8Array;
  headers?: Record<string, string>;
  reject?: Error;
}

interface Recorded {
  url: string;
  init: RequestInit | undefined;
}

function fakeDeps(replies: FakeReply[]): { deps: FetchDeps; calls: Recorded[]; sleeps: number[] } {
  const calls: Recorded[] = [];
  const sleeps: number[] = [];
  const queue = [...replies];
  const fakeFetch = async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    const reply = queue.shift();
    if (reply === undefined) throw new Error('unexpected extra fetch');
    if (reply.reject !== undefined) throw reply.reject;
    const body = typeof reply.body === 'string' ? reply.body : (reply.body?.slice() ?? null);
    return new Response(body, { status: reply.status, headers: reply.headers ?? {} });
  };
  const deps: FetchDeps = {
    fetch: fakeFetch as typeof globalThis.fetch,
    sleep: async (ms: number) => {
      sleeps.push(ms);
    },
  };
  return { deps, calls, sleeps };
}

function header(call: Recorded | undefined, name: string): string | null {
  return new Headers(call?.init?.headers).get(name);
}

async function expectSyncError(
  run: () => Promise<unknown>,
  gate: string,
  text: string | RegExp,
): Promise<void> {
  const error = await run().then(
    () => null,
    (caught: Error) => caught,
  );
  expect(error).toBeInstanceOf(SyncError);
  if (error instanceof SyncError) {
    expect(error.gate).toBe(gate);
    expect(error.message).toMatch(text);
  }
}

describe('fetchStorePage', () => {
  it('returns a 200 page with a store, sending the fixed UA and redirect error', async () => {
    const { deps, calls, sleeps } = fakeDeps([{ status: 200, body: projectHtml }]);
    await expect(fetchStorePage(PAGE_URL, deps)).resolves.toBe(projectHtml);
    expect(calls).toHaveLength(1);
    expect(header(calls[0], 'user-agent')).toBe(BEHANCE_UA);
    expect(calls[0]?.init?.redirect).toBe('error');
    expect(header(calls[0], 'cookie')).toBeNull();
    expect(sleeps).toEqual([]);
  });

  it('replays a 403 challenge once with the same UA and the challenge cookie', async () => {
    const { deps, calls, sleeps } = fakeDeps([
      { status: 403, body: challengeHtml },
      { status: 200, body: projectHtml },
    ]);
    await expect(fetchStorePage(PAGE_URL, deps)).resolves.toBe(projectHtml);
    expect(sleeps).toEqual([2000]);
    expect(calls).toHaveLength(2);
    expect(calls.map((call) => call.url)).toEqual([PAGE_URL, PAGE_URL]);
    expect(header(calls[1], 'user-agent')).toBe(header(calls[0], 'user-agent'));
    expect(header(calls[1], 'user-agent')).toBe(BEHANCE_UA);
    expect(CHALLENGE_HEX).toHaveLength(128);
    expect(header(calls[1], 'cookie')).toBe(`js_challenge_value=${CHALLENGE_HEX}`);
    expect(calls[1]?.init?.redirect).toBe('error');
  });

  it('fails G2 with plan B when the replay is challenged again', async () => {
    const { deps } = fakeDeps([
      { status: 403, body: challengeHtml },
      { status: 403, body: challengeHtml },
    ]);
    await expectSyncError(() => fetchStorePage(PAGE_URL, deps), 'G2', /plan B/);
  });

  it('fails G2 with plan B when the replay returns 200 without a store', async () => {
    const { deps } = fakeDeps([
      { status: 403, body: challengeHtml },
      { status: 200, body: `<html>${'x'.repeat(4096)}</html>` },
    ]);
    await expectSyncError(() => fetchStorePage(PAGE_URL, deps), 'G2', /plan B/);
  });

  it('fails G2 with plan B on a 403 without the challenge marker', async () => {
    const { deps, calls } = fakeDeps([{ status: 403, body: 'Forbidden' }]);
    await expectSyncError(() => fetchStorePage(PAGE_URL, deps), 'G2', /plan B/);
    expect(calls).toHaveLength(1);
  });

  it('fails G2 with plan B on a 500', async () => {
    const { deps } = fakeDeps([{ status: 500, body: 'oops' }]);
    await expectSyncError(() => fetchStorePage(PAGE_URL, deps), 'G2', /plan B/);
  });

  it('fails G2 when fetch rejects (redirects are refused)', async () => {
    const { deps } = fakeDeps([{ status: 0, reject: new TypeError('redirect mode is error') }]);
    await expectSyncError(() => fetchStorePage(PAGE_URL, deps), 'G2', /request failed/);
  });

  it('fails G6 on a 200 body under 2 KB', async () => {
    const { deps } = fakeDeps([{ status: 200, body: '<html>tiny</html>' }]);
    await expectSyncError(() => fetchStorePage(PAGE_URL, deps), 'G6', /not a real page/);
  });

  it('fails G6 on a body over 5 MB by content-length', async () => {
    const { deps } = fakeDeps([
      { status: 200, body: projectHtml, headers: { 'content-length': String(6 * 1024 * 1024) } },
    ]);
    await expectSyncError(() => fetchStorePage(PAGE_URL, deps), 'G6', /too large/);
  });

  it('fails G6 on a body over 5 MB by actual length', async () => {
    const big = projectHtml + 'x'.repeat(5 * 1024 * 1024);
    const { deps } = fakeDeps([{ status: 200, body: big }]);
    await expectSyncError(() => fetchStorePage(PAGE_URL, deps), 'G6', /too large/);
  });

  it.each([
    'https://evil.example/gallery/1001/x',
    'https://behance.net.evil.example/gallery/1001/x',
    'http://www.behance.net/gallery/1001/x',
    'not a url',
  ])('refuses %s without calling fetch', async (url) => {
    const { deps, calls } = fakeDeps([]);
    await expectSyncError(() => fetchStorePage(url, deps), 'G2', /not allowed|invalid url/);
    expect(calls).toHaveLength(0);
  });
});

describe('fetchCover', () => {
  const pngHeaders = { 'content-type': 'image/png' };

  it('downloads an allowlisted PNG and names the extension from the bytes', async () => {
    const { deps, calls } = fakeDeps([{ status: 200, body: coverPng, headers: pngHeaders }]);
    const result = await fetchCover(COVER_URL, deps);
    expect(result.ext).toBe('png');
    expect(Array.from(result.bytes)).toEqual(Array.from(coverPng));
    expect(header(calls[0], 'user-agent')).toBe(BEHANCE_UA);
    expect(calls[0]?.init?.redirect).toBe('error');
  });

  it('uses the sniffed type even when the header says jpeg', async () => {
    const { deps } = fakeDeps([
      { status: 200, body: coverPng, headers: { 'content-type': 'image/jpeg' } },
    ]);
    await expect(fetchCover(COVER_URL, deps)).resolves.toMatchObject({ ext: 'png' });
  });

  it.each([
    'https://mir-cdn.behance.net/projects/original/abcdef1001.1001.png',
    'https://www.behance.net/projects/max_808/abcdef1001.1001.png',
    'http://mir-s3-cdn-cf.behance.net/projects/max_808/abcdef1001.1001.png',
  ])('refuses %s without calling fetch', async (url) => {
    const { deps, calls } = fakeDeps([]);
    await expectSyncError(() => fetchCover(url, deps), 'G4', /not allowed/);
    expect(calls).toHaveLength(0);
  });

  it('fails G4 when fetch rejects because of redirect error', async () => {
    const { deps } = fakeDeps([{ status: 0, reject: new TypeError('fetch failed') }]);
    await expectSyncError(() => fetchCover(COVER_URL, deps), 'G4', /redirect refused/);
  });

  it('fails G4 on a non-200', async () => {
    const { deps } = fakeDeps([{ status: 404, body: 'missing' }]);
    await expectSyncError(() => fetchCover(COVER_URL, deps), 'G4', /status 404/);
  });

  it('fails G4 on a non-image content-type', async () => {
    const { deps } = fakeDeps([
      { status: 200, body: coverPng, headers: { 'content-type': 'text/html' } },
    ]);
    await expectSyncError(() => fetchCover(COVER_URL, deps), 'G4', /content-type/);
  });

  it('fails G4 on non-image bytes labelled image/png', async () => {
    const { deps } = fakeDeps([{ status: 200, body: notImage, headers: pngHeaders }]);
    await expectSyncError(() => fetchCover(COVER_URL, deps), 'G4', /not an image/);
  });

  it('fails G4 on a cover under 1 KB', async () => {
    const { deps } = fakeDeps([{ status: 200, body: coverPng.slice(0, 512), headers: pngHeaders }]);
    await expectSyncError(() => fetchCover(COVER_URL, deps), 'G4', /too small/);
  });

  it('fails G4 on a cover over 10 MB by content-length', async () => {
    const { deps } = fakeDeps([
      {
        status: 200,
        body: coverPng,
        headers: { ...pngHeaders, 'content-length': String(11 * 1024 * 1024) },
      },
    ]);
    await expectSyncError(() => fetchCover(COVER_URL, deps), 'G4', /too large/);
  });

  it('fails G4 on a cover over 10 MB by actual length', async () => {
    const big = new Uint8Array(10 * 1024 * 1024 + 1);
    big.set(coverPng);
    const { deps } = fakeDeps([{ status: 200, body: big, headers: pngHeaders }]);
    await expectSyncError(() => fetchCover(COVER_URL, deps), 'G4', /too large/);
  });
});
