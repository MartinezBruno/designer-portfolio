// Bundle measurement: run after `pnpm build`. Prints the eager and lazy JS sizes (raw and gzip -9)
// for / and /es/, and fails when gsap (marker "GreenSock") or Lenis (marker "lenisVersion") is in an
// eagerly loaded chunk, or when a page's eager gzip total exceeds EAGER_CEILING_GZIP.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { checkEagerCeiling, collectEager, findEagerMarkers, parseEntryScripts } from './bundle.ts';

const CLIENT = 'dist/client';
const PAGES = [
  { route: '/', html: 'index.html' },
  { route: '/es/', html: 'es/index.html' },
];
const EAGER_MARKERS = [
  { name: 'gsap', marker: 'GreenSock' },
  { name: 'lenis', marker: 'lenisVersion' },
] as const;
// Phase 7 eager ceiling (gzip -9, per page). Proposed in 07-RESEARCH Open Question 1 / UI-SPEC.
// The user confirmed 22,000 B at the 07-10 checkpoint (2026-11-04) and chose to cut eager code
// (load deferrable chunks on demand) instead of raising it. Phase 6 baseline 14,643 B + ClientRouter
// 5,655 B.
const EAGER_CEILING_GZIP = 22_000;

interface FileSize {
  path: string;
  raw: number;
  gzip: number;
}

if (!existsSync(CLIENT)) {
  console.error('dist/client/ not found — run pnpm build first');
  process.exit(1);
}

const cache = new Map<string, Buffer>();
function read(sitePath: string): Buffer {
  const cached = cache.get(sitePath);
  if (cached !== undefined) return cached;
  const buffer = readFileSync(join(CLIENT, sitePath));
  cache.set(sitePath, buffer);
  return buffer;
}

function measure(sitePath: string): FileSize {
  const buffer = read(sitePath);
  return { path: sitePath, raw: buffer.length, gzip: gzipSync(buffer, { level: 9 }).length };
}

// Prints the group and returns its gzip -9 total.
function report(label: string, sizes: FileSize[]): number {
  const raw = sizes.reduce((sum, size) => sum + size.raw, 0);
  const gzip = sizes.reduce((sum, size) => sum + size.gzip, 0);
  console.log(`  ${label}: ${sizes.length} files, ${raw} B raw, ${gzip} B gzip -9`);
  for (const size of sizes) {
    console.log(
      `    ${size.path.padEnd(72)} ${String(size.raw).padStart(8)} B ${String(size.gzip).padStart(8)} B gz`,
    );
  }
  return gzip;
}

const problems: string[] = [];

for (const page of PAGES) {
  const htmlPath = join(CLIENT, page.html);
  if (!existsSync(htmlPath)) {
    problems.push(`page not built: ${htmlPath}`);
    continue;
  }
  const entries = parseEntryScripts(readFileSync(htmlPath, 'utf8'));
  const { eager, lazy } = collectEager(entries, (path) => read(path).toString('utf8'));

  console.log(`${page.route} (${entries.length} module entry scripts)`);
  const eagerGzip = report('eager', eager.map(measure));
  report('lazy', lazy.map(measure));
  console.log(`  eager ceiling: ${eagerGzip} / ${EAGER_CEILING_GZIP} B gzip -9`);

  const files = eager.map((path) => ({ path, text: read(path).toString('utf8') }));
  for (const problem of findEagerMarkers(files, EAGER_MARKERS)) {
    problems.push(`${page.route}: ${problem}`);
  }
  const ceilingProblem = checkEagerCeiling(page.route, eagerGzip, EAGER_CEILING_GZIP);
  if (ceilingProblem !== undefined) problems.push(ceilingProblem);
}

if (problems.length > 0) {
  console.error(`bundle check failed:\n${problems.join('\n')}`);
  process.exit(1);
}

console.log(
  `bundle check ok (no GreenSock or lenisVersion in eager chunks, eager gzip within ${EAGER_CEILING_GZIP} B per page)`,
);
