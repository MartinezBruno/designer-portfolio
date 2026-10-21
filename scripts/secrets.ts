// Pure helpers for the secrets gate. Erasable TypeScript only (Node type stripping runs it).

const SECRET_FILE = /(^|\/)(\.env(\..+)?|\.dev\.vars(\..+)?)$/;
const ALLOWED = /(^|\/)\.env\.example$/;
const MIN_SECRET_LENGTH = 8;

export function isSecretPath(path: string): boolean {
  const normalized = normalize(path);
  return SECRET_FILE.test(normalized) && !ALLOWED.test(normalized);
}

// The Cloudflare Vite plugin copies the local .dev.vars to dist/server/.dev.vars so `astro preview`
// can read secrets (05-RESEARCH Pitfall 2). That exact file is outside the static assets (and listed
// in dist/client/.assetsignore), so the gate tolerates it and nothing else.
const PLUGIN_PREVIEW_COPY = 'dist/server/.dev.vars';
const CLIENT_DIR = 'dist/client/';

function normalize(path: string): string {
  return path.replaceAll('\\', '/');
}

export function isPluginPreviewCopy(path: string): boolean {
  return normalize(path) === PLUGIN_PREVIEW_COPY;
}

// A secret file under dist/client/ would be served publicly as a static asset (Pitfall 2).
export function isClientSecretPath(path: string): boolean {
  return normalize(path).startsWith(CLIENT_DIR) && isSecretPath(path);
}

function stripQuotes(value: string): string {
  const first = value.at(0);
  if (value.length >= 2 && (first === '"' || first === "'") && value.at(-1) === first) {
    return value.slice(1, -1);
  }
  return value;
}

export function parseSecretValues(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
    .map((line) => {
      const separator = line.indexOf('=');
      return separator === -1 ? '' : stripQuotes(line.slice(separator + 1).trim());
    })
    .filter((value) => value.length >= MIN_SECRET_LENGTH);
}
