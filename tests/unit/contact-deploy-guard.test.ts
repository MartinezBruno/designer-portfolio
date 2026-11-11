import { describe, expect, it } from 'vitest';
import {
  contactConfigProblem,
  isTurnstileTestSiteKey,
  type ContactConfig,
} from '../../src/lib/contact/deploy-guard';

const TEST_SECRET = '1x0000000000000000000000000000000AA';
const TEST_SITE_KEY = '1x00000000000000000000AA';
const REAL_SECRET = '0x4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const REAL_SITE_KEY = '0x4AAAAAAAAAAAAAAAAAAAAA';

const production: ContactConfig = {
  allowTestConfig: false,
  mailer: 'resend',
  turnstileSecret: REAL_SECRET,
  siteKey: REAL_SITE_KEY,
};

// What .dev.vars and scripts/e2e-preview-env.ts provide.
const local: ContactConfig = {
  allowTestConfig: true,
  mailer: 'console',
  turnstileSecret: TEST_SECRET,
  siteKey: TEST_SITE_KEY,
};

describe('contactConfigProblem', () => {
  it('allows a fully real production config', () => {
    expect(contactConfigProblem(production)).toBeUndefined();
  });

  it('allows the local and e2e config when the environment opts in', () => {
    expect(contactConfigProblem(local)).toBeUndefined();
  });

  it('refuses the console mailer outside local dev (the unset-env default)', () => {
    expect(contactConfigProblem({ ...production, mailer: 'console' })).toMatch(/MAILER=console/);
    // Every default at once: still refused, mailer first.
    expect(contactConfigProblem({ ...local, allowTestConfig: false })).toMatch(/MAILER=console/);
  });

  it('allows the cloudflare mailer with a real secret and sitekey', () => {
    expect(contactConfigProblem({ ...production, mailer: 'cloudflare' })).toBeUndefined();
  });

  it('names MAILER=cloudflare as the deploy value when refusing console', () => {
    expect(contactConfigProblem({ ...production, mailer: 'console' })).toMatch(
      /set MAILER=cloudflare/,
    );
  });

  it('refuses a Cloudflare test secret outside local dev', () => {
    expect(
      contactConfigProblem({ ...production, turnstileSecret: TEST_SECRET, siteKey: TEST_SITE_KEY }),
    ).toMatch(/test secret/);
  });

  it('refuses a test sitekey outside local dev', () => {
    expect(contactConfigProblem({ ...production, siteKey: TEST_SITE_KEY })).toMatch(/test sitekey/);
  });

  it('names a real secret paired with a test sitekey even when test config is allowed', () => {
    expect(
      contactConfigProblem({ ...local, turnstileSecret: REAL_SECRET, mailer: 'resend' }),
    ).toMatch(/test sitekey but TURNSTILE_SECRET_KEY is real/);
  });

  it('never echoes the secret in the message', () => {
    const problem = contactConfigProblem({ ...production, siteKey: TEST_SITE_KEY }) ?? '';
    expect(problem).not.toContain(REAL_SECRET);
  });
});

describe('isTurnstileTestSiteKey', () => {
  it.each([
    '1x00000000000000000000AA',
    '2x00000000000000000000AB',
    '1x00000000000000000000BB',
    '2x00000000000000000000BB',
    '3x00000000000000000000FF',
  ])('recognizes %s', (key) => {
    expect(isTurnstileTestSiteKey(key)).toBe(true);
  });

  it('rejects real-looking keys', () => {
    expect(isTurnstileTestSiteKey(REAL_SITE_KEY)).toBe(false);
    expect(isTurnstileTestSiteKey('1x0000000000000000000AA')).toBe(false);
  });
});
