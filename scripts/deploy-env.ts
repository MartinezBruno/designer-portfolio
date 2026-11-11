// Pure helpers for the pre-deploy env check (docs/DEPLOY.md). Erasable TypeScript only (Node type
// stripping runs it). Messages name variables and files, never the sitekey value.

// Mirrors TEST_SITE_KEY in src/lib/contact/deploy-guard.ts. That module imports './turnstile'
// without a .ts extension, so plain Node cannot load it; tests/unit/deploy-env.test.ts pins parity.
const TEST_SITE_KEY = /^[123]x0{20}[A-F]{2}$/;
// Unanchored variant for scanning built files.
const TEST_SITE_KEY_IN_TEXT = /\b[123]x0{20}[A-F]{2}\b/;
// Reserved TLDs (RFC 2606/6761) that can never be the served host.
const RESERVED_HOST = /(^|\.)(example|test|invalid|localhost)$/;
const RUNBOOK = 'docs/DEPLOY.md step 2';

export function isTestSiteKey(siteKey: string): boolean {
  return TEST_SITE_KEY.test(siteKey);
}

/** Why site.url cannot be deployed, or undefined. The URL is public, so it may be printed. */
export function siteUrlProblem(url: string): string | undefined {
  const fix = `set it to the workers.dev URL or the real domain, https and no trailing slash (${RUNBOOK})`;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return `site.url in src/data/site.ts is not a valid URL (${url}); ${fix}`;
  }
  if (RESERVED_HOST.test(parsed.hostname)) {
    return `site.url in src/data/site.ts is still a placeholder (${url}); ${fix}`;
  }
  if (parsed.protocol !== 'https:') {
    return `site.url in src/data/site.ts must use https (${url}); ${fix}`;
  }
  if (url !== parsed.origin) {
    return `site.url in src/data/site.ts must be a bare origin without path or trailing slash (${url}); ${fix}`;
  }
  return undefined;
}

export function deployEnvProblems(input: {
  siteKey: string | undefined;
  siteUrl: string;
}): string[] {
  const problems: string[] = [];
  if (input.siteKey === undefined || input.siteKey === '') {
    problems.push(
      'PUBLIC_TURNSTILE_SITE_KEY is not set; pass the real Turnstile sitekey in the shell: PUBLIC_TURNSTILE_SITE_KEY=... pnpm run deploy (docs/DEPLOY.md step 5)',
    );
  } else if (isTestSiteKey(input.siteKey)) {
    problems.push(
      'PUBLIC_TURNSTILE_SITE_KEY is a Cloudflare test sitekey; use the site key of the real Turnstile widget (docs/DEPLOY.md step 3)',
    );
  }
  const urlProblem = siteUrlProblem(input.siteUrl);
  if (urlProblem !== undefined) problems.push(urlProblem);
  return problems;
}

/** Scans built text files: no test sitekey anywhere, and the deploy sitekey present somewhere. */
export function builtProblems(
  files: readonly { path: string; content: string }[],
  siteKey: string,
): string[] {
  const problems = files
    .filter((file) => TEST_SITE_KEY_IN_TEXT.test(file.content))
    .map((file) => `Cloudflare test sitekey found in built file: ${file.path}`);
  if (siteKey === '' || !files.some((file) => file.content.includes(siteKey))) {
    problems.push(
      'PUBLIC_TURNSTILE_SITE_KEY from the shell was not found in dist/; the build did not pick it up (run the build in the same command, see docs/DEPLOY.md step 5)',
    );
  }
  return problems;
}
