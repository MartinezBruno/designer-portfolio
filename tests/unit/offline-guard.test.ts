// Loads scripts/offline-guard.ts the way build:offline does (NODE_OPTIONS --import) in a child process
// and checks that each network entry point is blocked and logged. Targets are `.invalid` names and
// TEST-NET addresses, so even a guard regression sends nothing that can resolve or reach a host.
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readAttempts, readGuardRun } from '../../scripts/offline.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const REPO_TMP = join(ROOT, 'tmp');

let dir = '';

beforeEach(async () => {
  await mkdir(REPO_TMP, { recursive: true });
  dir = await mkdtemp(join(REPO_TMP, 'offline-guard-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

interface ProbeResult {
  status: number | null;
  stdout: string;
  stderr: string;
  /** Recorded attempts, without the `#` marker lines. */
  log: string[];
  /** The whole log file. */
  raw: string;
}

const GUARD_URL = new URL('../../scripts/offline-guard.ts', import.meta.url).href;

/**
 * Runs `source` as an ES module under the guard, preloaded through NODE_OPTIONS as build:offline
 * does, so Node child processes load it too. `log` is relative to `cwd` when not absolute.
 */
async function probe(
  source: string,
  options: { cwd?: string; log?: string; env?: Record<string, string> } = {},
): Promise<ProbeResult> {
  const cwd = options.cwd ?? ROOT;
  const log = options.log ?? join(dir, 'guard.log');
  const script = join(dir, 'probe.mjs');
  await writeFile(script, source);
  const base = Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !name.startsWith('OFFLINE_GUARD')),
  );
  const result = spawnSync(process.execPath, [script], {
    cwd,
    encoding: 'utf8',
    env: {
      ...base,
      NODE_OPTIONS: `--import=${GUARD_URL}`,
      OFFLINE_GUARD_LOG: log,
      ...options.env,
    },
    timeout: 20000,
  });
  const raw = await readFile(resolve(cwd, log), 'utf8');
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    log: readAttempts(raw),
    raw,
  };
}

describe('offline guard: DNS and UDP', () => {
  it('blocks and logs named dns imports, dns/promises, resolve* and Resolver classes', async () => {
    const result = await probe(`
      import dns, { lookup, resolve4 } from 'node:dns';
      import { lookup as lookupAsync, resolveAny } from 'node:dns/promises';
      const codes = [];
      const viaCallback = (call) => new Promise((done) => call((error) => { codes.push(error?.code); done(); }));
      const viaPromise = (promise) => promise.then(() => codes.push('resolved'), (error) => codes.push(error.code));
      await viaCallback((cb) => lookup('named-lookup.invalid', cb));
      await viaCallback((cb) => resolve4('named-resolve4.invalid', cb));
      await viaCallback((cb) => dns.resolveTxt('default-txt.invalid', cb));
      await viaCallback((cb) => new dns.Resolver().resolve6('resolver-6.invalid', cb));
      await viaPromise(lookupAsync('promises-lookup.invalid'));
      await viaPromise(resolveAny('promises-any.invalid'));
      await viaPromise(dns.promises.resolveSrv('promises-srv.invalid'));
      await viaPromise(new dns.promises.Resolver().resolveMx('promises-resolver.invalid'));
      console.log(JSON.stringify(codes));
    `);
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(Array.from({ length: 8 }, () => 'ENOTFOUND'));
    expect(result.log).toEqual([
      'dns lookup named-lookup.invalid',
      'dns resolve4 named-resolve4.invalid',
      'dns resolveTxt default-txt.invalid',
      'dns resolve6 resolver-6.invalid',
      'dns lookup promises-lookup.invalid',
      'dns resolveAny promises-any.invalid',
      'dns resolveSrv promises-srv.invalid',
      'dns resolveMx promises-resolver.invalid',
    ]);
  });

  it('blocks and logs dgram send and connect', async () => {
    const result = await probe(`
      import dgram from 'node:dgram';
      const socket = dgram.createSocket('udp4');
      const sent = await new Promise((done) => socket.send('x', 53, '192.0.2.1', (error) => done(error?.message)));
      const connected = await new Promise((done) => {
        socket.once('error', (error) => done(error.message));
        socket.connect(53, '192.0.2.2');
      });
      socket.close();
      console.log(JSON.stringify([sent, connected]));
    `);
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(['offline', 'offline']);
    expect(result.log).toEqual(['udp send 53 192.0.2.1', 'udp connect 53 192.0.2.2']);
  });
});

describe('offline guard: worker threads', () => {
  it('loads the guard in eval, file and custom-env workers and logs their attempts', async () => {
    const result = await probe(`
      import { writeFileSync } from 'node:fs';
      import { join, resolve } from 'node:path';
      import { Worker } from 'node:worker_threads';
      const body = (label) => \`
        import('node:worker_threads').then(({ parentPort }) =>
          fetch('https://\${label}.invalid/').then(
            () => parentPort.postMessage('resolved'),
            (error) => parentPort.postMessage(error.message),
          ),
        );
      \`;
      const file = join(process.env.OFFLINE_GUARD_LOG, '..', 'worker.cjs');
      writeFileSync(file, body('file-worker'));
      const run = (worker) => new Promise((done, fail) => {
        worker.once('message', done);
        worker.once('error', fail);
      });
      const messages = [
        await run(new Worker(body('eval-worker'), { eval: true })),
        await run(new Worker(file)),
        await run(new Worker(body('env-worker'), { eval: true, env: {} })),
      ];
      console.log(JSON.stringify(messages));
    `);
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(['offline', 'offline', 'offline']);
    expect(result.log).toEqual([
      'fetch https://eval-worker.invalid/',
      'fetch https://file-worker.invalid/',
      'fetch https://env-worker.invalid/',
    ]);
  });
});

describe('offline guard: log', () => {
  it('writes start and end markers for one run', async () => {
    const result = await probe(`await fetch('https://marker.invalid/').catch(() => {});`);
    expect(result.status).toBe(0);
    const run = readGuardRun(result.raw);
    expect(run).not.toBeNull();
    expect(run?.end).not.toBeNull();
    expect(result.raw.trim().split('\n')).toHaveLength(3);
    expect(result.log).toEqual(['fetch https://marker.invalid/']);
  });

  it('resolves a relative log path once, so a child in another cwd logs to the same file', async () => {
    const other = join(dir, 'elsewhere');
    await mkdir(other);
    const result = await probe(
      `
      import { spawnSync } from 'node:child_process';
      const child = spawnSync(process.execPath, ['-e', "fetch('https://child.invalid/').catch(() => {})"], {
        cwd: ${JSON.stringify(other)},
        encoding: 'utf8',
      });
      process.stdout.write(child.stderr);
    `,
      { cwd: dir, log: 'guard.log' },
    );
    expect(result.stdout).toBe('');
    expect(result.status).toBe(0);
    expect(result.log).toEqual(['fetch https://child.invalid/']);
    expect(readGuardRun(result.raw)?.end).not.toBeNull();
  });

  it('starts a fresh log when OFFLINE_GUARD_ACTIVE leaked from the shell', async () => {
    const log = join(dir, 'guard.log');
    await writeFile(log, 'fetch https://stale.invalid/\n');
    const result = await probe(`await fetch('https://fresh.invalid/').catch(() => {});`, {
      log,
      env: { OFFLINE_GUARD_ACTIVE: '1' },
    });
    expect(result.log).toEqual(['fetch https://fresh.invalid/']);
    expect(readGuardRun(result.raw)).not.toBeNull();
  });
});
