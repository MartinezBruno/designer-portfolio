// Runs the CLI under plain Node (type stripping), not Vitest, so a missing `.ts` extension or a
// non-erasable construct anywhere in its module graph fails here (Pitfall 3). No case reaches
// runSync, so no network request is made.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

function run(args: string[], env: Record<string, string> = {}) {
  const base = Object.fromEntries(Object.entries(process.env).filter(([name]) => name !== 'CI'));
  return spawnSync(process.execPath, ['scripts/sync-behance.ts', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...base, ...env },
    timeout: 20000,
  });
}

describe('sync-behance CLI', () => {
  it('prints usage for --help and exits 0', () => {
    const result = run(['--help'], { CI: '1' });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('usage: pnpm sync:behance');
    expect(result.stdout).toContain('--allow-fewer');
  });

  it('refuses to run when CI is set', () => {
    const result = run([], { CI: '1' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('refusing to run in CI');
    expect(result.stderr).toContain('The previous snapshot was left untouched.');
  });

  it('rejects unknown flags with usage and exit 1', () => {
    const result = run(['--bogus']);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('unknown option --bogus');
    expect(result.stderr).toContain('usage: pnpm sync:behance');
  });
});
