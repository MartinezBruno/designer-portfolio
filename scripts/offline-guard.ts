// Offline build guard (DATA-04). Loaded with `node --import=./scripts/offline-guard.ts` (Node type
// stripping). Blocks fetch, TCP sockets and DNS lookups and records one line per attempt in the log
// that scripts/assert-offline.ts checks. IPC/pipe sockets stay allowed so Vite/esbuild keep working.
import dns from 'node:dns';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { dirname } from 'node:path';
import { isIpcConnect } from './offline.ts';
import type { ConnectTarget } from './offline.ts';

const log = process.env['OFFLINE_GUARD_LOG'] ?? 'tmp/offline-guard.log';
const ACTIVE = 'OFFLINE_GUARD_ACTIVE';

mkdirSync(dirname(log), { recursive: true });
// Child processes inherit NODE_OPTIONS and load this guard again: only the first one truncates.
if (process.env[ACTIVE] !== '1') {
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

type LookupCallback = (error: NodeJS.ErrnoException) => void;
type LookupRest = Array<number | dns.LookupOptions | LookupCallback>;

function offlineLookup(hostname: string, ...rest: LookupRest): void {
  note(`dns ${hostname}`);
  const callback = rest.findLast((arg): arg is LookupCallback => typeof arg === 'function');
  const error: NodeJS.ErrnoException = new Error(`getaddrinfo ENOTFOUND ${hostname}`);
  error.code = 'ENOTFOUND';
  error.syscall = 'getaddrinfo';
  if (callback !== undefined) process.nextTick(callback, error);
}

Object.assign(dns, { lookup: offlineLookup });
