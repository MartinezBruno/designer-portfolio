/**
 * Server-side Turnstile check (CONT-02, D-13).
 * Invariants:
 * - The siteverify host is fixed; nothing from the request picks the URL.
 * - Tokens are single-use and expire after 300 s (Cloudflare), so the client resets the widget
 *   after every attempt.
 * - Never assert on `hostname`: with the test keys siteverify reports example.com.
 * - An empty token is rejected here without a network call.
 * `fetchFn` is injected so unit tests never touch the network.
 */
const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TIMEOUT_MS = 5000;

export type TurnstileResult = { ok: true } | { ok: false; codes: string[] };

interface SiteverifyResponse {
  success: boolean;
  'error-codes'?: string[];
}

export async function verifyTurnstile(
  fetchFn: typeof fetch,
  secret: string | undefined,
  token: string | null | undefined,
  ip: string | null,
): Promise<TurnstileResult> {
  if (!secret) throw new Error('TURNSTILE_SECRET_KEY is not set');
  if (!token) return { ok: false, codes: ['missing-input-response'] };

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set('remoteip', ip);

  const res = await fetchFn(SITEVERIFY_URL, {
    method: 'POST',
    body,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) return { ok: false, codes: [`http-${res.status}`] };

  const json = (await res.json()) as SiteverifyResponse;
  return json.success === true ? { ok: true } : { ok: false, codes: json['error-codes'] ?? [] };
}
