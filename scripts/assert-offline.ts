// Offline build gate (DATA-04): run after the guarded `astro build`. Fails when the offline guard
// recorded any network attempt, when the guard log does not come from the build that produced
// dist/, or when any text file in dist/ (HTML, CSS, JS, JSON, XML, SVG...) references the Behance
// image CDNs, including URL-encoded and JSON-escaped references.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  DEFAULT_GUARD_LOG,
  TEXT_EXTENSIONS,
  findCdnReferences,
  readAttempts,
  staleGuardLog,
} from './offline.ts';

const DIST = 'dist';
const LOG = resolve(process.env['OFFLINE_GUARD_LOG'] ?? DEFAULT_GUARD_LOG);

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

const logText = readFileSync(LOG, 'utf8');
const attempts = readAttempts(logText);
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

const distFiles = walk(DIST);
const newestDistMs = Math.max(...distFiles.map((file) => statSync(file).mtimeMs));
const stale = staleGuardLog(logText, newestDistMs);
if (stale !== null) {
  console.error(`offline build failed: ${stale} — run pnpm build:offline`);
  process.exit(1);
}

const textFiles = distFiles.filter((file) =>
  TEXT_EXTENSIONS.some((extension) => file.toLowerCase().endsWith(extension)),
);
const htmlCount = textFiles.filter((file) => file.endsWith('.html')).length;
const problems = textFiles.flatMap((file) =>
  findCdnReferences(readFileSync(file, 'utf8')).map((url) => `${file}: ${url}`),
);

if (problems.length > 0) {
  console.error(`offline build failed: Behance CDN URLs in dist:\n${problems.join('\n')}`);
  process.exit(1);
}

console.log(
  `offline build ok (0 network attempts, ${textFiles.length} text files scanned, ${htmlCount} html)`,
);
