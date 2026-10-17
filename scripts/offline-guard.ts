// Offline build guard (DATA-04). Loaded with `node --import=./scripts/offline-guard.ts` (Node type
// stripping). Blocks fetch, TCP sockets, DNS (lookup and resolve*, callback and promises APIs) and
// UDP, and records one line per attempt in the log that scripts/assert-offline.ts checks.
// IPC/pipe sockets stay allowed so Vite/esbuild keep working.
//
// Coverage: the main thread, child processes (they inherit NODE_OPTIONS) and worker_threads
// workers (each Worker is started with `--require` of this file, see below). Not covered: native
// addons doing their own I/O, and subprocesses that are not Node (for example a shell `curl`).
import dgram from 'node:dgram';
import dns from 'node:dns';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import net from 'node:net';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import workerThreads from 'node:worker_threads';
import { isIpcConnect } from './offline.ts';
import type { ConnectTarget } from './offline.ts';

const log = process.env['OFFLINE_GUARD_LOG'] ?? 'tmp/offline-guard.log';
const ACTIVE = 'OFFLINE_GUARD_ACTIVE';

mkdirSync(dirname(log), { recursive: true });
// Child processes inherit NODE_OPTIONS and load this guard again: only the first one truncates.
// Workers share the log and never truncate it.
if (workerThreads.isMainThread && process.env[ACTIVE] !== '1') {
  writeFileSync(log, '');
  process.env[ACTIVE] = '1';
}

function note(what: string): void {
  appendFileSync(log, `${what}\n`);
}

function describeTarget(first: ConnectTarget, second: ConnectTarget | undefined): string {
  if (Array.isArray(first)) {
    const inner: ConnectTarget | undefined = first[0];
    return inner === undefined ? 'unknown target' : describeTarget(inner, undefined);
  }
  if (typeof first === 'number') {
    return `${typeof second === 'string' ? second : 'localhost'}:${first}`;
  }
  if (typeof first === 'object' && 'port' in first) {
    return `${first.host ?? 'localhost'}:${String(first.port)}`;
  }
  return String(first);
}

globalThis.fetch = async (input: Parameters<typeof fetch>[0]): ReturnType<typeof fetch> => {
  const url = input instanceof Request ? input.url : String(input);
  note(`fetch ${url}`);
  throw new TypeError('offline');
};

type ConnectRest = Array<string | (() => void) | undefined>;
const originalConnect = net.Socket.prototype.connect;

net.Socket.prototype.connect = function connect(
  this: net.Socket,
  first: ConnectTarget,
  ...rest: ConnectRest
): net.Socket {
  if (isIpcConnect(first)) {
    return Reflect.apply(originalConnect, this, [first, ...rest]) as net.Socket;
  }
  const second = rest[0];
  note(`connect ${describeTarget(first, typeof second === 'string' ? second : undefined)}`);
  this.destroy(new Error('offline'));
  return this;
};

// DNS: every name-resolution entry point of the callback API, the promises API (`dns.promises` is
// the same object as `node:dns/promises`) and both Resolver classes. `dns.resolve*` uses c-ares
// over UDP and never reaches net.Socket, so patching `lookup` alone is not enough.
type ErrorCallback = (error: NodeJS.ErrnoException) => void;
type GuardArg = string | number | object | ErrorCallback | undefined;

const DNS_METHOD = /^(lookup|lookupService|resolve\w*|reverse)$/;

function dnsError(method: string, host: GuardArg): NodeJS.ErrnoException {
  const syscall = method === 'lookup' ? 'getaddrinfo' : method;
  const error: NodeJS.ErrnoException = new Error(`${syscall} ENOTFOUND ${String(host)}`);
  error.code = 'ENOTFOUND';
  error.syscall = syscall;
  return error;
}

function isCallback(arg: GuardArg): arg is ErrorCallback {
  return typeof arg === 'function';
}

function blockCallbackDns(target: object): void {
  for (const name of Object.getOwnPropertyNames(target).filter((key) => DNS_METHOD.test(key))) {
    Object.assign(target, {
      [name]: function offlineDns(host: GuardArg, ...rest: GuardArg[]): void {
        note(`dns ${name} ${String(host)}`);
        const callback = rest.findLast(isCallback);
        if (callback !== undefined) process.nextTick(callback, dnsError(name, host));
      },
    });
  }
}

function blockPromiseDns(target: object): void {
  for (const name of Object.getOwnPropertyNames(target).filter((key) => DNS_METHOD.test(key))) {
    Object.assign(target, {
      [name]: async function offlineDns(host: GuardArg): Promise<never> {
        note(`dns ${name} ${String(host)}`);
        throw dnsError(name, host);
      },
    });
  }
}

blockCallbackDns(dns);
blockCallbackDns(dns.Resolver.prototype);
blockPromiseDns(dns.promises);
blockPromiseDns(dns.promises.Resolver.prototype);

// UDP: every datagram that would leave the process (dgram send and connect).
function blockDgram(name: 'send' | 'connect'): void {
  Object.assign(dgram.Socket.prototype, {
    [name]: function offlineDgram(this: dgram.Socket, ...args: GuardArg[]): void {
      const target = args
        .slice(name === 'send' ? 1 : 0)
        .filter((arg) => typeof arg === 'string' || typeof arg === 'number');
      note(`udp ${name} ${target.join(' ') || 'unknown target'}`);
      const error = new Error('offline');
      // send(..., callback) reports errors to its callback; connect's callback is a success-only
      // 'connect' listener, so connect always reports through the 'error' event.
      const callback = name === 'send' ? args.findLast(isCallback) : undefined;
      process.nextTick(() => {
        if (callback === undefined) this.emit('error', error);
        else callback(error);
      });
    },
  });
}

blockDgram('send');
blockDgram('connect');

// Workers: `--import` preloads do not run in worker_threads, so every Worker loads this guard
// through `--require` (Node loads this ESM file with require(esm); it has no top-level await).
// A custom `env` object gets the log path and the active flag so the worker writes to this log.
const GUARD = fileURLToPath(import.meta.url);
const OriginalWorker = workerThreads.Worker;

class GuardedWorker extends OriginalWorker {
  constructor(filename: string | URL, options: workerThreads.WorkerOptions = {}) {
    // A nested worker inherits `--require GUARD` twice; the module cache loads it once.
    const execArgv = ['--require', GUARD, ...(options.execArgv ?? process.execArgv)];
    const env =
      typeof options.env === 'object' && options.env !== null
        ? { ...options.env, OFFLINE_GUARD_LOG: log, [ACTIVE]: '1' }
        : options.env;
    super(filename, { ...options, execArgv, ...(env === undefined ? {} : { env }) });
  }
}

Object.assign(workerThreads, { Worker: GuardedWorker });

// ESM named imports of builtins (`import { lookup } from 'node:dns'`) are separate bindings that
// only pick up the patches above after this call.
syncBuiltinESMExports();
