import { describe, expect, it } from 'vitest';
import {
  isClientSecretPath,
  isPluginPreviewCopy,
  isSecretPath,
  parseSecretValues,
} from '../../scripts/secrets.ts';

describe('isPluginPreviewCopy', () => {
  it.each(['dist/server/.dev.vars', 'dist\\server\\.dev.vars'])(
    'recognizes %s as the Cloudflare plugin preview copy',
    (path) => {
      expect(isPluginPreviewCopy(path)).toBe(true);
    },
  );

  it.each([
    'dist/client/.dev.vars',
    'dist/.dev.vars',
    'dist/server/.env',
    'dist/server/nested/.dev.vars',
    '.dev.vars',
  ])('does not treat %s as the preview copy', (path) => {
    expect(isPluginPreviewCopy(path)).toBe(false);
  });
});

describe('isClientSecretPath', () => {
  it.each(['dist/client/.dev.vars', 'dist/client/x/.env.local', 'dist\\client\\.env'])(
    'flags %s as a secret file in static assets',
    (path) => {
      expect(isClientSecretPath(path)).toBe(true);
    },
  );

  it.each(['dist/client/.env.example', 'dist/server/.dev.vars', 'dist/client/index.html'])(
    'does not flag %s',
    (path) => {
      expect(isClientSecretPath(path)).toBe(false);
    },
  );
});

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
