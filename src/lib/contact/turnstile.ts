/**
 * Server-side Turnstile check (CONT-02, D-13).
 * Invariants:
 * - The siteverify host is fixed; nothing from the request picks the URL.
 * - Tokens are single-use and expire after 300 s (Cloudflare), so the client resets the widget
 *   after every attempt.
 * - A real secret binds the verdict to this widget (WR-03): `action` must equal the widget's
 *   action and `hostname` must be one of ours, so a token minted elsewhere under the same sitekey
 *   fails. Cloudflare's test secrets are exempt: their dummy verdict has no `action` and reports
 *   hostname example.com (verified against siteverify 2026-10-28), and they accept any token anyway.
 * - An empty token is rejected here without a network call.
 * `fetchFn` is injected so unit tests never touch the network.
 */
const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TIMEOUT_MS = 5000;

/** Cloudflare's documented test secrets (always pass, always fail, token already spent). */
const TEST_SECRET = /^[123]x0{31}AA$/;

export function isTurnstileTestSecret(secret: string): boolean {
  return TEST_SECRET.test(secret);
}

export type TurnstileResult = { ok: true } | { ok: false; codes: string[] };

/** What a real verdict must match: the widget `action` and the hostnames the site is served on. */
export interface TurnstileBinding {
  action: string;
  hostnames: readonly string[];
}

interface SiteverifyResponse {
  success: boolean;
  'error-codes'?: string[];
  action?: string;
  hostname?: string;
}

export async function verifyTurnstile(
  fetchFn: typeof fetch,
  secret: string | undefined,
  token: string | null | undefined,
  ip: string | null,
  binding: TurnstileBinding,
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
  if (json.success !== true) return { ok: false, codes: json['error-codes'] ?? [] };
  if (isTurnstileTestSecret(secret)) return { ok: true };
  if (json.action !== binding.action) return { ok: false, codes: ['action-mismatch'] };
  if (json.hostname === undefined || !binding.hostnames.includes(json.hostname)) {
    return { ok: false, codes: ['hostname-mismatch'] };
  }
  return { ok: true };
}
