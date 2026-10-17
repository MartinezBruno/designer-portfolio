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

export type ConnectTarget = string | number | { path?: string; port?: number; host?: string };

/** True for IPC/pipe connections (a socket path), which the offline guard must let through. */
export function isIpcConnect(first: ConnectTarget): boolean {
  if (typeof first === 'string') return true;
  if (typeof first === 'number') return false;
  return typeof first.path === 'string' && first.path !== '';
}
