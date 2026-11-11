// Pre-deploy env rules (quick-261110-v6r). The CLI cases run under plain Node (type stripping),
// like sync-cli.test.ts, with an env built from scratch so the developer's shell cannot leak in.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  builtProblems,
  deployEnvProblems,
  isTestSiteKey,
  siteUrlProblem,
} from '../../scripts/deploy-env.ts';
import { isTurnstileTestSiteKey } from '../../src/lib/contact/deploy-guard';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const REAL_KEY = '0x4AAAAAAAAAAAAAAAAAAAAA';
const TEST_KEYS = [
  '1x00000000000000000000AA',
  '2x00000000000000000000AB',
  '3x00000000000000000000FF',
];
const NOT_TEST_KEYS = [REAL_KEY, '', 'key=1x00000000000000000000AA;'];

describe('isTestSiteKey', () => {
  it.each(TEST_KEYS)('flags the Cloudflare test sitekey %s', (key) => {
    expect(isTestSiteKey(key)).toBe(true);
  });

  it.each(NOT_TEST_KEYS)('accepts %j as not a test sitekey', (key) => {
    expect(isTestSiteKey(key)).toBe(false);
  });

  it.each([...TEST_KEYS, ...NOT_TEST_KEYS])('agrees with the runtime deploy guard on %j', (key) => {
    expect(isTestSiteKey(key)).toBe(isTurnstileTestSiteKey(key));
  });
});

describe('siteUrlProblem', () => {
  it.each(['https://designer-portfolio.someone.workers.dev', 'https://martinafernandez.com'])(
    'accepts %s',
    (url) => {
      expect(siteUrlProblem(url)).toBeUndefined();
    },
  );

  it.each([
    'https://martinafernandez.example',
    'https://foo.test',
    'https://foo.invalid',
    'https://foo.localhost',
    'https://localhost',
    'http://martinafernandez.com',
    'https://martinafernandez.com/es',
    'https://martinafernandez.com/',
    'not a url',
  ])('rejects %s naming site.url', (url) => {
    const problem = siteUrlProblem(url);
    expect(problem).toBeDefined();
    expect(problem).toContain('site.url');
    expect(problem).toContain('src/data/site.ts');
  });
});

describe('deployEnvProblems', () => {
  const siteUrl = 'https://designer-portfolio.someone.workers.dev';

  it.each([undefined, ''])('reports an unset sitekey (%j)', (siteKey) => {
    const problems = deployEnvProblems({ siteKey, siteUrl });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('PUBLIC_TURNSTILE_SITE_KEY is not set');
  });

  it('reports a test sitekey without echoing it', () => {
    const key = '1x00000000000000000000AA';
    const problems = deployEnvProblems({ siteKey: key, siteUrl });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('PUBLIC_TURNSTILE_SITE_KEY is a Cloudflare test sitekey');
    expect(problems.join('\n')).not.toContain(key);
  });

  it('adds the site.url problem', () => {
    const problems = deployEnvProblems({
      siteKey: REAL_KEY,
      siteUrl: 'https://martinafernandez.example',
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('site.url');
    expect(problems.join('\n')).not.toContain(REAL_KEY);
  });

  it('accepts a valid pair', () => {
    expect(deployEnvProblems({ siteKey: REAL_KEY, siteUrl })).toEqual([]);
  });
});

describe('builtProblems', () => {
  const clean = [
    { path: 'dist/client/_astro/contact.js', content: `const k="${REAL_KEY}";` },
    { path: 'dist/client/index.html', content: '<html></html>' },
  ];

  it('accepts a clean build that contains the key', () => {
    expect(builtProblems(clean, REAL_KEY)).toEqual([]);
  });

  it('names the file holding a test sitekey', () => {
    const files = [
      ...clean,
      { path: 'dist/client/_astro/old.js', content: 'sitekey:"1x00000000000000000000AA"' },
    ];
    const problems = builtProblems(files, REAL_KEY);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('dist/client/_astro/old.js');
    expect(problems[0]).not.toContain('1x00000000000000000000AA');
  });

  it('ignores the env schema default Astro embeds in the server bundle', () => {
    const files = [
      ...clean,
      {
        path: 'dist/server/chunks/entrypoint.mjs',
        content: '"PUBLIC_TURNSTILE_SITE_KEY": {\n\t"default": "1x00000000000000000000AA",\n}',
      },
    ];
    expect(builtProblems(files, REAL_KEY)).toEqual([]);
  });

  it('still flags a test sitekey next to the schema default', () => {
    const files = [
      ...clean,
      {
        path: 'dist/server/chunks/entrypoint.mjs',
        content: '"default": "1x00000000000000000000AA"; const k = "2x00000000000000000000AB";',
      },
    ];
    expect(builtProblems(files, REAL_KEY)).toHaveLength(1);
  });

  it('reports a build that does not contain the key', () => {
    const problems = builtProblems(clean.slice(1), REAL_KEY);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('PUBLIC_TURNSTILE_SITE_KEY');
    expect(problems[0]).not.toContain(REAL_KEY);
  });
});

function runCli(vars: Record<string, string>) {
  return spawnSync(process.execPath, ['scripts/check-deploy-env.ts'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { PATH: process.env['PATH'] ?? '', ...vars },
    timeout: 20000,
  });
}

describe('check-deploy-env CLI', () => {
  it('fails naming PUBLIC_TURNSTILE_SITE_KEY when it is unset', () => {
    const result = runCli({});
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('PUBLIC_TURNSTILE_SITE_KEY');
  });

  it('fails on a test sitekey without printing it', () => {
    const key = '1x00000000000000000000AA';
    const result = runCli({ PUBLIC_TURNSTILE_SITE_KEY: key });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Cloudflare test sitekey');
    expect(result.stdout + result.stderr).not.toContain(key);
  });

  it('fails on the committed placeholder site.url with a real-format key', () => {
    const result = runCli({ PUBLIC_TURNSTILE_SITE_KEY: REAL_KEY });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('site.url');
    expect(result.stdout + result.stderr).not.toContain(REAL_KEY);
  });
});
