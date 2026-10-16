// Pure helpers for the secrets gate. Erasable TypeScript only (Node type stripping runs it).

const SECRET_FILE = /(^|\/)(\.env(\..+)?|\.dev\.vars(\..+)?)$/;
const ALLOWED = /(^|\/)\.env\.example$/;
const MIN_SECRET_LENGTH = 8;

export function isSecretPath(path: string): boolean {
  const normalized = path.replaceAll('\\', '/');
  return SECRET_FILE.test(normalized) && !ALLOWED.test(normalized);
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
