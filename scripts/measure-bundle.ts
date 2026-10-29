// Bundle measurement: run after `pnpm build`. Prints the eager and lazy JS sizes (raw and gzip -9)
// for / and /es/, and fails when gsap (marker string "GreenSock") is in an eagerly loaded chunk.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { collectEager, parseEntryScripts } from './bundle.ts';

const CLIENT = 'dist/client';
const PAGES = [
  { route: '/', html: 'index.html' },
  { route: '/es/', html: 'es/index.html' },
];
const GSAP_MARKER = 'GreenSock';

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

function report(label: string, sizes: FileSize[]): void {
  const raw = sizes.reduce((sum, size) => sum + size.raw, 0);
  const gzip = sizes.reduce((sum, size) => sum + size.gzip, 0);
  console.log(`  ${label}: ${sizes.length} files, ${raw} B raw, ${gzip} B gzip -9`);
  for (const size of sizes) {
    console.log(
      `    ${size.path.padEnd(72)} ${String(size.raw).padStart(8)} B ${String(size.gzip).padStart(8)} B gz`,
    );
  }
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
  report('eager', eager.map(measure));
  report('lazy', lazy.map(measure));

  for (const path of eager) {
    if (read(path).toString('utf8').includes(GSAP_MARKER)) {
      problems.push(`gsap loads eagerly on ${page.route}: ${path} contains "${GSAP_MARKER}"`);
    }
  }
}

if (problems.length > 0) {
  console.error(`bundle check failed:\n${problems.join('\n')}`);
  process.exit(1);
}

console.log('bundle check ok (no GreenSock in eager chunks)');
