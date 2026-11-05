// Bundle measurement: run after `pnpm build`. Measures every built HTML page under dist/client
// (Home, Projects, every project detail page in both locales, and 404; WR-04). Prints the eager and
// lazy JS sizes (raw and gzip -9), in detail for / and /es/ and as one line for every other page,
// and fails when gsap (marker "GreenSock") or Lenis (marker "lenisVersion") is in an eagerly loaded
// chunk on any page, or when any page's eager gzip total exceeds EAGER_CEILING_GZIP.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import {
  checkEagerCeiling,
  collectEager,
  findEagerMarkers,
  pagesFromHtmlFiles,
  parseEntryScripts,
} from './bundle.ts';

const CLIENT = 'dist/client';
// Routes that every healthy build produces: a build that lost them must not pass by measuring less.
const REQUIRED_ROUTES = ['/', '/es/', '/projects/', '/es/projects/'] as const;
// Pages that get the per-file report; every other page gets a one-line summary.
const DETAILED_ROUTES: ReadonlySet<string> = new Set(['/', '/es/']);
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

interface GroupTotal {
  files: number;
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

const sizeCache = new Map<string, FileSize>();
function measure(sitePath: string): FileSize {
  const cached = sizeCache.get(sitePath);
  if (cached !== undefined) return cached;
  const buffer = read(sitePath);
  const size = { path: sitePath, raw: buffer.length, gzip: gzipSync(buffer, { level: 9 }).length };
  sizeCache.set(sitePath, size);
  return size;
}

function total(sizes: readonly FileSize[]): GroupTotal {
  return {
    files: sizes.length,
    raw: sizes.reduce((sum, size) => sum + size.raw, 0),
    gzip: sizes.reduce((sum, size) => sum + size.gzip, 0),
  };
}

function printGroup(label: string, sizes: readonly FileSize[]): void {
  const sum = total(sizes);
  console.log(`  ${label}: ${sum.files} files, ${sum.raw} B raw, ${sum.gzip} B gzip -9`);
  for (const size of sizes) {
    console.log(
      `    ${size.path.padEnd(72)} ${String(size.raw).padStart(8)} B ${String(size.gzip).padStart(8)} B gz`,
    );
  }
}

const problems: string[] = [];
const pages = pagesFromHtmlFiles(readdirSync(CLIENT, { recursive: true, encoding: 'utf8' }));

if (pages.length === 0) problems.push(`no HTML pages found in ${CLIENT}`);
const builtRoutes = new Set(pages.map((page) => page.route));
for (const route of REQUIRED_ROUTES) {
  if (!builtRoutes.has(route)) problems.push(`required route missing: ${route}`);
}

const eagerByRoute: { route: string; gzip: number }[] = [];

for (const page of pages) {
  const entries = parseEntryScripts(readFileSync(join(CLIENT, page.html), 'utf8'));
  const { eager, lazy } = collectEager(entries, (path) => read(path).toString('utf8'));
  const eagerSizes = eager.map(measure);
  const lazySizes = lazy.map(measure);
  const eagerTotal = total(eagerSizes);
  eagerByRoute.push({ route: page.route, gzip: eagerTotal.gzip });

  if (DETAILED_ROUTES.has(page.route)) {
    console.log(`${page.route} (${entries.length} module entry scripts)`);
    printGroup('eager', eagerSizes);
    printGroup('lazy', lazySizes);
    console.log(`  eager ceiling: ${eagerTotal.gzip} / ${EAGER_CEILING_GZIP} B gzip -9`);
  } else {
    console.log(
      `${page.route}: eager ${eagerTotal.files} files, ${eagerTotal.gzip} B gzip -9 (lazy ${lazySizes.length} files)`,
    );
  }

  const files = eager.map((path) => ({ path, text: read(path).toString('utf8') }));
  for (const problem of findEagerMarkers(files, EAGER_MARKERS)) {
    problems.push(`${page.route}: ${problem}`);
  }
  const ceilingProblem = checkEagerCeiling(page.route, eagerTotal.gzip, EAGER_CEILING_GZIP);
  if (ceilingProblem !== undefined) problems.push(`${page.route}: ${ceilingProblem}`);
}

if (eagerByRoute.length > 0) {
  const sorted = [...eagerByRoute].sort(
    (a, b) => b.gzip - a.gzip || a.route.localeCompare(b.route),
  );
  const width = Math.max(...sorted.map((entry) => entry.route.length));
  console.log(`\neager JS per page (gzip -9, ceiling ${EAGER_CEILING_GZIP} B), largest first:`);
  for (const entry of sorted) {
    const flag = entry.gzip > EAGER_CEILING_GZIP ? '  OVER' : '';
    console.log(`  ${entry.route.padEnd(width)} ${String(entry.gzip).padStart(8)} B${flag}`);
  }
  const [largest] = sorted;
  if (largest !== undefined) {
    console.log(`  max: ${largest.gzip} B on ${largest.route} (${sorted.length} pages)`);
  }
}

if (problems.length > 0) {
  console.error(`bundle check failed:\n${problems.join('\n')}`);
  process.exit(1);
}

console.log(
  `bundle check ok (no GreenSock or lenisVersion in eager chunks, eager gzip within ${EAGER_CEILING_GZIP} B on every built page)`,
);
