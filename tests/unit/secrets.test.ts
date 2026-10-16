import { describe, expect, it } from 'vitest';
import { isSecretPath, parseSecretValues } from '../../scripts/secrets.ts';

describe('isSecretPath', () => {
  it.each(['.env', '.env.local', 'config/.env.production', '.dev.vars', '.dev.vars.staging'])(
    'flags %s as a secret file',
    (path) => {
      expect(isSecretPath(path)).toBe(true);
    },
  );

  it.each(['.env.example', 'src/env.ts', 'dist/index.html'])('does not flag %s', (path) => {
    expect(isSecretPath(path)).toBe(false);
  });
});

describe('parseSecretValues', () => {
  it('strips quotes, drops short values, ignores comments and empty values', () => {
    expect(parseSecretValues('API_KEY="abcdefgh12"\nSHORT=abc\n# comment\nEMPTY=')).toEqual([
      'abcdefgh12',
    ]);
  });

  it('keeps everything after the first "=" and strips single quotes', () => {
    expect(parseSecretValues("TOKEN='abc=defgh123'")).toEqual(['abc=defgh123']);
  });

  it('returns nothing for blank input', () => {
    expect(parseSecretValues('\n\n')).toEqual([]);
  });
});
