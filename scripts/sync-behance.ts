// `pnpm sync:behance`: refresh src/data/behance/snapshot.json and src/assets/projects/ from the
// public Behance profile. Erasable TypeScript only (Node type stripping runs it).
//
// - Manual runs only (D-04): never in CI, never in the Worker, no prebuild hook. Refuses when CI
//   is set. The developer reviews and commits the resulting diff.
// - Reads public pages and the image CDN only, with no account access or credentials (D-03).
// - If Behance hardens its JS challenge, plan B is Playwright (.planning/research/STACK.md §1.3).
import { failureMessage, UNTOUCHED } from './behance/errors.ts';
import { runSync } from './behance/run-sync.ts';

const USAGE = [
  'usage: pnpm sync:behance [--allow-fewer]',
  '  --allow-fewer  accept fewer projects than the current snapshot (projects removed on Behance)',
  '  --help         print this help and exit',
].join('\n');

const args = process.argv.slice(2);

if (args.includes('--help')) {
  console.log(USAGE);
  process.exit(0);
}

const unknown = args.filter((arg) => arg !== '--allow-fewer');
if (unknown.length > 0) {
  console.error(`sync:behance: unknown option ${unknown.join(' ')}`);
  console.error(USAGE);
  process.exit(1);
}

if (process.env['CI'] !== undefined && process.env['CI'] !== '') {
  console.error(`sync:behance: refusing to run in CI (D-04: manual runs only). ${UNTOUCHED}`);
  process.exit(1);
}

const startedAt = new Date();

try {
  await runSync({
    fetch: globalThis.fetch,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    log: (line) => console.log(line),
    now: () => new Date(),
    allowFewer: args.includes('--allow-fewer'),
    profileUrl: 'https://www.behance.net/martifernand7',
    paths: {
      root: process.cwd(),
      snapshot: 'src/data/behance/snapshot.json',
      coversDir: 'src/assets/projects',
      overrides: 'src/data/project-overrides.json',
      stagingDir: `tmp/behance-sync/${startedAt.toISOString().replaceAll(':', '-')}`,
    },
  });
  console.log(
    'sync:behance: done. Review the diff (src/data/behance, src/assets/projects) and commit it.',
  );
} catch (error) {
  console.error(failureMessage(error instanceof Error ? error : String(error)));
  process.exit(1);
}
