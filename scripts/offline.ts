// Pure helpers for the offline build gate (DATA-04). Erasable TypeScript only (Node type stripping runs it).

export const CDN_HOSTS = ['mir-s3-cdn-cf.behance.net', 'mir-cdn.behance.net'] as const;

// The host names themselves, with an optional scheme and `//` in front: a reference without a
// literal `//` (protocol-relative after escaping, or a bare host in a srcset) still counts.
const CDN_URL = /(?:(?:https?:)?\/\/)?(?:mir-s3-cdn-cf|mir-cdn)\.behance\.net[^\s"'<>)\\&]*/gi;

/** dist/ files the gate scans as text: everything a browser or crawler may read a URL from. */
export const TEXT_EXTENSIONS: readonly string[] = [
  '.html',
  '.css',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.webmanifest',
  '.xml',
  '.svg',
  '.txt',
  '.map',
];

/** Decodes %XX escapes one by one, so a malformed sequence never throws (decodeURIComponent does). */
function percentDecoded(text: string): string {
  return text.replace(/%([0-9a-f]{2})/gi, (_match, hex: string) =>
    String.fromCharCode(Number.parseInt(hex, 16)),
  );
}

/**
 * Every Behance image CDN reference found in a text file (HTML, CSS, JS, JSON, XML...), raw first,
 * then the ones only visible once `\/` (JSON) and `%2F` (URL-encoded, as in `/_image?href=`)
 * escapes are undone. Each distinct reference is listed once.
 */
export function findCdnReferences(text: string): string[] {
  const unescape = (value: string): string => percentDecoded(value.replaceAll('\\/', '/'));
  const found = new Set<string>();
  for (const variant of [text, unescape(text)]) {
    for (const match of variant.match(CDN_URL) ?? []) found.add(unescape(match));
  }
  // A raw match cut short by an escape (`mir-cdn.behance.net` out of `\/\/mir-cdn.behance.net\/a`)
  // is part of the unescaped one: keep the longest form only.
  const all = [...found];
  return all.filter((match) => !all.some((other) => other !== match && other.includes(match)));
}

/** Recorded network attempts: one non-empty trimmed line per attempt; `#` marker lines skipped. */
export function readAttempts(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'));
}

/** Default guard log, resolved against the cwd by the guard and the gate. */
export const DEFAULT_GUARD_LOG = 'tmp/offline-guard.log';

const MARKER = '# offline-guard';

/** Marker line the root guard writes when it starts (truncating the log) and when it exits. */
export function guardMarker(kind: 'start' | 'end', runId: string, at: Date): string {
  return `${MARKER} ${kind} ${runId} ${at.toISOString()}`;
}

export interface GuardRun {
  runId: string;
  start: Date;
  end: Date | null;
}

function parseMarker(line: string): { kind: string; runId: string; at: Date } | null {
  const match = /^# offline-guard (start|end) (\S+) (\S+)$/.exec(line.trim());
  if (match?.[1] === undefined || match[2] === undefined || match[3] === undefined) return null;
  const at = new Date(match[3]);
  return Number.isNaN(at.getTime()) ? null : { kind: match[1], runId: match[2], at };
}

/** The run recorded in a guard log: its first line must be a start marker. */
export function readGuardRun(text: string): GuardRun | null {
  const lines = text.split(/\r?\n/);
  const start = parseMarker(lines[0] ?? '');
  if (start?.kind !== 'start') return null;
  const end = lines
    .map(parseMarker)
    .findLast((marker) => marker?.kind === 'end' && marker.runId === start.runId);
  return { runId: start.runId, start: start.at, end: end?.at ?? null };
}

/** mtime granularity and clock slack allowed between the guard markers and dist/ files. */
const SLACK_MS = 2000;

/**
 * Why a guard log does not prove that dist/ came from a guarded build, or null when it does: the
 * log needs a start and end marker, and dist/'s newest file must fall between them.
 */
export function staleGuardLog(text: string, newestDistMs: number): string | null {
  const run = readGuardRun(text);
  if (run === null) {
    return 'the guard log has no start marker, so the offline guard did not run (check NODE_OPTIONS, and unset OFFLINE_GUARD_ACTIVE)';
  }
  if (run.end === null) {
    return `the guarded build ${run.runId} did not finish (no end marker)`;
  }
  const from = run.start.getTime() - SLACK_MS;
  const to = run.end.getTime() + SLACK_MS;
  if (newestDistMs < from || newestDistMs > to) {
    return `dist/ (newest file ${new Date(newestDistMs).toISOString()}) was not produced by the guarded build ${run.runId} (${run.start.toISOString()} to ${run.end.toISOString()})`;
  }
  return null;
}

type ConnectOptions = {
  path?: string | undefined;
  port?: number | undefined;
  host?: string | undefined;
};

/**
 * First argument of `net.Socket.prototype.connect`. Node's own `net.connect()` passes a normalized
 * `[options, listener]` array, so a list is unwrapped to its first element.
 */
export type ConnectTarget = string | number | ConnectOptions | readonly ConnectTarget[];

function isList(first: ConnectTarget): first is readonly ConnectTarget[] {
  return Array.isArray(first);
}

/** True for IPC/pipe connections (a socket path), which the offline guard must let through. */
export function isIpcConnect(first: ConnectTarget): boolean {
  if (isList(first)) {
    const inner = first[0];
    return inner !== undefined && isIpcConnect(inner);
  }
  if (typeof first === 'string') return true;
  if (typeof first === 'number') return false;
  return typeof first.path === 'string' && first.path !== '';
}
