/**
 * Fail-closed guard for local-only contact config (WR-04). SERVER ONLY.
 * The console mailer and Cloudflare's Turnstile test keys are the local/e2e defaults. A deploy
 * that forgets its env would otherwise report "Message sent" while dropping every lead into
 * Worker logs, or let every bot through the always-pass test secret. Unless the environment opts
 * in with CONTACT_ALLOW_TEST_CONFIG=true (.dev.vars and the e2e preview env only), each of those
 * defaults is a config problem: the Action refuses the send, so the visitor gets the failure block
 * and its mailto instead of a false success.
 */
import { isTurnstileTestSecret } from './turnstile';

/** Cloudflare's documented test sitekeys (1x/2x/3x, 20 zeros, a two-letter suffix). */
const TEST_SITE_KEY = /^[123]x0{20}[A-F]{2}$/;

export function isTurnstileTestSiteKey(siteKey: string): boolean {
  return TEST_SITE_KEY.test(siteKey);
}

export interface ContactConfig {
  allowTestConfig: boolean;
  mailer: 'console' | 'resend' | 'cloudflare';
  turnstileSecret: string | undefined;
  siteKey: string;
}

/** Returns why this config must not send, or undefined when it may. Never includes secret values. */
export function contactConfigProblem(config: ContactConfig): string | undefined {
  const secret = config.turnstileSecret ?? '';
  const testSecret = isTurnstileTestSecret(secret);
  const testSiteKey = isTurnstileTestSiteKey(config.siteKey);
  if (!config.allowTestConfig) {
    if (config.mailer === 'console') {
      return 'MAILER=console outside local dev (set MAILER=cloudflare, or resend, for a deploy)';
    }
    if (testSecret) return 'TURNSTILE_SECRET_KEY is a Cloudflare test secret outside local dev';
    if (testSiteKey)
      return 'PUBLIC_TURNSTILE_SITE_KEY is a Cloudflare test sitekey outside local dev';
  }
  // A real secret never verifies tokens from a test sitekey: name the cause instead of a vague
  // siteverify failure.
  if (secret !== '' && !testSecret && testSiteKey) {
    return 'PUBLIC_TURNSTILE_SITE_KEY is a test sitekey but TURNSTILE_SECRET_KEY is real';
  }
  return undefined;
}
