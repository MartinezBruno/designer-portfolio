import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import globals from 'globals';

export default defineConfig(
  globalIgnores([
    'dist/',
    '.astro/',
    'node_modules/',
    'test-results/',
    'playwright-report/',
    'tmp/',
  ]),
  js.configs.recommended,
  tseslint.configs.strict,
  astro.configs.recommended,
  astro.configs['jsx-a11y-strict'],
  // Tool tiles are focusable role="img" so keyboard users can reach their tooltip; the name comes
  // from aria-labelledby (CONTEXT D-14, UI-SPEC "Semantics decision"). Scoped to this one file:
  // the rule stays fully strict everywhere else.
  {
    files: ['src/components/sections/ToolsRow.astro'],
    rules: {
      'astro/jsx-a11y/no-noninteractive-tabindex': ['error', { roles: ['img'], tags: [] }],
    },
  },
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
);
