// Pure helpers for the offline build gate (DATA-04). Erasable TypeScript only (Node type stripping runs it).

export const CDN_HOSTS = ['mir-s3-cdn-cf.behance.net', 'mir-cdn.behance.net'] as const;

const CDN_URL = /(?:https?:)?\/\/(?:mir-s3-cdn-cf|mir-cdn)\.behance\.net[^\s"'<>)]*/g;

/** Every Behance image CDN URL found in an HTML document, in document order. */
export function findCdnReferences(html: string): string[] {
  return html.match(CDN_URL) ?? [];
}

/** Recorded network attempts: one non-empty trimmed line per attempt. */
export function readAttempts(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '');
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
