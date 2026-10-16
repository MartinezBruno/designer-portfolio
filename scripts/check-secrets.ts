// Secrets gate: run after `astro build`. Fails when secret files are tracked in git,
// copied into dist/, or when values from local secret files appear in dist/.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { isSecretPath, parseSecretValues } from './secrets.ts';

const DIST = 'dist';
const LOCAL_SECRET_FILES = ['.env', '.dev.vars'];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

if (!existsSync(DIST)) {
  console.error('dist/ not found — run pnpm build first');
  process.exit(1);
}

const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .filter((file) => file !== '' && isSecretPath(file));

const distFiles = walk(DIST);
const leakedFiles = distFiles.filter((file) => isSecretPath(file));

const secretValues = LOCAL_SECRET_FILES.filter((file) => existsSync(file)).flatMap((file) =>
  parseSecretValues(readFileSync(file, 'utf8')),
);
const leakedValues =
  secretValues.length === 0
    ? []
    : distFiles.filter((file) => {
        const content = readFileSync(file, 'utf8');
        return secretValues.some((value) => content.includes(value));
      });

const problems = [
  ...tracked.map((file) => `tracked in git: ${file}`),
  ...leakedFiles.map((file) => `secret file in dist: ${file}`),
  ...leakedValues.map((file) => `secret value found in: ${file}`),
];

if (problems.length > 0) {
  console.error(`secrets check failed:\n${problems.join('\n')}`);
  process.exit(1);
}

console.log(`secrets check ok (${distFiles.length} dist files scanned)`);
