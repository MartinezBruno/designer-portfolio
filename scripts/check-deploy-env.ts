// Pre-deploy gate (docs/DEPLOY.md), run by `pnpm run deploy` before and after `astro build`.
// Default: refuses an unset or test PUBLIC_TURNSTILE_SITE_KEY and a placeholder site.url.
// --built: also scans dist/ for a Cloudflare test sitekey and requires the shell sitekey in it.
// Reads only the shell env on purpose: the sitekey must not live in .env or .dev.vars.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { site } from '../src/data/site.ts';
import { builtProblems, deployEnvProblems } from './deploy-env.ts';

const DIST_DIRS = ['dist/client', 'dist/server'];
const TEXT_EXTENSIONS = new Set(['.html', '.js', '.mjs', '.json']);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const built = process.argv.includes('--built');
const siteKey = process.env['PUBLIC_TURNSTILE_SITE_KEY'];
const problems = deployEnvProblems({ siteKey, siteUrl: site.url });

let scanned = 0;
if (built) {
  if (!existsSync('dist')) {
    problems.push('dist/ not found; run astro build first');
  } else {
    const files = DIST_DIRS.filter((dir) => existsSync(dir))
      .flatMap((dir) => walk(dir))
      .filter((path) => TEXT_EXTENSIONS.has(extname(path)))
      .map((path) => ({ path, content: readFileSync(path, 'utf8') }));
    scanned = files.length;
    problems.push(...builtProblems(files, siteKey ?? ''));
  }
}

if (problems.length > 0) {
  console.error(`deploy env check failed:\n${problems.join('\n')}`);
  process.exit(1);
}

console.log(`deploy env check ok${built ? ` (built output scanned: ${scanned} files)` : ''}`);
