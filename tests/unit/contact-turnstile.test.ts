import { describe, expect, it } from 'vitest';
import {
  isTurnstileTestSecret,
  verifyTurnstile,
  type TurnstileBinding,
} from '../../src/lib/contact/turnstile';

const BINDING: TurnstileBinding = { action: 'contact', hostnames: ['example.org'] };
const REAL_SECRET = '0x4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const TEST_SECRET = '1x0000000000000000000000000000000AA';

interface Recorded {
  url: string;
  init: RequestInit | undefined;
}

function fakeFetch(response: () => Response): {
  fetchFn: typeof globalThis.fetch;
  calls: Recorded[];
} {
  const calls: Recorded[] = [];
  const fn = async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return response();
  };
  return { fetchFn: fn as typeof globalThis.fetch, calls };
}

const json =
  (body: unknown, status = 200) =>
  () =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('verifyTurnstile', () => {
  it('throws when the secret is missing', async () => {
    const { fetchFn } = fakeFetch(json({ success: true }));
    await expect(verifyTurnstile(fetchFn, undefined, 'tok', null, BINDING)).rejects.toThrow(
      'TURNSTILE_SECRET_KEY is not set',
    );
  });

  it.each(['', null, undefined])('rejects a %j token without calling fetch', async (token) => {
    const { fetchFn, calls } = fakeFetch(json({ success: true }));
    expect(await verifyTurnstile(fetchFn, 'secret', token, null, BINDING)).toEqual({
      ok: false,
      codes: ['missing-input-response'],
    });
    expect(calls).toHaveLength(0);
  });

  it('returns ok on success with a test secret', async () => {
    const { fetchFn } = fakeFetch(json({ success: true }));
    expect(await verifyTurnstile(fetchFn, TEST_SECRET, 'tok', null, BINDING)).toEqual({
      ok: true,
    });
  });

  it('returns the error codes on failure', async () => {
    const { fetchFn } = fakeFetch(
      json({ success: false, 'error-codes': ['invalid-input-response'] }),
    );
    expect(await verifyTurnstile(fetchFn, 'secret', 'tok', null, BINDING)).toEqual({
      ok: false,
      codes: ['invalid-input-response'],
    });
  });

  it('maps an HTTP error to http-<status>', async () => {
    const { fetchFn } = fakeFetch(() => new Response('oops', { status: 500 }));
    expect(await verifyTurnstile(fetchFn, 'secret', 'tok', null, BINDING)).toEqual({
      ok: false,
      codes: ['http-500'],
    });
  });

  it('posts secret and response to the fixed siteverify URL with a signal', async () => {
    const { fetchFn, calls } = fakeFetch(json({ success: true }));
    await verifyTurnstile(fetchFn, 'secret', 'tok', null, BINDING);
    expect(calls).toHaveLength(1);
    const [call] = calls;
    expect(call?.url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    expect(call?.init?.method).toBe('POST');
    expect(call?.init?.signal).toBeInstanceOf(AbortSignal);
    const body = call?.init?.body;
    expect(body).toBeInstanceOf(URLSearchParams);
    const params = body as URLSearchParams;
    expect(params.get('secret')).toBe('secret');
    expect(params.get('response')).toBe('tok');
    expect(params.has('remoteip')).toBe(false);
  });

  it('adds remoteip only when an ip is known', async () => {
    const { fetchFn, calls } = fakeFetch(json({ success: true }));
    await verifyTurnstile(fetchFn, 'secret', 'tok', '203.0.113.7', BINDING);
    const params = calls[0]?.init?.body as URLSearchParams;
    expect(params.get('remoteip')).toBe('203.0.113.7');
  });

  it('binds a real-secret verdict to the action and hostname', async () => {
    const { fetchFn } = fakeFetch(
      json({ success: true, action: 'contact', hostname: 'example.org' }),
    );
    expect(await verifyTurnstile(fetchFn, REAL_SECRET, 'tok', null, BINDING)).toEqual({
      ok: true,
    });
  });

  it.each([
    [{ success: true, hostname: 'example.org' }, 'action-mismatch'],
    [{ success: true, action: 'login', hostname: 'example.org' }, 'action-mismatch'],
    [{ success: true, action: 'contact' }, 'hostname-mismatch'],
    [{ success: true, action: 'contact', hostname: 'evil.example' }, 'hostname-mismatch'],
  ])('rejects a real-secret verdict %j', async (body, code) => {
    const { fetchFn } = fakeFetch(json(body));
    expect(await verifyTurnstile(fetchFn, REAL_SECRET, 'tok', null, BINDING)).toEqual({
      ok: false,
      codes: [code],
    });
  });

  it('accepts the test-secret dummy verdict, which has no action and hostname example.com', async () => {
    // Shape returned by siteverify for the always-pass test secret (checked 2026-10-28).
    const { fetchFn } = fakeFetch(
      json({
        success: true,
        'error-codes': [],
        hostname: 'example.com',
        metadata: { result_with_testing_key: true },
      }),
    );
    expect(await verifyTurnstile(fetchFn, TEST_SECRET, 'tok', null, BINDING)).toEqual({ ok: true });
  });

  it('recognizes only the documented test secrets', () => {
    expect(isTurnstileTestSecret('1x0000000000000000000000000000000AA')).toBe(true);
    expect(isTurnstileTestSecret('2x0000000000000000000000000000000AA')).toBe(true);
    expect(isTurnstileTestSecret('3x0000000000000000000000000000000AA')).toBe(true);
    expect(isTurnstileTestSecret(REAL_SECRET)).toBe(false);
    expect(isTurnstileTestSecret('1x000000000000000000000000000000AA')).toBe(false);
  });
});
