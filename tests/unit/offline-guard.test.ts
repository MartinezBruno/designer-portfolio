// Loads scripts/offline-guard.ts the way build:offline does (`node --import`) in a child process
// and checks that each network entry point is blocked and logged. Targets are `.invalid` names and
// TEST-NET addresses, so even a guard regression sends nothing that can resolve or reach a host.
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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
  log: string[];
}

async function probe(source: string): Promise<ProbeResult> {
  const log = join(dir, 'guard.log');
  const base = Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !name.startsWith('OFFLINE_GUARD')),
  );
  const result = spawnSync(
    process.execPath,
    ['--import=./scripts/offline-guard.ts', '--input-type=module', '-e', source],
    {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...base, OFFLINE_GUARD_LOG: log },
      timeout: 20000,
    },
  );
  const text = await readFile(log, 'utf8');
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    log: text.split('\n').filter((line) => line !== '' && !line.startsWith('#')),
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
