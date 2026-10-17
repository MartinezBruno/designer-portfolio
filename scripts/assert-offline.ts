// Offline build gate (DATA-04): run after the guarded `astro build`. Fails when the offline guard
// recorded any network attempt, or when dist/ HTML references the Behance image CDNs.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { findCdnReferences, readAttempts } from './offline.ts';

const DIST = 'dist';
const LOG = process.env['OFFLINE_GUARD_LOG'] ?? 'tmp/offline-guard.log';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

if (!existsSync(LOG)) {
  console.error(`offline build failed: guard log ${LOG} not found — run pnpm build:offline`);
  process.exit(1);
}

const attempts = readAttempts(readFileSync(LOG, 'utf8'));
if (attempts.length > 0) {
  console.error(
    `offline build failed: ${attempts.length} network attempts:\n${attempts.join('\n')}`,
  );
  process.exit(1);
}

if (!existsSync(DIST)) {
  console.error('dist/ not found — run pnpm build:offline');
  process.exit(1);
}

const htmlFiles = walk(DIST).filter((file) => file.endsWith('.html'));
const problems = htmlFiles.flatMap((file) =>
  findCdnReferences(readFileSync(file, 'utf8')).map((url) => `${file}: ${url}`),
);

if (problems.length > 0) {
  console.error(`offline build failed: Behance CDN URLs in dist:\n${problems.join('\n')}`);
  process.exit(1);
}

console.log(`offline build ok (0 network attempts, ${htmlFiles.length} html files scanned)`);
