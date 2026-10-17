// Challenge-aware Behance page fetch and allowlisted cover download.
// Erasable TypeScript only (Node type stripping runs it).
//
// - Public pages only: no account access or secrets; the only cookie is the challenge value (D-03).
// - Hosts are allowlisted before any request (SSRF guard) and every request uses redirect: 'error'.
// - A 403 challenge is replayed once, after deps.sleep(2000), with the SAME user agent.
// - Spacing between separate page requests is the caller's job (03-08 runSync sleeps 2000 ms
//   before every Behance HTML request after the first, D-04).
import { SyncError } from './errors.ts';
import { sniffImage } from './covers.ts';
import type { ImageExt } from './covers.ts';

/** Fixed, honest desktop browser UA. The challenge replay fails if the UA changes between requests. */
export const BEHANCE_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

export interface FetchDeps {
  fetch: typeof globalThis.fetch;
  sleep: (ms: number) => Promise<void>;
}

const PAGE_HOSTS: readonly string[] = ['www.behance.net'];
const CDN_HOSTS: readonly string[] = ['mir-s3-cdn-cf.behance.net'];
const CHALLENGE = /js_challenge_value=([0-9a-f]{32,})/i;
const STORE = /<script[^>]*id="beconfig-store_state"[^>]*>([\s\S]*?)<\/script>/;
const CHALLENGE_DELAY_MS = 2000;
const MB = 1024 * 1024;
const MAX_PAGE_BYTES = 5 * MB;
const MIN_PAGE_BYTES = 2048;
const MAX_COVER_BYTES = 10 * MB;
const MIN_COVER_BYTES = 1024;
const PLAN_B = 'Consider Playwright plan B (D-04, .planning/research/STACK.md §1.3)';

function assertAllowed(url: string, hosts: readonly string[], gate: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new SyncError(gate, `invalid url ${JSON.stringify(url)}`);
  }
  if (parsed.protocol !== 'https:' || !hosts.includes(parsed.hostname)) {
    throw new SyncError(gate, `${url}: host not allowed (allowed: https://${hosts.join(', ')})`);
  }
}

async function request(
  url: string,
  deps: FetchDeps,
  gate: string,
  init: RequestInit,
): Promise<Response> {
  try {
    return await deps.fetch(url, init);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new SyncError(
      gate,
      `${url}: request failed (redirect refused or network error: ${reason})`,
    );
  }
}

/** Reads the body, refusing anything over `limit` by content-length or by actual bytes. */
async function readCapped(
  res: Response,
  limit: number,
  gate: string,
  url: string,
): Promise<Uint8Array> {
  const declared = Number(res.headers.get('content-length') ?? '');
  if (Number.isFinite(declared) && declared > limit) {
    await res.body?.cancel();
    throw new SyncError(gate, `${url}: response too large (${declared} bytes, limit ${limit})`);
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = res.body?.getReader();
  if (reader !== undefined) {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        throw new SyncError(gate, `${url}: response too large (over ${limit} bytes)`);
      }
      chunks.push(value);
    }
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function readPage(res: Response, url: string): Promise<string> {
  const bytes = await readCapped(res, MAX_PAGE_BYTES, 'G6', url);
  return new TextDecoder().decode(bytes);
}

function acceptPage(status: number, body: string, url: string, stage: string): string {
  if (status !== 200) {
    throw new SyncError('G2', `${url}: ${stage} returned status ${status}. ${PLAN_B}`);
  }
  if (new TextEncoder().encode(body).byteLength < MIN_PAGE_BYTES) {
    throw new SyncError(
      'G6',
      `${url}: ${stage} body under ${MIN_PAGE_BYTES} bytes, not a real page`,
    );
  }
  if (!STORE.test(body)) {
    throw new SyncError('G2', `${url}: ${stage} has no beconfig-store_state. ${PLAN_B}`);
  }
  return body;
}

/**
 * GETs a public Behance page and returns its HTML once it carries `beconfig-store_state`.
 * A 403 JS challenge is replayed once with the challenge cookie; anything else fails loudly.
 */
export async function fetchStorePage(url: string, deps: FetchDeps): Promise<string> {
  assertAllowed(url, PAGE_HOSTS, 'G2');
  const first = await request(url, deps, 'G2', {
    headers: { 'user-agent': BEHANCE_UA },
    redirect: 'error',
  });
  const body = await readPage(first, url);
  if (first.status === 200) return acceptPage(first.status, body, url, 'page');

  const challenge = first.status === 403 ? CHALLENGE.exec(body)?.[1] : undefined;
  if (challenge === undefined) {
    throw new SyncError('G2', `${url}: unexpected status ${first.status}. ${PLAN_B}`);
  }

  await deps.sleep(CHALLENGE_DELAY_MS);
  // Same UA is mandatory: Behance rejects the replay when it differs from the challenged request.
  const replay = await request(url, deps, 'G2', {
    headers: { 'user-agent': BEHANCE_UA, cookie: `js_challenge_value=${challenge}` },
    redirect: 'error',
  });
  const replayBody = await readPage(replay, url);
  if (replay.status === 403 && CHALLENGE.test(replayBody)) {
    throw new SyncError(
      'G2',
      `${url}: challenge repeated after replay (status ${replay.status}). ${PLAN_B}`,
    );
  }
  return acceptPage(replay.status, replayBody, url, 'challenge replay');
}

/** Downloads a cover from the allowlisted CDN; the extension comes from the sniffed bytes. */
export async function fetchCover(
  url: string,
  deps: FetchDeps,
): Promise<{ bytes: Uint8Array; ext: ImageExt }> {
  assertAllowed(url, CDN_HOSTS, 'G4');
  const res = await request(url, deps, 'G4', {
    headers: { 'user-agent': BEHANCE_UA },
    redirect: 'error',
  });
  if (res.status !== 200) {
    await res.body?.cancel();
    throw new SyncError('G4', `${url}: status ${res.status}`);
  }
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('image/')) {
    await res.body?.cancel();
    throw new SyncError('G4', `${url}: content-type ${JSON.stringify(contentType)} is not image/*`);
  }
  const bytes = await readCapped(res, MAX_COVER_BYTES, 'G4', url);
  if (bytes.byteLength <= MIN_COVER_BYTES) {
    throw new SyncError('G4', `${url}: cover too small (${bytes.byteLength} bytes)`);
  }
  const ext = sniffImage(bytes);
  if (ext === null) throw new SyncError('G4', `${url}: not an image (unknown magic bytes)`);
  return { bytes, ext };
}

export type ModuleImageResult =
  { status: 'ok'; bytes: Uint8Array; ext: ImageExt } | { status: 'skip'; reason: string };

/**
 * Downloads one module image variant from the allowlisted CDN (gate G4m).
 * A 404 or a non-image content-type is a `skip` (Behance lists variants that do not exist,
 * RESEARCH Pitfall 2), so the caller can try the next candidate. Every other failure throws.
 */
export async function fetchModuleImage(url: string, deps: FetchDeps): Promise<ModuleImageResult> {
  assertAllowed(url, CDN_HOSTS, 'G4m');
  const res = await request(url, deps, 'G4m', {
    headers: { 'user-agent': BEHANCE_UA },
    redirect: 'error',
  });
  if (res.status === 404) {
    await res.body?.cancel();
    return { status: 'skip', reason: `${url}: status 404` };
  }
  if (res.status !== 200) {
    await res.body?.cancel();
    throw new SyncError('G4m', `${url}: status ${res.status}`);
  }
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('image/')) {
    await res.body?.cancel();
    return {
      status: 'skip',
      reason: `${url}: content-type ${JSON.stringify(contentType)} is not image/*`,
    };
  }
  const bytes = await readCapped(res, MAX_COVER_BYTES, 'G4m', url);
  if (bytes.byteLength <= MIN_COVER_BYTES) {
    throw new SyncError('G4m', `${url}: image too small (${bytes.byteLength} bytes)`);
  }
  const ext = sniffImage(bytes);
  if (ext === null) throw new SyncError('G4m', `${url}: not an image (unknown magic bytes)`);
  return { status: 'ok', bytes, ext };
}
